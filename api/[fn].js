/* ============================================================
   Adaptador Vercel → funções no formato Netlify.
   Permite rodar TODAS as functions/*.js (event/handler) no Vercel
   SEM alterar nenhuma delas.

   Como funciona:
   - O front chama /.netlify/functions/<nome> (como sempre).
   - vercel.json reescreve para /api/<nome>, que cai aqui ([fn].js).
   - Montamos um "event" no formato Netlify e chamamos mod.handler(event).

   Armazenamento: no Vercel não existe Netlify Blobs, então configure
   SUPABASE_URL + SUPABASE_SERVICE_KEY (o _lib/store.js usa Supabase).
   ============================================================ */
const path = require('path');
const SAFE = /^[a-z0-9-]+$/; // evita path traversal — só nomes simples

module.exports = async (req, res) => {
  const fn = String((req.query && req.query.fn) || '').trim();
  if (!SAFE.test(fn)) { res.status(400).json({ ok: false, erro: 'função inválida' }); return; }

  let mod;
  try {
    mod = require(path.join(process.cwd(), 'server', fn + '.js'));
  } catch (e) {
    res.status(404).json({ ok: false, erro: 'função não encontrada: ' + fn });
    return;
  }
  if (!mod || typeof mod.handler !== 'function') {
    res.status(500).json({ ok: false, erro: 'handler ausente em ' + fn });
    return;
  }

  // Corpo: Netlify espera string; Vercel pode entregar objeto já parseado.
  const body = (req.body == null) ? '' : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    queryStringParameters: req.query || {},
    body
  };

  try {
    const r = await mod.handler(event, {});
    const headers = (r && r.headers) || {};
    for (const k in headers) res.setHeader(k, headers[k]);
    res.status((r && r.statusCode) || 200).send((r && r.body) || '');
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message });
  }
};
