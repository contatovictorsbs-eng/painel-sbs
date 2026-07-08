/* Apps de parceiros (co-branded white-label). Espelha "Apps de parceiros".
   GET   /api/parceiros
   POST  /api/parceiros  { nome, cor, logo(base64|url), evento, local, produtos[], campanhaId, campanha }
   PATCH /api/parceiros  { id, campanhaId, campanha }   → anexa/atualiza a campanha vinculada
   Regra: todo app de evento opera dentro de uma campanha (produtos, materiais e metas).
   Logo: no MVP aceita dataURL/base64; em produção subir para storage e salvar a URL.
*/
const { list, get, put, remove, ok, fail } = require('./_lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') return ok(await list('parceiros'));
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.nome) return fail('Informe o nome da parceira');
      const sigla = b.nome.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
      const item = {
        id: b.id, nome: b.nome, sigla, cor: b.cor||'#e8730f', logo: b.logo||null,
        evento: b.evento||'', local: b.local||'', produtos: b.produtos||[],
        campanhaId: b.campanhaId!=null ? b.campanhaId : null, campanha: b.campanha||null,
        status: b.status||'Rascunho', vendedores: b.vendedores||0, criadoEm: new Date().toISOString()
      };
      return ok(await put('parceiros', item));
    }
    if (event.httpMethod === 'PATCH') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return fail('id obrigatório');
      const atual = (await get('parceiros', b.id)) || { id: b.id };
      const item = Object.assign({}, atual, {
        campanhaId: b.campanhaId!=null ? b.campanhaId : (atual.campanhaId != null ? atual.campanhaId : null),
        campanha: b.campanha!=null ? b.campanha : (atual.campanha || null)
      });
      return ok(await put('parceiros', item));
    }
    if (event.httpMethod === 'DELETE') {
      const id = (event.queryStringParameters||{}).id;
      if (!id) return fail('id obrigatório');
      return ok(await remove('parceiros', id));
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
