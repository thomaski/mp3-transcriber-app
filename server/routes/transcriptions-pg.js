/**
 * Transcription Management Routes (PostgreSQL)
 * CRUD operations for MP3 transcriptions with mp3_data stored in database
 */

const express = require('express');
const { query, queryOne, execute } = require('../db/database-pg');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/logger');
const multer = require('multer');
const crypto = require('crypto'); // For SHA-256 hash
const logger = require('../../logger');

const router = express.Router();

// Helper function: Calculate SHA-256 hash of buffer
function calculateHash(buffer) {
  if (!buffer) return null;
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

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
    
    logger.debug('TRANSCRIPTIONS', `Found ${transcriptions.length} transcriptions`);
    
    res.json({
      success: true,
      transcriptions
    });
  } catch (error) {
    logger.error('TRANSCRIPTIONS', '❌ Get transcriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Transkriptionen.'
    });
  }
});

/**
 * POST /api/transcriptions
 * Create or update transcription with MP3 data and optional target user (admin only)
 * UPSERT logic: If a transcription with same mp3_filename and user_id exists, UPDATE it
 */
router.post('/', authenticateJWT, upload.single('mp3File'), async (req, res) => {
  const { mp3_filename, transcription_text, has_summary, target_user_id } = req.body;
  
  if (!mp3_filename) {
    logger.log('TRANSCRIPTIONS', 'Missing mp3_filename in POST request');
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
      logger.debug('TRANSCRIPTIONS', `Admin ${req.user.username} saves transcription for user ${target_user_id}`);
    }
    
    // MP3-Datei aus Request (Buffer)
    let mp3Data = null;
    let mp3Size = 0;
    let mp3Hash = null;
    
    if (req.file) {
      mp3Data = req.file.buffer;
      mp3Size = req.file.size;
      mp3Hash = calculateHash(mp3Data);
      logger.debug('TRANSCRIPTIONS', `MP3 uploaded: ${mp3_filename} (${mp3Size} bytes)`);
    }
    
    // Check if transcription already exists for this user and filename
    const existingTranscription = await queryOne(
      `SELECT id, mp3_hash FROM transcriptions WHERE user_id = $1 AND mp3_filename = $2`,
      [userId, mp3_filename]
    );
    
    let transcriptionId;
    let isUpdate = false;
    let mp3Changed = false;
    
    if (existingTranscription) {
      // UPDATE existing transcription
      isUpdate = true;
      transcriptionId = existingTranscription.id;
      logger.debug('TRANSCRIPTIONS', `Updating existing transcription: ${transcriptionId}`);
      
      // Check if MP3 hash has changed
      if (mp3Hash && existingTranscription.mp3_hash) {
        mp3Changed = mp3Hash !== existingTranscription.mp3_hash;
      } else if (mp3Hash && !existingTranscription.mp3_hash) {
        // No hash stored yet, consider as changed
        mp3Changed = true;
      } else if (!mp3Hash) {
        // No new MP3 data provided
        mp3Changed = false;
      }
      
      // Prepare UPDATE query - only update fields that are provided
      let updateFields = [];
      let updateValues = [];
      let paramCounter = 1;
      
      if (transcription_text !== undefined && transcription_text !== null) {
        updateFields.push(`transcription_text = $${paramCounter++}`);
        updateValues.push(transcription_text);
      }
      
      if (has_summary !== undefined && has_summary !== null) {
        updateFields.push(`has_summary = $${paramCounter++}`);
        updateValues.push(has_summary);
      }
      
      // Only update MP3 data if hash has changed
      if (mp3Data && mp3Changed) {
        updateFields.push(`mp3_data = $${paramCounter++}`);
        updateValues.push(mp3Data);
        updateFields.push(`mp3_size_bytes = $${paramCounter++}`);
        updateValues.push(mp3Size);
        updateFields.push(`mp3_hash = $${paramCounter++}`);
        updateValues.push(mp3Hash);
      }
      
      // Only proceed with UPDATE if there are fields to update
      if (updateFields.length === 0) {
        // Still return success, but indicate nothing was updated
        const savedTranscription = await queryOne(
          `SELECT 
            t.id,
            t.mp3_filename,
            t.mp3_size_bytes,
            t.mp3_hash,
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
        
        return res.status(200).json({
          success: true,
          transcriptionId: transcriptionId,
          id: transcriptionId,
          transcription: savedTranscription,
          action: 'unchanged',
          message: 'Keine Änderungen erkannt (MP3-Hash ist identisch)'
        });
      }
      
      // Always update updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add WHERE clause parameters
      updateValues.push(transcriptionId);
      
      const updateQuery = `
        UPDATE transcriptions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING id, updated_at
      `;
      
      await execute(updateQuery, updateValues);
      logger.log('TRANSCRIPTIONS', `✓ Transcription ${transcriptionId} updated`);
      
    } else {
      // INSERT new transcription
      const { generateMp3Id } = require('../utils/generateShortId');
      transcriptionId = generateMp3Id();
      
      const result = await execute(
        `INSERT INTO transcriptions (id, user_id, mp3_filename, mp3_data, mp3_size_bytes, mp3_hash, transcription_text, has_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at`,
        [
          transcriptionId,
          userId,
          mp3_filename,
          mp3Data,
          mp3Size,
          mp3Hash,
          transcription_text || '',
          has_summary || false
        ]
      );
      
      logger.log('TRANSCRIPTIONS', `✓ New transcription created: ${transcriptionId} for ${mp3_filename}`);
    }
    
    // Log event
    await logAuditEvent({
      event_type: isUpdate ? 'transcription_update' : 'transcription_create',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { 
        transcription_id: transcriptionId, 
        mp3_filename,
        mp3_hash: mp3Hash || null,
        mp3_changed: isUpdate ? mp3Changed : true,
        target_user_id: userId !== req.user.userId ? userId : undefined,
        action: isUpdate ? 'update' : 'insert'
      },
      success: true
    });
    
    // Return transcription (ohne mp3_data)
    const savedTranscription = await queryOne(
      `SELECT 
        t.id,
        t.mp3_filename,
        t.mp3_size_bytes,
        t.mp3_hash,
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
    
    res.status(isUpdate ? 200 : 201).json({
      success: true,
      transcriptionId: transcriptionId,
      id: transcriptionId, // Backwards compatibility
      transcription: savedTranscription,
      action: isUpdate ? 'updated' : 'created',
      mp3_changed: isUpdate ? mp3Changed : true
    });
    
  } catch (error) {
    logger.error('TRANSCRIPTIONS', '❌ Save transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern der Transkription.'
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
    logger.error('TRANSCRIPTIONS', '❌ Get transcription error:', error);
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
    logger.error('TRANSCRIPTIONS', 'Get audio error:', error);
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
    
    logger.log('TRANSCRIPTIONS', `📥 Download: ${txtFilename} (User: ${req.user.username})`);
    
  } catch (error) {
    logger.error('TRANSCRIPTIONS', 'Download transcription error:', error);
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
    logger.error('TRANSCRIPTIONS', 'Update transcription error:', error);
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
    logger.error('TRANSCRIPTIONS', 'Delete transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Transkription.'
    });
  }
});

module.exports = router;
