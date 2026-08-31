// leaderboard.js
//
// Sehr einfache Bestenliste, persistiert als JSON-Datei auf der Platte
// (keine Datenbank noetig, siehe Auftrag). Ein Eintrag entsteht pro
// Spieler pro beendeter Partie: Vorname, erzielte Punkte und die
// schnellste Reaktionszeit dieses Spielers in dieser Partie.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'leaderboard.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readEntries() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // Beschaedigte Datei soll das Spiel nicht crashen -> leer weitermachen.
    console.error('Bestenliste konnte nicht gelesen werden, starte mit leerer Liste:', err.message);
    return [];
  }
}

function writeEntries(entries) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

// name: string, points: number (0-3), bestReactionMs: number|null
function addEntry(name, points, bestReactionMs) {
  const entries = readEntries();
  entries.push({
    name,
    points,
    bestReactionMs: bestReactionMs === null || bestReactionMs === undefined ? null : Math.round(bestReactionMs),
    timestamp: Date.now(),
  });
  writeEntries(entries);
  return entries;
}

// Alle Eintraege sortiert: meiste Punkte zuerst, bei Gleichstand schnellste
// Reaktionszeit zuerst. Der Client zeigt daraus standardmaessig nur die
// Top 10 an und kann den Rest bei Bedarf aufklappen.
function getAll() {
  const entries = readEntries();
  return entries.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aTime = a.bestReactionMs === null ? Infinity : a.bestReactionMs;
    const bTime = b.bestReactionMs === null ? Infinity : b.bestReactionMs;
    return aTime - bTime;
  });
}

function getTop(limit = 10) {
  return getAll().slice(0, limit);
}

function reset() {
  writeEntries([]);
}

module.exports = {
  addEntry,
  getAll,
  getTop,
  reset,
};
