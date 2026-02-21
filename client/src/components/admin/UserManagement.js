/**
 * User Management Component (Admin-only) - Version 2.1
 * List, Create, Edit, Delete users
 * Features:
 * - ✅ Sortierbare Spalten (Click auf Header)
 * - ✅ Inline-Editing mit Auto-Save
 * - ✅ Email-Spalte mit Validierung
 * - ✅ Passwort-Spalte (Change Password)
 * - ✅ Fix: Inline-Edit springt nicht mehr zu falschem Feld
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  deleteTranscription,
  getUserTranscriptions,
  getAllTranscriptions
} from '../../services/userService';
import logger from '../../utils/logger';

function UserManagement() {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [transcriptions, setTranscriptions] = useState([]);
  const [transcriptionsLoading, setTranscriptionsLoading] = useState(false);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState(null);
  // Merkt sich die pending Transkription-ID beim automatischen User-Wechsel
  const pendingTranscriptionIdRef = useRef(null);

  // Sorting state
  const [sortBy, setSortBy] = useState('first_name'); // first_name, last_name, username, email
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // New user form state
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false); // Double-Submit-Schutz
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    is_admin: false
  });

  // Edit state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingField, setEditingField] = useState(null); // 'first_name', 'last_name', 'username', 'email', 'password'
  const [editFormData, setEditFormData] = useState({});
  const [saveStatus, setSaveStatus] = useState({}); // { userId: 'saving' | 'saved' | 'error' }

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Load transcriptions when user is selected – oder alle wenn kein User selektiert
  useEffect(() => {
    if (selectedUserId) {
      // loadTranscriptions setzt selectedTranscriptionId (inkl. pending-ID-Handling)
      loadTranscriptions(selectedUserId);
    } else {
      loadAllTranscriptionsView();
      setSelectedTranscriptionId(null);
    }
  }, [selectedUserId]);

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.users);
      }
    } catch (error) {
      logger.error('[UserManagement] Benutzer laden fehlgeschlagen:', error.message);
      setError('Fehler beim Laden der Benutzer.');
    } finally {
      setLoading(false);
    }
  }

  async function loadTranscriptions(userId) {
    try {
      setTranscriptionsLoading(true);
      const response = await getUserTranscriptions(userId);
      if (response.success) {
        // Sortiere Transkriptionen aufsteigend nach MP3-Dateiname
        const sortedTranscriptions = response.transcriptions.sort((a, b) => {
          const nameA = (a.mp3_filename || '').toLowerCase();
          const nameB = (b.mp3_filename || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setTranscriptions(sortedTranscriptions);
        
        // Pending-ID anwenden (beim automatischen User-Wechsel via Transkriptions-Klick)
        if (pendingTranscriptionIdRef.current) {
          setSelectedTranscriptionId(pendingTranscriptionIdRef.current);
          pendingTranscriptionIdRef.current = null;
        } else {
          setSelectedTranscriptionId(null);
        }
      }
    } catch (error) {
      logger.error('[UserManagement] Transkriptionen laden fehlgeschlagen:', error.message);
      pendingTranscriptionIdRef.current = null;
    } finally {
      setTranscriptionsLoading(false);
    }
  }

  // Alle Transkriptionen aller User laden (kein User selektiert)
  async function loadAllTranscriptionsView() {
    try {
      setTranscriptionsLoading(true);
      const response = await getAllTranscriptions();
      if (response.success) {
        // Sortiere nach MP3-Dateiname
        const sorted = response.transcriptions.sort((a, b) => {
          const nameA = (a.mp3_filename || '').toLowerCase();
          const nameB = (b.mp3_filename || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setTranscriptions(sorted);
      }
    } catch (error) {
      logger.error('[UserManagement] Alle Transkriptionen laden fehlgeschlagen:', error.message);
    } finally {
      setTranscriptionsLoading(false);
    }
  }

  // Handle row click (select user)
  function handleRowClick(userId) {
    if (editingUserId !== userId) {
      setSelectedUserId(userId === selectedUserId ? null : userId);
    }
  }

  // Handle transcription row click (select transcription)
  // Wenn kein User selektiert (Alle-Ansicht) und die Transkription einem User gehört,
  // wird automatisch der zugehörige User selektiert und die Transkription markiert.
  function handleTranscriptionRowClick(trans) {
    const transcriptionId = trans.id;
    
    // Deselektieren bei erneutem Klick
    if (transcriptionId === selectedTranscriptionId) {
      setSelectedTranscriptionId(null);
      return;
    }
    
    // In der Alle-Ansicht: zugehörigen User automatisch selektieren
    if (!selectedUserId && trans.user_id) {
      pendingTranscriptionIdRef.current = transcriptionId;
      setSelectedUserId(trans.user_id);
      // selectedTranscriptionId wird in loadTranscriptions gesetzt (nach Laden)
    } else {
      setSelectedTranscriptionId(transcriptionId);
    }
  }

  // Handle open transcription
  function handleOpenTranscription() {
    if (selectedTranscriptionId) {
      logger.log('[UserManagement] Transkription öffnen:', selectedTranscriptionId);
      navigate(`/transcribe/${selectedTranscriptionId}`);
    }
  }

  // Handle delete transcription
  async function handleDeleteTranscription() {
    if (!selectedTranscriptionId) return;

    const trans = transcriptions.find(t => t.id === selectedTranscriptionId);
    const filename = trans?.mp3_filename || selectedTranscriptionId;

    if (!window.confirm(`Transkription "${filename}" wirklich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      const response = await deleteTranscription(selectedTranscriptionId);
      if (response.success) {
        logger.log('[UserManagement] ✅ Transkription gelöscht:', selectedTranscriptionId);
        // Aus der Liste entfernen und Auswahl zurücksetzen
        setTranscriptions(prev => prev.filter(t => t.id !== selectedTranscriptionId));
        setSelectedTranscriptionId(null);
        // Transkriptions-Zähler beim zugehörigen User aktualisieren
        // (trans.user_id funktioniert auch in der Alle-Ansicht, da die Transkription den user_id enthält)
        const ownerUserId = trans?.user_id || selectedUserId;
        setUsers(prev => prev.map(u =>
          u.id === ownerUserId
            ? { ...u, transcription_count: Math.max(0, (u.transcription_count || 1) - 1) }
            : u
        ));
      }
    } catch (error) {
      logger.error('[UserManagement] Transkription löschen fehlgeschlagen:', error.message);
      setError(error.response?.data?.error || 'Fehler beim Löschen der Transkription.');
      setTimeout(() => setError(null), 4000);
    }
  }

  // Handle double click (start editing) - FIX: Field-specific!
  function handleCellDoubleClick(user, field) {
    setEditingUserId(user.id);
    setEditingField(field);
    setEditFormData({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email || '',
      is_admin: user.isAdmin,
      password: '' // Always empty for security
    });
  }

  // Handle input change (while editing)
  function handleEditChange(field, value) {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  }

  // Handle Enter key (save on Enter)
  function handleKeyDown(e, userId) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(userId);
    }
  }

  // Auto-save after blur
  async function handleBlur(userId) {
    if (!editingUserId || !editingField) return;

    // Validate required fields
    if (editingField === 'first_name' && !editFormData.first_name?.trim()) {
      setError('Vorname ist erforderlich.');
      setTimeout(() => setError(null), 3000);
      setEditingUserId(null);
      setEditingField(null);
      return;
    }

    if (editingField === 'username' && !editFormData.username?.trim()) {
      setError('Benutzername ist erforderlich.');
      setTimeout(() => setError(null), 3000);
      setEditingUserId(null);
      setEditingField(null);
      return;
    }

    // Don't save empty password (user cancelled)
    if (editingField === 'password' && !editFormData.password?.trim()) {
      setEditingUserId(null);
      setEditingField(null);
      return;
    }

    try {
      setSaveStatus(prev => ({ ...prev, [userId]: 'saving' }));

      // Only send changed field
      const updateData = {};
      updateData[editingField] = editFormData[editingField];

      const response = await updateUser(userId, updateData);

      if (response.success) {
        // Update users list
        setUsers(prev => prev.map(u => u.id === userId ? response.user : u));

        // Show success indicator
        setSaveStatus(prev => ({ ...prev, [userId]: 'saved' }));

        // Hide success after 2 seconds
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [userId]: null }));
        }, 2000);

        setEditingUserId(null);
        setEditingField(null);
      }
    } catch (error) {
      logger.error('[UserManagement] Benutzer aktualisieren fehlgeschlagen:', error.message);
      setSaveStatus(prev => ({ ...prev, [userId]: 'error' }));
      setError(error.response?.data?.error || 'Fehler beim Speichern.');

      // Hide error after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [userId]: null }));
        setError(null);
      }, 3000);
    }
  }

  // Handle ESC key (cancel editing)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && editingUserId) {
        setEditingUserId(null);
        setEditingField(null);
        setEditFormData({});
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingUserId]);

  // Handle create user
  async function handleCreateUser(e) {
    e.preventDefault();
    if (isCreatingUser) return; // Double-Submit-Schutz
    setIsCreatingUser(true);
    logger.log('[UserManagement] Neuen Benutzer erstellen:', { username: newUser.username });

    try {
      const response = await createUser(newUser);

      if (response.success) {
        logger.log('[UserManagement] ✅ Benutzer erstellt:', response.user?.username);
        setUsers(prev => [response.user, ...prev]);
        setShowNewUserForm(false);
        setNewUser({ username: '', password: '', first_name: '', last_name: '', email: '', is_admin: false });
      } else {
        logger.warn('[UserManagement] Erstellen fehlgeschlagen:', response.error);
        setError(response.error || 'Fehler beim Erstellen des Benutzers.');
      }
    } catch (error) {
      logger.error('[UserManagement] ❌ Erstellen fehlgeschlagen:', error.response?.data || error.message);
      setError(error.response?.data?.error || error.message || 'Fehler beim Erstellen des Benutzers.');
    } finally {
      setIsCreatingUser(false);
    }
  }

  // Handle delete user
  async function handleDeleteUser(userId) {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }

    try {
      const response = await deleteUser(userId);

      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        if (selectedUserId === userId) {
          setSelectedUserId(null);
        }
      }
    } catch (error) {
      logger.error('[UserManagement] Löschen fehlgeschlagen:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Fehler beim Löschen des Benutzers.');
    }
  }

  // Handle column sort
  function handleSort(column) {
    if (sortBy === column) {
      // Toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default asc
      setSortBy(column);
      setSortOrder('asc');
    }
  }

  // Sort users
  const sortedUsers = [...users].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';

    // Handle numbers (transcription_count)
    if (sortBy === 'transcription_count') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    } else {
      // String comparison (case-insensitive)
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lädt Benutzer...</p>
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
                👥 Benutzerverwaltung
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {currentUser?.first_name} {currentUser?.last_name}
              </span>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
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

        <div className="max-w-7xl mx-auto">
          {/* User List */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Benutzer ({users.length})
              </h2>
              <button
                onClick={() => {
                  if (showNewUserForm) {
                    // Beim Schließen das Formular zurücksetzen
                    setNewUser({ username: '', password: '', first_name: '', last_name: '', email: '', is_admin: false });
                  }
                  setShowNewUserForm(!showNewUserForm);
                }}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
              >
                {showNewUserForm ? 'Abbrechen' : '+ Neu'}
              </button>
            </div>

            {/* New User Form */}
            {showNewUserForm && (
              <form onSubmit={handleCreateUser} className="p-4 border-b border-gray-200 bg-blue-50" autoComplete="off">
                <h3 className="font-semibold mb-3">Neuer Benutzer</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="new-username"
                    placeholder="Benutzername *"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="px-3 py-2 border rounded text-sm"
                    autoComplete="off"
                    required
                  />
                  <input
                    type="password"
                    name="new-password"
                    placeholder="Passwort *"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="px-3 py-2 border rounded text-sm"
                    autoComplete="new-password"
                    required
                  />
                  <input
                    type="text"
                    name="new-first-name"
                    placeholder="Vorname *"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="px-3 py-2 border rounded text-sm"
                    autoComplete="off"
                    required
                  />
                  <input
                    type="text"
                    name="new-last-name"
                    placeholder="Nachname"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="px-3 py-2 border rounded text-sm"
                    autoComplete="off"
                  />
                  <input
                    type="email"
                    name="new-email"
                    placeholder="Email (optional)"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="px-3 py-2 border rounded text-sm col-span-2"
                    autoComplete="off"
                  />
                </div>
                <label className="flex items-center mt-3 text-sm">
                  <input
                    type="checkbox"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                    className="mr-2"
                  />
                  Administrator
                </label>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className={`mt-3 w-full px-3 py-2 text-white rounded transition ${isCreatingUser ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isCreatingUser ? 'Wird erstellt...' : 'Benutzer erstellen'}
                </button>
              </form>
            )}

            {/* User Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3 whitespace-nowrap">
                      ID
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      onClick={() => handleSort('first_name')}
                    >
                      Vorname {sortBy === 'first_name' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      onClick={() => handleSort('last_name')}
                    >
                      Nachname {sortBy === 'last_name' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      onClick={() => handleSort('username')}
                    >
                      Username {sortBy === 'username' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      onClick={() => handleSort('email')}
                    >
                      Email {sortBy === 'email' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Passwort</th>
                    <th className="px-4 py-3 whitespace-nowrap">Rolle</th>
                    <th
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      onClick={() => handleSort('transcription_count')}
                    >
                      MP3s {sortBy === 'transcription_count' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => handleRowClick(user.id)}
                      className={`border-b border-gray-200 cursor-pointer transition ${
                        selectedUserId === user.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      } ${editingUserId === user.id ? 'bg-yellow-50' : ''}`}
                    >
                      {/* ID (readonly) */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-600">{user.id}</span>
                      </td>

                      {/* Vorname */}
                      <td
                        className="px-4 py-3"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleCellDoubleClick(user, 'first_name');
                        }}
                      >
                        {editingUserId === user.id && editingField === 'first_name' ? (
                          <input
                            type="text"
                            value={editFormData.first_name}
                            onChange={(e) => handleEditChange('first_name', e.target.value)}
                            onBlur={() => handleBlur(user.id)}
                            onKeyDown={(e) => handleKeyDown(e, user.id)}
                            className="px-2 py-1 border rounded w-full text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">{user.first_name}</span>
                        )}
                      </td>

                      {/* Nachname */}
                      <td
                        className="px-4 py-3"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleCellDoubleClick(user, 'last_name');
                        }}
                      >
                        {editingUserId === user.id && editingField === 'last_name' ? (
                          <input
                            type="text"
                            value={editFormData.last_name}
                            onChange={(e) => handleEditChange('last_name', e.target.value)}
                            onBlur={() => handleBlur(user.id)}
                            onKeyDown={(e) => handleKeyDown(e, user.id)}
                            className="px-2 py-1 border rounded w-full text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">{user.last_name}</span>
                        )}
                      </td>

                      {/* Username */}
                      <td
                        className="px-4 py-3"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleCellDoubleClick(user, 'username');
                        }}
                      >
                        {editingUserId === user.id && editingField === 'username' ? (
                          <input
                            type="text"
                            value={editFormData.username}
                            onChange={(e) => handleEditChange('username', e.target.value)}
                            onBlur={() => handleBlur(user.id)}
                            onKeyDown={(e) => handleKeyDown(e, user.id)}
                            className="px-2 py-1 border rounded w-full text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-mono">{user.username}</span>
                        )}
                      </td>

                      {/* Email */}
                      <td
                        className="px-4 py-3"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleCellDoubleClick(user, 'email');
                        }}
                      >
                        {editingUserId === user.id && editingField === 'email' ? (
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => handleEditChange('email', e.target.value)}
                            onBlur={() => handleBlur(user.id)}
                            onKeyDown={(e) => handleKeyDown(e, user.id)}
                            className="px-2 py-1 border rounded w-full text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-gray-600">{user.email || '-'}</span>
                        )}
                      </td>

                      {/* Passwort */}
                      <td
                        className="px-4 py-3"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleCellDoubleClick(user, 'password');
                        }}
                      >
                        {editingUserId === user.id && editingField === 'password' ? (
                          <input
                            type="text"
                            placeholder="Neues Passwort"
                            value={editFormData.password}
                            onChange={(e) => handleEditChange('password', e.target.value)}
                            onBlur={() => handleBlur(user.id)}
                            onKeyDown={(e) => handleKeyDown(e, user.id)}
                            className="px-2 py-1 border rounded w-full text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-gray-400 cursor-pointer hover:text-gray-600" title="Doppelklick zum Ändern">
                            [Ändern]
                          </span>
                        )}
                      </td>

                      {/* Rolle */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          user.isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>

                      {/* MP3 Count */}
                      <td className="px-4 py-3 text-center text-sm">{user.transcription_count}</td>

                      {/* Aktionen */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {saveStatus[user.id] === 'saving' && (
                            <span className="text-xs text-gray-500">💾 Speichert...</span>
                          )}
                          {saveStatus[user.id] === 'saved' && (
                            <span className="text-xs text-green-600">✓ Gespeichert</span>
                          )}
                          {saveStatus[user.id] === 'error' && (
                            <span className="text-xs text-red-600">✗ Fehler</span>
                          )}
                          {!saveStatus[user.id] && user.id !== currentUser?.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(user.id);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                              title="Löschen"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* URL Sharing (when user is selected) */}
            {selectedUserId && (
              <div className="p-4 bg-blue-50 border-t border-blue-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">🔗 Landing-Page URL</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${window.location.protocol}//${window.location.host}/access/${selectedUserId}`}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white font-mono"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      const url = `${window.location.protocol}//${window.location.host}/access/${selectedUserId}`;
                      navigator.clipboard.writeText(url).then(() => {
                        alert('✅ URL in Zwischenablage kopiert!');
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    📋 Kopieren
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Passwort für den Zugriff: <strong>{users.find(u => u.id === selectedUserId)?.first_name}</strong>
                </p>
              </div>
            )}

            <div className="p-3 bg-gray-50 text-xs text-gray-600 border-t">
              💡 <strong>Tipps:</strong> Click auf Spalten-Header zum Sortieren • Doppelklick auf Zelle zum Editieren • ESC zum Abbrechen
            </div>
          </div>

          {/* MP3 Transcriptions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedUserId
                  ? `MP3-Transkriptionen – ${users.find(u => u.id === selectedUserId)?.first_name || ''} ${users.find(u => u.id === selectedUserId)?.last_name || ''}`.trim()
                  : `Alle MP3-Transkriptionen (${transcriptions.length})`
                }
              </h2>
              {!selectedUserId && (
                <p className="text-sm text-gray-500 mt-1">
                  Klicken Sie auf einen Benutzer oben, um nur dessen Transkriptionen zu sehen.
                </p>
              )}
            </div>

            {transcriptionsLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : transcriptions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Keine Transkriptionen vorhanden.</p>
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-3 whitespace-nowrap">ID</th>
                      {/* Benutzer-Spalte nur in der Alle-Ansicht */}
                      {!selectedUserId && (
                        <th className="px-4 py-3 whitespace-nowrap">Benutzer</th>
                      )}
                      <th className="px-4 py-3 whitespace-nowrap">MP3-Datei</th>
                      <th className="px-4 py-3 whitespace-nowrap">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transcriptions.map((trans) => (
                      <tr
                        key={trans.id}
                        onClick={() => handleTranscriptionRowClick(trans)}
                        className={`border-b border-gray-200 cursor-pointer transition ${
                          selectedTranscriptionId === trans.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-gray-600">{trans.id}</span>
                        </td>
                        {/* Benutzer-Spalte nur in der Alle-Ansicht */}
                        {!selectedUserId && (
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">
                              {trans.first_name ? `${trans.first_name}${trans.last_name ? ' ' + trans.last_name : ''}` : trans.username}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="text-sm" title={trans.mp3_filename}>🎵 {trans.mp3_filename}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            trans.has_summary ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {trans.has_summary ? '✓' : '✗'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Aktions-Buttons (immer sichtbar wenn Transkriptionen vorhanden) */}
            {transcriptions.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleOpenTranscription}
                    disabled={!selectedTranscriptionId}
                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded transition flex items-center justify-center gap-2 ${
                      selectedTranscriptionId
                        ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={selectedTranscriptionId ? 'Transkription öffnen' : 'Bitte eine Transkription in der Tabelle auswählen'}
                  >
                    📂 Transkription öffnen
                  </button>
                  <button
                    onClick={handleDeleteTranscription}
                    disabled={!selectedTranscriptionId}
                    className={`px-4 py-2 text-sm font-semibold rounded transition flex items-center justify-center gap-2 ${
                      selectedTranscriptionId
                        ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={selectedTranscriptionId ? 'Transkription löschen' : 'Bitte eine Transkription auswählen'}
                  >
                    🗑️ Löschen
                  </button>
                </div>

                {selectedTranscriptionId ? (() => {
                  // Passwort-User aus selektierter Transkription ermitteln (funktioniert auch in Alle-Ansicht)
                  const selTrans = transcriptions.find(t => t.id === selectedTranscriptionId);
                  const ownerUserId = selTrans?.user_id || selectedUserId;
                  const ownerUser = users.find(u => u.id === ownerUserId);
                  return (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-700">🔗 Landing-Page URL (Transkription)</h3>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={`${window.location.protocol}//${window.location.host}/public/mp3/${selectedTranscriptionId}`}
                          readOnly
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-white font-mono"
                          onClick={(e) => e.target.select()}
                        />
                        <button
                          onClick={() => {
                            const url = `${window.location.protocol}//${window.location.host}/public/mp3/${selectedTranscriptionId}`;
                            navigator.clipboard.writeText(url).then(() => {
                              alert('✅ URL in Zwischenablage kopiert!');
                            });
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition flex items-center gap-1"
                        >
                          📋 Kopieren
                        </button>
                      </div>
                      {ownerUser && (
                        <p className="text-xs text-gray-600">
                          Passwort für den Zugriff: <strong>{ownerUser.first_name}</strong>
                        </p>
                      )}
                    </div>
                  );
                })() : (
                  <p className="text-xs text-gray-600 text-center">
                    ℹ️ Klicken Sie auf eine Zeile in der Tabelle um eine Transkription auszuwählen
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserManagement;
