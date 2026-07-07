/* Login / sessão por perfil (server-side).
   POST /api/auth  { email, senha }         → { token, perfil, nome, precisaTrocar }
   GET  /api/auth  (Authorization: Bearer)  → { perfil, nome, email }

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
  { email:'franz@sbsgreen.com.br',         perfil:'marketing', nome:'Franz' },
  { email:'medina@sbsgreen.com.br',        perfil:'gerente',   nome:'Medina' },
  { email:'tiago.mascheto@sbsgreen.com.br',perfil:'ceo',       nome:'Tiago Mascheto' },
  { email:'victorhugo@sbsgreen.com.br',    perfil:'mercado',   nome:'Victor Hugo' },
  { email:'ti@sbsgreen.com.br',            perfil:'ti',        nome:'TI' },
  { email:'admin@sbsgreen.com.br',         perfil:'admin',     nome:'Admin master' }
];

/* Garante que os usuários canônicos existam. É um TOP-UP idempotente:
   cria só os que faltam e NUNCA sobrescreve senha/perfil de quem já existe
   (preserva trocas de senha feitas pelos usuários). Assim, ao adicionar um
   novo membro à lista PADRAO (ou via USERS_JSON), basta o próximo login. */
async function semear(){
  let base = PADRAO;
  try {
    const raw = process.env.USERS_JSON;
    if (raw) { const j = JSON.parse(raw); if (Array.isArray(j) && j.length) base = j; }
  } catch (e) {}
  const inicial = hash('12345678');
  for (const u of base){
    const email = (u.email || '').toLowerCase();
    if (!email) continue;
    const existe = await get('usuarios', email);
    if (existe) continue; // já cadastrado — não mexe (preserva senha trocada)
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
