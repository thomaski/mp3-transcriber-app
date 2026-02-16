# ------------------------------------------------------------------------------------------------------------------------------------
# transcribe.py
# 
# Faster-Whisper-Transkription mit interaktiver Auswahl einer MP3-Datei
# Transkription als <original_name>.txt mit Timestamps
# Angepasst: VAD-Filter deaktiviert, condition_on_previous_text aktiviert, beam_size reduziert, optionales Chunking für lange Audios
# ------------------------------------------------------------------------------------------------------------------------------------

# Standard-Bibliotheken für Dateisystem und Systeminteraktion
import os                                # Datei- und Verzeichniszugriff, Pfadmanipulation, Verzeichnisse erstellen
import sys                               #    Kommandozeilenargumente (z. B. -summary Flag), Programmende mit sys.exit
import re                                #    Reguläre Ausdrücke – Textverarbeitung, Wrapping, Timestamp-Erkennung
                                         # Externe Prozesse starten (ffprobe für MP3-Metadaten ohne mutagen-Warnings)
import argparse                          #    Für Kommandozeilen-Argumente
import subprocess                        #    ffprobe aufrufen, um Dauer, Bitrate und Sample-Rate der MP3-Datei zu lesen
                                         # Kern-Bibliotheken für Audio-Transkription und LLM-Inferenz

from faster_whisper import WhisperModel  #    transcribe: Optimiertes Whisper-Modell (CT2-basiert) für Sprach-zu-Text
from datetime import datetime            #    transcribe: Datum und Uhrzeit für Start/Ende/Dauer der Verarbeitung
                                         # Speichermanagement – wichtig bei GPU-Nutzung mit mehreren großen Modellen ---
import gc                                #    Manuelles Auslösen des Garbage Collectors (Speicher freigeben)
import torch                             #    PyTorch-Backend – benötigt für torch.cuda.empty_cache() (GPU-Speicher leeren)
import textwrap                          # Für Zeilenumbruch

# Optionale Importe für Chunking (installiere pydub: pip install pydub)
try:
    from pydub import AudioSegment
    HAS_PYDUB = True
except ImportError:
    HAS_PYDUB = False
    print("\033[1;31mWarnung: pydub nicht installiert. Kein Audio-Chunking für lange Dateien möglich. Installiere mit 'pip install pydub'.\033[0m")

# --------------------------------------------------------------------------
# Parameter für Modell "large-v3": Faster-Whisper mit optimiertem CT2-Format 
# --------------------------------------------------------------------------
MODEL_DESC = "faster-whisper-large-v3: Faster-Whisper mit optimiertem CT2-Format"
#MODEL_NAME = "large-v3"                                     # Whisper large-v3, mit optimiertem CT2-Format
MODEL_NAME = os.path.expanduser("~/faster-whisper-large-v3") # Whisper large-v3, mit optimiertem CT2-Format (lokal)
AUDIO_DIR = "/mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio"
# Parameter für bessere Segment-Längen
USE_VAD = True                   # VAD = Voice Activity Detection Filter (um Stille zu ignorieren)
VAD_PARAMS = dict(
    min_speech_duration_ms=250,
    min_silence_duration_ms=100,
    speech_pad_ms=400            # etwas mehr Padding als vorher
)
BEAM_SIZE = 7                    # 5 oder sogar 7, wenn du Rechenpower übrig hast
                                 # Beam Search ist ein Algorithmus, der multiple Hypothesen (mögliche Transkriptionen) parallel erkundet und die beste wählt. Höherer Wert: Mehr Hypothesen = genauer. Default: 5.
CONDITION_ON_PREV = False        # Kontext beibehalten für längere Sätze
CHUNK_THRESHOLD_SEC = 999999     # 600, praktisch deaktiviert: Chunking, wenn Dauer > 999999 Sek
CHUNK_SIZE_SEC = 600             # Jeder Chunk 10 Min

