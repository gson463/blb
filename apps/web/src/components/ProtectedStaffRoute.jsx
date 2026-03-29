
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { AlertCircle } from 'lucide-react';

const ProtectedStaffRoute = ({ children, requiredRole, requiredPermission }) => {
  const { isAuthenticated, initialLoading, userRole, staffRole, hasPermission } = useAuth();
  const location = useLocation();

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow landlords to access staff routes if they want, or restrict strictly to staff
  // Usually landlords have superset access. We'll allow landlords or staff.
  if (userRole !== 'staff' && userRole !== 'landlord') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole && userRole === 'staff' && staffRole !== requiredRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You do not have the required role to view this page.</p>
        <button onClick={() => window.history.back()} className="text-primary hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Permission Denied</h1>
        <p className="text-muted-foreground mb-6">You do not have permission to perform this action.</p>
        <button onClick={() => window.history.back()} className="text-primary hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedStaffRoute;
