import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, LogOut, Loader2, Search, ClipboardList, User } from 'lucide-react';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading) {
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
              <span className="text-sm text-muted-foreground hidden sm:block">Hi, {profile?.full_name}</span>
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
          <p className="text-muted-foreground mt-1">What would you like to do today?</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/find-artisan')}>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                <Search className="h-6 w-6" />
              </div>
              <CardTitle>Request a Service</CardTitle>
              <CardDescription>Find a skilled artisan near you for any service you need.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary mb-2">
                <ClipboardList className="h-6 w-6" />
              </div>
              <CardTitle>My Jobs</CardTitle>
              <CardDescription>Track your active and past service requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No jobs yet. Request a service to get started!</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent mb-2">
                <User className="h-6 w-6" />
              </div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>View and update your account information.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{profile?.phone} • {profile?.address || 'No address set'}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
