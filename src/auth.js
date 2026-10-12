import { getSupabaseClient } from './supabase.js?v=1';

function normalizeNickname(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase();
}

async function edgeError(error, data) {
  if (data?.error) return new Error(String(data.error));
  const context = error?.context;
  if (context && typeof context.clone === 'function') {
    try {
      const body = await context.clone().json();
      if (body?.error) return new Error(String(body.error));
    } catch { /* A resposta pode não ser JSON. */ }
  }
  return new Error(error?.message || 'Não foi possível concluir a operação.');
}

export async function getClient() {
  return getSupabaseClient();
}

export async function readProfile(client, userId) {
  const { data, error } = await client
    .from('user_profiles')
    .select('user_id, username, role, display_name, created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar seu perfil de acesso.');
  if (!data) throw new Error('Esta conta ainda não tem um perfil autorizado. Fale com o administrador.');
  return data;
}

export async function signInWithNickname(username, password) {
  const client = await getSupabaseClient();
  const normalized = normalizeNickname(username);
  const { data, error } = await client.functions.invoke('username-login', {
    body: { username: normalized, password: String(password ?? '') }
  });
  if (error || data?.error) throw await edgeError(error, data);
  if (typeof data?.access_token !== 'string' || typeof data?.refresh_token !== 'string') {
    throw new Error('A resposta de autenticação está incompleta.');
  }
  const { data: sessionData, error: sessionError } = await client.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  });
  if (sessionError || !sessionData?.user) throw new Error('Não foi possível iniciar a sessão.');
  const profile = await readProfile(client, sessionData.user.id);
  return { client, user: sessionData.user, profile };
}

export async function loadExistingSession() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('Não foi possível verificar a sessão existente.');
  if (!data.session?.user) return { client, session: null, profile: null };
  const profile = await readProfile(client, data.session.user.id);
  return { client, session: data.session, user: data.session.user, profile };
}

export async function requestAdminOperation(client, payload) {
  const { data, error } = await client.functions.invoke('admin-users', { body: payload });
  if (error || data?.error) throw await edgeError(error, data);
  return data;
}

export async function listProfiles(client) {
  const { data, error } = await client
    .from('user_profiles')
    .select('user_id, username, role, display_name, created_at')
    .order('username', { ascending: true });
  if (error) throw new Error('Não foi possível carregar os perfis.');
  return data || [];
}

export async function signOut(client) {
  const { error } = await client.auth.signOut();
  if (error) throw new Error('Não foi possível encerrar a sessão.');
}
