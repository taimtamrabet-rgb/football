'use strict';

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

const POSITIONS = {
  QB: { label: 'Quarterback', skillLabel: 'Arm Talent',
        weights: { speed: 0.15, strength: 0.10, skill: 0.45, awareness: 0.30 } },
  RB: { label: 'Running Back', skillLabel: 'Vision',
        weights: { speed: 0.35, strength: 0.25, skill: 0.25, awareness: 0.15 } },
  WR: { label: 'Wide Receiver', skillLabel: 'Hands',
        weights: { speed: 0.35, strength: 0.15, skill: 0.35, awareness: 0.15 } },
};

const ATTR_LABELS = {
  speed: 'Speed', strength: 'Strength', skill: null, awareness: 'Awareness', stamina: 'Stamina',
};

const LEVELS = {
  HS: { label: 'High School', games: 10, trainingRounds: 3,
        pass: [70, 300], rush: [25, 170], rec: [25, 150] },
  College: { label: 'College', games: 12, trainingRounds: 3,
        pass: [140, 400], rush: [35, 210], rec: [35, 180] },
  NFL: { label: 'NFL', games: 17, trainingRounds: 2,
        pass: [170, 410], rush: [45, 175], rec: [45, 165] },
};

const NFL_MAX_YEARS = 14;
const MAX_STRUGGLE_YEARS_DRAFTED = 3;
const MAX_STRUGGLE_YEARS_UDFA = 2;

/* ------------------------------------------------------------------ */
/* Roster (teams & players) — built-in fallback + JSON import           */
/* ------------------------------------------------------------------ */

const ROSTER_STORAGE_KEY = 'gridironCustomRoster';
const DEFAULT_COLORS = ['#ff6b35', '#141d31'];

// College tiers, from best to worst, used to match a recruit's star rating
// to a pool of custom teams if the imported JSON tags teams with a tier.
const COLLEGE_TIERS = ['elite', 'power', 'g5', 'fcs', 'small'];

const DEFAULT_ROSTER = {
  highSchoolTeams: [
    { name: 'Ironwood High', logo: '🌲', colors: ['#ff6b35', '#141d31'] },
    { name: 'Lakeside High', logo: '🌊', colors: ['#2dd4bf', '#141d31'] },
    { name: 'Central High', logo: '⭐', colors: ['#eef2ff', '#141d31'] },
  ],
  collegeTeams: [
    { name: 'State University', logo: '🦅', colors: ['#ff6b35', '#141d31'], tier: 'elite' },
    { name: 'Tech', logo: '⚙️', colors: ['#2dd4bf', '#141d31'], tier: 'power' },
    { name: 'A&M', logo: '🐎', colors: ['#f87171', '#141d31'], tier: 'power' },
    { name: 'Central University', logo: '🦁', colors: ['#facc15', '#141d31'], tier: 'g5' },
    { name: 'Coastal University', logo: '🌴', colors: ['#38bdf8', '#141d31'], tier: 'g5' },
    { name: 'Northern State', logo: '❄️', colors: ['#94a3b8', '#141d31'], tier: 'fcs' },
    { name: 'Valley College', logo: '⛰️', colors: ['#84cc16', '#141d31'], tier: 'small' },
  ],
  nflTeams: [
    { name: 'Ironclads', logo: '⚙️', colors: ['#94a3b8', '#141d31'] },
    { name: 'Sentinels', logo: '🛡️', colors: ['#2dd4bf', '#141d31'] },
    { name: 'Coyotes', logo: '🐺', colors: ['#f97316', '#141d31'] },
    { name: 'Marauders', logo: '🏴', colors: ['#ef4444', '#141d31'] },
    { name: 'Voyagers', logo: '🧭', colors: ['#3b82f6', '#141d31'] },
    { name: 'Bison', logo: '🦬', colors: ['#a16207', '#141d31'] },
    { name: 'Titans', logo: '⚡', colors: ['#facc15', '#141d31'] },
    { name: 'Harbor Kings', logo: '⚓', colors: ['#0ea5e9', '#141d31'] },
  ],
  rivals: [],
};

// Placeholder-only example shown to the user — no real team or player data.
const ROSTER_SCHEMA_EXAMPLE = {
  highSchoolTeams: [
    { name: 'Your High School Name', logo: '🏈', colors: ['#ff6b35', '#141d31'] },
    { name: 'https://yourimagehost.com/logo.png works too', logo: 'https://example.com/logo.png', colors: ['#2dd4bf', '#141d31'] },
  ],
  collegeTeams: [
    { name: 'Your College Name', logo: '🎓', colors: ['#ff0000', '#111111'], tier: 'elite', quality: 0.85 },
  ],
  nflTeams: [
    { name: 'Your NFL Team Name', logo: '🏆', colors: ['#0000ff', '#ffffff'], quality: 0.7 },
  ],
  rivals: [
    { name: 'Some Opposing Player', position: 'QB' },
  ],
};

