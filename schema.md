# SBS Green Seeds — Modelo de dados (backend)

Fonte da verdade das coleções usadas pelas funções de servidor (`server/*.js`,
roteadas em `/api/*` por `functions/api/[[path]].js`). Cada coleção é gravada via
`server/_lib/store.js` (Supabase/Postgres — banco único da stack).

## Coleções

### vendedores
Cadastro da força de campo (400+). Alimenta App de Eventos e painéis de gestão.
| campo | tipo | notas |
|---|---|---|
| id | string | `vd<timestamp>` |
| nome | string | |
| cpf | string | pessoal — LGPD |
| telefone | string | |
| email | string | |
| regiao | string | MT, MS, GO… |
| parceira | string \| null | app co-branded (Coopercitrus…) ou null=SBS |
| origem | string | app onde se cadastrou (ex: "Coopercitrus · App de Eventos" ou "App SBS Eventos") |
| usuario | string | login do app |
| cidade / uf | string | |
| gerente | string | gerente regional |
| logou | bool | já fez login no app? |
| ultimoLogin | ISO date \| null | |
| precisaRedefinir | bool | gestor solicitou troca de senha |
| status | enum | ativo, pendente, inativo |
| criadoEm | ISO date | |

### vendas
Registrada no App de Eventos (grava de volta na base).
| campo | tipo | notas |
|---|---|---|
| id | string | `vn<timestamp>` |
| vendedorId | string | → vendedores.id |
| eventoId | string | → eventos.id |
| parceira | string \| null | |
| cnpjCliente | string | pessoal — LGPD |
| produto | string | |
| quantidade | number | |
| valor | number | R$ |
| ts | number | epoch ms |

### eventos (agenda compartilhada)
Um só calendário para todos os perfis internos (Marketing, Gerência, Vendas,
Inteligência). Qualquer um cria; todos veem. `acaoEvento:'aprovacao'` marca o
evento e ele entra na esteira de aprovação (vira projeto). Isolado por `tenant`.
| id, nome, cidade, uf, data, mes, dia, segmento, objetivo, status, custo, receita, leads, participantes, equipe, app(App SBS ou parceira), appStatus, criadoPor(perfil), criadoPorNome, aprovacao(bool), aprovacao

**appStatus** — situação do app do evento no fluxo de trabalho (desacopla evento × app × campanha; nada trava):
`nao_consta` (sem app definido) · `a_criar` (haverá app, ainda não construído) · `em_criacao` (app do parceiro em configuração) · `publicado` (app disponível, vendedores já veem). Vazio/ausente = inferido: SBS padrão → `publicado`; parceira sem cadastro → `em_criacao`. PATCH `{id, appStatus}` avança o estado e grava auditoria `app_estado:<key>`. Atalho "Criar app agora" (eventos em nao_consta/a_criar) abre o cadastro de app de parceiro já vinculado; ao criar → `em_criacao`, ao provisionar o tenant → `publicado`.Status, aprovacaoFase, tenant, criadoEm |

### eventos-legado
| id, nome, cidade, uf, data, status(Confirmado/Planejado/Realizado), parceira |

### notificacoes
Central de mensagens → vendedores.
| id, titulo, texto, tipo(aviso/campanha/urgente), destino(all/regiao/evento/vendedor), destinoValor, ts, lidoPor[] |
Além dos comunicados manuais, `orcamentos.js` grava aqui uma notificação `destino:'vendedor'`
(destinoValor = nome do vendedor) sempre que um desconto é liberado/recusado — chega na aba Avisos do app.

### demandas
Quadro (kanban) compartilhado entre Marketing, Gerência Nacional, Inteligência e CEO.
Função **`demandas.js`**: `GET /api/demandas?destino=&status=` · `POST /api/demandas` (criar)
· `POST /api/demandas?acao=status {id,status}` (mover) · `POST /api/demandas?acao=excluir {id}` (remover).
Menções `@Marketing/@CEO/@Inteligência/@Gerente Nacional` no campo `envolvidos` são
extraídas para `mencoes[]` e geram um registro em **alertas** (tipo `mencao`) para a área marcada.
**Subdemandas:** `paiId` (opcional) aponta para o `id` da demanda-pai — uma demanda-pai
(ex.: um estudo) desdobra em subdemandas, cada uma um card normal do quadro. Tanto a pai
quanto cada subdemanda podem virar um **evento** ou um **dia de campo** (abre o cadastro de
evento com `segmento` pré-preenchido "Evento" ou "Dia de campo").
| id, tipo, destino, solic, origem, regiao, area, prio(Alta/Média/Baixa), status(Solicitado→Em análise→Em desenvolvimento→Aguardando aprovação→Finalizado), resp, prazo, desc, paiId(opcional), envolvidos[], mencoes[], eventoId, convertidoEvento, ts |

