-- ============================================================
-- SBS — Criar as tabelas que faltaram (rodar UMA vez no SQL Editor do Supabase)
-- Corrige os erros do autoteste: "Supabase list 404" / "Could not find the table
-- 'public.sbs_integracao'..." nas rotas integracao, biblioteca e canais.
-- É seguro rodar mesmo que alguma já exista (usa IF NOT EXISTS).
-- ============================================================

-- Garante a função utilitária (caso o schema completo não tenha sido rodado ainda).
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

-- Cria as 3 que faltaram.
select sbs_criar_colecao(n) from unnest(array[
  'integracao','biblioteca','canais'
]) as n;

-- Liga RLS nelas (sem políticas públicas: só as Functions com service key acessam).
alter table sbs_integracao enable row level security;
alter table sbs_biblioteca enable row level security;
alter table sbs_canais     enable row level security;

-- Pronto. Depois rode o autoteste de novo: integracao, biblioteca e canais devem dar 200.
