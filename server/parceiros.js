/* Apps de parceiros (co-branded white-label). Espelha "Apps de parceiros".
   GET  /api/parceiros
   POST /api/parceiros  { nome, cor, logo(base64|url), evento, local, produtos[] }
   Logo: no MVP aceita dataURL/base64; em produção subir para storage e salvar a URL.
*/
const { list, put, remove, ok, fail } = require('./_lib/store');

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
        status: b.status||'Rascunho', vendedores: b.vendedores||0, criadoEm: new Date().toISOString()
      };
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
