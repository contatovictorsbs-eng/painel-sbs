# App SBS Brasil → publicar COTAÇÕES / pedidos de desconto no barramento

Para: assistente/time do SBS Brasil (App/Worker)
Assunto: cotação do app (vendedor e app de parceiro) precisa chegar no Painel do Gerente Nacional

## Situação
No app, o vendedor registra uma **cotação** (cliente, município, produto, valor) e, quando há
**pedido de desconto/bonificação**, isso precisa cair na **fila de aprovação do Gerente Nacional**
no Painel. Hoje a cotação fica só no app. O Painel já está pronto para **ler** e **devolver a
decisão** — falta o app **publicar** no barramento compartilhado `sbs_integracao`.

Vale para os DOIS apps: **app do vendedor** e **app de parceiro/evento**.

## PASSO 1 — Publicar a cotação (ao registrar, ou ao pedir desconto)
```
POST https://painel-sbs.pages.dev/api/integracao      (ou grave direto em sbs_integracao)
Body:
{
  "sistema": "sbs-brasil",     // OBRIGATÓRIO
  "tipo":    "cotacoes",       // OBRIGATÓRIO (plural)
  "ref":     "<id da cotação no app>",
  "titulo":  "<cliente> — <produto>",
  "resumo":  "<valor> · desconto <x>%",
  "payload": {
    "cotacaoId":   "<id da cotação no app>",
    "cliente":     "<nome do cliente>",
    "municipio":   "Penápolis",
    "estado":      "SP",
    "produto":     "<produto>",
    "quantidade":  "<qtd, opcional>",
    "valor":       10000,               // valor/preço de tabela (número)
    "descontoSolic": 8,                 // % de desconto pedido (0 se não pede)
    "bonificacao":  "<texto, opcional>",
    "observacoes":  "<justificativa, opcional>",
    "vendedor":    "<nome do vendedor>",
    "papel":       "vendedor|supervisor",
    "criado_por":  "<nome de quem registrou>"
  }
}
```
> Críticos: `sistema:"sbs-brasil"` e `tipo:"cotacoes"`. O `ref`/`cotacaoId` deve ser o id da
> cotação no app (é por ele que a decisão volta). Os demais campos são aditivos.

## PASSO 2 — Ler a decisão do Gerente (retorno ao vendedor)
Quando o Gerente Nacional aprova/recusa, o Painel publica:
```json
{ "sistema":"painel-sbs", "tipo":"cotacao-status", "ref":"<cotacaoId>",
  "payload":{ "cotacaoId":"<id>", "status":"liberado|recusado",
              "descontoAprov":8, "bonifAprov":"<texto>", "nota":"<obs do gerente>",
              "decididoPor":"<nome>", "decididoEm":"<ISO>" } }
```
O app deve **ler** periodicamente:
```
GET https://painel-sbs.pages.dev/api/integracao?de=painel-sbs&tipo=cotacao-status
```
casar por `payload.cotacaoId`, **atualizar o status da cotação** no app (Em andamento →
Liberado/Recusado) e **notificar o vendedor** (aba Notificações):
- "Desconto liberado: <descontoAprov>% para <cliente>"
- "Cotação recusada: <nota>"

## Validação conjunta
1. App: registrar uma cotação com desconto → deve gravar em `sbs_integracao`
   (`select ... where data->>'tipo'='cotacoes'` lista a linha).
2. Painel (Gerente Nacional) → Aprovação de desconto/orçamentos: a cotação aparece na fila.
3. Gerente aprova → Painel publica `cotacao-status`.
4. App lê e mostra a cotação como Liberado + notifica o vendedor.

Contrato-mãe: `contrato-integracao.md`.
