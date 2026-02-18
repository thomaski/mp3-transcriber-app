/**
 * Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login attempts
 * Max 50 requests per 15 minutes per IP (erhöht für Entwicklung/Testing)
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 requests per window
  message: {
    success: false,
    error: 'Zu viele Login-Versuche. Bitte versuchen Sie es in 15 Minuten erneut.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Rate limiter for API requests
 * Max 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: {
    success: false,
    error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for public access token requests
 * Max 10 requests per 5 minutes per IP
 */
const accessTokenLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 requests per window
  message: {
    success: false,
    error: 'Zu viele Zugriffe auf diesen Link. Bitte versuchen Sie es in 5 Minuten erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter,
  accessTokenLimiter
};
