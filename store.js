/**
 * Simple JSON file store — no native deps, works on any Node version.
 * All operations are synchronous (safe for single-threaded Node.js).
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const DB_PATH = path.join(dataDir, 'db.json');

const EMPTY = () => ({
  children:    [],
  tasks:       [],
  completions: [],
  _seq: { children: 1, tasks: 1, completions: 1 },
});

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return EMPTY();
  }
}

function write(db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(db, table) {
  if (!db._seq) db._seq = { children: 1, tasks: 1, completions: 1 };
  const id = db._seq[table] || 1;
  db._seq[table] = id + 1;
  return id;
}

module.exports = { read, write, nextId };
