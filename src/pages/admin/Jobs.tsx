import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllJobs, useUpdateJob, useAddJobHistory } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Search, UserPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Job } from '@/hooks/useJobs';

interface NearbyArtisan {
  id: string;
  user_id: string;
  category_id: string | null;
  distance_km: number;
  rating_avg: number;
  completed_jobs: number;
  cancelled_jobs: number;
  total_jobs: number;
  profile?: { full_name: string; phone: string; address: string | null; is_verified: boolean }[];
}

const AdminJobs = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: jobs, isLoading } = useAllJobs(statusFilter);
  const updateJob = useUpdateJob();
  const addHistory = useAddJobHistory();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [assignDialogJob, setAssignDialogJob] = useState<Job | null>(null);
  const [nearbyArtisans, setNearbyArtisans] = useState<NearbyArtisan[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [searchArtisan, setSearchArtisan] = useState('');

  const fetchNearbyArtisans = async (job: Job) => {
    setAssignDialogJob(job);
    setLoadingNearby(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-nearby-artisans', {
        body: {
          latitude: job.latitude,
          longitude: job.longitude,
          category_id: job.category_id,
          limit: 20,
        },
      });
      if (error) throw error;
      setNearbyArtisans(data?.artisans || []);
    } catch (err: any) {
      toast.error('Failed to find nearby artisans');
      setNearbyArtisans([]);
    } finally {
      setLoadingNearby(false);
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

  const statusOptions = [
    'all', 'pending', 'assigned', 'quoted', 'inspection_requested',
    'inspection_paid', 'price_agreed', 'payment_escrowed', 'in_progress',
    'completed', 'confirmed', 'disputed', 'cancelled',
  ];

  const filteredArtisans = nearbyArtisans.filter((a) => {
    if (!searchArtisan) return true;
    const name = a.profile?.[0]?.full_name || '';
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
                      <Button size="sm" onClick={() => fetchNearbyArtisans(job)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Assign
                      </Button>
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

              {loadingNearby ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredArtisans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No artisans found nearby for this category. Try expanding the search.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredArtisans.map((artisan) => {
                    const prof = artisan.profile?.[0];
                    return (
                      <div key={artisan.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="font-medium text-sm">{prof?.full_name || 'Unknown'}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{artisan.distance_km.toFixed(1)} km away</span>
                            <span>⭐ {artisan.rating_avg}</span>
                            <span>{artisan.completed_jobs}/{artisan.total_jobs} jobs completed</span>
                            {prof?.is_verified && <Badge variant="outline" className="text-[10px] py-0 bg-success/10 text-success">Verified</Badge>}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminJobs;
