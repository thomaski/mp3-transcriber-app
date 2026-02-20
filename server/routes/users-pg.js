/**
 * User Management Routes (Admin-only) - PostgreSQL
 * CRUD operations for users with search functionality
 */

const express = require('express');
const { query, queryOne, execute } = require('../db/database-pg');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { hashPassword } = require('../utils/passwordUtils');
const { generateUserId } = require('../utils/generateShortId'); // Added
const { logAuditEvent } = require('../utils/logger');
const bcrypt = require('bcrypt');
const logger = require('../../logger');

const router = express.Router();

// All routes require admin privileges (except search which is checked in route)
router.use(authenticateJWT);

/**
 * GET /api/users/search
 * Search users by username or name (for autocomplete) - Admin only
 * Must be placed BEFORE /:userId route to avoid conflict
 */
router.get('/search', requireAdmin, async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.json({
      success: true,
      users: []
    });
  }
  
  try {
    const searchTerm = `%${q.trim()}%`;
    
    const users = await query(
      `SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.is_admin
      FROM users u
      WHERE u.username ILIKE $1 
         OR u.first_name ILIKE $1 
         OR u.last_name ILIKE $1
         OR (u.first_name || ' ' || u.last_name) ILIKE $1
      ORDER BY u.first_name ASC, u.last_name ASC
      LIMIT 10`,
      [searchTerm]
    );
    
    logger.debug('USERS', `Search '${q}' found ${users.length} users`);
    
    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        isAdmin: user.is_admin,
        displayName: `${user.first_name} ${user.last_name} (${user.username})`.trim()
      }))
    });
  } catch (error) {
    logger.error('USERS', 'Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Benutzersuche.'
    });
  }
});

/**
 * GET /api/users
 * Get all users with transcription count
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await query(
      `SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.is_admin,
        u.created_at,
        u.updated_at,
        COUNT(t.id) as transcription_count
      FROM users u
      LEFT JOIN transcriptions t ON u.id = t.user_id
      GROUP BY u.id
      ORDER BY u.first_name ASC, u.last_name ASC`
    );
    
    logger.debug('USERS', `GET /api/users - Found ${users.length} users`);
    
    const mappedUsers = users.map(user => ({
      ...user,
      transcription_count: parseInt(user.transcription_count) || 0,
      isAdmin: user.is_admin
    }));
    
    res.json({
      success: true,
      users: mappedUsers
    });
  } catch (error) {
    logger.error('USERS', 'Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Benutzer.'
    });
  }
});

/**
 * GET /api/users/:userId
 * Get single user by ID
 */
router.get('/:userId', requireAdmin, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT id, username, first_name, last_name, email, is_admin, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.params.userId]
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    res.json({
      success: true,
      user: {
        ...user,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    logger.error('USERS', 'Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Benutzers.'
    });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', requireAdmin, async (req, res) => {
  const { username, password, first_name, last_name, email, is_admin } = req.body;
  
  // Validation
  if (!username || !password || !first_name) {
    return res.status(400).json({
      success: false,
      error: 'Benutzername, Passwort und Vorname sind erforderlich.'
    });
  }
  
  // Email validation (if provided)
  if (email) {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Email-Adresse.'
      });
    }
  }
  
  try {
    // Check if username already exists
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Benutzername bereits vergeben.'
      });
    }
    
    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'Email-Adresse bereits vergeben.'
        });
      }
    }
    
    // Generate user ID and hash password
    const userId = generateUserId();
    const password_hash = await bcrypt.hash(password, 12);
    
    // Insert user with explicit ID
    const result = await execute(
      `INSERT INTO users (id, username, password_hash, first_name, last_name, email, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, username, password_hash, first_name, last_name || '', email || null, is_admin || false]
    );
    
    const insertedUserId = result.rows[0].id;
    logger.log('USERS', `✓ User created: ${username} (ID: ${insertedUserId})`);
    
    // Log event
    await logAuditEvent({
      event_type: 'user_create',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { created_user_id: insertedUserId, username },
      success: true
    });
    
    // Return created user (without password hash)
    const newUser = await queryOne(
      'SELECT id, username, first_name, last_name, email, is_admin, created_at FROM users WHERE id = $1', 
      [insertedUserId]
    );
    
    res.status(201).json({
      success: true,
      user: {
        ...newUser,
        isAdmin: newUser.is_admin,
        transcription_count: 0
      }
    });
    
  } catch (error) {
    logger.error('USERS', '❌ Create user error:', error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Erstellen des Benutzers: ${error.message}`
    });
  }
});

