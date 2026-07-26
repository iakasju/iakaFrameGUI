---
id: portefeuille
level: portfolio
nonDestructive: true
entries:
  - { path: "BACKLOG.md", role: "backlog transverse tenu par le gestionnaire de portefeuille", createIfAbsent: true }
  - { path: "STRATEGIE.md", role: "stratégie logicielle transverse (technique+produit), source de vérité ; infléchie par l'UTILISATEUR SEUL", createIfAbsent: true }
  - { path: "doc/", role: "pages doc portefeuille (contenants remontant README > PROJET.md)", createIfAbsent: true }
  - { path: ".claude/", role: "définitions mutualisées (agent portefeuille + skills)", createIfAbsent: true }
  - { path: ".env", role: "token Forgejo propagé (jamais commité)", createIfAbsent: false }
  - { path: "naonedge-dashboard/", role: "dashboard portefeuille (scan.ps1 -> data/projects.js)", createIfAbsent: false }
---
# Scaffold portefeuille

Échafaudage NON DESTRUCTIF du niveau portefeuille (racine des projets, ex. ~/work), extrait de
`methode-de-travail.md` § hiérarchie/portefeuille et de la mémoire portefeuille (I5). Le seul
agent affecté à ce niveau est le gestionnaire de portefeuille ; les équipes vivent dans
`<projet>/.claude/`.

## `STRATEGIE.md` — structure imposée (gouvernée par l'utilisateur SEUL)

`createIfAbsent: true` + `nonDestructive` (frontmatter) → le fichier est **posé s'il manque**,
**jamais écrasé** s'il existe. Contenu de référence à matérialiser au niveau chapeau, dans cet
ordre (7 sections). Le premier bloc est **figé** (gouvernance) ; Odin **maintient/reflète** la
stratégie, il ne la **réécrit jamais** de lui-même — il propose un **DIFF**, **l'utilisateur SEUL
valide**. Une décision projet **n'infléchit pas** `STRATEGIE.md`.

```markdown
# STRATEGIE — stratégie logicielle transverse du portefeuille

<!-- GOUVERNANCE (bloc figé) : source de vérité de la stratégie transverse. Infléchie par
l'UTILISATEUR SEUL (validation explicite). Odin la MAINTIENT/REFLÈTE, ne la RÉÉCRIT JAMAIS de
lui-même — il propose un DIFF, l'utilisateur valide. Une décision projet n'infléchit pas ce
fichier ; seul l'utilisateur l'infléchit. -->

## 1. Vision produit transverse
Ce qui relie les projets, la direction d'ensemble.

## 2. Piliers techniques
Stack de référence, choix structurants transverses.

## 3. Priorités inter-projets
Ordre de marche entre projets/chantiers (proposé par Odin, validé par l'utilisateur).

## 4. Chantiers transverses
Ceux qui dépassent une seule équipe (cadrés/orchestrés par Odin).

## 5. Principes d'arbitrage
Règles de tranche transverses.

## 6. Décisions gravées
<!-- Puces DATÉES (append) : trace des inflexions VALIDÉES par l'utilisateur. -->
- AAAA-MM-JJ — <décision validée>
```

> Flux d'alimentation : Odin **observe** en fond (`iakaframe observe`, store non-gaté), puis
> **synthétise** l'observation en un **DIFF proposé** de `STRATEGIE.md` que **l'utilisateur valide**
> (seul gate). Jamais de réécriture silencieuse. Calqué sur la ligne de def de `PROJET.md`
> (`odin.md` § Obligation).
