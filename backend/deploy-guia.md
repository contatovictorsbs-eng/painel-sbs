# Guia de Deploy — SBS Green Seeds (Cloudflare Pages + Supabase)

Fluxo: você desenvolve → publica em **preview (teste)** → valida → promove para **produção**.
Hospedagem **única: Cloudflare Pages** (site + backend), banco **Supabase**.
O passo a passo detalhado da configuração está em `backend/deploy-cloudflare.md`.

---

## 1. Estrutura do repositório

```
/painel-sbs.html               ← o painel (arquivo único, servido na raiz "/")
/_redirects                    ← rotas do Cloudflare Pages
/wrangler.toml                 ← runtime Node (nodejs_compat) das Pages Functions
/functions/api/[[path]].js     ← roteador das Pages Functions
/server/                       ← as 22 funções de backend (uma por recurso)
/backend/schema.md             ← modelo de dados
/backend/supabase-schema.sql   ← SQL das tabelas (Supabase/Postgres)
/tools/gerar-hash.js           ← gera USERS_JSON (hashes de senha)
/.env.example                  ← lista das variáveis (sem valores)
```

---

## 2. Os dois ambientes (branches)

| Ambiente     | Branch          | URL                              | Uso                       |
|--------------|-----------------|----------------------------------|---------------------------|
| **Produção** | `main`          | `painel-sbs.pages.dev`           | O que os usuários acessam |
| **Preview**  | qualquer outra  | URL isolada automática por branch/PR | Testar antes de subir  |

O Cloudflare Pages gera uma **URL de preview** para cada branch e cada Pull Request,
sem configuração extra. Só a branch `main` publica em produção.

---

## 3. Configurar uma vez

1. Crie um repositório no **GitHub** e suba estes arquivos (branch `main`).
2. **dash.cloudflare.com** → **Workers & Pages** → **Create** → aba **Pages** →
   **Connect to Git** → escolha o repositório.
3. **Build settings:** Framework preset **None**, Build command **vazio**,
   Build output directory **`.`** (raiz).
4. **Settings → Functions → Compatibility flags:** adicione **`nodejs_compat`**
   em *Production* e *Preview*; Compatibility date ≥ `2024-11-01`.
5. **Settings → Environment variables:** adicione as chaves do `.env.example`
   (SUPABASE_URL, SUPABASE_SERVICE_KEY, AUTH_SECRET, USERS_JSON, GROQ_API_KEY…)
   em **Production** e, para validar antes, também em **Preview**.

Pronto: `main` publica produção, qualquer outra branch/PR gera um preview.

---

## 4. Rotina do dia a dia

```bash
# 1) trabalhar sempre numa branch de teste
git checkout -b ajuste-x
#    ... fazer alterações, gerar novo painel-sbs.html ...
git add -A && git commit -m "ajuste X"
git push origin ajuste-x
#    → Cloudflare publica uma URL de PREVIEW isolada (VALIDE AQUI)

# 2) aprovado? abrir PR para main e dar Merge
#    → Cloudflare publica em painel-sbs.pages.dev (PRODUÇÃO)
```

Alternativa sem terminal: edite pela web do GitHub numa branch, abra o **Pull Request**
para `main` e clique em **Merge**. Cada PR gera um *Preview* isolado para revisão.

---

## 5. Testar localmente (opcional)

```bash
npm i -g wrangler
npx wrangler pages dev .    # sobe o site + as Pages Functions localmente
```

As funções ficam em `http://localhost:8788/api/<nome>`.

---

## 6. Boas práticas

- **Nunca** comite o `.env` real com as chaves — use as *Environment variables* do Cloudflare.
- Valide **sempre** num preview antes do merge para `main`.
- Rollback: **Deployments → escolha um deploy anterior → Rollback to this deployment**.
- Domínio próprio: **Custom domains → Set up a domain** (ex.: `painel.sbsgreen.com.br`).
- LGPD: com dados reais, ative login validado + log de auditoria por perfil (ver `backend/schema.md`).

---

## 7. Produção: autenticação, banco e LGPD

**Autenticação (obrigatória em produção)**
1. Gere um segredo forte e defina `AUTH_SECRET` no Cloudflare (Production + Preview).
2. Gere os hashes das senhas reais — o hash usa o MESMO `AUTH_SECRET`:
   ```bash
   AUTH_SECRET="o-mesmo-segredo-do-cloudflare" node tools/gerar-hash.js
   ```
   Edite a lista de usuários/senhas dentro do arquivo antes de rodar.
3. Cole a saída (uma linha) em `USERS_JSON` no Cloudflare.
   Sem `USERS_JSON`, o login roda em modo demo (senha `12345678`) — só para preview.

**Banco de produção (Supabase/Postgres)**
1. Crie um projeto grátis no Supabase (região São Paulo).
2. SQL Editor → cole `backend/supabase-schema.sql` → RUN (cria todas as tabelas `sbs_*`).
3. No Cloudflare, defina `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`.
   Com essas duas variáveis, `store.js` grava no Postgres via fetch.

**LGPD — auditoria**
- Toda escrita (vendedores, vendas, leads, orçamentos, login) registra em `sbs_auditoria`
  quem fez o quê, quando e sobre qual entidade — sem guardar o dado pessoal em si.
- A trilha é visível só para **admin/TI** (painel de TI → Auditoria; rota `/api/auditoria`).
- Retenção sugerida: 24 meses (comando pronto no fim do `supabase-schema.sql`).
