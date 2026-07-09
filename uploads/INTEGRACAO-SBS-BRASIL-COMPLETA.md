# Integração SBS Brasil ↔ Painel SBS — Documento técnico completo
### Handoff para o time/assistente do Painel SBS

- **Sistema A — SBS Brasil (Gestão Comercial):** Cloudflare Worker + D1. App único; o papel do usuário (nacional/gerente/vendedor) é decidido no login.
- **Sistema B — Painel SBS (Marketing/Gestão/CEO):** `painel-sbs.pages.dev` (Cloudflare Pages).
- **Ponte:** barramento compartilhado no **Supabase** (tabela `sbs_integracao`) + **endpoints diretos com chave** para dados de alta frequência (localização ao vivo).

---

## 1. Como a integração funciona (dois mecanismos)

1. **Barramento Supabase (`sbs_integracao`)** — para dados de evento (solicitações, vendedores, pedidos, decisões). Um sistema grava um "envelope", o outro lê. É o modelo do briefing de vocês.
2. **Endpoints diretos com chave** — para dados **ao vivo e de alta frequência** (localização da equipe). Empilhar posição a cada 40s no barramento faria a tabela crescer sem controle; então, para localização, o Painel **consulta um endpoint** que devolve sempre a posição atual de cada pessoa. É a escolha correta de engenharia (sem inchaço, sempre atualizado).

**Chave de acesso:** os endpoints diretos usam o parâmetro `key`, que deve bater com a variável `INTEG_KEY` do Worker (combinar um valor secreto entre os dois lados).

---

## 2. O que o SBS Brasil PUBLICA no barramento (`sistema: "sbs-brasil"`)

O Painel lê com `GET /api/integracao?de=sbs-brasil&tipo=...`.

### 2.1 `tipo: "solicitacoes"`
Criada por vendedor/supervisor/gerente no app (campanha, evento, materiais, ou qualquer custo).
```json
{ "sistema":"sbs-brasil", "tipo":"solicitacoes", "ref":"<id>",
  "titulo":"Banner para Dia de Campo", "resumo":"materiais · custo: R$ 900",
  "payload":{ "sugestaoId":"<id>", "categoria":"campanha|evento|materiais|outro",
    "titulo":"...", "descricao":"...", "item":"Banner 2x1m", "quantidade":"3", "custo":"R$ 900",
    "publico":"...", "orcamento":"...", "data_evento":"2026-08-10",
    "estado":"MG", "criado_por":"Vendedor 1 — MG", "papel":"supervisor", "status":"aguardando_marketing" } }
```

### 2.2 `tipo: "vendedores"` e `tipo: "pedidos"`
- **vendedores** (ao criar usuário): `payload { nome, email, papel, estado, telefone }`
- **pedidos** (ao registrar cotação): `payload { cliente, municipio, produto, valor, estado, vendedor }`

---

## 3. FLUXO DE APROVAÇÃO DE SOLICITAÇÕES (o Painel implementa a análise)

Sequencial, **Marketing é o porteiro**:

```
Criada (status: aguardando_marketing)
   -> MARKETING analisa --reprova--> reprovada (solicitante avisado)
        | aprova
   -> Fluxo: MARKETING + NACIONAL + INTELIGENCIA + CEO
        |-- qualquer um reprova --> reprovada
        '-- todos aprovam        --> aprovada (entregue + avisado)
```

**Regra de status (agregar 4 áreas — igual nos dois lados):**
- `marketing = reprovada` → **reprovada**
- `marketing ≠ aprovada` → **aguardando_marketing**
- alguma de {nacional, inteligencia, ceo} = `reprovada` → **reprovada**
- todas {marketing, nacional, inteligencia, ceo} = `aprovada` → **aprovada**
- caso contrário → **em_aprovacao**

### 3.1 Como o Painel DEVOLVE a decisão (contrato)
Para cada parecer, o Painel publica no barramento:
```json
{ "sistema":"painel-sbs", "tipo":"sugestao-decisao", "ref":"<sugestaoId>",
  "payload":{ "sugestaoId":"<id — obrigatório>",
    "area":"marketing|nacional|inteligencia|ceo",
    "decisao":"aprovada|reprovada", "parecer":"texto opcional" } }
```
O SBS Brasil lê, aplica, recalcula o status e **notifica o solicitante em cada etapa** automaticamente. (Nacional também pode decidir dentro do app; os dois lados escrevem no mesmo barramento.)

---

## 4. MAPA DA EQUIPE AO VIVO (visão do CEO) — nova funcionalidade

O SBS Brasil coleta a localização de **gerentes regionais, supervisores e vendedores** enquanto o app deles está aberto (com consentimento — LGPD). O Painel do CEO plota essas posições num mapa interativo, uma "bolinha" por pessoa.

### 4.1 Endpoint que o Painel consulta (polling)
```
GET /api/integ/localizacoes?key=SUA_CHAVE
```
Resposta:
```json
{ "localizacoes":[
  { "supervisor_id":"<id>", "vendedor":"Vendedor 1 — SP", "papel":"supervisor",
    "estado":"SP", "lat":-21.352, "lng":-50.059, "criado":"2026-07-09 12:31:00" },
  { "supervisor_id":"<id>", "vendedor":"Caio — MG", "papel":"gerente",
    "estado":"MG", "lat":-19.92, "lng":-43.94, "criado":"2026-07-09 12:30:40" }
] }
```
- Uma linha por pessoa, sempre com a **posição mais recente** (o SBS Brasil sobrescreve a de cada um).
- `papel` = `gerente` | `supervisor` (vendedor). Use para colorir/rotular as bolinhas.
- `criado` = horário da última atualização (mostrar "visto há X min").