# -----------------------------------------------------------------------------------------------------------
# Diverse Parameter
# -----------------------------------------------------------------------------------------------------------
# Farbige Terminal-Ausgabe (ANSI-Codes)
def print_header(text):
    print("\033[1;34m" + "═" * 120)
    print("  " + text.center(76) + "  ")
    print("═" * 120 + "\033[0m")

def print_info(text):
    print("\033[1;32m" + "→ " + text + "\033[0m")

def print_error(text):
    print("\033[1;31m" + "✖ " + text + "\033[0m")

def print_success(text):
    print("\033[1;32m" + "✔ " + text + "\033[0m")

def print_result_header():
    print("\033[1;33m" + "═" * 40)
    print(f"Transkript der mp3 Datei:")
    print("═" * 40 + "\033[0m")

# Formatiere timestamp (Sekunden) zu hh:mm:ss
def format_timestamp(seconds):
    if seconds is None:
        return "None"
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)  # Nur ganze Sekunden, Millisekunden entfernen
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

# -----------------------------------------------------------------------------------------------------------
# MP3-Datei für Transkription auswählen
# -----------------------------------------------------------------------------------------------------------
def select_audio_file(args):
    # Prüfen ob Verzeichnis existiert
    if not os.path.isdir(AUDIO_DIR):
        print_error(f"Verzeichnis nicht gefunden: {AUDIO_DIR}")
        print_info("Bitte überprüfen Sie den Pfad in der Variable AUDIO_DIR")
        sys.exit(1)

    # Überprüfen, ob ein MP3-Filename als Parameter übergeben wurde
    selected_file = None
    if args.file:
        param_file = args.file
        full_param_path = os.path.join(AUDIO_DIR, param_file)
        if os.path.exists(full_param_path) and param_file.lower().endswith('.mp3'):
            selected_file = param_file
            print_info(f"Verwende übergebenen Parameter als MP3-Datei: {selected_file}")
        else:
            print_error(f"Übergebener Parameter '{param_file}' ist keine gültige MP3-Datei in {AUDIO_DIR}. Verwende interaktive Auswahl.")

    # Wenn kein gültiger Parameter, interaktive Auswahl
    if selected_file is None:
        # Alle .mp3 Dateien im Verzeichnis sammeln
        mp3_files = [f for f in os.listdir(AUDIO_DIR) if f.lower().endswith('.mp3')]

        if not mp3_files:
            print_error("Keine MP3-Dateien im Verzeichnis gefunden.")
            print_info(f"Ordner: {AUDIO_DIR}")
            sys.exit(1)

        # Dateien nummeriert auflisten
        print_info(f"Gefundene MP3-Dateien ({len(mp3_files)}):")
        print()

        for i, filename in enumerate(mp3_files, 1):
            print(f"  {i:3d} │ {filename}")

        print()

        while True:
            try:
                choice = input("Bitte Nummer der zu transkribierenden Datei eingeben (1–{}): ".format(len(mp3_files)))
                choice = int(choice.strip())
                if 1 <= choice <= len(mp3_files):
                    selected_file = mp3_files[choice - 1]
                    break
                else:
                    print_error(f"Bitte eine Zahl zwischen 1 und {len(mp3_files)} eingeben.")
            except ValueError:
                print_error("Bitte eine gültige Zahl eingeben.")

    # Vollständiger Pfad
    audio_path = os.path.join(AUDIO_DIR, selected_file)

    # Ausgabe-Datei
    base_name = os.path.splitext(selected_file)[0]
    output_path = os.path.join(AUDIO_DIR, f"{base_name}.txt")

    print()
    print_info(f"Ausgewählte Datei:                  {selected_file}")
    print_info(f"Voller Pfad:                        {audio_path}")
    print_info(f"Transkription wird gespeichert als: {base_name}.txt")

    return audio_path, output_path, base_name

