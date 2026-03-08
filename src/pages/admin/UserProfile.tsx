import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, User, Phone, MapPin, Star, Briefcase, CheckCircle,
  XCircle, TrendingUp, AlertTriangle, CreditCard, ArrowLeft,
  Shield, Calendar, Wallet
} from 'lucide-react';
import { useReviewsForArtisan, useViolationsForArtisan } from '@/hooks/useReviews';
import { toast } from 'sonner';
import { format } from 'date-fns';

function useAdminUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['admin-user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      const { data: artisanProfile } = await supabase
        .from('artisan_profiles')
        .select('*, category:categories(name)')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, status, created_at, final_amount, workmanship_cost, material_cost')
        .or(`customer_id.eq.${userId},artisan_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, artisan_amount, status, payment_type, created_at')
        .or(`customer_id.eq.${userId},artisan_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(5);

      return { profile, artisanProfile, jobs: jobs || [], payments: payments || [] };
    },
    enabled: !!userId,
  });
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminUserProfile(userId);
  const { data: reviews } = useReviewsForArtisan(
    data?.profile?.role === 'artisan' ? userId : undefined
  );
  const { data: violations } = useViolationsForArtisan(
    data?.profile?.role === 'artisan' ? userId : undefined
  );

  const handleToggleBan = async () => {
    if (!data?.profile) return;
    const newState = !data.profile.is_active;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newState })
      .eq('user_id', userId!);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(newState ? 'User restored successfully.' : 'User banned successfully.');
    qc.invalidateQueries({ queryKey: ['admin-user-profile', userId] });
    qc.invalidateQueries({ queryKey: ['admin-artisan-performance'] });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="text-center py-24 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>User not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </AdminLayout>
    );
  }

  const { profile, artisanProfile, jobs, payments } = data;
  const isArtisan = profile.role === 'artisan';

  const totalJobs = artisanProfile?.total_jobs ?? 0;
  const completedJobs = artisanProfile?.completed_jobs ?? 0;
  const cancelledJobs = artisanProfile?.cancelled_jobs ?? 0;
  const ratingAvg = artisanProfile?.rating_avg ?? 0;
  const completionRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(0) : '0';
  const cancellationRate = totalJobs > 0 ? ((cancelledJobs / totalJobs) * 100).toFixed(0) : '0';
  const isHighRisk = parseInt(cancellationRate) > 30;

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      confirmed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-700',
      assigned: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[s] || 'bg-muted text-muted-foreground'}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <AdminLayout>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {profile.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant={profile.role === 'artisan' ? 'default' : 'secondary'} className="capitalize">
                {profile.role}
              </Badge>
              <Badge variant={profile.is_verified ? 'default' : 'outline'}>
                {profile.is_verified ? '✓ Verified' : 'Unverified'}
              </Badge>
              <Badge variant={profile.is_active ? 'secondary' : 'destructive'}>
                {profile.is_active ? 'Active' : 'Banned'}
              </Badge>
              {isHighRisk && <Badge variant="destructive">⚠ High Risk</Badge>}
            </div>
          </div>
        </div>
        <Button
          variant={profile.is_active ? 'destructive' : 'default'}
          onClick={handleToggleBan}
        >
          {profile.is_active ? 'Ban User' : 'Restore User'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${profile.phone}`} className="text-primary hover:underline">{profile.phone}</a>
              </div>
              {profile.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{profile.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Joined {format(new Date(profile.created_at), 'dd MMM yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Wallet: <strong>₦{((profile.wallet_balance ?? 0) / 100).toLocaleString()}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Artisan-specific info */}
          {isArtisan && artisanProfile && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Artisan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">
                    {(artisanProfile as any).category?.name || artisanProfile.custom_category || '—'}
                  </span>
                </div>
                {artisanProfile.years_experience != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium">{artisanProfile.years_experience} yr(s)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Radius</span>
                  <span className="font-medium">{artisanProfile.service_radius_km} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <Badge variant={artisanProfile.is_available ? 'secondary' : 'outline'}>
                    {artisanProfile.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                {artisanProfile.bio && (
                  <div className="pt-1 border-t">
                    <p className="text-muted-foreground text-xs leading-relaxed">{artisanProfile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bank Account */}
          {isArtisan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Bank Account
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {artisanProfile?.account_number ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{artisanProfile.bank_name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account No.</span>
                      <span className="font-mono font-medium">{artisanProfile.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium">{artisanProfile.account_name || '—'}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs">No bank account added yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle + Right columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance stats (artisan only) */}
          {isArtisan && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Rating', value: ratingAvg > 0 ? ratingAvg.toFixed(1) : '—', icon: Star, color: 'text-warning' },
                { label: 'Completion', value: `${completionRate}%`, icon: TrendingUp, color: 'text-success' },
                { label: 'Completed', value: completedJobs, icon: CheckCircle, color: 'text-success' },
                {
                  label: 'Cancelled',
                  value: cancelledJobs,
                  icon: XCircle,
                  color: isHighRisk ? 'text-destructive' : 'text-muted-foreground',
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recent Jobs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Recent Jobs ({jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No jobs found.</p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((j: any) => (
                    <div key={j.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{j.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(j.created_at), 'dd MMM yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {j.final_amount && (
                          <span className="text-xs font-mono text-muted-foreground">
                            ₦{(j.final_amount / 100).toLocaleString()}
                          </span>
                        )}
                        {statusBadge(j.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Violations (artisan only) */}
          {isArtisan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-destructive" /> Violations ({violations?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!violations || violations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No violations recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {violations.map((v) => (
                      <div key={v.id} className="flex items-start gap-2 text-sm border rounded-md p-2 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium capitalize">{v.violation_type.replace(/_/g, ' ')}</span>
                          {v.notes && <p className="text-muted-foreground text-xs mt-0.5">{v.notes}</p>}
                          <p className="text-xs text-muted-foreground">{format(new Date(v.created_at), 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reviews (artisan only) */}
          {isArtisan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning" /> Reviews ({reviews?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!reviews || reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No reviews yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {reviews.map((r) => (
                      <div key={r.id} className="border rounded-md p-2 text-sm">
                        <div className="flex gap-0.5 mb-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                            />
                          ))}
                        </div>
                        {r.comment && <p className="text-muted-foreground">{r.comment}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), 'dd MMM yyyy')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
