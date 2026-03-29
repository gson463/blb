import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Footer from '@/components/Footer.jsx';
import {
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  Home,
  FileText,
  Receipt,
  CreditCard,
  Upload,
  UserCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const STORAGE_KEY = 'blb-tenant-sidebar-collapsed';

const tenantLinks = [
  { path: '/tenant/guide', label: 'How to use', icon: BookOpen },
  { path: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tenant/unit', label: 'My Unit', icon: Home },
  { path: '/tenant/lease', label: 'My Lease', icon: FileText },
  { path: '/tenant/invoices', label: 'Invoices', icon: Receipt },
  { path: '/tenant/payment-history', label: 'Payment History', icon: CreditCard },
  { path: '/tenant/upload-payment', label: 'Upload Payment', icon: Upload },
];

const TenantShell = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const isActive = useCallback(
    (path) => location.pathname === path,
    [location.pathname]
  );

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/tenant/login');
  };

  // Same pattern as AppShell (landlord/staff): use path + navigate() so clicks work reliably
  // (tenantLinks use `path`; `<Link to={undefined}>` breaks navigation).
  const NavLink = ({ to, path, label, icon: Icon, onNavigate, condensed }) => {
    const target = to ?? path;
    const active = isActive(target);
    return (
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        title={condensed ? label : undefined}
        onClick={() => {
          navigate(target);
          onNavigate?.();
        }}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-foreground/80 hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!condensed && <span className="truncate">{label}</span>}
      </button>
    );
  };

  const renderNavBody = (onNavigate, layout = 'sidebar') => {
    const condensed = layout === 'sidebar' && collapsed;

    return (
      <nav className="flex flex-col gap-1 p-2">
        {tenantLinks.map((item) => (
          <NavLink key={item.path} {...item} onNavigate={onNavigate} condensed={condensed} />
        ))}
      </nav>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background">
        <aside
          className={cn(
            'relative z-50 pointer-events-auto hidden md:flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-out shrink-0',
            collapsed ? 'w-[4.25rem]' : 'w-60'
          )}
        >
          <div className={cn('flex h-14 items-center border-b border-border px-3', collapsed && 'justify-center')}>
            <Link to="/tenant/dashboard" className={cn('flex items-center gap-2 min-w-0', collapsed && 'justify-center')}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">B</span>
              </div>
              {!collapsed && <span className="truncate font-semibold text-sm">TENANT</span>}
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto py-2">{renderNavBody()}</div>
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-between')}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">Collapse</span>
                  <ChevronLeft className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border px-4 py-3 text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                      <span className="text-lg font-bold text-primary-foreground">B</span>
                    </div>
                    <span className="font-semibold">Menu</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto py-2">
                  {renderNavBody(() => setMobileOpen(false), 'mobile')}
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>

            <Link to="/tenant/dashboard" className="flex items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">B</span>
              </div>
              <span className="font-semibold">BELIBELI</span>
            </Link>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex max-w-[min(100%,14rem)] items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden text-sm font-medium sm:inline truncate">
                    {currentUser?.name || currentUser?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/tenant/profile" className="flex cursor-pointer items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TenantShell;
