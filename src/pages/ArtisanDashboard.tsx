import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useArtisanProfile } from '@/hooks/useProfile';
import { useArtisanJobs, useUpdateJob, useAddJobHistory } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Hammer, LogOut, Loader2, Briefcase, Star, TrendingUp, CheckCircle, Camera,
} from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Job } from '@/hooks/useJobs';

const ArtisanDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: artisanProfile, isLoading: artisanLoading } = useArtisanProfile();
  const { data: jobs, isLoading: jobsLoading } = useArtisanJobs();
  const updateJob = useUpdateJob();
  const addHistory = useAddJobHistory();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [requiresInspection, setRequiresInspection] = useState(false);
  const [inspectionFee, setInspectionFee] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading || artisanLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSubmitQuote = async () => {
    if (!selectedJob || !user) return;
    const updates: any = {
      id: selectedJob.id,
      status: 'quoted',
      quoted_amount: Math.round(parseFloat(quoteAmount) * 100),
    };
    if (requiresInspection && inspectionFee) {
      updates.requires_inspection = true;
      updates.inspection_fee = Math.round(parseFloat(inspectionFee) * 100);
      updates.status = 'inspection_requested';
    }
    await updateJob.mutateAsync(updates);
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: updates.status,
      changed_by: user.id,
      notes: requiresInspection
        ? `Inspection requested. Fee: ₦${inspectionFee}. Estimated quote: ₦${quoteAmount}`
        : `Quote submitted: ₦${quoteAmount}`,
    });
    toast.success(requiresInspection ? 'Inspection request sent!' : 'Quote submitted!');
    setSelectedJob(null);
    setQuoteAmount('');
    setInspectionFee('');
    setRequiresInspection(false);
  };

  const handleMarkComplete = async () => {
    if (!selectedJob || !user) return;
    await updateJob.mutateAsync({ id: selectedJob.id, status: 'completed' as any });
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: 'completed',
      changed_by: user.id,
      notes: 'Artisan marked job as completed',
    });
    toast.success('Job marked as completed! Waiting for customer confirmation.');
    setSelectedJob(null);
  };

  const handlePhotoUpload = async (type: 'before' | 'after', file: File) => {
    if (!selectedJob) return;
    const path = `${selectedJob.id}/${type}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('job-photos').upload(path, file);
    if (uploadError) {
      toast.error('Failed to upload photo');
      return;
    }
    const field = type === 'before' ? 'photo_before' : 'photo_after';
    await updateJob.mutateAsync({ id: selectedJob.id, [field]: path });
    toast.success(`${type === 'before' ? 'Before' : 'After'} photo uploaded!`);
  };

  const completionRate = artisanProfile && artisanProfile.total_jobs > 0
    ? ((artisanProfile.completed_jobs / artisanProfile.total_jobs) * 100).toFixed(0)
    : '0';

  const activeJobs = jobs?.filter(j => !['confirmed', 'cancelled'].includes(j.status)) || [];
  const pastJobs = jobs?.filter(j => ['confirmed', 'cancelled'].includes(j.status)) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full glass border-b">
        <div className="section-container">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                <Hammer className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">NDZ<span className="text-primary">Marketplace</span></span>
            </Link>
            <div className="flex items-center gap-3">
              <Badge variant={profile?.is_verified ? 'default' : 'outline'} className={profile?.is_verified ? 'bg-success text-success-foreground' : ''}>
                {profile?.is_verified ? <><CheckCircle className="h-3 w-3 mr-1" />Verified</> : 'Pending Verification'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="section-container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
          <p className="text-muted-foreground mt-1">
            {artisanProfile?.category?.name || artisanProfile?.custom_category || 'Artisan'} • {artisanProfile?.years_experience || 0} years experience
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold">{artisanProfile?.total_jobs || 0}</p>
                </div>
                <Briefcase className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{artisanProfile?.completed_jobs || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">{artisanProfile?.rating_avg || '0.0'}</p>
                </div>
                <Star className="h-8 w-8 text-warning/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Jobs */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Assigned Jobs ({activeJobs.length})
          </h2>
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No jobs assigned yet. The admin will assign jobs to you based on your location and category.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
              ))}
            </div>
          )}
        </div>

        {pastJobs.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Past Jobs ({pastJobs.length})</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {pastJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Job Detail Dialog with Artisan Actions */}
      <JobDetailDialog
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => { if (!open) { setSelectedJob(null); setQuoteAmount(''); setInspectionFee(''); setRequiresInspection(false); } }}
      >
        {selectedJob?.status === 'assigned' && (
          <div className="pt-4 space-y-4 border-t">
            <h4 className="font-semibold text-sm">Submit a Quote</h4>
            <div className="flex items-center gap-2">
              <Checkbox
                id="inspection"
                checked={requiresInspection}
                onCheckedChange={(v) => setRequiresInspection(!!v)}
              />
              <Label htmlFor="inspection" className="text-sm">Requires physical inspection first</Label>
            </div>
            {requiresInspection && (
              <div className="space-y-1">
                <Label className="text-sm">Inspection Fee (₦)</Label>
                <Input type="number" placeholder="e.g. 2000" value={inspectionFee} onChange={(e) => setInspectionFee(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-sm">{requiresInspection ? 'Estimated Quote (₦)' : 'Quote Amount (₦)'}</Label>
              <Input type="number" placeholder="e.g. 15000" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSubmitQuote} disabled={!quoteAmount || updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {requiresInspection ? 'Request Inspection' : 'Submit Quote'}
            </Button>
          </div>
        )}

        {selectedJob && ['in_progress', 'payment_escrowed'].includes(selectedJob.status) && (
          <div className="pt-4 space-y-3 border-t">
            <h4 className="font-semibold text-sm">Job Documentation</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Before Photo</Label>
                <label className="flex items-center justify-center gap-1 border border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground">
                  <Camera className="h-4 w-4" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload('before', e.target.files[0])} />
                </label>
              </div>
              <div>
                <Label className="text-xs">After Photo</Label>
                <label className="flex items-center justify-center gap-1 border border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground">
                  <Camera className="h-4 w-4" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload('after', e.target.files[0])} />
                </label>
              </div>
            </div>
            <Button className="w-full" variant="default" onClick={handleMarkComplete} disabled={updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Mark as Completed
            </Button>
          </div>
        )}
      </JobDetailDialog>
    </div>
  );
};

export default ArtisanDashboard;
