# 🚀 Como subir o SBS Green Seeds (passo a passo)

Stack: **Cloudflare Pages** (site + funções `/api/*`) + **Supabase** (banco).
Publicação automática: todo `git push` para `main` gera um novo deploy.

---

## PARTE A — Primeiro deploy (só uma vez)

### 1. Subir o código para o GitHub
No seu computador, dentro da pasta do projeto:
```bash
git init                     # se ainda não for um repositório
git add -A
git commit -m "SBS Green Seeds — versão inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/sbs-green.git
git push -u origin main
```
> Se o repositório já existe, pule para o comando `git add -A` em diante.

### 2. Criar o banco no Supabase
1. Acesse **supabase.com** → **New project** (plano free).
2. Menu lateral → **SQL Editor** → **+ New query**.
3. Cole TODO o conteúdo de `backend/supabase-schema.sql` e clique **Run**.
4. Em **Settings → API**, copie e guarde:
   - **Project URL** → vira `SUPABASE_URL`
   - **service_role key** (secret) → vira `SUPABASE_SERVICE_KEY`

### 3. Criar o site no Cloudflare Pages
1. Acesse **dash.cloudflare.com** → **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**.
2. Escolha o repositório `sbs-green`.
3. Configuração de build:
   - **Framework preset:** `None`
   - **Build command:** *(deixe em branco)*
   - **Build output directory:** `/` (raiz)
4. Clique **Save and Deploy**.

### 4. Ligar as variáveis de ambiente
No projeto Pages → **Settings → Environment variables** → **Add** (para **Production**):

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | (Project URL do Supabase) |
| `SUPABASE_SERVICE_KEY` | (service_role key do Supabase) |
| `AUTH_SECRET` | uma frase secreta longa e aleatória |
| `GROQ_API_KEY` | (sua chave Groq, para a IA) |

### 5. Ligar a compatibilidade Node
Ainda em **Settings** → **Functions** (ou **Runtime**) → **Compatibility flags**:
- adicione a flag `nodejs_compat` em **Production** (e em **Preview**).

### 6. Republicar
**Deployments** → no último deploy → **⋯ → Retry deployment**.
Pronto: o site fica em `https://SEU-PROJETO.pages.dev`.

---

## PARTE B — Atualizações do dia a dia

Sempre que eu te entregar arquivos novos:
```bash
git add -A
git commit -m "descreva a mudança"
git push origin main
```
O Cloudflare detecta o push e publica sozinho em ~1–2 min.
Você **não precisa** mexer em variáveis nem em flags de novo.

---

## PARTE C — Ambiente de teste (staging) — opcional

Para validar antes de ir ao ar:
```bash
git checkout -b staging
git push origin staging
```
No Cloudflare Pages, todo branch diferente de `main` vira um **Preview** com URL própria
(`https://staging.SEU-PROJETO.pages.dev`). Quando aprovar:
```bash
git checkout main
git merge staging
git push origin main
```

---

## ✅ Depois de publicar — teste rápido
1. Abra `https://SEU-PROJETO.pages.dev/api/tenants` → deve responder `{"ok":true,...}`.
2. Abra o site, faça login com um dos usuários.
3. Crie um evento → recarregue a página → o evento continua lá (gravou no Supabase).

Se algo falhar, o checklist completo está em `backend/checklist-pos-deploy.md`.

---

## 👤 Usuários iniciais
Os acessos são **semeados automaticamente na primeira vez** que alguém acessa o login
(a partir da lista interna do `server/auth.js`, ou da variável `USERS_JSON` se você
definir uma no Cloudflare). Senha inicial `12345678`, com troca obrigatória no 1º login:
- **Marketing** — franz@sbsgreen.com.br
- **Gerente Nacional** — medina@sbsgreen.com.br
- **CEO** — tiago.mascheto@sbsgreen.com.br
- **Inteligência de Mercado** — victorhugo@sbsgreen.com.br
- **TI** — ti@sbsgreen.com.br
- **Admin (todos os painéis)** — admin@sbsgreen.com.br
