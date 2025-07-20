function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function load(key) { return JSON.parse(localStorage.getItem(key) || "[]"); }
let players = load('beyblade_players');
let tournaments = load('beyblade_tournaments');

let view = "dashboard";
let liveMatch = null;
let modalActive = false;

function render() {
  hideModal();
  if (view === "dashboard") renderDashboard();
  else if (view === "players") renderPlayers();
  else if (view === "tournaments") renderTournaments();
  else if (view === "stats") renderStats();
  else if (view === "live-match") renderLiveMatch();
  setActiveNav();
}
function setActiveNav() {
  ["dashboard","tournaments","players","stats"].forEach(v => {
    document.getElementById("nav-"+v).classList.toggle("active",view===v);
  });
}

// ==== Dashboard ====
function renderDashboard() {
  document.getElementById('app').innerHTML = `
    <div class="dashboard">
      <div class="dashboard-buttons">
        <button onclick="openStartMatch()" ${tournaments.length<1?"disabled":""}>Start Match</button>
        <button onclick="openNewTournament()">New Tournament</button>
      </div>
      <section>
        <h3>Active Tournaments</h3>
        <div id="active-tournaments">
          ${tournaments.length<1? `<div class="list-card">No tournaments</div>` :
            tournaments.map((t,i)=>`
              <div class="list-card" style="justify-content:space-between;">
                <span>${t.name} (${t.format}-pt)</span>
                <button onclick="viewTournament(${i})">View</button>
              </div>
            `).join('')}
        </div>
      </section>
      <section>
        <h3>Top Players</h3>
        <div id="top-players-list">
        ${
          players.length<1 ?
          `<div class="list-card"><span class="icon">🥇</span>No player statistics yet</div>`
          :
          getTopPlayers().map((p,i)=>
            `<div class="list-card" style="align-items:center;">
              <span class="rank">#${i+1}</span>
              <b>${p.name}</b>&ensp;|&ensp;<span style="font-size:0.95em">${p.wins}W, ${p.losses}L</span>
              <span style="margin-left:auto;font-size:0.9em;">${Math.round(100*p.winRate)}%</span>
            </div>`
          ).join('')
        }
        </div>
      </section>
    </div>
  `;
}
function getTopPlayers() {
  return players
    .map(p=>({...p,winRate:p.wins/(p.wins+p.losses||1)}))
    .sort((a,b)=>b.winRate-a.winRate || b.wins-a.winRate)
    .slice(0,5);
}

// ==== Tournament Creation & Match Schedule ====
function openNewTournament() {
  showModal(`
    <h2>Create Tournament</h2>
    <input id="t-name" placeholder="Tournament name"/>
    <label>Format:
      <select id="t-format"><option>4</option><option>5</option><option>7</option></select>
    </label>
    <label>Players:
      <select id="t-players" multiple size="6" style="height:90px;">
        ${players.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}
      </select>
      <div style="color:#777;font-size:0.9em;">Hold Ctrl or Command to select multiple.</div>
    </label>
    <div style="text-align:right;padding-top:14px;">
      <button onclick="goToScheduleMatches()">Next</button>
      <button onclick="hideModal()">Cancel</button>
    </div>
  `);
}
function goToScheduleMatches() {
  const name = document.getElementById('t-name').value.trim();
  const format = +document.getElementById('t-format').value;
  const selectedPlayers = [...document.getElementById('t-players').selectedOptions].map(x=>+x.value);
  if (!name || selectedPlayers.length<2) { alert("Enter name and select at least 2 players."); return; }
  showModal(`
    <h2>Schedule Matches</h2>
    <div id="scheduled-matches"></div>
    <form id="matchAddForm">
      <label>Player 1: <select id="sched-p1">${selectedPlayers.map(i=>`<option value="${i}">${players[i].name}</option>`)}</select></label>
      <label>Player 2: <select id="sched-p2">${selectedPlayers.map(i=>`<option value="${i}">${players[i].name}</option>`)}</select></label>
      <button id="add-match-btn">Add Match</button>
    </form>
    <div style="text-align:right;padding-top:14px;">
      <button onclick="finalizeTournament()" id="finalize-btn">Create Tournament</button>
      <button onclick="hideModal()">Cancel</button>
    </div>
  `);
  let matches = [];
  document.getElementById('scheduled-matches').innerHTML = `<b>Scheduled:</b><ul id="match-list"></ul>`;
  document.getElementById('matchAddForm').onsubmit = function(e){
    e.preventDefault();
    let p1 = +document.getElementById('sched-p1').value;
    let p2 = +document.getElementById('sched-p2').value;
    if(p1===p2) { alert("Cannot schedule match vs. self"); return;}
    if(matches.some(m=>(m.p1===p1 && m.p2===p2)|| (m.p1===p2 && m.p2===p1))) { alert("Match already scheduled"); return;}
    matches.push({p1, p2, played:false, winner:null, score1:0, score2:0});
    updateMatchList();
  }
  function updateMatchList() {
    document.getElementById('match-list').innerHTML = matches.length===0?'<li>No matches yet</li>':
      matches.map(m=>`<li>${players[m.p1].name} vs ${players[m.p2].name}</li>`).join('');
  }
  window.finalizeTournament = function(){
    if(matches.length<1) { alert("Add at least one match!"); return;}
    tournaments.push({name, format, players: selectedPlayers, matches});
    save('beyblade_tournaments', tournaments);
    hideModal(); render();
  }
  updateMatchList();
}

