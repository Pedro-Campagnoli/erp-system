# Módulos

Um resumo por módulo de `src/`. Para os detalhes de payload de cada rota,
veja a collection do Bruno (`bruno/`); aqui o foco é regra de negócio e
decisões que não são óbvias só olhando o controller.

## `auth`

Login, refresh, logout e a `JwtStrategy` (passport-jwt) que popula
`request.user` em toda requisição autenticada.

- `POST /auth/login`, `POST /auth/refresh` são `@Public()`; `POST /auth/logout`
  exige autenticação. `login` (5/min) e `refresh` (10/min) têm limites de
  `@Throttle()` mais estritos que o padrão global (120/min por IP,
  `ThrottlerGuard` — ver `arquitetura.md`), por serem alvo natural de força
  bruta/credential stuffing.
- `JwtStrategy.validate()` recarrega o usuário do banco a cada requisição
  (não confia só no payload do JWT) e monta o `AuthenticatedUser` completo
  — incluindo o array achatado de `permissoes` (união de todos os papéis de
  todas as lojas ativas do usuário). Isso significa que revogar acesso ou
  mudar papel tem efeito imediato na próxima requisição, sem esperar o
  access token expirar; só o conteúdo do JWT em si (o `sub`) não muda até o
  refresh.
- Refresh token é uma rotação simples: cada `refresh()` revoga o token
  usado e emite um par novo. Não há detecção de reuso de token revogado
  (se um refresh token vazado for reaproveitado, o request simplesmente
  falha porque já foi marcado `revokedAt`, mas nenhuma sessão é derrubada
  como resposta a isso).
- `AuthModule` é importado por `EmpresasModule` porque o onboarding
  (`POST /empresas`) termina fazendo login programático com as credenciais
  recém-criadas.

## `empresas`

CRUD de tenants + o endpoint de onboarding.

- `POST /empresas` (`@Public()`, `@Throttle` 5/min): onboarding completo —
  delega para `onboardTenant()` (`src/empresas/tenant-onboarding.ts`, ver
  `arquitetura.md`), que cria Empresa, loja matriz, papel "Administrador"
  (só com permissões de escopo de tenant) e usuário admin
  (`superAdmin: false`) numa transação — e retorna tokens de acesso.
- `GET /empresas` e `GET /empresas/:id` são administração da **plataforma**
  (listam/consultam todas as empresas clientes) — protegidas por
  `@UseGuards(SuperAdminGuard)`, não por `@Permissions()`. Nenhum usuário
  comum de uma empresa consegue chamá-las, mesmo com todas as permissões de
  tenant.
- `GET /empresas/me` e `PATCH /empresas/me` operam sobre a própria empresa
  do usuário logado (`request.user.empresaId`). `updateMe` exige
  `cadastros.empresa.editar` via `@Permissions()` normal (o papel
  "Administrador" do tenant já tem essa permissão por padrão) — não há mais
  checagem ad-hoc de `usuario.superAdmin` aqui.

## `lojas`

CRUD de lojas, escopado por empresa.

- Toda operação de escrita (`create`, `update`, `remove`) exige permissão
  (`cadastros.lojas.*`) e recebe `empresaId` de `request.user`, nunca do
  body/params — impossível criar/editar loja de outra empresa mesmo
  manipulando o payload.
- `create` valida `plano.limiteLojas` antes de permitir a criação
  (`BadRequestException` se o tenant já atingiu o limite do plano).
- `findAll`/`findOne` (leitura, sem `@Permissions()`) restringem o
  resultado às lojas do usuário quando ele não é `superAdmin`
  (`allowedLojaIds = usuario.lojas.map(...)`) — um usuário comum só lista
  as lojas às quais tem `UsuarioLoja` ativo, mesmo sendo tudo da mesma
  empresa.
- `remove` é soft delete (`ativo: false` + `deletedAt`).

## `usuarios`

CRUD de usuários da própria empresa + gestão de acesso a lojas
(`UsuarioLoja`).

- `create` valida `plano.limiteUsuarios` (mesmo padrão de `lojas`) e aceita
  uma lista `lojas: [{ lojaId, papelId }]` para já criar os vínculos de
  acesso junto com o usuário.
- `create` recebe também `atorSuperAdmin` (`request.user.superAdmin`, passado
  pelo controller) e rejeita `dto.superAdmin: true` com `ForbiddenException`
  se quem está chamando não for `superAdmin` — impede que um admin comum de
  uma empresa (permissão `cadastros.usuarios.criar`) crie outro usuário com
  o flag de administrador de **plataforma** (escalação de privilégio). Ver
  `arquitetura.md`. `update` (`PATCH /usuarios/:id`) nunca expôs esse campo.
- `validarAcessos` (privado) é chamado antes de qualquer criação/atualização
  de `UsuarioLoja` para garantir que as lojas pertencem à empresa do
  usuário logado e que os papéis são acessíveis a ela (próprios ou globais)
  — evita vincular um usuário a uma loja de outra empresa ou a um papel de
  outro tenant.
