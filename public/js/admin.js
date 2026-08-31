// admin.js (Client) - Uebersicht offener Lobbys + Bestenliste zuruecksetzen.
(function () {
  const socket = io();
  const roomsList = document.getElementById('rooms-list');
  const roomsEmpty = document.getElementById('rooms-empty');
  const btnReset = document.getElementById('btn-reset');
  const confirmBox = document.getElementById('confirm-box');
  const btnConfirm = document.getElementById('btn-confirm-reset');
  const btnCancel = document.getElementById('btn-cancel-reset');
  const resetStatus = document.getElementById('reset-status');

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
    socket.emit('admin:getState', {}, (res) => {
      renderRooms(res.openRooms || []);
    });
  }

  btnReset.addEventListener('click', () => {
    confirmBox.hidden = false;
    btnReset.hidden = true;
  });

  btnCancel.addEventListener('click', () => {
    confirmBox.hidden = true;
    btnReset.hidden = false;
  });

  btnConfirm.addEventListener('click', () => {
    socket.emit('admin:resetLeaderboard', {}, () => {
      resetStatus.textContent = 'Bestenliste wurde zurückgesetzt.';
      confirmBox.hidden = true;
      btnReset.hidden = false;
      setTimeout(() => { resetStatus.textContent = ''; }, 3000);
    });
  });

  socket.on('connect', refresh);
  setInterval(refresh, 5000);
})();
