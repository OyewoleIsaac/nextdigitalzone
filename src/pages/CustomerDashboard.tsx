import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCustomerJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, LogOut, Loader2, Search, ClipboardList, User, CreditCard, Star, AlertTriangle, Shield, Clock, Wallet, ReceiptText, MessageCircleWarning, CheckCircle, FileWarning } from 'lucide-react';
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
  const { data: jobs, isLoading: jobsLoading } = useCustomerJobs();
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

  // Pay upfront fee (inspection or agency) for draft jobs
  const handlePayDraftFee = async (job: Job, useWalletCredit = false) => {
    // Find the fee amount from the payment record or job
    const feeAmount = job.inspection_fee || 500000;
    if (useWalletCredit) {
      payWithWallet.mutate({ job_id: job.id, amount: feeAmount });
      return;
    }
    try {
      const result = await initPayment.mutateAsync({
        job_id: job.id,
        payment_type: 'inspection_fee',
        amount: feeAmount,
      });
      window.location.href = result.authorization_url;
    } catch { /* handled */ }
  };

  // Customer confirms inspection happened
  const handleConfirmInspection = async (job: Job) => {
    if (!user) return;
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

  // Pay for quoted job (material + workmanship)
  const handlePayForJob = async (job: Job) => {
    const amount = job.quoted_amount || job.final_amount;
    if (!amount) return;
    try {
      const result = await initPayment.mutateAsync({ job_id: job.id, payment_type: 'job_payment', amount });
      window.open(result.authorization_url, '_blank');
    } catch { /* handled */ }
  };

  // Accept quote & move to price_agreed
  const handleAcceptQuote = async (job: Job) => {
    if (!user) return;
    await updateJob.mutateAsync({ id: job.id, status: 'price_agreed' as any });
    await addHistory.mutateAsync({
      job_id: job.id,
      old_status: job.status,
      new_status: 'price_agreed',
      changed_by: user.id,
      notes: 'Customer accepted the quote',
    });
    toast.success('Quote accepted! Proceed to pay.');
    setSelectedJob(null);
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
              {draftJobs.map((job) => (
                <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)}>
                  <div className="flex gap-2 mt-2">
                    {walletBalance >= (job.inspection_fee || 500000) ? (
                      <>
                        <Button size="sm" className="flex-1" variant="outline"
                          onClick={(e) => { e.stopPropagation(); handlePayDraftFee(job, false); }}
                          disabled={initPayment.isPending || payWithWallet.isPending}>
                          <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Pay by Card
                        </Button>
                        <Button size="sm" className="flex-1"
                          onClick={(e) => { e.stopPropagation(); handlePayDraftFee(job, true); }}
                          disabled={payWithWallet.isPending || initPayment.isPending}>
                          <Wallet className="h-3.5 w-3.5 mr-1.5" /> Pay with Credit
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="w-full"
                        onClick={(e) => { e.stopPropagation(); handlePayDraftFee(job, false); }}
                        disabled={initPayment.isPending}>
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Pay ₦{((job.inspection_fee || 500000) / 100).toLocaleString()} to Activate
                      </Button>
                    )}
                  </div>
                </JobCard>
              ))}
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
              {activeJobs.map((job) => <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />)}
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

        {/* Artisan has done inspection — customer confirms */}
        {selectedJob?.status === 'assigned' && (
          <div className="pt-4 rounded-lg border border-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">An artisan has been assigned and will visit you for inspection. Once the artisan marks inspection as done, you'll need to confirm here.</p>
          </div>
        )}

        {/* Artisan marked inspection done — customer confirms */}
        {selectedJob?.status === 'inspection_paid' && (
          <div className="pt-4 space-y-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-primary mb-1">Artisan marked inspection as done</p>
              <p className="text-xs text-muted-foreground">Please confirm below that the artisan did carry out the inspection at your location.</p>
            </div>
            <Button className="w-full" onClick={() => handleConfirmInspection(selectedJob)} disabled={updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Yes, Inspection Was Carried Out
            </Button>
          </div>
        )}

        {/* Quote received — show breakdown and accept */}
        {selectedJob?.status === 'quoted' && (
          <div className="pt-4 space-y-3">
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
              Accept Quote & Proceed to Payment
            </Button>
          </div>
        )}

        {/* Pay for job (escrow) */}
        {selectedJob?.status === 'price_agreed' && (
          <div className="pt-4 space-y-2">
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-sm">
              {(selectedJob as any).material_cost != null && (
                <div className="flex justify-between"><span className="text-muted-foreground">Materials</span><span>₦{((selectedJob as any).material_cost / 100).toLocaleString()}</span></div>
              )}
              {(selectedJob as any).workmanship_cost != null && (
                <div className="flex justify-between"><span className="text-muted-foreground">Workmanship</span><span>₦{((selectedJob as any).workmanship_cost / 100).toLocaleString()}</span></div>
              )}
              <div className="flex justify-between font-bold border-t pt-2"><span>Total to Pay</span><span className="text-primary">₦{((selectedJob.quoted_amount || 0) / 100).toLocaleString()}</span></div>
            </div>
            <Button className="w-full" onClick={() => handlePayForJob(selectedJob)} disabled={initPayment.isPending}>
              {initPayment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay ₦{((selectedJob.quoted_amount || 0) / 100).toLocaleString()} (Held in Escrow)
            </Button>
            <p className="text-xs text-muted-foreground text-center">Payment is held securely until you confirm the job is complete.</p>
          </div>
        )}

        {/* Escrow indicator */}
        {selectedJob?.status === 'payment_escrowed' && (
          <div className="pt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <CreditCard className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-sm font-medium">Payment Held in Escrow</p>
            <p className="text-xs text-muted-foreground">₦{((selectedJob.final_amount || selectedJob.quoted_amount || 0) / 100).toLocaleString()} • Released when you confirm completion</p>
          </div>
        )}

        {/* Confirm completion */}
        {selectedJob?.status === 'completed' && (
          <div className="pt-4 space-y-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-primary mb-1">Artisan marked job as completed</p>
              <p className="text-xs text-muted-foreground">Please confirm the job has been done to your satisfaction. This will release payment to the artisan.</p>
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
          <div className="pt-4 space-y-2">
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
      </JobDetailDialog>

      <ReviewDialog job={reviewJob} open={!!reviewJob} onOpenChange={(o) => !o && setReviewJob(null)} />
      <DisputeDialog job={disputeJob} open={!!disputeJob} onOpenChange={(o) => !o && setDisputeJob(null)} />
      <GeneralDisputeDialog open={showGeneralDispute} onOpenChange={setShowGeneralDispute} userRole="customer" />
    </div>
  );
};

export default CustomerDashboard;
