import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobStatusBadge } from './JobStatusBadge';
import { JobPhotos } from './JobPhotos';
import { useJobHistory } from '@/hooks/useJobs';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Clock, Wrench, Package, Camera } from 'lucide-react';
import type { Job } from '@/hooks/useJobs';

interface JobDetailDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

function PhotoPreview({ url, label }: { url: string; label: string }) {
  const [enlarged, setEnlarged] = useState(false);
  return (
    <>
      <div
        className="cursor-pointer group relative rounded-lg overflow-hidden border bg-muted/40"
        onClick={() => setEnlarged(true)}
      >
        <img
          src={url}
          alt={label}
          className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-2 flex items-center gap-1">
          <Image className="h-3 w-3" /> {label}
        </div>
      </div>
      {/* Enlarged lightbox */}
      {enlarged && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlarged(false)}
        >
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <p className="absolute bottom-6 text-white text-sm opacity-70">Click anywhere to close</p>
        </div>
      )}
    </>
  );
}

export function JobDetailDialog({ job, open, onOpenChange, children }: JobDetailDialogProps) {
  const { data: history } = useJobHistory(job?.id || '');

  if (!job) return null;

  const materialCost = (job as any).material_cost as number | null;
  const workmanshipCost = (job as any).workmanship_cost as number | null;
  const hasBreakdown = !!(materialCost || workmanshipCost);

  // Resolve photo URLs — stored as full signed URLs or storage paths
  const photoBefore = job.photo_before;
  const photoAfter = job.photo_after;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

          {/* Payment breakdown */}
          {(job.inspection_fee || job.quoted_amount || job.final_amount || hasBreakdown) && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold text-sm">Payment Breakdown</h4>
                {job.inspection_fee && (
                  <div className="flex justify-between items-center py-1 border-b border-dashed border-border/50">
                    <span className="text-muted-foreground">Inspection / Booking Fee</span>
                    <strong>₦{(job.inspection_fee / 100).toLocaleString()}</strong>
                  </div>
                )}
                {hasBreakdown ? (
                  <>
                    {materialCost && (
                      <div className="flex justify-between items-center py-1 rounded-md px-2 bg-secondary/60">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Package className="h-3.5 w-3.5 text-primary" /> Materials Cost
                        </span>
                        <strong className="text-foreground">₦{(materialCost / 100).toLocaleString()}</strong>
                      </div>
                    )}
                    {workmanshipCost && (
                      <div className="flex justify-between items-center py-1 rounded-md px-2 bg-accent/60">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Wrench className="h-3.5 w-3.5 text-accent-foreground" /> Workmanship Cost
                        </span>
                        <strong className="text-foreground">₦{(workmanshipCost / 100).toLocaleString()}</strong>
                      </div>
                    )}
                    {(materialCost && workmanshipCost) && (
                      <div className="flex justify-between items-center py-1.5 border-t border-border font-semibold">
                        <span>Total Quoted</span>
                        <span>₦{((materialCost + workmanshipCost) / 100).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {job.quoted_amount && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Quoted Amount</span>
                        <strong>₦{(job.quoted_amount / 100).toLocaleString()}</strong>
                      </div>
                    )}
                  </>
                )}
                {job.final_amount && (
                  <div className="flex justify-between items-center py-1.5 border-t border-border font-semibold">
                    <span>Final Amount Paid</span>
                    <span className="text-primary">₦{(job.final_amount / 100).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Job Photos */}
          {(photoBefore || photoAfter) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Camera className="h-4 w-4" /> Job Photos
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {photoBefore && <PhotoPreview url={photoBefore} label="Before" />}
                  {photoAfter && <PhotoPreview url={photoAfter} label="After" />}
                </div>
                {photoBefore && !photoAfter && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> "After" photo not yet uploaded
                  </p>
                )}
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
