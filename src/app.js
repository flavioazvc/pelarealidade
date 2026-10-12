import { loadState, getState, getStorageError, commit, uid, subscribe, importArchive, exportArchive } from './store.js?v=4';
import { mountBoard } from './board.js?v=2';
import { renderCharacterSheet, getCharacterResource, getCharacterResourceFormValues } from './character-sheet.js?v=1';

import { getSupabaseClient, checkSupabaseConnection } from './supabase.js?v=1';

const main = document.querySelector('#main');
const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modal-body');
const createToggle = document.querySelector('#create-toggle');
const createMenu = document.querySelector('#create-menu');
let searchText = '';
let activeBoardDispose = null;
loadState();

// A conexão é preparada nesta etapa; registros do jogo continuam no localStorage.
// Uma falha remota não impede o uso da aplicação local.
void Promise.all([getSupabaseClient(), checkSupabaseConnection()])
  .then(() => { document.documentElement.dataset.supabaseConnection = 'connected'; })
  .catch(error => {
    document.documentElement.dataset.supabaseConnection = 'unavailable';
    console.warn('Supabase indisponível; os registros continuam locais.', error?.message || error);
  });

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(value, options={dateStyle:'medium'}) { if (!value) return 'Sem data'; const d = new Date(value); return Number.isNaN(+d) ? 'Sem data' : new Intl.DateTimeFormat('pt-BR', options).format(d); }
function toast(message, kind='success') { const region=document.querySelector('#toast-region'); const node=document.createElement('div'); node.className=`toast ${kind==='error'?'error':kind==='warning'?'warning':''}`; node.textContent=message; region.append(node); setTimeout(()=>node.remove(),4200); }
function idHref(path) { return `#/${path}`; }
function routeInfo() {
  const bits = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
  return { name: bits[0] || 'home', id: bits[1] || null, section: bits[2] || null };
}
function stat(label,value) { return `<div class="metric"><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong></div>`; }
function empty(title, message, actions='') {
  return `<div class="empty-state"><h3>${title}</h3><p>${message}</p>${actions?`<div class="empty-actions">${actions}</div>`:''}</div>`;
}

function header(title, _eyebrow, lede='', actions='') {
  return `<header class="page-head"><div><h1>${title}</h1>${lede?`<p class="lede">${lede}</p>`:''}</div>${actions?`<div class="page-head-actions">${actions}</div>`:''}</header>`;
}

function render() {
  const r=routeInfo();
  if (activeBoardDispose) { activeBoardDispose(); activeBoardDispose=null; }
  document.querySelectorAll('.main-nav a').forEach(a=>a.classList.toggle('active', a.dataset.route===navRoute(r)));
  createMenu.hidden=true; createToggle.setAttribute('aria-expanded','false');
  const data=getState();
  const storageError=getStorageError();
  if (r.name==='planejamento' && r.id) { activeBoardDispose=mountBoard(main,r.id,toast,{getState,commit,uid}); }
  else if (r.name==='home') main.innerHTML=renderHome(data);
  else if (r.name==='campanhas') main.innerHTML=renderCampaigns(data);
  else if (r.name==='campanha') main.innerHTML=renderCampaignDetail(data,r.id);
  else if (r.name==='personagens') main.innerHTML=renderCharacters(data);
  else if (r.name==='personagem') main.innerHTML=renderCharacterDetail(data,r.id,r.section);
  else if (r.name==='sessoes') main.innerHTML=renderSessions(data);
  else if (r.name==='planejamento') main.innerHTML=renderPlanning(data);
  else main.innerHTML=empty('Arquivo não encontrado','O endereço solicitado não corresponde a uma seção disponível.',`<a href="#/" class="button">Ir para o início</a>`);
  if (storageError) main.insertAdjacentHTML('afterbegin',`<div class="notice"><strong>Falha de leitura local:</strong> ${esc(storageError)} Os dados existentes não foram alterados.</div>`);
  if (r.name==='personagens') {
    const input=main.querySelector('#character-search'); if(input) { input.value=searchText; input.addEventListener('input',()=>{searchText=input.value; const pos=input.selectionStart; const focused=true; const data=getState(); const box=main.querySelector('#character-results'); if(box) box.innerHTML=characterRecords(data,searchText); input.focus({preventScroll:true}); if(focused) input.setSelectionRange(pos,pos); }); }
  }
  const page=main.querySelector('.page'); if(page) page.setAttribute('aria-label',document.title);
}
function navRoute(r) { if(r.name==='campanha') return 'campaigns'; if(r.name==='personagem') return 'characters'; return ({home:'home',campanhas:'campaigns',personagens:'characters',sessoes:'sessions',planejamento:'planning'})[r.name] || ''; }

