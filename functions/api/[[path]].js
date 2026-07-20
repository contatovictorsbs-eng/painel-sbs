/* build: v1.42.0 — inclui rota "parceiro-indicadores" (força recompilação das Functions)
   ============================================================
   Cloudflare Pages Function — roteador único para /api/*
   Executa as funções do backend (server/*.js, no formato clássico
   exports.handler = async (event) => ({ statusCode, headers, body }))
   dentro do runtime do Cloudflare (Workers + nodejs_compat).

   O front chama /api/<nome> direto, que casa com esta rota ([[path]]).

   Armazenamento: Supabase (via fetch) — configure SUPABASE_URL e
   SUPABASE_SERVICE_KEY nas variáveis do projeto Pages.
   ============================================================ */

// Import estático de cada handler (o bundler precisa vê-los em build).
import * as fAlertas from '../../server/alertas.js';
import * as fAppLogin from '../../server/app-login.js';
import * as fAprovacoes from '../../server/aprovacoes.js';
import * as fAuditoria from '../../server/auditoria.js';
import * as fAuth from '../../server/auth.js';
import * as fBiblioteca from '../../server/biblioteca.js';
import * as fCampanhas from '../../server/campanhas.js';
import * as fClima from '../../server/clima.js';
import * as fDemandas from '../../server/demandas.js';
import * as fEventos from '../../server/eventos.js';
import * as fIaGroq from '../../server/ia-groq.js';
import * as fLeads from '../../server/leads.js';
import * as fLimparTeste from '../../server/limpar-teste.js';
import * as fMercado from '../../server/mercado.js';
import * as fMonitoramento from '../../server/monitoramento.js';
import * as fNotificacoes from '../../server/notificacoes.js';
import * as fOrcamentos from '../../server/orcamentos.js';
import * as fParceiros from '../../server/parceiros.js';
import * as fProdutos from '../../server/produtos.js';
import * as fRanking from '../../server/ranking.js';
import * as fResultados from '../../server/resultados.js';
import * as fSenha from '../../server/senha.js';
import * as fTenants from '../../server/tenants.js';
import * as fVendas from '../../server/vendas.js';
import * as fVendedores from '../../server/vendedores.js';

/* ------------------------------------------------------------------
   Handlers embutidos: canais, integracao e localizacoes.
   Ficam AQUI (e não em server/*.js) porque o upload web do GitHub não
   adiciona arquivos NOVOS em subpasta de forma confiável. Este roteador
   é um arquivo já existente — atualizá-lo sempre funciona no deploy.
   Dependem apenas de server/_lib/* (que já estão no repositório).
   ------------------------------------------------------------------ */
import * as _store from '../../server/_lib/store.js';
import * as _auth from '../../server/_lib/auth.js';
const _storeM = _store.default || _store;
const _authM = _auth.default || _auth;
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = _storeM;
const { fromEvent, tenantFromEvent, requireAuth } = _authM;
import * as _nodeCrypto from 'node:crypto';
const _crypto = _nodeCrypto.default || _nodeCrypto;
function _authSecret(){ return process.env.AUTH_SECRET || 'sbs-dev-secret-troque-em-producao'; }
function _hashSenha(s){ return _crypto.createHash('sha256').update(String(s) + _authSecret()).digest('hex'); }
const _PERFIS = ['marketing','gerente','ceo','mercado','ti','admin'];

/* Gestão de usuários/acessos (Marketing + Admin). Coleção `usuarios`.
   Mesma fórmula de hash do server/auth.js para que o login funcione.
   GET lista (sem hash) · POST cria · PATCH edita/reseta senha · DELETE remove. */
