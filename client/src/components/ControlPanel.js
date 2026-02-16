// ============================================================================
// ControlPanel Component
// ============================================================================
// Control buttons for Transcribe, Summarize, and Edit Mode

import React from 'react';
import { FaMicrophone, FaFileAlt, FaEdit, FaSpinner, FaRedo, FaDesktop } from 'react-icons/fa';

function ControlPanel({
  onTranscribe,
  onSummarize,
  onTranscribeLocal,
  onSummarizeLocal,
  isProcessing,
  hasAudio,
  hasTranscription,
  isEditMode,
  showEditButton,
  onToggleEdit,
  onReset
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Transcribe Local Button - WSL2 Python */}
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
            title="Transkribiere lokale MP3 mit WSL2 Python"
          >
            <FaDesktop />
            <span>Transcribe MP3 (lokal)</span>
          </button>
          
          {/* Summarize Local Button - WSL2 Python */}
          <button
            onClick={onSummarizeLocal}
            disabled={isProcessing}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
              ${isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-600 text-white shadow-md hover:shadow-lg'
              }
            `}
            title="Erstelle Summary einer lokalen Transkription mit WSL2 Python"
          >
            <FaDesktop />
            <span>Summarize (lokal)</span>
          </button>
          
          {/* Transcribe Button - RunPod */}
          <button
            onClick={onTranscribe}
            disabled={!hasAudio || isProcessing}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
              ${!hasAudio || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg'
              }
            `}
            title="Transkribiere aktuelles MP3 mit RunPod"
          >
            {isProcessing ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Verarbeite...</span>
              </>
            ) : (
              <>
                <FaMicrophone />
                <span>Transcribe MP3</span>
              </>
            )}
          </button>
          
          {/* Summarize Button - RunPod */}
          <button
            onClick={onSummarize}
            disabled={!hasTranscription || isProcessing}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
              ${!hasTranscription || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
              }
            `}
            title="Erstelle Summary der aktuellen Transkription mit RunPod"
          >
            {isProcessing ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Verarbeite...</span>
              </>
            ) : (
              <>
                <FaFileAlt />
                <span>Summarize</span>
              </>
            )}
          </button>
          
          {/* Reset Button - only shown when audio or transcription is loaded */}
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
        </div>
        
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
      </div>
    </div>
  );
}

export default ControlPanel;
