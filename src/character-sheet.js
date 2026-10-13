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

function resourceBar(character, key, label, abbreviation, tone) {
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
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="-5" aria-label="Reduzir ${label} em 5" ${disabled || current <= 0 ? 'disabled' : ''}>«</button>
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="-1" aria-label="Reduzir ${label} em 1" ${disabled || current <= 0 ? 'disabled' : ''}>‹</button>
      <strong class="sheet-resource-value">${valueText}</strong>
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="1" aria-label="Aumentar ${label} em 1" ${disabled || current >= max ? 'disabled' : ''}>›</button>
      <button class="resource-arrow" type="button" data-action="adjust-resource" data-id="${esc(character.id)}" data-resource="${key}" data-delta="5" aria-label="Aumentar ${label} em 5" ${disabled || current >= max ? 'disabled' : ''}>»</button>
    </div>
    ${disabled ? '<small class="sheet-resource-note">Defina o valor atual e o limite em “Editar ficha”.</small>' : ''}
  </article>`;
}

function textTab(title, kicker, value, emptyMessage, className = '') {
  return `<section class="sheet-content-card sheet-text-card ${className}"><span class="sheet-kicker">${kicker}</span><h2>${title}</h2>
    <div class="sheet-longtext">${value ? esc(value) : `<span class="sheet-empty-copy">${emptyMessage}</span>`}</div>
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
      <div><span class="sheet-kicker">TREINAMENTO</span><h2 id="sheet-skills-title">Perícias</h2></div>
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

function tabContent(character, tab, canEdit) {
  if (tab === 'geral') return '';
  if (tab === 'pericias') return skillTab(character, canEdit);
  if (tab === 'habilidades') return textTab('Habilidades', 'RECURSOS DO PERSONAGEM', character.abilities, 'Nenhuma habilidade registrada.');
  if (tab === 'inventario') return textTab('Inventário', 'EQUIPAMENTOS', character.inventory, 'O inventário está vazio.');
  if (tab === 'rituais') return textTab('Rituais', 'CONHECIMENTO PARANORMAL', character.rituals, 'Nenhum ritual registrado.');
  if (tab === 'descricao') return `<div class="sheet-description-stack">
    ${textTab('Descrição do personagem', 'HISTÓRIA E APARÊNCIA', character.description, 'Nenhuma descrição registrada.')}
    ${textTab('Anotações da mesa', 'NOTAS', character.notes, 'Nenhuma anotação registrada.')}
  </div>`;
  return '';
}

export function renderCharacterSheet(character, _linkedCampaigns = [], activeTab = 'geral', canEdit = true) {
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
          ${resourceBar(character, 'pv', 'VIDA', 'PV', 'life')}
          ${resourceBar(character, 'san', 'SANIDADE', 'SAN', 'sanity')}
          ${resourceBar(character, 'pe', 'ESFORÇO', 'PE', 'energy')}
        </div>
      </section>
    </div>`;
  const selectedContent = selectedTab === 'geral' ? overview : tabContent(character, selectedTab, canEdit);

  return `<section class="page character-sheet-page">
    <div class="sheet-toolbar">
      <a class="sheet-back-link" href="#/personagens"><span aria-hidden="true">←</span> TODAS AS FICHAS</a>
      <div class="sheet-toolbar-actions">
        <button class="button button-sm" data-action="edit-character" data-id="${esc(character.id)}">Editar ficha</button>
        <button class="button button-sm button-danger" data-action="delete-character" data-id="${esc(character.id)}">Excluir</button>
      </div>
    </div>

    <nav class="character-sheet-tabs" aria-label="Seções da ficha">
      ${TABS.map(tab => `<a href="#/personagem/${encodeURIComponent(character.id)}/${tab.id}" class="character-sheet-tab ${selectedTab === tab.id ? 'active' : ''}" ${selectedTab === tab.id ? 'aria-current="page"' : ''}>
        <span aria-hidden="true">${tab.icon}</span>${tab.label}
      </a>`).join('')}
    </nav>
    <div class="character-sheet-tab-content" id="character-sheet-content">${selectedContent}</div>
  </section>`;
}
