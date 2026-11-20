// Leonida Legends: an offline trophy guide and tracker. Every function has one job.
// Data is loaded from ./data/trophies.json; progress lives only in localStorage.

const STORAGE_KEY = 'gta6trophies';
const CHECK_MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ROADMAP_STAGES = [
  { stage: 1, title: 'Opening & Chapter 1', note: 'Follow the mission marker. The prologue and first chapter fall into place on a normal run.' },
  { stage: 2, title: 'Chapters 2 - 3', note: 'Keep the main story moving and grab the early Ocean Beach moment before its window closes.' },
  { stage: 3, title: 'Mid story & set pieces', note: 'Chapter 4 plus the named heists and missions that unlock along the way.' },
  { stage: 4, title: 'The finale', note: 'Finish the final mission for the story trophy, then let free roam open up.' },
  { stage: 5, title: 'Free-roam cleanup', note: 'The big sweep: missables, stranger chains, collectibles, activities, properties and races.' },
  { stage: 6, title: 'Completion & platinum', note: 'Tie up full completion. The platinum arrives on its own once everything else is earned.' },
];

let trophies = [];
let earned = new Set();
let activeKind = 'all';
let searchTerm = '';
let spoilersOn = false;
let selectedId = null;
let shotPreset = '';

function byId(id) {
  return document.getElementById(id);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function loadTrophyData() {
  const response = await fetch('./data/trophies.json');
  if (!response.ok) throw new Error('Could not load the trophy list.');
  const data = await response.json();
  return data.trophies;
}

function loadProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const ids = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch (error) {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function isEarned(id) {
  return earned.has(id);
}

function findTrophy(id) {
  return trophies.find(function (trophy) { return trophy.id === id; }) || null;
}

function isHiddenBySpoilers(trophy) {
  return spoilersOn && trophy.kind === 'story' && !isEarned(trophy.id);
}

function safeName(trophy) {
  return isHiddenBySpoilers(trophy) ? 'Hidden trophy - earn to reveal' : trophy.name;
}

function safeDescription(trophy) {
  return isHiddenBySpoilers(trophy) ? 'This story trophy is locked. Earn it or turn off the spoiler shield to read it.' : trophy.description;
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function createGradeBadge(grade) {
  return element('span', 'badge badge-' + grade, gradeLabel(grade));
}

function matchesKind(trophy) {
  return activeKind === 'all' || trophy.kind === activeKind;
}

function matchesSearch(trophy) {
  if (searchTerm === '') return true;
  const haystack = [trophy.name, trophy.description, trophy.guide, trophy.source]
    .concat(trophy.steps || []).join(' ').toLowerCase();
  return haystack.includes(searchTerm);
}

function getVisibleTrophies() {
  return trophies.filter(function (trophy) {
    return matchesKind(trophy) && matchesSearch(trophy);
  });
}

function createCheckButton(trophy) {
  const button = element('button', 'check');
  button.type = 'button';
  button.innerHTML = CHECK_MARK;
  button.setAttribute('aria-pressed', String(isEarned(trophy.id)));
  button.setAttribute('aria-label', (isEarned(trophy.id) ? 'Mark as not earned: ' : 'Mark as earned: ') + safeName(trophy));
  button.addEventListener('click', function (event) {
    event.stopPropagation();
    toggleEarned(trophy.id);
  });
  return button;
}

function createTrophyRow(trophy) {
  const classes = ['row'];
  if (isEarned(trophy.id)) classes.push('is-earned');
  if (selectedId === trophy.id) classes.push('is-selected');
  if (isHiddenBySpoilers(trophy)) classes.push('is-hidden');

  const row = element('li', classes.join(' '));
  row.setAttribute('role', 'listitem');

  const top = element('span', 'row-top');
  top.append(element('span', 'row-name', safeName(trophy)));
  top.append(createGradeBadge(trophy.grade));
  if (trophy.missable) {
    top.append(element('span', 'flag', 'Missable'));
  } else if (trophy.kind === 'story') {
    top.append(element('span', 'flag flag-soft', 'Story'));
  } else if (trophy.kind === 'collectibles') {
    top.append(element('span', 'flag flag-teal', 'Collectible'));
  }
  top.append(element('span', 'row-id', '#' + String(trophy.id).padStart(2, '0')));

  const main = element('button', 'row-main');
  main.type = 'button';
  main.append(top, element('span', 'row-desc', safeDescription(trophy)));
  main.addEventListener('click', function () { selectTrophy(trophy.id); });

  row.append(createCheckButton(trophy), main);
  return row;
}

function renderChecklist() {
  const host = byId('rows');
  host.replaceChildren();
  const visible = getVisibleTrophies();
  for (const trophy of visible) host.append(createTrophyRow(trophy));
  if (visible.length === 0) host.append(element('p', 'empty', 'No trophies match these filters. Try another search or kind.'));
  byId('list-count').textContent = visible.length + ' shown';
}

function renderProgress() {
  const count = trophies.filter(function (trophy) { return isEarned(trophy.id); }).length;
  const total = trophies.length;
  const percent = total === 0 ? 0 : Math.round((count / total) * 100);
  byId('progress-label').textContent = count + ' of ' + total + ' earned';
  byId('progress-pct').textContent = percent + '%';
  byId('progress-fill').style.width = percent + '%';
  byId('progress-track').setAttribute('aria-valuenow', String(count));
  byId('progress-track').setAttribute('aria-valuemax', String(total));
}

function createLockedDetail(heading, message) {
  const box = element('div', 'locked');
  box.append(element('div', 'lock-glyph', '?'));
  const title = element('h2', '', heading);
  title.id = 'detail-title';
  box.append(title, element('p', '', message));
  return box;
}

function renderSourceInto(paragraph, sourceText) {
  const pattern = /(https?:\/\/[^\s)]+)/g;
  let cursor = 0;
  for (const match of sourceText.matchAll(pattern)) {
    const url = match[0];
    const start = match.index;
    if (start > cursor) paragraph.append(document.createTextNode(sourceText.slice(cursor, start)));
    const link = element('a', '', url);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    paragraph.append(link);
    cursor = start + url.length;
  }
  if (cursor < sourceText.length) paragraph.append(document.createTextNode(sourceText.slice(cursor)));
  return paragraph;
}

function createStepsList(steps) {
  const list = element('ol', 'steps');
  for (const step of steps) list.append(element('li', '', step));
  return list;
}

function createDetailEarnButton(trophy) {
  const button = element('button', 'detail-earn' + (isEarned(trophy.id) ? ' is-earned' : ''),
    isEarned(trophy.id) ? 'Mark as not earned' : 'Mark as earned');
  button.type = 'button';
  button.addEventListener('click', function () { toggleEarned(trophy.id); });
  return button;
}

function createDetailContent(trophy) {
  const host = element('div', 'detail-content');

  const kicker = element('div', 'detail-kicker', 'Trophy ' + String(trophy.id).padStart(2, '0') + ' / ' + trophies.length);
  kicker.append(createGradeBadge(trophy.grade));
  host.append(kicker);

  const title = element('h2', 'detail-title', trophy.name);
  title.id = 'detail-title';
  host.append(title);
  host.append(element('p', 'detail-official', 'Official description: ' + trophy.description));

  const tags = element('div', 'detail-tags');
  if (trophy.missable) {
    tags.append(element('span', 'flag', 'Missable'));
  } else {
    tags.append(element('span', 'flag flag-soft', kindLabel(trophy.kind)));
  }
  tags.append(element('span', 'flag flag-teal', 'Roadmap stage ' + trophy.roadmap));
  host.append(tags);

  const guideSection = element('section', 'detail-section');
  guideSection.append(element('h3', '', 'How to earn it'), element('p', '', trophy.guide));
  host.append(guideSection);

  const sourceSection = element('section', 'detail-section');
  sourceSection.append(element('h3', '', 'Where this is documented'));
  sourceSection.append(renderSourceInto(element('p', 'source-text'), trophy.source));
  host.append(sourceSection);

  const stepSection = element('section', 'detail-section');
  stepSection.append(element('h3', '', 'Short steps'), createStepsList(trophy.steps));
  host.append(stepSection);

  if (trophy.missable) {
    const note = element('div', 'note');
    note.append(element('strong', '', 'Missable: '), document.createTextNode(trophy.missable_reason || 'The official description points to a limited window.'));
    host.append(note);
  }

  host.append(createDetailEarnButton(trophy));
  return host;
}

function kindLabel(kind) {
  const labels = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };
  return labels[kind] || kind;
}

function renderDetail() {
  const host = byId('detail');
  host.replaceChildren();
  const trophy = findTrophy(selectedId);
  if (trophy === null) {
    host.append(createLockedDetail('Pick a trophy', 'Choose a row from the checklist to see its guide, steps and source here.'));
    return;
  }
  if (isHiddenBySpoilers(trophy)) {
    host.append(createLockedDetail('Hidden trophy - earn to reveal',
      'This is an unearned story trophy and the spoiler shield is on. Earn it, or switch the shield off, to read the guide.'));
    return;
  }
  host.append(createDetailContent(trophy));
}

function createStageChip(trophy) {
  const classes = ['mini'];
  if (isEarned(trophy.id)) classes.push('is-earned');
  if (isHiddenBySpoilers(trophy)) classes.push('is-hidden');
  const chip = element('button', classes.join(' '), safeName(trophy));
  chip.type = 'button';
  chip.addEventListener('click', function () { selectFromLower(trophy.id); });
  return chip;
}

function createStageCard(stage, members) {
  const card = element('article', 'stage');
  card.append(element('span', 'stage-num', String(stage.stage)));
  card.append(element('h3', 'stage-title', stage.title));
  card.append(element('p', 'stage-note', stage.note));
  const chips = element('div', 'stage-chips');
  for (const trophy of members) chips.append(createStageChip(trophy));
  card.append(chips);
  return card;
}

function renderRoadmap() {
  const host = byId('roadmap');
  host.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const members = trophies.filter(function (trophy) { return trophy.roadmap === stage.stage; });
    host.append(createStageCard(stage, members));
  }
}

