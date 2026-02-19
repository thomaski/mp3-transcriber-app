/**
 * Auth Context
 * Global authentication state management with automatic cleanup
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAuth, login as loginApi, logout as logoutApi, getCurrentUser } from '../services/authService';
import logger from '../utils/logger';

const AuthContext = createContext(null);

// Version für Auth-System (bei Breaking Changes erhöhen)
const AUTH_VERSION = '2.0'; // Authorization Header statt Cookies
const AUTH_VERSION_KEY = 'auth_version';

/**
 * Automatisches Cleanup bei Auth-System-Wechsel
 * Löscht alte Cookies und veraltete LocalStorage-Daten
 */
function cleanupOldAuthData() {
  const storedVersion = localStorage.getItem(AUTH_VERSION_KEY);
  
  if (storedVersion !== AUTH_VERSION) {
    logger.log('🧹 Migriere Auth-System auf Version', AUTH_VERSION);
    
    // Alle Cookies löschen
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Alte Auth-Daten löschen (außer bei v2.0 der Token)
    if (storedVersion !== '2.0') {
      localStorage.removeItem('authToken');
    }
    
    // Version updaten
    localStorage.setItem(AUTH_VERSION_KEY, AUTH_VERSION);
    logger.log('✅ Auth-System migriert!');
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    // Cleanup VOR Auth-Check
    cleanupOldAuthData();
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    logger.log('[AuthContext] checkAuthStatus aufgerufen');
    
    try {
      // Wenn kein Token vorhanden, direkt abbrechen
      const token = localStorage.getItem('authToken');
      logger.log('[AuthContext] authToken vorhanden:', !!token);
      
      if (!token) {
        logger.log('[AuthContext] Kein Token - nicht eingeloggt');
        setUser(null);
        setLoading(false);
        return;
      }
      
      const response = await checkAuth();
      logger.log('[AuthContext] checkAuth Ergebnis: authenticated =', response.authenticated);
      
      if (response.success && response.authenticated) {
        logger.log('[AuthContext] ✅ Benutzer authentifiziert:', response.user?.username);
        setUser(response.user);
      } else {
        // Token ungültig → entfernen
        logger.warn('[AuthContext] ⚠️ Token ungültig, wird entfernt');
        localStorage.removeItem('authToken');
        setUser(null);
      }
    } catch (error) {
      // Bei Fehler: Token entfernen
      logger.error('[AuthContext] ❌ Auth-Check Fehler:', error.message);
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    logger.log('🔐 [AuthContext] login aufgerufen für:', username);
    setError(null);
    setLoading(true);
    
    try {
      const response = await loginApi(username, password);
      
      if (response.success) {
        setUser(response.user);
        logger.log('✅ [AuthContext] Login erfolgreich:', response.user?.username);
        return { success: true, user: response.user };
      } else {
        setError(response.error);
        logger.warn('[AuthContext] Login abgelehnt:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error) {
      logger.error('❌ [AuthContext] Login Fehler:', error.message);
      const errorMessage = error.response?.data?.error || 'Login fehlgeschlagen. Bitte versuchen Sie es erneut.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await logoutApi();
      setUser(null);
      return { success: true };
    } catch (error) {
      logger.error('[AuthContext] Logout Fehler:', error.message);
      // User trotzdem ausloggen
      setUser(null);
      return { success: true };
    }
  }

  async function refreshUser() {
    try {
      const response = await getCurrentUser();
      if (response.success) {
        setUser(response.user);
      }
    } catch (error) {
      logger.error('[AuthContext] refreshUser Fehler:', error.message);
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
