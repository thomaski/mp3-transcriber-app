// ============================================================================
// Utility Helper Functions
// ============================================================================

/**
 * Parse URL query parameters
 */
export const parseUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    mp3: params.get('mp3'),
    text: params.get('text'),
    edit: params.get('edit')
  };
};

/**
 * Parse timestamp string to seconds
 * @param {string} timestamp - Format: HH:MM:SS or MM:SS
 * @returns {number} - Seconds
 */
export const parseTimestamp = (timestamp) => {
  if (!timestamp) return 0;
  
  // Remove brackets if present [HH:MM:SS]
  const clean = timestamp.replace(/[\[\]]/g, '');
  
  const parts = clean.split(':').map(Number);
  
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
};

/**
 * Format seconds to timestamp string
 * @param {number} seconds
 * @returns {string} - Format: HH:MM:SS
 */
export const formatTimestamp = (seconds) => {
  if (!seconds || seconds < 0) return '00:00:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Format file size to human readable format
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait - milliseconds
 * @returns {Function}
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Download text as file
 * @param {string} content
 * @param {string} filename
 */
export const downloadTextFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

/**
 * Extract timestamps from transcription text
 * @param {string} text
 * @returns {Array<{timestamp: string, seconds: number, text: string}>}
 */
export const extractTimestamps = (text) => {
  const lines = text.split('\n');
  const timestamps = [];
  
  for (const line of lines) {
    const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.+)$/);
    if (match) {
      timestamps.push({
        timestamp: match[1],
        seconds: parseTimestamp(match[1]),
        text: match[2]
      });
    }
  }
  
  return timestamps;
};

/**
 * Validate MP3 file
 * @param {File} file
 * @returns {boolean}
 */
export const isValidMP3 = (file) => {
  const validTypes = ['audio/mpeg', 'audio/mp3'];
  const validExtensions = ['.mp3'];
  
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  return hasValidType || hasValidExtension;
};

/**
 * Validate text file
 * @param {File} file
 * @returns {boolean}
 */
export const isValidTextFile = (file) => {
  const validTypes = ['text/plain'];
  const validExtensions = ['.txt'];
  
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  return hasValidType || hasValidExtension;
};
