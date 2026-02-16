// ============================================================================
// Main App Component
// ============================================================================
// MP3 Transcriber App - Main Container

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AudioPlayer from './components/AudioPlayer';
import TranscriptView from './components/TranscriptView';
import ControlPanel from './components/ControlPanel';
import DropZone from './components/DropZone';
import TextDropZone from './components/TextDropZone';
import ProgressModal from './components/ProgressModal';
import FileSelectionModal from './components/FileSelectionModal';
import LiveOutputModal from './components/LiveOutputModal';
import { uploadFile, transcribeAudio, summarizeText, loadLocalFile, transcribeLocal, summarizeLocal } from './services/api';
import { parseUrlParams, parseTimestamp } from './utils/helpers';

// Default file paths (wenn keine URL-Parameter angegeben sind)
const DEFAULT_MP3_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1.mp3';
const DEFAULT_TEXT_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1_s.txt';

function App() {
  // State management
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditButton, setShowEditButton] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ step: '', message: '', progress: 0 });
  const [error, setError] = useState(null);
  
  // WSL2 Local Processing State
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileModalType, setFileModalType] = useState('mp3'); // 'mp3' or 'txt'
  const [showLiveOutput, setShowLiveOutput] = useState(false);
  const [liveOutputs, setLiveOutputs] = useState([]);
  const [liveProgress, setLiveProgress] = useState(0);
  const [liveTitle, setLiveTitle] = useState('');
  const [isLiveComplete, setIsLiveComplete] = useState(false);
  const [hasLiveError, setHasLiveError] = useState(false);
  
  // Refs
  const audioRef = useRef(null);
  const socketRef = useRef(null);
  
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+E: Toggle Edit Button Visibility & Edit Mode
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setShowEditButton(prev => !prev);
        setIsEditMode(prev => !prev);
        console.log(`✓ Edit-Button ${!showEditButton ? 'sichtbar' : 'versteckt'} (Ctrl+E)`);
      }
      
      // Esc: Hide Edit Button & Exit Edit Mode
      if (e.key === 'Escape') {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable
        );
        
        // Only hide if no input is focused
        if (!isInputFocused && (isEditMode || showEditButton)) {
          e.preventDefault();
          setShowEditButton(false);
          setIsEditMode(false);
          console.log('✓ Edit-Button versteckt & Edit-Modus beendet (Esc)');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditMode, showEditButton]);
  
  // Initialize socket connection
  useEffect(() => {
    // Dynamische Backend-URL: Im Dev-Modus über Proxy, sonst explizite URL
    const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.protocol + '//' + window.location.hostname + ':5000';
    
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('✓ Connected to server:', socket.id, 'URL:', backendUrl);
    });
    
    socket.on('disconnect', () => {
      console.log('✗ Disconnected from server');
    });
    
    // Listen to transcription progress
    socket.on('transcribe:progress', (data) => {
      setProgress(data);
    });
    
    socket.on('transcribe:complete', (data) => {
      setTranscription(data.transcription);
      setIsProcessing(false);
      setProgress({ step: '', message: '', progress: 100 });
    });
    
    socket.on('transcribe:error', (data) => {
      setError(data.error);
      setIsProcessing(false);
    });
    
    // Listen to summarization progress
    socket.on('summarize:progress', (data) => {
      setProgress(data);
    });
    
    socket.on('summarize:complete', (data) => {
      setTranscription(data.summary);
      setIsProcessing(false);
      setProgress({ step: '', message: '', progress: 100 });
    });
    
    socket.on('summarize:error', (data) => {
      setError(data.error);
      setIsProcessing(false);
    });
    
    // Listen to local transcription progress (WSL2)
    socket.on('transcribe:progress', (data) => {
      const timestamp = new Date().toLocaleTimeString();
      setLiveOutputs(prev => [...prev, { 
        ...data, 
        timestamp 
      }]);
      setLiveProgress(data.progress || 0);
      
      if (data.step === 'error') {
        setHasLiveError(true);
      }
      if (data.step === 'complete') {
        setIsLiveComplete(true);
      }
    });
    
    // Listen to transcription result (WSL2)
    socket.on('transcribe:result', (data) => {
      console.log('✓ Transkription empfangen via Socket:', data.filename);
      setTranscription(data.transcription);
      setIsProcessing(false);
      
      // MP3 im Player laden
      if (data.mp3Filename) {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
        const mp3StreamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(`D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio\\${data.mp3Filename}`)}`;
        setAudioUrl(mp3StreamUrl);
        setAudioFile({ name: data.mp3Filename });
        console.log(`✓ MP3 im Player geladen: ${data.mp3Filename}`);
      }
    });
    
    // Listen to local summarization progress (WSL2)
    socket.on('summarize:progress', (data) => {
      const timestamp = new Date().toLocaleTimeString();
      setLiveOutputs(prev => [...prev, { 
        ...data, 
        timestamp 
      }]);
      setLiveProgress(data.progress || 0);
      
      if (data.step === 'error') {
        setHasLiveError(true);
      }
      if (data.step === 'complete') {
        setIsLiveComplete(true);
      }
    });
    
    // Listen to summarization result (WSL2)
    socket.on('summarize:result', (data) => {
      console.log('✓ Zusammenfassung empfangen via Socket:', data.filename);
      setTranscription(data.transcription);
      setIsProcessing(false);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);
  
  // Parse URL parameters on mount
  useEffect(() => {
    const loadDefaultFiles = async () => {
      const params = parseUrlParams();
      
      // Check for edit mode
      if (params.edit === 'true') {
        setIsEditMode(true);
        setShowEditButton(true);
      }
      
      let mp3Loaded = false;
      let textLoaded = false;
      let mp3Path = null;
      
      // Check for MP3 URL parameter
      if (params.mp3) {
        console.log('✓ MP3-Parameter gefunden:', params.mp3);
        mp3Path = params.mp3;
        
        try {
          // Versuche MP3 lokal zu laden
          console.log('→ Lade MP3 über Backend API...');
          const mp3Result = await loadLocalFile(params.mp3, 'mp3');
          console.log('← Backend-Antwort:', mp3Result);
          
          if (mp3Result.success) {
            const filename = params.mp3.split(/[\\/]/).pop();
            setAudioFile({ 
              name: filename, 
              path: mp3Result.file.path,
              url: mp3Result.file.url 
            });
            setAudioUrl(mp3Result.file.url);
            console.log('✓ MP3-Datei aus Parameter geladen:', filename);
            mp3Loaded = true;
          } else {
            console.error('❌ Backend konnte MP3 nicht laden:', mp3Result.error || 'Unbekannter Fehler');
          }
        } catch (err) {
          console.error('❌ Fehler beim Laden der MP3 aus Parameter:', err);
        }
      }
      
      // Check for text URL parameter
      if (params.text) {
        console.log('✓ Text-Parameter gefunden:', params.text);
        try {
          console.log('→ Lade Text über Backend API...');
          const textResult = await loadLocalFile(params.text, 'txt');
          console.log('← Backend-Antwort:', textResult);
          
          if (textResult.success) {
            setTranscription(textResult.content);
            console.log('✓ Text-Datei aus Parameter geladen:', params.text);
            textLoaded = true;
          } else {
            console.error('❌ Backend konnte Text nicht laden:', textResult.error || 'Unbekannter Fehler');
          }
        } catch (err) {
          console.error('❌ Fehler beim Laden des Texts aus Parameter:', err);
        }
      }
      
      // Wenn MP3 geladen wurde aber kein Text-Parameter, versuche automatisch {filename}_s.txt zu laden
      if (mp3Loaded && !params.text && mp3Path) {
        const basePath = mp3Path.replace(/\.mp3$/i, '');
        const transcriptionPath = `${basePath}_s.txt`;
        
        console.log(`✓ Versuche automatisch Transkription zu laden: ${transcriptionPath}`);
        
        try {
          const textResult = await loadLocalFile(transcriptionPath, 'txt');
          if (textResult.success) {
            setTranscription(textResult.content);
            console.log('✓ Transkriptionsdatei automatisch geladen:', transcriptionPath);
            textLoaded = true;
          } else {
            console.log('⚠ Keine Transkriptionsdatei gefunden:', transcriptionPath);
          }
        } catch (err) {
          console.log('⚠ Keine Transkriptionsdatei gefunden:', transcriptionPath, err.message);
        }
      }
      
      // Wenn keine URL-Parameter vorhanden sind, lade Standard-Dateien
      if (!params.mp3 && !params.text) {
        console.log('Keine URL-Parameter gefunden, lade Standard-Dateien...');
        
        // Versuche MP3-Datei zu laden
        try {
          const mp3Result = await loadLocalFile(DEFAULT_MP3_PATH, 'mp3');
          if (mp3Result.success) {
            // Extrahiere den Dateinamen aus dem Pfad
            const filename = DEFAULT_MP3_PATH.split('\\').pop();
            setAudioFile({ 
              name: filename, 
              path: mp3Result.file.path,
              url: mp3Result.file.url 
            });
            setAudioUrl(mp3Result.file.url); // Backend gibt Stream-URL zurück
            console.log('✓ Standard-MP3-Datei geladen:', mp3Result.file.path);
            console.log('  Dateiname:', filename);
            console.log('  Stream-URL:', mp3Result.file.url);
          }
        } catch (err) {
          console.log('Standard-MP3-Datei nicht gefunden:', DEFAULT_MP3_PATH);
        }
        
        // Versuche Text-Datei zu laden
        try {
          const textResult = await loadLocalFile(DEFAULT_TEXT_PATH, 'txt');
          if (textResult.success) {
            setTranscription(textResult.content);
            console.log('✓ Standard-Text-Datei geladen:', textResult.path);
          }
        } catch (err) {
          console.log('Standard-Text-Datei nicht gefunden:', DEFAULT_TEXT_PATH);
        }
      }
      
      // URL-Parameter aus Browser-URL entfernen (nachdem Dateien geladen wurden)
      if (Object.keys(params).length > 0) {
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('✓ URL-Parameter aus Browser-URL entfernt');
      }
    };
    
    loadDefaultFiles();
  }, []);
  
  // Handle file drop (MP3 only)
  const handleFileDrop = async (files) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const fileType = file.name.split('.').pop().toLowerCase();
    
    try {
      setError(null);
      
      if (fileType === 'mp3') {
        // Handle MP3 file
        setIsProcessing(true);
        setProgress({ step: 'upload', message: 'Lade Datei hoch...', progress: 0 });
        
        const uploadResult = await uploadFile(file);
        
        // Stelle sicher, dass der Original-Dateiname gespeichert wird
        setAudioFile({
          ...uploadResult.file,
          name: file.name, // Original-Dateiname aus dem File-Objekt
          isUploaded: true // Markiere als hochgeladene Datei (nicht lokal in WSL)
        });
        setAudioUrl(uploadResult.file.url);
        
        console.log('✓ MP3 hochgeladen:', file.name);
        
        setIsProcessing(false);
        setProgress({ step: '', message: '', progress: 0 });
      } else {
        setError('Nur MP3-Dateien werden hier unterstützt');
      }
    } catch (err) {
      console.error('File drop error:', err);
      setError(err.message || 'Fehler beim Hochladen der Datei');
      setIsProcessing(false);
    }
  };
  
  // Handle text file drop (in TranscriptView)
  const handleTextFileDrop = (text) => {
    setTranscription(text);
  };
  
  // Handle transcription
  const handleTranscribe = async () => {
    if (!audioFile) {
      setError('Bitte erst eine MP3-Datei hochladen');
      return;
    }
    
    try {
      setError(null);
      setIsProcessing(true);
      setProgress({ step: 'start', message: 'Starte Transkription...', progress: 0 });
      
      const result = await transcribeAudio(audioFile.filename, socketRef.current?.id);
      
      // Note: transcription is set via socket event
      // But we can use the result if socket fails
      if (!socketRef.current?.connected) {
        setTranscription(result.transcription);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err.message || 'Fehler bei der Transkription');
      setIsProcessing(false);
    }
  };
  
  // Handle summarization
  const handleSummarize = async () => {
    if (!transcription) {
      setError('Bitte erst eine Transkription erstellen oder laden');
      return;
    }
    
    try {
      setError(null);
      setIsProcessing(true);
      setProgress({ step: 'start', message: 'Starte Zusammenfassung...', progress: 0 });
      
      // Determine prompt type from transcription content
      const promptType = transcription.toLowerCase().includes('newsletter') 
        ? 'newsletter' 
        : 'durchgabe';
      
      const result = await summarizeText(transcription, promptType, socketRef.current?.id);
      
      // Note: summary is set via socket event
      // But we can use the result if socket fails
      if (!socketRef.current?.connected) {
        setTranscription(result.summary);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Summarization error:', err);
      setError(err.message || 'Fehler bei der Zusammenfassung');
      setIsProcessing(false);
    }
  };
  
  // Handle timestamp click
  const handleTimestampClick = (timestamp) => {
    const seconds = parseTimestamp(timestamp);
    if (audioRef.current && !isNaN(seconds)) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
    }
  };
  
  // Handle text change (in edit mode)
  const handleTextChange = (newText) => {
    setTranscription(newText);
  };
  
  // Handle reset - clear all loaded files
  const handleReset = () => {
    // Pause audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Clear all states
    setAudioFile(null);
    setAudioUrl(null);
    setTranscription('');
    setError(null);
    
    console.log('✓ Dateien zurückgesetzt. Beide Drop-Areas sind jetzt aktiv.');
  };
  
  // ============================================================================
  // WSL2 Local Processing Handlers
  // ============================================================================
  
  // Open file selection modal for local transcription
  const handleTranscribeLocal = async () => {
    // EINFACHE LOGIK: MP3 vorhanden? Direkt verwenden! Sonst Modal.
    if (audioFile && audioFile.name) {
      console.log('✓ Starte Transkription für:', audioFile.name);
      
      // Reset live output states
      setLiveOutputs([]);
      setLiveProgress(0);
      setIsLiveComplete(false);
      setHasLiveError(false);
      setShowLiveOutput(true);
      setIsProcessing(true);
      setLiveTitle('Lokale Transkription (WSL2 Python)');
      
      try {
        await transcribeLocal(audioFile.name, socketRef.current?.id);
      } catch (err) {
        console.error('✗ Transkription fehlgeschlagen:', err);
        setError(err.message);
        setHasLiveError(true);
        setIsProcessing(false);
        setLiveOutputs(prev => [...prev, {
          step: 'error',
          message: err.message || 'Unbekannter Fehler',
          timestamp: new Date().toLocaleTimeString(),
          type: 'error'
        }]);
      }
    } else {
      // Keine MP3 geladen → Modal öffnen
      console.log('✓ Keine MP3 geladen, öffne Dateiauswahl');
      setFileModalType('mp3');
      setShowFileModal(true);
    }
  };
  
  // Open file selection modal for local summarization
  const handleSummarizeLocal = async () => {
    // Prüfe ob eine Transkription vorhanden ist UND ob sie noch keine Summary hat
    const hasSummary = transcription && transcription.includes('Gesamtzusammenfassung:');
    const hasTranscriptionWithoutSummary = transcription && transcription.trim() && !hasSummary;
    
    if (hasTranscriptionWithoutSummary) {
      // Transkription ohne Summary vorhanden → direkt verwenden
      console.log('✓ Verwende aktuelle Transkription (ohne Summary) für lokale Zusammenfassung');
      
      // Reset live output states
      setLiveOutputs([]);
      setLiveProgress(0);
      setIsLiveComplete(false);
      setHasLiveError(false);
      setShowLiveOutput(true);
      setIsProcessing(true);
      setLiveTitle('Lokale Zusammenfassung (aus aktueller Transkription)');
      
      try {
        // Sende die aktuelle Transkription direkt an das Backend
        const response = await summarizeLocal(null, socketRef.current?.id, transcription);
        console.log('✓ Lokale Zusammenfassung gestartet:', response);
      } catch (err) {
        console.error('✗ Lokale Zusammenfassung fehlgeschlagen:', err);
        setError(err.message);
        setHasLiveError(true);
        setIsProcessing(false);
        setLiveOutputs(prev => [...prev, {
          step: 'error',
          message: err.message || 'Unbekannter Fehler',
          timestamp: new Date().toLocaleTimeString(),
          type: 'error'
        }]);
      }
    } else {
      // Keine Transkription oder bereits Summary vorhanden → zeige Auswahl-Dialog
      if (hasSummary) {
        console.log('✓ Transkription hat bereits Summary, öffne Dateiauswahl für andere Datei');
      } else {
        console.log('✓ Keine Transkription vorhanden, öffne Dateiauswahl');
      }
      setFileModalType('txt');
      setShowFileModal(true);
    }
  };
  
  // Handle file selection from modal
  const handleFileSelect = async (filename) => {
    console.log(`✓ Datei ausgewählt: ${filename} (Typ: ${fileModalType})`);
    
    // Reset live output states
    setLiveOutputs([]);
    setLiveProgress(0);
    setIsLiveComplete(false);
    setHasLiveError(false);
    setShowLiveOutput(true);
    
    try {
      if (fileModalType === 'mp3') {
        // Transcribe local MP3
        setLiveTitle('Lokale Transkription (WSL2 Python)');
        setIsProcessing(true);
        
        const result = await transcribeLocal(filename, socketRef.current?.id);
        
        // Load the result
        if (result.success) {
          setTranscription(result.transcription);
          console.log(`✓ Transkription abgeschlossen: ${result.filename}`);
          
          // MP3 im Player laden
          if (result.mp3Filename) {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
            const mp3StreamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(`D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio\\${result.mp3Filename}`)}`;
            setAudioUrl(mp3StreamUrl);
            setAudioFile({ name: result.mp3Filename });
            console.log(`✓ MP3 im Player geladen: ${result.mp3Filename}`);
          }
        }
        
        setIsProcessing(false);
        
        // Auto-close modal after 3 seconds on success
        setTimeout(() => {
          if (!hasLiveError) {
            setShowLiveOutput(false);
          }
        }, 3000);
        
      } else if (fileModalType === 'txt') {
        // Summarize local TXT
        setLiveTitle('Lokale Zusammenfassung (WSL2 Python)');
        setIsProcessing(true);
        
        const result = await summarizeLocal(filename, socketRef.current?.id, null); // null = keine direkte Transkription, Datei verwenden
        
        // Load the result
        if (result.success) {
          setTranscription(result.transcription);
          console.log(`✓ Zusammenfassung abgeschlossen: ${result.filename}`);
        }
        
        setIsProcessing(false);
        
        // Auto-close modal after 3 seconds on success
        setTimeout(() => {
          if (!hasLiveError) {
            setShowLiveOutput(false);
          }
        }, 3000);
      }
      
    } catch (err) {
      console.error('Lokale Verarbeitung fehlgeschlagen:', err);
      setHasLiveError(true);
      setIsProcessing(false);
      
      // Add error to live output
      const timestamp = new Date().toLocaleTimeString();
      setLiveOutputs(prev => [...prev, {
        step: 'error',
        message: err.message || 'Unbekannter Fehler',
        timestamp
      }]);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              🎙️ MP3 Transcriber
            </h1>
            {isEditMode && showEditButton && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                Edit-Modus aktiv
              </span>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Schließen</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* MP3 Drop Zone (if no audio loaded) */}
        {!audioUrl && (
          <div className="mb-6">
            <DropZone onDrop={handleFileDrop} />
          </div>
        )}
        
        {/* Audio Player (if audio loaded) */}
        {audioUrl && (
          <div className="mb-6">
            <AudioPlayer 
              audioUrl={audioUrl} 
              audioRef={audioRef}
              audioFile={audioFile}
            />
          </div>
        )}
        
        {/* Text Drop Zone (always below MP3/Player) */}
        {!transcription && (
          <div className="mb-6">
            <TextDropZone onDrop={handleTextFileDrop} />
          </div>
        )}
        
        {/* Control Panel */}
        <div className="mb-6">
          <ControlPanel
            onTranscribe={handleTranscribe}
            onSummarize={handleSummarize}
            onTranscribeLocal={handleTranscribeLocal}
            onSummarizeLocal={handleSummarizeLocal}
            isProcessing={isProcessing}
            hasAudio={!!audioFile}
            hasTranscription={!!transcription}
            isEditMode={isEditMode}
            showEditButton={showEditButton}
            onToggleEdit={() => setIsEditMode(!isEditMode)}
            onReset={handleReset}
          />
        </div>
        
        {/* Transcript View */}
        {transcription && (
          <div>
            <TranscriptView
              transcription={transcription}
              isEditMode={isEditMode}
              onTimestampClick={handleTimestampClick}
              onTextChange={handleTextChange}
              audioRef={audioRef}
            />
          </div>
        )}
        
        {/* Empty State */}
        {!transcription && !isProcessing && audioUrl && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Transkription</h3>
            <p className="mt-1 text-sm text-gray-500">
              Klicke auf "Transcribe MP3" um zu starten
            </p>
          </div>
        )}
      </main>
      
      {/* Progress Modal */}
      {isProcessing && !showLiveOutput && (
        <ProgressModal
          step={progress.step}
          message={progress.message}
          progress={progress.progress}
        />
      )}
      
      {/* File Selection Modal */}
      <FileSelectionModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        fileType={fileModalType}
        onSelect={handleFileSelect}
      />
      
      {/* Live Output Modal */}
      <LiveOutputModal
        isOpen={showLiveOutput}
        title={liveTitle}
        outputs={liveOutputs}
        progress={liveProgress}
        isComplete={isLiveComplete}
        hasError={hasLiveError}
        onClose={() => {
          console.log('✓ Live Output Modal geschlossen');
          setShowLiveOutput(false);
          setIsProcessing(false);
        }}
      />
    </div>
  );
}

export default App;
