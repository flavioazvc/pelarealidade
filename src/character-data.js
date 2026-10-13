const ABILITIES_DATA_PREFIX = 'pr-abilities:v1:';
const INVENTORY_DATA_PREFIX = 'pr-inventory:v1:';
const DESCRIPTION_DATA_PREFIX = 'pr-description:v1:';
const MAX_STRUCTURED_FIELD_CHARS = 1_800_000;

export const INVENTORY_CATEGORIES = Object.freeze(['0', 'I', 'II', 'III', 'IV']);

function assertFieldSize(value) {
  if (value.length > MAX_STRUCTURED_FIELD_CHARS) {
    throw new RangeError('Este campo ultrapassa o limite seguro de 1,8 MB. Reduza o texto ou divida os itens antes de salvar.');
  }
  return value;
}

function readEnvelope(raw, prefix, defaults) {
  const source = String(raw ?? '');
  if (!source.startsWith(prefix)) return { ...defaults(), legacy: source.slice(0, 20000) };
  try {
    const stored = JSON.parse(source.slice(prefix.length));
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Dados estruturados inválidos.');
    return {
      ...defaults(),
      ...stored,
      legacy: typeof stored.legacy === 'string' ? stored.legacy.slice(0, 20000) : '',
    };
  } catch {
    return { ...defaults(), legacy: source.slice(0, 20000) };
  }
}

function normalizeAbilities(items) {
  return (Array.isArray(items) ? items : [])
    .slice(0, 200)
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => ({
      id: String(item.id || `ability-${index + 1}`).slice(0, 128),
      name: String(item.name ?? '').slice(0, 120),
      description: String(item.description ?? '').slice(0, 20000),
    }));
}

export function readCharacterAbilities(character) {
  const stored = readEnvelope(character?.abilities, ABILITIES_DATA_PREFIX, () => ({ items: [] }));
  return {
    items: normalizeAbilities(stored.items),
    legacy: String(stored.legacy ?? '').slice(0, 20000),
  };
}

export function serializeCharacterAbilities(data) {
  return assertFieldSize(`${ABILITIES_DATA_PREFIX}${JSON.stringify({
    items: normalizeAbilities(data?.items),
    legacy: String(data?.legacy ?? '').slice(0, 20000),
  })}`);
}

function normalizeInventoryItems(items) {
  return (Array.isArray(items) ? items : [])
    .slice(0, 500)
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => {
      const category = String(item.category ?? '0').toUpperCase();
      const spaces = Number(item.spaces);
      return {
        id: String(item.id || `inventory-${index + 1}`).slice(0, 128),
        name: String(item.name ?? '').slice(0, 120),
        category: INVENTORY_CATEGORIES.includes(category) ? category : '0',
        spaces: Number.isFinite(spaces) && spaces >= 0 ? Math.round(spaces) : 0,
        description: String(item.description ?? '').slice(0, 20000),
      };
    });
}

function normalizeInventoryLimits(limits) {
  return Object.fromEntries(INVENTORY_CATEGORIES.map(category => {
    const value = limits?.[category];
    if (value === null || value === undefined || value === '') return [category, null];
    const number = Number(value);
    return [category, Number.isInteger(number) && number >= 0 ? number : null];
  }));
}

export function readCharacterInventory(character) {
  const stored = readEnvelope(character?.inventory, INVENTORY_DATA_PREFIX, () => ({ items: [], limits: {} }));
  return {
    items: normalizeInventoryItems(stored.items),
    limits: normalizeInventoryLimits(stored.limits),
    legacy: String(stored.legacy ?? '').slice(0, 20000),
  };
}

export function serializeCharacterInventory(data) {
  return assertFieldSize(`${INVENTORY_DATA_PREFIX}${JSON.stringify({
    items: normalizeInventoryItems(data?.items),
    limits: normalizeInventoryLimits(data?.limits),
    legacy: String(data?.legacy ?? '').slice(0, 20000),
  })}`);
}

export function readCharacterDescription(character) {
  const source = String(character?.description ?? '');
  if (!source.startsWith(DESCRIPTION_DATA_PREFIX)) {
    return { appearance: '', personality: '', history: source.slice(0, 20000) };
  }
  const stored = readEnvelope(source, DESCRIPTION_DATA_PREFIX, () => ({ appearance: '', personality: '', history: '' }));
  return {
    appearance: String(stored.appearance ?? '').slice(0, 20000),
    personality: String(stored.personality ?? '').slice(0, 20000),
    history: String(stored.history || stored.legacy || '').slice(0, 20000),
  };
}

export function serializeCharacterDescription(data) {
  return assertFieldSize(`${DESCRIPTION_DATA_PREFIX}${JSON.stringify({
    appearance: String(data?.appearance ?? '').slice(0, 20000),
    personality: String(data?.personality ?? '').slice(0, 20000),
    history: String(data?.history ?? '').slice(0, 20000),
  })}`);
}
