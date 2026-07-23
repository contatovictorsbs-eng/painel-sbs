/* Login / sessão por perfil (server-side).
   POST /api/auth  { email, senha }         → { token, perfil, nome, precisaTrocar }
   GET  /api/auth  (Authorization: Bearer)  → { perfil, nome, email }

   Usuários vivem na coleção `usuarios` (Supabase/Blobs) para que a senha seja
   POR USUÁRIO e TROCÁVEL. Na primeira vez, a coleção é semeada a partir de:
     1) USERS_JSON  (variável de ambiente) — produção, e/ou
     2) PADRAO      — lista interna SBS (senha inicial 12345678, precisaTrocar=true)
   Não há bloqueio por tentativas: quem não consegue entrar usa "Esqueci a senha"
   (functions/senha.js). */
const crypto = require('crypto');
const { sign, verify } = require('./_lib/auth');
const { list, get, put, audit, clientIp, ok, fail } = require('./_lib/store');

/* ---- TOTP (RFC 6238) embutido — sem arquivo externo, para não quebrar o build ---- */
const _B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function _b32enc(buf){ let bits='',out=''; for(const b of buf) bits+=b.toString(2).padStart(8,'0'); for(let i=0;i+5<=bits.length;i+=5) out+=_B32[parseInt(bits.substr(i,5),2)]; return out; }
function _b32dec(s){ const c=String(s).toUpperCase().replace(/=+$/,'').replace(/\s/g,''); let bits=''; for(const ch of c){ const v=_B32.indexOf(ch); if(v<0)continue; bits+=v.toString(2).padStart(5,'0'); } const by=[]; for(let i=0;i+8<=bits.length;i+=8) by.push(parseInt(bits.substr(i,8),2)); return Buffer.from(by); }
const totp = {
  gerarSegredo(){ return _b32enc(crypto.randomBytes(20)); },
  gerarCodigo(seg, step){ const key=_b32dec(seg); const ctr=(step!=null)?step:Math.floor(Date.now()/1000/30); const buf=Buffer.alloc(8); buf.writeUInt32BE(Math.floor(ctr/0x100000000),0); buf.writeUInt32BE(ctr>>>0,4); const hm=crypto.createHmac('sha1',key).update(buf).digest(); const o=hm[hm.length-1]&0xf; const bin=((hm[o]&0x7f)<<24)|((hm[o+1]&0xff)<<16)|((hm[o+2]&0xff)<<8)|(hm[o+3]&0xff); return String(bin%1000000).padStart(6,'0'); },
  verificarCodigo(seg, codigo, janela){ if(!seg||!codigo) return false; const alvo=String(codigo).replace(/\D/g,'').padStart(6,'0'); const now=Math.floor(Date.now()/1000/30); const w=janela==null?1:janela; for(let i=-w;i<=w;i++){ try{ if(crypto.timingSafeEqual(Buffer.from(this.gerarCodigo(seg,now+i)),Buffer.from(alvo))) return true; }catch(e){} } return false; },
  otpauthURL(seg, conta, emissor){ const em=emissor||'SBS Green'; return 'otpauth://totp/'+encodeURIComponent(em+':'+conta)+'?secret='+seg+'&issuer='+encodeURIComponent(em)+'&algorithm=SHA1&digits=6&period=30'; },
  gerarRecuperacao(qtd){ const out=[]; for(let i=0;i<(qtd||8);i++) out.push(crypto.randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})(.{5})/,'$1-$2')); return out; }
};

function SECRET(){ return process.env.AUTH_SECRET || 'sbs-dev-secret-troque-em-producao'; }
function hash(senha){ return crypto.createHash('sha256').update(String(senha) + SECRET()).digest('hex'); }
/* 2FA obrigatório? Padrão: ligado. Desligue com FORCAR_2FA=off (variável de ambiente). */
function twoFAObrigatorio(){ return String(process.env.FORCAR_2FA || 'on').toLowerCase() !== 'off'; }

/* Equipe interna SBS — semeada com senha inicial 12345678 (precisaTrocar=true). */
const PADRAO = [
  { email:'franz@sbsgreen.com.br',         perfil:'marketing', nome:'Franz' },
  { email:'medina@sbsgreen.com.br',        perfil:'gerente',   nome:'Medina' },
  { email:'tiago.mascheto@sbsgreen.com.br',perfil:'ceo',       nome:'Tiago Mascheto' },
  { email:'victor.hugo@sbsgreen.com.br',   perfil:'mercado',   nome:'Victor Hugo' },
  { email:'ti@sbsgreen.com.br',            perfil:'ti',        nome:'TI' },
  { email:'admin@sbsgreen.com.br',         perfil:'admin',     nome:'Admin master' }
];

/* Garante que os usuários canônicos existam. É um TOP-UP idempotente:
   cria só os que faltam e NUNCA sobrescreve senha/perfil de quem já existe
   (preserva trocas de senha feitas pelos usuários). Assim, ao adicionar um
   novo membro à lista PADRAO (ou via USERS_JSON), basta o próximo login. */
async function semear(){
  let base = PADRAO;
  try {
    const raw = process.env.USERS_JSON;
    if (raw) { const j = JSON.parse(raw); if (Array.isArray(j) && j.length) base = j; }
  } catch (e) {}
  const inicial = hash('12345678');
  for (const u of base){
    const email = (u.email || '').toLowerCase();
    if (!email) continue;
    const existe = await get('usuarios', email);
    if (existe) continue; // já cadastrado — não mexe (preserva senha trocada)
    await put('usuarios', {
      id: email,
      email,
      perfil: u.perfil,
      nome: u.nome,
      tenant: u.tenant || 'sbs',
      hash: u.hash || inicial,
      precisaTrocar: u.precisaTrocar != null ? u.precisaTrocar : true,
      criadoEm: new Date().toISOString()
    });
  }
}

