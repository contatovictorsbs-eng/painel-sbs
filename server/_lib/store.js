/* Camada de dados compartilhada.
   Duas implementações com a MESMA interface:
   - Supabase/Postgres  → ativada quando SUPABASE_URL + SUPABASE_SERVICE_KEY existem (produção)
   - Netlify Blobs       → fallback gratuito (MVP / staging)
   Trocar de banco não exige mudar nenhuma função de rota. */

/* Leitura PREGUIÇOSA do ambiente: no Cloudflare Workers o process.env só é
   preenchido DENTRO do onRequest (o roteador copia as vars do Pages ali).
   Se lêssemos no topo do módulo (import time), viria vazio e o Supabase
   nunca ativaria. Por isso cada função lê process.env na hora da chamada. */
function sbUrl(){ return process.env.SUPABASE_URL; }
function sbKey(){ return process.env.SUPABASE_SERVICE_KEY; }
function useSupabase(){ return !!(sbUrl() && sbKey()); }

/* ---------- Supabase (REST) ---------- */
function sbTable(nome){ return 'sbs_' + nome; }
function sbHeaders(extra){
  const k = sbKey();
  return Object.assign({
    'apikey': k,
    'Authorization': 'Bearer ' + k,
    'Content-Type': 'application/json'
  }, extra || {});
}
/* Representação: cada tabela sbs_<nome> tem (id text pk, data jsonb, updated_at).
   Guardar o item inteiro em `data` deixa qualquer coleção funcionar sem DDL por-campo. */
function unwrap(row){ return row && row.data ? Object.assign({ id: row.id }, row.data) : row; }
async function sbList(nome, filtros, opts){
  const SB_URL = sbUrl();
  let url = SB_URL + '/rest/v1/' + sbTable(nome) + '?select=*';
  for (const k in (filtros||{})){
    const seg = (k === 'id') ? 'id' : ('data->>' + k);
    url += '&' + encodeURIComponent(seg) + '=eq.' + encodeURIComponent(filtros[k]);
  }
  url += '&order=updated_at.desc';
  const o = opts || {};
  if (o.limit)  url += '&limit=' + Number(o.limit);
  if (o.offset) url += '&offset=' + Number(o.offset);
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) throw new Error('Supabase list ' + r.status);
  return (await r.json()).map(unwrap);
}
async function sbGet(nome, id){
  const url = sbUrl() + '/rest/v1/' + sbTable(nome) + '?id=eq.' + encodeURIComponent(id) + '&select=*';
  const r = await fetch(url, { headers: sbHeaders() });
  const rows = await r.json();
  return rows[0] ? unwrap(rows[0]) : null;
}
async function sbPut(nome, item){
  const row = { id: String(item.id), data: item, updated_at: new Date().toISOString() };
  const url = sbUrl() + '/rest/v1/' + sbTable(nome) + '?on_conflict=id';
  const r = await fetch(url, {
    method: 'POST',
    headers: sbHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(row)
  });
  if (!r.ok) throw new Error('Supabase put ' + r.status + ' ' + (await r.text()));
  const rows = await r.json();
  return rows[0] ? unwrap(rows[0]) : item;
}
async function sbRemove(nome, id){
  const url = sbUrl() + '/rest/v1/' + sbTable(nome) + '?id=eq.' + encodeURIComponent(id);
  await fetch(url, { method: 'DELETE', headers: sbHeaders() });
  return { id };
}

/* ---------- Netlify Blobs ---------- */
/* Import por especificador COMPUTADO: bundlers (Cloudflare/Vercel) não seguem
   este import, então @netlify/blobs nunca é empacotado no runtime Workers.
   Só o Netlify (Node real) resolve em runtime — e apenas quando NÃO há Supabase. */
let _blobsMod;
async function blobsPkg(){ if (!_blobsMod) { const n = '@netlify/' + 'blobs'; _blobsMod = await import(n); } return _blobsMod; }
async function blobCol(nome){
  const mod = await blobsPkg();
  const getStore = mod.getStore || (mod.default && mod.default.getStore);
  return getStore({ name: 'sbs_' + nome, consistency: 'strong' });
}
async function blobList(nome, filtros, opts){
  const s = await blobCol(nome);
  const { blobs } = await s.list();
  let out = [];
  for (const b of blobs){ const v = await s.get(b.key, { type: 'json' }); if (v) out.push(v); }
  for (const k in (filtros||{})) out = out.filter(x => String(x[k]) === String(filtros[k]));
  out.sort((a,b)=> String((b&&b.atualizadoEm)||(b&&b.criadoEm)||'').localeCompare(String((a&&a.atualizadoEm)||(a&&a.criadoEm)||'')));
  const o = opts || {};
  if (o.offset) out = out.slice(Number(o.offset));
  if (o.limit)  out = out.slice(0, Number(o.limit));
  return out;
}
async function blobGet(nome, id){ return (await blobCol(nome)).get(id, { type: 'json' }); }
async function blobPut(nome, item){ await (await blobCol(nome)).setJSON(String(item.id), item); return item; }
async function blobRemove(nome, id){ await (await blobCol(nome)).delete(String(id)); return { id }; }

