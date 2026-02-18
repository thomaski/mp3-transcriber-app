/**
 * User MP3 List View (Public)
 * Displays all MP3 transcriptions for a specific user (after password verification)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getUserMp3List } from '../../services/publicAccessService';

function UserMp3ListView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const password = searchParams.get('pw');

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!password) {
      navigate(`/access/${id}`);
      return;
    }

    getUserMp3List(id, password)
      .then((data) => {
        if (data.success) {
          setUserData(data);
          setLoading(false);
        } else {
          setError(data.error || 'Fehler beim Laden der MP3-Liste.');
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.error || 'Zugriff verweigert.');
        setLoading(false);
      });
  }, [id, password, navigate]);

  const handleMp3Click = (mp3Id) => {
    navigate(`/public/mp3/${mp3Id}?pw=${encodeURIComponent(password)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lade MP3-Übersicht...</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🎙️ MP3-Übersicht
              </h1>
              <p className="text-gray-600">
                Benutzer: <strong>{userData?.user?.name}</strong>
              </p>
              <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded">
                <span className="text-xs text-gray-500">USER-ID</span>
                <span className="ml-2 font-mono text-sm text-gray-900">{id}</span>
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

        {/* MP3 List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            MP3-Transkriptionen ({userData?.transcriptions?.length || 0})
          </h2>

          {!userData?.transcriptions || userData.transcriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl mb-4 block">📭</span>
              <p>Keine MP3-Transkriptionen vorhanden.</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">MP3-Datei</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Erstellt</th>
                    <th className="px-4 py-3">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {userData.transcriptions.map((mp3) => (
                    <tr 
                      key={mp3.id} 
                      className="border-b border-gray-200 hover:bg-blue-50 transition cursor-pointer"
                      onClick={() => handleMp3Click(mp3.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-600">{mp3.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{mp3.mp3_filename}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          mp3.has_summary ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {mp3.has_summary ? '✓ Ja' : '✗ Nein'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(mp3.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMp3Click(mp3.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Öffnen →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>MP3 Transcriber App - Öffentlicher Zugriff (Nur Lesen)</p>
        </div>
      </div>
    </div>
  );
}

export default UserMp3ListView;