let customRoster = null;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function getTeamPool(kind) {
  if (customRoster && Array.isArray(customRoster[kind]) && customRoster[kind].length) {
    return customRoster[kind];
  }
  return DEFAULT_ROSTER[kind];
}

function getRivalPool() {
  if (customRoster && Array.isArray(customRoster.rivals) && customRoster.rivals.length) {
    return customRoster.rivals;
  }
  return DEFAULT_ROSTER.rivals;
}

function safeCssColor(c) {
  return (typeof c === 'string' && /^[#a-zA-Z0-9(),.%\s-]{1,40}$/.test(c)) ? c : null;
}

function teamLogoHtml(team, size) {
  size = size || '28px';
  if (!team) return '';
  const rawColors = (team.colors && team.colors.length >= 2) ? team.colors : DEFAULT_COLORS;
  const colors = [safeCssColor(rawColors[0]) || DEFAULT_COLORS[0], safeCssColor(rawColors[1]) || DEFAULT_COLORS[1]];
  const logo = team.logo;
  if (typeof logo === 'string' && /^(https?:|data:image\/)/i.test(logo.trim())) {
    return `<img class="team-logo" style="width:${size};height:${size}" src="${escapeHtml(logo.trim())}" alt="" onerror="this.style.display='none'" />`;
  }
  const initials = (logo && String(logo).trim())
    || String(team.name || '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return `<span class="team-logo-badge" style="width:${size};height:${size};background:${colors[1]};color:${colors[0]};border:1px solid ${colors[0]}">${escapeHtml(initials)}</span>`;
}

function validateRoster(data) {
  if (!data || typeof data !== 'object') return 'Roster JSON must be an object.';
  const listFields = ['highSchoolTeams', 'collegeTeams', 'nflTeams', 'rivals'];
  let anyProvided = false;
  for (const field of listFields) {
    if (data[field] === undefined) continue;
    if (!Array.isArray(data[field])) return `"${field}" must be an array.`;
    anyProvided = true;
    for (const entry of data[field]) {
      if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || !entry.name.trim()) {
        return `Every entry in "${field}" needs at least a "name" string.`;
      }
      if (entry.colors && (!Array.isArray(entry.colors) || entry.colors.length < 2)) {
        return `"colors" for "${entry.name}" must be an array of at least 2 color strings.`;
      }
      if (entry.quality !== undefined && (typeof entry.quality !== 'number' || entry.quality < 0 || entry.quality > 1)) {
        return `"quality" for "${entry.name}" must be a number between 0 and 1.`;
      }
    }
  }
  if (!anyProvided) return 'Roster JSON did not contain any of: highSchoolTeams, collegeTeams, nflTeams, rivals.';
  return null;
}

function applyRoster(data, persist) {
  customRoster = data;
  if (persist) {
    try { localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }
  renderSchoolChoices();
}

function clearRoster() {
  customRoster = null;
  try { localStorage.removeItem(ROSTER_STORAGE_KEY); } catch (e) { /* storage unavailable */ }
  renderSchoolChoices();
  setRosterStatus('Using default rosters.', 'ok');
}

function loadRosterFromStorage() {
  try {
    const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!validateRoster(data)) customRoster = data;
  } catch (e) { /* ignore corrupt storage */ }
}

function setRosterStatus(msg, cls) {
  const box = el('rosterStatus');
  box.textContent = msg;
  box.className = `roster-status ${cls || ''}`;
}

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

let state = null;

function freshState() {
  return {
    player: {
      name: '', position: 'QB',
      attrs: { speed: 45, strength: 45, skill: 45, awareness: 45, stamina: 45 },
      energy: 100,
      gamesOutRemaining: 0,
      nflStruggleYears: 0,
      draftedRound: null,
    },
    stage: 'HS',      // HS -> College -> NFL
    year: 1,
    team: { name: '', quality: 0.5, logo: '', colors: DEFAULT_COLORS },
    gamesRemaining: 0,
    trainingRoundsRemaining: 0,
    restUsedThisSeason: 0,
    seasonStats: null,
    seasonPerfSum: 0,
    seasonPerfCount: 0,
    careerStats: emptyStatLine(),
    careerAwards: [],
    logEntries: [],
    phase: 'training', // training | game | seasonEnd | ended
    endReason: null,
  };
}

function emptyStatLine() {
  return { games: 0, wins: 0, losses: 0, passYds: 0, passTD: 0, ints: 0,
           rushYds: 0, rushTD: 0, recYds: 0, recTD: 0, receptions: 0 };
}

/* ------------------------------------------------------------------ */
/* Utility                                                              */
/* ------------------------------------------------------------------ */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];

function attrTotal(attrs) {
  return attrs.speed + attrs.strength + attrs.skill + attrs.awareness + attrs.stamina;
}

function playerRating(player) {
  const w = POSITIONS[player.position].weights;
  const a = player.attrs;
  const raw = a.speed * w.speed + a.strength * w.strength + a.skill * w.skill + a.awareness * w.awareness;
  return clamp(raw / 99, 0, 1);
}

/* ------------------------------------------------------------------ */
/* DOM refs                                                             */
/* ------------------------------------------------------------------ */

const el = (id) => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  el(id).classList.add('active');
}

