/* TOTP (RFC 6238) + Base32 — sem dependências externas, usa 'crypto' do Node.
   Usado para autenticação em dois fatores (2FA) por app autenticador
   (Google Authenticator / Authy). SHA-1, 6 dígitos, janela de 30s. */
const crypto = require('crypto');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/* Gera um segredo aleatório em Base32 (padrão 20 bytes = 160 bits). */
function gerarSegredo(bytes){
  const buf = crypto.randomBytes(bytes || 20);
  let bits = '', out = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.substr(i, 5), 2)];
  return out;
}

function base32Decode(s){
  const clean = String(s).toUpperCase().replace(/=+$/,'').replace(/\s/g,'');
  let bits = '';
  for (const c of clean){ const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
  return Buffer.from(bytes);
}

/* Código TOTP para um dado passo de tempo (default: agora). */
function gerarCodigo(segredo, step){
  const key = base32Decode(segredo);
  const counter = (step != null) ? step : Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0xf;
  const bin = ((hmac[off] & 0x7f) << 24) | ((hmac[off+1] & 0xff) << 16) | ((hmac[off+2] & 0xff) << 8) | (hmac[off+3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}

/* Verifica o código do usuário com tolerância de ±1 janela (relógio dessincronizado). */
function verificarCodigo(segredo, codigo, janela){
  if (!segredo || !codigo) return false;
  const alvo = String(codigo).replace(/\D/g,'').padStart(6, '0');
  const agora = Math.floor(Date.now() / 1000 / 30);
  const w = janela == null ? 1 : janela;
  for (let i = -w; i <= w; i++){
    try { if (crypto.timingSafeEqual(Buffer.from(gerarCodigo(segredo, agora + i)), Buffer.from(alvo))) return true; } catch (e) {}
  }
  return false;
}

/* URI otpauth:// para o QR Code do app autenticador. */
function otpauthURL(segredo, conta, emissor){
  const label = encodeURIComponent((emissor || 'SBS Green') + ':' + conta);
  const params = 'secret=' + segredo + '&issuer=' + encodeURIComponent(emissor || 'SBS Green') + '&algorithm=SHA1&digits=6&period=30';
  return 'otpauth://totp/' + label + '?' + params;
}

/* Códigos de recuperação (uso único) — para quem perde o celular. */
function gerarRecuperacao(qtd){
  const out = [];
  for (let i = 0; i < (qtd || 8); i++){
    out.push(crypto.randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})(.{5})/, '$1-$2'));
  }
  return out;
}

module.exports = { gerarSegredo, gerarCodigo, verificarCodigo, otpauthURL, gerarRecuperacao, base32Decode };
