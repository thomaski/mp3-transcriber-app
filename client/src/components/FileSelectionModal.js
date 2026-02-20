import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaFile, FaMusic, FaSpinner, FaFolder, FaSave } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { updateUploadDirectory, getUploadDirectory } from '../services/userService';
import logger from '../utils/logger';

function FileSelectionModal({ isOpen, onClose, fileType, onSelect }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentDirectory, setCurrentDirectory] = useState('');
  const [isEditingDirectory, setIsEditingDirectory] = useState(false);
  const [newDirectory, setNewDirectory] = useState('');
  const [savingDirectory, setSavingDirectory] = useState(false);

  // ESC-Taste schließt IMMER das Modal (Emergency Exit)
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const response = await fetch(`${backendUrl}/api/local-files/list?type=${fileType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Laden der Dateien');
      }
      
      const data = await response.json();
      setFiles(data.files || []);
      setCurrentDirectory(data.directory || '');
      setNewDirectory(data.directory || '');
      
    } catch (err) {
      logger.error('[FileSelectionModal] Fehler beim Laden der Dateiliste:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fileType]);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, loadFiles]);

  const handleClose = () => {
    onClose();
  };

  const handleSelect = async () => {
    if (selectedFile) {
      onSelect(selectedFile);

      // Verzeichnis für Admin speichern (wie bei Doppelklick)
      if (user?.isAdmin && user?.userId && currentDirectory) {
        try {
          await updateUploadDirectory(user.userId, currentDirectory);
        } catch (err) {
          logger.error('[FileSelectionModal] Fehler beim Speichern des Verzeichnisses:', err.message);
        }
      }

      onClose();
    }
  };

  const handleDoubleClick = async (filename) => {
    // Bei Doppelklick direkt auswählen und Modal schließen
    onSelect(filename);
    
    // Speichere das Verzeichnis für den Admin
    if (user?.isAdmin && user?.userId && currentDirectory) {
      try {
        await updateUploadDirectory(user.userId, currentDirectory);
      } catch (err) {
        logger.error('[FileSelectionModal] Fehler beim Speichern des Verzeichnisses:', err.message);
        // Fehler nicht anzeigen, da Datei bereits ausgewählt wurde
      }
    }
    
    onClose();
  };
  
  const handleSaveDirectory = async () => {
    if (!newDirectory || !user?.userId) return;
    
    setSavingDirectory(true);
    try {
      await updateUploadDirectory(user.userId, newDirectory);
      setCurrentDirectory(newDirectory);
      setIsEditingDirectory(false);
      // Reload files from new directory
      await loadFiles();
    } catch (err) {
      logger.error('[FileSelectionModal] Fehler beim Speichern des Verzeichnisses:', err.message);
      setError('Fehler beim Speichern des Verzeichnisses: ' + err.message);
    } finally {
      setSavingDirectory(false);
    }
  };

  if (!isOpen) return null;

  const title = fileType === 'mp3' ? 'MP3-Datei auswählen' : 'Transkription auswählen';
  const icon = fileType === 'mp3' ? <FaMusic /> : <FaFile />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center space-x-3 text-white">
            {icon}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          {/* X-Button - IMMER aktiv */}
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
            title="Schließen (ESC)"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Directory Display/Edit - Only for Admins */}
          {user?.isAdmin && currentDirectory && (
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <FaFolder className="text-gray-500" />
                {isEditingDirectory ? (
                  <>
                    <input
                      type="text"
                      value={newDirectory}
                      onChange={(e) => setNewDirectory(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm font-mono"
                      placeholder="D:\Pfad\zum\Verzeichnis"
                    />
                    <button
                      onClick={handleSaveDirectory}
                      disabled={savingDirectory}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm flex items-center space-x-1"
                      title="Verzeichnis speichern"
                    >
                      {savingDirectory ? <FaSpinner className="animate-spin" /> : <FaSave />}
                      <span>Speichern</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingDirectory(false);
                        setNewDirectory(currentDirectory);
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition text-sm"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-mono text-gray-700 truncate" title={currentDirectory}>
                      {currentDirectory}
                    </span>
                    <button
                      onClick={() => setIsEditingDirectory(true)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                    >
                      Ändern
                    </button>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                💾 Dieses Verzeichnis wird als Standard für zukünftige Uploads gespeichert.
              </p>
            </div>
          )}
          
          {loading && (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-primary-500 text-4xl" />
              <span className="ml-3 text-gray-600">Lade Dateien...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Fehler beim Laden</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={loadFiles}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Erneut versuchen
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                {fileType === 'mp3' ? <FaMusic size={48} /> : <FaFile size={48} />}
              </div>
              <p className="text-gray-600">Keine {fileType === 'mp3' ? 'MP3' : 'TXT'}-Dateien gefunden</p>
              <p className="text-sm text-gray-500 mt-2">
                Verzeichnis: D:\Projekte_KI\pyenv_1_transcode_durchgabe\audio
              </p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-4">
                {files.length} Datei{files.length !== 1 ? 'en' : ''} gefunden
              </div>
              
              {files.map((file, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedFile(file.filename)}
                  onDoubleClick={() => handleDoubleClick(file.filename)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${selectedFile === file.filename
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
                    }
                  `}
                  title="Doppelklick zum direkten Auswählen"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 ${selectedFile === file.filename ? 'text-primary-600' : 'text-gray-400'}`}>
                        {fileType === 'mp3' ? <FaMusic size={20} /> : <FaFile size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${selectedFile === file.filename ? 'text-primary-900' : 'text-gray-900'}`}>
                          {file.filename}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {file.sizeFormatted} • {file.modifiedFormatted}
                        </p>
                      </div>
                    </div>
                    {selectedFile === file.filename && (
                      <div className="flex-shrink-0 ml-3">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedFile}
            className={`
              px-6 py-2 rounded-lg font-medium transition-all
              ${selectedFile
                ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {fileType === 'mp3' ? 'Transkribieren' : 'Zusammenfassen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileSelectionModal;
