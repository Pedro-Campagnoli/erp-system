# ERP Backend

API multi-tenant para um sistema ERP (empresas, lojas, usuários, permissões),
construída com NestJS, PostgreSQL e Prisma. Serve como base para os módulos
de negócio (fiscal, financeiro, inventário) que serão adicionados a seguir.

## Arquitetura

- **Multi-tenant por Empresa**: cada `Empresa` é um tenant. `Loja` pertence a
  uma `Empresa`; `Usuario` pertence a uma `Empresa` e pode ter acesso a uma ou
  mais `Loja`s da mesma empresa através de `UsuarioLoja` (com um `Papel` por
  vínculo).
- **RBAC por Papel/Permissão**: `Permissao` é um catálogo global de códigos
  (ex.: `fiscal.nfe.emitir`). `Papel` agrupa permissões e pode ser global
  (padrão do sistema) ou específico de uma empresa. O guard `@Permissions()`
  valida essas permissões nas rotas.
- **Admin de plataforma vs. admin de empresa**: `Usuario.superAdmin` é
  reservado para a equipe interna (administração da plataforma — todas as
  empresas clientes, planos globais); rotas assim são protegidas por
  `SuperAdminGuard`, não pelo sistema de permissões por tenant. O onboarding
  público (`POST /empresas`) nunca concede `superAdmin`, nem permissões de
  módulo `ADMIN`, ao admin criado para a empresa — ver `MODULOS_PLATAFORMA`
  em `src/common/constants/permissions.constant.ts` e
  `src/empresas/tenant-onboarding.ts`.
- **Isolamento de loja**: o header `x-loja-id` define a loja de contexto de
  uma requisição; o `LojaAccessGuard` garante que o usuário autenticado tem
  acesso a ela (usuários `superAdmin` têm acesso irrestrito às lojas da
  própria empresa).
- **Camadas**: `Controller` (HTTP + validação) → `Service` (regra de negócio)
  → `PrismaService` (acesso a dados). Cada módulo de domínio expõe seu
  próprio controller/service/DTOs em `src/<modulo>/`.
- **Validação padronizada**: os DTOs usam decorators próprios em
  `src/common/validators/` (`IsRequiredString`, `IsOptionalString`,
  `IsValidEmail`, `IsValidUUID`, `IsValidPassword`, `IsValidMoney`,
  `IsPositiveInt`, `IsValidCNPJ`) em vez dos decorators crus do
  `class-validator`, garantindo mensagens de erro em pt-BR consistentes em
  toda a API (`IsValidCNPJ` também normaliza o valor e valida o dígito
  verificador real). O `ValidationPipe` global usa um `exceptionFactory`
  que achata os erros (inclusive de DTOs aninhados) em
  `{ statusCode, message, error, errors: [{ field, messages }] }`.

```
src/
  auth/            # login, refresh, logout, estratégia JWT
  empresas/        # onboarding de tenant (empresa + loja matriz + admin)
  lojas/           # CRUD de lojas, escopado por empresa
  usuarios/        # CRUD de usuários + concessão de acesso a lojas
  permissoes/      # catálogo de permissões + CRUD de papéis
  planos/          # planos de assinatura
  prisma/          # PrismaService/PrismaModule (client via driver adapter)
  common/          # guards, decorators, validators, filtros, middleware, utils
  config/          # configuração e validação de variáveis de ambiente
prisma/
  schema.prisma    # modelo de dados
  seed.ts          # catálogo de permissões, planos e papéis padrão
```

## Requisitos

- Node.js 20+
- pnpm
- Docker (para o PostgreSQL local)

## Como rodar

```bash
pnpm install

cp .env.example .env        # ajuste os secrets de JWT antes de produção

pnpm docker:up                # sobe o PostgreSQL via docker-compose
pnpm prisma:migrate           # cria o schema no banco
pnpm prisma:seed              # popula planos, permissões, papéis padrão, uma empresa de demonstração e o admin de plataforma

pnpm start:dev                 # http://localhost:3000/api
```

