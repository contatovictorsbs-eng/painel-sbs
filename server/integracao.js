/* Integração SBS — barramento de dados entre os dois sistemas SBS
   (Painel SBS · Marketing/Gestão  ↔  SBS Brasil · Gestão Comercial),
   ambos no mesmo banco Supabase (Cloudflare).

   Modelo de "envelope" genérico: cada registro carrega um payload JSON livre,
   então NOVAS funcionalidades trocam dados sem alterar o schema.

   GET   /api/integracao?de=sbs-brasil&tipo=vendas   -> lista registros (paginado)
        - de   : filtra pela ORIGEM ('painel-sbs' | 'sbs-brasil'); omitido = todos
        - tipo : filtra por tipo de dado (vendas, vendedores, clientes, campanhas,
                 pedidos, produtos, eventos, … — livre)
   POST  /api/integracao  { sistema, tipo, ref, titulo, resumo, payload }
        - grava um envelope no barramento. `sistema` = origem (default 'painel-sbs').
   DELETE /api/integracao?id=...                      -> remove um envelope

   Coleção: "integracao" (compartilhada pelos dois projetos). Isolada por tenant.
*/
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

const SISTEMA_LOCAL = 'painel-sbs';

exports.handler = async (event) => {
  try {
    const db = tenantStore(tenantFromEvent(event));
    const u = fromEvent(event) || {};

    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const filtros = {};
      if (q.de)   filtros.sistema = q.de;
      if (q.tipo) filtros.tipo = q.tipo;
      const ls = await db.list('integracao', filtros, pageOpts(q));
      return ok(ls);
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.tipo) return fail('Informe o tipo do dado (vendas, vendedores, …)');
      const now = new Date().toISOString();
      const ent = {
        sistema: b.sistema || SISTEMA_LOCAL,       // origem do dado
        tipo:    String(b.tipo),
        ref:     b.ref || '',                       // id do registro no sistema de origem
        titulo:  b.titulo || '',
        resumo:  b.resumo || '',
        payload: b.payload || {},                   // dados completos (JSON livre)
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
};
