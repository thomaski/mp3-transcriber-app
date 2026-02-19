/**
 * Public Access Route (v2.0)
 * Password-protected access to user MP3 lists or direct MP3 transcriptions
 * Password = User's first name (Vorname)
 */

const express = require('express');
const { query, queryOne, execute } = require('../db/database-pg');
const { logAuditEvent } = require('../utils/logger');
const { isUserIdPattern, isMp3IdPattern, isValidIdFormat } = require('../utils/generateShortId');
const { generateToken } = require('../middleware/auth');
const logger = require('../../logger');

const router = express.Router();

/**
 * GET /api/public/check/:id
 * Check ID type and get basic info (no password required yet)
 * Returns: { type: 'user'|'mp3', requiresPassword: true }
 */
router.get('/check/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Validate ID format
    if (!isValidIdFormat(id)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID. IDs müssen 6 alphanumerische Zeichen sein.'
      });
    }
    
    // Check if ID pattern matches user or MP3
    if (isUserIdPattern(id)) {
      // Check if user exists
      const user = await queryOne('SELECT id, first_name, last_name FROM users WHERE id = $1', [id]);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Benutzer nicht gefunden.'
        });
      }
      
      return res.json({
        success: true,
        type: 'user',
        name: `${user.first_name} ${user.last_name}`.trim(),
        requiresPassword: true
      });
    } else if (isMp3IdPattern(id)) {
      // Check if MP3 exists
      const mp3 = await queryOne(
        `SELECT t.id, t.mp3_filename, u.first_name, u.last_name 
         FROM transcriptions t 
         INNER JOIN users u ON t.user_id = u.id 
         WHERE t.id = $1`,
        [id]
      );
      
      if (!mp3) {
        return res.status(404).json({
          success: false,
          error: 'MP3-Transkription nicht gefunden.'
        });
      }
      
      return res.json({
        success: true,
        type: 'mp3',
        mp3_filename: mp3.mp3_filename,
        author: `${mp3.first_name} ${mp3.last_name}`.trim(),
        requiresPassword: true
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID.'
      });
    }
    
  } catch (error) {
    logger.error('PUBLIC_ACCESS', 'Check ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Prüfen der ID.'
    });
  }
});

/**
 * POST /api/public/verify/:id
 * Verify password (user's first name) for access
 * Body: { password: string }
 * Returns: { success: true, type: 'user'|'mp3' }
 */
router.post('/verify/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  try {
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Passwort erforderlich.'
      });
    }
    
    // Validate ID format
    if (!isValidIdFormat(id)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID.'
      });
    }
    
    let userId;
    let correctPassword;
    
    // Get user ID and correct password based on ID type
    if (isUserIdPattern(id)) {
      // User ID - verify directly
      const user = await queryOne('SELECT id, first_name FROM users WHERE id = $1', [id]);
      
      if (!user) {
        logAuditEvent({
          event_type: 'public_access_denied',
          user_id: null,
          ip_address: req.ip,
          user_agent: req.get('user-agent') || '',
          details: { id, reason: 'user_not_found' },
          success: false
        });
        
        return res.status(404).json({
          success: false,
          error: 'Benutzer nicht gefunden.'
        });
      }
      
      userId = user.id;
      correctPassword = user.first_name;
      
    } else if (isMp3IdPattern(id)) {
      // MP3 ID - get user from transcription
      const mp3 = await queryOne(
        `SELECT u.id, u.first_name 
         FROM transcriptions t 
         INNER JOIN users u ON t.user_id = u.id 
         WHERE t.id = $1`,
        [id]
      );
      
      if (!mp3) {
        logAuditEvent({
          event_type: 'public_access_denied',
          user_id: null,
          ip_address: req.ip,
          user_agent: req.get('user-agent') || '',
          details: { id, reason: 'mp3_not_found' },
          success: false
        });
        
        return res.status(404).json({
          success: false,
          error: 'MP3-Transkription nicht gefunden.'
        });
      }
      
      userId = mp3.id;
      correctPassword = mp3.first_name;
      
    } else {
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID.'
      });
    }
    
    // Verify password (case-insensitive)
    if (password.toLowerCase() !== correctPassword.toLowerCase()) {
      logAuditEvent({
        event_type: 'public_access_denied',
        user_id: userId,
        ip_address: req.ip,
        user_agent: req.get('user-agent') || '',
        details: { id, reason: 'wrong_password' },
        success: false
      });
      
      return res.status(401).json({
        success: false,
        error: 'Falsches Passwort.'
      });
    }
    
    // Get full user data for token generation
    const fullUser = await queryOne(
      'SELECT id, username, first_name, last_name, is_admin FROM users WHERE id = $1',
      [userId]
    );
    
    // Generate temporary JWT token (expires in 24 hours for public access)
    const token = generateToken({
      userId: fullUser.id,
      username: fullUser.username,
      isAdmin: false, // Public access is always non-admin
      publicAccess: true, // Mark as public access session
      expiresIn: '24h'
    });
    
    logAuditEvent({
      event_type: 'public_access_verified',
      user_id: userId,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { id, type: isUserIdPattern(id) ? 'user' : 'mp3' },
      success: true
    });
    
    logger.log('PUBLIC_ACCESS', `✓ Password verified for ID: ${id} (type: ${isUserIdPattern(id) ? 'user' : 'mp3'})`);
    
    // Return success with token and user data
    const responseType = isUserIdPattern(id) ? 'user' : 'mp3';
    
    res.json({
      success: true,
      type: responseType,
      token: token,
      user: {
        id: fullUser.id,
        userId: fullUser.id, // Keep for backward compatibility
        username: fullUser.username,
        first_name: fullUser.first_name, // WICHTIG: snake_case wie in auth.js!
        last_name: fullUser.last_name,   // WICHTIG: snake_case wie in auth.js!
        isAdmin: false, // Public access is never admin
        publicAccess: true
      }
    });
    
  } catch (error) {
    logger.error('PUBLIC_ACCESS', 'Verify password error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Passwort-Verifizierung.'
    });
  }
});

