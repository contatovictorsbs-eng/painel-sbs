/* ===========================================================
   SBS — Coletor de Concorrentes (função de backend)
   -----------------------------------------------------------
   Roda FORA do app (agendado), pois precisa de tokens oficiais e
   de acesso de servidor às APIs das redes. Foi escrito para
   Netlify Scheduled Functions, mas a lógica serve igual para uma
   Supabase Edge Function (troque o handler/exports).

   COMO USAR
   1) Crie as variáveis de ambiente (Netlify → Site settings → Env):
        SUPABASE_URL, SUPABASE_SERVICE_KEY   (gravar movimentos)
        META_TOKEN                            (Instagram + Facebook · Graph API)
        IG_BUSINESS_ID, FB_PAGE_ID            (ids das contas)
        YOUTUBE_API_KEY                       (YouTube Data API v3)
   2) Coloque este arquivo em  netlify/functions/coletor-concorrentes.js
   3) Agende em netlify.toml:
        [functions."coletor-concorrentes"]
          schedule = "0 8 * * *"   # todo dia 08:00
   4) A função lê as fontes (mi_fontes) e, para cada canal com token,
      busca as novidades e grava em mi_cc_movimentos + notificacoes.

   Sem os tokens, a função apenas pula o canal (não quebra).
   =========================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/* ---------- helpers Supabase REST ---------- */
async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error("supabase " + r.status + " " + (await r.text()));
  return r.status === 204 ? null : r.json();
}
// As coleções do app vivem num doc por chave (ver sbs-cloud). Ajuste o
// nome da tabela/coluna conforme o seu schema de nuvem.
async function getCol(name) {
  const rows = await sb(`kv?key=eq.${encodeURIComponent("sbsdb:" + name)}&select=value`);
  return rows && rows[0] ? rows[0].value : [];
}
async function setCol(name, value) {
  await sb(`kv?key=eq.${encodeURIComponent("sbsdb:" + name)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ value }),
  });
}

/* ---------- coletores por canal ---------- */
async function coletarInstagram(f) {
  const token = process.env.META_TOKEN, ig = process.env.IG_BUSINESS_ID;
  if (!token || !ig) return [];
  const url = `https://graph.facebook.com/v19.0/${ig}/media?fields=caption,permalink,timestamp&limit=3&access_token=${token}`;
  const j = await (await fetch(url)).json();
  return (j.data || []).map((p) => "Instagram: " + (p.caption || "novo post").slice(0, 90));
}
async function coletarFacebook(f) {
  const token = process.env.META_TOKEN, pg = process.env.FB_PAGE_ID;
  if (!token || !pg) return [];
  const url = `https://graph.facebook.com/v19.0/${pg}/posts?fields=message,created_time&limit=3&access_token=${token}`;
  const j = await (await fetch(url)).json();
  return (j.data || []).map((p) => "Facebook: " + (p.message || "nova publicação").slice(0, 90));
}
async function coletarYoutube(f) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const chan = (f.url.match(/channel\/([\w-]+)/) || [])[1];
  if (!chan) return [];
  const url = `https://www.googleapis.com/youtube/v3/search?key=${key}&channelId=${chan}&part=snippet&order=date&maxResults=3`;
  const j = await (await fetch(url)).json();
  return (j.items || []).map((i) => "YouTube: " + (i.snippet?.title || "novo vídeo").slice(0, 90));
}
async function coletarRSS(f) {
  try {
    const xml = await (await fetch(f.url)).text();
    const out = []; const re = /<title[^>]*>([\s\S]*?)<\/title>/gi; let m, i = 0;
    while ((m = re.exec(xml)) && i < 4) { const t = m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim(); if (t.length > 8) { out.push("Notícia: " + t); i++; } }
    return out.slice(1, 3);
  } catch { return []; }
}

const COLETOR = { instagram: coletarInstagram, facebook: coletarFacebook, youtube: coletarYoutube, rss: coletarRSS };

/* ---------- handler ---------- */
async function executar() {
  const fontes = await getCol("mi_fontes");
  const movs = await getCol("mi_cc_movimentos");
  const notifs = await getCol("notificacoes");
  let novos = 0;

  for (const f of fontes.filter((x) => x.ativo)) {
    const fn = COLETOR[f.canal];
    if (!fn) continue;
    let itens = [];
    try { itens = await fn(f); } catch (e) { itens = []; }
    f.ultima = new Date().toLocaleDateString("pt-BR");
    for (const tx of itens) {
      movs.unshift({ id: "mov" + Date.now() + Math.floor(Math.random() * 999), ccId: f.ccId, ccNome: f.ccNome, tipo: "lancamento", regiao: "", texto: "Coletor: " + tx, data: f.ultima, ts: Date.now(), por: "Coletor", auto: true });
      novos++;
    }
    if (itens[0]) notifs.unshift({ title: "Coletor · " + f.ccNome, text: itens[0], tipo: "aviso", icon: "bot", destino: "grp:mercado", destinoLabel: "Inteligência de Mercado", data: f.ultima, ts: Date.now(), de: "coletor@sbsgreen.com.br" });
  }

  await setCol("mi_fontes", fontes);
  await setCol("mi_cc_movimentos", movs.slice(0, 500));
  await setCol("notificacoes", notifs.slice(0, 500));
  return novos;
}

// Netlify Scheduled Function
exports.handler = async () => {
  try {
    const n = await executar();
    return { statusCode: 200, body: `Coletor OK — ${n} item(ns).` };
  } catch (e) {
    return { statusCode: 500, body: "Erro: " + e.message };
  }
};
// Supabase Edge Function: troque por  Deno.serve(async () => { ... })
