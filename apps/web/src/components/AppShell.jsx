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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  ChevronDown,
  BarChart3,
  DollarSign,
  Home,
  PieChart,
  FileText,
  Building2,
  Settings,
  MessageSquare,
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  UserCog,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';

const STORAGE_KEY = 'blb-app-sidebar-collapsed';

const AppShell = ({ children }) => {
  const { currentUser, userRole, staffRole, logout, hasPermission } = useAuth();
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

  const basePath = userRole === 'staff' ? '/staff' : '';
  const isActive = useCallback(
    (path) => location.pathname === path,
    [location.pathname]
  );

  const navLinks = [];
  navLinks.push({ path: `${basePath}/dashboard`, label: 'Dashboard', icon: LayoutDashboard });

  if (hasPermission('view_properties')) {
    navLinks.push({ path: `${basePath}/properties`, label: 'Properties', icon: Building2 });
  }
  if (hasPermission('view_units')) {
    navLinks.push({ path: `${basePath}/units`, label: 'Units', icon: Home });
  }
  if (hasPermission('view_tenants')) {
    navLinks.push({ path: `${basePath}/tenants`, label: 'Tenants', icon: Users });
  }
  if (hasPermission('view_leases')) {
    navLinks.push({ path: `${basePath}/leases`, label: 'Leases', icon: FileText });
  }
  if (hasPermission('view_invoices')) {
    navLinks.push({ path: `${basePath}/invoices`, label: 'Invoices', icon: Receipt });
  }

  if (userRole === 'landlord') {
    navLinks.push({ path: '/settings', label: 'System configuration', icon: Settings });
    navLinks.push({ path: '/activity', label: 'Activity log', icon: History });
  }

  const paymentBase = userRole === 'staff' ? '/staff/payments' : '/payments';
  const historyBase = userRole === 'staff' ? '/staff/payment-history' : '/payment-history';
  const showPayments = hasPermission('view_payments') && userRole !== 'tenant' && userRole !== undefined;

  const reportLinks = [];
  if (hasPermission('view_reports') && userRole !== 'tenant') {
    reportLinks.push({ path: '/reports/dashboard', label: 'Reports Dashboard', icon: BarChart3 });
    reportLinks.push({ path: '/reports/financial', label: 'Financial Report', icon: DollarSign });
    if (userRole === 'landlord' || staffRole === 'manager') {
      reportLinks.push({ path: '/reports/occupancy', label: 'Occupancy Report', icon: Home });
    }
    reportLinks.push({ path: '/reports/payment-analytics', label: 'Payment Analytics', icon: PieChart });
    if (userRole === 'landlord' || staffRole === 'manager' || staffRole === 'accountant') {
      reportLinks.push({ path: '/reports/lease', label: 'Lease Report', icon: FileText });
    }
    if (userRole === 'landlord' || staffRole === 'manager') {
      reportLinks.push({ path: '/reports/property', label: 'Property Report', icon: Building2 });
    }
  }

  const staffPath = userRole === 'staff' ? '/staff/staff-management' : '/staff-management';
  const showStaff = hasPermission('manage_staff') && userRole !== 'tenant';

  const paymentsActive =
    isActive('/payments') ||
    isActive('/staff/payments') ||
    isActive('/payment-history') ||
    isActive('/staff/payment-history');
  const reportsActive = location.pathname.startsWith('/reports');

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const getRoleBadge = () => {
    if (userRole === 'landlord') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded-full ml-2 uppercase tracking-wider">
          Landlord
        </span>
      );
    }
    if (userRole === 'staff') {
      const colors = {
        manager: 'bg-blue-500/20 text-blue-700',
        accountant: 'bg-green-500/20 text-green-700',
        collector: 'bg-orange-500/20 text-orange-700',
      };
      const colorClass = colors[staffRole] || 'bg-gray-500/20 text-gray-700';
      return (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ml-2 uppercase tracking-wider ${colorClass}`}>
          {staffRole}
        </span>
      );
    }
    return null;
  };

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
    const wide = layout === 'mobile' || !collapsed;
    const condensed = layout === 'sidebar' && collapsed;

    return (
      <nav className="flex flex-col gap-1 p-2">
        {navLinks.map((item) => (
          <NavLink key={item.path} {...item} onNavigate={onNavigate} condensed={condensed} />
        ))}

        {showPayments && (
          <>
            {wide ? (
              <Collapsible defaultOpen={paymentsActive}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">
                  <span className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 shrink-0" />
                    Payments
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(paymentBase);
                      onNavigate?.();
                    }}
                    className={cn(
                      'block w-full rounded-lg px-3 py-2 text-left text-sm',
                      isActive(paymentBase) || isActive('/staff/payments')
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/80 hover:bg-muted'
                    )}
                  >
                    Manage Payments
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(historyBase);
                      onNavigate?.();
                    }}
                    className={cn(
                      'block w-full rounded-lg px-3 py-2 text-left text-sm',
                      isActive(historyBase) || isActive('/staff/payment-history')
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/80 hover:bg-muted'
                    )}
                  >
                    Payment History
                  </button>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    title="Payments"
                    className={cn(
                      'h-auto w-full justify-start gap-3 px-3 py-2 font-medium',
                      paymentsActive ? 'bg-accent text-accent-foreground' : 'text-foreground/80'
                    )}
                  >
                    <Wallet className="h-5 w-5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-48">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      navigate(paymentBase);
                      onNavigate?.();
                    }}
                  >
                    Manage Payments
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      navigate(historyBase);
                      onNavigate?.();
                    }}
                  >
                    Payment History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}

        {reportLinks.length > 0 && (
          <>
            {wide ? (
              <Collapsible defaultOpen={reportsActive}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted">
                  <span className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 shrink-0" />
                    Reports
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-2 pt-1">
                  {reportLinks.map((r) => (
                    <button
                      key={r.path}
                      type="button"
                      onClick={() => {
                        navigate(r.path);
                        onNavigate?.();
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                        location.pathname === r.path
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground/80 hover:bg-muted'
                      )}
                    >
                      <r.icon className="h-4 w-4 shrink-0" />
                      {r.label}
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    title="Reports"
                    className={cn(
                      'h-auto w-full justify-start gap-3 px-3 py-2 font-medium',
                      reportsActive ? 'bg-accent text-accent-foreground' : 'text-foreground/80'
                    )}
                  >
                    <BarChart3 className="h-5 w-5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56">
                  {reportLinks.map((r) => (
                    <DropdownMenuItem
                      key={r.path}
                      className="cursor-pointer"
                      onSelect={() => {
                        navigate(r.path);
                        onNavigate?.();
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <r.icon className="h-4 w-4 shrink-0" />
                        {r.label}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}

        {showStaff && (
          <NavLink
            to={staffPath}
            label="Staff"
            icon={UserCog}
            onNavigate={onNavigate}
            condensed={condensed}
          />
        )}
      </nav>
    );
  };

  const dashboardHref = userRole === 'staff' ? '/staff/dashboard' : '/dashboard';

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex bg-background">
        <aside
          className={cn(
            'relative z-50 pointer-events-auto hidden md:flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-out shrink-0',
            collapsed ? 'w-[4.25rem]' : 'w-60'
          )}
        >
          <div className={cn('flex h-14 items-center border-b border-border px-3', collapsed && 'justify-center')}>
            <button
              type="button"
              onClick={() => navigate(dashboardHref)}
              className={cn('flex items-center gap-2 min-w-0 text-left', collapsed && 'justify-center')}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">B</span>
              </div>
              {!collapsed && (
                <span className="truncate font-semibold text-sm leading-tight">BELIBELI</span>
              )}
            </button>
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
              {collapsed ? <ChevronRight className="h-4 w-4" /> : (
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

            <button
              type="button"
              onClick={() => navigate(dashboardHref)}
              className="flex items-center gap-2 md:hidden text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">B</span>
              </div>
              <span className="font-semibold">BELIBELI</span>
            </button>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex max-w-[min(100%,14rem)] items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden text-sm font-medium sm:flex sm:items-center truncate">
                    {currentUser?.name || currentUser?.email}
                    {getRoleBadge()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {userRole === 'landlord' && (
                  <DropdownMenuItem asChild>
                    <Link to="/settings/sms" className="flex cursor-pointer items-center">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      SMS &amp; notifications
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    to={userRole === 'staff' ? '/staff/profile' : '/profile'}
                    className="flex cursor-pointer items-center"
                  >
                    <User className="mr-2 h-4 w-4" />
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

export default AppShell;
