// ============================================================================
// Files Route
// ============================================================================
// Stellt hochgeladene Dateien bereit

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Load local file from absolute path
router.get('/load-local', (req, res) => {
  try {
    const filePath = req.query.path;
    const fileType = req.query.type || 'mp3';
    
    console.log(`📂 Load-Local Request: path="${filePath}", type="${fileType}"`);
    
    if (!filePath) {
      return res.status(400).json({ error: 'Dateipfad fehlt' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Datei nicht gefunden: ${filePath}`);
      return res.status(404).json({ 
        error: 'Datei nicht gefunden',
        path: filePath 
      });
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      console.error(`❌ Pfad ist keine Datei: ${filePath}`);
      return res.status(400).json({ error: 'Pfad ist keine Datei' });
    }
    
    // For MP3 files, return file info with backend URL for streaming
    if (fileType === 'mp3') {
      const filename = path.basename(filePath);
      
      // Konstruiere Stream-URL basierend auf dem Request-Host
      const protocol = req.protocol || 'http';
      const host = req.get('host'); // Enthält host:port
      const streamUrl = `${protocol}://${host}/api/files/stream?path=${encodeURIComponent(filePath)}`;
      
      console.log(`✓ MP3 gefunden: ${filename}`);
      console.log(`  Stream-URL: ${streamUrl}`);
      console.log(`  Request-Host: ${host}`);
      
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
      console.log(`✓ Text-Datei geladen: ${filePath} (${content.length} Zeichen)`);
      res.json({
        success: true,
        content: content,
        path: filePath
      });
    } 
    else {
      res.status(400).json({ error: 'Ungültiger Dateityp' });
    }
    
  } catch (error) {
    console.error('❌ Local file load error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream local file (for MP3 playback)
router.get('/stream', (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Dateipfad fehlt' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
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
    console.error('Stream error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get file
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    
    // Security check: Ensure file is in upload directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }
    
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('File access error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    
    fs.unlinkSync(filePath);
    console.log(`✓ Datei gelöscht: ${filename}`);
    
    res.json({ success: true, message: 'Datei gelöscht' });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