# -----------------------------------------------------------------------------------------------------------
# MP3-Details anzeigen (mit ffprobe statt mutagen, um Warnings zu vermeiden)
# -----------------------------------------------------------------------------------------------------------
def get_mp3_details(audio_path):
    try:
        # ffprobe aufrufen, um Duration, Bitrate und Sample Rate zu holen
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries',
            'format=duration,bit_rate', '-select_streams', 'a:0',
            '-show_entries', 'stream=sample_rate',
            '-of', 'default=noprint_wrappers=1', audio_path
        ]
        output = subprocess.check_output(cmd).decode('utf-8').strip()
        lines = output.split('\n')
        
        # Parse die Werte
        duration = None
        bit_rate = None
        sample_rate = None
        for line in lines:
            if line.startswith('duration='):
                duration = float(line.split('=')[1])
            elif line.startswith('bit_rate='):
                bit_rate = int(line.split('=')[1])
            elif line.startswith('sample_rate='):
                sample_rate = int(line.split('=')[1])
        
        if duration is None or bit_rate is None or sample_rate is None:
            raise ValueError("Konnte MP3-Details nicht parsen.")
        
        mp3_duration = duration
        mp3_bitrate = bit_rate / 1000  # in kbps
        mp3_khz = sample_rate / 1000  # in kHz
        
        seconds = int(mp3_duration)
        duration_str = format_timestamp(seconds)
        
        print_info(f"MP3-Details                         ")
        print_info(f"  Dauer:                            {duration_str}")
        print_info(f"  Bitrate:                          {mp3_bitrate:.0f} kbps")
        print_info(f"  Sample-Rate:                      {mp3_khz:.1f} kHz")
        
        return mp3_duration
    except Exception as e:
        print_error(f"Fehler beim Lesen der MP3-Details: {e}. Stelle sicher, dass ffprobe (FFmpeg) installiert ist.")
        return 0  # Fallback für Ratio

# -----------------------------------------------------------------------------------------------------------
# Frage ob Transkription am Bildschirm angezeigt werden soll
# -----------------------------------------------------------------------------------------------------------
def should_show_transcription():
    # show_transcription = input("Transkription am Bildschirm anzeigen? (Enter oder y=ja, n=nein): ").strip().lower()
    # if show_transcription in ['', 'y', 'j']:
    #     show_transcription = True
    # else:
    #     show_transcription = False
    #     print_info("Transkription wird nur gespeichert, nicht angezeigt.")
    show_transcription = True
    print()

    return show_transcription

def load_model_fast_whisper():
    print_info(f"Lade Modell {MODEL_DESC}")
    model = WhisperModel(MODEL_NAME, device="cuda", compute_type="int8_float16")
    return model

def delete(model):
    # GPU-Speicher freigeben
    print_info("Freigeben von GPU-Speicher...")
    del model
    gc.collect()
    torch.cuda.empty_cache()
    print_success("GPU-Speicher freigegeben.")


# -----------------------------------------------------------------------------------------------------------
# Starte MP3-Transkription optionalem Chunking für lange Audios (um Drift zu vermeiden)
# -----------------------------------------------------------------------------------------------------------
def transcribe_audio(model, audio_path, mp3_duration_sec):
    all_segments = []
    chunk_paths = []
    seconds = int(mp3_duration_sec)
    duration_str = format_timestamp(seconds)
    print_info(f"   mp3_duration:    {duration_str}")

    initial_prompt = "Dies ist eine klare, natürliche deutsche Sprache, eine Durchgabe eines Engelmediums welches Engel channelt"
    all_segments, info = model.transcribe(
        audio_path, 
        language="de", 
        beam_size=BEAM_SIZE, 
        vad_filter=USE_VAD, 
        vad_parameters=VAD_PARAMS,
        condition_on_previous_text=CONDITION_ON_PREV,
        initial_prompt=initial_prompt
    )
    all_segments = list(all_segments)  # Zu Liste konvertieren

    return all_segments, chunk_paths

