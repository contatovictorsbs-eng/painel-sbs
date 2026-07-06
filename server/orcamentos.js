/* Orçamentos com pedido de desconto/bonificação — do App do Vendedor à alçada do
   gerente regional. O vendedor abre um orçamento atrelado a um lead e solicita
   desconto/bonificação; o gerente regional negocia (libera mais ou menos) e a
   decisão volta para o app.
   GET   /.netlify/functions/orcamentos?status=Solicitado&regiao=PR&vendedor=...
   POST  /.netlify/functions/orcamentos   { leadId, produto, qtd, precoTabela, descontoSolic, bonifSolic, justificativa, vendedor, regiao }
   PATCH /.netlify/functions/orcamentos   { id, aprovar:true|false, descontoAprov, bonifAprov, notaGerente }
   Coleção: "orcamentos". Alçada de desconto por perfil pode vir de env DESCONTO_ALCADA.
*/
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

const valorFinal = (o) => {
  const bruto = (o.precoTabela || 0) * (o.qtd || 0);
  const d = (o.descontoAprov != null ? o.descontoAprov : o.descontoSolic) || 0;
  return Math.round(bruto * (1 - d / 100));
};

exports.handler = async (event) => {
  try {
    const db = tenantStore(tenantFromEvent(event));
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      let os = await db.list('orcamentos', null, pageOpts(q));
      if (q.status)   os = os.filter(o => o.status === q.status);
      if (q.regiao)   os = os.filter(o => (o.regiao || '') === q.regiao);
      if (q.vendedor) os = os.filter(o => (o.vendedor || '') === q.vendedor);
      if (q.leadId)   os = os.filter(o => String(o.leadId) === String(q.leadId));
      return ok(os.map(o => ({ ...o, valorFinal: valorFinal(o) })));
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.leadId) return fail('Vincule o orçamento a um lead');
      const lead = await db.get('leads', b.leadId);
      const item = {
        id: b.id, leadId: b.leadId, leadNome: b.leadNome || (lead && lead.nome) || '',
        produto: b.produto || '', qtd: Number(b.qtd) || 0, precoTabela: Number(b.precoTabela) || 0,
        descontoSolic: Number(b.descontoSolic) || 0, descontoAprov: null,
        bonifSolic: b.bonifSolic || '', bonifAprov: '', justificativa: b.justificativa || '',
        status: 'Solicitado', notaGerente: '', regiao: b.regiao || (lead && lead.uf) || '',
        vendedor: b.vendedor || '', criadoEm: new Date().toISOString()
      };
      const saved = await db.put('orcamentos', item);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'criou', entidade:'orcamentos', entidadeId:saved.id, ip:clientIp(event) });
      return ok(saved);
    }

    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const o = await db.get('orcamentos', b.id);
      if (!o) return fail('Orçamento não encontrado', 404);
      if (b.aprovar === false) {
        o.status = 'Recusado';
        o.notaGerente = b.notaGerente || 'Sem condição de liberar desconto no momento.';
      } else {
        const desc = Number(b.descontoAprov) || 0;
        o.descontoAprov = desc;
        o.bonifAprov = b.bonifAprov || o.bonifSolic;
        o.notaGerente = b.notaGerente || '';
        o.status = (desc !== o.descontoSolic || (b.bonifAprov && b.bonifAprov !== o.bonifSolic)) ? 'Ajustado' : 'Aprovado';
      }
      o.decididoEm = new Date().toISOString();
      const saved = await db.put('orcamentos', o);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'editou', entidade:'orcamentos', entidadeId:o.id, ip:clientIp(event) });
      return ok({ ...saved, valorFinal: valorFinal(saved) });
    }

    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
