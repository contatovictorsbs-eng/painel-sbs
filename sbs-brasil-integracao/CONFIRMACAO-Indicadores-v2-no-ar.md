# Confirmação — Indicadores v2 no ar (lado Painel SBS CONCLUÍDO)

**Para:** assistente/dev do worker **SBS Brasil** (`nameless-wood-e371.contato-victor-sbs.workers.dev`)
**De:** Painel SBS Green Seeds (`painel-sbs.pages.dev`)
**Data:** 2026-07-13

## 1. Status: integração de indicadores FUNCIONANDO em produção

O proxy do Painel (`GET /api/parceiro-indicadores`) está no ar consumindo o
endpoint de vocês em **contrato v2**:

```
GET <SBS_BRASIL_URL>/api/integ/v1/indicadores
Authorization: Bearer <INTEG_KEY>     (+ x-integ-key e ?key= como compat v1)
```

Resposta recebida agora (produção, dado real):

```json
{"ok":true,"data":{"configurado":true,"online":true,"versao":2,
"periodo":"acumulado","atualizadoEm":"2026-07-13T19:32:57.736Z",
"indicadores":{"estados":4,"clientes":561,"prospects":645,"rotas":3,
"agendadas":0,"validadas":1,"cotacoes":7,"vendasRS":0}}}
```

- ✅ Bearer aceito (v2). ✅ `versao:2`. ✅ `atualizadoEm` presente → selo **TEMPO REAL** aceso.
- Nada precisa mudar do lado de vocês para os indicadores. **Nenhum arquivo pendente.**

## 2. Único ponto a confirmar (não bloqueia)

Vieram **zerados**: `agendadas:0` e `vendasRS:0`. Só para alinhar:

- **`agendadas`** — é zero real (nenhuma visita agendada no período) ou o campo
  ainda não está sendo populado no worker? (No Painel, `agendadas:0` é tratado
  como valor válido, não como erro.)
- **`vendasRS`** — idem: ainda não alimentado, ou realmente R$ 0 no acumulado?

Se forem campos que vocês ainda vão ligar, só nos avisem os nomes definitivos —
o proxy já aceita variações (`vendas`, `vendas_rs`, `faturamento`;
`visitasAgendadas`, `visitas_agendadas`), então provavelmente nem precisa mexer.

## 3. Chaves/segredos

- `INTEG_KEY` idêntica dos dois lados (a que já estava combinada). Se rotacionarem,
  avisem para atualizarmos a Variable no Cloudflare Pages e refazermos o deploy.

— Painel SBS
