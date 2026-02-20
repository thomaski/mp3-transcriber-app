const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../../logger');

// Konfiguration
const LOCAL_AUDIO_DIR = 'D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio';
const WSL_AUDIO_DIR = '/mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio';
const PYTHON_SCRIPT = '/home/tom/transcribe.py';
const VENV_ACTIVATE = '~/pyenv_1_transcode_durchgabe/bin/activate';

/**
 * POST /api/transcribe-local
 * Transkribiert eine lokale MP3-Datei mit WSL2 Python
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

    // Prüfen ob Datei existiert
    const mp3Path = path.join(LOCAL_AUDIO_DIR, filename);
    if (!fs.existsSync(mp3Path)) {
      return res.status(404).json({ error: `MP3-Datei nicht gefunden: ${filename}` });
    }

    // Merken ob es eine Temp-Datei ist (enthält _temp vor der Endung)
    const isTempFile = /^.+_temp\.[^.]+$/.test(filename);

    // Socket.io Instanz holen (wird in index.js gesetzt)
    const io = req.app.get('io');

    // Fortschritt senden
    const sendProgress = (step, message, progress = 0) => {
      io.to(socketId).emit('transcribe:progress', { step, message, progress });
      logger.debug('TRANSCRIBE_LOCAL', `${step}: ${message} (${progress}%)`);
    };

    sendProgress('init', `Starte Transkription für: ${filename}`, 0);

    // WSL-Befehl zusammenbauen
    // Format: wsl bash -c "cd /mnt/d/... && source ~/venv/bin/activate && python script.py filename"
    const wslCommand = `cd ${WSL_AUDIO_DIR} && source ${VENV_ACTIVATE} && python ${PYTHON_SCRIPT} ${filename}`;
    
    sendProgress('wsl', 'Starte WSL2 und Python-Environment...', 10);
    logger.debug('TRANSCRIBE_LOCAL', `Executing WSL command: ${wslCommand}`);

    // WSL-Prozess starten mit spawn für Live-Output
    const wslProcess = spawn('wsl', ['bash', '-c', wslCommand]);

    let outputBuffer = '';
    let errorBuffer = '';
    let hasError = false;

    // stdout: Live-Output streamen
    wslProcess.stdout.on('data', (data) => {
      const output = data.toString('utf8');
      outputBuffer += output;
      
      // Jede Zeile einzeln senden für bessere Darstellung
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          // ANSI-Codes erkennen und Status extrahieren
          const cleanLine = stripAnsiCodes(line);
          
          // Fortschritt basierend auf Output schätzen
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
      
      // Auch stderr senden (kann Warnings enthalten)
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
        cleanupTempMp3(); // Temp-Datei auch bei Fehler löschen
        
        return res.status(500).json({
          error: 'Transkription fehlgeschlagen',
          exitCode: code,
          stderr: errorBuffer,
          stdout: outputBuffer
        });
      }

      sendProgress('loading', 'Lade Transkriptionsdatei...', 98);

      // Ergebnis-Datei laden
      const baseName = path.basename(filename, '.mp3');
      const txtPath = path.join(LOCAL_AUDIO_DIR, `${baseName}.txt`);

      if (!fs.existsSync(txtPath)) {
        sendProgress('error', 'Transkriptionsdatei wurde nicht erstellt', 0);
        return res.status(500).json({ 
          error: 'Transkriptionsdatei nicht gefunden',
          expectedPath: txtPath 
        });
      }

      // Datei lesen
      const transcription = fs.readFileSync(txtPath, 'utf8');

      sendProgress('complete', `Transkription abgeschlossen in ${duration}s`, 100);
      cleanupTempMp3(); // Temp-MP3 nach erfolgreicher Transkription löschen

      // Sende Transkription auch via Socket für direktes Update im Frontend
      io.to(socketId).emit('transcribe:result', {
        transcription: transcription,
        filename: `${baseName}.txt`,
        mp3Filename: filename
      });

      res.json({
        success: true,
        filename: `${baseName}.txt`,
        mp3Filename: filename, // Original MP3-Dateiname
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
      cleanupTempMp3(); // Temp-Datei auch bei WSL-Fehler löschen
      
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
  // Entfernt ANSI-Escape-Codes (Farben, etc.)
  return str.replace(/\x1B\[[0-9;]*[mGKHf]/g, '');
}

module.exports = router;
