import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Hammer, Menu, X, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { data: profile } = useProfile();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/find-artisan', label: 'Find an Artisan' },
    { href: '/become-artisan', label: 'Become an Artisan' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getDashboardLink = () => {
    if (isAdmin) return '/admin';
    if (profile?.role === 'artisan') return '/artisan/dashboard';
    return '/dashboard';
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass border-b">
      <div className="section-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md group-hover:shadow-glow transition-shadow">
              <Hammer className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              NDZ<span className="text-primary">Marketplace</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to={getDashboardLink()}>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-1" />
                    {profile?.full_name || 'Dashboard'}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t mt-2 pt-2">
                {user ? (
                  <>
                    <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted">
                      Dashboard
                    </Link>
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted">
                      Sign In
                    </Link>
                    <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-primary hover:bg-primary/10">
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
