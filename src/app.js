import { loadState, getState, getStorageError, commit as commitLocal, uid, subscribe, importArchive, exportArchive, getLegacyState, setStorageScope, replaceState, clearMemory } from './store.js?v=4';
import { mountBoard } from './board.js?v=3';
import { getClient, readProfile, signInWithNickname, requestAdminOperation, listProfiles, signOut } from './auth.js?v=1';
import { loadWorkspace, syncWorkspace, workspaceIsEmpty, listCampaignMembers, replaceCampaignMembers } from './cloud-store.js?v=1';

const main = document.querySelector('#main');
const appShell = document.querySelector('#app-shell');
const authShell = document.querySelector('#auth-shell');
const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modal-body');
const createToggle = document.querySelector('#create-toggle');
const createMenu = document.querySelector('#create-menu');
let searchText = '';
let activeBoardDispose = null;
let currentClient = null;
let currentUser = null;
let currentProfile = null;
let cloudReady = false;
let cloudSnapshot = null;
let syncQueue = Promise.resolve();
let profileCache = [];
loadState();
let legacySnapshot = getLegacyState();

function commitAndSync(change) {
  const ok = commitLocal(change);
  if (!ok || !cloudReady || !currentClient || !currentUser) return ok;
  const syncClient=currentClient, syncUser=currentUser;
  const snapshot = structuredClone(getState());
  syncQueue = syncQueue.catch(() => {}).then(async () => {
    if(currentUser?.id!==syncUser.id)return;
    await syncWorkspace(syncClient,syncUser,cloudSnapshot||{campaigns:[],characters:[],sessions:[],boards:{}},snapshot);
    if(currentUser?.id===syncUser.id)cloudSnapshot=snapshot;
  }).catch(error => {
    if(currentUser?.id!==syncUser.id)return;
    return loadWorkspace(syncClient,syncUser.id).then(remote=>{if(currentUser?.id===syncUser.id)cloudSnapshot=remote;}).catch(()=>{}).finally(()=>toast(`Alteração salva neste navegador, mas a sincronização falhou: ${error.message}`, 'error'));
  });
  return true;
}

function renderLogin(message = '', username = '') {
  if (!authShell || !appShell) return;
  appShell.hidden = true;
  authShell.hidden = false;
  document.documentElement.dataset.auth = 'signed-out';
  authShell.innerHTML = `<main class="auth-page" id="auth-main" tabindex="-1"><section class="auth-card" aria-labelledby="auth-title">
    <div class="auth-brand"><span class="brand-mark" aria-hidden="true">PR</span><span><strong>Pela Realidade</strong><small>ACESSO RESTRITO</small></span></div>
    <p class="auth-kicker">Arquivo de operações · acesso controlado</p><h1 id="auth-title">Identifique-se.</h1>
    <p class="auth-copy">Entre com seu nickname e senha para abrir suas campanhas e fichas.</p>
    ${message ? `<div class="auth-error" role="alert">${esc(message)}</div>` : ''}
    <form id="login-form" class="auth-form">
      <label class="field"><span>Nickname</span><input name="username" type="text" value="${esc(username)}" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="32" required></label>
      <label class="field"><span>Senha</span><input name="password" type="password" autocomplete="current-password" required></label>
      <button class="button button-primary auth-submit" type="submit">Entrar no arquivo</button>
    </form>
    <p class="auth-note">O acesso é criado pelo administrador. Não é necessário informar e-mail.</p>
  </section></main>`;
  authShell.querySelector('[name="username"]')?.focus({ preventScroll: true });
}

async function activateSession(client, user, profile) {
  const remote = await loadWorkspace(client, user.id);
  currentClient = client;
  currentUser = user;
  currentProfile = profile;
  setStorageScope(user.id);
  cloudSnapshot = structuredClone(remote);
  cloudReady = true;
  try { replaceState(remote); }
  catch (error) { replaceState(remote, { persist: false }); toast(`Cache local indisponível; os dados permanecem no Supabase. ${error.message}`, 'warning'); }
  authShell.hidden = true;
  appShell.hidden = false;
  document.documentElement.dataset.auth = 'signed-in';
  document.documentElement.dataset.supabaseConnection = 'connected';
  updateChrome();
  render();
}

function clearSignedInState() {
  if (activeBoardDispose) { activeBoardDispose(); activeBoardDispose=null; }
  if (modal.open) modal.close();
  currentUser = null;
  currentProfile = null;
  cloudReady = false;
  cloudSnapshot = null;
  profileCache = [];
  setStorageScope(null);
  clearMemory();
  renderLogin();
}

function updateChrome() {
  const adminLink = document.querySelector('#admin-access-nav');
  const accountLabel = document.querySelector('#account-label');
  const badge = document.querySelector('.local-badge');
  const isAdmin = currentProfile?.role === 'admin';
  if (adminLink) adminLink.hidden = !isAdmin;
  if (accountLabel) accountLabel.textContent = currentProfile?.display_name || currentProfile?.username || '';
  if (badge?.querySelector('span')) badge.querySelector('span').textContent = `SUPABASE · ${String(currentProfile?.username || '').toLocaleUpperCase('pt-BR')}`;
  if (createToggle) createToggle.hidden = currentProfile?.role === 'player';
  document.querySelectorAll('#create-menu [data-create="campaign"], #create-menu [data-create="session"], #create-menu [data-create="board"]').forEach(button => {
    button.hidden = currentProfile?.role === 'player';
  });
}

async function bootAuth() {
  renderLogin();
  try {
    const client = await getClient();
    currentClient = client;
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error('Não foi possível verificar a sessão existente.');
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') queueMicrotask(clearSignedInState);
    });
    if (data.session?.user) {
      const profile = await readProfile(client, data.session.user.id);
      await activateSession(client, data.session.user, profile);
    } else {
      document.documentElement.dataset.supabaseConnection = 'connected';
    }
  } catch (error) {
    document.documentElement.dataset.supabaseConnection = 'unavailable';
    renderLogin(error?.message || 'O serviço de autenticação está indisponível.');
  }
}