async function hUsuarios(event){
  try {
    const r = requireAuth(event, ['marketing','admin']);
    if (r.erro) return fail(r.erro, r.code);
    const u = r.user;
    const db = tenantStore(tenantFromEvent(event));
    const strip = x => { if(!x) return x; const o = Object.assign({}, x); delete o.hash; return o; };
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const rows = await db.list('usuarios', {}, pageOpts(Object.assign({ limite: 200 }, q)));
      return ok(rows.map(strip));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const email = (b.email || '').trim().toLowerCase();
      const nome = (b.nome || '').trim();
      const perfil = (b.perfil || '').trim();
      if (!email || !email.includes('@')) return fail('Informe um e-mail válido');
      if (!nome) return fail('Informe o nome');
      if (!_PERFIS.includes(perfil)) return fail('Perfil inválido');
      const existe = await db.get('usuarios', email);
      if (existe) return fail('Já existe um usuário com este e-mail', 409);
      const senhaInicial = (b.senha && String(b.senha)) || '12345678';
      const ent = { id: email, email, nome, perfil, tenant: 'sbs', hash: _hashSenha(senhaInicial), precisaTrocar: true, criadoEm: new Date().toISOString(), criadoPor: u.sub || 'sistema' };
      const saved = await db.put('usuarios', ent);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'criou', entidade:'usuarios', entidadeId:email, ip:clientIp(event) });
      return ok(strip(saved));
    }
    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      const email = (b.id || b.email || '').trim().toLowerCase();
      if (!email) return fail('id obrigatório');
      const cur = await db.get('usuarios', email);
      if (!cur) return fail('Usuário não encontrado', 404);
      if (b.acao === 'reset') {
        cur.hash = _hashSenha('12345678'); cur.precisaTrocar = true;
        await db.put('usuarios', cur);
        await audit({ usuario:u.sub, perfil:u.perfil, acao:'redefiniu-senha', entidade:'usuarios', entidadeId:email, ip:clientIp(event) });
        return ok({ id: email, reset: true });
      }
      if (b.nome != null && String(b.nome).trim()) cur.nome = String(b.nome).trim();
      if (b.perfil != null) { if (!_PERFIS.includes(b.perfil)) return fail('Perfil inválido'); cur.perfil = b.perfil; }
      await db.put('usuarios', cur);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'editou', entidade:'usuarios', entidadeId:email, ip:clientIp(event) });
      return ok(strip(cur));
    }
    if (event.httpMethod === 'DELETE') {
      const q = event.queryStringParameters || {};
      const email = (q.id || q.email || '').trim().toLowerCase();
      if (!email) return fail('id obrigatório');
      if (email === (u.sub || '').toLowerCase()) return fail('Você não pode remover o seu próprio acesso');
      const cur = await db.get('usuarios', email);
      if (cur && cur.perfil === 'admin') {
        const all = await db.list('usuarios', {}, { limit: 500 });
        if (all.filter(x => x.perfil === 'admin').length <= 1) return fail('Não é possível remover o último administrador');
      }
      await db.remove('usuarios', email);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'removeu', entidade:'usuarios', entidadeId:email, ip:clientIp(event) });
      return ok({ removido: email });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
}

async function hCanais(event){
  try {
    const db = tenantStore(tenantFromEvent(event));
    const u = fromEvent(event) || {};
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      return ok(await db.list('canais', {}, pageOpts(q)));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const now = new Date().toISOString();
      const ent = Object.assign({}, b, { atualizadoEm: now, atualizadoPor: u.sub || 'sistema' });
      const saved = await db.put('canais', ent);
      await audit({ usuario:u.sub, perfil:u.perfil, acao: b.tipo === 'handle' ? 'editou' : 'criou', entidade:'canais', entidadeId:b.id, ip:clientIp(event) });
      return ok(saved);
    }
    if (event.httpMethod === 'DELETE') {
      const q = event.queryStringParameters || {};
      if (!q.id) return fail('id obrigatório');
      await db.remove('canais', q.id);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'removeu', entidade:'canais', entidadeId:q.id, ip:clientIp(event) });
      return ok({ removido: q.id });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
}

