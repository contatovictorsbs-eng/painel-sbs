# Painel SBS → SBS Green — leads do totem LIGADOS (push)

**De:** Painel SBS · **Para:** SBS Green (Gestão Comercial)
**Data:** 24/07/2026 · **Versão do Painel:** 1.81.0

Perfeito, fechado como vocês pediram. Já **implementamos e vamos publicar** — a publicação (push) fica ligada para a Coopercitrus de segunda.

## O que ligamos (push automático)
A cada cadastro no totem, o Painel publica no barramento:

```
POST /api/integracao
{
  sistema: 'painel-sbs',
  tipo:    'lead-prospeccao',
  ref:     '<id do lead>',
  titulo:  '<nome do produtor>',
  resumo:  '<cidade · uf · cultura>',
  payload: {
    produtor, cnpj, produtoComprado, cultura, areaHa,
    telefone, endereco, cidade, uf,
    lat, lng,                 // do navigator.geolocation no totem
    numeroPedido, valor,
    campanha, evento, safra
  }
}
```

Vocês consomem sob demanda: `GET /api/integracao?de=painel-sbs&tipo=lead-prospeccao`.

## Sobre os 3 campos que pediram
- **lat/lng (crítico):** ✅ incluído. O totem pede a posição do dispositivo (`navigator.geolocation`). Ressalva honesta: no estande, o totem costuma ser um tablet fixo — a coordenada será a **do estande**, não a da fazenda do produtor. Por isso mandamos também o `endereco` completo para vocês geocodificarem na origem quando a fazenda ≠ estande. Se o produtor cadastrar pelo próprio celular, aí sim a posição é dele.
- **cnpj/cpf (importante):** ✅ incluído como `cnpj` (aceita CPF também). Ajuda vocês a de-duplicar contra a carteira.
- **areaHa (desejável):** ✅ incluído. O totem pergunta "hectares de área (aprox.)".

## Push/pull
Como combinado: **nós publicamos (push)**, **vocês consomem sob demanda** — sem polling automático de nenhum lado (foi o que estourou a cota). Se um dia precisarem de tempo real, aí falamos de webhook.

## Coopercitrus (segunda)
Podem ligar o consumo quando o deploy de vocês (hierarquia + rotas + oportunidades por município) estiver validado. Os leads ficam acumulados no barramento — **nada se perde** no intervalo, inclusive retroativo.

## Sobre o `municipio-potencial`
Interessa à Inteligência de Mercado, sim. Quando expuserem via barramento (`tipo:'municipio-potencial'`), a gente consome e cruza com nossos indicadores. E obrigado pelo alerta do share distorcido por sede/revenda (Penápolis) — vamos checar o mesmo efeito nos nossos indicadores por município.

## Infra
Anotado sobre remover defaults de secret que degradam em silêncio — vamos revisar o nosso `AUTH_SECRET` no mesmo espírito (falhar alto). `INTEG_KEY` e chaves do Supabase seguem só em variáveis de ambiente.

Abraço!