async function logoutUser() {
  try {
    await syncQueue.catch(() => {});
    if (activeBoardDispose) { activeBoardDispose(); activeBoardDispose=null; }
    await syncQueue.catch(() => {});
    if (currentClient) await signOut(currentClient);
  } catch (error) {
    toast(error.message, 'error');
  }
}

function mayManageCampaign(campaign) {
  return currentProfile?.role === 'admin'
    || (currentProfile?.role === 'master' && (campaign?.createdBy === currentUser?.id || campaign?.membershipRole === 'master'));
}

function mayManageCharacter(character) {
  return currentProfile?.role === 'admin' || character?.ownerId === currentUser?.id
    || (character?.campaignIds || []).some(id => mayManageCampaign(getState().campaigns.find(campaign => campaign.id === id)));
}

function applyRoleControls() {
  const data=getState();
  if(currentProfile?.role==='player') main.querySelectorAll('[data-create="campaign"],[data-create="session"],[data-create="board"]').forEach(node=>node.hidden=true);
  main.querySelectorAll('[data-action="edit-campaign"],[data-action="delete-campaign"]').forEach(node=>{
    if(!mayManageCampaign(data.campaigns.find(campaign=>campaign.id===node.dataset.id))) node.hidden=true;
  });
  main.querySelectorAll('[data-action="edit-character"],[data-action="delete-character"],[data-action="unlink-character"]').forEach(node=>{
    if(!mayManageCharacter(data.characters.find(character=>character.id===node.dataset.id))) node.hidden=true;
  });
  main.querySelectorAll('[data-action="edit-session"],[data-action="delete-session"],[data-session-status]').forEach(node=>{
    const session=data.sessions.find(item=>item.id===(node.dataset.id||node.dataset.sessionStatus));
    if(!mayManageCampaign(data.campaigns.find(campaign=>campaign.id===session?.campaignId))) node.hidden=true;
  });
  if(currentProfile?.role!=='admin') main.querySelectorAll('[data-action="manage-members"]').forEach(node=>node.hidden=true);
}

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(value, options={dateStyle:'medium'}) { if (!value) return 'Sem data'; const d = new Date(value); return Number.isNaN(+d) ? 'Sem data' : new Intl.DateTimeFormat('pt-BR', options).format(d); }
function toast(message, kind='success') { const region=document.querySelector('#toast-region'); const node=document.createElement('div'); node.className=`toast ${kind==='error'?'error':kind==='warning'?'warning':''}`; node.textContent=message; region.append(node); setTimeout(()=>node.remove(),4200); }
function idHref(path) { return `#/${path}`; }
function routeInfo() {
  const bits = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
  return { name: bits[0] || 'home', id: bits[1] || null };
}
function stat(label,value) { return `<div class="metric"><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong></div>`; }
function empty(title, message, actions='') {
  return `<div class="empty-state"><h3>${title}</h3><p>${message}</p>${actions?`<div class="empty-actions">${actions}</div>`:''}</div>`;
}

function header(title, _eyebrow, lede='', actions='') {
  return `<header class="page-head"><div><h1>${title}</h1>${lede?`<p class="lede">${lede}</p>`:''}</div>${actions?`<div class="page-head-actions">${actions}</div>`:''}</header>`;
}

function render() {
  if (!currentProfile) return;
  const r=routeInfo();
  if (activeBoardDispose) { activeBoardDispose(); activeBoardDispose=null; }
  document.querySelectorAll('.main-nav a').forEach(a=>a.classList.toggle('active', a.dataset.route===navRoute(r)));
  createMenu.hidden=true; createToggle.setAttribute('aria-expanded','false');
  const data=getState();
  const storageError=getStorageError();
  if (r.name==='acessos' && currentProfile.role!=='admin') { location.hash='#/'; return; }
  if (r.name==='planejamento' && r.id) { const campaign=data.campaigns.find(item=>item.id===r.id); activeBoardDispose=mountBoard(main,r.id,toast,{getState,commit:commitAndSync,uid,canEdit:mayManageCampaign(campaign)}); }
  else if (r.name==='home') main.innerHTML=renderHome(data);
  else if (r.name==='campanhas') main.innerHTML=renderCampaigns(data);
  else if (r.name==='campanha') main.innerHTML=renderCampaignDetail(data,r.id);
  else if (r.name==='personagens') main.innerHTML=renderCharacters(data);
  else if (r.name==='personagem') main.innerHTML=renderCharacterDetail(data,r.id);
  else if (r.name==='sessoes') main.innerHTML=renderSessions(data);
  else if (r.name==='planejamento') main.innerHTML=renderPlanning(data);
  else if (r.name==='acessos') main.innerHTML=renderAccesses(profileCache);
  else main.innerHTML=empty('Arquivo não encontrado','O endereço solicitado não corresponde a uma seção disponível.',`<a href="#/" class="button">Ir para o início</a>`);
  applyRoleControls();
  if (storageError) main.insertAdjacentHTML('afterbegin',`<div class="notice"><strong>Falha de leitura local:</strong> ${esc(storageError)} Os dados existentes não foram alterados.</div>`);
  if (r.name==='personagens') {
    const input=main.querySelector('#character-search'); if(input) { input.value=searchText; input.addEventListener('input',()=>{searchText=input.value; const pos=input.selectionStart; const focused=true; const data=getState(); const box=main.querySelector('#character-results'); if(box) box.innerHTML=characterRecords(data,searchText); applyRoleControls(); input.focus({preventScroll:true}); if(focused) input.setSelectionRange(pos,pos); }); }
  }
  if (r.name==='acessos') void refreshProfiles();
  const page=main.querySelector('.page'); if(page) page.setAttribute('aria-label',document.title);
}
function navRoute(r) { if(r.name==='campanha') return 'campaigns'; if(r.name==='personagem') return 'characters'; return ({home:'home',campanhas:'campaigns',personagens:'characters',sessoes:'sessions',planejamento:'planning',acessos:'accesses'})[r.name] || ''; }

