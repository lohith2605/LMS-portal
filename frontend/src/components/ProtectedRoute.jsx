import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. Initial session checking state: avoid content flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Restoring session...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated: redirect to login and preserve intended path
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Pending status check
  if (user.accountStatus === 'pending') {
    return <Navigate to="/unauthorized" state={{ reason: 'pending' }} replace />;
  }

  // 4. Role authorization check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" state={{ reason: 'role_mismatch', required: allowedRoles }} replace />;
  }

  return children;
}
