/**
 * Auth Context
 * Global authentication state management with automatic cleanup
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAuth, login as loginApi, logout as logoutApi, getCurrentUser } from '../services/authService';

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
    console.log('🧹 Migriere Auth-System auf Version', AUTH_VERSION);
    
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
    console.log('✅ Auth-System migriert!');
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
    console.log('[AuthContext] 🔍🔍🔍 checkAuthStatus called 🔍🔍🔍');
    
    try {
      // Wenn kein Token vorhanden, direkt abbrechen
      const token = localStorage.getItem('authToken');
      console.log('[AuthContext] Checking for authToken in localStorage...');
      console.log('[AuthContext] authToken exists:', !!token);
      
      if (token) {
        console.log('[AuthContext] authToken found (first 20 chars):', token.substring(0, 20) + '...');
        console.log('[AuthContext] authToken length:', token.length);
      } else {
        console.log('[AuthContext] ❌ No authToken found in localStorage');
        console.log('[AuthContext] LocalStorage contents:', JSON.stringify(localStorage));
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('[AuthContext] 📡 Calling checkAuth API...');
      const response = await checkAuth();
      console.log('[AuthContext] checkAuth response:', JSON.stringify(response, null, 2));
      console.log('[AuthContext] response.success:', response.success);
      console.log('[AuthContext] response.authenticated:', response.authenticated);
      
      if (response.success && response.authenticated) {
        console.log('[AuthContext] ✅ User authenticated!');
        console.log('[AuthContext] User data:', JSON.stringify(response.user, null, 2));
        setUser(response.user);
      } else {
        // Token ungültig → entfernen
        console.warn('[AuthContext] ⚠️ Token invalid, removing...');
        localStorage.removeItem('authToken');
        setUser(null);
      }
    } catch (error) {
      // Bei Fehler: Token entfernen
      console.error('[AuthContext] ❌ Auth check error:', error);
      console.error('[AuthContext] Error message:', error.message);
      console.error('[AuthContext] Error stack:', error.stack);
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      console.log('[AuthContext] checkAuthStatus complete, setting loading=false');
      setLoading(false);
    }
  }

  async function login(username, password) {
    console.log('🔐 AuthContext.login aufgerufen:', { username });
    setError(null);
    setLoading(true);
    
    try {
      console.log('📡 Rufe loginApi auf...');
      const response = await loginApi(username, password);
      console.log('✅ loginApi Response:', response);
      
      if (response.success) {
        setUser(response.user);
        console.log('✅ User gesetzt:', response.user);
        return { success: true, user: response.user };
      } else {
        setError(response.error);
        console.error('❌ Login nicht erfolgreich:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('❌ AuthContext.login Fehler:', error);
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
      console.error('Logout error:', error);
      // Clear user anyway
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
      console.error('Refresh user error:', error);
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
