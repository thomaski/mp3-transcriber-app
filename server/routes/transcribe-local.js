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
const PYTHON_SCRIPT = '/home/tom/transcribe.py';
const VENV_ACTIVATE = '~/pyenv_1_transcode_durchgabe/bin/activate';

// Cloud-Mode: wenn LOCAL_TRANSCRIBE_SERVICE_URL gesetzt ist, wird HTTP-Proxy verwendet
// statt direkt WSL2 aufzurufen (notwendig für Railway-Deployment).
const LOCAL_SERVICE_URL = process.env.LOCAL_TRANSCRIBE_SERVICE_URL;
const LOCAL_SERVICE_API_KEY = process.env.LOCAL_SERVICE_API_KEY || '';

/**
 * POST /api/transcribe-local
 * Transkribiert eine lokale MP3-Datei.
 *
 * Modi:
 *  - LOCAL_MODE:  Direkter WSL2-Aufruf via spawn() (Standard bei lokalem Betrieb)
 *  - CLOUD_MODE:  HTTP-Proxy zum lokalen FastAPI-Service (bei Railway-Deployment,
 *                 wenn LOCAL_TRANSCRIBE_SERVICE_URL gesetzt ist)
 *
 * Body: { filename: "test.mp3", socketId: "xxx" }
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { filename, socketId } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Kein Dateiname angegeben' });
    }
    if (!socketId) {
      return res.status(400).json({ error: 'Keine Socket-ID angegeben' });
    }

    const io = req.app.get('io');

    const sendProgress = (step, message, progress = 0) => {
      io.to(socketId).emit('transcribe:progress', { step, message, progress });
      logger.debug('TRANSCRIBE_LOCAL', `${step}: ${message} (${progress}%)`);
    };

    // =========================================================================
    // CLOUD-MODE: HTTP-Proxy zum lokalen FastAPI-Service
    // =========================================================================
    if (LOCAL_SERVICE_URL) {
      logger.log('TRANSCRIBE_LOCAL', `Cloud-Mode: Proxy-Request an ${LOCAL_SERVICE_URL}/transcribe`);
      sendProgress('init', 'Verbinde mit lokalem KI-Service...', 5);

      try {
        const serviceResponse = await axios.post(
          `${LOCAL_SERVICE_URL}/transcribe`,
          { filename },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(LOCAL_SERVICE_API_KEY && { 'x-api-key': LOCAL_SERVICE_API_KEY })
            },
            responseType: 'stream',
            timeout: 600000 // 10 Minuten Timeout für lange Transkriptionen
          }
        );

        let finalResult = null;
        let hasError = false;
        let sseBuffer = '';

        serviceResponse.data.on('data', (chunk) => {
          sseBuffer += chunk.toString('utf8');

          // SSE-Events aus Buffer extrahieren (getrennt durch '\n\n')
          const parts = sseBuffer.split('\n\n');
          sseBuffer = parts.pop(); // letztes ggf. unvollständig → zurück in Buffer

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
              logger.warn('TRANSCRIBE_LOCAL', `SSE Parse-Fehler: ${parseErr.message}`);
            }
          }
        });

        serviceResponse.data.on('end', () => {
          if (hasError) {
            return res.status(500).json({ error: 'Transkription fehlgeschlagen' });
          }
          if (!finalResult) {
            return res.status(500).json({ error: 'Kein Ergebnis vom lokalen Service erhalten' });
          }

          // Ergebnis via Socket senden (identisch zum Local-Mode)
          io.to(socketId).emit('transcribe:result', {
            transcription: finalResult.transcription,
            filename: finalResult.filename,
            mp3Filename: finalResult.mp3Filename
          });

          res.json({
            success: true,
            filename: finalResult.filename,
            mp3Filename: finalResult.mp3Filename,
            transcription: finalResult.transcription,
            duration: finalResult.duration,
            mode: 'cloud-proxy'
          });
        });

        serviceResponse.data.on('error', (err) => {
          logger.error('TRANSCRIBE_LOCAL', 'Stream-Fehler vom lokalen Service:', err.message);
          sendProgress('error', `Verbindungsfehler zum lokalen Service: ${err.message}`, 0);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Verbindungsfehler zum lokalen KI-Service',
              details: err.message
            });
          }
        });

      } catch (serviceErr) {
        logger.error('TRANSCRIBE_LOCAL', 'Lokaler Service nicht erreichbar:', serviceErr.message);
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

    // Prüfen ob Datei existiert
    const mp3Path = path.join(LOCAL_AUDIO_DIR, filename);
    if (!fs.existsSync(mp3Path)) {
      return res.status(404).json({ error: `MP3-Datei nicht gefunden: ${filename}` });
    }

    // Merken ob es eine Temp-Datei ist (enthält _temp vor der Endung)
    const isTempFile = /^.+_temp\.[^.]+$/.test(filename);

    // Anzeigename für UI-Meldungen: _temp Suffix entfernen (z.B. "newsletter_temp.mp3" → "newsletter.mp3")
    const displayFilename = filename.replace(/_temp(\.[^.]+)$/, '$1');

    sendProgress('init', `Starte Transkription für: ${displayFilename}`, 0);

    // WSL-Befehl zusammenbauen
    const wslCommand = `cd ${WSL_AUDIO_DIR} && source ${VENV_ACTIVATE} && python ${PYTHON_SCRIPT} ${filename}`;

    sendProgress('wsl', 'Starte WSL2 und Python-Environment...', 10);
    logger.debug('TRANSCRIBE_LOCAL', `Executing WSL command: ${wslCommand}`);

    // WSL-Prozess starten mit spawn für Live-Output
    const wslProcess = spawn('wsl', ['bash', '-c', wslCommand], { windowsHide: true });

    let outputBuffer = '';
    let errorBuffer = '';

    // stdout: Live-Output streamen
    wslProcess.stdout.on('data', (data) => {
      const output = data.toString('utf8');
      outputBuffer += output;

      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          const cleanLine = stripAnsiCodes(line);

          let progress = 20;
          if (cleanLine.includes('Lade Modell')) progress = 30;
          if (cleanLine.includes('Modell geladen')) progress = 50;
          if (cleanLine.includes('Transkription der mp3')) progress = 60;
          if (cleanLine.includes('Transkription beendet')) progress = 90;
          if (cleanLine.includes('erfolgreich gespeichert')) progress = 95;

          sendProgress('processing', cleanLine, progress);
        }
      });
    });

    // stderr: Fehler sammeln
    wslProcess.stderr.on('data', (data) => {
      const error = data.toString('utf8');
      errorBuffer += error;
      logger.error('TRANSCRIBE_LOCAL', `stderr: ${error}`);
      sendProgress('warning', stripAnsiCodes(error), 0);
    });

    // Hilfsfunktion: Temp-MP3-Datei aufräumen
    const cleanupTempMp3 = () => {
      if (isTempFile && fs.existsSync(mp3Path)) {
        try {
          fs.unlinkSync(mp3Path);
          logger.log('TRANSCRIBE_LOCAL', `✓ Temp-MP3 gelöscht: ${filename}`);
        } catch (err) {
          logger.log('TRANSCRIBE_LOCAL', `⚠ Fehler beim Löschen der Temp-MP3: ${err.message}`);
        }
      }
    };

    // Prozess beendet
    wslProcess.on('close', async (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (code !== 0) {
        logger.error('TRANSCRIBE_LOCAL', `WSL-Prozess beendet mit Code ${code}`);
        sendProgress('error', `Transkription fehlgeschlagen (Exit-Code: ${code})`, 0);
        cleanupTempMp3();
        return res.status(500).json({
          error: 'Transkription fehlgeschlagen',
          exitCode: code,
          stderr: errorBuffer,
          stdout: outputBuffer
        });
      }

      sendProgress('loading', 'Lade Transkriptionsdatei...', 98);

      const baseName = path.basename(filename, '.mp3');
      const txtPath = path.join(LOCAL_AUDIO_DIR, `${baseName}.txt`);

      if (!fs.existsSync(txtPath)) {
        sendProgress('error', 'Transkriptionsdatei wurde nicht erstellt', 0);
        return res.status(500).json({
          error: 'Transkriptionsdatei nicht gefunden',
          expectedPath: txtPath
        });
      }

      const transcription = fs.readFileSync(txtPath, 'utf8');

      // Temp-TXT-Output löschen
      if (isTempFile && fs.existsSync(txtPath)) {
        try {
          fs.unlinkSync(txtPath);
          logger.log('TRANSCRIBE_LOCAL', `✓ Temp-TXT gelöscht: ${txtPath}`);
        } catch (err) {
          logger.log('TRANSCRIBE_LOCAL', `⚠ Fehler beim Löschen der Temp-TXT: ${err.message}`);
        }
      }

      sendProgress('complete', `Transkription abgeschlossen in ${duration}s`, 100);
      cleanupTempMp3();

      io.to(socketId).emit('transcribe:result', {
        transcription: transcription,
        filename: `${path.basename(displayFilename, path.extname(displayFilename))}.txt`,
        mp3Filename: displayFilename
      });

      res.json({
        success: true,
        filename: `${path.basename(displayFilename, path.extname(displayFilename))}.txt`,
        mp3Filename: displayFilename,
        path: txtPath,
        transcription: transcription,
        duration: parseFloat(duration),
        outputLines: outputBuffer.split('\n').length
      });
    });

    // Fehlerbehandlung
    wslProcess.on('error', (error) => {
      logger.error('TRANSCRIBE_LOCAL', 'WSL-Prozess Fehler:', error);
      sendProgress('error', `WSL-Fehler: ${error.message}`, 0);
      cleanupTempMp3();
      res.status(500).json({
        error: 'Fehler beim Starten von WSL',
        details: error.message,
        hint: 'Stelle sicher, dass WSL2 installiert und konfiguriert ist.'
      });
    });

  } catch (error) {
    logger.error('TRANSCRIBE_LOCAL', 'Unerwarteter Fehler:', error);
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