async function hCashback(event){
  try {
    const db = tenantStore(tenantFromEvent(event));
    const u = fromEvent(event) || {};
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      return ok(await db.list('cashback', {}, pageOpts(q)));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) b.id = Date.now();
      const now = new Date().toISOString();
      const ent = Object.assign({ criadoEm: now }, b, { atualizadoEm: now, atualizadoPor: u.sub || 'sistema' });
      const saved = await db.put('cashback', ent);
      await audit({ usuario:u.sub, perfil:u.perfil, acao: b.kind === 'lead' ? 'lead_cashback' : 'registro_cashback', entidade:'cashback', entidadeId:String(b.id), ip:clientIp(event) });
      return ok(saved);
    }
    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const cur = await db.get('cashback', b.id);
      if (!cur) return fail('Registro não encontrado', 404);
      const saved = await db.put('cashback', Object.assign({}, cur, b, { atualizadoEm: new Date().toISOString() }));
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'editou', entidade:'cashback', entidadeId:String(b.id), ip:clientIp(event) });
      return ok(saved);
    }
    if (event.httpMethod === 'DELETE') {
      const q = event.queryStringParameters || {};
      const id = q.id || (JSON.parse(event.body || '{}').id);
      if (!id) return fail('id obrigatório');
      await db.remove('cashback', id);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'removeu', entidade:'cashback', entidadeId:String(id), ip:clientIp(event) });
      return ok({ removido: id });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
}

async function hLixeira(event){
  try {
    const db = tenantStore(tenantFromEvent(event));
    const u = fromEvent(event) || {};
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      return ok(await db.list('lixeira', {}, pageOpts(q)));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) b.id = Date.now();
      const now = new Date().toISOString();
      const ent = Object.assign({ tipo:'item', origem:'', item:{} }, b, { excluidoEm: b.excluidoEm || now, excluidoPor: b.excluidoPor || u.sub || 'sistema' });
      const saved = await db.put('lixeira', ent);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'moveu_lixeira', entidade:ent.origem||'lixeira', entidadeId:String(b.refId||b.id), ip:clientIp(event) });
      return ok(saved);
    }
    if (event.httpMethod === 'DELETE') {
      const q = event.queryStringParameters || {};
      const id = q.id || (JSON.parse(event.body || '{}').id);
      if (!id) return fail('id obrigatório');
      await db.remove('lixeira', id);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'excluiu_definitivo', entidade:'lixeira', entidadeId:String(id), ip:clientIp(event) });
      return ok({ removido: id });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
}

async function hIntegracao(event){
  try {
    const db = tenantStore(tenantFromEvent(event));
    const u = fromEvent(event) || {};
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const filtros = {};
      if (q.de)   filtros.sistema = q.de;
      if (q.tipo) filtros.tipo = q.tipo;
      return ok(await db.list('integracao', filtros, pageOpts(q)));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.tipo) return fail('Informe o tipo do dado (vendas, vendedores, …)');
      const now = new Date().toISOString();
      const ent = {
        sistema: b.sistema || 'painel-sbs',
        tipo: String(b.tipo),
        ref: b.ref || '',
        titulo: b.titulo || '',
        resumo: b.resumo || '',
        payload: b.payload || {},
        criadoEm: now,
        criadoPor: b.criadoPor || u.sub || 'sistema'
      };
      const saved = await db.put('integracao', ent);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'enviou-integracao', entidade:'integracao', entidadeId:saved.id, ip:clientIp(event) });
      return ok(saved);
    }
    if (event.httpMethod === 'DELETE') {
      const q = event.queryStringParameters || {};
      if (!q.id) return fail('id obrigatório');
      await db.remove('integracao', q.id);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'removeu', entidade:'integracao', entidadeId:q.id, ip:clientIp(event) });
      return ok({ removido: q.id });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
}

