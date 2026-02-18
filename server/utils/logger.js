/**
 * Audit Logging Utility
 */

const { execute } = require('../db/database-pg');

/**
 * Log an audit event
 * @param {Object} event Event details
 * @param {string} event.event_type Event type (e.g., 'login', 'access_token')
 * @param {string} event.user_id User ID (optional)
 * @param {string} event.ip_address Client IP address
 * @param {string} event.user_agent User-Agent string
 * @param {Object} event.details Additional details (will be JSON stringified)
 * @param {boolean} event.success Whether the event was successful (default: true)
 */
async function logAuditEvent({ event_type, user_id = null, ip_address, user_agent, details = {}, success = true }) {
  try {
    await execute(
      `INSERT INTO audit_logs (event_type, user_id, ip_address, user_agent, details, success)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event_type, user_id, ip_address, user_agent, JSON.stringify(details), success]
    );
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

/**
 * Log a login attempt
 * @param {Object} params
 * @param {string} params.username Username
 * @param {string} params.user_id User ID (if successful)
 * @param {string} params.ip_address Client IP
 * @param {string} params.user_agent User-Agent
 * @param {boolean} params.success Whether login was successful
 */
async function logLogin({ username, user_id = null, ip_address, user_agent, success }) {
  return logAuditEvent({
    event_type: 'login',
    user_id,
    ip_address,
    user_agent,
    details: { username },
    success
  });
}

/**
 * Log an access token usage
 * @param {Object} params
 * @param {string} params.token Access token
 * @param {string} params.transcription_id Transcription ID
 * @param {string} params.ip_address Client IP
 * @param {string} params.user_agent User-Agent
 */
function logAccessToken({ token, transcription_id, ip_address, user_agent }) {
  logAuditEvent({
    event_type: 'access_token',
    user_id: null,
    ip_address,
    user_agent,
    details: { token, transcription_id },
    success: 1
  });
}

module.exports = {
  logAuditEvent,
  logLogin,
  logAccessToken
};
