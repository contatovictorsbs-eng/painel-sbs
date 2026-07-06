# Arquitetura Multi-Parceiro (Multi-Tenant) — SBS Green Seeds

Como a plataforma escala para **muitas parceiras** (Coopercitrus, Coamo, Lar…) sem
duplicar código nem infra, seguindo boas práticas.

---

## 1. Modelo escolhido: banco único, schema único, isolamento por linha

| Modelo | Custo | Isolamento | Escala | Escolhido |
|---|---|---|---|---|
| 1 banco por parceira | alto | máximo | ruim (N bancos) | ✗ |
| 1 schema por parceira | médio | alto | limitado | ✗ |
| **1 banco/schema, coluna `tenant`** | baixo | por linha | ótimo (N ilimitado) | ✓ |

Cada linha de dado operacional carrega um campo **`tenant`** (o *slug* da parceira,
ex.: `coopercitrus`). A **SBS** é o **super-tenant `sbs`**, que enxerga todas as
parceiras (visão consolidada para CEO / Marketing / Inteligência).

Provisionar uma nova parceira = **inserir 1 registro** em `tenants`. Sem deploy,
sem tabela nova, sem branch. É isso que dá escala.

---

## 2. De onde vem o `tenant` (regra de ouro)

O `tenant` vem **sempre do token** de quem chama (`functions/auth.js` grava o tenant
no token no login). **Nunca** do corpo do request — assim um usuário de uma parceira
não consegue ler/escrever dados de outra, mesmo forjando o payload.

```
login → token { sub, perfil, nome, tenant }   (HMAC, 12h)
request → Authorization: Bearer <token>
função  → tenantFromEvent(event) → store escopado a esse tenant
```

- Usuário interno SBS → `tenant: 'sbs'` (super, vê tudo).
- Usuário de parceira → `tenant: '<slug>'` (isolado).

---

## 3. Camada de dados escopada (`_lib/store.js`)

`tenantStore(tenant)` devolve o mesmo CRUD, já preso ao tenant:

- `list`  → parceira: filtra `tenant = <slug>`; super: retorna tudo.
- `get`   → devolve `null` se a linha for de outra parceira.
- `put`   → **carimba** `tenant` no registro (não dá para gravar “no nome de outra”).
- `remove`→ recusa apagar linha de outra parceira.

As funções de rota (vendas, leads, orçamentos, vendedores) usam
`const db = tenantStore(tenantFromEvent(event))` e chamam `db.list/get/put/remove`.

Defesa em profundidade no banco: índices por `data->>'tenant'` e RLS habilitada
(o acesso é via *service key* nas Functions; se um dia expor o cliente Supabase
direto ao navegador, criar policies por claim de tenant).

---

## 4. White-label por parceira (`functions/tenants.js`)

Cada parceira tem um registro com a sua identidade e regras:

```
{ slug, nome, cor, paleta[], logo, produtos[], politica, status }
```

- **App do vendedor** carrega a marca por `GET /tenants?slug=coamo` (público, só marca).
- **Deep-link** `#app-<slug>` abre o app já com logo + paleta da parceira.
- **Produtos** e **política de venda/desconto** por parceira saem daqui.
- Criar/editar: restrito a **admin/TI**. Excluir = **soft delete** (`status: Inativo`)
  para preservar histórico e atender LGPD.

---

## 5. Papéis × alcance

| Papel | Alcance |
|---|---|
| Admin master / TI | todas as parceiras + provisionamento |
| CEO / Marketing / Inteligência (SBS) | consolidado de todas (super-tenant) |
| Gerente / vendedor de parceira | só a sua parceira (tenant isolado) |

---

## 6. Checklist para uma nova parceira (sem deploy)

1. `POST /tenants` com `{ nome, cor, paleta, logo, produtos, politica }` (admin/TI).
2. Criar usuários da parceira em `USERS_JSON` com o campo `tenant: '<slug>'`.
3. Compartilhar o link `…/#app-<slug>` (aba **Compartilhar app** já gera por parceira).
4. Pronto: dados da parceira nascem isolados; a SBS vê no consolidado.

---

## 7. Boas práticas aplicadas

- **Stateless auth** (HMAC), sem sessão em banco → escala horizontal trivial.
- **Paginação** em todas as listas (`?limite=&pagina=`, cap 500) + ordenação no banco → suporta 1000+ usuários sem varrer a coleção.
- **Índices** GIN em `data` e por `tenant`/`status`/`ts` → filtros rápidos em volume.
- **Idempotência** de escrita por `id` (upsert), evita duplicidade em retry.
- **Contrato único** `{ ok, data }` / `{ ok, erro }` em todas as funções.
- **Fonte única da verdade** (`backend/manifest.js`) → docs e arquitetura sempre atuais.
- **Troca de banco sem tocar rotas** (Blobs ↔ Supabase pela mesma interface).
- **Segredos só em env** (nunca no navegador); logo em storage em produção.
