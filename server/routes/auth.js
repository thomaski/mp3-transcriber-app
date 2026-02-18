/**
 * Authentication Routes
 * Login, Logout, Check Auth Status
 */

const express = require('express');
const { queryOne } = require('../db/database-pg');
const { verifyPassword } = require('../utils/passwordUtils');
const { generateToken, authenticateJWT, authenticateJWTOptional } = require('../middleware/auth');
const { logLogin } = require('../utils/logger');
const { loginLimiter } = require('../middleware/rateLimiter');
const logger = require('../../logger');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', loginLimiter, async (req, res) => {
  logger.log('BACKEND', '━'.repeat(80));
  logger.log('BACKEND', '🔐 POST /api/auth/login aufgerufen');
  logger.log('BACKEND', '━'.repeat(80));
  
  const { username, password } = req.body;
  logger.debug('BACKEND', `   Username: ${username}`);
  logger.debug('BACKEND', `   Password: ${password ? '****' : 'FEHLT'}`);
  logger.debug('BACKEND', `   IP: ${req.ip}`);
  logger.debug('BACKEND', `   User-Agent: ${req.get('user-agent') || 'keine'}`);
  
  // Validate input
  if (!username || !password) {
    logger.error('BACKEND', 'Validierung fehlgeschlagen: Username oder Password fehlt');
    return res.status(400).json({
      success: false,
      error: 'Benutzername und Passwort sind erforderlich.'
    });
  }
  
  try {
    logger.log('BACKEND', `🔍 Suche User in Datenbank: ${username}`);
    // Find user by username (PostgreSQL - async)
    const user = await queryOne(
      'SELECT id, username, password_hash, first_name, last_name, is_admin FROM users WHERE username = $1',
      [username]
    );
    
    if (!user) {
      logger.error('BACKEND', `User nicht gefunden: ${username}`);
      // Log failed login attempt
      await logLogin({
        username,
        user_id: null,
        ip_address: req.ip,
        user_agent: req.get('user-agent') || '',
        success: false
      });
      
      return res.status(401).json({
        success: false,
        error: 'Ungültiger Benutzername oder Passwort.'
      });
    }
    
    logger.success('BACKEND', `User gefunden: ${username} (ID: ${user.id})`);
    logger.debug('BACKEND', `   Vorname: ${user.first_name}`);
    logger.debug('BACKEND', `   Nachname: ${user.last_name}`);
    logger.debug('BACKEND', `   Admin: ${user.is_admin ? 'JA' : 'NEIN'}`);
    
    logger.log('BACKEND', '🔐 Prüfe Passwort...');
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      logger.error('BACKEND', `Falsches Passwort für User: ${username}`);
      // Log failed login attempt
      await logLogin({
        username,
        user_id: user.id,
        ip_address: req.ip,
        user_agent: req.get('user-agent') || '',
        success: false
      });
      
      return res.status(401).json({
        success: false,
        error: 'Ungültiger Benutzername oder Passwort.'
      });
    }
    
    logger.success('BACKEND', 'Passwort korrekt! ✓');
    logger.log('BACKEND', '🔑 Generiere JWT Token...');
    
    // Generate JWT token (is_admin is already boolean in PostgreSQL)
    const token = generateToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin // PostgreSQL: already boolean
    });
    
    logger.success('BACKEND', `JWT Token generiert (${token.length} Zeichen)`);
    logger.debug('BACKEND', `   Token (erste 20 Zeichen): ${token.substring(0, 20)}...`);
    
    // Log successful login
    await logLogin({
      username,
      user_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || '',
      success: true
    });
    
    // Return token and user info
    const responseData = {
      success: true,
      token, // Return token in response body
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        isAdmin: user.is_admin // PostgreSQL: already boolean
      }
    };
    
    logger.success('BACKEND', '✅✅✅ LOGIN ERFOLGREICH ✅✅✅');
    logger.log('BACKEND', '━'.repeat(80));
    
    res.json(responseData);
    
  } catch (error) {
    logger.error('BACKEND', '❌❌❌ LOGIN FEHLER ❌❌❌');
    logger.error('BACKEND', `Error Message: ${error.message}`);
    logger.error('BACKEND', `Stack: ${error.stack}`);
    
    res.status(500).json({
      success: false,
      error: 'Ein Fehler ist beim Login aufgetreten.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', (req, res) => {
  // With JWT in header, logout is handled client-side
  // Server just confirms the action
  res.json({
    success: true,
    message: 'Erfolgreich ausgeloggt.'
  });
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authenticateJWT, (req, res) => {
  try {
    // Get full user info from database
    const user = queryOne(
      'SELECT id, username, first_name, last_name, is_admin, created_at FROM users WHERE id = ?',
      [req.user.userId]
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
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        isAdmin: user.is_admin === 1,
        created_at: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Benutzerinformationen.'
    });
  }
});

/**
 * GET /api/auth/check
 * Check if user is authenticated (with full user details from DB)
 */
router.get('/check', authenticateJWTOptional, async (req, res) => {
  if (req.user) {
    try {
      // Get full user info from database
      const user = await queryOne(
        'SELECT id, username, first_name, last_name, email, is_admin, created_at FROM users WHERE id = $1',
        [req.user.userId]
      );
      
      if (!user) {
        return res.json({
          success: true,
          authenticated: false
        });
      }
      
      // User is authenticated - return full user info
    res.json({
      success: true,
      authenticated: true,
      user: {
          id: user.id,
          userId: user.id, // Keep for backward compatibility
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          isAdmin: user.is_admin,
          created_at: user.created_at
      }
    });
    } catch (error) {
      console.error('Check auth error:', error);
      res.json({
        success: true,
        authenticated: false
      });
    }
  } else {
    // No valid token
    res.json({
      success: true,
      authenticated: false
    });
  }
});

module.exports = router;
