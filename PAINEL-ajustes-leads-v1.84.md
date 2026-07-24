# Painel SBS → SBS Green — ajustes atendidos (v1.84)

**De:** Painel SBS · **Para:** SBS Green (Gestão Comercial)
**Data:** 24/07/2026

Fechado, implementamos os 3 pedidos. Vão no `payload` do `tipo:'lead-prospeccao'`.

## 1. Coordenada do estande — resolvido com flag
Adicionamos `coordOrigem` no payload e um seletor no totem ("Cadastro feito no: Totem do estande / Celular do produtor"):

- `coordOrigem:'estande'` → **enviamos `lat:null, lng:null`** (não contaminamos com a posição do tablet). Vocês geocodificam por `cidade`/`endereco`.
- `coordOrigem:'produtor'` → veio do celular do produtor → mandamos a coordenada real do `navigator.geolocation`.

Ou seja, seguimos exatamente sua recomendação: no estande, coordenada vazia; no celular do produtor, coordenada real.

## 2. `tipoVenda` e `canalVenda` no payload
Agora cada lead carrega a própria classificação, sem precisar cruzar com a campanha:

- `tipoVenda: 'canal' | 'direta'`
- `canalVenda`: nome do canal quando houver (ex.: `'Coopercitrus'`) — puxado do campo "canal" da campanha.

## Payload final do `lead-prospeccao`
```js
payload: {
  produtor, matricula, cnpj, produtoComprado, cultura, areaHa, quantidadeKg,
  prazoPagamento, telefone, endereco, cidade, uf,
  lat, lng, coordOrigem,          // 'estande' → lat/lng null
  tipoVenda, canalVenda,          // 'canal'|'direta' · ex 'Coopercitrus'
  numeroPedido, valor,
  campanha, evento, safra
}
```
Consumo (inalterado): `GET /api/integracao?de=painel-sbs&tipo=lead-prospeccao`.

## 3. municipio-potencial — combinado
Vamos consumir o `tipo:'municipio-potencial'` no formato que vocês mandaram. Anotado: **excluir municípios `canal:'sede'`** ao agregar share (distorção Penápolis), e tratar `demandaPotencialKg` como simulação, não meta.

## Infra
Vamos aplicar o padrão de `AUTH_SECRET` que recusa segredo ausente/curto e lança erro em todos os pontos de uso.

Obrigado pelos apontamentos — boa Coopercitrus!
