# ------------------------------------------------------------------------------------------------------------------------------------
# summarize.py
# 
# Summary der Transkription mit Llama-CT2
# Liest eine Textdatei ein (z. B. transcription.txt) und fügt abstraktive Überschriften hinzu
# ------------------------------------------------------------------------------------------------------------------------------------

# Standard-Bibliotheken für Dateisystem und Systeminteraktion
import os                                # Datei- und Verzeichniszugriff, Pfadmanipulation, Verzeichnisse erstellen
import sys                               #    Kommandozeilenargumente (z. B. -summary Flag), Programmende mit sys.exit
import re                                #    Reguläre Ausdrücke – Textverarbeitung, Wrapping, Timestamp-Erkennung
                                         # Externe Prozesse starten (ffprobe für MP3-Metadaten ohne mutagen-Warnings)
import argparse  # Für Kommandozeilen-Argumente
import subprocess                        #    ffprobe aufrufen, um Dauer, Bitrate und Sample-Rate der MP3-Datei zu lesen
                                         # Kern-Bibliotheken für Audio-Transkription und LLM-Inferenz
from transformers import AutoTokenizer   #    Automatisches Laden des Tokenizers für das Summarization-Modell
import ctranslate2                       #    Sehr schnelle C++-basierte Inferenz-Engine für quantisierte Modelle (CT2-Format)
                                         # Speichermanagement – wichtig bei GPU-Nutzung mit mehreren großen Modellen ---
import gc                                #    Manuelles Auslösen des Garbage Collectors (Speicher freigeben)
import torch                             #    PyTorch-Backend – benötigt für torch.cuda.empty_cache() (GPU-Speicher leeren)
from datetime import datetime
import textwrap                          # Für Umbruch

# -----------------------------------------------------------------------------------------------------------
# Diverse Parameter
# -----------------------------------------------------------------------------------------------------------
AUDIO_DIR = "/mnt/d/Projekte_KI/pyenv_1_transcode_durchgabe/audio"
WRAP_WIDTH = 160  # Variable für Textumbruch (kann geändert werden)

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

# GPU-Speicher anzeigen
def print_gpu_memory():
    test=1
    #if torch.cuda.is_available():
    #    print_info("GPU-Speicherverbrauch:")
    #    print(torch.cuda.memory_summary(abbreviated=True))
    #else:
    #    print_info("Keine CUDA-GPU verfügbar – läuft auf CPU")
    
# -----------------------------------------------------------------------------------------------------------
# MP3-Details anzeigen (mit ffprobe statt mutagen, um Warnings zu vermeiden)  
# -----------------------------------------------------------------------------------------------------------
def get_mp3_details(audio_path):  
    try:  
        # ffprobe aufrufen, um die Dauer zu erhalten  
        result = subprocess.run(  
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audio_path],  
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True  
        )  
        mp3_duration = float(result.stdout.strip())  
        return mp3_duration  
    except Exception as e:  
        print_error(f"Fehler beim Abrufen der MP3-Details: {e}")  
        return 0  # Fallback auf 0, falls ffprobe nicht funktioniert  

