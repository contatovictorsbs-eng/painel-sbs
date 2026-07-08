-- ============================================================
-- SBS Green Seeds — Schema Supabase/Postgres
-- Modelo do store.js: cada coleção é a tabela sbs_<nome> com
--   id text PK, data jsonb (o item inteiro), updated_at timestamptz.
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
-- Depois defina SUPABASE_URL e SUPABASE_SERVICE_KEY nas Environment
-- variables do Cloudflare Pages (Settings → Environment variables).
-- ============================================================

-- Função utilitária: cria a tabela padrão + índices se não existir.
create or replace function sbs_criar_colecao(nome text) returns void as $$
begin
  execute format($f$
    create table if not exists %I (
      id         text primary key,
      data       jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
    create index if not exists %I on %I using gin (data);
    create index if not exists %I on %I ((data->>'tenant'));
  $f$, 'sbs_'||nome, 'ix_'||nome||'_data', 'sbs_'||nome, 'ix_'||nome||'_tenant', 'sbs_'||nome);
end;
$$ language plpgsql;

-- Coleções da plataforma (mesma lista do backend/schema.md).
select sbs_criar_colecao(n) from unnest(array[
  'usuarios','tenants','auditoria',
  'vendedores','vendas','eventos','leads','orcamentos',
  'produtos','campanhas','notificacoes','demandas','parceiros','alertas',
  'monitoramentos','aprovacoes','aprovacoes_hist','governanca',
  'mi_cotacoes','mi_concorrentes','mi_cc_movimentos','mi_regioes','mi_tendencias'
]) as n;

-- ------------------------------------------------------------
-- Segurança: as Cloudflare Pages Functions usam a SERVICE_KEY (bypassa RLS).
-- Mantemos RLS LIGADO e SEM políticas públicas → nenhum acesso
-- anônimo direto ao banco; todo tráfego passa pelas funções (que já
-- validam token + tenant). Ative o RLS em cada tabela:
-- ------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname='public' and tablename like 'sbs_%'
  loop
    execute format('alter table %I enable row level security;', t.tablename);
  end loop;
end $$;

-- Pronto. O primeiro login semeia sbs_usuarios automaticamente
-- (equipe SBS ou USERS_JSON), com senha inicial e precisaTrocar=true.
