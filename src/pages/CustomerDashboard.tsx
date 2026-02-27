import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCustomerJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, LogOut, Loader2, Search, ClipboardList, User, CreditCard, Star, AlertTriangle, Shield } from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { ReviewDialog } from '@/components/jobs/ReviewDialog';
import { DisputeDialog } from '@/components/jobs/DisputeDialog';
import { useUpdateJob, useAddJobHistory } from '@/hooks/useJobs';
import { useInitializePayment, useReleasePayment, usePaymentsForJob } from '@/hooks/usePayments';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { Job } from '@/hooks/useJobs';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: jobs, isLoading: jobsLoading } = useCustomerJobs();
  const updateJob = useUpdateJob();
  const addHistory = useAddJobHistory();
  const initPayment = useInitializePayment();
  const releasePayment = useReleasePayment();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [disputeJob, setDisputeJob] = useState<Job | null>(null);
  const { data: jobPayments } = usePaymentsForJob(selectedJob?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  // Handle Paystack callback
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Payment successful! The status will update shortly.');
    }
  }, [searchParams]);

  if (authLoading || profileLoading) {
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

  const handleConfirmComplete = async (job: Job) => {
    try {
      await releasePayment.mutateAsync(job.id);
      setSelectedJob(null);
    } catch {
      // error handled by hook
    }
  };

  const handlePayInspectionFee = async (job: Job) => {
    if (!job.inspection_fee) return;
    try {
      const result = await initPayment.mutateAsync({
        job_id: job.id,
        payment_type: 'inspection_fee',
        amount: job.inspection_fee,
      });
      window.open(result.authorization_url, '_blank');
    } catch {
      // error handled by hook
    }
  };

  const handlePayForJob = async (job: Job) => {
    const amount = job.quoted_amount || job.final_amount;
    if (!amount) return;
    try {
      const result = await initPayment.mutateAsync({
        job_id: job.id,
        payment_type: 'job_payment',
        amount,
      });
      window.open(result.authorization_url, '_blank');
    } catch {
      // error handled by hook
    }
  };

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
              <span className="text-sm text-muted-foreground hidden sm:block">Hi, {profile?.full_name}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="section-container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
            <p className="text-muted-foreground mt-1">What would you like to do today?</p>
          </div>
          <Button onClick={() => navigate('/request-service')}>
            <Search className="h-4 w-4 mr-2" /> Request a Service
          </Button>
        </div>

        {/* Active Jobs */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Active Jobs ({activeJobs.length})
          </h2>
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active jobs. Request a service to get started!
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

        {/* Past Jobs */}
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

        {/* Quick Links */}
        <Separator className="my-8" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/request-service')}>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                <Search className="h-6 w-6" />
              </div>
              <CardTitle>Request a Service</CardTitle>
              <CardDescription>Find a skilled artisan near you.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent mb-2">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>{profile?.phone} • {profile?.address || 'No address set'}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* Job Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => !open && setSelectedJob(null)}
      >
        {/* Payment: Inspection fee */}
        {selectedJob?.status === 'inspection_requested' && selectedJob.inspection_fee && (
          <div className="pt-4">
            <Button
              className="w-full"
              onClick={() => handlePayInspectionFee(selectedJob)}
              disabled={initPayment.isPending}
            >
              {initPayment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay Inspection Fee (₦{(selectedJob.inspection_fee / 100).toLocaleString()})
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Pay for the artisan to visit and assess the job.
            </p>
          </div>
        )}

        {/* Payment: Accept quote & pay */}
        {selectedJob?.status === 'quoted' && (
          <div className="pt-4 space-y-2">
            <Button
              className="w-full"
              onClick={async () => {
                await updateJob.mutateAsync({ id: selectedJob.id, status: 'price_agreed' as any });
                await addHistory.mutateAsync({
                  job_id: selectedJob.id,
                  old_status: 'quoted',
                  new_status: 'price_agreed',
                  changed_by: user!.id,
                  notes: 'Customer accepted the quote',
                });
                toast.success('Quote accepted!');
                setSelectedJob(null);
              }}
              disabled={updateJob.isPending}
            >
              Accept Quote (₦{selectedJob.quoted_amount ? (selectedJob.quoted_amount / 100).toLocaleString() : '0'})
            </Button>
          </div>
        )}

        {/* Payment: Pay for job (escrow) */}
        {selectedJob?.status === 'price_agreed' && (
          <div className="pt-4">
            <Button
              className="w-full"
              onClick={() => handlePayForJob(selectedJob)}
              disabled={initPayment.isPending}
            >
              {initPayment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay ₦{((selectedJob.quoted_amount || 0) / 100).toLocaleString()} (Held in Escrow)
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Your payment is held securely until you confirm the job is complete.
            </p>
          </div>
        )}

        {/* Confirm completion & release payment */}
        {selectedJob?.status === 'completed' && (
          <div className="pt-4">
            <Button
              className="w-full"
              onClick={() => handleConfirmComplete(selectedJob)}
              disabled={releasePayment.isPending}
            >
              {releasePayment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm Job Complete
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              This will release payment and activate a 30-day guarantee.
            </p>
          </div>
        )}

        {/* Rate & Review (after confirmed) */}
        {selectedJob?.status === 'confirmed' && selectedJob.artisan_id && (
          <div className="pt-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => { setSelectedJob(null); setReviewJob(selectedJob); }}>
              <Star className="h-4 w-4 mr-2" /> Rate This Job
            </Button>
            {/* Guarantee badge */}
            {selectedJob.guarantee_expires_at && new Date(selectedJob.guarantee_expires_at) > new Date() && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center text-sm">
                <Shield className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="font-medium text-primary">30-Day Guarantee Active</p>
                <p className="text-xs text-muted-foreground">Expires {new Date(selectedJob.guarantee_expires_at).toLocaleDateString()}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive hover:text-destructive"
                  onClick={() => { setSelectedJob(null); setDisputeJob(selectedJob); }}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" /> Open Dispute
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Escrow indicator */}
        {selectedJob?.status === 'payment_escrowed' && (
          <div className="pt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <CreditCard className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-sm font-medium">Payment Held in Escrow</p>
            <p className="text-xs text-muted-foreground">₦{((selectedJob.final_amount || selectedJob.quoted_amount || 0) / 100).toLocaleString()} • Released on confirmation</p>
          </div>
        )}

        {/* Payment history for this job */}
        {jobPayments && jobPayments.length > 0 && (
          <div className="pt-4">
            <h4 className="text-sm font-semibold mb-2">Payment History</h4>
            <div className="space-y-2">
              {jobPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm rounded-md border p-2">
                  <div>
                    <span className="capitalize">{p.payment_type.replace('_', ' ')}</span>
                    <span className="text-muted-foreground ml-2">₦{(p.amount / 100).toLocaleString()}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.status === 'released' ? 'bg-green-100 text-green-700' :
                    p.status === 'held' ? 'bg-yellow-100 text-yellow-700' :
                    p.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </JobDetailDialog>

      <ReviewDialog
        job={reviewJob}
        open={!!reviewJob}
        onOpenChange={(o) => !o && setReviewJob(null)}
      />
      <DisputeDialog
        job={disputeJob}
        open={!!disputeJob}
        onOpenChange={(o) => !o && setDisputeJob(null)}
      />
    </div>
  );
};

export default CustomerDashboard;
