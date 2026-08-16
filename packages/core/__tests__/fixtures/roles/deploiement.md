---
id: deploiement
key: deploiement
label: Équipe de déploiement production
roleIndex: 6
scope: team
---
# Équipe de déploiement production

Rôle du référentiel iakaframe extrait de `specs/equipe-agents.md` et
`specs/glossaire-iakaframe.md` (le narratif reste la référence, I5). À charge d'une persona de
le caster.

Squad prod séparé : déploiement prod par alias, accès (proxy, SSO), rollback. **Sur feu vert humain.**

> **La surveillance N'EST PLUS ici.** Elle a son propre rôle — `surveillance` (`roleIndex: 10`),
> incarné par un persona dédié — depuis la scission du squad prod du 2026-08-08
> (`specs/instructions/scission-squad-prod-charon-helm.md`). Ligne de partage opposable :
> *`deploiement` agit **sur ordre**, `surveillance` agit **sans ordre**.*

