// ============================================================================
// Transcribe Route
// ============================================================================
// Handhabt Transkription von MP3-Dateien via RunPod Whisper API

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const router = express.Router();

/**
 * Format timestamp (seconds) to hh:mm:ss
 */
function formatTimestamp(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse Whisper segments and format with timestamps
 */
function formatTranscription(segments) {
  if (!segments || segments.length === 0) {
    return '';
  }
  
  let result = '';
  for (const segment of segments) {
    const timestamp = formatTimestamp(segment.start);
    const text = segment.text.trim();
    result += `[${timestamp}] ${text}\n`;
  }
  
  return result;
}

/**
 * Call RunPod Whisper API
 */
async function callRunPodWhisper(audioPath, socketId, io) {
  const endpoint = process.env.RUNPOD_WHISPER_ENDPOINT;
  
  if (!endpoint) {
    throw new Error('RUNPOD_WHISPER_ENDPOINT nicht konfiguriert');
  }
  
  // Emit progress
  if (io && socketId) {
    io.to(socketId).emit('transcribe:progress', { 
      step: 'upload', 
      message: 'Lade Audio-Datei zum Server...' 
    });
  }
  
  try {
    // For demonstration: Simulated API call structure
    // In production, replace with actual RunPod API implementation
    
    // Read audio file
    const audioBuffer = fs.readFileSync(audioPath);
    const audioBase64 = audioBuffer.toString('base64');
    
    if (io && socketId) {
      io.to(socketId).emit('transcribe:progress', { 
        step: 'processing', 
        message: 'Transkribiere Audio mit Whisper...' 
      });
    }
    
    // Example RunPod API call structure (adjust based on actual API)
    const response = await axios.post(endpoint, {
      input: {
        audio: audioBase64,
        model: process.env.WHISPER_MODEL || 'openai/whisper-large-v3',
        language: 'de',
        task: 'transcribe',
        // Parameters from transcribe.py
        beam_size: 7,
        vad_filter: true,
        condition_on_previous_text: false,
        initial_prompt: 'Dies ist eine klare, natürliche deutsche Sprache'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.RUNPOD_API_KEY && { 
          'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}` 
        })
      },
      timeout: 600000 // 10 minutes
    });
    
    if (io && socketId) {
      io.to(socketId).emit('transcribe:progress', { 
        step: 'formatting', 
        message: 'Formatiere Transkription...' 
      });
    }
    
    // Parse response (adjust based on actual API response structure)
    const segments = response.data.output?.segments || response.data.segments || [];
    const transcription = formatTranscription(segments);
    
    return {
      transcription,
      segments,
      duration: response.data.output?.duration || 0
    };
    
  } catch (error) {
    console.error('RunPod Whisper API Error:', error.response?.data || error.message);
    throw new Error(`Transkription fehlgeschlagen: ${error.message}`);
  }
}

// POST /api/transcribe
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { filePath, socketId } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Kein Dateipfad angegeben' });
    }
    
    let fullPath;
    
    // Check if filePath is absolute (for local files)
    if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    } else {
      // Relative path from uploads directory
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      fullPath = path.join(uploadDir, path.basename(filePath));
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Audio-Datei nicht gefunden' });
    }
    
    console.log(`🎙️  Starte Transkription: ${path.basename(fullPath)}`);
    
    // Get io instance from app
    const io = req.io;
    
    // Call RunPod API
    const result = await callRunPodWhisper(fullPath, socketId, io);
    
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    
    // Create formatted output with header
    const now = new Date();
    const header = [
      `Datum:   ${now.toLocaleDateString('de-DE')}`,
      `Start:   ${now.toLocaleTimeString('de-DE')}`,
      `Dauer:   ${formatTimestamp(durationSeconds)}`,
      `Modell:  ${process.env.WHISPER_MODEL || 'openai/whisper-large-v3'}`,
      '',
      ''
    ].join('\n');
    
    const fullTranscription = header + result.transcription;
    
    // Emit completion
    if (io && socketId) {
      io.to(socketId).emit('transcribe:complete', { 
        transcription: fullTranscription,
        duration: durationSeconds
      });
    }
    
    console.log(`✓ Transkription abgeschlossen in ${durationSeconds.toFixed(2)}s`);
    
    res.json({
      success: true,
      transcription: fullTranscription,
      segments: result.segments,
      duration: durationSeconds,
      audioDuration: result.duration
    });
    
  } catch (error) {
    console.error('Transcribe error:', error);
    
    // Emit error
    if (req.io && req.body.socketId) {
      req.io.to(req.body.socketId).emit('transcribe:error', { 
        error: error.message 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