/* ------------------------------------------------------------------ */
/* Start screen wiring                                                  */
/* ------------------------------------------------------------------ */

let chosenPosition = null;
let chosenSchoolIndex = null;

function initStartScreen() {
  document.querySelectorAll('#positionChoice .choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#positionChoice .choice').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      chosenPosition = btn.dataset.value;
      updateStartButton();
    });
  });

  loadRosterFromStorage();
  renderSchoolChoices();

  el('playerName').addEventListener('input', updateStartButton);
  el('btnStart').addEventListener('click', startCareer);
  el('btnRestart').addEventListener('click', () => {
    chosenPosition = null;
    chosenSchoolIndex = null;
    document.querySelectorAll('#positionChoice .choice').forEach((b) => b.classList.remove('selected'));
    el('playerName').value = '';
    renderSchoolChoices();
    updateStartButton();
    showScreen('screen-start');
  });

  el('btnShowSchema').addEventListener('click', () => {
    const box = el('rosterSchema');
    if (box.hidden) {
      box.textContent = JSON.stringify(ROSTER_SCHEMA_EXAMPLE, null, 2);
      box.hidden = false;
    } else {
      box.hidden = true;
    }
  });

  el('rosterFile').addEventListener('change', (evt) => {
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleRosterJsonText(reader.result);
    reader.onerror = () => setRosterStatus('Could not read that file.', 'err');
    reader.readAsText(file);
    evt.target.value = '';
  });

  el('btnPasteJson').addEventListener('click', () => {
    el('rosterPaste').hidden = !el('rosterPaste').hidden;
    el('btnApplyPaste').hidden = el('rosterPaste').hidden;
  });

  el('btnApplyPaste').addEventListener('click', () => {
    handleRosterJsonText(el('rosterPaste').value);
  });

  el('btnClearRoster').addEventListener('click', clearRoster);
}

function handleRosterJsonText(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    setRosterStatus('Invalid JSON — check for a syntax error.', 'err');
    return;
  }
  const error = validateRoster(data);
  if (error) {
    setRosterStatus(error, 'err');
    return;
  }
  applyRoster(data, true);
  const counts = ['highSchoolTeams', 'collegeTeams', 'nflTeams', 'rivals']
    .map((k) => `${(data[k] || []).length} ${k}`)
    .join(', ');
  setRosterStatus(`Roster loaded: ${counts}.`, 'ok');
}

function renderSchoolChoices() {
  const container = el('schoolChoice');
  const pool = getTeamPool('highSchoolTeams');
  container.innerHTML = '';
  pool.forEach((team, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.index = String(idx);
    btn.innerHTML = `${teamLogoHtml(team, '22px')}<span>${escapeHtml(team.name)}</span>`;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.choice').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      chosenSchoolIndex = idx;
      updateStartButton();
    });
    container.appendChild(btn);
  });
  chosenSchoolIndex = null;
  updateStartButton();
}

function updateStartButton() {
  const nameOk = el('playerName').value.trim().length > 0;
  el('btnStart').disabled = !(nameOk && chosenPosition && chosenSchoolIndex !== null);
}

function startCareer() {
  state = freshState();
  state.player.name = el('playerName').value.trim();
  state.player.position = chosenPosition;

  const hsTeam = getTeamPool('highSchoolTeams')[chosenSchoolIndex];
  state.team = {
    name: hsTeam.name,
    logo: hsTeam.logo,
    colors: hsTeam.colors || DEFAULT_COLORS,
    quality: typeof hsTeam.quality === 'number' ? hsTeam.quality : rand(0.4, 0.6),
  };

  // slight starting bias toward position-relevant attributes
  const w = POSITIONS[state.player.position].weights;
  for (const k of ['speed', 'strength', 'skill', 'awareness']) {
    state.player.attrs[k] = clamp(Math.round(35 + w[k] * 60 + rand(-5, 5)), 20, 60);
  }
  state.player.attrs.stamina = randInt(35, 55);

  log(`Welcome to ${escapeHtml(state.team.name)}, ${escapeHtml(state.player.name)}. Your journey to NFL MVP starts now.`, 'highlight');
  showScreen('screen-game');
  beginYear();
}

