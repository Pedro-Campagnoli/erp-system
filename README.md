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
pnpm prisma:seed              # popula planos, permissões e papéis padrão

pnpm start:dev                 # http://localhost:3000/api
```

## Testando a API (Bruno)

A pasta [bruno/](bruno/) tem uma collection do [Bruno](https://www.usebruno.com/)
com uma requisição para cada rota da API, organizada por módulo e numerada na
ordem recomendada de execução (`01-Planos` → ... → `09-Planos (admin)`). Abra
a pasta `bruno/` como collection no Bruno, selecione o environment "local" e
rode em sequência — os scripts de cada requisição salvam automaticamente
tokens e ids (`accessToken`, `empresaId`, `lojaId`, `usuarioId` etc.) nas
variáveis do environment para as requisições seguintes.

## Fluxo de onboarding (signup de um tenant)

`POST /api/empresas` é público e cria, em uma única transação: a `Empresa`,
uma `Loja` matriz, um `Papel` "Administrador" com todas as permissões do
catálogo, e o usuário administrador (`superAdmin: true`) já vinculado à loja
matriz. A resposta já inclui os tokens de acesso (signup + login).

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
