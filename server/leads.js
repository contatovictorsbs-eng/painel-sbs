/* Leads — esteira/pipeline. Liga o App do Vendedor ao painel (Marketing/Gerente).
   GET   /api/leads?status=Novo&vendedor=...&evento=...
   POST  /api/leads            { nome, prop, ha, fone, produto, potencial, vendedor, evento }
   PATCH /api/leads            { id, status }                     -> move na esteira
   PATCH /api/leads?perda=1    { id, motivoPerda, swot:{...} }    -> registra perda + SWOT
   Fonte real: coleção "leads". Cada mudança de status grava no histórico.
*/
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

const STAGES = ['Novo', 'Contatado', 'Qualificado', 'Proposta', 'Ganho', 'Perdido'];

exports.handler = async (event) => {
  try {
    const db = tenantStore(tenantFromEvent(event));
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const filtros = {};
      if (q.status)   filtros.status = q.status;
      if (q.vendedor) filtros.vendedor = q.vendedor;
      if (q.evento)   filtros.evento = q.evento;
      const ls = await db.list('leads', filtros, pageOpts(q));
      return ok(ls);
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.nome) return fail('Informe o nome do lead');
      const now = new Date().toISOString();
      const item = {
        id: b.id, nome: b.nome, prop: b.prop || '', ha: b.ha || '', fone: b.fone || '',
        produto: b.produto || '', potencial: b.potencial || 'Quente',
        status: 'Novo', valor: 0, vendedor: b.vendedor || '', evento: b.evento || '',
        motivoPerda: '', swot: { forca: '', fraqueza: '', oportunidade: '', ameaca: '' },
        hist: [{ status: 'Novo', quando: now }], criadoEm: now, atualizadoEm: now
      };
      const saved = await db.put('leads', item);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'criou', entidade:'leads', entidadeId:saved.id, ip:clientIp(event) });
      return ok(saved);
    }

    if (event.httpMethod === 'PATCH') {
      const q = event.queryStringParameters || {};
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const lead = await db.get('leads', b.id);
      if (!lead) return fail('Lead não encontrado', 404);
      const now = new Date().toISOString();

      if (q.perda) {
        lead.status = 'Perdido';
        lead.motivoPerda = b.motivoPerda || 'Não informado';
        lead.swot = b.swot || lead.swot;
        lead.hist = (lead.hist || []).concat([{ status: 'Perdido', quando: now }]);
      } else {
        if (!STAGES.includes(b.status)) return fail('Status inválido');
        lead.status = b.status;
        lead.hist = (lead.hist || []).concat([{ status: b.status, quando: now }]);
      }
      lead.atualizadoEm = now;
      const saved = await db.put('leads', lead);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'editou', entidade:'leads', entidadeId:lead.id, ip:clientIp(event) });
      return ok(saved);
    }

    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
