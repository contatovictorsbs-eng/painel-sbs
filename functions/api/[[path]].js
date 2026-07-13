/* build: v1.41.0 — inclui rota "mercado" (força recompilação das Functions)
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
const { fromEvent, tenantFromEvent } = _authM;

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
  'clima': pick(fClima),
  'demandas': pick(fDemandas),
  'eventos': pick(fEventos),
  'integracao': hIntegracao,
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