/* ------------------------------------------------------------------ */
/* Logging                                                              */
/* ------------------------------------------------------------------ */

function log(text, cls) {
  state.logEntries.unshift({ text, cls: cls || '' });
  state.logEntries = state.logEntries.slice(0, 40);
  renderLog();
}

function renderLog() {
  const container = el('eventLog');
  container.innerHTML = state.logEntries
    .map((e) => `<div class="event-log-entry ${e.cls}">${e.text}</div>`)
    .join('');
}

/* ------------------------------------------------------------------ */
/* Year / season flow                                                   */
/* ------------------------------------------------------------------ */

function beginYear() {
  const levelInfo = LEVELS[state.stage];
  state.gamesRemaining = levelInfo.games;
  state.trainingRoundsRemaining = levelInfo.trainingRounds;
  state.restUsedThisSeason = 0;
  state.seasonStats = emptyStatLine();
  state.seasonPerfSum = 0;
  state.seasonPerfCount = 0;
  state.player.energy = 100;
  state.player.gamesOutRemaining = 0;

  log(`— ${levelInfo.label} Year ${state.year} begins —`, 'highlight');
  state.phase = 'training';
  render();
}

/* ------------------------------------------------------------------ */
/* Training phase                                                       */
/* ------------------------------------------------------------------ */

function trainingGainFor(attrValue) {
  return Math.max(1, Math.round(7 * (1 - attrValue / 99)) + randInt(0, 2));
}

function renderTrainingActions() {
  const container = el('actionArea');
  container.innerHTML = '';

  const w = POSITIONS[state.player.position].weights;
  const keys = ['speed', 'strength', 'skill', 'awareness', 'stamina'];
  // weight selection toward relevant attrs but keep some randomness
  const weighted = keys.slice().sort(() => Math.random() - 0.5);
  const options = weighted.slice(0, 3);

  options.forEach((key) => {
    const label = key === 'skill' ? POSITIONS[state.player.position].skillLabel : ATTR_LABELS[key];
    const gain = trainingGainFor(state.player.attrs[key]);
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = `Train ${label}<small>+${gain} (currently ${state.player.attrs[key]})</small>`;
    btn.addEventListener('click', () => doTraining(key, gain, label));
    container.appendChild(btn);
  });
}

function doTraining(key, gain, label) {
  state.player.attrs[key] = clamp(state.player.attrs[key] + gain, 0, 99);
  log(`Training camp: worked on ${label}. (+${gain})`, '');
  state.trainingRoundsRemaining -= 1;
  if (state.trainingRoundsRemaining <= 0) {
    state.phase = 'game';
    log(`Camp is over. Season kicks off for ${escapeHtml(state.team.name)}.`, 'highlight');
  }
  render();
}

/* ------------------------------------------------------------------ */
/* Game phase                                                           */
/* ------------------------------------------------------------------ */

function renderGameActions() {
  const container = el('actionArea');
  container.innerHTML = '';

  const playBtn = document.createElement('button');
  playBtn.className = 'action-btn primary';
  playBtn.innerHTML = `Play Next Game<small>${state.gamesRemaining} remaining this season</small>`;
  playBtn.addEventListener('click', () => { playOneGame(); render(); });
  container.appendChild(playBtn);

  if (state.gamesRemaining > 1) {
    const simBtn = document.createElement('button');
    simBtn.className = 'action-btn';
    simBtn.innerHTML = `Sim Rest of Season<small>Fast-forward to season end</small>`;
    simBtn.addEventListener('click', () => {
      while (state.gamesRemaining > 0 && state.phase === 'game') {
        playOneGame();
      }
      render();
    });
    container.appendChild(simBtn);
  }

  if (state.player.energy < 55 && state.restUsedThisSeason < 2) {
    const restBtn = document.createElement('button');
    restBtn.className = 'action-btn';
    restBtn.innerHTML = `Rest & Recover<small>Skip a scheduled game to heal up (2 max/season)</small>`;
    restBtn.addEventListener('click', () => { restWeek(); render(); });
    container.appendChild(restBtn);
  }
}

function restWeek() {
  state.restUsedThisSeason += 1;
  state.player.energy = clamp(state.player.energy + 40, 0, 100);
  state.gamesRemaining -= 1;
  const teamWin = Math.random() < clamp(0.4 + state.team.quality * 0.3, 0.1, 0.85);
  if (teamWin) { state.seasonStats.wins++; state.careerStats.wins++; log(`You sat out this week. ${escapeHtml(state.team.name)} won without you.`, 'good'); }
  else { state.seasonStats.losses++; state.careerStats.losses++; log(`You sat out this week. ${escapeHtml(state.team.name)} lost a tough one.`, 'bad'); }
  state.seasonStats.games++;
  state.careerStats.games++;
  if (state.gamesRemaining <= 0) endSeason();
}

