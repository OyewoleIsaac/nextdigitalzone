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
  LogOut, Loader2, Briefcase, Star, TrendingUp, CheckCircle, Camera, User, MessageCircleWarning, Phone, MapPin, AlertTriangle, FileWarning, Clock, CreditCard, MoreVertical,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ndzLogo from '@/assets/ndz-logo.png';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { GeneralDisputeDialog } from '@/components/jobs/GeneralDisputeDialog';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useDisputeForJob } from '@/hooks/useDisputes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyJobEvent } from '@/hooks/useNotifyJobEvent';
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

  // Artisan submits quote (material + workmanship) ONLY after customer confirms inspection
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
    notifyJobEvent(selectedJob.id, 'quote_submitted');
    setSelectedJob(null);
    setMaterialCost('');
    setWorkmanshipCost('');
  };

  // Artisan marks inspection done — sets to inspection_requested so customer can confirm
  const handleInspectionDone = async () => {
    if (!selectedJob || !user) return;
    await updateJob.mutateAsync({ id: selectedJob.id, status: 'inspection_requested' as any });
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: 'inspection_requested',
      changed_by: user.id,
      notes: inspectionNotes ? `Inspection done. Notes: ${inspectionNotes}` : 'Artisan marked inspection as completed — awaiting customer confirmation',
    });
    toast.success('Inspection marked done! Waiting for customer to confirm.');
    notifyJobEvent(selectedJob.id, 'inspection_done');
    setSelectedJob(null);
    setInspectionNotes('');
  };

  // Artisan uploads photos and marks as "proof submitted" — status becomes 'completed'
  const handleMarkComplete = async () => {
    if (!selectedJob || !user) return;
    // Require at least the after photo before marking complete
    if (!selectedJob.photo_after) {
      toast.error('Please upload an "After" photo as proof of completion before marking the job done.');
      return;
    }
    await updateJob.mutateAsync({ id: selectedJob.id, status: 'completed' as any });
    await addHistory.mutateAsync({
      job_id: selectedJob.id,
      old_status: selectedJob.status,
      new_status: 'completed',
      changed_by: user.id,
      notes: 'Artisan submitted proof of completion (photos uploaded). Awaiting customer confirmation.',
    });
    toast.success('Proof submitted! Waiting for customer to confirm completion.');
    notifyJobEvent(selectedJob.id, 'job_completed');
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
    // Update local selectedJob state so button state refreshes
    setSelectedJob(prev => prev ? { ...prev, [field]: path } : prev);
    toast.success(`${type === 'before' ? 'Before' : 'After'} photo uploaded!`);
  };

  const completionRate = artisanProfile && artisanProfile.total_jobs > 0
    ? ((artisanProfile.completed_jobs / artisanProfile.total_jobs) * 100).toFixed(0)
    : '0';

  const activeJobs = jobs?.filter(j => !['confirmed', 'cancelled'].includes(j.status)) || [];
  const pastJobs = jobs?.filter(j => ['confirmed', 'cancelled'].includes(j.status)) || [];

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
              <img src={ndzLogo} alt="NDZ Services 360" className="h-10 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant={profile?.is_verified ? 'default' : 'outline'} className={profile?.is_verified ? 'bg-success text-success-foreground hidden sm:inline-flex' : 'hidden sm:inline-flex'}>
                {profile?.is_verified ? <><CheckCircle className="h-3 w-3 mr-1" />Verified</> : 'Pending'}
              </Badge>
              <NotificationBell />
              {/* Desktop buttons */}
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/profile')}><User className="h-4 w-4 mr-1" /> Profile</Button>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex text-destructive border-destructive/40 hover:bg-destructive/5" onClick={() => setShowGeneralDispute(true)}>
                <MessageCircleWarning className="h-4 w-4 mr-1" /> Complaint
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-1" /> Sign Out</Button>
              {/* Mobile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGeneralDispute(true)}>
                    <MessageCircleWarning className="h-4 w-4 mr-2" /> Complaint
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="section-container py-8">
        {profile && !profile.is_verified && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/40 bg-warning/10 mb-6">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Account Pending Verification</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your profile is under review. The admin will assign jobs once your identity is verified.
              </p>
            </div>
          </div>
        )}

        {/* Bank account prompt */}
        {profile?.is_verified && artisanProfile && !(artisanProfile as any).account_number && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/5 mb-6">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Bank Account Required for Payouts</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add your bank account details so you can receive payment when jobs are confirmed complete.
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => navigate('/profile?tab=bank')}>
              <CreditCard className="h-4 w-4 mr-1" /> Add Bank
            </Button>
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
                  <span className="font-medium">{(selectedJob as any).customer_profile.full_name}</span>
                </div>
              )}
              {(selectedJob as any).customer_profile?.phone && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${(selectedJob as any).customer_profile.phone}`} className="text-primary font-medium">
                    {(selectedJob as any).customer_profile.phone}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{selectedJob.address}</span>
              </div>
            </div>

            {/* Mark inspection done */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Mark Inspection as Done</h4>
              <p className="text-xs text-muted-foreground">Once you mark inspection done, the customer will be asked to confirm. You can only submit a quote after the customer confirms.</p>
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
            </div>
          </div>
        )}

        {/* inspection_requested: artisan marked done, waiting for customer confirmation */}
        {selectedJob?.status === 'inspection_requested' && (
          <div className="pt-4 space-y-3 border-t">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Waiting for Customer Confirmation</p>
                <p className="text-xs text-muted-foreground mt-0.5">The customer needs to confirm the inspection was carried out before you can submit a quote.</p>
              </div>
            </div>
          </div>
        )}

        {/* inspection_paid (customer confirmed inspection): submit quote — ONLY available here */}
        {selectedJob?.status === 'inspection_paid' && (
          <div className="pt-4 space-y-4 border-t">
            {/* Customer contact info */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Contact</p>
              {(selectedJob as any).customer_profile?.full_name && (
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{(selectedJob as any).customer_profile.full_name}</span>
                </div>
              )}
              {(selectedJob as any).customer_profile?.phone && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${(selectedJob as any).customer_profile.phone}`} className="text-primary font-medium">
                    {(selectedJob as any).customer_profile.phone}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{selectedJob.address}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-sm">
              <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-success">Customer confirmed your inspection!</p>
                <p className="text-xs text-muted-foreground mt-0.5">You can now submit your quote for the job.</p>
              </div>
            </div>
            <h4 className="font-semibold text-sm">Submit Quote</h4>
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

        {/* Quote accepted, awaiting payment */}
        {selectedJob?.status === 'price_agreed' && (
          <div className="pt-4 space-y-3 border-t">
            {/* Customer contact info */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Contact</p>
              {(selectedJob as any).customer_profile?.full_name && (
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{(selectedJob as any).customer_profile.full_name}</span>
                </div>
              )}
              {(selectedJob as any).customer_profile?.phone && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${(selectedJob as any).customer_profile.phone}`} className="text-primary font-medium">
                    {(selectedJob as any).customer_profile.phone}
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Quote Accepted — Awaiting Payment</p>
                <p className="text-xs text-muted-foreground mt-0.5">The customer has accepted your quote but has not yet made payment. Work should only begin after payment is confirmed.</p>
              </div>
            </div>
          </div>
        )}

        {/* In progress / payment escrowed: photos + mark complete */}
        {selectedJob && ['in_progress', 'payment_escrowed'].includes(selectedJob.status) && (
          <div className="pt-4 space-y-3 border-t">
            {/* Customer contact info */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Contact</p>
              {(selectedJob as any).customer_profile?.full_name && (
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{(selectedJob as any).customer_profile.full_name}</span>
                </div>
              )}
              {(selectedJob as any).customer_profile?.phone && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${(selectedJob as any).customer_profile.phone}`} className="text-primary font-medium">
                    {(selectedJob as any).customer_profile.phone}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{selectedJob.address}</span>
              </div>
            </div>

            <h4 className="font-semibold text-sm">Job Documentation</h4>
            <p className="text-xs text-muted-foreground">Upload before and after photos, then mark the job as complete. The customer must confirm before funds are released.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Before Photo {selectedJob.photo_before && <span className="text-success ml-1">✓ Uploaded</span>}</Label>
                <label className="flex items-center justify-center gap-1 border border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground">
                  <Camera className="h-4 w-4" /> {selectedJob.photo_before ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload('before', e.target.files[0])} />
                </label>
              </div>
              <div>
                <Label className="text-xs">After Photo {selectedJob.photo_after && <span className="text-success ml-1">✓ Uploaded</span>}</Label>
                <label className="flex items-center justify-center gap-1 border border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground">
                  <Camera className="h-4 w-4" /> {selectedJob.photo_after ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload('after', e.target.files[0])} />
                </label>
              </div>
            </div>
            {!selectedJob.photo_after && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> An "After" photo is required to submit proof of completion.
              </p>
            )}
            <Button
              className="w-full"
              onClick={handleMarkComplete}
              disabled={updateJob.isPending || !selectedJob.photo_after}
            >
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Submit Proof & Mark as Complete
            </Button>
            <p className="text-xs text-muted-foreground text-center">Customer must confirm completion before funds are released.</p>
          </div>
        )}

        {/* completed: waiting for customer confirmation */}
        {selectedJob?.status === 'completed' && (
          <div className="pt-4 space-y-3 border-t">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-primary">Proof Submitted — Awaiting Customer Confirmation</p>
                <p className="text-xs text-muted-foreground mt-0.5">You've uploaded your photos and marked the job done. Waiting for the customer to confirm so funds can be released.</p>
              </div>
            </div>
          </div>
        )}

        {/* Show dispute filed on this job (read-only for artisan) */}
        {selectedJobDispute && (
          <div className="pt-4 border-t">
            <div className={`rounded-lg p-3 space-y-1.5 text-sm ${
              selectedJobDispute.status === 'open' ? 'bg-destructive/5 border border-destructive/20' :
              selectedJobDispute.status === 'resolved' ? 'bg-green-50 border border-green-200' :
              'bg-muted border'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 shrink-0 ${selectedJobDispute.status === 'open' ? 'text-destructive' : 'text-muted-foreground'}`} />
                <p className="font-semibold capitalize">Dispute Filed — {selectedJobDispute.status}</p>
              </div>
              <p className="text-xs text-muted-foreground">Customer's reason: "{selectedJobDispute.reason}"</p>
              {selectedJobDispute.resolution_notes && (
                <p className="text-xs bg-white/50 rounded p-1.5">Resolution: {selectedJobDispute.resolution_notes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Our team is reviewing this. Please cooperate with any admin queries.</p>
            </div>
          </div>
        )}
      </JobDetailDialog>

      <GeneralDisputeDialog open={showGeneralDispute} onOpenChange={setShowGeneralDispute} userRole="artisan" />
    </div>
  );
};

export default ArtisanDashboard;
