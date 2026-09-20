// Vydá API klíče stránce – klíče jsou jen v nastavení Netlify (Environment variables),
// ne v kódu ani v GitHubu, takže je skenery uniklých klíčů nenajdou.
//   POST /api/keys  {password}  ->  {provider, model, keys:[…]}
// Proměnné v Netlify:
//   GEMINI_API_KEYS  – jeden nebo více klíčů oddělených čárkou (povinné)
//   CLASS_PASSWORD   – heslo třídy (nepovinné; bez něj klíče dostane každý, kdo zná adresu)
//   MODEL            – výchozí model (nepovinné, např. gemini-3-flash-preview)
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const keys = (Netlify.env.get("GEMINI_API_KEYS") || "").split(",").map(k => k.trim()).filter(Boolean);
  if (!keys.length) return json({ error: "Na serveru není nastaven GEMINI_API_KEYS." }, 503);

  const required = (Netlify.env.get("CLASS_PASSWORD") || "").trim();
  if (required) {
    let body = {};
    try { body = await req.json(); } catch {}
    if (String(body.password || "").trim() !== required) return json({ error: "Špatné heslo." }, 401);
  }
  return json({ provider: "gemini", model: Netlify.env.get("MODEL") || undefined, keys });
};

export const config = { path: "/api/keys" };
