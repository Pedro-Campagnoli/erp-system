# Convenções

## Validators customizados (`src/common/validators/`)

DTOs nunca usam os decorators crus do `class-validator` diretamente para os
casos cobertos abaixo — sempre os wrappers de `src/common/validators/`, que
padronizam a mensagem de erro em pt-BR (`$property ...`) e, em alguns casos,
adicionam normalização/validação real:

| Decorator | Uso | Observação |
| --- | --- | --- |
| `IsRequiredString(maxLength?, opts?)` | texto obrigatório | `IsString` + `IsNotEmpty` + `MaxLength` |
| `IsOptionalString(maxLength?, opts?)` | texto opcional | `IsOptional` + `IsString` + `MaxLength` |
| `IsValidEmail(opts?)` | e-mail obrigatório | combine com `@IsOptional()` para campo opcional |
| `IsValidPassword(minLength = 6, opts?)` | senha | só formato/tamanho — não valida força |
| `IsValidUUID(opts?)` | id | `IsUUID('4', ...)`; use `{ each: true }` para arrays de ids |
| `IsValidMoney(opts?)` | valor monetário | não-negativo, máx. 2 casas decimais |
| `IsPositiveInt(opts?)` | inteiro > 0 | usado em limites de plano |
| `IsValidCNPJ(opts?)` | CNPJ | **normaliza** (remove máscara via `@Transform`) e valida dígito verificador real, não só formato |

Ao criar um DTO novo: se o campo já tem um validator na lista acima, use-o.
Só caia para `class-validator` puro quando não houver wrapper equivalente
(ex.: `@IsBoolean()`, `@IsEnum()`, `@IsArray()` + `@ArrayUnique()` são usados
crus hoje porque não têm uma mensagem pt-BR própria a padronizar).

DTOs de update seguem `PartialType(CreateXDto)` de `@nestjs/mapped-types`
(ex.: `UpdateLojaDto`, `UpdatePapelDto`, `UpdatePlanoDto`) em vez de repetir
os campos — só adicione manualmente o que o `Create` não tem (ex.:
`UpdateLojaDto` acrescenta `ativo`).

Objetos aninhados (ex.: `endereco` em `CreateEmpresaDto`/`CreateLojaDto`)
usam `@ValidateNested()` + `@Type(() => EnderecoDto)` do `class-transformer`
— sem o `@Type`, o `class-validator` não consegue validar o objeto aninhado
porque ele chega como objeto plano do JSON, não como instância da classe.

## Formato de erro da API

Todo erro passa por um destes dois caminhos e cai num JSON com o mesmo
formato-base:

```json
{
  "statusCode": 400,
  "message": "Dados inválidos",
  "error": "BadRequestException",
  "errors": [{ "field": "email", "messages": ["email deve ser um e-mail válido"] }],
  "timestamp": "2026-07-03T12:00:00.000Z",
  "path": "/api/usuarios"
}
```

- **Erro de validação de DTO**: o `ValidationPipe` global
  (`src/main.ts`) usa um `exceptionFactory` que chama
  `formatValidationErrors()` (`src/common/validators/format-validation-errors.util.ts`)
  para achatar os `ValidationError[]` do `class-validator` — inclusive de
  DTOs aninhados, com o campo prefixado (`endereco.cep`) — num array de
  `{ field, messages }`, e embrulha isso numa `BadRequestException`.
- **Qualquer outra exceção**: cai no `AllExceptionsFilter`
  (`src/common/filters/http-exception.filter.ts`), o único `ExceptionFilter`
  da aplicação (`@Catch()` sem tipo, pega tudo). Ele:
  - repassa `status`/`message`/`error` de qualquer `HttpException` já
    lançada nos services (`NotFoundException`, `ConflictException` etc.);
  - traduz códigos conhecidos do Prisma (`P2002` conflito de unique →
    409, `P2025` não encontrado → 404, `P2003` violação de FK → 409) para
    mensagens genéricas em pt-BR — **não** vaza detalhes internos do erro
    do Prisma no corpo da resposta;
  - qualquer outra coisa vira 500 genérico ("Erro interno do servidor"),
    com stack trace só no log do servidor (`Logger.error`), nunca na
    resposta.