function renderHome(data) {
  const recent=[...data.campaigns.map(x=>({...x,_type:'Campanha'})),...data.characters.map(x=>({...x,_type:'Ficha'})),...data.sessions.map(x=>({...x,_type:'Sessão'}))]
    .sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'')).slice(0,5);
  const legacyCount=legacySnapshot.campaigns.length+legacySnapshot.characters.length+legacySnapshot.sessions.length;
  const migrationNotice=currentProfile.role==='admin'&&legacyCount>0&&workspaceIsEmpty(data)
    ?`<section class="notice migration-notice"><strong>Arquivo local detectado.</strong> Há ${legacySnapshot.campaigns.length} campanha(s), ${legacySnapshot.characters.length} ficha(s) e ${legacySnapshot.sessions.length} sessão(ões) neste navegador. <button class="button button-sm" data-action="migrate-local">Migrar para o Supabase</button></section>`:'';
  return `<section class="page home-page">
    <div class="home-overview">
      <div class="welcome-panel"><h1>Bem-vindo, ${esc(currentProfile.display_name||currentProfile.username)}.</h1></div>
      <div class="metrics home-metrics">${stat('Campanhas',data.campaigns.length)}${stat('Personagens',data.characters.length)}${stat('Sessões registradas',data.sessions.length)}</div>
    </div>
    ${migrationNotice}
    <div class="home-dashboard">
      <section class="home-recent-panel">
        <div class="section-head"><h2>Modificado recentemente</h2></div>
        ${recent.length?`<div class="card-list">${recent.map(item=>`<a class="record-card home-record-card" href="${item._type==='Campanha'?`#/campanha/${encodeURIComponent(item.id)}`:item._type==='Ficha'?`#/personagem/${encodeURIComponent(item.id)}`:'#/sessoes'}"><div class="record-main"><h3>${esc(item.name||item.title)}</h3><div class="record-meta"><span>${item._type}</span><span>Atualizado em ${fmtDate(item.updatedAt||item.createdAt)}</span></div></div><span class="tag gray">Abrir →</span></a>`).join('')}</div>`:empty('Nada modificado recentemente','Os registros aparecerão aqui quando você adicionar ou editar campanhas, personagens ou sessões.')}
      </section>
      <section class="home-maintenance-panel"><h2>Logins e senhas</h2>${currentProfile.role==='admin'?'<p>Gerencie nicknames, perfis e redefinições de senha.</p><a class="button button-primary" href="#/acessos">Gerenciar acessos →</a>':'<p>Gerenciamento restrito ao administrador.</p>'}</section>
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
  const canCreate=currentProfile.role==='admin'||currentProfile.role==='master';
  const actions=canCreate?`<button class="button button-primary" data-create="campaign">＋ Nova campanha</button>`:'';
  return `<section class="page"><div class="page-head"><div><h1>Campanhas</h1></div><div class="page-head-actions">${actions}</div></div>
    ${data.campaigns.length?`<div class="campaign-grid">${data.campaigns.slice().sort(byUpdated).map(c=>campaignCard(c,data)).join('')}</div>`:empty('Nenhuma campanha cadastrada',canCreate?'Crie uma campanha para começar a organizar fichas e sessões.':'Quando o administrador associar você a uma campanha, ela aparecerá aqui.',canCreate?`<button class="button button-primary" data-create="campaign">＋ Criar campanha</button>`:'')}</section>`;
}

function renderCampaignDetail(data,id) {
  const c=data.campaigns.find(x=>x.id===id);
  if(!c) return `<section class="page">${empty('Campanha não encontrada','Ela pode ter sido removida.',`<a href="#/campanhas" class="button">Ver campanhas</a>`)}</section>`;
  const chars=data.characters.filter(ch=>(ch.campaignIds||[]).includes(c.id));
  const sessions=data.sessions.filter(session=>session.campaignId===c.id).sort(byDate);
  const cover=safeImage(c.cover);
  const campaignArt=cover?`<img src="${cover}" alt="Capa de ${esc(c.name)}">`:`<div class="campaign-art-placeholder" aria-hidden="true"><span>${initials(c.name)}</span></div>`;
  const managerActions=mayManageCampaign(c)?`<button class="button button-sm" data-action="edit-campaign" data-id="${esc(c.id)}">Editar</button><button class="button button-sm button-danger" data-action="delete-campaign" data-id="${esc(c.id)}">Excluir</button>`:'';
  const memberAction=currentProfile.role==='admin'?`<button class="button button-sm" data-action="manage-members" data-id="${esc(c.id)}">Participantes</button>`:'';
  return `<section class="page campaign-detail-page">
    <div class="campaign-detail-banner">
      <div class="campaign-detail-cover">${campaignArt}</div>
      <div class="campaign-detail-copy"><h1>${esc(c.name)}</h1><p class="detail-text">${esc(c.description||'Nenhuma descrição registrada.')}</p>
        <div class="campaign-detail-meta"><span>Criada em ${fmtDate(c.createdAt,{dateStyle:'medium'})}</span><span>${chars.length} ${chars.length===1?'ficha':'fichas'}</span><span>${sessions.length} ${sessions.length===1?'sessão':'sessões'}</span></div>
      </div>
      <div class="campaign-detail-actions">${memberAction}${managerActions}</div>
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
    <section class="panel campaign-board-panel"><div class="panel-heading"><h2>Quadro de planejamento</h2><span class="tag gray">${getState().boards[c.id]?.cards?.length||0} cartões</span></div><p class="detail-text">O quadro é independente das sessões e sincronizado com o Supabase.</p><a class="button button-primary" href="#/planejamento/${encodeURIComponent(c.id)}">Abrir quadro →</a></section>
  </section>`;
}

function linkedCharacterCard(ch,campaignId) {
  const attrs=ch.attributes||{};
  const stats=[['NEX',ch.nex||ch.level],['PV',ch.pv],['PE',ch.pe],['SAN',ch.san],['Defesa',ch.defense]];
  return `<article class="linked-character-card">
    <div class="linked-character-heading">${portraitMarkup(ch,'linked-character-portrait')}<div class="linked-character-title"><h3>${esc(ch.name)}</h3><p>${esc([ch.origin,ch.className,ch.path].filter(Boolean).join(' · ')||'Classe não informada')}</p>${ch.playerName?`<span>Jogador: ${esc(ch.playerName)}</span>`:''}</div>
      <div class="linked-character-actions"><a class="button button-sm" href="#/personagem/${encodeURIComponent(ch.id)}">Ficha completa →</a>${mayManageCharacter(ch)?`<button class="button button-sm" data-action="unlink-character" data-id="${esc(ch.id)}" data-campaign="${esc(campaignId)}">Desassociar</button>`:''}</div>
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

function renderCharacterDetail(data,id) { const ch=data.characters.find(x=>x.id===id); if(!ch) return `<section class="page">${empty('Ficha não encontrada','Ela pode ter sido removida.',`<a href="#/personagens" class="button">Ver biblioteca</a>`)}</section>`; const linked=data.campaigns.filter(c=>(ch.campaignIds||[]).includes(c.id)); const attributes=ch.attributes||{}; return `<section class="page">${header(esc(ch.name),'FICHA DE PERSONAGEM',`${esc(ch.origin||'Origem não informada')} · ${esc(ch.className||'Classe não informada')} · ${esc(ch.path||'Trilha não informada')}`,`<button class="button" data-action="edit-character" data-id="${esc(ch.id)}">Editar ficha</button><button class="button button-danger" data-action="delete-character" data-id="${esc(ch.id)}">Excluir ficha</button>`)}<div class="notice">Referência: Livro Básico de Ordem Paranormal RPG, versão 1.3. Os valores e regras são registros manuais; esta aplicação não calcula derivados.</div><div class="metrics">${stat('NEX / nível',esc(ch.nex||ch.level||'—'))}${stat('PV',esc(ch.pv||'—'))}${stat('PE',esc(ch.pe||'—'))}</div><div class="content-grid"><section class="panel"><h2>Atributos</h2><div class="rule-fields">${['Agilidade','Força','Intelecto','Presença','Vigor'].map(a=>`<div class="field"><label>${a}</label><input value="${esc(attributes[a]||'')}" readonly aria-label="${a}, anotação manual"></div>`).join('')}</div><div class="detail-columns"><div><h3>Defesa / SAN</h3><p class="detail-text">Defesa: ${esc(ch.defense||'—')} · SAN: ${esc(ch.san||'—')}</p><h3>Patente / progressão</h3><p class="detail-text">${esc(ch.rank||'—')} · ${esc(ch.progress||'—')}</p></div><div><h3>Origem · Classe · Trilha</h3><p class="detail-text">${esc([ch.origin,ch.className,ch.path].filter(Boolean).join(' · ')||'Não informado')}</p></div></div></section><section class="panel"><h2>Perícias</h2><p class="detail-text">${esc(ch.skills||'Nenhuma anotação.')}</p><h2 style="margin-top:20px">Habilidades e poderes</h2><p class="detail-text">${esc(ch.abilities||'Nenhuma anotação.')}</p></section><section class="panel"><h2>Inventário e equipamentos</h2><p class="detail-text">${esc(ch.inventory||'Nenhuma anotação.')}</p></section><section class="panel"><h2>Notas</h2><p class="detail-text">${esc(ch.notes||'Nenhuma anotação.')}</p></section></div><section class="panel" style="margin-top:16px"><div class="panel-heading"><h2>Campanhas associadas</h2><span class="tag gray">${linked.length} ASSOCIAÇÃO(ÕES)</span></div>${linked.length?`<div class="chip-list">${linked.map(c=>`<a class="tag" href="#/campanha/${encodeURIComponent(c.id)}">${esc(c.name)}</a>`).join('')}</div>`:empty('Ficha independente','Esta ficha ainda não está associada a nenhuma campanha.',`<button class="button button-sm" data-action="edit-character" data-id="${esc(ch.id)}">Associar a campanha</button>`)}</section></section>`; }
function renderSessions(data) { const list=data.sessions.slice().sort(byDate); return `<section class="page">${header('Sessões','CADERNO DE SESSÕES','Registre data, estado e anotações sem conteúdo narrativo automático.',`<button class="button button-primary" data-create="session">＋ Nova sessão</button>`)}<div class="tabs"><span class="active">Todas · ${list.length}</span><span>Planejadas · ${list.filter(s=>s.status==='Planejada').length}</span><span>Realizadas · ${list.filter(s=>s.status==='Realizada').length}</span><span>Canceladas · ${list.filter(s=>s.status==='Cancelada').length}</span></div>${list.length?`<div class="card-list">${list.map(s=>`<article class="record-card"><div class="record-main"><h3>${esc(s.title)}</h3><p>${esc(data.campaigns.find(c=>c.id===s.campaignId)?.name||'Campanha removida')} · ${esc(s.description||'Sem descrição.')}</p><div class="record-meta"><span>${s.date?fmtDate(s.date,{dateStyle:'medium',timeStyle:'short'}):'DATA A DEFINIR'}</span><span>${(s.notes||'').length} CARACTERES DE ANOTAÇÕES</span></div></div><div class="record-actions"><select class="status-select" data-session-status="${esc(s.id)}" aria-label="Estado da sessão">${['Planejada','Realizada','Cancelada'].map(v=>`<option ${s.status===v?'selected':''}>${v}</option>`).join('')}</select><button class="button button-sm" data-action="edit-session" data-id="${esc(s.id)}">Editar</button><button class="button button-sm" data-action="delete-session" data-id="${esc(s.id)}">Excluir</button></div></article>`).join('')}</div>`:empty('Nenhuma sessão cadastrada','Crie uma sessão vinculada a uma campanha existente.',data.campaigns.length?`<button class="button button-primary" data-create="session">＋ Criar sessão</button>`:`<button class="button" data-create="campaign">Criar uma campanha primeiro</button>`)}</section>`; }
function renderPlanning(data) {
  const actions=`<a href="#/campanhas" class="button">Ver campanhas</a>`;
  return `<section class="page"><div class="page-head"><div><h1>Planejamento</h1></div><div class="page-head-actions">${actions}</div></div>
    ${data.campaigns.length?`<div class="planning-grid">${data.campaigns.slice().sort(byUpdated).map(c=>{const board=data.boards[c.id]||{cards:[],paths:[],links:[]};const cardWord=board.cards.length===1?'cartão':'cartões';const linkWord=board.links.length===1?'conexão':'conexões';return `<a class="planning-card" href="#/planejamento/${encodeURIComponent(c.id)}">${boardPreviewMarkup(board)}<div class="planning-card-content"><h2>${esc(c.name)}</h2><p>${board.cards.length} ${cardWord} · ${board.links.length} ${linkWord}</p><span class="tag gray">Abrir quadro →</span></div></a>`;}).join('')}</div>`:empty('Nenhuma campanha para planejar','Crie uma campanha para ter um quadro próprio.',`<button class="button button-primary" data-create="campaign">＋ Criar campanha</button>`)}</section>`;
}

function renderAccessList(profiles) {
  if (!profiles.length) return empty('Nenhuma conta cadastrada','Crie o primeiro acesso pelo formulário.');
  return profiles.map(profile=>`<article class="access-user-card"><div class="access-user-identity"><h3>${esc(profile.display_name||profile.username)}</h3><p>Nickname: <strong>${esc(profile.username)}</strong></p><div class="access-user-meta"><span class="tag ${profile.role==='admin'?'red':profile.role==='master'?'green':'gray'}">${profile.role==='admin'?'Administrador':profile.role==='master'?'Mestre':'Jogador'}</span><span class="tag gray">Criado em ${fmtDate(profile.created_at,{dateStyle:'medium'})}</span></div></div><form class="access-reset-form" data-admin-reset><input type="hidden" name="username" value="${esc(profile.username)}"><input type="password" name="password" autocomplete="new-password" minlength="12" maxlength="1024" placeholder="Nova senha (mín. 12 caracteres)" aria-label="Nova senha para ${esc(profile.username)}" required><button class="button button-sm" type="submit">Redefinir</button></form></article>`).join('');
}

function renderAccesses(profiles=[]) {
  return `<section class="page"><div class="page-head"><div><h1>Acessos</h1><p class="lede">Contas por nickname, sem cadastro público. Somente o administrador cria acessos e redefine senhas.</p></div></div><div class="access-layout"><section class="panel access-create-panel"><h2>Criar acesso</h2><p class="detail-text">A senha inicial precisa ter pelo menos 12 caracteres. Compartilhe-a fora do site e oriente a troca futura.</p><form id="admin-create-form" class="access-create-form"><label class="field"><span>Nickname</span><input name="username" type="text" minlength="3" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}" autocomplete="off" autocapitalize="none" required></label><label class="field"><span>Nome exibido</span><input name="display_name" type="text" maxlength="80" autocomplete="off"></label><label class="field"><span>Perfil</span><select name="role" required><option value="player">Jogador</option><option value="master">Mestre</option></select></label><label class="field"><span>Senha inicial</span><input name="password" type="password" minlength="12" maxlength="1024" autocomplete="new-password" required></label><button class="button button-primary" type="submit">Criar conta</button></form></section><section class="panel"><div class="panel-heading"><h2>Contas cadastradas</h2><span class="tag gray">${profiles.length}</span></div><div class="access-list" id="access-user-list">${renderAccessList(profiles)}</div></section></div></section>`;
}

