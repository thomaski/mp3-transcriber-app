/**
 * Utility Functions for ID Generation
 */

const crypto = require('crypto');
const { customAlphabet } = require('nanoid');

/**
 * Generate UUID v4
 * @returns {string} UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate secure nanoid (21 characters, URL-safe)
 * @param {number} length Length of the ID (default: 21)
 * @returns {string} nanoid
 */
const generateNanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

/**
 * Generate access token for public sharing
 * @returns {string} Secure access token (nanoid)
 */
function generateAccessToken() {
  return generateNanoid();
}

module.exports = {
  generateUUID,
  generateNanoid,
  generateAccessToken,
  // Alias for consistency
  generateSecureId: generateNanoid
};
