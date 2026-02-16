// ============================================================================
// Summarize Route
// ============================================================================
// Handhabt Zusammenfassung von Transkriptionen via RunPod Llama API

const express = require('express');
const axios = require('axios');

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
 * Split transcription into blocks with overlap
 */
function splitIntoBlocks(transcription, blockSize = 20, overlapSize = 10) {
  const lines = transcription.split('\n');
  
  // Find where content starts (after header)
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '' && i > 0) {
      contentStart = i + 1;
      break;
    }
  }
  
  const header = lines.slice(0, contentStart).join('\n');
  const contentLines = lines.slice(contentStart);
  
  const blocks = [];
  for (let i = 0; i < contentLines.length; i += blockSize - overlapSize) {
    const block = contentLines.slice(i, i + blockSize);
    if (block.length > 0) {
      blocks.push(block);
    }
  }
  
  return { header, blocks };
}

/**
 * Call RunPod Llama API for summarization
 */
async function callRunPodLlama(text, promptType, socketId, io) {
  const endpoint = process.env.RUNPOD_LLAMA_ENDPOINT;
  
  if (!endpoint) {
    throw new Error('RUNPOD_LLAMA_ENDPOINT nicht konfiguriert');
  }
  
  // System prompt based on type
  const systemPrompts = {
    newsletter: `Du bist ein präziser Zusammenfasser. Antworte NUR mit EINEM kurzen Satz auf Deutsch. 
Kein Reasoning, keine Einleitung, kein Nachsatz, nichts anderes. Ende mit einem Punkt. 
KEIN Englisch, KEINE Sternchen, KEINE Wörter wie assistant oder here is. 
Es geht bei dem Text generell um spirituelle Botschaften an mehrere Menschen zu Weltgeschehen.
Verwende NIEMALS die 'Du'-Form, sondern stattdessen IMMER die 'Ihr'-Form.
Erkenne den Kontext der Botschaft an die Gruppe. Bleibe nah am Inhalt ohne Abhebung.`,
    durchgabe: `Du bist ein präziser Zusammenfasser. Antworte NUR mit EINEM kurzen Satz auf Deutsch. 
Kein Reasoning, keine Einleitung, kein Nachsatz, nichts anderes. Ende mit einem Punkt. 
KEIN Englisch, KEINE Sternchen, KEINE Wörter wie assistant oder here is. 
Verwende die 'Du'-Form wo passend für persönliche Referenzen auf 'Seele der Liebe', 
aber variiere die Satzstruktur für natürliche Zusammenfassungen. 
Der Text ist eine spirituelle Beratung eines Engels an einen Menschen ('Du' als Adressat). 
Erkenne den Kontext der Botschaft an den Menschen. 
Fasse den Rat des Engels präzise zusammen, bleibe nah am Inhalt ohne Abhebung.`
  };
  
  const systemContent = systemPrompts[promptType] || systemPrompts.durchgabe;
  
  try {
    // Remove timestamps for summarization
    const cleanText = text.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, '');
    
    // Example RunPod API call structure (adjust based on actual API)
    const response = await axios.post(endpoint, {
      input: {
        prompt: `${systemContent}\n\nZusammenfassen in einem Satz: ${cleanText}`,
        model: process.env.LLAMA_MODEL || 'avans06/Meta-Llama-3.1-8B-Instruct-ct2-int8_float16',
        max_length: 60,
        temperature: 0.0,
        top_p: 0.9,
        repetition_penalty: 1.5
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.RUNPOD_API_KEY && { 
          'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}` 
        })
      },
      timeout: 120000 // 2 minutes
    });
    
    // Parse response (adjust based on actual API response structure)
    let summary = response.data.output?.text || response.data.text || '';
    
    // Clean up summary
    summary = summary.trim();
    if (!summary.endsWith('.')) {
      summary += '.';
    }
    
    // Remove artifacts
    summary = summary.replace(/(?:assistant|here is|\*.*?\*|system)/gi, '').trim();
    
    return summary;
    
  } catch (error) {
    console.error('RunPod Llama API Error:', error.response?.data || error.message);
    throw new Error(`Zusammenfassung fehlgeschlagen: ${error.message}`);
  }
}

// POST /api/summarize
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { transcription, promptType = 'durchgabe', socketId } = req.body;
    
    if (!transcription) {
      return res.status(400).json({ error: 'Keine Transkription angegeben' });
    }
    
    console.log(`📝 Starte Zusammenfassung (Typ: ${promptType})`);
    
    const io = req.io;
    
    if (io && socketId) {
      io.to(socketId).emit('summarize:progress', { 
        step: 'split', 
        message: 'Teile Text in Blöcke...' 
      });
    }
    
    // Split into blocks
    const { header, blocks } = splitIntoBlocks(transcription);
    
    console.log(`  → ${blocks.length} Blöcke erstellt`);
    
    // Summarize each block
    const summaries = [];
    let enhanced = '';
    
    for (let i = 0; i < blocks.length; i++) {
      if (io && socketId) {
        io.to(socketId).emit('summarize:progress', { 
          step: 'summarize', 
          message: `Erstelle Überschrift für Block ${i + 1}/${blocks.length}...`,
          progress: Math.round(((i + 1) / blocks.length) * 100)
        });
      }
      
      const blockText = blocks[i].join(' ');
      const summary = await callRunPodLlama(blockText, promptType, socketId, io);
      
      summaries.push(summary);
      enhanced += `\n----------  ${summary}\n` + blocks[i].join('\n') + '\n';
      
      console.log(`  ✓ Block ${i + 1}: ${summary}`);
    }
    
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    
    // Create full summary header
    const now = new Date();
    const summaryHeader = [
      '═'.repeat(40),
      'Zusammenfassung des Transkripts',
      '═'.repeat(40),
      `Start:   ${now.toLocaleTimeString('de-DE')}`,
      `Dauer:   ${formatTimestamp(durationSeconds)}`,
      `Modell:  ${process.env.LLAMA_MODEL || 'Llama-3.1-8B-CT2'}`,
      `Typ:     ${promptType}`,
      '',
      'Gesamtzusammenfassung:',
      ...summaries,
      ''
    ].join('\n');
    
    const fullSummary = header + '\n\n' + summaryHeader + enhanced;
    
    // Emit completion
    if (io && socketId) {
      io.to(socketId).emit('summarize:complete', { 
        summary: fullSummary,
        duration: durationSeconds
      });
    }
    
    console.log(`✓ Zusammenfassung abgeschlossen in ${durationSeconds.toFixed(2)}s`);
    
    res.json({
      success: true,
      summary: fullSummary,
      summaries,
      duration: durationSeconds
    });
    
  } catch (error) {
    console.error('Summarize error:', error);
    
    // Emit error
    if (req.io && req.body.socketId) {
      req.io.to(req.body.socketId).emit('summarize:error', { 
        error: error.message 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
