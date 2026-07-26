---
id: projet
level: project
nonDestructive: true
entries:
  - { path: "specs/", role: "espace cadrage / réflexion (jamais de code)", createIfAbsent: true }
  - { path: "specs/PROJET.md", role: "vision projet, specs, sources", createIfAbsent: true }
  - { path: "specs/instructions/", role: "coeur du workflow (une instruction par feature)", createIfAbsent: true }
  - { path: "specs/instructions/_TEMPLATE.md", role: "gabarit d'instruction", createIfAbsent: true }
  - { path: "specs/mock/", role: "données figées pour dev/test (zéro appel API)", createIfAbsent: true }
  - { path: "CLAUDE.md", role: "contrat de rôle runner (stack, conventions, backlog)", createIfAbsent: true }
  - { path: "scripts/quality-report.sh", role: "rapport qualité automatisé", createIfAbsent: true }
  - { path: ".claude/settings.local.json", role: "permissions du runner", createIfAbsent: true }
---
# Scaffold projet

Échafaudage NON DESTRUCTIF d'un projet iakaframe, extrait de `methode-de-travail.md`
§ « La structure du projet reflète le workflow » (I5). On crée ce qui manque, on n'écrase rien.
Le dossier `specs/instructions/` est la trace complète des décisions techniques.
