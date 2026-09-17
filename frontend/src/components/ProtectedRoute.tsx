import { Navigate } from 'react-router-dom';
import type { User, UserRole } from '../types';

interface ProtectedRouteProps {
  user: User | null;
  requiredRoles?: UserRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({
  user,
  requiredRoles,
  children,
}: ProtectedRouteProps) {
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Account Inactive
          </h2>
          <p className="text-gray-600">
            Your account is currently inactive. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
