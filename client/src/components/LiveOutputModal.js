import React, { useEffect, useRef } from 'react';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaTerminal } from 'react-icons/fa';

function LiveOutputModal({ isOpen, title, outputs, progress, isComplete, hasError, onClose }) {
  const outputEndRef = useRef(null);

  // Auto-scroll zu neuen Outputs
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs]);

  // Auto-Close nach erfolgreichem Abschluss
  useEffect(() => {
    if (isComplete && !hasError && onClose) {
      const timer = setTimeout(() => {
        console.log('✓ Auto-Close: Modal wird in 3 Sekunden geschlossen');
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isComplete, hasError, onClose]);

  if (!isOpen) return null;

  const getStatusIcon = () => {
    if (hasError) {
      return <FaTimesCircle className="text-red-500 text-3xl" />;
    }
    if (isComplete) {
      return <FaCheckCircle className="text-green-500 text-3xl" />;
    }
    return <FaSpinner className="text-primary-500 text-3xl animate-spin" />;
  };

  const getOutputColor = (step) => {
    // Verschiedene Farben für verschiedene Steps
    if (step === 'error') return 'text-red-600';
    if (step === 'warning') return 'text-yellow-600';
    if (step === 'complete') return 'text-green-600 font-semibold';
    if (step === 'init' || step === 'wsl' || step === 'config') return 'text-blue-600';
    return 'text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-[80vw] h-[70vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center space-x-3 text-white">
            <FaTerminal />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <div className="flex items-center space-x-4">
            {getStatusIcon()}
          </div>
        </div>

        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Fortschritt</span>
              <span className="text-sm font-semibold text-primary-600">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto bg-gray-900 p-6 font-mono text-base leading-relaxed">
          {outputs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              Warte auf Output...
            </div>
          ) : (
            <div className="space-y-1">
              {outputs.map((output, index) => (
                <div 
                  key={index} 
                  className={`${getOutputColor(output.step)} transition-colors duration-200`}
                >
                  <span className="text-gray-500 mr-2">[{output.timestamp}]</span>
                  <span className="text-gray-400 mr-2">{output.step}:</span>
                  <span className="text-gray-200">{output.message}</span>
                </div>
              ))}
              <div ref={outputEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isComplete ? (
                <span className="text-green-600 font-medium">✓ Abgeschlossen</span>
              ) : hasError ? (
                <span className="text-red-600 font-medium">✗ Fehler aufgetreten</span>
              ) : (
                <span className="flex items-center">
                  <FaSpinner className="animate-spin mr-2" />
                  Verarbeitung läuft...
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {outputs.length} Zeile{outputs.length !== 1 ? 'n' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveOutputModal;
