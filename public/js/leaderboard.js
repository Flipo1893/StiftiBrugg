// leaderboard.js (Client) - zeigt die Top 10 live an, aktualisiert per Socket.io.
(function () {
  const socket = io();
  const body = document.getElementById('lb-body');
  const empty = document.getElementById('lb-empty');

  function render(entries) {
    body.innerHTML = '';
    empty.hidden = entries.length > 0;
    entries.forEach((entry, i) => {
      const tr = document.createElement('tr');
      const reaction = entry.bestReactionMs === null || entry.bestReactionMs === undefined
        ? '-'
        : `${entry.bestReactionMs} ms`;
      tr.innerHTML = `
        <td class="rank">${i + 1}</td>
        <td></td>
        <td>${entry.points}</td>
        <td>${reaction}</td>
      `;
      tr.children[1].textContent = entry.name;
      body.appendChild(tr);
    });
  }

  socket.emit('leaderboard:subscribe', {}, (entries) => render(entries || []));
  socket.on('leaderboardUpdate', (entries) => render(entries || []));
})();
