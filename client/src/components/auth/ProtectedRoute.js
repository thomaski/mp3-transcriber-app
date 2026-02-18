/**
 * Protected Route Component
 * Redirect to login if not authenticated
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] 🛡️🛡️🛡️ ProtectedRoute rendering 🛡️🛡️🛡️');
  console.log('[ProtectedRoute] Current path:', location.pathname);
  console.log('[ProtectedRoute] requireAdmin:', requireAdmin);
  console.log('[ProtectedRoute] loading:', loading);
  console.log('[ProtectedRoute] isAuthenticated:', isAuthenticated);
  console.log('[ProtectedRoute] isAdmin:', isAdmin);
  console.log('[ProtectedRoute] user:', user);
  console.log('[ProtectedRoute] localStorage.authToken exists:', !!localStorage.getItem('authToken'));

  // Show loading spinner while checking auth
  if (loading) {
    console.log('[ProtectedRoute] ⏳ Still loading, showing spinner...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lädt...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] ❌ Not authenticated, redirecting to /');
    console.log('[ProtectedRoute] From location:', location.pathname);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Authenticated but not admin (and admin required) -> redirect to dashboard
  if (requireAdmin && !isAdmin) {
    console.log('[ProtectedRoute] ❌ Admin required but user is not admin, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Render child routes
  console.log('[ProtectedRoute] ✅ Access granted, rendering child routes');
  return <Outlet />;
}

export default ProtectedRoute;
