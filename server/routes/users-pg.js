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
  
  console.log('[users-pg] Search endpoint called with query:', q);
  
  if (!q || q.trim() === '') {
    return res.json({
      success: true,
      users: []
    });
  }
  
  try {
    const searchTerm = `%${q.trim()}%`;
    
    console.log('[users-pg] Searching database with term:', searchTerm);
    
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
    
    console.log('[users-pg] Found users:', users.length, users);
    
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
    console.error('[users-pg] Search users error:', error);
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
  console.log('[users-pg] GET /api/users called');
  console.log('[users-pg] Request user:', req.user);
  console.log('[users-pg] Is admin:', req.user?.isAdmin);
  
  try {
    console.log('[users-pg] Fetching users from database...');
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
    
    console.log('[users-pg] Found users:', users.length);
    console.log('[users-pg] User details:', users);
    
    const mappedUsers = users.map(user => ({
      ...user,
      transcription_count: parseInt(user.transcription_count) || 0,
      isAdmin: user.is_admin
    }));
    
    console.log('[users-pg] Mapped users:', mappedUsers);
    console.log('[users-pg] Sending success response');
    
    res.json({
      success: true,
      users: mappedUsers
    });
  } catch (error) {
    console.error('[users-pg] Get users error:', error);
    console.error('[users-pg] Error message:', error.message);
    console.error('[users-pg] Error stack:', error.stack);
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
    console.error('Get user error:', error);
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
  
  console.log('[users-pg] POST /api/users - Create user called');
  console.log('[users-pg] Request body:', {
    username,
    password: password ? '***' : undefined,
    first_name,
    last_name,
    email,
    is_admin
  });
  
  // Validation
  if (!username || !password || !first_name) {
    console.error('[users-pg] Validation failed: missing required fields');
    return res.status(400).json({
      success: false,
      error: 'Benutzername, Passwort und Vorname sind erforderlich.'
    });
  }
  
  console.log('[users-pg] Validating username:', username);
  console.log('[users-pg] Username length:', username.length);
  console.log('[users-pg] Username contains special chars:', /[^a-zA-Z0-9_-]/.test(username));
  
  console.log('[users-pg] Validating first_name:', first_name);
  console.log('[users-pg] First name length:', first_name.length);
  console.log('[users-pg] First name contains special chars:', /[^a-zA-Z0-9\s_-]/.test(first_name));
  
  if (last_name) {
    console.log('[users-pg] Validating last_name:', last_name);
    console.log('[users-pg] Last name length:', last_name.length);
    console.log('[users-pg] Last name contains special chars:', /[^a-zA-Z0-9\s_-]/.test(last_name));
  }
  
  // Email validation (if provided)
  if (email) {
    console.log('[users-pg] Validating email:', email);
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    console.log('[users-pg] Email is valid:', isValidEmail);
    
    if (!isValidEmail) {
      console.error('[users-pg] Email validation failed');
      return res.status(400).json({
        success: false,
        error: 'Ungültige Email-Adresse.'
      });
    }
  }
  
  try {
    // Check if username already exists
    console.log('[users-pg] Checking if username already exists...');
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) {
      console.error('[users-pg] Username already exists:', username);
      return res.status(409).json({
        success: false,
        error: 'Benutzername bereits vergeben.'
      });
    }
    console.log('[users-pg] Username is available');
    
    // Check if email already exists (if provided)
    if (email) {
      console.log('[users-pg] Checking if email already exists...');
      const existingEmail = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail) {
        console.error('[users-pg] Email already exists:', email);
        return res.status(409).json({
          success: false,
          error: 'Email-Adresse bereits vergeben.'
        });
      }
      console.log('[users-pg] Email is available');
    }
    
    // Generate user ID
    const userId = generateUserId();
    console.log('[users-pg] Generated user ID:', userId);
    
    // Hash password
    console.log('[users-pg] Hashing password...');
    const password_hash = await bcrypt.hash(password, 12);
    console.log('[users-pg] Password hashed successfully');
    
    // Insert user with explicit ID
    console.log('[users-pg] Inserting user into database...');
    console.log('[users-pg] Insert params:', {
      id: userId,
      username,
      password_hash: '***',
      first_name,
      last_name: last_name || '',
      email: email || null,
      is_admin: is_admin || false
    });
    
    const result = await execute(
      `INSERT INTO users (id, username, password_hash, first_name, last_name, email, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, username, password_hash, first_name, last_name || '', email || null, is_admin || false]
    );
    
    console.log('[users-pg] Insert result:', result.rows);
    const insertedUserId = result.rows[0].id;
    console.log('[users-pg] User created with ID:', insertedUserId);
    
    // Log event
    console.log('[users-pg] Logging audit event...');
    await logAuditEvent({
      event_type: 'user_create',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { created_user_id: insertedUserId, username },
      success: true
    });
    
    // Return created user (without password hash)
    console.log('[users-pg] Fetching created user data...');
    const newUser = await queryOne(
      'SELECT id, username, first_name, last_name, email, is_admin, created_at FROM users WHERE id = $1', 
      [insertedUserId]
    );
    
    console.log('[users-pg] Created user:', newUser);
    console.log('[users-pg] Sending success response');
    
    res.status(201).json({
      success: true,
      user: {
        ...newUser,
        isAdmin: newUser.is_admin,
        transcription_count: 0
      }
    });
    
  } catch (error) {
    console.error('[users-pg] ❌ Create user error:', error);
    console.error('[users-pg] Error name:', error.name);
    console.error('[users-pg] Error message:', error.message);
    console.error('[users-pg] Error code:', error.code);
    console.error('[users-pg] Error stack:', error.stack);
    console.error('[users-pg] Full error object:', JSON.stringify(error, null, 2));
    
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
    console.error('Update user error:', error);
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
    console.error('Delete user error:', error);
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
  console.log('[users-pg] GET /:userId/transcriptions called');
  console.log('[users-pg] Requested userId:', req.params.userId);
  console.log('[users-pg] Request user:', req.user);
  
  // Check: User can only access their own transcriptions, unless admin
  if (req.user.userId !== req.params.userId && !req.user.isAdmin) {
    console.warn('[users-pg] ❌ Access denied: User', req.user.userId, 'tried to access transcriptions of', req.params.userId);
    return res.status(403).json({
      success: false,
      error: 'Zugriff verweigert. Sie können nur Ihre eigenen Transkriptionen sehen.'
    });
  }
  
  try {
    console.log('[users-pg] Fetching transcriptions for user:', req.params.userId);
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
    
    console.log('[users-pg] Found transcriptions:', transcriptions.length);
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
 * PATCH /api/users/:userId/upload-directory
 * Update user's last upload directory (for admins)
 */
router.patch('/:userId/upload-directory', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const { directory } = req.body;
  
  console.log('[users-pg] PATCH /upload-directory called');
  console.log('[users-pg] User ID:', userId);
  console.log('[users-pg] Directory:', directory);
  console.log('[users-pg] Request user:', req.user.userId);
  
  try {
    // Check authorization: User can only update their own directory
    if (userId !== req.user.userId) {
      console.error('[users-pg] Unauthorized: User trying to update another user\'s directory');
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung, das Verzeichnis eines anderen Benutzers zu ändern.'
      });
    }
    
    // Check if user exists
    const user = await queryOne('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
    if (!user) {
      console.error('[users-pg] User not found:', userId);
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    // Update last_upload_directory
    console.log('[users-pg] Updating last_upload_directory...');
    await execute(
      'UPDATE users SET last_upload_directory = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [directory || null, userId]
    );
    
    console.log('[users-pg] Directory updated successfully');
    
    res.json({
      success: true,
      message: 'Upload-Verzeichnis gespeichert.',
      directory
    });
    
  } catch (error) {
    console.error('[users-pg] ❌ Update upload directory error:', error);
    console.error('[users-pg] Error message:', error.message);
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
  
  console.log('[users-pg] GET /upload-directory called');
  console.log('[users-pg] User ID:', userId);
  console.log('[users-pg] Request user:', req.user.userId);
  
  try {
    // Check authorization
    if (userId !== req.user.userId) {
      console.error('[users-pg] Unauthorized: User trying to access another user\'s directory');
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
      console.error('[users-pg] User not found:', userId);
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    console.log('[users-pg] Last upload directory:', user.last_upload_directory);
    
    res.json({
      success: true,
      directory: user.last_upload_directory || null
    });
    
  } catch (error) {
    console.error('[users-pg] ❌ Get upload directory error:', error);
    console.error('[users-pg] Error message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Verzeichnisses.'
    });
  }
});

/**
 * GET /api/users/:userId/last-transcription
 * Get user's last/most recent transcription
 */
router.get('/:userId/last-transcription', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  
  console.log('[users-pg] GET /last-transcription called');
  console.log('[users-pg] User ID:', userId);
  console.log('[users-pg] Request user:', req.user.userId);
  
  try {
    // Check authorization
    if (userId !== req.user.userId && !req.user.isAdmin) {
      console.error('[users-pg] Unauthorized: User trying to access another user\'s transcription');
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung.'
      });
    }
    
    // Get user's most recent transcription
    const transcription = await queryOne(
      `SELECT id, mp3_filename, transcription_text, has_summary, created_at, updated_at
       FROM transcriptions
       WHERE user_id = $1
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
      [userId]
    );
    
    if (!transcription) {
      console.log('[users-pg] No transcription found for user');
      return res.json({
        success: true,
        transcription: null
      });
    }
    
    console.log('[users-pg] Last transcription found:', transcription.id, transcription.mp3_filename);
    
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
    console.error('[users-pg] ❌ Get last transcription error:', error);
    console.error('[users-pg] Error message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der letzten Transkription.'
    });
  }
});

module.exports = router;
