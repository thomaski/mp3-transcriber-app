// ============================================================================
// Server Entry Point
// ============================================================================
// Express + Socket.io Server für MP3-Transkription und Zusammenfassung
// Handhabt Uploads, RunPod API-Calls und WebSocket-Progress-Updates

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Load environment variables
dotenv.config();

// Initialize database (creates schema if needed) - PostgreSQL
const { initDatabase } = require('./db/database-pg');

// Import routes - PostgreSQL versions
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users-pg');
const transcriptionsRouter = require('./routes/transcriptions-pg');
const publicAccessRouter = require('./routes/publicAccess');
const uploadRouter = require('./routes/upload');
const fileRouter = require('./routes/files');
const localFilesRouter = require('./routes/local-files');
const transcribeLocalRouter = require('./routes/transcribe-local');
const summarizeLocalRouter = require('./routes/summarize-local');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL 
      : function(origin, callback) {
        // Allow localhost, local IP, ngrok, and Cloudflare Tunnel domains
        const allowedOrigins = [
          config.FRONTEND_URL,
          config.PROXY_URL,
          `http://192.168.178.20:${config.FRONTEND_PORT}`,
          config.LOCAL_IP_URL
        ];
        
        // Allow any ngrok or Cloudflare Tunnel domain
        if (!origin || allowedOrigins.includes(origin) || 
            origin.includes('.ngrok-free.dev') || 
            origin.includes('.trycloudflare.com')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware - CORS für Production (Frontend wird vom gleichen Server ausgeliefert)
app.use(cors({
  origin: true, // Allow all origins (Frontend kommt vom gleichen Server)
  credentials: true // Allow Authorization header
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Make io accessible via app.get() for local routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Routes
app.use('/api/auth', authRouter); // Authentication routes (no rate limiting on /auth/me and /auth/check)
app.use('/api/public', publicAccessRouter); // Public access (no auth required)
app.use('/api/users', apiLimiter, usersRouter); // User management (admin-only)
app.use('/api/transcriptions', apiLimiter, transcriptionsRouter); // Transcription management
app.use('/api/upload', apiLimiter, uploadRouter);
app.use('/api/files', apiLimiter, fileRouter);
app.use('/api/local-files', apiLimiter, localFilesRouter);
app.use('/api/transcribe-local', apiLimiter, transcribeLocalRouter);
app.use('/api/summarize-local', apiLimiter, summarizeLocalRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    endpoints: {
      whisper: process.env.RUNPOD_WHISPER_ENDPOINT ? 'configured' : 'not configured',
      llama: process.env.RUNPOD_LLAMA_ENDPOINT ? 'configured' : 'not configured'
    }
  });
});

// Test page for manual login testing
app.get('/test-login-page', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Login Test</title>
    <style>
        body { font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; }
        button { padding: 10px 20px; margin: 10px 0; cursor: pointer; }
        pre { background: #f4f4f4; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🧪 Login Test</h1>
    <button onclick="testLogin()">1️⃣ Login (test/test)</button>
    <button onclick="checkAuth()">2️⃣ Check Auth</button>
    <button onclick="goToDashboard()">3️⃣ Go to Dashboard</button>
    <button onclick="clearToken()">🗑️ Clear Token</button>
    <pre id="result">Klicken Sie auf "Login" um zu starten...</pre>

    <script>
        const log = (msg) => {
            const pre = document.getElementById('result');
            pre.textContent += '\\n' + msg;
        };

        async function testLogin() {
            document.getElementById('result').textContent = '📡 Sende Login-Request...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'test', password: 'test' })
                });
                
                const data = await response.json();
                log('✅ Response: ' + JSON.stringify(data, null, 2));
                
                if (data.success && data.token) {
                    localStorage.setItem('authToken', data.token);
                    log('💾 Token gespeichert in localStorage!');
                    log('✅ LOGIN ERFOLGREICH!');
                } else {
                    log('❌ Login fehlgeschlagen: ' + data.error);
                }
            } catch (error) {
                log('❌ ERROR: ' + error.message);
            }
        }

        async function checkAuth() {
            log('\\n📡 Prüfe Auth-Status...');
            const token = localStorage.getItem('authToken');
            log('Token: ' + (token ? token.substring(0, 30) + '...' : 'NICHT GEFUNDEN!'));
            
            try {
                const response = await fetch('/api/auth/check', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                const data = await response.json();
                log('✅ /api/auth/check Response: ' + JSON.stringify(data, null, 2));
            } catch (error) {
                log('❌ ERROR: ' + error.message);
            }
        }

        function goToDashboard() {
            log('\\n🚀 Redirect zu /dashboard...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        }

        function clearToken() {
            localStorage.removeItem('authToken');
            log('\\n🗑️ Token gelöscht!');
        }
    </script>
</body>
</html>
  `);
});

// Serve static files (React Frontend)
app.use(express.static(path.join(__dirname, '../client/build')));

// API Routes MÜSSEN VOR dem Catch-All stehen!
// (bereits oben definiert)

// Catch-all: Serve React App für alle nicht-API Routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Lausche auf allen Interfaces

// Initialize database and start server
(async () => {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('  🔧 Initializing MP3 Transcriber Server...');
    console.log('═'.repeat(80));
    
    // Initialize PostgreSQL database (async)
    await initDatabase();
    console.log('  ✅ PostgreSQL database initialized');
    
    // Start server
    server.listen(PORT, HOST, () => {
      console.log('\n' + '═'.repeat(80));
      console.log(`  🚀 MP3 Transcriber Server läuft auf ${HOST}:${PORT}`);
      console.log(`  📡 Netzwerk-Zugriff: http://192.168.178.20:${PORT}`);
      console.log('═'.repeat(80));
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Database: PostgreSQL (${process.env.POSTGRES_DB})`);
      console.log(`  Uploads: In-Memory → Database (BYTEA)`);
      console.log(`  Whisper Endpoint: ${process.env.RUNPOD_WHISPER_ENDPOINT || 'nicht konfiguriert'}`);
      console.log(`  Llama Endpoint: ${process.env.RUNPOD_LLAMA_ENDPOINT || 'nicht konfiguriert'}`);
      console.log('═'.repeat(80) + '\n');
    });
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
})();

module.exports = { app, io };
