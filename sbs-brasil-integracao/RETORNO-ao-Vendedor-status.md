# Retorno ao vendedor — refletir andamento e conclusão da solicitação

Para: assistente/time do SBS Brasil (App/Worker)
De: lado Painel SBS
Assunto: o app precisa LER as decisões e atualizar "Minhas solicitações" do vendedor

## Situação
A solicitação criada no app **chega no Painel**, passa pelas aprovações (Marketing → Nacional
→ Inteligência → CEO) e fica **Aprovada** ✔. Mas no app, em "Minhas solicitações", o vendedor
continua vendo **"aguardando marketing"** e todas as áreas **pendente**. Falta o app **ler o
retorno** e refletir o andamento/conclusão. O Painel já publica tudo o que vocês precisam.

## O que o Painel publica no barramento (`sbs_integracao`)
A cada decisão de área, gravamos **DOIS** envelopes:

**1) Decisão por área** (já existia):
```json
{ "sistema":"painel-sbs", "tipo":"sugestao-decisao",
  "ref":"<sugestaoId = id da solicitação no app>",
  "payload":{ "sugestaoId":"<id no app>", "area":"marketing|nacional|inteligencia|ceo",
              "decisao":"aprovada|reprovada", "parecer":"<texto>" } }
```

**2) Status consolidado** (NOVO — facilita o app):
```json
{ "sistema":"painel-sbs", "tipo":"solicitacao-status",
  "ref":"<sugestaoId>",
  "payload":{
    "sugestaoId":"<id no app>",
    "status":"aguardando_marketing | em_aprovacao | aprovada | reprovada",
    "statusLabel":"Aguardando Marketing | Em aprovação | Aprovada | Reprovada",
    "marketing":"pendente|aprovada|reprovada",
    "nacional":"pendente|aprovada|reprovada",
    "inteligencia":"pendente|aprovada|reprovada",
    "ceo":"pendente|aprovada|reprovada",
    "area":"<última área que decidiu>", "decisao":"aprovada|reprovada",
    "parecer":"<texto>", "atualizadoEm":"<ISO>", "atualizadoPor":"<nome>" } }
```

> Use o **`solicitacao-status`**: ele já traz o status geral + o estado de cada área numa linha
> só. Basta pegar o mais recente por `sugestaoId` e pintar os selos do vendedor.

## O que o app deve fazer
1. **Ler periodicamente** (ex.: a cada 30s, ou ao abrir "Minhas solicitações" / "Notificações"):
   ```
   GET {SUPABASE}/rest/v1/sbs_integracao?select=*
       &data->>sistema=eq.painel-sbs
       &data->>tipo=eq.solicitacao-status
       &order=updated_at.desc
   ```
   (ou via `GET https://painel-sbs.pages.dev/api/integracao?de=painel-sbs&tipo=solicitacao-status`)
2. **Casar** cada status com a solicitação local por `payload.sugestaoId === <id da solicitação no app>`.
3. **Atualizar os selos** Marketing/Nacional/Inteligência/CEO com os campos do payload
   (`marketing`, `nacional`, `inteligencia`, `ceo`) e o selo geral com `statusLabel`.
4. **Notificar o vendedor** a cada mudança (o app já tem a aba Notificações com badge):
   - "Sua solicitação '<título>' foi aprovada pelo Marketing"
   - "… reprovada pela Inteligência: <parecer>"
   - "… APROVADA (todas as áreas)" / "… REPROVADA"
5. Se preferir granularidade, também dá para ler `tipo=sugestao-decisao` e montar o histórico
   de pareceres por área na tela de detalhe da solicitação.

## Regra de status (idêntica dos dois lados)
- marketing reprovada → **reprovada**
- marketing ≠ aprovada → **aguardando_marketing**
- qualquer de {nacional, inteligencia, ceo} reprovada → **reprovada**
- todas (marketing, nacional, inteligencia, ceo) aprovadas → **aprovada**
- senão → **em_aprovacao**
(O `status`/`statusLabel` do envelope já vem calculado — podem usar direto.)

## Validação conjunta
1. No app, crie a solicitação (já funciona).
2. No Painel, aprove em cada área (Marketing → Nacional → Inteligência → CEO).
3. `select ... where data->>'tipo'='solicitacao-status'` deve listar as linhas de status.
4. No app, "Minhas solicitações" deve refletir os selos e o status geral, e o vendedor deve
   receber a notificação de cada etapa até a conclusão.

Qualquer dúvida, contrato-mãe: `contrato-integracao.md`.
