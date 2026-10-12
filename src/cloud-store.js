const EMPTY = () => ({ version: 1, campaigns: [], characters: [], sessions: [], boards: {} });

function fail(error, context) {
  if (error) throw new Error(`${context}: ${error.message || 'erro remoto'}`);
}
function array(value) { return Array.isArray(value) ? value : []; }
function copy(value) { return structuredClone(value); }
function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function indexById(rows) { return new Map(rows.map(row => [row.id, row])); }

export async function loadWorkspace(client, userId) {
  const [campaignResult, memberResult, characterResult, associationResult, sessionResult, boardResult] = await Promise.all([
    client.from('campaigns').select('*').order('updated_at', { ascending: false }),
    client.from('campaign_members').select('campaign_id, user_id, role'),
    client.from('characters').select('*').order('updated_at', { ascending: false }),
    client.from('character_campaigns').select('character_id, campaign_id'),
    client.from('sessions').select('*').order('updated_at', { ascending: false }),
    client.from('planning_boards').select('campaign_id, payload, updated_at')
  ]);
  fail(campaignResult.error, 'Campanhas');
  fail(memberResult.error, 'Participantes');
  fail(characterResult.error, 'Personagens');
  fail(associationResult.error, 'Vínculos de personagens');
  fail(sessionResult.error, 'Sessões');
  fail(boardResult.error, 'Quadros');

  const membership = new Map((memberResult.data || [])
    .filter(row => row.user_id === userId)
    .map(row => [row.campaign_id, row.role]));
  const associations = new Map();
  for (const row of associationResult.data || []) {
    if (!associations.has(row.character_id)) associations.set(row.character_id, []);
    associations.get(row.character_id).push(row.campaign_id);
  }
  const campaigns = (campaignResult.data || []).map(row => ({
    id: row.id, name: row.name, description: row.description || '', cover: row.cover_url || '',
    createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by,
    membershipRole: membership.get(row.id) || ''
  }));
  const characters = (characterResult.data || []).map(row => ({
    id: row.id, name: row.name, playerNote: row.player_note || '', playerName: row.player_name || '',
    portrait: row.portrait_url || '', origin: row.origin || '', className: row.class_name || '', path: row.path || '',
    nex: row.nex || '', rank: row.rank || '', pv: row.pv || '', pe: row.pe || '', san: row.san || '', defense: row.defense || '',
    attributes: row.attributes || {}, skills: row.skills || '', abilities: row.abilities || '', inventory: row.inventory || '',
    progress: row.progress || '', notes: row.notes || '', campaignIds: associations.get(row.id) || [],
    createdAt: row.created_at, updatedAt: row.updated_at, ownerId: row.owner_id, createdBy: row.created_by
  }));
  const sessions = (sessionResult.data || []).map(row => ({
    id: row.id, campaignId: row.campaign_id, title: row.title, date: row.session_at || '',
    description: row.description || '', status: row.status, notes: row.notes || '',
    createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by
  }));
  const boards = {};
  for (const row of boardResult.data || []) {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    boards[row.campaign_id] = {
      campaignId: row.campaign_id,
      cards: array(payload.cards), paths: array(payload.paths), links: array(payload.links),
      updatedAt: row.updated_at
    };
  }
  return { ...EMPTY(), campaigns, characters, sessions, boards };
}

export function workspaceIsEmpty(state) {
  return !state.campaigns.length && !state.characters.length && !state.sessions.length
    && !Object.keys(state.boards || {}).length;
}

function campaignRow(item, userId) {
  return {
    id: item.id, name: item.name, description: item.description || '', cover_url: item.cover || null,
    created_by: item.createdBy || userId, created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString()
  };
}
function characterRow(item, userId) {
  return {
    id: item.id, owner_id: item.ownerId || userId, created_by: item.createdBy || userId,
    name: item.name, player_note: item.playerNote || '', player_name: item.playerName || '',
    portrait_url: item.portrait || null, origin: item.origin || '', class_name: item.className || '', path: item.path || '',
    nex: item.nex || '', rank: item.rank || '', pv: item.pv || '', pe: item.pe || '', san: item.san || '', defense: item.defense || '',
    attributes: item.attributes || {}, skills: item.skills || '', abilities: item.abilities || '', inventory: item.inventory || '',
    progress: item.progress || '', notes: item.notes || '',
    created_at: item.createdAt || new Date().toISOString(), updated_at: item.updatedAt || new Date().toISOString()
  };
}
function sessionRow(item, userId) {
  return {
    id: item.id, campaign_id: item.campaignId, created_by: item.createdBy || userId,
    title: item.title, session_at: item.date || null, description: item.description || '',
    status: item.status || 'Planejada', notes: item.notes || '',
    created_at: item.createdAt || new Date().toISOString(), updated_at: item.updatedAt || new Date().toISOString()
  };
}
function boardRow(campaignId, board) {
  return {
    campaign_id: campaignId,
    payload: { cards: array(board.cards), paths: array(board.paths), links: array(board.links) },
    updated_at: board.updatedAt || new Date().toISOString()
  };
}
async function insertRows(client, table, rows) {
  if (!rows.length) return;
  const { error } = await client.from(table).insert(rows);
  fail(error, `Inserção em ${table}`);
}
async function updateRows(client, table, rows, keyFields) {
  for (const row of rows) {
    let query=client.from(table).update(row);
    for (const field of keyFields) query=query.eq(field,row[field]);
    const { data, error }=await query.select(keyFields[0]);
    fail(error, `Atualização de ${table}`);
    if (!data?.length) throw new Error(`Atualização de ${table}: registro não encontrado ou sem permissão.`);
  }
}
function rowKey(row,keyFields) { return keyFields.map(field=>String(row[field]??'')).join('\u0000'); }
async function saveChangedRows(client,table,rows,previousKeys,keyFields) {
  const existing=new Set([...previousKeys].map(key=>String(key)));
  const toInsert=[],toUpdate=[];
  for(const row of rows) (existing.has(rowKey(row,keyFields))?toUpdate:toInsert).push(row);
  await insertRows(client,table,toInsert);
  await updateRows(client,table,toUpdate,keyFields);
}
async function removeBy(client, table, field, value, secondField, secondValue) {
  let query = client.from(table).delete().eq(field, value);
  if (secondField) query = query.eq(secondField, secondValue);
  const { error } = await query;
  fail(error, `Remoção de ${table}`);
}

