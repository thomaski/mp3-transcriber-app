// ============================================================================
// DropZone Component
// ============================================================================
// Drag-and-drop file upload zone with NATIVE drag & drop events

import React, { useCallback, useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFileAudio, FaFolderOpen } from 'react-icons/fa';
import logger from '../utils/logger';

function DropZone({ onDrop }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragReject, setIsDragReject] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Native Drag & Drop Event Handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    
    // NUR visuelles Feedback, keine Größenänderung
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setIsDragActive(false);
      setIsDragReject(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // WICHTIG: Setze dropEffect für bessere Browser-Kompatibilität
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // State sofort zurücksetzen
    setIsDragActive(false);
    setIsDragReject(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      
      // Filtere nur MP3-Dateien
      const mp3Files = files.filter(file => 
        file.name.toLowerCase().endsWith('.mp3')
      );
      
      if (mp3Files.length > 0) {
        onDrop([mp3Files[0]]);
      } else {
        logger.warn('[DropZone] Keine gültigen MP3-Dateien gefunden');
        alert('Bitte nur MP3-Dateien hochladen!');
      }
    } else {
      // Fallback: Versuche items API
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const items = Array.from(e.dataTransfer.items);
        const fileItems = items.filter(item => item.kind === 'file');
        
        if (fileItems.length > 0) {
          const file = fileItems[0].getAsFile();
          
          if (file && file.name.toLowerCase().endsWith('.mp3')) {
            onDrop([file]);
          } else {
            alert('Bitte nur MP3-Dateien hochladen!');
          }
        }
      } else {
        logger.error('[DropZone] Weder files noch items verfügbar!');
        alert('Drag & Drop funktioniert nicht auf diesem Browser. Bitte den "Datei durchsuchen"-Button verwenden.');
      }
    }
    
    // Cleanup
    try {
      e.dataTransfer.clearData();
    } catch (err) {
      logger.debug('[DropZone] clearData() nicht verfügbar:', err.message);
    }
  }, [onDrop]);

  const handleDragEnd = useCallback((e) => {
    e.preventDefault();
    
    // Vollständiger State-Reset
    setIsDragActive(false);
    setIsDragReject(false);
    dragCounter.current = 0;
  }, []);

  const handleClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onDrop(files);
    }
  }, [onDrop]);

  const handleBrowseClick = useCallback((e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`
        relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-all duration-200 ease-in-out
        ${isDragActive && !isDragReject
          ? 'border-primary-500 bg-primary-50'
          : isDragReject
          ? 'border-red-500 bg-red-50'
          : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,audio/mpeg,audio/mp3"
        multiple={false}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      
      {/* WICHTIG: pointer-events: none verhindert, dass Child-Elemente Drop-Events blockieren */}
      <div className="space-y-4" style={{ pointerEvents: 'none' }}>
        {/* Icon */}
        <div className="flex justify-center">
          {isDragActive ? (
            <FaCloudUploadAlt className="text-6xl text-primary-500 animate-bounce" />
          ) : (
            <FaFileAudio className="text-5xl text-gray-400" />
          )}
        </div>
        
        {/* Text */}
        <div>
          {isDragReject ? (
            <>
              <p className="text-lg font-semibold text-red-600">
                Ungültiger Dateityp
              </p>
              <p className="text-sm text-red-500 mt-2">
                Nur MP3-Dateien werden unterstützt
              </p>
            </>
          ) : isDragActive ? (
            <>
              <p className="text-lg font-semibold text-primary-600">
                Datei hier ablegen...
              </p>
              <p className="text-sm text-primary-500 mt-2">
                Loslassen zum Hochladen
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-700">
                MP3-Datei hochladen
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Drag & Drop, klicken oder Button verwenden
              </p>
            </>
          )}
              
          {/* Prominenter Browse-Button - IMMER anzeigen, aber bei Drag unsichtbar */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  style={{ pointerEvents: 'auto' }}
              className={`inline-flex items-center px-8 py-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-base ${isDragActive ? 'invisible' : 'visible'}`}
                >
                  <FaFolderOpen className="mr-3 text-xl" />
                  Datei durchsuchen
                </button>
              </div>
              
          <div className={`mt-6 flex items-center justify-center space-x-6 text-xs text-gray-400 ${isDragActive ? 'invisible' : 'visible'}`}>
                <div className="flex items-center space-x-2">
                  <FaFileAudio className="text-base" />
                  <span>MP3-Audio (max. 100 MB)</span>
                </div>
              </div>
        </div>
        
        {/* Additional Info - IMMER anzeigen, aber bei Drag unsichtbar */}
        <div className={`mt-6 pt-6 border-t border-gray-200 ${isDragActive ? 'invisible' : 'visible'}`}>
            <p className="text-xs text-gray-400">
              💡 Drag & Drop funktioniert auch bei Remote-Zugriff
            </p>
          </div>
      </div>
    </div>
  );
}

export default DropZone;
