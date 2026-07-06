/* Vendas do App de Eventos — grava de volta na base (sentido duplo).
   GET  /.netlify/functions/vendas?eventoId=..&vendedorId=..
   POST /.netlify/functions/vendas  { vendedorId, eventoId, cnpjCliente, produto, quantidade, valor, parceira }
*/
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

exports.handler = async (event) => {
  try {
    const db = tenantStore(tenantFromEvent(event));
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      let vs = await db.list('vendas', null, pageOpts(q));
      if (q.eventoId)   vs = vs.filter(v => v.eventoId === q.eventoId);
      if (q.vendedorId) vs = vs.filter(v => v.vendedorId === q.vendedorId);
      if (q.parceira)   vs = vs.filter(v => (v.parceira||'') === q.parceira);
      const total = vs.reduce((s,v)=>s+(+v.valor||0),0);
      return ok({ itens: vs, total, qtd: vs.length });
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.vendedorId || !b.produto) return fail('vendedorId e produto obrigatórios');
      const item = {
        id: b.id, vendedorId: b.vendedorId, eventoId: b.eventoId||'',
        parceira: b.parceira||null, cnpjCliente: b.cnpjCliente||'',
        produto: b.produto, quantidade: +b.quantidade||0, valor: +b.valor||0,
        ts: b.ts || Date.now()
      };
      const saved = await db.put('vendas', item);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'criou', entidade:'vendas', entidadeId:saved.id, ip:clientIp(event) });
      return ok(saved);
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
