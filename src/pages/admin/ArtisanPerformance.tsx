import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, AlertTriangle, TrendingUp, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { useReviewsForArtisan, useViolationsForArtisan, useReportViolation } from '@/hooks/useReviews';
import { toast } from 'sonner';

interface ArtisanWithProfile {
  user_id: string;
  full_name: string;
  phone: string;
  is_verified: boolean;
  is_active: boolean;
  artisan_profiles: {
    rating_avg: number;
    total_jobs: number;
    completed_jobs: number;
    cancelled_jobs: number;
    is_available: boolean;
    custom_category: string | null;
    category?: { name: string } | null;
  } | null;
}

function useAllArtisanProfiles() {
  return useQuery({
    queryKey: ['admin-artisan-performance'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, is_verified, is_active')
        .eq('role', 'artisan')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: artisanProfiles } = await supabase
        .from('artisan_profiles')
        .select('user_id, rating_avg, total_jobs, completed_jobs, cancelled_jobs, is_available, custom_category');

      return (profiles || []).map((p) => ({
        ...p,
        artisan_profiles: artisanProfiles?.find((ap) => ap.user_id === p.user_id) || null,
      })) as ArtisanWithProfile[];
    },
  });
}

function ArtisanDetailPanel({ artisan, onClose }: { artisan: ArtisanWithProfile; onClose: () => void }) {
  const profile = artisan.artisan_profiles;
  const { data: reviews } = useReviewsForArtisan(artisan.user_id);
  const { data: violations } = useViolationsForArtisan(artisan.user_id);
  const reportViolation = useReportViolation();
  const qc = useQueryClient();

  const [violationType, setViolationType] = useState<'bypass_attempt' | 'no_show' | 'poor_quality' | 'other'>('no_show');
  const [violationNotes, setViolationNotes] = useState('');
  const [showViolationForm, setShowViolationForm] = useState(false);

  const completionRate = profile && profile.total_jobs > 0
    ? ((profile.completed_jobs / profile.total_jobs) * 100).toFixed(0)
    : '0';
  const cancellationRate = profile && profile.total_jobs > 0
    ? ((profile.cancelled_jobs / profile.total_jobs) * 100).toFixed(0)
    : '0';
  const isHighRisk = parseInt(cancellationRate) > 30;

  const toggleBan = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !artisan.is_active })
      .eq('user_id', artisan.user_id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(artisan.is_active ? 'Artisan banned.' : 'Artisan restored.');
    qc.invalidateQueries({ queryKey: ['admin-artisan-performance'] });
    onClose();
  };

  const handleReportViolation = async () => {
    await reportViolation.mutateAsync({
      artisan_id: artisan.user_id,
      violation_type: violationType,
      notes: violationNotes,
    });
    setShowViolationForm(false);
    setViolationNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">{artisan.full_name}</h3>
          <p className="text-muted-foreground text-sm">{artisan.phone}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant={artisan.is_verified ? 'default' : 'outline'}>
              {artisan.is_verified ? 'Verified' : 'Unverified'}
            </Badge>
            <Badge variant={artisan.is_active ? 'secondary' : 'destructive'}>
              {artisan.is_active ? 'Active' : 'Banned'}
            </Badge>
            {isHighRisk && <Badge variant="destructive">High Risk</Badge>}
          </div>
        </div>
        <Button variant={artisan.is_active ? 'destructive' : 'default'} size="sm" onClick={toggleBan}>
          {artisan.is_active ? 'Ban Artisan' : 'Restore Artisan'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Rating', value: profile?.rating_avg?.toFixed(1) || '0.0', icon: Star, color: 'text-warning' },
          { label: 'Completion', value: `${completionRate}%`, icon: TrendingUp, color: 'text-success' },
          { label: 'Total Jobs', value: profile?.total_jobs || 0, icon: CheckCircle, color: 'text-primary' },
          { label: 'Cancellations', value: `${cancellationRate}%`, icon: XCircle, color: isHighRisk ? 'text-destructive' : 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Violations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" /> Violations ({violations?.length || 0})
          </h4>
          <Button size="sm" variant="outline" onClick={() => setShowViolationForm(v => !v)}>
            {showViolationForm ? 'Cancel' : 'Report Violation'}
          </Button>
        </div>
        {showViolationForm && (
          <div className="space-y-3 border rounded-lg p-3 mb-3 bg-muted/30">
            <Select value={violationType} onValueChange={(v) => setViolationType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bypass_attempt">Bypass Attempt</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
                <SelectItem value="poor_quality">Poor Quality</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes (optional)" value={violationNotes} onChange={(e) => setViolationNotes(e.target.value)} rows={2} />
            <Button size="sm" variant="destructive" className="w-full" onClick={handleReportViolation} disabled={reportViolation.isPending}>
              {reportViolation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Submit
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {violations?.length === 0 && <p className="text-sm text-muted-foreground">No violations recorded.</p>}
          {violations?.map((v) => (
            <div key={v.id} className="flex items-start gap-2 text-sm border rounded-md p-2 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <span className="font-medium capitalize">{v.violation_type.replace('_', ' ')}</span>
                {v.notes && <p className="text-muted-foreground text-xs mt-0.5">{v.notes}</p>}
                <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" /> Reviews ({reviews?.length || 0})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {reviews?.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
          {reviews?.map((r) => (
            <div key={r.id} className="border rounded-md p-2 text-sm">
              <div className="flex gap-0.5 mb-1">
                {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />)}
              </div>
              {r.comment && <p className="text-muted-foreground">{r.comment}</p>}
              <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArtisanPerformancePage() {
  const { data: artisans, isLoading } = useAllArtisanProfiles();
  const [selected, setSelected] = useState<ArtisanWithProfile | null>(null);

  const getCompletionRate = (p: ArtisanWithProfile['artisan_profiles']) => {
    if (!p || p.total_jobs === 0) return 0;
    return (p.completed_jobs / p.total_jobs) * 100;
  };
  const getCancellationRate = (p: ArtisanWithProfile['artisan_profiles']) => {
    if (!p || p.total_jobs === 0) return 0;
    return (p.cancelled_jobs / p.total_jobs) * 100;
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Artisan Performance</h1>
        <p className="text-muted-foreground">Monitor ratings, completion rates, and violations.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artisans?.map((a) => {
            const p = a.artisan_profiles;
            const isHighRisk = getCancellationRate(p) > 30;
            return (
              <Card
                key={a.user_id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${!a.is_active ? 'opacity-60' : ''}`}
                onClick={() => setSelected(a)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{a.full_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{a.phone}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {!a.is_active && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                      {isHighRisk && <Badge variant="destructive" className="text-xs">⚠ High Risk</Badge>}
                      {!isHighRisk && a.is_active && <Badge variant="secondary" className="text-xs">Active</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="flex items-center justify-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        <span className="font-semibold">{p?.rating_avg?.toFixed(1) || '—'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                    <div>
                      <p className="font-semibold">{getCompletionRate(p).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Completion</p>
                    </div>
                    <div>
                      <p className={`font-semibold ${isHighRisk ? 'text-destructive' : ''}`}>{p?.total_jobs || 0}</p>
                      <p className="text-xs text-muted-foreground">Jobs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {artisans?.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">No artisans registered yet.</div>
          )}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Artisan Profile</DialogTitle>
          </DialogHeader>
          {selected && <ArtisanDetailPanel artisan={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
