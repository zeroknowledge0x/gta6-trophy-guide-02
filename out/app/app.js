// Leonida Legends — offline trophy tracker. All state lives in localStorage; the only
// network read is the local trophy data file. Citation links are display text from JSON.

const STORAGE_KEY = 'gta6trophies';
const DATA_PATH = './data/trophies.json';
const URL_PATTERN = /https?:\/\/[^\s)]+/g;

const STAGES = {
  1: { title: 'Story foundations', note: 'Clear the prologue and Chapters 1-2. Nothing here is missable; just follow the campaign.' },
  2: { title: 'Vice City unlocks', note: 'Push Chapters 3-4 and the early heists. Watch for character strands opening as the city expands.' },
  3: { title: 'The missable window', note: 'Story finale, partner moments and every chapter-bound secret. Do these before the ending locks them away.' },
  4: { title: 'Map completion', note: 'Collectibles, exploration, properties and repeatable side activities. Free roam, no clock.' },
  5: { title: 'Skill and repeatable feats', note: 'Stunts, challenges, races and medals. Chip away between story missions.' },
  6: { title: 'Cleanup and platinum', note: 'Money systems, long-count tasks, the final 100% check — then the platinum lands.' },
};

const dom = {
  checklist: document.getElementById('checklist'),
  detail: document.getElementById('detail'),
  roadmap: document.getElementById('roadmap'),
  missables: document.getElementById('missables'),
  roadmapSection: document.getElementById('roadmapSection'),
  earnedCount: document.getElementById('earnedCount'),
  progressFill: document.getElementById('progressFill'),
  progressPct: document.getElementById('progressPct'),
  progressBar: document.getElementById('progressBar'),
  shownCount: document.getElementById('shownCount'),
  search: document.getElementById('search'),
  kinds: document.getElementById('kinds'),
  spoilers: document.getElementById('spoilers'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  resetBtn: document.getElementById('resetBtn'),
  status: document.getElementById('status'),
};

let trophies = [];
let earned = new Set();
let activeKind = 'all';
let searchTerm = '';
let hideSpoilers = false;
let selectedId = null;
let statusTimer = null;

// ---------------------------------------------------------------- persistence

function readStoredIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.earned)) return data.earned;
    return [];
  } catch {
    return [];
  }
}

