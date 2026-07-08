# Plataforma SBS Green Seeds

Painel corporativo de Marketing, Gerência Nacional, CEO, Inteligência de Mercado
e Tecnologia (TI), com **App de Eventos** para os vendedores em campo. Toda venda
registrada no app alimenta os dashboards de gestão.

- **Front:** `painel-sbs.html` — arquivo único, servido na raiz `/`.
- **Backend:** `server/*.js` (22 funções) roteadas por `functions/api/[[path]].js` (Cloudflare Pages Function) em `/api/<nome>`.
- **Banco:** Supabase/Postgres.
- **Hospedagem:** Cloudflare Pages (grátis, banda ilimitada). Preview automático por branch/PR; `main` = produção.

---

## Como subir para o GitHub + Cloudflare Pages

```bash
git init
git add -A
git commit -m "SBS Green Seeds — plataforma"
git branch -M main
git remote add origin git@github.com:SUA-ORG/painel-sbs.git
git push -u origin main
```

Depois, em **Cloudflare → Workers & Pages → Create → Pages → Connect to Git**, escolha o repo:
- **Build command:** *(vazio)* · **Build output directory:** `.`
- Em **Settings → Functions → Compatibility flags**, ligue **`nodejs_compat`** (Production e Preview).
- Preencha as **Environment variables** (ver `.env.example`).

Cada branch/PR ganha uma URL de **preview** automática; `main` publica em produção.
Passo a passo detalhado: **`backend/deploy-cloudflare.md`**.

---

## Estrutura

```
painel-sbs.html            Painel (build único do Painel SBS.dc.html)
Painel SBS.dc.html          Fonte editável do painel
Arquitetura SBS.dc.html     Documentação viva (lê backend/manifest.js)
functions/api/[[path]].js   Roteador Cloudflare → server/*.js em /api/*
server/                     22 funções + _lib/store.js (Supabase)
wrangler.toml               Config Cloudflare (nodejs_compat)
_redirects                  Home + proteção de /server e /backend
.env.example                Variáveis de ambiente (preencher no Cloudflare)
backend/schema.md           Modelo de dados
backend/manifest.js         Fonte única da arquitetura/documentação
backend/deploy-cloudflare.md  Guia de deploy (Cloudflare Pages)
```

## Perfis de acesso (protótipo — senha `12345678`)

| Perfil | Login |
|---|---|
| Marketing | `franz@sbsgreen.com.br` |
| Gerente Nacional | `medina@sbsgreen.com.br` |
| CEO | `tiago.mascheto@sbsgreen.com.br` |
| Inteligência de Mercado | `victorhugo@sbsgreen.com.br` |
| Tecnologia (TI) | `ti@sbsgreen.com.br` |
| Admin master | `admin@sbsgreen.com.br` |

> Em produção: auth server-side (já implementada) + LGPD/auditoria, com os dados
> no Supabase/Postgres — a interface de `server/_lib/store.js` isola o banco.

## Variáveis de ambiente

`GROQ_API_KEY` (Assistente IA), `CLIMA_KEY` (clima), `AV_KEY` (cotações),
`ERP_TOKEN` (CRM/ERP), `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (banco),
`AUTH_SECRET` (tokens de login). Nunca comite o `.env` real — use as
*Environment variables* do Cloudflare Pages.
