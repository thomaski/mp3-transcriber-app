const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateJWT } = require('../middleware/auth');
const { queryOne } = require('../db/database-pg');

// Konfiguration für lokales Verzeichnis (Default)
const DEFAULT_AUDIO_DIR = 'D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio';

/**
 * GET /api/local-files/list
 * Liste lokale MP3 oder TXT Dateien aus dem Audio-Verzeichnis
 * Query-Parameter: type=mp3|txt
 * Verwendet das gespeicherte Verzeichnis des Users (falls vorhanden) oder DEFAULT
 */
router.get('/list', authenticateJWT, async (req, res) => {
  try {
    const fileType = req.query.type || 'mp3'; // 'mp3' oder 'txt'
    
    // Load user's last upload directory (if exists)
    let audioDir = DEFAULT_AUDIO_DIR;
    if (req.user && req.user.userId) {
      try {
        const user = await queryOne(
          'SELECT last_upload_directory FROM users WHERE id = $1',
          [req.user.userId]
        );
        if (user && user.last_upload_directory) {
          audioDir = user.last_upload_directory;
          console.log('[local-files] Using user\'s saved directory:', audioDir);
        } else {
          console.log('[local-files] Using default directory:', audioDir);
        }
      } catch (dbError) {
        console.error('[local-files] Error loading user directory, using default:', dbError.message);
      }
    }

    console.log('[local-files] Scanning directory:', audioDir);

    // Prüfen ob Verzeichnis existiert
    if (!fs.existsSync(audioDir)) {
      return res.status(404).json({ 
        error: `Verzeichnis nicht gefunden: ${audioDir}`,
        hint: 'Bitte stelle sicher, dass das Verzeichnis korrekt ist oder ändere es in den Einstellungen.'
      });
    }

    // Dateien lesen
    const allFiles = fs.readdirSync(audioDir);

    // Filtern nach Typ
    let filteredFiles = [];
    if (fileType === 'mp3') {
      filteredFiles = allFiles.filter(f => f.toLowerCase().endsWith('.mp3'));
    } else if (fileType === 'txt') {
      // Nur .txt, NICHT _s.txt
      filteredFiles = allFiles.filter(f => 
        f.toLowerCase().endsWith('.txt') && 
        !f.toLowerCase().endsWith('_s.txt')
      );
    } else {
      return res.status(400).json({ error: 'Ungültiger Typ. Verwende type=mp3 oder type=txt' });
    }

    // Datei-Details sammeln
    const filesWithDetails = filteredFiles.map(filename => {
      const fullPath = path.join(audioDir, filename);
      const stats = fs.statSync(fullPath);
      
      return {
        filename,
        path: fullPath,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        modified: stats.mtime,
        modifiedFormatted: formatDate(stats.mtime)
      };
    });

    // Sortieren nach Änderungsdatum (neueste zuerst)
    filesWithDetails.sort((a, b) => b.modified - a.modified);

    res.json({
      directory: audioDir,
      type: fileType,
      count: filesWithDetails.length,
      files: filesWithDetails
    });

  } catch (error) {
    console.error('Fehler beim Auflisten der lokalen Dateien:', error);
    res.status(500).json({ 
      error: 'Fehler beim Auflisten der Dateien',
      details: error.message 
    });
  }
});

/**
 * GET /api/local-files/info
 * Gibt Informationen über das lokale Audio-Verzeichnis zurück
 */
router.get('/info', authenticateJWT, async (req, res) => {
  try {
    // Load user's last upload directory (if exists)
    let audioDir = DEFAULT_AUDIO_DIR;
    if (req.user && req.user.userId) {
      try {
        const user = await queryOne(
          'SELECT last_upload_directory FROM users WHERE id = $1',
          [req.user.userId]
        );
        if (user && user.last_upload_directory) {
          audioDir = user.last_upload_directory;
        }
      } catch (dbError) {
        console.error('[local-files] Error loading user directory:', dbError.message);
      }
    }
    
    const exists = fs.existsSync(audioDir);
    
    if (!exists) {
      return res.json({
        directory: audioDir,
        exists: false,
        wslPath: audioDir.replace('D:\\', '/mnt/d/').replace(/\\/g, '/')
      });
    }

    const stats = fs.statSync(audioDir);
    const allFiles = fs.readdirSync(audioDir);
    const mp3Count = allFiles.filter(f => f.toLowerCase().endsWith('.mp3')).length;
    const txtCount = allFiles.filter(f => f.toLowerCase().endsWith('.txt')).length;

    res.json({
      directory: audioDir,
      exists: true,
      wslPath: audioDir.replace('D:\\', '/mnt/d/').replace(/\\/g, '/'),
      isDirectory: stats.isDirectory(),
      totalFiles: allFiles.length,
      mp3Files: mp3Count,
      txtFiles: txtCount
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Verzeichnis-Info:', error);
    res.status(500).json({ 
      error: 'Fehler beim Abrufen der Verzeichnis-Info',
      details: error.message 
    });
  }
});

// Hilfsfunktion: Dateigröße formatieren
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Hilfsfunktion: Datum formatieren
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

module.exports = router;