async function refreshProfiles() {
  if (currentProfile?.role!=='admin' || !currentClient) return;
  try {
    profileCache=await listProfiles(currentClient);
    const list=main.querySelector('#access-user-list');
    if(list) list.innerHTML=renderAccessList(profileCache);
  } catch(error) { toast(error.message,'error'); }
}

async function openCampaignMembers(campaignId) {
  if (currentProfile?.role!=='admin') return;
  try {
    const [profiles,members]=await Promise.all([listProfiles(currentClient),listCampaignMembers(currentClient,campaignId)]);
    profileCache=profiles;
    const selected=new Set(members.map(member=>member.user_id));
    modalBody.innerHTML=`<h2 id="modal-title" class="modal-title">Participantes da campanha</h2><p class="modal-intro">Selecione quem pode consultar esta campanha, suas fichas associadas, sessões e quadro.</p><form id="campaign-members-form" data-campaign-id="${esc(campaignId)}"><div class="member-list">${profiles.map(profile=>`<label class="member-choice"><input type="checkbox" name="memberIds" value="${esc(profile.user_id)}" ${selected.has(profile.user_id)?'checked':''}><span><strong>${esc(profile.display_name||profile.username)}</strong><small>${esc(profile.username)} · ${profile.role==='master'?'Mestre':profile.role==='admin'?'Administrador':'Jogador'}</small></span></label>`).join('')}</div><div class="form-actions"><button class="button" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary" type="submit">Salvar participantes</button></div></form>`;
    if(!modal.open) modal.showModal();
  } catch(error) { toast(error.message,'error'); }
}