function playOneGame() {
  if (state.player.gamesOutRemaining > 0) {
    state.player.gamesOutRemaining -= 1;
    state.gamesRemaining -= 1;
    const teamWin = Math.random() < clamp(0.4 + state.team.quality * 0.3, 0.1, 0.85);
    if (teamWin) { state.seasonStats.wins++; state.careerStats.wins++; log(`Sidelined with injury. ${escapeHtml(state.team.name)} pulled out a win.`, 'good'); }
    else { state.seasonStats.losses++; state.careerStats.losses++; log(`Sidelined with injury. ${escapeHtml(state.team.name)} came up short.`, 'bad'); }
    state.seasonStats.games++;
    state.careerStats.games++;
    if (state.gamesRemaining <= 0) endSeason();
    return;
  }

  const levelInfo = LEVELS[state.stage];
  const baseRating = playerRating(state.player);
  const energyPenalty = state.player.energy < 30 ? (30 - state.player.energy) / 150 : 0;
  const performance = clamp(baseRating + rand(-0.13, 0.13) - energyPenalty, 0.05, 1);

  const opponentQuality = clamp(0.5 + rand(-0.3, 0.3), 0.15, 0.9);
  const winProb = clamp(
    0.5 + (performance - 0.5) * 0.6 + (state.team.quality - 0.5) * 0.6 - (opponentQuality - 0.5) * 0.6,
    0.05, 0.95
  );
  const win = Math.random() < winProb;

  const line = generateStatLine(state.player.position, levelInfo, performance);
  applyStatLine(line);

  state.seasonPerfSum += performance;
  state.seasonPerfCount += 1;
  state.seasonStats.games += 1;
  state.gamesRemaining -= 1;
  state.careerStats.games += 1;
  if (win) { state.seasonStats.wins += 1; state.careerStats.wins += 1; }
  else { state.seasonStats.losses += 1; state.careerStats.losses += 1; }

  state.player.energy = clamp(state.player.energy - randInt(12, 22) + 6, 0, 100);

  logGameResult(win, line, performance);
  maybeInjury(levelInfo);

  if (state.gamesRemaining <= 0 && state.phase === 'game') endSeason();
}

function generateStatLine(position, levelInfo, performance) {
  const wobble = () => clamp(performance + rand(-0.2, 0.2), 0, 1);
  const line = { passYds: 0, passTD: 0, ints: 0, rushYds: 0, rushTD: 0, recYds: 0, recTD: 0, receptions: 0 };

  const scaled = (range, p) => Math.round(range[0] + (range[1] - range[0]) * p);
  const rollTDs = (perf, cap) => {
    let td = 0;
    for (let i = 0; i < cap; i++) if (Math.random() < perf * 0.55 - i * 0.18) td++;
    return Math.max(td, 0);
  };

  if (position === 'QB') {
    line.passYds = scaled(levelInfo.pass, wobble());
    line.passTD = rollTDs(performance, 4);
    if (Math.random() < (1 - performance) * 0.35) line.ints = randInt(1, 2);
    line.rushYds = Math.round(scaled(levelInfo.rush, wobble()) * 0.22);
  } else if (position === 'RB') {
    line.rushYds = scaled(levelInfo.rush, wobble());
    line.rushTD = rollTDs(performance, 3);
    line.recYds = Math.round(scaled(levelInfo.rec, wobble()) * 0.4);
    line.receptions = Math.round(line.recYds / 11);
  } else { // WR
    line.recYds = scaled(levelInfo.rec, wobble());
    line.recTD = rollTDs(performance, 3);
    line.receptions = Math.round(line.recYds / 13) + randInt(0, 2);
  }
  return line;
}

function applyStatLine(line) {
  for (const key of Object.keys(line)) {
    state.seasonStats[key] += line[key];
    state.careerStats[key] += line[key];
  }
}

function logGameResult(win, line, performance) {
  const parts = [];
  if (line.passYds) parts.push(`${line.passYds} pass yds, ${line.passTD} TD${line.ints ? `, ${line.ints} INT` : ''}`);
  if (line.rushYds) parts.push(`${line.rushYds} rush yds${line.rushTD ? `, ${line.rushTD} TD` : ''}`);
  if (line.recYds) parts.push(`${line.receptions} rec, ${line.recYds} yds${line.recTD ? `, ${line.recTD} TD` : ''}`);
  const resultWord = win ? 'W' : 'L';
  const cls = performance > 0.75 ? 'good' : (performance < 0.35 ? 'bad' : '');
  const flavor = performance > 0.85 ? ' What a performance!' : (performance < 0.25 ? ' A rough day at the office.' : '');

  const rivals = getRivalPool();
  let rivalNote = '';
  if (rivals.length) {
    const rival = pick(rivals);
    rivalNote = performance > 0.6
      ? ` Outplayed ${escapeHtml(rival.name)} on the other side of the ball.`
      : ` ${escapeHtml(rival.name)} had an answer all game.`;
  }

  log(`Game result: <b>${resultWord}</b> — ${parts.join(', ') || 'quiet stat line'}.${flavor}${rivalNote}`, cls);
}

