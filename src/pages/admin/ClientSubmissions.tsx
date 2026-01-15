import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useClientSubmissions, useUpdateClientSubmission, useDeleteClientSubmission } from '@/hooks/useSubmissions';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientSubmission, SubmissionStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Search, Eye, CheckCircle, XCircle, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ClientSubmissions = () => {
  const { status } = useParams<{ status?: string }>();
  const statusFilter = status as SubmissionStatus | undefined;
  
  const { data: submissions, isLoading } = useClientSubmissions(statusFilter);
  const updateSubmission = useUpdateClientSubmission();
  const deleteSubmission = useDeleteClientSubmission();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<ClientSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getTitle = () => {
    switch (statusFilter) {
      case 'pending': return 'Pending Client Submissions';
      case 'confirmed': return 'Confirmed Client Submissions';
      case 'rejected': return 'Rejected Client Submissions';
      default: return 'All Client Submissions';
    }
  };

  const filteredSubmissions = submissions?.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = async (id: string) => {
    await updateSubmission.mutateAsync({ id, status: 'confirmed' });
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    await updateSubmission.mutateAsync({ 
      id: selectedSubmission.id, 
      status: 'rejected',
      rejection_reason: rejectionReason 
    });
    setShowRejectDialog(false);
    setSelectedSubmission(null);
    setRejectionReason('');
  };

  const handleDelete = async () => {
    if (!selectedSubmission) return;
    await deleteSubmission.mutateAsync(selectedSubmission.id);
    setShowDeleteDialog(false);
    setSelectedSubmission(null);
  };

  const openRejectDialog = (submission: ClientSubmission) => {
    setSelectedSubmission(submission);
    setShowRejectDialog(true);
  };

  const openDeleteDialog = (submission: ClientSubmission) => {
    setSelectedSubmission(submission);
    setShowDeleteDialog(true);
  };

  return (
    <AdminLayout title={getTitle()}>
      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions ({filteredSubmissions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSubmissions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No submissions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions?.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.full_name}</TableCell>
                    <TableCell>{submission.email}</TableCell>
                    <TableCell>{submission.phone || '-'}</TableCell>
                    <TableCell>{submission.category?.name || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={submission.status} />
                    </TableCell>
                    <TableCell>{format(new Date(submission.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(submission.id)}
                              className="text-success hover:text-success"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRejectDialog(submission)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(submission)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!selectedSubmission && !showRejectDialog && !showDeleteDialog} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Submission Details</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedSubmission.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedSubmission.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedSubmission.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NIN</p>
                  <p className="font-medium font-mono">{selectedSubmission.nin}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedSubmission.category?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedSubmission.status} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedSubmission.address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service Description</p>
                <p className="font-medium">{selectedSubmission.service_description || '-'}</p>
              </div>
              {selectedSubmission.rejection_reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Rejection Reason</p>
                  <p className="font-medium text-destructive">{selectedSubmission.rejection_reason}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-medium">{format(new Date(selectedSubmission.created_at), 'MMMM d, yyyy h:mm a')}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedSubmission?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => openRejectDialog(selectedSubmission)}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(selectedSubmission.id);
                    setSelectedSubmission(null);
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

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this submission. This will be recorded for reference.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateSubmission.isPending}
            >
              {updateSubmission.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSubmission.isPending}
            >
              {deleteSubmission.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ClientSubmissions;
