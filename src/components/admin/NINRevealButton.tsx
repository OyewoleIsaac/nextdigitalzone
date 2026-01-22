import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface NINRevealButtonProps {
  submissionId: string;
  maskedNin: string;
  clientName: string;
}

export function NINRevealButton({ submissionId, maskedNin, clientName }: NINRevealButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [revealedNin, setRevealedNin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNin, setShowNin] = useState(false);

  const handleReveal = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for accessing this NIN');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; nin: string; error?: string }>(
        'decrypt-nin',
        {
          body: {
            submission_id: submissionId,
            reason: reason.trim(),
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to decrypt NIN');
      }

      if (!data?.success || !data?.nin) {
        throw new Error(data?.error || 'Failed to retrieve NIN');
      }

      setRevealedNin(data.nin);
      setShowNin(true);
      toast.success('NIN revealed successfully. Access has been logged.');
    } catch (err) {
      const error = err as Error;
      console.error('Failed to reveal NIN:', error);
      toast.error(error.message || 'Failed to reveal NIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setRevealedNin(null);
    setShowNin(false);
    setReason('');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono">{maskedNin}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="h-7 px-2"
          title="Reveal full NIN"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Reveal NIN
            </DialogTitle>
            <DialogDescription>
              You are about to view the National Identification Number for <strong>{clientName}</strong>. 
              This action will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>

          {!revealedNin ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Sensitive Data Access</p>
                  <p className="text-muted-foreground mt-1">
                    Access to this information is strictly for verification purposes only. 
                    Misuse may result in disciplinary action.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Access *</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Identity verification for service request"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be recorded in the audit log.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  National Identification Number
                </Label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-semibold tracking-wider">
                    {showNin ? revealedNin : '•••••••••••'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNin(!showNin)}
                    className="h-8 px-2"
                  >
                    {showNin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-success/10 p-3 rounded-lg">
                ✓ Access logged at {new Date().toLocaleString()}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {revealedNin ? 'Close' : 'Cancel'}
            </Button>
            {!revealedNin && (
              <Button
                onClick={handleReveal}
                disabled={isLoading || !reason.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revealing...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Reveal NIN
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}