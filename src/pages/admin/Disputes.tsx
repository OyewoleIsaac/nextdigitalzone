import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllDisputes, useProcessRefund } from '@/hooks/useDisputes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, CheckCircle, RefreshCw, DollarSign, XCircle, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import type { Dispute } from '@/hooks/useDisputes';

const REFUND_OPTIONS = [
  {
    value: 'wallet_credit',
    label: '💳 Platform Wallet Credit — ₦5,000',
    description: 'Issue full ₦5,000 as platform credit. Customer keeps the full amount and can use it on their next booking. ✅ Zero loss to admin — no Paystack fees.',
    badge: 'Recommended',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    value: 'partial',
    label: 'Partial Cash Refund — ₦4,700',
    description: 'Refund ₦4,700 back to card/bank (₦300 deducted to cover Paystack transaction fee). Use when customer insists on cash refund.',
    badge: null,
    badgeColor: '',
  },
  {
    value: 'full',
    label: 'Full Cash Refund — ₦5,000',
    description: 'Refund the full ₦5,000 to original payment method. Admin absorbs Paystack fee (~₦175). Use only for platform errors.',
    badge: 'Admin absorbs fee',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    value: 'none',
    label: 'No Refund — Close Dispute',
    description: 'Close the dispute without issuing any refund. Use when the claim is invalid or service was rendered.',
    badge: null,
    badgeColor: '',
  },
];

export default function DisputesPage() {
  const { data: disputes, isLoading } = useAllDisputes();
  const processRefund = useProcessRefund();
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [refundType, setRefundType] = useState<'wallet_credit' | 'partial' | 'full' | 'none'>('wallet_credit');

  const handleResolve = async () => {
    if (!selected) return;
    await processRefund.mutateAsync({
      dispute_id: selected.id,
      refund_type: refundType,
      resolution_notes: resolution,
    });
    setSelected(null);
    setResolution('');
    setRefundType('wallet_credit');
  };

  const statusColor = (s: string) =>
    s === 'open' ? 'destructive' : s === 'resolved' ? 'default' : 'secondary';

  const isRefundRequest = (reason: string) =>
    reason.toLowerCase().includes('refund') || reason.toLowerCase().includes('no artisan') || reason.toLowerCase().includes('no response');

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dispute Management</h1>
        <p className="text-muted-foreground">Review, resolve disputes, and issue refunds or wallet credits.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : disputes?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No disputes filed yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes?.map((d) => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <Badge variant={statusColor(d.status)} className="capitalize">{d.status}</Badge>
                      {isRefundRequest(d.reason) && (
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="h-3 w-3 mr-1" /> Refund Request
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm">{d.reason}</p>
                    {d.resolution_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Resolution: {d.resolution_notes}</p>
                    )}
                    {d.preferred_refund_type && (
                      <p className="text-xs mt-1 flex items-center gap-1">
                        <span className="text-muted-foreground">Customer prefers:</span>
                        <span className={`font-medium ${d.preferred_refund_type === 'wallet_credit' ? 'text-green-600' : 'text-blue-600'}`}>
                          {d.preferred_refund_type === 'wallet_credit' ? '💳 Wallet Credit (₦5,000)' : '🏦 Cash Refund (₦4,700)'}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Job ID: {d.job_id.slice(0, 8)}…</p>
                  </div>
                  {d.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => { setSelected(d); setRefundType(isRefundRequest(d.reason) ? 'wallet_credit' : 'none'); }}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Customer's Reason:</p>
                <p className="text-muted-foreground">{selected.reason}</p>
              </div>

              {/* Refund decision */}
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-primary" /> Refund Decision
                </p>
                <div className="space-y-2">
                  {REFUND_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRefundType(opt.value as any)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        refundType === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium flex-1">{opt.label}</p>
                        {opt.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opt.badgeColor}`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Context note based on selection */}
              {refundType === 'wallet_credit' && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent-foreground">
                  <Wallet className="h-4 w-4 shrink-0 text-primary" />
                  <span>₦5,000 will be added to the customer's platform wallet. No Paystack fees — admin retains the full amount from the original transaction.</span>
                </div>
              )}
              {(refundType === 'partial' || refundType === 'full') && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span>Paystack refund API will be called. Amount returns to the customer's original payment method within 3–5 business days.</span>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Admin Notes (optional)</p>
                <Textarea
                  placeholder="Add any internal notes or explanation..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                  <XCircle className="h-4 w-4 mr-1.5" /> Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleResolve}
                  disabled={processRefund.isPending}
                  variant={refundType === 'none' ? 'secondary' : 'default'}
                >
                  {processRefund.isPending
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : refundType === 'wallet_credit'
                      ? <Wallet className="h-4 w-4 mr-2" />
                      : <RefreshCw className="h-4 w-4 mr-2" />}
                  {refundType === 'none'
                    ? 'Close Dispute'
                    : refundType === 'wallet_credit'
                      ? 'Issue ₦5,000 Wallet Credit'
                      : refundType === 'full'
                        ? 'Refund ₦5,000 to Card'
                        : 'Refund ₦4,700 to Card'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
