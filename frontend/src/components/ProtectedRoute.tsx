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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user.active) {
    return (
      <div className="page-wrap">
        <div className="card max-w-md mx-auto p-8 text-center">
          <h2 className="text-xl font-semibold text-stone-900">Account inactive</h2>
          <p className="mt-2 text-sm text-stone-500">
            Ask an admin to reactivate your account.
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
