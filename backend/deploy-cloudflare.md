# Guia de Deploy — Cloudflare Pages (grátis, o mais escalável)

Cloudflare Pages hospeda o site com **banda ilimitada** e distribuição global;
as **Pages Functions** rodam o backend (plano grátis: ~100 mil req/dia).
Uso comercial permitido. Banco: **Supabase** (via fetch — funciona no runtime do Cloudflare).

## Como o projeto está montado para o Cloudflare
- Site estático: `painel-sbs.html` na raiz (o `_redirects` abre em `/`).
- Backend: as 22 funções ficam em `server/*.js` (formato Netlify, sem alteração).
- Roteador: `functions/api/[[path]].js` (Pages Function) executa cada `server/<nome>.js`.
- `_redirects`: reescreve `/.netlify/functions/<nome>` → `/api/<nome>` (o front não muda).
- `wrangler.toml`: liga `nodejs_compat` (necessário p/ `process.env` e o HMAC do login).

---

## 1. Banco de dados — Supabase (obrigatório)
1. Crie um projeto grátis em **supabase.com** (região São Paulo).
2. **SQL Editor** → cole `backend/supabase-schema.sql` → **Run** (cria as tabelas `sbs_*`).
3. **Project Settings → API** → copie **Project URL** e a chave **`service_role`**.

## 2. Subir o código no GitHub
Repositório com todos os arquivos (incluindo `functions/`, `server/`, `_redirects`,
`wrangler.toml`, `painel-sbs.html`). Passo a passo em `backend/deploy-guia.md` (seção 3).

## 3. Criar o projeto no Cloudflare Pages
1. Acesse **dash.cloudflare.com** → **Workers & Pages** → **Create** → aba **Pages** →
   **Connect to Git** → escolha o repositório `painel-sbs`.
2. **Build settings:**
   - Framework preset: **None**
   - Build command: *(deixe vazio)*
   - Build output directory: **`.`** (ponto — raiz)
3. **Save and Deploy.** Em ~1 min o site sobe em `painel-sbs.pages.dev`.

## 4. Ativar o runtime Node (uma vez)
1. No projeto Pages → **Settings → Functions → Compatibility flags**.
2. Em **Production** e **Preview**, adicione a flag: **`nodejs_compat`**.
3. Confirme a **Compatibility date** ≥ `2024-11-01`.
   (O `wrangler.toml` já traz isso; a UI garante que valha nos dois ambientes.)

## 5. Variáveis de ambiente (Settings → Environment variables)
Adicione em **Production** (e Preview, se for testar):
| Variável | Para quê |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service Role key (secreta) |
| `GROQ_API_KEY` | Assistente IA (console.groq.com/keys) |
| `AUTH_SECRET` | Assina os tokens de login (string longa aleatória) |
| `USERS_JSON` | (produção) usuários + hashes de senha (ver `tools/gerar-hash.js`) |
| `GROQ_MODEL`, `AV_KEY`, `CLIMA_KEY`, `ERP_TOKEN` | Opcionais |

Depois de salvar as variáveis, faça **Retry deployment** (Deployments → ⋯ → Retry)
ou um novo push — elas só valem no próximo deploy.

## 6. Conferir se ligou
- Cadastre um vendedor pelo app → veja o registro em **Supabase → Table Editor → `sbs_vendedores`**.
- Pergunte algo no Assistente IA → resposta real do Groq (com a `GROQ_API_KEY`).

## 7. Staging × Produção
- **Produção:** branch `main` → `painel-sbs.pages.dev`.
- **Preview:** qualquer outra branch/PR gera uma URL isolada automática.
- Defina as variáveis também no ambiente **Preview** para validar antes do merge.

## 8. Domínio próprio
**Custom domains → Set up a domain** → `painel.sbsgreen.com.br` (Cloudflare cuida do SSL).

---

## Tarefas agendadas (cron)
Pages Functions não têm cron nativo. Se precisar rodar `alertas`/`coletor` em horário,
crie um **Cloudflare Worker** com Cron Trigger chamando `https://painel-sbs.pages.dev/api/alertas`.
(Opcional — hoje essas funções são stubs.)

## Observações
- `netlify.toml` e `vercel.json` seguem no projeto: dá para usar Netlify ou Vercel sem mudar código.
- Segredos **nunca** em arquivo/commit — só nas Environment variables do Cloudflare.
- LGPD: toda escrita registra em `sbs_auditoria` (quem/o quê/quando), visível só a admin/TI.