function saveProgress() {
  const payload = { version: 1, earned: [...earned].sort((a, b) => a - b) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

async function loadTrophies() {
  const response = await fetch(DATA_PATH);
  if (!response.ok) throw new Error('Could not load the trophy data file.');
  const data = await response.json();
  return Array.isArray(data.trophies) ? data.trophies : [];
}

function setStatus(message) {
  dom.status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { dom.status.textContent = ''; }, 3500);
}

// ---------------------------------------------------------------- spoiler rules

function isStorySpoiler(trophy) {
  return hideSpoilers && trophy.kind === 'story' && !earned.has(trophy.id);
}

function displayName(trophy) {
  return isStorySpoiler(trophy) ? 'Hidden trophy - earn to reveal' : trophy.name;
}

function displayDescription(trophy) {
  return isStorySpoiler(trophy)
    ? 'Sealed story entry. Mark it earned or turn spoilers off to read the official description.'
    : trophy.description;
}

// ---------------------------------------------------------------- filtering

function matchesFilters(trophy) {
  if (activeKind !== 'all' && trophy.kind !== activeKind) return false;
  if (searchTerm === '') return true;
  const haystack = [trophy.name, trophy.description, trophy.guide, trophy.source].join(' ').toLowerCase();
  return haystack.includes(searchTerm);
}

function findTrophy(id) {
  return trophies.find((trophy) => trophy.id === id) ?? null;
}

// ---------------------------------------------------------------- small builders

function makeGradeBadge(grade, extraClass = '') {
  const badge = document.createElement('span');
  badge.className = `grade grade-${grade} ${extraClass}`.trim();
  badge.textContent = grade;
  return badge;
}

function makeTag(text, className) {
  const tag = document.createElement('span');
  tag.className = `tag ${className}`.trim();
  tag.textContent = text;
  return tag;
}

function appendLabel(host, text) {
  const label = document.createElement('span');
  label.className = 'detail-label';
  label.textContent = text;
  host.append(label);
  return label;
}

// The source strings carry citation URLs as plain text. Build real anchors from them,
// without ever fetching anything. No URL literal exists in this script.
function appendSourceText(host, sourceText) {
  const matches = [...sourceText.matchAll(URL_PATTERN)];
  let cursor = 0;
  for (const match of matches) {
    const before = sourceText.slice(cursor, match.index);
    if (before) host.append(document.createTextNode(before));
    const link = document.createElement('a');
    link.href = match[0];
    link.textContent = match[0].replace(/^https?:\/\//, '').replace(/\/$/, '');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'source-link';
    host.append(link);
    cursor = match.index + match[0].length;
  }
  const tail = sourceText.slice(cursor);
  if (tail) host.append(document.createTextNode(tail));
}

// ---------------------------------------------------------------- rendering

function renderProgress() {
  const total = trophies.length || 55;
  const count = earned.size;
  dom.earnedCount.textContent = `${count} / ${total}`;
  dom.progressPct.textContent = `${Math.round((count / total) * 100)}%`;
  dom.progressFill.style.width = `${(count / total) * 100}%`;
  dom.progressBar.setAttribute('aria-valuenow', String(count));
}

function renderChecklist() {
  const scrollTop = dom.checklist.scrollTop;
  const visible = trophies.filter(matchesFilters);
  dom.shownCount.textContent = `${visible.length} shown`;
  dom.checklist.replaceChildren();

  for (const trophy of visible) {
    const isEarned = earned.has(trophy.id);
    const spoiled = isStorySpoiler(trophy);
    const row = document.createElement('div');
    row.className = 'trophy-row';
    if (isEarned) row.classList.add('is-earned');
    if (spoiled) row.classList.add('is-spoiled');
    if (selectedId === trophy.id) row.classList.add('is-selected');
    row.setAttribute('role', 'listitem');
    row.dataset.id = String(trophy.id);

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.textContent = isEarned ? '✓' : '';
    check.setAttribute('aria-label', `Toggle earned state for ${trophy.name}`);
    check.setAttribute('aria-pressed', String(isEarned));
    check.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleEarned(trophy.id);
    });

    const body = document.createElement('div');
    body.className = 'row-body';
    const top = document.createElement('div');
    top.className = 'row-top';
    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = displayName(trophy);
    top.append(name);

    const tags = document.createElement('span');
    tags.className = 'row-tags';
    if (trophy.missable) tags.append(makeTag('missable', 'tag-missable'));
    if (isEarned) tags.append(makeTag('earned', 'tag-earned'));
    tags.append(makeGradeBadge(trophy.grade));
    top.append(tags);

    const desc = document.createElement('div');
    desc.className = 'row-desc';
    desc.textContent = displayDescription(trophy);
    body.append(top, desc);

    row.append(check, body);
    row.addEventListener('click', () => selectTrophy(trophy.id));
    dom.checklist.append(row);
  }
  dom.checklist.scrollTop = scrollTop;
}

