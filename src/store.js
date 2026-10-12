const STORAGE_KEY = 'pela-realidade:arquivo:v1';
const EMPTY = () => ({ version: 1, campaigns: [], characters: [], sessions: [], boards: {} });
const ATTRIBUTES = ['Agilidade', 'Força', 'Intelecto', 'Presença', 'Vigor'];
let state = EMPTY();
let storageKey = STORAGE_KEY;
let legacyState = EMPTY();
let lastError = '';
const listeners = new Set();

function text(value, limit = 20000) { return String(value ?? '').slice(0, limit); }
function numeric(value, fallback, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
function color(value, fallback = '#26282a') { return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback; }
function array(value) { return Array.isArray(value) ? value : []; }

function normalize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY();
  const campaigns = array(value.campaigns).filter(row => row && typeof row === 'object').map(row => ({
    id: text(row.id || uid(), 128), name: text(row.name, 120), description: text(row.description),
    cover: text(row.cover, 2000), createdAt: text(row.createdAt, 80), updatedAt: text(row.updatedAt, 80),
    createdBy: text(row.createdBy, 128), membershipRole: text(row.membershipRole, 16)
  }));
  const campaignIds = new Set(campaigns.map(row => row.id));
  const characters = array(value.characters).filter(row => row && typeof row === 'object').map(row => ({
    id: text(row.id || uid(), 128), name: text(row.name, 100), playerNote: text(row.playerNote, 300),
    playerName: text(row.playerName, 120), portrait: text(row.portrait, 2000),
    origin: text(row.origin, 200), className: text(row.className, 200), path: text(row.path, 200),
    nex: text(row.nex, 60), rank: text(row.rank, 100), pv: text(row.pv, 60), pe: text(row.pe, 60),
    san: text(row.san, 60), defense: text(row.defense, 60),
    attributes: Object.fromEntries(ATTRIBUTES.map(name => [name, text(row.attributes?.[name], 20)])),
    skills: text(row.skills), abilities: text(row.abilities), inventory: text(row.inventory),
    progress: text(row.progress), notes: text(row.notes),
    campaignIds: array(row.campaignIds).map(id => text(id, 128)).filter(id => campaignIds.has(id)),
    createdAt: text(row.createdAt, 80), updatedAt: text(row.updatedAt, 80),
    ownerId: text(row.ownerId, 128), createdBy: text(row.createdBy, 128)
  }));
  const sessions = array(value.sessions).filter(row => row && typeof row === 'object' && campaignIds.has(text(row.campaignId, 128))).map(row => ({
    id: text(row.id || uid(), 128), campaignId: text(row.campaignId, 128), title: text(row.title, 140),
    date: text(row.date, 40), description: text(row.description),
    status: ['Planejada', 'Realizada', 'Cancelada'].includes(row.status) ? row.status : 'Planejada',
    notes: text(row.notes), createdAt: text(row.createdAt, 80), updatedAt: text(row.updatedAt, 80),
    createdBy: text(row.createdBy, 128)
  }));
  const boards = {};
  if (value.boards && typeof value.boards === 'object' && !Array.isArray(value.boards)) {
    for (const [key, raw] of Object.entries(value.boards)) {
      if (!campaignIds.has(key) || !raw || typeof raw !== 'object') continue;
      const cards = array(raw.cards).filter(item => item && typeof item === 'object').map(item => ({
        id: text(item.id || uid(), 128), title: text(item.title, 200), text: text(item.text),
        x: numeric(item.x, 100, 0, 5740), y: numeric(item.y, 100, 0, 3820),
        w: numeric(item.w, 260, 180, 600), h: numeric(item.h, 180, 120, 600), color: color(item.color)
      }));
      const cardIds = new Set(cards.map(item => item.id));
      const paths = array(raw.paths).filter(item => item && typeof item === 'object').map(item => ({
        id: text(item.id || uid(), 128), color: color(item.color, '#cf7a70'), width: numeric(item.width, 3, 1, 12),
        points: array(item.points).slice(0, 5000).filter(point => point && typeof point === 'object').map(point => ({
          x: numeric(point.x, 0, 0, 6000), y: numeric(point.y, 0, 0, 4000)
        }))
      }));
      const links = array(raw.links).filter(item => item && typeof item === 'object' && cardIds.has(text(item.from, 128)) && cardIds.has(text(item.to, 128))).map(item => ({
        id: text(item.id || uid(), 128), from: text(item.from, 128), to: text(item.to, 128), label: text(item.label, 300)
      }));
      boards[key] = { campaignId: key, cards, paths, links, updatedAt: text(raw.updatedAt, 80) };
    }
  }
  return { version: 1, campaigns, characters, sessions, boards };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    state = raw ? normalize(JSON.parse(raw)) : EMPTY();
    if (storageKey === STORAGE_KEY) legacyState = structuredClone(state);
    lastError = '';
  } catch (error) {
    lastError = error?.message || 'Não foi possível ler o armazenamento local.';
    state = EMPTY();
  }
  return state;
}

export function getState() { return state; }
export function getStorageError() { return lastError; }
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function uid() { return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }

export function getLegacyState() { return structuredClone(legacyState); }

export function setStorageScope(userId) {
  storageKey = userId ? `${STORAGE_KEY}:user:${String(userId)}` : STORAGE_KEY;
}

export function replaceState(value, { persist = true } = {}) {
  const next = normalize(value);
  if (persist) {
    const serialized = JSON.stringify(next);
    localStorage.setItem(storageKey, serialized);
    if (localStorage.getItem(storageKey) !== serialized) throw new Error('A gravação local não pôde ser confirmada.');
  }
  state = next;
  lastError = '';
  for (const listener of listeners) listener(state);
  return state;
}

export function clearMemory() {
  state = EMPTY();
  lastError = '';
  for (const listener of listeners) listener(state);
}

export function commit(change) {
  const previous = state;
  try {
    const next = structuredClone(state);
    change(next);
    const serialized = JSON.stringify(next);
    localStorage.setItem(storageKey, serialized);
    const verification = localStorage.getItem(storageKey);
    if (verification !== serialized) throw new Error('A gravação não pôde ser confirmada.');
    state = next;
    lastError = '';
    for (const listener of listeners) listener(state);
    return true;
  } catch (error) {
    state = previous;
    lastError = error?.name === 'QuotaExceededError'
      ? 'O armazenamento deste navegador está cheio. Exporte ou remova alguns dados antes de continuar.'
      : (error?.message || 'Falha ao salvar neste navegador.');
    for (const listener of listeners) listener(state, lastError);
    return false;
  }
}

export function ensureBoard(data, campaignId) {
  if (!data.boards[campaignId]) data.boards[campaignId] = { campaignId, cards: [], paths: [], links: [], updatedAt: new Date().toISOString() };
  return data.boards[campaignId];
}

export function exportArchive() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importArchive(json) {
  const raw = JSON.parse(json);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.campaigns) || !Array.isArray(raw.characters) || !Array.isArray(raw.sessions) || !raw.boards || typeof raw.boards !== 'object' || Array.isArray(raw.boards)) {
    throw new Error('O arquivo não contém uma estrutura reconhecida.');
  }
  const parsed = normalize(raw);
  return commit(next => {
    next.campaigns = parsed.campaigns;
    next.characters = parsed.characters;
    next.sessions = parsed.sessions;
    next.boards = parsed.boards;
  });
}
