// rooms.js
//
// Verwaltung aller laufenden Lobbys/Partien im Arbeitsspeicher (keine DB)
// UND die komplette Spiellogik. Sie laeuft bewusst vollstaendig hier auf
// dem Server: der Client zeigt nur an und meldet Klicks/Tasten. So
// entscheidet nie ein schnelleres Netz, sondern immer die schnellere
// Reaktion, wer eine Runde gewinnt.

const { v4: uuidv4 } = require('uuid');
const { buildRoundPuzzle } = require('./puzzles');
const leaderboard = require('./leaderboard');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne I, O, 0, 1
const WRONG_ANSWER_LOCK_MS = 1500;
const ROUND_RESULT_DELAY_MS = 2000;
const COUNTDOWN_MS = 3000;
const ROOM_INACTIVITY_MS = 10 * 60 * 1000; // 10 Minuten
const RECONNECT_WINDOW_MS = 15 * 1000;
const POINTS_TO_WIN = 3;

/** @type {Map<string, Room>} */
const rooms = new Map();

function generateCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function sanitizeName(rawName) {
  const lettersOnly = String(rawName || '')
    .replace(/[^\p{L} ]/gu, '')
    .trim();
  const truncated = lettersOnly.slice(0, 10);
  return truncated || 'Spieler';
}

class Room {
  constructor(code) {
    this.code = code;
    this.players = []; // { token, socketId, name, score, lockedUntil, connected, bestReactionMs, disconnectTimer }
    this.state = 'waiting'; // waiting | countdown | playing | roundResult | finished
    this.round = 0;
    this.currentPuzzle = null;
    this.roundStartedAt = null;
    this.lastActivity = Date.now();
    this.timers = new Set();
  }

  touch() {
    this.lastActivity = Date.now();
  }

  addPlayer(name) {
    const player = {
      token: uuidv4(),
      socketId: null,
      name,
      score: 0,
      lockedUntil: 0,
      connected: false,
      bestReactionMs: null,
      disconnectTimer: null,
    };
    this.players.push(player);
    return player;
  }

  getPlayer(token) {
    return this.players.find((p) => p.token === token);
  }

  getOpponent(token) {
    return this.players.find((p) => p.token !== token);
  }

  isFull() {
    return this.players.length >= 2;
  }

  bothConnected() {
    return this.players.length === 2 && this.players.every((p) => p.connected);
  }

  setTimer(fn, ms) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  destroyTimers() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const player of this.players) {
      if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
        player.disconnectTimer = null;
      }
    }
  }

  publicPlayers() {
    return this.players.map((p) => ({ name: p.name, score: p.score, connected: p.connected }));
  }

  // --- Spielablauf -------------------------------------------------------

  startCountdown(io) {
    this.touch();
    this.state = 'countdown';
    io.to(this.code).emit('countdown', { ms: COUNTDOWN_MS, players: this.publicPlayers() });
    this.setTimer(() => this.startRound(io), COUNTDOWN_MS);
  }

  startRound(io) {
    this.touch();
    this.round += 1;
    this.state = 'playing';
    const { lines, correctIndex, difficulty } = buildRoundPuzzle(this.round);
    this.currentPuzzle = { lines, correctIndex, difficulty };
    this.roundStartedAt = Date.now();
    for (const p of this.players) p.lockedUntil = 0;

    io.to(this.code).emit('roundStart', {
      round: this.round,
      difficulty,
      lines,
      players: this.publicPlayers(),
    });
  }

  // Gibt true zurueck, wenn die Antwort die Runde entschieden hat.
  handleAnswer(io, token, lineIndex) {
    if (this.state !== 'playing') return;
    const player = this.getPlayer(token);
    if (!player || !player.connected) return;

    const now = Date.now();
    if (player.lockedUntil > now) {
      const remainingMs = player.lockedUntil - now;
      io.to(player.socketId).emit('stillLocked', { remainingMs });
      return;
    }

    if (lineIndex === this.currentPuzzle.correctIndex) {
      const reactionMs = now - this.roundStartedAt;
      player.score += 1;
      if (player.bestReactionMs === null || reactionMs < player.bestReactionMs) {
        player.bestReactionMs = reactionMs;
      }
      this.finishRound(io, player, reactionMs);
    } else {
      player.lockedUntil = now + WRONG_ANSWER_LOCK_MS;
      io.to(player.socketId).emit('wrongAnswer', { lockMs: WRONG_ANSWER_LOCK_MS, lineIndex });
    }
  }

  finishRound(io, winner, reactionMs) {
    this.touch();
    this.state = 'roundResult';
    io.to(this.code).emit('roundResult', {
      winnerIndex: this.players.indexOf(winner),
      winnerName: winner.name,
      correctIndex: this.currentPuzzle.correctIndex,
      reactionMs,
      players: this.publicPlayers(),
    });

    const gameWinner = this.players.find((p) => p.score >= POINTS_TO_WIN);
    this.setTimer(() => {
      if (gameWinner) {
        this.finishGame(io, gameWinner);
      } else {
        this.startRound(io);
      }
    }, ROUND_RESULT_DELAY_MS);
  }

  finishGame(io, gameWinner) {
    this.touch();
    this.state = 'finished';
    for (const p of this.players) {
      leaderboard.addEntry(p.name, p.score, p.bestReactionMs);
    }
    io.emit('leaderboardUpdate', leaderboard.getAll());
    io.to(this.code).emit('gameOver', {
      winnerIndex: this.players.indexOf(gameWinner),
      winnerName: gameWinner.name,
      players: this.publicPlayers(),
    });
  }
}

function createRoom(hostName) {
  const code = generateCode();
  const room = new Room(code);
  rooms.set(code, room);
  const player = room.addPlayer(sanitizeName(hostName));
  return { room, player };
}

function findRoom(code) {
  return rooms.get(String(code || '').toUpperCase());
}

function joinRoom(code, name) {
  const room = findRoom(code);
  if (!room) return { error: 'Diesen Lobby-Code gibt es nicht.' };
  if (room.isFull()) return { error: 'Diese Lobby ist bereits voll.' };
  if (room.state !== 'waiting') return { error: 'Diese Partie hat schon begonnen.' };
  const player = room.addPlayer(sanitizeName(name));
  return { room, player };
}

function removeRoom(code) {
  const room = rooms.get(code);
  if (room) {
    room.destroyTimers();
    rooms.delete(code);
  }
}

function listOpenRooms() {
  return Array.from(rooms.values()).map((room) => ({
    code: room.code,
    state: room.state,
    round: room.round,
    players: room.publicPlayers(),
    lastActivity: room.lastActivity,
  }));
}

// Periodisches Aufraeumen inaktiver Lobbys.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_INACTIVITY_MS) {
      removeRoom(code);
    }
  }
}, 60 * 1000);

module.exports = {
  rooms,
  createRoom,
  findRoom,
  joinRoom,
  removeRoom,
  listOpenRooms,
  sanitizeName,
  WRONG_ANSWER_LOCK_MS,
  ROUND_RESULT_DELAY_MS,
  COUNTDOWN_MS,
  RECONNECT_WINDOW_MS,
  POINTS_TO_WIN,
};
