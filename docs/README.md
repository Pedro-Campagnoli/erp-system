# Documentação — ERP Backend

Documentação interna de arquitetura e convenções, complementar ao
[`README.md`](../README.md) (que cobre setup e como rodar o projeto). O
objetivo aqui é permitir entender o sistema sem reler todo o código-fonte.

- [`arquitetura.md`](./arquitetura.md) — modelo multi-tenant (Empresa >
  Loja > Usuário), o pipeline de uma requisição (middleware de tenant →
  guards de auth/permissão/loja/plataforma → controller → service → Prisma)
  e os dois RBACs separados do sistema: permissões de tenant (Papel/
  Permissão) e administração de plataforma (`superAdmin`/`SuperAdminGuard`).
- [`modelo-dados.md`](./modelo-dados.md) — passeio pelas entidades de
  `prisma/schema.prisma`, seus relacionamentos e enums, e o porquê de
  decisões não óbvias (`Papel.empresaId` opcional, `Permissao.modulo` e
  `MODULOS_PLATAFORMA`, `superAdmin` sem `UsuarioLoja`, campos já reservados
  para módulos futuros).
- [`modulos.md`](./modulos.md) — o que cada módulo em `src/` faz e as
  regras de negócio relevantes para quem for mexer neles.
- [`convencoes.md`](./convencoes.md) — validators customizados em pt-BR,
  formato de erro da API, padrão de resposta, estrutura de pastas por
  módulo e o checklist para adicionar um módulo novo.
- [`roadmap.md`](./roadmap.md) — módulos de negócio previstos (fiscal,
  financeiro, estoque, vendas) e o que já está reservado no
  schema/seed/infra para eles.
- [`agentes.md`](./agentes.md) — organização e convenção de nomes dos
  agentes Claude Code deste projeto (`erp-backend`, `erp-backend-docs` e
  próximos subagentes).
