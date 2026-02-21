@echo off
:: ============================================================================
:: MP3 Transcriber - Lokaler KI-Service Starter
:: ============================================================================
:: Startet den lokalen FastAPI-Service der WSL2-Transkription und 
:: Summarization bereitstellt.
:: 
:: Voraussetzungen:
::   - Python 3.9+ installiert (kann aus dem vorhandenen pyenv verwendet werden)
::   - pip install -r requirements.txt
::   - .env Datei konfiguriert (Kopie von .env.example)
::
:: Der Service wird auf Port 8765 gestartet.
:: Cloudflare Tunnel muss separat gestartet werden um den Service
:: vom Railway-Backend erreichbar zu machen.
:: ============================================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   MP3 Transcriber - Lokaler KI-Service
echo ============================================================

:: .env prüfen
if not exist ".env" (
    echo.
    echo [WARNUNG] .env nicht gefunden! Kopiere .env.example nach .env...
    copy ".env.example" ".env"
    echo [WARNUNG] Bitte .env konfigurieren und danach neu starten!
    pause
    exit /b 1
)

:: Prüfen ob uvicorn vorhanden ist
uvicorn --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [FEHLER] uvicorn nicht gefunden! Bitte installieren:
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo.
echo   Port:    8765
echo   Docs:    http://localhost:8765/docs
echo   Health:  http://localhost:8765/health
echo.
echo   Starte Service...
echo ============================================================
echo.

:: Service starten (reload für Development)
uvicorn main:app --host 0.0.0.0 --port 8765 --reload

pause