# -----------------------------------------------------------------------------------------------------------
# Textumbruch bei Spalte 80
# -----------------------------------------------------------------------------------------------------------
def wrap_text(text, width=160):
    while True:
        new_text = re.sub(r"(.{1," + str(width-1) + r"})(\s|$)", r"\1\n", text)
        if new_text == text:
            break
        text = new_text
    return text.rstrip("\n")

# -----------------------------------------------------------------------------------------------------------
# Formatierte Transkription mit Timestamps erstellen (nur Start, ohne Millisekunden)
# -----------------------------------------------------------------------------------------------------------
def format_transcription(all_segments, start_date_str, start_time_str, end_time_str, duration_str, mp3_duration, width=160):
    formatted_transcription = ""
    # Modell und Zeitmessung am Anfang hinzufügen
    formatted_transcription += f"Datum:   {start_date_str}\n"
    formatted_transcription += f"Start:   {start_time_str}\n"
    formatted_transcription += f"Ende:    {end_time_str}\n"
    formatted_transcription += f"Dauer:   {duration_str}\n"
    if mp3_duration > 0:
        ratio = (duration_seconds / mp3_duration) * 100
        formatted_transcription += f"Ratio:   {ratio:.2f} % (Transkriptionsdauer / MP3-Dauer)\n"
    else:
        formatted_transcription += "Ratio: Nicht berechenbar (MP3-Dauer unbekannt)\n"
    formatted_transcription += f"Umbruch: bei Spalte {width}\n"
    formatted_transcription += f"Modell:  {MODEL_DESC}\n"
    formatted_transcription += "\n\n\n"   # ← deutlich mehr Abstand
    
    processed_transcription = ""
    for segment in all_segments:
        line = f"[{format_timestamp(segment.start)}] {segment.text}"
        if re.match(r"^\[\d{2}:\d{2}:\d{2}\] ", line):
            timestamp = line[:11]  # [00:00:00] 
            text = line[11:]
            wrapped = wrap_text(text, width=width)
            sublines = wrapped.splitlines()
            if sublines:
                processed_transcription += timestamp + sublines[0] + "\n"
                for sub in sublines[1:]:
                    processed_transcription += " " * 12 + sub + "\n"

    formatted_transcription += processed_transcription

    return formatted_transcription

# -----------------------------------------------------------------------------------------------------------
# Nachkorrektur der Transkription
# -----------------------------------------------------------------------------------------------------------
def correct_transcription(formatted_transcription):
    corrections = {
       "Seeländer Liebe": "Seele der Liebe"
     , "Seel der Liebe Gott zum Gruße": "Seele der Liebe, Gott zum Gruße"
    }
    for wrong, right in corrections.items():
        formatted_transcription = formatted_transcription.replace(wrong, right)
    return formatted_transcription

# -----------------------------------------------------------------------------------------------------------
# Transkription am Bildschirm anzeigen (nur wenn gewünscht)
# -----------------------------------------------------------------------------------------------------------
def display_transcription(show_transcription, formatted_transcription, width=160):
    if show_transcription:
        print("")
        print_result_header()
        lines = formatted_transcription.splitlines()
        for line in lines:
            wrapped_lines = textwrap.wrap(line, width=width)
            for wrapped_line in wrapped_lines:
                print(wrapped_line)

# -----------------------------------------------------------------------------------------------------------
# Transkription speichern
# -----------------------------------------------------------------------------------------------------------
def save_transcription(output_path, formatted_transcription):
    print_info("═" * 40)
    print_info(f"Speichern der Transkription")
    print_info("═" * 40)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(formatted_transcription)
        print_success(f"Transkription erfolgreich gespeichert:")
        print_info(output_path)
    except Exception as e:
        print_error(f"Fehler beim Speichern der Datei: {e}")

