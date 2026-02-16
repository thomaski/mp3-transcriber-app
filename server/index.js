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

// Load environment variables
dotenv.config();

// Import routes
const transcribeRouter = require('./routes/transcribe');
const summarizeRouter = require('./routes/summarize');
const uploadRouter = require('./routes/upload');
const fileRouter = require('./routes/files');
const localFilesRouter = require('./routes/local-files');
const transcribeLocalRouter = require('./routes/transcribe-local');
const summarizeLocalRouter = require('./routes/summarize-local');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL 
      : ['http://localhost:3000', 'http://192.168.178.20:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
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
app.use('/api/transcribe', transcribeRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/files', fileRouter);
app.use('/api/local-files', localFilesRouter);
app.use('/api/transcribe-local', transcribeLocalRouter);
app.use('/api/summarize-local', summarizeLocalRouter);

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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

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
server.listen(PORT, HOST, () => {
  console.log('\n' + '═'.repeat(80));
  console.log(`  🚀 MP3 Transcriber Server läuft auf ${HOST}:${PORT}`);
  console.log(`  📡 Netzwerk-Zugriff: http://192.168.178.20:${PORT}`);
  console.log('═'.repeat(80));
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Uploads Dir: ${uploadsDir}`);
  console.log(`  Whisper Endpoint: ${process.env.RUNPOD_WHISPER_ENDPOINT || 'nicht konfiguriert'}`);
  console.log(`  Llama Endpoint: ${process.env.RUNPOD_LLAMA_ENDPOINT || 'nicht konfiguriert'}`);
  console.log('═'.repeat(80) + '\n');
});

module.exports = { app, io };
