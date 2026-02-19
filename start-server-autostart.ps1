# MP3 Transcriber Server Auto-Start
Set-Location "D:\Projekte\git\mp3-transcriber-app"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Minimized
