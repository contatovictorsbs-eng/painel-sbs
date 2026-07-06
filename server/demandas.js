/* Quadro de demandas — compartilhado entre Marketing, Gerência Nacional e
   Inteligência de Mercado; o CEO pode abrir demandas para qualquer área.
   GET  /.netlify/functions/demandas?destino=Inteligência&status=Solicitado
   POST /.netlify/functions/demandas  { tipo, destino, solic, origem, regiao, prio, prazo, desc }
   POST .../demandas?acao=status  { id, status }   → move no kanban
*/
const { list, get, put, ok, fail } = require('./_lib/store');
const FLUXO = ['Solicitado','Em análise','Em desenvolvimento','Aguardando aprovação','Finalizado'];

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      let ds = (await list('demandas')).sort((a,b)=>(b.ts||0)-(a.ts||0));
      if (q.destino) ds = ds.filter(d => (d.destino||'') === q.destino);
      if (q.status)  ds = ds.filter(d => d.status === q.status);
      if (q.origem)  ds = ds.filter(d => (d.origem||'').includes(q.origem));
      return ok({ itens: ds, fluxo: FLUXO });
    }
    if (event.httpMethod === 'POST') {
      const q = event.queryStringParameters || {};
      const b = JSON.parse(event.body || '{}');
      if (q.acao === 'status') {
        const d = await get('demandas', b.id);
        if (!d) return fail('Demanda não encontrada', 404);
        if (!FLUXO.includes(b.status)) return fail('Status inválido');
        d.status = b.status;
        return ok(await put('demandas', d));
      }
      if (!b.desc) return fail('Descreva a demanda');
      const item = {
        id: b.id, tipo: b.tipo||'Outros', destino: b.destino||'Marketing',
        solic: b.solic||'', origem: b.origem||b.solic||'', regiao: b.regiao||'',
        area: b.area||'', prio: b.prio||'Média', status: 'Solicitado',
        resp: b.resp||'A definir', prazo: b.prazo||'', desc: b.desc, ts: Date.now()
      };
      return ok(await put('demandas', item));
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
