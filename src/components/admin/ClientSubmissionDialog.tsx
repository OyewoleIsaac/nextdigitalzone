import { ClientSubmission } from '@/lib/types';
import { useSubmissionAttachments } from '@/hooks/useSubmissionAttachments';
import { NINRevealButton } from '@/components/admin/NINRevealButton';
import { FileViewer } from '@/components/admin/FileViewer';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Paperclip } from 'lucide-react';

interface ClientSubmissionDialogProps {
  submission: ClientSubmission | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (submission: ClientSubmission) => void;
}

export function ClientSubmissionDialog({
  submission,
  open,
  onClose,
  onApprove,
  onReject,
}: ClientSubmissionDialogProps) {
  const { data: attachments, isLoading: isLoadingAttachments } = useSubmissionAttachments(
    submission?.id,
    'client'
  );

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Submission Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{submission.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{submission.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{submission.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">NIN (National ID)</p>
              <NINRevealButton
                submissionId={submission.id}
                maskedNin={submission.nin}
                clientName={submission.full_name}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{submission.category?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={submission.status} />
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">{submission.address || '-'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Service Description</p>
            <p className="font-medium">{submission.service_description || '-'}</p>
          </div>
          
          {submission.rejection_reason && (
            <div>
              <p className="text-sm text-muted-foreground">Rejection Reason</p>
              <p className="font-medium text-destructive">{submission.rejection_reason}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="font-medium">{format(new Date(submission.created_at), 'MMMM d, yyyy h:mm a')}</p>
          </div>

          {/* File Attachments Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Attached Files</p>
            </div>
            {isLoadingAttachments ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <FileViewer attachments={attachments || []} />
            )}
          </div>
        </div>
        
        <DialogFooter>
          {submission.status === 'pending' && (
            <>
              <Button
                variant="outline"
                onClick={() => onReject(submission)}
                className="text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() => {
                  onApprove(submission.id);
                  onClose();
                }}
                className="bg-success hover:bg-success/90"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}