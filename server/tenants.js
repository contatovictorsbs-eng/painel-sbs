/* Tenants (parceiros) — registro central para escalar a N parceiras.
   Provisionar uma nova parceira = criar um registro aqui. Nenhum deploy/código novo.
   Cada tenant guarda a configuração white-label: marca, produtos, política de venda.

   GET   /api/tenants                 → lista (super/admin vê todos)
   GET   /api/tenants?slug=coamo      → config pública de 1 tenant (p/ o app carregar a marca)
   POST  /api/tenants                 → cria/atualiza (admin/TI)   { slug, nome, cor, paleta[], logo, produtos[], politica, status }
   DELETE/api/tenants?slug=coamo      → desativa (admin/TI)

   Isolamento: dados operacionais (vendas, leads, orçamentos…) carregam `tenant`
   e são filtrados no store por tenant. Aqui vive só o CADASTRO dos tenants. */
const { list, get, put, remove, ok, fail, audit, clientIp } = require('./_lib/store');
const { requireAuth, fromEvent } = require('./_lib/auth');

const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);

// Config que o app do vendedor pode ler sem autenticar (só marca, nunca dados sensíveis).
const publico = (t) => t && ({
  slug: t.slug, nome: t.nome, cor: t.cor, paleta: t.paleta || [t.cor],
  logo: t.logo || null, produtos: t.produtos || [], politica: t.politica || '', status: t.status
});

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};

    // GET público por slug: o app carrega a identidade da parceira (co-branding).
    if (event.httpMethod === 'GET' && q.slug) {
      const t = await get('tenants', slugify(q.slug));
      if (!t || t.status === 'Inativo') return fail('Parceira não encontrada', 404);
      return ok(publico(t));
    }

    // GET lista: restrito a admin/TI (visão de governança).
    if (event.httpMethod === 'GET') {
      const r = requireAuth(event, ['admin','ti','ceo']);
      if (r.erro) return fail(r.erro, r.code);
      return ok(await list('tenants'));
    }

    // POST cria/atualiza tenant: só admin/TI.
    if (event.httpMethod === 'POST') {
      const r = requireAuth(event, ['admin','ti']);
      if (r.erro) return fail(r.erro, r.code);
      const b = JSON.parse(event.body || '{}');
      if (!b.nome) return fail('Informe o nome da parceira');
      const slug = slugify(b.slug || b.nome);
      const existente = await get('tenants', slug);
      const item = Object.assign({}, existente || {}, {
        id: slug, slug,
        nome: b.nome,
        cor: b.cor || (existente && existente.cor) || '#0B6B61',
        paleta: b.paleta || (existente && existente.paleta) || [b.cor || '#0B6B61'],
        logo: b.logo != null ? b.logo : (existente && existente.logo) || null,
        produtos: b.produtos || (existente && existente.produtos) || [],
        politica: b.politica != null ? b.politica : (existente && existente.politica) || '',
        status: b.status || (existente && existente.status) || 'Ativo',
        criadoEm: (existente && existente.criadoEm) || new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      });
      const saved = await put('tenants', item);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao: existente?'editou':'criou', entidade:'tenants', entidadeId:slug, ip:clientIp(event) });
      return ok(saved);
    }

    // DELETE = desativar (soft delete p/ preservar histórico e LGPD).
    if (event.httpMethod === 'DELETE') {
      const r = requireAuth(event, ['admin','ti']);
      if (r.erro) return fail(r.erro, r.code);
      const slug = slugify(q.slug);
      if (!slug) return fail('slug obrigatório');
      const t = await get('tenants', slug);
      if (!t) return fail('Parceira não encontrada', 404);
      t.status = 'Inativo'; t.atualizadoEm = new Date().toISOString();
      const saved = await put('tenants', t);
      const u = fromEvent(event) || {};
      await audit({ usuario:u.sub, perfil:u.perfil, acao:'desativou', entidade:'tenants', entidadeId:slug, ip:clientIp(event) });
      return ok(saved);
    }

    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
