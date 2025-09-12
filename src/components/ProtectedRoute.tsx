import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthConsolidated, UserRole } from '@/hooks/useAuthConsolidated';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: UserRole;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requireRole,
  fallbackPath = '/auth' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuthConsolidated();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-hero-pro flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to auth page, but remember where they wanted to go
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (requireRole && !hasRole(userRole, requireRole)) {
    // User doesn't have required role, redirect to main page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Helper function to check role hierarchy
function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    admin: 2,
    superadmin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}