Uma demanda pode **virar evento** (botão "Virar evento" no modal de edição): abre a criação
de evento pré-preenchida; ao criar, a demanda é marcada `status:Finalizado` com `eventoId` e
`convertidoEvento` (nome), e o evento segue o fluxo normal da agenda (aprovação/app).

### mi_cotacoes / mi_concorrentes / mi_cc_movimentos / mi_regioes / mi_tendencias
Inteligência de Mercado. Lidas/gravadas pela função **`mercado.js`**:
`GET /api/mercado?tipo=cotacoes|concorrentes|regioes|tendencias|movimentos` (sem
`tipo` retorna todas agrupadas) · `POST /api/mercado {tipo, ...item}`.
Formatos (o que as telas leem):
- cotacoes: `{produto, praca, preco, anterior, un, fonte, auto}`
- concorrentes: `{nome, seg, regiao, posicao, forca, fraqueza, monitorar, mov[]}`
- regioes: `{regiao, cultura, uf, potencial, participacao, tendencia, obs}`
- tendencias: `{titulo, categoria, impacto(alto/médio/baixo), horizonte, data, desc}`

### aprovacoes
Fluxo de estudo colaborativo por setor.
| id, eventoId, faseAtual(marketing/gerente/inteligencia/ceo), estudoMkt, estudoGerente, estudoIntel, decisaoCeo |

### canais
Fontes & canais de monitoramento (Inteligência de Mercado). Guarda tanto a EDIÇÃO do @/endereço de um canal padrão (Instagram, Facebook, LinkedIn, YouTube, GMN…) quanto CANAIS custom adicionados pelo usuário.
| id, tipo(handle/canal), grupo(redes/gmb/sites/recomendados), nome, sub(@ ou URL), desc, atualizadoEm, atualizadoPor |

### integracao
Barramento compartilhado entre Painel SBS e SBS Brasil (mesmo Supabase). Envelope genérico com payload JSON livre — ver `backend/contrato-integracao.md`.
| id, sistema('painel-sbs'/'sbs-brasil'), tipo(vendas/vendedores/clientes/campanhas/pedidos/produtos/eventos/…), ref, titulo, resumo, payload(json), criadoEm, criadoPor, tenant |

### parceiro-indicadores (proxy — não grava)
Indicadores do **Painel do Vendedor (SBS Brasil)** exibidos dentro de *Resultados das ações*
(Gerente Nacional + Inteligência) — carteira e **prospecção** da equipe de campo. NÃO é coleção:
`parceiro-indicadores.js` é um PROXY que lê `SBS_BRASIL_URL` e `INTEG_KEY` do ambiente e busca
`GET <SBS_BRASIL_URL>/api/integ/v1/indicadores` **autenticando por `Authorization: Bearer <INTEG_KEY>`**
(mantendo `x-integ-key` e `?key=` como compat v1), com **timeout de 5s**. Sem config → `configurado:false` e o
front cai no fallback de demonstração; erro/timeout → `online:false` (DEMONSTRAÇÃO). Roteado inline em `functions/api/[[path]].js` (como `localizacoes`).
Contrato v2 devolve também `versao`, `periodo` (janela do dado, ex.: `"acumulado"`) e `atualizadoEm` (ISO). Regra do handoff: **selo "TEMPO REAL" só quando vem `atualizadoEm`**; `agendadas:0` é valor legítimo (visitas de campo registradas), não bug. A chave nunca chega ao navegador.
| saída: { configurado, online, versao, periodo, atualizadoEm, indicadores:{ estados, clientes, prospects, rotas, agendadas, validadas, cotacoes, vendasRS } } |

### localizacoes (proxy — não grava)
Mapa da equipe ao vivo do CEO. NÃO é uma coleção: `server/localizacoes.js` é um PROXY que lê `SBS_BRASIL_URL` e `INTEG_KEY` do ambiente e busca as posições atuais no Worker do SBS Brasil (`GET /api/integ/localizacoes?key=`). Devolve `{ok, data:{configurado, localizacoes:[{supervisor_id, vendedor, papel(gerente/supervisor), estado, lat, lng, criado}]}}`. Front chama `GET /api/localizacoes` (polling 35s). Sem as variáveis → `configurado:false` (modo demonstração).

