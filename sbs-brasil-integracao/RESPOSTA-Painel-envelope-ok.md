# Resposta do Painel — envelope compatível ✔ e pontos em aberto resolvidos

Para: assistente/time do SBS Brasil
De: lado Painel SBS
Assunto: confirmação da correção de publicação em `sbs_integracao`

Ótima correção — o problema do `fetch` que não lança erro em 4xx/5xx era exatamente o tipo de
coisa que deixava a tabela vazia "silenciosamente". Do nosso lado, **nada precisa mudar**: o
envelope que vocês passaram a gravar bate 100% com o que o Painel lê e exibe.

## 1. Envelope — compatível ✔
Os campos críticos estão certos: `sistema:"sbs-brasil"` e `tipo:"solicitacoes"`.
O Painel exibe do `payload`: `titulo, categoria, criado_por, papel, estado, item, quantidade,
custo, orcamento, publico, data_evento, descricao`. Todos os que vocês mandam são reconhecidos;
os ausentes ficam em branco (não quebram). O `payload.status` que vocês incluem é aditivo — o
Painel **calcula o status pelas decisões** (não depende dele), então pode manter que não atrapalha.

Obs. menor (cosmética, não precisa mexer agora): o Painel colore a bolinha da categoria por um
mapa de rótulos. Se quiserem a cor "certinha", usem as categorias com inicial maiúscula
(ex.: `Campanha`, `Evento`, `Material técnico`). Se vier minúsculo, funciona igual — só cai na
cor padrão. É só estético.

## 2. Ponto aberto — colunas obrigatórias da tabela → SEM problema
A tabela `sbs_integracao` (e todas as `sbs_*`) tem **apenas 3 colunas**:
```
id         text        primary key
data       jsonb       not null default '{}'::jsonb
updated_at timestamptz not null default now()
```
- **Não há coluna `tenant`** — o `tenant` mora **dentro de `data`** (JSONB). Ou seja, o insert
  direto com só `{ id, data:{...} }` funciona: `updated_at` preenche sozinho (default now()).
- **Não há coluna `criado_em`** — o `criadoEm` também vive dentro de `data`.
- Nenhuma outra coluna NOT NULL sem default. Então **não há constraint que rejeite** o insert
  de vocês. O fallback pela Opção A (`/api/integracao`) segue valendo como rede de segurança.

## 3. Ponto aberto — campo de data para ordenação
Para a query de verificação, ordene pela **coluna real `updated_at`** (não existe coluna
`criado_em`; o `criadoEm` está dentro do JSON):
```sql
select id, data->>'sistema' sistema, data->>'tipo' tipo, data->>'titulo' titulo,
       data->>'criadoEm' criado_em, updated_at
from sbs_integracao
order by updated_at desc
limit 20;
```

## 4. Decisões (retorno) — contrato inalterado ✔
O Painel grava, a cada decisão de área:
```json
{ "sistema":"painel-sbs", "tipo":"sugestao-decisao",
  "payload":{ "sugestaoId":"<ref da solicitação>", "area":"marketing|nacional|inteligencia|ceo",
              "decisao":"aprovada|reprovada", "parecer":"<texto>" } }
```
O `sugestaoId` = o `ref` (ou `payload.sugestaoId`) da solicitação original de vocês.
Regra de status idêntica dos dois lados (marketing é o porteiro). Vocês já leem isso — 👍.

## 5. Podem rodar o passo 6 (validação conjunta)
Está tudo pronto no Painel. Quando fizerem o deploy do Worker:
1. Aba Integração (nacional) → "Supabase: conectado".
2. "Reenviar solicitações ao painel" → deve reportar as antigas como enviadas.
3. Nossa query acima lista as linhas `sistema=sbs-brasil, tipo=solicitacoes`.
4. Painel (produção, logado como Marketing) → módulo Solicitações → aparece em ~30s.
5. Painel publica uma decisão de teste → o app atualiza status e notifica o solicitante.

Manda o resultado do passo 2/3 que a gente acompanha a primeira ponta-a-ponta junto.
