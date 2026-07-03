# Modelo de dados

Fonte da verdade: `prisma/schema.prisma`. Só existe uma migration até agora
(`prisma/migrations/20260701221941_init`) — o schema ainda não sofreu
alterações incrementais.

## Visão geral das entidades

```
Plano ──< Empresa ──< Loja ──< UsuarioLoja >── Papel >── PapelPermissao >── Permissao
                  └──< Usuario ──< UsuarioLoja
                  └──< Papel (custom da empresa)
Usuario ──< RefreshToken
```

### `Plano`

Plano de assinatura da plataforma (não do tenant contratante de um módulo —
é o plano SaaS). `limiteLojas`/`limiteUsuarios` nulos significam "sem
limite"; são checados em `LojasService.create` e `UsuariosService.create`
antes de criar o registro. `recursos` é um `Json` livre de feature flags
(ex.: `{ "fiscal": true, "estoque": false }`) — hoje é só armazenado, ainda
não há nenhum guard/check que leia esse campo para liberar ou bloquear
funcionalidade. Isso é gap conhecido a fechar quando os módulos de negócio
existirem de fato (ver `roadmap.md`).

### `Empresa`

O tenant. Tem soft delete (`deletedAt`) — todo `findMany`/`findFirst` de
empresa filtra `deletedAt: null` explicitamente, não há um middleware global
de soft delete. `statusAssinatura` (enum `StatusAssinatura`: `TRIAL`,
`ATIVA`, `INADIMPLENTE`, `CANCELADA`, `SUSPENSA`) e as datas de trial/cobrança
existem no schema mas **não há nenhuma lógica de billing implementada** —
são campos reservados para um futuro módulo de cobrança recorrente.

### `Loja`

Unidade operacional de uma empresa. `tipo` é `MATRIZ` ou `FILIAL`
(`TipoLoja`), mas nada no código impede mais de uma `MATRIZ` por empresa —
é só uma etiqueta informativa hoje, a matriz criada no onboarding é a única
gerada automaticamente. `@@unique([empresaId, codigo])` garante código único
só dentro da empresa (duas empresas podem ter ambas uma loja "MATRIZ"). Soft
delete via `deletedAt` (`LojasService.remove` só marca `ativo: false` e
`deletedAt`, nunca faz delete físico).

### `Usuario`

Pertence a uma única `Empresa` (`empresaId` obrigatório). `email` é único
**globalmente**, não por empresa — não é possível reaproveitar o mesmo
e-mail em duas empresas diferentes. `senha` é hash bcrypt
(`bcryptSaltRounds`, configurável). `superAdmin` é o flag de acesso
irrestrito descrito em `arquitetura.md` — note que ele não aparece em
nenhuma tabela de junção, é uma coluna simples em `Usuario`. Soft delete via
`deletedAt`.

### `RefreshToken`

Um registro por refresh token emitido, guardado como hash SHA-256
(`tokenHash`, `@unique`). `revokedAt` marca revogação (logout, rotação no
refresh, ou troca de senha). Sem TTL automático no banco — tokens expirados
continuam na tabela até serem filtrados por `expiresAt` nas queries; não há
job de limpeza.

### `Permissao`

Catálogo **global** de códigos de permissão (`admin.planos.gerenciar`,
`fiscal.nfe.emitir` etc.), com `modulo` (`ModuloSistema`) e `descricao`.
Semeado por `prisma/seed.ts`, nunca criado pela API — não existe endpoint de
escrita para `Permissao`, só `GET /permissoes` (catálogo de leitura, aberto
a qualquer usuário autenticado, usado para montar telas de atribuição de
papel).

### `Papel`

