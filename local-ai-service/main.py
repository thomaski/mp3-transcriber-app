"""
MP3 Transcriber - Lokaler KI-Service
=====================================
FastAPI-Service der auf dem lokalen Windows-PC läuft und WSL2 Python-Skripte
für Transkription und Zusammenfassung ausführt.

Wird via Cloudflare Tunnel vom Railway-Backend erreichbar gemacht.

Start:
    uvicorn main:app --host 0.0.0.0 --port 8765
    ODER: start.bat aufrufen

Konfiguration via .env Datei oder Umgebungsvariablen (siehe .env.example).
"""

import json
import os
import re
import subprocess
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# .env laden (falls vorhanden)
load_dotenv()

# ============================================================================
# Konfiguration via Umgebungsvariablen
# ============================================================================
AUDIO_DIR = os.environ.get('AUDIO_DIR', r'D:\Projekte_KI\pyenv_1_transcode_durchgabe\audio')
WSL_AUDIO_DIR = os.environ.get('WSL_AUDIO_DIR', '/mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio')
PYTHON_TRANSCRIBE = os.environ.get('PYTHON_TRANSCRIBE', '/home/tom/transcribe.py')
PYTHON_SUMMARIZE = os.environ.get('PYTHON_SUMMARIZE', '/home/tom/summarize.py')
VENV_ACTIVATE = os.environ.get('VENV_ACTIVATE', '~/pyenv_1_transcode_durchgabe/bin/activate')
API_KEY = os.environ.get('LOCAL_SERVICE_API_KEY', '')  # Leer = kein Auth

app = FastAPI(
    title="MP3 Transcriber Local AI Service",
    description="Lokaler KI-Service für Transkription und Zusammenfassung via WSL2",
    version="1.0.0"
)


# ============================================================================
# API-Key Authentifizierung
# ============================================================================
def verify_api_key(x_api_key: Optional[str] = None):
    """Prüft API-Key wenn konfiguriert (leer = kein Auth erforderlich)"""
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Ungültiger API-Key")


# ============================================================================
# Helper-Funktionen
# ============================================================================
def strip_ansi(text: str) -> str:
    """Entfernt ANSI-Escape-Codes aus Python-Output"""
    return re.sub(r'\x1B\[[0-9;]*[mGKHf]', '', text)


