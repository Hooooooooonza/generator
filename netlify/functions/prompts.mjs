// Sdílená knihovna zadání – ukládá se do Netlify Blobs (zdarma, součást Netlify).
// Sdílí se jen zadání pro AI (téma, počet, typ, obtížnost, pokyny, zdrojový text),
// otázky si každý generuje sám.
//   GET    /api/prompts        -> seznam zadání
//   POST   /api/prompts        -> uložit {title, author, params:{topic,count,qtype,difficulty,extra,source}}
//   DELETE /api/prompts/:id    -> smazat (vyžaduje hlavičku x-admin = env ADMIN_PASSWORD)
import { getStore } from "@netlify/blobs";

const MAX_BODY = 200 * 1024; // 200 kB (zdrojový text může být delší)
const MAX_ITEMS = 500;
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default async (req, context) => {
  const store = getStore("prompts");
  const id = context.params?.id;
  const load = async () => (await store.get("index", { type: "json" })) || [];

  if (req.method === "GET") {
    return json((await load()).sort((a, b) => b.created - a.created));
  }

  if (req.method === "POST") {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "Zadání je moc velké." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Neplatný JSON." }, 400); }
    const p = body.params || {};
    const short = (s, n = 120) => String(s || "").slice(0, n).trim();
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: short(body.title) || short(p.topic) || "Bez názvu",
      author: short(body.author) || "anonym",
      created: Date.now(),
      params: {
        topic: short(p.topic, 300),
        count: Math.max(1, Math.min(30, parseInt(p.count) || 10)),
        qtype: ["abcd", "open", "tf", "mix"].includes(p.qtype) ? p.qtype : "abcd",
        difficulty: ["lehká", "střední", "těžká"].includes(p.difficulty) ? p.difficulty : "střední",
        extra: short(p.extra, 2000),
        source: short(p.source, 150000),
      },
    };
    if (!item.params.topic && !item.params.source) return json({ error: "Zadání nemá téma ani zdrojový text." }, 400);
    const index = await load();
    if (index.length >= MAX_ITEMS) return json({ error: "Knihovna je plná." }, 507);
    index.push(item);
    await store.setJSON("index", index);
    return json(item, 201);
  }

  if (req.method === "DELETE" && id) {
    const admin = Netlify.env.get("ADMIN_PASSWORD");
    if (!admin || req.headers.get("x-admin") !== admin) return json({ error: "Nepovoleno." }, 403);
    await store.setJSON("index", (await load()).filter(s => s.id !== id));
    return json({ ok: true });
  }

  return json({ error: "Neznámý požadavek." }, 405);
};

export const config = { path: ["/api/prompts", "/api/prompts/:id"] };