function maybeInjury(levelInfo) {
  let chance = 0.015;
  if (state.player.energy < 25) chance += 0.03;
  if (state.stage === 'NFL') chance += 0.006;
  if (state.stage === 'HS') chance -= 0.008;
  if (Math.random() >= Math.max(chance, 0.003)) return;

  const severeChance = state.stage === 'NFL' ? 0.035 : (state.stage === 'College' ? 0.015 : 0.0);
  if (Math.random() < severeChance) {
    log(`⚠️ Devastating injury on the field. The team doctors don't like what they see.`, 'bad');
    endGame('injury');
    return;
  }
  const miss = randInt(1, 3);
  state.player.gamesOutRemaining = Math.min(miss, state.gamesRemaining - 1 >= 0 ? miss : 0);
  log(`Injury! You'll be out for approximately ${miss} game(s).`, 'bad');
}

/* ------------------------------------------------------------------ */
/* Season end / awards                                                  */
/* ------------------------------------------------------------------ */

function computeAwards() {
  const avgPerf = state.seasonPerfCount ? state.seasonPerfSum / state.seasonPerfCount : 0;
  const winPct = state.seasonStats.games ? state.seasonStats.wins / state.seasonStats.games : 0;
  const awards = [];

  if (state.stage === 'HS') {
    if (avgPerf > 0.68 && winPct >= 0.6) awards.push('All-Conference');
    if (avgPerf > 0.82 && winPct >= 0.7) awards.push('State Player of the Year');
  } else if (state.stage === 'College') {
    if (avgPerf > 0.65 && winPct >= 0.55) awards.push('All-Conference');
    if (avgPerf > 0.78 && winPct >= 0.65) awards.push('All-American');
    if (avgPerf > 0.88 && winPct >= 0.75 && state.year >= 2) awards.push('Heisman Finalist');
    if (avgPerf > 0.94 && winPct >= 0.82 && state.year >= 3) awards.push('Heisman Trophy');
  } else if (state.stage === 'NFL') {
    if (state.year === 1 && avgPerf > 0.65) awards.push('Offensive Rookie of the Year');
    if (avgPerf > 0.62 && winPct >= 0.5) awards.push('Pro Bowl');
    if (avgPerf > 0.75 && winPct >= 0.6) awards.push('All-Pro');
    if (avgPerf > 0.84 && winPct >= 0.68) awards.push('NFL MVP');
  }
  return { awards, avgPerf, winPct };
}

function endSeason() {
  state.phase = 'seasonEnd';
  const { awards, avgPerf, winPct } = computeAwards();

  log(`— Season complete: ${state.seasonStats.wins}-${state.seasonStats.losses} record —`, 'highlight');
  if (awards.length) {
    awards.forEach((a) => {
      state.careerAwards.push({ stage: state.stage, year: state.year, name: a });
      log(`🏆 Award earned: ${a}!`, 'good');
    });
  } else {
    log(`No postseason honors this year. Back to work.`, '');
  }

  state.pendingAvgPerf = avgPerf;
  state.pendingWinPct = winPct;
  render();
}

function renderSeasonEndActions() {
  const container = el('actionArea');
  container.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'action-btn primary';

  const wonMVP = state.careerAwards.some(
    (a) => a.name === 'NFL MVP' && a.stage === state.stage && a.year === state.year
  );

  if (wonMVP) {
    btn.textContent = 'Claim the Trophy';
    btn.addEventListener('click', () => endGame('mvp'));
  } else {
    btn.textContent = 'Continue';
    btn.addEventListener('click', advanceAfterSeason);
  }
  container.appendChild(btn);
}

function advanceAfterSeason() {
  if (state.stage === 'HS') {
    if (state.year < 4) {
      state.year += 1;
      beginYear();
    } else {
      doRecruiting();
    }
  } else if (state.stage === 'College') {
    if (state.year < 4) {
      state.year += 1;
      beginYear();
    } else {
      doDraft();
    }
  } else if (state.stage === 'NFL') {
    if (state.pendingAvgPerf < 0.35) {
      state.player.nflStruggleYears += 1;
    } else if (state.pendingAvgPerf >= 0.5) {
      state.player.nflStruggleYears = 0;
    }
    const maxStruggle = state.player.draftedRound === 'UDFA' ? MAX_STRUGGLE_YEARS_UDFA : MAX_STRUGGLE_YEARS_DRAFTED;
    if (state.player.nflStruggleYears >= maxStruggle) {
      endGame('cut');
      return;
    }
    if (state.year >= NFL_MAX_YEARS) {
      endGame('retire');
      return;
    }
    state.year += 1;
    beginYear();
  }
}

