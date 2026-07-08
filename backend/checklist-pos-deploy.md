# Checklist de validação pós-deploy (Cloudflare Pages)

Rode esta lista **depois** do deploy + `nodejs_compat` + variáveis de ambiente.
Marque cada item. Se algo falhar, veja "Se der erro" no fim.

Substitua `SEU-SITE` pela URL real (ex.: `painel-sbs.pages.dev`).

---

## A. O site abre
- [ ] `https://SEU-SITE/` abre o painel (tela de login SBS).
- [ ] Console do navegador (F12) sem erro vermelho ao carregar.

## B. As funções respondem (teste rápido pela URL)
Abra cada link numa aba. Deve retornar **JSON** (não erro 404/500):
- [ ] `https://SEU-SITE/api/vendedores` → `{"ok":true,"data":...}`
- [ ] `https://SEU-SITE/api/eventos` → JSON
- [ ] `https://SEU-SITE/api/campanhas` → JSON

> Se aqui vier JSON, o roteador + Supabase estão de pé.

## C. Login (valida o nodejs_compat + AUTH_SECRET)
- [ ] Entrar com um usuário real (ou demo `admin` / `12345678` em staging).
- [ ] Entrou no painel sem "erro de servidor" → **HMAC/crypto OK** (nodejs_compat ativo).
- [ ] Recarregar a página mantém logado (token salvo).

## D. Gravação real no banco (o teste que mais importa)
Para cada ação abaixo, faça no app/painel e confira no **Supabase → Table Editor**:

| Ação no sistema | Onde fazer | Confirme em (tabela) |
|---|---|---|
| [ ] Cadastrar vendedor | App de Eventos → Cadastro | `sbs_vendedores` |
| [ ] Registrar venda | App → Vender | `sbs_vendas` |
| [ ] Capturar lead | App → Leads | `sbs_leads` |
| [ ] Abrir orçamento | App → Orçam. | `sbs_orcamentos` |
| [ ] Criar evento | Marketing → Eventos | `sbs_eventos` |
| [ ] Criar campanha | Gerente → Campanhas | `sbs_campanhas` |
| [ ] Criar produto | Gerente → Produtos | `sbs_produtos` |
| [ ] Enviar notificação | Marketing → Notificações | `sbs_notificacoes` |

- [ ] Cada registro aparece na sua tabela no Supabase (com o campo `tenant`).

## E. Fluxos ponta a ponta
- [ ] Vendedor cadastrado no app **aparece** em Gerente → Vendedores.
- [ ] Orçamento aberto no app **aparece** em Gerente → Orçamentos & descontos (aprovar/recusar).
- [ ] Evento criado **aparece** na Agenda dos outros perfis.
- [ ] Mudar o "status do app" de um evento persiste ao recarregar.

## F. Assistente IA (Groq)
- [ ] Perguntar algo em Marketing → Assistente IA.
- [ ] Resposta real (não começa com "modo demonstração") → `GROQ_API_KEY` OK.
- [ ] A resposta cita números do painel (eventos/orçamentos/leads).

## G. LGPD / auditoria
- [ ] Painel de TI → Auditoria mostra os registros das ações acima (quem/o quê/quando).
- [ ] `Supabase → sbs_auditoria` tem as linhas correspondentes.

## H. Segurança
- [ ] `https://SEU-SITE/server/auth.js` **não** abre o código (deve dar 404/redirect).
- [ ] `https://SEU-SITE/backend/manifest.js` idem.

---

## Se der erro
- **500 / "erro de servidor" no login** → falta a flag **`nodejs_compat`** (Settings → Functions → Compatibility flags, em Production **e** Preview) ou o `AUTH_SECRET`. Reative e faça Retry deployment.
- **Funções retornam 404** → confira que o **Build output directory = `.`** e que a pasta `functions/` foi enviada ao GitHub.
- **JSON com `ok:false` de banco / dados não gravam** → `SUPABASE_URL` ou `SUPABASE_SERVICE_KEY` ausentes/errados, ou o `supabase-schema.sql` não foi rodado. Rode o SQL e refaça o deploy.
- **Assistente fica em "modo demonstração"** → falta `GROQ_API_KEY` (ou não houve Retry deployment após adicioná-la).
- **Qualquer outro** → copie o erro em **Cloudflare → seu projeto → Deployments → (deploy) → Functions log** e me envie.