async function hStorage(event){
  const H = { 'content-type': 'application/json' };
  const SB = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const BUCKET = 'materiais';
  if (event.httpMethod !== 'POST') return { statusCode:405, headers:H, body: JSON.stringify({ ok:false, erro:'Método não suportado' }) };
  // Sem Supabase configurado: devolve não-configurado (o front cai no base64/demonstração).
  if (!SB || !KEY) return { statusCode:200, headers:H, body: JSON.stringify({ ok:true, data:{ configurado:false } }) };
  try {
    const b = JSON.parse(event.body || '{}');
    let dataUrl = b.dataUrl || '';
    const nome = (b.nome || ('arquivo-' + Date.now())).replace(/[^a-zA-Z0-9._-]/g, '_');
    let mime = b.tipo || 'application/octet-stream';
    let b64 = dataUrl;
    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (m) { mime = m[1] || mime; b64 = m[2]; }
    if (!b64) return { statusCode:200, headers:H, body: JSON.stringify({ ok:false, erro:'arquivo vazio' }) };
    // base64 -> bytes
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    const sbHead = k => ({ 'apikey': KEY, 'Authorization': 'Bearer ' + KEY });
    // Garante o bucket público (ignora erro se já existir).
    try {
      await fetch(SB + '/storage/v1/bucket', { method:'POST', headers: Object.assign(sbHead(), { 'Content-Type':'application/json' }), body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }) });
    } catch(e) {}
    const path = new Date().toISOString().slice(0,10) + '/' + Date.now() + '-' + nome;
    const up = await fetch(SB + '/storage/v1/object/' + BUCKET + '/' + encodeURI(path), {
      method:'POST',
      headers: Object.assign(sbHead(), { 'Content-Type': mime, 'x-upsert':'true' }),
      body: bytes
    });
    if (!up.ok) { const t = await up.text(); return { statusCode:200, headers:H, body: JSON.stringify({ ok:false, erro:'upload ' + up.status + ' ' + t }) }; }
    const publicUrl = SB + '/storage/v1/object/public/' + BUCKET + '/' + encodeURI(path);
    return { statusCode:200, headers:H, body: JSON.stringify({ ok:true, data:{ configurado:true, url: publicUrl, path } }) };
  } catch (e) {
    return { statusCode:200, headers:H, body: JSON.stringify({ ok:false, erro: e.message }) };
  }
}

async function hLocalizacoes(event){
  const H = { 'content-type': 'application/json' };
  const base = (process.env.SBS_BRASIL_URL || '').replace(/\/+$/, '');
  const key = process.env.INTEG_KEY || '';
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
}

async function hParceiroIndicadores(event){
  // Proxy v2 dos indicadores da equipe de campo (SBS Brasil).
  // Worker: GET <SBS_BRASIL_URL>/api/integ/v1/indicadores  (Authorization: Bearer <INTEG_KEY>)
  //   + x-integ-key e ?key= como compat v1. Timeout 5s. Erro → DEMONSTRAÇÃO.
  //   "online/TEMPO REAL" só quando vier atualizadoEm (regra do handoff §5).
  const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  const base = (process.env.SBS_BRASIL_URL || '').replace(/\/+$/, '');
  const key = process.env.INTEG_KEY || '';
  if (!base || !key) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: false, online: false, indicadores: null } }) };
  }
  const num = (d, ...ks) => { for (const k of ks) { if (d[k] != null && !isNaN(Number(d[k]))) return Number(d[k]); } return 0; };
  const timeout = Number(process.env.INTEG_TIMEOUT_MS || 5000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const url = base + '/api/integ/v1/indicadores?key=' + encodeURIComponent(key);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'authorization': 'Bearer ' + key,   // v2 — chave no header (não vaza em log)
        'x-integ-key': key,                  // compat v1
        'accept': 'application/json'
      }
    });
    if (!r.ok) throw new Error('HTTP_' + r.status);
    const txt = await r.text();
    let raw = {};
    try { raw = JSON.parse(txt); } catch (e) { raw = {}; }
    const d = (raw && (raw.indicadores || raw.data || raw)) || {};
    const indicadores = {
      estados: num(d,'estados','estadosAtivos','estados_ativos'),
      clientes: num(d,'clientes','carteira'),
      prospects: num(d,'prospects','prospeccao'),
      rotas: num(d,'rotas','rotasVisitas','rotas_visitas'),
      agendadas: num(d,'agendadas','visitasAgendadas','visitas_agendadas'),
      validadas: num(d,'validadas','rotasValidadas','rotas_validadas'),
      cotacoes: num(d,'cotacoes','cotacoesAbertas'),
      vendasRS: num(d,'vendasRS','vendas','vendas_rs','faturamento')
    };
    const atualizadoEm = raw && raw.atualizadoEm ? String(raw.atualizadoEm) : null;
    const periodo = raw && raw.periodo ? String(raw.periodo) : null;
    const versao = raw && raw.versao != null ? raw.versao : null;
    // TEMPO REAL só quando o worker devolve atualizadoEm (handoff §2/§5).
    const online = !!atualizadoEm;
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: true, online, versao, periodo, atualizadoEm, indicadores } }) };
  } catch (e) {
    const motivo = e && e.name === 'AbortError' ? 'TIMEOUT' : (e && e.message) || 'ERRO';
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, data: { configurado: true, online: false, erro: motivo, indicadores: null } }) };
  } finally {
    clearTimeout(t);
  }
}

