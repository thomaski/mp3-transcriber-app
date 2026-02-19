/**
 * Public Landing Page
 * Password-protected access to user MP3 lists or direct MP3 transcriptions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkId, verifyPassword } from '../../services/publicAccessService';
import logger from '../../utils/logger';

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
    logger.log('[PublicLandingPage] Mounting with ID:', id);
    
    if (!id || id.length !== 6) {
      logger.error('[PublicLandingPage] Invalid ID length:', id?.length);
      setError('Ungültige ID. IDs müssen 6 Zeichen lang sein.');
      setLoading(false);
      return;
    }

    logger.log('[PublicLandingPage] Checking ID:', id);
    checkId(id)
      .then((data) => {
        if (data.success) {
          setIdInfo(data);
          setLoading(false);
        } else {
          logger.error('[PublicLandingPage] checkId failed:', data.error);
          setError(data.error || 'ID nicht gefunden.');
          setLoading(false);
        }
      })
      .catch((err) => {
        logger.error('[PublicLandingPage] checkId error:', err);
        setError(err.error || 'Fehler beim Laden der ID.');
        setLoading(false);
      });
  }, [id]);

  // Handle password submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    logger.log('[PublicLandingPage] Submit password for ID:', id);
    setError('');

    if (!password) {
      setError('Bitte Passwort eingeben.');
      return;
    }

    logger.log('[PublicLandingPage] Verifying password...');
    setVerifying(true);

    try {
      const result = await verifyPassword(id, password);

      if (result.success) {
        logger.log('[PublicLandingPage] ✅ Password verified, type:', result.type);
        
        // For user access: store token and user data, then redirect to transcribe
        if (result.type === 'user' && result.token && result.user) {
          // WICHTIG: NICHT localStorage.clear() verwenden!
          // Das würde auth_version löschen → Migration läuft → Token wird gelöscht!
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          sessionStorage.clear();
          
          // Store token in localStorage (Key muss 'authToken' sein, nicht 'token'!)
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
          
          // Mark as public access session
          sessionStorage.setItem('isPublicAccess', 'true');
          
          // WICHTIG: Warte kurz, damit localStorage sicher gespeichert ist
          await new Promise(resolve => setTimeout(resolve, 500));
          
          window.location.href = '/my-transcriptions';
        } else if (result.type === 'mp3' && result.token && result.user) {
          logger.log('[PublicLandingPage] 🎵 MP3 ACCESS - Token speichern und zu Transkription weiterleiten');
          
          // WICHTIG: Altes Token (z.B. von Admin) entfernen und neues Token für den MP3-Besitzer setzen
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          sessionStorage.clear();
          
          // Token für den MP3-Besitzer speichern (z.B. User "test", nicht Admin "tom")
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
          
          // Als Public Access Session markieren
          sessionStorage.setItem('isPublicAccess', 'true');
          
          logger.log('[PublicLandingPage] ✅ Token gespeichert für User:', result.user?.username);
          
          // WICHTIG: Warte kurz, damit localStorage sicher gespeichert ist
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Direkt zur Transkription weiterleiten (id = MP3-Transkriptions-ID)
          window.location.href = `/transcribe/${id}`;
        } else {
          logger.error('[PublicLandingPage] Unerwartete Ergebnisstruktur:', result.type, !!result.token, !!result.user);
        }
      } else {
        logger.error('[PublicLandingPage] Passwort-Verifikation fehlgeschlagen:', result.error);
        setError(result.error || 'Zugriff verweigert.');
        setVerifying(false);
      }
    } catch (err) {
      logger.error('[PublicLandingPage] verifyPassword error:', err);
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
