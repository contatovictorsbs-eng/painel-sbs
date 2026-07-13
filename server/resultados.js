/* Resultados das ações — consolida as DEMANDAS que viraram ação (evento/campanha)
   e devolve o resultado ESPERADO (meta) × OBTIDO (realizado) de cada uma, para os
   painéis de Gerente Nacional e Inteligência de Mercado acompanharem o andamento e
   o retorno das ações comerciais que abriram/estudaram.

   Origem dos dados (JOIN, somente leitura — não grava nada):
     - demandas  : a ação nasce aqui (tipo, área, responsável, prazo, status);
                   ao virar evento ganha eventoId + convertidoEvento.
     - eventos   : resultado realizado (receita, conversão, ROI, status) — fallback.
     - vendas    : REALIZADO real — soma de vendas.valor por eventoId (App de Eventos).
     - campanhas : quando o evento tem campanha vinculada, meta (esperado) e fat (obtido).

   Contrato:
     GET /api/resultados[?area=Inteligência|Gerente%20Nacional]
       → { itens: [{ id, nome, area, origem, resp, prazo, regiao, status, tipo,
                     esperado, obtido, roi, conv, eventoId, convertido, ts }],
           kpis: { total, andamento, concluidas, receita, meta, roiMedio } }
   Coleções lidas: demandas, eventos, campanhas.
*/
const { list, ok, fail } = require('./_lib/store');

function statusAcao(dem, ev){
  if (ev) {
    if (ev.status === 'Realizado') return 'Concluída';
    if (ev.aprovacao) return 'Em aprovação';
    return 'Ativa';
  }
  return dem.status || 'Solicitado';
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return fail('Método não suportado', 405);
    const q = event.queryStringParameters || {};

    const [dem, evs, camps, vendas] = await Promise.all([
      list('demandas'), list('eventos'), list('campanhas'), list('vendas')
    ]);
    const evById = {};
    (evs || []).forEach(e => { evById[String(e.id)] = e; });
    // Realizado real: soma das vendas por evento (App de Eventos grava vendas com eventoId).
    const vAgg = {}; // eventoId -> { rec, n }
    (vendas || []).forEach(v => {
      const k = String(v.eventoId || '');
      if (!k) return;
      if (!vAgg[k]) vAgg[k] = { rec: 0, n: 0 };
      vAgg[k].rec += Number(v.valor || 0) || 0;
      vAgg[k].n += 1;
    });

    let itens = (dem || []).map(d => {
      const ev = d.eventoId ? evById[String(d.eventoId)] : null;
      const camp = ev ? (camps || []).find(c => c.evento === ev.nome) : null;
      const vg = ev ? vAgg[String(ev.id)] : null;
      const recVend = vg ? vg.rec : 0;
      const pedidos = vg ? vg.n : 0;
      const esperado = Number((camp && camp.meta) || 0) || 0;
      const obtido = recVend > 0 ? recVend : (camp ? Number(camp.fat || 0) : (ev ? Number(ev.receita || 0) : 0));
      const custo = Number((ev && ev.custo) || (camp && camp.custo) || 0) || 0;
      const roi = (obtido > 0 && custo > 0) ? (obtido / custo) : (ev ? Number(ev.roi || 0) : (camp ? Number(camp.roi || 0) : 0));
      const conv = ev ? Number(ev.conv || 0) : 0;
      return {
        id: d.id,
        nome: d.convertidoEvento || d.tipo || String(d.desc || '').slice(0, 60) || 'Ação',
        area: d.destino || d.area || '—',
        origem: d.origem || d.solic || '—',
        resp: d.resp || 'A definir',
        prazo: d.prazo || '',
        regiao: d.regiao || '',
        status: statusAcao(d, ev),
        tipo: ev ? 'Evento' : (d.tipo || 'Demanda'),
        esperado, obtido, roi, conv, pedidos,
        eventoId: d.eventoId || null,
        convertido: !!ev,
        ts: d.ts || 0
      };
    });

    if (q.area) {
      const alvo = String(q.area).toLowerCase();
      itens = itens.filter(i => (i.area || '').toLowerCase().includes(alvo));
    }
    itens.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const conv = itens.filter(i => i.convertido);
    const rr = conv.filter(i => i.roi > 0);
    const kpis = {
      total: itens.length,
      andamento: itens.filter(i => !i.convertido).length,
      concluidas: itens.filter(i => i.status === 'Concluída').length,
      receita: conv.reduce((s, i) => s + (i.obtido || 0), 0),
      meta: conv.reduce((s, i) => s + (i.esperado || 0), 0),
      roiMedio: rr.length ? (rr.reduce((s, i) => s + i.roi, 0) / rr.length) : 0
    };

    return ok({ itens, kpis });
  } catch (e) { return fail(e.message, 500); }
};
