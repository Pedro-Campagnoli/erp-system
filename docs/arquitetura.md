# Arquitetura

## Modelo multi-tenant

O tenant raiz é a `Empresa`. Toda entidade de negócio pendura, direta ou
indiretamente, de uma `Empresa` — é essa a fronteira de isolamento de dados
da aplicação, não a `Loja`.

```
Empresa (tenant)
 ├── Loja (unidade/filial)
 │     └── UsuarioLoja (vínculo de acesso, com um Papel)
 ├── Usuario (pertence à Empresa, não à Loja)
 └── Papel (custom da empresa, ou global quando empresaId é nulo)
```

- **Empresa**: tenant. Tem um `Plano` (limites de lojas/usuários, feature
  flags) e um `statusAssinatura`.
- **Loja**: unidade operacional de uma empresa (matriz ou filial). Todo
  módulo de negócio futuro (fiscal, financeiro, estoque, vendas) vai
  referenciar `Loja` (e por consequência `Empresa`) para manter o dado
  isolado por tenant.
- **Usuario**: pertence a exatamente uma `Empresa`. Não tem acesso a lojas
  por padrão — precisa de um vínculo `UsuarioLoja` por loja, cada um com um
  `Papel` (RBAC por vínculo, não por usuário).

Não existe hierarquia entre empresas nem lojas compartilhadas entre
empresas — o isolamento é estritamente por `empresaId`. Praticamente todo
`findFirst`/`findMany` de negócio nos services filtra por `empresaId`
explicitamente (ver `src/lojas/lojas.service.ts`, `src/usuarios/usuarios.service.ts`);
não existe um mecanismo automático (ex.: middleware de Prisma) que injete
esse filtro — é responsabilidade de cada service não esquecer o `where`.

## Fluxo de uma requisição

Ordem de execução (pipeline padrão do Nest: middleware → guards → controller):

1. **`TenantContextMiddleware`** (`src/common/middleware/tenant-context.middleware.ts`,
   aplicado a `*` em `app.module.ts`) — lê o header `x-loja-id` e popula
   `request.lojaId`. Não valida nada, só transporta o dado bruto; roda antes
   de qualquer guard, inclusive antes da autenticação.
2. **`JwtAuthGuard`** (global, via `APP_GUARD`) — valida o Bearer token e
   popula `request.user` com um `AuthenticatedUser` (id, empresaId,
   superAdmin, lojas com acesso e o array achatado de códigos de permissão).
   Rotas marcadas com `@Public()` pulam este guard inteiramente (login,
   refresh, `POST /empresas`, catálogo de planos).
3. **`PermissionsGuard`** (global) — se a rota tem `@Permissions(...)`,
   confere se `request.user.permissoes` contém todos os códigos exigidos.
   `superAdmin` sempre passa, sem checar a lista. Esse guard só entende o
   RBAC de **tenant** (Papel/Permissão de uma empresa) — rotas de
   administração da **plataforma** não usam `@Permissions()`, usam
   `SuperAdminGuard` (ver seção "RBAC" abaixo).
4. **`LojaAccessGuard`** (global) — se a requisição informou `x-loja-id`,
   confere se `request.user.lojas` inclui aquela loja (ou se é `superAdmin`,
   que tem acesso irrestrito às lojas da própria empresa). Se a rota tem
   `@RequireLoja()`, o header passa a ser obrigatório. **Nenhum endpoint
   implementado hoje usa `@RequireLoja()`** — o decorator está pronto para os
   módulos de negócio futuros, que vão operar sempre no contexto de uma loja
   específica (ex.: emitir uma NF-e, dar baixa em estoque).
5. **Controller → Service → PrismaService**: o controller cuida de HTTP e
   validação (DTOs), o service concentra a regra de negócio (incluindo
   filtros de tenant e transações), e todo acesso a dado passa pelo
   `PrismaService` (client do Prisma 7 via `@prisma/adapter-pg`, singleton
   global registrado em `PrismaModule`).

A ordem dos três guards globais importa: `PermissionsGuard` e
`LojaAccessGuard` dependem de `request.user`, que só existe depois que
`JwtAuthGuard` rodou — por isso são declarados nessa ordem em
`app.module.ts`. Há um quarto guard, `SuperAdminGuard`, que **não** é global
— é aplicado rota a rota via `@UseGuards(SuperAdminGuard)` nos poucos
endpoints de administração da plataforma (ver abaixo), sempre depois do
`JwtAuthGuard` (que já populou `request.user`).

