---
id: iakaframe-claude
methodId: iakaframe
teamId: iakaframe-8
bindingId: iakaframe-claude-default
node: claude
emits: [".claude/agents/*", ".claude/skills/*", ".claude/hooks/*", "CLAUDE.md"]
---
# Kit iakaframe-claude

Manifeste du livrable généré pour le runner **claude**. L'arborescence runner rangée dans
`kits/iakaframe-claude/` est le gabarit de déploiement (relié method+team+binding).
La **génération automatique** depuis un binding est [différé] : au MVP, le kit est rangé tel quel.

Runner de référence au MVP (un seul binding défaut). Émet subagents, skills, hooks d'identité/périmètre et le contrat CLAUDE.md.