/**
 * PUT /api/users/:userId
 * Update user
 */
router.put('/:userId', requireAdmin, async (req, res) => {
  const { username, password, first_name, last_name, email, is_admin } = req.body;
  const userId = req.params.userId;
  
  // Email validation (if provided)
  if (email && email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Ungültige Email-Adresse.'
    });
  }
  
  try {
    // Check if user exists
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    // Check if username is already taken by another user
    if (username) {
      const existing = await queryOne('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Benutzername bereits vergeben.'
        });
      }
    }
    
    // Check if email is already taken by another user
    if (email && email.trim() !== '') {
      const existingEmail = await queryOne('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'Email-Adresse bereits vergeben.'
        });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email.trim() === '' ? null : email);
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = $${paramIndex++}`);
      values.push(is_admin);
    }
    if (password) {
      const password_hash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(password_hash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keine Änderungen angegeben.'
      });
    }
    
    values.push(userId);
    
    await execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    logger.log('USERS', `✓ User updated: ${userId}`);
    
    // Log event
    await logAuditEvent({
      event_type: 'user_update',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { updated_user_id: userId, fields: updates },
      success: true
    });
    
    // Return updated user
    const updatedUser = await queryOne(
      'SELECT id, username, first_name, last_name, email, is_admin, created_at, updated_at FROM users WHERE id = $1', 
      [userId]
    );
    
    res.json({
      success: true,
      user: {
        ...updatedUser,
        isAdmin: updatedUser.is_admin
      }
    });
    
  } catch (error) {
    logger.error('USERS', 'Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Benutzers.'
    });
  }
});

/**
 * DELETE /api/users/:userId
 * Delete user (and cascade delete transcriptions)
 */
router.delete('/:userId', requireAdmin, async (req, res) => {
  const userId = req.params.userId;
  
  try {
    // Prevent self-deletion
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: 'Sie können sich nicht selbst löschen.'
      });
    }
    
    // Check if user exists
    const user = await queryOne('SELECT username FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    // Delete user (transcriptions will be cascade deleted due to FOREIGN KEY)
    await execute('DELETE FROM users WHERE id = $1', [userId]);
    
    logger.log('USERS', `✓ User deleted: ${userId} (${user.username})`);
    
    // Log event
    await logAuditEvent({
      event_type: 'user_delete',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { deleted_user_id: userId, username: user.username },
      success: true
    });
    
    res.json({
      success: true,
      message: 'Benutzer erfolgreich gelöscht.'
    });
    
  } catch (error) {
    logger.error('USERS', 'Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Benutzers.'
    });
  }
});

/**
 * GET /api/users/:userId/transcriptions
 * Get all transcriptions for a user
 */
router.get('/:userId/transcriptions', async (req, res) => {
  // Check: User can only access their own transcriptions, unless admin
  if (req.user.userId !== req.params.userId && !req.user.isAdmin) {
    logger.log('USERS', `Access denied: User ${req.user.userId} tried to access transcriptions of ${req.params.userId}`);
    return res.status(403).json({
      success: false,
      error: 'Zugriff verweigert. Sie können nur Ihre eigenen Transkriptionen sehen.'
    });
  }
  
  try {
    const transcriptions = await query(
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
      [req.params.userId]
    );
    
    logger.debug('USERS', `Found ${transcriptions.length} transcriptions for user ${req.params.userId}`);
    res.json({
      success: true,
      transcriptions
    });
  } catch (error) {
    logger.error('USERS', 'Get transcriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Transkriptionen.'
    });
  }
});

/**
 * PATCH /api/users/:userId/upload-directory
 * Update user's last upload directory (for admins)
 */
router.patch('/:userId/upload-directory', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const { directory } = req.body;
  
  try {
    // Check authorization: User can only update their own directory
    if (userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung, das Verzeichnis eines anderen Benutzers zu ändern.'
      });
    }
    
    // Check if user exists
    const user = await queryOne('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    // Update last_upload_directory
    await execute(
      'UPDATE users SET last_upload_directory = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [directory || null, userId]
    );
    
    logger.log('USERS', `✓ Upload directory updated for user ${userId}: ${directory}`);
    
    res.json({
      success: true,
      message: 'Upload-Verzeichnis gespeichert.',
      directory
    });
    
  } catch (error) {
    logger.error('USERS', 'Update upload directory error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern des Verzeichnisses.'
    });
  }
});

/**
 * GET /api/users/:userId/upload-directory
 * Get user's last upload directory
 */
router.get('/:userId/upload-directory', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Check authorization
    if (userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung.'
      });
    }
    
    // Get user's last upload directory
    const user = await queryOne(
      'SELECT last_upload_directory FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    res.json({
      success: true,
      directory: user.last_upload_directory || null
    });
    
  } catch (error) {
    logger.error('USERS', 'Get upload directory error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Verzeichnisses.'
    });
  }
});

/**
 * GET /api/users/:userId/last-transcription
 * Get user's last edited transcription.
 * Priorität: 1) last_transcription_id (explizit gesetzt)
 *            2) Neueste Transkription nach updated_at (Fallback)
 */
router.get('/:userId/last-transcription', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Check authorization
    if (userId !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung.'
      });
    }

    // Priorität 1: Explizit gespeicherte letzte Transkription
    const userRow = await queryOne(
      'SELECT last_transcription_id FROM users WHERE id = $1',
      [userId]
    );

    let transcription = null;

    if (userRow && userRow.last_transcription_id) {
      transcription = await queryOne(
        `SELECT id, mp3_filename, transcription_text, has_summary, created_at, updated_at
         FROM transcriptions
         WHERE id = $1 AND user_id = $2`,
        [userRow.last_transcription_id, userId]
      );
      if (transcription) {
        logger.debug('USERS', `Last transcription (via last_transcription_id) for user ${userId}: ${transcription.mp3_filename}`);
      }
    }

    // Priorität 2: Fallback – neueste nach updated_at
    if (!transcription) {
      transcription = await queryOne(
        `SELECT id, mp3_filename, transcription_text, has_summary, created_at, updated_at
         FROM transcriptions
         WHERE user_id = $1
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1`,
        [userId]
      );
      if (transcription) {
        logger.debug('USERS', `Last transcription (fallback updated_at) for user ${userId}: ${transcription.mp3_filename}`);
      }
    }
    
    if (!transcription) {
      return res.json({ success: true, transcription: null });
    }
    
    res.json({
      success: true,
      transcription: {
        id: transcription.id,
        mp3_filename: transcription.mp3_filename,
        transcription_text: transcription.transcription_text,
        has_summary: transcription.has_summary,
        created_at: transcription.created_at,
        updated_at: transcription.updated_at
      }
    });
    
  } catch (error) {
    logger.error('USERS', 'Get last transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der letzten Transkription.'
    });
  }
});

/**
 * PATCH /api/users/:userId/last-transcription
 * Speichert die zuletzt bearbeitete Transkription für einen Admin-User
 */
router.patch('/:userId/last-transcription', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const { transcriptionId } = req.body;

  try {
    // Nur der eigene User darf sein last_transcription_id setzen
    if (userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung.'
      });
    }

    if (!transcriptionId) {
      return res.status(400).json({ success: false, error: 'transcriptionId fehlt.' });
    }

    // Prüfen ob die Transkription diesem User gehört
    const trans = await queryOne(
      'SELECT id FROM transcriptions WHERE id = $1 AND user_id = $2',
      [transcriptionId, userId]
    );

    // Admin-Transkriptionen können auch fremden Usern gehören – daher nur prüfen ob Transkription existiert
    // (falls trans null ist und Admin → egal, wir prüfen nur ob sie überhaupt existiert)
    const transExists = trans || (req.user.isAdmin
      ? await queryOne('SELECT id FROM transcriptions WHERE id = $1', [transcriptionId])
      : null);

    if (!transExists) {
      return res.status(404).json({ success: false, error: 'Transkription nicht gefunden.' });
    }

    await execute(
      'UPDATE users SET last_transcription_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [transcriptionId, userId]
    );

    logger.debug('USERS', `✓ last_transcription_id updated for user ${userId}: ${transcriptionId}`);

    res.json({ success: true, transcriptionId });

  } catch (error) {
    logger.error('USERS', 'Update last transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern der letzten Transkription.'
    });
  }
});

module.exports = router;
