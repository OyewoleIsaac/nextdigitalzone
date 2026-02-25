import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { useSubmitReview, useReviewForJob } from '@/hooks/useReviews';
import type { Job } from '@/hooks/useJobs';

interface ReviewDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDialog({ job, open, onOpenChange }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const submitReview = useSubmitReview();
  const { data: existing } = useReviewForJob(job?.id);

  const handleSubmit = async () => {
    if (!job || !job.artisan_id || rating === 0) return;
    await submitReview.mutateAsync({
      job_id: job.id,
      artisan_id: job.artisan_id,
      rating,
      comment,
    });
    onOpenChange(false);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>{job.title}</DialogDescription>
        </DialogHeader>

        {existing ? (
          <div className="text-center py-6">
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-6 w-6 ${s <= existing.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
              ))}
            </div>
            <p className="text-muted-foreground text-sm">You already reviewed this job.</p>
            {existing.comment && <p className="mt-2 text-sm italic">"{existing.comment}"</p>}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-2">Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                  >
                    <Star className={`h-8 w-8 transition-colors ${s <= (hovered || rating) ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Comment (optional)</p>
              <Textarea
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={rating === 0 || submitReview.isPending}>
              {submitReview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Review
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
