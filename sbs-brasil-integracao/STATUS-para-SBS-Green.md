# Para o time/assistente do SBS Green — status da integração (encaminhar)

Olá! Passando o **status atual da integração** entre o **SBS Green** e o **Painel SBS**.

## ✅ Funcionando em produção (TEMPO REAL)
O endpoint de **indicadores da equipe de campo** está no ar e o Painel já lê os dados reais:

- Painel chama: `GET https://painel-sbs.pages.dev/api/parceiro-indicadores`
- Esse proxy busca no SBS Green: `GET <SBS_BRASIL_URL>/api/integ/v1/indicadores` (Authorization: Bearer `<INTEG_KEY>`)
- Resposta confirmada hoje: `online:true`, `versao:2`, `periodo:"acumulado"`, `atualizadoEm` presente.
- Números lidos no painel: **13 estados**, 561 clientes, 645 prospects, 3 rotas, 1 rota validada, 8 cotações.

Regra que "acende" o TEMPO REAL: o campo **`atualizadoEm`** precisa vir na resposta. Está vindo. 👍

## 🔁 Barramento compartilhado (mesmo Supabase)
Os dois sistemas trocam registros pela tabela `sbs_integracao` via `/api/integracao`:

- SBS Green → Painel: `POST /api/integracao` com `sistema:'sbs-brasil'`, `tipo`, `ref`, `titulo`, `resumo`, `payload`.
- Painel → SBS Green: já publica com `sistema:'painel-sbs'` (campanhas, decisões de cotação, etc.).
- Tipos em uso: `vendas`, `vendedores`, `clientes`, `campanhas`, `pedidos`, `produtos`, `eventos`, `solicitacoes`, `cotacoes`, `sugestao-decisao`.

Pré-requisito (deve estar igual nos dois projetos Cloudflare):
`SUPABASE_URL` e `SUPABASE_SERVICE_KEY` **idênticas** + tabela `sbs_integracao` criada.

## 📍 Localização da equipe (mapa ao vivo do CEO)
Painel consome: `GET /api/localizacoes` → proxy para `GET <SBS_BRASIL_URL>/api/integ/localizacoes` (mesma `INTEG_KEY`).
Formato esperado por ponto: `{ id, nome, papel, uf, lat, lng, criadoEm }`.
> Se ainda não expõem esse endpoint, o mapa do CEO fica sem pontos (não quebra). Confirmem se já está publicado.

## 🔒 Segurança
- `INTEG_KEY` e `SUPABASE_SERVICE_KEY` só em variáveis de ambiente (nunca no navegador/repo).
- Se qualquer uma dessas chaves já esteve em commit no histórico do Git, favor **rotacionar**.

## ❓ Confirmações que preciso de vocês
1. `/api/integ/localizacoes` já está no ar? (para ligar o mapa do CEO)
2. O `periodo` dos indicadores pode vir também como `"safra_atual"` quando quiserem — o painel já mostra o rótulo certo.
3. Alguma outra fonte que queiram expor além de indicadores/localizações?

Obrigado! Contrato completo de campos e regras: `backend/contrato-integracao.md` (Painel SBS).