function pick(m){ return (m && (m.handler || (m.default && m.default.handler))) || null; }

const HANDLERS = {
  'alertas': pick(fAlertas),
  'app-login': pick(fAppLogin),
  'aprovacoes': pick(fAprovacoes),
  'auditoria': pick(fAuditoria),
  'auth': pick(fAuth),
  'biblioteca': pick(fBiblioteca),
  'campanhas': pick(fCampanhas),
  'canais': hCanais,
  'cashback': hCashback,
  'clima': pick(fClima),
  'demandas': pick(fDemandas),
  'eventos': pick(fEventos),
  'integracao': hIntegracao,
  'lixeira': hLixeira,
  'ia-groq': pick(fIaGroq),
  'leads': pick(fLeads),
  'limpar-teste': pick(fLimparTeste),
  'localizacoes': hLocalizacoes,
  'parceiro-indicadores': hParceiroIndicadores,
  'mercado': pick(fMercado),
  'monitoramento': pick(fMonitoramento),
  'notificacoes': pick(fNotificacoes),
  'orcamentos': pick(fOrcamentos),
  'parceiros': pick(fParceiros),
  'produtos': pick(fProdutos),
  'ranking': pick(fRanking),
  'resultados': pick(fResultados),
  'senha': pick(fSenha),
  'storage': hStorage,
  'tenants': pick(fTenants),
  'usuarios': hUsuarios,
  'vendas': pick(fVendas),
  'vendedores': pick(fVendedores)
};

export async function onRequest(context){
  const { request, env, params } = context;

  // Expõe as variáveis do Pages para o código Node (process.env).
  try { if (typeof process !== 'undefined' && process.env) { for (const k in env){ if (typeof env[k] === 'string') process.env[k] = env[k]; } } } catch (e) {}

  // Nome da função = primeiro segmento após /api/
  const segs = (params && params.path) || [];
  const fn = Array.isArray(segs) ? segs[0] : String(segs || '');
  const handler = HANDLERS[fn];
  if (!handler) {
    return json({ ok: false, erro: 'função não encontrada: ' + fn }, 404);
  }

  const url = new URL(request.url);
  const qs = {};
  url.searchParams.forEach((v, k) => { qs[k] = v; });

  const headers = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  let body = '';
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try { body = await request.text(); } catch (e) { body = ''; }
  }

  const event = {
    httpMethod: request.method,
    headers,
    queryStringParameters: qs,
    body
  };

  try {
    const r = await handler(event, {});
    const h = (r && r.headers) || { 'content-type': 'application/json' };
    return new Response((r && r.body) || '', { status: (r && r.statusCode) || 200, headers: h });
  } catch (e) {
    return json({ ok: false, erro: e.message }, 500);
  }
}

function json(obj, status){
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json' } });
}
