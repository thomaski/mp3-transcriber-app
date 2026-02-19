// ============================================================================
// ControlPanel Component
// ============================================================================
// Control buttons for Transcribe, Summarize, and Edit Mode

import React from 'react';
import { FaMicrophone, FaFileAlt, FaEdit, FaRedo } from 'react-icons/fa';

function ControlPanel({
  onTranscribeLocal,
  onSummarizeLocal,
  isProcessing,
  hasAudio,
  hasTranscription,
  isEditMode,
  showEditButton,
  onToggleEdit,
  onReset,
  isAdmin,  // Ob User ein Admin ist
  onSmartSave,  // NEU: Smart Save Handler
  saveSuccess,  // NEU: Save Success Status
  savedTranscriptionId,  // NEU: Saved Transcription ID
  selectedUserName  // NEU: Selected User Name
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {/* Left Side: Action Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Admin Buttons - NUR für Admins sichtbar */}
          {isAdmin && (
            <>
              {/* Transcribe Button (lokal) */}
              <button
                onClick={onTranscribeLocal}
                disabled={isProcessing}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
                  ${isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                  }
                `}
                title="Transkribiere MP3 mit WSL2 Python"
              >
                <FaMicrophone />
                <span>Transcribe MP3</span>
              </button>
              
              {/* Summarize Button (lokal) */}
              <button
                onClick={onSummarizeLocal}
                disabled={isProcessing}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
                  ${isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                  }
                `}
                title="Erstelle Summary einer Transkription mit WSL2 Python"
              >
                <FaFileAlt />
                <span>Summarize</span>
              </button>
              
              {/* Transkription speichern Button - NUR für Admins */}
              {hasTranscription && onSmartSave && (
                <button
                  onClick={onSmartSave}
                  disabled={isProcessing || saveSuccess}
                  className={`
                    flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all
                    ${isProcessing || saveSuccess
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                    }
                  `}
                  title="Transkription in Datenbank speichern"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>💾 Transkription speichern</span>
                </button>
              )}
            </>
          )}
        </div>
        
        {/* Right Side: Reset & Edit Buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Reset Button - für ALLE User, only shown when audio or transcription is loaded */}
          {(hasAudio || hasTranscription) && (
            <button
              onClick={onReset}
              disabled={isProcessing}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
                ${isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
                }
              `}
              title="Aktuelle Dateien entladen und neue laden"
            >
              <FaRedo />
              <span>Neue Datei laden</span>
            </button>
          )}
          
          {/* Edit Mode Toggle - nur sichtbar wenn showEditButton true ist */}
          {showEditButton && (
            <button
              onClick={onToggleEdit}
              disabled={isProcessing}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all border-2
                ${isEditMode
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <FaEdit />
              <span>{isEditMode ? 'Edit-Modus: AN' : 'Edit-Modus: AUS'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Status Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${hasAudio ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-gray-600">
              Audio: {hasAudio ? 'Geladen' : 'Nicht geladen'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${hasTranscription ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-gray-600">
              Transkription: {hasTranscription ? 'Verfügbar' : 'Nicht verfügbar'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-gray-600">
              Status: {isProcessing ? 'Verarbeitung läuft' : 'Bereit'}
            </span>
          </div>
        </div>
        
        {/* Save Success Info - unter Status anzeigen */}
        {saveSuccess && savedTranscriptionId && selectedUserName && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">
                Gespeichert für: <span className="font-semibold">{selectedUserName}</span>
              </span>
              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                ID: {savedTranscriptionId}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ControlPanel;
