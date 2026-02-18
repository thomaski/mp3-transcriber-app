/**
 * Transcription Management Routes (PostgreSQL)
 * CRUD operations for MP3 transcriptions with mp3_data stored in database
 */

const express = require('express');
const { query, queryOne, execute } = require('../db/database-pg');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/logger');
const multer = require('multer');

const router = express.Router();

// Multer für MP3-Upload (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB
  }
});

/**
 * GET /api/transcriptions
 * Get all transcriptions (admin) or user's own transcriptions
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let transcriptions;
    
    if (req.user.isAdmin) {
      // Admin: Alle Transkriptionen (ohne mp3_data für Performance)
      transcriptions = await query(
        `SELECT 
          t.id,
          t.user_id,
          t.mp3_filename,
          t.mp3_size_bytes,
          t.has_summary,
          t.created_at,
          t.updated_at,
          u.username,
          u.first_name,
          u.last_name,
          at.token as access_token,
          at.access_count
        FROM transcriptions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN access_tokens at ON t.id = at.transcription_id
        ORDER BY t.created_at DESC`
      );
    } else {
      // User: Nur eigene Transkriptionen
      transcriptions = await query(
        `SELECT 
          t.id,
          t.mp3_filename,
          t.mp3_size_bytes,
          t.has_summary,
          t.created_at,
          t.updated_at,
          at.token as access_token,
          at.access_count
        FROM transcriptions t
        LEFT JOIN access_tokens at ON t.id = at.transcription_id
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC`,
        [req.user.userId]
      );
    }
    
    res.json({
      success: true,
      transcriptions
    });
  } catch (error) {
    console.error('Get transcriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Transkriptionen.'
    });
  }
});

/**
 * POST /api/transcriptions
 * Create new transcription with MP3 data and optional target user (admin only)
 */
router.post('/', authenticateJWT, upload.single('mp3File'), async (req, res) => {
  const { mp3_filename, transcription_text, has_summary, target_user_id } = req.body;
  
  if (!mp3_filename) {
    return res.status(400).json({
      success: false,
      error: 'MP3-Dateiname ist erforderlich.'
    });
  }
  
  try {
    // Determine target user:
    // - Admin kann target_user_id angeben
    // - Standard-User: automatisch eigener User
    let userId = req.user.userId;
    
    if (target_user_id && req.user.isAdmin) {
      // Admin: Prüfen ob target_user existiert
      const targetUser = await queryOne('SELECT id FROM users WHERE id = $1', [target_user_id]);
      if (!targetUser) {
        return res.status(400).json({
          success: false,
          error: 'Ziel-User nicht gefunden.'
        });
      }
      userId = target_user_id;
      console.log(`Admin ${req.user.username} erstellt Transkription für User ${target_user_id}`);
    }
    
    // MP3-Datei aus Request (Buffer)
    let mp3Data = null;
    let mp3Size = 0;
    
    if (req.file) {
      mp3Data = req.file.buffer;
      mp3Size = req.file.size;
      console.log(`📁 MP3-Datei hochgeladen: ${mp3_filename} (${mp3Size} bytes)`);
    }
    
    // Insert transcription
    const result = await execute(
      `INSERT INTO transcriptions (user_id, mp3_filename, mp3_data, mp3_size_bytes, transcription_text, has_summary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        userId,
        mp3_filename,
        mp3Data,
        mp3Size,
        transcription_text || '',
        has_summary || false
      ]
    );
    
    const transcriptionId = result.rows[0].id;
    
    // Log event
    await logAuditEvent({
      event_type: 'transcription_create',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { 
        transcription_id: transcriptionId, 
        mp3_filename,
        target_user_id: userId !== req.user.userId ? userId : undefined
      },
      success: true
    });
    
    // Return created transcription (ohne mp3_data)
    const newTranscription = await queryOne(
      `SELECT 
        t.id,
        t.mp3_filename,
        t.mp3_size_bytes,
        LENGTH(t.transcription_text) as transcription_length,
        t.has_summary,
        t.created_at,
        at.token as access_token
      FROM transcriptions t
      LEFT JOIN access_tokens at ON t.id = at.transcription_id
      WHERE t.id = $1`,
      [transcriptionId]
    );
    
    res.status(201).json({
      success: true,
      transcription: newTranscription
    });
    
  } catch (error) {
    console.error('Create transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Transkription.'
    });
  }
});

/**
 * GET /api/transcriptions/:id
 * Get single transcription (ohne mp3_data, nur Metadaten + Text)
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const transcription = await queryOne(
      `SELECT 
        t.id,
        t.user_id,
        t.mp3_filename,
        t.mp3_size_bytes,
        t.transcription_text,
        t.has_summary,
        t.created_at,
        t.updated_at,
        at.token as access_token,
        at.access_count
      FROM transcriptions t
      LEFT JOIN access_tokens at ON t.id = at.transcription_id
      WHERE t.id = $1`,
      [req.params.id]
    );
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transkription nicht gefunden.'
      });
    }
    
    // Check permissions: Own transcription or admin
    if (transcription.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Zugriff verweigert.'
      });
    }
    
    res.json({
      success: true,
      transcription
    });
    
  } catch (error) {
    console.error('Get transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Transkription.'
    });
  }
});

/**
 * GET /api/transcriptions/:id/audio
 * Stream MP3-Audio aus Datenbank
 */
router.get('/:id/audio', authenticateJWT, async (req, res) => {
  try {
    const transcription = await queryOne(
      `SELECT 
        t.id,
        t.user_id,
        t.mp3_filename,
        t.mp3_data,
        t.mp3_size_bytes
      FROM transcriptions t
      WHERE t.id = $1`,
      [req.params.id]
    );
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transkription nicht gefunden.'
      });
    }
    
    // Check permissions
    if (transcription.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Zugriff verweigert.'
      });
    }
    
    if (!transcription.mp3_data) {
      return res.status(404).json({
        success: false,
        error: 'MP3-Datei nicht gefunden.'
      });
    }
    
    // Stream MP3-Datei
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': transcription.mp3_size_bytes,
      'Content-Disposition': `inline; filename="${transcription.mp3_filename}"`,
      'Accept-Ranges': 'bytes'
    });
    
    res.send(transcription.mp3_data);
    
  } catch (error) {
    console.error('Get audio error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Audio-Datei.'
    });
  }
});

/**
 * GET /api/transcriptions/:id/download
 * Download Transkriptionstext als TXT-Datei
 */
router.get('/:id/download', authenticateJWT, async (req, res) => {
  try {
    const transcription = await queryOne(
      `SELECT 
        t.id,
        t.user_id,
        t.mp3_filename,
        t.transcription_text
      FROM transcriptions t
      WHERE t.id = $1`,
      [req.params.id]
    );
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transkription nicht gefunden.'
      });
    }
    
    // Check permissions
    if (transcription.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Zugriff verweigert.'
      });
    }
    
    if (!transcription.transcription_text) {
      return res.status(404).json({
        success: false,
        error: 'Transkription ist leer.'
      });
    }
    
    // Dateiname: mp3_filename ohne Extension + .txt
    const baseFilename = transcription.mp3_filename.replace(/\.[^/.]+$/, '');
    const txtFilename = `${baseFilename}_transcription.txt`;
    
    // Download als TXT-Datei
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${txtFilename}"`,
      'Content-Length': Buffer.byteLength(transcription.transcription_text, 'utf8')
    });
    
    res.send(transcription.transcription_text);
    
    console.log(`📥 Transkription heruntergeladen: ${txtFilename} (User: ${req.user.username})`);
    
  } catch (error) {
    console.error('Download transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Herunterladen der Transkription.'
    });
  }
});

