# Plataforma SBS Green Seeds

Painel corporativo de Marketing, Gerência Nacional, CEO, Inteligência de Mercado
e Tecnologia (TI), com **App de Eventos** para os vendedores em campo. Toda venda
registrada no app alimenta os dashboards de gestão.

- **Front:** `painel-sbs.html` — arquivo único, servido na raiz `/`.
- **Backend:** `functions/` — Netlify Functions (Node ≥18) sobre Netlify Blobs.
- **Hospedagem:** Netlify (grátis), com ambientes **staging** e **produção**.

---

## Como subir para o GitHub + Netlify

```bash
git init
git add -A
git commit -m "SBS Green Seeds — plataforma v1.9.0"
git branch -M main
git remote add origin git@github.com:SUA-ORG/painel-sbs.git
git push -u origin main

# ambiente de teste
git checkout -b staging
git push -u origin staging
```

Depois, em **app.netlify.com → Add new site → Import from GitHub**, escolha o repo.
O `netlify.toml` já configura tudo. Ligue *branch deploys* para `staging` e
preencha as variáveis de ambiente (ver `.env.example`).

Passo a passo detalhado: **`backend/deploy-guia.md`**.

---

## Estrutura

```
painel-sbs.html         Painel (build único do Painel SBS.dc.html)
Painel SBS.dc.html       Fonte editável do painel
Arquitetura SBS.dc.html  Documentação viva (lê backend/manifest.js)
netlify.toml             Deploy: main = produção, staging = teste
package.json             Node ≥18 + @netlify/blobs
.env.example             Variáveis de ambiente (preencher na Netlify)
functions/               13 Netlify Functions + _lib/store.js
backend/schema.md        Modelo de dados
backend/manifest.js      Fonte única da arquitetura/documentação (v1.9.0)
backend/deploy-guia.md   Guia de deploy (staging → produção)
```

## Perfis de acesso (protótipo — senha `12345678`)

| Perfil | Login |
|---|---|
| Marketing | `franz@sbsgreen.com.br` |
| Gerente Nacional | `medina@sbsgreen.com.br` |
| CEO | `tiago@sbsgreen.com.br` |
| Inteligência de Mercado | `victor@sbsgreen.com.br` |
| Tecnologia (TI) | `ti@sbsgreen.com.br` |
| Admin master | `admin@sbsgreen.com.br` |

> Login ainda é de front (protótipo). Para produção real: auth server-side +
> LGPD/auditoria e migração de Netlify Blobs → Supabase/Postgres (a interface de
> `functions/_lib/store.js` já isola essa troca).

## Variáveis de ambiente

`GROQ_API_KEY` (Assistente IA), `CLIMA_KEY` (clima), `AV_KEY` (cotações),
`ERP_TOKEN` (CRM/ERP). Nunca comite o `.env` real — use as *Environment
variables* da Netlify.
