/* Login / sessão por perfil (server-side).
   POST /.netlify/functions/auth  { email, senha }         → { token, perfil, nome, precisaTrocar }
   GET  /.netlify/functions/auth  (Authorization: Bearer)  → { perfil, nome, email }

   Usuários vivem na coleção `usuarios` (Supabase/Blobs) para que a senha seja
   POR USUÁRIO e TROCÁVEL. Na primeira vez, a coleção é semeada a partir de:
     1) USERS_JSON  (variável de ambiente) — produção, e/ou
     2) PADRAO      — lista interna SBS (senha inicial 12345678, precisaTrocar=true)
   Não há bloqueio por tentativas: quem não consegue entrar usa "Esqueci a senha"
   (functions/senha.js). */
const crypto = require('crypto');
const { sign } = require('./_lib/auth');
const { list, get, put, audit, clientIp, ok, fail } = require('./_lib/store');

function SECRET(){ return process.env.AUTH_SECRET || 'sbs-dev-secret-troque-em-producao'; }
function hash(senha){ return crypto.createHash('sha256').update(String(senha) + SECRET()).digest('hex'); }

/* Equipe interna SBS — semeada com senha inicial 12345678 (precisaTrocar=true). */
const PADRAO = [
  { email:'franca@sbsgreen.com.br',        perfil:'marketing', nome:'França' },
  { email:'victorhugo@sbsgreen.com.br',    perfil:'mercado',   nome:'Victor Hugo' },
  { email:'tiago.mascheto@sbsgreen.com.br',perfil:'ceo',       nome:'Tiago Mascheto' },
  { email:'ti@sbsgreen.com.br',            perfil:'ti',        nome:'TI' },
  { email:'admin@sbsgreen.com.br',         perfil:'admin',     nome:'Admin master' }
];

/* Semeia a coleção `usuarios` se estiver vazia. Idempotente. */
async function semear(){
  const existentes = await list('usuarios', null, { limit: 1 });
  if (existentes && existentes.length) return;
  let base = PADRAO;
  try {
    const raw = process.env.USERS_JSON;
    if (raw) { const j = JSON.parse(raw); if (Array.isArray(j) && j.length) base = j; }
  } catch (e) {}
  const inicial = hash('12345678');
  for (const u of base){
    const email = (u.email || '').toLowerCase();
    await put('usuarios', {
      id: email,
      email,
      perfil: u.perfil,
      nome: u.nome,
      tenant: u.tenant || 'sbs',
      hash: u.hash || inicial,
      precisaTrocar: u.precisaTrocar != null ? u.precisaTrocar : true,
      criadoEm: new Date().toISOString()
    });
  }
}

async function buscarUsuario(email){
  await semear();
  return get('usuarios', (email || '').toLowerCase());
}

exports.handler = async (event) => {
  const { requireAuth } = require('./_lib/auth');
  try {
    if (event.httpMethod === 'GET') {
      const r = requireAuth(event);
      if (r.erro) return fail(r.erro, r.code);
      return ok({ perfil:r.user.perfil, nome:r.user.nome, email:r.user.sub, tenant:r.user.tenant || 'sbs' });
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const email = (b.email || '').trim().toLowerCase();
      const senha = b.senha || b.password || '';
      const ip = clientIp(event);
      const u = await buscarUsuario(email);
      if (!u || u.hash !== hash(senha)) {
        await audit({ usuario: email || 'desconhecido', acao:'login_falha', entidade:'auth', ip });
        return fail('E-mail ou senha inválidos', 401);
      }
      const token = sign({ sub: u.email, perfil: u.perfil, nome: u.nome, tenant: u.tenant || 'sbs' });
      await audit({ usuario: u.email, perfil: u.perfil, acao:'login', entidade:'auth', ip });
      return ok({ token, perfil: u.perfil, nome: u.nome, email: u.email, tenant: u.tenant || 'sbs', precisaTrocar: !!u.precisaTrocar });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
