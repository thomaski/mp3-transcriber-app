/**
 * Dashboard Component
 * Main dashboard for authenticated users
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎙️ MP3 Transcriber Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Willkommen, {user?.first_name} {user?.last_name}!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Ausloggen
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Admin Panel (nur für Admins) */}
          {isAdmin && (
            <div 
              onClick={() => navigate('/admin/users')}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition border-2 border-blue-500"
            >
              <div className="text-4xl mb-3">👥</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Benutzerverwaltung
              </h2>
              <p className="text-gray-600 text-sm">
                Benutzer und MP3-Transkriptionen verwalten
              </p>
              <div className="mt-4 text-blue-600 font-semibold">
                → Zur Verwaltung
              </div>
            </div>
          )}

          {/* Transcribe MP3 (nur für Admins) */}
          {isAdmin && (
          <div 
            onClick={() => navigate('/transcribe')}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">🎵</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              MP3 Transkribieren
            </h2>
            <p className="text-gray-600 text-sm">
              MP3-Dateien hochladen und transkribieren
            </p>
            <div className="mt-4 text-blue-600 font-semibold">
              → Zur Transkription
            </div>
          </div>
          )}

          {/* Meine Transkriptionen */}
          <div 
            onClick={() => {
              navigate(`/my-transcriptions`);
            }}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
          >
            <div className="text-4xl mb-3">📁</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Meine Transkriptionen
            </h2>
            <p className="text-gray-600 text-sm">
              Alle meine MP3-Transkriptionen ansehen
            </p>
            <div className="mt-4 text-blue-600 font-semibold">
              → Zu meinen Transkriptionen
            </div>
          </div>

          {/* Statistiken (nur für Admins) */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-4xl mb-3">📊</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Statistiken
              </h2>
              <p className="text-gray-600 text-sm">
                Übersicht über alle Benutzer und Transkriptionen
              </p>
              <div className="mt-4 text-gray-400">
                (Coming soon)
              </div>
            </div>
          )}
        </div>

        {/* User Info Card */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Ihre Informationen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Benutzername:</p>
              <p className="font-semibold">{user?.username}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Name:</p>
              <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rolle:</p>
              <p className="font-semibold">
                {isAdmin ? (
                  <span className="text-blue-600">👑 Administrator</span>
                ) : (
                  <span className="text-gray-600">👤 Benutzer</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mitglied seit:</p>
              <p className="font-semibold">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
