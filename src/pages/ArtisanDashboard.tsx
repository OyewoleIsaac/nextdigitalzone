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
import {
  Hammer, LogOut, Loader2, Briefcase, Star, TrendingUp, CheckCircle, Camera, User, MessageCircleWarning, Phone, MapPin, AlertTriangle, FileWarning,
} from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { GeneralDisputeDialog } from '@/components/jobs/GeneralDisputeDialog';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useDisputeForJob } from '@/hooks/useDisputes';
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
  const [materialCost, setMaterialCost] = useState('');
  const [workmanshipCost, setWorkmanshipCost] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [showGeneralDispute, setShowGeneralDispute] = useState(false);

  // Import dispute data for selected job
  const { useDisputeForJob } = require('@/hooks/useDisputes') as typeof import('@/hooks/useDisputes');
  const { data: selectedJobDispute } = useDisputeForJob(selectedJob?.id);

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

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  // Artisan submits quote (material + workmanship) after inspection
  const handleSubmitQuote = async () => {
    if (!selectedJob || !user || !materialCost || !workmanshipCost) return;
    const matKobo = Math.round(parseFloat(materialCost) * 100);
    const workKobo = Math.round(parseFloat(workmanshipCost) * 100);
    const totalKobo = matKobo + workKobo;
    await updateJob.mutateAsync({
      id: selectedJob.id,
      status: 'quoted',
      material_cost: matKobo,
      workmanship_cost: workKobo,
      quoted_amount: totalKobo,
    } as any);
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: 'quoted',
      changed_by: user.id,
      notes: `Quote submitted — Materials: ₦${materialCost}, Workmanship: ₦${workmanshipCost}, Total: ₦${(totalKobo / 100).toLocaleString()}`,
    });
    toast.success('Quote submitted to customer!');
    setSelectedJob(null);
    setMaterialCost('');
    setWorkmanshipCost('');
  };

  // Artisan marks inspection done (waiting for customer confirmation)
  const handleInspectionDone = async () => {
    if (!selectedJob || !user) return;
    await updateJob.mutateAsync({ id: selectedJob.id, status: 'inspection_paid' as any });
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: 'inspection_paid',
      changed_by: user.id,
      notes: inspectionNotes ? `Inspection done. Notes: ${inspectionNotes}` : 'Artisan marked inspection as completed',
    });
    toast.success('Inspection marked done! Waiting for customer confirmation.');
    setSelectedJob(null);
    setInspectionNotes('');
  };

  // Artisan marks job complete
  const handleMarkComplete = async () => {
    if (!selectedJob || !user) return;
    await updateJob.mutateAsync({ id: selectedJob.id, status: 'completed' as any });
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: 'completed',
      changed_by: user.id,
      notes: 'Artisan marked job as completed. Awaiting customer confirmation.',
    });
    toast.success('Job marked as completed! Waiting for customer confirmation.');
    setSelectedJob(null);
  };

  // Agency job: accept or reject offer
  const handleOfferResponse = async (accept: boolean) => {
    if (!selectedJob || !user) return;
    await updateJob.mutateAsync({
      id: selectedJob.id,
      artisan_offer_status: accept ? 'accepted' : 'rejected',
      ...(accept ? { status: 'assigned' as any } : { status: 'pending' as any, artisan_id: null }),
    } as any);
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: accept ? 'assigned' : 'pending',
      changed_by: user.id,
      notes: accept ? 'Artisan accepted the placement offer' : 'Artisan declined the placement offer',
    });
    toast.success(accept ? 'Offer accepted! You are now assigned to this job.' : 'Offer declined.');
    setSelectedJob(null);
  };

  const handlePhotoUpload = async (type: 'before' | 'after', file: File) => {
    if (!selectedJob) return;
    const path = `${selectedJob.id}/${type}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('job-photos').upload(path, file);
    if (uploadError) { toast.error('Failed to upload photo'); return; }
    const field = type === 'before' ? 'photo_before' : 'photo_after';
    await updateJob.mutateAsync({ id: selectedJob.id, [field]: path });
    toast.success(`${type === 'before' ? 'Before' : 'After'} photo uploaded!`);
  };

  const completionRate = artisanProfile && artisanProfile.total_jobs > 0
    ? ((artisanProfile.completed_jobs / artisanProfile.total_jobs) * 100).toFixed(0)
    : '0';

  const activeJobs = jobs?.filter(j => !['confirmed', 'cancelled'].includes(j.status)) || [];
  const pastJobs = jobs?.filter(j => ['confirmed', 'cancelled'].includes(j.status)) || [];

  // Helper to get customer info from job
  const getCustomerInfo = (job: Job) => ({
    name: (job as any).customer_profile?.full_name,
    phone: (job as any).customer_profile?.phone,
    address: (job as any).customer_profile?.address,
  });

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
            <div className="flex items-center gap-2">
              <Badge variant={profile?.is_verified ? 'default' : 'outline'} className={profile?.is_verified ? 'bg-success text-success-foreground' : ''}>
                {profile?.is_verified ? <><CheckCircle className="h-3 w-3 mr-1" />Verified</> : 'Pending Verification'}
              </Badge>
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={() => navigate('/profile')}><User className="h-4 w-4 mr-1" /> Profile</Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/5" onClick={() => setShowGeneralDispute(true)}>
                <MessageCircleWarning className="h-4 w-4 mr-1" /> Complaint
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-1" /> Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="section-container py-8">
        {profile && !profile.is_verified && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/40 bg-warning/10 mb-6">
            <Hammer className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Account Pending Verification</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your profile is under review. The admin will assign jobs once your identity is verified.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
          <p className="text-muted-foreground mt-1">
            {artisanProfile?.category?.name || artisanProfile?.custom_category || 'Artisan'} • {artisanProfile?.years_experience || 0} years experience
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card><CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Jobs</p><p className="text-2xl font-bold">{artisanProfile?.total_jobs || 0}</p></div>
              <Briefcase className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{artisanProfile?.completed_jobs || 0}</p></div>
              <CheckCircle className="h-8 w-8 text-success/30" />
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Rating</p><p className="text-2xl font-bold">{artisanProfile?.rating_avg || '0.0'}</p></div>
              <Star className="h-8 w-8 text-warning/30" />
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Completion Rate</p><p className="text-2xl font-bold">{completionRate}%</p></div>
              <TrendingUp className="h-8 w-8 text-accent/30" />
            </div>
          </CardContent></Card>
        </div>

        {/* Active Jobs */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Assigned Jobs ({activeJobs.length})
          </h2>
          {activeJobs.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              No jobs assigned yet. The admin will assign jobs to you based on your location and category.
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeJobs.map((job) => <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />)}
            </div>
          )}
        </div>

        {pastJobs.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Past Jobs ({pastJobs.length})</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {pastJobs.map((job) => <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />)}
            </div>
          </div>
        )}
      </main>

      <JobDetailDialog
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null); setMaterialCost(''); setWorkmanshipCost(''); setInspectionNotes('');
          }
        }}
      >
        {/* Agency offer: accept/reject */}
        {selectedJob && (selectedJob as any).artisan_offer_status === 'pending' && (
          <div className="pt-4 space-y-3 border-t">
            <h4 className="font-semibold text-sm text-primary">Agency Placement Offer</h4>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1 text-sm">
              {(selectedJob as any).agreed_salary && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agreed Salary</span>
                  <span className="font-semibold">₦{((selectedJob as any).agreed_salary / 100).toLocaleString()}/month</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                By accepting, you agree that 30% of your first month's salary will be retained as platform commission.
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => handleOfferResponse(true)} disabled={updateJob.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Accept Offer
              </Button>
              <Button variant="outline" className="flex-1 text-destructive border-destructive/30" onClick={() => handleOfferResponse(false)} disabled={updateJob.isPending}>
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Assigned: show customer contact info + option to mark inspection done */}
        {selectedJob?.status === 'assigned' && (
          <div className="pt-4 space-y-4 border-t">
            {/* Customer contact info */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Contact</p>
              {(selectedJob as any).customer_profile?.full_name && (
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{(selectedJob as any).customer_profile.full_name}</span>
                </div>
              )}
              {(selectedJob as any).customer_profile?.phone && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${(selectedJob as any).customer_profile.phone}`} className="text-primary">
                    {(selectedJob as any).customer_profile.phone}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{selectedJob.address}</span>
              </div>
            </div>

            {/* Mark inspection done (only if category requires inspection) */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Mark Inspection as Done</h4>
              <Textarea
                placeholder="Optional inspection notes..."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                rows={2}
              />
              <Button className="w-full" onClick={handleInspectionDone} disabled={updateJob.isPending}>
                {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                I Have Completed the Inspection
              </Button>
              <p className="text-xs text-muted-foreground text-center">Customer must confirm this before you can submit a quote.</p>
            </div>
          </div>
        )}

        {/* inspection_paid (customer confirmed inspection): submit quote */}
        {selectedJob?.status === 'inspection_paid' && (
          <div className="pt-4 space-y-4 border-t">
            <h4 className="font-semibold text-sm">Submit Quote</h4>
            <p className="text-xs text-muted-foreground">Customer confirmed your inspection. Submit a detailed quote for the job.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Material Cost (₦)</Label>
                <Input type="number" placeholder="e.g. 8000" value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Workmanship (₦)</Label>
                <Input type="number" placeholder="e.g. 5000" value={workmanshipCost} onChange={(e) => setWorkmanshipCost(e.target.value)} />
              </div>
            </div>
            {materialCost && workmanshipCost && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm font-medium flex justify-between">
                <span>Total Quote</span>
                <span className="text-primary">₦{((parseFloat(materialCost) + parseFloat(workmanshipCost)) || 0).toLocaleString()}</span>
              </div>
            )}
            <Button className="w-full" onClick={handleSubmitQuote} disabled={!materialCost || !workmanshipCost || updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit Quote to Customer
            </Button>
          </div>
        )}

        {/* In progress / payment escrowed: photos + mark complete */}
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
            <Button className="w-full" onClick={handleMarkComplete} disabled={updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Mark Job as Completed
            </Button>
            <p className="text-xs text-muted-foreground text-center">Customer must confirm completion before funds are released.</p>
          </div>
        )}
      </JobDetailDialog>

      <GeneralDisputeDialog open={showGeneralDispute} onOpenChange={setShowGeneralDispute} userRole="artisan" />
    </div>
  );
};

export default ArtisanDashboard;
