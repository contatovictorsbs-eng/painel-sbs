# AÇÃO NECESSÁRIA no App/Worker SBS Brasil — publicar Solicitações no barramento

## Diagnóstico (feito em produção)
- As credenciais estão **iguais** nos dois lados (mesma `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`). ✔
- A tabela **`sbs_integracao` existe** e o Painel lê/grava nela (testado: ida-e-volta OK). ✔
- **PORÉM a tabela está VAZIA** (`select ... from sbs_integracao` → 0 rows).
  → Ou seja: **quando o supervisor/vendedor/regional cria uma solicitação no app, o app NÃO está publicando no barramento.** É isso que precisa ser implementado no lado de vocês.

O Painel (Marketing) é super-tenant e **vê tudo de todos os parceiros** — não há bloqueio por tenant. Assim que o app gravar, aparece na fila do Marketing (recarrega a cada 30s).

---

## O que o app precisa fazer
**Toda vez que uma solicitação for criada** (por vendedor, supervisor ou gerente regional),
gravar **1 envelope** na tabela compartilhada `sbs_integracao`.

### Opção A — via endpoint do Painel (mais simples)
```
POST https://painel-sbs.pages.dev/api/integracao
Headers: Content-Type: application/json
         Authorization: Bearer <token do usuário logado no app>   (se tiver)
Body (JSON):
{
  "sistema": "sbs-brasil",        // OBRIGATÓRIO exatamente assim
  "tipo":    "solicitacoes",      // OBRIGATÓRIO exatamente assim (plural)
  "ref":     "<id da solicitação no app>",
  "titulo":  "<título curto>",
  "resumo":  "<uma linha>",
  "payload": {
    "titulo":     "<título>",
    "categoria":  "Banner|Folder|Catálogo|Material técnico|Vídeo|Campanha|Evento|Feira|Dia de campo|Outros",
    "criado_por": "<nome de quem pediu>",
    "papel":      "Vendedor|Supervisor|Gerente regional",
    "estado":     "SP",
    "item":       "<o que foi pedido>",
    "quantidade": "<opcional>",
    "custo":      "<opcional>",
    "orcamento":  "<opcional>",
    "publico":    "<opcional>",
    "data_evento":"2026-08-15",
    "descricao":  "<justificativa/texto livre>"
  }
}
```
> Os nomes de campo no `payload` acima são **exatamente** os que o Painel exibe. Campos
> ausentes só ficam em branco — não quebram nada. Os únicos itens **críticos** são
> `sistema:"sbs-brasil"` e `tipo:"solicitacoes"` no envelope.

### Opção B — gravar direto no Supabase (se o app já usa a service key)
`INSERT` em `sbs_integracao` com `id` único e a coluna `data` (JSONB) contendo o MESMO objeto
do envelope acima (com os campos `sistema`, `tipo`, `ref`, `titulo`, `resumo`, `payload`,
`criadoEm`, e opcionalmente `tenant` = slug da parceira). Exemplo REST:
```
POST {SUPABASE_URL}/rest/v1/sbs_integracao
Headers: apikey: {SERVICE_KEY}
         Authorization: Bearer {SERVICE_KEY}
         Content-Type: application/json
         Prefer: return=representation
Body:
{ "id": "sol-<uuid>", "data": {
    "sistema":"sbs-brasil", "tipo":"solicitacoes", "ref":"<id no app>",
    "titulo":"...", "resumo":"...", "payload":{...},
    "criadoEm":"<ISO>", "tenant":"<slug-parceira ou sbs>"
} }
```

---

## Como validar (2 minutos)
1. No app, crie uma solicitação de teste.
2. No Supabase → SQL Editor, rode:
   ```sql
   select id, data->>'sistema' sistema, data->>'tipo' tipo, data->>'titulo' titulo
   from sbs_integracao order by updated_at desc limit 20;
   ```
   Deve aparecer 1 linha com `sistema=sbs-brasil` e `tipo=solicitacoes`.
3. No Painel (produção, logado como Marketing) → módulo **Solicitações SBS Brasil**:
   a solicitação aparece na fila em até 30s.

---

## Retorno das decisões (já pronto no Painel)
Quando o Marketing (porteiro) e depois Nacional/Inteligência/CEO decidem, o Painel grava
envelopes `sistema:"painel-sbs"`, `tipo:"sugestao-decisao"`,
`payload:{ sugestaoId, area, decisao:"aprovada|reprovada", parecer }`.
O `sugestaoId` é o `ref` (ou `payload.sugestaoId`) da solicitação original.
O app deve **ler** essas decisões e atualizar o status/ notificar o solicitante:
```
GET https://painel-sbs.pages.dev/api/integracao?de=painel-sbs&tipo=sugestao-decisao
```
Regra de status: marketing reprovada → reprovada; marketing ≠ aprovada → aguardando_marketing;
qualquer de {nacional,inteligencia,ceo} reprovada → reprovada; todas aprovadas → aprovada.

Qualquer dúvida, o contrato-mãe é `contrato-integracao.md`.
