# Painel SBS → CAMPANHAS COMERCIAIS chegam no App / sistema SBS Brasil

Para: assistente/time do SBS Brasil (App/Worker/Gestão Comercial)
Assunto: campanha direcionada à **força comercial** precisa aparecer para regionais e supervisores

## Situação
No Painel, ao criar/editar uma campanha, o Marketing/Gerente escolhe o **destino**:

- **App de eventos** → vale só para vendedores daquele evento/parceira (não é isto aqui).
- **Força comercial** → vale para a equipe comercial do SBS Brasil (regionais e supervisores).

Quando o destino é **força comercial**, o Painel **já publica** a campanha no barramento
compartilhado `sbs_integracao`. Falta o **app/sistema SBS Brasil LER** essas campanhas e
mostrá-las ao time comercial (metas, produtos com preço de campanha e premiação).

> Do lado do Painel (app próprio SBS) isso já é mostrado. Este documento é para o **outro
> sistema** (SBS Brasil comercial) exibir a mesma campanha aos seus usuários.

## O que o Painel PUBLICA (você só precisa LER)
A cada criação/edição de campanha comercial, o Painel grava:
```json
{
  "sistema": "sbs-painel",
  "tipo":    "campanha",
  "ref":     "<id da campanha>",
  "publico": "todos | regionais | supervisores",
  "payload": {
    "id":       "<id da campanha>",
    "nome":     "Campanha Safra Verão · Comercial",
    "destino":  "comercial",
    "publico":  "todos | regionais | supervisores",
    "canal":    "Força comercial",
    "meta":     1500000,
    "inicio":   "2026-09-01",
    "fim":      "2026-12-20",
    "periodo":  "2026-09-01 – 2026-12-20",
    "status":   "Ativa | Encerrada",
    "gtn":      "<código GTN, opcional>",
    "produtos": [ { "produtoId": 12, "preco": 2100 } ],
    "premios":  [ ["1º lugar","Viagem internacional"], ["2º lugar","Notebook"] ]
  }
}
```
> `produtos[].preco` é o **preço específico da campanha**. `produtoId` casa com o catálogo do
> Painel (rota `/api/produtos`) — se precisar do nome/foto do produto, leia o catálogo por esse id.

## PASSO 1 — Ler as campanhas comerciais
```
GET https://painel-sbs.pages.dev/api/integracao?de=sbs-painel&tipo=campanha
```
Retorna a lista de envelopes acima. Para cada um:
- filtrar `payload.status === "Ativa"` (as encerradas podem ficar em histórico);
- respeitar `publico`: `todos` = todo o time comercial; `regionais` = só gerentes regionais;
  `supervisores` = só supervisores — mostre a campanha só a quem se aplica;
- casar por `ref`/`payload.id` para **atualizar** uma campanha já recebida (não duplicar);
  reprocessar o mesmo `id` substitui os dados (edição no Painel).
- ler periodicamente (ex.: a cada 60s) ou via cron, como já feito para `cotacoes`.

## PASSO 2 — Mostrar ao time comercial
Exibir por campanha: nome, período, meta, público, **produtos com o preço de campanha** e a
**premiação** (posições e prêmios). É o que passa a valer para regionais/supervisores.

## (Opcional) PASSO 3 — Devolver adesão/resultado ao Painel
Se quiser que o Painel veja faturamento/pedidos da campanha comercial, publique de volta:
```json
{ "sistema":"sbs-brasil", "tipo":"campanha-resultado", "ref":"<id da campanha>",
  "payload":{ "campanhaId":"<id>", "fat":320000, "pedidos":42, "atualizadoEm":"<ISO>" } }
```
(Combinar depois — o Painel ainda não lê este envelope; é só a convenção reservada.)

## Validação conjunta
1. Painel → Gerente Nacional → nova campanha, destino **Força comercial**, público **todos**.
2. Barramento: `select ... where data->>'tipo'='campanha' and data->>'sistema'='sbs-painel'`
   lista a linha.
3. App/sistema SBS Brasil lê `GET /api/integracao?de=sbs-painel&tipo=campanha` e mostra a
   campanha ao time comercial (com produtos, preços e premiação).
4. Editar a campanha no Painel → o mesmo `id` volta atualizado (sem duplicar).

Contrato-mãe: `contrato-integracao.md`. Fluxo espelho (cotações): `COTACOES-App-para-Painel.md`.
