type Env = { APP_PASSWORD?: string };
const securityHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
};
function reply(message: string, status: number, extra = {}) {
  return new Response(message, { status, headers: { ...securityHeaders, ...extra } });
}
async function sameSecret(actual: string, expected: string) {
  const encode = (text: string) => new TextEncoder().encode(text);
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encode(actual)),
    crypto.subtle.digest("SHA-256", encode(expected)),
  ]);
  const av = new Uint8Array(a), bv = new Uint8Array(b);
  let different = 0;
  for (let i = 0; i < av.length; i++) different |= av[i] ^ bv[i];
  return different === 0;
}
export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (!env.APP_PASSWORD || env.APP_PASSWORD.length < 16) {
    return reply("Configurazione incompleta: impostare il secret APP_PASSWORD (almeno 16 caratteri) e ripetere il deploy.", 503);
  }
  let credentials = "";
  try {
    const auth = request.headers.get("Authorization") ?? "";
    if (/^Basic /i.test(auth)) {
      credentials = new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(atob(auth.slice(6)), (char) => char.charCodeAt(0)),
      );
    }
  } catch { /* Malformed credentials are rejected below. */ }
  if (!await sameSecret(credentials, "casa:" + env.APP_PASSWORD)) {
    return reply("Accesso richiesto.", 401, { "WWW-Authenticate": 'Basic realm="Casa Cura", charset="UTF-8"' });
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("Origin");
    if ((origin && origin !== new URL(request.url).origin) ||
        request.headers.get("Sec-Fetch-Site") === "cross-site") {
      return reply("Origine non consentita.", 403);
    }
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return reply("Usare application/json.", 415);
    }
  }
  const upstream = await next();
  const response = new Response(upstream.body, upstream);
  for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
  return response;
};
