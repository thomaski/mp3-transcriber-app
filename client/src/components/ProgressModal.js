// ============================================================================
// ProgressModal Component
// ============================================================================
// Modal displaying progress during transcription/summarization

import React from 'react';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';

function ProgressModal({ step, message, progress }) {
  const getStepIcon = () => {
    if (progress === 100) {
      return <FaCheckCircle className="text-green-500 text-4xl" />;
    }
    return <FaSpinner className="text-primary-500 text-4xl animate-spin" />;
  };
  
  const getStepLabel = (stepName) => {
    const labels = {
      upload: 'Upload',
      processing: 'Verarbeitung',
      formatting: 'Formatierung',
      split: 'Vorbereitung',
      summarize: 'Zusammenfassung',
      saving: 'Speichern',
      complete: 'Abgeschlossen'
    };
    return labels[stepName] || stepName;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {getStepIcon()}
        </div>
        
        {/* Step Label */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {getStepLabel(step)}
          </h3>
        </div>
        
        {/* Message */}
        <div className="text-center mb-6">
          <p className="text-gray-600">
            {message || 'Bitte warten...'}
          </p>
        </div>
        
        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center mt-2 text-sm text-gray-500">
              {progress}%
            </div>
          </div>
        )}
        
        {/* Animated dots for indeterminate progress */}
        {!progress && (
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        
        {/* Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Dieser Vorgang kann einige Minuten dauern
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProgressModal;
