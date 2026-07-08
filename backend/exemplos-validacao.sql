-- ============================================================
-- SBS Green Seeds — DADOS DE EXEMPLO (validação de comunicação)
-- Insere 1 registro realista em CADA coleção (tabela sbs_<nome>).
-- Objetivo: abrir os painéis e ver os dados aparecerem → prova que
-- a leitura /api/* → Supabase funciona em todas as coleções.
--
-- Como usar: Supabase → SQL Editor → New query → cole tudo → Run.
-- Idempotente: rodar de novo só atualiza os mesmos registros (id fixo "EX-…").
-- Todos com tenant:'sbs' para aparecerem nos painéis internos.
-- Para remover depois:  delete from sbs_<tabela> where id like 'EX-%';
-- ============================================================

-- EVENTOS (agenda compartilhada + dashboards) ---------------
insert into sbs_eventos (id, data) values
('EX-evt-1', '{"id":"EX-evt-1","tenant":"sbs","nome":"Agrishow 2026","cidade":"Ribeirão Preto","uf":"SP","data":"27 Abr–01 Mai 2026","mes":"Abr","dia":27,"segmento":"Feira nacional","objetivo":"Geração de leads e vendas de sementes","status":"Confirmado","app":"App SBS Eventos","appStatus":"publicado","custo":180000,"receita":920000,"leads":140,"participantes":3200,"equipe":"Franz, Medina","criadoPor":"marketing","criadoPorNome":"Franz","criadoEm":"2026-02-10T12:00:00.000Z"}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- CAMPANHAS -------------------------------------------------
insert into sbs_campanhas (id, data) values
('EX-cmp-1', '{"id":"EX-cmp-1","tenant":"sbs","nome":"Safra Soja 2026 · Coopercitrus","gtn":"GTN-2026-001","inicio":"2026-03-01","fim":"2026-06-30","meta":2500000,"canal":"App de Eventos","status":"Ativa","evento":"Agrishow 2026","premios":[{"pos":1,"premio":"Viagem internacional","bonus":"1%"},{"pos":2,"premio":"Notebook","bonus":"0,5%"}],"produtos":[{"produtoId":"EX-prd-1","preco":1850}]}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- PRODUTOS (catálogo) ---------------------------------------
insert into sbs_produtos (id, data) values
('EX-prd-1', '{"id":"EX-prd-1","tenant":"sbs","nome":"Soja SBS 8500 IPRO","cultura":"Soja","saco":"40 kg","preco":1980,"foto":null,"specs":"Ciclo precoce, alto potencial produtivo, resistência a nematoides.","materiais":[{"tipo":"PDF","titulo":"Ficha técnica","url":"https://exemplo.com/ficha.pdf","nome":"ficha.pdf"}],"criadoEm":"2026-02-01T12:00:00.000Z"}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- VENDEDORES (força de campo) -------------------------------
insert into sbs_vendedores (id, data) values
('EX-vd-1', '{"id":"EX-vd-1","tenant":"sbs","nome":"Carlos Andrade","cpf":"123.456.789-00","telefone":"(16) 99999-1234","email":"carlos.andrade@coopercitrus.com.br","regiao":"Sudeste","parceira":"Coopercitrus","origem":"Coopercitrus · App de Eventos","usuario":"carlos.andrade","cidade":"Ribeirão Preto","uf":"SP","gerente":"Medina","logou":true,"ultimoLogin":"2026-04-28T14:30:00.000Z","status":"ativo","criadoEm":"2026-03-15T12:00:00.000Z"}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- VENDAS (registradas no App de Eventos) --------------------
insert into sbs_vendas (id, data) values
('EX-vn-1', '{"id":"EX-vn-1","tenant":"sbs","vendedorId":"EX-vd-1","eventoId":"EX-evt-1","parceira":"Coopercitrus","cnpjCliente":"12.345.678/0001-90","produto":"Soja SBS 8500 IPRO","quantidade":300,"valor":594000,"ts":1777638600000}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- LEADS (esteira/pipeline) ----------------------------------
insert into sbs_leads (id, data) values
('EX-lead-1', '{"id":"EX-lead-1","tenant":"sbs","nome":"João Pereira","prop":"Fazenda Santa Rita","ha":"1.200","fone":"(16) 98888-5678","produto":"Soja SBS 8500 IPRO","potencial":"Quente","status":"Proposta","valor":420000,"vendedor":"Carlos Andrade","evento":"Agrishow 2026","hist":[{"status":"Novo","quando":"2026-04-27T10:00:00.000Z"},{"status":"Proposta","quando":"2026-04-29T16:00:00.000Z"}]}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- ORÇAMENTOS (desconto/bonificação) -------------------------
insert into sbs_orcamentos (id, data) values
('EX-orc-1', '{"id":"EX-orc-1","tenant":"sbs","leadId":"EX-lead-1","leadNome":"João Pereira","produto":"Soja SBS 8500 IPRO","qtd":200,"precoTabela":1980,"descontoSolic":8,"descontoAprov":null,"bonifSolic":"2 sacos","bonifAprov":"","justificativa":"Cliente estratégico, compra recorrente.","status":"Solicitado","regiao":"Sudeste","vendedor":"Carlos Andrade"}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- NOTIFICAÇÕES (central → vendedores) -----------------------
insert into sbs_notificacoes (id, data) values
('EX-not-1', '{"id":"EX-not-1","tenant":"sbs","titulo":"Nova tabela de preços","texto":"A tabela da campanha Safra Soja 2026 já está disponível no app.","tipo":"campanha","destino":"all","destinoValor":"","ts":1777638600000,"lidoPor":[]}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- DEMANDAS (portal de solicitações ao Marketing) -----------
insert into sbs_demandas (id, data) values
('EX-dem-1', '{"id":"EX-dem-1","tenant":"sbs","titulo":"Banner para estande Agrishow","tipo":"Banner","solicitante":"Medina","regiao":"Sudeste","area":"Comercial","descricao":"Banner 3x2m com a linha de soja.","objetivo":"Divulgação no estande","prazo":"2026-04-20","prioridade":"Alta","status":"Solicitado","responsavel":"Franz"}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- PARCEIROS (apps co-branded) -------------------------------
insert into sbs_parceiros (id, data) values
('EX-pt-1', '{"id":"EX-pt-1","tenant":"sbs","nome":"Coopercitrus","cor":"#0B6B61","evento":"Agrishow 2026","local":"Ribeirão Preto/SP","data":"2026-04-27","status":"Ativo","criadoEm":"2026-03-01T12:00:00.000Z"}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- ALERTAS ---------------------------------------------------
insert into sbs_alertas (id, data) values
('EX-alt-1', '{"id":"EX-alt-1","tenant":"sbs","titulo":"Concorrente reduziu preço","texto":"Preço da soja concorrente caiu 4% na região Sudeste.","tipo":"aviso","ts":1777638600000}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- MONITORAMENTOS (robôs de coleta) --------------------------
insert into sbs_monitoramentos (id, data) values
('EX-mon-1', '{"id":"EX-mon-1","tenant":"sbs","alvo":"Concorrente XYZ Sementes","freq":"Diário","fontes":[{"tipo":"site","ref":"https://www.xyzsementes.com.br"},{"tipo":"rede social","ref":"@xyzsementes"}],"status":"Ativo","achados":3,"ultimo":{"texto":"Nova cultivar de milho anunciada","fonte":"site","ref":"https://www.xyzsementes.com.br/novidades"}}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- APROVAÇÕES (estudo colaborativo por setor) ----------------
insert into sbs_aprovacoes (id, data) values
('EX-apr-1', '{"id":"EX-apr-1","tenant":"sbs","eventoId":"EX-evt-1","faseAtual":"gerente","estudoMkt":"Público qualificado, ROI histórico alto.","estudoGerente":"","estudoIntel":"","decisaoCeo":""}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- APROVAÇÕES · HISTÓRICO ------------------------------------
insert into sbs_aprovacoes_hist (id, data) values
('EX-aprh-1', '{"id":"EX-aprh-1","tenant":"sbs","projeto":"Agrishow 2026","quem":"Franz","acao":"enviou estudo de Marketing","quando":"2026-02-12T10:00:00.000Z","anexos":[{"nome":"estudo-mkt.pdf","tipo":"PDF","tam":"320 KB"}]}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- GOVERNANÇA (TI) -------------------------------------------
insert into sbs_governanca (id, data) values
('EX-gov-1', '{"id":"EX-gov-1","tenant":"sbs","panelOffline":{"marketing":false,"gerente":false,"ceo":false,"mercado":false},"hiddenMods":{}}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- AUDITORIA (LGPD) ------------------------------------------
insert into sbs_auditoria (id, data) values
('EX-aud-1', '{"id":"EX-aud-1","usuario":"admin@sbsgreen.com.br","perfil":"admin","acao":"criou","entidade":"eventos","entidadeId":"EX-evt-1","ip":"189.0.0.1","ts":1777638600000}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- TENANTS (parceiras white-label) ---------------------------
insert into sbs_tenants (id, data) values
('EX-tnt-coopercitrus', '{"id":"EX-tnt-coopercitrus","slug":"EX-tnt-coopercitrus","nome":"Coopercitrus","cor":"#0B6B61","paleta":["#0B6B61","#6FA331"],"logo":null,"produtos":[],"politica":"Desconto máx. 10% sem alçada.","status":"Ativo","criadoEm":"2026-03-01T12:00:00.000Z"}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- INTELIGÊNCIA · COTAÇÕES -----------------------------------
insert into sbs_mi_cotacoes (id, data) values
('EX-cot-1', '{"id":"EX-cot-1","tenant":"sbs","produto":"Soja","praca":"Sorriso/MT","preco":132.50,"anterior":134.10,"un":"R$/sc 60kg","fonte":"CEPEA/ESALQ","auto":true}'::jsonb),
('EX-cot-2', '{"id":"EX-cot-2","tenant":"sbs","produto":"Milho","praca":"Rondonópolis/MT","preco":58.20,"anterior":57.40,"un":"R$/sc 60kg","fonte":"CEPEA/ESALQ","auto":true}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- INTELIGÊNCIA · CONCORRENTES -------------------------------
insert into sbs_mi_concorrentes (id, data) values
('EX-cc-1', '{"id":"EX-cc-1","tenant":"sbs","nome":"XYZ Sementes","seg":"Sementes de soja/milho","regiao":"Sudeste","posicao":"Desafiante","forca":"Forte em milho","fraqueza":"Baixa presença em soja","monitorar":true,"mov":[{"tipo":"Lançamento","texto":"Nova cultivar de milho para o Sudeste."}]}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- INTELIGÊNCIA · MOVIMENTOS DE CONCORRENTES -----------------
insert into sbs_mi_cc_movimentos (id, data) values
('EX-ccm-1', '{"id":"EX-ccm-1","tenant":"sbs","concorrenteId":"EX-cc-1","tipo":"Lançamento","texto":"Nova cultivar de milho para o Sudeste.","fonte":"site","ref":"https://www.xyzsementes.com.br/novidades","ts":1777638600000}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- INTELIGÊNCIA · REGIÕES ------------------------------------
insert into sbs_mi_regioes (id, data) values
('EX-reg-1', '{"id":"EX-reg-1","tenant":"sbs","regiao":"Sudeste","cultura":"Soja","uf":"SP","potencial":"Alto","participacao":18,"tendencia":"alta","obs":"Forte expansão da soja no Sudeste; boa base de cooperativas."}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- INTELIGÊNCIA · TENDÊNCIAS ---------------------------------
insert into sbs_mi_tendencias (id, data) values
('EX-tnd-1', '{"id":"EX-tnd-1","tenant":"sbs","titulo":"Alta na demanda por sementes tratadas","categoria":"Mercado","impacto":"alto","horizonte":"2026","data":"Hoje","desc":"Crescimento da demanda por tratamento industrial de sementes."}'::jsonb)
on conflict (id) do update set data=excluded.data, updated_at=now();

-- ============================================================
-- Conferência rápida: quantos exemplos entraram por tabela.
-- ============================================================
select 'sbs_eventos' t, count(*) from sbs_eventos where id like 'EX-%'
union all select 'sbs_campanhas', count(*) from sbs_campanhas where id like 'EX-%'
union all select 'sbs_produtos', count(*) from sbs_produtos where id like 'EX-%'
union all select 'sbs_vendedores', count(*) from sbs_vendedores where id like 'EX-%'
union all select 'sbs_vendas', count(*) from sbs_vendas where id like 'EX-%'
union all select 'sbs_leads', count(*) from sbs_leads where id like 'EX-%'
union all select 'sbs_orcamentos', count(*) from sbs_orcamentos where id like 'EX-%'
union all select 'sbs_notificacoes', count(*) from sbs_notificacoes where id like 'EX-%'
union all select 'sbs_demandas', count(*) from sbs_demandas where id like 'EX-%'
union all select 'sbs_parceiros', count(*) from sbs_parceiros where id like 'EX-%'
union all select 'sbs_alertas', count(*) from sbs_alertas where id like 'EX-%'
union all select 'sbs_monitoramentos', count(*) from sbs_monitoramentos where id like 'EX-%'
union all select 'sbs_aprovacoes', count(*) from sbs_aprovacoes where id like 'EX-%'
union all select 'sbs_aprovacoes_hist', count(*) from sbs_aprovacoes_hist where id like 'EX-%'
union all select 'sbs_governanca', count(*) from sbs_governanca where id like 'EX-%'
union all select 'sbs_auditoria', count(*) from sbs_auditoria where id like 'EX-%'
union all select 'sbs_tenants', count(*) from sbs_tenants where id like 'EX-%'
union all select 'sbs_mi_cotacoes', count(*) from sbs_mi_cotacoes where id like 'EX-%'
union all select 'sbs_mi_concorrentes', count(*) from sbs_mi_concorrentes where id like 'EX-%'
union all select 'sbs_mi_cc_movimentos', count(*) from sbs_mi_cc_movimentos where id like 'EX-%'
union all select 'sbs_mi_regioes', count(*) from sbs_mi_regioes where id like 'EX-%'
union all select 'sbs_mi_tendencias', count(*) from sbs_mi_tendencias where id like 'EX-%';
