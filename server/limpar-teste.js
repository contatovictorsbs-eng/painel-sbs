/* Limpeza de dados de teste/demonstração.
   Remove de todas as coleções os registros marcados com { teste:true }.
   Uso: depois de subir para produção, chame uma vez para zerar os exemplos.

   POST /api/limpar-teste   { escopo?: 'todos' | ['leads','vendas',...] }
   Resposta: { ok, data:{ removidos:{colecao:n,...}, total } }

   Só CEO ou admin (perfil no token) podem executar.
*/
const { ok, fail, audit, clientIp, tenantStore } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

const COLECOES = ['leads','vendas','orcamentos','vendedores','campanhas','produtos','notificacoes','monitoramentos','aprovacoes','aprovacoes_hist'];

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return fail('Método não suportado', 405);
    const u = fromEvent(event) || {};
    if (u.perfil && !['ceo','admin'].includes(u.perfil)) return fail('Apenas CEO/Admin podem limpar dados de teste', 403);

    const db = tenantStore(tenantFromEvent(event));
    const body = JSON.parse(event.body || '{}');
    const escopo = Array.isArray(body.escopo) ? body.escopo : COLECOES;

    const removidos = {}; let total = 0;
    for (const col of escopo) {
      let itens = [];
      try { itens = await db.list(col, null, { limit: 10000 }); } catch (e) { continue; }
      const teste = itens.filter(x => x && x.teste === true);
      for (const t of teste) { try { await db.remove(col, t.id); total++; } catch (e) {} }
      if (teste.length) removidos[col] = teste.length;
    }

    await audit({ usuario:u.sub, perfil:u.perfil, acao:'excluiu', entidade:'dados-de-teste', entidadeId:'*', ip:clientIp(event), detalhe:JSON.stringify(removidos) });
    return ok({ removidos, total });
  } catch (e) { return fail(e.message, 500); }
};