function viewTournament(idx) {
  const t = tournaments[idx];
  showModal(`
    <h2>${t.name}</h2>
    <p>Format: ${t.format}-pt<br>
      <b>Players: </b>${t.players.map(i=>players[i].name).join(", ")}
    </p>
    <hr>
    <b>Results:</b>
    <ul style="padding-left:18px;">
      ${t.matches.filter(m=>m.played).length<1?"<li>No matches played yet</li>":t.matches.filter(m=>m.played).map(
        m=>`<li>${players[m.p1].name} vs ${players[m.p2].name} — Winner: <b>${players[m.winner].name}</b> (${m.score1} - ${m.score2})</li>`
      ).join('')}
    </ul>
    <div style="text-align:right;margin-top:18px;">
      <button onclick="hideModal()">Close</button>
    </div>
  `);
}

// ==== Start Match (fixed version): opens live match window! ====
function openStartMatch() {
  if (tournaments.length < 1) {
    alert("No tournaments available. Please create a tournament first.");
    return;
  }
  showModal(`
    <h2>Start Scheduled Match</h2>
    <label>Select Tournament:
      <select id="sel-tournament">
        ${tournaments.map((t, idx) => `<option value="${idx}">${t.name} (${t.format}-pt)</option>`)}
      </select>
    </label>
    <label id="match-select-label" style="display:block;"></label>
    <div style="text-align:right;margin-top:15px;">
      <button id="start-match-btn" style="display:none;">Start Match</button>
      <button onclick="hideModal()">Cancel</button>
    </div>
  `);

  const tournamentSelect = document.getElementById('sel-tournament');
  const matchLabel = document.getElementById('match-select-label');
  const startBtn = document.getElementById('start-match-btn');

  function updateMatchDropdown() {
    const tIdx = +tournamentSelect.value;
    const t = tournaments[tIdx];
    const unused = t.matches.filter(m => !m.played);
    if (unused.length === 0) {
      matchLabel.innerHTML = `<i>All matches played</i>`;
      startBtn.style.display = 'none';
      return;
    }
    matchLabel.innerHTML = `Select Match: <select id="sel-match">
      ${unused.map(m => `<option value="${t.matches.indexOf(m)}">${players[m.p1].name} vs ${players[m.p2].name}</option>`).join('')}
    </select>`;
    startBtn.style.display = 'inline-block';

    startBtn.onclick = () => {
      const matchSelect = document.getElementById('sel-match');
      if (!matchSelect) {
        alert("No match selected.");
        return;
      }
      const matchIdx = +matchSelect.value;
      const match = t.matches[matchIdx];
      liveMatch = {
        tIdx,
        mIdx: matchIdx,
        p1: match.p1,
        p2: match.p2,
        score1: match.score1 || 0,
        score2: match.score2 || 0,
        pointsToWin: t.format,
        winner: match.winner || null
      };
      hideModal();
      view = "live-match";
      render();
    };
  }

  tournamentSelect.addEventListener('change', updateMatchDropdown);
  updateMatchDropdown();
}

