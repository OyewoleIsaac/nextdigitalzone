import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useOpenDispute, useDisputeForJob } from '@/hooks/useDisputes';
import type { Job } from '@/hooks/useJobs';

interface DisputeDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisputeDialog({ job, open, onOpenChange }: DisputeDialogProps) {
  const [reason, setReason] = useState('');
  const openDispute = useOpenDispute();
  const { data: existing } = useDisputeForJob(job?.id);

  const handleSubmit = async () => {
    if (!job || !job.artisan_id || !reason.trim()) return;
    await openDispute.mutateAsync({ job_id: job.id, artisan_id: job.artisan_id, reason });
    setReason('');
    onOpenChange(false);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Open Dispute
          </DialogTitle>
          <DialogDescription>{job.title}</DialogDescription>
        </DialogHeader>

        {existing ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle className="h-10 w-10 mx-auto text-primary" />
            <p className="font-medium">Dispute Already Open</p>
            <p className="text-sm text-muted-foreground">Status: <span className="capitalize font-medium">{existing.status}</span></p>
            {existing.reason && <p className="text-sm italic text-muted-foreground">"{existing.reason}"</p>}
            {existing.resolution_notes && (
              <p className="text-sm bg-muted rounded-md p-2">Resolution: {existing.resolution_notes}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Disputes can be opened within the 30-day guarantee period. Our team will review and mediate.
            </p>
            <div>
              <p className="text-sm font-medium mb-1">Reason for dispute</p>
              <Textarea
                placeholder="Describe the issue in detail..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSubmit}
              disabled={!reason.trim() || openDispute.isPending}
            >
              {openDispute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Dispute
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
