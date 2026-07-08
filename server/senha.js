/* Senha — troca e redefinição (sem bloqueio por tentativas).
   Guarda o hash na coleção `usuarios`. hash = sha256(senha + AUTH_SECRET).

   POST /api/senha
     { acao:'trocar',    senhaAtual, novaSenha }   (Authorization: Bearer)  → troca a própria senha
     { acao:'solicitar', email }                    → gera código de redefinição (validade 30 min)
     { acao:'redefinir', email, codigo, novaSenha } → aplica a nova senha usando o código

   Envio de e-mail: se RESEND_API_KEY existir, envia o código por e-mail; senão,
   devolve o código na resposta (modo staging) e registra na auditoria. */
const crypto = require('crypto');
const { get, put, audit, clientIp, ok, fail } = require('./_lib/store');
const { requireAuth } = require('./_lib/auth');

function SECRET(){ return process.env.AUTH_SECRET || 'sbs-dev-secret-troque-em-producao'; }
function hash(senha){ return crypto.createHash('sha256').update(String(senha) + SECRET()).digest('hex'); }
function codigo6(){ return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
function forte(s){ return typeof s === 'string' && s.length >= 8; }

async function enviarEmail(email, cod){
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{ 'Authorization':'Bearer '+key, 'Content-Type':'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'SBS Green Seeds <nao-responder@sbsgreen.com.br>',
        to: [email],
        subject: 'Redefinição de senha — Plataforma SBS',
        text: 'Seu código de redefinição é ' + cod + '. Ele vale por 30 minutos. Se não foi você, ignore este e-mail.'
      })
    });
    return r.ok;
  } catch (e) { return false; }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return fail('Método não suportado', 405);
    const b = JSON.parse(event.body || '{}');
    const acao = b.acao || 'trocar';
    const ip = clientIp(event);

    /* ---- Trocar a própria senha (autenticado) ---- */
    if (acao === 'trocar') {
      const r = requireAuth(event);
      if (r.erro) return fail(r.erro, r.code);
      const u = await get('usuarios', (r.user.sub || '').toLowerCase());
      if (!u) return fail('Usuário não encontrado', 404);
      if (u.hash !== hash(b.senhaAtual || '')) return fail('Senha atual incorreta', 401);
      if (!forte(b.novaSenha)) return fail('A nova senha precisa ter ao menos 8 caracteres', 400);
      u.hash = hash(b.novaSenha);
      u.precisaTrocar = false;
      u.senhaAlteradaEm = new Date().toISOString();
      await put('usuarios', u);
      await audit({ usuario:u.email, perfil:u.perfil, acao:'senha_trocada', entidade:'auth', ip });
      return ok({ trocada:true });
    }

    /* ---- Solicitar redefinição (público) ---- */
    if (acao === 'solicitar') {
      const email = (b.email || '').trim().toLowerCase();
      const u = await get('usuarios', email);
      // resposta neutra para não revelar quais e-mails existem
      if (!u) return ok({ enviado:true });
      const cod = codigo6();
      u.reset = { cod: hash(cod), exp: Date.now() + 30*60*1000 };
      await put('usuarios', u);
      const mandado = await enviarEmail(email, cod);
      await audit({ usuario:email, acao:'reset_solicitado', entidade:'auth', ip });
      return ok(mandado ? { enviado:true } : { enviado:true, modo:'staging', codigo: cod });
    }

    /* ---- Redefinir com o código ---- */
    if (acao === 'redefinir') {
      const email = (b.email || '').trim().toLowerCase();
      const u = await get('usuarios', email);
      if (!u || !u.reset) return fail('Solicitação inválida ou expirada', 400);
      if (Date.now() > u.reset.exp) { delete u.reset; await put('usuarios', u); return fail('Código expirado — solicite de novo', 400); }
      if (u.reset.cod !== hash(b.codigo || '')) return fail('Código incorreto', 401);
      if (!forte(b.novaSenha)) return fail('A nova senha precisa ter ao menos 8 caracteres', 400);
      u.hash = hash(b.novaSenha);
      u.precisaTrocar = false;
      u.senhaAlteradaEm = new Date().toISOString();
      delete u.reset;
      await put('usuarios', u);
      await audit({ usuario:email, perfil:u.perfil, acao:'senha_redefinida', entidade:'auth', ip });
      return ok({ redefinida:true });
    }

    return fail('Ação desconhecida', 400);
  } catch (e) { return fail(e.message, 500); }
};
