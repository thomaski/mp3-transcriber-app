/**
 * Public MP3 View (Read-Only)
 * Displays MP3 transcription without edit capabilities
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getMp3Transcription } from '../../services/publicAccessService';

function PublicMp3View() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const password = searchParams.get('pw');

  const [loading, setLoading] = useState(true);
  const [mp3Data, setMp3Data] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!password) {
      navigate(`/access/${id}`);
      return;
    }

    getMp3Transcription(id, password)
      .then((data) => {
        if (data.success) {
          setMp3Data(data.transcription);
          setLoading(false);
        } else {
          setError(data.error || 'Fehler beim Laden der Transkription.');
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.error || 'Zugriff verweigert.');
        setLoading(false);
      });
  }, [id, password, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lade Transkription...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
            onClick={() => navigate(`/access/${id}`)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  🎵 {mp3Data?.mp3_filename}
                </h1>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  🔒 NUR LESEN
                </span>
              </div>
              <p className="text-gray-600 mb-2">
                Autor: <strong>{mp3Data?.author}</strong>
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-block bg-gray-100 px-3 py-1 rounded">
                  <span className="text-xs text-gray-500">MP3-ID</span>
                  <span className="ml-2 font-mono text-sm text-gray-900">{id}</span>
                </div>
                <div className="inline-block bg-gray-100 px-3 py-1 rounded">
                  <span className="text-xs text-gray-500">Erstellt</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(mp3Data?.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
                {mp3Data?.has_summary && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                    ✓ Mit Zusammenfassung
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              🏠 Startseite
            </button>
          </div>
        </header>

        {/* Transcription Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              📝 Transkription
            </h2>
          </div>

          {!mp3Data?.transcription_text || mp3Data.transcription_text.trim() === '' ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">📄</span>
              <p>Noch keine Transkription vorhanden.</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                {mp3Data.transcription_text}
              </pre>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Hinweis</h3>
              <p className="text-sm text-gray-700">
                Diese Ansicht ist <strong>schreibgeschützt</strong>. Sie können die Transkription 
                nur lesen, aber nicht bearbeiten. Für Änderungen wenden Sie sich bitte an den 
                Administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>MP3 Transcriber App - Öffentlicher Zugriff (Nur Lesen)</p>
        </div>
      </div>
    </div>
  );
}

export default PublicMp3View;
