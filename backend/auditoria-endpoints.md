# Auditoria de serviços — endpoints, quem busca / quem manda, validação e destino

Análise de todos os serviços de envio e retorno do sistema. Base: `sbs_*` no Supabase
(mesmo banco compartilhado com o app SBS Brasil). Todas as rotas passam pelo roteador
`functions/api/[[path]].js` → `/api/<nome>`. O front chama por `apiGet` (GET) e `apiSend`
(POST/PATCH/DELETE) com token no header; qualquer resposta real marca `backend='online'`
e desliga o modo demonstração.

Legenda de "Destino do retorno": onde a resposta é exibida/consumida.

## 1. Autenticação e sessão
| Rota | Métodos | Quem chama | Validação | Coleção | Destino do retorno |
|---|---|---|---|---|---|
| `/api/auth` | GET (sessão), POST (login) | Login e checagem de sessão | e-mail+senha; emite token HMAC; RLS por perfil/tenant | `usuarios` | Tela de login → estado `auth` (perfil, nome, tenant) |
| `/api/senha` | POST | Redefinição de senha | token/fluxo de troca; envia e-mail (Resend) | `usuarios` | Toast + e-mail ao usuário |
| `/api/app-login` | POST | App do vendedor (parceiro) | valida vendedor/tenant | `vendedores` | Sessão do app (token) |

## 2. Comercial (alimenta dashboards Marketing/Gerente/CEO)
| Rota | Métodos | Quem busca | Quem manda | Coleção | Destino |
|---|---|---|---|---|---|
| `/api/leads` | GET/POST/PATCH | Esteira de leads, dashboards | App do vendedor (captura) e painel (status/perda+SWOT) | `leads` | Esteira, KPIs de conversão, análise de perda |
| `/api/orcamentos` | GET/POST/PATCH | Gerente (aprovação de desconto) | Vendedor (solicita), Gerente (libera) | `orcamentos` | Fila de aprovação + notificação ao vendedor |
| `/api/vendas` | GET/POST | Dashboards (receita) | App do evento (venda) | `vendas` | Receita real do CEO, ranking, ticket médio |
| `/api/produtos` | GET/POST/PATCH/DELETE | Catálogo, campanhas | Gerente (cadastra preço/saco) | `produtos` | Catálogo & preços; tabela da campanha no app |
| `/api/campanhas` | GET/POST/PATCH | Todos os painéis | Gerente (cria/edita/encerra) | `campanhas` | Lista de campanhas, ROI, vínculo com app/evento |
| `/api/vendedores` | GET/POST/PATCH/DELETE | Marketing/Gerente/Inteligência | App (novo cadastro), painel (edita) | `vendedores` | Módulo Vendedores + notificação de novo cadastro |
| `/api/ranking` | GET | Dashboards | — (derivado de vendas) | (agregação) | Ranking por vendedor/estado/região |

## 3. Marketing / Eventos
| Rota | Métodos | Quem busca | Quem manda | Coleção | Destino |
|---|---|---|---|---|---|
| `/api/eventos` | GET/POST/PATCH/DELETE | Todos os painéis (agenda) | Marketing/Gerente/Inteligência | `eventos` | Agenda (todos os perfis), pop-up do evento, esteira de aprovação |
| `/api/demandas` | GET/POST | Quadro de demandas | Qualquer painel (cria/edita) | `demandas` | Quadro Kanban de demandas; vira evento |
| `/api/aprovacoes` | GET/POST/PATCH | Esteira de aprovação, CEO (dossiês) | Cada área (parecer), CEO (decisão) | `aprovacoes`, `dossies` | Tela de aprovações + arquivo de dossiês do CEO |
| `/api/biblioteca` | GET/POST/DELETE | Painel + **app dos vendedores** | Marketing/Gerente (publica) | `biblioteca` (+ Storage) | Arquivos & mídia; baixar/WhatsApp no app |
| `/api/storage` | POST | — | Upload de material | Supabase Storage (bucket `materiais`) | Devolve URL pública usada na biblioteca |

## 4. Inteligência de Mercado
| Rota | Métodos | Quem busca | Quem manda | Coleção | Destino |
|---|---|---|---|---|---|
| `/api/mercado` | GET/POST | Módulos de MI (cotações, concorrentes, regiões, tendências) | Inteligência (cadastra) | `mi_cotacoes`, `mi_concorrentes`, `mi_regioes`, `mi_tendencias` | Painéis de MI; cotações e panorama |
| `/api/monitoramento` | GET/POST/PATCH/DELETE | Aba Concorrentes | Inteligência (cria robô) | `monitoramentos` | Lista de robôs + achados |
| `/api/ia-groq` | POST | Assistente IA | Usuário (pergunta) | — (usa dados reais no prompt) | Resposta do assistente; gera demanda/evento/estudo |
| `/api/clima` | GET | Rodapé de clima por praça | — (Open-Meteo/INMET) | — | Previsão por coordenada |

