
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut } from 'lucide-react';

const Header = () => {
  const { isAuthenticated, currentUser, userRole, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const getNavLinks = () => {
    if (!isAuthenticated) return [];

    if (userRole === 'tenant') {
      return [
        { path: '/tenant/dashboard', label: 'Dashboard' },
        { path: '/tenant/unit', label: 'My Unit' },
        { path: '/tenant/invoices', label: 'Invoices' },
        { path: '/tenant/payment-history', label: 'Payments' },
      ];
    }

    return [];
  };

  const navLinks = getNavLinks();

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  if (isAuthenticated && (userRole === 'landlord' || userRole === 'staff')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to={isAuthenticated && userRole === 'tenant' ? '/tenant/dashboard' : '/'} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">BELIBELI DIGITAL MANAGER</span>
            <span className="font-bold text-lg sm:hidden">BELIBELI</span>
          </Link>

          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive(link.path)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-3">
            {!isAuthenticated ? (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/tenant/login">Tenant</Link>
                </Button>
                <Button asChild>
                  <Link to="/login">Owner / staff</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{currentUser?.name || currentUser?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/tenant/profile" className="flex items-center cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors duration-200"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(link.path)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {!isAuthenticated ? (
                <>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/tenant/login" onClick={() => setMobileMenuOpen(false)}>
                      Tenant
                    </Link>
                  </Button>
                  <Button asChild className="justify-start">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      Owner / staff
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="h-px bg-border my-2" />
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/tenant/profile" onClick={() => setMobileMenuOpen(false)}>
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={handleLogout} className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
