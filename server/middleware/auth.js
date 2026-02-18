/**
 * JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
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
  console.log('[auth] authenticateJWT called for:', req.method, req.path);
  
  // Get token from Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  console.log('[auth] Authorization header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[auth] No valid Authorization header');
    return res.status(401).json({ 
      success: false, 
      error: 'Nicht authentifiziert. Bitte einloggen.' 
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  console.log('[auth] Token length:', token.length);
  console.log('[auth] Token (first 20 chars):', token.substring(0, 20) + '...');
  
  const decoded = verifyToken(token);
  console.log('[auth] Token decoded:', !!decoded);
  
  if (!decoded) {
    console.error('[auth] Token verification failed');
    return res.status(401).json({ 
      success: false, 
      error: 'Ungültiges oder abgelaufenes Token. Bitte erneut einloggen.' 
    });
  }
  
  console.log('[auth] User authenticated:', decoded.username, 'isAdmin:', decoded.isAdmin);
  
  // Attach user info to request
  req.user = decoded;
  next();
}

/**
 * Middleware: Check if user is admin
 */
function requireAdmin(req, res, next) {
  console.log('[auth] requireAdmin called');
  console.log('[auth] req.user present:', !!req.user);
  console.log('[auth] req.user:', req.user);
  
  if (!req.user) {
    console.error('[auth] No user in request');
    return res.status(401).json({ 
      success: false, 
      error: 'Nicht authentifiziert.' 
    });
  }
  
  console.log('[auth] User isAdmin:', req.user.isAdmin);
  
  if (!req.user.isAdmin) {
    console.error('[auth] User is not admin');
    return res.status(403).json({ 
      success: false, 
      error: 'Zugriff verweigert. Admin-Rechte erforderlich.' 
    });
  }
  
  console.log('[auth] Admin access granted');
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