async function migrateLegacyData() {
  if(currentProfile?.role!=='admin'||!cloudSnapshot||!workspaceIsEmpty(cloudSnapshot)) { toast('A migração automática só está disponível quando o espaço remoto está vazio.','warning'); return; }
  const source=structuredClone(legacySnapshot);
  const counts=`${source.campaigns.length} campanha(s), ${source.characters.length} ficha(s), ${source.sessions.length} sessão(ões)`;
  if(!confirm(`Migrar ${counts} deste navegador para o Supabase? Os dados remotos atuais estão vazios; o arquivo local original será preservado.`)) return;
  const now=new Date().toISOString();
  source.campaigns=source.campaigns.map(item=>({...item,createdBy:item.createdBy||currentUser.id,createdAt:item.createdAt||now,updatedAt:item.updatedAt||now}));
  source.characters=source.characters.map(item=>({...item,ownerId:item.ownerId||currentUser.id,createdBy:item.createdBy||currentUser.id,createdAt:item.createdAt||now,updatedAt:item.updatedAt||now}));
  source.sessions=source.sessions.map(item=>({...item,createdBy:item.createdBy||currentUser.id,createdAt:item.createdAt||now,updatedAt:item.updatedAt||now}));
  try {
    await syncWorkspace(currentClient,currentUser,cloudSnapshot,source);
    cloudSnapshot=structuredClone(source);
    try { replaceState(source); } catch { replaceState(source,{persist:false}); }
    render();
    toast(`Migração concluída: ${counts}.`);
  } catch(error) { toast(`A migração não foi concluída: ${error.message}`,'error'); }
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
  openModal(ch.id?'Editar ficha':'Nova ficha','Campos e valores são anotados manualmente; não há cálculos automáticos de regras.',`<input type="hidden" name="id" value="${esc(ch.id||'')}"><div class="form-grid">${valueField('name','Nome do personagem *',ch.name||'','text','required maxlength="100"')}${valueField('playerName','Jogador(a)',ch.playerName||'')}${valueField('portrait','Imagem do personagem/jogador (URL, opcional)',ch.portrait||'','url','placeholder="https://…"')}${valueField('playerNote','Anotação de jogador (opcional)',ch.playerNote||'')}${valueField('origin','Origem',ch.origin||'')}${valueField('className','Classe',ch.className||'')}${valueField('path','Trilha',ch.path||'')}${valueField('nex','NEX / nível',ch.nex||'')}${valueField('rank','Patente',ch.rank||'')}${valueField('pv','PV',ch.pv||'','text')}${valueField('pe','PE',ch.pe||'','text')}${valueField('san','SAN',ch.san||'','text')}${valueField('defense','Defesa',ch.defense||'','text')}${attr}${textareaField('skills','Perícias',''+(ch.skills||''),'Anote valores ou treinamento conforme a versão usada pela mesa.')}${textareaField('abilities','Habilidades e poderes',ch.abilities||'')}${textareaField('inventory','Inventário e equipamentos',ch.inventory||'')}${textareaField('progress','Progressão / outros campos',ch.progress||'')}${textareaField('notes','Notas',ch.notes||'')}${campaigns}</div>`);
}