/**
 * GET /api/public/user/:id
 * Get user's MP3 list (password must be verified first via /verify)
 * For security, password is checked again via query param ?pw=...
 */
router.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  const { pw } = req.query; // password from query
  
  try {
    // Validate ID format
    if (!isValidIdFormat(id) || !isUserIdPattern(id)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Benutzer-ID.'
      });
    }
    
    // Get user
    const user = await queryOne('SELECT id, first_name, last_name FROM users WHERE id = $1', [id]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    
    // Verify password again
    if (!pw || pw.toLowerCase() !== user.first_name.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: 'Passwort erforderlich oder falsch.'
      });
    }
    
    // Get user's MP3 transcriptions
    const mp3s = await query(
      `SELECT id, mp3_filename, has_summary, created_at, updated_at
       FROM transcriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    
    // Log access
    logAuditEvent({
      event_type: 'public_user_access',
      user_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { id, mp3_count: mp3s.length },
      success: true
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim()
      },
      transcriptions: mp3s
    });
    
  } catch (error) {
    logger.error('PUBLIC_ACCESS', 'Error in GET /user/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der MP3-Liste.'
    });
  }
});

/**
 * GET /api/public/mp3/:id
 * Get MP3 transcription (password must be verified first via query param ?pw=...)
 * EditMode = false (read-only)
 */
router.get('/mp3/:id', async (req, res) => {
  const { id } = req.params;
  const { pw } = req.query; // password from query
  
  try {
    // Validate ID format
    if (!isValidIdFormat(id) || !isMp3IdPattern(id)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige MP3-ID.'
      });
    }
    
    // Get MP3 with user info
    const mp3 = await queryOne(
      `SELECT 
        t.id,
        t.mp3_filename,
        t.transcription_text,
        t.has_summary,
        t.created_at,
        t.updated_at,
        u.id as user_id,
        u.first_name,
        u.last_name
       FROM transcriptions t
       INNER JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id]
    );
    
    if (!mp3) {
      return res.status(404).json({
        success: false,
        error: 'MP3-Transkription nicht gefunden.'
      });
    }
    
    // Verify password
    if (!pw || pw.toLowerCase() !== mp3.first_name.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: 'Passwort erforderlich oder falsch.'
      });
    }
    
    // Log access
    logAuditEvent({
      event_type: 'public_mp3_access',
      user_id: mp3.user_id,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { id, mp3_filename: mp3.mp3_filename },
      success: true
    });
    
    res.json({
      success: true,
      transcription: {
        id: mp3.id,
        mp3_filename: mp3.mp3_filename,
        transcription_text: mp3.transcription_text,
        has_summary: mp3.has_summary === true, // PostgreSQL boolean
        created_at: mp3.created_at,
        updated_at: mp3.updated_at,
        author: `${mp3.first_name} ${mp3.last_name}`.trim(),
        editMode: false // Read-only!
      }
    });
    
  } catch (error) {
    logger.error('PUBLIC_ACCESS', 'Get MP3 error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der MP3-Transkription.'
    });
  }
});

module.exports = router;
