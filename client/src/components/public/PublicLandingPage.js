/**
 * Public Landing Page
 * Password-protected access to user MP3 lists or direct MP3 transcriptions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkId, verifyPassword } from '../../services/publicAccessService';

function PublicLandingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [idInfo, setIdInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Check ID on mount
  useEffect(() => {
    console.log('[PublicLandingPage] Mounting with ID:', id);
    
    if (!id || id.length !== 6) {
      console.error('[PublicLandingPage] Invalid ID length:', id?.length);
      setError('Ungültige ID. IDs müssen 6 Zeichen lang sein.');
      setLoading(false);
      return;
    }

    console.log('[PublicLandingPage] Checking ID:', id);
    checkId(id)
      .then((data) => {
        console.log('[PublicLandingPage] checkId response:', data);
        if (data.success) {
          setIdInfo(data);
          setLoading(false);
        } else {
          console.error('[PublicLandingPage] checkId failed:', data.error);
          setError(data.error || 'ID nicht gefunden.');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[PublicLandingPage] checkId error:', err);
        setError(err.error || 'Fehler beim Laden der ID.');
        setLoading(false);
      });
  }, [id]);

  // Handle password submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[PublicLandingPage] Submit password for ID:', id);
    setError('');

    if (!password) {
      console.warn('[PublicLandingPage] No password entered');
      setError('Bitte Passwort eingeben.');
      return;
    }

    console.log('[PublicLandingPage] Verifying password...');
    setVerifying(true);

    try {
      const result = await verifyPassword(id, password);
      console.log('[PublicLandingPage] verifyPassword response:', result);

      if (result.success) {
        console.log('[PublicLandingPage] ✅✅✅ Password verified successfully! ✅✅✅');
        console.log('[PublicLandingPage] Full result object:', JSON.stringify(result, null, 2));
        console.log('[PublicLandingPage] Result type:', result.type);
        console.log('[PublicLandingPage] Has token?', !!result.token);
        console.log('[PublicLandingPage] Has user?', !!result.user);
        
        // For user access: store token and user data, then redirect to transcribe
        if (result.type === 'user' && result.token && result.user) {
          console.log('[PublicLandingPage] 🔐🔐🔐 USER ACCESS - Starting token storage 🔐🔐🔐');
          console.log('[PublicLandingPage] Token preview (first 20 chars):', result.token.substring(0, 20) + '...');
          console.log('[PublicLandingPage] User data:', JSON.stringify(result.user, null, 2));
          
          // IMPORTANT: Clear all old auth data first!
          console.log('[PublicLandingPage] 🧹 Step 1: Clearing old auth data...');
          console.log('[PublicLandingPage] LocalStorage BEFORE clear:', JSON.stringify(localStorage));
          console.log('[PublicLandingPage] SessionStorage BEFORE clear:', JSON.stringify(sessionStorage));
          
          localStorage.clear();
          sessionStorage.clear();
          
          console.log('[PublicLandingPage] ✅ LocalStorage AFTER clear:', JSON.stringify(localStorage));
          console.log('[PublicLandingPage] ✅ SessionStorage AFTER clear:', JSON.stringify(sessionStorage));
          
          // Store token in localStorage (WICHTIG: Key muss 'authToken' sein, nicht 'token'!)
          console.log('[PublicLandingPage] 💾 Step 2: Storing authToken...');
          localStorage.setItem('authToken', result.token);
          console.log('[PublicLandingPage] ✅ authToken stored! Verify:', localStorage.getItem('authToken')?.substring(0, 20) + '...');
          
          // Store user data in localStorage
          console.log('[PublicLandingPage] 💾 Step 3: Storing user data...');
          localStorage.setItem('user', JSON.stringify(result.user));
          console.log('[PublicLandingPage] ✅ User stored! Verify:', localStorage.getItem('user'));
          
          // Mark as public access session
          console.log('[PublicLandingPage] 💾 Step 4: Marking as public access...');
          sessionStorage.setItem('isPublicAccess', 'true');
          console.log('[PublicLandingPage] ✅ Public access marked! Verify:', sessionStorage.getItem('isPublicAccess'));
          
          // WICHTIG: Warte kurz, damit localStorage sicher gespeichert ist
          console.log('[PublicLandingPage] ⏳ Waiting 500ms for storage to settle...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('[PublicLandingPage] 🚀🚀🚀 ALL DATA STORED - NOW REDIRECTING TO /transcribe 🚀🚀🚀');
          console.log('[PublicLandingPage] Current URL:', window.location.href);
          console.log('[PublicLandingPage] Target URL:', window.location.origin + '/transcribe');
          
          // Use hard redirect to ensure fresh page load with new token
          console.log('[PublicLandingPage] ⏱️ Executing redirect NOW...');
          window.location.href = '/transcribe';
        } else if (result.type === 'mp3') {
          console.log('[PublicLandingPage] 🎵 MP3 ACCESS - Navigating to MP3 view');
          // Navigate to MP3 view
          navigate(`/public/mp3/${id}?pw=${encodeURIComponent(password)}`);
        } else {
          console.error('[PublicLandingPage] ❌❌❌ UNEXPECTED RESULT STRUCTURE ❌❌❌');
          console.error('[PublicLandingPage] result.type:', result.type);
          console.error('[PublicLandingPage] result.token:', result.token ? 'EXISTS' : 'MISSING');
          console.error('[PublicLandingPage] result.user:', result.user ? 'EXISTS' : 'MISSING');
          console.error('[PublicLandingPage] Full result:', JSON.stringify(result, null, 2));
        }
      } else {
        console.error('[PublicLandingPage] Password verification failed:', result.error);
        setError(result.error || 'Zugriff verweigert.');
        setVerifying(false);
      }
    } catch (err) {
      console.error('[PublicLandingPage] verifyPassword error:', err);
      setError(err.error || 'Fehler bei der Authentifizierung.');
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lade Zugangsinformationen...</p>
        </div>
      </div>
    );
  }

  if (error && !idInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <span className="text-6xl">❌</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">Zugriff nicht möglich</h1>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {idInfo?.type === 'user' ? '🎙️ MP3-Transkriptionen' : '🎵 MP3-Transkription'}
          </h1>
          <p className="text-gray-600">
            {idInfo?.type === 'user' 
              ? 'Zugriff auf MP3 Transkriptionen für ID:'
              : `Zugriff auf: ${idInfo?.mp3_filename}`
            }
          </p>
          <div className="mt-4 inline-block bg-gray-100 px-4 py-2 rounded-lg">
            <p className="font-mono text-lg text-gray-900">{id}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              type="text"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder=""
              disabled={verifying}
              autoFocus
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition ${
              verifying
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {verifying ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Prüfe Passwort...
              </span>
            ) : (
              '🔓 Zugriff freischalten'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            MP3 Transcriber App - Secured Access
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicLandingPage;