function sessionForm(s={},preselected='') {
  const campaigns=getState().campaigns.filter(mayManageCampaign);
  if(!campaigns.length){toast('Crie ou selecione uma campanha que você possa gerenciar antes de registrar uma sessão.','warning');return;}
  openModal(s.id?'Editar sessão':'Nova sessão','O quadro de planejamento não é duplicado por sessão.',`<input type="hidden" name="id" value="${esc(s.id||'')}"><div class="form-grid"><div class="field"><label for="f-campaignId">Campanha *</label><select id="f-campaignId" name="campaignId" required>${campaigns.map(c=>`<option value="${esc(c.id)}" ${(s.campaignId||preselected)===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>${valueField('title','Título *',s.title||'','text','required maxlength="140"')}${valueField('date','Data e horário (opcionais)',s.date||'','datetime-local')}${textareaField('description','Descrição',s.description||'')}<div class="field"><label for="f-status">Estado</label><select id="f-status" name="status">${['Planejada','Realizada','Cancelada'].map(v=>`<option ${(s.status||'Planejada')===v?'selected':''}>${v}</option>`).join('')}</select></div>${textareaField('notes','Anotações',s.notes||'')}</div>`);
}

function handleCreate(type,campaignId='') {
  createMenu.hidden=true; createToggle.setAttribute('aria-expanded','false');
  if((type==='campaign'||type==='session')&&currentProfile?.role==='player'){toast('Essa ação é restrita a mestres e ao administrador.','warning');return;}
  if(type==='campaign') campaignForm();
  else if(type==='character') characterForm({},campaignId);
  else if(type==='session') { if(!getState().campaigns.some(mayManageCampaign)){toast('Você não tem uma campanha com permissão de gerenciamento.','warning');return;} sessionForm({},campaignId); }
  else if(type==='board') { const data=getState(); if(!data.campaigns.length){toast('Crie uma campanha antes de abrir um quadro.','warning');return;} location.hash=data.campaigns.length===1?`#/planejamento/${encodeURIComponent(data.campaigns[0].id)}`:'#/planejamento'; }
}

document.addEventListener('click',event=>{
  const create=event.target.closest('[data-create]'); if(create){event.preventDefault(); handleCreate(create.dataset.create,create.dataset.campaign||'');return;}
  if(event.target.closest('#create-toggle')){createMenu.hidden=!createMenu.hidden;createToggle.setAttribute('aria-expanded',String(!createMenu.hidden));return;}
  if(!event.target.closest('.create-wrap')){createMenu.hidden=true;createToggle.setAttribute('aria-expanded','false');}
  const button=event.target.closest('[data-action]'); if(!button)return;
  if(createMenu.contains(button)){createMenu.hidden=true;createToggle.setAttribute('aria-expanded','false');}
  const action=button.dataset.action, data=getState(), id=button.dataset.id;
  if(action==='close-modal'){modal.close();return;}
  if(action==='logout'){void logoutUser();return;}
  if(action==='migrate-local'){void migrateLegacyData();return;}
  if(action==='manage-members'){void openCampaignMembers(id);return;}
  if(action==='edit-campaign'){const c=data.campaigns.find(x=>x.id===id);if(c&&mayManageCampaign(c))campaignForm(c);return;}
  if(action==='edit-character'){const c=data.characters.find(x=>x.id===id);if(c&&mayManageCharacter(c))characterForm(c);return;}
  if(action==='edit-session'){const s=data.sessions.find(x=>x.id===id);if(s&&mayManageCampaign(data.campaigns.find(c=>c.id===s.campaignId)))sessionForm(s);return;}
  if(action==='delete-campaign'){const c=data.campaigns.find(x=>x.id===id);if(!c||!mayManageCampaign(c))return;const sc=data.sessions.filter(s=>s.campaignId===id).length;const chars=data.characters.filter(ch=>(ch.campaignIds||[]).includes(id)).length;const approved=confirm(`Excluir a campanha “${c.name}”? Isso removerá ${sc} sessão(ões) e o quadro de planejamento. As ${chars} ficha(s) associada(s) serão preservadas e apenas desassociadas.`);if(!approved)return;const ok=commitAndSync(d=>{d.campaigns=d.campaigns.filter(x=>x.id!==id);d.sessions=d.sessions.filter(s=>s.campaignId!==id);delete d.boards[id];d.characters=d.characters.map(ch=>({...ch,campaignIds:(ch.campaignIds||[]).filter(cid=>cid!==id)}));});if(ok){toast('Campanha removida. Fichas originais preservadas.');location.hash='#/campanhas';}else toast('Não foi possível excluir a campanha.','error');return;}
  if(action==='delete-character'){const ch=data.characters.find(x=>x.id===id);if(!ch||!mayManageCharacter(ch)||!confirm(`Excluir a ficha de “${ch.name}”? As associações com campanhas serão removidas, mas as campanhas continuarão. Esta ação não pode ser desfeita.`))return;const ok=commitAndSync(d=>{d.characters=d.characters.filter(x=>x.id!==id);});ok?(toast('Ficha excluída.'),location.hash='#/personagens'):toast('Não foi possível excluir a ficha.','error');return;}
  if(action==='delete-session'){const s=data.sessions.find(x=>x.id===id);if(!s||!mayManageCampaign(data.campaigns.find(c=>c.id===s.campaignId))||!confirm(`Excluir a sessão “${s.title}”? Esta ação não pode ser desfeita.`))return;commitAndSync(d=>{d.sessions=d.sessions.filter(x=>x.id!==id);})?toast('Sessão excluída.'):toast('Não foi possível excluir a sessão.','error');render();return;}
  if(action==='unlink-character'){const cid=button.dataset.campaign;const target=data.characters.find(x=>x.id===id);if(!target||!mayManageCharacter(target))return;commitAndSync(d=>{const ch=d.characters.find(x=>x.id===id);if(ch)ch.campaignIds=(ch.campaignIds||[]).filter(x=>x!==cid);})?toast('Ficha desassociada; os dados originais foram mantidos.'):toast('Falha ao desassociar.','error');render();return;}
  if(action==='export'){downloadArchive();return;}
  if(action==='import'){document.querySelector('#archive-file').click();return;}
});

document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form.id==='login-form'){
    event.preventDefault();if(!form.reportValidity())return;
    const fd=new FormData(form),username=String(fd.get('username')||''),password=String(fd.get('password')||'');
    const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
    try{const auth=await signInWithNickname(username,password);currentClient=auth.client;await activateSession(auth.client,auth.user,auth.profile);}
    catch(error){const message=error.message;if(currentClient)await currentClient.auth.signOut().catch(()=>{});clearSignedInState();setTimeout(()=>renderLogin(message,username),0);}
    return;
  }
  if(form.id==='admin-create-form'){
    event.preventDefault();if(currentProfile?.role!=='admin'||!form.reportValidity())return;
    const fd=new FormData(form),button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
    try{await requestAdminOperation(currentClient,{action:'create',username:String(fd.get('username')||''),display_name:String(fd.get('display_name')||''),role:String(fd.get('role')||''),password:String(fd.get('password')||'')});form.reset();await refreshProfiles();toast('A conta foi criada. Entregue a senha inicial ao usuário por um canal privado.');}
    catch(error){toast(error.message,'error');}
    finally{if(button)button.disabled=false;}
    return;
  }
  if(form.matches('[data-admin-reset]')){
    event.preventDefault();if(currentProfile?.role!=='admin'||!form.reportValidity())return;
    const fd=new FormData(form),button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
    try{await requestAdminOperation(currentClient,{action:'reset-password',username:String(fd.get('username')||''),password:String(fd.get('password')||'')});form.reset();toast('Senha redefinida. Compartilhe a nova credencial em canal privado.');}
    catch(error){toast(error.message,'error');}
    finally{if(button)button.disabled=false;}
    return;
  }
  if(form.id==='campaign-members-form'){
    event.preventDefault();if(currentProfile?.role!=='admin')return;
    const selected=[...form.querySelectorAll('[name="memberIds"]:checked')].map(input=>input.value),button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
    try{await replaceCampaignMembers(currentClient,form.dataset.campaignId,profileCache,selected);modal.close();toast('Participantes atualizados.');}
    catch(error){toast(error.message,'error');}
    finally{if(button)button.disabled=false;}
    return;
  }
});

