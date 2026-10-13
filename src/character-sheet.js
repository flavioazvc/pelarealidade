import { INVENTORY_CATEGORIES, readCharacterAbilities, readCharacterInventory, readCharacterDescription, readCharacterRituals } from './character-data.js?v=2';

const ATTRIBUTES = [
  // Posições percentuais especificadas para os números sobre a arte 720×720.
  { name: 'Agilidade', x: 50.6, y: 17.37 },
  { name: 'Força', x: 19.38, y: 39.49 },
  { name: 'Intelecto', x: 81.9, y: 39.46 },
  { name: 'Presença', x: 29.5, y: 76.38 },
  { name: 'Vigor', x: 70.8, y: 76.36 },
];

const TABS = [
  { id: 'geral', label: 'GERAL', icon: '01' },
  { id: 'pericias', label: 'PERÍCIAS', icon: '02' },
  { id: 'habilidades', label: 'HABILIDADES', icon: '03' },
  { id: 'inventario', label: 'INVENTÁRIO', icon: '04' },
  { id: 'rituais', label: 'RITUAIS', icon: '05' },
  { id: 'descricao', label: 'DESCRIÇÃO', icon: '06' },
];

const SKILL_TRAINING_PREFIX = 'pr-skill-training:v1:';
const SKILL_TRAINING_LEVELS = [0, 5, 10, 15];
const SKILLS = [
  { name: 'Acrobacia', attribute: 'AGI' },
  { name: 'Adestramento', attribute: 'PRE' },
  { name: 'Artes', attribute: 'PRE' },
  { name: 'Atletismo', attribute: 'AGI' },
  { name: 'Atualidades', attribute: 'INT' },
  { name: 'Ciências', attribute: 'INT' },
  { name: 'Crime', attribute: 'AGI' },
  { name: 'Diplomacia', attribute: 'PRE' },
  { name: 'Enganação', attribute: 'PRE' },
  { name: 'Fortitude', attribute: 'VIG' },
  { name: 'Furtividade', attribute: 'AGI' },
  { name: 'Iniciativa', attribute: 'AGI' },
  { name: 'Intimidação', attribute: 'PRE' },
  { name: 'Intuição', attribute: 'PRE' },
  { name: 'Investigação', attribute: 'INT' },
  { name: 'Luta', attribute: 'FOR' },
  { name: 'Medicina', attribute: 'INT' },
  { name: 'Ocultismo', attribute: 'INT' },
  { name: 'Percepção', attribute: 'PRE' },
  { name: 'Pilotagem', attribute: 'AGI' },
  { name: 'Pontaria', attribute: 'AGI' },
  { name: 'Profissão', attribute: 'INT' },
  { name: 'Reflexos', attribute: 'AGI' },
  { name: 'Religião', attribute: 'PRE' },
  { name: 'Sobrevivência', attribute: 'INT' },
  { name: 'Tática', attribute: 'INT' },
  { name: 'Tecnologia', attribute: 'INT' },
  { name: 'Vontade', attribute: 'PRE' },
];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function safeImage(value) {
  if (!String(value ?? '').trim()) return '';
  try {
    const url = new URL(value, location.href);
    return ['http:', 'https:'].includes(url.protocol) ? esc(url.href) : '';
  } catch {
    return '';
  }
}

function initials(value) {
  return String(value || 'PR').trim().split(/\s+/).slice(0, 2)
    .map(part => part.charAt(0)).join('').toLocaleUpperCase('pt-BR') || 'PR';
}

