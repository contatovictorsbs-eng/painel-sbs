# Staging (homologação) + Produção — sem perder dados

## Regra de ouro: os dados NÃO ficam no código
Todos os dados (eventos, campanhas, cashback, vendedores, leads…) ficam no
**Supabase**. O deploy no Cloudflare só troca os **arquivos** (HTML + funções).
Portanto **deploy de código nunca apaga dados** — o banco continua intacto.

O único risco de "misturar" dados é usar **o mesmo banco** para testar (staging)
e para valer (produção). A solução é ter **dois bancos Supabase**.

---

## Arquitetura dos 2 ambientes

| Ambiente | Branch no GitHub | Deploy Cloudflare | Banco Supabase |
|---|---|---|---|
| **Produção** | `main` | Production (domínio principal) | Projeto **sbs-producao** |
| **Homologação** | `homologacao` | Preview (URL `homologacao.painel-sbs.pages.dev`) | Projeto **sbs-staging** |

- Testa-se à vontade em **homologação** sem tocar nos dados reais.
- Quando aprovado, faz-se **merge** de `homologacao` → `main`. Só o código sobe;
  os dados de produção permanecem.

---

## Passo a passo (uma vez)

### 1. Criar o segundo banco (staging)
1. supabase.com → **New project** → nome `sbs-staging` (região São Paulo).
2. **SQL Editor** → cole `backend/supabase-schema.sql` → **Run**.
3. **Project Settings → API** → copie **Project URL** e a chave **service_role**.

### 2. Criar a branch de homologação no GitHub
- No repositório, crie a branch **`homologacao`** a partir de `main`.

### 3. Variáveis por ambiente no Cloudflare Pages
Em **Workers & Pages → painel-sbs → Settings → Environment variables**, defina os
MESMOS nomes em cada ambiente, apontando para bancos diferentes:

**Production** (usa o banco de produção):
- `SUPABASE_URL` = URL do projeto **sbs-producao**
- `SUPABASE_SERVICE_KEY` = service_role do **sbs-producao**
- `AUTH_SECRET`, `USERS_JSON`, `GROQ_API_KEY`, `INTEG_KEY` (os de produção)

**Preview** (usa o banco de staging):
- `SUPABASE_URL` = URL do projeto **sbs-staging**
- `SUPABASE_SERVICE_KEY` = service_role do **sbs-staging**
- `AUTH_SECRET`, `USERS_JSON`, `GROQ_API_KEY`, `INTEG_KEY` (podem ser os mesmos ou de teste)

> No Cloudflare Pages, **Production** = deploys da branch `main`; **Preview** =
> deploys de qualquer outra branch (ex.: `homologacao`). Cada um lê as variáveis
> do seu grupo — por isso os bancos ficam isolados sem mudar o código.

---

## Fluxo de trabalho (toda vez)
1. Faço as alterações → subo na branch **`homologacao`** → Cloudflare gera a URL de
   Preview. Testo lá (dados no banco de staging).
2. Aprovado → **merge `homologacao` → `main`** (Pull Request no GitHub).
3. Cloudflare publica em produção automaticamente. **Dados de produção intactos.**

---

## Variáveis de ambiente (Cloudflare Pages → Production)
| Variável | Para quê |
|---|---|
| SUPABASE_URL / SUPABASE_SERVICE_KEY | banco (Supabase) |
| AUTH_SECRET | assina os tokens de sessão e o 2FA — **fixo**; se trocar, todos relogam |
| USERS_JSON | equipe inicial (opcional; senão usa a lista padrão) |
| FORCAR_2FA | `on` (padrão) exige 2FA em todo login; `off` desliga |
| GROQ_API_KEY | Assistente de IA |
| INTEG_KEY | integração com o app de campo (mesmo valor nos dois lados) |
| RESEND_API_KEY | envio de e-mail (código de redefinição de senha) |
| RESEND_FROM | remetente, ex.: `Plataforma SBS <nao-responda@mail.sbsgreen.com.br>` (domínio verificado no Resend) |
| RESEND_REPLY_TO | e-mail de resposta, ex.: `suporte@sbsgreen.com.br` (opcional) |

### E-mail (Resend) — para o código de senha chegar a usuários reais
1. Verificar `sbsgreen.com.br` em resend.com/domains e adicionar no DNS: **DKIM** (`resend._domainkey`), **SPF** e **MX** no subdomínio de envio (ex.: `mail.sbsgreen.com.br`).
2. Definir `RESEND_FROM` com endereço do domínio verificado → **Retry deployment**.
- Sem domínio verificado (usando `onboarding@resend.dev`), o Resend só entrega ao dono da conta; os demais destinatários dão 403 e o sistema cai em **modo staging** (devolve o código na resposta em vez de enviar). Isso é esperado até verificar o domínio.

---

## Garantias de que nada se perde
- **Deploy = só arquivos.** O banco (Supabase) não é tocado pelo deploy.
- **Sem DROP/DELETE em massa.** As funções (`/api/*`) só fazem `GET/POST/PATCH` e
  `DELETE` por `id` (exclusão de um item, quando o usuário clica). Não há rotina
  que apague tabela ou "limpe tudo".
- **Limpeza de exemplos é só no navegador.** O flag `sbs_dataver` no `localStorage`
  zera apenas o cache local de demonstração — **não** o banco. Depois do go-live não
  deve ser alterado; se precisar forçar um refresh, o banco continua a fonte.
- **Backups do Supabase.** No painel do Supabase (plano free) há backup diário;
  para produção crítica, recomenda-se subir para um plano com Point-in-Time Recovery.
- **Bancos separados.** Staging escreve em `sbs-staging`; produção em `sbs-producao`.
  Um teste jamais afeta o outro.

---

## Checklist antes do 1º go-live
- [ ] Banco `sbs-producao` criado e com o schema aplicado (inclui tabela `cashback`).
- [ ] Banco `sbs-staging` criado e com o schema aplicado.
- [ ] Branch `homologacao` criada.
- [ ] Variáveis Production apontando para `sbs-producao`.
- [ ] Variáveis Preview apontando para `sbs-staging`.
- [ ] Repositório **privado** no GitHub.
- [ ] Confirmado que a service_role nunca foi commitada:
      `git log -S SUPABASE_SERVICE_KEY` (deve vir vazio — as chaves só vivem nas
      variáveis do Cloudflare).
