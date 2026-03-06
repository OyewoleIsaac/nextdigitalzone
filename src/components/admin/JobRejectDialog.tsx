import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { XCircle, Loader2 } from 'lucide-react';

const PRESET_REASONS = [
  { label: 'No artisan available in your region', value: 'No artisan available in your region at this time.' },
  { label: 'Category not currently supported', value: 'The requested service category is not currently supported in your area.' },
  { label: 'Insufficient job details', value: 'The job description does not have enough detail for us to match an artisan. Please resubmit with more information.' },
  { label: 'Outside service area', value: 'The provided location is currently outside our service coverage area.' },
  { label: 'Duplicate request', value: 'We have detected a duplicate job request. Please check your active jobs.' },
  { label: 'Invalid / unreachable address', value: 'The address provided could not be verified or reached. Please update your address and try again.' },
];

interface JobRejectDialogProps {
  open: boolean;
  jobTitle: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

export function JobRejectDialog({ open, jobTitle, onClose, onConfirm, isPending }: JobRejectDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const activeReason = customReason.trim() || selectedPreset || '';

  const handlePresetClick = (value: string) => {
    if (selectedPreset === value) {
      setSelectedPreset(null);
    } else {
      setSelectedPreset(value);
      setCustomReason('');
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomReason(val);
    if (val.trim()) setSelectedPreset(null);
  };

  const handleConfirm = () => {
    onConfirm(activeReason);
    setSelectedPreset(null);
    setCustomReason('');
  };

  const handleClose = () => {
    setSelectedPreset(null);
    setCustomReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancel Job Request
          </DialogTitle>
          <DialogDescription>
            Select or write a reason for cancelling <strong>"{jobTitle}"</strong>. This will be visible to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preset reason chips */}
          <div>
            <p className="text-sm font-medium mb-2">Quick reasons</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_REASONS.map((preset) => (
                <Badge
                  key={preset.value}
                  variant={selectedPreset === preset.value ? 'default' : 'outline'}
                  className="cursor-pointer select-none transition-colors hover:bg-primary/10 text-xs py-1 px-2"
                  onClick={() => handlePresetClick(preset.value)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Selected reason preview */}
          {selectedPreset && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1 text-xs uppercase tracking-wide">Message to customer:</p>
              {selectedPreset}
            </div>
          )}

          {/* Custom reason */}
          <div>
            <p className="text-sm font-medium mb-2">Or write a custom reason</p>
            <Textarea
              placeholder="Type a custom cancellation reason..."
              value={customReason}
              onChange={(e) => handleCustomChange(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {!activeReason && (
            <p className="text-xs text-muted-foreground">A reason is optional but helps the customer understand next steps.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelling...</>
            ) : (
              <><XCircle className="mr-2 h-4 w-4" />Cancel Job</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
