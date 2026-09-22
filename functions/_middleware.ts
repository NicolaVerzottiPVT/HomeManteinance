type Env = { APP_PASSWORD?: string };
const COOKIE = "domio_session";
const MAX_AGE = 43200;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin" };
const encoder = new TextEncoder();
function reply(body: string, status: number, extra = {}) {
  return new Response(body, { status, headers: { ...headers, ...extra } });
}
async function key(password: string) {
  return crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function sameSecret(a: string, b: string) {
  const digests = await Promise.all([a, b].map(s => crypto.subtle.digest("SHA-256", encoder.encode(s))));
  const x = new Uint8Array(digests[0]), y = new Uint8Array(digests[1]);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}
async function session(password: string) {
  const payload = Math.floor(Date.now() / 1000 + MAX_AGE) + "." + crypto.randomUUID();
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await key(password), encoder.encode(payload)));
  return payload + "." + Array.from(signature, x => x.toString(16).padStart(2, "0")).join("");
}
async function authenticated(request: Request, password: string) {
  const value = (request.headers.get("Cookie") ?? "").split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9-]{36}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const now = Math.floor(Date.now() / 1000), expires = Number(parts[0]);
  if (expires <= now || expires > now + MAX_AGE) return false;
  const signature = Uint8Array.from(parts[2].match(/../g)!, x => parseInt(x, 16));
  return crypto.subtle.verify("HMAC", await key(password), signature, encoder.encode(parts[0] + "." + parts[1]));
}
function cookie(request: Request, value: string, age: number) {
  return COOKIE + "=" + value + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + age + (new URL(request.url).protocol === "https:" ? "; Secure" : "");
}
function page(error: boolean) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accedi · Domio</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eff5f5;color:#12343b;font-family:system-ui,sans-serif;padding:24px}main{width:min(100%,400px);padding:36px;background:white;border:1px solid #dbe6e8;border-radius:24px;box-shadow:0 20px 70px #12343b12}h1{font-size:36px;margin:0}p{color:#61797f;line-height:1.5}label{display:block;margin:24px 0 8px;font-weight:600}input,button{width:100%;padding:14px;border-radius:12px;font:inherit}input{border:1px solid #b6cdd0}button{margin-top:16px;background:#103c44;color:white;border:0;cursor:pointer}.error{color:#b42318}input:focus,button:focus{outline:3px solid #2bd4bf;outline-offset:2px}</style></head><body><main><h1>Domio</h1><p>La tua casa, tutto sotto controllo.</p><form method="post" action="/auth/login"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus>${error ? '<p class="error" role="alert">Password non corretta. Riprova.</p>' : ""}<button type="submit">Entra</button></form></main></body></html>`;
}
export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (!env.APP_PASSWORD) return reply("Configurazione incompleta: impostare il secret APP_PASSWORD e ripetere il deploy.", 503);
  const url = new URL(request.url);
  const write = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (write) {
    const origin = request.headers.get("Origin");
    if ((origin && origin !== url.origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") return reply("Origine non consentita.", 403);
  }
  if (url.pathname === "/auth/login") {
    if (request.method !== "POST") return reply("Metodo non consentito.", 405, { Allow: "POST" });
    if (!request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded")) return reply("Formato non valido.", 415);
    let password: FormDataEntryValue | null;
    try { password = (await request.formData()).get("password"); } catch { return reply("Richiesta non valida.", 400); }
    if (typeof password !== "string" || !await sameSecret(password, env.APP_PASSWORD)) return reply("", 303, { Location: "/login?error=1" });
    return reply("", 303, { Location: "/", "Set-Cookie": cookie(request, await session(env.APP_PASSWORD), MAX_AGE) });
  }
  if (url.pathname === "/auth/logout") {
    if (request.method !== "POST") return reply("Metodo non consentito.", 405, { Allow: "POST" });
    return reply("", 303, { Location: "/login", "Set-Cookie": cookie(request, "", 0) });
  }
  const signedIn = await authenticated(request, env.APP_PASSWORD);
  if (url.pathname === "/login" && ["GET", "HEAD"].includes(request.method)) {
    if (signedIn) return reply("", 303, { Location: "/" });
    return reply(request.method === "HEAD" ? "" : page(url.searchParams.has("error")), 200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    });
  }
  if (!signedIn) {
    if (url.pathname.startsWith("/api/")) return reply(JSON.stringify({ error: "Sessione scaduta. Accedi di nuovo." }), 401, { "Content-Type": "application/json" });
    return reply("", 303, { Location: "/login" });
  }
  if (write && !request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return reply("Usare application/json.", 415);
  const upstream = await next();
  const response = new Response(upstream.body, upstream);
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
};
