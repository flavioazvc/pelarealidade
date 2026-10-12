const ALIAS_DOMAIN = "users.pelarealidade.invalid";
const ALLOWED_ORIGINS = new Set([
  "https://flavioazvc.github.io",
  "http://localhost:8000",
]);

function headersFor(origin) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://flavioazvc.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function reply(origin, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: headersFor(origin),
  });
}

function getPublicKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return reply(origin, 403, { error: "Origem não autorizada." });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headersFor(origin) });
  }
  if (request.method !== "POST") {
    return reply(origin, 405, { error: "Método não permitido." });
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return reply(origin, 400, { error: "Requisição inválida." });
  }

  const username = typeof input?.username === "string"
    ? input.username.normalize("NFKC").trim().toLowerCase()
    : "";
  const password = typeof input?.password === "string" ? input.password : "";
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || password.length < 1 || password.length > 1024) {
    return reply(origin, 400, { error: "Nickname ou senha em formato inválido." });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = getPublicKey();
  if (!projectUrl || !publicKey) {
    return reply(origin, 503, { error: "Autenticação temporariamente indisponível." });
  }

  const authUrl = new URL("/auth/v1/token", projectUrl);
  authUrl.searchParams.set("grant_type", "password");
  const authHeaders = new Headers({
    "apikey": publicKey,
    "Authorization": `Bearer ${publicKey}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  });

  // Supabase Auth usa este IP para o limitador do endpoint /token.
  // O projeto precisa ter IP Address Forwarding habilitado em Auth > Rate Limits.
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  if (/^[0-9a-fA-F:., ]{1,128}$/.test(forwardedFor)) {
    authHeaders.set("Sb-Forwarded-For", forwardedFor);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: `${username}@${ALIAS_DOMAIN}`,
        password,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!authResponse.ok) {
      if (authResponse.status === 429) {
        return reply(origin, 429, { error: "Muitas tentativas. Aguarde e tente novamente." });
      }
      if (authResponse.status >= 500) {
        return reply(origin, 503, { error: "Autenticação temporariamente indisponível." });
      }
      // A mesma resposta impede descobrir se o nickname existe.
      return reply(origin, 401, { error: "Nickname ou senha incorretos." });
    }

    const session = await authResponse.json();
    if (typeof session?.access_token !== "string" || typeof session?.refresh_token !== "string") {
      return reply(origin, 503, { error: "Resposta de autenticação inválida." });
    }

    // Não registrar a senha, o alias interno ou os tokens. O cliente usará
    // access_token e refresh_token com supabase.auth.setSession().
    return reply(origin, 200, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
    });
  } catch {
    return reply(origin, 503, { error: "Autenticação temporariamente indisponível." });
  } finally {
    clearTimeout(timeout);
  }
});
