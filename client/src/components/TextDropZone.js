// ============================================================================
// TextDropZone Component
// ============================================================================
// Drag-and-drop zone for TXT transcription files with NATIVE drag & drop

import React, { useCallback, useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaFolderOpen } from 'react-icons/fa';
import logger from '../utils/logger';

function TextDropZone({ onDrop }) {
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

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // State sofort zurücksetzen
    setIsDragActive(false);
    setIsDragReject(false);
    dragCounter.current = 0;

    // WICHTIG: Extrahiere die Datei SOFORT, bevor wir async werden
    let fileToRead = null;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      
      // Filtere nur TXT-Dateien
      const txtFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.txt')
      );
      
      if (txtFiles.length > 0) {
        fileToRead = txtFiles[0];
      } else {
        logger.warn('[TextDropZone] Keine gültigen TXT-Dateien gefunden');
        alert('Bitte nur TXT-Dateien hochladen!');
        return;
      }
    } else {
      // Fallback: Versuche items API
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const items = Array.from(e.dataTransfer.items);
        const fileItems = items.filter(item => item.kind === 'file');
        
        if (fileItems.length > 0) {
          const file = fileItems[0].getAsFile();
          
          if (file && file.name.toLowerCase().endsWith('.txt')) {
            fileToRead = file;
          } else {
            alert('Bitte nur TXT-Dateien hochladen!');
            return;
          }
        }
      } else {
        logger.error('[TextDropZone] Weder files noch items verfügbar!');
        alert('Drag & Drop funktioniert nicht auf diesem Browser. Bitte den "Datei durchsuchen"-Button verwenden.');
        return;
      }
    }
    
    // JETZT können wir async werden - die Datei-Referenz ist gesichert
    if (fileToRead) {
      try {
        const text = await fileToRead.text();
        logger.log('[TextDropZone] Text gelesen, Länge:', text.length);
        onDrop(text);
      } catch (err) {
        logger.error('[TextDropZone] Fehler beim Lesen der Datei:', err.message);
        alert('Fehler beim Lesen der Datei: ' + err.message);
      }
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

  const handleFileInputChange = useCallback(async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const text = await file.text();
      onDrop(text);
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
        accept=".txt,text/plain"
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
            <FaFileAlt className="text-5xl text-gray-400" />
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
                Nur TXT-Dateien werden unterstützt
              </p>
            </>
          ) : isDragActive ? (
            <>
              <p className="text-lg font-semibold text-primary-600">
                Datei hier ablegen...
              </p>
              <p className="text-sm text-primary-500 mt-2">
                Loslassen zum Laden
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-700">
                Transkriptions-Datei hochladen
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
                  <FaFileAlt className="text-base" />
                  <span>TXT-Transkription (max. 10 MB)</span>
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

export default TextDropZone;
