/**
 * Protected Route Component
 * Redirect to login if not authenticated
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logger from '../../utils/logger';

function ProtectedRoute({ requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  logger.log('[ProtectedRoute] Pfad:', location.pathname, '| requireAdmin:', requireAdmin, '| loading:', loading, '| isAuthenticated:', isAuthenticated);

  // Show loading spinner while checking auth
  if (loading) {
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
    logger.log('[ProtectedRoute] ❌ Nicht authentifiziert, Weiterleitung zu /');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Authenticated but not admin (and admin required) -> redirect to dashboard
  if (requireAdmin && !isAdmin) {
    logger.warn('[ProtectedRoute] ❌ Admin benötigt, kein Admin-Recht, Weiterleitung zu /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Render child routes
  return <Outlet />;
}

export default ProtectedRoute;
