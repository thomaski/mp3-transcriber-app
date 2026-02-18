/**
 * Main App Component with Routing
 * MP3 Transcriber App v2.0.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Auth Components
import LoginScreen from './components/auth/LoginScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Main Components
import Dashboard from './components/Dashboard';
import TranscribeScreen from './components/TranscribeScreen';
import MyTranscriptions from './components/MyTranscriptions';

// Admin Components
import UserManagement from './components/admin/UserManagement';

// Public Access Components
import PublicLandingPage from './components/public/PublicLandingPage';
import UserMp3ListView from './components/public/UserMp3ListView';
import PublicMp3View from './components/public/PublicMp3View';

import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginScreen />} />
          
          {/* Public Access via Secure ID */}
          <Route path="/access/:id" element={<PublicLandingPage />} />
          <Route path="/public/user/:id" element={<UserMp3ListView />} />
          <Route path="/public/mp3/:id" element={<PublicMp3View />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transcribe" element={<TranscribeScreen />} />
            <Route path="/transcribe/:transcriptionId" element={<TranscribeScreen />} />
            <Route path="/my-transcriptions" element={<MyTranscriptions />} />
          </Route>
          
          {/* Admin-only Routes */}
          <Route element={<ProtectedRoute requireAdmin={true} />}>
            <Route path="/admin/users" element={<UserManagement />} />
          </Route>
          
          {/* Catch-all: redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
