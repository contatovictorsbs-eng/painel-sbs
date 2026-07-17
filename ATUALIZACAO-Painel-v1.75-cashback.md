# Para o time/assistente do SBS Green — atualização do Painel SBS (encaminhar)

Olá! Passando o **status atual do Painel SBS** e um ponto novo para avaliarmos juntos.
Data: 2026-07-17 · Versão do Painel: **1.75.0**.

## ✅ Nada mudou no contrato de integração
As novidades desta rodada são **internas do Painel** (não tocam nos endpoints
compartilhados). Continuam valendo, sem alteração:

- `GET /api/parceiro-indicadores` → proxy para `GET <SBS_BRASIL_URL>/api/integ/v1/indicadores` (Bearer `INTEG_KEY`). O campo `atualizadoEm` segue sendo o gatilho de TEMPO REAL.
- `GET /api/localizacoes` → proxy para `GET <SBS_BRASIL_URL>/api/integ/localizacoes` (mapa do CEO).
- Barramento `sbs_integracao` via `/api/integracao` (mesmos `tipo`s de sempre).

**Não é preciso mudar nada do lado de vocês por causa das novidades abaixo.**

## 🆕 O que entrou no Painel (contexto)
1. **Ação de cashback** — ao criar uma campanha (evento de parceiro OU força de campo),
   o Marketing/Gerente define um **% de cashback**. O cliente compra no evento com um
   cupom do pedido e se cadastra no **estande da SBS** para receber o valor como desconto
   na **próxima safra**.
2. **Totem de cadastro** — tela cheia (24") aberta por um **link público** do Painel
   (`…/#totem` ou `…/#totem-<idDaCampanha>`), sem login, onde o **produtor** se cadastra
   (nome, produto comprado, telefone, endereço). Gera **leads de prospecção**.
3. **Leads captados** — lista no módulo Cashback com **exportação CSV**.
4. Tudo isso vive na coleção própria `cashback` (backend do Painel). **Não usa** o
   barramento compartilhado.

## ❓ Decisão que vale a pena alinharmos
Os **leads do totem** (produtores que ainda não são clientes) são exatamente matéria-prima
de **prospecção** — que é o forte do app de vocês (SBS Green / campo).

Faz sentido esses leads **alimentarem a base de prospecção de vocês**? Se sim, proponho o
caminho mais simples, sem novo endpoint:

- Painel publica cada lead no barramento existente:
  `POST /api/integracao` com `sistema:'painel-sbs'`, **`tipo:'lead-prospeccao'`**,
  `ref:<id>`, `titulo:<nome do produtor>`, `payload:{ produtor, produtoComprado, telefone,
  endereco, cidade, uf, campanha, evento, safra }`.
- Vocês consomem esse `tipo` e jogam na lista de prospecção por estado.

**Perguntas:**
1. Querem receber os leads do totem? Se sim, o `tipo:'lead-prospeccao'` no barramento serve?
2. Algum campo a mais que precisem (ex.: cultura, área, coordenadas)?
3. Preferem por push (nós publicamos) ou pull (vocês leem `/api/integracao?tipo=lead-prospeccao`)?

## 🔒 Segurança / infra (lembrete)
- `INTEG_KEY` e `SUPABASE_SERVICE_KEY` apenas em variáveis de ambiente.
- Vamos operar com **2 ambientes**: produção (`main`) e homologação (`homologacao`, banco
  Supabase separado). Isso **não** afeta a integração — só isola dados de teste.

Obrigado! Qualquer campo do contrato completo está em `backend/contrato-integracao.md` (Painel SBS).