Também global (via `APP_GUARD`) e executado antes de todos os guards acima:
`ThrottlerGuard` (`@nestjs/throttler`), limite padrão de 120 req/min por IP
(`ThrottlerModule.forRoot` em `app.module.ts`, storage em memória — não
sobrevive a múltiplas réplicas). `POST /auth/login` (5/min),
`POST /auth/refresh` (10/min) e `POST /empresas` (5/min) têm limites mais
estritos via `@Throttle()`, por serem alvos óbvios de força
bruta/enumeração.

## RBAC: dois níveis de administração — plataforma e tenant

Existem dois RBACs completamente separados nesta aplicação, e misturá-los já
foi a causa de uma vulnerabilidade real (uma empresa que se cadastrava
ganhava acesso de administração da plataforma inteira — corrigido; ver
histórico do módulo `empresas`). Não trate os dois como a mesma coisa:

- **RBAC de tenant** (`Permissao`/`Papel`/`PapelPermissao`/`UsuarioLoja`),
  gateado por `@Permissions()` + `PermissionsGuard`, descrito abaixo.
- **Administração de plataforma** (equipe interna, cross-tenant), gateada
  por `SuperAdminGuard` + `Usuario.superAdmin`, descrita na subseção
  seguinte. As duas coisas não se sobrepõem: nenhuma `Permissao` de módulo de
  plataforma pode ser atribuída a um papel de tenant (ver abaixo).

### RBAC de tenant: Papel/Permissão

- `Permissao` é um catálogo **global** de códigos (`modulo.recurso.acao`,
  ex.: `cadastros.lojas.criar`), semeado por `prisma/seed.ts` e espelhado em
  código por `src/common/constants/permissions.constant.ts` (`PERMISSIONS`).
  Os controllers nunca usam strings soltas — sempre a constante.
- Toda `Permissao` tem um `modulo` (`ModuloSistema`). Os módulos listados em
  `MODULOS_PLATAFORMA` (`permissions.constant.ts` — hoje só `ADMIN`) são de
  escopo de **plataforma** e nunca podem compor um papel de empresa; é a
  fonte de verdade em código para essa distinção, não uma convenção de nome
  do código da permissão. `isModuloDePlataforma(modulo)` expõe a checagem.
- `Papel` agrupa permissões via `PapelPermissao`. Pode ser:
  - **Global** (`empresaId = null`): papel padrão do sistema (ex.:
    "Gerente", "Operador", criados pelo seed), somente leitura para os
    tenants — `PapeisService` bloqueia `update`/`atribuirPermissoes`/`remove`
    nesses papéis (ver `buscarPapelDaEmpresa` em `papeis.service.ts`).
  - **Da empresa**: criado pelo próprio tenant via `POST /papeis`, ou o
    papel "Administrador" criado automaticamente no onboarding — que recebe
    **todas as permissões, exceto as de `MODULOS_PLATAFORMA`** (ver
    "Onboarding de um tenant" abaixo).
  - `PapeisService.create`/`atribuirPermissoes` chamam
    `garantirPermissoesDeTenant()` antes de gravar: qualquer
    `permissaoId` cujo `modulo` esteja em `MODULOS_PLATAFORMA` faz o request
    inteiro falhar com `ForbiddenException` — um tenant não consegue montar
    um papel próprio com permissões de plataforma, nem por essa via.
- O vínculo `UsuarioLoja` é o que efetivamente concede acesso: um usuário só
  "tem" um papel/permissões numa loja onde existe um `UsuarioLoja` ativo. O
  conjunto de permissões de um usuário autenticado é a **união** das
  permissões de todos os papéis de todas as suas lojas ativas — calculado em
  `JwtStrategy.validate()` e `AuthService.carregarPerfil()`, não persistido.

### Administração de plataforma: `superAdmin` e `SuperAdminGuard`

- **`superAdmin`** (`Usuario.superAdmin`) é o flag de administrador da
  **plataforma** (equipe interna do SaaS, cross-tenant) — não é "super
  usuário da própria empresa". Quem tem esse flag ignora `PermissionsGuard`
  e `LojaAccessGuard` completamente (acesso irrestrito a todas as lojas *da
  própria empresa*, sem precisar de `UsuarioLoja` por loja) — isso não
  mudou. O que mudou é **quem recebe o flag**: o onboarding público
  (`POST /empresas`) nunca concede `superAdmin` a ninguém; o único caminho é
  `prisma/seed.ts` (`criarAdminPlataformaSeNaoExistir`) ou concessão manual
  via banco/suporte.
