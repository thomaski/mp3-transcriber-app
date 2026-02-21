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
 * Rate limiter for standard API requests
 * Max 500 requests per 15 minutes per IP
 * (erhöht, da normaler App-Betrieb schnell 100 Requests überschreitet)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: {
    success: false,
    error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter für KI-Verarbeitungs-Endpunkte (Transcription, Summarize, File-Upload)
 * Großzügigeres Limit da diese Operationen legitim länger laufen und mehr Requests erzeugen
 */
const processingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    error: 'Zu viele Verarbeitungs-Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut.'
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
  processingLimiter,
  accessTokenLimiter
};
