import React, { useState } from 'react';
import { FaDownload, FaTimes, FaFilePdf, FaFileAlt } from 'react-icons/fa';

// Metadaten-Zeilen die für normale User im Export ausgeblendet werden (identisch mit TranscriptView.js)
// Enthält auch Trennzeilen (═══) und Abschnitts-Titel die für User irrelevant sind
const HIDDEN_FOR_USERS_PREFIXES = [
  'Datum:', 'Start:', 'Ende:', 'Dauer:', 'Ratio:', 'Umbruch:', 'Modell:', 'Typ:',
  '═',                               // Trennzeilen (═══════...)
  'MP3-Transkription',               // Abschnitts-Titel
  'Zusammenfassung des Transkripts', // Abschnitts-Titel
];

/**
 * Filtert Metadaten-Zeilen aus dem Transkriptions-Text für normale User heraus.
 * Admins erhalten den vollständigen Text.
 */
function filterTranscriptionForUser(text, isAdmin) {
  if (isAdmin) return text;
  return text
    .split('\n')
    .filter(line => !HIDDEN_FOR_USERS_PREFIXES.some(prefix => line.trim().startsWith(prefix)))
    .join('\n');
}

/**
 * ExportModal – Dialog zum Exportieren einer Transkription als TXT oder PDF
 */
const ExportModal = ({ isOpen, onClose, transcription, filename, isAdmin }) => {
  const [format, setFormat] = useState('txt');

  if (!isOpen) return null;

  // Transkription ggf. für normale User filtern
  const exportText = filterTranscriptionForUser(transcription || '', isAdmin);

  // Basisname ohne Endung ableiten
  const baseName = filename
    ? filename.replace(/\.[^.]+$/, '')
    : 'transkription';

  // --- TXT-Export ---
  const exportAsTxt = () => {
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  // --- PDF-Export (via Druckdialog) ---
  const exportAsPdf = () => {
    // Formatiere den Transkriptionstext als HTML mit Zeilenumbrüchen
    const htmlContent = exportText
      .split('\n')
      .map(line => {
        const escaped = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        // Überschriften (Trennlinie + Titel) fett formatieren
        if (/^-{10,}/.test(line)) return `<hr class="separator"/>`;
        if (/^\s{0,4}\S/.test(line) && line.trim().length > 0) return `<p>${escaped}</p>`;
        return `<p class="empty">&nbsp;</p>`;
      })
      .join('');

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <title>${baseName}</title>
  <style>
    @page { margin: 2cm; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #222;
    }
    h1 {
      font-size: 14pt;
      margin-bottom: 4px;
    }
    .meta {
      font-size: 9pt;
      color: #666;
      margin-bottom: 20px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 8px;
    }
    p { margin: 0 0 4px 0; }
    p.empty { margin: 0; line-height: 0.6; }
    hr.separator {
      border: none;
      border-top: 1px solid #999;
      margin: 12px 0;
    }
  </style>
</head>
<body>
  <h1>${baseName}</h1>
  <div class="meta">Exportiert am ${new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })}</div>
  ${htmlContent}
  <script>
    window.onload = function() {
      window.print();
      // Fenster nach Print schließen (klappt nicht immer wegen Sicherheit)
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
    onClose();
  };

  // --- Hauptexport ---
  const handleExport = () => {
    if (format === 'txt') {
      exportAsTxt();
    } else {
      exportAsPdf();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FaDownload className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Transkription exportieren</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Schließen"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 mb-4">
            Wähle das Exportformat für die Transkription:
          </p>

          <div className="space-y-3">
            {/* TXT Option */}
            <label
              className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                format === 'txt'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="exportFormat"
                value="txt"
                checked={format === 'txt'}
                onChange={() => setFormat('txt')}
                className="text-blue-600"
              />
              <FaFileAlt className={format === 'txt' ? 'text-blue-600' : 'text-gray-400'} />
              <div>
                <div className="font-medium text-sm text-gray-800">Textdatei (.txt)</div>
                <div className="text-xs text-gray-500">Einfacher Text – wird direkt heruntergeladen</div>
              </div>
            </label>

            {/* PDF Option */}
            <label
              className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                format === 'pdf'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
                className="text-red-600"
              />
              <FaFilePdf className={format === 'pdf' ? 'text-red-600' : 'text-gray-400'} />
              <div>
                <div className="font-medium text-sm text-gray-800">PDF-Datei (.pdf)</div>
                <div className="text-xs text-gray-500">Druckdialog öffnen → "Als PDF speichern" wählen</div>
              </div>
            </label>
          </div>

          {/* Dateiname-Vorschau */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Dateiname:</div>
            <div className="text-sm font-mono text-gray-700">
              {baseName}.{format === 'txt' ? 'txt' : 'pdf'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleExport}
            disabled={!transcription}
            className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              transcription
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FaDownload className="text-xs" />
            <span>Exportieren</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
