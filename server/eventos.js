/* Eventos — agenda compartilhada entre perfis (Marketing, Gerência, Vendas, Inteligência).
   Todos leem e escrevem a MESMA coleção `eventos`, então o calendário reflete para todos.
   Isolamento por tenant (parceira) via token; SBS (super-tenant) enxerga todos.

   GET    /.netlify/functions/eventos?limite=&pagina=      → lista (paginada)
   POST   /.netlify/functions/eventos   { ...evento }       → cria/atualiza
   POST   /.netlify/functions/eventos   { acaoEvento:'aprovacao', id }  → manda p/ esteira de aprovação
   PATCH  /.netlify/functions/eventos   { id, ...campos }    → atualiza campos
   DELETE /.netlify/functions/eventos?id=...
   Escreve trilha LGPD em `auditoria` a cada mudança. */
const { tenantStore, pageOpts, audit, clientIp, ok, fail } = require('./_lib/store');
const { fromEvent, tenantFromEvent } = require('./_lib/auth');

// Estados válidos do app no fluxo de trabalho (espelha APP_ESTADOS no front)
const APP_ESTADOS = ['nao_consta', 'a_criar', 'em_criacao', 'publicado'];

exports.handler = async (event) => {
  try {
    const store = tenantStore(tenantFromEvent(event));
    const ip = clientIp(event);
    const q = event.queryStringParameters || {};

    if (event.httpMethod === 'GET') {
      const rows = await store.list('eventos', null, pageOpts(q));
      return ok(rows);
    }

    // escrita: usa a identidade do token quando houver; senão atribui ao criador
    // enviado no corpo (consistente com as demais funções de dados). Tenant vem do token.
    const u = fromEvent(event);
    const quem = (u && u.sub) || 'sistema', perfil = (u && u.perfil) || 'sistema';

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');

      if (b.acaoEvento === 'aprovacao') {
        if (!b.id) return fail('id do evento obrigatório');
        const ev = await store.get('eventos', b.id);
        if (!ev) return fail('Evento não encontrado', 404);
        ev.aprovacao = true;
        ev.aprovacaoStatus = 'Em análise';
        ev.aprovacaoFase = 1;                 // Marketing → Gerência → Inteligência → CEO
        ev.enviadoPor = quem;
        await store.put('eventos', ev);
        await audit({ usuario: quem, perfil, acao:'evento_para_aprovacao', entidade:'eventos', entidadeId: String(ev.id), ip });
        return ok(ev);
      }

      if (!b.nome) return fail('Informe o nome do evento');
      if (b.appStatus && !APP_ESTADOS.includes(b.appStatus)) return fail('appStatus inválido: '+b.appStatus);
      const item = Object.assign({
        status:'Planejado', receita:0, leads:0, participantes:0, conv:0, roi:0, equipe:1, aprovacao:false, appStatus:''
      }, b, {
        criadoPor: b.criadoPor || perfil,
        criadoPorNome: b.criadoPorNome || (u && u.nome) || perfil,
        criadoEm: b.criadoEm || new Date().toISOString()
      });
      const saved = await store.put('eventos', item);
      await audit({ usuario: quem, perfil, acao: b.id ? 'editou' : 'criou', entidade:'eventos', entidadeId: String(saved.id), ip });
      return ok(saved);
    }

    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      if (b.appStatus && !APP_ESTADOS.includes(b.appStatus)) return fail('appStatus inválido: '+b.appStatus);
      const ev = await store.get('eventos', b.id);
      if (!ev) return fail('Evento não encontrado', 404);
      const mudouApp = b.appStatus && b.appStatus !== ev.appStatus;
      Object.assign(ev, b);
      const saved = await store.put('eventos', ev);
      await audit({ usuario: quem, perfil, acao: mudouApp ? ('app_estado:'+b.appStatus) : 'editou', entidade:'eventos', entidadeId: String(saved.id), ip });
      return ok(saved);
    }

    if (event.httpMethod === 'DELETE') {
      if (!q.id) return fail('id obrigatório');
      await store.remove('eventos', q.id);
      await audit({ usuario: quem, perfil, acao:'excluiu', entidade:'eventos', entidadeId: String(q.id), ip });
      return ok({ id: q.id });
    }

    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
