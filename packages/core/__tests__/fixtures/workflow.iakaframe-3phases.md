---
id: iakaframe-3phases
name: iakaframe — cadrage → réalisation → staging (+ squad prod)
kind: pipeline
phases:
  - { id: p1, label: Cadrage, actorsRoleKeys: [cadrage], input: besoin, output: "specs/instructions/{feature}.md" }
  - { id: p2, label: Réalisation, actorsRoleKeys: [dev, qualite], input: instruction, output: "branche + commits + verdict PASS" }
  - { id: p3, label: Staging, actorsRoleKeys: [dev, qualite], input: PASS, output: "build en staging vX.Y.Z-rc" }
  - { id: prod, label: Déploiement prod, side: prod, actorsRoleKeys: [deploiement], input: "rc recettée + feu vert humain", output: "prod (alias de version) + surveillance/rollback" }
gates:
  - { afterPhase: p1, kind: human, criteria: "l'utilisateur valide l'instruction" }
  - { afterPhase: p2, kind: auto,  criteria: "typecheck + lint + tests verts (verdict Legolas PASS, indépendant)" }
  - { afterPhase: p3, kind: auto,  criteria: "build/déploiement staging OK" }
  - { afterPhase: prod, kind: human, criteria: "feu vert prod tracé (squad Helm ; jamais franchi seul)" }
---
# Workflow iakaframe — 3 phases (cible staging) + squad prod

Extrait en donnée depuis `methode-de-travail.md` § « Les 3 phases (cible staging) + le squad
prod » (le narratif reste la référence, I5).

Un **décideur humain** et une chaîne en **3 phases** dont la **cible est le staging** :

1. **P1 — Cadrage** (rôle `cadrage`) : le besoin devient une **instruction fermée et vérifiable**
   dans `specs/instructions/`. Lecture seule sur le code. **Gate humain** : l'utilisateur valide.
2. **P2 — Réalisation** (rôles `dev` + `qualite`) : implémentation en **commits atomiques** +
   **gate qualité** indépendant (typecheck, lint, tests). Verdict **PASS** pour avancer.
3. **P3 — Déploiement staging** (rôles `dev` en devops + `qualite`) : build + mise en **staging**
   (`vX.Y.Z-rc`). **La chaîne s'arrête au staging.**

La **mise en production** n'est **pas une phase** de la chaîne de dev : c'est une **étape prod
séparée** (`side: prod`) portée par le **squad prod** (rôle `deploiement`), déclenchée sur un
**feu vert humain tracé** — couture humaine entre staging et prod (arbitrage Q-3 : étape prod +
gate humain **dans le même workflow**, pas un workflow distinct). Elle inclut le déploiement par
alias de version, la surveillance et le rollback.

> Règle absolue : la phase de cadrage ne touche jamais au code de production. Le gate qualité est
> **indépendant** (auto-validation interdite — anti-dérive « Gimli solo »).