### leads
Esteira/pipeline. Liga o App do Vendedor aos painéis (Marketing/Gerente). Cada
mudança de status grava no histórico; perda registra motivo + SWOT.
| id, nome(pessoal-LGPD), prop, ha, fone(LGPD), produto, potencial(Quente/Morno/Frio), status(Novo/Contatado/Qualificado/Proposta/Ganho/Perdido), vendedor, evento, motivoPerda, swot{forca,fraqueza,oportunidade,ameaca}, hist[{status,quando}] |

### parceiros
Apps de eventos co-branded (white-label) — SBS × parceira. Espelha "Apps de parceiros".
Função **`parceiros.js`**: `GET /api/parceiros` · `POST /api/parceiros {nome,cor,logo,evento,local,produtos[],campanhaId,campanha}`
· `PATCH /api/parceiros {id,campanhaId,campanha}` (anexar/atualizar a campanha) · `DELETE /api/parceiros?id=`.
**Regra:** todo app de evento opera dentro de uma campanha (produtos, materiais e metas).
Na criação a campanha é obrigatória; um app sem campanha exibe "Anexar campanha" no card.
| id, nome, sigla, cor, logo, evento, local, produtos[], campanhaId, campanha, status(Rascunho/Ativo), vendedores, criadoEm |

### monitoramentos
Robôs de coleta com FONTES referenciadas (link/@ exato) — origem de cada achado
rastreável e fonte removível.
| id, alvo, freq(1h/6h/Diário/Semanal), fontes[{tipo,ref}], status(Ativo/Pausado), achados, ultimo{texto,fonte,ref} |

### orcamentos
Pedido de desconto/bonificação atrelado a um lead; alçada do gerente regional.
| id, leadId, produto, qtd, precoTabela, descontoSolic(%), descontoAprov(%\|null), bonifSolic, bonifAprov, justificativa, status(Solicitado/Aprovado/Ajustado/Recusado), notaGerente, regiao, vendedor |

### ranking (derivado de vendas + campanhas + vendedores)
Colocação dos vendedores de um app parceiro numa campanha. Não é coleção própria:
a função `ranking.js` soma o faturamento das `vendas` por vendedor no recorte
(parceira/evento), ordena e calcula gap para o 1º lugar e corte de cada prêmio.
| entrada: parceira, eventoId, campanhaId, me(vendedorId) → saída: sellers[{vendedorId,nome,fat,pedidos,pos}], me, need1, pctToFirst, tiers[{pos,premio,corte,falta}] |

### resultados (derivado de demandas + eventos + campanhas + vendas)
Acompanhamento das ações no painel de **Gerente Nacional** e **Inteligência de Mercado**.
Não é coleção própria: `resultados.js` (`GET /api/resultados[?area=]`) faz o JOIN — cada
`demanda` é uma ação; quando ela tem `eventoId` (virou evento), busca o `evento`
e o **REALIZADO** vem da soma de `vendas.valor` por `eventoId` (App de Eventos → base);
se não houver vendas, cai em `evento.receita`/`campanha.fat`. O **ESPERADO** vem da
`meta` da campanha vinculada (ou `metaReceita` do estudo de aprovação). ROI = obtido/custo.
| saída: itens[{id, nome, area, origem, resp, prazo, regiao, status(Solicitado/…/Ativa/Em aprovação/Concluída), tipo(Evento/Demanda), esperado(meta R$), obtido(realizado R$), roi, conv, eventoId, convertido}], kpis{total, andamento, concluidas, receita, meta, roiMedio} |
O front prefere o endpoint e cai na agregação local (mesma forma) em modo demonstração.

### produtos
Catálogo único da SBS. Base para a tabela de preço de cada campanha e para o app.Ficha técnica (specs) e materiais de apoio ficam acessíveis ao vendedor no app quando
o produto está na campanha ativa.
| id, nome, cultura, saco(tamanho do saco), preco(tabela R$), foto(dataURL\|null), specs(texto ficha técnica), materiais[{tipo(Vídeo/PDF/Excel/Texto/Foto/Link), titulo, url, nome}], criadoEm |

### campanhas
Campanha comercial. Meta é POR CAMPANHA (aparece a todos os vendedores). Inclui
premiação por colocação e a tabela de produtos com preço específico da campanha.
Toda campanha é **direcionada** (`destino`): ou a um **evento de parceira** (`destino:'evento'`,
com `evento`/`app` — vendedores daquele evento) ou à **força de vendas comercial** do SBS Brasil
(`destino:'comercial'`, com `publico` = todos|regionais|supervisores — sincroniza via `integracao`).
| id, nome, gtn, inicio(date), fim(date), meta(R$), canal, status(Ativa/Encerrada), destino('evento'/'comercial'), evento, app, publico('todos'/'regionais'/'supervisores'\|null), premios[{pos,premio,bonus}], produtos[{produtoId,preco}] |

