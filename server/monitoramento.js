/* Monitoramento de concorrentes — robôs de coleta com FONTES referenciadas.
   Cada robô guarda exatamente as fontes (com link/@) que deve ler, para que a
   origem de cada achado seja rastreável e a fonte possa ser removida.
   GET    /api/monitoramento
   POST   /api/monitoramento   { alvo, freq, fontes:[{tipo, ref}] }
   PATCH  /api/monitoramento   { id, fontes:[...] }   -> atualiza/adiciona/remove fontes
   DELETE /api/monitoramento?id=...
   Coletor real: functions/coletor-concorrentes.js (Scheduled) grava os "achados"
   por robô, cada achado carregando { fonte, ref } de origem.
*/
const { list, get, put, remove, ok, fail } = require('./_lib/store');

const norm = (f) => ({ tipo: f.tipo || 'Fonte', ref: (f.ref || '').trim() });

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      return ok(await list('monitoramentos'));
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.alvo) return fail('Informe o alvo (concorrente, produto ou índice)');
      const fontes = (b.fontes || []).map(norm).filter(f => f.ref);
      if (!fontes.length) return fail('Adicione ao menos 1 fonte com link/@ de onde buscar');
      const item = {
        id: b.id, alvo: b.alvo, freq: b.freq || 'Diário', status: 'Ativo',
        fontes, achados: 0, ultimo: null, criadoEm: new Date().toISOString()
      };
      return ok(await put('monitoramentos', item));
    }

    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const r = await get('monitoramentos', b.id);
      if (!r) return fail('Monitoramento não encontrado', 404);
      if (Array.isArray(b.fontes)) r.fontes = b.fontes.map(norm).filter(f => f.ref);
      if (b.freq)   r.freq = b.freq;
      if (b.status) r.status = b.status;
      return ok(await put('monitoramentos', r));
    }

    if (event.httpMethod === 'DELETE') {
      const id = (event.queryStringParameters || {}).id;
      if (!id) return fail('id obrigatório');
      return ok(await remove('monitoramentos', id));
    }

    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