/** Lê valores antigos como "12" ou "12/20" sem apagar texto legado não numérico. */
export function getCharacterResource(character, key) {
  const raw = String(character?.[key] ?? '').trim();
  const match = raw.match(/^(\d+)(?:\s*(?:\/|de)\s*(\d+))?$/i);
  if (!match) return { raw, current: null, max: null, configured: false };

  const current = Math.max(0, Number(match[1]));
  const maxText = String(character?.[`${key}Max`] ?? '').trim();
  const maxFromField = maxText === '' ? null : Number(maxText);
  const maxFromLegacy = match[2] === undefined ? null : Number(match[2]);
  const chosenMax = Number.isFinite(maxFromField) && maxFromField >= 0
    ? maxFromField
    : Number.isFinite(maxFromLegacy) && maxFromLegacy >= 0
      ? maxFromLegacy
      : current;
  const max = Math.max(current, chosenMax);

  return { raw, current, max, configured: max > 0 };
}

export function getCharacterResourceFormValues(character, key) {
  const resource = getCharacterResource(character, key);
  if (resource.current === null) {
    return {
      current: resource.raw,
      max: String(character?.[`${key}Max`] ?? ''),
    };
  }
  return {
    current: String(resource.current),
    max: String(character?.[`${key}Max`] ?? '') || (resource.max > 0 ? String(resource.max) : ''),
  };
}

function attributeMap(character) {
  const values = character.attributes || {};
  return `<section class="sheet-attributes" aria-labelledby="sheet-attributes-title">
    <div class="sheet-section-heading"><h2 id="sheet-attributes-title">Atributos</h2></div>
    <div class="attribute-art" role="group" aria-label="Atributos do personagem">
      <img class="attribute-reference-art" src="./assets/atributos.png" alt="" aria-hidden="true">
      ${ATTRIBUTES.map(attribute => {
        const value = values[attribute.name] || '—';
        return `<span class="attribute-value-overlay" style="--attribute-x:${attribute.x}%;--attribute-y:${attribute.y}%" aria-hidden="true">${esc(value)}</span>`;
      }).join('')}
    </div>
    <ul class="sheet-attributes-accessible" aria-label="Valores dos atributos">
      ${ATTRIBUTES.map(attribute => `<li>${attribute.name}: ${esc(values[attribute.name] || 'não definido')}</li>`).join('')}
    </ul>
  </section>`;
}

function resourceBar(character, key, label, abbreviation, tone, canEdit) {
  const resource = getCharacterResource(character, key);
  const current = resource.current ?? 0;
  const max = resource.max ?? 0;
  const percent = resource.configured ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const valueText = resource.current === null
    ? esc(resource.raw || 'A definir')
    : `${current} <span aria-hidden="true">/</span> ${max || '—'}`;
  const disabled = !resource.configured;
  const isDegrading = resource.configured && percent < 50;
  const title = `${label} (${abbreviation})`;

  return `<article class="sheet-resource resource-${tone}${isDegrading ? ' is-degrading' : ''}" aria-label="${title}">
    <div class="sheet-resource-heading"><span>${label}</span><small>${abbreviation}</small></div>
    <div class="sheet-resource-bar" style="--resource-progress:${percent}%" role="group" aria-label="${title}: ${resource.current ?? 'não definido'} de ${max || 'sem limite'}">
      <span class="sheet-resource-fill" aria-hidden="true"></span>
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="-5" aria-label="Reduzir ${label} em 5" ${disabled || !canEdit || current <= 0 ? 'disabled' : ''}>«</button>
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="-1" aria-label="Reduzir ${label} em 1" ${disabled || !canEdit || current <= 0 ? 'disabled' : ''}>‹</button>
      <strong class="sheet-resource-value">${valueText}</strong>
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="1" aria-label="Aumentar ${label} em 1" ${disabled || !canEdit || current >= max ? 'disabled' : ''}>›</button>
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="5" aria-label="Aumentar ${label} em 5" ${disabled || !canEdit || current >= max ? 'disabled' : ''}>»</button>
    </div>
    ${disabled ? '<small class="sheet-resource-note">Defina o valor atual e o limite em “Editar ficha”.</small>' : ''}
  </article>`;
}

