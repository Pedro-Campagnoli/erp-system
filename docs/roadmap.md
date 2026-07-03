# Roadmap

Este backend hoje só implementa a base multi-tenant (empresas, lojas,
usuários, permissões, planos de assinatura). Nenhum módulo de negócio
(fiscal, financeiro, estoque, vendas) tem model, service ou controller
ainda — só está **reservado** em dois lugares do código:

## O que já está reservado

- **`ModuloSistema`** (`prisma/schema.prisma`): enum já lista `FISCAL`,
  `FINANCEIRO`, `ESTOQUE` e `VENDAS` ao lado de `ADMIN`/`CADASTROS`.
- **Catálogo de permissões** (`prisma/seed.ts`): já existem códigos de
  exemplo semeados para cada módulo futuro, usados só como ponto de partida
  — não têm nenhuma rota que os exija hoje:
  - `fiscal.nfe.emitir`, `fiscal.nfe.cancelar`
  - `financeiro.contas.criar`, `financeiro.contas.aprovar`
  - `estoque.produtos.editar`, `estoque.movimentacoes.criar`
  - `vendas.pedidos.criar`
- **`Plano.recursos`** (`Json`): feature flags por plano
  (`{ "fiscal": true, "financeiro": true, "estoque": false }` nos planos
  semeados) — armazenado, mas nada no código ainda lê esse campo para
  liberar/bloquear uma funcionalidade.
- **`@RequireLoja()`** (`src/common/decorators/require-loja.decorator.ts`):
  decorator pronto para tornar o header `x-loja-id` obrigatório — nenhum
  endpoint atual o usa, mas é o mecanismo esperado para as rotas dos módulos
  operacionais abaixo, que sempre atuam no contexto de uma loja.

## Módulos previstos

- **FISCAL**: emissão/cancelamento de notas fiscais eletrônicas (NF-e).
  Vai precisar de configuração fiscal por loja (certificado digital, série,
  numeração) — provavelmente um novo model `ConfiguracaoFiscal` vinculado a
  `Loja`.
- **FINANCEIRO**: contas a pagar/receber, aprovação de pagamentos. Os
  códigos de permissão já semeados sugerem pelo menos um fluxo de
  criação + aprovação (dois papéis distintos).
- **ESTOQUE**: cadastro de produtos e movimentações. `estoque.produtos.editar`
  e `estoque.movimentacoes.criar` indicam que produto e movimentação são
  duas entidades separadas desde já.
- **VENDAS**: pedidos de venda. Só há um código de permissão semeado até
  agora (`vendas.pedidos.criar`) — o desenho de fluxo (edição, cancelamento,
  faturamento) ainda está em aberto.

## Ao implementar um desses módulos

Siga o checklist de `convencoes.md` ("Checklist para adicionar um módulo de
negócio novo"). Pontos que já se sabe de antemão que vão ser necessários,
por já estarem prontos no schema/infra à espera de uso:

- Toda entidade nova referencia `Loja` (não só `Empresa`) — são módulos
  operacionais, escopados por unidade.
- Usar `@RequireLoja()` + `@LojaAtual()` nos endpoints, em vez de aceitar
  `lojaId` sem validação.
- Decidir (e implementar) como `Plano.recursos` vai efetivamente bloquear o
  acesso a um módulo para empresas cujo plano não o inclui — hoje isso não
  existe, é a lacuna mais visível entre o que o schema promete e o que o
  código faz.
- Os códigos de permissão já semeados são só um ponto de partida; revisar
  se cobrem todas as ações do módulo antes de implementar os controllers.
