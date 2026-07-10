/* Fontes & Canais de monitoramento (Inteligência de Mercado).
   GET   /api/canais                          -> lista canais/handles configurados
   POST  /api/canais  { tipo:'handle', id, sub }              -> edita o @/endereço de um canal padrão
   POST  /api/canais  { tipo:'canal', id, grupo, nome, sub, desc } -> adiciona canal custom
   DELETE /api/canais?id=...                   -> remove canal custom
   Fonte real: coleção "canais". Isolado por tenant.
*/
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

exports.handler = async (event) => {
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
      // handle = edição do @/endereço de um canal padrão; canal = fonte custom adicionada
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
};
