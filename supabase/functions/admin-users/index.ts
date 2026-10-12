const ALIAS_DOMAIN = "users.pelarealidade.invalid";
const ALLOWED_ORIGINS = new Set([
  "https://flavioazvc.github.io",
  "http://localhost:8000",
]);

function headersFor(origin: string | null) {
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

function reply(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(origin) });
}

function getServiceKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (typeof keys?.default === "string" && keys.default) return keys.default;
    } catch { /* usa a variável de compatibilidade abaixo */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
}

function getPublicKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
}

async function parseResponse(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { message: text }; }
}

async function restRequest(projectUrl: string, serviceKey: string, path: string, init: RequestInit = {}) {
  const response = await fetch(new URL(path, projectUrl), {
    ...init,
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Prefer": "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await parseResponse(response);
  return { response, body };
}

async function authAdminRequest(projectUrl: string, serviceKey: string, path: string, method: string, body?: unknown) {
  const response = await fetch(new URL(path, projectUrl), {
    method,
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  return { response, body: await parseResponse(response) };
}

function usernameValue(value: unknown) {
  return typeof value === "string" ? value.normalize("NFKC").trim().toLowerCase() : "";
}

function validPassword(value: unknown) {
  return typeof value === "string" && value.length >= 12 && value.length <= 1024;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(origin, 403, { error: "Origem não autorizada." });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(origin) });
  if (request.method !== "POST") return reply(origin, 405, { error: "Método não permitido." });

  const projectUrl = Deno.env.get("SUPABASE_URL") || "";
  const publicKey = getPublicKey();
  const serviceKey = getServiceKey();
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!projectUrl || !publicKey || !serviceKey) return reply(origin, 503, { error: "Serviço administrativo temporariamente indisponível." });
  if (!token) return reply(origin, 401, { error: "Sessão necessária." });

  try {
    const userResponse = await fetch(new URL("/auth/v1/user", projectUrl), {
      headers: { "apikey": publicKey, "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      cache: "no-store",
    });
    const user = await parseResponse(userResponse);
    if (!userResponse.ok || typeof user?.id !== "string") return reply(origin, 401, { error: "Sessão inválida ou expirada." });

    const roleQuery = new URLSearchParams({ select: "role", user_id: `eq.${user.id}`, limit: "1" });
    const roleResult = await restRequest(projectUrl, serviceKey, `/rest/v1/user_profiles?${roleQuery}`);
    if (!roleResult.response.ok || roleResult.body?.[0]?.role !== "admin") {
      return reply(origin, 403, { error: "Somente o administrador pode gerenciar contas." });
    }

    let input: Record<string, unknown>;
    try { input = await request.json(); } catch { return reply(origin, 400, { error: "Requisição inválida." }); }
    const action = input?.action;
    const username = usernameValue(input?.username);
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
      return reply(origin, 400, { error: "Nickname inválido. Use de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado." });
    }

    if (action === "create") {
      const role = input?.role;
      const password = input?.password;
      const displayName = typeof input?.display_name === "string" ? input.display_name.normalize("NFKC").trim().slice(0, 80) : username;
      if (role !== "master" && role !== "player") return reply(origin, 400, { error: "O perfil deve ser Mestre ou Jogador." });
      if (!validPassword(password)) return reply(origin, 400, { error: "A senha inicial deve ter ao menos 12 caracteres." });

      const usernameQuery = new URLSearchParams({ select: "user_id", username: `eq.${username}`, limit: "1" });
      const existing = await restRequest(projectUrl, serviceKey, `/rest/v1/user_profiles?${usernameQuery}`);
      if (!existing.response.ok) return reply(origin, 503, { error: "Não foi possível verificar a disponibilidade do nickname." });
      if (Array.isArray(existing.body) && existing.body.length) return reply(origin, 409, { error: "Este nickname já está em uso." });

      const created = await authAdminRequest(projectUrl, serviceKey, "/auth/v1/admin/users", "POST", {
        email: `${username}@${ALIAS_DOMAIN}`,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
      if (!created.response.ok || typeof created.body?.id !== "string") {
        if (created.response.status === 422 || created.response.status === 409) return reply(origin, 409, { error: "Não foi possível criar a conta. Verifique se o nickname já está em uso." });
        return reply(origin, 503, { error: "O serviço de contas não conseguiu criar o usuário." });
      }

      const profile = {
        user_id: created.body.id,
        username,
        role,
        display_name: displayName || username,
      };
      const savedProfile = await restRequest(projectUrl, serviceKey, "/rest/v1/user_profiles", {
        method: "POST",
        body: JSON.stringify(profile),
      });
      if (!savedProfile.response.ok) {
        await authAdminRequest(projectUrl, serviceKey, `/auth/v1/admin/users/${created.body.id}`, "DELETE");
        return reply(origin, 503, { error: "A conta não foi finalizada no cadastro de perfis." });
      }
      return reply(origin, 201, { profile });
    }

    if (action === "reset-password") {
      const password = input?.password;
      if (!validPassword(password)) return reply(origin, 400, { error: "A nova senha deve ter ao menos 12 caracteres." });
      const profileQuery = new URLSearchParams({ select: "user_id,username,role,display_name", username: `eq.${username}`, limit: "1" });
      const lookup = await restRequest(projectUrl, serviceKey, `/rest/v1/user_profiles?${profileQuery}`);
      if (!lookup.response.ok) return reply(origin, 503, { error: "Não foi possível localizar o perfil." });
      const profile = Array.isArray(lookup.body) ? lookup.body[0] : null;
      if (!profile) return reply(origin, 404, { error: "Nickname não encontrado." });
      const updated = await authAdminRequest(projectUrl, serviceKey, `/auth/v1/admin/users/${profile.user_id}`, "PUT", { password });
      if (!updated.response.ok) return reply(origin, 503, { error: "Não foi possível redefinir a senha." });
      return reply(origin, 200, { username: profile.username, updated: true });
    }

    return reply(origin, 400, { error: "Operação administrativa inválida." });
  } catch {
    return reply(origin, 503, { error: "Serviço administrativo temporariamente indisponível." });
  }
});
