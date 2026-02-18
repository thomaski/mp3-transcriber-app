/**
 * View PostgreSQL Database Content
 * Script to display all tables and their contents from the PostgreSQL database
 */

require('dotenv').config();
const { query } = require('../server/db/database-pg');

async function viewDatabase() {
  console.log('\n📊 MP3 Transcriber - Datenbank-Inhalt\n');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // 1. Users Table
    console.log('👥 USERS');
    console.log('─'.repeat(80));
    const users = await query('SELECT id, username, first_name, last_name, email, is_admin, created_at FROM users ORDER BY created_at DESC');
    
    if (users.length === 0) {
      console.log('   (keine Einträge)');
    } else {
      users.forEach(user => {
        const role = user.is_admin ? 'Admin' : 'User';
        const name = `${user.first_name} ${user.last_name}`.trim() || '(kein Name)';
        console.log(`   ID: ${user.id} | User: ${user.username} | Name: ${name}`);
        console.log(`      Email: ${user.email || '(keine)'} | Rolle: ${role}`);
        console.log(`      Erstellt: ${new Date(user.created_at).toLocaleString('de-DE')}`);
        console.log('');
      });
    }
    console.log(`   Gesamt: ${users.length} User\n`);

    // 2. Transcriptions Table
    console.log('═'.repeat(80));
    console.log('📝 TRANSCRIPTIONS');
    console.log('─'.repeat(80));
    const transcriptions = await query(`
      SELECT 
        t.id, 
        t.user_id, 
        u.username,
        t.mp3_filename, 
        t.mp3_size_bytes,
        t.has_summary,
        LENGTH(t.transcription_text) as text_length,
        CASE WHEN t.mp3_data IS NOT NULL THEN true ELSE false END as has_mp3_data,
        t.created_at 
      FROM transcriptions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    
    if (transcriptions.length === 0) {
      console.log('   (keine Einträge)');
    } else {
      transcriptions.forEach(trans => {
        const size = trans.mp3_size_bytes ? `${(trans.mp3_size_bytes / 1024 / 1024).toFixed(2)} MB` : 'unbekannt';
        const summary = trans.has_summary ? '✅ Ja' : '❌ Nein';
        const mp3Data = trans.has_mp3_data ? '✅ Vorhanden' : '❌ Fehlt';
        console.log(`   ID: ${trans.id} | User: ${trans.username || trans.user_id}`);
        console.log(`      Datei: ${trans.mp3_filename} (${size})`);
        console.log(`      MP3-Daten: ${mp3Data} | Zusammenfassung: ${summary}`);
        console.log(`      Transkription: ${trans.text_length} Zeichen`);
        console.log(`      Erstellt: ${new Date(trans.created_at).toLocaleString('de-DE')}`);
        console.log('');
      });
    }
    console.log(`   Gesamt: ${transcriptions.length} Transkriptionen\n`);

    // 3. Access Tokens Table
    console.log('═'.repeat(80));
    console.log('🔑 ACCESS TOKENS (Öffentlicher Zugriff)');
    console.log('─'.repeat(80));
    const tokens = await query(`
      SELECT 
        at.token, 
        at.transcription_id,
        t.mp3_filename,
        at.expires_at,
        at.access_count,
        at.last_accessed_at,
        at.created_at
      FROM access_tokens at
      LEFT JOIN transcriptions t ON at.transcription_id = t.id
      ORDER BY at.created_at DESC
    `);
    
    if (tokens.length === 0) {
      console.log('   (keine Einträge)');
    } else {
      tokens.forEach(token => {
        const expires = token.expires_at ? new Date(token.expires_at).toLocaleString('de-DE') : 'Nie';
        const lastAccess = token.last_accessed_at ? new Date(token.last_accessed_at).toLocaleString('de-DE') : 'Noch nie';
        console.log(`   Token: ${token.token}`);
        console.log(`      MP3: ${token.mp3_filename} (ID: ${token.transcription_id})`);
        console.log(`      Zugriffe: ${token.access_count} | Letzer Zugriff: ${lastAccess}`);
        console.log(`      Läuft ab: ${expires}`);
        console.log(`      Erstellt: ${new Date(token.created_at).toLocaleString('de-DE')}`);
        console.log('');
      });
    }
    console.log(`   Gesamt: ${tokens.length} Tokens\n`);

    // 4. Audit Logs (last 10 entries)
    console.log('═'.repeat(80));
    console.log('📋 AUDIT LOGS (letzte 10 Einträge)');
    console.log('─'.repeat(80));
    const logs = await query(`
      SELECT 
        al.id,
        al.event_type,
        al.user_id,
        u.username,
        al.ip_address,
        al.success,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);
    
    if (logs.length === 0) {
      console.log('   (keine Einträge)');
    } else {
      logs.forEach(log => {
        const status = log.success ? '✅' : '❌';
        const user = log.username || log.user_id || 'Anonym';
        console.log(`   ${status} ${log.event_type}`);
        console.log(`      User: ${user} | IP: ${log.ip_address || 'unbekannt'}`);
        console.log(`      Zeit: ${new Date(log.created_at).toLocaleString('de-DE')}`);
        console.log('');
      });
    }
    console.log(`   Gesamt: ${logs.length} Logs (zeige nur letzte 10)\n`);

    // Database Statistics
    console.log('═'.repeat(80));
    console.log('📊 STATISTIK');
    console.log('─'.repeat(80));
    
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM transcriptions) as transcription_count,
        (SELECT COUNT(*) FROM access_tokens) as token_count,
        (SELECT COUNT(*) FROM audit_logs) as log_count
    `);
    
    console.log(`   👥 User: ${stats[0].user_count}`);
    console.log(`   📝 Transkriptionen: ${stats[0].transcription_count}`);
    console.log(`   🔑 Access Tokens: ${stats[0].token_count}`);
    console.log(`   📋 Audit Logs: ${stats[0].log_count}`);
    console.log('');
    console.log('═'.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Fehler beim Lesen der Datenbank:', error.message);
    console.error('\n💡 Stelle sicher, dass:');
    console.error('   1. PostgreSQL läuft');
    console.error('   2. Die Datenbank "mp3_transcriber" existiert');
    console.error('   3. Die .env Datei korrekt konfiguriert ist');
    console.error('');
    process.exit(1);
  }

  process.exit(0);
}

viewDatabase();