# -----------------------------------------------------------------------------------------------------------
# Zeitmessung anzeigen
# -----------------------------------------------------------------------------------------------------------
def display_time_for_transcription(start_date_str, start_time_str, end_time_str, duration_str, mp3_duration, duration_seconds):
    print()
    print_success("Transkription abgeschlossen")
    print_info(f"Datum:   {start_date_str}")
    print_info(f"Start:   {start_time_str}")
    print_info(f"Ende:    {end_time_str}")
    print_info(f"Dauer:   {duration_str}")

    if mp3_duration > 0:
        ratio = (duration_seconds / mp3_duration) * 100
        print_info(f"Ratio:   {ratio:.2f} % (Transkriptionsdauer / MP3-Dauer)")
    else:
        print_info("Ratio: Nicht berechenbar (MP3-Dauer unbekannt)")

# Temp-Chunks löschen, falls vorhanden
def cleanup_chunks(chunk_paths):
    for chunk_path in chunk_paths:
        os.remove(chunk_path)

# ────────────────────────────────────────────────
# Starte Hauptprogramm
# ────────────────────────────────────────────────
def main():
    global duration_seconds  # Um im format_transcription zugreifen zu können

    # Argument-Parser – ALLE Parameter sind optional / benannt
    parser = argparse.ArgumentParser(description="Transkription von MP3-Dateien mit Faster-Whisper.")
    parser.add_argument('file', nargs='?', default=None,
                        help="Optionaler MP3-Dateiname (relativ zu AUDIO_DIR)")
    parser.add_argument('-w', '--width', type=int, default=160,
                        help="Spaltenwert für Zeilenumbruch (default: 160)")
    
    args = parser.parse_args()
    
    print("")
    print_header(f"Transkription von MP3-Dateien mit {MODEL_DESC}")

    audio_path, output_path, base_name = select_audio_file(args)

    mp3_duration = get_mp3_details(audio_path)

    show_transcription = should_show_transcription()

    # -----------------------------------------------------------------------------------------------------------
    # Zeitmessung starten
    # -----------------------------------------------------------------------------------------------------------
    start_time = datetime.now()
    start_date_str = start_time.strftime("%d.%m.%Y") # dd.mm.yyyy
    start_time_str = start_time.strftime("%H:%M:%S") # hh:mm:ss

    print_info("═" * 40)
    print_info(f"Transkription der mp3 Datei")
    print_info("═" * 40)
    print_info(f"Start der Transkription: {start_time_str}")

    # Modell laden
    model_fast_whisper = load_model_fast_whisper()
    
    end_time_lm = datetime.now()
    duration_lm_seconds = (end_time_lm - start_time).total_seconds()
    duration_lm_str = format_timestamp(duration_lm_seconds)
    print_success(f"Modell geladen, Dauer = {duration_lm_str}")

    # Transkription starten
    all_segments, chunk_paths = transcribe_audio(model_fast_whisper, audio_path, mp3_duration)

    # GPU-Speicher freigeben
    delete(model_fast_whisper)

    # Zeitmessung beenden
    end_time = datetime.now()
    end_time_str = end_time.strftime("%H:%M:%S")
    duration_seconds = (end_time - start_time).total_seconds()
    duration_str = format_timestamp(duration_seconds)

    # Transkription formatieren (width wird jetzt korrekt weitergegeben)
    formatted_transcription = format_transcription(
        all_segments, start_date_str, start_time_str, end_time_str, 
        duration_str, mp3_duration, width=args.width
    )
    formatted_transcription = correct_transcription(formatted_transcription)

    print_success(f"Transkription beendet um {end_time_str}, Dauer = {duration_str}")

    # Anzeigen & Speichern
    display_transcription(show_transcription, formatted_transcription, width=args.width)
    save_transcription(output_path, formatted_transcription)

    # Zeitinfo
    display_time_for_transcription(start_date_str, start_time_str, end_time_str, duration_str, mp3_duration, duration_seconds)

    cleanup_chunks(chunk_paths)

    print()


if __name__ == "__main__":
    main()