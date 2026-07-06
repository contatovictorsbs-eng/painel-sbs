/* Vendedores — CRUD. Espelha a tela "Vendedores" e o cadastro do App de Eventos.
   GET  /.netlify/functions/vendedores?regiao=MT&parceira=coopercitrus
   POST /.netlify/functions/vendedores  { nome, cpf, telefone, email, regiao, parceira }
*/
const { ok, fail, audit, clientIp, tenantStore, pageOpts } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

exports.handler = async (event) => {
  try {
    const db = tenantStore(tenantFromEvent(event));
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      // filtros vão ao BANCO (não em JS pós-paginação) para escalar corretamente
      const filtros = {};
      if (q.regiao)   filtros.regiao = q.regiao;
      if (q.parceira) filtros.parceira = q.parceira;
      if (q.status)   filtros.status = q.status;
      const vs = await db.list('vendedores', filtros, pageOpts(q));
      return ok(vs);
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.nome) return fail('Informe o nome');
      const item = {
        id: b.id, nome: b.nome, usuario: b.usuario||'', cpf: b.cpf||'', telefone: b.telefone||'',
        email: b.email||'', cidade: b.cidade||'', uf: b.uf||'', regiao: b.regiao||'', gerente: b.gerente||'',
        parceira: b.parceira||null, origem: b.origem||(b.parceira?(b.parceira+' · App de Eventos'):'App SBS Eventos'),
        logou: !!b.logou, ultimoLogin: b.ultimoLogin||null, precisaRedefinir: !!b.precisaRedefinir,
        vendas: b.vendas||0, leads: b.leads||0,
        status: b.status || 'pendente', criadoEm: b.criadoEm || new Date().toISOString()
      };
      const saved = await db.put('vendedores', item);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao: b.id?'editou':'criou', entidade:'vendedores', entidadeId:saved.id, ip:clientIp(event) });
      return ok(saved);
    }
    if (event.httpMethod === 'PATCH') {
      // atualização parcial: marca login (logou/ultimoLogin) ou redefinição de senha (precisaRedefinir)
      const b = JSON.parse(event.body || '{}');
      let alvo = null;
      if (b.id) alvo = await db.get('vendedores', b.id);
      if (!alvo && b.usuario) { const all = await db.list('vendedores', {}, { limite: 1000 }); alvo = (all||[]).find(v => (v.usuario||'').toLowerCase() === String(b.usuario).toLowerCase() || (v.nome||'').toLowerCase() === String(b.usuario).toLowerCase()); }
      if (!alvo) return fail('Vendedor não encontrado', 404);
      ['logou','ultimoLogin','precisaRedefinir','status','regiao','gerente'].forEach(k => { if (b[k] !== undefined) alvo[k] = b[k]; });
      if (b.logou && alvo.status === 'pendente') alvo.status = 'ativo';
      const saved = await db.put('vendedores', alvo);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao: b.precisaRedefinir!==undefined?'redefinir_senha':'login_vendedor', entidade:'vendedores', entidadeId:saved.id, ip:clientIp(event) });
      return ok(saved);
    }
    if (event.httpMethod === 'DELETE') {
      const id = (event.queryStringParameters||{}).id;
      if (!id) return fail('id obrigatório');
      const del = await db.remove('vendedores', id);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'excluiu', entidade:'vendedores', entidadeId:id, ip:clientIp(event) });
      return ok(del);
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
