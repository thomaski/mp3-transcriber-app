const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const { query } = require('./server/db/database-pg.js');

async function checkAudio() {
  try {
    const rows = await query(
      "SELECT id, mp3_filename, CASE WHEN mp3_data IS NULL THEN 'NULL' ELSE 'HAS_DATA' END as mp3_status, mp3_size_bytes FROM transcriptions ORDER BY created_at DESC LIMIT 10"
    );
    console.log('Transcriptions:');
    rows.forEach(row => {
      console.log(` - ID: ${row.id}, File: ${row.mp3_filename}, MP3: ${row.mp3_status}, Size: ${row.mp3_size_bytes}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

checkAudio();