function textTab(title, _kicker, value, emptyMessage, className = '') {
  return `<section class="sheet-content-card sheet-text-card ${className}"><h2>${title}</h2>
    <div class="sheet-longtext">${value ? esc(value) : `<span class="sheet-empty-copy">${emptyMessage}</span>`}</div>
  </section>`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightRuleText(value, character) {
  const source = String(value ?? '');
  if (!source) return '';
  const terms = [
    'Sanidade(?:s)?', 'SAN', 'PV(?:s)?', 'PE(?:s)?',
    ...SKILLS.map(skill => escapeRegex(skill.name)),
  ].sort((left, right) => right.length - left.length);
  const expression = new RegExp(`(^|[^\\p{L}\\p{N}_])(${terms.join('|')})(?=$|[^\\p{L}\\p{N}_])`, 'giu');
  const training = parseSkillTraining(character?.skills);
  let result = '';
  let cursor = 0;
  let match;
  while ((match = expression.exec(source)) !== null) {
    const separator = match[1] || '';
    const term = match[2];
    result += esc(source.slice(cursor, match.index)) + esc(separator);
    const skill = SKILLS.find(item => item.name.toLocaleLowerCase('pt-BR') === term.toLocaleLowerCase('pt-BR'));
    const modifier = skill
      ? `skill-${skillTrainingValue(training, skill.name)}`
      : /^pv/i.test(term) ? 'pv' : /^pe/i.test(term) ? 'pe' : 'san';
    result += `<strong class="rule-text-highlight rule-text-highlight--${modifier}">${esc(term)}</strong>`;
    cursor = match.index + match[0].length;
  }
  return result + esc(source.slice(cursor));
}

function abilityCard(character, item, canEdit, legacy = false) {
  const itemId = legacy ? '__legacy__' : item.id;
  const description = String(item.description ?? '');
  const editButton = canEdit ? `<div class="ability-card-actions">
      <button class="button button-sm" type="button" data-action="edit-ability" data-id="${esc(character.id)}" data-item="${esc(itemId)}">Editar</button>
    </div>` : '';
  return `<details class="ability-card">
    <summary class="ability-card-summary"><span>${esc(item.name || 'Habilidade sem nome')}</span></summary>
    <div class="ability-card-body"><div class="rule-text">${description ? highlightRuleText(description, character) : '<span class="sheet-empty-copy">Sem descrição cadastrada.</span>'}</div>${editButton}</div>
  </details>`;
}

function abilitiesTab(character, canEdit) {
  const data = readCharacterAbilities(character);
  const items = data.items.map(item => abilityCard(character, item, canEdit));
  if (data.legacy.trim()) items.unshift(abilityCard(character, { id: '__legacy__', name: 'Habilidades anteriores', description: data.legacy }, canEdit, true));
  return `<section class="sheet-content-card abilities-panel" aria-labelledby="sheet-abilities-title">
    <div class="sheet-panel-heading"><h2 id="sheet-abilities-title">Habilidades</h2>${canEdit ? `<button class="button button-sm" type="button" data-action="add-ability" data-id="${esc(character.id)}">＋ Nova habilidade</button>` : ''}</div>
    <div class="ability-list">${items.length ? items.join('') : '<p class="sheet-empty-copy">Nenhuma habilidade cadastrada.</p>'}</div>
  </section>`;
}

function inventoryItemCard(character, item, canEdit, legacy = false) {
  const itemId = legacy ? '__legacy__' : item.id;
  const badges = legacy
    ? '<span class="inventory-item-tag inventory-item-tag--legacy">Dados anteriores</span>'
    : `<span class="inventory-item-tag">Categoria ${esc(item.category)}</span><span class="inventory-item-tag">${item.spaces} ${item.spaces === 1 ? 'espaço' : 'espaços'}</span>`;
  const editButton = canEdit ? `<div class="inventory-item-actions">
      <button class="button button-sm" type="button" data-action="edit-inventory-item" data-id="${esc(character.id)}" data-item="${esc(itemId)}">Editar</button>
    </div>` : '';
  const description = String(item.description ?? '');
  return `<details class="inventory-item-card${legacy ? ' inventory-item-card--legacy' : ''}">
    <summary class="inventory-item-summary"><span class="inventory-item-name">${esc(item.name || 'Item sem nome')}</span><span class="inventory-item-tags">${badges}</span><span class="ability-expand-hint">Detalhes</span></summary>
    <div class="inventory-item-body"><div class="rule-text">${description ? highlightRuleText(description, character) : '<span class="sheet-empty-copy">Sem descrição cadastrada.</span>'}</div>${editButton}</div>
  </details>`;
}

function categoryCounter(category, count, limit, canEdit) {
  const over = limit !== null && count > limit;
  const limitValue = limit === null ? '' : String(limit);
  return `<label class="inventory-category-counter${over ? ' is-over-limit' : ''}">
    <span class="inventory-category-label">Categoria ${esc(category)}</span>
    <strong class="inventory-category-count">${count}</strong>
    <span class="inventory-category-limit">itens · limite
      <input type="number" name="limit_${esc(category)}" min="0" step="1" value="${esc(limitValue)}" placeholder="∞" aria-label="Limite de itens da categoria ${esc(category)}" ${canEdit ? '' : 'disabled'}>
    </span>
  </label>`;
}

function inventoryTab(character, canEdit) {
  const data = readCharacterInventory(character);
  const counts = Object.fromEntries(INVENTORY_CATEGORIES.map(category => [category, data.items.filter(item => item.category === category).length]));
  const usedSpaces = data.items.reduce((sum, item) => sum + item.spaces, 0);
  const rawStrength = String(character.attributes?.Força ?? '').trim().replace(',', '.');
  const strength = rawStrength === '' ? NaN : Number(rawStrength);
  const spaceLimit = Number.isFinite(strength) && strength >= 0 ? strength * 5 : null;
  const spacesOver = spaceLimit !== null && usedSpaces > spaceLimit;
  const formattedLimit = spaceLimit === null ? '—' : Number.isInteger(spaceLimit) ? String(spaceLimit) : spaceLimit.toFixed(1);
  const entries = data.items.map(item => inventoryItemCard(character, item, canEdit));
  if (data.legacy.trim()) entries.unshift(inventoryItemCard(character, { id: '__legacy__', name: 'Inventário anterior', description: data.legacy }, canEdit, true));

  return `<section class="sheet-content-card inventory-panel" aria-labelledby="sheet-inventory-title">
    <div class="sheet-panel-heading"><h2 id="sheet-inventory-title">Inventário</h2>${canEdit ? `<button class="button button-sm" type="button" data-action="add-inventory-item" data-id="${esc(character.id)}">＋ Novo item</button>` : ''}</div>
    <form id="inventory-limits-form" class="inventory-summary" data-id="${esc(character.id)}">
      <div class="inventory-category-grid">${['I', 'II', 'III', 'IV'].map(category => categoryCounter(category, counts[category], data.limits[category], canEdit)).join('')}</div>
      <div class="inventory-summary-footer">
        <label class="inventory-category-zero${data.limits['0'] !== null && counts['0'] > data.limits['0'] ? ' is-over-limit' : ''}">
          <span>Categoria 0</span><strong>${counts['0']}</strong><small>itens</small>
          <span class="inventory-category-limit">limite <input type="number" name="limit_0" min="0" step="1" value="${data.limits['0'] === null ? '' : data.limits['0']}" placeholder="∞" aria-label="Limite de itens da categoria 0" ${canEdit ? '' : 'disabled'}></span>
        </label>
        <div class="inventory-space-meter${spacesOver ? ' is-over-limit' : ''}" aria-live="polite">
          <span>ESPAÇOS UTILIZADOS</span><strong>${usedSpaces} / ${formattedLimit}</strong><small>${spaceLimit === null ? 'Defina FOR na aba Geral para calcular o limite.' : 'Limite: Força × 5'}</small>
        </div>
        ${canEdit ? '<button class="button button-sm" type="submit">Salvar limites</button>' : ''}
      </div>
    </form>
    <div class="inventory-items">${entries.length ? entries.join('') : '<p class="sheet-empty-copy">Nenhum item cadastrado.</p>'}</div>
  </section>`;
}

function descriptionTab(character, canEdit) {
  const description = readCharacterDescription(character);
  const sections = [
    ['Aparência', description.appearance],
    ['Personalidade', description.personality],
    ['História', description.history],
  ];
  return `<section class="sheet-content-card description-panel" aria-labelledby="sheet-description-title">
    <div class="sheet-panel-heading"><h2 id="sheet-description-title">Descrição</h2>${canEdit ? `<button class="button button-sm" type="button" data-action="edit-character-description" data-id="${esc(character.id)}">Editar descrição</button>` : ''}</div>
    <div class="description-field-grid">${sections.map(([title, value]) => `<article class="description-field"><h3>${title}</h3><div class="sheet-longtext">${value ? esc(value) : '<span class="sheet-empty-copy">Ainda não descrita.</span>'}</div></article>`).join('')}</div>
  </section>`;
}

function parseSkillTraining(raw) {
  const source = String(raw ?? '');
  if (!source.startsWith(SKILL_TRAINING_PREFIX)) return { bonuses: {}, legacy: source.slice(0, 10000) };
  try {
    const stored = JSON.parse(source.slice(SKILL_TRAINING_PREFIX.length));
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Dados de perícia inválidos.');
    const rawBonuses = stored.bonuses && typeof stored.bonuses === 'object' && !Array.isArray(stored.bonuses)
      ? stored.bonuses
      : {};
    const bonuses = {};
    for (const skill of SKILLS) {
      const value = Number(rawBonuses[skill.name]);
      if (SKILL_TRAINING_LEVELS.includes(value)) bonuses[skill.name] = value;
    }
    return { bonuses, legacy: typeof stored.legacy === 'string' ? stored.legacy.slice(0, 10000) : '' };
  } catch {
    return { bonuses: {}, legacy: source.slice(0, 10000) };
  }
}

function skillTrainingValue(training, name) {
  const value = Number(training.bonuses[name]);
  return SKILL_TRAINING_LEVELS.includes(value) ? value : 0;
}

export function cycleSkillTraining(character, skillName) {
  if (!SKILLS.some(skill => skill.name === skillName)) return null;
  const training = parseSkillTraining(character?.skills);
  const current = skillTrainingValue(training, skillName);
  const next = SKILL_TRAINING_LEVELS[(SKILL_TRAINING_LEVELS.indexOf(current) + 1) % SKILL_TRAINING_LEVELS.length];
  return `${SKILL_TRAINING_PREFIX}${JSON.stringify({
    bonuses: { ...training.bonuses, [skillName]: next },
    legacy: training.legacy.slice(0, 10000),
  })}`;
}

function skillTab(character, canEdit) {
  const training = parseSkillTraining(character.skills);
  return `<section class="sheet-content-card skills-panel" aria-labelledby="sheet-skills-title">
    <div class="skills-panel-heading">
      <div><h2 id="sheet-skills-title">Perícias</h2></div>
      <p>Clique no bônus para alternar entre + 0, + 5, + 10 e + 15.</p>
    </div>
    <div class="skill-grid" role="list">
      ${SKILLS.map(skill => {
        const bonus = skillTrainingValue(training, skill.name);
        const next = SKILL_TRAINING_LEVELS[(SKILL_TRAINING_LEVELS.indexOf(bonus) + 1) % SKILL_TRAINING_LEVELS.length];
        const label = canEdit
          ? `${skill.name}: treino + ${bonus}. Clique para alterar para + ${next}.`
          : `${skill.name}: treino + ${bonus}.`;
        return `<article class="skill-card skill-card--${bonus}" role="listitem">
          <div class="skill-card-copy"><span class="skill-name">${esc(skill.name)}</span><small class="skill-attribute" aria-label="Atributo base ${skill.attribute}">${skill.attribute}</small></div>
          <button class="skill-bonus" type="button" data-action="cycle-skill-training" data-id="${esc(character.id)}" data-skill="${esc(skill.name)}" aria-label="${esc(label)}" title="Bônus de treino" ${canEdit ? '' : 'disabled'}>+ ${bonus}</button>
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

function ritualCard(character, ritual, canEdit, legacy = false) {
  const itemId = legacy ? '__legacy__' : ritual.id;
  const image = safeImage(ritual.image);
  const imageMarkup = image
    ? `<img class="ritual-art" src="${image}" alt="Imagem do ritual ${esc(ritual.name || 'sem nome')}" loading="lazy">`
    : `<div class="ritual-art ritual-art--empty" aria-hidden="true"><span>✧</span></div>`;
  const label = legacy ? 'Rituais anteriores' : ritual.name || 'Ritual sem nome';
  const edit = canEdit && !legacy ? `<button class="button button-sm" type="button" data-action="edit-ritual" data-id="${esc(character.id)}" data-item="${esc(itemId)}">Editar</button>` : '';
  const remove = canEdit && !legacy ? `<button class="button button-sm button-danger" type="button" data-action="delete-ritual" data-id="${esc(character.id)}" data-item="${esc(itemId)}">Remover</button>` : '';
  const facts = legacy ? '' : `<div class="ritual-facts">
      <p><strong>Execução:</strong> ${esc(ritual.execution)}</p><p><strong>Alcance:</strong> ${esc(ritual.range)}</p>
      <p><strong>Alvo:</strong> ${esc(ritual.target)}</p><p><strong>Duração:</strong> ${esc(ritual.duration)}</p>
      <p><strong>Resistência:</strong> ${esc(ritual.resistance)}</p>
    </div>`;
  const description = ritual.description;
  const variants = legacy ? '' : [
    ['Discente', ritual.discenteCost, ritual.discente],
    ['Verdadeiro', ritual.trueCost, ritual.trueEffect],
  ].filter(([, , effect]) => String(effect || '').trim()).map(([name, cost, effect]) =>
    `<section class="ritual-variant"><h4>${name}${cost ? ` <span>(+${esc(cost)} PE)</span>` : ''}</h4><div class="rule-text">${highlightRuleText(effect, character)}</div></section>`
  ).join('');
  return `<details class="ritual-card${legacy ? ' ritual-card--legacy' : ''}">
    <summary class="ritual-card-summary"><span class="ritual-summary-title">${esc(label)}</span>${legacy ? '<span class="ritual-element-badge ritual-element-badge--legacy">ANTIGO</span>' : `<span class="ritual-element-badge ritual-element-badge--${esc(ritual.element.toLocaleLowerCase('pt-BR'))}">${esc(ritual.element.toLocaleUpperCase('pt-BR'))} · ${esc(ritual.circle)}</span>`}<span class="ritual-expand-hint" aria-hidden="true">⌄</span></summary>
    <div class="ritual-card-body"><div class="ritual-card-layout"><div class="ritual-card-copy">${facts}${description ? `<div class="rule-text ritual-description">${highlightRuleText(description, character)}</div>` : '<p class="sheet-empty-copy">Sem efeito base registrado.</p>'}${variants}</div><div class="ritual-card-image-wrap">${imageMarkup}</div></div>
      ${legacy && canEdit ? `<div class="ritual-card-actions"><button class="button button-sm" type="button" data-action="convert-legacy-ritual" data-id="${esc(character.id)}">Converter em ritual</button></div>` : ''}
      ${canEdit && !legacy ? `<div class="ritual-card-actions">${remove}${edit}</div>` : ''}
    </div>
  </details>`;
}

function ritualsTab(character, canEdit) {
  const data = readCharacterRituals(character);
  const entries = data.items.map(item => ritualCard(character, item, canEdit));
  if (data.legacy.trim()) entries.unshift(ritualCard(character, { name: 'Rituais anteriores', description: data.legacy }, canEdit, true));
  return `<section class="sheet-content-card rituals-panel" aria-labelledby="sheet-rituals-title">
    <div class="sheet-panel-heading"><h2 id="sheet-rituals-title">Rituais</h2>${canEdit ? `<button class="button button-sm" type="button" data-action="add-ritual" data-id="${esc(character.id)}">＋ Novo ritual</button>` : ''}</div>
    <div class="ritual-list">${entries.length ? entries.join('') : '<p class="sheet-empty-copy">Nenhum ritual cadastrado.</p>'}</div>
  </section>`;
}

function tabContent(character, tab, canEdit) {
  if (tab === 'geral') return '';
  if (tab === 'pericias') return skillTab(character, canEdit);
  if (tab === 'habilidades') return abilitiesTab(character, canEdit);
  if (tab === 'inventario') return inventoryTab(character, canEdit);
  if (tab === 'rituais') return ritualsTab(character, canEdit);
  if (tab === 'descricao') return descriptionTab(character, canEdit);
  return '';
}

export function renderCharacterSheet(character, _linkedCampaigns = [], activeTab = 'geral', canEdit = true, playerView = false) {
  const selectedTab = TABS.some(tab => tab.id === activeTab) ? activeTab : 'geral';
  const name = esc(character.name || 'Personagem sem nome');
  const image = safeImage(character.portrait);
  const portrait = image
    ? `<img class="sheet-portrait" src="${image}" alt="Retrato de ${name}" loading="lazy">`
    : `<div class="sheet-portrait portrait-placeholder" role="img" aria-label="Sem retrato para ${name}"><span>${initials(character.name)}</span></div>`;
  const metadata = [
    ['CLASSE', character.className || 'Não definida'],
    ['TRILHA', character.path || 'Não definida'],
    ['NEX', character.nex || '—'],
  ];

  const overview = `<div class="character-sheet-overview">
      ${attributeMap(character)}
      <section class="sheet-profile" aria-label="Identificação e recursos do personagem">
        <div class="sheet-identity">
          ${portrait}
          <div class="sheet-identity-copy">
            <h1 class="sheet-character-name">${name}</h1>
            <div class="sheet-identity-meta">${metadata.map(([label, value]) => `<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
          </div>
        </div>
        <div class="sheet-resources" aria-label="Pontos atuais e limites">
          ${resourceBar(character, 'pv', 'VIDA', 'PV', 'life', canEdit)}
          ${resourceBar(character, 'san', 'SANIDADE', 'SAN', 'sanity', canEdit)}
          ${resourceBar(character, 'pe', 'ESFORÇO', 'PE', 'energy', canEdit)}
        </div>
      </section>
    </div>`;
  const selectedContent = selectedTab === 'geral' ? overview : tabContent(character, selectedTab, canEdit);

  return `<section class="page character-sheet-page${playerView ? ' player-sheet' : ''}">
    ${playerView ? '' : `<div class="sheet-toolbar">
      <a class="sheet-back-link" href="#/personagens"><span aria-hidden="true">←</span> TODAS AS FICHAS</a>
      <div class="sheet-toolbar-actions">
        <button class="button button-sm" data-action="edit-character" data-id="${esc(character.id)}">Editar ficha</button>
        <button class="button button-sm button-danger" data-action="delete-character" data-id="${esc(character.id)}">Excluir</button>
      </div>
    </div>`}

    <nav class="character-sheet-tabs" aria-label="Seções da ficha">
      ${TABS.map(tab => `<a href="#/personagem/${encodeURIComponent(character.id)}/${tab.id}" class="character-sheet-tab ${selectedTab === tab.id ? 'active' : ''}" ${selectedTab === tab.id ? 'aria-current="page"' : ''}>
        <span aria-hidden="true">${tab.icon}</span>${tab.label}
      </a>`).join('')}
    </nav>
    <div class="character-sheet-tab-content" id="character-sheet-content">${selectedContent}</div>
  </section>`;
}
