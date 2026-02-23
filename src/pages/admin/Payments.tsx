import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAllPayments } from '@/hooks/usePayments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const AdminPayments = () => {
  const { data: payments, isLoading } = useAllPayments();

  const totalRevenue = payments?.reduce((sum, p) => p.status !== 'pending' ? sum + p.amount : sum, 0) || 0;
  const totalCommission = payments?.reduce((sum, p) => p.status !== 'pending' ? sum + p.commission_amount : sum, 0) || 0;
  const pendingRelease = payments?.filter(p => p.status === 'held').reduce((sum, p) => sum + p.artisan_amount, 0) || 0;
  const releasedTotal = payments?.filter(p => p.status === 'released').reduce((sum, p) => sum + p.artisan_amount, 0) || 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Payments Overview</h1>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">₦{(totalRevenue / 100).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commission Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">₦{(totalCommission / 100).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Release</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold">₦{(pendingRelease / 100).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Released to Artisans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">₦{(releasedTotal / 100).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Payments ({payments?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!payments?.length ? (
              <p className="text-center text-muted-foreground py-8">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.paystack_reference || '—'}</TableCell>
                        <TableCell className="capitalize">{p.payment_type.replace('_', ' ')}</TableCell>
                        <TableCell>₦{(p.amount / 100).toLocaleString()}</TableCell>
                        <TableCell>₦{(p.commission_amount / 100).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            p.status === 'released' ? 'bg-green-100 text-green-700' :
                            p.status === 'held' ? 'bg-yellow-100 text-yellow-700' :
                            p.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                            p.status === 'refunded' ? 'bg-red-100 text-red-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {p.paid_at ? format(new Date(p.paid_at), 'MMM d, yyyy') : format(new Date(p.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
