---
id: iakaframe-claude-default
methodId: iakaframe
teamId: iakaframe-8
node: claude
origin: forge-default
assignments:
  - { personaId: odin,     runner: claude-code, model: "opus",   tools: [Read, Grep, Glob, Bash, Task] }
  - { personaId: aragorn,  runner: claude-code, model: "opus",   tools: [Read, Grep, Glob, Write, Bash, Task] }
  - { personaId: gandalf,  runner: claude-code, model: "opus",   tools: [Read, Grep, Glob, Write, Edit, WebSearch, WebFetch] }
  - { personaId: gimli,    runner: claude-code, model: "sonnet", tools: [Read, Edit, Write, Bash, Grep, Glob] }
  - { personaId: legolas,  runner: claude-code, model: "sonnet", tools: [Read, Grep, Glob, Bash] }
  - { personaId: helm,     runner: claude-code, model: "sonnet", tools: [Read, Grep, Glob, Write, Bash] }
  - { personaId: loki,     runner: claude-code, model: "sonnet", tools: [Read, Write, Edit, Grep, Glob, Bash, WebFetch, WebSearch] }
  - { personaId: nathalie, runner: claude-code, model: "sonnet", tools: [Read, Write, Edit, Grep, Glob, Bash, WebSearch, WebFetch] }
  - { personaId: feanor,   runner: claude-code, model: "opus",   tools: [Read, Grep, Glob, Write, Edit, Bash, WebSearch, WebFetch] }
---
# Binding iakaframe — défaut Claude Code

Appariement **méthode ↔ team** + **triplet `{runner, model, tools}` par persona** (I3 : le SEUL
endroit où vivent `runner`, `model` **et `tools`** ; les personas de `library/personas/` restent
pures). Binding **défaut** au MVP (Q-4 : un seul binding, `claude`) ; les autres runners restent
des kits rangés dans `kits/`.

`tools` = **allowlist d'outils runner-scoped** (pour `runner: claude-code`, les noms d'outils
built-in Claude Code). Les valeurs encodent l'existant **least-privilege** des contrats déployés
(`~/.claude/agents/<persona>.md`, frontmatter `tools:`) — pas un « hérite tout ». Un id d'outil
n'est **pas** un credential. `tools` (par persona) ≠ `connectors` (par team, MCP) : deux axes.

Runner : **claude-code** pour toutes les personas. Les modèles (opus pour
portefeuille/coordination/cadrage, sonnet pour dev/qualité/prod/design/doc) sont un **défaut
suggéré**, surchargeable au cockpit. Source d'inspiration des affectations : `kits/*/MODELES.md`.
