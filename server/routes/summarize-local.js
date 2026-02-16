const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Konfiguration
const LOCAL_AUDIO_DIR = 'D:\\Projekte_KI\\pyenv_1_transcode_durchgabe\\audio';
const WSL_AUDIO_DIR = '/mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio';
const PYTHON_SCRIPT = '/home/tom/summarize.py';
const VENV_ACTIVATE = '~/pyenv_1_transcode_durchgabe/bin/activate';

/**
 * POST /api/summarize-local
 * Erstellt Summary einer lokalen TXT-Datei mit WSL2 Python
 * Body: { filename: "test.txt", socketId: "xxx" }
 *   ODER: { transcription: "...", socketId: "xxx" } (für direkte Transkription)
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { filename, transcription, socketId } = req.body;

    if (!socketId) {
      return res.status(400).json({ error: 'Keine Socket-ID angegeben' });
    }

    // Socket.io Instanz holen
    const io = req.app.get('io');

    // Fortschritt senden
    const sendProgress = (step, message, progress = 0) => {
      io.to(socketId).emit('summarize:progress', { step, message, progress });
      console.log(`[Summarize] ${step}: ${message} (${progress}%)`);
    };

    let txtPath;
    let tempFile = null;

    // Fall 1: Direkte Transkription verwenden (temporäre Datei erstellen)
    if (transcription && transcription.trim()) {
      sendProgress('init', 'Verwende aktuelle Transkription...', 0);
      
      // Temporären Dateinamen generieren
      const tempFilename = `temp_${Date.now()}_transcription.txt`;
      tempFile = path.join(LOCAL_AUDIO_DIR, tempFilename);
      
      // Transkription in temporäre Datei schreiben
      fs.writeFileSync(tempFile, transcription, 'utf8');
      txtPath = tempFile;
      
      sendProgress('init', `Temporäre Datei erstellt: ${tempFilename}`, 5);
      console.log(`✓ Temporäre Datei erstellt: ${tempFile}`);
      
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

    // WSL-Befehl zusammenbauen
    const wslCommand = `cd ${WSL_AUDIO_DIR} && source ${VENV_ACTIVATE} && python ${PYTHON_SCRIPT} ${promptFlag} ${actualFilename}`;
    
    sendProgress('wsl', 'Starte WSL2 und Python-Environment...', 10);
    console.log(`[Summarize] Executing WSL command: ${wslCommand}`);

    // WSL-Prozess starten mit spawn für Live-Output
    const wslProcess = spawn('wsl', ['bash', '-c', wslCommand]);

    let outputBuffer = '';
    let errorBuffer = '';

    // stdout: Live-Output streamen
    wslProcess.stdout.on('data', (data) => {
      const output = data.toString('utf8');
      outputBuffer += output;
      
      // Jede Zeile einzeln senden
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          const cleanLine = stripAnsiCodes(line);
          
          // Fortschritt basierend auf Output schätzen
          let progress = 20;
          if (cleanLine.includes('lade summarizer')) progress = 30;
          if (cleanLine.includes('lade tokenizer')) progress = 40;
          if (cleanLine.includes('teile transkription in Blöcke')) progress = 50;
          if (cleanLine.includes('generiere Überschrift')) progress = 60;
          if (cleanLine.includes('summary=')) progress = 70; // Einzelne Überschriften
          if (cleanLine.includes('Speichern der Summary')) progress = 90;
          if (cleanLine.includes('erfolgreich gespeichert')) progress = 95;
          
          sendProgress('processing', cleanLine, progress);
        }
      });
    });

    // stderr: Fehler sammeln
    wslProcess.stderr.on('data', (data) => {
      const error = data.toString('utf8');
      errorBuffer += error;
      console.error(`[Summarize] stderr: ${error}`);
      
      // Auch stderr senden (kann Warnings enthalten)
      sendProgress('warning', stripAnsiCodes(error), 0);
    });

    // Prozess beendet
    wslProcess.on('close', async (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Temporäre Input-Datei löschen (falls erstellt)
      if (tempFile && fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
          console.log(`✓ Temporäre Input-Datei gelöscht: ${tempFile}`);
        } catch (err) {
          console.warn(`⚠ Fehler beim Löschen der temporären Datei: ${err.message}`);
        }
      }
      
      if (code !== 0) {
        console.error(`[Summarize] WSL-Prozess beendet mit Code ${code}`);
        sendProgress('error', `Summarization fehlgeschlagen (Exit-Code: ${code})`, 0);
        
        return res.status(500).json({
          error: 'Summarization fehlgeschlagen',
          exitCode: code,
          stderr: errorBuffer,
          stdout: outputBuffer
        });
      }

      sendProgress('loading', 'Lade Summary-Datei...', 98);

      // Ergebnis-Datei laden (mit _s.txt Suffix)
      const baseName = path.basename(actualFilename, '.txt');
      const summaryPath = path.join(LOCAL_AUDIO_DIR, `${baseName}_s.txt`);

      if (!fs.existsSync(summaryPath)) {
        sendProgress('error', 'Summary-Datei wurde nicht erstellt', 0);
        return res.status(500).json({ 
          error: 'Summary-Datei nicht gefunden',
          expectedPath: summaryPath 
        });
      }

      // Datei lesen
      const summary = fs.readFileSync(summaryPath, 'utf8');

      // Temporäre Output-Datei auch löschen (falls erstellt von temp input)
      if (tempFile) {
        try {
          fs.unlinkSync(summaryPath);
          console.log(`✓ Temporäre Output-Datei gelöscht: ${summaryPath}`);
        } catch (err) {
          console.warn(`⚠ Fehler beim Löschen der temporären Output-Datei: ${err.message}`);
        }
      }

      sendProgress('complete', `Summarization abgeschlossen in ${duration}s`, 100);

      // Sende Summary auch via Socket für direktes Update im Frontend
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

    // Fehlerbehandlung
    wslProcess.on('error', (error) => {
      console.error(`[Summarize] WSL-Prozess Fehler:`, error);
      sendProgress('error', `WSL-Fehler: ${error.message}`, 0);
      
      // Temporäre Datei aufräumen bei Fehler
      if (tempFile && fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (err) {
          console.warn(`⚠ Fehler beim Löschen der temporären Datei nach WSL-Fehler: ${err.message}`);
        }
      }
      
      res.status(500).json({
        error: 'Fehler beim Starten von WSL',
        details: error.message,
        hint: 'Stelle sicher, dass WSL2 installiert und konfiguriert ist.'
      });
    });

  } catch (error) {
    console.error('[Summarize] Unerwarteter Fehler:', error);
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
