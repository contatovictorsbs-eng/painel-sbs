/* Gestão de usuários / acessos do painel (Marketing + Admin).
   Coleção `usuarios` (a mesma do server/auth.js) — senha por usuário e trocável.
   Usa EXATAMENTE a mesma fórmula de hash do auth.js, para que um usuário criado
   aqui consiga logar por /api/auth.

   Contrato:
     GET    /api/usuarios                      → lista (sem o hash)
     POST   /api/usuarios  {email,nome,perfil} → cria (senha inicial 12345678, precisaTrocar=true)
     PATCH  /api/usuarios  {id, acao:'reset'}  → redefine senha para 12345678
     PATCH  /api/usuarios  {id, nome?, perfil?}→ edita nome/perfil
     DELETE /api/usuarios?id=<email>           → remove (não permite remover a si mesmo nem o último admin)

   Permissão: perfis 'marketing' e 'admin' (requireAuth já libera admin sempre).

   NOTA DE DEPLOY: o roteador functions/api/[[path]].js roda uma cópia EMBUTIDA
   deste handler (hUsuarios). Mantenha os dois em sincronia. */
const crypto = require('crypto');
const { list, get, put, remove, audit, clientIp, pageOpts, ok, fail, tenantStore } = require('./_lib/store');
const { requireAuth, tenantFromEvent } = require('./_lib/auth');

function SECRET(){ return process.env.AUTH_SECRET || 'sbs-dev-secret-troque-em-producao'; }
function hash(senha){ return crypto.createHash('sha256').update(String(senha) + SECRET()).digest('hex'); }
const PERFIS = ['marketing','gerente','ceo','mercado','ti','admin'];
function strip(x){ if(!x) return x; const o = Object.assign({}, x); delete o.hash; return o; }

exports.handler = async (event) => {
  try {
    const r = requireAuth(event, ['marketing','admin']);
    if (r.erro) return fail(r.erro, r.code);
    const u = r.user;
    const db = tenantStore(tenantFromEvent(event));

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
      if (!PERFIS.includes(perfil)) return fail('Perfil inválido');
      const existe = await db.get('usuarios', email);
      if (existe) return fail('Já existe um usuário com este e-mail', 409);
      const senhaInicial = (b.senha && String(b.senha)) || '12345678';
      const ent = { id: email, email, nome, perfil, tenant: 'sbs', hash: hash(senhaInicial), precisaTrocar: true, criadoEm: new Date().toISOString(), criadoPor: u.sub || 'sistema' };
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
        cur.hash = hash('12345678'); cur.precisaTrocar = true;
        await db.put('usuarios', cur);
        await audit({ usuario:u.sub, perfil:u.perfil, acao:'redefiniu-senha', entidade:'usuarios', entidadeId:email, ip:clientIp(event) });
        return ok({ id: email, reset: true });
      }
      if (b.nome != null && String(b.nome).trim()) cur.nome = String(b.nome).trim();
      if (b.perfil != null) { if (!PERFIS.includes(b.perfil)) return fail('Perfil inválido'); cur.perfil = b.perfil; }
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
};