### governanca (TI)
Controle da área de Tecnologia sobre os painéis (persistido no cliente e/ou coleção).
| panelOffline{marketing,gerente,ceo,mercado:boolean}, hiddenMods{role:[pageKeys]} |

### aprovacoes_hist
Histórico do fluxo de aprovação (quem fez o quê, quando) + anexos por projeto.
| id, projeto, quem, acao, quando, anexos[{nome,tipo(foto/PDF/arquivo),tam}] |

### dossies
Dossiê completo arquivado quando o CEO aprova/reprova — snapshot para consulta futura.
Gerado por `aprovacoes.js` (POST `{tipo:'dossie',dossie}`) e listável via GET `?tipo=dossies`.
| id, projId, proj, tipo, local, decisao(Aprovado/Reprovado), decididoPor, decididoEm, analises{marketing{orcamento,escopo}, gerente{metaReceita,pedidos}, inteligencia{roiPrev,prob,parecer,classe}}, roiConsolidado, anexos[{nome,tipo,tam}], timeline[], arquivadoEm, arquivadoPor |

### auditoria (LGPD)
Trilha de acessos e alterações. Nunca guarda a payload de dados pessoais — só
metadados de quem fez o quê. Leitura restrita a admin/TI.
| id, usuario(email), perfil, acao(login/login_falha/criou/editou/excluiu/acessou), entidade, entidadeId, ip, ts |

### usuarios (auth)
Fonte dos perfis de acesso e das senhas (por usuário, trocáveis). Semeada de
USERS_JSON (env) ou da equipe SBS padrão no 1º login. Senha nunca em texto.
Usuário de parceira leva `tenant:<slug>` (isola os dados dela).
| campo | tipo | notas |
|---|---|---|
| id / email | string | e-mail em minúsculas (chave) |
| perfil | enum | marketing/gerente/ceo/mercado/ti/admin |
| nome | string | |
| hash | string | sha256(senha + AUTH_SECRET) |
| precisaTrocar | boolean | true = força definir senha no 1º login |
| reset | obj \| null | `{cod:hash, exp:epoch}` código de redefinição (30 min) |
| senhaAlteradaEm | ISO date | última troca |
| tenant | string | `sbs` (interno) ou slug da parceira |

Rotas: `POST /auth {email,senha}` → token + precisaTrocar. `POST /senha`:
`{acao:'trocar',senhaAtual,novaSenha}` (autenticado), `{acao:'solicitar',email}`
(gera código), `{acao:'redefinir',email,codigo,novaSenha}`. Sem bloqueio por
tentativas — recuperação é via "esqueci a senha".

### tenants (multi-parceiro)
Cadastro das parceiras (white-label). Provisionar uma parceira = criar 1 registro
aqui — sem deploy. Excluir = soft delete (status Inativo). Ver `arquitetura-multitenant.md`.
| id(slug), slug, nome, cor, paleta[], logo, produtos[], politica, status(Ativo/Inativo), criadoEm, atualizadoEm |

> **Multi-tenant:** todas as coleções operacionais (vendedores, vendas, leads,
> orçamentos…) carregam um campo **`tenant`** (slug da parceira; `sbs` = super-tenant).
> O `tenant` vem sempre do token — nunca do corpo do request. O `store.js` filtra e
> carimba por tenant automaticamente via `tenantStore(tenant)`.

## Convenção de API
Todas as funções: `/api/<nome>`
- `GET` → lista/consulta (querystring para filtro)
- `POST` → cria/atualiza (JSON no corpo)
- Resposta: `{ ok:true, data:… }` ou `{ ok:false, erro:"…" }`
- Segredos por `process.env` (AV_KEY, AI_KEY, ERP_TOKEN…).

## Autenticação & LGPD
- Login server-side em `/api/auth` → token HMAC (12h) no header `Authorization: Bearer`.
- Guard `requireAuth(event, [perfis])` protege rotas sensíveis (ex.: `auditoria` só admin/TI).
- Toda escrita (vendedores, vendas, leads, orçamentos) grava um registro em `auditoria`.
- Dados pessoais (nome, telefone, CNPJ, CPF) marcados como LGPD no schema; acesso por perfil + trilha de auditoria.
