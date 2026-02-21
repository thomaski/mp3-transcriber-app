// ============================================================================
// TranscriptView Component
// ============================================================================
// Displays transcription with clickable timestamps
// Supports Edit Mode with inline editing per timestamp

import React, { useRef, useEffect, useState } from 'react';
import { FaArrowUp } from 'react-icons/fa';
import logger from '../utils/logger';

// Metadaten-Zeilen die für normale User ausgeblendet werden (nur Admins sehen alle Details)
// Enthält auch Trennzeilen (═══) und Abschnitts-Titel die für User irrelevant sind
const HIDDEN_FOR_USERS_PREFIXES = [
  'Datum:', 'Start:', 'Ende:', 'Dauer:', 'Ratio:', 'Umbruch:', 'Modell:', 'Typ:',
  '═',                               // Trennzeilen (═══════...)
  'MP3-Transkription',               // Abschnitts-Titel
  'Zusammenfassung des Transkripts', // Abschnitts-Titel
];

function TranscriptView({ transcription, isEditMode, isAdmin, audioUrl, onTimestampClick, onTextChange, audioRef }) {
  const headerRefs = useRef({});
  const topRef = useRef(null);
  const containerRef = useRef(null);
  const [highlightedHeader, setHighlightedHeader] = useState(null);
  const [contentHeight, setContentHeight] = useState(600);
  const [currentTimestamp, setCurrentTimestamp] = useState(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(null);
  const timestampRefs = useRef({});
  const lastScrolledIndex = useRef(null);
  
  // Edit mode state: track which line is being edited
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [editingHeaderKey, setEditingHeaderKey] = useState(null);
  const [editedTexts, setEditedTexts] = useState({});
  const [editedHeaders, setEditedHeaders] = useState({});
  // Originaltexte zum Vergleich – wird beim Öffnen einer Zeile/Überschrift gesetzt
  const [originalLineTexts, setOriginalLineTexts] = useState({});
  const [originalHeaderTexts, setOriginalHeaderTexts] = useState({});
  const editInputRefs = useRef({});
  const headerInputRefs = useRef({});
  
  // Calculate dynamic height based on window size
  useEffect(() => {
    const calculateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const availableHeight = windowHeight - rect.top - 150;
        const newHeight = Math.max(400, Math.min(availableHeight, 800));
        setContentHeight(newHeight);
      }
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    
    return () => {
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);
  
  // Track current timestamp based on audio playback
  useEffect(() => {
    const audio = audioRef?.current;

    if (!audio || !transcription) {
      return;
    }

    // lastScrolledIndex zurücksetzen wenn neue Transkription oder neues Audio geladen wird
    lastScrolledIndex.current = null;
    
    const updateCurrentTimestamp = () => {
      const currentTime = audio.currentTime;
      
      // WICHTIG: Gleiche Normalisierung wie in renderTranscription damit Indizes übereinstimmen
      let lines = transcription.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const lineCounts = new Map();
      const skipIndices = new Set();
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed && line.match(/^\[(\d{2}:\d{2}:\d{2})\]/)) {
          if (lineCounts.has(trimmed)) {
            skipIndices.add(lineCounts.get(trimmed));
          }
          lineCounts.set(trimmed, index);
        }
      });
      
      lines = lines.filter((line, index) => !skipIndices.has(index));

      // Gleicher User-Filter wie in renderTranscription – damit Indizes für alle Usertypen übereinstimmen
      if (!isAdmin) {
        lines = lines.filter(line => {
          const trimmed = line.trim();
          return !HIDDEN_FOR_USERS_PREFIXES.some(prefix => trimmed.startsWith(prefix));
        });
      }
      
      let closestTimestamp = null;
      let closestTime = -1;
      let closestLineIndex = null;
      
      lines.forEach((line, idx) => {
        const match = line.match(/^\[(\d{2}):(\d{2}):(\d{2})\]/);
        if (match) {
          const hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const seconds = parseInt(match[3], 10);
          const timestamp = hours * 3600 + minutes * 60 + seconds;
          
          if (timestamp <= currentTime && timestamp > closestTime) {
            closestTime = timestamp;
            closestTimestamp = match[0];
            closestLineIndex = idx;
          }
        }
      });
      
      setCurrentTimestamp(closestTimestamp);
      setCurrentLineIndex(closestLineIndex);
      
      // Auto-scroll to current timestamp (only if changed)
      if (closestLineIndex !== null && closestLineIndex !== lastScrolledIndex.current) {
        lastScrolledIndex.current = closestLineIndex;
        
        setTimeout(() => {
          const elementKey = `${closestTimestamp}-${closestLineIndex}`;
          const element = timestampRefs.current[elementKey];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    };
    
    updateCurrentTimestamp();
    
    // Wenn Audio endet: View sanft zum Anfang scrollen
    // KEIN Reset von lastScrolledIndex – sonst Race Condition mit updateCurrentTimestamp
    const handleAudioEnd = () => {
      setTimeout(() => {
        if (topRef.current) {
          topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    };
    
    audio.addEventListener('timeupdate', updateCurrentTimestamp);
    audio.addEventListener('seeked', updateCurrentTimestamp);
    audio.addEventListener('play', updateCurrentTimestamp);
    audio.addEventListener('ended', handleAudioEnd);
    
    return () => {
      audio.removeEventListener('timeupdate', updateCurrentTimestamp);
      audio.removeEventListener('seeked', updateCurrentTimestamp);
      audio.removeEventListener('play', updateCurrentTimestamp);
      audio.removeEventListener('ended', handleAudioEnd);
    };
  }, [audioRef, transcription, isAdmin, audioUrl]);
  
  // Scroll to header in transcription
  // Verwendet data-header-key Attribute statt Refs, da Refs bei häufigen Re-Renders (timeupdate) kurz null werden können
  const scrollToHeader = (summaryText) => {
    if (audioRef && audioRef.current) {
      audioRef.current.pause();
    }
    
    const headerKey = summaryText.trim();
    logger.log('[TranscriptView] 🔍 scrollToHeader aufgerufen für:', headerKey.substring(0, 50));
    
    // Suche per data-Attribut - kein CSS.escape() da das für CSS-Identifier ist, nicht Attributwerte
    const allHeaderElements = Array.from(document.querySelectorAll('[data-header-key]'));
    const headerElement = allHeaderElements.find(el => el.getAttribute('data-header-key') === headerKey) || null;
    
    logger.log('[TranscriptView] 🔍 Header-Elemente:', allHeaderElements.length, '| gefunden:', !!headerElement);
    
    if (headerElement) {
      headerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedHeader(headerKey);
      
      setTimeout(() => {
        setHighlightedHeader(null);
      }, 3000);
    } else {
      logger.warn('[TranscriptView] ⚠️ Header-Element nicht gefunden für Key:', headerKey.substring(0, 50));
    }
  };
  
  // Scroll to top (Gesamtzusammenfassung)
  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  // Handle line click in edit mode
  // continuations: Array von { text, index } – alle Folgezeilen bis zum nächsten Timestamp/Header
  const handleLineClick = (index, currentText, timestamp, continuations = []) => {
    if (!isEditMode) return;
    
    // Save current edit before switching
    if (editingLineIndex !== null && editingLineIndex !== index) {
      saveCurrentEdit();
    }
    
    // Clear header editing if active
    if (editingHeaderKey !== null) {
      saveCurrentHeaderEdit();
    }
    
    // Set new editing line
    setEditingLineIndex(index);
    
    // Store current text and timestamp if not already stored
    if (!editedTexts[index]) {
      // Kombinierten Text aufbauen: Hauptzeile + Continuation-Zeilen (abschließende Leerzeilen entfernen)
      const contTexts = continuations.map(c => c.text);
      while (contTexts.length > 0 && !contTexts[contTexts.length - 1].trim()) {
        contTexts.pop();
      }
      const combinedText = contTexts.length > 0
        ? [currentText, ...contTexts].join('\n')
        : currentText;
      
      setEditedTexts(prev => ({ ...prev, [index]: { text: combinedText, timestamp } }));
      // Originaltext merken um am Ende prüfen zu können ob tatsächlich etwas geändert wurde
      setOriginalLineTexts(prev => ({ ...prev, [index]: combinedText }));
    }
    
    // Focus und Auto-Resize nach kurzer Verzögerung (DOM muss gerendert sein)
    setTimeout(() => {
      const input = editInputRefs.current[index];
      if (input) {
        input.focus();
        autoResizeTextarea(input);
      }
    }, 50);
  };
  
  // Handle header click in edit mode
  const handleHeaderClick = (headerKey, currentHeaderText) => {
    if (!isEditMode) return;
    
    // Save current line edit before switching
    if (editingLineIndex !== null) {
      saveCurrentEdit();
    }
    
    // Save current header edit before switching
    if (editingHeaderKey !== null && editingHeaderKey !== headerKey) {
      saveCurrentHeaderEdit();
    }
    
    // Set new editing header
    setEditingHeaderKey(headerKey);
    
    // Store current header text if not already stored
    if (!editedHeaders[headerKey]) {
      setEditedHeaders(prev => ({ ...prev, [headerKey]: currentHeaderText }));
      // Originaltext merken um am Ende prüfen zu können ob tatsächlich etwas geändert wurde
      setOriginalHeaderTexts(prev => ({ ...prev, [headerKey]: currentHeaderText }));
    }
    
    // Focus the input after a short delay
    setTimeout(() => {
      const input = headerInputRefs.current[headerKey];
      if (input) {
        input.focus();
      }
    }, 10);
  };
  
  // Textarea automatisch auf Inhaltshöhe skalieren (kein Scrollbar, keine feste Zeilenanzahl)
  const autoResizeTextarea = (el) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd58e5fa-c5ab-4769-86c6-273c6f726f5b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptView.js:autoResizeTextarea',message:'called',data:{elFound:!!el,currentHeight:el?.style?.height,offsetHeight:el?.offsetHeight,scrollHeight:el?.scrollHeight},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (!el) return;
    el.style.height = '0px'; // Auf 0 setzen damit scrollHeight den vollen Inhalt misst
    const newHeight = el.scrollHeight;
    el.style.height = newHeight + 'px';
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd58e5fa-c5ab-4769-86c6-273c6f726f5b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptView.js:autoResizeTextarea',message:'after resize',data:{scrollHeight:newHeight,appliedHeight:el.style.height},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
  };

  // Handle text change in edit input
  const handleEditTextChange = (index, newText) => {
    setEditedTexts(prev => ({
      ...prev,
      [index]: { ...prev[index], text: newText }
    }));
    // Textarea nach Textänderung neu skalieren
    const el = editInputRefs.current[index];
    if (el) autoResizeTextarea(el);
  };
  
  // Handle header text change
  const handleEditHeaderChange = (headerKey, newText) => {
    setEditedHeaders(prev => ({ ...prev, [headerKey]: newText }));
  };
  
  // Save current edit and update transcription
  // Speichert die Hauptzeile UND alle Continuation-Zeilen (da die Textarea alle enthält)
  const saveCurrentEdit = () => {
    if (editingLineIndex === null) return;
    
    const editedData = editedTexts[editingLineIndex];
    if (!editedData) return;
    
    const { text: editedText, timestamp } = editedData;
    if (editedText === undefined) return;
    
    // Direkter Vergleich mit dem gespeicherten Originaltext (keine String-Rekonstruktion nötig)
    const originalText = originalLineTexts[editingLineIndex];
    if (originalText !== undefined && editedText === originalText) {
      logger.log(`ℹ Text unverändert für [${timestamp}] – kein Speichern nötig`);
      setEditingLineIndex(null);
      return;
    }
    
    // Editierten Text in Hauptzeile + Continuation-Zeilen aufteilen
    const editedLines = editedText.split('\n');
    const newMainText = editedLines[0];
    const newContinuations = editedLines.slice(1);
    
    const fullTimestamp = `[${timestamp}]`;
    const rawLines = transcription.replace(/\r\n/g, '\n').split('\n');
    
    // Timestamp-Zeile in der Original-Transkription finden
    let foundIndex = -1;
    let headerPassed = false;
    
    for (let i = 0; i < rawLines.length; i++) {
      if (rawLines[i].includes('Gesamtzusammenfassung:') || rawLines[i].match(/^={3,}/)) {
        headerPassed = true;
      }
      if (headerPassed && rawLines[i].startsWith(fullTimestamp)) {
        foundIndex = i;
        break;
      }
    }
    
    if (foundIndex === -1) {
      logger.warn(`⚠ Timestamp ${fullTimestamp} nicht gefunden in Originaltext`);
      setEditingLineIndex(null);
      return;
    }
    
    // Anzahl der bestehenden Continuation-Zeilen zählen (bis zum nächsten Timestamp/Header/Separator)
    let existingContCount = 0;
    let k = foundIndex + 1;
    while (k < rawLines.length) {
      const nextLine = rawLines[k];
      if (nextLine.match(/^\[(\d{2}:\d{2}:\d{2})\]/) ||
          nextLine.match(/^-{10,}/) ||
          nextLine.startsWith('═')) {
        break;
      }
      existingContCount++;
      k++;
    }
    
    // Timestamp-Zeile aktualisieren und Continuation-Zeilen ersetzen
    const newRawLines = [...rawLines];
    newRawLines[foundIndex] = `${fullTimestamp} ${newMainText}`;
    newRawLines.splice(foundIndex + 1, existingContCount, ...newContinuations);
    
    onTextChange(newRawLines.join('\n'));
    logger.log(`✓ Block gespeichert: ${fullTimestamp} (${newContinuations.length} Folgezeilen)`);
    
    setEditingLineIndex(null);
  };
  
  // Save current header edit
  const saveCurrentHeaderEdit = () => {
    if (editingHeaderKey === null) return;
    
    const editedHeaderText = editedHeaders[editingHeaderKey];
    if (editedHeaderText === undefined) return;
    
    // Direkter Vergleich mit dem gespeicherten Originaltext
    const originalHeaderText = originalHeaderTexts[editingHeaderKey];
    if (originalHeaderText !== undefined && editedHeaderText === originalHeaderText) {
      logger.log(`ℹ Überschrift unverändert – kein Speichern nötig`);
      setEditingHeaderKey(null);
      return;
    }
    
    // Find and update the header line in the original transcription
    const lines = transcription.split('\n');
    const searchPattern = `---------- ${editingHeaderKey}`;
    
    let foundIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchPattern)) {
        foundIndex = i;
        break;
      }
    }
    
    if (foundIndex !== -1) {
      lines[foundIndex] = `---------- ${editedHeaderText}`;
      onTextChange(lines.join('\n'));
      logger.log(`✓ Überschrift geändert und gespeichert: "${editingHeaderKey}" → "${editedHeaderText}"`);
      
      // Update the header key in refs
      const oldRef = headerRefs.current[editingHeaderKey];
      delete headerRefs.current[editingHeaderKey];
      headerRefs.current[editedHeaderText] = oldRef;
    } else {
      logger.warn(`⚠ Überschrift "${editingHeaderKey}" nicht gefunden`);
    }
    
    setEditingHeaderKey(null);
  };
  
  // Handle blur event (when input loses focus)
  const handleBlur = () => {
    saveCurrentEdit();
  };
  
  // Handle blur event for headers
  const handleHeaderBlur = () => {
    saveCurrentHeaderEdit();
  };
  
  // Handle key press (Ctrl+Enter = speichern, Escape = abbrechen, Enter = neue Zeile)
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveCurrentEdit();
    } else if (e.key === 'Escape') {
      // Cancel edit - restore original text
      const newTexts = { ...editedTexts };
      delete newTexts[index];
      setEditedTexts(newTexts);
      setEditingLineIndex(null);
    }
    // Enter ohne Modifier: normaler Zeilenumbruch im Textarea
  };
  
  // Handle key press for headers
  const handleHeaderKeyDown = (e, headerKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCurrentHeaderEdit();
    } else if (e.key === 'Escape') {
      // Cancel edit - restore original text
      const newHeaders = { ...editedHeaders };
      delete newHeaders[headerKey];
      setEditedHeaders(newHeaders);
      setEditingHeaderKey(null);
    }
  };
  
  // Parse transcription and add timestamp click handlers
  const renderTranscription = () => {
    if (!transcription) return null;
    
    // WICHTIG: Windows CRLF (\r\n) normalisieren - \r am Zeilenende verhindert Regex-Matching mit $
    // Denn in JS matcht '.' kein \r und '$' ohne /m-Flag matcht nicht vor \r am Zeilenende
    let lines = transcription.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    
    // Remove duplicate timestamp lines
    const lineCounts = new Map();
    const skipIndices = new Set();
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && line.match(/^\[(\d{2}:\d{2}:\d{2})\]/)) {
        if (lineCounts.has(trimmed)) {
          skipIndices.add(lineCounts.get(trimmed));
        }
        lineCounts.set(trimmed, index);
      }
    });
    
    lines = lines.filter((line, index) => !skipIndices.has(index));

    // Für normale User (keine Admins) Detail-Metadaten-Zeilen ausblenden
    if (!isAdmin) {
      lines = lines.filter(line => {
        const trimmed = line.trim();
        return !HIDDEN_FOR_USERS_PREFIXES.some(prefix => trimmed.startsWith(prefix));
      });
    }
    
    let inSummarySection = false;
    
    // Grouping-Ansatz: Timestamp-Zeilen werden mit ihren Fortsetzungszeilen
    // in EINEM flex-Container gerendert → garantiert exakte Ausrichtung ohne Pixel-Rechnung
    const elements = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const index = i;
      
      // Detect "Gesamtzusammenfassung:" section
      if (line.trim() === 'Gesamtzusammenfassung:') {
        inSummarySection = true;
        elements.push(
          <div key={index} ref={topRef} className="mb-2 text-gray-700 font-semibold">
            {line}
          </div>
        );
        i++;
        continue;
      }
      
      // Check if we're leaving the summary section
      if (inSummarySection && (line.startsWith('----------') || line.startsWith('═'))) {
        inSummarySection = false;
      }
      
      // Render clickable summary lines
      if (inSummarySection && line.trim() && !line.startsWith('═')) {
        elements.push(
          <div 
            key={index} 
            role="button"
            aria-label={`Zur Überschrift springen: ${line.trim().substring(0, 50)}`}
            className="mb-2 text-blue-600 hover:text-blue-800 cursor-pointer hover:underline leading-relaxed"
            onClick={() => scrollToHeader(line.trim())}
            title="Zur Überschrift springen"
          >
            {line}
          </div>
        );
        i++;
        continue;
      }
      
      // Check for separator with header
      const headerMatch = line.match(/^-{10,}\s+(.+)$/);
      if (headerMatch) {
        const headerText = headerMatch[1].trim();
        const isHighlighted = highlightedHeader === headerText;
        const isEditingHeader = isEditMode && editingHeaderKey === headerText;
        const displayHeaderText = editedHeaders[headerText] !== undefined ? editedHeaders[headerText] : headerText;
        
        elements.push(
          <div 
            key={index} 
            ref={(el) => headerRefs.current[headerText] = el}
            data-header-key={headerText}
            className={`my-4 py-2 px-3 font-mono text-sm border-l-4 transition-all duration-300 ${
              isHighlighted 
                ? 'bg-yellow-100 border-yellow-500 text-gray-900' 
                : 'bg-gray-50 border-gray-300 text-gray-700'
            } ${isEditMode ? 'cursor-pointer hover:bg-gray-100' : ''}`}
            onClick={() => handleHeaderClick(headerText, headerText)}
          >
            <div className="flex items-start">
              <span className="text-gray-400 flex-shrink-0">──────────</span>
              <div className="ml-1 flex-1 min-w-0">
                {isEditingHeader ? (
                  <input
                    ref={(el) => headerInputRefs.current[headerText] = el}
                    type="text"
                    value={displayHeaderText}
                    onChange={(e) => handleEditHeaderChange(headerText, e.target.value)}
                    onBlur={handleHeaderBlur}
                    onKeyDown={(e) => handleHeaderKeyDown(e, headerText)}
                    className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="font-semibold">{displayHeaderText}</span>
                )}
              </div>
            </div>
          </div>
        );
        i++;
        continue;
      }
      
      // Check if line contains timestamp
      const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
      
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        const fullTimestamp = `[${timestamp}]`;
        const text = line.substring(timestampMatch[0].length).trim();
        const isCurrentTimestamp = currentTimestamp === fullTimestamp && currentLineIndex === index;
        const isEditing = isEditMode && editingLineIndex === index;
        const displayText = editedTexts[index]?.text !== undefined ? editedTexts[index].text : text;
        
        // Fortsetzungszeilen: ALLE Zeilen bis zum nächsten Timestamp/Überschrift/Separator sammeln.
        // Leerzeilen NICHT als Abbruch – sie sind visuelle Trenner innerhalb desselben Blocks.
        const continuations = [];
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine.match(/^\[(\d{2}:\d{2}:\d{2})\]/) ||
              nextLine.match(/^-{10,}\s+.+$/) ||
              nextLine.startsWith('═')) {
            break;
          }
          continuations.push({ text: nextLine, index: j });
          j++;
        }
        // Abschließende Leerzeilen aus dem Block entfernen (gehören visuell zum nächsten Element)
        while (continuations.length > 0 && !continuations[continuations.length - 1].text.trim()) {
          continuations.pop();
          j--;
        }
        
        elements.push(
          <div 
            key={index} 
            ref={(el) => timestampRefs.current[`${fullTimestamp}-${index}`] = el}
            className={`flex items-start mb-2 group transition-all duration-300 rounded-lg ${
              isCurrentTimestamp ? 'bg-blue-50 border-l-4 border-blue-400 -ml-1' : ''
            } ${isEditMode ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => handleLineClick(index, text, timestamp, continuations)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTimestampClick(timestamp);
              }}
              className={`timestamp flex-shrink-0 mr-3 py-0.5 px-2 rounded transition-colors ${
                isCurrentTimestamp 
                  ? 'bg-blue-200 text-blue-900 font-semibold' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}
              title="Springe zu dieser Position"
            >
              [{timestamp}]
            </button>
            
            {isEditing ? (
              // Edit-Modus: Textarea enthält Hauptzeile + alle Continuation-Zeilen (via \n getrennt)
              // Strg+Enter = Speichern, Enter = neue Zeile, Escape = Abbrechen
              <textarea
                ref={(el) => {
                  editInputRefs.current[index] = el;
                  if (el) autoResizeTextarea(el);
                }}
                value={displayText}
                rows={1}
                onChange={(e) => {
                  handleEditTextChange(index, e.target.value);
                  autoResizeTextarea(e.target);
                }}
                onBlur={handleBlur}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="flex-1 w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed resize-none overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                title="Strg+Enter zum Speichern, Escape zum Abbrechen"
              />
            ) : (
              // Read-only: Hauptzeile + Continuation-Zeilen getrennt anzeigen
              <div className="flex-1 min-w-0">
                <span className={`leading-relaxed ${
                  isCurrentTimestamp ? 'text-gray-900 font-medium' : 'text-gray-800'
                } ${isEditMode ? 'hover:text-blue-600' : ''}`}>
                  {text}
                </span>
                {/* Fortsetzungszeilen im selben flex-1 Container → exakt gleiche Einrückung.
                    Leerzeilen werden als visueller Abstandhalter gerendert. */}
                {continuations.map(({ text: contText, index: contIndex }) => (
                  <div key={contIndex} className="text-gray-700 leading-relaxed">
                    {contText || <br />}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
        i = j; // Verarbeitete Fortsetzungszeilen überspringen
        continue;
      }
      
      // Header or separator lines
      if (line.startsWith('═')) {
        elements.push(
          <div key={index} className="text-gray-400 my-2 font-mono text-sm">
            {line}
          </div>
        );
        i++;
        continue;
      }
      
      // Normal text (eigenständige Zeilen ohne Timestamp-Kontext)
      elements.push(
        <div key={index} className="mb-1 text-gray-700">
          {line || <br />}
        </div>
      );
      i++;
    }
    
    return elements;
  };
  
  return (
    <div className="relative">
      {/* Main Transcription Container */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden" ref={containerRef}>
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Transkription</h2>
            {isEditMode && (
              <span className="text-sm text-yellow-600 font-medium">
                ✏️ Bearbeitungsmodus - Klicke auf eine Zeile zum Bearbeiten
              </span>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div 
          className="p-6 overflow-y-auto relative"
          style={{ maxHeight: `${contentHeight}px` }}
        >
          <div className="prose max-w-none">
            <div className="font-mono text-sm leading-relaxed">
              {renderTranscription()}
            </div>
          </div>
        </div>
        
        {/* Info Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 Tipps: 
            <br />
            • Klicke auf <span className="font-mono">[HH:MM:SS]</span> Timestamps, um zur entsprechenden Stelle im Audio zu springen.
            {transcription.includes('Gesamtzusammenfassung:') && (
              <>
                <br />
                • Klicke auf Überschriften in der <span className="font-semibold">Gesamtzusammenfassung</span>, um zum entsprechenden Abschnitt zu springen.
                <br />
                • Nutze den <span className="font-semibold">↑ Zur Zusammenfassung</span> Button rechts, um zurück nach oben zu springen.
              </>
            )}
            {isEditMode && (
              <>
                <br />
                • Klicke auf eine Zeile zum Bearbeiten. Das Textfeld zeigt alle Zeilen des Timestamps. Drücke <kbd className="px-1 py-0.5 bg-gray-200 rounded">Strg+Enter</kbd> zum Speichern, <kbd className="px-1 py-0.5 bg-gray-200 rounded">Enter</kbd> für neue Zeile oder <kbd className="px-1 py-0.5 bg-gray-200 rounded">Esc</kbd> zum Abbrechen.
              </>
            )}
          </p>
        </div>
      </div>
      
      {/* Floating "Zur Zusammenfassung" Button - rechts außerhalb, mittig mit Tipps-Block */}
      {transcription.includes('Gesamtzusammenfassung:') && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-3 -right-4 transform translate-x-full flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all z-10"
          title="Zurück zur Gesamtzusammenfassung"
        >
          <FaArrowUp />
          <span className="text-sm font-medium">Zur Zusammenfassung</span>
        </button>
      )}
    </div>
  );
}

export default TranscriptView;
