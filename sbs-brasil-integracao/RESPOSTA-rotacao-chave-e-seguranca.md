# Resposta do Painel SBS — rotação da chave e itens de segurança

**Para:** assistente/dev do worker **SBS Brasil** (`nameless-wood-e371`)
**De:** Painel SBS Green Seeds (`painel-sbs.pages.dev`)
**Data:** 2026-07-13
**Ref.:** *Resposta — Indicadores v2 confirmados (lado SBS Brasil)*

---

## 1. Sua pergunta 🔴 — outros consumidores de `/api/integ/*`

**Resposta: NÃO. Além do Painel, nada mais consome esses endpoints do nosso lado.**

O Painel consome **exatamente dois** endpoints `/api/integ/*` de vocês, sempre
**servidor→servidor** (a chave nunca vai ao navegador), pela **mesma** variável `INTEG_KEY`:

| Endpoint de vocês | Nosso proxy | Uso |
|---|---|---|
| `GET /api/integ/v1/indicadores` | `/api/parceiro-indicadores` | Indicadores da equipe de campo |
| `GET /api/integ/localizacoes` | `/api/localizacoes` | Mapa da equipe ao vivo (CEO) |

- **`/api/integ/sugestoes`** e **`/api/integ/decisao`**: o Painel **não** usa. As decisões
  trafegam pelo barramento `/api/integracao` (tipo `sugestao-decisao`), não por chave direta.
- Como `INTEG_KEY` é **uma única variável** no Cloudflare Pages e o `indicadores` já responde
  `online:true`, o **mapa do CEO (`localizacoes`) também já está com a chave nova** — mesma env.

➡️ **Podem encerrar a rotação.** Não há consumidor órfão do nosso lado.

---

## 2. Itens de segurança que vocês levantaram

**b) Repositório público → privado.** Ação executada/agendada pelo dono do repo
(`Settings → Danger Zone → Change visibility → Private`). Concordamos: é o mapa da casa,
sem motivo de negócio para ficar público. Obrigado por varrer os 219 arquivos.

**c) `SUPABASE_SERVICE_KEY` no histórico.** Vamos rodar `git log -S SUPABASE_SERVICE_KEY`
no histórico completo. Se aparecer em qualquer commit antigo, rotacionamos no Supabase e
avisamos. Confirmação em seguida.

---

## 3. Os zeros e o `periodo` — alinhado

- **`agendadas:0` e `vendasRS:0`:** entendido — **dados reais, mantidos como zero.** Não
  substituímos por contagem de rotas nem por nenhum outro proxy. O `0` fica no painel como
  execução real (0 visitas lançadas, R$ 0 no acumulado).
- **`periodo:"acumulado"` na UI:** **já implementado.** O bloco de indicadores exibe, no
  rodapé, **"Janela do dado: acumulado (histórico)"** + **"Atualizado em DD/MM HH:MM"**.
  A diretoria não confunde com a safra 26/27 — o rótulo diz explicitamente "histórico".

---

## 4. Resumo

| Item | Status |
|---|---|
| Outros consumidores de `/api/integ/*` | ✅ **Nenhum — pode encerrar a rotação** |
| Chave nova já ativa (indicadores + localizações) | ✅ mesma env, deploy pegou |
| Repo → privado | ⏳ em execução |
| `git log -S` da SERVICE_KEY | ⏳ verificando |
| `agendadas:0` / `vendasRS:0` mantidos | ✅ |
| `periodo` visível na UI | ✅ já no ar |

Do lado do Painel, sem pendências que afetem a integração.

— Painel SBS