/**
 * PUT /api/transcriptions/:id
 * Update transcription
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  const { transcription_text, has_summary } = req.body;
  const transcriptionId = req.params.id;
  
  try {
    // Check if transcription exists and user has permission
    const transcription = await queryOne(
      'SELECT user_id FROM transcriptions WHERE id = $1',
      [transcriptionId]
    );
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transkription nicht gefunden.'
      });
    }
    
    if (transcription.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Zugriff verweigert.'
      });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (transcription_text !== undefined) {
      updates.push(`transcription_text = $${paramIndex++}`);
      values.push(transcription_text);
    }
    if (has_summary !== undefined) {
      updates.push(`has_summary = $${paramIndex++}`);
      values.push(has_summary);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keine Änderungen angegeben.'
      });
    }
    
    values.push(transcriptionId);
    
    await execute(
      `UPDATE transcriptions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    // Log event
    await logAuditEvent({
      event_type: 'transcription_update',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { transcription_id: transcriptionId, fields: updates },
      success: true
    });
    
    // Return updated transcription
    const updated = await queryOne(
      `SELECT 
        t.id,
        t.mp3_filename,
        t.mp3_size_bytes,
        LENGTH(t.transcription_text) as transcription_length,
        t.has_summary,
        t.created_at,
        t.updated_at,
        at.token as access_token
      FROM transcriptions t
      LEFT JOIN access_tokens at ON t.id = at.transcription_id
      WHERE t.id = $1`,
      [transcriptionId]
    );
    
    res.json({
      success: true,
      transcription: updated
    });
    
  } catch (error) {
    console.error('Update transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Transkription.'
    });
  }
});

/**
 * DELETE /api/transcriptions/:id
 * Delete transcription
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  const transcriptionId = req.params.id;
  
  try {
    // Check if transcription exists and user has permission
    const transcription = await queryOne(
      'SELECT user_id, mp3_filename FROM transcriptions WHERE id = $1',
      [transcriptionId]
    );
    
    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transkription nicht gefunden.'
      });
    }
    
    if (transcription.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Zugriff verweigert.'
      });
    }
    
    // Delete transcription (cascade deletes access_tokens)
    await execute('DELETE FROM transcriptions WHERE id = $1', [transcriptionId]);
    
    // Log event
    await logAuditEvent({
      event_type: 'transcription_delete',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { transcription_id: transcriptionId, mp3_filename: transcription.mp3_filename },
      success: true
    });
    
    res.json({
      success: true,
      message: 'Transkription erfolgreich gelöscht.'
    });
    
  } catch (error) {
    console.error('Delete transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Transkription.'
    });
  }
});

module.exports = router;
