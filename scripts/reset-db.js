'use strict';
// Deletes the SQLite database so the next start re-seeds fresh demo data.
const fs = require('node:fs');
const { DB_FILE } = require('../src/db');

for (const f of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) {
  if (fs.existsSync(f)) fs.rmSync(f);
}
console.log(`Removed ${DB_FILE}. Run "npm start" to re-seed.`);
