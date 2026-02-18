/**
 * User Selector Component
 * Autocomplete dropdown for selecting a user to assign transcriptions
 * Only visible for Admin users
 */

import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaSearch, FaTimes } from 'react-icons/fa';

function UserSelector({ selectedUserId, selectedUserName, onSelectUser, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users with debouncing
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      console.log('[UserSelector] Searching for:', searchQuery);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[UserSelector] Search results:', data.users);
          setSearchResults(data.users || []);
          setShowDropdown(true);
        } else {
          console.error('[UserSelector] Search failed:', response.status);
        }
      } catch (error) {
        console.error('[UserSelector] Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectUser = (user) => {
    onSelectUser(user.id, `${user.first_name} ${user.last_name}`.trim() || user.username);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    onSelectUser(null, '');
    setSearchQuery('');
  };

  // Auto-select current user for non-admins
  useEffect(() => {
    if (currentUser && !currentUser.isAdmin && !selectedUserId) {
      const displayName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username;
      onSelectUser(currentUser.id, displayName);
    }
  }, [currentUser, selectedUserId, onSelectUser]);

  // Non-admin users: show read-only display
  if (currentUser && !currentUser.isAdmin) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FaUser className="text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Transkription wird gespeichert für:</p>
            <p className="text-lg font-semibold text-gray-900">{selectedUserName || currentUser.username}</p>
          </div>
        </div>
      </div>
    );
  }

  // Admin users: show searchable selector
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-300 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <FaUser className="inline mr-2" />
        Transkription speichern für Benutzer:
      </label>

      {/* Selected User Display or Search Input */}
      {selectedUserId ? (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FaUser className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ausgewählt:</p>
              <p className="font-semibold text-gray-900">{selectedUserName}</p>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            className="text-red-500 hover:text-red-700 transition"
            title="Auswahl aufheben"
          >
            <FaTimes size={20} />
          </button>
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Benutzername oder Name eingeben..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Dropdown Results */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                  {user.isAdmin && (
                    <span className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded">
                      Admin
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
              <p className="text-gray-500 text-center">Keine Benutzer gefunden für "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {!selectedUserId && (
        <p className="mt-2 text-xs text-gray-500">
          💡 Beginnen Sie mit der Eingabe, um Benutzer zu suchen
        </p>
      )}
    </div>
  );
}

export default UserSelector;
