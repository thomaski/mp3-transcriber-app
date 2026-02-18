/**
 * Short ID Generator (6 alphanumeric characters)
 * Format: [0-9a-z]{6}
 * Total combinations: 36^6 = 2,176,782,336 possible IDs
 */

/**
 * Generate a random 6-character alphanumeric ID
 * @param {string} prefix Optional prefix (e.g., '1', '2', '3', 'a', 'b', 'c' for user IDs)
 * @returns {string} 6-character ID
 */
function generateShortId(prefix = null) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let id = '';
  
  // If prefix is provided, use it as first character
  if (prefix) {
    id += prefix;
  } else {
    // Random first character
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Generate remaining 5 characters
  for (let i = 1; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return id;
}

/**
 * Generate a unique user ID (starts with 0-9)
 * @returns {string} 6-character user ID
 */
function generateUserId() {
  const userPrefixes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const prefix = userPrefixes[Math.floor(Math.random() * userPrefixes.length)];
  return generateShortId(prefix);
}

/**
 * Generate a unique MP3/transcription ID (starts with a-z)
 * @returns {string} 6-character MP3 ID
 */
function generateMp3Id() {
  const mp3Prefixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
  const prefix = mp3Prefixes[Math.floor(Math.random() * mp3Prefixes.length)];
  return generateShortId(prefix);
}

/**
 * Check if ID looks like a user ID (starts with 0-9)
 * @param {string} id 6-character ID
 * @returns {boolean} True if ID pattern matches user ID
 */
function isUserIdPattern(id) {
  if (!id || id.length !== 6) return false;
  const firstChar = id[0];
  return /^[0-9]/.test(firstChar);
}

/**
 * Check if ID looks like an MP3 ID (starts with a-z)
 * @param {string} id 6-character ID
 * @returns {boolean} True if ID pattern matches MP3 ID
 */
function isMp3IdPattern(id) {
  if (!id || id.length !== 6) return false;
  const firstChar = id[0];
  return /^[a-z]/.test(firstChar);
}

/**
 * Validate ID format (6 alphanumeric characters)
 * @param {string} id ID to validate
 * @returns {boolean} True if valid format
 */
function isValidIdFormat(id) {
  return /^[0-9a-z]{6}$/.test(id);
}

module.exports = {
  generateShortId,
  generateUserId,
  generateMp3Id,
  isUserIdPattern,
  isMp3IdPattern,
  isValidIdFormat
};