async function buscarUsuario(email){
  await semear();
  return get('usuarios', (email || '').toLowerCase());
}

exports.handler = async (event) => {
  const { requireAuth } = require('./_lib/auth');
  try {
    if (event.httpMethod === 'GET') {
      const r = requireAuth(event);
      if (r.erro) return fail(r.erro, r.code);
      return ok({ perfil:r.user.perfil, nome:r.user.nome, email:r.user.sub, tenant:r.user.tenant || 'sbs' });
    }
    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const q = event.queryStringParameters || {};
      const acao = q.acao || b.acao || 'login';
      const ip = clientIp(event);

      /* ---------- ETAPA 2: confirmar ativação do 2FA (1º acesso) ---------- */
      if (acao === 'ativar-2fa') {
        const pre = verify(b.pretoken);
        if (!pre || pre.stage !== '2fa-setup') return fail('Sessão de ativação expirada. Faça login de novo.', 401);
        if (!totp.verificarCodigo(pre.seg, b.codigo)) return fail('Código inválido. Confira o app autenticador.', 401);
        const u = await get('usuarios', pre.sub);
        if (!u) return fail('Usuário não encontrado', 404);
        const rec = totp.gerarRecuperacao(8);
        u.twofaSeg = pre.seg; u.twofaOn = true;
        u.twofaRec = rec.map(c => hash(c));
        await put('usuarios', u);
        const token = sign({ sub:u.email, perfil:u.perfil, nome:u.nome, tenant:u.tenant||'sbs' });
        await audit({ usuario:u.email, perfil:u.perfil, acao:'2fa_ativado', entidade:'auth', ip });
        return ok({ token, perfil:u.perfil, nome:u.nome, email:u.email, tenant:u.tenant||'sbs', precisaTrocar:!!u.precisaTrocar, recuperacao: rec });
      }

      /* ---------- ETAPA 2: verificar código nos logins seguintes ---------- */
      if (acao === 'verificar-2fa') {
        const pre = verify(b.pretoken);
        if (!pre || pre.stage !== '2fa') return fail('Sessão de login expirada. Entre de novo.', 401);
        const u = await get('usuarios', pre.sub);
        if (!u || !u.twofaOn) return fail('2FA não configurado', 400);
        const codigo = String(b.codigo || '').replace(/\D/g,'');
        let okCode = totp.verificarCodigo(u.twofaSeg, codigo);
        if (!okCode && Array.isArray(u.twofaRec)) {
          const h = hash((b.codigo||'').trim().toUpperCase());
          const idx = u.twofaRec.indexOf(h);
          if (idx >= 0) { u.twofaRec.splice(idx,1); await put('usuarios', u); okCode = true; }
        }
        if (!okCode) { await audit({ usuario:u.email, acao:'2fa_falha', entidade:'auth', ip }); return fail('Código inválido', 401); }
        const token = sign({ sub:u.email, perfil:u.perfil, nome:u.nome, tenant:u.tenant||'sbs' });
        await audit({ usuario:u.email, perfil:u.perfil, acao:'login_2fa', entidade:'auth', ip });
        return ok({ token, perfil:u.perfil, nome:u.nome, email:u.email, tenant:u.tenant||'sbs', precisaTrocar:!!u.precisaTrocar });
      }

      /* ---------- ETAPA 1: e-mail + senha ---------- */
      const email = (b.email || '').trim().toLowerCase();
      const senha = b.senha || b.password || '';
      const u = await buscarUsuario(email);
      if (!u || u.hash !== hash(senha)) {
        await audit({ usuario: email || 'desconhecido', acao:'login_falha', entidade:'auth', ip });
        return fail('E-mail ou senha inválidos', 401);
      }
      /* Já tem 2FA → pede o código (não entrega sessão ainda). */
      if (u.twofaOn) {
        const pretoken = sign({ sub:u.email, stage:'2fa' }, 300);
        await audit({ usuario:u.email, perfil:u.perfil, acao:'login_senha_ok', entidade:'auth', ip });
        return ok({ etapa:'2fa', pretoken });
      }
      /* Não tem 2FA e é obrigatório → inicia ativação (gera segredo + QR). */
      if (twoFAObrigatorio()) {
        const seg = totp.gerarSegredo();
        const pretoken = sign({ sub:u.email, stage:'2fa-setup', seg }, 600);
        const otpauth = totp.otpauthURL(seg, u.email, 'SBS Green');
        return ok({ etapa:'2fa-setup', pretoken, segredo: seg, otpauth });
      }
      /* 2FA desligado por configuração → login direto (compatibilidade). */
      const token = sign({ sub: u.email, perfil: u.perfil, nome: u.nome, tenant: u.tenant || 'sbs' });
      await audit({ usuario: u.email, perfil: u.perfil, acao:'login', entidade:'auth', ip });
      return ok({ token, perfil: u.perfil, nome: u.nome, email: u.email, tenant: u.tenant || 'sbs', precisaTrocar: !!u.precisaTrocar });
    }
    return fail('Método não suportado', 405);
  } catch (e) { return fail(e.message, 500); }
};
