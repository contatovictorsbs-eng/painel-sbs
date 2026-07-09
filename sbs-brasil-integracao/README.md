# Pacote de Integração — para colar no projeto **SBS Brasil**

Este pacote liga o **SBS Brasil** ao **Painel SBS** pelo mesmo banco Supabase.
Depois disso, os dois sistemas trocam dados em tempo real pela tabela `sbs_integracao`.

## Passo a passo

### 1. Variáveis de ambiente (Cloudflare → projeto SBS Brasil → Settings → Environment variables)
Use exatamente as MESMAS do Painel SBS:
- `SUPABASE_URL`  = (mesma URL do Supabase do Painel)
- `SUPABASE_SERVICE_KEY` = (mesma service key)

> É isso que faz os dois sistemas "enxergarem" os mesmos dados.

### 2. Tabela no Supabase
Se ainda não rodou, execute no **SQL Editor** do Supabase:

```sql
create table if not exists sbs_integracao (
  id   text primary key,
  data jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
alter table sbs_integracao enable row level security;
```

(No Painel SBS isso já está no `backend/supabase-schema.sql`.)

### 3. A rota
Copie **`api-integracao.js`** para o projeto SBS Brasil:
- **Se for Cloudflare Pages:** salve como `functions/api/integracao.js`.
- **Se for Worker:** use o bloco comentado no fim do arquivo (`export default { fetch }`)
  e roteie `/api/integracao` para ele.

### 4. Publicar dados do SBS Brasil
Sempre que o SBS Brasil gerar algo que o Painel deva ver (uma venda, um vendedor…):

```js
fetch('/api/integracao', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({
    sistema:'sbs-brasil',
    tipo:'vendas',                     // vendas | vendedores | clientes | campanhas | pedidos | produtos | eventos | (livre)
    ref:'V-8842',
    titulo:'Venda — Fazenda Santa Clara',
    resumo:'R$ 148.500 · Soja · MT',
    payload:{ /* todos os campos do registro */ }
  })
});
```

### 5. Ver o que veio do Painel SBS
```js
fetch('/api/integracao?de=painel-sbs')       // tudo do Painel
fetch('/api/integracao?de=painel-sbs&tipo=campanhas')
```

## Pronto
- Painel SBS → SBS Brasil: o Painel já tem o módulo **Integração SBS Brasil** que publica com `sistema:'painel-sbs'`.
- SBS Brasil → Painel SBS: com esta rota, o SBS Brasil publica com `sistema:'sbs-brasil'` e aparece no Painel automaticamente.

O contrato completo (campos, regras de evolução) está em `backend/contrato-integracao.md` do Painel SBS — mantenha uma cópia aqui também.
