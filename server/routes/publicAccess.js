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

const router = express.Router();

/**
 * GET /api/public/check/:id
 * Check ID type and get basic info (no password required yet)
 * Returns: { type: 'user'|'mp3', requiresPassword: true }
 */
router.get('/check/:id', async (req, res) => {
  const { id } = req.params;
  console.log('[publicAccess] GET /check/:id called with ID:', id);
  
  try {
    // Validate ID format
    if (!isValidIdFormat(id)) {
      console.warn('[publicAccess] Invalid ID format:', id);
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID. IDs müssen 6 alphanumerische Zeichen sein.'
      });
    }
    
    // Check if ID pattern matches user or MP3
    if (isUserIdPattern(id)) {
      console.log('[publicAccess] ID pattern matches user:', id);
      // Check if user exists
      const user = await queryOne('SELECT id, first_name, last_name FROM users WHERE id = $1', [id]);
      
      if (!user) {
        console.warn('[publicAccess] User not found for ID:', id);
        return res.status(404).json({
          success: false,
          error: 'Benutzer nicht gefunden.'
        });
      }
      
      console.log('[publicAccess] User found:', { id: user.id, name: `${user.first_name} ${user.last_name}`.trim() });
      return res.json({
        success: true,
        type: 'user',
        name: `${user.first_name} ${user.last_name}`.trim(),
        requiresPassword: true
      });
    } else if (isMp3IdPattern(id)) {
      console.log('[publicAccess] ID pattern matches MP3:', id);
      // Check if MP3 exists
      const mp3 = await queryOne(
        `SELECT t.id, t.mp3_filename, u.first_name, u.last_name 
         FROM transcriptions t 
         INNER JOIN users u ON t.user_id = u.id 
         WHERE t.id = $1`,
        [id]
      );
      
      if (!mp3) {
        console.warn('[publicAccess] MP3 not found for ID:', id);
        return res.status(404).json({
          success: false,
          error: 'MP3-Transkription nicht gefunden.'
        });
      }
      
      console.log('[publicAccess] MP3 found:', { id: mp3.id, filename: mp3.mp3_filename });
      return res.json({
        success: true,
        type: 'mp3',
        mp3_filename: mp3.mp3_filename,
        author: `${mp3.first_name} ${mp3.last_name}`.trim(),
        requiresPassword: true
      });
    } else {
      console.warn('[publicAccess] ID pattern does not match user or MP3:', id);
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID.'
      });
    }
    
  } catch (error) {
    console.error('[publicAccess] Check ID error:', error);
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
  console.log('[publicAccess] POST /verify/:id called with ID:', id);
  console.log('[publicAccess] Password received:', password ? `'${password}' (length: ${password.length})` : 'EMPTY');
  
  try {
    if (!password) {
      console.warn('[publicAccess] No password provided');
      return res.status(400).json({
        success: false,
        error: 'Passwort erforderlich.'
      });
    }
    
    // Validate ID format
    if (!isValidIdFormat(id)) {
      console.warn('[publicAccess] Invalid ID format:', id);
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID.'
      });
    }
    
    let userId;
    let correctPassword;
    
    // Get user ID and correct password based on ID type
    if (isUserIdPattern(id)) {
      console.log('[publicAccess] Verifying for user ID:', id);
      // User ID - verify directly
      const user = await queryOne('SELECT id, first_name FROM users WHERE id = $1', [id]);
      
      if (!user) {
        console.warn('[publicAccess] User not found for verify:', id);
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
      console.log('[publicAccess] Expected password for user:', `'${correctPassword}'`);
      
    } else if (isMp3IdPattern(id)) {
      console.log('[publicAccess] Verifying for MP3 ID:', id);
      // MP3 ID - get user from transcription
      const mp3 = await queryOne(
        `SELECT u.id, u.first_name 
         FROM transcriptions t 
         INNER JOIN users u ON t.user_id = u.id 
         WHERE t.id = $1`,
        [id]
      );
      
      if (!mp3) {
        console.warn('[publicAccess] MP3 not found for verify:', id);
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
      console.log('[publicAccess] Expected password for MP3 owner:', `'${correctPassword}'`);
      
    } else {
      console.warn('[publicAccess] ID pattern does not match user or MP3 for verify:', id);
      return res.status(400).json({
        success: false,
        error: 'Ungültige ID.'
      });
    }
    
    // Verify password (case-insensitive)
    console.log('[publicAccess] Comparing passwords:', {
      provided: password.toLowerCase(),
      expected: correctPassword.toLowerCase(),
      match: password.toLowerCase() === correctPassword.toLowerCase()
    });
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
    
    // Log successful verification
    console.log('[publicAccess] Password verified successfully for user:', userId);
    
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
    
    // Return success with token and user data
    const responseType = isUserIdPattern(id) ? 'user' : 'mp3';
    console.log('[publicAccess] ✅✅✅ PASSWORD VERIFIED SUCCESSFULLY ✅✅✅');
    console.log('[publicAccess] Response type:', responseType);
    console.log('[publicAccess] User ID:', fullUser.id);
    console.log('[publicAccess] Token generated (first 20 chars):', token.substring(0, 20) + '...');
    console.log('[publicAccess] Token length:', token.length);
    console.log('[publicAccess] Full user object:', JSON.stringify({
      userId: fullUser.id,
      username: fullUser.username,
      firstName: fullUser.first_name,
      lastName: fullUser.last_name,
      isAdmin: false,
      publicAccess: true
    }, null, 2));
    
    const responseData = {
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
    };
    
    console.log('[publicAccess] 🚀🚀🚀 SENDING RESPONSE 🚀🚀🚀');
    console.log('[publicAccess] Response data:', JSON.stringify(responseData, null, 2));
    
    res.json(responseData);
    
  } catch (error) {
    console.error('[publicAccess] Verify password error:', error);
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
  
  console.log('[publicAccess] GET /user/:id called');
  console.log('[publicAccess] User ID:', id);
  console.log('[publicAccess] Password provided:', pw ? `YES (${pw.length} chars)` : 'NO');
  console.log('[publicAccess] Full query params:', req.query);
  
  try {
    // Validate ID format
    console.log('[publicAccess] Validating ID format...');
    if (!isValidIdFormat(id) || !isUserIdPattern(id)) {
      console.error('[publicAccess] Invalid ID format:', id);
      return res.status(400).json({
        success: false,
        error: 'Ungültige Benutzer-ID.'
      });
    }
    console.log('[publicAccess] ID format valid');
    
    // Get user
    console.log('[publicAccess] Fetching user from database...');
    const user = await queryOne('SELECT id, first_name, last_name FROM users WHERE id = $1', [id]);
    console.log('[publicAccess] Database query result:', user);
    
    if (!user) {
      console.error('[publicAccess] User not found for ID:', id);
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden.'
      });
    }
    console.log('[publicAccess] User found:', user.first_name, user.last_name);
    
    // Verify password again
    console.log('[publicAccess] Verifying password...');
    console.log('[publicAccess] Provided password:', pw);
    console.log('[publicAccess] Expected password (first_name):', user.first_name);
    console.log('[publicAccess] Match (case-insensitive):', pw?.toLowerCase() === user.first_name.toLowerCase());
    
    if (!pw || pw.toLowerCase() !== user.first_name.toLowerCase()) {
      console.error('[publicAccess] Password verification failed!');
      console.error('[publicAccess] Provided:', pw?.toLowerCase());
      console.error('[publicAccess] Expected:', user.first_name.toLowerCase());
      return res.status(401).json({
        success: false,
        error: 'Passwort erforderlich oder falsch.'
      });
    }
    console.log('[publicAccess] Password verified successfully');
    
    // Get user's MP3 transcriptions
    console.log('[publicAccess] Fetching MP3 transcriptions for user...');
    const mp3s = await query(
      `SELECT id, mp3_filename, has_summary, created_at, updated_at
       FROM transcriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    console.log('[publicAccess] Found', mp3s.length, 'MP3 transcriptions');
    
    // Log access
    console.log('[publicAccess] Logging audit event...');
    logAuditEvent({
      event_type: 'public_user_access',
      user_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      details: { id, mp3_count: mp3s.length },
      success: true
    });
    
    console.log('[publicAccess] Sending success response with user data and MP3s');
    res.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim()
      },
      transcriptions: mp3s
    });
    
  } catch (error) {
    console.error('[publicAccess] Error in GET /user/:id:', error);
    console.error('[publicAccess] Error stack:', error.stack);
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
    console.error('Get MP3 error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der MP3-Transkription.'
    });
  }
});

module.exports = router;
