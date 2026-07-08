/* Aprovações — esteira colaborativa de projetos/eventos (Marketing → Gerência → Inteligência → CEO).
   GET   /api/aprovacoes                      -> lista projetos em aprovação (paginado)
   POST  /api/aprovacoes  { projeto, acao, quem, fase }   -> registra decisão + histórico
   PATCH /api/aprovacoes  { id, faseAtual, status }       -> move de fase / decide
   Fonte real: coleção "aprovacoes" (+ histórico em aprovacoes_hist). Isolado por tenant.
*/
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

const FASES = ['marketing', 'gerente', 'mercado', 'ceo'];

exports.handler = async (event) => {
  try {
    const db = tenantStore(tenantFromEvent(event));
    const u = fromEvent(event) || {};

    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      if (q.tipo === 'dossies') return ok(await db.list('dossies', {}, pageOpts(q)));
      const filtros = {};
      if (q.status)    filtros.status = q.status;
      if (q.faseAtual) filtros.faseAtual = q.faseAtual;
      const ls = await db.list('aprovacoes', filtros, pageOpts(q));
      return ok(ls);
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      // Dossiê completo arquivado pela decisão do CEO (aprovar/reprovar) — consulta futura
      if (b.tipo === 'dossie' && b.dossie) {
        const dossie = Object.assign({}, b.dossie, { arquivadoEm: new Date().toISOString(), arquivadoPor: u.sub || 'sistema' });
        const savedDos = await db.put('dossies', dossie);
        await db.put('aprovacoes_hist', { projeto: dossie.proj || dossie.projId, acao: dossie.decisao === 'Aprovado' ? 'aprovou o investimento (dossiê arquivado)' : 'reprovou o investimento (dossiê arquivado)', quem: dossie.decididoPor || u.sub || 'CEO', fase: 'ceo', ts: new Date().toISOString() });
        await audit({ usuario:u.sub, perfil:u.perfil, acao:'arquivou-dossie', entidade:'dossies', entidadeId:dossie.id, ip:clientIp(event) });
        return ok(savedDos);
      }
      if (!b.projeto) return fail('Informe o projeto');
      const now = new Date().toISOString();
      const ent = {
        projeto: b.projeto, acao: b.acao || 'avaliou', quem: b.quem || u.sub || 'sistema',
        fase: b.fase || 'marketing', ts: now
      };
      await db.put('aprovacoes_hist', ent);
      await audit({ usuario:u.sub, perfil:u.perfil, acao:b.acao||'avaliou', entidade:'aprovacoes', entidadeId:b.projeto, ip:clientIp(event) });
      return ok(ent);
    }

    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const proj = await db.get('aprovacoes', b.id);
      if (!proj) return fail('Projeto não encontrado', 404);
      if (b.faseAtual && !FASES.includes(b.faseAtual)) return fail('Fase inválida');
      const now = new Date().toISOString();
      if (b.faseAtual) proj.faseAtual = b.faseAtual;
      if (b.status)    proj.status = b.status;
      proj.atualizadoEm = now;
      const saved = await db.put('aprovacoes', proj);
      await db.put('aprovacoes_hist', { projeto: proj.nome || proj.id, acao: b.status || 'moveu', quem: u.sub || 'sistema', fase: proj.faseAtual, ts: now });
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'editou', entidade:'aprovacoes', entidadeId:proj.id, ip:clientIp(event) });
      return ok(saved);
    }

    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
