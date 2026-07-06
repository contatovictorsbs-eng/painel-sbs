/* Alertas internos da equipe (Inteligência / Marketing / Gerência).
   Disparado quando um vendedor conclui o cadastro pelo app, entre outros.
   GET  /.netlify/functions/alertas
   POST /.netlify/functions/alertas  { tipo, titulo, texto, areas:["Inteligência","Marketing","Gerência"] }
*/
const { list, put, ok, fail } = require('./_lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      return ok((await list('alertas')).sort((a,b)=>(b.ts||0)-(a.ts||0)));
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      if (!b.titulo) return fail('Informe o título do alerta');
      const item = {
        id: b.id, tipo: b.tipo||'aviso', titulo: b.titulo, texto: b.texto||'',
        areas: b.areas||['Inteligência','Marketing','Gerência'], ts: Date.now(), lidoPor: []
      };
      return ok(await put('alertas', item));
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
