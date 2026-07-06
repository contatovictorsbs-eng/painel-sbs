# Guia de Deploy — SBS Green Seeds (Staging + Produção)

Fluxo: você desenvolve → publica em **staging (teste)** → valida → promove para **produção**.
Tudo em uma conta **Netlify grátis**, conectada a um repositório **GitHub**.

---

## 1. Estrutura do repositório

```
/painel-sbs.html        ← o painel (arquivo único, servido na raiz "/")
/netlify.toml           ← configuração dos 2 ambientes
/functions/             ← Netlify Functions (backend)
/backend/schema.md      ← modelo de dados
/backend/supabase-schema.sql ← SQL das tabelas (Supabase/Postgres)
/tools/gerar-hash.js    ← gera USERS_JSON (hashes de senha)
/.env.example           ← lista das variáveis (sem valores)
```

---

## 2. Os dois ambientes (branches)

| Ambiente   | Branch    | URL                                   | Uso                         |
|------------|-----------|---------------------------------------|-----------------------------|
| **Produção** | `main`    | `painel-sbs.netlify.app`              | O que os usuários acessam   |
| **Staging**  | `staging` | `staging--painel-sbs.netlify.app`     | Testar antes de subir       |

O `netlify.toml` já define os dois contextos. A Netlify cria a URL de staging
automaticamente quando você habilita **branch deploys** para a branch `staging`.

---

## 3. Configurar uma vez

1. Crie um repositório no **GitHub** e suba estes arquivos (branch `main`).
2. Em **app.netlify.com** → *Add new site* → *Import from GitHub* → escolha o repo.
3. Build: deixe como está (o `netlify.toml` cuida de tudo). Clique em **Deploy**.
4. **Site settings → Build & deploy → Branches** →
   em *Branch deploys* selecione **Let me add individual branches** e inclua `staging`.
5. **Site settings → Environment variables** → adicione as chaves do `.env.example`
   (GROQ_API_KEY, CLIMA_KEY, AV_KEY, ERP_TOKEN…). Marque-as para **todos os contextos**.

Pronto: `main` publica produção, `staging` publica o ambiente de teste.

---

## 4. Rotina do dia a dia

```bash
# 1) trabalhar sempre na branch de teste
git checkout staging
#    ... fazer alterações, gerar novo painel-sbs.html ...
git add -A && git commit -m "ajuste X"
git push origin staging
#    → Netlify publica em staging--painel-sbs.netlify.app  (VALIDE AQUI)

# 2) aprovado? promover para produção
git checkout main
git merge staging
git push origin main
#    → Netlify publica em painel-sbs.netlify.app  (PRODUÇÃO)
```

Alternativa sem terminal: faça as alterações numa branch `staging` pelo próprio
GitHub (web) e, quando aprovado, abra um **Pull Request** de `staging` → `main` e
clique em **Merge**. Cada PR ainda gera um *Deploy Preview* isolado para revisão.

---

## 5. Testar localmente (opcional)

```bash
npm i -g netlify-cli
npm i @netlify/blobs
netlify dev          # sobe o site + as functions em http://localhost:8888
```

As funções ficam em `http://localhost:8888/.netlify/functions/<nome>`.

---

## 6. Boas práticas

- **Nunca** comite o `.env` real com as chaves — use as *Environment variables* da Netlify.
- Valide **sempre** em staging antes do merge para `main`.
- Rollback de produção: **Deploys → escolha um deploy anterior → Publish deploy**.
- Domínio próprio: *Domain settings → Add custom domain* (ex: `painel.sbsgreen.com.br`).
- LGPD: com dados reais, ative login validado + log de auditoria por perfil (ver `backend/schema.md`).

---

## 7. Produção: autenticação, banco e LGPD

**Autenticação (obrigatória em produção)**
1. Gere um segredo forte e defina `AUTH_SECRET` na Netlify (todos os contextos).
2. Gere os hashes das senhas reais — o hash usa o MESMO `AUTH_SECRET`:
   ```bash
   AUTH_SECRET="o-mesmo-segredo-da-netlify" node tools/gerar-hash.js
   ```
   Edite a lista de usuários/senhas dentro do arquivo antes de rodar.
3. Cole a saída (uma linha) em `USERS_JSON` na Netlify.
   Sem `USERS_JSON`, o login roda em modo demo (senha `12345678`) — só para staging.

**Banco de produção (Supabase/Postgres)**
1. Crie um projeto grátis no Supabase.
2. SQL Editor → cole `backend/supabase-schema.sql` → RUN (cria todas as tabelas `sbs_*`).
3. Na Netlify, defina `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`.
   Com essas duas variáveis, `store.js` grava no Postgres; sem elas, usa Netlify Blobs.

**LGPD — auditoria**
- Toda escrita (vendedores, vendas, leads, orçamentos, login) registra em `sbs_auditoria`
  quem fez o quê, quando e sobre qual entidade — sem guardar o dado pessoal em si.
- A trilha é visível só para **admin/TI** (painel de TI → Auditoria; rota `/.netlify/functions/auditoria`).
- Retenção sugerida: 24 meses (comando pronto no fim do `supabase-schema.sql`).
