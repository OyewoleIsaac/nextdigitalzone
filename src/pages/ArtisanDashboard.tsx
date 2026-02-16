import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useArtisanProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hammer, LogOut, Loader2, Briefcase, Star, TrendingUp, CheckCircle } from 'lucide-react';

const ArtisanDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: artisanProfile, isLoading: artisanLoading } = useArtisanProfile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading || artisanLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const completionRate = artisanProfile && artisanProfile.total_jobs > 0
    ? ((artisanProfile.completed_jobs / artisanProfile.total_jobs) * 100).toFixed(0)
    : '0';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass border-b">
        <div className="section-container">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                <Hammer className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">NDZ<span className="text-primary">Marketplace</span></span>
            </Link>
            <div className="flex items-center gap-3">
              <Badge variant={profile?.is_verified ? 'default' : 'outline'} className={profile?.is_verified ? 'bg-success text-success-foreground' : ''}>
                {profile?.is_verified ? <><CheckCircle className="h-3 w-3 mr-1" />Verified</> : 'Pending Verification'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="section-container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}!</h1>
          <p className="text-muted-foreground mt-1">
            {artisanProfile?.category?.name || artisanProfile?.custom_category || 'Artisan'} • {artisanProfile?.years_experience || 0} years experience
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold">{artisanProfile?.total_jobs || 0}</p>
                </div>
                <Briefcase className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{artisanProfile?.completed_jobs || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">{artisanProfile?.rating_avg || '0.0'}</p>
                </div>
                <Star className="h-8 w-8 text-warning/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Jobs placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Jobs</CardTitle>
            <CardDescription>Jobs assigned to you will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No jobs assigned yet. The admin will assign jobs to you based on your location and category.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ArtisanDashboard;