# Formatiere timestamp (Sekunden) zu hh:mm:ss  
def format_timestamp(seconds):  
    if seconds <= 0:  
        return "        "  # Leerzeichen für Ausrichtung, wenn Datei nicht existiert oder Fehler
    hours = int(seconds // 3600)  
    minutes = int((seconds % 3600) // 60)  
    secs = int(seconds % 60)  # Nur ganze Sekunden, Millisekunden entfernen  
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"  

# -----------------------------------------------------------------------------------------------------------
# TXT-Datei für Summary auswählen (analog zu MP3-Auswahl in transcribe.py)
# -----------------------------------------------------------------------------------------------------------
def select_text_file(args):
    # Prüfen ob Verzeichnis existiert
    if not os.path.isdir(AUDIO_DIR):
        print_error(f"Verzeichnis nicht gefunden: {AUDIO_DIR}")
        print_info("Bitte überprüfen Sie den Pfad in der Variable AUDIO_DIR")
        sys.exit(1)

    # Überprüfen, ob ein TXT-Filename als Parameter übergeben wurde
    selected_file = None
    if args.file:
        param_file = args.file
        full_param_path = os.path.join(AUDIO_DIR, param_file)
        if os.path.exists(full_param_path) and param_file.lower().endswith('.txt'):
            selected_file = param_file
            print_info(f"Verwende übergebenen Parameter als TXT-Datei: {selected_file}")
        else:
            print_error(f"Übergebener Parameter '{param_file}' ist keine gültige TXT-Datei in {AUDIO_DIR}. Verwende interaktive Auswahl.")

    # Wenn kein gültiger Parameter, interaktive Auswahl
    if selected_file is None:
        # Alle .txt Dateien im Verzeichnis sammeln
        txt_files = [f for f in os.listdir(AUDIO_DIR) if f.lower().endswith('.txt')]

        if not txt_files:
            print_error("Keine TXT-Dateien im Verzeichnis gefunden.")
            print_info(f"Ordner: {AUDIO_DIR}")
            sys.exit(1)

        # Dateien nummeriert auflisten mit Dauer der korrespondierenden MP3
        print_info(f"Gefundene TXT-Dateien ({len(txt_files)}):")
        print()

        for i, filename in enumerate(txt_files, 1):
            base_name = os.path.splitext(filename)[0]
            mp3_path = os.path.join(AUDIO_DIR, f"{base_name}.mp3")
            duration = get_mp3_details(mp3_path) if os.path.exists(mp3_path) else 0
            duration_str = format_timestamp(duration)
            print(f"  {i:3d} │{duration_str}│ {filename}")

        print()

        while True:
            try:
                choice = input("Bitte Nummer der zu summarisierenden Datei eingeben (1–{}): ".format(len(txt_files)))
                choice = int(choice.strip())
                if 1 <= choice <= len(txt_files):
                    selected_file = txt_files[choice - 1]
                    break
                else:
                    print_error(f"Bitte eine Zahl zwischen 1 und {len(txt_files)} eingeben.")
            except ValueError:
                print_error("Bitte eine gültige Zahl eingeben.")

    # Vollständiger Pfad
    input_path = os.path.join(AUDIO_DIR, selected_file)

    # Ausgabe-Datei
    base_name = os.path.splitext(selected_file)[0]
    output_path = os.path.join(AUDIO_DIR, f"{base_name}_s.txt")

    print()
    print_info(f"Ausgewählte Datei:                  {selected_file}")
    print_info(f"Voller Pfad:                        {input_path}")
    print_info(f"Summary wird gespeichert als:       {base_name}_s.txt")

    # MP3-Dauer holen für Ratio
    mp3_path = input_path.replace('.txt', '.mp3')
    mp3_duration = get_mp3_details(mp3_path) if os.path.exists(mp3_path) else 0

    return input_path, output_path, base_name, mp3_duration

# -----------------------------------------------------------------------------------------------------------
# Summarize Transkription mit Llama-3-8B-CT2 (nur wenn -summary Flag gesetzt)
# -----------------------------------------------------------------------------------------------------------
def summarize_transcription_llama(formatted_transcription, prompt_type, mp3_duration):
    print_info(f"Starte summarize_transcription (Llama-3-8B-CT2)")
    print_gpu_memory()  # ← GPU-Verbrauch vor dem Start anzeigen
    
    # Startzeit für Summary messen
    start_time = datetime.now()
    start_time_str = start_time.strftime("%H:%M:%S")

    # CT2-Generator laden (nutzt CUDA, falls verfügbar)
    print_info(f"  ..lade summarizer")
    #model_path = os.path.expanduser("~/Llama-3-8B-CT2_int8")                            # lokales Llama 3.0-8B CT2 (int8)
    #model_path = os.path.expanduser("~/Llama-3-8B-CT2_int8_float16")                    # lokales Llama 3.0-8B CT2 (int8_float16)
    model_path = os.path.expanduser("~/Llama-3.1-8B-CT2_int8_float16")                   # lokales Llama 3.1-8B CT2 (int8_float16)

    device = "cuda"  # Versuche CUDA zuerst
    try:
        generator = ctranslate2.Generator(model_path, device="cuda")
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            print_error("CUDA out of memory – Versuche CPU-Fallback.")
            generator = ctranslate2.Generator(model_path, device="cpu")
        else:
            raise e
    
    print_gpu_memory()  # ← nach Modell-Laden
    
    # Tokenizer laden (lokal!)
    print_info(f"  ..lade tokenizer")
    #tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")                # Llama Tokenizer 3.1-8B (remote)
    #tokenizer = AutoTokenizer.from_pretrained(os.path.expanduser("~/Llama-3-8B-CT2_int8_float16"))  # Llama Tokenizer 3.1-8B CT2 (int8_float16)
    tokenizer = AutoTokenizer.from_pretrained(os.path.expanduser("~/Llama-3.1-8B-CT2_int8_float16")) # Llama Tokenizer 3.1-8B CT2 (int8_float16)
    
    # Transkription in Blöcke aufteilen: EinBlock ist 20 Zeilen (block_size=20)
    block_size=20
    overlap_size = block_size // 2  # 50% Overlap, z.B. 10 Zeilen
    print_info(f"  ..teile transkription in Blöcke (Blockgröße: {block_size} Zeilen, Overlap: {overlap_size})")
    lines = formatted_transcription.split("\n")
    header_end = lines.index("") + 1 if "" in lines else 7  # Dynamisch Header-Ende finden (Leerzeile)
    content_lines = lines[header_end:]
    blocks = []
    for i in range(0, len(content_lines), block_size - overlap_size):
        block = content_lines[i:i + block_size]
        if block:
            blocks.append(block)
    enhanced = ""  # Wird später mit Transkription + Überschriften gefüllt
    summaries = []  # Sammle alle Block-Überschriften für Gesamtzusammenfassung
    
    # Wähle den System-Prompt basierend auf prompt_type
    if prompt_type == "newsletter":
        system_content = ( "Du bist ein präziser Zusammenfasser. Antworte NUR mit EINEM kurzen Satz auf Deutsch. "
                           "Kein Reasoning, keine Einleitung, kein Nachsatz, nichts anderes. Ende mit einem Punkt. "
                           "KEIN Englisch, KEINE Sternchen, KEINE Wörter wie assistant oder here is. "
                           "Es geht bei dem Text generell um spirituelle Botschaften an mehrere Menschen zu Weltgeschehen."
                           "Verwende NIEMALS die 'Du'-Form, sondern stattdessen IMMER die 'Ihr'-Form."
                           "Erkenne den Kontext der Botschaft an die Gruppe. Bleibe nah am Inhalt ohne Abhebung."
        )
    else:  # durchgabe
        system_content = ( "Du bist ein präziser Zusammenfasser. Antworte NUR mit EINEM kurzen Satz auf Deutsch. "
                           "Kein Reasoning, keine Einleitung, kein Nachsatz, nichts anderes. Ende mit einem Punkt. "
                           "KEIN Englisch, KEINE Sternchen, KEINE Wörter wie assistant oder here is. "
                           "Verwende die 'Du'-Form wo passend für persönliche Referenzen auf 'Seele der Liebe', "
                           "aber variiere die Satzstruktur für natürliche Zusammenfassungen. "
                           "Der Text ist eine spirituelle Beratung eines Engels an einen Menschen ('Du' als Adressat). "
                           "Erkenne den Kontext der Botschaft an den Menschen. " 
                           "Fasse den Rat des Engels präzise zusammen, bleibe nah am Inhalt ohne Abhebung."
        )

    # ---------------------------------------------------------------------------------------------------------------
    # 1. Blockweise Zusammenfassungen
    # ---------------------------------------------------------------------------------------------------------------
    print_info(f"  ..generiere Überschrift für jeden Block")
    for block in blocks:
        text = " ".join([re.sub(r'\[\d{2}:\d{2}:\d{2}\] ', '', l) for l in block if re.match(r'\[\d{2}:\d{2}:\d{2}\] ', l)])
        #print_info(f"    .. block=\n{text}\n\n")

        # Sehr strikten prompt als Chat-Message formatieren
        #print_info(f"    ..übergebe prompt-Anweisung an tokenizer")
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": f"Zusammenfassen in einem Satz: {text}"}
        ]
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        #print_info(f"    .. prompt= {prompt}\n")
        
        # Tokenisieren (als Strings!)
        #print_info(f"    ..rufe tokenizer für Block-Überschrift auf: tokenisieren")
        start_tokens = tokenizer.tokenize(prompt)  # List[str]
        #print_info(f"    .. start_tokens= {start_tokens}\n")
        
        # Generieren mit Satzende-Sicherung
        #print_info(f"    ..generieren der Überschrift: rufe generator für Block-Überschrift auf")
        results = generator.generate_batch(
            [start_tokens],
            max_length=60,  # Überschrift war 80 Zeichen, jetzt reduziert für GPU
            beam_size=1,
            sampling_temperature=0.0,
            include_prompt_in_result=False,
            repetition_penalty=1.5,  # verhindert Wiederholungen (erhöht)
            no_repeat_ngram_size=3   # verhindert Wort-Wiederholungen
        )
        
        # Dekodieren + Bereinigen
        #print_info(f"    ..Dekodieren: rufe tokenizer für Block-Überschrift auf")
        summary_raw = tokenizer.decode(results[0].sequences_ids[0]).strip()
        #print_info(f"    .. summary_raw= {summary_raw}\n")
        
        # Prompt entfernen
        if summary_raw.startswith(prompt):
            summary_raw = summary_raw[len(prompt):].strip()
            #print_info(f"    .. summary ohne prompt= {summary_raw}")
        
        # Nur bis zum ersten Punkt behalten und alles danach entfernen
        if '.' in summary_raw:
            summary = summary_raw.split('.')[0].strip() + '.'
        else:
            summary = summary_raw.strip() + '.'

        # Erweiterte Bereinigung: Entferne Fragmente, Artefakte, Englisch
        summary = re.sub(r'(?i)\.?(assistant|here is|\*.*?\*|göttliche,|system).*', '', summary, flags=re.DOTALL).strip()
        
        # Leerzeichen bereinigen
        summary = re.sub(r'\s+', ' ', summary).strip()

        # Nur ersten Satz behalten
        #if '.' in summary:
        #    summary = summary.split('.')[0].strip() + '.'
        #    print_info(f"    .. summary nur erster Satz= {summary}\n")

        # Ersten Satz abschneiden (falls unvollständig)
        #sentences = re.split(r'(?<=[.!?])\s+', summary_raw)
        #summary = sentences[0].strip()
        #if not summary.endswith(('.', '!', '?')):
        #    summary += '.'  # Satzende erzwingen
        
        print_info(f"    .. summary= {summary}")
        summaries.append(summary)
        enhanced += f"\n----------  {summary}\n" + "\n".join(block) + "\n"
        
        # GPU freigeben
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    # ---------------------------------------------------------------------------------------------------------------
    # 2. Gesamt-Zusammenfassung am Anfang
    # ---------------------------------------------------------------------------------------------------------------
    # Keine Generierung mehr: Verwende Konkatenation der Block-Überschriften
    full_summary = "\n".join(summaries)
    
    # Endzeit für Summary messen
    end_time = datetime.now()
    end_time_str = end_time.strftime("%H:%M:%S")
    duration_seconds = (end_time - start_time).total_seconds()
    duration_str = format_timestamp(duration_seconds)
    ratio = (duration_seconds / mp3_duration) * 100 if mp3_duration > 0 else 0

    # Finales enhanced: Header + Modell2 + Gesamtzusammenfassung + Transkription mit Blöcken
    header = "\n".join(lines[:header_end])
    header = f"═" * 40 + "\nMP3-Transkription\n" + "═" * 40 + "\n" + header
        
    summary_header = f"\n" + "═" * 40 + "\nZusammenfassung des Transkripts\n" + "═" * 40 + "\n"
    summary_header += f"Start:   {start_time_str}\n"
    summary_header += f"Ende:    {end_time_str}\n"
    summary_header += f"Dauer:   {duration_str}\n"
    summary_header += f"Ratio:   {ratio:.2f} % (Transkriptionsdauer / MP3-Dauer)\n"
    summary_header += f"Modell:  Llama-3.1-8B-CT2_int8_float16\n"
    summary_header += f"Typ:     {prompt_type}\n\nGesamtzusammenfassung:\n"
    enhanced = header + summary_header + full_summary + "\n\n" + enhanced
    
    print_gpu_memory()  # ← GPU-Verbrauch am Ende
    return enhanced

# -----------------------------------------------------------------------------------------------------------
# Transkription am Bildschirm anzeigen (nur wenn gewünscht)
# -----------------------------------------------------------------------------------------------------------
def display_transcription(show_transcription, formatted_transcription):
    #print_info(f"   show_transcription: {show_transcription}")
    if show_transcription:
        print("")
        print_result_header()
        lines = formatted_transcription.splitlines()
        for line in lines:
            if re.match(r'\[\d{2}:\d{2}:\d{2}\] ', line):
                timestamp = line[:11]
                text = line[11:]
                wrapped = textwrap.wrap(text, width=WRAP_WIDTH - 12)  # 12 für Timestamp + Space
                print(timestamp + wrapped[0])
                for w in wrapped[1:]:
                    print(' ' * 12 + w)
            else:
                wrapped = textwrap.wrap(line, width=WRAP_WIDTH)
                for w in wrapped:
                    print(w)

# -----------------------------------------------------------------------------------------------------------
# Transkription speichern
# -----------------------------------------------------------------------------------------------------------
def save_transcription(output_path, formatted_transcription):
    print_info("═" * 40)
    print_info(f"Speichern der Summary")
    print_info("═" * 40)
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(formatted_transcription)
        print_success(f"Summary erfolgreich gespeichert:")
        print_info(output_path)
    except Exception as e:
        print_error(f"Fehler beim Speichern der Datei: {e}")

# ────────────────────────────────────────────────
# Starte Hauptprogramm
# ────────────────────────────────────────────────
def main():
    # Argument-Parser für Eingabedatei
    parser = argparse.ArgumentParser(description="Summary der Transkription mit Llama-CT2.")
    parser.add_argument('file', nargs='?', help="Optionaler TXT-Dateiname (ohne Pfad)")
    group = parser.add_mutually_exclusive_group()
    group.add_argument('-durchgabe', action='store_true', help="Verwende Prompt für persönliche Beratung (default)")
    group.add_argument('-newsletter', action='store_true', help="Verwende Prompt für Gruppenbotschaft")
    args = parser.parse_args()

    print("")
    print_header("Summary der Transkription")

    input_path, output_path, base_name, mp3_duration = select_text_file(args)

    # Prompt-Typ bestimmen: Default 'durchgabe', über Flag überschreiben
    prompt_type = "durchgabe"
    if args.newsletter:
        prompt_type = "newsletter"
    else:
        # Check ob Datiename "Newsletter" enthält
        print_info(f"    .. input_path= {input_path}\n")
        if "newsletter" in os.path.basename(input_path).lower():
            prompt_type = "newsletter"

    # Transkription aus Datei laden
    if not os.path.exists(input_path):
        print_error(f"Datei nicht gefunden: {input_path}")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        formatted_transcription = f.read()

    # Summary generieren
    #print_info(f"    .. prompt_type= {prompt_type}\n")
    formatted_transcription_s = summarize_transcription_llama(formatted_transcription, prompt_type, mp3_duration)

    # Summary am Bildschirm anzeigen und speichern
    display_transcription(True, formatted_transcription_s)  # Immer anzeigen, da dediziert
    save_transcription(output_path, formatted_transcription_s)

    print()

if __name__ == "__main__":
    main()