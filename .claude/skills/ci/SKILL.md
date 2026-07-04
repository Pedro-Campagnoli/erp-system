---
name: ci
description: Cria ou atualiza os workflows de CI do ERP (erp-backend e erp-tests). Use quando pedido para "configurar CI"/"atualizar o pipeline", ou quando uma mudança (nova env var, novo passo de setup, novo script) exigir manter os dois workflows em sincronia.
---

Mantém os pipelines de CI do ERP, que hoje vivem em dois repositórios
separados (`erp-backend` e `erp-tests`, irmãos em `erp-system/`). Sempre
releia os dois workflows existentes antes de editar — não assuma que o
que está descrito aqui ainda bate com o arquivo real.

## Arquitetura (opção escolhida: checkout cross-repo via PAT)

Os dois repos são **privados**, então o job do `erp-tests` (que precisa do
backend rodando pra testar contra ele) não consegue simplesmente clonar o
`erp-backend` com o `GITHUB_TOKEN` padrão — esse token só dá acesso ao
próprio repo onde o workflow roda. A solução adotada é a mais simples das
duas discutidas (a outra seria o `erp-backend` publicar uma imagem Docker a
cada push e o `erp-tests` consumir essa imagem — mais robusto, mas exige
infra de registry; reavaliar se o processo de build ficar pesado):

- `erp-tests/.github/workflows/e2e.yml` faz **dois checkouts**: o do próprio
  repo, e o do `erp-backend` usando um Personal Access Token guardado no
  secret `ERP_BACKEND_PAT` do repositório `erp-tests`.
- Sobe um Postgres efêmero via `services:`, instala/builda/migra/semeia o
  backend, sobe ele em background, espera `/api/health` responder, só então
  instala e roda a suíte Playwright do `erp-tests` contra ele.

## Setup manual único (fora do escopo desta skill — não automatizável)

Isso **precisa** ser feito por uma pessoa com acesso ao GitHub, nunca cole o
valor do token nesta conversa nem em nenhum arquivo do repo:

1. Criar um **fine-grained personal access token** em
   github.com/settings/tokens, escopado **só** ao repositório
   `Pedro-Campagnoli/erp-backend`, com permissão **Contents: Read-only**
   (nada além disso).
2. Em `github.com/Pedro-Campagnoli/erp-tests` → Settings → Secrets and
   variables → Actions → New repository secret, criar `ERP_BACKEND_PAT` com
   esse valor (ou rodar `gh secret set ERP_BACKEND_PAT --repo
   Pedro-Campagnoli/erp-tests` direto no terminal do usuário, nunca através
   de um comando cujo output apareça na conversa).
3. Repetir sempre que o token expirar (fine-grained tokens têm validade
   máxima configurável no momento da criação).

## `erp-backend/.github/workflows/ci.yml`

Build + lint + testes unitários do próprio backend, a cada push/PR:

- `services.postgres`: `postgres:16-alpine`, healthcheck via `pg_isready`.
- Env de CI (**não são segredos reais** — banco e processo são efêmeros por
  run, então pode hardcodear no próprio workflow): `DATABASE_URL` apontando
  pro serviço, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` com qualquer valor
  fixo, `BCRYPT_SALT_ROUNDS` baixo (ex.: 4) só em CI pra não gastar tempo de
  build à toa com hash forte.
- Passos: `pnpm install --frozen-lockfile` → `pnpm prisma:generate` →
  `pnpm prisma:deploy` (aplica migrations existentes, não gera novas) →
  `pnpm build` → `pnpm lint` → `pnpm test`.
- **Não** rodar `pnpm test:e2e` ainda — `test/jest-e2e.json` existe mas não
  tem nenhum spec (a cobertura E2E real está no repo `erp-tests`). Se algum
  dia nascer um spec ali, adicionar o passo de volta.

## `erp-tests/.github/workflows/e2e.yml`

- Mesmo serviço de Postgres.
- Checkout de `erp-tests` (path `erp-tests`) e de `erp-backend` (path
  `erp-backend`, usando `secrets.ERP_BACKEND_PAT`).
- Dentro de `erp-backend/`: instala, `prisma:generate`, `prisma:deploy`,
  `prisma:seed` (precisa do plano/permissões pra onboarding funcionar nos
  testes), `pnpm build`, sobe `node dist/src/main` em background, espera
  `/api/health` responder (loop de `curl` com timeout, não uma dependência
  nova só pra isso).
- Dentro de `erp-tests/`: instala e roda `pnpm test` (Playwright) com
  `API_BASE_URL` apontando pro backend recém-subido.
- Upload do relatório HTML do Playwright como artifact (`if: always()`,
  pra investigar falha mesmo quando o job falha).

## Ao adicionar uma env var nova no backend

Se `configuration.ts`/`env.validation.ts` passar a exigir uma variável nova
sem valor default, adicione-a também no `env:` do job do `erp-backend/ci.yml`
**e** no passo que sobe o backend em `erp-tests/e2e.yml` — os dois workflows
inicializam a app do zero e vão falhar de formas confusas (erro de validação
de env, não erro de teste) se ficarem dessincronizados.