document.addEventListener('submit',event=>{
  if(event.target.getAttribute('id')!=='entity-form')return;
  event.preventDefault();const form=event.target; if(!form.reportValidity())return;
  const fd=new FormData(form);const id=String(fd.get('id')||'');const now=new Date().toISOString();let ok=false;let success='Alterações salvas.';
  if(form.querySelector('#f-name') && form.querySelector('[name="description"]') && !form.querySelector('[name="campaignId"]')) {
    const name=String(fd.get('name')||'').trim();const cover=String(fd.get('cover')||'').trim();if(cover&&!validImageUrl(cover)){toast('A capa deve usar uma URL HTTP ou HTTPS válida.','error');return;}
    ok=commitAndSync(d=>{const old=d.campaigns.find(x=>x.id===id);const record={id:id||uid(),name,description:String(fd.get('description')||'').trim(),cover,createdAt:old?.createdAt||now,updatedAt:now,createdBy:old?.createdBy||currentUser.id,membershipRole:old?.membershipRole||''};const index=d.campaigns.findIndex(x=>x.id===id);if(index>=0)d.campaigns[index]=record;else{d.campaigns.push(record);d.boards[record.id]={campaignId:record.id,cards:[],paths:[],links:[],updatedAt:now};}});success=id?'Campanha atualizada.':'Campanha criada. O quadro está vazio.';
  } else if(form.querySelector('[name="attr_0"]')) {
    const old=getState().characters.find(x=>x.id===id);const portrait=String(fd.get('portrait')||'').trim();if(portrait&&!validImageUrl(portrait)){toast('A imagem deve usar uma URL HTTP ou HTTPS válida.','error');return;}const attributes={};['Agilidade','Força','Intelecto','Presença','Vigor'].forEach((name,i)=>attributes[name]=String(fd.get(`attr_${i}`)||'').trim());const campaignIds=fd.getAll('campaignIds').map(String);
    const record={id:id||uid(),name:String(fd.get('name')||'').trim(),playerNote:String(fd.get('playerNote')||'').trim(),playerName:String(fd.get('playerName')||'').trim(),portrait,origin:String(fd.get('origin')||'').trim(),className:String(fd.get('className')||'').trim(),path:String(fd.get('path')||'').trim(),nex:String(fd.get('nex')||'').trim(),rank:String(fd.get('rank')||'').trim(),pv:String(fd.get('pv')||'').trim(),pe:String(fd.get('pe')||'').trim(),san:String(fd.get('san')||'').trim(),defense:String(fd.get('defense')||'').trim(),attributes,skills:String(fd.get('skills')||'').trim(),abilities:String(fd.get('abilities')||'').trim(),inventory:String(fd.get('inventory')||'').trim(),progress:String(fd.get('progress')||'').trim(),notes:String(fd.get('notes')||'').trim(),campaignIds,createdAt:old?.createdAt||now,updatedAt:now,ownerId:old?.ownerId||currentUser.id,createdBy:old?.createdBy||currentUser.id};
    ok=commitAndSync(d=>{const index=d.characters.findIndex(x=>x.id===id);if(index>=0)d.characters[index]=record;else d.characters.push(record);});success=id?'Ficha atualizada.':'Ficha criada.';
  } else if(form.querySelector('[name="campaignId"]')) {
    const old=getState().sessions.find(x=>x.id===id);const record={id:id||uid(),campaignId:String(fd.get('campaignId')),title:String(fd.get('title')||'').trim(),date:String(fd.get('date')||''),description:String(fd.get('description')||'').trim(),status:String(fd.get('status')||'Planejada'),notes:String(fd.get('notes')||'').trim(),createdAt:old?.createdAt||now,updatedAt:now,createdBy:old?.createdBy||currentUser.id};
    if(!['Planejada','Realizada','Cancelada'].includes(record.status)){toast('Estado inválido.','error');return;}
    ok=commitAndSync(d=>{if(!d.campaigns.some(c=>c.id===record.campaignId))throw new Error('Campanha não encontrada.');const index=d.sessions.findIndex(x=>x.id===id);if(index>=0)d.sessions[index]=record;else d.sessions.push(record);});success=id?'Sessão atualizada.':'Sessão criada.';
  }
  if(ok){modal.close();toast(success);render();}else toast('Não foi possível salvar. Verifique o armazenamento local e tente novamente.','error');
},true);

