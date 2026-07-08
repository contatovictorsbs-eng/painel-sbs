/* Ranking de vendedores por campanha/parceira (App do Vendedor).
   Soma o faturamento das vendas de cada vendedor no recorte (parceira/evento),
   ordena e devolve a colocação, o gap para o 1º lugar e o corte de cada prêmio.

   GET /api/ranking?parceira=Coopercitrus&eventoId=..&campanhaId=..&me=<vendedorId>
   Resposta: { ok, data: { campanha, meta, premios, sellers:[{vendedorId,nome,cidade,fat,pedidos,pos}],
                           me:{...}, need1, pctToFirst, tiers:[{pos,premio,corte,falta,sou}] } }
*/
const { ok, fail, tenantStore } = require('./_lib/store');
const { tenantFromEvent } = require('./_lib/auth');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return fail('Método não suportado', 405);
    const q = event.queryStringParameters || {};
    const db = tenantStore(tenantFromEvent(event));

    // campanha (para meta e prêmios)
    const camps = await db.list('campanhas', null, { limit: 500 });
    const camp = (q.campanhaId ? camps.find(c => String(c.id) === String(q.campanhaId)) : null)
               || camps.find(c => (c.status||'Ativa') === 'Ativa') || null;
    const meta = (camp && +camp.meta) || 0;
    const premios = (camp && Array.isArray(camp.premios) && camp.premios.length)
      ? camp.premios
      : [['1º lugar','Prêmio 1º lugar'],['2º lugar','Prêmio 2º lugar'],['3º lugar','Prêmio 3º lugar']];

    // vendas do recorte → soma por vendedor
    let vendas = await db.list('vendas', null, { limit: 5000 });
    if (q.parceira) vendas = vendas.filter(v => (v.parceira||'') === q.parceira);
    if (q.eventoId) vendas = vendas.filter(v => (v.eventoId||'') === q.eventoId);

    const vendedores = await db.list('vendedores', null, { limit: 5000 });
    const byId = {};
    vendedores.forEach(v => { byId[v.id] = v; });

    const agg = {};
    vendas.forEach(v => {
      const id = v.vendedorId || 'sem-id';
      if (!agg[id]) agg[id] = { vendedorId: id, nome: (byId[id] && byId[id].nome) || v.vendedorNome || 'Vendedor', cidade: (byId[id] && byId[id].cidade) || '', fat: 0, pedidos: 0 };
      agg[id].fat += (+v.valor || 0);
      agg[id].pedidos += 1;
    });

    const sellers = Object.values(agg).sort((a,b)=>b.fat-a.fat).map((s,i)=>Object.assign(s,{pos:i+1}));
    const me = q.me ? (sellers.find(s => String(s.vendedorId) === String(q.me)) || null) : null;
    const first = sellers[0] || { fat: 0 };

    let need1 = 0, pctToFirst = 0, tiers = [];
    if (me) {
      need1 = Math.max(first.fat - me.fat + 1, 0);
      pctToFirst = first.fat ? Math.round((first.fat - me.fat) / first.fat * 100) : 0;
      tiers = [0,1,2].map(i => {
        const alvo = sellers[i]; const corte = alvo ? alvo.fat : me.fat;
        const sou = me.pos === i+1;
        const falta = Math.max(sou ? 0 : (corte - me.fat + (i < me.pos-1 ? 1 : 0)), 0);
        return { pos: i+1, premio: (premios[i] && premios[i][1]) || (`${i+1}º`), corte, falta, sou };
      });
    }

    return ok({
      campanha: camp ? camp.nome : null, meta, premios,
      sellers, me, first, need1, pctToFirst, tiers,
      count: sellers.length
    });
  } catch (e) { return fail(e.message, 500); }
};
