/* Auditoria LGPD — trilha de acessos e alterações.
   GET /api/auditoria           → últimos registros (admin/TI)
   GET /api/auditoria?usuario=x  → filtra por usuário
   Requer token de perfil 'admin' ou 'ti'. */
const { list, ok, fail } = require('./_lib/store');
const { requireAuth } = require('./_lib/auth');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return fail('Método não suportado', 405);
    const r = requireAuth(event, ['admin','ti']);
    if (r.erro) return fail(r.erro, r.code);
    const q = event.queryStringParameters || {};
    let regs = await list('auditoria');
    if (q.usuario)  regs = regs.filter(x => x.usuario === q.usuario);
    if (q.entidade) regs = regs.filter(x => x.entidade === q.entidade);
    if (q.acao)     regs = regs.filter(x => x.acao === q.acao);
    regs.sort((a,b) => (b.ts||'').localeCompare(a.ts||''));
    return ok(regs.slice(0, Number(q.limite) || 200));
  } catch (e) { return fail(e.message, 500); }
};
