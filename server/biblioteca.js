/* Biblioteca de mídia — imagens e documentos compartilhados com gerentes
   regionais e supervisores. Marketing/Gerência/Inteligência publicam;
   os itens ficam visíveis conforme a audiência escolhida.
   GET    /api/biblioteca?audiencia=            → lista (opcional filtrar por audiência)
   POST   /api/biblioteca  { titulo, tipo, audiencia, dataUrl|url, tamanho, criadoPor }
   DELETE /api/biblioteca?id=

   Audiências: 'Todos' | 'Gerentes regionais' | 'Supervisores'.
   Arquivo: no MVP aceita dataURL/base64; em produção subir para storage e salvar a URL.
*/
const { list, put, remove, ok, fail } = require('./_lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const aud = (event.queryStringParameters || {}).audiencia;
      let rows = await list('biblioteca');
      if (aud && aud !== 'Todos') rows = (rows || []).filter(r => r.audiencia === 'Todos' || r.audiencia === aud);
      return ok(rows);
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.titulo) return fail('Informe um título para o arquivo');
      const item = {
        id: b.id,
        titulo: b.titulo,
        tipo: b.tipo || '',                 // extensão/mime (png, pdf, xlsx…)
        audiencia: b.audiencia || 'Todos',  // Todos | Gerentes regionais | Supervisores
        categoria: b.categoria || 'Documento',
        dataUrl: b.dataUrl || null,         // conteúdo (MVP) — em prod trocar por url
        url: b.url || null,
        tamanho: b.tamanho || 0,
        criadoPor: b.criadoPor || '—',
        criadoEm: new Date().toISOString()
      };
      return ok(await put('biblioteca', item));
    }
    if (event.httpMethod === 'DELETE') {
      const id = (event.queryStringParameters || {}).id;
      if (!id) return fail('id obrigatório');
      return ok(await remove('biblioteca', id));
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