function createMissableCard(trophy) {
  const classes = ['miss-card'];
  if (isEarned(trophy.id)) classes.push('is-earned');
  const card = element('article', classes.join(' '));
  const top = element('div', 'miss-top');
  top.append(element('span', 'miss-name', safeName(trophy)));
  top.append(createGradeBadge(trophy.grade));
  card.append(top);
  card.append(element('p', 'miss-why', trophy.missable_reason || 'The official description points to a limited window.'));
  card.addEventListener('click', function () { selectFromLower(trophy.id); });
  return card;
}

function renderMissables() {
  const host = byId('missables');
  host.replaceChildren();
  const flagged = trophies.filter(function (trophy) { return trophy.missable; });
  byId('missable-count').textContent = flagged.length + ' flagged';
  for (const trophy of flagged) host.append(createMissableCard(trophy));
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function selectTrophy(id) {
  selectedId = id;
  renderChecklist();
  renderDetail();
}

function selectFromLower(id) {
  selectTrophy(id);
  const top = document.querySelector('.workspace');
  if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleEarned(id) {
  if (isEarned(id)) earned.delete(id);
  else earned.add(id);
  saveProgress();
  renderAll();
}

function setActiveKind(kind) {
  activeKind = kind;
  for (const chip of byId('kind-filters').querySelectorAll('.chip')) {
    const active = chip.dataset.kind === kind;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', String(active));
  }
  renderChecklist();
}

function handleExport() {
  const payload = {
    app: 'Leonida Legends',
    key: STORAGE_KEY,
    earned: [...earned].sort(function (a, b) { return a - b; }),
    total: trophies.length,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = element('a', '');
  link.href = url;
  link.download = 'leonida-legends-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function extractImportedIds(value) {
  const source = Array.isArray(value) ? value : (value && Array.isArray(value.earned) ? value.earned : []);
  return source.map(function (item) {
    return item && typeof item === 'object' ? item.id : item;
  }).map(Number).filter(function (id) { return Number.isInteger(id); });
}

function handleImport(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;
  file.text().then(function (text) {
    try {
      const ids = extractImportedIds(JSON.parse(text));
      const known = new Set(trophies.map(function (trophy) { return trophy.id; }));
      earned = new Set(ids.filter(function (id) { return known.has(id); }));
      saveProgress();
      renderAll();
    } catch (error) {
      window.alert('That file is not a valid Leonida Legends progress file.');
    }
    input.value = '';
  });
}

function handleReset() {
  if (!window.confirm('Reset all trophy progress? This cannot be undone.')) return;
  earned = new Set();
  saveProgress();
  renderAll();
}

function bindEvents() {
  byId('search').addEventListener('input', function (event) {
    searchTerm = event.target.value.trim().toLowerCase();
    renderChecklist();
  });

  byId('kind-filters').addEventListener('click', function (event) {
    const chip = event.target.closest('.chip');
    if (chip) setActiveKind(chip.dataset.kind);
  });

  byId('spoilers').addEventListener('change', function (event) {
    spoilersOn = event.target.checked;
    renderChecklist();
    renderDetail();
    renderRoadmap();
    renderMissables();
  });

  byId('export').addEventListener('click', handleExport);
  byId('import-btn').addEventListener('click', function () { byId('import-file').click(); });
  byId('import-file').addEventListener('change', handleImport);
  byId('reset').addEventListener('click', handleReset);
}

function applyShotPreset() {
  const params = new URLSearchParams(location.search);
  shotPreset = params.get('shot') || '';
  const sample = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  if (shotPreset === 'cover') {
    earned = new Set(sample);
    selectedId = 40;
  } else if (shotPreset === 'guide') {
    earned = new Set([2, 3, 4, 5]);
    selectedId = 6;
    spoilersOn = false;
  } else if (shotPreset === 'roadmap') {
    earned = new Set(sample);
    selectedId = 40;
    document.body.classList.add('shot-roadmap');
  } else if (shotPreset === 'filters') {
    earned = new Set([2, 3, 4]);
    activeKind = 'story';
    spoilersOn = true;
    selectedId = 7;
  } else {
    selectedId = 25;
  }
}

function syncControls() {
  byId('spoilers').checked = spoilersOn;
  byId('search').value = searchTerm;
  for (const chip of byId('kind-filters').querySelectorAll('.chip')) {
    const active = chip.dataset.kind === activeKind;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', String(active));
  }
}

function applyShotScroll() {
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
}

async function bootstrap() {
  trophies = await loadTrophyData();
  earned = loadProgress();
  bindEvents();
  applyShotPreset();
  syncControls();
  renderAll();
  applyShotScroll();
}

bootstrap();
