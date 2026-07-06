/* Notificações — Central de mensagens → vendedores. Espelha a tela "Notificações".
   GET  /.netlify/functions/notificacoes?destino=regiao&valor=MT
   POST /.netlify/functions/notificacoes  { titulo, texto, tipo, destino, destinoValor }
   POST .../notificacoes?acao=lida  { id, vendedorId }   → marca leitura
*/
const { list, get, put, ok, fail } = require('./_lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      let ns = (await list('notificacoes')).sort((a,b)=>(b.ts||0)-(a.ts||0));
      if (q.destino) ns = ns.filter(n => n.destino === 'all' || (n.destino===q.destino && n.destinoValor===q.valor));
      return ok(ns);
    }
    if (event.httpMethod === 'POST') {
      const q = event.queryStringParameters || {};
      const b = JSON.parse(event.body || '{}');
      if (q.acao === 'lida') {
        const n = await get('notificacoes', b.id);
        if (!n) return fail('Notificação não encontrada', 404);
        n.lidoPor = Array.from(new Set([...(n.lidoPor||[]), b.vendedorId]));
        return ok(await put('notificacoes', n));
      }
      if (!b.titulo) return fail('Informe o título');
      const item = {
        id: b.id, titulo: b.titulo, texto: b.texto||'', tipo: b.tipo||'aviso',
        destino: b.destino||'all', destinoValor: b.destinoValor||'',
        ts: Date.now(), lidoPor: []
      };
      return ok(await put('notificacoes', item));
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
