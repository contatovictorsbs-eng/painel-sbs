/* Autenticação — assinatura/verificação de token stateless (HMAC-SHA256).
   Sem dependências externas: usa o módulo 'crypto' do Node.
   O segredo vem de AUTH_SECRET (variável de ambiente). */
const crypto = require('crypto');
function SECRET(){ return process.env.AUTH_SECRET || 'sbs-dev-secret-troque-em-producao'; }

function b64url(buf){ return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function b64urlJSON(obj){ return b64url(JSON.stringify(obj)); }
function fromB64url(s){ return Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'); }

/* Gera token { sub, perfil, nome, exp } assinado. Validade padrão: 12h. */
function sign(payload, ttlSeconds){
  const body = Object.assign({}, payload, { exp: Math.floor(Date.now()/1000) + (ttlSeconds || 43200) });
  const head = b64urlJSON({ alg:'HS256', typ:'JWT' });
  const data = head + '.' + b64urlJSON(body);
  const sig = b64url(crypto.createHmac('sha256', SECRET()).update(data).digest());
  return data + '.' + sig;
}

/* Verifica assinatura e expiração. Retorna o payload ou null. */
function verify(token){
  try {
    const [head, body, sig] = String(token).split('.');
    if (!head || !body || !sig) return null;
    const expect = b64url(crypto.createHmac('sha256', SECRET()).update(head + '.' + body).digest());
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    const payload = JSON.parse(fromB64url(body));
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch (e) { return null; }
}

/* Lê o token do header Authorization: Bearer <token>. */
function fromEvent(event){
  const h = (event && event.headers) || {};
  const auth = h.authorization || h.Authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? verify(m[1]) : null;
}

/* Guard: exige token válido e (opcional) um dos perfis. Retorna {user} ou {erro,code}. */
function requireAuth(event, perfis){
  const user = fromEvent(event);
  if (!user) return { erro:'Não autenticado', code:401 };
  if (perfis && perfis.length && !perfis.includes(user.perfil) && user.perfil !== 'admin')
    return { erro:'Sem permissão para este recurso', code:403 };
  return { user };
}

/* Multi-tenant: qual parceiro o usuário representa.
   Usuários internos da SBS → 'sbs' (super-tenant, vê todos).
   Usuários de parceira → o slug da parceira (isolado). */
function tenantOf(user){ return (user && user.tenant) ? String(user.tenant) : 'sbs'; }
function isSuper(user){ return tenantOf(user) === 'sbs' || (user && user.perfil === 'admin'); }

/* Deriva o tenant a partir do token do request (padrão 'sbs' se sem token — modo demo/staging). */
function tenantFromEvent(event){ return tenantOf(fromEvent(event)); }

module.exports = { sign, verify, fromEvent, requireAuth, tenantOf, isSuper, tenantFromEvent };