- `GET /usuarios/me` devolve o próprio `AuthenticatedUser` já calculado
  pelo guard (não bate no banco de novo).
- `PATCH /usuarios/me/senha` exige a senha atual (bcrypt.compare) e revoga
  todos os refresh tokens ativos ao trocar a senha (força novo login em
  outras sessões).
- Endpoints de acesso (`/usuarios/:id/lojas*`) são só um CRUD do vínculo
  `UsuarioLoja`; `concederAcesso` é um `upsert` (conceder de novo numa loja
  onde o acesso foi revogado reativa o vínculo em vez de duplicar).
- Todas as respostas de usuário usam o `select` `SEM_SENHA` — o hash da
  senha nunca sai da API.

## `permissoes`

Dois controllers no mesmo módulo: catálogo de permissões (somente leitura)
e CRUD de papéis.

- `GET /permissoes`: catálogo completo, aberto a qualquer usuário
  autenticado (sem `@Permissions()`) — é consumido para montar telas de
  atribuição de papel, então precisa estar acessível antes de o usuário ter
  a permissão de gerenciar papéis.
- `PapeisService` distingue papéis "acessíveis" (da própria empresa ou
  globais — leitura) de papéis "da empresa" (só os do próprio tenant —
  escrita). Papéis globais (`empresaId: null`) são somente leitura para
  qualquer tenant: tentar editar/excluir um lança `ForbiddenException`.
- `create` e `atribuirPermissoes` chamam `garantirPermissoesDeTenant()`
  antes de gravar: se algum `permissaoId` informado for de um módulo de
  **plataforma** (`MODULOS_PLATAFORMA`, hoje só `ADMIN`), o request inteiro
  falha com `ForbiddenException` — um tenant não pode montar um papel
  próprio com permissões de administração da plataforma.
- `PUT /papeis/:id/permissoes` substitui a lista inteira de permissões do
  papel (delete + createMany em transação) — não existe endpoint para
  adicionar/remover uma permissão isoladamente.
- `remove` bloqueia a exclusão de um papel que ainda tenha `UsuarioLoja`
  vinculado (`ConflictException`), para não deixar vínculos órfãos.

## `planos`

CRUD dos planos de assinatura da plataforma (SaaS), não confundir com
"plano de contas" ou qualquer conceito de negócio do tenant.

- `GET /planos` e `GET /planos/:id` são `@Public()` — precisam estar
  acessíveis antes de existir uma sessão, para a tela de cadastro de nova
  empresa escolher um plano (`planoId` é obrigatório em `CreateEmpresaDto`).
  `?ativos=true` filtra só os planos comercializáveis no momento.
- Escrita (`create`/`update`/`remove`) usa `@UseGuards(SuperAdminGuard)` —
  exige `usuario.superAdmin === true`, não uma permissão do catálogo de
  tenant. É administração da plataforma (planos SaaS globais), então não
  faz sentido gateá-la pelo RBAC de uma empresa.
- `remove` bloqueia a exclusão de um plano com empresas vinculadas
  (`ConflictException`, sugerindo desativar via `ativo: false` em vez de
  excluir).

## `prisma`

`PrismaModule` (`@Global()`) expõe `PrismaService`, que estende
`PrismaClient` usando o driver adapter `@prisma/adapter-pg` (Prisma 7 sem o
engine binário tradicional, conexão via `pg` diretamente) e conecta/desconecta
nos hooks de lifecycle do Nest (`onModuleInit`/`onModuleDestroy`).

## `common`

Não é um módulo Nest, é onde vive a infraestrutura transversal: guards
(`JwtAuthGuard`, `PermissionsGuard`, `LojaAccessGuard`, `SuperAdminGuard`),
decorators, middleware, filtro de exceção, validators customizados, DTOs
compartilhados (`EnderecoDto`) e utils (`hash.util`, `duration.util`,
`json.util`). `permissions.constant.ts` também vive aqui — não é só o
catálogo `PERMISSIONS`, mas também `MODULOS_PLATAFORMA`/
`isModuloDePlataforma()`, a fonte de verdade sobre o que é permissão de
tenant vs. de plataforma. Detalhado em `arquitetura.md` (guards/middleware,
RBAC) e `convencoes.md` (validators, formato de erro).

## `config`

`configuration.ts` centraliza a leitura de env vars tipada
(`AppConfig`, consumido via `ConfigService.get<...>`); `env.validation.ts`
valida no boot (`class-validator` sobre `EnvironmentVariables`) que
`DATABASE_URL`, `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` existem — a
aplicação não sobe sem eles. `enableTestingRoutes` (env
`ENABLE_TESTING_ROUTES`, default `false`) é a flag explícita que liga o
`TestingModule` (`app.module.ts`) e o Swagger em `/api/docs`
(`main.ts`) — ver `convencoes.md`.
