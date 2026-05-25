// Run database migrations
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runFile(sqlPath) {
  const raw = fs.readFileSync(sqlPath, 'utf8');
  const statements = raw
    .split(';')
    .map(s => s.replace(/^USE code_and_locks;\s*/ig, '').trim())
    .filter(s => s && !s.startsWith('--'));

  for (const stmt of statements) {
    console.log('Running:', stmt.slice(0, 70).replace(/\s+/g, ' ') + '...');
    try {
      await pool.execute(stmt);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  (skipped — already applied)');
      } else {
        throw err;
      }
    }
  }
}

async function run() {
  const migrations = [
    '001_ticket_photos_checklist.sql',
    '002_staff_checklist_photos.sql',
  ];
  for (const file of migrations) {
    const sqlPath = path.join(__dirname, '../../database/migrations', file);
    if (!fs.existsSync(sqlPath)) continue;
    console.log('\n---', file, '---');
    await runFile(sqlPath);
  }
  console.log('\nAll migrations finished.');
  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err.message || err);
  if (err.code) console.error('Code:', err.code);
  process.exit(1);
});
