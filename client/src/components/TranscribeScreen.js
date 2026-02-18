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
import { uploadFile, loadLocalFile, transcribeLocal, summarizeLocal, saveTranscription } from '../services/api';
import { getLastTranscription } from '../services/userService';
import { parseUrlParams, parseTimestamp } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

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
  
  // Auto-select current user if not admin
  useEffect(() => {
    if (user && !user.isAdmin && !selectedUserId) {
      console.log('[TranscribeScreen] Auto-selecting current user:', user.username);
      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      setSelectedUserId(user.userId);
      setSelectedUserName(displayName);
    }
  }, [user, selectedUserId]);
  
  // Load last transcription on mount (for admins)
  useEffect(() => {
    const loadLastTranscription = async () => {
      // Only for admins, only if no URL params are present, and only once
      if (!user || !user.isAdmin || !user.userId) return;
      
      const params = parseUrlParams();
      const hasUrlParams = params.mp3 || params.txt || params.edit;
      
      // Skip if URL params are present (those take precedence)
      if (hasUrlParams) {
        console.log('[TranscribeScreen] URL params present, skipping auto-load');
        return;
      }
      
      // Skip if already loaded something
      if (audioFile || transcription) {
        console.log('[TranscribeScreen] Content already loaded, skipping auto-load');
        return;
      }
      
      try {
        console.log('[TranscribeScreen] Loading last transcription for admin:', user.userId);
        const response = await getLastTranscription(user.userId);
        
        if (response.success && response.transcription) {
          const lastTrans = response.transcription;
          console.log('[TranscribeScreen] Last transcription found:', lastTrans.id, lastTrans.mp3_filename);
          
          // Set transcription text
          setTranscription(lastTrans.transcription_text || '');
          
          // Set saved transcription info
          setSavedTranscriptionId(lastTrans.id);
          
          // Set audio file info (without actual playback URL since we don't have mp3_data in browser)
          if (lastTrans.mp3_filename) {
            setAudioFile({
              name: lastTrans.mp3_filename,
              size: 0,
              isFromDatabase: true
            });
            
            // Try to get audio stream URL from backend
            const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
            const audioStreamUrl = `${backendUrl}/api/transcriptions/${lastTrans.id}/audio`;
            setAudioUrl(audioStreamUrl);
          }
          
          console.log('[TranscribeScreen] ✅ Last transcription loaded successfully');
        } else {
          console.log('[TranscribeScreen] No last transcription found, showing drop areas');
        }
      } catch (error) {
        console.error('[TranscribeScreen] ❌ Error loading last transcription:', error);
        // Silently fail - user can still use drop areas
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
    socket.on('transcribe:result', async (data) => {
      console.log('✓ Transkription empfangen via Socket:', data.filename);
      setTranscription(data.transcription);
      setIsProcessing(false);
      
      // MP3 im Player laden
      if (data.mp3Filename) {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
        const mp3StreamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(`D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio\\${data.mp3Filename}`)}`;
        setAudioUrl(mp3StreamUrl);
        setAudioFile({ name: data.mp3Filename });
        console.log(`✓ MP3 im Player geladen: ${data.mp3Filename}`);
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
      console.log('✓ Zusammenfassung empfangen via Socket:', data.filename);
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
    
    console.log('[TranscribeScreen] ========================================');
    console.log('[TranscribeScreen] 🎵 MP3 FILE DROP:');
    console.log('[TranscribeScreen] ========================================');
    console.log('[TranscribeScreen] File name:', file.name);
    console.log('[TranscribeScreen] File type:', fileType);
    console.log('[TranscribeScreen] File size:', file.size, 'bytes');
    console.log('[TranscribeScreen] ========================================');
    
    try {
      setError(null);
      
      if (fileType === 'mp3') {
        // Handle MP3 file
        setIsProcessing(true);
        setProgress({ step: 'upload', message: 'Lade Datei hoch...', progress: 0 });
        
        console.log('[TranscribeScreen] Uploading MP3:', file.name);
        const uploadResult = await uploadFile(file);
        console.log('[TranscribeScreen] Upload result:', uploadResult);
        
        // Create a Blob URL for the audio player (local playback)
        const blobUrl = URL.createObjectURL(file);
        console.log('[TranscribeScreen] Created Blob URL:', blobUrl);
        
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
        
        console.log('[TranscribeScreen] ✅ MP3 gespeichert in State:', audioFileData);
        console.log('[TranscribeScreen] Current selectedUserId:', selectedUserId);
        console.log('[TranscribeScreen] Current transcription length:', transcription?.length || 0);
        console.log('[TranscribeScreen] ========================================');
        
        console.log('✓ MP3 hochgeladen und geladen:', file.name);
        
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
  const handleTextFileDrop = async (text) => {
    console.log('[TranscribeScreen] ========================================');
    console.log('[TranscribeScreen] 📄 handleTextFileDrop called');
    console.log('[TranscribeScreen] ========================================');
    console.log('[TranscribeScreen] Text length:', text?.length);
    console.log('[TranscribeScreen] Current selectedUserId:', selectedUserId);
    console.log('[TranscribeScreen] Current selectedUserName:', selectedUserName);
    console.log('[TranscribeScreen] Current audioFile:', audioFile);
    console.log('[TranscribeScreen] ========================================');
    
    setTranscription(text);
    console.log('[TranscribeScreen] ✅ Text in State gesetzt');
    
    // Automatisches Speichern wenn:
    // 1. User ausgewählt ist
    // 2. MP3 geladen ist
    // 3. Transkription vorhanden ist
    if (selectedUserId && audioFile && text && text.trim()) {
      console.log('[TranscribeScreen] 🚀 AUTO-SAVE: Alle Bedingungen erfüllt, speichere automatisch...');
      console.log('[TranscribeScreen]   ✓ User ausgewählt:', selectedUserId, selectedUserName);
      console.log('[TranscribeScreen]   ✓ MP3 geladen:', audioFile.name);
      console.log('[TranscribeScreen]   ✓ Transkription vorhanden:', text.length, 'Zeichen');
      
      // Prüfe ob Summary vorhanden
      const hasSummary = text.includes('Gesamtzusammenfassung:');
      console.log('[TranscribeScreen]   ✓ Has Summary:', hasSummary);
      
      // Automatisch speichern
      const saveResult = await saveTranscriptionWithMp3(text, hasSummary);
      
      if (saveResult) {
        console.log('[TranscribeScreen] ✅ AUTO-SAVE erfolgreich!');
      } else {
        console.error('[TranscribeScreen] ❌ AUTO-SAVE fehlgeschlagen!');
      }
    } else {
      console.warn('[TranscribeScreen] ⚠️ AUTO-SAVE übersprungen - Bedingungen nicht erfüllt:');
      console.warn('[TranscribeScreen]   selectedUserId:', selectedUserId ? '✓' : '❌ FEHLT');
      console.warn('[TranscribeScreen]   audioFile:', audioFile ? '✓' : '❌ FEHLT');
      console.warn('[TranscribeScreen]   text:', (text && text.trim()) ? '✓' : '❌ FEHLT');
      console.warn('[TranscribeScreen] 💡 Bitte klicken Sie den "💾 Transkription in Datenbank speichern" Button');
    }
    console.log('[TranscribeScreen] ========================================');
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
  
  // Helper function to save transcription with MP3 data
  const saveTranscriptionWithMp3 = async (transcriptionText, hasSummary = false) => {
    console.log('[TranscribeScreen] 💾 saveTranscriptionWithMp3 called');
    console.log('[TranscribeScreen] Selected User ID:', selectedUserId);
    console.log('[TranscribeScreen] Selected User Name:', selectedUserName);
    console.log('[TranscribeScreen] Audio File:', audioFile);
    console.log('[TranscribeScreen] Transcription length:', transcriptionText?.length);
    console.log('[TranscribeScreen] Has Summary:', hasSummary);
    
    if (!selectedUserId) {
      console.error('❌ [TranscribeScreen] Kein User ausgewählt, Speicherung wird übersprungen.');
      setError('⚠️ Kein Benutzer ausgewählt! Bitte wählen Sie einen Benutzer aus.');
      return null;
    }
    
    if (!audioFile) {
      console.error('❌ [TranscribeScreen] Keine MP3-Datei geladen, Speicherung wird übersprungen.');
      setError('⚠️ Keine MP3-Datei geladen!');
      return null;
    }
    
    if (!transcriptionText || !transcriptionText.trim()) {
      console.error('❌ [TranscribeScreen] Keine Transkription vorhanden!');
      setError('⚠️ Keine Transkription vorhanden!');
      return null;
    }
    
    try {
      console.log('→ [TranscribeScreen] Speichere Transkription für User:', selectedUserId, selectedUserName);
      console.log('  MP3:', audioFile.name);
      console.log('  Has Summary:', hasSummary);
      
      // Verwende die original File aus dem audioFile-Objekt
      let mp3File = null;
      if (audioFile.originalFile) {
        console.log('  Using originalFile as mp3File');
        mp3File = audioFile.originalFile;
        console.log('  MP3 File size:', mp3File.size, 'bytes');
      } else {
        console.warn('  ⚠️ No originalFile found, saving without MP3 file');
      }
      
      const saveData = {
        target_user_id: selectedUserId,  // Backend erwartet target_user_id
        mp3_filename: audioFile.name,
        mp3_file: mp3File,  // File-Objekt statt Buffer-Array
        transcription_text: transcriptionText,
        has_summary: hasSummary
      };
      
      console.log('  Save data prepared:', {
        target_user_id: saveData.target_user_id,
        mp3_filename: saveData.mp3_filename,
        mp3_file_size: saveData.mp3_file?.size || 0,
        transcription_text_length: saveData.transcription_text?.length || 0,
        has_summary: saveData.has_summary
      });
      
      console.log('  Calling saveTranscription API...');
      const saveResult = await saveTranscription(saveData);
      
      console.log('✅ [TranscribeScreen] Transkription gespeichert:', saveResult);
      console.log('  Response:', JSON.stringify(saveResult, null, 2));
      
      if (saveResult.success) {
        setSavedTranscriptionId(saveResult.transcriptionId || saveResult.id);
        setSaveSuccess(true);
        
        console.log('  ✅ Save successful! Transcription ID:', saveResult.transcriptionId || saveResult.id);
        console.log('  Action:', saveResult.action); // 'created', 'updated', or 'unchanged'
        console.log('  MP3 Changed:', saveResult.mp3_changed);
        
        if (saveResult.action === 'unchanged') {
          console.log('  ℹ️ Keine Änderungen (MP3-Hash ist identisch, keine Updates erforderlich)');
        } else if (saveResult.action === 'updated') {
          console.log('  ♻️ Transkription wurde aktualisiert (UPDATE)');
          if (saveResult.mp3_changed) {
            console.log('    └─ MP3-Datei wurde aktualisiert (Hash geändert)');
          } else {
            console.log('    └─ Nur Text/Summary aktualisiert (MP3-Hash unverändert)');
          }
        } else {
          console.log('  ➕ Neue Transkription wurde erstellt (INSERT)');
        }
        
        // Zeige Erfolgsmeldung für 3 Sekunden
        setTimeout(() => {
          console.log('  Hiding success message after 3 seconds');
          setSaveSuccess(false);
        }, 3000);
        
        return saveResult;
      } else {
        console.error('  ❌ Save failed:', saveResult.error);
        setError(`Fehler beim Speichern: ${saveResult.error}`);
        return null;
      }
      
    } catch (error) {
      console.error('❌ [TranscribeScreen] Fehler beim Speichern der Transkription:', error);
      console.error('  Error name:', error.name);
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      console.error('  Error response:', error.response);
      console.error('  Error response data:', error.response?.data);
      
      setError(`Fehler beim Speichern: ${error.response?.data?.error || error.message}`);
      return null;
    }
  };
  
  // Manual save function (for manually loaded transcriptions)
  const handleManualSave = async () => {
    console.log('[TranscribeScreen] 💾 handleManualSave called (manual save button clicked)');
    const hasSummary = transcription && transcription.includes('Gesamtzusammenfassung:');
    const result = await saveTranscriptionWithMp3(transcription, hasSummary);
    if (result) {
      console.log('[TranscribeScreen] ✅ Manual save successful');
    } else {
      console.error('[TranscribeScreen] ❌ Manual save failed');
    }
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
            const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
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
        
        {/* User Selector - Button to open modal */}
        {(audioUrl || transcription) && (
          <div className="mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-300 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transkription speichern für Benutzer:
                  </label>
                  {selectedUserId ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-600">Ausgewählt:</p>
                        <p className="font-semibold text-gray-900">{selectedUserName}</p>
                      </div>
                      <button
                        onClick={() => setShowUserModal(true)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-medium"
                      >
                        Ändern
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowUserModal(true)}
                      className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-medium shadow-md hover:shadow-lg"
                    >
                      Benutzer auswählen
                    </button>
                  )}
                </div>
              </div>
              {!selectedUserId && (
                <p className="mt-2 text-xs text-gray-500">
                  💡 Bitte wählen Sie einen Benutzer aus, für den die Transkription gespeichert werden soll
                </p>
              )}
            </div>
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
        
        {/* Manual Save Button - for manually loaded transcriptions */}
        {transcription && selectedUserId && !saveSuccess && !isProcessing && (
          <div className="mb-6">
            <button
              onClick={handleManualSave}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>💾 Transkription in Datenbank speichern</span>
            </button>
            <p className="mt-2 text-xs text-gray-500 text-center">
              Klicken Sie hier, um die Transkription permanent für <span className="font-semibold">{selectedUserName}</span> zu speichern
            </p>
          </div>
        )}
        
        {/* Associated User Info - zeigt den User an, für den diese Transkription gespeichert ist/wird */}
        {(transcription || audioFile) && selectedUserId && !saveSuccess && savedTranscriptionId && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Diese Transkription ist assoziiert mit:
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  <span className="font-semibold">{selectedUserName}</span>
                  {savedTranscriptionId && (
                    <span className="ml-2 text-xs font-mono bg-blue-100 px-2 py-1 rounded">
                      ID: {savedTranscriptionId}
                    </span>
                  )}
                </p>
              </div>
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
      
      {/* User Selector Modal */}
      <UserSelectorModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSelectUser={(userId, userName) => {
          console.log('[TranscribeScreen] ========================================');
          console.log('[TranscribeScreen] 👤 USER SELECTED:');
          console.log('[TranscribeScreen] ========================================');
          console.log('[TranscribeScreen] User ID:', userId);
          console.log('[TranscribeScreen] User Name:', userName);
          console.log('[TranscribeScreen] Previous User ID:', selectedUserId);
          console.log('[TranscribeScreen] Previous User Name:', selectedUserName);
          
          setSelectedUserId(userId);
          setSelectedUserName(userName);
          
          console.log('[TranscribeScreen] ✅ User State aktualisiert');
          console.log('[TranscribeScreen] Current audioFile:', audioFile);
          console.log('[TranscribeScreen] Current transcription length:', transcription?.length || 0);
          console.log('[TranscribeScreen] ========================================');
        }}
        currentUser={user}
      />
    </div>
  );
}

export default TranscribeScreen;
