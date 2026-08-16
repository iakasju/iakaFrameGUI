---
id: iakaframe-3phases
name: iakaframe — cadrage → réalisation → staging (+ squad prod)
kind: pipeline
phases:
  - { id: p1, label: Cadrage, actorsRoleKeys: [cadrage], input: besoin, output: "specs/instructions/{feature}.md" }
  - { id: p2, label: Réalisation, actorsRoleKeys: [dev, qualite], input: instruction, output: "branche + commits + verdict PASS" }
  - { id: p3, label: Staging, actorsRoleKeys: [dev, qualite], input: PASS, output: "build en staging vX.Y.Z-rc" }
  - { id: prod, label: Déploiement prod, side: prod, actorsRoleKeys: [deploiement], input: "rc recettée + feu vert humain", output: "prod (alias de version) + rollback prêt" }
  - { id: surveillance, label: Veille de production, side: prod, actorsRoleKeys: [surveillance], input: "une production en service", output: "état de santé + alerte motivée" }
gates:
  - { afterPhase: p1, kind: human, criteria: "l'utilisateur valide l'instruction" }
  - { afterPhase: p2, kind: auto,  criteria: "typecheck + lint + tests verts (verdict Legolas PASS, indépendant)" }
  - { afterPhase: p3, kind: auto,  criteria: "build/déploiement staging OK" }
  - { afterPhase: prod, kind: human, criteria: "feu vert prod tracé (squad prod, Charon ; jamais franchi seul)" }
# 🛑 AUCUN gate pour l'étape `surveillance`, et c'est une DÉCLARATION, pas un oubli. Un gate y
# ferait attendre un feu vert humain à une mission dont la nature même est d'agir SANS ORDRE —
# ce qui nierait la ligne de partage du squad prod dans le fichier même qui la décrit. Si un
# parseur venait à exiger un gate par étape : REMONTER, ne pas en inventer un.
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

La **mise en production** n'est **pas une phase** de la chaîne de dev : ce sont **deux étapes prod
séparées** (`side: prod`), portées par un **squad prod à deux postes** — et ce qui les sépare est
leur **nature**, pas leur contenu :

| Étape | Rôle | Déclencheur | Gate | Ce qu'elle fait |
|---|---|---|---|---|
| `prod` | `deploiement` | **feu vert humain tracé** | **humain** | bascule par alias de version, accès (proxy inversé, SSO), **rollback** |
| `surveillance` | `surveillance` | **aucun** — elle agit **sans ordre** | **aucun** | health-checks, disponibilité, charge, **alerte motivée** |

L'étape `prod` est la **couture humaine** entre staging et prod (arbitrage Q-3 : étape prod +
gate humain **dans le même workflow**, pas un workflow distinct). L'étape `surveillance` a été
**ajoutée** à la scission du squad prod du 2026-08-08 — elle n'élargit pas la précédente : écrire
`actorsRoleKeys: [deploiement, surveillance]` sur une seule étape aurait fait porter **le gate
humain** à la veille, ce qui aurait nié la ligne de partage. **L'absence de gate sur `surveillance`
EST la déclaration formelle de « sans ordre ».**

> **Le nom du workflow ne change pas** (`iakaframe-3phases`) : même doctrine d'id opaque que la
> team — la chaîne de dev compte toujours **3 phases**, et le squad prod n'en est pas une, quel
> que soit le nombre d'étapes qu'il porte.

> Règle absolue : la phase de cadrage ne touche jamais au code de production. Le gate qualité est
> **indépendant** (auto-validation interdite — anti-dérive « Gimli solo »).
