/**
 * Central Configuration for MP3 Transcriber App
 * ============================================
 * All port configurations and URLs in one place
 */

module.exports = {
  // Server Ports
  BACKEND_PORT: process.env.PORT || 5000,
  FRONTEND_PORT: 3000, // React Dev Server (only for development)
  PROXY_PORT: process.env.PROXY_PORT || 4000, // Main entry point for users
  
  // URLs
  get BACKEND_URL() {
    return `http://localhost:${this.BACKEND_PORT}`;
  },
  get FRONTEND_URL() {
    return `http://localhost:${this.FRONTEND_PORT}`;
  },
  get PROXY_URL() {
    return `http://localhost:${this.PROXY_PORT}`;
  },
  get LOCAL_IP_URL() {
    return `http://192.168.178.20:${this.PROXY_PORT}`;
  },
  
  // User-facing URLs (what users should use)
  get MAIN_URL() {
    return this.PROXY_URL; // Port 4000 is the main entry point
  },
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Display helpers
  displayInfo() {
    console.log('\n' + '═'.repeat(80));
    console.log('  🌐 MP3 Transcriber - URL Configuration');
    console.log('═'.repeat(80));
    console.log(`  Main URL (use this):       ${this.MAIN_URL}`);
    console.log(`  Local Network:             ${this.LOCAL_IP_URL}`);
    console.log('─'.repeat(80));
    console.log(`  Backend (internal):        ${this.BACKEND_URL}`);
    console.log(`  Frontend (internal):       ${this.FRONTEND_URL}`);
    console.log(`  Reverse Proxy:             ${this.PROXY_URL}`);
    console.log('═'.repeat(80) + '\n');
  }
};