/* ------------------------------------------------------------------ */
/* Recruiting & Draft transitions                                       */
/* ------------------------------------------------------------------ */

function careerAvgPerfForStage(stage) {
  // approximate using awards count + current attrs since per-season perf isn't stored long-term
  return null;
}

function pickTeamForTier(pool, tierKey, qualityRange) {
  const matches = pool.filter((t) => t.tier === tierKey);
  const team = pick(matches.length ? matches : pool);
  const quality = typeof team.quality === 'number' ? team.quality : rand(...qualityRange);
  return { name: team.name, logo: team.logo, colors: team.colors || DEFAULT_COLORS, quality: clamp(quality, 0, 1) };
}

function doRecruiting() {
  const hsAwards = state.careerAwards.filter((a) => a.stage === 'HS').length;
  const score = state.pendingAvgPerf * 70 + hsAwards * 8 + attrTotal(state.player.attrs) / 5;

  let stars, tierName, tierKey, qualityRange;
  if (score > 85) { stars = 5; tierName = 'Elite Power Conference program'; tierKey = 'elite'; qualityRange = [0.75, 0.9]; }
  else if (score > 70) { stars = 4; tierName = 'Power Conference program'; tierKey = 'power'; qualityRange = [0.6, 0.75]; }
  else if (score > 55) { stars = 3; tierName = 'Group of Five program'; tierKey = 'g5'; qualityRange = [0.5, 0.65]; }
  else if (score > 40) { stars = 2; tierName = 'FCS program'; tierKey = 'fcs'; qualityRange = [0.4, 0.55]; }
  else { stars = 1; tierName = 'Small College (walk-on)'; tierKey = 'small'; qualityRange = [0.3, 0.45]; }

  state.team = pickTeamForTier(getTeamPool('collegeTeams'), tierKey, qualityRange);
  log(`— RECRUITING —`, 'highlight');
  log(`You earned a ${stars}-star rating and signed with a ${tierName}: ${escapeHtml(state.team.name)}.`, 'highlight');

  state.stage = 'College';
  state.year = 1;
  beginYear();
}

function doDraft() {
  const collegeAwards = state.careerAwards.filter((a) => a.stage === 'College').length;
  const score = state.pendingAvgPerf * 70 + collegeAwards * 10 + attrTotal(state.player.attrs) / 5 + state.team.quality * 15;

  let round;
  if (score > 95) round = 1;
  else if (score > 82) round = 2;
  else if (score > 70) round = randInt(3, 4);
  else if (score > 55) round = randInt(5, 6);
  else if (score > 42) round = 7;
  else round = 'UDFA';

  state.player.draftedRound = round;
  const nflPool = getTeamPool('nflTeams');
  const nflTeam = pick(nflPool);
  state.team = {
    name: nflTeam.name,
    logo: nflTeam.logo,
    colors: nflTeam.colors || DEFAULT_COLORS,
    quality: typeof nflTeam.quality === 'number' ? nflTeam.quality : rand(0.4, 0.85),
  };

  log(`— NFL DRAFT —`, 'highlight');
  if (round === 'UDFA') {
    log(`Undrafted. You sign as a free agent with the ${escapeHtml(state.team.name)}, ready to prove everyone wrong.`, 'highlight');
  } else {
    log(`Drafted in Round ${round} by the ${escapeHtml(state.team.name)}!`, 'highlight');
  }

  state.stage = 'NFL';
  state.year = 1;
  beginYear();
}

/* ------------------------------------------------------------------ */
/* End game                                                              */
/* ------------------------------------------------------------------ */

