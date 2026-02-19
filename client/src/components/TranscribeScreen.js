// ============================================================================
// Transcribe Screen Component
// ============================================================================
// MP3 Transcriber - Main Transcription Interface

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import AudioPlayer from './AudioPlayer';
import TranscriptView from './TranscriptView';
import ControlPanel from './ControlPanel';
import DropZone from './DropZone';
import TextDropZone from './TextDropZone';
import ProgressModal from './ProgressModal';
import FileSelectionModal from './FileSelectionModal';
import LiveOutputModal from './LiveOutputModal';
import UserSelectorModal from './UserSelectorModal';
import { uploadFile, loadLocalFile, transcribeLocal, summarizeLocal, saveTranscription, getTranscription, getAudioBlobUrl } from '../services/api';
import { getLastTranscription } from '../services/userService';
import { parseUrlParams, parseTimestamp } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

// Default file paths (wenn keine URL-Parameter angegeben sind)
const DEFAULT_MP3_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1.mp3';
const DEFAULT_TEXT_PATH = 'D:\\Dokumente\\HiDrive\\public\\Durchgaben\\x_test\\newsletter_2020-03_Corona-1_s.txt';

function TranscribeScreen() {
  const { transcriptionId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // User selection state (for saving transcriptions)
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [savedTranscriptionId, setSavedTranscriptionId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditMode, showEditButton]);
  
  // Auto-select current user if not admin
  useEffect(() => {
    if (user && !user.isAdmin && !selectedUserId) {
      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      setSelectedUserId(user.userId);
      setSelectedUserName(displayName);
    }
  }, [user, selectedUserId]);
  
  // Load transcription by ID from URL (if present)
  useEffect(() => {
    const loadTranscriptionById = async () => {
      if (!transcriptionId) return;
      
      // Skip if already loaded something
      if (audioFile || transcription) return;
      
      try {
        logger.log('[TranscribeScreen] 🔵 Lade Transkription mit ID:', transcriptionId);
        const response = await getTranscription(transcriptionId);
        
        if (response.success && response.transcription) {
          const trans = response.transcription;
          logger.log('[TranscribeScreen] ✅ Transkription geladen:', trans.id, trans.mp3_filename);
          
          // Set transcription text
          setTranscription(trans.transcription_text || '');
          
          // Set saved transcription info
          setSavedTranscriptionId(trans.id);
          setSelectedUserId(trans.user_id);
          
          // Set audio file info
          if (trans.mp3_filename) {
            setAudioFile({
              name: trans.mp3_filename,
              size: 0,
              isFromDatabase: true
            });
            
            // WICHTIG: Lade MP3 als Blob mit Auth-Token (Browser sendet keine Auth-Header bei <audio src="...">)
            logger.log('[TranscribeScreen] 🎵 Lade MP3 als Blob für ID:', trans.id);
            try {
              const blobUrl = await getAudioBlobUrl(trans.id);
              setAudioUrl(blobUrl);
              logger.log('[TranscribeScreen] ✅ Audio Blob URL gesetzt:', blobUrl);
            } catch (audioError) {
              logger.error('[TranscribeScreen] ❌ Fehler beim Laden der Audio-Blob:', audioError);
            }
          }
        }
      } catch (error) {
        logger.error('[TranscribeScreen] ❌ Fehler beim Laden der Transkription:', error);
        setError(`Fehler beim Laden der Transkription: ${error.message}`);
      }
    };
    
    loadTranscriptionById();
  }, [transcriptionId]); // Run when transcriptionId changes
  
  // Load last transcription on mount (for admins, only if no transcriptionId in URL)
  useEffect(() => {
    const loadLastTranscription = async () => {
      // Only for admins, only if no URL params are present, and only once
      if (!user || !user.isAdmin || !user.userId) return;
      
      // Skip if transcriptionId is in URL
      if (transcriptionId) return;
      
      const params = parseUrlParams();
      const hasUrlParams = params.mp3 || params.txt || params.edit;
      
      // Skip if URL params are present (those take precedence)
      if (hasUrlParams) return;
      
      // Skip if already loaded something
      if (audioFile || transcription) return;
      
      try {
        logger.log('[TranscribeScreen] Lade letzte Transkription für Admin:', user.userId);
        const response = await getLastTranscription(user.userId);
        
        if (response.success && response.transcription) {
          const lastTrans = response.transcription;
          logger.log('[TranscribeScreen] Letzte Transkription gefunden:', lastTrans.id, lastTrans.mp3_filename);
          
          // Set transcription text
          setTranscription(lastTrans.transcription_text || '');
          
          // Set saved transcription info
          setSavedTranscriptionId(lastTrans.id);
          
          // Set audio file info
          if (lastTrans.mp3_filename) {
            setAudioFile({
              name: lastTrans.mp3_filename,
              size: 0,
              isFromDatabase: true
            });
            
            // WICHTIG: Lade MP3 als Blob mit Auth-Token (Browser sendet keine Auth-Header bei <audio src="...">)
            logger.log('[TranscribeScreen] 🎵 Lade MP3 als Blob (letzte Transkription) für ID:', lastTrans.id);
            try {
              const blobUrl = await getAudioBlobUrl(lastTrans.id);
              setAudioUrl(blobUrl);
              logger.log('[TranscribeScreen] ✅ Audio Blob URL (letzte) gesetzt:', blobUrl);
            } catch (audioError) {
              logger.error('[TranscribeScreen] ❌ Fehler beim Laden der Audio-Blob (letzte):', audioError);
            }
          }
        }
      } catch (error) {
        // Silently fail - user can still use drop areas
        logger.log('[TranscribeScreen] Keine letzte Transkription gefunden (normal)');
      }
    };
    
    // Only run once on mount
    if (user && user.isAdmin) {
      loadLastTranscription();
    }
  }, [user]); // Only run when user changes (initial load)
  
  // Initialize socket connection
  useEffect(() => {
    // Dynamische Backend-URL: Verwende aktuelle Origin (inkl. Port)
    const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      logger.log('✓ Connected to server:', socket.id, 'URL:', backendUrl);
    });
    
    socket.on('disconnect', () => {
      logger.log('✗ Disconnected from server');
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
    socket.on('transcribe:result', async (data) => {
      logger.log('✓ Transkription empfangen via Socket:', data.filename);
      setTranscription(data.transcription);
      setIsProcessing(false);
      
      // MP3 im Player laden
      if (data.mp3Filename) {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
        const mp3StreamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(`D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio\\${data.mp3Filename}`)}`;
        setAudioUrl(mp3StreamUrl);
        setAudioFile({ name: data.mp3Filename });
        logger.log(`✓ MP3 im Player geladen: ${data.mp3Filename}`);
      }
      
      // Speichere Transkription automatisch
      await saveTranscriptionWithMp3(data.transcription, data.transcription.includes('Gesamtzusammenfassung:'));
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
    socket.on('summarize:result', async (data) => {
      logger.log('✓ Zusammenfassung empfangen via Socket:', data.filename);
      setTranscription(data.transcription);
      setIsProcessing(false);
      
      // Speichere aktualisierte Transkription mit Summary automatisch
      await saveTranscriptionWithMp3(data.transcription, true);
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
        logger.log('✓ MP3-Parameter gefunden:', params.mp3);
        mp3Path = params.mp3;
        
        try {
          logger.log('→ Lade MP3 über Backend API...');
          const mp3Result = await loadLocalFile(params.mp3, 'mp3');
          
          if (mp3Result.success) {
            const filename = params.mp3.split(/[\\/]/).pop();
            setAudioFile({ 
              name: filename, 
              path: mp3Result.file.path,
              url: mp3Result.file.url 
            });
            setAudioUrl(mp3Result.file.url);
            logger.log('✓ MP3-Datei aus Parameter geladen:', filename);
            mp3Loaded = true;
          } else {
            logger.error('❌ Backend konnte MP3 nicht laden:', mp3Result.error || 'Unbekannter Fehler');
          }
        } catch (err) {
          logger.error('❌ Fehler beim Laden der MP3 aus Parameter:', err);
        }
      }
      
      // Check for text URL parameter
      if (params.text) {
        logger.log('✓ Text-Parameter gefunden:', params.text);
        try {
          logger.log('→ Lade Text über Backend API...');
          const textResult = await loadLocalFile(params.text, 'txt');
          
          if (textResult.success) {
            setTranscription(textResult.content);
            logger.log('✓ Text-Datei aus Parameter geladen:', params.text);
            textLoaded = true;
          } else {
            logger.error('❌ Backend konnte Text nicht laden:', textResult.error || 'Unbekannter Fehler');
          }
        } catch (err) {
          logger.error('❌ Fehler beim Laden des Texts aus Parameter:', err);
        }
      }
      
      // Wenn MP3 geladen wurde aber kein Text-Parameter, versuche automatisch {filename}_s.txt zu laden
      if (mp3Loaded && !params.text && mp3Path) {
        const basePath = mp3Path.replace(/\.mp3$/i, '');
        const transcriptionPath = `${basePath}_s.txt`;
        
        logger.log(`✓ Versuche automatisch Transkription zu laden: ${transcriptionPath}`);
        
        try {
          const textResult = await loadLocalFile(transcriptionPath, 'txt');
          if (textResult.success) {
            setTranscription(textResult.content);
            logger.log('✓ Transkriptionsdatei automatisch geladen:', transcriptionPath);
            textLoaded = true;
          } else {
            logger.log('⚠ Keine Transkriptionsdatei gefunden:', transcriptionPath);
          }
        } catch (err) {
          logger.log('⚠ Keine Transkriptionsdatei gefunden:', transcriptionPath, err.message);
        }
      }
      
      // Wenn keine URL-Parameter vorhanden sind, lade Standard-Dateien
      if (!params.mp3 && !params.text) {
        // Versuche MP3-Datei zu laden
        try {
          const mp3Result = await loadLocalFile(DEFAULT_MP3_PATH, 'mp3');
          if (mp3Result.success) {
            const filename = DEFAULT_MP3_PATH.split('\\').pop();
            setAudioFile({ 
              name: filename, 
              path: mp3Result.file.path,
              url: mp3Result.file.url 
            });
            setAudioUrl(mp3Result.file.url);
            logger.log('✓ Standard-MP3-Datei geladen:', filename);
          }
        } catch (err) {
          logger.log('Standard-MP3-Datei nicht gefunden (normal)');
        }
        
        // Versuche Text-Datei zu laden
        try {
          const textResult = await loadLocalFile(DEFAULT_TEXT_PATH, 'txt');
          if (textResult.success) {
            setTranscription(textResult.content);
            logger.log('✓ Standard-Text-Datei geladen');
          }
        } catch (err) {
          logger.log('Standard-Text-Datei nicht gefunden (normal)');
        }
      }
      
      // URL-Parameter aus Browser-URL entfernen (nachdem Dateien geladen wurden)
      if (Object.keys(params).length > 0) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    loadDefaultFiles();
  }, []);
  
  // Handle file drop (MP3 only)
  const handleFileDrop = async (files) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const fileType = file.name.split('.').pop().toLowerCase();
    
    logger.log('[TranscribeScreen] 🎵 MP3 FILE DROP:', file.name, fileType, file.size, 'bytes');
    
    try {
      setError(null);
      
      if (fileType === 'mp3') {
        // Handle MP3 file
        setIsProcessing(true);
        setProgress({ step: 'upload', message: 'Lade Datei hoch...', progress: 0 });
        
        logger.log('[TranscribeScreen] Uploading MP3:', file.name);
        const uploadResult = await uploadFile(file);
        logger.log('[TranscribeScreen] Upload result:', uploadResult);
        
        // Create a Blob URL for the audio player (local playback)
        const blobUrl = URL.createObjectURL(file);
        
        // Store file info with Blob URL and buffer reference
        const audioFileData = {
          name: file.name,
          size: file.size,
          mimetype: file.type,
          originalFile: file, // Keep reference to original file for later use
          isUploaded: true
        };
        
        setAudioFile(audioFileData);
        setAudioUrl(blobUrl);
        
        logger.log('[TranscribeScreen] ✅ MP3 gespeichert:', file.name);
        
        setIsProcessing(false);
        setProgress({ step: '', message: '', progress: 0 });
      } else {
        setError('Nur MP3-Dateien werden hier unterstützt');
      }
    } catch (err) {
      logger.error('File drop error:', err);
      setError(err.message || 'Fehler beim Hochladen der Datei');
      setIsProcessing(false);
    }
  };
  
  // Handle text file drop (in TranscriptView)
  const handleTextFileDrop = async (text) => {
    logger.log('[TranscribeScreen] 📄 handleTextFileDrop:', text?.length, 'Zeichen');
    
    setTranscription(text);
    
    // Automatisches Speichern wenn User, MP3 und Text vorhanden sind
    if (selectedUserId && audioFile && text && text.trim()) {
      const hasSummary = text.includes('Gesamtzusammenfassung:');
      logger.log('[TranscribeScreen] 🚀 AUTO-SAVE gestartet, hasSummary:', hasSummary);
      
      const saveResult = await saveTranscriptionWithMp3(text, hasSummary);
      
      if (saveResult) {
        logger.log('[TranscribeScreen] ✅ AUTO-SAVE erfolgreich!');
      } else {
        logger.error('[TranscribeScreen] ❌ AUTO-SAVE fehlgeschlagen!');
      }
    } else {
      logger.warn('[TranscribeScreen] ⚠️ AUTO-SAVE übersprungen - Bedingungen nicht erfüllt');
    }
  };
  
  // Handle timestamp click
  const handleTimestampClick = (timestamp) => {
    logger.log('[TranscribeScreen] 🕒 Timestamp clicked:', timestamp);
    const seconds = parseTimestamp(timestamp);
    logger.log('[TranscribeScreen] Parsed to seconds:', seconds);
    if (audioRef.current && !isNaN(seconds)) {
      logger.log('[TranscribeScreen] Setting audio currentTime to:', seconds);
      audioRef.current.currentTime = seconds;
      audioRef.current.play().catch(err => {
        logger.error('[TranscribeScreen] ❌ Error playing audio after timestamp click:', err);
      });
    } else {
      logger.warn('[TranscribeScreen] ⚠️ Cannot seek - audioRef:', !!audioRef.current, 'seconds:', seconds);
    }
  };
  
  // Handle text change (in edit mode)
  const handleTextChange = (newText) => {
    setTranscription(newText);
  };
  
  // Helper function to save transcription with MP3 data
  const saveTranscriptionWithMp3 = async (transcriptionText, hasSummary = false) => {
    if (!selectedUserId) {
      logger.error('❌ [TranscribeScreen] Kein User ausgewählt, Speicherung übersprungen.');
      setError('⚠️ Kein Benutzer ausgewählt! Bitte wählen Sie einen Benutzer aus.');
      return null;
    }
    
    if (!audioFile) {
      logger.error('❌ [TranscribeScreen] Keine MP3-Datei geladen, Speicherung übersprungen.');
      setError('⚠️ Keine MP3-Datei geladen!');
      return null;
    }
    
    if (!transcriptionText || !transcriptionText.trim()) {
      logger.error('❌ [TranscribeScreen] Keine Transkription vorhanden!');
      setError('⚠️ Keine Transkription vorhanden!');
      return null;
    }
    
    try {
      logger.log('→ [TranscribeScreen] Speichere für User:', selectedUserId, '| MP3:', audioFile.name, '| hasSummary:', hasSummary);
      
      let mp3File = null;
      if (audioFile.originalFile) {
        mp3File = audioFile.originalFile;
      } else {
        logger.warn('⚠️ No originalFile found, saving without MP3 file');
      }
      
      const saveData = {
        target_user_id: selectedUserId,
        mp3_filename: audioFile.name,
        mp3_file: mp3File,
        transcription_text: transcriptionText,
        has_summary: hasSummary
      };
      
      const saveResult = await saveTranscription(saveData);
      
      if (saveResult.success) {
        setSavedTranscriptionId(saveResult.transcriptionId || saveResult.id);
        setSaveSuccess(true);
        
        logger.log('✅ [TranscribeScreen] Gespeichert! ID:', saveResult.transcriptionId || saveResult.id, '| Action:', saveResult.action);
        
        // Zeige Erfolgsmeldung für 3 Sekunden
        setTimeout(() => setSaveSuccess(false), 3000);
        
        return saveResult;
      } else {
        logger.error('❌ Save failed:', saveResult.error);
        setError(`Fehler beim Speichern: ${saveResult.error}`);
        return null;
      }
      
    } catch (error) {
      logger.error('❌ [TranscribeScreen] Fehler beim Speichern:', error.message, error.response?.data);
      setError(`Fehler beim Speichern: ${error.response?.data?.error || error.message}`);
      return null;
    }
  };
  
  // Manual save function (for manually loaded transcriptions)
  const handleManualSave = async () => {
    logger.log('[TranscribeScreen] 💾 handleManualSave aufgerufen');
    const hasSummary = transcription && transcription.includes('Gesamtzusammenfassung:');
    const result = await saveTranscriptionWithMp3(transcription, hasSummary);
    if (!result) {
      logger.error('[TranscribeScreen] ❌ Manual save fehlgeschlagen');
    }
  };
  
  // Smart Save - Intelligente Speicher-Logik
  const handleSmartSave = async () => {
    logger.log('[TranscribeScreen] 💾 handleSmartSave aufgerufen', {
      savedTranscriptionId,
      selectedUserId,
      isAdmin: user?.isAdmin
    });

    // Fall 1: Transkription ist bereits mit einer ID assoziiert → Update
    if (savedTranscriptionId) {
      logger.log('[TranscribeScreen] ✅ Update existierende Transkription:', savedTranscriptionId);
      const hasSummary = transcription && transcription.includes('Gesamtzusammenfassung:');
      const result = await saveTranscriptionWithMp3(transcription, hasSummary);
      if (!result) {
        logger.error('[TranscribeScreen] ❌ Update fehlgeschlagen');
      }
      return;
    }

    // Fall 2: Keine ID, aber User bereits ausgewählt → Direkt speichern
    if (selectedUserId) {
      logger.log('[TranscribeScreen] ✅ Neue Transkription für bereits ausgewählten User:', selectedUserId);
      const hasSummary = transcription && transcription.includes('Gesamtzusammenfassung:');
      const result = await saveTranscriptionWithMp3(transcription, hasSummary);
      if (!result) {
        logger.error('[TranscribeScreen] ❌ Save fehlgeschlagen');
      }
      return;
    }

    // Fall 3: Keine ID und kein User → User-Auswahl Modal öffnen
    logger.log('[TranscribeScreen] 📋 Öffne User-Auswahl Modal');
    setShowUserModal(true);
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
    
    // Reset assoziation info
    setSavedTranscriptionId(null);
    setSaveSuccess(false);
    
    // For non-admin users, auto-select themselves again
    if (user && !user.isAdmin) {
      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      setSelectedUserId(user.userId);
      setSelectedUserName(displayName);
    }
    
    logger.log('✓ Dateien zurückgesetzt.');
  };
  
  // ============================================================================
  // WSL2 Local Processing Handlers
  // ============================================================================
  
  // Open file selection modal for local transcription
  const handleTranscribeLocal = async () => {
    // EINFACHE LOGIK: MP3 vorhanden? Direkt verwenden! Sonst Modal.
    if (audioFile && audioFile.name) {
      logger.log('✓ Starte Transkription für:', audioFile.name);
      
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
        logger.error('✗ Transkription fehlgeschlagen:', err);
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
      logger.log('✓ Keine MP3 geladen, öffne Dateiauswahl');
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
      logger.log('✓ Verwende aktuelle Transkription (ohne Summary) für lokale Zusammenfassung');
      
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
        logger.log('✓ Lokale Zusammenfassung gestartet:', response);
      } catch (err) {
        logger.error('✗ Lokale Zusammenfassung fehlgeschlagen:', err);
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
        logger.log('✓ Transkription hat bereits Summary, öffne Dateiauswahl');
      } else {
        logger.log('✓ Keine Transkription vorhanden, öffne Dateiauswahl');
      }
      setFileModalType('txt');
      setShowFileModal(true);
    }
  };
  
  // Handle file selection from modal
  const handleFileSelect = async (filename) => {
    logger.log(`✓ Datei ausgewählt: ${filename} (Typ: ${fileModalType})`);
    
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
          logger.log(`✓ Transkription abgeschlossen: ${result.filename}`);
          
          // MP3 im Player laden
          if (result.mp3Filename) {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
            const mp3StreamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(`D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio\\${result.mp3Filename}`)}`;
            setAudioUrl(mp3StreamUrl);
            setAudioFile({ name: result.mp3Filename });
            logger.log(`✓ MP3 im Player geladen: ${result.mp3Filename}`);
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
          logger.log(`✓ Zusammenfassung abgeschlossen: ${result.filename}`);
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
      logger.error('Lokale Verarbeitung fehlgeschlagen:', err);
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
      {/* Header with Back Button */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition"
                title="Zurück zum Dashboard"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎙️ MP3 Transcriber
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {isEditMode && showEditButton && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  Edit-Modus aktiv
                </span>
              )}
              {user && (
                <span className="text-sm text-gray-600">
                  {user.first_name} {user.last_name}
                </span>
              )}
            </div>
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
        
        {/* Success Message after saving */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3 animate-fade-in">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800">
                ✅ Transkription erfolgreich gespeichert!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Die Transkription wurde für <span className="font-semibold">{selectedUserName}</span> gespeichert.
                {savedTranscriptionId && (
                  <span className="ml-2 text-xs font-mono bg-green-100 px-2 py-1 rounded">
                    ID: {savedTranscriptionId}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
        
        {/* Control Panel */}
        <div className="mb-6">
          <ControlPanel
            onTranscribeLocal={handleTranscribeLocal}
            onSummarizeLocal={handleSummarizeLocal}
            isProcessing={isProcessing}
            hasAudio={!!audioFile}
            hasTranscription={!!transcription}
            isEditMode={isEditMode}
            showEditButton={showEditButton}
            onToggleEdit={() => setIsEditMode(!isEditMode)}
            onReset={handleReset}
            isAdmin={user?.isAdmin || false}
            onSmartSave={handleSmartSave}
            saveSuccess={saveSuccess}
            savedTranscriptionId={savedTranscriptionId}
            selectedUserName={selectedUserName}
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
          setShowLiveOutput(false);
          setIsProcessing(false);
        }}
      />
      
      {/* User Selector Modal */}
      <UserSelectorModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSelectUser={async (userId, userName) => {
          logger.log('[TranscribeScreen] 👤 User ausgewählt:', userId, userName);
          setSelectedUserId(userId);
          setSelectedUserName(userName);
          
          // Automatisches Speichern nach User-Auswahl
          if (transcription && !savedTranscriptionId) {
            logger.log('[TranscribeScreen] 💾 Automatisches Speichern nach User-Auswahl');
            setShowUserModal(false);
            
            // Kurze Verzögerung damit der User die Auswahl sieht
            setTimeout(async () => {
              const hasSummary = transcription.includes('Gesamtzusammenfassung:');
              await saveTranscriptionWithMp3(transcription, hasSummary);
            }, 300);
          }
        }}
        currentUser={user}
      />
    </div>
  );
}

export default TranscribeScreen;
