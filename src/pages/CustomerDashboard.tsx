import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCustomerJobsEnriched } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, LogOut, Loader2, Search, ClipboardList, User, CreditCard, Star, AlertTriangle, Shield, Clock, Wallet, ReceiptText, MessageCircleWarning, CheckCircle, FileWarning, Phone } from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { ReviewDialog } from '@/components/jobs/ReviewDialog';
import { DisputeDialog } from '@/components/jobs/DisputeDialog';
import { GeneralDisputeDialog } from '@/components/jobs/GeneralDisputeDialog';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useUpdateJob, useAddJobHistory } from '@/hooks/useJobs';
import { useInitializePayment, useReleasePayment, usePaymentsForJob } from '@/hooks/usePayments';
import { useWallet, usePayWithWalletCredit } from '@/hooks/useWallet';
import { useDisputeForJob } from '@/hooks/useDisputes';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Job } from '@/hooks/useJobs';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: jobs, isLoading: jobsLoading } = useCustomerJobsEnriched();
  const updateJob = useUpdateJob();
  const addHistory = useAddJobHistory();
  const initPayment = useInitializePayment();
  const releasePayment = useReleasePayment();
  const payWithWallet = usePayWithWalletCredit();
  const { balance: walletBalance, transactions: walletTxns } = useWallet();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [disputeJob, setDisputeJob] = useState<Job | null>(null);
  const [showGeneralDispute, setShowGeneralDispute] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const { data: jobPayments } = usePaymentsForJob(selectedJob?.id);
  const { data: selectedJobDispute } = useDisputeForJob(selectedJob?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Payment successful! The status will update shortly.');
    }
  }, [searchParams]);

  if (authLoading || profileLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const handleConfirmComplete = async (job: Job) => {
    try {
      await releasePayment.mutateAsync(job.id);
      setSelectedJob(null);
    } catch { /* handled */ }
  };

  // Shared hybrid payment: deduct wallet credit first, charge remainder via Paystack
  const handleHybridPayment = async (
    job: Job,
    feeAmount: number,
    paymentType: 'inspection_fee' | 'job_payment'
  ) => {
    if (!feeAmount) { toast.error('Could not determine the fee amount. Please contact support.'); return; }
    const creditToApply = Math.min(walletBalance, feeAmount);
    const remaining = feeAmount - creditToApply;

    // Fully covered by wallet
    if (remaining === 0) {
      payWithWallet.mutate({ job_id: job.id, amount: feeAmount });
      return;
    }

    // Partial wallet + Paystack for remainder
    try {
      if (creditToApply > 0) {
        toast.info(`₦${(creditToApply / 100).toLocaleString()} wallet credit will be applied. Redirecting to pay the ₦${(remaining / 100).toLocaleString()} balance.`);
      }
      const result = await initPayment.mutateAsync({
        job_id: job.id,
        payment_type: paymentType,
        amount: feeAmount,
        wallet_credit_applied: creditToApply,
      });
      if (paymentType === 'inspection_fee') {
        window.location.href = result.authorization_url;
      } else {
        window.open(result.authorization_url, '_blank');
      }
    } catch { /* handled */ }
  };

  const handlePayDraftFee = async (job: Job) => {
    const cat = (job as any).category;
    const feeAmount = job.inspection_fee
      ?? (cat?.requires_inspection ? cat.default_inspection_fee : null)
      ?? (cat?.is_agency_job ? cat.default_agency_fee : null)
      ?? 0;
    await handleHybridPayment(job, feeAmount, 'inspection_fee');
  };

  const getDraftFeeDisplay = (job: Job) => {
    const cat = (job as any).category;
    return job.inspection_fee
      ?? (cat?.requires_inspection ? cat.default_inspection_fee : null)
      ?? (cat?.is_agency_job ? cat.default_agency_fee : null)
      ?? 0;
  };

  const handleConfirmInspection = async (job: Job) => {
    if (!user) return;
    // Only allow if status is inspection_requested (artisan has marked it done)
    if (job.status !== 'inspection_requested' as any) {
      toast.error('Inspection has not been marked as done by the artisan yet.');
      return;
    }
    await updateJob.mutateAsync({ id: job.id, status: 'inspection_paid' as any });
    await addHistory.mutateAsync({
      job_id: job.id,
      old_status: job.status,
      new_status: 'inspection_paid',
      changed_by: user.id,
      notes: 'Customer confirmed inspection was carried out',
    });
    toast.success('Inspection confirmed! The artisan can now submit a quote.');
    setSelectedJob(null);
  };

  const handlePayForJob = async (job: Job) => {
    const amount = job.quoted_amount || job.final_amount;
    if (!amount) return;
    await handleHybridPayment(job, amount, 'job_payment');
  };

  // Accept quote & move to price_agreed — stay in dialog to prompt payment
  const handleAcceptQuote = async (job: Job) => {
    if (!user) return;
    await updateJob.mutateAsync({ id: job.id, status: 'price_agreed' as any });
    await addHistory.mutateAsync({
      job_id: job.id,
      old_status: job.status,
      new_status: 'price_agreed',
      changed_by: user.id,
      notes: 'Customer accepted the quote — awaiting payment',
    });
    toast.success('Quote accepted! Please complete payment below.');
    // Update selectedJob so dialog shows payment prompt immediately
    setSelectedJob(prev => prev ? { ...prev, status: 'price_agreed' as any } : prev);
  };

  const draftJobs = jobs?.filter(j => j.status === 'draft') || [];
  const activeJobs = jobs?.filter(j => !['draft', 'confirmed', 'cancelled'].includes(j.status)) || [];
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">Hi, {profile?.full_name}</span>
              {walletBalance > 0 && (
                <button onClick={() => setShowWallet(!showWallet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                  <Wallet className="h-3.5 w-3.5" />₦{(walletBalance / 100).toLocaleString()} credit
                </button>
              )}
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
            <Shield className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Account Pending Verification</p>
              <p className="text-sm text-muted-foreground mt-0.5">Your account is under review. You can browse but cannot request services until an admin verifies your identity.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
            <p className="text-muted-foreground mt-1">What would you like to do today?</p>
          </div>
          <Button onClick={() => navigate('/request-service')} disabled={!profile?.is_verified}>
            <Search className="h-4 w-4 mr-2" /> Request a Service
          </Button>
        </div>

        {/* Wallet Panel */}
        {showWallet && (
          <Card className="mb-8 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Platform Wallet
                <Badge variant="outline" className="ml-auto text-primary border-primary/30">₦{(walletBalance / 100).toLocaleString()} available</Badge>
              </CardTitle>
              <CardDescription>Credits you can use to pay fees on future service requests.</CardDescription>
            </CardHeader>
            {walletTxns.length > 0 && (
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><ReceiptText className="h-3 w-3" /> Transaction History</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {walletTxns.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs rounded border p-2">
                      <span className="text-muted-foreground truncate max-w-[200px]">{tx.description}</span>
                      <span className={tx.type === 'credit' ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                        {tx.type === 'credit' ? '+' : '-'}₦{(Math.abs(tx.amount) / 100).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Draft Jobs */}
        {draftJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span>Pending Payment ({draftJobs.length})</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">These requests are saved as drafts. Pay the required fee to send them to our team.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {draftJobs.map((job) => {
                const draftFee = getDraftFeeDisplay(job);
                return (
                  <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)}>
                    <div className="mt-2 space-y-1.5">
                      {walletBalance > 0 && draftFee > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/20 rounded px-2 py-1">
                          <Wallet className="h-3 w-3" />
                          {walletBalance >= draftFee
                            ? `₦${(draftFee / 100).toLocaleString()} will be paid from wallet credit`
                            : `₦${(walletBalance / 100).toLocaleString()} wallet credit will be applied; pay ₦${((draftFee - walletBalance) / 100).toLocaleString()} by card`}
                        </div>
                      )}
                      <Button size="sm" className="w-full"
                        onClick={(e) => { e.stopPropagation(); handlePayDraftFee(job); }}
                        disabled={initPayment.isPending || payWithWallet.isPending || !draftFee}>
                        {(initPayment.isPending || payWithWallet.isPending) ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                        {draftFee > 0
                          ? `Pay ₦${(Math.max(0, draftFee - walletBalance) / 100).toLocaleString() !== '0' ? (Math.max(0, draftFee - walletBalance) / 100).toLocaleString() : (draftFee / 100).toLocaleString()} to Activate`
                          : 'Submit Request (No Fee)'}
                      </Button>
                    </div>
                  </JobCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Jobs */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Active Jobs ({activeJobs.length})
          </h2>
          {activeJobs.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No active jobs. Request a service to get started!</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)}>
                  {['assigned', 'inspection_paid', 'quoted', 'price_agreed', 'payment_escrowed', 'in_progress', 'completed', 'disputed'].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={(e) => { e.stopPropagation(); setDisputeJob(job); }}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> File a Dispute
                    </Button>
                  )}
                </JobCard>
              ))}
            </div>
          )}
        </div>

        {/* Past Jobs */}
        {pastJobs.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Past Jobs ({pastJobs.length})</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {pastJobs.map((job) => <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />)}
            </div>
          </div>
        )}

        <Separator className="my-8" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/request-service')}>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2"><Search className="h-6 w-6" /></div>
              <CardTitle>Request a Service</CardTitle>
              <CardDescription>Find a skilled artisan near you.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/profile')}>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent mb-2"><User className="h-6 w-6" /></div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Update your info, location & password</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <JobDetailDialog job={selectedJob} open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        {/* 24hr refund for pending jobs with no artisan */}
        {selectedJob?.status === 'pending' && (() => {
          const hoursAgo = (Date.now() - new Date(selectedJob.created_at).getTime()) / 3600000;
          return hoursAgo >= 24 ? (
            <div className="pt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-warning" /><p className="text-sm font-medium text-warning">No artisan assigned in 24+ hours</p></div>
              <p className="text-xs text-muted-foreground mb-3">You're eligible for a full refund. Open a dispute to request it.</p>
              <Button variant="outline" size="sm" className="w-full border-warning/50 text-warning hover:bg-warning/10"
                onClick={() => { setSelectedJob(null); setDisputeJob(selectedJob); }}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Request Refund (Open Dispute)
              </Button>
            </div>
          ) : (
            <div className="pt-4 rounded-lg border border-border bg-muted/20 p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Waiting for admin to assign an artisan. If no artisan after 24hrs, you can request a refund.</p>
            </div>
          );
        })()}

        {/* Artisan has been assigned — show artisan info (name + phone only, no address) */}
        {selectedJob?.status === 'assigned' && (
          <div className="pt-4 space-y-3 border-t">
            {(selectedJob as any).artisan_profile && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Artisan</p>
                {(selectedJob as any).artisan_profile?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{(selectedJob as any).artisan_profile.full_name}</span>
                  </div>
                )}
                {(selectedJob as any).artisan_profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${(selectedJob as any).artisan_profile.phone}`} className="text-primary font-medium">
                      {(selectedJob as any).artisan_profile.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">An artisan has been assigned and will visit you for inspection. Once the artisan marks inspection as done, you'll need to confirm here.</p>
            </div>
          </div>
        )}

        {/* Artisan marked inspection done — customer must confirm (status: inspection_requested) */}
        {(selectedJob?.status as any) === 'inspection_requested' && (
          <div className="pt-4 space-y-3 border-t">
            {(selectedJob as any).artisan_profile && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Artisan</p>
                {(selectedJob as any).artisan_profile?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{(selectedJob as any).artisan_profile.full_name}</span>
                  </div>
                )}
                {(selectedJob as any).artisan_profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${(selectedJob as any).artisan_profile.phone}`} className="text-primary font-medium">
                      {(selectedJob as any).artisan_profile.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="font-medium text-primary mb-1">Artisan has marked inspection as done</p>
                <p className="text-xs text-muted-foreground">Please confirm below that the artisan carried out the inspection at your location. This allows them to submit a quote.</p>
              </div>
              <Button className="w-full" onClick={() => handleConfirmInspection(selectedJob)} disabled={updateJob.isPending}>
                {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Yes, Inspection Was Carried Out
              </Button>
            </div>
          </div>
        )}

        {/* Inspection confirmed — show confirmation state */}
        {selectedJob?.status === 'inspection_paid' && (
          <div className="pt-4 space-y-3 border-t">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-sm">
              <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-success">Inspection Confirmed</p>
                <p className="text-xs text-muted-foreground mt-0.5">You have confirmed the inspection. The artisan is now preparing a quote for you.</p>
              </div>
            </div>
          </div>
        )}

        {/* Quote received — show breakdown and accept */}
        {selectedJob?.status === 'quoted' && (
          <div className="pt-4 space-y-3 border-t">
            {(selectedJob as any).artisan_profile && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Artisan</p>
                {(selectedJob as any).artisan_profile?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{(selectedJob as any).artisan_profile.full_name}</span>
                  </div>
                )}
                {(selectedJob as any).artisan_profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${(selectedJob as any).artisan_profile.phone}`} className="text-primary font-medium">
                      {(selectedJob as any).artisan_profile.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
            <h4 className="font-semibold text-sm">Quote Received</h4>
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-sm">
              {(selectedJob as any).material_cost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Materials</span>
                  <span>₦{((selectedJob as any).material_cost / 100).toLocaleString()}</span>
                </div>
              )}
              {(selectedJob as any).workmanship_cost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workmanship</span>
                  <span>₦{((selectedJob as any).workmanship_cost / 100).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-primary">₦{((selectedJob.quoted_amount || 0) / 100).toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => handleAcceptQuote(selectedJob)} disabled={updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Accept Quote & Proceed to Payment
            </Button>
          </div>
        )}

        {/* Pay for job (escrow) — shown right after accepting or when returning to price_agreed */}
        {selectedJob?.status === 'price_agreed' && (
          <div className="pt-4 space-y-3 border-t">
            {(selectedJob as any).artisan_profile && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Artisan</p>
                {(selectedJob as any).artisan_profile?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{(selectedJob as any).artisan_profile.full_name}</span>
                  </div>
                )}
                {(selectedJob as any).artisan_profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${(selectedJob as any).artisan_profile.phone}`} className="text-primary font-medium">
                      {(selectedJob as any).artisan_profile.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
              <p className="font-medium text-warning mb-1">Payment Required to Begin Work</p>
              <p className="text-xs text-muted-foreground">Your quote has been accepted. Please complete payment to allow the artisan to proceed. Payment is held securely in escrow until you confirm the job is done.</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-sm">
              {(selectedJob as any).material_cost != null && (
                <div className="flex justify-between"><span className="text-muted-foreground">Materials</span><span>₦{((selectedJob as any).material_cost / 100).toLocaleString()}</span></div>
              )}
              {(selectedJob as any).workmanship_cost != null && (
                <div className="flex justify-between"><span className="text-muted-foreground">Workmanship</span><span>₦{((selectedJob as any).workmanship_cost / 100).toLocaleString()}</span></div>
              )}
              <div className="flex justify-between font-bold border-t pt-2"><span>Total to Pay</span><span className="text-primary">₦{((selectedJob.quoted_amount || 0) / 100).toLocaleString()}</span></div>
              {walletBalance > 0 && (() => {
                const total = selectedJob.quoted_amount || 0;
                const credit = Math.min(walletBalance, total);
                const remaining = total - credit;
                return (
                  <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/20 rounded px-2 py-1 mt-1">
                    <Wallet className="h-3 w-3 shrink-0" />
                    {remaining === 0
                      ? `₦${(total / 100).toLocaleString()} will be fully paid from wallet credit`
                      : `₦${(credit / 100).toLocaleString()} wallet credit applied — pay ₦${(remaining / 100).toLocaleString()} by card`}
                  </div>
                );
              })()}
            </div>
            <Button className="w-full" onClick={() => handlePayForJob(selectedJob)} disabled={initPayment.isPending || payWithWallet.isPending}>
              {(initPayment.isPending || payWithWallet.isPending) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {(() => {
                const total = selectedJob.quoted_amount || 0;
                const remaining = Math.max(0, total - walletBalance);
                return remaining === 0
                  ? `Pay ₦${(total / 100).toLocaleString()} with Wallet Credit`
                  : `Pay ₦${(remaining / 100).toLocaleString()}${walletBalance > 0 ? ' (after wallet credit)' : ''} (Held in Escrow)`;
              })()}
            </Button>
          </div>
        )}

        {/* Escrow indicator */}
        {selectedJob?.status === 'payment_escrowed' && (
          <div className="pt-4 space-y-3 border-t">
            {(selectedJob as any).artisan_profile && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Artisan</p>
                {(selectedJob as any).artisan_profile?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{(selectedJob as any).artisan_profile.full_name}</span>
                  </div>
                )}
                {(selectedJob as any).artisan_profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${(selectedJob as any).artisan_profile.phone}`} className="text-primary font-medium">
                      {(selectedJob as any).artisan_profile.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <CreditCard className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-medium">Payment Held in Escrow</p>
              <p className="text-xs text-muted-foreground">₦{((selectedJob.final_amount || selectedJob.quoted_amount || 0) / 100).toLocaleString()} • Artisan is working on your job</p>
            </div>
          </div>
        )}

        {/* Artisan submitted proof — customer confirms */}
        {selectedJob?.status === 'completed' && (
          <div className="pt-4 space-y-3 border-t">
            {(selectedJob as any).artisan_profile && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Artisan</p>
                {(selectedJob as any).artisan_profile?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{(selectedJob as any).artisan_profile.full_name}</span>
                  </div>
                )}
                {(selectedJob as any).artisan_profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${(selectedJob as any).artisan_profile.phone}`} className="text-primary font-medium">
                      {(selectedJob as any).artisan_profile.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-primary mb-1">Artisan submitted proof of completion</p>
              <p className="text-xs text-muted-foreground">Photos have been uploaded. Please review them above and confirm below if the job was done to your satisfaction. This will release payment to the artisan.</p>
            </div>
            <Button className="w-full" onClick={() => handleConfirmComplete(selectedJob)} disabled={releasePayment.isPending}>
              {releasePayment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirm Job Complete & Release Payment
            </Button>
            <p className="text-xs text-muted-foreground text-center">This will activate a 30-day guarantee.</p>
          </div>
        )}

        {/* Rate & Review */}
        {selectedJob?.status === 'confirmed' && selectedJob.artisan_id && (
          <div className="pt-4 space-y-2 border-t">
            <Button variant="outline" className="w-full" onClick={() => { setSelectedJob(null); setReviewJob(selectedJob); }}>
              <Star className="h-4 w-4 mr-2" /> Rate This Job
            </Button>
            {selectedJob.guarantee_expires_at && new Date(selectedJob.guarantee_expires_at) > new Date() && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center text-sm">
                <Shield className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="font-medium text-primary">30-Day Guarantee Active</p>
                <p className="text-xs text-muted-foreground">Expires {new Date(selectedJob.guarantee_expires_at).toLocaleDateString()}</p>
                <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive"
                  onClick={() => { setSelectedJob(null); setDisputeJob(selectedJob); }}>
                  <AlertTriangle className="h-3 w-3 mr-1" /> Open Dispute
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Payment history */}
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
                    p.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing open dispute on this job */}
        {selectedJobDispute && (
          <div className="pt-4 border-t">
            <div className={`rounded-lg p-3 space-y-1 text-sm ${
              selectedJobDispute.status === 'open' ? 'bg-destructive/5 border border-destructive/20' :
              selectedJobDispute.status === 'resolved' ? 'bg-green-50 border border-green-200' :
              'bg-muted border'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 shrink-0 ${selectedJobDispute.status === 'open' ? 'text-destructive' : 'text-muted-foreground'}`} />
                <p className="font-semibold capitalize">Dispute: {selectedJobDispute.status}</p>
              </div>
              <p className="text-xs text-muted-foreground">"{selectedJobDispute.reason}"</p>
              {selectedJobDispute.preferred_refund_type && (
                <p className="text-xs">Preference: <span className="font-medium">{selectedJobDispute.preferred_refund_type === 'wallet_credit' ? '💳 Wallet Credit' : '🏦 Cash Refund'}</span></p>
              )}
              {selectedJobDispute.resolution_notes && (
                <p className="text-xs bg-white/50 rounded p-1.5 mt-1">Resolution: {selectedJobDispute.resolution_notes}</p>
              )}
            </div>
          </div>
        )}

        {/* File dispute button inside detail dialog */}
        {selectedJob && !selectedJobDispute && ['assigned', 'inspection_paid', 'quoted', 'price_agreed', 'payment_escrowed', 'in_progress', 'completed'].includes(selectedJob.status) && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => { setSelectedJob(null); setDisputeJob(selectedJob); }}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> File a Dispute for This Job
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-1">Use this if you have a concern about the job or the artisan.</p>
          </div>
        )}
      </JobDetailDialog>

      <ReviewDialog job={reviewJob} open={!!reviewJob} onOpenChange={(o) => !o && setReviewJob(null)} />
      <DisputeDialog job={disputeJob} open={!!disputeJob} onOpenChange={(o) => !o && setDisputeJob(null)} />
      <GeneralDisputeDialog open={showGeneralDispute} onOpenChange={setShowGeneralDispute} userRole="customer" />
    </div>
  );
};

export default CustomerDashboard;
