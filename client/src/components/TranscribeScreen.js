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
import { loadLocalFile, transcribeLocal, summarizeLocal, saveTranscription, updateTranscriptionText, getTranscription, getTranscriptionByFilename, getAudioBlobUrl } from '../services/api';
import { getLastTranscription, updateLastTranscription } from '../services/userService';
import { parseUrlParams, parseTimestamp } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

// Keine hardcodierten Default-Pfade mehr – Laden erfolgt ausschliesslich aus DB oder per Drag & Drop

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
  // Dirty-Flag: true wenn Text seit letztem Laden/Speichern verändert wurde
  const [isTranscriptionDirty, setIsTranscriptionDirty] = useState(false);
  
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
  
  // Warnung wenn User versucht die Seite zu verlassen während ein Speichervorgang läuft
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isProcessing) {
        e.preventDefault();
        // Standardmäßige Browser-Warnung (Text wird von modernen Browsern ignoriert)
        e.returnValue = 'Speichervorgang läuft noch. Seite wirklich verlassen?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing]);

  // Auto-select current user if not admin
  useEffect(() => {
    if (user && !user.isAdmin && !selectedUserId) {
      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      setSelectedUserId(user.userId);
      setSelectedUserName(displayName);
    }
  }, [user, selectedUserId]);

  // Edit-Modus automatisch aktivieren wenn Admin eine Transkription lädt
  useEffect(() => {
    if (user?.isAdmin && transcription) {
      logger.log('[TranscribeScreen] Admin hat Transkription geladen → Edit-Modus wird aktiviert');
      setIsEditMode(true);
      setShowEditButton(true);
    }
  }, [user, transcription]);
  
  // ============================================================================
  // ZENTRALER LADE-EFFEKT (ersetzt 3 frühere useEffects mit Race-Conditions)
  // Klare Priorität – genau EINE Quelle wird geladen:
  //   1. transcriptionId in URL → aus Datenbank laden
  //   2. ?mp3= / ?text= Query-Params → lokale Dateien via Backend
  //   3. Admin ohne Parameter → letzte Transkription aus DB
  //   4. Sonst → leerer State (User droppt Datei per Drag & Drop)
  // ============================================================================
  useEffect(() => {
    if (!user) return; // Warten bis User bekannt ist

    const loadInitial = async () => {
      // --- Priorität 1: Transkription per ID laden (z.B. /transcribe/abc123) ---
      if (transcriptionId) {
        logger.log('[TranscribeScreen] 🔵 Priorität 1 – Lade Transkription per ID:', transcriptionId);
        try {
          const response = await getTranscription(transcriptionId);
          if (response.success && response.transcription) {
            const trans = response.transcription;
            logger.log('[TranscribeScreen] ✅ Transkription geladen:', trans.id, trans.mp3_filename);
            setTranscription(trans.transcription_text || '');
            setIsTranscriptionDirty(false);
            setSavedTranscriptionId(trans.id);
            setSelectedUserId(trans.user_id);

            // last_transcription_id für Admin aktualisieren
            if (user.isAdmin && user.userId) {
              try { await updateLastTranscription(user.userId, trans.id); } catch (_) {}
            }

            if (trans.mp3_filename) {
              setAudioFile({ name: trans.mp3_filename, size: 0, isFromDatabase: true });
              try {
                const blobUrl = await getAudioBlobUrl(trans.id);
                setAudioUrl(blobUrl);
                logger.log('[TranscribeScreen] ✅ Audio Blob URL gesetzt');
              } catch (audioError) {
                // audioFile bleibt gesetzt (isFromDatabase: true) → UI zeigt amber Hinweis statt DropZone
                logger.warn('[TranscribeScreen] ⚠️ Audio nicht in DB (mp3_data fehlt):', audioError.message);
              }
            }
          }
        } catch (err) {
          logger.error('[TranscribeScreen] ❌ Fehler beim Laden per ID:', err);
          setError(`Fehler beim Laden der Transkription: ${err.message}`);
        }
        return; // Fertig – keine weiteren Quellen prüfen
      }

      // --- Priorität 2: URL-Query-Parameter (?mp3=..., ?text=...) ---
      const params = parseUrlParams();
      if (params.mp3 || params.text) {
        logger.log('[TranscribeScreen] 🔵 Priorität 2 – Lade Dateien via URL-Parameter');
        if (params.edit === 'true') {
          setIsEditMode(true);
          setShowEditButton(true);
        }

        let mp3Path = null;

        if (params.mp3) {
          try {
            const mp3Result = await loadLocalFile(params.mp3, 'mp3');
            if (mp3Result.success) {
              const filename = params.mp3.split(/[\\/]/).pop();
              setAudioFile({ name: filename, path: mp3Result.file.path, url: mp3Result.file.url });
              setAudioUrl(mp3Result.file.url);
              mp3Path = params.mp3;
              logger.log('[TranscribeScreen] ✅ MP3 aus URL-Param geladen:', filename);
            }
          } catch (err) {
            logger.error('[TranscribeScreen] ❌ Fehler beim Laden MP3 aus URL-Param:', err);
          }
        }

        if (params.text) {
          try {
            const textResult = await loadLocalFile(params.text, 'txt');
            if (textResult.success) {
              setTranscription(textResult.content);
              logger.log('[TranscribeScreen] ✅ Text aus URL-Param geladen');
            }
          } catch (err) {
            logger.error('[TranscribeScreen] ❌ Fehler beim Laden Text aus URL-Param:', err);
          }
        } else if (mp3Path) {
          // Versuche automatisch {name}_s.txt zu laden
          const transcriptionPath = mp3Path.replace(/\.mp3$/i, '') + '_s.txt';
          try {
            const textResult = await loadLocalFile(transcriptionPath, 'txt');
            if (textResult.success) {
              setTranscription(textResult.content);
              logger.log('[TranscribeScreen] ✅ Transkription automatisch gefunden:', transcriptionPath);
            }
          } catch (_) {
            logger.log('[TranscribeScreen] ℹ️ Keine automatische Transkriptionsdatei gefunden');
          }
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        return; // Fertig
      }

      // --- Priorität 3: Admin → letzte Transkription aus DB laden ---
      if (user.isAdmin && user.userId) {
        logger.log('[TranscribeScreen] 🔵 Priorität 3 – Lade letzte Transkription für Admin:', user.userId);
        try {
          const response = await getLastTranscription(user.userId);
          if (response.success && response.transcription) {
            const lastTrans = response.transcription;
            logger.log('[TranscribeScreen] ✅ Letzte Transkription gefunden:', lastTrans.id, lastTrans.mp3_filename);
            setTranscription(lastTrans.transcription_text || '');
            setIsTranscriptionDirty(false);
            setSavedTranscriptionId(lastTrans.id);

            // last_transcription_id für Admin aktualisieren (falls noch nicht gesetzt)
            try { await updateLastTranscription(user.userId, lastTrans.id); } catch (_) {}

            if (lastTrans.mp3_filename) {
              setAudioFile({ name: lastTrans.mp3_filename, size: 0, isFromDatabase: true });
              try {
                const blobUrl = await getAudioBlobUrl(lastTrans.id);
                setAudioUrl(blobUrl);
                logger.log('[TranscribeScreen] ✅ Audio Blob URL (letzte) gesetzt');
              } catch (audioError) {
                logger.warn('[TranscribeScreen] ⚠️ Audio letzte Transkription nicht in DB:', audioError.message);
              }
            }
          } else {
            logger.log('[TranscribeScreen] ℹ️ Keine letzte Transkription vorhanden – leerer State');
          }
        } catch (_) {
          logger.log('[TranscribeScreen] ℹ️ Keine letzte Transkription gefunden (normal bei neuem Admin)');
        }
        return;
      }

      // --- Priorität 4: Normaler User ohne Parameter → leerer State ---
      logger.log('[TranscribeScreen] ℹ️ Kein Parameter, kein Admin → leerer State, Datei-Drop bereit');
    };

    loadInitial();
  }, [transcriptionId, user]); // Neu laden wenn ID oder User sich ändert

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
      setIsTranscriptionDirty(true); // Neuer Transkriptions-Text → noch nicht gespeichert
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
      setIsTranscriptionDirty(true); // Neue Zusammenfassung → noch nicht gespeichert
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
      setIsTranscriptionDirty(true); // Neue Transkription → noch nicht gespeichert
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
        setProgress({ step: 'upload', message: 'Datei wird vorbereitet...', progress: 0 });

        // Prüfen ob eine Transkription mit gleichem Dateinamen bereits in der DB existiert
        let existingTranscription = null;
        if (user?.userId) {
          try {
            const checkResult = await getTranscriptionByFilename(file.name);
            if (checkResult.success && checkResult.transcription) {
              existingTranscription = checkResult.transcription;
              logger.log('[TranscribeScreen] 🔍 Vorhandene Transkription gefunden für:', file.name, '→ ID:', existingTranscription.id);
            }
          } catch (checkErr) {
            logger.warn('[TranscribeScreen] ⚠️ Dateiname-Check fehlgeschlagen (nicht kritisch):', checkErr.message);
          }
        }

        if (existingTranscription) {
          // ✅ Transkription aus DB laden – MP3-Datei (frisch gedroppt) als Blob-URL verwenden
          const blobUrl = URL.createObjectURL(file);
          setAudioFile({
            name: file.name,
            size: file.size,
            mimetype: file.type,
            originalFile: file,
            isUploaded: true
          });
          setAudioUrl(blobUrl);
          setTranscription(existingTranscription.transcription_text || '');
          setIsTranscriptionDirty(false);
          setSavedTranscriptionId(existingTranscription.id);

          // last_transcription_id für Admin aktualisieren
          if (user?.isAdmin && user?.userId) {
            try { await updateLastTranscription(user.userId, existingTranscription.id); } catch (_) {}
          }

          logger.log('[TranscribeScreen] ✅ Vorhandene Transkription geladen für:', file.name);
          setIsProcessing(false);
          setProgress({ step: '', message: '', progress: 0 });
        } else {
          // Neue MP3 – keine Server-Upload nötig, Datei liegt bereits lokal im Speicher.
          // Blob URL für den Audio-Player direkt aus dem lokalen File-Objekt erstellen.
          // Der tatsächliche Upload zur DB erfolgt erst beim Klick auf "Speichern".
          logger.log('[TranscribeScreen] ✅ Neue MP3 lokal vorbereitet (kein Upload):', file.name);

          const blobUrl = URL.createObjectURL(file);

          setAudioFile({
            name: file.name,
            size: file.size,
            mimetype: file.type,
            originalFile: file, // Referenz auf Original-File für späteren DB-Upload
            isUploaded: true
          });
          setAudioUrl(blobUrl);

          setIsProcessing(false);
          setProgress({ step: '', message: '', progress: 0 });
        }
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
  const handleTextFileDrop = (text) => {
    logger.log('[TranscribeScreen] 📄 handleTextFileDrop:', text?.length, 'Zeichen');
    
    // Text sofort anzeigen – NICHT auf den Save warten
    setTranscription(text);
    setIsTranscriptionDirty(true);
    
    // Automatisches Speichern im Hintergrund (fire & forget)
    // Beim ersten Speichern wird die MP3 hochgeladen (kann dauern), daher nicht awaiten.
    // Der Text ist sofort sichtbar, die Speicherung läuft asynchron.
    if (selectedUserId && audioFile && text && text.trim()) {
      const hasSummary = text.includes('Gesamtzusammenfassung:');
      logger.log('[TranscribeScreen] 🚀 AUTO-SAVE im Hintergrund gestartet, hasSummary:', hasSummary);
      
      saveTranscriptionWithMp3(text, hasSummary)
        .then(result => {
          if (result) {
            logger.log('[TranscribeScreen] ✅ AUTO-SAVE erfolgreich!');
          } else {
            logger.error('[TranscribeScreen] ❌ AUTO-SAVE fehlgeschlagen!');
          }
        })
        .catch(err => {
          logger.error('[TranscribeScreen] ❌ AUTO-SAVE Fehler:', err.message);
        });
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
  
  // Handle text change (in edit mode) - markiert als geändert
  const handleTextChange = (newText) => {
    setTranscription(newText);
    setIsTranscriptionDirty(true);
  };
  
  // Helper function to save transcription
  // Optimierung: Wenn savedTranscriptionId bekannt → nur Text via PUT (kein MP3-Upload!)
  //              Nur beim ERSTEN Speichern wird die MP3 per POST hochgeladen.
  // overrideUserId: direkt übergeben wenn State noch nicht aktualisiert ist (React async state)
  const saveTranscriptionWithMp3 = async (transcriptionText, hasSummary = false, overrideUserId = null) => {
    const effectiveUserId = overrideUserId || selectedUserId;
    if (!effectiveUserId) {
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
    
    // Speicher-Indikator anzeigen – blockiert UI damit User nicht während des Uploads navigiert
    setIsProcessing(true);

    try {
      let saveResult;

      if (savedTranscriptionId) {
        // UPDATE: Transkription existiert bereits → nur Text senden, kein MP3-Upload nötig (schnell)
        setProgress({ step: 'saving', message: 'Transkription wird aktualisiert...', progress: 70 });
        logger.log('→ [TranscribeScreen] PUT (Text only) für ID:', savedTranscriptionId, '| hasSummary:', hasSummary);
        saveResult = await updateTranscriptionText(savedTranscriptionId, transcriptionText, hasSummary);
        // PUT gibt transcription-Objekt zurück, saveResult.id aus dem Objekt holen
        if (saveResult.success && saveResult.transcription) {
          saveResult.transcriptionId = saveResult.transcription.id;
        }
      } else {
        // CREATE: Erste Speicherung → MP3 + Text per POST hochladen (kann bei großen Dateien dauern)
        setProgress({ step: 'saving', message: `MP3 wird gespeichert (${audioFile.name})...`, progress: 20 });
        logger.log('→ [TranscribeScreen] POST (MP3 + Text) für User:', effectiveUserId, '| MP3:', audioFile.name);
        let mp3File = null;
        if (audioFile.originalFile) {
          mp3File = audioFile.originalFile;
        } else {
          logger.warn('⚠️ No originalFile found, saving without MP3 file');
        }
        saveResult = await saveTranscription({
          target_user_id: effectiveUserId,
          mp3_filename: audioFile.name,
          mp3_file: mp3File,
          transcription_text: transcriptionText,
          has_summary: hasSummary
        });
      }
      
      if (saveResult.success) {
        const savedId = saveResult.transcriptionId || saveResult.id || savedTranscriptionId;
        setSavedTranscriptionId(savedId);
        setSaveSuccess(true);
        setIsTranscriptionDirty(false); // Nach erfolgreichem Speichern: kein ungespeicherter Inhalt
        
        logger.log('✅ [TranscribeScreen] Gespeichert! ID:', savedId, '| Action:', saveResult.action || 'update');

        // last_transcription_id für Admin aktualisieren
        if (user?.isAdmin && user?.userId && savedId) {
          try { await updateLastTranscription(user.userId, savedId); } catch (_) {}
        }
        
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
    } finally {
      // Indikator immer zurücksetzen – egal ob Erfolg oder Fehler
      setIsProcessing(false);
      setProgress({ step: '', message: '', progress: 0 });
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
    setIsTranscriptionDirty(false);
    
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
          setIsTranscriptionDirty(true); // Neue lokale Transkription → noch nicht gespeichert
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
          setIsTranscriptionDirty(true); // Neue Zusammenfassung → noch nicht gespeichert
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
        
        {/* Drei Fälle:
            1. audioUrl vorhanden → AudioPlayer anzeigen
            2. audioFile aus DB bekannt, aber mp3_data fehlt (alt) → kompakte Warnung, KEINE DropZone
            3. Kein audioFile → DropZone zum Hochladen anzeigen
        */}
        {audioUrl ? (
          <div className="mb-6">
            <AudioPlayer 
              audioUrl={audioUrl} 
              audioRef={audioRef}
              audioFile={audioFile}
            />
          </div>
        ) : audioFile?.isFromDatabase ? (
          /* Fall 2: Dateiname aus DB bekannt, aber mp3_data fehlt (alte Transkription vor BYTEA-Migration) */
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-amber-500 text-xl flex-shrink-0">🎵</span>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Audio: <span className="font-semibold">{audioFile.name}</span>
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Die MP3-Datei ist nicht in der Datenbank gespeichert (ältere Transkription).
                  Bitte MP3 über <strong>"Neue Datei laden"</strong> erneut hochladen, um den Player zu aktivieren.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Fall 3: Kein Audio bekannt → DropZone zum Hochladen */
          <div className="mb-6">
            <DropZone onDrop={handleFileDrop} />
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
            isTranscriptionDirty={isTranscriptionDirty}
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
            logger.log('[TranscribeScreen] 💾 Automatisches Speichern nach User-Auswahl für userId:', userId);
            setShowUserModal(false);
            
            // userId direkt übergeben, da setSelectedUserId async ist und der State
            // noch nicht aktualisiert sein könnte wenn saveTranscriptionWithMp3 aufgerufen wird
            const hasSummary = transcription.includes('Gesamtzusammenfassung:');
            await saveTranscriptionWithMp3(transcription, hasSummary, userId);
          }
        }}
        currentUser={user}
      />
    </div>
  );
}

export default TranscribeScreen;
