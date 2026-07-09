# Resposta do Painel SBS ao SBS Brasil — lado do Painel CONCLUÍDO

Recebemos o handoff de vocês. O lado do **Painel SBS** da integração de **Solicitações** está **implementado e testado** (v1.51.0).

## 1. Confirmações que vocês pediram

- **`tipo` da decisão:** ✅ **confirmado `sugestao-decisao`** — exatamente como vocês propuseram. Não precisa mudar nada.
- **Barramento:** usamos a mesma tabela `sbs_integracao` no mesmo Supabase, via nossa rota `/api/integracao` (GET/POST/DELETE) — já no ar.
- **Regra de status:** implementada **idêntica** à de vocês (seção 4.1):
  - `marketing = reprovada` → **reprovada**
  - `marketing ≠ aprovada` → **aguardando_marketing**
  - alguma de {nacional, inteligencia, ceo} = `reprovada` → **reprovada**
  - todas as 4 = `aprovada` → **aprovada**
  - senão → **em_aprovacao**
- **Marketing como porteiro:** ✅ as áreas Nacional/Inteligência/CEO ficam **bloqueadas** no Painel até o Marketing aprovar.

## 2. O que o Painel já faz

1. **Lê** as solicitações: `GET /api/integracao?de=sbs-brasil&tipo=solicitacoes`.
2. **Mostra** um módulo "Solicitações SBS Brasil" (perfis Marketing, Gerência=Nacional, Inteligência, CEO) com: título, categoria, solicitante+papel, estado, item, quantidade, custo, orçamento, público, data do evento, justificativa e o status atual.
3. **Mapa de área → perfil no Painel:**
   - `marketing` → perfil **Marketing**
   - `nacional` → perfil **Gerente Nacional**
   - `inteligencia` → perfil **Inteligência de Mercado**
   - `ceo` → perfil **CEO**
4. **Devolve a decisão** de cada área publicando o envelope:
```json
{
  "sistema": "painel-sbs",
  "tipo": "sugestao-decisao",
  "ref": "<sugestaoId>",
  "titulo": "Decisão Marketing — Banner Dia de Campo",
  "resumo": "aprovada",
  "payload": { "sugestaoId": "<id>", "area": "marketing", "decisao": "aprovada", "parecer": "texto opcional" }
}
```
5. Mostra os **4 pareceres** por solicitação (com o parecer textual de cada área) e recalcula o status na tela.

## 3. Uma pergunta nossa (para o status convergir 100%)

O parecer do **Nacional** feito **dentro do app SBS Brasil** (papel Master) — como ele chega ao Painel para aparecermos "Nacional: aprovada/reprovada"? Duas opções, tanto faz para nós:
- (a) vocês **republicam** a solicitação (`tipo:solicitacoes`) com os campos de parecer no `payload` (ex.: `payload.nacional: "aprovada"`); **ou**
- (b) vocês publicam a decisão do Nacional **também** como `tipo:"sugestao-decisao"` (`sistema:"sbs-brasil"`, `area:"nacional"`).

Já suportamos as **duas**: lemos pareceres embutidos no `payload` **e** envelopes `sugestao-decisao`. Só nos digam qual vão usar para alinharmos os testes.

## 4. Teste de ida-e-volta (quando quiserem)

1. Vocês criam uma solicitação de teste no app → confirmamos que aparece no Painel.
2. Aprovamos como Marketing no Painel → vocês confirmam que o status muda e o solicitante é notificado.
3. Repetimos com Nacional/Inteligência/CEO até `aprovada`.

## 5. Pendência compartilhada

As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` precisam ser **as mesmas** nos dois projetos Cloudflare (Worker do SBS Brasil e Pages do Painel). Do nosso lado já estão configuradas.

Qualquer mudança de `payload` é aditiva e combinada — nunca renomear/remover campo em uso.
