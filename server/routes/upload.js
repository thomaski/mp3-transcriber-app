// ============================================================================
// Upload Route
// ============================================================================
// Handhabt MP3- und Text-Datei-Uploads mit Multer (in-memory für DB-Speicherung)

const express = require('express');
const multer = require('multer');
const path = require('path');
const logger = require('../../logger');

const router = express.Router();

// Configure multer storage (in-memory, nicht auf Filesystem speichern)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'text/plain'];
  const allowedExts = ['.mp3', '.txt'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Nur MP3- und TXT-Dateien erlaubt'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100 MB default
  }
});

/**
 * POST /api/upload
 * Upload einer MP3- oder TXT-Datei (in-memory für DB-Speicherung)
 * 
 * @param {File} file - Hochzuladende Datei (multipart/form-data)
 * @returns {Object} File Metadaten (ohne Buffer)
 * @throws {400} Keine Datei oder ungültiger Dateityp
 * @throws {500} Server-Fehler beim Upload
 */
router.post('/', upload.single('file'), (req, res) => {
  try {
    logger.log('UPLOAD', `📤 Upload-Request von User: ${req.user?.username || 'unbekannt'}`);
    
    // Validierung: Datei vorhanden?
    if (!req.file) {
      logger.error('UPLOAD', 'Keine Datei in Request vorhanden');
      return res.status(400).json({ 
        success: false,
        error: 'Keine Datei hochgeladen' 
      });
    }
    
    // Zusätzliche Validierung: Dateiname-Sanitization
    const sanitizedFilename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Datei ist jetzt in req.file.buffer (Buffer) statt auf Filesystem
    const fileInfo = {
      originalname: sanitizedFilename,
      buffer: req.file.buffer,           // Binary data für DB-Speicherung
      size: req.file.size,
      mimetype: req.file.mimetype
    };
    
    logger.success('UPLOAD', `Datei hochgeladen: ${sanitizedFilename} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Buffer kann nicht direkt als JSON zurückgegeben werden
    // Stattdessen nur Metadaten zurückgeben
    res.json({
      success: true,
      file: {
        originalname: fileInfo.originalname,
        size: fileInfo.size,
        mimetype: fileInfo.mimetype,
        // Buffer bleibt im Server-Speicher für weitere Verarbeitung
        // (wird in transcribe.js oder transcriptions.js gespeichert)
      }
    });
  } catch (error) {
    logger.error('UPLOAD', `Upload-Fehler: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Ein Fehler ist beim Hochladen aufgetreten.' 
    });
  }
});

/**
 * Error handling middleware für Upload-Route
 * Behandelt Multer-spezifische Fehler
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    logger.error('UPLOAD', `Multer-Fehler: ${error.code} - ${error.message}`);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      const maxSizeMB = Math.round((parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024) / 1024 / 1024);
      return res.status(400).json({ 
        success: false,
        error: `Datei zu groß. Maximale Größe: ${maxSizeMB} MB` 
      });
    }
    
    return res.status(400).json({ 
      success: false,
      error: `Upload-Fehler: ${error.message}` 
    });
  }
  
  logger.error('UPLOAD', `Unerwarteter Fehler: ${error.message}`, { stack: error.stack });
  res.status(500).json({ 
    success: false,
    error: 'Ein unerwarteter Fehler ist aufgetreten.' 
  });
});

module.exports = router;