document.addEventListener('change',event=>{
  const target=event.target;
  if(target.matches('[data-session-status]')){const id=target.dataset.sessionStatus;const ok=commitAndSync(d=>{const s=d.sessions.find(x=>x.id===id);if(s){s.status=target.value;s.updatedAt=new Date().toISOString();}});if(ok){toast('Estado da sessão atualizado.');render();}else toast('Falha ao salvar o estado da sessão.','error');}
  if(target.id==='archive-file'&&target.files?.[0]){const file=target.files[0];if(!confirm('Importar este arquivo substituirá os registros locais atuais. Exporte uma cópia antes de continuar. Os registros remotos também serão sincronizados. Prosseguir?')){target.value='';return;}file.text().then(text=>{if(importArchive(text)){commitAndSync(()=>{});toast('Arquivo importado; sincronização iniciada.');render();}else toast('Não foi possível confirmar a gravação do arquivo.','error');}).catch(error=>toast(`Falha ao importar o arquivo: ${error.message}`,'error')).finally(()=>target.value='');}
});

function downloadArchive(){const blob=new Blob([exportArchive()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`pela-realidade-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('Arquivo JSON exportado para este dispositivo.');}
function safeImage(url){if(!String(url??'').trim())return '';try{const u=new URL(url,location.href);return ['http:','https:'].includes(u.protocol)?esc(u.href):'';}catch{return '';}}
function validImageUrl(url){try{return ['http:','https:'].includes(new URL(url).protocol);}catch{return false;}}
function byUpdated(a,b){return (b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||'');}
function byDate(a,b){return (a.date||'9999').localeCompare(b.date||'9999');}

if(!document.querySelector('#archive-file')){const file=document.createElement('input');file.type='file';file.id='archive-file';file.accept='.json,application/json';file.hidden=true;document.body.append(file);}
window.addEventListener('hashchange',render);
window.addEventListener('storage',()=>{loadState();render();if(cloudReady)commitAndSync(()=>{});toast('O arquivo foi atualizado em outra aba.','warning');});
subscribe((_state,error)=>{if(error)toast(`Armazenamento: ${error}`,'error');});
if(!location.hash) location.hash='#/';
render();
void bootAuth();
