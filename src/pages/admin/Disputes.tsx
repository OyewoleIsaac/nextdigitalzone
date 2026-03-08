import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllDisputes, useResolveDispute } from '@/hooks/useDisputes';
import { useProcessRefund } from '@/hooks/useDisputes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, CheckCircle, RefreshCw, DollarSign, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Dispute } from '@/hooks/useDisputes';

const REFUND_OPTIONS = [
  {
    value: 'partial',
    label: 'Partial Refund — ₦4,700',
    description: 'Refund ₦4,700 (deduct ₦300 processing fee). Recommended for 24hr no-response cases.',
  },
  {
    value: 'full',
    label: 'Full Refund — ₦5,000',
    description: 'Refund the full ₦5,000. Admin absorbs Paystack fee (~₦175). Use for platform errors.',
  },
  {
    value: 'none',
    label: 'No Refund',
    description: 'Close dispute without issuing a refund.',
  },
];

export default function DisputesPage() {
  const { data: disputes, isLoading } = useAllDisputes();
  const processRefund = useProcessRefund();
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [refundType, setRefundType] = useState<'partial' | 'full' | 'none'>('partial');

  const handleResolve = async () => {
    if (!selected) return;
    await processRefund.mutateAsync({
      dispute_id: selected.id,
      refund_type: refundType,
      resolution_notes: resolution,
    });
    setSelected(null);
    setResolution('');
    setRefundType('partial');
  };

  const statusColor = (s: string) =>
    s === 'open' ? 'destructive' : s === 'resolved' ? 'default' : 'secondary';

  const isRefundRequest = (reason: string) =>
    reason.toLowerCase().includes('refund') || reason.toLowerCase().includes('no artisan');

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dispute Management</h1>
        <p className="text-muted-foreground">Review, resolve disputes, and issue refunds where applicable.</p>
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
                        <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                          <DollarSign className="h-3 w-3 mr-1" /> Refund Request
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm">{d.reason}</p>
                    {d.resolution_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Resolution: {d.resolution_notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Job ID: {d.job_id.slice(0, 8)}…</p>
                  </div>
                  {d.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => { setSelected(d); setRefundType(isRefundRequest(d.reason) ? 'partial' : 'none'); }}>
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
            <DialogTitle>Resolve Dispute & Issue Refund</DialogTitle>
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
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {refundType !== 'none' && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span>
                    Paystack refund API will be called. Amount will be returned to the customer's original payment method.
                  </span>
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
                    : <RefreshCw className="h-4 w-4 mr-2" />}
                  {refundType === 'none' ? 'Close Dispute' : `Issue ₦${refundType === 'full' ? '5,000' : '4,700'} Refund`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
