# Briefing de Integração — para o assistente do **SBS Brasil**

> Documento de handoff. Objetivo: preparar o sistema **SBS Brasil — Gestão Comercial**
> (`nameless-wood-...workers.dev`) para trocar dados com o **Painel SBS — Marketing/Gestão**
> (`painel-sbs.pages.dev`). Leia inteiro antes de codar. Nada aqui exige mudar o que já existe
> no SBS Brasil — é só ADICIONAR uma rota e publicar/ler dados.

---

## 1. Visão geral da arquitetura

- Os dois sistemas rodam na **Cloudflare** e vão usar o **MESMO banco Supabase**.
- A integração NÃO é sistema-chama-sistema. É via **banco compartilhado**: existe uma
  tabela `sbs_integracao` que funciona como um **barramento**. Um sistema grava, o outro lê.
- Cada registro é um **envelope genérico** com um campo `payload` (JSON livre). Assim,
  qualquer funcionalidade nova troca dados **sem alterar o schema**.

```
  SBS Brasil  ──POST /api/integracao (sistema:'sbs-brasil')──►  [ sbs_integracao ]  ◄──── lê o Painel
  Painel SBS  ──POST /api/integracao (sistema:'painel-sbs')──►  [ sbs_integracao ]  ◄──── lê o SBS Brasil
```

---

## 2. O que o SBS Brasil precisa fazer (checklist)

1. **Variáveis de ambiente** no projeto Cloudflare do SBS Brasil — as MESMAS do Painel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   > Sem isso os dois não compartilham dados. Confirme com o dono do Painel que são idênticas.

2. **Tabela** no Supabase (rode uma vez no SQL Editor):
   ```sql
   create table if not exists sbs_integracao (
     id text primary key,
     data jsonb not null default '{}'::jsonb,
     criado_em timestamptz not null default now()
   );
   alter table sbs_integracao enable row level security;
   ```

3. **Rota `/api/integracao`** (GET/POST/DELETE) — código pronto no arquivo
   `api-integracao.js` (entregue junto). Pages → `functions/api/integracao.js`.
   Worker → usar o `export default { fetch }` no fim do arquivo.

4. **Publicar** os dados do SBS Brasil no barramento (ver §4).

5. **Ler/visualizar** o que vem do Painel (ver §5).

---

## 3. Contrato da coleção `sbs_integracao`

| campo     | tipo     | descrição |
|-----------|----------|-----------|
| id        | string   | id do envelope (gerado) |
| sistema   | string   | ORIGEM: `'sbs-brasil'` ou `'painel-sbs'` |
| tipo      | string   | `vendas` · `vendedores` · `clientes` · `campanhas` · `pedidos` · `produtos` · `eventos` · (livre) |
| ref       | string   | id do registro no sistema de origem |
| titulo    | string   | rótulo curto |
| resumo    | string   | uma linha |
| payload   | json     | **todos** os campos do registro (livre) |
| criadoEm  | ISO date | data/hora |
| criadoPor | string   | quem gerou |

---

## 4. Como o SBS Brasil PUBLICA um dado

```js
await fetch('/api/integracao', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sistema: 'sbs-brasil',
    tipo: 'vendas',
    ref: 'V-8842',
    titulo: 'Venda — Fazenda Santa Clara',
    resumo: 'R$ 148.500 · Soja · MT',
    payload: {
      cliente: 'Fazenda Santa Clara', cnpj: '12.345.678/0001-90', uf: 'MT',
      produto: 'Soja SBS 8579 IPRO', qtd: 250, valor: 148500, consultor: 'Marcos Lima'
    }
  })
});
```

Faça isso nos pontos de criação/edição que interessam ao Painel: **venda registrada,
vendedor cadastrado, cliente/lead novo, pedido, produto, evento**. Um `POST` por registro.

### Sugestão de payload por tipo (alinhe com o time do Painel)
- **vendas**: `{cliente, cnpj, uf, produto, qtd, valor, consultor, data}`
- **vendedores**: `{nome, email, telefone, regiao, estados[], vendasMes, faturamento}`
- **clientes**: `{nome, cnpj, tipo, uf, potencial, ultimaCompra}`
- **pedidos**: `{cliente, valor, itens, status, uf}`
- **produtos**: `{nome, cultura, saco, preco}`
- **eventos**: `{nome, cidade, uf, dataInicio, dataFim}`
- **campanhas**: `{nome, periodo, canal, meta}`

> LGPD: dados pessoais (CNPJ, contato) trafegam só entre os sistemas internos.
> Não expor em telas públicas; acesso por perfil.

---

## 5. Como o SBS Brasil LÊ o que veio do Painel

```js
// tudo que o Painel publicou:
const r = await fetch('/api/integracao?de=painel-sbs');
const { data } = await r.json();

// filtrando por tipo:
await fetch('/api/integracao?de=painel-sbs&tipo=campanhas');
```

Monte uma tela "Integração / Painel SBS" que liste esses registros e mostre o `payload`
(igual ao que o Painel já faz do lado dele).

---

## 6. Fluxo de trabalho entre os dois projetos (importante)

Como são **repositórios/deploys separados**:

1. Toda troca nova começa definindo **`tipo` + campos do `payload`** — anote no contrato
   (`contrato-integracao.md`) e mantenha cópia idêntica nos dois repositórios.
2. Quem **produz** o dado publica o envelope. Quem **consome** adiciona a leitura/visualização.
3. Mudanças no `payload` são **sempre aditivas**: nunca renomear/remover um campo já em uso
   sem uma migração combinada — os dois sobem deploy em momentos diferentes.
4. Versione o contrato (ex.: no topo do arquivo) e avise a outra ponta quando mudar.

---

## 7. Perguntas para alinhar com o time do Painel SBS

1. `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — confirmam que são as mesmas nos dois projetos?
2. Quais **tipos** o SBS Brasil vai publicar primeiro? (sugestão: `vendas` e `vendedores`)
3. Formato final do `payload` de cada tipo (usar §4 como ponto de partida).
4. Multi-tenant: os dados são por parceiro (`tenant`)? Se sim, combinar como preencher.

Arquivos entregues junto: **`api-integracao.js`** (rota pronta) e este briefing.
Do lado do Painel, o contrato-fonte é `backend/contrato-integracao.md`.
