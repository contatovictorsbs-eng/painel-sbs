# Integração SBS Brasil ↔ Painel SBS (Marketing/Gestão)
### Documento de validação e handoff — lado **SBS Brasil** concluído

- **Sistema A — SBS Brasil (Gestão Comercial):** `nameless-wood-e371.contato-victor-sbs.workers.dev` (Cloudflare Worker + D1)
- **Sistema B — Painel SBS (Marketing/Gestão):** `painel-sbs.pages.dev` (Cloudflare Pages)
- **Ponte:** barramento compartilhado no **Supabase**, tabela `sbs_integracao` (conforme o briefing que vocês enviaram)
- **Data desta versão:** conforme o build publicado (versão exibida no rodapé do app)

---

## 1. Resumo executivo

O lado **SBS Brasil** da integração está **implementado e testado**. Seguimos exatamente o contrato do briefing de vocês (barramento `sbs_integracao`, envelope genérico `sistema/tipo/ref/titulo/resumo/payload`). O SBS Brasil já **publica** dados no barramento e já **lê** o que o Painel publicar.

Falta apenas: (a) configurar as duas variáveis do Supabase no Worker (as **mesmas** de vocês) e (b) o Painel implementar a **leitura das solicitações** e a **devolução das decisões** no formato descrito na seção 4/5.

---

## 2. Checklist do briefing de vocês — situação

| Item solicitado no briefing | Situação no SBS Brasil |
|---|---|
| Usar o mesmo Supabase (barramento `sbs_integracao`) | ✅ Implementado |
| Rota `/api/integracao` (GET/POST/DELETE) | ✅ Implementada no Worker (mesmo contrato do `api-integracao.js`) |
| Publicar dados do SBS Brasil no barramento | ✅ Publica `solicitacoes`, `vendedores`, `pedidos` |
| Ler o que vem do Painel | ✅ Lê `?de=painel-sbs` (aba "Integração" no app do nacional) |
| Envelope genérico (payload livre, aditivo) | ✅ Respeitado |
| Variáveis `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | ⚠️ **Pendente** — precisam ser as mesmas de vocês (ver seção 8) |
| Tabela `sbs_integracao` no Supabase | ✅ Já existe no Supabase de vocês (não precisa recriar) |

---

## 3. O que o SBS Brasil PUBLICA no barramento

Todos os envelopes vão com `sistema: "sbs-brasil"`. O Painel lê com `GET /api/integracao?de=sbs-brasil` (e pode filtrar por `&tipo=...`).

### 3.1 `tipo: "solicitacoes"` — **o foco desta entrega**
Publicado automaticamente quando um vendedor/supervisor/gerente cria uma solicitação no app.
```json
{
  "sistema": "sbs-brasil",
  "tipo": "solicitacoes",
  "ref": "<id da solicitação no SBS Brasil>",
  "titulo": "Banner para Dia de Campo",
  "resumo": "materiais · custo: R$ 900",
  "payload": {
    "sugestaoId": "<id>",
    "categoria": "campanha | evento | materiais | outro",
    "titulo": "Banner para Dia de Campo",
    "descricao": "texto livre da justificativa",
    "item": "Banner 2x1m",
    "quantidade": "3",
    "custo": "R$ 900",
    "publico": "pecuaristas da região",
    "orcamento": "R$ 15.000",
    "data_evento": "2026-08-10",
    "estado": "MG",
    "criado_por": "Vendedor 1 — MG",
    "papel": "supervisor",
    "status": "aguardando_marketing"
  }
}
```

### 3.2 `tipo: "vendedores"`
Publicado ao criar um usuário e via botão "Publicar vendedores" (base atual).
```json
{ "tipo":"vendedores", "ref":"<id>", "titulo":"Nome",
  "payload":{ "nome":"", "email":"", "papel":"gerente|supervisor", "estado":"SP", "telefone":"" } }
