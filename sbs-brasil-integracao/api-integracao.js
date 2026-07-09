/* ============================================================
   SBS BRASIL — rota de INTEGRAÇÃO (cole no projeto SBS Brasil)
   ------------------------------------------------------------
   Este é o "outro lado" da ponte com o Painel SBS.
   Os dois sistemas usam o MESMO Supabase; esta rota lê/grava
   na tabela compartilhada sbs_integracao.

   COMO USAR (Cloudflare Worker / Pages Function):
   - Garanta as variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY
     (as MESMAS do Painel SBS).
   - Exponha esta função em GET/POST/DELETE /api/integracao.
   - Este arquivo NÃO depende de libs: usa fetch puro (roda no
     runtime do Cloudflare sem nodejs_compat).
   ============================================================ */

const SISTEMA_LOCAL = 'sbs-brasil';           // <- este sistema
const TABELA = 'sbs_integracao';              // tabela compartilhada no Supabase

function env(k){ try { return (typeof process!=='undefined'&&process.env&&process.env[k]) || (globalThis[k]) || ''; } catch(e){ return ''; } }
function sbHeaders(){
  const key = env('SUPABASE_SERVICE_KEY');
  return { 'apikey': key, 'Authorization': 'Bearer '+key, 'Content-Type':'application/json', 'Prefer':'return=representation' };
}
function sbUrl(path){ return env('SUPABASE_URL').replace(/\/$/,'') + '/rest/v1/' + path; }
function json(obj, status){ return new Response(JSON.stringify(obj), { status: status||200, headers:{'content-type':'application/json'} }); }

/* ---- Cloudflare Pages Function: /functions/api/integracao.js ---- */
export async function onRequest(context){
  const { request, env: cfEnv } = context;
  // Expõe as variáveis do Pages para env()
  try { for (const k in cfEnv){ if (typeof cfEnv[k]==='string') globalThis[k]=cfEnv[k]; } } catch(e){}

  const url = new URL(request.url);

  try {
    if (request.method === 'GET') {
      const de   = url.searchParams.get('de');
      const tipo = url.searchParams.get('tipo');
      const limite = url.searchParams.get('limite') || '500';
      let q = TABELA + '?select=*&order=data->>criadoEm.desc&limit=' + encodeURIComponent(limite);
      if (de)   q += '&data->>sistema=eq.' + encodeURIComponent(de);
      if (tipo) q += '&data->>tipo=eq.' + encodeURIComponent(tipo);
      const r = await fetch(sbUrl(q), { headers: sbHeaders() });
      const rows = await r.json();
      const data = Array.isArray(rows) ? rows.map(x => Object.assign({ id: x.id }, x.data)) : [];
      return json({ ok:true, data });
    }

    if (request.method === 'POST') {
      const b = await request.json();
      if (!b.tipo) return json({ ok:false, erro:'Informe o tipo do dado' }, 400);
      const now = new Date().toISOString();
      const id = 'io' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      const data = {
        sistema: b.sistema || SISTEMA_LOCAL,
        tipo: String(b.tipo), ref: b.ref||'', titulo: b.titulo||'', resumo: b.resumo||'',
        payload: b.payload||{}, criadoEm: now, criadoPor: b.criadoPor||'sistema'
      };
      const r = await fetch(sbUrl(TABELA), { method:'POST', headers: sbHeaders(), body: JSON.stringify({ id, data }) });
      const saved = await r.json();
      const row = Array.isArray(saved) ? saved[0] : saved;
      return json({ ok:true, data: Object.assign({ id:(row&&row.id)||id }, (row&&row.data)||data) });
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return json({ ok:false, erro:'id obrigatório' }, 400);
      await fetch(sbUrl(TABELA + '?id=eq.' + encodeURIComponent(id)), { method:'DELETE', headers: sbHeaders() });
      return json({ ok:true, data:{ removido:id } });
    }

    return json({ ok:false, erro:'Método não suportado' }, 405);
  } catch (e) { return json({ ok:false, erro: e.message }, 500); }
}

/* ---- Worker clássico (se o SBS Brasil for um Worker, não Pages) ----
   export default { async fetch(request, env2){
     for (const k in env2){ if (typeof env2[k]==='string') globalThis[k]=env2[k]; }
     return onRequest({ request, env: env2 });
   }};
--------------------------------------------------------------------- */
