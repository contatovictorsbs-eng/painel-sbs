# Para o assistente do SBS Brasil — IMPLEMENTAR o retorno ao vendedor (curto e direto)

Oi! A integração de solicitações está **funcionando ponta a ponta**: a solicitação do vendedor
chega no Painel, passa pelas 4 aprovações e as decisões **já estão gravadas no banco
compartilhado** (`sbs_integracao`). Confirmado por SQL em produção:

```
ref               tipo              area         decisao    updated_at
f36374a9bd7a0953  sugestao-decisao  marketing    aprovada   2026-07-10 12:37
f36374a9bd7a0953  sugestao-decisao  nacional     aprovada   2026-07-10 12:38
f36374a9bd7a0953  sugestao-decisao  inteligencia aprovada   2026-07-10 12:38
f36374a9bd7a0953  sugestao-decisao  ceo          aprovada   2026-07-10 12:39
```

**Falta só o APP ler essas decisões e refletir no vendedor.** O Painel não precisa de mais nada.
Segue exatamente o que executar.

---

## PASSO 1 — Ler as decisões do Painel (a cada ~30s e ao abrir "Minhas solicitações")

Duas opções (use a que já se encaixa no seu código):

**A) Direto no Supabase (REST):**
```
GET {SUPABASE_URL}/rest/v1/sbs_integracao
    ?select=id,data,updated_at
    &data->>sistema=eq.painel-sbs
    &data->>tipo=eq.sugestao-decisao
    &order=updated_at.desc
Headers: apikey: {SERVICE_KEY}, Authorization: Bearer {SERVICE_KEY}
```

**B) Pelo endpoint do Painel:**
```
GET https://painel-sbs.pages.dev/api/integracao?de=painel-sbs&tipo=sugestao-decisao
→ { ok:true, data:[ { id, sistema, tipo, ref, payload:{ sugestaoId, area, decisao, parecer }, criadoEm } , ... ] }
```

> Dica: depois que o Painel publicar o novo deploy, existe também
> `tipo=solicitacao-status`, que traz o status GERAL já calculado numa linha só
> (`payload.status`, `payload.statusLabel`, e o estado de cada área). É opcional —
> com `sugestao-decisao` abaixo você já monta tudo.

## PASSO 2 — Casar com a solicitação local
Para cada registro lido, use **`payload.sugestaoId`** (== `ref`) e ache a solicitação do app
com esse id. No exemplo: `sugestaoId = "f36374a9bd7a0953"`.

## PASSO 3 — Atualizar os 4 selos e o status geral
Agrupe as decisões por `sugestaoId` e monte um mapa por área:
```
dec = { marketing:'aprovada', nacional:'aprovada', inteligencia:'aprovada', ceo:'aprovada' }
```
Regra de status (idêntica ao Painel):
```
se dec.marketing == 'reprovada'                              -> 'reprovada'
senão se dec.marketing != 'aprovada'                         -> 'aguardando_marketing'
senão se algum de {nacional,inteligencia,ceo} == 'reprovada' -> 'reprovada'
senão se nacional==inteligencia==ceo=='aprovada'             -> 'aprovada'
senão                                                        -> 'em_aprovacao'
```
Atualize em "Minhas solicitações": os 4 selos (Marketing/Nacional/Inteligência/CEO) com
`aprovada`/`reprovada`/`pendente`, e o selo geral com o status acima. No exemplo, os 4 ficam
verdes e o geral vira **Aprovada**.

## PASSO 4 — Notificar o vendedor a cada mudança
Sempre que um selo mudar (comparar com o estado anterior salvo no D1/local), gere notificação
na aba Notificações do app:
- "Marketing aprovou sua solicitação '<título>'"
- "<Área> reprovou: <parecer>"  (o `parecer` vem no payload)
- Ao concluir: "Sua solicitação '<título>' foi APROVADA" ou "… foi REPROVADA"

## PASSO 5 — (opcional) histórico de pareceres
Na tela de detalhe da solicitação do app, liste os `sugestao-decisao` daquele `sugestaoId`
em ordem de tempo, mostrando área + decisão + parecer. Fica um "andamento" completo.

---

## Como validar
1. Rode o PASSO 1 e confirme que retorna as 4 linhas do `ref f36374a9bd7a0953`.
2. Abra "Minhas solicitações" no app do vendedor Victor → a solicitação deve aparecer
   **Aprovada** com os 4 selos verdes.
3. O vendedor deve ter recebido as notificações de cada etapa.
4. Faça uma nova: reprove numa área no Painel → o app deve mostrar **Reprovada** + o parecer.

Qualquer diferença de campo, me chama. Contrato-mãe: `contrato-integracao.md`.
Valeu! 🚀
