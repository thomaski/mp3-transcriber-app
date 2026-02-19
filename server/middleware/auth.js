/**
 * JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const logger = require('../../logger');

// SECURITY: JWT_SECRET MUSS in .env gesetzt werden
if (!process.env.JWT_SECRET) {
  logger.error('AUTH', '❌ FATAL: JWT_SECRET nicht in .env gesetzt!');
  logger.error('AUTH', '❌ Server kann nicht sicher starten.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h';

/**
 * Generate JWT token
 * @param {Object} payload Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify JWT token
 * @param {string} token JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware: Authenticate JWT from Authorization header (OPTIONAL)
 * Does not return 401, just continues without req.user
 */
function authenticateJWTOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token - continue without auth
    return next();
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (decoded) {
    req.user = decoded;
  }
  
  next();
}

/**
 * Middleware: Authenticate JWT from Authorization header (REQUIRED)
 */
function authenticateJWT(req, res, next) {
  logger.debug('AUTH', `authenticateJWT called for: ${req.method} ${req.path}`);
  
  // Get token from Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.log('AUTH', 'No valid Authorization header');
    return res.status(401).json({ 
      success: false, 
      error: 'Nicht authentifiziert. Bitte einloggen.' 
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);
  
  if (!decoded) {
    logger.error('AUTH', 'Token verification failed');
    return res.status(401).json({ 
      success: false, 
      error: 'Ungültiges oder abgelaufenes Token. Bitte erneut einloggen.' 
    });
  }
  
  logger.debug('AUTH', `User authenticated: ${decoded.username} isAdmin: ${decoded.isAdmin}`);
  
  // Attach user info to request
  req.user = decoded;
  next();
}

/**
 * Middleware: Check if user is admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    logger.error('AUTH', 'requireAdmin: No user in request');
    return res.status(401).json({ 
      success: false, 
      error: 'Nicht authentifiziert.' 
    });
  }
  
  if (!req.user.isAdmin) {
    logger.log('AUTH', `requireAdmin: User ${req.user.username} is not admin`);
    return res.status(403).json({ 
      success: false, 
      error: 'Zugriff verweigert. Admin-Rechte erforderlich.' 
    });
  }
  
  logger.debug('AUTH', `Admin access granted for: ${req.user.username}`);
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateJWT,
  authenticateJWTOptional,
  requireAdmin,
  JWT_SECRET,
  JWT_EXPIRY
};
