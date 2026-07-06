/* ===========================================================
   SBS Green Seeds — MANIFESTO DA PLATAFORMA
   FONTE ÚNICA DA VERDADE da arquitetura e documentação.

   REGRA DO PROJETO: toda vez que mudar/adicionar uma funcionalidade,
   atualize ESTE arquivo (módulo + função + coleção + changelog).
   A página "Arquitetura SBS.dc.html" e os guias leem daqui — então
   a documentação se atualiza sozinha a partir deste ponto único.
   =========================================================== */
window.SBS_MANIFEST = {
  versao: '1.33.0',
  atualizadoEm: '2026-07-05',

  // ---- Perfis de acesso ----
  perfis: [
    { chave:'marketing',    nome:'Marketing',            login:'franz@sbsgreen.com.br',  responsavel:'Franz' },
    { chave:'gerente',      nome:'Gerente Nacional',     login:'medina@sbsgreen.com.br', responsavel:'Medina' },
    { chave:'ceo',          nome:'CEO',                  login:'tiago.mascheto@sbsgreen.com.br',  responsavel:'Tiago Mascheto' },
    { chave:'inteligencia', nome:'Inteligência de Mercado', login:'victorhugo@sbsgreen.com.br', responsavel:'Victor Hugo' },
    { chave:'ti',           nome:'Tecnologia (TI)',      login:'ti@sbsgreen.com.br',     responsavel:'Admin TI — governança dos painéis (exclusivo da TI)' },
    { chave:'admin',        nome:'Admin master',         login:'admin@sbsgreen.com.br',  responsavel:'Acesso a todos os painéis' },
    { chave:'vendedor',     nome:'App de Eventos (vendedor)', login:'—', responsavel:'400+ vendedores em campo' }
  ],

  // ---- Módulos por painel (o que existe hoje no front) ----
  modulos: [
    { painel:'Marketing', nome:'Dashboard executivo', desc:'KPIs, filtros (ano/safra/região), abas Executivo/Financeiro/Eventos/Campanhas/Demandas/Inteligência', funcoes:['vendas','notificacoes'] },
    { painel:'Marketing', nome:'Eventos', desc:'Lista, detalhe com abas (Custos & ROI, Inteligência), cadastro de evento', funcoes:['vendas'] },
    { painel:'Marketing', nome:'Quadro de demandas', desc:'Kanban interativo — mover coluna, editar tarefa, envolvidos', funcoes:['demandas'] },
    { painel:'Marketing', nome:'Inteligência', desc:'Estudos de mercado por evento + Mensuração & ROI + simulador', funcoes:['ia-groq'] },
    { painel:'Marketing', nome:'Esteira de leads', desc:'Pipeline dos leads do App do Vendedor + análise de perdas (SWOT)', funcoes:['leads'] },
    { painel:'Marketing', nome:'Assistente IA', desc:'Chat Groq contextual de Marketing', funcoes:['ia-groq'] },
    { painel:'Marketing', nome:'Compartilhar app', desc:'Link/QR/WhatsApp do App de Eventos, seletor por parceira', funcoes:['parceiros'] },
    { painel:'Marketing', nome:'Notificações', desc:'Envio para vendedores (all/região/evento)', funcoes:['notificacoes'] },
    { painel:'Marketing', nome:'Clima & tempo', desc:'Previsão por praça de evento', funcoes:['clima'] },

    { painel:'Gerente Nacional', nome:'Dashboard', desc:'Metas, ranking, aprovações operacionais', funcoes:['vendas','vendedores'] },
    { painel:'Gerente Nacional', nome:'Ranking', desc:'Vendedores / Regiões / Parceiros', funcoes:['vendas'] },
    { painel:'Gerente Nacional', nome:'Aprovações', desc:'Estudo colaborativo por setor antes do CEO', funcoes:['demandas'] },
    { painel:'Gerente Nacional', nome:'Esteira de leads', desc:'Pipeline consolidado + motivos de perda por vendedor/região', funcoes:['leads'] },
    { painel:'Gerente Nacional', nome:'Orçamentos & descontos', desc:'Alçada regional: liberar/ajustar desconto e bonificação pedidos no app', funcoes:['orcamentos'] },
    { painel:'Gerente Nacional', nome:'Metas (por campanha)', desc:'Meta é POR CAMPANHA (não por vendedor) e aparece a todos os vendedores no app; individual só vale p/ ranking/premiação', funcoes:['campanhas'] },
    { painel:'Gerente Nacional', nome:'Campanhas', desc:'Nome, GTN, período (calendário), meta, canal, premiação por colocação e tabela de produtos com preço da campanha', funcoes:['campanhas','produtos'] },
    { painel:'Gerente Nacional', nome:'Catálogo & preços', desc:'Cadastro de produto: preço de tabela, tamanho do saco, foto opcional', funcoes:['produtos'] },
    { painel:'Gerente Nacional', nome:'Vendedores por parceiro', desc:'Equipe de cada parceiro e o que vendeu por campanha (micro)', funcoes:['vendedores','campanhas'] },

    { painel:'CEO', nome:'Dashboard', desc:'Receita, lucro, ROI, crescimento', funcoes:['vendas'] },
    { painel:'CEO', nome:'Parceiros', desc:'Faturamento de eventos por parceira', funcoes:['parceiros'] },
    { painel:'CEO', nome:'Mercado & decisão', desc:'Aprovação final de investimentos', funcoes:['demandas'] },
    { painel:'CEO', nome:'Estados & regiões / Produtos / Evolução', desc:'Visões consolidadas', funcoes:['vendas'] },

    { painel:'Inteligência de Mercado', nome:'Visão geral + Cotações + Concorrentes + Regiões + Tendências + Mensuração & ROI', desc:'7 telas de inteligência', funcoes:['ia-groq'] },
    { painel:'Inteligência de Mercado', nome:'Concorrentes · robôs com fontes referenciadas', desc:'Cada robô guarda o link/@ exato de cada fonte; origem do achado rastreável e fonte removível', funcoes:['monitoramento','coletor-concorrentes'] },

    { painel:'App de Eventos', nome:'Login do vendedor', desc:'Portal do Vendedor (co-branded por parceira)', funcoes:['vendedores'] },
    { painel:'App de Eventos', nome:'Cadastro + registro de venda', desc:'Grava vendedor e venda; dispara notificação às áreas', funcoes:['vendedores','vendas','notificacoes'] },
    { painel:'App de Eventos', nome:'Leads (esteira)', desc:'Captura, edição, avanço de status e registro de perda (SWOT) — reflete no painel', funcoes:['leads'] },
    { painel:'App de Eventos', nome:'Orçamentos', desc:'Abre orçamento p/ um lead e pede desconto/bonificação ao gerente regional', funcoes:['orcamentos'] },
    { painel:'App de Eventos', nome:'Ranking & trilha de prêmios', desc:'Colocação do vendedor entre os cadastrados do app parceiro na campanha ativa; mostra gap % e R$ para o 1º lugar e a trilha de cortes de cada prêmio', funcoes:['ranking'] },

    { painel:'Tecnologia (TI)', nome:'Governança dos painéis', desc:'Console exclusivo da TI: oculta módulos e coloca painéis em manutenção; invisível aos demais perfis', funcoes:[] },
    { painel:'Tecnologia (TI)', nome:'Status & saúde / Acessos & perfis', desc:'Estado dos painéis, status das funções de backend e perfis de acesso', funcoes:[] },
    { painel:'Tecnologia (TI)', nome:'Auditoria (LGPD)', desc:'Trilha de acessos e alterações — quem fez o quê, quando; restrita a admin/TI', funcoes:['auditoria'] },
    { painel:'Compartilhado', nome:'Login por perfil (server-side)', desc:'Autenticação real com token; cada perfil vê só o seu painel; admin acessa todos', funcoes:['auth'] },
    { painel:'Tecnologia (TI)', nome:'Parceiras (multi-tenant)', desc:'Provisiona parceiras (white-label) sem deploy; dados isolados por tenant, SBS vê consolidado', funcoes:['tenants'] },
    { painel:'Compartilhado', nome:'Aprovações · anexos + histórico', desc:'Cada setor anexa fotos/PDF/arquivos ao estudo; histórico de todas as ações do fluxo', funcoes:['aprovacoes'] }
  ],

  // ---- Funções de servidor (Netlify Functions) ----
  funcoes: [
    { nome:'auth',          metodos:'POST, GET',         desc:'Login por perfil (token HMAC 12h, com tenant); senha na coleção usuarios (trocável); GET valida a sessão', coleção:'usuarios', envs:['AUTH_SECRET','USERS_JSON'], status:'ligada' },
    { nome:'senha',         metodos:'POST',              desc:'Trocar senha (autenticado) e redefinir por código de 6 dígitos (esqueci a senha, sem bloqueio por tentativas)', coleção:'usuarios', envs:['AUTH_SECRET','RESEND_API_KEY'], status:'ligada' },
    { nome:'app-login',     metodos:'POST',              desc:'Login/cadastro do App do Vendedor + esqueci a senha (código 6 dígitos). Credenciais na coleção vendedores; token perfil:vendedor com tenant da parceira', coleção:'vendedores', envs:['AUTH_SECRET','RESEND_API_KEY'], status:'ligada' },
    { nome:'eventos',       metodos:'GET, POST, PATCH, DELETE', desc:'Agenda compartilhada entre perfis (Marketing/Gerência/Vendas/Inteligência); acaoEvento:aprovacao envia o evento à esteira de aprovação. Isolado por tenant', coleção:'eventos', envs:['AUTH_SECRET'], status:'ligada' },
    { nome:'tenants',       metodos:'GET, POST, DELETE', desc:'Cadastro de parceiras (white-label). Provisiona sem deploy; isolamento por tenant', coleção:'tenants', envs:['AUTH_SECRET'], status:'ligada' },
    { nome:'auditoria',     metodos:'GET',               desc:'Trilha LGPD (admin/TI); registra quem acessou/alterou o quê', coleção:'auditoria', envs:['AUTH_SECRET'], status:'ligada' },
    { nome:'vendedores',    metodos:'GET, POST, DELETE', desc:'Cadastro da força de campo', coleção:'vendedores', envs:['ERP_TOKEN'], status:'ligada' },
    { nome:'vendas',        metodos:'GET, POST',         desc:'Vendas registradas no App de Eventos', coleção:'vendas', envs:['ERP_TOKEN'], status:'ligada' },
    { nome:'notificacoes',  metodos:'GET, POST',         desc:'Central de mensagens para vendedores', coleção:'notificacoes', envs:[], status:'stub' },
    { nome:'demandas',      metodos:'GET, POST',         desc:'Quadro de demandas / aprovações', coleção:'aprovacoes', envs:[], status:'stub' },
    { nome:'leads',         metodos:'GET, POST, PATCH',  desc:'Esteira de leads (App do Vendedor → painel); PATCH move status ou registra perda+SWOT', coleção:'leads', envs:[], status:'ligada' },
    { nome:'monitoramento', metodos:'GET, POST, PATCH, DELETE', desc:'Robôs de concorrentes com fontes referenciadas (link/@); adicionar/remover fonte. Painel persiste ao criar robô.', coleção:'monitoramentos', envs:[], status:'ligada' },
    { nome:'aprovacoes',    metodos:'GET, POST, PATCH',  desc:'Esteira colaborativa de projetos/eventos (Marketing→Gerência→Inteligência→CEO); registra decisão + histórico', coleção:'aprovacoes', envs:['AUTH_SECRET'], status:'ligada' },
    { nome:'orcamentos',    metodos:'GET, POST, PATCH',  desc:'Orçamentos c/ pedido de desconto/bonificação; PATCH = decisão do gerente regional', coleção:'orcamentos', envs:['DESCONTO_ALCADA'], status:'ligada' },
    { nome:'limpar-teste',  metodos:'POST',              desc:'Exclui de todas as coleções os registros marcados { teste:true }. Usar uma vez após subir para produção; só CEO/Admin', coleção:'todas', envs:['AUTH_SECRET'], status:'ligada' },
    { nome:'ranking',       metodos:'GET',               desc:'Ranking do App do Vendedor: soma faturamento de vendas por vendedor no recorte (parceira/evento/campanha), colocação, gap % e R$ para o 1º e cortes dos prêmios', coleção:'vendas+campanhas+vendedores', envs:[], status:'ligada' },
    { nome:'produtos',      metodos:'GET, POST, PATCH, DELETE', desc:'Catálogo de produtos (preço de tabela, tamanho do saco, foto)', coleção:'produtos', envs:[], status:'ligada' },
    { nome:'campanhas',     metodos:'GET, POST, PATCH',  desc:'Campanhas: GTN, período, meta (por campanha), canal, premiação e tabela de produtos com preço da campanha', coleção:'campanhas', envs:[], status:'ligada' },
    { nome:'aprovacoes',    metodos:'GET, POST',         desc:'Histórico do fluxo de aprovação (quem/fez o quê/quando) + anexos', coleção:'aprovacoes_hist', envs:[], status:'ligada' },
    { nome:'parceiros',     metodos:'GET, POST',         desc:'Apps co-branded por parceira', coleção:'parceiros', envs:[], status:'stub' },
    { nome:'alertas',       metodos:'GET (agendada)',    desc:'Regras automáticas de alerta de mercado', coleção:'mi_tendencias', envs:[], status:'stub' },
    { nome:'clima',         metodos:'GET',               desc:'Previsão por coordenada da praça', coleção:'—', envs:['CLIMA_KEY'], status:'stub' },
    { nome:'ia-groq',       metodos:'POST',              desc:'Assistente IA (Groq) — lê resumo AGREGADO de eventos/campanhas/vendas/orçamentos/leads (por tenant) e injeta no contexto do modelo. Só agregados (LGPD)', coleção:'eventos, campanhas, vendas, orcamentos, leads (leitura)', envs:['GROQ_API_KEY','GROQ_MODEL'], status:'pronta' },
    { nome:'coletor-concorrentes', metodos:'agendada',   desc:'Robô de coleta de concorrentes', coleção:'mi_concorrentes', envs:[], status:'existente' },
    { nome:'preco-concorrente',    metodos:'GET',        desc:'Cotações / preços', coleção:'mi_cotacoes', envs:['AV_KEY'], status:'existente' }
  ],

  // ---- Coleções (modelo de dados — resumo; detalhe em backend/schema.md) ----
  coleções: [
    { nome:'usuarios',     desc:'Perfis de acesso (auth). Senha só como hash; nunca em texto (LGPD). Campo tenant isola parceira.' },
    { nome:'tenants',      desc:'Cadastro das parceiras (white-label). 1 registro = 1 parceira; escala sem deploy.' },
    { nome:'auditoria',    desc:'Trilha LGPD: metadados de acesso/alteração (sem dados pessoais).' },
    { nome:'vendedores',   desc:'Força de campo (400+). CPF/telefone = pessoal (LGPD). Cadastro pelo app reflete no painel; campos de acesso: logou, ultimoLogin, precisaRedefinir, origem/parceira.' },
    { nome:'vendas',       desc:'Vendas do App de Eventos. CNPJ do cliente = pessoal (LGPD).' },
    { nome:'eventos',      desc:'Agenda compartilhada entre perfis. app/parceira = app do evento (usado por campanhas). appStatus = situação do app no fluxo (nao_consta/a_criar/em_criacao/publicado — desacopla evento×app×campanha). status: Confirmado/Planejado/Realizado.' },
    { nome:'notificacoes', desc:'Mensagens → vendedores, com lidoPor[].' },
    { nome:'aprovacoes',   desc:'Estudo colaborativo por setor + decisão do CEO.' },
    { nome:'leads',        desc:'Esteira de leads. Produtor/telefone = pessoal (LGPD). Histórico + motivo de perda + SWOT.' },
    { nome:'monitoramentos', desc:'Robôs de concorrentes; fontes[{tipo,ref}] com link/@ exato de origem.' },
    { nome:'orcamentos',   desc:'Pedidos de desconto/bonificação por lead; alçada do gerente regional.' },
    { nome:'produtos',     desc:'Catálogo único: preço de tabela, tamanho do saco, foto opcional.' },
    { nome:'campanhas',    desc:'Campanhas com meta por campanha, premiação e tabela de produtos c/ preço específico. Vinculada a evento → herda o app do evento.' },
    { nome:'aprovacoes_hist', desc:'Histórico do fluxo de aprovação + anexos por projeto.' },
    { nome:'governanca',   desc:'TI: painéis em manutenção e módulos ocultos por perfil.' },
    { nome:'parceiras',    desc:'Cooperativas co-branded (logo, paleta, link do app).' },
    { nome:'mi_*',         desc:'Inteligência de Mercado: cotações, concorrentes, regiões, tendências.' }
  ],

  // ---- Ambientes ----
  ambientes: [
    { nome:'Produção', branch:'main',    url:'painel-sbs.netlify.app' },
    { nome:'Staging (teste)', branch:'staging', url:'staging--painel-sbs.netlify.app' }
  ],

  // ---- Changelog (mais recente no topo) ----
  changelog: [
    { versao:'1.33.0', data:'2026-07-06', itens:['DEPLOY: front passou a chamar /api/<nome> DIRETO (apiBase + as 5 chamadas diretas: auth, app-login login/cadastro, senha, ia-groq). Antes dependia do rewrite _redirects /.netlify/functions/* → /api/* — no Cloudflare Pages um rewrite 200 para uma Pages Function nem sempre re-entra no roteamento, então algumas chamadas podiam não chegar ao backend. Chamando /api direto, a Pages Function (functions/api/[[path]].js) atende sempre. _redirects mantido como retrocompatibilidade.'] },
    { versao:'1.32.0', data:'2026-07-05', itens:['CORREÇÃO CRÍTICA (nada gravava no Supabase): store.js lia SUPABASE_URL/SUPABASE_SERVICE_KEY no TOPO do módulo (import time). No Cloudflare Workers o process.env só é preenchido DENTRO do onRequest (o roteador copia as vars do Pages ali) — então no import as vars vinham vazias, useSupabase=false e toda escrita caía no fallback de Blobs (inexistente no Cloudflare), falhando em silêncio. Agora a leitura do ambiente é PREGUIÇOSA (sbUrl()/sbKey()/useSupabase() a cada chamada). Mesmo tratamento em AUTH_SECRET (auth.js, senha.js, app-login.js, _lib/auth.js) e GROQ_MODEL (ia-groq.js) — antes ignoravam a variável real e usavam o fallback de dev.','eventos: escrita deixou de EXIGIR token (as outras 11 funções de dados já gravam sem exigir) — usa a identidade do token quando houver, senão atribui ao criador enviado; mantém auditoria e tenant. Assim o evento persiste também no modo demo.','apiSend passou a enviar o Bearer de sbs_token OU sbs_app_token — gravações do App do Vendedor agora carregam identidade/tenant.'] },
    { versao:'1.31.5', data:'2026-07-05', itens:['Logo SBS embutido como data URI no próprio HTML (antes referenciava assets/logo-white.png externo, que quebrava e disparava o "[bundle] error" no site publicado).','Menu lateral fixo: shell de altura fixa (100vh) — sidebar e conteúdo rolam cada um por conta própria; a barra não arrasta mais junto com a página.'] },
    { versao:'1.31.0', data:'2026-07-05', itens:['Deploy no Cloudflare Pages (grátis, o mais escalável — banda ilimitada + ~100 mil req/dia nas Functions, uso comercial OK). Backend reaproveitado SEM reescrever: as 22 funções foram movidas para server/*.js e um roteador Pages Function (functions/api/[[path]].js) as executa no runtime Workers (nodejs_compat).','_redirects reescreve /.netlify/functions/&lt;nome&gt; → /api/&lt;nome&gt; (o front não muda); wrangler.toml liga nodejs_compat (process.env + HMAC do login).','store.js: @netlify/blobs passou a ser carregado por especificador computado (await import) — não é empacotado no Cloudflare/Vercel; no Cloudflare o armazenamento é Supabase via fetch.','netlify.toml (functions=server) e vercel.json/api ajustados: os 3 hosts (Cloudflare, Vercel, Netlify) convivem. Guia: backend/deploy-cloudflare.md.'] },
    { versao:'1.30.0', data:'2026-07-05', itens:['Portabilidade de host: projeto agora sobe também no Vercel (plano grátis, sem cartão) SEM reescrever as 22 funções. Adaptador api/[fn].js executa cada functions/<nome>.js no formato Netlify (event/handler); vercel.json reescreve /.netlify/functions/<nome> → /api/<nome>, define home, headers de segurança e crons.','No Vercel o armazenamento é Supabase (não há Netlify Blobs) — store.js já suporta; guia em backend/deploy-vercel.md.','netlify.toml mantido: os dois hosts convivem, dá para voltar à Netlify sem mudar nada.'] },
    { versao:'1.29.0', data:'2026-07-05', itens:['Assistente IA (Groq) agora responde COM BASE NOS DADOS REAIS do painel: a função ia-groq lê um resumo agregado de eventos, campanhas, vendas, orçamentos e leads (respeitando o tenant do token) e injeta no system prompt do modelo. Ex.: "qual produto teve mais receita?", "quantos orçamentos pendentes?".','LGPD: só AGREGADOS vão ao modelo (contagens, somas, status, nome do produto/evento) — nunca nome, CNPJ ou telefone de cliente/vendedor.','Modo demonstração espelha os mesmos números reais do painel (front monta resumo local) para funcionar antes da publicação.','Front envia o Bearer token para o assistente ler os dados do tenant correto.'] },
    { versao:'1.28.0', data:'2026-07-05', itens:['Atalho "Criar app agora" nos eventos em "Não consta" / "App a criar": abre o cadastro de app de parceiro já vinculado ao evento (nome e local pré-preenchidos, banner de vínculo). Ao criar, o evento passa automaticamente para "App em criação" e, quando o tenant é provisionado no backend, para "App publicado" (PATCH eventos {app, appStatus}).'] },
    { versao:'1.27.0', data:'2026-07-05', itens:['Status do app no fluxo de trabalho (desacopla evento × app × campanha — nada trava): 4 estados — Não consta, App a criar, App em criação, App publicado. No cadastro de evento dá para escolher um app já disponível OU marcar "ainda não definido / vai criar depois"; a campanha pode ser criada mesmo sem app publicado e aparece automaticamente assim que o app for publicado.','Agenda de eventos: cada evento mostra um seletor de situação do app (avança o estado) + badge colorido; a campanha exibe o estado do app do evento vinculado (badge e mensagem, sem bloquear).','Backend: eventos.js valida appStatus (POST/PATCH) e grava auditoria app_estado:<key>; schema + manifesto atualizados.'] },
    { versao:'1.26.0', data:'2026-07-05', itens:['Bateria completa de testes (front + back): 79 telas dos 4 perfis + app navegadas por clique real — 0 erro de console; 22 Netlify Functions + 2 libs com sintaxe validada.','Backend: criada functions/aprovacoes.js (esteira colaborativa Marketing→Gerência→Inteligência→CEO) — o painel já chamava esse endpoint sem a função existir.','Backend: robô de concorrentes agora PERSISTE ao criar (apiSend → functions/monitoramento.js); antes ficava só no estado local.','Front: filtro do Registro de atividades (Todos/Criações/Alterações/Exclusões) estava sem ação — agora filtra a linha do tempo de verdade.','Testes de fluxo ponta-a-ponta confirmados: criar produto → aparece no catálogo e na campanha; criar campanha vinculada a evento → mostra o app do evento; cadastro de vendedor pelo app → reflete em Vendedores com badge NOVO + notificação nos painéis.'] },
    { versao:'1.25.0', data:'2026-07-05', itens:['Cadastro de vendedor pelo App de Eventos agora REFLETE no módulo Vendedores (bug: antes só chegava notificação no sino). O novo vendedor aparece com badge NOVO, origem/app de onde se cadastrou, status de login (“Já logou / Nunca logou”) e ação “Solicitar redefinição de senha”.','Notificação de novo cadastro chega aos painéis Marketing e Gerência Nacional (sino) e leva direto ao módulo Vendedores.','functions/vendedores.js: novo PATCH marca login (logou/ultimoLogin) e redefinição de senha; POST persiste usuario, cidade/uf, gerente, origem e flags de acesso.','Campanha vinculada a evento mostra o APP do evento (App SBS Eventos ou app da parceira). O app do evento é escolhido no cadastro do evento (campo “App do evento”) e aparece no card da campanha.'] },
    { versao:'1.24.0', data:'2026-07-05', itens:['Agenda de eventos COMPARTILHADA entre Marketing, Gerência, Vendas e Inteligência: todos têm o módulo e veem os eventos que qualquer perfil criar (functions/eventos.js, coleção `eventos`, isolada por tenant).','Cada evento pode ser enviado à esteira de aprovação (Marketing → Gerência → Inteligência → CEO) com um clique — vira um projeto no módulo de Aprovações.','Login do App do Vendedor ligado ao backend (functions/app-login.js): login, cadastro com usuário+senha e “esqueci a senha” por código; credenciais na coleção vendedores, token perfil:vendedor com tenant.'] },
    { versao:'1.23.0', data:'2026-07-05', itens:['Senha por usuário e trocável: usuários migraram para a coleção `usuarios` (banco), semeada da equipe SBS ou de USERS_JSON.','Troca de senha obrigatória no 1º login (precisaTrocar) + acesso "Trocar senha" no rodapé da sidebar.','"Esqueci minha senha": código de 6 dígitos válido 30 min (functions/senha.js); envia por e-mail via RESEND_API_KEY ou mostra na tela em staging. Sem bloqueio por tentativas.','AUTH_SECRET forte gerado para produção; .env.example atualizado (RESEND_API_KEY, MAIL_FROM).','Supabase como banco de produção (SUPABASE_URL + SUPABASE_SERVICE_KEY) — SQL em backend/supabase-schema.sql.'] },
    { versao:'1.22.0', data:'2026-07-05', itens:['Bateria de testes completa (front + back + banco + responsividade + smoke): 79 telas dos 4 perfis + todas as telas do App do Vendedor renderizam sem erro de JS nem tela vazia', 'Correção de banco: faltava a tabela sbs_produtos no schema SQL (produtos.js gravava numa tabela inexistente) — adicionada', 'Correção de banco: functions/monitoramento.js grava em "monitoramentos" (plural) mas o SQL criava "sbs_monitoramento" (singular) — renomeado para sbs_monitoramentos', 'Limpeza: removida chamada morta this.pushLog() (método inexistente, chamada guardada que nunca executava)', 'Validação: 223 métodos da classe × 219 chamadas this.x() — 100% resolvidos; 18 funções de backend com handler e store corretos'] },
    { versao:'1.21.0', data:'2026-07-05', itens:['4 exemplos de teste com valores fechados (R$ 1.000, R$ 2.000, R$ 1.000.000, R$ 2.000.000) em leads, orçamentos e ranking de vendedores — todos marcados { teste:true }', 'Botão "Excluir dados de teste" na página Arquitetura do sistema (CEO/Admin) + função limpar-teste.js que zera os registros de demonstração após subir para produção'] },
    { versao:'1.20.0', data:'2026-07-05', itens:['App do Vendedor: tela "Ranking & trilha de prêmios" — colocação entre os vendedores cadastrados do app parceiro na campanha, % e R$ que faltam para o 1º lugar e a trilha de cortes de cada prêmio (1º/2º/3º). Função ranking.js soma o faturamento das vendas por vendedor no recorte parceira/evento/campanha'] },
    { versao:'1.19.0', data:'2026-07-05', itens:['Orçamento no App do Vendedor puxa automaticamente os produtos e preços da campanha do evento; ao trocar o produto o preço de tabela é preenchido sozinho'] },
    { versao:'1.18.0', data:'2026-07-05', itens:['Campanha vinculada a evento: no cadastro de campanha há seletor "Evento vinculado"; no App do Vendedor os materiais são filtrados automaticamente pela campanha do evento em que ele está (sem precisar escolher)'] },
    { versao:'1.17.0', data:'2026-07-05', itens:['Materiais ligados à campanha: no App do Vendedor a tela "Ficha técnica & materiais" mostra só os produtos da campanha ativa (com seletor de campanha), não o catálogo inteiro', 'Campanhas criadas no painel agora ficam no estado e aparecem na lista de Campanhas; guardam os produtos escolhidos ({produtoId,preco})'] },
    { versao:'1.16.0', data:'2026-07-05', itens:['Ficha técnica + materiais de apoio no cadastro de produto (Marketing e Gerente): especificações em texto e anexos por vídeo/PDF/Excel/texto/link ou upload de arquivo', 'App do Vendedor: nova tela "Ficha técnica & materiais" — o vendedor consulta specs e abre os materiais dos produtos da campanha durante a venda', 'Catálogo & materiais agora também no painel de Marketing (antes só no Gerente)', 'Backend produtos.js estendido (specs + materiais); coleção produtos documentada no schema', 'Indicador Online/Demonstração na topbar; KPIs de vendedores refletem a base real quando online'] },
    { versao:'1.15.0', data:'2026-07-05', itens:['Paginação sob demanda no painel: lista de vendedores em janelas de 25 com botão "Carregar mais" que busca a próxima página do backend (?pagina=) — usa a base real quando online', 'Filtros (status/região/tenant) empurrados para o BANCO antes de paginar (vendedores e leads) — página nunca vem incompleta em volume', 'Índices compostos por tenant no Postgres: (tenant, updated_at desc) e (tenant, status) nas tabelas operacionais + tenant nas de fluxo — cada parceira lê só as suas linhas sem varrer a tabela', 'Criação de app de parceiro robusta: provisiona o tenant e reflete o resultado real (confirma online, avisa se sem permissão, cai em demo se offline) sem falhar silenciosamente'] },
    { versao:'1.14.0', data:'2026-07-05', itens:['Escalabilidade p/ 1000+ usuários: paginação padrão (?limite=&pagina=) com cap 500/página no store e nas listas (vendedores, vendas, leads, orçamentos) — nunca varre a coleção inteira', 'Ordenação por atualização (mais novos primeiro) direto no banco', 'Cadastro de parceiras do painel agora provisiona o tenant no backend (functions/tenants.js) com fallback demo; painel carrega parceiras reais via /tenants'] },
    { versao:'1.13.0', data:'2026-07-05', itens:['Arquitetura multi-tenant p/ escalar N parceiras: coluna `tenant` por linha, banco/schema único, SBS como super-tenant (vê todas)', 'store.js: tenantStore(tenant) filtra e carimba por parceira; tenant vem SEMPRE do token (sem vazamento entre parceiras)', 'functions/tenants.js: provisiona parceira (white-label: marca, paleta, produtos, política) sem deploy — 1 registro = 1 parceira; app carrega a marca por slug', 'vendas/leads/orcamentos/vendedores escopados por tenant; SQL com índices de tenant; doc backend/arquitetura-multitenant.md'] },
    { versao:'1.12.0', data:'2026-07-05', itens:['SQL de produção pronto: backend/supabase-schema.sql cria todas as tabelas sbs_* (envelope jsonb + índices GIN) — uma DDL serve para qualquer coleção', 'store.js: ponte Supabase agora usa envelope { id, data } — filtros por qualquer campo via data->>campo, sem migração quando surgem campos novos', 'tools/gerar-hash.js: utilitário para gerar USERS_JSON (hash sha256(senha+AUTH_SECRET)) com aviso de senha fraca', 'deploy-guia.md: seção 7 (auth, banco Supabase e LGPD) passo a passo'] },
    { versao:'1.11.0', data:'2026-07-05', itens:['Autenticação server-side: /.netlify/functions/auth com token HMAC (12h); painel tenta o login real e cai no modo demo se offline', 'LGPD: trilha de auditoria (functions/auditoria.js) — toda escrita (vendedores, vendas, leads, orçamentos) registra quem/fez o quê/quando; nova tela Auditoria no painel de TI (admin/TI)', 'Ponte de banco: store.js agora usa Supabase/Postgres quando SUPABASE_URL+KEY existem, senão Netlify Blobs — mesma interface, sem mudar as rotas', '.env.example com AUTH_SECRET, USERS_JSON e Supabase; schema.md com coleções usuarios e auditoria'] },
    { versao:'1.10.0', data:'2026-07-05', itens:['Ligação front↔backend ampliada: registro de venda e cadastro de vendedor no app, criação de campanha e de produto agora gravam via /.netlify/functions (com fallback demo)', 'loadReal carrega catálogo de produtos real no load', 'package.json (@netlify/blobs, Node≥18), .gitignore e README para subir ao GitHub'] },
    { versao:'1.9.0', data:'2026-07-05', itens:['Painel de TI (governança): oculta módulos e tira painéis do ar; exclusivo da Tecnologia, invisível aos demais', 'Catálogo de produtos (preço de tabela, tamanho do saco, foto) + tabela de produtos/preços por campanha', 'Campanha: GTN, período com calendário (type=date), meta por campanha (não por vendedor)', 'Vendedores por parceiro (micro p/ Mkt/Gerente, macro p/ Intel/CEO)', 'Aprovações: anexos (foto/PDF/arquivo) + histórico de todas as ações', 'App de parceiro: data e local do evento; fix do bug do mapa (CEO · Estados & regiões)', 'Backend: functions/produtos.js e campanhas.js'] },
    { versao:'1.8.0', data:'2026-07-04', itens:['Integração front↔funções nos módulos centrais: leads e orçamentos gravam via /.netlify/functions (com fallback demo automático)', 'Camada de API no painel (apiGet/apiSend) + carga real no load (loadReal)', 'Bateria de testes: 63 telas dos 4 perfis + App do Vendedor (6 abas) renderizam sem erro; criação de lead validada ponta a ponta; 12 funções de backend com sintaxe OK'] },
    { versao:'1.7.0', data:'2026-07-04', itens:['Esteira de leads (App do Vendedor ↔ painel) com status editável e registro de perda + SWOT', 'Robôs de concorrentes com fontes referenciadas (link/@), origem do achado e remoção de fonte', 'Orçamentos no app: pedido de desconto/bonificação por lead com alçada do gerente regional', 'Backend: functions/leads.js, monitoramento.js, orcamentos.js'] },
    { versao:'1.6.0', data:'2026-07-04', itens:['Documentação viva (manifesto único) + página de Arquitetura', 'Pacote de deploy com 2 ambientes: staging e produção (netlify.toml)'] },
    { versao:'1.5.0', data:'2026-07-03', itens:['Login por perfil com credenciais reais (@sbsgreen.com.br) + Admin master', 'Assistente IA (Groq) em Marketing e Inteligência'] },
    { versao:'1.4.0', data:'2026-07-02', itens:['Portal do Vendedor (login do app)', 'App co-branded: upload de logo + paleta da parceira', 'Cadastro de vendedor dispara notificação às áreas'] },
    { versao:'1.3.0', data:'2026-07-01', itens:['Quadro de demandas interativo (mover/editar/envolvidos)', 'Ranking por parceiro', 'Responsividade mobile (drawer)'] },
    { versao:'1.2.0', data:'2026-06-30', itens:['CEO · Parceiros (faturamento por parceira)', 'Estudo colaborativo por setor nas Aprovações', 'Mensuração & ROI + simulador'] },
    { versao:'1.1.0', data:'2026-06-28', itens:['Painel de Inteligência de Mercado (7 telas)', 'Compartilhar app (link/QR/WhatsApp)', 'Central de Notificações'] },
    { versao:'1.0.0', data:'2026-06-20', itens:['Protótipo inicial: painéis Marketing, Gerente Nacional, CEO + App de Eventos'] }
  ]
};
