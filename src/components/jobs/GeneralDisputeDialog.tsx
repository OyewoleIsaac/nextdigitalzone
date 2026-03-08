import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2, CheckCircle, MessageSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface GeneralDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: 'customer' | 'artisan';
}

const CUSTOMER_PRESETS = [
  'I was charged incorrectly or without my consent.',
  'An artisan behaved unprofessionally or made me uncomfortable.',
  'My account or profile has an error I cannot fix myself.',
  'I was directed to pay outside the platform, which I declined.',
  'I have a general complaint that is not related to a specific job.',
];

const ARTISAN_PRESETS = [
  'A customer is being abusive or threatening towards me.',
  'I have not received payment for work I completed.',
  'My profile or verified status is showing incorrect information.',
  'I was assigned a job to a location that is outside my service area.',
  'I have a general complaint that is not related to a specific job.',
];

const ISSUE_CATEGORIES = [
  { value: 'payment', label: '💳 Payment Issue' },
  { value: 'account', label: '👤 Account / Profile Issue' },
  { value: 'conduct', label: '🚨 Misconduct / Safety' },
  { value: 'platform', label: '🛠️ Platform / Technical Issue' },
  { value: 'other', label: '📝 Other' },
];

function useSubmitGeneralDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      reason: string;
      customer_id?: string;
      artisan_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('disputes').insert({
        customer_id: payload.customer_id ?? user.id,
        artisan_id: payload.artisan_id ?? null,
        job_id: null,
        reason: payload.reason,
        status: 'open',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Your complaint has been submitted. Our team will review it shortly.');
      qc.invalidateQueries({ queryKey: ['all-disputes'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit complaint'),
  });
}

export function GeneralDisputeDialog({ open, onOpenChange, userRole = 'customer' }: GeneralDisputeDialogProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submit = useSubmitGeneralDispute();

  const presets = userRole === 'artisan' ? ARTISAN_PRESETS : CUSTOMER_PRESETS;

  const handleSubmit = async () => {
    if (!reason.trim() || !category) return;
    const fullReason = `[${ISSUE_CATEGORIES.find(c => c.value === category)?.label ?? category}] ${reason}`;
    await submit.mutateAsync({
      reason: fullReason,
      customer_id: userRole === 'customer' ? user?.id : undefined,
      artisan_id: userRole === 'artisan' ? user?.id : undefined,
    });
    setSubmitted(true);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setCategory('');
      setReason('');
      setSubmitted(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            File a Complaint
          </DialogTitle>
          <DialogDescription>
            Report an issue, concern, or complaint that is not tied to a specific job.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-primary" />
            <p className="font-semibold text-lg">Complaint Received</p>
            <p className="text-sm text-muted-foreground">
              Our support team will review your complaint and reach out within 24–48 hours.
            </p>
            <Button className="w-full mt-2" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 pr-1">
            <div className="space-y-5 pt-1 pb-2">
              {/* Category picker */}
              <div>
                <p className="text-sm font-semibold mb-2">What type of issue is this?</p>
                <div className="grid grid-cols-2 gap-2">
                  {ISSUE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`text-left text-xs px-3 py-2.5 rounded-lg border transition-colors font-medium ${
                        category === cat.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset reasons */}
              {category && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick select a reason:</p>
                  <div className="space-y-1.5">
                    {presets.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReason(preset)}
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
              )}

              {/* Free-text reason */}
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Describe the issue:
                </p>
                <Textarea
                  placeholder="Provide as much detail as possible..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleSubmit}
                disabled={!reason.trim() || !category || submit.isPending}
              >
                {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Complaint
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
