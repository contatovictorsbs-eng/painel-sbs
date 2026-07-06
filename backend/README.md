# Backend SBS — Guia rápido de configuração

Este guia diz **onde** ficam as chaves e **como** ligar cada integração.
Regra de ouro: **nenhuma chave/segredo vai em arquivo do projeto nem no navegador.**
Tudo em **Netlify → Site configuration → Environment variables**.

---

## 1) Assistente IA (Groq) — `GROQ_API_KEY`

O assistente (`functions/ia-groq.js`) lê um resumo agregado do painel
(eventos, campanhas, vendas, orçamentos, leads) e responde com o modelo do Groq.
Sem a chave, ele funciona em **modo demonstração** com os mesmos números reais.

**Passo a passo:**
1. Gere a chave em **console.groq.com/keys** → *Create API Key* (copie na hora).
2. Netlify → seu site → **Site configuration → Environment variables → Add a variable**.
3. Key: `GROQ_API_KEY` · Value: *(a sua chave)* · Scopes: *Functions* (ou todos) → **Save**.
4. (Opcional) `GROQ_MODEL` para trocar o modelo — padrão `llama-3.1-8b-instant`.
5. **Deploys → Trigger deploy → Deploy site** — a chave só passa a valer no próximo deploy.

> ⚠️ **Segurança:** se a chave já foi exposta em algum lugar (chat, print, commit),
> **revogue e gere outra** em console.groq.com/keys. Nunca cole a chave em `.dc.html`,
> em `.js` do front ou aqui neste README.

---

## 2) Banco de produção (Supabase) — `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`

`functions/_lib/store.js` usa Supabase quando essas duas variáveis existem;
senão cai em Netlify Blobs (MVP grátis). Não precisa mudar código para trocar.

1. Rode `backend/supabase-schema.sql` no SQL Editor do Supabase (cria as tabelas `sbs_*`).
2. Adicione na Netlify: `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` (Service Role, **secreta**).
3. Deploy.

---

## 3) Login / tokens — `AUTH_SECRET`

Assina os tokens de sessão (HMAC). Defina um valor longo e aleatório em produção.
- Netlify: `AUTH_SECRET` = *(string aleatória, ex.: 40+ caracteres)*.
- Opcional: `USERS_JSON` para semear usuários iniciais (ver `functions/auth.js`).

---

## 4) Outras integrações (opcionais)

| Variável | Usada por | Para quê |
|---|---|---|
| `AV_KEY` | `preco-concorrente.js` | Cotações (Alpha Vantage) |
| `CLIMA_KEY` | `clima.js` | Previsão do tempo por praça |
| `ERP_TOKEN` | integração ERP/CRM | Sincronizar vendas/clientes |

---

## Rodar local
```
npm i @netlify/blobs
netlify dev        # expõe /.netlify/functions/*
```
Crie um arquivo `.env` **local** (não versionar) com as variáveis acima para testar.

## Regra do projeto
Toda funcionalidade nova do front entra junto com sua função + entrada em
`backend/schema.md` e no `backend/manifest.js` (fonte única da doc). Ver `CLAUDE.md`.
