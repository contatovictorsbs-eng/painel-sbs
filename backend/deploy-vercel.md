# Guia de Deploy — Vercel (alternativa grátis à Netlify)

O Vercel tem plano **Hobby gratuito** (sem cartão) com *serverless functions*.
Este projeto roda no Vercel **sem alterar as 22 funções**: o adaptador
`api/[fn].js` executa cada `functions/<nome>.js` no formato Netlify, e o
`vercel.json` reescreve `/.netlify/functions/<nome>` → `/api/<nome>`. O front
continua chamando os mesmos caminhos.

> ⚠️ **Armazenamento:** no Vercel **não existe Netlify Blobs**. Portanto o banco
> **Supabase é obrigatório** aqui (o `_lib/store.js` já usa Supabase quando as
> variáveis existem). Faça o passo 3 antes de usar dados reais.

---

## 1. Subir o projeto para o GitHub
Já explicado em `backend/deploy-guia.md` (seção 3). Basta ter o repositório
`painel-sbs` com todos os arquivos (incluindo `api/`, `vercel.json`, `functions/`).

## 2. Importar no Vercel
1. Acesse **vercel.com** → entre com o GitHub.
2. **Add New… → Project** → selecione o repositório `painel-sbs`.
3. Framework Preset: **Other** (o `vercel.json` cuida de tudo — não defina build).
4. Clique **Deploy**. Em ~1 min o site sobe em `painel-sbs.vercel.app`.

> A home (`/`) abre o `painel-sbs.html`. As funções ficam em
> `/.netlify/functions/<nome>` (reescrito) **ou** `/api/<nome>` (direto).

## 3. Banco de produção — Supabase (obrigatório no Vercel)
1. Crie um projeto grátis em **supabase.com**.
2. **SQL Editor** → cole `backend/supabase-schema.sql` → **Run** (cria as tabelas `sbs_*`).
3. No Vercel: **Settings → Environment Variables** → adicione:
   - `SUPABASE_URL` = URL do projeto Supabase
   - `SUPABASE_SERVICE_KEY` = a *Service Role key* (secreta)

## 4. Demais variáveis de ambiente (Vercel → Settings → Environment Variables)
| Variável | Para quê |
|---|---|
| `GROQ_API_KEY` | Assistente IA (console.groq.com/keys) |
| `GROQ_MODEL` | (opcional) modelo do Groq |
| `AUTH_SECRET` | Assina os tokens de login (string longa aleatória) |
| `USERS_JSON` | (produção) usuários + hashes de senha (ver `tools/gerar-hash.js`) |
| `AV_KEY` / `CLIMA_KEY` / `ERP_TOKEN` | Cotações / clima / ERP (opcionais) |

Após adicionar variáveis, faça **Redeploy** (Deployments → ⋯ → Redeploy).

## 5. Ambientes (staging × produção)
- **Produção:** branch `main` → domínio principal (`painel-sbs.vercel.app`).
- **Preview/Staging:** qualquer outra branch ou Pull Request gera uma URL de
  *Preview* automática e isolada. Trabalhe numa branch, valide na URL de preview,
  e faça **merge para `main`** para promover.
- Defina variáveis por ambiente (Production / Preview) na tela de Environment Variables.

## 6. Tarefas agendadas (cron)
O `vercel.json` já agenda `coletor-concorrentes` (09h) e `alertas` (10h) via **Vercel Cron**.
No Hobby, os crons rodam 1×/dia. Ajuste os horários no `vercel.json` se precisar.

## 7. Rodar local
```bash
npm i -g vercel
vercel dev        # sobe o site + /api/* em http://localhost:3000
```
Crie um `.env` local (não versionar) com as variáveis acima.

---

## Observações
- `netlify.toml` continua no projeto — se um dia voltar para a Netlify, funciona
  sem mudar nada. Os dois hosts convivem.
- Segredos **nunca** em arquivo/commit — só nas Environment Variables do host.
- LGPD: toda escrita registra em `sbs_auditoria` (quem/o quê/quando), visível só a admin/TI.
