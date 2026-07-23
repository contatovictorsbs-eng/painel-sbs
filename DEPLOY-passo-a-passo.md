# Deploy do Painel SBS — passo a passo

Hospedagem: **Cloudflare Pages** (site + Pages Functions + Cron). Banco: **Supabase/Postgres**.
Todo deploy é automático: **você só faz Commit + Push no GitHub Desktop** e o Cloudflare reconstrói sozinho.

---

## 1. Fluxo normal (a cada mudança que eu te entregar)

1. Baixe os arquivos que eu enviar (cards de download no chat).
2. Coloque-os **na pasta local do repositório** (a mesma que o GitHub Desktop mostra), substituindo os antigos.
3. Abra o **GitHub Desktop** → confira que os arquivos aparecem em "Changes".
4. Escreva um resumo em **Summary** (ex.: "subdemandas + dia de campo").
5. Clique **Commit to main**.
6. Clique **Push origin** (canto superior direito).
7. Vá ao **Cloudflare Pages** → projeto `painel-sbs` → aba **Deployments**.
8. Aguarde o deploy do topo ficar **Success** (1–2 min). Pronto, está no ar.

> Se algum arquivo do backend (dentro de `server/` ou `functions/`) mudou, espere o **Success** antes de testar — as Functions levam alguns segundos a mais para recompilar.

---

## 2. Configuração inicial (só na primeira vez / quando trocar de máquina)

### 2.1. Variáveis de ambiente no Cloudflare
Cloudflare Pages → `painel-sbs` → **Settings → Environment variables → Production**. Devem existir:

| Variável | Para que serve |
|---|---|
| `SUPABASE_URL` | endereço do banco Supabase |
| `SUPABASE_SERVICE_KEY` | chave de acesso ao banco (secreta — só no servidor) |
| `INTEG_KEY` | chave da integração com o app SBS Brasil |
| `INTEG_URL` | endereço do Worker do SBS Brasil |
| `ANTHROPIC_API_KEY` | (se usar o Assistente IA com dados reais) |

> **Nunca** coloque essas chaves no navegador nem no código. Só aqui.
> Depois de criar/alterar uma variável, é preciso um **novo deploy** (Retry deployment) para valer.

### 2.2. Banco Supabase
- As tabelas/colunas usadas estão em `backend/schema.md`.
- Ao criar uma coleção nova, rode o SQL correspondente no Supabase (SQL Editor) antes de testar a tela.

### 2.3. Build settings (Cloudflare)
- Framework preset: **None**
- Build command: *(vazio)*
- Build output directory: **/** (raiz)
- Functions: detectadas automaticamente da pasta `functions/`

---

## 3. Como testar se o backend está no ar

Abra no navegador (troque pelo seu domínio):

```
https://painel-sbs.pages.dev/api/parceiro-indicadores
```

- `{"ok":true, ...}` → backend no ar. ✅
- `{"ok":false,"erro":"função não encontrada: ..."}` → o roteador subiu mas sem essa rota → o push não atualizou `functions/api/[[path]].js`. Refazer Commit/Push.
- **404 / página de erro** → o deploy ainda não terminou, ou a rota não existe. Ver Deployments.

Truque anti-cache: adicione `?t=123` no fim da URL para furar cache do navegador.

---

## 4. Quando o deploy "não pega" (Functions em cache)

Se você fez Push, o Cloudflare deu **Success**, mas a API ainda responde a versão antiga:

1. Cloudflare → `painel-sbs` → **Deployments**.
2. Confirme que o deploy do **topo** é o do seu commit mais recente (compare o hash/mensagem).
3. Se for antigo: **Retry deployment** no deploy mais recente.
4. Se ainda assim persistir: **Settings → Builds → Clear build cache**, depois **Retry deployment**.
5. Reteste a URL da seção 3 com `?t=` novo.

---

## 5. Segurança (LGPD) — pendências suas

1. **Repositório privado**: GitHub → repo `painel-sbs` → **Settings → General → Danger Zone → Change visibility → Private**.
2. **Conferir se alguma chave vazou no histórico**: no terminal, dentro da pasta do repo:
   ```
   git log -S SUPABASE_SERVICE_KEY --oneline
   git log -S INTEG_KEY --oneline
   ```
   Se retornar algum commit, a chave já esteve no código → **rotacione** essa chave (gere nova no Supabase/Worker e atualize a variável de ambiente no Cloudflare).
3. Login por perfil deve estar ativo antes de publicar com dados reais de clientes/vendedores (CNPJ, contato).

---

## 6. Checklist rápido de cada entrega

- [ ] Arquivos na pasta local do repo
- [ ] Commit to main + Push origin
- [ ] Cloudflare Deployments = **Success** (commit certo no topo)
- [ ] Testar `/api/...` da funcionalidade nova (`ok:true`)
- [ ] Se mudou banco: rodar SQL no Supabase
- [ ] Abrir o site e conferir a tela