Role do RBAC. **`empresaId` é opcional de propósito**: quando `null`, o
papel é global/"de sistema" (`sistema: true`), criado só pelo seed
(`Gerente`, `Operador`) ou herdado pelas empresas como leitura — todo tenant
enxerga os papéis globais em `GET /papeis` (`PapeisService.findAll` usa
`OR: [{ empresaId }, { empresaId: null }]`), mas não pode editá-los nem
excluí-los (`buscarPapelDaEmpresa` lança `ForbiddenException` se
`empresaId === null`). Quando `empresaId` é preenchido, o papel é exclusivo
daquele tenant (custom, ou o "Administrador" gerado no onboarding, que
também tem `sistema: true` mas pertence à empresa).

O comentário no schema chama atenção para uma pegadinha do Postgres:
`@@unique([empresaId, nome])` **não impede papéis globais com nome
duplicado**, porque cada `NULL` é considerado distinto em uma constraint
`UNIQUE`. A prevenção de duplicidade de papéis de sistema é feita em
código, em `criarPapelSistemaSeNaoExistir` (`prisma/seed.ts`), que faz um
`findFirst` antes de criar.

### `PapelPermissao`

Tabela de junção pura (chave composta `[papelId, permissaoId]`, sem
`updatedAt`/`createdAt` próprios) entre `Papel` e `Permissao`. Substituída
por completo (delete + createMany, em transação) no endpoint
`PUT /papeis/:id/permissoes` — não há um "adicionar uma permissão", só
"definir a lista completa".

### `UsuarioLoja`

O vínculo de acesso: em qual loja um usuário atua e com qual papel ali.
`@@unique([usuarioId, lojaId])` — um usuário tem no máximo um papel por
loja (não dá para ter dois papéis simultâneos na mesma loja; para trocar,
atualiza-se o `papelId` do vínculo existente). `ativo` permite suspender o
acesso sem apagar o vínculo (usado por `PATCH /usuarios/:id/lojas/:lojaId`).
Um `superAdmin` não precisa de `UsuarioLoja` para acessar lojas da própria
empresa, mas ainda pode ter vínculos explícitos (foi o caso do admin criado
no onboarding, vinculado à loja matriz) — os dois mecanismos coexistem, o
flag apenas amplia o acesso além do que os vínculos concedem.

## Enums

| Enum | Valores | Onde é usado |
| --- | --- | --- |
| `StatusAssinatura` | `TRIAL`, `ATIVA`, `INADIMPLENTE`, `CANCELADA`, `SUSPENSA` | `Empresa.statusAssinatura` — reservado para billing futuro, sem lógica associada ainda |
| `TipoLoja` | `MATRIZ`, `FILIAL` | `Loja.tipo` |
| `ModuloSistema` | `ADMIN`, `CADASTROS`, `FISCAL`, `FINANCEIRO`, `ESTOQUE`, `VENDAS` | `Permissao.modulo` — os quatro últimos ainda não têm módulo Nest implementado, só entradas de exemplo no catálogo de permissões (ver `roadmap.md`) |

## O que já está reservado para módulos futuros

- `ModuloSistema.FISCAL`/`FINANCEIRO`/`ESTOQUE`/`VENDAS` e os códigos de
  permissão de exemplo correspondentes em `prisma/seed.ts`
  (`fiscal.nfe.emitir`, `financeiro.contas.criar`, `estoque.produtos.editar`,
  `vendas.pedidos.criar`).
- `Plano.recursos` (feature flags por plano) — schema pronto, sem
  enforcement.
- `Empresa.statusAssinatura` e as datas de trial/cobrança — schema pronto,
  sem motor de billing.
- `@RequireLoja()` (`src/common/decorators/require-loja.decorator.ts`) —
  decorator pronto, sem nenhum endpoint que o use ainda; os módulos
  operacionais (estoque, vendas, fiscal) vão precisar dele para tornar o
  header `x-loja-id` obrigatório nas suas rotas.

Qualquer novo modelo de negócio deve seguir o padrão já estabelecido:
referenciar `Empresa` e/ou `Loja` (nunca ficar solto), ter `@@index` na FK
de tenant, e usar soft delete (`deletedAt`) se o registro puder ser
"excluído" pelo usuário — é o padrão de todas as entidades atuais que
suportam exclusão (`Empresa`, `Loja`, `Usuario`).
