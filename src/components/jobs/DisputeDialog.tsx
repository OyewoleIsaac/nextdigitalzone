import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2, CheckCircle, Clock, Info } from 'lucide-react';
import { useOpenDispute, useDisputeForJob } from '@/hooks/useDisputes';
import type { Job } from '@/hooks/useJobs';

// Refund policy
const BOOKING_FEE_NGN = 5000;
const PROCESSING_DEDUCTION_NGN = 300;
const REFUND_AMOUNT_NGN = BOOKING_FEE_NGN - PROCESSING_DEDUCTION_NGN; // ₦4,700

interface DisputeDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_REASONS = [
  'No artisan responded to my job request within 24 hours. I would like a full refund of my booking/inspection fee.',
  'The artisan did not show up for the scheduled inspection visit.',
  'The work quality does not meet the agreed standard and needs to be rectified.',
  'The artisan requested payment outside the platform which I declined.',
  'The job was completed but does not match what was quoted and agreed.',
];

export function DisputeDialog({ job, open, onOpenChange }: DisputeDialogProps) {
  const [reason, setReason] = useState('');
  const openDispute = useOpenDispute();
  const { data: existing } = useDisputeForJob(job?.id);

  // For pending jobs with no artisan, show refund-focused preset
  const isPendingNoArtisan = job?.status === 'pending' && !job?.artisan_id;
  const hoursAgo = job ? (Date.now() - new Date(job.created_at).getTime()) / 3600000 : 0;

  const handlePreset = (preset: string) => setReason(preset);

  const handleSubmit = async () => {
    if (!job || !reason.trim()) return;
    // For pending refund disputes, artisan_id can be empty — use customer_id as fallback
    const artisanId = job.artisan_id || job.customer_id;
    await openDispute.mutateAsync({ job_id: job.id, artisan_id: artisanId, reason });
    setReason('');
    onOpenChange(false);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isPendingNoArtisan ? 'Request Refund' : 'Open Dispute'}
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
            {isPendingNoArtisan && hoursAgo >= 24 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your job has been pending for over 24 hours with no artisan response.
                  You are eligible for a <strong>full refund</strong> of your booking fee.
                </p>
              </div>
            )}

            {/* Preset reasons */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick select a reason:</p>
              <div className="space-y-1.5">
                {PRESET_REASONS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-md border transition-colors ${
                      reason === preset
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Or describe in your own words:</p>
              <Textarea
                placeholder="Describe the issue in detail..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSubmit}
              disabled={!reason.trim() || openDispute.isPending}
            >
              {openDispute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isPendingNoArtisan ? 'Submit Refund Request' : 'Submit Dispute'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
