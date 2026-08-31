// app.js - Client-Logik fuer Lobby + Spiel.
// Der Client zeigt nur an und meldet Klicks/Tasten - alle Spielentscheidungen
// (wer hat zuerst richtig geklickt, wer ist gesperrt, wer hat gewonnen)
// trifft ausschliesslich der Server.

(function () {
  const socket = io();

  const screens = {
    start: document.getElementById('screen-start'),
    waiting: document.getElementById('screen-waiting'),
    countdown: document.getElementById('screen-countdown'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover'),
    notice: document.getElementById('screen-notice'),
  };

  function showScreen(name) {
    for (const key of Object.keys(screens)) {
      screens[key].hidden = key !== name;
    }
  }

  // --- Sitzungsdaten (pro Tab getrennt, so funktioniert auch der Testmodus
  // mit zwei Tabs auf demselben Rechner problemlos) ---------------------
  const session = {
    get code() { return sessionStorage.getItem('bh_code'); },
    set code(v) { sessionStorage.setItem('bh_code', v); },
    get token() { return sessionStorage.getItem('bh_token'); },
    set token(v) { sessionStorage.setItem('bh_token', v); },
    get name() { return sessionStorage.getItem('bh_name'); },
    set name(v) { sessionStorage.setItem('bh_name', v); },
    clear() {
      sessionStorage.removeItem('bh_code');
      sessionStorage.removeItem('bh_token');
      sessionStorage.removeItem('bh_name');
    },
  };

  let myName = '';
  let opponentName = '';
  let currentLines = [];
  let roundLocked = false; // clientseitige Anzeige, Server bleibt Wahrheit

  // --- Startbildschirm -------------------------------------------------

  const inputName = document.getElementById('input-name');
  const inputCode = document.getElementById('input-code');
  const btnCreate = document.getElementById('btn-create');
  const btnJoin = document.getElementById('btn-join');
  const startError = document.getElementById('start-error');
  const btnTestmode = document.getElementById('btn-testmode');

  const params = new URLSearchParams(window.location.search);
  if (params.get('code')) {
    inputCode.value = params.get('code').toUpperCase();
  }
  if (params.get('name')) {
    inputName.value = params.get('name');
  }

  function setError(msg) {
    startError.textContent = msg || '';
  }

  btnCreate.addEventListener('click', () => {
    const name = inputName.value.trim() || 'Spieler';
    setError('');
    btnCreate.disabled = true;
    socket.emit('createGame', { name }, (res) => {
      btnCreate.disabled = false;
      if (!res.ok) {
        setError(res.error || 'Fehler beim Erstellen.');
        return;
      }
      myName = name;
      session.code = res.code;
      session.token = res.token;
      session.name = name;
      document.getElementById('waiting-code').textContent = res.code;
      document.getElementById('waiting-qr').src = res.qrDataUrl;
      showScreen('waiting');
    });
  });

  btnJoin.addEventListener('click', () => {
    const name = inputName.value.trim() || 'Spieler';
    const code = inputCode.value.trim().toUpperCase();
    if (code.length !== 4) {
      setError('Bitte einen 4-stelligen Code eingeben.');
      return;
    }
    setError('');
    btnJoin.disabled = true;
    socket.emit('joinGame', { name, code }, (res) => {
      btnJoin.disabled = false;
      if (!res.ok) {
        setError(res.error || 'Beitritt fehlgeschlagen.');
        return;
      }
      myName = name;
      session.code = res.code;
      session.token = res.token;
      session.name = name;
      showScreen('waiting');
      document.querySelector('#screen-waiting .status-banner').textContent = 'Warte auf Spielstart ...';
    });
  });

  btnTestmode.addEventListener('click', () => {
    const name = inputName.value.trim() || 'Spieler 1';
    setError('');
    socket.emit('createGame', { name }, (res) => {
      if (!res.ok) {
        setError(res.error || 'Fehler beim Erstellen.');
        return;
      }
      myName = name;
      session.code = res.code;
      session.token = res.token;
      session.name = name;
      document.getElementById('waiting-code').textContent = res.code;
      document.getElementById('waiting-qr').src = res.qrDataUrl;
      showScreen('waiting');
      window.open(`/?code=${res.code}&name=${encodeURIComponent('Spieler 2')}`, '_blank');
    });
  });

  document.getElementById('btn-cancel-waiting').addEventListener('click', () => {
    socket.emit('leaveGame');
    session.clear();
    showScreen('start');
  });

  // --- Countdown ---------------------------------------------------------

  socket.on('countdown', (data) => {
    showScreen('countdown');
    let remaining = Math.ceil(data.ms / 1000);
    const numberEl = document.getElementById('countdown-number');
    numberEl.textContent = remaining;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
      } else {
        numberEl.textContent = remaining;
      }
    }, 1000);
  });

  // --- Spielrunde ----------------------------------------------------------

  function myPublicIndex(players) {
    // Der Server schickt Spieler in Beitrittsreihenfolge; wir identifizieren
    // "mich" ueber den gespeicherten Namen (fuer die Anzeige reicht das,
    // die eigentliche Zuordnung passiert serverseitig ueber den Token).
    return players.findIndex((p) => p.name === myName);
  }

  function updateScoreboard(players) {
    const idx = myPublicIndex(players);
    const me = idx >= 0 ? players[idx] : { name: myName, score: 0 };
    const opp = players[idx === 0 ? 1 : 0] || { name: opponentName || 'Gegner', score: 0 };
    opponentName = opp.name;
    document.getElementById('game-my-name').textContent = me.name;
    document.getElementById('game-my-score').textContent = me.score;
    document.getElementById('game-opp-name').textContent = opp.name;
    document.getElementById('game-opp-score').textContent = opp.score;
  }

  function renderLines(lines) {
    const container = document.getElementById('game-lines');
    container.innerHTML = '';
    lines.forEach((text, i) => {
      const row = document.createElement('div');
      row.className = 'code-line';
      row.dataset.index = String(i);
      row.innerHTML = `<span class="key">${i + 1}</span><span class="code-text"></span>`;
      row.querySelector('.code-text').textContent = text;
      row.addEventListener('click', () => submitAnswer(i));
      container.appendChild(row);
    });
  }

  function submitAnswer(index) {
    if (roundLocked) return;
    socket.emit('answer', { lineIndex: index });
  }

  document.addEventListener('keydown', (e) => {
    if (screens.game.hidden) return;
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 8) {
      submitAnswer(num - 1);
    }
  });

  socket.on('roundStart', (data) => {
    currentLines = data.lines;
    roundLocked = false;
    document.getElementById('game-round-label').textContent = `Runde ${data.round}`;
    document.getElementById('game-lock-banner').textContent = '';
    document.getElementById('game-status-banner').textContent = '';
    updateScoreboard(data.players);
    renderLines(currentLines);
    showScreen('game');
  });

  socket.on('wrongAnswer', (data) => {
    const row = document.querySelector(`.code-line[data-index="${data.lineIndex}"]`);
    if (row) row.classList.add('wrong');
    roundLocked = true;
    const lockBanner = document.getElementById('game-lock-banner');
    let remaining = data.lockMs;
    updateLockBanner(lockBanner, remaining);
    const interval = setInterval(() => {
      remaining -= 100;
      if (remaining <= 0) {
        clearInterval(interval);
        lockBanner.textContent = '';
        roundLocked = false;
        if (row) row.classList.remove('wrong');
      } else {
        updateLockBanner(lockBanner, remaining);
      }
    }, 100);
  });

  function updateLockBanner(el, remainingMs) {
    el.textContent = `Gesperrt (${(remainingMs / 1000).toFixed(1)}s)`;
  }

  socket.on('stillLocked', () => {
    // Spieler hat waehrend der Sperre nochmal geklickt - keine weitere Aktion noetig.
  });

  socket.on('roundResult', (data) => {
    roundLocked = true;
    const rows = document.querySelectorAll('.code-line');
    rows.forEach((row) => {
      if (Number(row.dataset.index) === data.correctIndex) {
        row.classList.add('correct');
      }
      row.classList.add('locked');
    });
    const statusBanner = document.getElementById('game-status-banner');
    statusBanner.textContent = data.winnerName === myName
      ? `Punkt für dich! (${data.reactionMs} ms)`
      : `Punkt für ${data.winnerName}`;
    updateScoreboard(data.players);
  });

  socket.on('gameOver', (data) => {
    const iWon = data.winnerName === myName;
    const title = document.getElementById('gameover-title');
    title.textContent = iWon ? 'Gewonnen!' : 'Verloren';
    title.className = `result-title ${iWon ? 'win' : 'lose'}`;
    const me = data.players.find((p) => p.name === myName) || {};
    const opp = data.players.find((p) => p.name !== myName) || {};
    document.getElementById('gameover-score').textContent = `${me.score ?? 0} : ${opp.score ?? 0}`;
    showScreen('gameover');
    session.clear();
  });

  document.getElementById('btn-again').addEventListener('click', () => {
    showScreen('start');
    setError('');
  });

  // --- Verbindungsprobleme / Gegner weg -----------------------------------

  socket.on('opponentDisconnected', (data) => {
    document.getElementById('notice-text').textContent =
      `${data.name} hat die Verbindung verloren. Warte auf Rückkehr ...`;
    showScreen('notice');
  });

  socket.on('opponentReconnected', () => {
    if (!screens.notice.hidden) {
      showScreen('game');
    }
  });

  socket.on('opponentLeft', (data) => {
    document.getElementById('notice-text').textContent =
      `${data.name} hat die Partie verlassen. Zurück zum Start ...`;
    showScreen('notice');
    session.clear();
    setTimeout(() => {
      window.location.href = '/';
    }, data.redirectMs || 5000);
  });

  socket.on('lobbyUpdate', () => {
    // Reserviert fuer eine zukuenftige Anzeige "Spieler X ist beigetreten".
  });

  // --- Reconnect nach Seiten-Refresh oder kurzem Verbindungsabbruch -------

  function tryRejoin() {
    if (!session.code || !session.token) return;
    myName = session.name || myName;
    socket.emit('rejoin', { code: session.code, token: session.token }, (res) => {
      if (!res.ok) {
        session.clear();
        showScreen('start');
        return;
      }
      if (res.state === 'waiting') {
        showScreen('waiting');
        document.getElementById('waiting-code').textContent = res.code;
      } else if (res.state === 'countdown') {
        showScreen('countdown');
      } else if (res.state === 'playing' || res.state === 'roundResult') {
        updateScoreboard(res.players);
        if (res.currentLines) renderLines(res.currentLines);
        document.getElementById('game-round-label').textContent = `Runde ${res.round}`;
        showScreen('game');
      } else {
        showScreen('start');
      }
    });
  }

  socket.on('connect', () => {
    tryRejoin();
  });
})();
