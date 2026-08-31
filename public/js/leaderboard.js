// leaderboard.js (Client) - zeigt die Top 10 live an, aktualisiert per
// Socket.io. Der Rest der Bestenliste laesst sich darunter aufklappen.
(function () {
  const socket = io();
  const body = document.getElementById('lb-body');
  const bodyExtra = document.getElementById('lb-body-extra');
  const empty = document.getElementById('lb-empty');
  const btnToggleMore = document.getElementById('btn-toggle-more');

  const TOP_COUNT = 10;
  let expanded = false;

  function buildRow(entry, rank) {
    const tr = document.createElement('tr');
    const reaction = entry.bestReactionMs === null || entry.bestReactionMs === undefined
      ? '-'
      : `${entry.bestReactionMs} ms`;
    tr.innerHTML = `
      <td class="rank">${rank}</td>
      <td></td>
      <td>${entry.points}</td>
      <td>${reaction}</td>
    `;
    tr.children[1].textContent = entry.name;
    return tr;
  }

  function render(entries) {
    body.innerHTML = '';
    bodyExtra.innerHTML = '';
    empty.hidden = entries.length > 0;

    entries.slice(0, TOP_COUNT).forEach((entry, i) => {
      body.appendChild(buildRow(entry, i + 1));
    });

    const rest = entries.slice(TOP_COUNT);
    rest.forEach((entry, i) => {
      bodyExtra.appendChild(buildRow(entry, TOP_COUNT + i + 1));
    });

    if (rest.length > 0) {
      btnToggleMore.hidden = false;
      btnToggleMore.textContent = expanded
        ? 'Weniger anzeigen'
        : `Weitere ${rest.length} anzeigen`;
    } else {
      btnToggleMore.hidden = true;
      expanded = false;
    }
    bodyExtra.hidden = !expanded;
  }

  btnToggleMore.addEventListener('click', () => {
    expanded = !expanded;
    bodyExtra.hidden = !expanded;
    btnToggleMore.textContent = expanded
      ? 'Weniger anzeigen'
      : `Weitere ${bodyExtra.children.length} anzeigen`;
  });

  socket.emit('leaderboard:subscribe', {}, (entries) => render(entries || []));
  socket.on('leaderboardUpdate', (entries) => render(entries || []));
})();