### 4.2 Intervalo de atualização (recomendado)
- **App do vendedor → SBS Brasil:** envia a posição a cada **~40 segundos** enquanto aberto. Esse é o mínimo saudável: o GPS não muda de forma significativa mais rápido que isso a pé/de carro na cidade, e intervalos menores geram tráfego/consumo de bateria sem ganho real de precisão.
- **Painel do CEO → SBS Brasil:** recomendo **reler o endpoint a cada 30–40 segundos** e reposicionar as bolinhas. Não precisa ser menor.

### 4.3 Limites honestos (importante alinhar com o CEO)
- Só há posição **enquanto o app da pessoa está aberto**. Nenhum navegador/PWA rastreia em segundo plano (vale para iPhone e Android). Quem estiver com o app fechado aparece na **última posição conhecida** com o horário — o Painel deve indicar isso (ex.: esmaecer bolinhas com `criado` antigo).
- A coleta é **transparente**: a pessoa vê o aviso e o indicador de que está compartilhando. Não há rastreio oculto (exigência de LGPD e proteção trabalhista).

---

## 5. Testes realizados (lado SBS Brasil) — validação

- **Estático:** `node --check` no Worker, no build e no conector — sem erros.
- **Banco (D1):** tabelas de solicitações e localizações com todos os campos (incluindo `papel`); round-trips de escrita/leitura/limpeza; **0 resíduo**; produção intacta (1.206 carteira, 13 usuários). Localização de gerente e de vendedor validadas; endpoint do CEO retornando as posições atuais (com 2 vendedores reais já compartilhando em produção).
- **APIs/rotas:** 24 endpoints principais + `/api/integ/localizacoes` (chave) + barramento `/api/integracao` (GET/POST/DELETE).
- **Integração/webhooks:** publicação de `solicitacoes/vendedores/pedidos`; leitura de decisões (`sync`) com notificação ao solicitante em cada etapa; webhook de saída configurável; API por chave (`INTEG_KEY`).
- **Front/telas/botões:** 15 telas com função e rota; barra de navegação inferior (mobile/tablet); biometria (WebAuthn); Home com clima; gerente compartilhando localização.
- **Responsividade (desktop/tablet/mobile):** breakpoints 1024/900/640/380; barra inferior só em ≤1024; tabelas viram cartão no celular; mapas com `invalidateSize`; safe-area, toque 44px, inputs 16px; Home responsiva.
- **Usabilidade/sessão:** auto-login com expiração (401), olho na senha, auto-update ao abrir/minimizar, PWA instalável.
- **Resultado da bateria de código: 26/26.**

---

## 6. O que falta para CONCLUIR a integração

**Lado SBS Brasil (rápido):**
1. Publicar o Worker (build atual).
2. No Worker → Settings → Variables, definir:
   - `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` (as **mesmas** do Painel) → ativa o barramento.
   - `INTEG_KEY` (uma chave secreta combinada) → protege o endpoint de localização e as decisões diretas.

**Lado Painel SBS (vocês / assistente do painel):**
3. **Solicitações:** ler `GET /api/integracao?de=sbs-brasil&tipo=solicitacoes`; montar a tela de análise (Marketing → Nacional → Inteligência → CEO); devolver decisões via `tipo:"sugestao-decisao"` (seção 3.1).
4. **Mapa do CEO:** consumir `GET /api/integ/localizacoes?key=INTEG_KEY` a cada 30–40s e plotar as bolinhas (cor/rótulo por `papel`, "visto há X" por `criado`).
5. Confirmar conosco: nome do `tipo` de decisão (`sugestao-decisao`) e o valor de `INTEG_KEY`.

**Validação conjunta (ida-e-volta):**
6. Criamos uma solicitação de teste → confirmam que aparece no Painel; publicam uma decisão de teste → confirmamos mudança de status + notificação ao solicitante.
7. Um vendedor abre o app e compartilha localização → confirmam a bolinha aparecendo no mapa do CEO e atualizando.

---

## 7. Referência — endpoints do SBS Brasil

| Rota | Método | Auth | Descrição |
|---|---|---|---|
| `/api/integracao` | GET | login | Lê o barramento (`?de=painel-sbs&tipo=...`) |
| `/api/integracao` | POST/DELETE | nacional | Grava/remove no barramento |
| `/api/sugestoes` | POST/GET | login | Cria/lista solicitações (publica no barramento) |
| `/api/sugestoes/decisao` | POST | nacional | Decisão do Nacional no app |
| `/api/sugestoes/sync` | POST | nacional | Puxa decisões do Painel e atualiza status |
| `/api/integ/decisao` | POST | **chave** | Decisão vinda do Painel (marketing/nacional/inteligencia/ceo) |
| `/api/integ/localizacoes` | GET | **chave** | **Posições atuais da equipe (mapa do CEO)** |

---

### Observação sobre evolução do contrato
Mudanças no `payload` são sempre **aditivas** (nunca renomear/remover campo em uso sem migração combinada), pois os dois sistemas sobem deploy em momentos diferentes. Qualquer ajuste de formato, alinhar entre os dois lados antes.
