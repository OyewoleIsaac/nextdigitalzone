import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllJobs, useUpdateJob, useAddJobHistory } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { JobRejectDialog } from '@/components/admin/JobRejectDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Search, UserPlus, Loader2, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
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
  profile?: { full_name: string; phone: string; address: string | null; is_verified: boolean }[];
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
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
  const [artisans, setArtisans] = useState<(ArtisanOption & { distance_km: number })[]>([]);
  const [loadingArtisans, setLoadingArtisans] = useState(false);
  const [searchArtisan, setSearchArtisan] = useState('');
  const [showAllArtisans, setShowAllArtisans] = useState(false);

  const fetchArtisans = async (job: Job) => {
    setAssignDialogJob(job);
    setLoadingArtisans(true);
    setShowAllArtisans(false);
    try {
      // Fetch ALL verified artisans with their profiles
      let query = supabase
        .from('artisan_profiles')
        .select('*, profile:profiles!artisan_profiles_user_id_fkey(full_name, phone, address, is_verified)')
        .eq('is_available', true);

      // Filter by category if job has one
      if (job.category_id) {
        query = query.eq('category_id', job.category_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Compute distances and sort (nearest first, but don't filter out by radius)
      const withDistance = (data || []).map((a: any) => ({
        ...a,
        distance_km: haversineDistance(job.latitude, job.longitude, a.latitude, a.longitude),
      })).sort((a: any, b: any) => a.distance_km - b.distance_km);

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
    await updateJob.mutateAsync({
      id: assignDialogJob.id,
      artisan_id: artisanUserId,
      status: 'assigned' as any,
      assigned_by: 'admin',
      admin_assigner_id: user.id,
    });
    await addHistory.mutateAsync({
      job_id: assignDialogJob.id,
      old_status: assignDialogJob.status,
      new_status: 'assigned',
      changed_by: user.id,
      notes: 'Admin assigned artisan to job',
    });
    toast.success('Artisan assigned successfully!');
    setAssignDialogJob(null);
  };

  const handleRejectJob = async (reason: string) => {
    if (!rejectDialogJob || !user) return;
    await updateJob.mutateAsync({
      id: rejectDialogJob.id,
      status: 'cancelled' as any,
      cancellation_reason: reason || 'Cancelled by admin',
    });
    await addHistory.mutateAsync({
      job_id: rejectDialogJob.id,
      old_status: rejectDialogJob.status,
      new_status: 'cancelled',
      changed_by: user.id,
      notes: reason || 'Cancelled by admin',
    });
    toast.success('Job cancelled and customer notified.');
    setRejectDialogJob(null);
  };

  const statusOptions = [
    'all', 'pending', 'assigned', 'quoted', 'inspection_requested',
    'inspection_paid', 'price_agreed', 'payment_escrowed', 'in_progress',
    'completed', 'confirmed', 'disputed', 'cancelled',
  ];

  // Nearby = within service radius, All = everything else
  const nearbyArtisans = artisans.filter(a => a.distance_km <= a.service_radius_km);
  const otherArtisans = artisans.filter(a => a.distance_km > a.service_radius_km);
  const displayedArtisans = showAllArtisans ? artisans : nearbyArtisans;

  const filteredArtisans = displayedArtisans.filter((a) => {
    if (!searchArtisan) return true;
    const name = (a.profile as any)?.[0]?.full_name || '';
    return name.toLowerCase().includes(searchArtisan.toLowerCase());
  });

  return (
    <AdminLayout title="Job Management">
      {/* Status Filter */}
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

      {/* Jobs Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : jobs?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No jobs found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs?.map((job) => (
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
                      {job.artisan_id && <Badge variant="outline" className="text-xs">Assigned</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>
                      Details
                    </Button>
                    {job.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => fetchArtisans(job)}>
                          <UserPlus className="h-4 w-4 mr-1" /> Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setRejectDialogJob(job)}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Job Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => !open && setSelectedJob(null)}
      />

      {/* Job Reject/Cancel Dialog */}
      <JobRejectDialog
        open={!!rejectDialogJob}
        jobTitle={rejectDialogJob?.title || ''}
        onClose={() => setRejectDialogJob(null)}
        onConfirm={handleRejectJob}
        isPending={updateJob.isPending}
      />

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
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {assignDialogJob.address}
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search artisans..."
                  className="pl-9"
                  value={searchArtisan}
                  onChange={(e) => setSearchArtisan(e.target.value)}
                />
              </div>

              {loadingArtisans ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* No nearby artisans warning */}
                  {!showAllArtisans && nearbyArtisans.length === 0 && otherArtisans.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-warning">No artisans within service radius</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {otherArtisans.length} artisan(s) available outside their listed radius.
                        </p>
                        <button
                          type="button"
                          className="text-xs text-primary underline mt-1"
                          onClick={() => setShowAllArtisans(true)}
                        >
                          Show all {artisans.length} artisan(s) anyway
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Toggle back to nearby */}
                  {showAllArtisans && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded">
                      <span>Showing all {artisans.length} artisan(s)</span>
                      <button type="button" className="text-primary underline" onClick={() => setShowAllArtisans(false)}>
                        Show nearby only
                      </button>
                    </div>
                  )}

                  {filteredArtisans.length === 0 && artisans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No available artisans found{assignDialogJob.category_id ? ' for this category' : ''}. Make sure artisans are registered and verified.
                    </p>
                  ) : filteredArtisans.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No results match your search.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredArtisans.map((artisan) => {
                        const prof = (artisan.profile as any)?.[0];
                        const isNearby = artisan.distance_km <= artisan.service_radius_km;
                        return (
                          <div key={artisan.id} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm truncate">{prof?.full_name || 'Unknown'}</p>
                                {prof?.is_verified && (
                                  <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className={isNearby ? 'text-success' : 'text-warning'}>
                                  {artisan.distance_km.toFixed(1)} km away
                                  {isNearby ? '' : ' (outside radius)'}
                                </span>
                                <span>⭐ {artisan.rating_avg}</span>
                                <span>{artisan.completed_jobs}/{artisan.total_jobs} jobs</span>
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
