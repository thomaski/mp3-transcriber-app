require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'mp3_transcriber',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});
pool.query("SELECT id, mp3_filename, transcription_text FROM transcriptions WHERE has_summary = true AND id = 'q0jb7d' LIMIT 1")
  .then(r => { 
    r.rows.forEach(row => { 
      console.log('ID:', row.id, '| MP3:', row.mp3_filename);
      // Zeige Text ab "Gesamtzusammenfassung:" bis 3000 Zeichen weiter
      // Zeige Abschnitt der Timestamps/Header
      const text = row.transcription_text || '';
      const summaryIdx = text.indexOf('Gesamtzusammenfassung:');
      // Zeige alles von 4000 Zeichen nach dem Summary-Start
      // Suche nach Header-Pattern im Text
      const lines = text.split('\n');
      console.log('TOTAL LINES:', lines.length);
      lines.forEach((line, i) => {
        if (line.match(/^-{10,}/) || line.match(/^═{10,}/)) {
          console.log(`Line ${i}: [SEPARATOR] ${line.substring(0, 60)}`);
        }
      });
      console.log('---');
    }); 
    process.exit(); 
  })
  .catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
