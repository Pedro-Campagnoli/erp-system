# Agentes Claude Code deste projeto

Convenção de organização dos agentes/subagentes customizados usados para
trabalhar no ERP. O ERP é composto por mais de um repositório (irmãos, na
mesma pasta `erp-system/`) — hoje `erp-backend` (este) e
[`erp-tests`](../../erp-tests) — e cada um tem seus próprios agentes.

## Onde cada agente vive

- **Específicos de um repositório do ERP** ficam em `.claude/agents/`
  *dentro daquele repositório* — ex.: os agentes de backend ficam em
  [`​.claude/agents/`](../.claude/agents/) aqui no `erp-backend`, e o agente
  de testes fica em `erp-tests/.claude/agents/`. Viajam com qualquer clone
  do repositório correspondente e ficam versionados junto com o código que
  documentam.
- **Genéricos** (reutilizáveis em qualquer projeto, sem relação com ERP)
  ficam em `~/.claude/agents/` (global, fora de qualquer repo) — não devem
  ser versionados em nenhum dos repositórios do ERP.

## Convenção de nomes

Cada agente usa o prefixo do repositório onde vive:

- `erp-backend` — agente principal deste repo, orquestra o trabalho de
  backend e delega para os subagentes abaixo quando aplicável.
- `erp-backend-<especialidade>` — subagentes de uma frente específica do
  backend, ex.: `erp-backend-docs` (mantém esta pasta `docs/`).
- `erp-tests` — agente do repositório `erp-tests`, mantém a suíte E2E
  (hoje cobre a API deste backend; cobrirá o frontend também quando ele
  existir). Ver `erp-tests/.claude/agents/erp-tests.md` para a convenção
  completa de testes.

## Agentes existentes

| Nome                | Repositório  | Papel                                             |
| -------------------- | ------------ | -------------------------------------------------- |
| `erp-backend`        | erp-backend  | Agente principal de backend.                      |
| `erp-backend-docs`   | erp-backend  | Cria/atualiza a documentação em `docs/`.          |
| `erp-tests`          | erp-tests    | Cria/mantém os testes E2E (API hoje, UI depois).  |

## Observações

- Um agente novo criado em `.claude/agents/` só aparece como
  `subagent_type` disponível numa sessão do Claude Code aberta *depois* da
  criação do arquivo — sessões já em andamento não recarregam a lista.
- Se algum agente passar a fazer sentido em outros projetos além deste, a
  ideia é extraí-lo para um repositório próprio de agentes compartilhados
  (ainda não criado) em vez de duplicar o arquivo manualmente em cada
  projeto.
