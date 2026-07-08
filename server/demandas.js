/* Quadro de demandas — compartilhado entre Marketing, Gerência Nacional e
   Inteligência de Mercado; o CEO pode abrir demandas para qualquer área.
   GET  /api/demandas?destino=Inteligência&status=Solicitado
   POST /api/demandas  { tipo, destino, solic, origem, regiao, prio, prazo, desc, envolvidos[], mencoes[] }
   POST .../demandas?acao=status   { id, status }   → move no kanban
   POST .../demandas?acao=excluir  { id }           → remove a demanda
   Menções (@Marketing/@CEO/@Inteligência/@Gerente Nacional): geram um alerta
   para a área marcada, para ela saber que foi convidada à demanda. */
const { list, get, put, remove, ok, fail } = require('./_lib/store');
const FLUXO = ['Solicitado','Em análise','Em desenvolvimento','Aguardando aprovação','Finalizado'];
const AREAS = ['Marketing','CEO','Inteligência','Gerente Nacional'];
// Normaliza o texto de menções (@Marketing, etc.) numa lista de áreas válidas.
function parseMencoes(arr){
  const out = [];
  (Array.isArray(arr) ? arr : String(arr||'').split(/[,\s]+/)).forEach(m => {
    const t = String(m||'').replace(/^@/,'').trim().toLowerCase();
    const area = AREAS.find(a => a.toLowerCase() === t
      || (t==='inteligencia'&&a==='Inteligência')
      || (t==='gerente'&&a==='Gerente Nacional'));
    if (area && out.indexOf(area) < 0) out.push(area);
  });
  return out;
}
async function alertarMencoes(mencoes, dem){
  for (const area of (mencoes||[])) {
    try {
      await put('alertas', { id:'al_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        area, tipo:'mencao', titulo:'Você foi marcado numa demanda',
        texto:(dem.tipo||'Demanda')+' — '+(dem.desc||'').slice(0,80), demandaId:dem.id, ts:Date.now() });
    } catch (e) {}
  }
}

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
      if (q.acao === 'excluir') {
        if (!b.id) return fail('Informe o id da demanda');
        await remove('demandas', b.id);
        return ok({ excluido: b.id });
      }
      if (!b.desc) return fail('Descreva a demanda');
      const mencoes = parseMencoes(b.mencoes || b.envolvidos);
      const item = {
        id: b.id, tipo: b.tipo||'Outros', destino: b.destino||'Marketing',
        solic: b.solic||'', origem: b.origem||b.solic||'', regiao: b.regiao||'',
        area: b.area||'', prio: b.prio||'Média', status: 'Solicitado',
        resp: b.resp||'A definir', prazo: b.prazo||'', desc: b.desc,
        envolvidos: Array.isArray(b.envolvidos)?b.envolvidos:[], mencoes, ts: Date.now()
      };
      const saved = await put('demandas', item);
      await alertarMencoes(mencoes, saved);
      return ok(saved);
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