O seed também cria (idempotente — só na primeira vez):

- Uma **empresa de demonstração** pra testar a API sem precisar rodar o
  onboarding manualmente: `admin@demo.com` / `Demo@123` — admin **da
  empresa** (não é `superAdmin`; tem todas as permissões de escopo de
  tenant, plano Profissional, loja matriz "MATRIZ").
- Um **admin de plataforma** (`superAdmin: true`, equipe interna, não é um
  cliente): `plataforma@erp.internal` / `Plataforma@123` — único caminho
  para obter uma sessão `superAdmin` localmente, necessário para chamar
  rotas de plataforma como `GET /empresas` ou o CRUD de `/planos` (ver
  `SuperAdminGuard`). Nenhuma rota da API concede `superAdmin` a quem já não
  tem esse flag.

As rotas de apoio a testes E2E (`src/testing/`) e a documentação Swagger
(`/api/docs`) só existem quando `ENABLE_TESTING_ROUTES=true` no `.env` (ver
`.env.example`) — nunca deixe essa flag ligada em produção ou em qualquer
ambiente acessível pela rede fora de dev/CI local.

## Testando a API (Bruno)

A pasta [bruno/](bruno/) tem uma collection do [Bruno](https://www.usebruno.com/)
com uma requisição para cada rota da API, organizada por módulo e numerada na
ordem recomendada de execução (`01-Planos` → ... → `09-Planos (admin)`). Abra
a pasta `bruno/` como collection no Bruno, selecione o environment "local" e
rode em sequência — os scripts de cada requisição salvam automaticamente
tokens e ids (`accessToken`, `empresaId`, `lojaId`, `usuarioId` etc.) nas
variáveis do environment para as requisições seguintes.

## Fluxo de onboarding (signup de um tenant)

`POST /api/empresas` é público e cria, em uma única transação
(`src/empresas/tenant-onboarding.ts#onboardTenant`, compartilhada com a
empresa de demonstração do seed): a `Empresa`, uma `Loja` matriz, um `Papel`
"Administrador" com todas as permissões de **escopo de tenant** (nunca as de
módulo `ADMIN` — administração da plataforma), e o usuário administrador da
empresa (**nunca** `superAdmin: true`) já vinculado à loja matriz. A resposta
já inclui os tokens de acesso (signup + login).

`Usuario.superAdmin` (admin de plataforma) não pode ser obtido por nenhuma
rota pública — só existe via seed/suporte direto no banco (ver
`criarAdminPlataformaSeNaoExistir` em `prisma/seed.ts`). `POST /usuarios`
só permite criar um usuário com `superAdmin: true` se quem está chamando a
rota já for `superAdmin` (`PATCH /usuarios/:id` não expõe esse campo).

## Scripts úteis

| Script                   | Descrição                                 |
| ------------------------ | ------------------------------------------ |
| `pnpm start:dev`         | API em modo watch                          |
| `pnpm build`             | Build de produção (`dist/src/main.js`)     |
| `pnpm prisma:migrate`    | Cria/aplica migrations em desenvolvimento  |
| `pnpm prisma:deploy`     | Aplica migrations em produção              |
| `pnpm prisma:seed`       | Roda `prisma/seed.ts`                      |
| `pnpm prisma:studio`     | Abre o Prisma Studio                       |
| `pnpm docker:up`/`down`  | Sobe/derruba o PostgreSQL local            |
| `pnpm test` / `test:e2e` | Testes unitários / e2e                     |

## Próximos módulos

O `ModuloSistema` do Prisma já reserva os módulos `FISCAL`, `FINANCEIRO` e
`ESTOQUE`/`VENDAS`, e o catálogo de permissões em `prisma/seed.ts` já inclui
exemplos de códigos para cada um. Novos módulos devem seguir o mesmo padrão:
modelos no `schema.prisma` referenciando `Empresa`/`Loja`, um módulo Nest
próprio, e permissões adicionadas ao catálogo.
