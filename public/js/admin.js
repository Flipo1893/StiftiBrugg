// admin.js (Client) - Uebersicht offener Lobbys + Bestenliste zuruecksetzen.
// Ist serverseitig ein ADMIN_PASSWORD gesetzt (Online-Betrieb), muss es hier
// eingegeben werden, bevor Daten geladen werden. Im lokalen Betrieb am Stand
// (kein ADMIN_PASSWORD konfiguriert) genuegt ein Klick auf "Anmelden".
(function () {
  const socket = io();
  const roomsList = document.getElementById('rooms-list');
  const roomsEmpty = document.getElementById('rooms-empty');
  const btnReset = document.getElementById('btn-reset');
  const confirmBox = document.getElementById('confirm-box');
  const btnConfirm = document.getElementById('btn-confirm-reset');
  const btnCancel = document.getElementById('btn-cancel-reset');
  const resetStatus = document.getElementById('reset-status');

  const panelLogin = document.getElementById('panel-login');
  const panelBestenliste = document.getElementById('panel-bestenliste');
  const panelLobbys = document.getElementById('panel-lobbys');
  const inputPassword = document.getElementById('input-admin-password');
  const btnLogin = document.getElementById('btn-admin-login');
  const loginError = document.getElementById('login-error');

  function getPassword() {
    return sessionStorage.getItem('bh_admin_password') || '';
  }

  function renderRooms(rooms) {
    roomsList.innerHTML = '';
    roomsEmpty.hidden = rooms.length > 0;
    rooms.forEach((room) => {
      const row = document.createElement('div');
      row.className = 'room-row';
      const names = room.players.map((p) => `${p.name} (${p.score})${p.connected ? '' : ' - offline'}`).join(' vs. ');
      row.innerHTML = `<span>${room.code} - ${room.state}, Runde ${room.round}</span><span>${names}</span>`;
      roomsList.appendChild(row);
    });
  }

  function refresh() {
    socket.emit('admin:getState', { password: getPassword() }, (res) => {
      if (!res.ok) {
        sessionStorage.removeItem('bh_admin_password');
        panelLogin.hidden = false;
        panelBestenliste.hidden = true;
        panelLobbys.hidden = true;
        loginError.textContent = res.error || 'Anmeldung fehlgeschlagen.';
        return;
      }
      panelLogin.hidden = true;
      panelBestenliste.hidden = false;
      panelLobbys.hidden = false;
      renderRooms(res.openRooms || []);
    });
  }

  btnLogin.addEventListener('click', () => {
    sessionStorage.setItem('bh_admin_password', inputPassword.value);
    loginError.textContent = '';
    refresh();
  });

  inputPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin.click();
  });

  btnReset.addEventListener('click', () => {
    confirmBox.hidden = false;
    btnReset.hidden = true;
  });

  btnCancel.addEventListener('click', () => {
    confirmBox.hidden = true;
    btnReset.hidden = false;
  });

  btnConfirm.addEventListener('click', () => {
    socket.emit('admin:resetLeaderboard', { password: getPassword() }, (res) => {
      confirmBox.hidden = true;
      btnReset.hidden = false;
      if (!res.ok) {
        resetStatus.textContent = res.error || 'Zurücksetzen fehlgeschlagen.';
        return;
      }
      resetStatus.textContent = 'Bestenliste wurde zurückgesetzt.';
      setTimeout(() => { resetStatus.textContent = ''; }, 3000);
    });
  });

  socket.on('connect', refresh);
  setInterval(() => {
    if (panelLogin.hidden) refresh();
  }, 5000);
})();
