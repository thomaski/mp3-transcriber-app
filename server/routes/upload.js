// ============================================================================
// Upload Route
// ============================================================================
// Handhabt MP3- und Text-Datei-Uploads mit Multer (in-memory für DB-Speicherung)

const express = require('express');
const multer = require('multer');
const path = require('path');

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

// Upload endpoint
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    // Datei ist jetzt in req.file.buffer (Buffer) statt auf Filesystem
    const fileInfo = {
      originalname: req.file.originalname,
      buffer: req.file.buffer,           // Binary data für DB-Speicherung
      size: req.file.size,
      mimetype: req.file.mimetype
    };
    
    console.log(`✓ Datei hochgeladen (in-memory): ${req.file.originalname} (${req.file.size} bytes)`);
    
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
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Datei zu groß', 
        maxSize: process.env.MAX_FILE_SIZE 
      });
    }
  }
  res.status(500).json({ error: error.message });
});

module.exports = router;
