#!/usr/bin/env node
/* ============================================================
   SBS Green Seeds — Gerador de USERS_JSON (hashes de senha)
   ------------------------------------------------------------
   Gera o valor da variável de ambiente USERS_JSON que o
   functions/auth.js consome em produção. O hash é o MESMO que
   o login verifica: sha256(senha + AUTH_SECRET).

   IMPORTANTE: use o MESMO AUTH_SECRET que estará na Netlify.
   Se o segredo mudar, os hashes deixam de validar.

   Uso:
     AUTH_SECRET="seu-segredo-forte" node tools/gerar-hash.js

   Edite a lista USUARIOS abaixo (e-mail, perfil, nome, senha).
   Perfis válidos: marketing | gerente | ceo | mercado | ti | admin
   ============================================================ */
const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET;
if (!SECRET) {
  console.error('\n[erro] Defina AUTH_SECRET antes de rodar:');
  console.error('  AUTH_SECRET="seu-segredo-forte" node tools/gerar-hash.js\n');
  process.exit(1);
}

// >>> EDITE AQUI os usuários reais e suas senhas <<<
const USUARIOS = [
  { email:'franz@sbsgreen.com.br',          perfil:'marketing', nome:'Franz',          senha:'troque-esta-senha' },
  { email:'medina@sbsgreen.com.br',         perfil:'gerente',   nome:'Medina',         senha:'troque-esta-senha' },
  { email:'tiago.mascheto@sbsgreen.com.br', perfil:'ceo',       nome:'Tiago Mascheto', senha:'troque-esta-senha' },
  { email:'victorhugo@sbsgreen.com.br',     perfil:'mercado',   nome:'Victor Hugo',    senha:'troque-esta-senha' },
  { email:'ti@sbsgreen.com.br',             perfil:'ti',        nome:'TI',             senha:'troque-esta-senha' },
  { email:'admin@sbsgreen.com.br',          perfil:'admin',     nome:'Admin master',   senha:'troque-esta-senha' }
];

const hash = (senha) => crypto.createHash('sha256').update(String(senha) + SECRET).digest('hex');

const saida = USUARIOS.map(u => ({
  email: u.email.toLowerCase(),
  perfil: u.perfil,
  nome: u.nome,
  hash: hash(u.senha)
}));

// Verificação de senhas ainda no padrão (aviso de segurança):
const fracas = USUARIOS.filter(u => /troque|12345678|senha/i.test(u.senha));
if (fracas.length) {
  console.error('\n[aviso] ' + fracas.length + ' usuário(s) ainda com senha padrão — troque antes de produção:');
  fracas.forEach(u => console.error('  - ' + u.email));
}

console.log('\n# Cole este valor em Netlify → Environment variables → USERS_JSON');
console.log('# (uma única linha)\n');
console.log(JSON.stringify(saida));
console.log('');