- `SuperAdminGuard` (`src/common/guards/super-admin.guard.ts`) é um guard
  independente do sistema de `@Permissions()`: só verifica
  `request.user.superAdmin === true`, lançando `ForbiddenException` caso
  contrário. Aplicado via `@UseGuards(SuperAdminGuard)` diretamente nas
  rotas que são administração da plataforma, não do tenant:
  `GET /empresas`, `GET /empresas/:id` (`EmpresasController`) e todo o CRUD
  de escrita de `/planos` (`PlanosController.create/update/remove`). Essas
  rotas **não** usam `@Permissions(PERMISSIONS.ADMIN.*)` — as entradas de
  `PERMISSIONS.ADMIN` (`admin.empresas.listar`, `admin.planos.gerenciar`)
  existem só como espelho do catálogo/seed, não gateiam nenhuma rota.
- Escalação de privilégio é bloqueada em `POST /usuarios`
  (`UsuariosController.create` passa `request.user.superAdmin` como
  `atorSuperAdmin` para `UsuariosService.create`): se o body pede
  `superAdmin: true` e quem está chamando não é `superAdmin`, o service
  lança `ForbiddenException`. Um admin comum de uma empresa (papel
  "Administrador", permissão `cadastros.usuarios.criar`) não consegue criar
  outro usuário com esse flag. `PATCH /usuarios/:id` nunca expôs esse campo.
- `Usuario.empresaId` é obrigatório no schema, então até um admin de
  plataforma precisa "pertencer" a uma empresa — o seed usa uma empresa
  interna dedicada só para isso (ver `modelo-dados.md`/`modulos.md`).

## Autenticação e sessão

- JWT de acesso (`JWT_ACCESS_EXPIRES_IN`, padrão 15m) e refresh
  (`JWT_REFRESH_EXPIRES_IN`, padrão 7d), assinados com segredos distintos
  (`src/config/configuration.ts`).
- Refresh tokens são persistidos como hash SHA-256 (`RefreshToken.tokenHash`,
  `src/common/utils/hash.util.ts` — não usa bcrypt aqui: bcrypt trunca a
  entrada em 72 bytes e JWTs do mesmo usuário compartilham prefixo, o que
  quebraria a comparação). Cada `refresh()` revoga o token usado e emite um
  par novo (rotação simples, sem reuse detection).
- `logout` revoga um refresh token específico ou, se nenhum for informado,
  todos os tokens ativos do usuário. `alterarSenha` também revoga todos os
  refresh tokens ativos.
- `AllExceptionsFilter` (`src/common/filters/http-exception.filter.ts`) é o
  único filtro de exceção da aplicação — ver `convencoes.md` para o formato
  de erro.

## Onboarding de um tenant

`POST /empresas` é a única rota `@Public()` que grava dados de negócio.
`EmpresasController.create` delega para `EmpresasService.create`, que valida
o plano informado e roda o resto numa única transação chamando
`onboardTenant()` (`src/empresas/tenant-onboarding.ts`) — a mesma função
usada por `prisma/seed.ts` para a empresa de demonstração
(`criarEmpresaDemoSeNaoExistir`). Ter a lógica num único helper compartilhado
existe justamente para não repetir o bug que motivou essa extração: as duas
origens (onboarding público e seed) chegaram a duplicar quase a mesma lógica
e ambas concediam, por acidente, permissões e o flag de administração de
**plataforma** a um usuário de **tenant**.

`onboardTenant(tx, dados)` cria, na transação recebida:

- a `Empresa`;
- a `Loja` matriz (`codigo: 'MATRIZ'`);
- o `Papel` "Administrador", com **todas as permissões cujo `modulo` não
  esteja em `MODULOS_PLATAFORMA`** (hoje isso exclui só `ADMIN`) — ele
  administra a própria empresa (usuários, papéis, lojas, cadastros), nunca a
  plataforma;
- o `Usuario` administrador, **sempre com `superAdmin: false`** — o
  onboarding público nunca concede o flag de administrador de plataforma;
- o vínculo `UsuarioLoja` do admin com a loja matriz, usando o papel recém-criado.

Depois da transação, `EmpresasController.create` chama `AuthService.login`
com as credenciais recém-criadas e devolve os tokens — o cliente sai do
signup já autenticado, só que agora como admin da própria empresa, nunca
como admin da plataforma.
