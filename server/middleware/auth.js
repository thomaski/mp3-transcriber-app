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
  // Get token from Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Nicht authentifiziert. Bitte einloggen.' 
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      success: false, 
      error: 'Ungültiges oder abgelaufenes Token. Bitte erneut einloggen.' 
    });
  }
  
  // Attach user info to request
  req.user = decoded;
  next();
}

/**
 * Middleware: Check if user is admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Nicht authentifiziert.' 
    });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Zugriff verweigert. Admin-Rechte erforderlich.' 
    });
  }
  
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
