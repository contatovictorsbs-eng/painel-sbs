# Materiais de mídia no App (vendedores e supervisores)
### Orientação de integração — lado **SBS Brasil / App**

O Painel (Marketing e Gerente Nacional) tem o módulo **Arquivos & mídia**, onde a equipe
publica imagens e documentos (materiais de campanha, guias, tabelas). Precisamos que esses
materiais apareçam **no app dos vendedores e supervisores**, para eles **baixarem** e
**compartilharem no WhatsApp**.

Os dois sistemas usam o **mesmo banco Supabase**, então não é preciso sincronizar nada:
basta **ler a coleção de materiais** e filtrar pela audiência do usuário logado.

---

## 1. De onde vêm os materiais

Coleção/tabela: **`sbs_biblioteca`** (mesma base compartilhada).

Cada linha (campo `data` em JSON) tem:

| Campo       | Tipo   | Descrição |
|-------------|--------|-----------|
| `id`        | texto  | id único do material |
| `titulo`    | texto  | nome exibido |
| `tipo`      | texto  | extensão/mime: `png`, `jpg`, `pdf`, `xlsx`, `pptx`, `mp4`… |
| `categoria` | texto  | `Imagem`, `Documento`, `Apresentação`, `Planilha`, `Material técnico`, `Vídeo` |
| `audiencia` | texto  | **`Todos`** \| **`Gerentes regionais`** \| **`Supervisores`** |
| `dataUrl`   | texto  | conteúdo em base64 (data URL) — MVP |
| `url`       | texto  | URL do arquivo (quando migrado para storage) — pode vir `null` |
| `tamanho`   | número | bytes |
| `criadoPor` | texto  | quem publicou |
| `criadoEm`  | ISO    | data de publicação |

> **Preferir `url` quando existir**; senão usar `dataUrl`. Para vídeos/arquivos grandes,
> o ideal é migrar para storage (ver seção 4).

---

## 2. Como ler (duas opções — escolha a mais simples aí)

**Opção A — ler a tabela direto (recomendado, tempo real):**
como o App já usa o mesmo Supabase, faça um `select` de `sbs_biblioteca` e ordene por
`criadoEm desc`.

**Opção B — chamar o endpoint do Painel:**
```
GET https://painel-sbs.pages.dev/api/biblioteca?audiencia=Supervisores
→ { ok:true, data:[ {id,titulo,tipo,categoria,audiencia,dataUrl|url,tamanho,criadoPor,criadoEm}, ... ] }
```
O filtro `audiencia` já devolve **os itens daquela audiência + os marcados como `Todos`**.

---

## 3. Regra de audiência (quem vê o quê)

Mapeie o papel do usuário logado no app para a audiência:

| Papel no app                    | Audiência a buscar   |
|---------------------------------|----------------------|
| Vendedor                        | `Todos`              |
| Supervisor                      | `Supervisores`       |
| Gerente regional                | `Gerentes regionais` |

Sempre inclua também os itens `audiencia === 'Todos'`.
(O endpoint da Opção B já faz essa união; na Opção A, filtre por
`audiencia === papel || audiencia === 'Todos'`.)

---

## 4. Tela no App (o que construir)

Uma aba **“Materiais”** com uma grade de cards:

- **Miniatura**: se `tipo` for imagem, mostra a imagem (`url`/`dataUrl`); senão, um ícone por tipo.
- **Título**, categoria e tamanho.
- Botão **Baixar** — salva o arquivo no dispositivo (`<a download>` com a `url`/`dataUrl`).
- Botão **Compartilhar no WhatsApp**:
  - **Imagem/arquivo (melhor experiência):** usar a **Web Share API**
    ```js
    const blob = await (await fetch(url || dataUrl)).blob();
    const file = new File([blob], titulo + '.' + tipo, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files:[file] })) {
      await navigator.share({ files:[file], text: titulo + ' — SBS Green Seeds' });
    } else {
      // fallback: abre o WhatsApp com a legenda (o usuário anexa o arquivo baixado)
      window.open('https://wa.me/?text=' + encodeURIComponent(titulo + ' — SBS Green Seeds'), '_blank');
    }
    ```
  - Em navegador de desktop sem Web Share, cair no fallback `wa.me`.

> **Dica de UX:** oferecer “Baixar” e “WhatsApp” lado a lado. No celular (Android/iOS),
> o `navigator.share` com arquivo abre a folha nativa (inclui WhatsApp) e já anexa a imagem.

---

## 5. Produção — arquivos grandes já resolvidos (Supabase Storage)

O Painel **já sobe os arquivos para o Supabase Storage** (bucket público **`materiais`**,
criado automaticamente) e grava a **`url` pública** na linha de `sbs_biblioteca`. O `dataUrl`
(base64) só aparece como **fallback** quando o storage não está configurado.

**No app, prefira sempre `url`** (mais leve, cacheável, ideal para download/compartilhamento);
use `dataUrl` apenas se `url` vier vazio. Assim vídeos e PDFs grandes funcionam sem pesar.

Nada a configurar do seu lado — o bucket é público, então a `url` abre direto.

---

## 6. Resumo do que precisamos de você (App)

1. Ler `sbs_biblioteca` (ou `GET /api/biblioteca?audiencia=…`).
2. Filtrar pela audiência do papel logado (+ `Todos`).
3. Renderizar a grade de materiais com **Baixar** e **Compartilhar no WhatsApp**.
4. (Opcional/produção) suportar `url` de storage além de `dataUrl`.

Qualquer dúvida no contrato, o documento-mãe é `contrato-integracao.md`. Só me chamar.