// ==== Live Match/Stats Update ====
function renderLiveMatch() {
  // Defensive: If liveMatch is not set, go home!
  if (!liveMatch || typeof liveMatch.p1 === "undefined" || typeof liveMatch.p2 === "undefined") {
    view = "dashboard"; render(); return;
  }
  const p1 = players[liveMatch.p1];
  const p2 = players[liveMatch.p2];
  const disabled = liveMatch.winner !== undefined && liveMatch.winner !== null;
  document.getElementById('app').innerHTML = `
    <div class="content-page">
      <h2>Live Match (${liveMatch.pointsToWin}-pt)</h2>
      <div class="live-match">
        <div class="live-row">
          <div class="player-panel">
            <div class="player-name">${p1.name}</div>
            <div id="score1" class="player-score">${liveMatch.score1}</div>
            <div class="score-btns">
              <button class="spin" onclick="score(1,1)" ${disabled?'disabled':''}>Spin Finish +1</button>
              <button class="burst" onclick="score(1,2)" ${disabled?'disabled':''}>Burst/Over +2</button>
              <button class="xtreme" onclick="score(1,3)" ${disabled?'disabled':''}>Xtreme +3</button>
            </div>
          </div>
          <div style="width:16px"></div>
          <div class="player-panel">
            <div class="player-name">${p2.name}</div>
            <div id="score2" class="player-score">${liveMatch.score2}</div>
            <div class="score-btns">
              <button class="spin" onclick="score(2,1)" ${disabled?'disabled':''}>Spin Finish +1</button>
              <button class="burst" onclick="score(2,2)" ${disabled?'disabled':''}>Burst/Over +2</button>
              <button class="xtreme" onclick="score(2,3)" ${disabled?'disabled':''}>Xtreme +3</button>
            </div>
          </div>
        </div>
        <div>
          <button onclick="endLiveMatch()" style="margin:22px auto 0;display:block;">End Match</button>
        </div>
        <div id="winner-banner" class="${disabled?'winner-banner':''}">
          ${disabled?renderWinnerBanner():''}
        </div>
      </div>
    </div>
  `;
}
function score(player, pts) {
  if (liveMatch.winner!==undefined && liveMatch.winner!==null) return;
  if (player===1) liveMatch.score1+=pts;
  else liveMatch.score2+=pts;
  if (liveMatch.score1>=liveMatch.pointsToWin) {
    liveMatch.winner = liveMatch.p1;
    showWinnerBanner(liveMatch.p1);
    updateMatchStats(liveMatch.p1, liveMatch.p2);
  }
  else if (liveMatch.score2>=liveMatch.pointsToWin) {
    liveMatch.winner = liveMatch.p2;
    showWinnerBanner(liveMatch.p2);
    updateMatchStats(liveMatch.p2, liveMatch.p1);
  }
  renderLiveMatch();
}
function showWinnerBanner(idx) {
  setTimeout(()=> {
    document.getElementById('winner-banner').className = 'winner-banner';
    document.getElementById('winner-banner').innerHTML = renderWinnerBanner();
  }, 310);
}
function renderWinnerBanner() {
  const winnerName = players[liveMatch.winner].name;
  return `<span class="trophy">🏆</span><br><b>${winnerName} Wins!</b>`;
}
function updateMatchStats(winner, loser) {
  players[winner].wins++; players[loser].losses++; save('beyblade_players', players);

  let t = tournaments[liveMatch.tIdx];
  let m = t.matches[liveMatch.mIdx];
  m.winner = winner; m.score1 = liveMatch.score1; m.score2 = liveMatch.score2; m.played = true;
  save('beyblade_tournaments', tournaments);
}
function endLiveMatch() { liveMatch = null; view = "dashboard"; render(); }