function renderDetail(trophy) {
  dom.detail.replaceChildren();
  if (!trophy) {
    const empty = document.createElement('div');
    empty.className = 'empty-detail';
    empty.innerHTML = '<div class="empty-glyph">◆</div><h3>Pick a trophy</h3><p>Select any row to read its official description, the field guide, its source and the exact steps.</p>';
    dom.detail.append(empty);
    return;
  }

  const inner = document.createElement('div');
  inner.className = 'detail-inner';
  const badges = document.createElement('div');
  badges.className = 'detail-badges';
  badges.append(makeGradeBadge(trophy.grade));
  badges.append(makeTag(trophy.kind, 'tag'));
  if (trophy.missable) badges.append(makeTag('missable', 'tag-missable'));
  if (trophy.hidden) badges.append(makeTag('PSN secret', 'tag'));
  if (earned.has(trophy.id)) badges.append(makeTag('earned', 'tag-earned'));
  inner.append(badges);

  const heading = document.createElement('h3');
  heading.textContent = isStorySpoiler(trophy) ? 'Hidden trophy - earn to reveal' : trophy.name;
  inner.append(heading);

  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = isStorySpoiler(trophy)
    ? 'Official description hidden by your spoiler setting.'
    : `“${trophy.description}”`;
  inner.append(official);

  if (!isStorySpoiler(trophy)) {
    appendLabel(inner, 'Field guide');
    const guide = document.createElement('p');
    guide.className = 'detail-text';
    guide.textContent = trophy.guide;
    inner.append(guide);

    appendLabel(inner, 'Source');
    const source = document.createElement('div');
    source.className = 'source-box';
    appendSourceText(source, trophy.source);
    inner.append(source);

    appendLabel(inner, 'Steps');
    const steps = document.createElement('ol');
    steps.className = 'steps';
    for (const step of trophy.steps) {
      const li = document.createElement('li');
      li.textContent = step;
      steps.append(li);
    }
    inner.append(steps);
  }

  if (trophy.missable && !isStorySpoiler(trophy)) {
    const note = document.createElement('div');
    note.className = 'note';
    const strong = document.createElement('strong');
    strong.textContent = 'Missable · ';
    note.append(strong, document.createTextNode(trophy.missableWhy ?? 'Tied to a limited story window.'));
    inner.append(note);
  }

  const roadmapNote = document.createElement('div');
  roadmapNote.className = 'note note-roadmap';
  const roadmapStrong = document.createElement('strong');
  roadmapStrong.textContent = `Stage ${trophy.roadmap} · ${STAGES[trophy.roadmap].title}. `;
  roadmapNote.append(roadmapStrong, document.createTextNode(STAGES[trophy.roadmap].note));
  inner.append(roadmapNote);

  dom.detail.append(inner);
}

function renderRoadmap() {
  dom.roadmap.replaceChildren();
  for (let stage = 1; stage <= 6; stage++) {
    const info = STAGES[stage];
    const list = trophies.filter((trophy) => trophy.roadmap === stage);
    const card = document.createElement('article');
    card.className = 'stage-card';

    const head = document.createElement('div');
    head.className = 'stage-head';
    const number = document.createElement('span');
    number.className = 'stage-num';
    number.textContent = String(stage);
    const title = document.createElement('h3');
    title.textContent = info.title;
    head.append(number, title);

    const note = document.createElement('p');
    note.textContent = info.note;

    const items = document.createElement('div');
    items.className = 'stage-list';
    for (const trophy of list) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'stage-item';
      if (earned.has(trophy.id)) item.classList.add('is-earned');
      const mini = document.createElement('span');
      mini.className = `mini-grade ${trophy.grade}`;
      mini.textContent = trophy.grade.slice(0, 1).toUpperCase();
      item.append(mini, document.createTextNode(displayName(trophy)));
      item.title = `Open ${trophy.name}`;
      item.addEventListener('click', () => {
        selectTrophy(trophy.id);
        dom.checklist.scrollIntoView({ block: 'nearest' });
      });
      items.append(item);
    }
    card.append(head, note, items);
    dom.roadmap.append(card);
  }
}

function renderMissables() {
  dom.missables.replaceChildren();
  const list = trophies.filter((trophy) => trophy.missable);
  for (const trophy of list) {
    const card = document.createElement('article');
    card.className = 'miss-card';
    if (earned.has(trophy.id)) card.classList.add('is-earned');
    const top = document.createElement('div');
    top.className = 'miss-top';
    const title = document.createElement('h3');
    title.textContent = displayName(trophy);
    const stage = document.createElement('span');
    stage.className = 'miss-stage';
    stage.textContent = `stage ${trophy.roadmap}`;
    top.append(title, stage);
    const why = document.createElement('p');
    why.textContent = trophy.missableWhy ?? trophy.guide;
    card.append(top, why);
    card.addEventListener('click', () => selectTrophy(trophy.id));
    dom.missables.append(card);
  }
}