function endGame(reason) {
  state.phase = 'ended';
  state.endReason = reason;
  render();

  const titles = {
    mvp: '🏆 NFL MVP!',
    retire: 'A Storied Career Comes to a Close',
    cut: 'Released',
    injury: 'Career-Ending Injury',
  };
  const subtitles = {
    mvp: `${state.player.name} is the Most Valuable Player of the NFL. From Friday nights to Sunday glory.`,
    retire: `${state.player.name} hangs up the cleats after ${state.year} NFL seasons — a respected veteran, if not an MVP.`,
    cut: `${state.player.name} couldn't find consistent form and was released by the ${state.team.name}.`,
    injury: `${state.player.name}'s playing days end suddenly, but the legacy on the field will be remembered.`,
  };

  el('endTitle').textContent = titles[reason] || 'Career Complete';
  el('endSubtitle').textContent = subtitles[reason] || '';

  const c = state.careerStats;
  const awardsHtml = state.careerAwards.length
    ? `<div class="awards-list">${state.careerAwards.map((a) => `<span class="award-chip">${a.name} (${a.stage} Yr${a.year})</span>`).join('')}</div>`
    : `<p>No major awards, but every rep built the legend.</p>`;

  el('endSummary').innerHTML = `
    <h3>Final Team</h3>
    <div class="hud-team-row">${teamLogoHtml(state.team, '32px')}<span>${escapeHtml(state.team.name)}</span></div>
    <h3>Career Totals</h3>
    <div class="stats-grid">
      <div class="stat-box"><div class="val">${c.passYds}</div><div class="lbl">Pass Yds</div></div>
      <div class="stat-box"><div class="val">${c.passTD}</div><div class="lbl">Pass TD</div></div>
      <div class="stat-box"><div class="val">${c.rushYds}</div><div class="lbl">Rush Yds</div></div>
      <div class="stat-box"><div class="val">${c.rushTD}</div><div class="lbl">Rush TD</div></div>
      <div class="stat-box"><div class="val">${c.recYds}</div><div class="lbl">Rec Yds</div></div>
      <div class="stat-box"><div class="val">${c.recTD}</div><div class="lbl">Rec TD</div></div>
      <div class="stat-box"><div class="val">${c.wins}</div><div class="lbl">Wins</div></div>
      <div class="stat-box"><div class="val">${c.losses}</div><div class="lbl">Losses</div></div>
    </div>
    <h3>Honors</h3>
    ${awardsHtml}
  `;

  showScreen('screen-end');
}

/* ------------------------------------------------------------------ */
/* Render                                                                */
/* ------------------------------------------------------------------ */

function render() {
  if (!state || state.phase === 'ended') return;

  el('hudName').textContent = `${state.player.name} — ${POSITIONS[state.player.position].label}`;
  const stageLabel = LEVELS[state.stage].label;
  const roundNote = state.player.draftedRound
    ? ` (${state.player.draftedRound === 'UDFA' ? 'UDFA' : 'Round ' + state.player.draftedRound})`
    : '';
  el('hudMeta').textContent = `${stageLabel} — Year ${state.year}${roundNote}`;
  el('hudTeam').innerHTML = `<span class="hud-team-row">${teamLogoHtml(state.team, '20px')}<span>${escapeHtml(state.team.name)}</span></span>`;
  el('hudRecord').textContent = `${state.seasonStats.wins}-${state.seasonStats.losses} this season`;

  renderAttrs();
  renderLog();
  renderStatsPanel();

  if (state.phase === 'training') renderTrainingActions();
  else if (state.phase === 'game') renderGameActions();
  else if (state.phase === 'seasonEnd') renderSeasonEndActions();
}

function renderAttrs() {
  const container = el('attrList');
  const keys = ['speed', 'strength', 'skill', 'awareness', 'stamina'];
  container.innerHTML = keys.map((k) => {
    const label = k === 'skill' ? POSITIONS[state.player.position].skillLabel : ATTR_LABELS[k];
    const val = state.player.attrs[k];
    return `<div class="attr-item">
      <div class="attr-name"><span>${label}</span><span>${val}</span></div>
      <div class="bar"><div class="bar-fill" style="width:${val}%"></div></div>
    </div>`;
  }).join('');

  el('energyBar').style.width = `${state.player.energy}%`;
}

function renderStatsPanel() {
  const s = state.seasonStats;
  const grid = el('statsGrid');
  const boxes = [];
  if (state.player.position === 'QB') {
    boxes.push(['Pass Yds', s.passYds], ['Pass TD', s.passTD], ['INT', s.ints], ['Rush Yds', s.rushYds]);
  } else if (state.player.position === 'RB') {
    boxes.push(['Rush Yds', s.rushYds], ['Rush TD', s.rushTD], ['Rec', s.receptions], ['Rec Yds', s.recYds]);
  } else {
    boxes.push(['Rec', s.receptions], ['Rec Yds', s.recYds], ['Rec TD', s.recTD]);
  }
  boxes.push(['Record', `${s.wins}-${s.losses}`]);
  grid.innerHTML = boxes.map(([lbl, val]) => `<div class="stat-box"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>`).join('');

  const awardsThisCareer = state.careerAwards;
  const awardsList = el('awardsList');
  awardsList.innerHTML = awardsThisCareer.length
    ? awardsThisCareer.map((a) => `<span class="award-chip">${a.name}</span>`).join('')
    : `<span class="award-chip empty">None yet</span>`;
}

/* ------------------------------------------------------------------ */
/* Init                                                                  */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', initStartScreen);
