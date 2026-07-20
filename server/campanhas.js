/* Campanhas comerciais — nome, GTN, período (calendário), meta de faturamento,
   canal principal, premiação por colocação e a TABELA DE PRODUTOS DA CAMPANHA
   (cada produto do catálogo com o preço específico daquela campanha). É essa
   tabela que o App do Vendedor lê para registrar vendas.
   A meta é POR CAMPANHA (não por vendedor) e aparece para todos os vendedores.
   GET   /api/campanhas
   POST  /api/campanhas   { id?, nome, gtn, inicio, fim, meta, canal, premios[], produtos:[{produtoId,preco}] }
   PATCH /api/campanhas   { id, ...campos }  // ex.: encerrar → { id, status:'Encerrada' }
   Coleção: "campanhas".
*/
const { list, get, put, remove, ok, fail } = require('./_lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      return ok(await list('campanhas'));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.nome) return fail('Informe o nome da campanha');
      const item = Object.assign({}, b, {
        id: b.id, nome: b.nome, gtn: b.gtn || '', inicio: b.inicio || '', fim: b.fim || '',
        meta: Number(b.meta) || 0, canal: b.canal || '',
        fat: Number(b.fat) || 0, pedidos: Number(b.pedidos) || 0, roi: Number(b.roi) || 0,
        premios: Array.isArray(b.premios) ? b.premios : [],
        produtos: Array.isArray(b.produtos) ? b.produtos.map(p => ({ produtoId: p.produtoId, preco: Number(p.preco) || 0 })) : [],
        cashback: b.cashback && b.cashback.ativo ? { ativo: true, pct: Number(b.cashback.pct) || 0 } : { ativo: false, pct: 0 },
        status: b.status || 'Ativa', criadoEm: b.criadoEm || new Date().toISOString()
      });
      return ok(await put('campanhas', item));
    }
    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const c = await get('campanhas', b.id);
      if (!c) return fail('Campanha não encontrada', 404);
      return ok(await put('campanhas', { ...c, ...b }));
    }
    if (event.httpMethod === 'DELETE') {
      const q = event.queryStringParameters || {};
      const id = q.id || (JSON.parse(event.body || '{}').id);
      if (!id) return fail('id obrigatório');
      await remove('campanhas', id);
      return ok({ removido: id });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
