// ============================================================================
// Files Route
// ============================================================================
// Stellt hochgeladene Dateien bereit

const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('../../logger');

const router = express.Router();

// SECURITY: Whitelist für erlaubte Verzeichnisse (lokale Dateien)
const ALLOWED_DIRECTORIES = [
  'D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio',
  process.env.UPLOAD_DIR || './uploads'
].map(dir => path.resolve(dir));

/**
 * Sicherheitsprüfung: Verhindert Path Traversal Angriffe
 * Prüft ob der angeforderte Pfad in einem erlaubten Verzeichnis liegt
 * 
 * @param {string} requestedPath - Angeforderter Dateipfad
 * @returns {boolean} True wenn Pfad erlaubt ist
 */
function isPathAllowed(requestedPath) {
  const resolvedPath = path.resolve(requestedPath);
  
  // Prüfe ob Pfad in einem der erlaubten Verzeichnisse liegt
  return ALLOWED_DIRECTORIES.some(allowedDir => 
    resolvedPath.startsWith(allowedDir)
  );
}

/**
 * GET /api/files/load-local
 * Lädt eine lokale Datei vom Server (NUR aus erlaubten Verzeichnissen!)
 * 
 * @query {string} path - Absoluter Pfad zur Datei
 * @query {string} type - Dateityp ('mp3' oder 'txt')
 * @returns {Object} File Info oder Content
 * @throws {400} Ungültiger Request
 * @throws {403} Path Traversal Versuch / Zugriff verweigert
 * @throws {404} Datei nicht gefunden
 */
router.get('/load-local', (req, res) => {
  try {
    const filePath = req.query.path;
    const fileType = req.query.type || 'mp3';
    
    logger.log('FILES', `📂 Load-Local Request: path="${filePath}", type="${fileType}"`);
    
    // Input-Validierung
    if (!filePath) {
      logger.error('FILES', 'Kein Dateipfad angegeben');
      return res.status(400).json({ 
        success: false,
        error: 'Dateipfad fehlt' 
      });
    }
    
    // SECURITY: Path Traversal Protection
    if (!isPathAllowed(filePath)) {
      logger.error('FILES', `⚠️ SECURITY: Path Traversal Versuch blockiert: ${filePath}`);
      return res.status(403).json({ 
        success: false,
        error: 'Zugriff auf dieses Verzeichnis nicht erlaubt' 
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error('FILES', `Datei nicht gefunden: ${filePath}`);
      return res.status(404).json({ 
        success: false,
        error: 'Datei nicht gefunden'
      });
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      logger.error('FILES', `Pfad ist keine Datei: ${filePath}`);
      return res.status(400).json({ 
        success: false,
        error: 'Pfad ist keine Datei' 
      });
    }
    
    // For MP3 files, return file info with backend URL for streaming
    if (fileType === 'mp3') {
      const filename = path.basename(filePath);
      
      // Konstruiere Stream-URL basierend auf dem Request-Host
      const protocol = req.protocol || 'http';
      const host = req.get('host'); // Enthält host:port
      const streamUrl = `${protocol}://${host}/api/files/stream?path=${encodeURIComponent(filePath)}`;
      
      logger.success('FILES', `MP3 gefunden: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      logger.debug('FILES', `Stream-URL: ${streamUrl}`);
      
      res.json({
        success: true,
        file: {
          name: filename,
          filename: filename,
          url: streamUrl,
          size: stats.size,
          path: filePath
        }
      });
    } 
    // For text files, return content
    else if (fileType === 'txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      logger.success('FILES', `Text-Datei geladen: ${path.basename(filePath)} (${content.length} Zeichen)`);
      res.json({
        success: true,
        content: content,
        path: filePath
      });
    } 
    else {
      logger.error('FILES', `Ungültiger Dateityp: ${fileType}`);
      res.status(400).json({ 
        success: false,
        error: 'Ungültiger Dateityp' 
      });
    }
    
  } catch (error) {
    logger.error('FILES', `Local file load error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Fehler beim Laden der Datei' 
    });
  }
});

/**
 * GET /api/files/stream
 * Streamt eine MP3-Datei (mit Range-Request Support für Audio-Player)
 * 
 * @query {string} path - Absoluter Pfad zur MP3-Datei
 * @returns {Stream} Audio-Stream mit Range-Support
 * @throws {400} Ungültiger Request
 * @throws {403} Zugriff verweigert
 * @throws {404} Datei nicht gefunden
 */
router.get('/stream', (req, res) => {
  try {
    const filePath = req.query.path;
    
    logger.debug('FILES', `🎵 Stream Request: ${filePath}`);
    
    // Input-Validierung
    if (!filePath) {
      return res.status(400).json({ 
        success: false,
        error: 'Dateipfad fehlt' 
      });
    }
    
    // SECURITY: Path Traversal Protection
    if (!isPathAllowed(filePath)) {
      logger.error('FILES', `⚠️ SECURITY: Stream-Zugriff verweigert: ${filePath}`);
      return res.status(403).json({ 
        success: false,
        error: 'Zugriff verweigert' 
      });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        error: 'Datei nicht gefunden' 
      });
    }
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Handle range requests for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // No range request, send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    logger.error('FILES', `Stream error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Fehler beim Streamen der Datei' 
    });
  }
});

/**
 * GET /api/files/:filename
 * Lädt eine Datei aus dem Upload-Verzeichnis
 * 
 * @param {string} filename - Dateiname
 * @returns {File} Die angeforderte Datei
 * @throws {403} Path Traversal Versuch
 * @throws {404} Datei nicht gefunden
 */
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);
    
    logger.debug('FILES', `Datei-Zugriff: ${filename}`);
    
    if (!fs.existsSync(filePath)) {
      logger.error('FILES', `Datei nicht gefunden: ${filename}`);
      return res.status(404).json({ 
        success: false,
        error: 'Datei nicht gefunden' 
      });
    }
    
    // SECURITY: Path Traversal Protection
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      logger.error('FILES', `⚠️ SECURITY: Path Traversal Versuch blockiert: ${filename}`);
      return res.status(403).json({ 
        success: false,
        error: 'Zugriff verweigert' 
      });
    }
    
    logger.success('FILES', `Datei wird ausgeliefert: ${filename}`);
    res.sendFile(resolvedPath);
  } catch (error) {
    logger.error('FILES', `File access error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Fehler beim Zugriff auf die Datei' 
    });
  }
});

/**
 * DELETE /api/files/:filename
 * Löscht eine Datei aus dem Upload-Verzeichnis
 * 
 * @param {string} filename - Zu löschender Dateiname
 * @returns {Object} Success-Nachricht
 * @throws {404} Datei nicht gefunden
 */
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);
    
    logger.log('FILES', `🗑️ Delete Request: ${filename}`);
    
    if (!fs.existsSync(filePath)) {
      logger.error('FILES', `Datei nicht gefunden: ${filename}`);
      return res.status(404).json({ 
        success: false,
        error: 'Datei nicht gefunden' 
      });
    }
    
    fs.unlinkSync(filePath);
    logger.success('FILES', `Datei gelöscht: ${filename}`);
    
    res.json({ 
      success: true, 
      message: 'Datei erfolgreich gelöscht' 
    });
  } catch (error) {
    logger.error('FILES', `File delete error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Fehler beim Löschen der Datei' 
    });
  }
});

module.exports = router;