// ==== Players Page ====
function renderPlayers() {
  document.getElementById('app').innerHTML = `
    <div class="content-page">
    <h2>Players</h2>
    ${players.length===0 ?
      `<div class="list-card" style="justify-content:center; text-align:center;">
        <div style="font-size:2em;opacity:.5;margin-bottom:.3em;">👥</div>
        No players yet<br>
        <button onclick="openAddPlayer()" class="action">Add Player</button>
      </div>` :
      `<button onclick="openAddPlayer()" style="margin-bottom:14px;">Add Player</button>
      ${
        players.map((p,i)=>`
          <div class="list-card" style="gap:0.7rem;justify-content:space-between;">
            <b>${p.name}</b>
            <span>${p.wins} W / ${p.losses} L</span>
            <button class="danger" onclick="removePlayer(${i})">Remove</button>
          </div>
        `).join('')
      }`
    }
    </div>
  `;
}
function openAddPlayer() {
  showModal(`
    <h2>Add New Player</h2>
    <input id="new-player-name" placeholder="Enter player name" />
    <div style="text-align:right;padding-top:9px;">
      <button onclick="doAddPlayer()">Add Player</button>
      <button onclick="hideModal()">Cancel</button>
    </div>
  `);
  setTimeout(() => { document.getElementById('new-player-name').focus(); }, 250);
}
function doAddPlayer() {
  const v = document.getElementById('new-player-name').value.trim();
  if (!v) { alert("Enter a player name!"); return; }
  players.push({name:v, wins:0, losses:0});
  save('beyblade_players', players);
  hideModal();
  render();
}
function removePlayer(idx) {
  if (confirm(`Remove player "${players[idx].name}"?`)) {
    players.splice(idx,1);
    save('beyblade_players', players);
    render();
  }
}

// ==== Tournaments Page ====
function renderTournaments() {
  document.getElementById('app').innerHTML = `
    <div class="content-page">
      <h2>Tournaments</h2>
      ${
        tournaments.length === 0 ?
        `<div class="list-card">No tournaments created yet. <br>
         <button onclick="openNewTournament()">New Tournament</button></div>` :
        tournaments.map((t,i)=>`
          <div class="list-card" style="flex-direction:column;align-items:flex-start;">
            <b>${t.name}</b> <span>Format: ${t.format}-pt</span>
            <span style="font-size:0.95em;color:var(--icon);margin-top:7px;">
            ${t.players.length} players | ${t.matches.filter(m=>m.played).length}/${t.matches.length} matches played
            </span>
            <span>
              <button onclick="viewTournament(${i})">View</button>
            </span>
          </div>
        `).join('')
      }
    </div>
  `;
}

// ==== Stats Page ====
function renderStats() {
  document.getElementById('app').innerHTML = `
    <div class="content-page">
      <h2>Stats</h2>
      ${
        players.length<1?
        `<div class="list-card">No stats to display (add some players and play some matches!)</div>`:
        `<b>All Player Records:</b>
        <table style="width:100%;margin-top:14px; font-size:0.97em;">
          <tr style="background:var(--bg);font-weight:bold;">
            <td>Name</td><td>Wins</td><td>Losses</td><td>Win Rate</td>
          </tr>
          ${players.map(p=>`
              <tr>
                <td>${p.name}</td>
                <td>${p.wins}</td>
                <td>${p.losses}</td>
                <td>${Math.round(100*p.wins/(p.wins+p.losses||1))}%</td>
              </tr>
            `).join('')
          }
        </table>
        <hr>
        <b>Recent Tournament Matches:</b>
        <ul style="padding-left:20px;">
        ${
          tournaments.flatMap(t=>t.matches.filter(m=>m.played).map(m=>({
            name: t.name, match: m
          }))).slice(-10).reverse().map(
            o=>`<li><b>${o.name}:</b> ${players[o.match.p1]?.name||'??'} vs ${players[o.match.p2]?.name||'??'} — Winner: <b>${players[o.match.winner]?.name||'??'}</b> (${o.match.score1} - ${o.match.score2})</li>`
          ).join("") || '<li>No matches played yet</li>'
        }
        </ul>
        `
      }
    </div>
  `;
}

// ==== Modal System ====
function showModal(html="") {
  document.getElementById('modal-bg').classList.remove('hidden');
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal').innerHTML = html;
  modalActive = true;
}
function hideModal() {
  if (modalActive) {
    document.getElementById('modal-bg').classList.add('hidden');
    document.getElementById('modal').classList.add('hidden');
    modalActive = false;
  }
}

// ==== Binds ====
document.getElementById('nav-dashboard').onclick = ()=>{view="dashboard";render();};
document.getElementById('nav-players').onclick = ()=>{view="players";render();};
document.getElementById('nav-tournaments').onclick = ()=>{view="tournaments";render();};
document.getElementById('nav-stats').onclick = ()=>{view="stats";render();};
document.getElementById('modal-bg').onclick = hideModal;

render();
