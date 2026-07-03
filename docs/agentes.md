# Agentes Claude Code deste projeto

Convenção de organização dos agentes/subagentes customizados usados para
trabalhar neste projeto.

## Onde cada agente vive

- **Específicos do ERP** (acoplados às convenções e ao domínio deste
  projeto) ficam em [`​.claude/agents/`](../.claude/agents/), dentro do
  próprio repo. Viajam com qualquer clone e ficam versionados junto com o
  código que documentam.
- **Genéricos** (reutilizáveis em qualquer projeto, sem relação com ERP)
  ficam em `~/.claude/agents/` (global, fora do repo) — não devem ser
  versionados aqui.

## Convenção de nomes

Todo agente específico deste projeto usa o prefixo `erp-backend`:

- `erp-backend` — agente principal, orquestra o trabalho de backend e
  delega para os subagentes abaixo quando aplicável.
- `erp-backend-<especialidade>` — subagentes de uma frente específica, ex.:
  `erp-backend-docs` (mantém a pasta `docs/`). Próximos subagentes devem
  seguir o mesmo padrão (`erp-backend-fiscal`, `erp-backend-financeiro`,
  `erp-backend-tests`, etc.) conforme forem criados.

## Agentes existentes

| Nome                | Papel                                                          |
| -------------------- | --------------------------------------------------------------- |
| `erp-backend`        | Agente principal de backend deste projeto.                    |
| `erp-backend-docs`   | Cria/atualiza a documentação em `docs/`.                       |

## Observações

- Um agente novo criado em `.claude/agents/` só aparece como
  `subagent_type` disponível numa sessão do Claude Code aberta *depois* da
  criação do arquivo — sessões já em andamento não recarregam a lista.
- Se algum agente passar a fazer sentido em outros projetos além deste, a
  ideia é extraí-lo para um repositório próprio de agentes compartilhados
  (ainda não criado) em vez de duplicar o arquivo manualmente em cada
  projeto.
