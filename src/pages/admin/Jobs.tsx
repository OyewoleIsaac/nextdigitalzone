import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllJobs, useUpdateJob, useAddJobHistory } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { JobRejectDialog } from '@/components/admin/JobRejectDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Search, UserPlus, Loader2, XCircle, CheckCircle, AlertCircle, Phone, User, DollarSign, Package, Wrench, ExternalLink, Building2, AlertTriangle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import type { Job } from '@/hooks/useJobs';

interface ArtisanOption {
  id: string;
  user_id: string;
  category_id: string | null;
  custom_category: string | null;
  rating_avg: number;
  completed_jobs: number;
  total_jobs: number;
  service_radius_km: number;
  latitude: number;
  longitude: number;
  profile?: { full_name: string; phone: string; address: string | null; is_verified: boolean };
  distance_km: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AdminJobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: jobs, isLoading } = useAllJobs(statusFilter);
  const updateJob = useUpdateJob();
  const addHistory = useAddJobHistory();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [assignDialogJob, setAssignDialogJob] = useState<Job | null>(null);
  const [rejectDialogJob, setRejectDialogJob] = useState<Job | null>(null);
  const [salaryDialogJob, setSalaryDialogJob] = useState<Job | null>(null);
  const [releaseDialogJob, setReleaseDialogJob] = useState<Job | null>(null);
  const [releaseArtisanBank, setReleaseArtisanBank] = useState<{ bank_name?: string; account_number?: string; account_name?: string } | null>(null);
  const [loadingReleaseBank, setLoadingReleaseBank] = useState(false);
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [artisans, setArtisans] = useState<ArtisanOption[]>([]);
  const [loadingArtisans, setLoadingArtisans] = useState(false);
  const [searchArtisan, setSearchArtisan] = useState('');
  const [showAllArtisans, setShowAllArtisans] = useState(false);
  const [agreedSalary, setAgreedSalary] = useState('');

  const openReleaseDialog = async (job: Job) => {
    setReleaseDialogJob(job);
    setReleaseArtisanBank(null);
    if (job.artisan_id) {
      setLoadingReleaseBank(true);
      try {
        const { data } = await supabase
          .from('artisan_profiles')
          .select('bank_name, bank_code, account_number, account_name')
          .eq('user_id', job.artisan_id)
          .maybeSingle();
        setReleaseArtisanBank(data || {});
      } catch {
        setReleaseArtisanBank({});
      } finally {
        setLoadingReleaseBank(false);
      }
    }
  };

  const fetchArtisans = async (job: Job) => {
    setAssignDialogJob(job);
    setLoadingArtisans(true);
    setShowAllArtisans(false);
    try {
      const { data: artisanData, error: artisanError } = await supabase
        .from('artisan_profiles')
        .select('*')
        .eq('is_available', true);
      if (artisanError) throw artisanError;
      if (!artisanData || artisanData.length === 0) { setArtisans([]); return; }

      const userIds = artisanData.map((a: any) => a.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, address, is_verified')
        .in('user_id', userIds);
      if (profileError) throw profileError;

      const profileMap = Object.fromEntries((profileData || []).map((p: any) => [p.user_id, p]));

      const withDistance: ArtisanOption[] = artisanData
        .filter((a: any) => !!profileMap[a.user_id])
        .map((a: any) => ({
          ...a,
          profile: profileMap[a.user_id],
          distance_km: haversineDistance(job.latitude, job.longitude, a.latitude, a.longitude),
          same_category: job.category_id ? a.category_id === job.category_id : false,
        })).sort((a: any, b: any) => {
          if (a.same_category !== b.same_category) return a.same_category ? -1 : 1;
          return a.distance_km - b.distance_km;
        });

      setArtisans(withDistance);
    } catch (err: any) {
      toast.error('Failed to load artisans: ' + (err.message || 'Unknown error'));
      setArtisans([]);
    } finally {
      setLoadingArtisans(false);
    }
  };

  const handleAssign = async (artisanUserId: string) => {
    if (!assignDialogJob || !user) return;
    const isAgency = !!(assignDialogJob as any).category?.is_agency_job;
    await updateJob.mutateAsync({
      id: assignDialogJob.id,
      artisan_id: artisanUserId,
      status: 'assigned' as any,
      assigned_by: 'admin',
      admin_assigner_id: user.id,
      ...(isAgency ? { artisan_offer_status: 'pending' } : {}),
    } as any);
    await addHistory.mutateAsync({
      job_id: assignDialogJob.id,
      old_status: assignDialogJob.status,
      new_status: 'assigned',
      changed_by: user.id,
      notes: isAgency ? 'Admin sent placement offer to artisan' : 'Admin assigned artisan to job',
    });
    toast.success(isAgency ? 'Offer sent to artisan!' : 'Artisan assigned successfully!');
    setAssignDialogJob(null);
  };

  const handleRejectJob = async (reason: string) => {
    if (!rejectDialogJob || !user) return;
    await updateJob.mutateAsync({ id: rejectDialogJob.id, status: 'cancelled' as any, cancellation_reason: reason || 'Cancelled by admin' });
    await addHistory.mutateAsync({
      job_id: rejectDialogJob.id,
      old_status: rejectDialogJob.status,
      new_status: 'cancelled',
      changed_by: user.id,
      notes: reason || 'Cancelled by admin',
    });
    toast.success('Job cancelled.');
    setRejectDialogJob(null);
  };

  const handleSetSalary = async () => {
    if (!salaryDialogJob || !user || !agreedSalary) return;
    const salaryKobo = Math.round(parseFloat(agreedSalary) * 100);
    await updateJob.mutateAsync({ id: salaryDialogJob.id, agreed_salary: salaryKobo } as any);
    await addHistory.mutateAsync({
      job_id: salaryDialogJob.id,
      old_status: salaryDialogJob.status,
      new_status: salaryDialogJob.status,
      changed_by: user.id,
      notes: `Admin set agreed salary: ₦${agreedSalary}/month`,
    });
    toast.success('Agreed salary set!');
    setSalaryDialogJob(null);
    setAgreedSalary('');
  };

  const handleAllocateMaterials = async (job: Job) => {
    if (!user) return;
    await updateJob.mutateAsync({ id: job.id, materials_allocated_at: new Date().toISOString(), status: 'in_progress' as any } as any);
    await addHistory.mutateAsync({
      job_id: job.id,
      old_status: job.status,
      new_status: 'in_progress',
      changed_by: user.id,
      notes: 'Admin confirmed materials budget allocated to artisan',
    });
    toast.success('Materials allocated! Job marked as in progress.');
    setSelectedJob(null);
  };

  const handleReleaseWorkmanship = async (job: Job) => {
    if (!user || !releaseDialogJob) return;
    setConfirmingRelease(true);
    try {
      await updateJob.mutateAsync({ id: job.id, workmanship_released_at: new Date().toISOString() } as any);
      const hasBankDetails = !!(releaseArtisanBank as any)?.account_number;
      await addHistory.mutateAsync({
        job_id: job.id,
        old_status: job.status,
        new_status: job.status,
        changed_by: user.id,
        notes: hasBankDetails
          ? `Admin confirmed workmanship payment manually transferred to artisan bank account: ${(releaseArtisanBank as any)?.bank_name} (${(releaseArtisanBank as any)?.account_name} · ${(releaseArtisanBank as any)?.account_number})`
          : 'Admin confirmed workmanship payment released to artisan (no bank account on file)',
      });
      toast.success('Workmanship payment marked as released!');
      setReleaseDialogJob(null);
      setSelectedJob(null);
    } finally {
      setConfirmingRelease(false);
    }
  };

  const statusOptions = [
    'all', 'pending', 'assigned', 'quoted', 'inspection_requested',
    'inspection_paid', 'price_agreed', 'payment_escrowed', 'in_progress',
    'completed', 'confirmed', 'disputed', 'cancelled',
  ];

  const nearbyArtisans = artisans.filter(a => a.distance_km <= a.service_radius_km);
  const otherArtisans = artisans.filter(a => a.distance_km > a.service_radius_km);
  const displayedArtisans = showAllArtisans ? artisans : nearbyArtisans;
  const filteredArtisans = displayedArtisans.filter((a) => {
    if (!searchArtisan) return true;
    const name = a.profile?.full_name || '';
    return name.toLowerCase().includes(searchArtisan.toLowerCase());
  });

  const getCustomerDetails = (job: Job) => (job as any).customer_profile;
  const getArtisanDetails = (job: Job) => (job as any).artisan_profile;

  return (
    <AdminLayout title="Job Management">
      <div className="flex items-center gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Jobs' : s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{jobs?.length || 0} jobs</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : jobs?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No jobs found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {jobs?.map((job) => {
            const customerProfile = getCustomerDetails(job);
            const artisanProfile = getArtisanDetails(job);
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{job.title}</h3>
                        <JobStatusBadge status={job.status} />
                        {job.status === 'disputed' && (
                          <Badge variant="destructive" className="text-[10px] h-4 gap-0.5">
                            <AlertCircle className="h-2.5 w-2.5" /> Disputed
                          </Badge>
                        )}
                        {job.status === 'price_agreed' && (
                          <Badge variant="outline" className="text-[10px] h-4 gap-0.5 border-warning/50 text-warning">
                            <AlertCircle className="h-2.5 w-2.5" /> Awaiting Payment
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{job.description}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {job.category && <span>{job.category.name}</span>}
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.address}</span>
                        <span>{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {/* Participant info — names are clickable links to their profiles */}
                      <div className="flex flex-wrap gap-4 mt-2">
                        {customerProfile && (
                          <div className="flex items-center gap-1 text-xs">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <button
                              onClick={() => navigate('/admin/clients')}
                              className="font-medium text-primary hover:underline flex items-center gap-0.5"
                              title="View customer submissions"
                            >
                              {customerProfile.full_name}
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </button>
                            {customerProfile.phone && (
                              <a href={`tel:${customerProfile.phone}`} className="flex items-center gap-0.5 text-muted-foreground hover:text-primary ml-1">
                                <Phone className="h-3 w-3" />{customerProfile.phone}
                              </a>
                            )}
                          </div>
                        )}
                        {artisanProfile && (
                          <div className="flex items-center gap-1 text-xs">
                            <Wrench className="h-3 w-3 text-muted-foreground" />
                            <button
                              onClick={() => navigate('/admin/artisans')}
                              className="font-medium text-primary hover:underline flex items-center gap-0.5"
                              title="View artisan submissions"
                            >
                              {artisanProfile.full_name}
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </button>
                            <Badge variant="outline" className="text-[10px] h-4 ml-1">Artisan</Badge>
                          </div>
                        )}
                      </div>
                      {/* Quote breakdown */}
                      {((job as any).material_cost || (job as any).workmanship_cost) && (
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {(job as any).material_cost && <span className="flex items-center gap-1"><Package className="h-3 w-3" />Mat: ₦{((job as any).material_cost / 100).toLocaleString()}</span>}
                          {(job as any).workmanship_cost && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />Work: ₦{((job as any).workmanship_cost / 100).toLocaleString()}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>Details</Button>
                      {job.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => fetchArtisans(job)}>
                            <UserPlus className="h-4 w-4 mr-1" /> Assign
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setRejectDialogJob(job)}>
                            <XCircle className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        </>
                      )}
                      {job.status === 'assigned' && !(job as any).agreed_salary && (
                        <Button size="sm" variant="outline" onClick={() => setSalaryDialogJob(job)}>
                          <DollarSign className="h-4 w-4 mr-1" /> Set Salary
                        </Button>
                      )}
                      {job.status === 'payment_escrowed' && !(job as any).materials_allocated_at && (
                        <Button size="sm" onClick={() => handleAllocateMaterials(job)} disabled={updateJob.isPending}>
                          <Package className="h-4 w-4 mr-1" /> Allocate Materials
                        </Button>
                      )}
                      {job.status === 'confirmed' && !(job as any).workmanship_released_at && (
                        <Button size="sm" variant="outline" onClick={() => openReleaseDialog(job)} disabled={updateJob.isPending}>
                          <Wrench className="h-4 w-4 mr-1" /> Release Workmanship
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <JobDetailDialog job={selectedJob} open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        {/* Admin actions in detail dialog */}
        {selectedJob?.status === 'payment_escrowed' && !(selectedJob as any).materials_allocated_at && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="font-semibold text-sm">Admin Action Required</h4>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
              <p className="font-medium">Customer has paid for the job (escrow)</p>
              {(selectedJob as any).material_cost && (
                <p className="text-muted-foreground mt-1">Materials budget: ₦{((selectedJob as any).material_cost / 100).toLocaleString()}</p>
              )}
            </div>
            <Button className="w-full" onClick={() => handleAllocateMaterials(selectedJob)} disabled={updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
              Confirm Materials Allocated to Artisan
            </Button>
          </div>
        )}
        {selectedJob?.status === 'confirmed' && !(selectedJob as any).workmanship_released_at && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="font-semibold text-sm">Admin Action Required</h4>
            <div className="rounded-lg bg-success/5 border border-success/20 p-3 text-sm">
              <p className="font-medium">Customer confirmed job completion</p>
              {(selectedJob as any).workmanship_cost && (
                <p className="text-muted-foreground mt-1">Workmanship to release: ₦{((selectedJob as any).workmanship_cost / 100).toLocaleString()}</p>
              )}
            </div>
            <Button className="w-full" onClick={() => openReleaseDialog(selectedJob)} disabled={updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
              Release Workmanship Payment
            </Button>
          </div>
        )}
      </JobDetailDialog>

      <JobRejectDialog
        open={!!rejectDialogJob}
        jobTitle={rejectDialogJob?.title || ''}
        onClose={() => setRejectDialogJob(null)}
        onConfirm={handleRejectJob}
        isPending={updateJob.isPending}
      />

      {/* Release Workmanship Dialog */}
      <Dialog open={!!releaseDialogJob} onOpenChange={(open) => !open && setReleaseDialogJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Release Workmanship Payment
            </DialogTitle>
          </DialogHeader>
          {releaseDialogJob && (
            <div className="space-y-4 py-2">
              {/* Job summary */}
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <p className="font-medium">{releaseDialogJob.title}</p>
                {(releaseDialogJob as any).workmanship_cost && (
                  <p className="text-muted-foreground">
                    Workmanship amount (80% share):&nbsp;
                    <span className="font-semibold text-foreground">
                      ₦{(Math.round((releaseDialogJob as any).workmanship_cost * 0.8) / 100).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              {/* Artisan bank details */}
              {loadingReleaseBank ? (
                <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading artisan bank details...
                </div>
              ) : releaseArtisanBank && (releaseArtisanBank as any).account_number ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    Artisan Bank Account
                  </p>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{(releaseArtisanBank as any).bank_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Number</span>
                      <span className="font-mono font-semibold">{(releaseArtisanBank as any).account_number}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium">{(releaseArtisanBank as any).account_name}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    Please transfer the exact workmanship amount to the account above before clicking "Confirm Transfer Done".
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm font-medium text-destructive">No bank account on file</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This artisan has not added their bank details. Contact them directly to arrange payment, then confirm below.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogJob(null)}>Cancel</Button>
            <Button
              onClick={() => releaseDialogJob && handleReleaseWorkmanship(releaseDialogJob)}
              disabled={confirmingRelease || loadingReleaseBank}
            >
              {confirmingRelease
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming...</>
                : <><CheckCircle className="h-4 w-4 mr-2" />Confirm Transfer Done</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Agreed Salary Dialog */}
      <Dialog open={!!salaryDialogJob} onOpenChange={(open) => !open && setSalaryDialogJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Agreed Salary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="font-medium">{salaryDialogJob?.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">Agency / Staff Placement Job</p>
            </div>
            <div className="space-y-1">
              <Label>Agreed Monthly Salary (₦)</Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={agreedSalary}
                onChange={(e) => setAgreedSalary(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">30% of this salary (₦{agreedSalary ? (parseFloat(agreedSalary) * 0.3).toLocaleString() : '0'}) will be retained as platform commission from the artisan's first month.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryDialogJob(null)}>Cancel</Button>
            <Button onClick={handleSetSalary} disabled={!agreedSalary || updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Agreed Salary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Artisan Dialog */}
      <Dialog open={!!assignDialogJob} onOpenChange={(open) => !open && setAssignDialogJob(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Artisan to Job</DialogTitle>
          </DialogHeader>
          {assignDialogJob && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium">{assignDialogJob.title}</p>
                <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{assignDialogJob.address}</p>
                {(assignDialogJob as any).category?.is_agency_job && (
                  <Badge variant="outline" className="text-xs mt-1">Agency Job — artisan will receive an offer to accept/reject</Badge>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search artisans..." className="pl-9" value={searchArtisan} onChange={(e) => setSearchArtisan(e.target.value)} />
              </div>

              {loadingArtisans ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  {!showAllArtisans && nearbyArtisans.length === 0 && otherArtisans.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-warning">No artisans within service radius</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{otherArtisans.length} artisan(s) available outside their listed radius.</p>
                        <button type="button" className="text-xs text-primary underline mt-1" onClick={() => setShowAllArtisans(true)}>
                          Show all {artisans.length} artisan(s) anyway
                        </button>
                      </div>
                    </div>
                  )}
                  {showAllArtisans && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded">
                      <span>Showing all {artisans.length} artisan(s)</span>
                      <button type="button" className="text-primary underline" onClick={() => setShowAllArtisans(false)}>Show nearby only</button>
                    </div>
                  )}

                  {filteredArtisans.length === 0 && artisans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No available artisans found.</p>
                  ) : filteredArtisans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No results match your search.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredArtisans.map((artisan) => {
                        const prof = artisan.profile;
                        const isNearby = artisan.distance_km <= artisan.service_radius_km;
                        return (
                          <div key={artisan.id} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm truncate">{prof?.full_name || 'Unknown'}</p>
                                {prof?.is_verified && <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className={isNearby ? 'text-success' : 'text-warning'}>
                                  {artisan.distance_km.toFixed(1)} km{isNearby ? '' : ' (outside radius)'}
                                </span>
                                <span>⭐ {artisan.rating_avg}</span>
                                <span>{artisan.completed_jobs}/{artisan.total_jobs} jobs</span>
                                {prof?.phone && <a href={`tel:${prof.phone}`} className="flex items-center gap-0.5 text-primary"><Phone className="h-3 w-3" />{prof.phone}</a>}
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleAssign(artisan.user_id)} disabled={updateJob.isPending}>
                              Assign
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminJobs;
