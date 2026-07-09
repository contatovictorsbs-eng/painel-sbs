# Contrato de Integração — Painel SBS ↔ SBS Brasil

Os dois sistemas SBS rodam na **Cloudflare** e compartilham o **mesmo banco Supabase**
(mesma `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` nas variáveis de ambiente dos dois projetos).
A troca de dados acontece por uma **tabela/coleção compartilhada** chamada `integracao`,
que funciona como um *barramento* de eventos. Ninguém chama a API do outro: cada sistema
**grava** e **lê** dessa tabela.

## Por que um "envelope" genérico
Cada linha carrega um `payload` JSON livre. Assim, quando surgir uma **feature nova**
(um novo tipo de dado), NÃO é preciso alterar o schema — basta usar um novo `tipo`
e colocar os campos dentro de `payload`.

## Coleção `integracao`
| campo      | tipo    | descrição |
|------------|---------|-----------|
| id         | string  | id do envelope (gerado) |
| sistema    | string  | ORIGEM do dado: `'painel-sbs'` ou `'sbs-brasil'` |
| tipo       | string  | `vendas` · `vendedores` · `clientes` · `campanhas` · `pedidos` · `produtos` · `eventos` · (livre) |
| ref        | string  | id do registro no sistema de origem |
| titulo     | string  | rótulo curto para exibição |
| resumo     | string  | uma linha de resumo |
| payload    | json    | **todos** os campos do registro (formato livre) |
| criadoEm   | ISO date| data/hora de gravação |
| criadoPor  | string  | quem gerou |
| tenant     | string  | isolamento multi-parceiro (herdado do store) |

## API (idêntica nos dois projetos)
- `GET  /api/integracao?de=<sistema>&tipo=<tipo>` — lista (filtros opcionais).
  - Para VER o que veio do outro sistema: filtre por `de` diferente do seu.
- `POST /api/integracao { sistema, tipo, ref, titulo, resumo, payload }` — publica um envelope.
- `DELETE /api/integracao?id=<id>` — remove.

## Como conectar (passo a passo)
1. No Supabase, garanta a tabela `integracao` (ver `supabase-schema.sql`).
2. No projeto **SBS Brasil** (Worker), aponte as MESMAS variáveis `SUPABASE_URL` e
   `SUPABASE_SERVICE_KEY` do painel e adicione a rota `/api/integracao` com este mesmo contrato.
3. Cada sistema publica seus dados com `sistema` = seu próprio nome.
4. Cada sistema lê `GET /api/integracao?de=<o outro>` para visualizar o que chegou.

## Fluxo ao criar uma feature nova (dois projetos separados)
1. Defina o `tipo` e os campos do `payload` — anote AQUI (este arquivo é a fonte da verdade;
   mantenha uma cópia nos dois repositórios).
2. No sistema que PRODUZ o dado: grave o envelope no `POST /api/integracao`.
3. No sistema que CONSOME: adicione a leitura/visualização (`GET ...?de=<origem>&tipo=<tipo>`).
4. Regras: mudanças **sempre aditivas** — nunca renomear/remover um campo já usado do
   `payload` sem migração, porque os dois fazem deploy de forma independente.
5. Suba um, suba o outro — cada um no seu tempo; o banco mantém a compatibilidade.

## Mapa da equipe ao vivo (endpoint direto, fora do barramento)
Dados de ALTA frequência (localização) NÃO usam a tabela `integracao` — empilhar posição a cada
40s incharia o banco. Em vez disso, o SBS Brasil expõe um endpoint que devolve sempre a posição
ATUAL de cada pessoa, protegido por chave.

- **SBS Brasil (Worker):** `GET /api/integ/localizacoes?key=<INTEG_KEY>`
  → `{ localizacoes:[{ supervisor_id, vendedor, papel(gerente/supervisor), estado, lat, lng, criado }] }`
  (uma linha por pessoa, sempre a mais recente; `criado` = horário da última atualização).
- **Painel SBS:** NUNCA chama o Worker do navegador (a chave não pode vazar). O front chama
  `GET /api/localizacoes` (sem chave); a Pages Function `server/localizacoes.js` (proxy) lê
  `SBS_BRASIL_URL` e `INTEG_KEY` do ambiente e repassa. Polling recomendado: 30–40s.
- **Variáveis de ambiente (as mesmas dos dois lados):** `INTEG_KEY` idêntica no Painel e no Worker.
  No Painel também `SBS_BRASIL_URL`; no Worker também `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.
- **App do vendedor → SBS Brasil:** envia posição a cada ~40s enquanto aberto (com consentimento — LGPD).
  Só há posição com o app ABERTO; app fechado = última posição conhecida (esmaecer no mapa).
