# Resposta — esclarecimento de arquitetura (Painel SBS × App de campo)

Recebi as "Perguntas de investigação". A observação mais importante primeiro, porque
muda todas as respostas:

## ⚠️ São DOIS sistemas diferentes — não é o mesmo projeto em dois lugares

O documento mistura duas coisas que **não são a mesma base de código**:

1. **Painel SBS (gestão comercial / marketing / diretoria)** — é o que eu mantenho.
   - Hospedagem: **Cloudflare _Pages_** (projeto `painel-sbs`, em `painel-sbs.pages.dev`).
   - Backend: **Pages Functions** (`functions/api/[[path]].js`) + **Supabase/Postgres**
     (via `server/_lib/store.js`; tabelas no padrão `sbs_<coleção>`).
   - HTML servido como **asset estático** `painel-sbs.html` (não há Base64 embutido).
   - Fonte de verdade: **GitHub `contatovictorsbs-eng/painel-sbs`**, com **deploy
     automático** a cada push na branch `main`.
   - Segredos (env vars no Pages): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
     `AUTH_SECRET`, `USERS_JSON`, `GROQ_API_KEY`, `INTEG_KEY`.
   - **Não usa Cloudflare Workers, não usa D1, não usa PANEL_B64.**

2. **App de campo (SBS Brasil / SBS Green — vendedores/supervisores/regionais)** — é o
   sistema que VOCÊ mantém, e é o que o documento descreve de fato:
   - Worker `nameless-wood-e371`, banco **D1** `sbs-gestao-brasil`, HTML em `PANEL_B64`,
     papéis master/gerente/supervisor, rotas `/api/pontos`, `/api/rotas`, `/api/visitas`,
     `/api/cotacoes`, `/api/admin/geocodificar`, etc.
   - Esse worker **não** é gerado a partir do repo `painel-sbs`. São bases distintas.

Os dois sistemas se falam **só** pela integração HTTP (contrato em
`backend/contrato-integracao.md` do lado do Painel): o Painel consome
`GET /api/parceiro-indicadores` e `GET /api/localizacoes` (proxy, Bearer `INTEG_KEY`) e
publica/─lê no barramento `/api/integracao`. Fora isso, são independentes.

---

## Respostas objetivas

### 1. Fonte de verdade
- **1.1 / 1.3** O worker `nameless-wood-e371` **não** foi gerado a partir do repo
  `painel-sbs`. O `functions/api/[[path]].js` do GitHub roda no **Pages** do Painel, não
  no seu worker. São códigos diferentes, para sistemas diferentes.
- **1.2** Para o **Painel**: a fonte de verdade é o **GitHub**; push em `main` →
  Cloudflare **Pages** publica sozinho. Para o **app de campo (worker)**: a fonte de
  verdade hoje é o **dashboard do Cloudflare** (foi editado lá), **não** o GitHub.

### 2. Sincronização GitHub × Cloudflare
- **2.1** O `painel-sbs.html` do nosso repo **é** o que está no ar no Painel (bundle
  gerado do `Painel SBS.dc.html`). Ele **não tem** `APP_VERSION`/`PANEL_B64` — esse
  campo é do seu worker, não do Painel.
- **2.2** No **Painel**: deploy **automático** via GitHub→Pages. No **worker de campo**:
  pelo que o documento indica, **manual** no dashboard.
- **2.3** Um push no repo `painel-sbs` **NÃO** sobrescreve o seu worker
  `nameless-wood-e371` — são projetos separados no Cloudflare. Sem risco cruzado.

### 3. Ambientes
- **3.1 / 3.3** Os dois workers (`nameless-wood-e371` e `small-darkness-6a00sbs-ba`) e os
  dois D1 (`sbs-gestao-brasil`, `sbs-gestao-ba`) são do **app de campo** — quem define
  qual é produção é você. O Painel não usa nenhum deles.
- **3.2** O `staging-e-producao.md` existe **no repo do Painel** (`backend/…`) e descreve
  os 2 ambientes do **Painel** (Pages Production=`main` / Preview=`homologacao`, com
  bancos Supabase separados). Não cobre o seu worker.

### 4. Arquitetura (Worker vs Pages)
- **4.1** O Painel roda como **Cloudflare Pages** (por isso o `functions/api/[[path]].js`).
  O que está como **Worker + PANEL_B64** é o **app de campo** — dois modelos distintos,
  cada um no seu projeto.
- **4.2** No Painel, o HTML vem do **asset estático `painel-sbs.html`** (rota `/` via
  `_redirects`). Não há Base64 nem passo que converta HTML→Base64. Esse fluxo
  (`PANEL_B64`) é exclusivo do seu worker.

### 5. Risco de perda de trabalho
- **5.1** As alterações que você fez direto no worker (`Ver todos os estados`,
  `/api/admin/geocodificar`, filtros por estado em `/api/pontos|rotas|visitas|cotacoes`,
  `estadosPermitidos/ufFiltro/estadoReal`) estão **no seu worker**, que é **separado** do
  repo `painel-sbs`. **Nenhum deploy do Painel as afeta.** O risco só existe se você
  fizer deploy no *próprio* worker a partir de uma base antiga — para evitar isso:
  **exporte o código atual do worker** (Cloudflare → o worker → *Quick edit* / `wrangler
  download`) e **commit** num repositório do app de campo antes de qualquer novo deploy.
- **5.2** Fluxo recomendado (para o app de campo): parar de editar no dashboard; criar um
  repo Git do worker; adotar `wrangler deploy` a partir do Git; manter um ambiente de
  staging. No Painel isso já está assim (GitHub→Pages, com `homologacao` para testes).

---

## Resumo em uma linha
Editar/deployar o repo **`painel-sbs`** mexe **apenas** no Painel (Pages+Supabase) e
**não toca** no worker `nameless-wood-e371` (D1) do app de campo. Seus ajustes recentes
no worker estão seguros em relação aos nossos deploys — só precisam ser versionados no
lado de vocês. A ligação entre os dois continua sendo somente o contrato HTTP.

Se quiser, me diga o `SBS_BRASIL_URL` que o Painel deve consumir e eu confirmo os campos
esperados dos endpoints de integração.