Ao lançar um erro num service novo, use as exceções do `@nestjs/common`
(`NotFoundException`, `BadRequestException`, `ConflictException`,
`ForbiddenException`, `UnauthorizedException`) com uma mensagem em
pt-BR — não lance `Error` genérico nem deixe o Prisma vazar para fora sem
necessidade.

## Padrão de resposta

Não há um wrapper de resposta (tipo `{ data, meta }`) — os controllers
retornam o objeto/array direto, e o Nest serializa como JSON. Não há
paginação implementada em nenhum `findAll` hoje (todos retornam a lista
completa, ordenada). Se um módulo futuro precisar paginar, siga um padrão
uniforme (query params `page`/`pageSize` + um envelope `{ data, total }`)
em vez de inventar um formato por módulo.

Os "DTOs de resposta" (`*-response.dto.ts`) existem principalmente para
documentar a forma do retorno — os services normalmente devolvem o
resultado do Prisma quase in natura (às vezes com `select` para omitir
campos sensíveis, como `SEM_SENHA` em `usuarios.service.ts`), sem um
mapeamento explícito para a classe do DTO em todo endpoint.

## Estrutura de pastas por módulo

```
src/<modulo>/
  <modulo>.module.ts
  <modulo>.controller.ts       # HTTP + decorators de auth/permissão
  <modulo>.service.ts          # regra de negócio + acesso a dado via PrismaService
  dto/
    create-<algo>.dto.ts
    update-<algo>.dto.ts       # PartialType(CreateDto) quando possível
    <algo>-response.dto.ts     # forma do retorno (documentação, não enforcement)
```

Módulos com mais de uma entidade agrupam tudo sob a mesma pasta (ex.:
`permissoes/` tem `permissoes.controller.ts` **e** `papeis.controller.ts` —
"papéis" não virou módulo próprio porque está fortemente acoplado ao
catálogo de permissões).

## Checklist para adicionar um módulo de negócio novo

1. **Schema**: adicionar o(s) model(s) em `prisma/schema.prisma`,
   referenciando `Empresa` e/ou `Loja` (nunca uma entidade solta — ver
   `modelo-dados.md`), com `@@index` na FK de tenant e soft delete
   (`deletedAt`) se o registro puder ser excluído pelo usuário.
2. **Migration**: `pnpm prisma:migrate` (gera e aplica em dev).
3. **Módulo Nest**: seguir a estrutura de pastas acima — controller fino
   (HTTP + `@Permissions()`/`@Public()`/`@RequireLoja()` conforme o caso),
   service com a regra de negócio e o filtro de `empresaId`/`lojaId`, DTOs
   usando os validators de `src/common/validators/`. Registrar o módulo em
   `AppModule.imports`.
4. **Permissões no seed**: adicionar os códigos novos em `PERMISSOES`
   (`prisma/seed.ts`) usando o `ModuloSistema` correspondente, e espelhá-los
   em `src/common/constants/permissions.constant.ts` (`PERMISSIONS`) — os
   controllers referenciam a constante, nunca a string crua. Rodar
   `pnpm prisma:seed` para popular o catálogo (o `upsert` por `codigo` é
   idempotente).
5. **Loja de contexto**: se o módulo opera sobre dado escopado a uma loja
   específica (estoque, vendas, fiscal), usar `@RequireLoja()` +
   `@LojaAtual()` para obter o `lojaId` validado pelo `LojaAccessGuard`, em
   vez de aceitar `lojaId` do body/params sem checagem.
6. **Documentação**: atualizar `docs/modulos.md` (resumo do módulo),
   `docs/modelo-dados.md` (novas entidades/enums) e `docs/roadmap.md`
   (marcar o módulo como implementado) — e, se fizer sentido, adicionar
   requisições correspondentes na collection do Bruno (`bruno/`).
