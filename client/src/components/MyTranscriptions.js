/**
 * MyTranscriptions Component
 * Shows all transcriptions for the current user with click-to-open functionality
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserTranscriptions } from '../services/userService';
import logger from '../utils/logger';

function MyTranscriptions() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTranscriptions();
  }, [user]);

  async function loadTranscriptions() {
    if (!user?.id) {
      logger.error('[MyTranscriptions] Kein Benutzer-ID vorhanden');
      setError('Benutzer nicht authentifiziert.');
      setLoading(false);
      return;
    }

    try {
      logger.log('[MyTranscriptions] Lade Transkriptionen für Benutzer:', user.id);
      setLoading(true);
      setError(null);

      const response = await getUserTranscriptions(user.id);

      if (response.success) {
        logger.log('[MyTranscriptions] Transkriptionen geladen:', response.transcriptions.length);
        setTranscriptions(response.transcriptions);
      } else {
        logger.error('[MyTranscriptions] Laden fehlgeschlagen:', response.error);
        setError(response.error || 'Fehler beim Laden der Transkriptionen.');
      }
    } catch (err) {
      logger.error('[MyTranscriptions] ❌ Fehler:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Fehler beim Laden der Transkriptionen.');
    } finally {
      setLoading(false);
    }
  }

  function handleTranscriptionClick(transcription) {
    logger.log('[MyTranscriptions] Transkription geöffnet:', transcription.id);
    navigate('/transcribe', { 
      state: { 
        transcriptionId: transcription.id,
        mp3Filename: transcription.mp3_filename 
      } 
    });
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lade Transkriptionen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition"
                title="Zurück zum Dashboard"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">
                📁 Meine Transkriptionen
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {user?.username}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Ausloggen
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        )}

        {/* Transcriptions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Transkriptionen ({transcriptions.length})
            </h2>
            <button
              onClick={() => navigate('/transcribe')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
            >
              + Neue Transkription
            </button>
          </div>

          {transcriptions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-lg mb-2">Keine Transkriptionen vorhanden</p>
              <p className="text-sm">Erstellen Sie Ihre erste MP3-Transkription!</p>
              <button
                onClick={() => navigate('/transcribe')}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Jetzt starten
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">MP3-Datei</th>
                    <th className="px-4 py-3">Zusammenfassung</th>
                    <th className="px-4 py-3">Erstellt</th>
                    <th className="px-4 py-3">Aktualisiert</th>
                  </tr>
                </thead>
                <tbody>
                  {transcriptions.map((trans) => (
                    <tr
                      key={trans.id}
                      onClick={() => handleTranscriptionClick(trans)}
                      className="border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors"
                      title="Klicken zum Öffnen"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-600">{trans.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🎵</span>
                          <span className="text-sm font-medium text-gray-900">{trans.mp3_filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          trans.has_summary ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {trans.has_summary ? '✓ Ja' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(trans.created_at).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {trans.updated_at 
                          ? new Date(trans.updated_at).toLocaleDateString('de-DE', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 bg-gray-50 text-xs text-gray-600 border-t">
            💡 <strong>Tipp:</strong> Klicken Sie auf eine Zeile, um die Transkription zu öffnen und zu bearbeiten.
          </div>
        </div>
      </main>
    </div>
  );
}

export default MyTranscriptions;
