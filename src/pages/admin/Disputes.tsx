import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllDisputes, useResolveDispute } from '@/hooks/useDisputes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Dispute } from '@/hooks/useDisputes';

export default function DisputesPage() {
  const { data: disputes, isLoading } = useAllDisputes();
  const resolveDispute = useResolveDispute();
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState<'resolved' | 'closed'>('resolved');

  const handleResolve = async () => {
    if (!selected) return;
    await resolveDispute.mutateAsync({ id: selected.id, status: newStatus, resolution_notes: resolution });
    setSelected(null);
    setResolution('');
  };

  const statusColor = (s: string) =>
    s === 'open' ? 'destructive' : s === 'resolved' ? 'default' : 'secondary';

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dispute Management</h1>
        <p className="text-muted-foreground">Review and resolve customer disputes.</p>
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
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <Badge variant={statusColor(d.status)} className="capitalize">{d.status}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-sm">{d.reason}</p>
                    {d.resolution_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Resolution: {d.resolution_notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Job ID: {d.job_id.slice(0, 8)}…</p>
                  </div>
                  {d.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => setSelected(d)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Customer's Reason:</p>
                <p className="text-muted-foreground">{selected.reason}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Resolution Notes</p>
                <Textarea
                  placeholder="Explain how this was resolved..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">New Status</p>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed (No Action)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleResolve} disabled={resolveDispute.isPending}>
                {resolveDispute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Dispute
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