## 5. Notificações e alertas
| Rota | Métodos | Quem busca | Quem manda | Coleção | Destino |
|---|---|---|---|---|---|
| `/api/notificacoes` | GET/POST | Sino (todos os perfis) | Painel (envia p/ vendedores), sistema | `notificacoes` | Central de notificações + sino; quem visualizou |
| `/api/alertas` | GET/POST | Inteligência/CEO | Sistema/robôs | `alertas` | Alertas de mercado |

## 6. Parceiros e apps co-branded
| Rota | Métodos | Quem busca | Quem manda | Coleção | Destino |
|---|---|---|---|---|---|
| `/api/tenants` | GET (público por slug / lista admin), POST, DELETE | App (identidade), governança | Admin/TI (provisiona) | `tenants` | App co-branded; lista de apps |
| `/api/parceiros` | GET/POST/PATCH/DELETE | Compartilhar app | Marketing (cria parceiro) | `parceiros` | Cards de apps de parceiros + vínculo de campanha |

## 7. Integração SBS Brasil ↔ Painel (barramento)
| Rota | Métodos | Quem busca | Quem manda | Coleção | Destino |
|---|---|---|---|---|---|
| `/api/integracao` | GET/POST/DELETE | Painel (lê `de=sbs-brasil`), app SBS Brasil (lê `de=painel-sbs`) | Ambos os sistemas | `integracao` | Módulo Integração + módulo Solicitações |
| `/api/localizacoes` | GET (proxy → Worker SBS Brasil) | Mapa da equipe (CEO) | — | (via Worker) | Mapa ao vivo do CEO |

### Fila de respostas do fluxo de Solicitações (o foco do teste)
1. **Vendedor/Supervisor/Gerente regional** cria solicitação **no app SBS Brasil**
   → app publica no barramento: `sistema:"sbs-brasil"`, `tipo:"solicitacoes"`.
2. **Painel** lê `GET /api/integracao?de=sbs-brasil&tipo=solicitacoes` (no load e a cada 30s
   enquanto o módulo Solicitações está aberto) → cai na **fila do Marketing** (porteiro).
3. **Marketing decide** → painel publica `sistema:"painel-sbs"`, `tipo:"sugestao-decisao"`,
   `payload.area="marketing"`. Só depois de aprovado o Marketing, Nacional/Inteligência/CEO decidem.
4. **App SBS Brasil** lê essas decisões, recalcula o status e **notifica o solicitante**.

> Regra de status (idêntica nos dois lados): marketing reprovada → reprovada; marketing ≠ aprovada
> → aguardando_marketing; qualquer de {nacional,inteligencia,ceo} reprovada → reprovada;
> todas aprovadas → aprovada; senão → em_aprovação.

## 8. Validações e segurança transversais
- **Token** em todas as chamadas (header Authorization). Rotas de governança (`tenants` lista)
  exigem perfil admin/ti/ceo.
- **RLS ligado** em todas as tabelas `sbs_*`; sem políticas públicas → só as Functions (service key) acessam.
- **LGPD:** dados pessoais (CNPJ, contato) nunca vão ao modelo de IA; auditoria registra ações.
- **Fallback:** se o backend não responde, o front entra em modo demonstração (dados de exemplo),
  sem quebrar. Ao voltar, `backend='online'` e os dados reais assumem.

## 9. Como validar em produção (endpoint por endpoint)
Abra **`https://painel-sbs.pages.dev/tools/api-selftest.html`** logado (mesma aba do painel):
faz GET em todas as rotas e um **ida-e-volta** (grava e apaga) em `produtos` e `integracao`,
mostrando status HTTP, se veio array/objeto, contagem e se **gravou no banco**. Verde = ok.
401 em rota protegida = sessão expirada (relogar).

## 10. Achados desta auditoria
- ✅ Contrato íntegro: toda chamada do front tem rota+método correspondentes no backend.
- ✅ Solicitações do app: leitura correta (`de=sbs-brasil&tipo=solicitacoes`) + auto-refresh 30s.
- 🔧 Corrigido: a fila de Solicitações não mostra mais **cards de exemplo** quando online e vazia
  (antes o fallback demo aparecia mesmo em produção, dando impressão de "não chegou").
- ⚠️ Pré-requisito para o fluxo funcionar em produção: o **Worker SBS Brasil** precisa ter
  `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` **iguais** às do Painel (senão o app não publica no barramento).
- ⚠️ Testar sempre em **produção** (`painel-sbs.pages.dev`), não no arquivo baixado localmente
  (o arquivo local não tem backend → sempre modo demonstração).
