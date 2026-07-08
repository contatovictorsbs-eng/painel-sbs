# Backend SBS — Funções (Cloudflare Pages Functions)

Cada função espelha uma parte do painel. Contrato padrão: resposta
`{ ok:true, data }` ou `{ ok:false, erro }`. Base: `_lib/store.js`.
Roteador: `functions/api/[[path]].js` executa cada `server/<nome>.js` em `/api/<nome>`.

| Função | Front espelhado | Métodos |
|---|---|---|
| `vendedores.js` | Vendedores / cadastro do App | GET, POST, DELETE |
| `vendas.js` | Registrar venda (App de Eventos) | GET, POST |
| `notificacoes.js` | Central de Notificações + Avisos no app | GET, POST |
| `clima.js` | Clima & tempo | GET |
| `coletor-concorrentes.js` | Robôs de Concorrentes | agendada |
| `preco-concorrente.js` | Cotações / preços | GET |

## Rodar local
```
npm i -g wrangler
npx wrangler pages dev .    # expõe o site + /api/*
```

## Variáveis de ambiente (Cloudflare → Pages → Settings → Environment variables)
NUNCA coloque chaves em arquivos do projeto ou no navegador. Passo a passo em `backend/deploy-cloudflare.md`.

| Variável | Função | Para quê |
|---|---|---|
| `GROQ_API_KEY` | `ia-groq.js` | Assistente IA (console.groq.com/keys) |
| `GROQ_MODEL` | `ia-groq.js` | (opcional) trocar o modelo — padrão `llama-3.1-8b-instant` |
| `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | `_lib/store.js` | Banco (obrigatório — sem elas o store lança erro pedindo a configuração) |
| `AUTH_SECRET` | `_lib/auth.js` | Assina os tokens de login |
| `AV_KEY` | `preco-concorrente.js` | Cotações (Alpha Vantage) |
| `CLIMA_KEY` | `clima.js` | Previsão do tempo |
| `ERP_TOKEN` | integração ERP/CRM | Sincronizar vendas/clientes |

## Regra do projeto
Toda funcionalidade nova do front entra junto com sua função aqui + entrada em
`backend/schema.md`. Ver `CLAUDE.md`.
