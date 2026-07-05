# Projeto — Plataforma SBS Green Seeds

## REGRA PRINCIPAL (definida pelo usuário)
**Backend completo e obrigatório.** Toda vez que construir qualquer coisa no front-end, construir TAMBÉM a parte de backend correspondente. Nunca entregar só a tela.

Para cada funcionalidade nova do painel/app, entregar em conjunto:
1. **Front** — a tela/DC (como já é feito).
2. **Função de servidor** — arquivo em `functions/` (Netlify Function, Node.js) que lê/grava os dados reais.
3. **Modelo de dados** — a coleção/tabela e os campos que aquela função usa (documentar em `backend/schema.md`).
4. **Contrato de API** — endpoint, método, entrada e saída (documentar junto à função).
5. **Documentação viva** — atualizar `backend/manifest.js` (módulo + função + coleção + entrada no `changelog`, subindo a `versao`). A página `Arquitetura SBS.dc.html` e os guias leem desse manifesto, então a documentação e a arquitetura se atualizam a partir desse ponto único. NUNCA deixar o manifesto defasado do que foi construído.

O front deve chamar a função por `/.netlify/functions/<nome>` em vez de dados locais de exemplo (mantendo fallback para o modo demonstração enquanto não publicado).

## Stack de backend
- Hospedagem: **Netlify** (site estático + Netlify Functions + Scheduled Functions).
- Chaves/segredos: **variáveis de ambiente** na Netlify — nunca no navegador.
- Fontes reais por módulo: ver `Guia Tecnico Dados Reais.dc.html`.
- Já existem: `functions/coletor-concorrentes.js`, `functions/preco-concorrente.js`.

## Identidade visual
- Cores: teal `#0B6B61`, verde profundo `#0c3b37`, lima `#6FA331`.
- Fonte: Plus Jakarta Sans. Ícones: Lucide.
- Painel principal (protótipo): `Painel SBS.dc.html`. Standalone: `painel-sbs.html`.
- 4 perfis: Marketing, Gerente Nacional, CEO, Inteligência de Mercado + App de Eventos (co-branded por parceira).

## LGPD / segurança
- Login por perfil antes de publicar com dados reais.
- Dados de vendedores/clientes (CNPJ, contato) são pessoais: acesso por perfil + log de auditoria.