def sse_event(data: dict) -> str:
    """Formatiert ein Server-Sent Event"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def format_file_size(size_bytes: int) -> str:
    """Formatiert Dateigröße lesbar"""
    if size_bytes == 0:
        return "0 Bytes"
    for unit in ['Bytes', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{round(size_bytes, 2)} {unit}"
        size_bytes /= 1024
    return f"{round(size_bytes, 2)} TB"


def format_date(timestamp: float) -> str:
    """Formatiert Timestamp als DD.MM.YYYY HH:MM"""
    d = datetime.fromtimestamp(timestamp)
    return d.strftime("%d.%m.%Y %H:%M")


# ============================================================================
# Pydantic Models
# ============================================================================
class TranscribeRequest(BaseModel):
    filename: str


class SummarizeRequest(BaseModel):
    filename: Optional[str] = None
    transcription: Optional[str] = None
    mp3Filename: Optional[str] = None


# ============================================================================
# Endpunkte: Health & Info
# ============================================================================

@app.get("/health")
def health():
    """Health-Check – wird auch vom Railway-Backend genutzt"""
    return {
        "status": "ok",
        "audio_dir": AUDIO_DIR,
        "audio_dir_exists": os.path.isdir(AUDIO_DIR),
        "wsl_available": _check_wsl_available()
    }


def _check_wsl_available() -> bool:
    """Prüft ob WSL erreichbar ist"""
    try:
        result = subprocess.run(['wsl', 'echo', 'ok'], capture_output=True, timeout=5)
        return result.returncode == 0
    except Exception:
        return False


# ============================================================================
# Endpunkte: Datei-Verwaltung
# ============================================================================

@app.get("/files/info")
def files_info(x_api_key: Optional[str] = Header(None)):
    """Gibt Informationen über das lokale Audio-Verzeichnis zurück"""
    verify_api_key(x_api_key)

    exists = os.path.isdir(AUDIO_DIR)

    if not exists:
        return {"directory": AUDIO_DIR, "exists": False, "wslPath": WSL_AUDIO_DIR}

    all_files = os.listdir(AUDIO_DIR)
    mp3_count = sum(1 for f in all_files if f.lower().endswith('.mp3'))
    txt_count = sum(1 for f in all_files if f.lower().endswith('.txt'))

    return {
        "directory": AUDIO_DIR,
        "exists": True,
        "wslPath": WSL_AUDIO_DIR,
        "isDirectory": True,
        "totalFiles": len(all_files),
        "mp3Files": mp3_count,
        "txtFiles": txt_count
    }


@app.get("/files/list")
def files_list(type: str = "mp3", x_api_key: Optional[str] = Header(None)):
    """Liste lokale MP3 oder TXT Dateien aus dem Audio-Verzeichnis"""
    verify_api_key(x_api_key)

    if not os.path.isdir(AUDIO_DIR):
        raise HTTPException(
            status_code=404,
            detail=f"Verzeichnis nicht gefunden: {AUDIO_DIR}"
        )

    all_files = os.listdir(AUDIO_DIR)

    if type == "mp3":
        filtered = [f for f in all_files if f.lower().endswith('.mp3')]
    elif type == "txt":
        # Nur .txt, NICHT _s.txt (Summary-Dateien)
        filtered = [
            f for f in all_files
            if f.lower().endswith('.txt') and not f.lower().endswith('_s.txt')
        ]
    else:
        raise HTTPException(status_code=400, detail="Ungültiger Typ. Verwende type=mp3 oder type=txt")

    files_with_details = []
    for filename in filtered:
        full_path = os.path.join(AUDIO_DIR, filename)
        stat = os.stat(full_path)
        size = stat.st_size
        files_with_details.append({
            "filename": filename,
            "path": full_path,
            "size": size,
            "sizeFormatted": format_file_size(size),
            "modified": stat.st_mtime * 1000,  # Millisekunden für JS-Kompatibilität
            "modifiedFormatted": format_date(stat.st_mtime)
        })

    # Neueste zuerst
    files_with_details.sort(key=lambda x: x["modified"], reverse=True)

    return {
        "directory": AUDIO_DIR,
        "type": type,
        "count": len(files_with_details),
        "files": files_with_details
    }


@app.post("/files/save")
async def files_save(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(None)
):
    """
    Speichert eine hochgeladene Datei im lokalen Audio-Verzeichnis.
    Wird vom Railway-Backend verwendet wenn eine Datei für lokale Transkription
    hochgeladen wurde.
    """
    verify_api_key(x_api_key)

    if not os.path.isdir(AUDIO_DIR):
        os.makedirs(AUDIO_DIR, exist_ok=True)

    # Sicherer Dateiname mit _temp Suffix
    safe_name = re.sub(r'[^a-zA-Z0-9._\-]', '_', os.path.basename(file.filename))
    ext = Path(safe_name).suffix
    base = Path(safe_name).stem
    temp_filename = f"{base}_temp{ext}"
    target_path = os.path.join(AUDIO_DIR, temp_filename)

    content = await file.read()
    with open(target_path, 'wb') as f:
        f.write(content)

    size_mb = round(len(content) / 1024 / 1024, 2)
    print(f"[LOCAL-SERVICE] ✅ Datei gespeichert: {temp_filename} ({size_mb} MB)")

    return {
        "success": True,
        "filename": temp_filename,
        "originalFilename": safe_name,
        "path": target_path
    }


# ============================================================================
# Endpunkt: Transkription (SSE Streaming)
# ============================================================================

@app.post("/transcribe")
def transcribe(
    body: TranscribeRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Transkribiert eine lokale MP3-Datei mit WSL2 Python (Faster-Whisper).
    Streamt Fortschritt als Server-Sent Events (SSE).

    SSE-Event-Typen:
    - progress: { type, step, message, progress }
    - warning:  { type, step, message, progress }
    - error:    { type, message, exitCode? }
    - complete: { type, transcription, filename, mp3Filename, duration }
    """
    verify_api_key(x_api_key)

    filename = body.filename
    mp3_path = os.path.join(AUDIO_DIR, filename)

    if not os.path.isfile(mp3_path):
        raise HTTPException(status_code=404, detail=f"MP3-Datei nicht gefunden: {filename}")

    is_temp_file = bool(re.match(r'^.+_temp\.[^.]+$', filename))
    display_filename = re.sub(r'_temp(\.[^.]+)$', r'\1', filename)

    def generate():
        start_time = time.time()

        yield sse_event({
            "type": "progress", "step": "init",
            "message": f"Starte Transkription für: {display_filename}",
            "progress": 0
        })

        wsl_cmd = (
            f"cd {WSL_AUDIO_DIR} && "
            f"source {VENV_ACTIVATE} && "
            f"python {PYTHON_TRANSCRIBE} {filename}"
        )

        yield sse_event({
            "type": "progress", "step": "wsl",
            "message": "Starte WSL2 und Python-Environment...",
            "progress": 10
        })

        print(f"[LOCAL-SERVICE] Executing WSL: {wsl_cmd}")

        process = subprocess.Popen(
            ['wsl', 'bash', '-c', wsl_cmd],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

        # stdout live streamen
        for line in process.stdout:
            line = line.strip()
            if not line:
                continue
            clean = strip_ansi(line)
            progress = 20
            if 'Lade Modell' in clean:           progress = 30
            elif 'Modell geladen' in clean:       progress = 50
            elif 'Transkription der mp3' in clean: progress = 60
            elif 'Transkription beendet' in clean: progress = 90
            elif 'erfolgreich gespeichert' in clean: progress = 95
            yield sse_event({
                "type": "progress", "step": "processing",
                "message": clean, "progress": progress
            })

        stderr_output = process.stderr.read()
        if stderr_output:
            for line in stderr_output.split('\n'):
                if line.strip():
                    yield sse_event({
                        "type": "progress", "step": "warning",
                        "message": strip_ansi(line), "progress": 0
                    })

        exit_code = process.wait()
        duration = round(time.time() - start_time, 1)

        # Temp-MP3 löschen
        if is_temp_file and os.path.isfile(mp3_path):
            os.unlink(mp3_path)
            print(f"[LOCAL-SERVICE] ✓ Temp-MP3 gelöscht: {filename}")

        if exit_code != 0:
            print(f"[LOCAL-SERVICE] ❌ WSL exit code: {exit_code}")
            yield sse_event({
                "type": "error", "step": "error",
                "message": f"Transkription fehlgeschlagen (Exit-Code: {exit_code})",
                "exitCode": exit_code
            })
            return

        # Ergebnis laden
        base_name = Path(filename).stem
        txt_path = os.path.join(AUDIO_DIR, f"{base_name}.txt")

        if not os.path.isfile(txt_path):
            yield sse_event({
                "type": "error", "step": "error",
                "message": "Transkriptionsdatei wurde nicht erstellt"
            })
            return

        with open(txt_path, 'r', encoding='utf-8') as f:
            transcription_text = f.read()

        # Temp-TXT löschen
        if is_temp_file and os.path.isfile(txt_path):
            os.unlink(txt_path)
            print(f"[LOCAL-SERVICE] ✓ Temp-TXT gelöscht: {txt_path}")

        display_base = Path(display_filename).stem

        print(f"[LOCAL-SERVICE] ✅ Transkription abgeschlossen in {duration}s")
        yield sse_event({
            "type": "complete", "step": "complete",
            "message": f"Transkription abgeschlossen in {duration}s",
            "progress": 100,
            "transcription": transcription_text,
            "filename": f"{display_base}.txt",
            "mp3Filename": display_filename,
            "duration": duration
        })

    return StreamingResponse(generate(), media_type="text/event-stream")


# ============================================================================
# Endpunkt: Summarization (SSE Streaming)
# ============================================================================

@app.post("/summarize")
def summarize(
    body: SummarizeRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Erstellt Summary einer lokalen TXT-Datei mit WSL2 Python (Llama).
    Streamt Fortschritt als Server-Sent Events (SSE).
    """
    verify_api_key(x_api_key)

    def generate():
        start_time = time.time()
        txt_path = None
        temp_file = None

        # Fall 1: Direkte Transkription → temporäre Datei erstellen
        if body.transcription and body.transcription.strip():
            yield sse_event({
                "type": "progress", "step": "init",
                "message": "Verwende aktuelle Transkription...", "progress": 0
            })

            if body.mp3Filename:
                safe = re.sub(r'[^a-zA-Z0-9._\-]', '_', Path(body.mp3Filename).stem)
                temp_filename = f"{safe}_temp.txt"
            else:
                temp_filename = f"temp_{uuid.uuid4().hex[:8]}_transcription.txt"

            temp_file = os.path.join(AUDIO_DIR, temp_filename)
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(body.transcription)
            txt_path = temp_file

        # Fall 2: Dateiname angegeben
        elif body.filename:
            yield sse_event({
                "type": "progress", "step": "init",
                "message": f"Starte Summarization für: {body.filename}", "progress": 0
            })
            txt_path = os.path.join(AUDIO_DIR, body.filename)
            if not os.path.isfile(txt_path):
                yield sse_event({
                    "type": "error",
                    "message": f"TXT-Datei nicht gefunden: {body.filename}"
                })
                return

        else:
            yield sse_event({
                "type": "error",
                "message": "Kein Dateiname oder Transkription angegeben"
            })
            return

        actual_filename = os.path.basename(txt_path)

        # Prompt-Typ automatisch erkennen
        if 'newsletter' in actual_filename.lower():
            prompt_flag = '-newsletter'
            yield sse_event({
                "type": "progress", "step": "config",
                "message": "Erkannt: Newsletter-Modus", "progress": 5
            })
        else:
            prompt_flag = '-durchgabe'
            yield sse_event({
                "type": "progress", "step": "config",
                "message": "Erkannt: Durchgabe-Modus", "progress": 5
            })

        wsl_cmd = (
            f"cd {WSL_AUDIO_DIR} && "
            f"source {VENV_ACTIVATE} && "
            f"python {PYTHON_SUMMARIZE} {prompt_flag} {actual_filename}"
        )

        yield sse_event({
            "type": "progress", "step": "wsl",
            "message": "Starte WSL2 und Python-Environment...", "progress": 10
        })

        print(f"[LOCAL-SERVICE] Executing WSL: {wsl_cmd}")

        process = subprocess.Popen(
            ['wsl', 'bash', '-c', wsl_cmd],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

        for line in process.stdout:
            line = line.strip()
            if not line:
                continue
            clean = strip_ansi(line)
            progress = 20
            if 'lade summarizer' in clean.lower():          progress = 30
            elif 'lade tokenizer' in clean.lower():          progress = 40
            elif 'teile transkription' in clean.lower():     progress = 50
            elif 'generiere überschrift' in clean.lower():   progress = 60
            elif 'summary=' in clean.lower():                progress = 70
            elif 'speichern der summary' in clean.lower():   progress = 90
            elif 'erfolgreich gespeichert' in clean.lower(): progress = 95
            yield sse_event({
                "type": "progress", "step": "processing",
                "message": clean, "progress": progress
            })

        stderr_output = process.stderr.read()
        if stderr_output:
            for line in stderr_output.split('\n'):
                if line.strip():
                    yield sse_event({
                        "type": "progress", "step": "warning",
                        "message": strip_ansi(line), "progress": 0
                    })

        # Temp-Input-Datei löschen
        if temp_file and os.path.isfile(temp_file):
            os.unlink(temp_file)
            print(f"[LOCAL-SERVICE] ✓ Temp-Input gelöscht: {temp_file}")

        exit_code = process.wait()
        duration = round(time.time() - start_time, 1)

        if exit_code != 0:
            print(f"[LOCAL-SERVICE] ❌ WSL exit code: {exit_code}")
            yield sse_event({
                "type": "error", "step": "error",
                "message": f"Summarization fehlgeschlagen (Exit-Code: {exit_code})",
                "exitCode": exit_code
            })
            return

        # Ergebnis laden (_s.txt Suffix)
        base_name = Path(actual_filename).stem
        summary_path = os.path.join(AUDIO_DIR, f"{base_name}_s.txt")

        if not os.path.isfile(summary_path):
            yield sse_event({
                "type": "error", "step": "error",
                "message": "Summary-Datei wurde nicht erstellt"
            })
            return

        with open(summary_path, 'r', encoding='utf-8') as f:
            summary_text = f.read()

        # Temp-Output-Datei löschen
        if temp_file and os.path.isfile(summary_path):
            os.unlink(summary_path)
            print(f"[LOCAL-SERVICE] ✓ Temp-Output gelöscht: {summary_path}")

        print(f"[LOCAL-SERVICE] ✅ Summarization abgeschlossen in {duration}s")
        yield sse_event({
            "type": "complete", "step": "complete",
            "message": f"Summarization abgeschlossen in {duration}s",
            "progress": 100,
            "transcription": summary_text,
            "filename": f"{base_name}_s.txt",
            "duration": duration,
            "mode": prompt_flag
        })

    return StreamingResponse(generate(), media_type="text/event-stream")
