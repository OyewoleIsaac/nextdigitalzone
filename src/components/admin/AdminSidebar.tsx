import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Hammer, 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  FolderOpen, 
  FileEdit,
  LogOut,
  ChevronDown,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Clients',
    icon: Users,
    children: [
      { title: 'All Clients', href: '/admin/clients' },
      { title: 'Pending', href: '/admin/clients/pending' },
      { title: 'Confirmed', href: '/admin/clients/confirmed' },
      { title: 'Rejected', href: '/admin/clients/rejected' },
    ],
  },
  {
    title: 'Artisans',
    icon: UserCheck,
    children: [
      { title: 'All Artisans', href: '/admin/artisans' },
      { title: 'Pending', href: '/admin/artisans/pending' },
      { title: 'Confirmed', href: '/admin/artisans/confirmed' },
      { title: 'Rejected', href: '/admin/artisans/rejected' },
    ],
  },
  {
    title: 'Categories',
    href: '/admin/categories',
    icon: FolderOpen,
  },
  {
    title: 'Form Builder',
    href: '/admin/forms',
    icon: FileEdit,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(['Clients', 'Artisans']);

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children: { href: string }[]) => 
    children.some(child => location.pathname === child.href);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-accent">
            <Hammer className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-sidebar-foreground">
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.title}>
              {item.href ? (
                <Link to={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                      isActive(item.href) && 'bg-sidebar-accent text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      'w-full justify-between text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                      item.children && isParentActive(item.children) && 'text-sidebar-foreground'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </span>
                    <ChevronDown 
                      className={cn(
                        'h-4 w-4 transition-transform',
                        openMenus.includes(item.title) && 'rotate-180'
                      )} 
                    />
                  </Button>
                  {item.children && openMenus.includes(item.title) && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link key={child.href} to={child.href}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'w-full justify-start text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                              isActive(child.href) && 'bg-sidebar-accent text-sidebar-foreground'
                            )}
                          >
                            {child.title}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
