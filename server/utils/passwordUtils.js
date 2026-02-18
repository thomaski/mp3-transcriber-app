/**
 * Utility Functions for Password Hashing
 */

const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

/**
 * Hash password with bcrypt
 * @param {string} password Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 * @param {string} password Plain text password
 * @param {string} hash Bcrypt hash
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  verifyPassword
};
