/* Inteligência de Mercado — leitura/gravação das coleções mi_*.
   Uma função para os 4 tipos (mapeados para as tabelas sbs_mi_*):
     GET  /api/mercado?tipo=cotacoes|concorrentes|regioes|tendencias|movimentos
     POST /api/mercado  { tipo, ...item }
   Resposta padrão { ok, data }. Isolado por tenant no store quando aplicável. */
const { list, put, ok, fail, audit, clientIp } = require('./_lib/store');
const { fromEvent } = require('./_lib/auth');

const MAP = {
  cotacoes:     'mi_cotacoes',
  concorrentes: 'mi_concorrentes',
  movimentos:   'mi_cc_movimentos',
  regioes:      'mi_regioes',
  tendencias:   'mi_tendencias'
};

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    if (event.httpMethod === 'GET') {
      const tipo = q.tipo;
      // sem tipo: devolve tudo agrupado (útil para o painel carregar de uma vez)
      if (!tipo) {
        const out = {};
        for (const k in MAP) out[k] = await list(MAP[k]);
        return ok(out);
      }
      const col = MAP[tipo];
      if (!col) return fail('tipo inválido: ' + tipo);
      return ok(await list(col));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const col = MAP[b.tipo];
      if (!col) return fail('tipo inválido: ' + b.tipo);
      const item = Object.assign({}, b);
      delete item.tipo;
      if (!item.id) item.id = 'mi' + Date.now();
      const saved = await put(col, item);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'editou', entidade:col, entidadeId:item.id, ip:clientIp(event) });
      return ok(saved);
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