function syncControls() {
  dom.search.value = searchTerm;
  dom.spoilers.checked = hideSpoilers;
  for (const chip of dom.kinds.querySelectorAll('.chip')) {
    chip.classList.toggle('is-active', chip.dataset.kind === activeKind);
    chip.setAttribute('aria-pressed', String(chip.dataset.kind === activeKind));
  }
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderDetail(findTrophy(selectedId));
  renderRoadmap();
  renderMissables();
}

// ---------------------------------------------------------------- actions

function toggleEarned(id) {
  if (earned.has(id)) earned.delete(id);
  else earned.add(id);
  saveProgress();
  renderAll();
}

function selectTrophy(id) {
  selectedId = id;
  renderChecklist();
  renderDetail(findTrophy(id));
}

function exportProgress() {
  const payload = { game: 'Grand Theft Auto VI', key: STORAGE_KEY, earned: [...earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'leonida-legends-progress.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus(`Exported ${earned.size} earned trophy ids.`);
}

async function importProgress(file) {
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : (data && Array.isArray(data.earned) ? data.earned : []);
    const valid = new Set(trophies.map((trophy) => trophy.id));
    earned = new Set(ids.map(Number).filter((id) => valid.has(id)));
    saveProgress();
    renderAll();
    setStatus(`Imported ${earned.size} earned trophy ids.`);
  } catch {
    setStatus('Import failed: the file was not valid progress JSON.');
  }
}

function resetProgress() {
  if (!confirm('Reset all trophy progress on this device? This cannot be undone.')) return;
  earned.clear();
  selectedId = null;
  saveProgress();
  renderAll();
  setStatus('Progress reset.');
}

// ---------------------------------------------------------------- deliberate screenshot states

function applyShotPreset() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (!shot) return null;
  document.body.classList.add(`shot-${shot}`);
  earned.clear();
  if (shot === 'cover') {
    for (const id of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]) earned.add(id);
    activeKind = 'all';
    hideSpoilers = false;
    selectedId = 30;
  } else if (shot === 'guide') {
    activeKind = 'story';
    hideSpoilers = false;
    selectedId = 3;
  } else if (shot === 'roadmap') {
    activeKind = 'all';
    hideSpoilers = false;
    selectedId = 33;
  } else if (shot === 'filters') {
    for (const id of [2, 3]) earned.add(id);
    activeKind = 'story';
    hideSpoilers = true;
    selectedId = 4;
  }
  return shot;
}

// ---------------------------------------------------------------- wiring + boot

function bindControls() {
  dom.search.addEventListener('input', () => {
    searchTerm = dom.search.value.trim().toLowerCase();
    renderChecklist();
  });

  dom.kinds.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    activeKind = chip.dataset.kind;
    syncControls();
    renderChecklist();
  });

  dom.spoilers.addEventListener('change', () => {
    hideSpoilers = dom.spoilers.checked;
    renderChecklist();
    renderDetail(findTrophy(selectedId));
    renderRoadmap();
    renderMissables();
  });

  dom.exportBtn.addEventListener('click', exportProgress);
  dom.importFile.addEventListener('change', () => {
    const file = dom.importFile.files && dom.importFile.files[0];
    if (file) importProgress(file);
    dom.importFile.value = '';
  });
  dom.resetBtn.addEventListener('click', resetProgress);
}

async function init() {
  bindControls();
  const stored = readStoredIds().map(Number);
  trophies = await loadTrophies();
  const known = new Set(trophies.map((trophy) => trophy.id));
  earned = new Set(stored.filter((id) => known.has(id)));
  applyShotPreset();
  syncControls();
  renderAll();
}

init().catch((error) => {
  dom.checklist.textContent = 'Unable to load the trophy guide.';
  setStatus(error.message);
});
