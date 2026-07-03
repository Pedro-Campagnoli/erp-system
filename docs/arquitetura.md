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
   `superAdmin` sempre passa, sem checar a lista.
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

A ordem dos três guards importa: `PermissionsGuard` e `LojaAccessGuard`
dependem de `request.user`, que só existe depois que `JwtAuthGuard` rodou —
por isso são declarados nessa ordem em `app.module.ts`.

## RBAC: Papel/Permissão

- `Permissao` é um catálogo **global** de códigos (`modulo.recurso.acao`,
  ex.: `cadastros.lojas.criar`), semeado por `prisma/seed.ts` e espelhado em
  código por `src/common/constants/permissions.constant.ts` (`PERMISSIONS`).
  Os controllers nunca usam strings soltas — sempre a constante.
- `Papel` agrupa permissões via `PapelPermissao`. Pode ser:
  - **Global** (`empresaId = null`): papel padrão do sistema (ex.:
    "Gerente", "Operador", criados pelo seed), somente leitura para os
    tenants — `PapeisService` bloqueia `update`/`atribuirPermissoes`/`remove`
    nesses papéis (ver `buscarPapelDaEmpresa` em `papeis.service.ts`).
  - **Da empresa**: criado pelo próprio tenant via `POST /papeis`, ou o
    papel "Administrador" (com todas as permissões do catálogo) criado
    automaticamente no onboarding.
- O vínculo `UsuarioLoja` é o que efetivamente concede acesso: um usuário só
  "tem" um papel/permissões numa loja onde existe um `UsuarioLoja` ativo. O
  conjunto de permissões de um usuário autenticado é a **união** das
  permissões de todos os papéis de todas as suas lojas ativas — calculado em
  `JwtStrategy.validate()` e `AuthService.carregarPerfil()`, não persistido.
- **`superAdmin`** (`Usuario.superAdmin`) é um flag independente do RBAC:
  quem tem esse flag ignora `PermissionsGuard` e `LojaAccessGuard`
  completamente, com acesso irrestrito a todas as lojas *da própria
  empresa* — não precisa de `UsuarioLoja` para cada loja. Só o usuário
  criado no onboarding (`POST /empresas`) recebe esse flag por padrão; para
  os demais usuários, `superAdmin` é uma opção explícita no `CreateUsuarioDto`.

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

`POST /empresas` é a única rota `@Public()` que grava dados de negócio. Em
uma única transação (`EmpresasService.create`) ela cria: a `Empresa`, uma
`Loja` matriz (`codigo: 'MATRIZ'`), o `Papel` "Administrador" com **todas**
as permissões do catálogo atual, e o `Usuario` administrador
(`superAdmin: true`) já vinculado à loja matriz. O controller
(`EmpresasController.create`) então chama `AuthService.login` com as
credenciais recém-criadas e devolve os tokens — o cliente sai do signup já
autenticado.
