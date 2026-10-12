const ATTRIBUTES = [
  { name: 'Agilidade', short: 'AGI', x: 55.3, y: 17.0 },
  { name: 'Força', short: 'FOR', x: 26.2, y: 38.5 },
  { name: 'Intelecto', short: 'INT', x: 84.3, y: 38.5 },
  { name: 'Presença', short: 'PRE', x: 35.1, y: 74.5 },
  { name: 'Vigor', short: 'VIG', x: 76.0, y: 74.1 },
];

const TABS = [
  { id: 'geral', label: 'GERAL', icon: '01' },
  { id: 'pericias', label: 'PERÍCIAS', icon: '02' },
  { id: 'habilidades', label: 'HABILIDADES', icon: '03' },
  { id: 'inventario', label: 'INVENTÁRIO', icon: '04' },
  { id: 'rituais', label: 'RITUAIS', icon: '05' },
  { id: 'descricao', label: 'DESCRIÇÃO', icon: '06' },
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
    <div class="sheet-section-heading"><span class="sheet-kicker">CAPACIDADES</span><h2 id="sheet-attributes-title">Atributos</h2></div>
    <div class="attribute-art" role="group" aria-label="Atributos do personagem">
      <img class="attribute-reference-art" src="./assets/attributes-reference.png" alt="" aria-hidden="true">
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
  const title = `${label} (${abbreviation})`;

  return `<article class="sheet-resource resource-${tone}" aria-label="${title}">
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

function tabContent(character, tab) {
  if (tab === 'geral') return '';
  if (tab === 'pericias') return textTab('Perícias', 'TREINAMENTO', character.skills, 'Nenhuma perícia registrada.');
  if (tab === 'habilidades') return textTab('Habilidades', 'RECURSOS DO PERSONAGEM', character.abilities, 'Nenhuma habilidade registrada.');
  if (tab === 'inventario') return textTab('Inventário', 'EQUIPAMENTOS', character.inventory, 'O inventário está vazio.');
  if (tab === 'rituais') return textTab('Rituais', 'CONHECIMENTO PARANORMAL', character.rituals, 'Nenhum ritual registrado.');
  if (tab === 'descricao') return `<div class="sheet-description-stack">
    ${textTab('Descrição do personagem', 'HISTÓRIA E APARÊNCIA', character.description, 'Nenhuma descrição registrada.')}
    ${textTab('Anotações da mesa', 'NOTAS', character.notes, 'Nenhuma anotação registrada.')}
  </div>`;
  return '';
}

export function renderCharacterSheet(character, _linkedCampaigns = [], activeTab = 'geral') {
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

  return `<section class="page character-sheet-page">
    <div class="sheet-toolbar">
      <a class="sheet-back-link" href="#/personagens"><span aria-hidden="true">←</span> TODAS AS FICHAS</a>
      <div class="sheet-toolbar-actions">
        <button class="button button-sm" data-action="edit-character" data-id="${esc(character.id)}">Editar ficha</button>
        <button class="button button-sm button-danger" data-action="delete-character" data-id="${esc(character.id)}">Excluir</button>
      </div>
    </div>

    <div class="character-sheet-overview">
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
    </div>

    <nav class="character-sheet-tabs" aria-label="Seções da ficha">
      ${TABS.map(tab => `<a href="#/personagem/${encodeURIComponent(character.id)}/${tab.id}" class="character-sheet-tab ${selectedTab === tab.id ? 'active' : ''}" ${selectedTab === tab.id ? 'aria-current="page"' : ''}>
        <span aria-hidden="true">${tab.icon}</span>${tab.label}
      </a>`).join('')}
    </nav>
    <div class="character-sheet-tab-content" id="character-sheet-content">${tabContent(character, selectedTab)}</div>
  </section>`;
}