function renderHome(data) {
  const recent=[...data.campaigns.map(x=>({...x,_type:'Campanha'})),...data.characters.map(x=>({...x,_type:'Ficha'})),...data.sessions.map(x=>({...x,_type:'Sessão'}))]
    .sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'')).slice(0,5);
  return `<section class="page home-page">
    <div class="home-overview">
      <div class="welcome-panel"><h1>Bem-vindo, Flávio.</h1></div>
      <div class="metrics home-metrics">${stat('Campanhas',data.campaigns.length)}${stat('Personagens',data.characters.length)}${stat('Sessões registradas',data.sessions.length)}</div>
    </div>
    <div class="home-dashboard">
      <section class="home-recent-panel">
        <div class="section-head"><h2>Modificado recentemente</h2></div>
        ${recent.length?`<div class="card-list">${recent.map(item=>`<a class="record-card home-record-card" href="${item._type==='Campanha'?`#/campanha/${encodeURIComponent(item.id)}`:item._type==='Ficha'?`#/personagem/${encodeURIComponent(item.id)}`:'#/sessoes'}"><div class="record-main"><h3>${esc(item.name||item.title)}</h3><div class="record-meta"><span>${item._type}</span><span>Atualizado em ${fmtDate(item.updatedAt||item.createdAt)}</span></div></div><span class="tag gray">Abrir →</span></a>`).join('')}</div>`:empty('Nada modificado recentemente','Os registros aparecerão aqui quando você adicionar ou editar campanhas, personagens ou sessões.')}
      </section>
      <section class="home-maintenance-panel"><h2>Logins e senhas</h2><p>Em manutenção</p></section>
    </div>
  </section>`;
}

function campaignCard(c,data) {
  const chars=data.characters.filter(ch=>(ch.campaignIds||[]).includes(c.id)).length;
  const cover=safeImage(c.cover);
  const art=cover?`<img src="${cover}" alt="Capa da campanha ${esc(c.name)}" loading="lazy">`:`<div class="campaign-art-placeholder" aria-hidden="true"><span>${initials(c.name)}</span></div>`;
  return `<a class="campaign-card" href="#/campanha/${encodeURIComponent(c.id)}">
    <div class="campaign-art">${art}</div>
    <div class="campaign-card-content"><h2>${esc(c.name)}</h2><p>${esc(c.description||'Sem descrição registrada.')}</p>
      <div class="campaign-card-meta"><span>${chars} ${chars===1?'ficha':'fichas'}</span><span>Criada em ${fmtDate(c.createdAt,{dateStyle:'medium'})}</span></div>
    </div>
  </a>`;
}

function sessionRow(s,data) { const c=data.campaigns.find(x=>x.id===s.campaignId); return `<a class="record-card" href="#/sessoes"><div class="record-main"><h3>${esc(s.title)}</h3><p>${esc(c?.name||'Campanha removida')} · ${esc(s.status)}</p><div class="record-meta"><span>${s.date?fmtDate(s.date,{dateStyle:'medium',timeStyle:'short'}):'DATA A DEFINIR'}</span></div></div><span class="tag ${s.status==='Realizada'?'green':s.status==='Cancelada'?'red':'gray'}">${esc(s.status)}</span></a>`; }
function renderCampaigns(data) {
  const actions=`<button class="button button-primary" data-create="campaign">＋ Nova campanha</button>`;
  return `<section class="page"><div class="page-head"><div><h1>Campanhas</h1></div><div class="page-head-actions">${actions}</div></div>
    ${data.campaigns.length?`<div class="campaign-grid">${data.campaigns.slice().sort(byUpdated).map(c=>campaignCard(c,data)).join('')}</div>`:empty('Nenhuma campanha cadastrada','Crie uma campanha para começar a organizar fichas e sessões.',`<button class="button button-primary" data-create="campaign">＋ Criar campanha</button>`)}</section>`;
}

function renderCampaignDetail(data,id) {
  const c=data.campaigns.find(x=>x.id===id);
  if(!c) return `<section class="page">${empty('Campanha não encontrada','Ela pode ter sido removida.',`<a href="#/campanhas" class="button">Ver campanhas</a>`)}</section>`;
  const chars=data.characters.filter(ch=>(ch.campaignIds||[]).includes(c.id));
  const sessions=data.sessions.filter(session=>session.campaignId===c.id).sort(byDate);
  const cover=safeImage(c.cover);
  const campaignArt=cover?`<img src="${cover}" alt="Capa de ${esc(c.name)}">`:`<div class="campaign-art-placeholder" aria-hidden="true"><span>${initials(c.name)}</span></div>`;
  return `<section class="page campaign-detail-page">
    <div class="campaign-detail-banner">
      <div class="campaign-detail-cover">${campaignArt}</div>
      <div class="campaign-detail-copy"><h1>${esc(c.name)}</h1><p class="detail-text">${esc(c.description||'Nenhuma descrição registrada.')}</p>
        <div class="campaign-detail-meta"><span>Criada em ${fmtDate(c.createdAt,{dateStyle:'medium'})}</span><span>${chars.length} ${chars.length===1?'ficha':'fichas'}</span><span>${sessions.length} ${sessions.length===1?'sessão':'sessões'}</span></div>
      </div>
      <div class="campaign-detail-actions"><button class="button button-sm" data-action="edit-campaign" data-id="${esc(c.id)}">Editar</button><button class="button button-sm button-danger" data-action="delete-campaign" data-id="${esc(c.id)}">Excluir</button></div>
    </div>
    <div class="tabs"><a class="active" href="#/campanha/${encodeURIComponent(c.id)}">Visão geral</a><a href="#/planejamento/${encodeURIComponent(c.id)}">Quadro de planejamento</a><a href="#/sessoes">Sessões</a></div>
    <div class="campaign-detail-grid">
      <section class="panel campaign-characters-panel"><div class="panel-heading"><h2>Personagens</h2><button class="button button-sm" data-create="character" data-campaign="${esc(c.id)}">＋ Nova ficha vinculada</button></div>
        ${chars.length?`<div class="linked-character-list">${chars.map(ch=>linkedCharacterCard(ch,c.id)).join('')}</div>`:empty('Nenhum personagem','Associe uma ficha existente ou crie uma ficha para esta campanha.')}
      </section>
      <section class="panel campaign-sessions-panel"><div class="panel-heading"><h2>Sessões</h2></div>
        ${sessions.length?`<div class="card-list">${sessions.map(session=>sessionRow(session,data)).join('')}</div>`:empty('Nenhuma sessão registrada','As sessões desta campanha aparecerão aqui.')}
      </section>
    </div>
    <section class="panel campaign-board-panel"><div class="panel-heading"><h2>Quadro de planejamento</h2><span class="tag gray">${getState().boards[c.id]?.cards?.length||0} cartões</span></div><p class="detail-text">O quadro é independente das sessões e salva cartões, traços e conexões neste navegador.</p><a class="button button-primary" href="#/planejamento/${encodeURIComponent(c.id)}">Abrir quadro →</a></section>
  </section>`;
}

function linkedCharacterCard(ch,campaignId) {
  const attrs=ch.attributes||{};
  const stats=[['NEX',ch.nex||ch.level],['PV',ch.pv],['PE',ch.pe],['SAN',ch.san],['Defesa',ch.defense]];
  return `<article class="linked-character-card">
    <div class="linked-character-heading">${portraitMarkup(ch,'linked-character-portrait')}<div class="linked-character-title"><h3>${esc(ch.name)}</h3><p>${esc([ch.origin,ch.className,ch.path].filter(Boolean).join(' · ')||'Classe não informada')}</p>${ch.playerName?`<span>Jogador: ${esc(ch.playerName)}</span>`:''}</div>
      <div class="linked-character-actions"><a class="button button-sm" href="#/personagem/${encodeURIComponent(ch.id)}">Ficha completa →</a><button class="button button-sm" data-action="unlink-character" data-id="${esc(ch.id)}" data-campaign="${esc(campaignId)}">Desassociar</button></div>
    </div>
    <div class="linked-character-stats">${stats.map(([label,value])=>`<div class="character-stat"><span>${label}</span><strong>${esc(value||'—')}</strong></div>`).join('')}</div>
    <div class="linked-character-attributes">${['Agilidade','Força','Intelecto','Presença','Vigor'].map(name=>`<div class="character-attribute"><span>${name}</span><strong>${esc(attrs[name]||'—')}</strong></div>`).join('')}</div>
  </article>`;
}

function portraitMarkup(ch,className='character-portrait') {
  const image=safeImage(ch.portrait);
  return image?`<img class="${className}" src="${image}" alt="" loading="lazy">`:`<div class="${className} portrait-placeholder" aria-hidden="true"><span>${initials(ch.name)}</span></div>`;
}

function initials(value) {
  return String(value||'PR').trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0)).join('').toLocaleUpperCase('pt-BR')||'PR';
}

function renderCharacters(data) {
  const actions=`<button class="button button-primary" data-create="character">＋ Nova ficha</button>`;
  return `<section class="page"><div class="page-head"><div><h1>Personagens</h1></div><div class="page-head-actions">${actions}</div></div>
    <div class="search-row"><label class="field" style="max-width:420px;flex:1"><span>Pesquisar por nome</span><input id="character-search" type="search" placeholder="Nome do personagem" autocomplete="off"></label><span class="tag gray">${data.characters.length} fichas</span></div>
    <div id="character-results">${characterRecords(data,searchText)}</div>
  </section>`;
}

function characterRecords(data,query='') {
  const list=data.characters.filter(ch=>ch.name.toLowerCase().includes((query||'').trim().toLowerCase())).sort(byUpdated);
  if(!list.length) return empty(query?'Nenhum resultado':'Nenhum personagem cadastrado',query?'Tente outra busca.':'Crie uma ficha para começar.',query?'':`<button class="button button-primary" data-create="character">＋ Criar ficha</button>`);
  return `<div class="character-grid">${list.map(ch=>`<article class="character-card">
    <div class="character-card-body"><a class="character-identity" href="#/personagem/${encodeURIComponent(ch.id)}">${portraitMarkup(ch)}<span class="character-copy"><strong>${esc(ch.name)}</strong><span class="character-class">${esc(ch.className||'Classe não informada')}</span>${ch.path?`<span class="character-path">${esc(ch.path)}</span>`:''}</span></a>
      <div class="character-player"><span>Jogador</span><strong>${esc(ch.playerName||'Não informado')}</strong></div>
    </div>
    <div class="character-card-footer"><span class="tag gray">${(ch.campaignIds||[]).length} ${(ch.campaignIds||[]).length===1?'campanha':'campanhas'}</span><div class="record-actions"><button class="button button-sm" data-action="edit-character" data-id="${esc(ch.id)}">Editar</button><button class="button button-sm" data-action="delete-character" data-id="${esc(ch.id)}">Excluir</button></div></div>
  </article>`).join('')}</div>`;
}

function renderCharacterDetail(data,id,section='geral') {
  const character=data.characters.find(item=>item.id===id);
  if(!character) return `<section class="page">${empty('Ficha não encontrada','Ela pode ter sido removida.',`<a href="#/personagens" class="button">Ver biblioteca</a>`)}</section>`;
  const linked=data.campaigns.filter(campaign=>(character.campaignIds||[]).includes(campaign.id));
  return renderCharacterSheet(character,linked,section);
}
function renderSessions(data) { const list=data.sessions.slice().sort(byDate); return `<section class="page">${header('Sessões','CADERNO DE SESSÕES','Registre data, estado e anotações sem conteúdo narrativo automático.',`<button class="button button-primary" data-create="session">＋ Nova sessão</button>`)}<div class="tabs"><span class="active">Todas · ${list.length}</span><span>Planejadas · ${list.filter(s=>s.status==='Planejada').length}</span><span>Realizadas · ${list.filter(s=>s.status==='Realizada').length}</span><span>Canceladas · ${list.filter(s=>s.status==='Cancelada').length}</span></div>${list.length?`<div class="card-list">${list.map(s=>`<article class="record-card"><div class="record-main"><h3>${esc(s.title)}</h3><p>${esc(data.campaigns.find(c=>c.id===s.campaignId)?.name||'Campanha removida')} · ${esc(s.description||'Sem descrição.')}</p><div class="record-meta"><span>${s.date?fmtDate(s.date,{dateStyle:'medium',timeStyle:'short'}):'DATA A DEFINIR'}</span><span>${(s.notes||'').length} CARACTERES DE ANOTAÇÕES</span></div></div><div class="record-actions"><select class="status-select" data-session-status="${esc(s.id)}" aria-label="Estado da sessão">${['Planejada','Realizada','Cancelada'].map(v=>`<option ${s.status===v?'selected':''}>${v}</option>`).join('')}</select><button class="button button-sm" data-action="edit-session" data-id="${esc(s.id)}">Editar</button><button class="button button-sm" data-action="delete-session" data-id="${esc(s.id)}">Excluir</button></div></article>`).join('')}</div>`:empty('Nenhuma sessão cadastrada','Crie uma sessão vinculada a uma campanha existente.',data.campaigns.length?`<button class="button button-primary" data-create="session">＋ Criar sessão</button>`:`<button class="button" data-create="campaign">Criar uma campanha primeiro</button>`)}</section>`; }
function renderPlanning(data) {
  const actions=`<a href="#/campanhas" class="button">Ver campanhas</a>`;
  return `<section class="page"><div class="page-head"><div><h1>Planejamento</h1></div><div class="page-head-actions">${actions}</div></div>
    ${data.campaigns.length?`<div class="planning-grid">${data.campaigns.slice().sort(byUpdated).map(c=>{const board=data.boards[c.id]||{cards:[],paths:[],links:[]};const cardWord=board.cards.length===1?'cartão':'cartões';const linkWord=board.links.length===1?'conexão':'conexões';return `<a class="planning-card" href="#/planejamento/${encodeURIComponent(c.id)}">${boardPreviewMarkup(board)}<div class="planning-card-content"><h2>${esc(c.name)}</h2><p>${board.cards.length} ${cardWord} · ${board.links.length} ${linkWord}</p><span class="tag gray">Abrir quadro →</span></div></a>`;}).join('')}</div>`:empty('Nenhuma campanha para planejar','Crie uma campanha para ter um quadro próprio.',`<button class="button button-primary" data-create="campaign">＋ Criar campanha</button>`)}</section>`;
}

function boardPreviewMarkup(board) {
  const cards=(board.cards||[]).slice(0,24), paths=(board.paths||[]).slice(0,18), links=(board.links||[]).slice(0,36);
  const cardById=new Map(cards.map(card=>[card.id,card]));
  const lines=links.map(link=>{const a=cardById.get(link.from),b=cardById.get(link.to);if(!a||!b)return '';return `<line x1="${a.x+a.w/2}" y1="${a.y+a.h/2}" x2="${b.x+b.w/2}" y2="${b.y+b.h/2}" stroke="#d47968" stroke-width="28" opacity=".8"/>`;}).join('');
  const strokes=paths.map(path=>{const points=(path.points||[]).slice(0,350).map(point=>`${Number(point.x)||0},${Number(point.y)||0}`).join(' ');return points?`<polyline points="${points}" fill="none" stroke="${safeBoardColor(path.color)}" stroke-width="${Math.max(18,Math.min(72,(Number(path.width)||3)*8))}" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`:'';}).join('');
  const blocks=cards.map(card=>{const left=Math.max(0,Math.min(98.5,(Number(card.x)||0)/60)),top=Math.max(0,Math.min(98,(Number(card.y)||0)/40)),width=Math.max(2,Math.min(12,(Number(card.w)||260)/60)),height=Math.max(3,Math.min(18,(Number(card.h)||180)/40));return `<span class="board-preview-card" title="${esc(card.title||'Cartão')}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;width:${width.toFixed(2)}%;height:${height.toFixed(2)}%;background:${safeBoardColor(card.color)}"></span>`;}).join('');
  const hasContent=cards.length||paths.length||links.length;
  return `<div class="board-preview" role="img" aria-label="Prévia do quadro de planejamento">${hasContent?`<svg viewBox="0 0 6000 4000" aria-hidden="true">${lines}${strokes}</svg>${blocks}`:`<span class="board-preview-empty">Quadro vazio</span>`}</div>`;
}

function safeBoardColor(value) { return /^#[0-9a-f]{6}$/i.test(String(value||''))?value:'#39343b'; }

function openModal(title,intro,formContent,submitLabel='Salvar') {
  modalBody.innerHTML=`<h2 id="modal-title" class="modal-title">${title}</h2><p class="modal-intro">${intro}</p><form id="entity-form">${formContent}<div class="form-actions"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">${submitLabel}</button></div></form>`;
  if (!modal.open) modal.showModal();
  modalBody.querySelector('input,textarea,select')?.focus({preventScroll:true});
}
function valueField(name,label,value='',type='text',extra='') { return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`; }
function textareaField(name,label,value='',hint='') { return `<div class="field full"><label for="f-${name}">${label}</label><textarea id="f-${name}" name="${name}" ${hint?`aria-describedby="hint-${name}"`:''}>${esc(value)}</textarea>${hint?`<small id="hint-${name}">${hint}</small>`:''}</div>`; }
function campaignForm(c={}) { openModal(c.id?'Editar campanha':'Nova campanha','O quadro geral desta campanha começa vazio.',`<input type="hidden" name="id" value="${esc(c.id||'')}"><div class="form-grid">${valueField('name','Nome da campanha',c.name||'','text','required maxlength="120"')}${valueField('cover','URL da imagem de capa (opcional)',c.cover||'','url','placeholder="https://…"')}${textareaField('description','Descrição',c.description||'')}</div>`); }
function characterForm(ch={},preselected='') {
  const data=getState(); const attrs=ch.attributes||{}; const selectedCampaigns=ch.campaignIds|| (preselected?[preselected]:[]);
  const campaigns=`<fieldset class="field full" style="border:1px solid #363c3d;padding:12px"><legend>Campanhas associadas</legend><div class="chip-list">${data.campaigns.length?data.campaigns.map(c=>`<label style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" name="campaignIds" value="${esc(c.id)}" ${selectedCampaigns.includes(c.id)?'checked':''}>${esc(c.name)}</label>`).join(''):'<small>Crie uma campanha para associar esta ficha.</small>'}</div></fieldset>`;
  const attr=`<fieldset class="field full" style="border:1px solid #363c3d;padding:12px"><legend>Atributos · anotação manual</legend><div class="rule-fields">${['Agilidade','Força','Intelecto','Presença','Vigor'].map((name,i)=>`<div class="field"><label for="attr-${i}">${name}</label><input id="attr-${i}" name="attr_${i}" value="${esc(attrs[name]||'')}" inputmode="numeric" aria-label="${name}, valor manual"></div>`).join('')}</div></fieldset>`;
  const resources=[['pv','PV'],['san','SAN'],['pe','PE']].map(([key,label])=>{
    const values=getCharacterResourceFormValues(ch,key);
    return `<div class="sheet-resource-edit"><div class="field"><label for="f-${key}">${label} atual</label><input id="f-${key}" name="${key}" type="text" inputmode="numeric" value="${esc(values.current)}" placeholder="0"></div><div class="field"><label for="f-${key}Max">${label} máximo</label><input id="f-${key}Max" name="${key}Max" type="number" min="0" step="1" value="${esc(values.max)}" placeholder="Definir limite"></div></div>`;
  }).join('');
  const resourceFields=`<fieldset class="field full sheet-resource-fieldset"><legend>Pontos da ficha</legend><div class="sheet-resource-form-grid">${resources}</div><small>Informe o valor atual e o limite de PV, SAN e PE. A ficha não calcula esses números automaticamente.</small></fieldset>`;
  openModal(ch.id?'Editar ficha':'Nova ficha','Preencha os dados do personagem. Os limites de PV, SAN e PE são definidos pela mesa.',`<input type="hidden" name="id" value="${esc(ch.id||'')}"><div class="form-grid">${valueField('name','Nome do personagem *',ch.name||'','text','required maxlength="100"')}${valueField('playerName','Jogador(a)',ch.playerName||'')}${valueField('portrait','Imagem do personagem/jogador (URL, opcional)',ch.portrait||'','url','placeholder="https://…"')}${valueField('playerNote','Anotação de jogador (opcional)',ch.playerNote||'')}${valueField('origin','Origem',ch.origin||'')}${valueField('className','Classe',ch.className||'')}${valueField('path','Trilha',ch.path||'')}${valueField('nex','NEX',ch.nex||'')}${valueField('rank','Patente',ch.rank||'')}${resourceFields}${valueField('defense','Defesa',ch.defense||'','text')}${attr}${textareaField('skills','Perícias',ch.skills||'','Anote valores ou treinamento conforme a versão usada pela mesa.')}${textareaField('abilities','Habilidades e poderes',ch.abilities||'')}${textareaField('inventory','Inventário e equipamentos',ch.inventory||'')}${textareaField('rituals','Rituais',ch.rituals||'')}${textareaField('description','Descrição do personagem',ch.description||'')}${textareaField('progress','Progressão / outros campos',ch.progress||'')}${textareaField('notes','Notas da mesa',ch.notes||'')}${campaigns}</div>`);
}

function sessionForm(s={},preselected='') { const data=getState(); if(!data.campaigns.length){toast('Crie uma campanha antes de registrar uma sessão.','warning');return;} openModal(s.id?'Editar sessão':'Nova sessão','O quadro de planejamento não é duplicado por sessão.',`<input type="hidden" name="id" value="${esc(s.id||'')}"><div class="form-grid"><div class="field"><label for="f-campaignId">Campanha *</label><select id="f-campaignId" name="campaignId" required>${data.campaigns.map(c=>`<option value="${esc(c.id)}" ${(s.campaignId||preselected)===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>${valueField('title','Título *',s.title||'','text','required maxlength="140"')}${valueField('date','Data e horário (opcionais)',s.date||'','datetime-local')}${textareaField('description','Descrição',s.description||'')}<div class="field"><label for="f-status">Estado</label><select id="f-status" name="status">${['Planejada','Realizada','Cancelada'].map(v=>`<option ${(s.status||'Planejada')===v?'selected':''}>${v}</option>`).join('')}</select></div>${textareaField('notes','Anotações',s.notes||'')}</div>`); }

function handleCreate(type,campaignId='') { createMenu.hidden=true; createToggle.setAttribute('aria-expanded','false'); if(type==='campaign') campaignForm(); else if(type==='character') characterForm({},campaignId); else if(type==='session') sessionForm({},campaignId); else if(type==='board') { const data=getState(); if(!data.campaigns.length){toast('Crie uma campanha antes de abrir um quadro.','warning');return;} location.hash=data.campaigns.length===1?`#/planejamento/${encodeURIComponent(data.campaigns[0].id)}`:'#/planejamento'; } }

document.addEventListener('click',event=>{
  const create=event.target.closest('[data-create]'); if(create){event.preventDefault(); handleCreate(create.dataset.create,create.dataset.campaign||'');return;}
  if(event.target.closest('#create-toggle')){createMenu.hidden=!createMenu.hidden;createToggle.setAttribute('aria-expanded',String(!createMenu.hidden));return;}
  if(!event.target.closest('.create-wrap')){createMenu.hidden=true;createToggle.setAttribute('aria-expanded','false');}
  const button=event.target.closest('[data-action]'); if(!button)return;
  if(createMenu.contains(button)){createMenu.hidden=true;createToggle.setAttribute('aria-expanded','false');}
  const action=button.dataset.action, data=getState(), id=button.dataset.id;
  if(action==='adjust-resource'){
    const character=data.characters.find(item=>item.id===id);const key=button.dataset.resource;const resource=character&&getCharacterResource(character,key);
    if(!character||!['pv','san','pe'].includes(key)||!resource?.configured)return;
    const delta=Number(button.dataset.delta)||0;const next=Math.max(0,Math.min(resource.max,resource.current+delta));
    const ok=commit(d=>{const target=d.characters.find(item=>item.id===id);if(target){target[key]=String(next);target[`${key}Max`]=String(resource.max);target.updatedAt=new Date().toISOString();}});
    if(ok)render();else toast('Não foi possível salvar os pontos.','error');
    return;
  }
  if(action==='close-modal'){modal.close();return;}
  if(action==='edit-campaign'){const c=data.campaigns.find(x=>x.id===id);if(c)campaignForm(c);return;}
  if(action==='edit-character'){const c=data.characters.find(x=>x.id===id);if(c)characterForm(c);return;}
  if(action==='edit-session'){const s=data.sessions.find(x=>x.id===id);if(s)sessionForm(s);return;}
  if(action==='delete-campaign'){const c=data.campaigns.find(x=>x.id===id);if(!c)return;const sc=data.sessions.filter(s=>s.campaignId===id).length;const chars=data.characters.filter(ch=>(ch.campaignIds||[]).includes(id)).length;const approved=confirm(`Excluir a campanha “${c.name}”? Isso removerá ${sc} sessão(ões) e o quadro de planejamento. As ${chars} ficha(s) associada(s) serão preservadas e apenas desassociadas.`);if(!approved)return;const ok=commit(d=>{d.campaigns=d.campaigns.filter(x=>x.id!==id);d.sessions=d.sessions.filter(s=>s.campaignId!==id);delete d.boards[id];d.characters=d.characters.map(ch=>({...ch,campaignIds:(ch.campaignIds||[]).filter(cid=>cid!==id)}));});if(ok){toast('Campanha removida. Fichas originais preservadas.');location.hash='#/campanhas';}else toast('Não foi possível excluir a campanha.','error');return;}
  if(action==='delete-character'){const ch=data.characters.find(x=>x.id===id);if(!ch||!confirm(`Excluir a ficha de “${ch.name}”? As associações com campanhas serão removidas, mas as campanhas continuarão. Esta ação não pode ser desfeita.`))return;const ok=commit(d=>{d.characters=d.characters.filter(x=>x.id!==id);});ok?(toast('Ficha excluída.'),location.hash='#/personagens'):toast('Não foi possível excluir a ficha.','error');return;}
  if(action==='delete-session'){const s=data.sessions.find(x=>x.id===id);if(!s||!confirm(`Excluir a sessão “${s.title}”? Esta ação não pode ser desfeita.`))return;commit(d=>{d.sessions=d.sessions.filter(x=>x.id!==id);})?toast('Sessão excluída.'):toast('Não foi possível excluir a sessão.','error');render();return;}
  if(action==='unlink-character'){const cid=button.dataset.campaign;commit(d=>{const ch=d.characters.find(x=>x.id===id);if(ch)ch.campaignIds=(ch.campaignIds||[]).filter(x=>x!==cid);})?toast('Ficha desassociada; os dados originais foram mantidos.'):toast('Falha ao desassociar.','error');render();return;}
  if(action==='export'){downloadArchive();return;}
  if(action==='import'){document.querySelector('#archive-file').click();return;}
});

document.addEventListener('submit',event=>{
  if(event.target.getAttribute('id')!=='entity-form')return;
  event.preventDefault();const form=event.target; if(!form.reportValidity())return;
  const fd=new FormData(form);const id=String(fd.get('id')||'');const now=new Date().toISOString();let ok=false;let success='Alterações salvas.';
  if(form.querySelector('[name="cover"]') && form.querySelector('[name="description"]') && !form.querySelector('[name="campaignId"]')) {
    const name=String(fd.get('name')||'').trim();const cover=String(fd.get('cover')||'').trim();if(cover&&!validImageUrl(cover)){toast('A capa deve usar uma URL HTTP ou HTTPS válida.','error');return;}
    ok=commit(d=>{const record={id:id||uid(),name,description:String(fd.get('description')||'').trim(),cover,createdAt:d.campaigns.find(x=>x.id===id)?.createdAt||now,updatedAt:now};const index=d.campaigns.findIndex(x=>x.id===id);if(index>=0)d.campaigns[index]=record;else{d.campaigns.push(record);d.boards[record.id]={campaignId:record.id,cards:[],paths:[],links:[],updatedAt:now};}});success=id?'Campanha atualizada.':'Campanha criada. O quadro está vazio.';
  } else if(form.querySelector('[name="attr_0"]')) {
    const old=getState().characters.find(x=>x.id===id);const portrait=String(fd.get('portrait')||'').trim();if(portrait&&!validImageUrl(portrait)){toast('A imagem deve usar uma URL HTTP ou HTTPS válida.','error');return;}const attributes={};['Agilidade','Força','Intelecto','Presença','Vigor'].forEach((name,i)=>attributes[name]=String(fd.get(`attr_${i}`)||'').trim());const campaignIds=fd.getAll('campaignIds').map(String);
    const record={id:id||uid(),name:String(fd.get('name')||'').trim(),playerNote:String(fd.get('playerNote')||'').trim(),playerName:String(fd.get('playerName')||'').trim(),portrait,origin:String(fd.get('origin')||'').trim(),className:String(fd.get('className')||'').trim(),path:String(fd.get('path')||'').trim(),nex:String(fd.get('nex')||'').trim(),rank:String(fd.get('rank')||'').trim(),pv:String(fd.get('pv')||'').trim(),pvMax:String(fd.get('pvMax')||'').trim(),pe:String(fd.get('pe')||'').trim(),peMax:String(fd.get('peMax')||'').trim(),san:String(fd.get('san')||'').trim(),sanMax:String(fd.get('sanMax')||'').trim(),defense:String(fd.get('defense')||'').trim(),attributes,skills:String(fd.get('skills')||'').trim(),abilities:String(fd.get('abilities')||'').trim(),inventory:String(fd.get('inventory')||'').trim(),rituals:String(fd.get('rituals')||'').trim(),description:String(fd.get('description')||'').trim(),progress:String(fd.get('progress')||'').trim(),notes:String(fd.get('notes')||'').trim(),campaignIds,createdAt:old?.createdAt||now,updatedAt:now};
    ok=commit(d=>{const index=d.characters.findIndex(x=>x.id===id);if(index>=0)d.characters[index]=record;else d.characters.push(record);});success=id?'Ficha atualizada.':'Ficha criada.';
  } else if(form.querySelector('[name="campaignId"]')) {
    const old=getState().sessions.find(x=>x.id===id);const record={id:id||uid(),campaignId:String(fd.get('campaignId')),title:String(fd.get('title')||'').trim(),date:String(fd.get('date')||''),description:String(fd.get('description')||'').trim(),status:String(fd.get('status')||'Planejada'),notes:String(fd.get('notes')||'').trim(),createdAt:old?.createdAt||now,updatedAt:now};
    if(!['Planejada','Realizada','Cancelada'].includes(record.status)){toast('Estado inválido.','error');return;}
    ok=commit(d=>{if(!d.campaigns.some(c=>c.id===record.campaignId))throw new Error('Campanha não encontrada.');const index=d.sessions.findIndex(x=>x.id===id);if(index>=0)d.sessions[index]=record;else d.sessions.push(record);});success=id?'Sessão atualizada.':'Sessão criada.';
  }
  if(ok){modal.close();toast(success);render();}else toast('Não foi possível salvar. Verifique o armazenamento local e tente novamente.','error');
},true);

document.addEventListener('change',event=>{
  const target=event.target;
  if(target.matches('[data-resource-range]')){
    const id=target.dataset.id;const key=target.dataset.resource;const value=Number(target.value);const character=getState().characters.find(item=>item.id===id);const resource=character&&getCharacterResource(character,key);
    if(!character||!['pv','san','pe'].includes(key)||!resource?.configured||!Number.isFinite(value))return;
    const next=Math.max(0,Math.min(resource.max,Math.round(value)));
    const ok=commit(d=>{const current=d.characters.find(item=>item.id===id);if(current){current[key]=String(next);current[`${key}Max`]=String(resource.max);current.updatedAt=new Date().toISOString();}});
    if(ok)render();else toast('Não foi possível salvar os pontos.','error');
  }
  if(target.matches('[data-session-status]')){const id=target.dataset.sessionStatus;const ok=commit(d=>{const s=d.sessions.find(x=>x.id===id);if(s){s.status=target.value;s.updatedAt=new Date().toISOString();}});if(ok){toast('Estado da sessão atualizado.');render();}else toast('Falha ao salvar o estado da sessão.','error');}
  if(target.id==='archive-file'&&target.files?.[0]){const file=target.files[0];if(!confirm('Importar este arquivo substituirá todos os registros locais atuais. Exporte uma cópia antes de continuar. Prosseguir?')){target.value='';return;}file.text().then(text=>{if(importArchive(text)){toast('Arquivo importado.');render();}else toast('Não foi possível confirmar a gravação do arquivo.','error');}).catch(error=>toast(`Falha ao importar o arquivo: ${error.message}`,'error')).finally(()=>target.value='');}
});

function downloadArchive(){const blob=new Blob([exportArchive()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`pela-realidade-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('Arquivo JSON exportado para este dispositivo.');}
function safeImage(url){if(!String(url??'').trim())return '';try{const u=new URL(url,location.href);return ['http:','https:'].includes(u.protocol)?esc(u.href):'';}catch{return '';}}
function validImageUrl(url){try{return ['http:','https:'].includes(new URL(url).protocol);}catch{return false;}}
function byUpdated(a,b){return (b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'');}
function byDate(a,b){return (a.date||'9999').localeCompare(b.date||'9999');}

if(!document.querySelector('#archive-file')){const file=document.createElement('input');file.type='file';file.id='archive-file';file.accept='.json,application/json';file.hidden=true;document.body.append(file);}
window.addEventListener('hashchange',render);
window.addEventListener('storage',()=>{loadState();render();toast('O arquivo foi atualizado em outra aba.','warning');});
subscribe((_state,error)=>{if(error)toast(`Armazenamento: ${error}`,'error');});
if(!location.hash) location.hash='#/';
render();
