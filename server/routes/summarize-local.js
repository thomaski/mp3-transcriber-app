const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('../../logger');

// Konfiguration (lokal)
const LOCAL_AUDIO_DIR = 'D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio';
const WSL_AUDIO_DIR = '/mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio';
const PYTHON_SCRIPT = '/home/tom/summarize.py';
const VENV_ACTIVATE = '~/pyenv_1_transcode_durchgabe/bin/activate';

// Cloud-Mode: wenn LOCAL_TRANSCRIBE_SERVICE_URL gesetzt ist, wird HTTP-Proxy verwendet
const LOCAL_SERVICE_URL = process.env.LOCAL_TRANSCRIBE_SERVICE_URL;
const LOCAL_SERVICE_API_KEY = process.env.LOCAL_SERVICE_API_KEY || '';

/**
 * POST /api/summarize-local
 * Erstellt Summary einer lokalen TXT-Datei.
 *
 * Modi:
 *  - LOCAL_MODE:  Direkter WSL2-Aufruf via spawn() (Standard bei lokalem Betrieb)
 *  - CLOUD_MODE:  HTTP-Proxy zum lokalen FastAPI-Service (bei Railway-Deployment,
 *                 wenn LOCAL_TRANSCRIBE_SERVICE_URL gesetzt ist)
 *
 * Body: { filename: "test.txt", socketId: "xxx" }
 *   ODER: { transcription: "...", socketId: "xxx" } (für direkte Transkription)
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { filename, transcription, socketId, mp3Filename } = req.body;

    if (!socketId) {
      return res.status(400).json({ error: 'Keine Socket-ID angegeben' });
    }

    const io = req.app.get('io');

    const sendProgress = (step, message, progress = 0) => {
      io.to(socketId).emit('summarize:progress', { step, message, progress });
      logger.debug('SUMMARIZE_LOCAL', `${step}: ${message} (${progress}%)`);
    };

    // =========================================================================
    // CLOUD-MODE: HTTP-Proxy zum lokalen FastAPI-Service
    // =========================================================================
    if (LOCAL_SERVICE_URL) {
      logger.log('SUMMARIZE_LOCAL', `Cloud-Mode: Proxy-Request an ${LOCAL_SERVICE_URL}/summarize`);
      sendProgress('init', 'Verbinde mit lokalem KI-Service...', 5);

      try {
        const serviceResponse = await axios.post(
          `${LOCAL_SERVICE_URL}/summarize`,
          { filename, transcription, mp3Filename },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(LOCAL_SERVICE_API_KEY && { 'x-api-key': LOCAL_SERVICE_API_KEY })
            },
            responseType: 'stream',
            timeout: 600000 // 10 Minuten Timeout
          }
        );

        let finalResult = null;
        let hasError = false;
        let sseBuffer = '';

        serviceResponse.data.on('data', (chunk) => {
          sseBuffer += chunk.toString('utf8');

          const parts = sseBuffer.split('\n\n');
          sseBuffer = parts.pop();

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress' || data.type === 'warning') {
                sendProgress(data.step || 'processing', data.message, data.progress || 0);
              } else if (data.type === 'error') {
                hasError = true;
                sendProgress('error', data.message, 0);
              } else if (data.type === 'complete') {
                finalResult = data;
                sendProgress('complete', data.message, 100);
              }
            } catch (parseErr) {
              logger.warn('SUMMARIZE_LOCAL', `SSE Parse-Fehler: ${parseErr.message}`);
            }
          }
        });

        serviceResponse.data.on('end', () => {
          if (hasError) {
            return res.status(500).json({ error: 'Summarization fehlgeschlagen' });
          }
          if (!finalResult) {
            return res.status(500).json({ error: 'Kein Ergebnis vom lokalen Service erhalten' });
          }

          // Ergebnis via Socket senden (identisch zum Local-Mode)
          io.to(socketId).emit('summarize:result', {
            transcription: finalResult.transcription,
            filename: finalResult.filename
          });

          res.json({
            success: true,
            filename: finalResult.filename,
            transcription: finalResult.transcription,
            duration: finalResult.duration,
            mode: finalResult.mode || 'cloud-proxy',
            usedTemporaryFile: !!(transcription && transcription.trim())
          });
        });

        serviceResponse.data.on('error', (err) => {
          logger.error('SUMMARIZE_LOCAL', 'Stream-Fehler vom lokalen Service:', err.message);
          sendProgress('error', `Verbindungsfehler zum lokalen Service: ${err.message}`, 0);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Verbindungsfehler zum lokalen KI-Service',
              details: err.message
            });
          }
        });

      } catch (serviceErr) {
        logger.error('SUMMARIZE_LOCAL', 'Lokaler Service nicht erreichbar:', serviceErr.message);
        sendProgress('error', `Lokaler KI-Service nicht erreichbar: ${serviceErr.message}`, 0);
        return res.status(503).json({
          error: 'Lokaler KI-Service nicht erreichbar',
          details: serviceErr.message,
          hint: 'Stelle sicher, dass der lokale Service läuft und über LOCAL_TRANSCRIBE_SERVICE_URL erreichbar ist.'
        });
      }

      return; // Cloud-Mode vollständig behandelt
    }

    // =========================================================================
    // LOCAL-MODE: Direkter WSL2-Aufruf (Standard bei lokalem Betrieb)
    // =========================================================================

    let txtPath;
    let tempFile = null;

    // Fall 1: Direkte Transkription verwenden (temporäre Datei erstellen)
    if (transcription && transcription.trim()) {
      sendProgress('init', 'Verwende aktuelle Transkription...', 0);

      let tempFilename;
      if (mp3Filename) {
        const mp3Base = path.basename(mp3Filename, path.extname(mp3Filename))
          .replace(/[^a-zA-Z0-9._\-]/g, '_');
        tempFilename = `${mp3Base}_temp.txt`;
      } else {
        tempFilename = `temp_${Date.now()}_transcription.txt`;
      }
      tempFile = path.join(LOCAL_AUDIO_DIR, tempFilename);

      fs.writeFileSync(tempFile, transcription, 'utf8');
      txtPath = tempFile;

      logger.debug('SUMMARIZE_LOCAL', `✓ Temporäre Datei erstellt: ${tempFile}`);

    }
    // Fall 2: Dateiname angegeben (existierende Datei verwenden)
    else if (filename) {
      sendProgress('init', `Starte Summarization für: ${filename}`, 0);

      txtPath = path.join(LOCAL_AUDIO_DIR, filename);
      if (!fs.existsSync(txtPath)) {
        return res.status(404).json({ error: `TXT-Datei nicht gefunden: ${filename}` });
      }
    }
    // Fall 3: Weder filename noch transcription
    else {
      return res.status(400).json({ error: 'Kein Dateiname oder Transkription angegeben' });
    }

    const actualFilename = path.basename(txtPath);

    // Prompt-Typ automatisch erkennen (durchgabe oder newsletter)
    let promptFlag = '';
    const filenameLower = actualFilename.toLowerCase();
    if (filenameLower.includes('newsletter')) {
      promptFlag = '-newsletter';
      sendProgress('config', 'Erkannt: Newsletter-Modus', 5);
    } else {
      promptFlag = '-durchgabe';
      sendProgress('config', 'Erkannt: Durchgabe-Modus', 5);
    }

    const wslCommand = `cd ${WSL_AUDIO_DIR} && source ${VENV_ACTIVATE} && python ${PYTHON_SCRIPT} ${promptFlag} ${actualFilename}`;

    sendProgress('wsl', 'Starte WSL2 und Python-Environment...', 10);
    logger.debug('SUMMARIZE_LOCAL', `Executing WSL command: ${wslCommand}`);

    const wslProcess = spawn('wsl', ['bash', '-c', wslCommand], { windowsHide: true });

    let outputBuffer = '';
    let errorBuffer = '';

    wslProcess.stdout.on('data', (data) => {
      const output = data.toString('utf8');
      outputBuffer += output;

      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          const cleanLine = stripAnsiCodes(line);

          let progress = 20;
          if (cleanLine.includes('lade summarizer')) progress = 30;
          if (cleanLine.includes('lade tokenizer')) progress = 40;
          if (cleanLine.includes('teile transkription in Blöcke')) progress = 50;
          if (cleanLine.includes('generiere Überschrift')) progress = 60;
          if (cleanLine.includes('summary=')) progress = 70;
          if (cleanLine.includes('Speichern der Summary')) progress = 90;
          if (cleanLine.includes('erfolgreich gespeichert')) progress = 95;

          sendProgress('processing', cleanLine, progress);
        }
      });
    });

    wslProcess.stderr.on('data', (data) => {
      const error = data.toString('utf8');
      errorBuffer += error;
      logger.error('SUMMARIZE_LOCAL', `stderr: ${error}`);
      sendProgress('warning', stripAnsiCodes(error), 0);
    });

    wslProcess.on('close', async (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Temporäre Input-Datei löschen
      if (tempFile && fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
          logger.debug('SUMMARIZE_LOCAL', `✓ Temporäre Input-Datei gelöscht: ${tempFile}`);
        } catch (err) {
          logger.log('SUMMARIZE_LOCAL', `⚠ Fehler beim Löschen der temporären Datei: ${err.message}`);
        }
      }

      if (code !== 0) {
        logger.error('SUMMARIZE_LOCAL', `WSL-Prozess beendet mit Code ${code}`);
        sendProgress('error', `Summarization fehlgeschlagen (Exit-Code: ${code})`, 0);
        return res.status(500).json({
          error: 'Summarization fehlgeschlagen',
          exitCode: code,
          stderr: errorBuffer,
          stdout: outputBuffer
        });
      }

      sendProgress('loading', 'Lade Summary-Datei...', 98);

      const baseName = path.basename(actualFilename, '.txt');
      const summaryPath = path.join(LOCAL_AUDIO_DIR, `${baseName}_s.txt`);

      if (!fs.existsSync(summaryPath)) {
        sendProgress('error', 'Summary-Datei wurde nicht erstellt', 0);
        return res.status(500).json({
          error: 'Summary-Datei nicht gefunden',
          expectedPath: summaryPath
        });
      }

      const summary = fs.readFileSync(summaryPath, 'utf8');

      // Temporäre Output-Datei löschen
      if (tempFile) {
        try {
          fs.unlinkSync(summaryPath);
          logger.debug('SUMMARIZE_LOCAL', `✓ Temporäre Output-Datei gelöscht: ${summaryPath}`);
        } catch (err) {
          logger.log('SUMMARIZE_LOCAL', `⚠ Fehler beim Löschen der temporären Output-Datei: ${err.message}`);
        }
      }

      sendProgress('complete', `Summarization abgeschlossen in ${duration}s`, 100);

      io.to(socketId).emit('summarize:result', {
        transcription: summary,
        filename: `${baseName}_s.txt`
      });

      res.json({
        success: true,
        filename: `${baseName}_s.txt`,
        path: summaryPath,
        transcription: summary,
        duration: parseFloat(duration),
        outputLines: outputBuffer.split('\n').length,
        mode: promptFlag,
        usedTemporaryFile: !!tempFile
      });
    });

    wslProcess.on('error', (error) => {
      logger.error('SUMMARIZE_LOCAL', 'WSL-Prozess Fehler:', error);
      sendProgress('error', `WSL-Fehler: ${error.message}`, 0);

      if (tempFile && fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (err) { /* ignorieren */ }
      }

      res.status(500).json({
        error: 'Fehler beim Starten von WSL',
        details: error.message,
        hint: 'Stelle sicher, dass WSL2 installiert und konfiguriert ist.'
      });
    });

  } catch (error) {
    logger.error('SUMMARIZE_LOCAL', 'Unerwarteter Fehler:', error);
    res.status(500).json({
      error: 'Interner Server-Fehler',
      details: error.message
    });
  }
});

// Hilfsfunktion: ANSI-Codes entfernen
function stripAnsiCodes(str) {
  return str.replace(/\x1B\[[0-9;]*[mGKHf]/g, '');
}

module.exports = router;
