import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobStatusBadge } from './JobStatusBadge';
import { useJobHistory } from '@/hooks/useJobs';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Clock, Wrench } from 'lucide-react';
import type { Job } from '@/hooks/useJobs';

interface JobDetailDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

export function JobDetailDialog({ job, open, onOpenChange, children }: JobDetailDialogProps) {
  const { data: history } = useJobHistory(job?.id || '');

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-xl">{job.title}</DialogTitle>
            <JobStatusBadge status={job.status} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{job.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {job.category && (
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span>{job.category.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{job.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {(job.quoted_amount || job.final_amount || job.inspection_fee) && (
            <>
              <Separator />
              <div className="space-y-1 text-sm">
                {job.inspection_fee && <p>Inspection Fee: <strong>₦{(job.inspection_fee / 100).toLocaleString()}</strong></p>}
                {job.quoted_amount && <p>Quoted Amount: <strong>₦{(job.quoted_amount / 100).toLocaleString()}</strong></p>}
                {job.final_amount && <p>Final Amount: <strong>₦{(job.final_amount / 100).toLocaleString()}</strong></p>}
              </div>
            </>
          )}

          {children}

          {/* Status History */}
          {history && history.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Status History
                </h4>
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 text-xs">
                      <div className="min-w-[90px] text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, HH:mm')}
                      </div>
                      <div>
                        <JobStatusBadge status={entry.new_status} />
                        {entry.notes && <p className="text-muted-foreground mt-0.5">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
