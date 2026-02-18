/**
 * User Management Routes (Admin-only) - PostgreSQL
 * CRUD operations for users with search functionality
 */

const express = require('express');
const { query, queryOne, execute } = require('../db/database-pg');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { hashPassword } = require('../utils/passwordUtils');
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
    
    res.json({
      success: true,
      users: users.map(user => ({
        ...user,
        transcription_count: parseInt(user.transcription_count) || 0,
        isAdmin: user.is_admin
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
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
  
  // Validation
  if (!username || !password || !first_name) {
    return res.status(400).json({
      success: false,
      error: 'Benutzername, Passwort und Vorname sind erforderlich.'
    });
  }
  
  // Email validation (if provided)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Ungültige Email-Adresse.'
    });
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
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 12);
    
    // Insert user (PostgreSQL generates UUID automatically)
    const result = await execute(
      `INSERT INTO users (username, password_hash, first_name, last_name, email, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [username, password_hash, first_name, last_name || '', email || null, is_admin || false]
    );
    
    const userId = result.rows[0].id;
    
    // Log event
    await logAuditEvent({
      event_type: 'user_create',
      user_id: req.user.userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { created_user_id: userId, username },
      success: true
    });
    
    // Return created user (without password hash)
    const newUser = await queryOne(
      'SELECT id, username, first_name, last_name, email, is_admin, created_at FROM users WHERE id = $1', 
      [userId]
    );
    
    res.status(201).json({
      success: true,
      user: {
        ...newUser,
        isAdmin: newUser.is_admin
      }
    });
    
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Benutzers.'
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
router.get('/:userId/transcriptions', requireAdmin, async (req, res) => {
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

module.exports = router;
