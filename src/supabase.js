// Configuração pública do projeto. Publishable keys são próprias para clientes web;
// nunca coloque uma chave Secret/service_role neste arquivo ou no repositório.
const SUPABASE_URL = 'https://xizrzpnohkhluzbrjfix.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hFdY-TG5JzLvdZIecu2qiw_ZQC7sIlt';
const SUPABASE_JS_URL = 'https://esm.sh/@supabase/supabase-js@2.117.3';

let clientPromise;

/** Inicializa o cliente somente quando solicitado e reutiliza a instância. */
export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = import(SUPABASE_JS_URL)
      .then(({ createClient }) => {
        if (typeof createClient !== 'function') {
          throw new Error('O SDK do Supabase não pôde ser carregado.');
        }
        return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: {
            flowType: 'pkce',
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'pela-realidade-auth-v1'
          }
        });
      })
      .catch(error => {
        clientPromise = undefined;
        throw error;
      });
  }
  return clientPromise;
}

/** Verifica somente a disponibilidade da API Auth; não consulta nem grava dados do jogo. */
export async function checkSupabaseConnection() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: 'application/json'
      },
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`A API de autenticação respondeu com HTTP ${response.status}.`);
    }
    const settings = await response.json();
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('A API de autenticação retornou uma resposta inesperada.');
    }
    return true;
  } finally {
    clearTimeout(timeout);
  }
}
