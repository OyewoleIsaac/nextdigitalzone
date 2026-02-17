import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCustomerJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, LogOut, Loader2, Search, ClipboardList, User } from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { useUpdateJob, useAddJobHistory } from '@/hooks/useJobs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { Job } from '@/hooks/useJobs';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: jobs, isLoading: jobsLoading } = useCustomerJobs();
  const updateJob = useUpdateJob();
  const addHistory = useAddJobHistory();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

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
    await updateJob.mutateAsync({ id: job.id, status: 'confirmed' as any });
    await addHistory.mutateAsync({
      job_id: job.id,
      old_status: job.status,
      new_status: 'confirmed',
      changed_by: user!.id,
      notes: 'Customer confirmed job completion',
    });
    toast.success('Job confirmed as complete!');
    setSelectedJob(null);
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
        {selectedJob?.status === 'completed' && (
          <div className="pt-4">
            <Button
              className="w-full"
              onClick={() => handleConfirmComplete(selectedJob)}
              disabled={updateJob.isPending}
            >
              {updateJob.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm Job Complete
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              This will release payment and activate a 30-day guarantee.
            </p>
          </div>
        )}
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
      </JobDetailDialog>
    </div>
  );
};

export default CustomerDashboard;
