# Contrato de integração — Indicadores da equipe de campo
**De:** Plataforma SBS Green Seeds (painel de gestão)
**Para:** SBS Brasil (Painel Nacional do vendedor / Worker de integração)
**Assunto:** endpoint que o painel de gestão precisa consumir para exibir os indicadores de carteira e prospecção dentro da aba *Resultados das ações*.

---

## 1. O que o painel precisa
O painel de gestão (Gerente Nacional + Inteligência de Mercado) vai exibir, no topo da aba **Resultados das ações**, um bloco chamado **"Painel do vendedor · prospecção"** com os indicadores da equipe de campo do SBS Brasil.

Hoje o painel já chama vocês por proxy seguro. Falta o SBS Brasil **expor um endpoint** que devolva esses números. É só leitura — o painel nunca grava nada aí.

## 2. Endpoint solicitado
```
GET  <SBS_BRASIL_URL>/api/integ/indicadores?key=<INTEG_KEY>
```
- **Método:** GET
- **Autenticação:** a mesma chave já usada no endpoint de localizações — `?key=<INTEG_KEY>`. Rejeitar (401/403) se a chave não bater.
- **CORS:** não é necessário liberar para o navegador — a chamada é servidor→servidor (proxy). Só precisa responder à origem do backend do painel.
- **Já existe um endpoint irmão:** `GET /api/integ/localizacoes?key=…`. Este novo segue o mesmo padrão de rota e de chave.

## 3. Resposta esperada (JSON)
```json
{
  "ok": true,
  "indicadores": {
    "estados": 4,
    "clientes": 561,
    "prospects": 645,
    "rotas": 3,
    "agendadas": 3,
    "validadas": 1,
    "cotacoes": 7,
    "vendasRS": 0
  }
}
```

### Campos
| campo       | tipo   | significado                                              |
|-------------|--------|----------------------------------------------------------|
| `estados`   | número | Estados (UFs) com equipe/atividade ativa                 |
| `clientes`  | número | Clientes na carteira                                     |
| `prospects` | número | Prospects (prospecção em andamento)                      |
| `rotas`     | número | Rotas / visitas planejadas                               |
| `agendadas` | número | Visitas agendadas                                        |
| `validadas` | número | Rotas validadas                                          |
| `cotacoes`  | número | Cotações abertas pela equipe de campo                    |
| `vendasRS`  | número | Vendas em reais (valor bruto, número puro — sem "R$")    |

**Observações:**
- Todos os valores são **números** (inteiros; `vendasRS` pode ter centavos). Não enviar como texto formatado.
- Se um indicador ainda não existir do lado de vocês, envie `0` — o painel exibe 0 sem quebrar.
- O painel também aceita nomes alternativos para tolerância (`estadosAtivos`, `prospeccao`, `rotasVisitas`, `visitasAgendadas`, `rotasValidadas`, `vendas`/`faturamento`), mas **o ideal é usar os nomes da tabela acima**.
- Envelope: o painel aceita `{ ok, indicadores:{…} }` ou `{ data:{…} }` ou o objeto direto. Prefira `{ ok:true, indicadores:{…} }`.

## 4. Como o painel trata a resposta
- **Sucesso** → mostra os números com selo **"TEMPO REAL"**.
- **Sem chave / endpoint indisponível / erro** → o painel **não quebra**: cai automaticamente no modo **"DEMONSTRAÇÃO"** com valores de exemplo.
- Nenhum dado pessoal (CNPJ, nome de cliente, contato) é necessário neste endpoint — **apenas os totais agregados** acima. Por favor não incluir dados pessoais aqui (LGPD).

## 5. Como testar
```bash
curl "https://SEU-WORKER.exemplo/api/integ/indicadores?key=CHAVE_DE_TESTE"
```
Deve retornar o JSON da seção 3. Quando estiver no ar, me avise a URL base e eu confirmo o proxy do painel apontando para ela.

---
*Contrato definido pelo painel SBS Green Seeds. Endpoint consumido por `server/parceiro-indicadores.js` (proxy) → rota `/api/parceiro-indicadores`.*
