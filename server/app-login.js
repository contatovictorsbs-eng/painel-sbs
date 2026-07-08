/* App do Vendedor — login, cadastro e recuperação de senha.
   Credenciais ficam na coleção `vendedores` (id = usuario em minúsculas).
   hash = sha256(senha + AUTH_SECRET). Token perfil:'vendedor', tenant = parceira.

   POST /api/app-login
     { acao:'login',     usuario, senha }
     { acao:'cadastro',  nome, usuario, senha, email, telefone, cpf, cidade, uf, regiao, gerente, parceira }
     { acao:'solicitar', usuario|email }                 → código de 6 dígitos (30 min)
     { acao:'redefinir', usuario|email, codigo, novaSenha }
     { acao:'trocar',    senhaAtual, novaSenha }          (Authorization: Bearer)

   Sem RESEND_API_KEY o código volta na resposta (staging). Sem bloqueio por tentativas. */
const crypto = require('crypto');
const { sign, requireAuth } = require('./_lib/auth');
const { list, get, put, audit, clientIp, ok, fail } = require('./_lib/store');

function SECRET(){ return process.env.AUTH_SECRET || 'sbs-dev-secret-troque-em-producao'; }
function hash(s){ return crypto.createHash('sha256').update(String(s) + SECRET()).digest('hex'); }
function codigo6(){ return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
function forte(s){ return typeof s === 'string' && s.length >= 6; }
function slug(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._@-]/g, ''); }

async function porUsuario(u){ return get('vendedores', slug(u)); }
async function porEmail(e){ const r = await list('vendedores', { email: String(e || '').toLowerCase() }, { limit: 1 }); return r && r[0] ? r[0] : null; }
async function achar(id){ const u = slug(id); if (u.includes('@')) return (await porEmail(u)) || (await porUsuario(u)); return (await porUsuario(u)) || (await porEmail(u)); }

async function enviarEmail(email, cod){
  const key = process.env.RESEND_API_KEY; if (!key || !email) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', { method:'POST',
      headers:{ 'Authorization':'Bearer '+key, 'Content-Type':'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'SBS Green Seeds <nao-responder@sbsgreen.com.br>',
        to:[email], subject:'App SBS — código de acesso',
        text:'Seu código é '+cod+'. Vale 30 minutos.' }) });
    return r.ok;
  } catch (e) { return false; }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return fail('Método não suportado', 405);
    const b = JSON.parse(event.body || '{}');
    const acao = b.acao || 'login';
    const ip = clientIp(event);

    if (acao === 'cadastro') {
      const usuario = slug(b.usuario || b.email || b.nome);
      if (!usuario) return fail('Informe um usuário', 400);
      if (!forte(b.senha)) return fail('A senha precisa ter ao menos 6 caracteres', 400);
      if (await porUsuario(usuario)) return fail('Este usuário já existe. Faça login ou recupere a senha.', 409);
      const tenant = b.parceira ? slug(b.parceira) : 'sbs';
      const v = { id: usuario, tipo:'vendedor', usuario, nome: b.nome || usuario, email: (b.email||'').toLowerCase(),
        telefone: b.telefone||'', cpf: b.cpf||'', cidade: b.cidade||'', uf: b.uf||'', regiao: b.regiao||'',
        gerente: b.gerente||'', parceira: b.parceira||null, tenant, hash: hash(b.senha),
        status:'pendente', precisaTrocar:false, criadoEm: new Date().toISOString() };
      await put('vendedores', v);
      await audit({ usuario, perfil:'vendedor', acao:'cadastro', entidade:'vendedores', ip });
      const token = sign({ sub: usuario, perfil:'vendedor', nome: v.nome, tenant });
      return ok({ token, usuario, nome: v.nome, tenant, status: v.status });
    }

    if (acao === 'login') {
      const v = await achar(b.usuario);
      if (!v || !v.hash || v.hash !== hash(b.senha || '')) {
        await audit({ usuario: slug(b.usuario) || 'desconhecido', acao:'login_falha', entidade:'app', ip });
        return fail('Usuário ou senha inválidos', 401);
      }
      const token = sign({ sub: v.usuario || v.id, perfil:'vendedor', nome: v.nome, tenant: v.tenant || 'sbs' });
      await audit({ usuario: v.usuario || v.id, perfil:'vendedor', acao:'login', entidade:'app', ip });
      return ok({ token, usuario: v.usuario || v.id, nome: v.nome, tenant: v.tenant || 'sbs', status: v.status, precisaTrocar: !!v.precisaTrocar });
    }

    if (acao === 'solicitar') {
      const v = await achar(b.usuario || b.email);
      if (!v) return ok({ enviado:true });               // resposta neutra
      const cod = codigo6();
      v.reset = { cod: hash(cod), exp: Date.now() + 30*60*1000 };
      await put('vendedores', v);
      const mandado = await enviarEmail(v.email, cod);
      await audit({ usuario: v.usuario || v.id, acao:'reset_solicitado', entidade:'app', ip });
      return ok(mandado ? { enviado:true } : { enviado:true, modo:'staging', codigo: cod });
    }

    if (acao === 'redefinir') {
      const v = await achar(b.usuario || b.email);
      if (!v || !v.reset) return fail('Solicitação inválida ou expirada', 400);
      if (Date.now() > v.reset.exp) { delete v.reset; await put('vendedores', v); return fail('Código expirado — solicite de novo', 400); }
      if (v.reset.cod !== hash(b.codigo || '')) return fail('Código incorreto', 401);
      if (!forte(b.novaSenha)) return fail('A nova senha precisa ter ao menos 6 caracteres', 400);
      v.hash = hash(b.novaSenha); v.precisaTrocar = false; delete v.reset;
      v.senhaAlteradaEm = new Date().toISOString();
      await put('vendedores', v);
      await audit({ usuario: v.usuario || v.id, perfil:'vendedor', acao:'senha_redefinida', entidade:'app', ip });
      return ok({ redefinida:true });
    }

    if (acao === 'trocar') {
      const r = requireAuth(event); if (r.erro) return fail(r.erro, r.code);
      const v = await porUsuario(r.user.sub);
      if (!v) return fail('Usuário não encontrado', 404);
      if (v.hash !== hash(b.senhaAtual || '')) return fail('Senha atual incorreta', 401);
      if (!forte(b.novaSenha)) return fail('A nova senha precisa ter ao menos 6 caracteres', 400);
      v.hash = hash(b.novaSenha); v.precisaTrocar = false; v.senhaAlteradaEm = new Date().toISOString();
      await put('vendedores', v);
      await audit({ usuario: v.usuario || v.id, perfil:'vendedor', acao:'senha_trocada', entidade:'app', ip });
      return ok({ trocada:true });
    }

    return fail('Ação desconhecida', 400);
  } catch (e) { return fail(e.message, 500); }
};
