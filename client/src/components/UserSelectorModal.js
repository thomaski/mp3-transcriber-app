/**
 * User Selector Modal Component
 * Modal dialog for selecting a user with search functionality
 * Shows list of all users with first_name, last_name, username, email, and role
 */

import React, { useState, useEffect } from 'react';
import { FaUser, FaTimes, FaUserShield, FaSearch } from 'react-icons/fa';

function UserSelectorModal({ isOpen, onClose, onSelectUser, currentUser }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [firstNameFilter, setFirstNameFilter] = useState('');
  const [lastNameFilter, setLastNameFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
    }
  }, [isOpen]);

  // Apply filters whenever filter inputs or users change
  useEffect(() => {
    applyFilters();
  }, [firstNameFilter, lastNameFilter, users]);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[UserSelectorModal] Fetched users:', data.users);
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } else {
        setError('Fehler beim Laden der Benutzer.');
      }
    } catch (err) {
      console.error('[UserSelectorModal] Error fetching users:', err);
      setError('Fehler beim Laden der Benutzer.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    if (!firstNameFilter && !lastNameFilter) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const firstNameMatch = !firstNameFilter || 
        user.first_name.toLowerCase().includes(firstNameFilter.toLowerCase());
      const lastNameMatch = !lastNameFilter || 
        user.last_name.toLowerCase().includes(lastNameFilter.toLowerCase());
      
      return firstNameMatch && lastNameMatch;
    });

    setFilteredUsers(filtered);
  };

  const handleUserDoubleClick = (user) => {
    const displayName = `${user.first_name} ${user.last_name}`.trim() || user.username;
    onSelectUser(user.id, displayName);
    onClose();
  };

  const handleClearFilters = () => {
    setFirstNameFilter('');
    setLastNameFilter('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <FaUser className="mr-3 text-primary-500" />
            Benutzer auswählen
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Search Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaSearch className="inline mr-2" />
                Vorname filtern
              </label>
              <input
                type="text"
                value={firstNameFilter}
                onChange={(e) => setFirstNameFilter(e.target.value)}
                placeholder="Vorname eingeben..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaSearch className="inline mr-2" />
                Nachname filtern
              </label>
              <input
                type="text"
                value={lastNameFilter}
                onChange={(e) => setLastNameFilter(e.target.value)}
                placeholder="Nachname eingeben..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          {(firstNameFilter || lastNameFilter) && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredUsers.length} von {users.length} Benutzer{filteredUsers.length !== 1 ? 'n' : ''} gefunden
              </p>
              <button
                onClick={handleClearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Filter zurücksetzen
              </button>
            </div>
          )}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Lade Benutzer...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>{error}</p>
              <button
                onClick={fetchAllUsers}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Erneut versuchen
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaUser className="mx-auto text-4xl mb-4 text-gray-300" />
              <p>Keine Benutzer gefunden.</p>
              {(firstNameFilter || lastNameFilter) && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-primary-600 hover:text-primary-700"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onDoubleClick={() => handleUserDoubleClick(user)}
                  className="w-full flex items-center space-x-4 px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition text-left"
                  title="Doppelklick zum Auswählen"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      {user.isAdmin ? (
                        <FaUserShield className="text-white text-xl" />
                      ) : (
                        <FaUser className="text-white text-xl" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      {user.isAdmin && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-white bg-primary-600 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <p className="truncate">
                        <span className="font-medium">Username:</span> {user.username}
                      </p>
                      <p className="truncate">
                        <span className="font-medium">Email:</span> {user.email || '-'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              💡 <strong>Tipp:</strong> Doppelklick auf einen Benutzer zum Auswählen
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSelectorModal;
