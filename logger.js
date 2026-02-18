/**
 * Zentrales Logging System
 * Deutsches Zeitformat + OHNE Component-Prefix (da concurrently das schon macht)
 */

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

function log(component, message, ...args) {
  // concurrently fügt bereits [COMPONENT] hinzu, also nur Timestamp + Message
  console.log(`[${getTimestamp()}]`, message, ...args);
}

function error(component, message, ...args) {
  console.error(`[${getTimestamp()}] ❌`, message, ...args);
}

function success(component, message, ...args) {
  console.log(`[${getTimestamp()}] ✅`, message, ...args);
}

function debug(component, message, ...args) {
  console.log(`[${getTimestamp()}] 🔍`, message, ...args);
}

module.exports = { log, error, success, debug, getTimestamp };
