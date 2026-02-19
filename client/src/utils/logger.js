// ============================================================================
// Frontend Logger Utility
// ============================================================================
// Logs immer (Development + lokale Production).
// Sensible Daten (Passwörter etc.) dürfen NIE geloggt werden!
//
// Verwendung: import logger from '../utils/logger';
//             logger.log('Nachricht');
//             logger.debug('Debug-Info', variable);
//             logger.warn('Warnung');
//             logger.error('Fehlermeldung', errorObject);

const logger = {
  /**
   * Allgemeines Logging
   * @param {...any} args - Zu loggende Werte
   */
  log: (...args) => {
    console.log(...args);
  },

  /**
   * Info-Logging
   * @param {...any} args - Zu loggende Werte
   */
  info: (...args) => {
    console.info(...args);
  },

  /**
   * Fehler-Logging (niemals sensitive Daten!)
   * @param {...any} args - Zu loggende Werte
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Warn-Logging
   * @param {...any} args - Zu loggende Werte
   */
  warn: (...args) => {
    console.warn(...args);
  },

  /**
   * Debug-Logging (detaillierte Informationen)
   * @param {...any} args - Zu loggende Werte
   */
  debug: (...args) => {
    console.log('🔍', ...args);
  }
};

export default logger;
