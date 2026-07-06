/* Catálogo de produtos SBS — nome, cultura, saco, preço, foto, ficha técnica (specs)
   e materiais de apoio (vídeo/PDF/Excel/texto/link) que o vendedor consulta no app.
   GET   /.netlify/functions/produtos
   POST  /.netlify/functions/produtos   { id?, nome, cultura, saco, preco, foto?, specs?, materiais?[{tipo,titulo,url}] }
   PATCH /.netlify/functions/produtos   { id, ...campos }
   DELETE/.netlify/functions/produtos?id=...
   Coleção: "produtos".
*/
const { list, get, put, remove, ok, fail } = require('./_lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      return ok(await list('produtos'));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.nome) return fail('Informe o nome do produto');
      const materiais = Array.isArray(b.materiais) ? b.materiais.map(m => ({
        tipo: m.tipo || 'Link', titulo: m.titulo || m.nome || 'Material', url: m.url || '', nome: m.nome || ''
      })) : [];
      const item = {
        id: b.id, nome: b.nome, cultura: b.cultura || '—', saco: b.saco || '—',
        preco: Number(b.preco) || 0, foto: b.foto || null,
        specs: b.specs || '', materiais,
        criadoEm: new Date().toISOString()
      };
      return ok(await put('produtos', item));
    }
    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const p = await get('produtos', b.id);
      if (!p) return fail('Produto não encontrado', 404);
      return ok(await put('produtos', { ...p, ...b }));
    }
    if (event.httpMethod === 'DELETE') {
      const id = (event.queryStringParameters || {}).id;
      if (!id) return fail('id obrigatório');
      await remove('produtos', id);
      return ok({ removido: id });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
