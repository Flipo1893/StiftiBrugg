// server.js
//
// Bug Hunt - Server. Node.js + Express + Socket.io, sonst nichts im Backend.
// Startet mit `npm install && npm start`. Gibt beim Start die LAN-IP aus,
// damit sie am Stand auf ein Schild geschrieben werden kann.

const os = require('os');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const rooms = require('./rooms');
const leaderboard = require('./leaderboard');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

function getLanUrl() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:${PORT}`;
      }
    }
  }
  return `http://localhost:${PORT}`;
}

// --- Socket.io: gesamte Spiellogik -----------------------------------------

io.on('connection', (socket) => {
  // Aktueller Lobby-Kontext dieses Sockets (gesetzt nach create/join/rejoin).
  let currentRoomCode = null;
  let currentToken = null;

  function attachToRoom(room, player) {
    currentRoomCode = room.code;
    currentToken = player.token;
    player.socketId = socket.id;
    player.connected = true;
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
    socket.join(room.code);
  }

  socket.on('createGame', async (data, callback) => {
    try {
      const name = rooms.sanitizeName(data && data.name);
      const { room, player } = rooms.createRoom(name);
      attachToRoom(room, player);

      const joinUrl = `${getLanUrl()}/?code=${room.code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, scale: 6 });

      callback({
        ok: true,
        code: room.code,
        token: player.token,
        joinUrl,
        qrDataUrl,
      });
    } catch (err) {
      console.error('createGame fehlgeschlagen:', err);
      callback({ ok: false, error: 'Spiel konnte nicht erstellt werden.' });
    }
  });

  socket.on('joinGame', (data, callback) => {
    try {
      const code = String((data && data.code) || '').toUpperCase();
      const name = rooms.sanitizeName(data && data.name);
      const result = rooms.joinRoom(code, name);
      if (result.error) {
        callback({ ok: false, error: result.error });
        return;
      }
      const { room, player } = result;
      attachToRoom(room, player);
      callback({ ok: true, code: room.code, token: player.token });

      io.to(room.code).emit('lobbyUpdate', { players: room.publicPlayers() });

      if (room.bothConnected()) {
        room.startCountdown(io);
      }
    } catch (err) {
      console.error('joinGame fehlgeschlagen:', err);
      callback({ ok: false, error: 'Beitritt fehlgeschlagen.' });
    }
  });

  socket.on('rejoin', (data, callback) => {
    try {
      const code = String((data && data.code) || '').toUpperCase();
      const token = data && data.token;
      const room = rooms.findRoom(code);
      if (!room) {
        callback({ ok: false, error: 'Diese Partie gibt es nicht mehr.' });
        return;
      }
      const player = room.getPlayer(token);
      if (!player) {
        callback({ ok: false, error: 'Dieser Sitzplatz existiert nicht mehr.' });
        return;
      }
      attachToRoom(room, player);
      const opponent = room.getOpponent(token);
      if (opponent) {
        io.to(opponent.socketId).emit('opponentReconnected', { name: player.name });
      }
      callback({
        ok: true,
        code: room.code,
        state: room.state,
        round: room.round,
        players: room.publicPlayers(),
        currentLines: room.currentPuzzle ? room.currentPuzzle.lines : null,
      });
    } catch (err) {
      console.error('rejoin fehlgeschlagen:', err);
      callback({ ok: false, error: 'Wiederverbindung fehlgeschlagen.' });
    }
  });

  socket.on('answer', (data) => {
    if (!currentRoomCode || !currentToken) return;
    const room = rooms.findRoom(currentRoomCode);
    if (!room) return;
    const lineIndex = Number(data && data.lineIndex);
    if (Number.isNaN(lineIndex)) return;
    room.handleAnswer(io, currentToken, lineIndex);
  });

  socket.on('leaveGame', () => {
    if (!currentRoomCode) return;
    const room = rooms.findRoom(currentRoomCode);
    if (room) handleDisconnectFromRoom(room, currentToken);
    currentRoomCode = null;
    currentToken = null;
  });

  socket.on('disconnect', () => {
    if (!currentRoomCode || !currentToken) return;
    const room = rooms.findRoom(currentRoomCode);
    if (room) handleDisconnectFromRoom(room, currentToken);
  });

  function handleDisconnectFromRoom(room, token) {
    const player = room.getPlayer(token);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    room.touch();

    const opponent = room.getOpponent(token);
    if (opponent && opponent.connected) {
      io.to(opponent.socketId).emit('opponentDisconnected', {
        name: player.name,
        reconnectWindowMs: rooms.RECONNECT_WINDOW_MS,
      });
    }

    player.disconnectTimer = setTimeout(() => {
      // Spieler ist nicht rechtzeitig zurueckgekommen -> Partie beenden.
      const stillOpponent = room.getOpponent(token);
      if (stillOpponent && stillOpponent.connected) {
        io.to(stillOpponent.socketId).emit('opponentLeft', {
          name: player.name,
          redirectMs: 5000,
        });
      }
      rooms.removeRoom(room.code);
    }, rooms.RECONNECT_WINDOW_MS);
  }

  // --- Admin ---------------------------------------------------------------

  socket.on('admin:getState', (data, callback) => {
    callback({
      openRooms: rooms.listOpenRooms(),
      leaderboardTop: leaderboard.getTop(10),
    });
  });

  socket.on('admin:resetLeaderboard', (data, callback) => {
    leaderboard.reset();
    io.emit('leaderboardUpdate', leaderboard.getTop(10));
    if (callback) callback({ ok: true });
  });

  socket.on('leaderboard:subscribe', (data, callback) => {
    if (callback) callback(leaderboard.getTop(10));
  });
});

// Ein unerwarteter Fehler darf den Prozess nie killen (wichtig am Messestand).
process.on('uncaughtException', (err) => {
  console.error('Unerwarteter Fehler (Prozess laeuft weiter):', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unbehandelte Promise-Ablehnung (Prozess laeuft weiter):', err);
});

server.listen(PORT, () => {
  console.log('=================================================');
  console.log('  Bug Hunt Server laeuft!');
  console.log(`  Lokal:    http://localhost:${PORT}`);
  console.log(`  Im LAN:   ${getLanUrl()}`);
  console.log(`  Leaderboard: ${getLanUrl()}/leaderboard`);
  console.log(`  Admin:       ${getLanUrl()}/admin`);
  console.log('=================================================');
});
