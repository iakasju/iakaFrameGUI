# Schémas déployables Claude Code — vérifiés (étape 0 de P3)

> Vérifié le **2026-07-06** contre la doc officielle `code.claude.com/docs` (par la coordination — le dev n'a pas d'accès web). Table « prévu (inventaire P0) vs confirmé (doc) ». En cas de doute, **générer minimal viable**.
> Sources : https://code.claude.com/docs/en/sub-agents · https://code.claude.com/docs/en/hooks · https://code.claude.com/docs/en/skills · https://code.claude.com/docs/en/mcp

## 1. Subagent — `.claude/agents/<id>.md`
Frontmatter YAML + corps Markdown (= system prompt du persona).
- **`name`** — requis (identifiant).
- **`description`** — requis (sert à la délégation ; écrire clair).
- **`tools`** — optionnel (liste séparée par virgules ; si absent = hérite des outils courants). = l'allowlist du persona.
- **`model`** — optionnel → **À OMETTRE** (invariant P3 : la forge ne pose pas de modèle ; c'est la liaison run-time du Cockpit). Confirmé : le modèle est optionnel/héritable.
- Autres champs (disallowedTools, permissionMode, skills, mcpServers, hooks, color…) existent mais **HORS MVP** — ne pas générer.

**Gabarit MVP à générer** :
```markdown
---
name: <persona-id>
description: <rôle + quand déléguer>
tools: <liste des tools du persona, si définis>
---

<system prompt : rôle, périmètre, identité>
```
Prévu vs confirmé : ✅ conforme (name/description requis, model omissible confirmé).

## 2. Skill — `.claude/skills/<name>/SKILL.md`
Suit le standard ouvert Agent Skills. Frontmatter minimal :
- **`name`** — requis. **`description`** — requis (déclenche l'auto-invocation).
- Optionnels HORS MVP : `allowed-tools`, `context`, `agent`, `disable-model-invocation`, `user-invocable`, `argument-hint`… — ne pas générer au MVP.
- NB : « les custom commands ont fusionné dans les skills » ; `.claude/commands/*.md` marche encore mais on génère des **skills**.

**Gabarit MVP** :
```markdown
---
name: <skill-id>
description: <quoi + quand>
---

<instructions ; stub si le corps n'est pas éditable en P1>
```

## 3. Hooks + permissions — `.claude/settings.json` (gardes AR-8)
Format CONFIRMÉ :
```json
{
  "hooks": {
    "<Event>": [
      { "matcher": "<filtre outil>", "hooks": [
        { "type": "command", "command": "<script>", "args": [], "timeout": 600 }
      ]}
    ]
  },
  "permissions": { "allow": [...], "ask": [...], "deny": [...] }
}
```
Événements de nos gardes — **tous confirmés présents** dans la liste officielle (30 événements) :
- **identity-guard** → `Stop` + `SubagentStop` (+ `UserPromptSubmit` pour le remind). ✅
- **perimeter-guard** → `PreToolUse`, matcher `Edit|Write|Bash|NotebookEdit`. ✅ (matcher = regex outils, `A|B` supporté — confirmé)
- **delegation-guard** → `PreToolUse`, matcher `Task`. ✅
- `type: "command"`, `command` = chemin du script (utiliser `${CLAUDE_PROJECT_DIR}/.claude/hooks/<script>.mjs`), `timeout` optionnel. ✅
Les scripts `.mjs` sont **copiés** de `global/hooks/` vers `.claude/hooks/` (Q-5). Le canal d'identité est **câblé, jamais réécrit**.

## 4. MCP — `.mcp.json` (si ≥1 connecteur)
Format CONFIRMÉ :
```json
{ "mcpServers": {
  "<nom>": { "type": "stdio", "command": "...", "args": [...], "env": { "K": "$K" } },
  "<nom2>": { "type": "http", "url": "https://..." }
} }
```
Générer **seulement si** la team déclare des connecteurs (G-4).

## 5. CLAUDE.md
Instructions projet + rappel méthode (le fichier d'instructions du nœud). Format libre Markdown. NB : sur d'autres runners = `AGENTS.md` (P3b).

## Écarts / prudence
- L'inventaire P0 annonçait « ~31 hooks / v2.1.x » → **confirmé 30 événements** ; les détails de version restent mouvants → **ne câbler que le strict nécessaire** (les 3 gardes ci-dessus + permissions basiques).
- Ne PAS générer : plugins, output-styles, settings multi-niveaux, `.lsp.json`, monitors (hors MVP).
