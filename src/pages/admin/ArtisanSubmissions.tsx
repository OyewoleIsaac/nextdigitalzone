import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useArtisanSubmissions, useUpdateArtisanSubmission, useDeleteArtisanSubmission } from '@/hooks/useSubmissions';
import { ArtisanSubmissionDialog } from '@/components/admin/ArtisanSubmissionDialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArtisanSubmission, SubmissionStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Search, Eye, CheckCircle, XCircle, Trash2, Loader2 } from 'lucide-react';

const ArtisanSubmissions = () => {
  const { status } = useParams<{ status?: string }>();
  const statusFilter = status as SubmissionStatus | undefined;
  
  const { data: submissions, isLoading } = useArtisanSubmissions(statusFilter);
  const updateSubmission = useUpdateArtisanSubmission();
  const deleteSubmission = useDeleteArtisanSubmission();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<ArtisanSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const getTitle = () => {
    switch (statusFilter) {
      case 'pending': return 'Pending Artisan Submissions';
      case 'confirmed': return 'Confirmed Artisan Submissions';
      case 'rejected': return 'Rejected Artisan Submissions';
      default: return 'All Artisan Submissions';
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

  const openDetailsDialog = (submission: ArtisanSubmission) => {
    setSelectedSubmission(submission);
    setShowDetailsDialog(true);
  };

  const openRejectDialog = (submission: ArtisanSubmission) => {
    setSelectedSubmission(submission);
    setShowDetailsDialog(false);
    setShowRejectDialog(true);
  };

  const openDeleteDialog = (submission: ArtisanSubmission) => {
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
                  <TableHead>Location</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Experience</TableHead>
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
                    <TableCell>{submission.location || '-'}</TableCell>
                    <TableCell>{submission.category?.name || submission.custom_category || '-'}</TableCell>
                    <TableCell>{submission.years_experience ? `${submission.years_experience} years` : '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={submission.status} />
                    </TableCell>
                    <TableCell>{format(new Date(submission.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsDialog(submission)}
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

      {/* View Details Dialog with File Viewer */}
      <ArtisanSubmissionDialog
        submission={selectedSubmission}
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedSubmission(null);
        }}
        onApprove={handleApprove}
        onReject={openRejectDialog}
      />

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

export default ArtisanSubmissions;