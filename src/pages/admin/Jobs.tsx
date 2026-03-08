import { useState } from 'react';
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
import { MapPin, Search, UserPlus, Loader2, XCircle, CheckCircle, AlertCircle, Phone, User, DollarSign, Package, Wrench } from 'lucide-react';
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
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: jobs, isLoading } = useAllJobs(statusFilter);
  const updateJob = useUpdateJob();
  const addHistory = useAddJobHistory();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [assignDialogJob, setAssignDialogJob] = useState<Job | null>(null);
  const [rejectDialogJob, setRejectDialogJob] = useState<Job | null>(null);
  const [salaryDialogJob, setSalaryDialogJob] = useState<Job | null>(null);
  const [artisans, setArtisans] = useState<ArtisanOption[]>([]);
  const [loadingArtisans, setLoadingArtisans] = useState(false);
  const [searchArtisan, setSearchArtisan] = useState('');
  const [showAllArtisans, setShowAllArtisans] = useState(false);
  const [agreedSalary, setAgreedSalary] = useState('');

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
        // Only include artisans that have a matching profile (filter ghost artisans)
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
      status: isAgency ? 'assigned' as any : 'assigned' as any,
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
    if (!user) return;
    await updateJob.mutateAsync({ id: job.id, workmanship_released_at: new Date().toISOString() } as any);
    await addHistory.mutateAsync({
      job_id: job.id,
      old_status: job.status,
      new_status: job.status,
      changed_by: user.id,
      notes: 'Admin confirmed workmanship payment released to artisan',
    });
    toast.success('Workmanship payment released!');
    setSelectedJob(null);
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

  // Helper: fetch customer profile for a job
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
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{job.description}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {job.category && <span>{job.category.name}</span>}
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.address}</span>
                        <span>{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      {/* Participant info */}
                      <div className="flex flex-wrap gap-4 mt-2">
                        {customerProfile && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="font-medium">{customerProfile.full_name}</span>
                            {customerProfile.phone && (
                              <a href={`tel:${customerProfile.phone}`} className="flex items-center gap-0.5 text-primary">
                                <Phone className="h-3 w-3" />{customerProfile.phone}
                              </a>
                            )}
                          </div>
                        )}
                        {artisanProfile && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Wrench className="h-3 w-3" />
                            <span className="font-medium">{artisanProfile.full_name}</span>
                            <Badge variant="outline" className="text-[10px] h-4">Artisan</Badge>
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
                      {/* Agency: set salary */}
                      {job.status === 'assigned' && !(job as any).agreed_salary && (
                        <Button size="sm" variant="outline" onClick={() => setSalaryDialogJob(job)}>
                          <DollarSign className="h-4 w-4 mr-1" /> Set Salary
                        </Button>
                      )}
                      {/* Allocate materials after payment */}
                      {job.status === 'payment_escrowed' && !(job as any).materials_allocated_at && (
                        <Button size="sm" onClick={() => handleAllocateMaterials(job)} disabled={updateJob.isPending}>
                          <Package className="h-4 w-4 mr-1" /> Allocate Materials
                        </Button>
                      )}
                      {/* Release workmanship after customer confirms */}
                      {job.status === 'confirmed' && !(job as any).workmanship_released_at && (
                        <Button size="sm" variant="outline" onClick={() => handleReleaseWorkmanship(job)} disabled={updateJob.isPending}>
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
            <Button className="w-full" onClick={() => handleReleaseWorkmanship(selectedJob)} disabled={updateJob.isPending}>
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
              Confirm Workmanship % Released to Artisan
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

      {/* Set Agreed Salary Dialog (Agency jobs) */}
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
                    <p className="text-sm text-muted-foreground text-center py-4">No available artisans found. Make sure artisans are registered and verified.</p>
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