/* ---------- Interface pública ---------- */
async function list(nome, filtros, opts){ return useSupabase() ? sbList(nome, filtros, opts) : blobList(nome, filtros, opts); }
async function get(nome, id){ return useSupabase() ? sbGet(nome, id) : blobGet(nome, id); }
async function put(nome, item){
  if (!item.id) item.id = nome.slice(0,3) + '_' + Date.now() + Math.floor(Math.random()*1000);
  return useSupabase() ? sbPut(nome, item) : blobPut(nome, item);
}
async function remove(nome, id){ return useSupabase() ? sbRemove(nome, id) : blobRemove(nome, id); }

/* ---------- Auditoria LGPD ----------
   Registra QUEM fez O QUÊ, quando e sobre qual entidade.
   Nunca guarda a payload de dados pessoais — só metadados. */
async function audit(ev){
  try {
    const reg = {
      id: 'aud_' + Date.now() + Math.floor(Math.random()*1000),
      usuario: ev.usuario || 'anon',
      perfil: ev.perfil || '',
      acao: ev.acao || '',            // criou | editou | excluiu | acessou | login | login_falha
      entidade: ev.entidade || '',    // vendedores | vendas | leads ...
      entidadeId: ev.entidadeId || '',
      ip: ev.ip || '',
      ts: new Date().toISOString()
    };
    await put('auditoria', reg);
    return reg;
  } catch (e) { return null; }
}

function clientIp(event){
  const h = (event && event.headers) || {};
  return h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '';
}

/* Paginação padrão para escalar (1000+ registros): ?limite=&pagina= (ou ?offset=).
   Cap de segurança em 500 por página para nunca varrer a coleção inteira. */
function pageOpts(q){
  q = q || {};
  const limit = Math.min(Math.max(parseInt(q.limite || q.limit || '200', 10) || 200, 1), 500);
  const offset = q.offset != null ? (parseInt(q.offset, 10) || 0)
                : (q.pagina ? (Math.max(parseInt(q.pagina, 10) - 1, 0) * limit) : 0);
  return { limit, offset };
}

function ok(data){ return { statusCode:200, headers:{'content-type':'application/json'}, body: JSON.stringify({ ok:true, data }) }; }
function fail(erro, code){ return { statusCode: code||400, headers:{'content-type':'application/json'}, body: JSON.stringify({ ok:false, erro }) }; }

/* ---------- Multi-tenant (escala p/ vários parceiros) ----------
   Modelo: banco único, schema único, isolamento por linha via campo `tenant`.
   - Cada parceiro é um tenant (slug: 'coopercitrus', 'coamo'…).
   - A SBS é o super-tenant 'sbs': enxerga TODOS (visão consolidada).
   - O tenant vem SEMPRE do token (nunca do corpo do request) → sem vazamento.
   tenantStore(tenant) devolve o mesmo CRUD, já preso ao tenant. */
function tenantStore(tenant){
  const scoped = (!tenant || tenant === '*' || tenant === 'sbs') ? null : String(tenant);
  return {
    tenant: scoped || 'sbs',
    isSuper: !scoped,
    list: async (nome, filtros, opts) => {
      const f = Object.assign({}, filtros || {});
      if (scoped) f.tenant = scoped;         // parceiro: só as suas linhas
      return list(nome, f, opts);            // super (sbs): tudo (com paginação)
    },
    get: async (nome, id) => {
      const r = await get(nome, id);
      if (r && scoped && r.tenant && r.tenant !== scoped) return null;
      return r;
    },
    put: async (nome, item) => {
      if (scoped) item.tenant = scoped;      // carimba o dono
      else if (!item.tenant) item.tenant = 'sbs';
      return put(nome, item);
    },
    remove: async (nome, id) => {
      if (scoped) {
        const r = await get(nome, id);
        if (r && r.tenant && r.tenant !== scoped) throw new Error('Sem permissão para este recurso (tenant)');
      }
      return remove(nome, id);
    }
  };
}

module.exports = { list, get, put, remove, audit, clientIp, pageOpts, ok, fail, tenantStore, get backend(){ return useSupabase() ? 'supabase' : 'blobs'; } };
