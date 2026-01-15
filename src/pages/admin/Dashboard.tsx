import { AdminLayout } from '@/components/admin/AdminLayout';
import { useClientSubmissions, useArtisanSubmissions } from '@/hooks/useSubmissions';
import { useAllCategories } from '@/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, FolderOpen, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { data: clientSubmissions, isLoading: clientsLoading } = useClientSubmissions();
  const { data: artisanSubmissions, isLoading: artisansLoading } = useArtisanSubmissions();
  const { data: categories, isLoading: categoriesLoading } = useAllCategories();

  const clientStats = {
    pending: clientSubmissions?.filter(s => s.status === 'pending').length || 0,
    confirmed: clientSubmissions?.filter(s => s.status === 'confirmed').length || 0,
    rejected: clientSubmissions?.filter(s => s.status === 'rejected').length || 0,
  };

  const artisanStats = {
    pending: artisanSubmissions?.filter(s => s.status === 'pending').length || 0,
    confirmed: artisanSubmissions?.filter(s => s.status === 'confirmed').length || 0,
    rejected: artisanSubmissions?.filter(s => s.status === 'rejected').length || 0,
  };

  const isLoading = clientsLoading || artisansLoading || categoriesLoading;

  return (
    <AdminLayout title="Dashboard">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link to="/admin/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{clientSubmissions?.length || 0}</div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/artisans">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Artisans</CardTitle>
              <UserCheck className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{artisanSubmissions?.length || 0}</div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/categories">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{categories?.length || 0}</div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/clients/pending">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-warning/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-warning">
                  {clientStats.pending + artisanStats.pending}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Client Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <Link to="/admin/clients/pending">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 hover:bg-warning/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-warning" />
                      <span className="font-medium">Pending</span>
                    </div>
                    <span className="text-xl font-bold text-warning">{clientStats.pending}</span>
                  </div>
                </Link>
                <Link to="/admin/clients/confirmed">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 hover:bg-success/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Confirmed</span>
                    </div>
                    <span className="text-xl font-bold text-success">{clientStats.confirmed}</span>
                  </div>
                </Link>
                <Link to="/admin/clients/rejected">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 hover:bg-destructive/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="font-medium">Rejected</span>
                    </div>
                    <span className="text-xl font-bold text-destructive">{clientStats.rejected}</span>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Artisan Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Artisan Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <Link to="/admin/artisans/pending">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 hover:bg-warning/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-warning" />
                      <span className="font-medium">Pending</span>
                    </div>
                    <span className="text-xl font-bold text-warning">{artisanStats.pending}</span>
                  </div>
                </Link>
                <Link to="/admin/artisans/confirmed">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 hover:bg-success/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Confirmed</span>
                    </div>
                    <span className="text-xl font-bold text-success">{artisanStats.confirmed}</span>
                  </div>
                </Link>
                <Link to="/admin/artisans/rejected">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 hover:bg-destructive/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="font-medium">Rejected</span>
                    </div>
                    <span className="text-xl font-bold text-destructive">{artisanStats.rejected}</span>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
