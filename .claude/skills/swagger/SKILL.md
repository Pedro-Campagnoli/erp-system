---
name: swagger
description: Configura ou atualiza a documentação OpenAPI/Swagger da API do erp-backend (NestJS). Use ao adicionar/alterar controllers ou DTOs, ou quando pedido para "atualizar o swagger"/"documentar a API".
---

Mantém a documentação OpenAPI da API em `~/projects/erp-system/erp-backend`
sempre refletindo o código real. Sempre confira o estado atual (não assuma
que os passos abaixo já foram feitos) antes de aplicar qualquer mudança.

## 1. Dependência e plugin do compilador

- Garanta `@nestjs/swagger` em `dependencies` (`pnpm add @nestjs/swagger`).
- Garanta o plugin do CLI habilitado em `nest-cli.json`:
  ```json
  "compilerOptions": { "plugins": ["@nestjs/swagger"] }
  ```
  Esse plugin faz o Nest inferir `@ApiProperty` a partir dos tipos TS de
  cada DTO em tempo de build — **não** adicione `@ApiProperty()` manualmente
  em cada campo de DTO, o plugin já cobre isso. Só decore manualmente um
  campo quando o plugin não conseguir inferir algo relevante (ex.: um
  exemplo específico via `@ApiProperty({ example: ... })`, ou quando o tipo
  seja `unknown`/`any`, como `endereco: Prisma.JsonValue`).

## 2. `SwaggerModule` em `src/main.ts`

- Configure com `DocumentBuilder().setTitle(...).setVersion(...).addBearerAuth()`
  (a API autentica via `Authorization: Bearer <token>`) e monte em
  `SwaggerModule.setup('docs', app, document)` (fica em `/api/docs`, dentro
  do prefixo global).
- **Gated fora de produção** — mesma convenção do `TestingModule`
  (`src/testing/`): só chame `SwaggerModule.setup(...)` quando
  `process.env.NODE_ENV !== 'production'`. Esta API ainda não tem consumidor
  externo que precise do doc em prod; reavalie essa decisão se isso mudar.

## 3. `@ApiTags` por controller

- Cada `*.controller.ts` deve ter `@ApiTags('<nome-do-modulo>')` na classe
  (ex.: `@ApiTags('empresas')`), pra agrupar as rotas na UI. Confira todos
  os controllers em `src/*/`: hoje são `auth`, `empresas`, `lojas`,
  `permissoes` (tem dois controllers: `papeis` e `permissoes`), `planos`,
  `usuarios`. Módulos novos entram nessa lista conforme forem criados.

## 4. `@ApiOperation` (opcional, use com critério)

- Não é obrigatório em todo endpoint CRUD óbvio. Adicione
  `@ApiOperation({ summary: '...' })` quando o comportamento não é óbvio só
  pelo nome do método/rota — ex.: `POST /empresas` (onboarding transacional
  que já loga o usuário), `PATCH /papeis/:id` (bloqueado pra papéis de
  sistema). Não adicione um resumo genérico tipo "Cria um X" que só repete o
  nome do método.

## 5. Verificação

- Suba a API (`pnpm start:dev`) e abra `http://localhost:3000/api/docs` —
  confirme que carrega sem erro, que todas as rotas aparecem agrupadas por
  tag, e que o botão "Authorize" (bearer) funciona pra testar rotas
  autenticadas manualmente.

## 6. Documentação

- Se `docs/convencoes.md` (checklist de "adicionar módulo novo") ainda não
  mencionar o passo de Swagger, adicione: todo controller novo precisa de
  `@ApiTags`, e o plugin do compilador já cobre os DTOs automaticamente.
