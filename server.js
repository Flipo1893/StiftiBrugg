// server.js
//
// Bug Hunt - Server. Node.js + Express + Socket.io, sonst nichts im Backend.
// Startet mit `npm install && npm start`.
//
// Zwei Betriebsarten, ohne Codeaenderung per Umgebungsvariable waehlbar:
//   - Lokal am Stand (Standard): Server gibt seine LAN-IP aus, Geraete
//     verbinden sich ueber den eigenen Hotspot, kein Internet noetig.
//   - Online gehostet: PUBLIC_URL auf die oeffentliche URL setzen (z.B.
//     https://bug-hunt.onrender.com), dann nutzen Join-Link und QR-Code
//     diese Adresse, damit Besucher ueber ihre eigenen mobilen Daten
//     beitreten koennen. Siehe README fuer eine Deployment-Anleitung.

const os = require('os');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const rooms = require('./rooms');
const leaderboard = require('./leaderboard');

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
// admin:getState / admin:resetLeaderboard verlangen dieses Passwort. Default
// "stiftibrugg", ueberschreibbar per Umgebungsvariable (z.B. fuer den
// Online-Betrieb ein staerkeres Passwort setzen).
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'stiftibrugg';

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

// Basis-URL fuer Join-Links/QR-Codes: PUBLIC_URL (Online-Betrieb) hat
// Vorrang, sonst die automatisch erkannte LAN-IP (Betrieb am Stand).
function getBaseUrl() {
  return PUBLIC_URL || getLanUrl();
}

// QR-Code zur Startseite, z.B. fuer einen Zweitbildschirm mit der
// Bestenliste: Besucher scannen ihn und landen direkt auf der Seite, auf
// der sie ein neues Spiel erstellen oder einem Code beitreten koennen.
// Zeigt bewusst auf "/" statt auf einen einzelnen Lobby-Code, da hier
// jederzeit mehrere Paare gleichzeitig ein eigenes Spiel starten koennen.
app.get('/qr-home.png', async (req, res) => {
  try {
    const buffer = await QRCode.toBuffer(`${getBaseUrl()}/`, { margin: 1, scale: 8 });
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error('QR-Code fuer Startseite konnte nicht erzeugt werden:', err);
    res.status(500).end();
  }
});

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

      const joinUrl = `${getBaseUrl()}/?code=${room.code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, scale: 6 });

      callback({
        ok: true,
        code: room.code,
        token: player.token,
        youIndex: room.players.indexOf(player),
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
      callback({
        ok: true,
        code: room.code,
        token: player.token,
        youIndex: room.players.indexOf(player),
      });

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
        youIndex: room.players.indexOf(player),
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

    // Die Partie ist bereits regulaer zu Ende (z.B. weil jemand auf "Zur
    // Bestenliste" geklickt hat und die Seite verlaesst): kein Abbruch-
    // Hinweis fuer den anderen Spieler noetig, der sonst dessen Gameover-
    // Bildschirm ueberschreiben und ihn an seinem eigenen "Zur Bestenliste"/
    // "Nochmal spielen" hindern wuerde.
    if (room.state === 'finished') {
      if (room.players.every((p) => !p.connected)) {
        rooms.removeRoom(room.code);
      }
      return;
    }

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

  function isAdminAuthorized(data) {
    if (!ADMIN_PASSWORD) return true; // ADMIN_PASSWORD explizit leer gesetzt -> Schutz bewusst deaktiviert
    return data && data.password === ADMIN_PASSWORD;
  }

  socket.on('admin:getState', (data, callback) => {
    if (!isAdminAuthorized(data)) {
      callback({ ok: false, error: 'Falsches Admin-Passwort.' });
      return;
    }
    callback({
      ok: true,
      openRooms: rooms.listOpenRooms(),
      leaderboardTop: leaderboard.getTop(10),
    });
  });

  socket.on('admin:resetLeaderboard', (data, callback) => {
    if (!isAdminAuthorized(data)) {
      if (callback) callback({ ok: false, error: 'Falsches Admin-Passwort.' });
      return;
    }
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
  if (PUBLIC_URL) {
    console.log(`  Oeffentlich: ${PUBLIC_URL}`);
    console.log(`  Leaderboard: ${PUBLIC_URL}/leaderboard`);
    console.log(`  Admin:       ${PUBLIC_URL}/admin`);
    if (!ADMIN_PASSWORD) {
      console.warn('  WARNUNG: ADMIN_PASSWORD ist leer -> /admin ist oeffentlich ungeschuetzt!');
    }
  } else {
    console.log(`  Lokal:    http://localhost:${PORT}`);
    console.log(`  Im LAN:   ${getLanUrl()}`);
    console.log(`  Leaderboard: ${getLanUrl()}/leaderboard`);
    console.log(`  Admin:       ${getLanUrl()}/admin`);
  }
  console.log(`  Admin-Passwort: ${ADMIN_PASSWORD ? '(gesetzt, siehe ADMIN_PASSWORD)' : '(kein Schutz)'}`);
  console.log('=================================================');
});