```

### 3.3 `tipo: "pedidos"`
Publicado ao registrar uma cotação.
```json
{ "tipo":"pedidos", "ref":"<id>", "titulo":"Cliente",
  "payload":{ "cliente":"", "municipio":"", "produto":"", "valor":0, "estado":"MG", "vendedor":"" } }
```

---

## 4. Módulo de **Solicitações** — o que o Painel precisa implementar

Esta é a funcionalidade nova. No app do SBS Brasil, o vendedor/supervisor/gerente regional abre uma **Solicitação** (campanha, evento, materiais como banner/boné/brinde, ou qualquer coisa com **custo financeiro**). O fluxo de aprovação é **sequencial**, com o **Marketing como porteiro**:

```
Solicitação criada (status: aguardando_marketing)
        │
        ▼
   MARKETING analisa  ──reprova──►  status: reprovada  (solicitante avisado)
        │ aprova
        ▼
   Fluxo de aprovação:  MARKETING + NACIONAL + INTELIGÊNCIA + CEO
        │
        ├─ qualquer um reprova ──►  status: reprovada
        └─ todos aprovam        ──►  status: aprovada  (entregue + solicitante avisado)
```

### 4.1 O que o Painel precisa fazer
1. **Ler as solicitações**: `GET /api/integracao?de=sbs-brasil&tipo=solicitacoes` (a sua própria rota do Painel, no mesmo Supabase).
2. **Exibir uma tela** de análise para Marketing (e depois Nacional/Inteligência/CEO) com: título, categoria, descrição, item/quantidade/custo, solicitante, estado, e o status atual.
3. **Registrar a decisão de cada área** e **devolver** ao barramento no formato da seção 5.
4. Regra de status (agregar as 4 áreas) — **igual à do SBS Brasil**:
   - `marketing = reprovada` → **reprovada**
   - `marketing ≠ aprovada` → **aguardando_marketing**
   - alguma de {nacional, inteligencia, ceo} = `reprovada` → **reprovada**
   - todas {marketing, nacional, inteligencia, ceo} = `aprovada` → **aprovada**
   - caso contrário → **em_aprovacao**

> Observação: o **Nacional** também pode decidir **dentro do próprio SBS Brasil** (papel Master). Marketing, Inteligência e CEO decidem **pelo Painel**. Os dois lados escrevem no mesmo barramento, então o status converge.

---

## 5. Contrato de **decisão** (o Painel devolve assim)

Para cada parecer (de Marketing, Nacional, Inteligência ou CEO), o Painel publica **um envelope**:

```json
{
  "sistema": "painel-sbs",
  "tipo": "sugestao-decisao",
  "ref": "<id da solicitação (o mesmo sugestaoId)>",
  "titulo": "Decisão Marketing — Banner Dia de Campo",
  "resumo": "aprovada",
  "payload": {
    "sugestaoId": "<id da solicitação — obrigatório>",
    "area": "marketing | nacional | inteligencia | ceo",
    "decisao": "aprovada | reprovada",
    "parecer": "texto opcional"
  }
}
```

O SBS Brasil **lê esses envelopes**, aplica na solicitação correspondente, recalcula o status pela regra da seção 4.1 e **notifica o solicitante** automaticamente. Não é preciso o Painel chamar o SBS Brasil diretamente — basta publicar no barramento.

Campos-chave: **`sugestaoId`** (liga a decisão à solicitação) e **`area`** (qual etapa do fluxo).

---

## 6. Notificações ao solicitante (lado SBS Brasil — já pronto)

A cada decisão que chega do Painel, o SBS Brasil gera uma notificação **para o solicitante** (vendedor/supervisor/gerente) informando o andamento, por exemplo:
- "Marketing aprovou sua solicitação 'Banner Dia de Campo'. Andamento: em aprovação."
- "CEO aprovou sua solicitação 'Banner Dia de Campo'. APROVADA — será atendida."
- "Marketing reprovou sua solicitação 'Banner Dia de Campo'. Solicitação reprovada."

Ou seja: **basta o Painel publicar a decisão**; o aviso ao solicitante é automático no SBS Brasil.

---

## 7. Testes realizados (validação do lado SBS Brasil)

- **Estático:** `node --check` no Worker e no build — sem erros de sintaxe.
- **Banco (D1):** tabela `sugestoes` com todos os campos do fluxo (categoria/item/quantidade/custo + pareceres marketing/nacional/inteligência/ceo); criação/leitura/limpeza testadas; integridade sem duplicados/órfãos; **0 resíduo de teste**; produção intacta (1.206 registros de carteira, 13 usuários ativos).
- **Fluxo de aprovação:** regra de status validada (Marketing porteiro; 4 aprovações → aprovada; qualquer reprovação → reprovada).
- **Integração:** rota `/api/integracao` (GET/POST/DELETE) validada; publicação de `solicitacoes/vendedores/pedidos`; leitura de decisões (`sync`).
- **Bateria geral (27/27):** responsividade (3 breakpoints, menu hambúrguer, tabelas em cartão no mobile, mapas 60vh, inputs 16px, toque 44px, safe-area), usabilidade/sessão (auto-login, expiração de sessão, olho na senha, auto-update ao abrir/minimizar, PWA instalável, configurações de perfil), fluxo de solicitações, integração e regressivo (login/carteira/rotas/cotações/equipe/visitas/localização intactos).

---

## 8. O que falta para CONCLUIR a integração (ação necessária)

**Do lado do SBS Brasil (rápido):**
1. Publicar o Worker (build atual — já preparado).
2. No Cloudflare → Worker do SBS Brasil → Settings → Variables, adicionar as **mesmas** credenciais do Painel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   > Sem elas o app funciona normalmente, mas a ponte fica inativa (sem erro).

**Do lado do Painel SBS (vocês):**
3. Ler as solicitações: `GET /api/integracao?de=sbs-brasil&tipo=solicitacoes`.
4. Criar a **tela de análise/aprovação** (Marketing primeiro; depois Nacional/Inteligência/CEO), com botões Aprovar/Reprovar e campo de parecer por área.
5. **Devolver a decisão** publicando o envelope `tipo:"sugestao-decisao"` (seção 5).
6. Confirmar conosco: o `tipo` de decisão será exatamente **`sugestao-decisao`**? Se preferirem outro nome, ajustamos os dois lados.

**Validação conjunta (ida-e-volta):**
7. Criamos uma solicitação de teste no app → vocês confirmam que ela aparece no Painel.
8. Vocês publicam uma decisão de teste (ex.: Marketing aprovada) → confirmamos que o status muda e o solicitante recebe a notificação.

---

## 9. Referência rápida — endpoints do SBS Brasil

| Rota | Método | Descrição |
|---|---|---|
| `/api/integracao` | GET | Lê o barramento (`?de=painel-sbs&tipo=...`) |
| `/api/integracao` | POST/DELETE | Grava/remove no barramento (nacional) |
| `/api/sugestoes` | POST | Cria solicitação (publica no barramento) |
| `/api/sugestoes` | GET | Lista solicitações (do solicitante / todas p/ nacional) |
| `/api/sugestoes/decisao` | POST | Decisão do Nacional dentro do app |
| `/api/sugestoes/sync` | POST | Puxa decisões do Painel e atualiza status |
| `/api/integ/decisao` | POST | (Alternativa) decisão via chamada direta com chave `INTEG_KEY` |

---

### Contato / próximos passos
Assim que vocês confirmarem as variáveis do Supabase e o `tipo` da decisão, fazemos o teste de ida-e-volta com um registro real e a integração está fechada. Qualquer ajuste no formato do `payload` é aditivo e combinado entre os dois lados (nunca renomear/remover campo em uso sem migração conjunta).
