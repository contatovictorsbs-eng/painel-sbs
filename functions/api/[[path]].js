/* ============================================================
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
import * as fSenha from '../../server/senha.js';
import * as fTenants from '../../server/tenants.js';
import * as fVendas from '../../server/vendas.js';
import * as fVendedores from '../../server/vendedores.js';

function pick(m){ return (m && (m.handler || (m.default && m.default.handler))) || null; }

const HANDLERS = {
  'alertas': pick(fAlertas),
  'app-login': pick(fAppLogin),
  'aprovacoes': pick(fAprovacoes),
  'auditoria': pick(fAuditoria),
  'auth': pick(fAuth),
  'campanhas': pick(fCampanhas),
  'clima': pick(fClima),
  'demandas': pick(fDemandas),
  'eventos': pick(fEventos),
  'ia-groq': pick(fIaGroq),
  'leads': pick(fLeads),
  'limpar-teste': pick(fLimparTeste),
  'mercado': pick(fMercado),
  'monitoramento': pick(fMonitoramento),
  'notificacoes': pick(fNotificacoes),
  'orcamentos': pick(fOrcamentos),
  'parceiros': pick(fParceiros),
  'produtos': pick(fProdutos),
  'ranking': pick(fRanking),
  'senha': pick(fSenha),
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
