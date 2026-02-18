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
  console.log('[transcriptions-pg] 📋 GET /api/transcriptions called');
  console.log('[transcriptions-pg] User:', req.user.userId);
  console.log('[transcriptions-pg] Is Admin:', req.user.isAdmin);
  
  try {
    let transcriptions;
    
    if (req.user.isAdmin) {
      // Admin: Alle Transkriptionen (ohne mp3_data für Performance)
      console.log('[transcriptions-pg] Loading ALL transcriptions (admin)');
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
      console.log('[transcriptions-pg] Loading user transcriptions for:', req.user.userId);
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
    
    console.log('[transcriptions-pg] ✅ Found transcriptions:', transcriptions.length);
    
    res.json({
      success: true,
      transcriptions
    });
  } catch (error) {
    console.error('[transcriptions-pg] ❌ Get transcriptions error:', error);
    console.error('[transcriptions-pg] Error stack:', error.stack);
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
  
  console.log('[transcriptions-pg] POST /api/transcriptions called');
  console.log('[transcriptions-pg] mp3_filename:', mp3_filename);
  console.log('[transcriptions-pg] transcription_text length:', transcription_text?.length);
  console.log('[transcriptions-pg] has_summary:', has_summary);
  console.log('[transcriptions-pg] target_user_id:', target_user_id);
  
  if (!mp3_filename) {
    console.error('[transcriptions-pg] Missing mp3_filename');
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
        console.error('[transcriptions-pg] Target user not found:', target_user_id);
        return res.status(400).json({
          success: false,
          error: 'Ziel-User nicht gefunden.'
        });
      }
      userId = target_user_id;
      console.log(`[transcriptions-pg] Admin ${req.user.username} erstellt/aktualisiert Transkription für User ${target_user_id}`);
    } else {
      console.log(`[transcriptions-pg] User ${req.user.username} erstellt/aktualisiert eigene Transkription`);
    }
    
    // MP3-Datei aus Request (Buffer)
    let mp3Data = null;
    let mp3Size = 0;
    let mp3Hash = null;
    
    if (req.file) {
      mp3Data = req.file.buffer;
      mp3Size = req.file.size;
      mp3Hash = calculateHash(mp3Data);
      console.log(`[transcriptions-pg] 📁 MP3-Datei hochgeladen: ${mp3_filename} (${mp3Size} bytes)`);
      console.log(`[transcriptions-pg] 🔑 MP3 Hash (SHA-256): ${mp3Hash}`);
    } else {
      console.log(`[transcriptions-pg] ⚠️ Keine MP3-Datei im Request`);
    }
    
    // Check if transcription already exists for this user and filename
    console.log(`[transcriptions-pg] Prüfe ob Transkription bereits existiert: user_id=${userId}, filename=${mp3_filename}`);
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
      console.log(`[transcriptions-pg] ♻️ Transkription existiert bereits (ID: ${transcriptionId})`);
      
      // Check if MP3 hash has changed
      if (mp3Hash && existingTranscription.mp3_hash) {
        mp3Changed = mp3Hash !== existingTranscription.mp3_hash;
        console.log(`[transcriptions-pg] 🔍 Hash-Vergleich:`);
        console.log(`  Alte MP3 Hash: ${existingTranscription.mp3_hash}`);
        console.log(`  Neue MP3 Hash: ${mp3Hash}`);
        console.log(`  MP3 geändert: ${mp3Changed ? '✅ JA' : '❌ NEIN (identisch)'}`);
      } else if (mp3Hash && !existingTranscription.mp3_hash) {
        // No hash stored yet, consider as changed
        mp3Changed = true;
        console.log(`[transcriptions-pg] ⚠️ Keine alte MP3-Hash vorhanden, MP3 wird gespeichert`);
      } else if (!mp3Hash) {
        // No new MP3 data provided
        mp3Changed = false;
        console.log(`[transcriptions-pg] ℹ️ Keine neue MP3-Datei im Request`);
      }
      
      // Prepare UPDATE query - only update fields that are provided
      let updateFields = [];
      let updateValues = [];
      let paramCounter = 1;
      
      if (transcription_text !== undefined && transcription_text !== null) {
        updateFields.push(`transcription_text = $${paramCounter++}`);
        updateValues.push(transcription_text);
        console.log(`[transcriptions-pg]   → Aktualisiere: transcription_text`);
      }
      
      if (has_summary !== undefined && has_summary !== null) {
        updateFields.push(`has_summary = $${paramCounter++}`);
        updateValues.push(has_summary);
        console.log(`[transcriptions-pg]   → Aktualisiere: has_summary = ${has_summary}`);
      }
      
      // Only update MP3 data if hash has changed
      if (mp3Data && mp3Changed) {
        updateFields.push(`mp3_data = $${paramCounter++}`);
        updateValues.push(mp3Data);
        updateFields.push(`mp3_size_bytes = $${paramCounter++}`);
        updateValues.push(mp3Size);
        updateFields.push(`mp3_hash = $${paramCounter++}`);
        updateValues.push(mp3Hash);
        console.log(`[transcriptions-pg]   → Aktualisiere: mp3_data, mp3_size_bytes, mp3_hash (MP3 hat sich geändert)`);
      } else if (mp3Data && !mp3Changed) {
        console.log(`[transcriptions-pg]   → Überspringe MP3-Update: Hash ist identisch (keine Änderung)`);
      }
      
      // Only proceed with UPDATE if there are fields to update
      if (updateFields.length === 0) {
        console.log(`[transcriptions-pg] ℹ️ Keine Änderungen erkannt, UPDATE übersprungen`);
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
      
      console.log('[transcriptions-pg] UPDATE query:', updateQuery);
      console.log('[transcriptions-pg] UPDATE values (excluding mp3_data):', updateValues.map((v, i) => 
        Buffer.isBuffer(v) ? `[Buffer ${v.length} bytes]` : v
      ));
      
      await execute(updateQuery, updateValues);
      console.log(`[transcriptions-pg] ✅ Transkription ${transcriptionId} erfolgreich aktualisiert`);
      
    } else {
      // INSERT new transcription
      console.log(`[transcriptions-pg] ➕ Transkription existiert noch nicht, INSERT wird durchgeführt`);
      
      const { generateMp3Id } = require('../utils/generateShortId');
      transcriptionId = generateMp3Id();
      console.log(`[transcriptions-pg] Generierte ID: ${transcriptionId}`);
      
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
      
      console.log(`[transcriptions-pg] ✅ Neue Transkription ${transcriptionId} erfolgreich erstellt`);
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
    console.log(`[transcriptions-pg] Audit event logged: ${isUpdate ? 'update' : 'insert'}`);
    
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
    
    console.log('[transcriptions-pg] Response:', {
      success: true,
      transcriptionId,
      action: isUpdate ? 'updated' : 'created',
      mp3_changed: isUpdate ? mp3Changed : true
    });
    
    res.status(isUpdate ? 200 : 201).json({
      success: true,
      transcriptionId: transcriptionId,
      id: transcriptionId, // Backwards compatibility
      transcription: savedTranscription,
      action: isUpdate ? 'updated' : 'created',
      mp3_changed: isUpdate ? mp3Changed : true
    });
    
  } catch (error) {
    console.error('[transcriptions-pg] Error:', error);
    console.error('[transcriptions-pg] Error name:', error.name);
    console.error('[transcriptions-pg] Error message:', error.message);
    console.error('[transcriptions-pg] Error stack:', error.stack);
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
  console.log('[transcriptions-pg] 📄 GET /api/transcriptions/:id called');
  console.log('[transcriptions-pg] Transcription ID:', req.params.id);
  console.log('[transcriptions-pg] Request user:', req.user.userId);
  console.log('[transcriptions-pg] Is Admin:', req.user.isAdmin);
  
  try {
    console.log('[transcriptions-pg] Fetching transcription from database...');
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
      console.warn('[transcriptions-pg] ⚠️ Transcription not found:', req.params.id);
      return res.status(404).json({
        success: false,
        error: 'Transkription nicht gefunden.'
      });
    }
    
    console.log('[transcriptions-pg] ✅ Transcription found');
    console.log('[transcriptions-pg] Owner:', transcription.user_id);
    console.log('[transcriptions-pg] Filename:', transcription.mp3_filename);
    console.log('[transcriptions-pg] Size:', transcription.mp3_size_bytes);
    
    // Check permissions: Own transcription or admin
    if (transcription.user_id !== req.user.userId && !req.user.isAdmin) {
      console.warn('[transcriptions-pg] ❌ Access denied - not owner and not admin');
      return res.status(403).json({
        success: false,
        error: 'Zugriff verweigert.'
      });
    }
    
    console.log('[transcriptions-pg] ✅ Access granted');
    
    res.json({
      success: true,
      transcription
    });
    
  } catch (error) {
    console.error('[transcriptions-pg] ❌ Get transcription error:', error);
    console.error('[transcriptions-pg] Error stack:', error.stack);
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
