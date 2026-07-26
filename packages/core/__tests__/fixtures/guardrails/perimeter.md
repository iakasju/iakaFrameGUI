---
id: perimeter
label: Périmètre des gestes directs
kind: perimeter
hook: "PreToolUse (Edit|Write|Bash|NotebookEdit)"
policy: "Un geste mutateur direct qui SORT du périmètre autorisé (ancré sur CLAUDE_PROJECT_DIR) est journalisé puis signalé (WARN) ou bloqué (DENY) ; jamais d'écriture/commit hors du projet courant."
---
# Périmètre des gestes directs

Garde-fou iakaframe extrait de `methode-de-travail.md` et de `kit-claude/global/hooks/*`
(le narratif reste la référence, I5).

**Politique.** Un geste mutateur direct qui SORT du périmètre autorisé (ancré sur CLAUDE_PROJECT_DIR) est journalisé puis signalé (WARN) ou bloqué (DENY) ; jamais d'écriture/commit hors du projet courant.

Garde du canal des gestes DIRECTS (hook `perimeter-guard` sur PreToolUse, matcher Edit|Write|Bash|NotebookEdit) : détecte les chemins touchés, ancre sur `$CLAUDE_PROJECT_DIR` (pas le cwd du payload), fail-open partout. Garde de CHEMINS, jamais de personas.