export async function syncWorkspace(client, user, previous, next) {
  const oldCampaigns = indexById(previous.campaigns || []);
  const newCampaigns = indexById(next.campaigns || []);
  const oldCharacters = indexById(previous.characters || []);
  const newCharacters = indexById(next.characters || []);
  const oldSessions = indexById(previous.sessions || []);
  const newSessions = indexById(next.sessions || []);

  const campaignsToSave = [...newCampaigns.values()].filter(row => !equal(oldCampaigns.get(row.id), row));
  const charactersToSave = [...newCharacters.values()].filter(row => !equal(oldCharacters.get(row.id), row));
  const sessionsToSave = [...newSessions.values()].filter(row => !equal(oldSessions.get(row.id), row));
  await saveChangedRows(client, 'campaigns', campaignsToSave.map(row => campaignRow(row, user.id)), oldCampaigns.keys(), ['id']);
  await saveChangedRows(client, 'characters', charactersToSave.map(row => characterRow(row, user.id)), oldCharacters.keys(), ['id']);
  await saveChangedRows(client, 'sessions', sessionsToSave.map(row => sessionRow(row, user.id)), oldSessions.keys(), ['id']);

  const oldLinks = new Set();
  const newLinks = new Set();
  for (const item of previous.characters || []) for (const campaignId of item.campaignIds || []) oldLinks.add(`${item.id}\u0000${campaignId}`);
  for (const item of next.characters || []) for (const campaignId of item.campaignIds || []) newLinks.add(`${item.id}\u0000${campaignId}`);
  const linksToAdd = [...newLinks].filter(key => !oldLinks.has(key)).map(key => {
    const [character_id, campaign_id] = key.split('\u0000');
    return { character_id, campaign_id };
  });
  await insertRows(client, 'character_campaigns', linksToAdd);

  const oldBoards = previous.boards || {};
  const newBoards = next.boards || {};
  const boardsToSave = Object.entries(newBoards).filter(([id, row]) => !equal(oldBoards[id], row));
  await saveChangedRows(client, 'planning_boards', boardsToSave.map(([id, row]) => boardRow(id, row)), Object.keys(oldBoards), ['campaign_id']);

  for (const [characterId, oldCharacter] of oldCharacters) {
    const nextCharacter = newCharacters.get(characterId);
    const nextIds = new Set(nextCharacter?.campaignIds || []);
    for (const campaignId of oldCharacter.campaignIds || []) {
      if (!nextIds.has(campaignId)) await removeBy(client, 'character_campaigns', 'character_id', characterId, 'campaign_id', campaignId);
    }
  }
  for (const id of oldSessions.keys()) if (!newSessions.has(id)) await removeBy(client, 'sessions', 'id', id);
  for (const id of oldCharacters.keys()) if (!newCharacters.has(id)) await removeBy(client, 'characters', 'id', id);
  for (const id of Object.keys(oldBoards)) if (!(id in newBoards)) await removeBy(client, 'planning_boards', 'campaign_id', id);
  for (const id of oldCampaigns.keys()) if (!newCampaigns.has(id)) await removeBy(client, 'campaigns', 'id', id);
}

export async function listCampaignMembers(client, campaignId) {
  const { data, error } = await client
    .from('campaign_members')
    .select('user_id, role')
    .eq('campaign_id', campaignId);
  fail(error, 'Participantes da campanha');
  return data || [];
}

export async function replaceCampaignMembers(client, campaignId, profiles, selectedUserIds) {
  const selected = new Set(selectedUserIds);
  const current = await listCampaignMembers(client, campaignId);
  const currentByUser = new Map(current.map(row => [row.user_id,row]));
  for (const id of currentByUser.keys()) {
    if (!selected.has(id)) await removeBy(client, 'campaign_members', 'campaign_id', campaignId, 'user_id', id);
  }
  const desired = profiles.filter(profile => selected.has(profile.user_id)).map(profile => ({
    campaign_id: campaignId,
    user_id: profile.user_id,
    role: profile.role === 'master' || profile.role === 'admin' ? 'master' : 'player'
  }));
  const toInsert=desired.filter(row=>!currentByUser.has(row.user_id));
  const toUpdate=desired.filter(row=>currentByUser.has(row.user_id)&&currentByUser.get(row.user_id).role!==row.role);
  await insertRows(client,'campaign_members',toInsert);
  await updateRows(client,'campaign_members',toUpdate,['campaign_id','user_id']);
}
