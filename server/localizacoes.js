/* Localizações da equipe ao vivo — PROXY seguro para o mapa do CEO.
   O segredo (INTEG_KEY) e a URL do Worker SBS Brasil ficam em variáveis
   de ambiente do Cloudflare Pages — NUNCA no navegador.

   O front do Painel chama:  GET /api/localizacoes
   Esta função busca no SBS Brasil:  GET <SBS_BRASIL_URL>/api/integ/localizacoes?key=<INTEG_KEY>
   e devolve { ok, localizacoes:[...] }.

   Variáveis de ambiente necessárias (Pages → Settings → Variables):
   - SBS_BRASIL_URL  ex.: https://nameless-wood-e371.contato-victor-sbs.workers.dev
   - INTEG_KEY       a mesma chave secreta combinada com o SBS Brasil
   ============================================================ */

exports.handler = async (event) => {
  const H = { 'content-type': 'application/json' };
  const base = (process.env.SBS_BRASIL_URL || '').replace(/\/+$/, '');
  const key = process.env.INTEG_KEY || '';

  // Sem configuração ainda → responde vazio (modo demonstração; o front cai no fallback).
  if (!base || !key) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: false, localizacoes: [] } }) };
  }

  try {
    const url = base + '/api/integ/localizacoes?key=' + encodeURIComponent(key);
    const r = await fetch(url, { headers: { 'accept': 'application/json' } });
    const txt = await r.text();
    let data = {};
    try { data = JSON.parse(txt); } catch (e) { data = {}; }
    const locs = Array.isArray(data.localizacoes) ? data.localizacoes : [];
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: true, localizacoes: locs } }) };
  } catch (e) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: true, erro: e.message, localizacoes: [] } }) };
  }
};
