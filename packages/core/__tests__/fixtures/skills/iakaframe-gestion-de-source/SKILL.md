---
id: iakaframe-gestion-de-source
name: iakaframe-gestion-de-source
description: Versionner le travail d'un projet sur un gestionnaire de source — committer, historiser, brancher un dépôt distant et pousser, avec les garde-fous de la méthode (commits atomiques, jamais de reset --hard ni de push --force, secret jamais commité). Utiliser cette skill quand l'utilisateur veut "versionner le projet", "committer", "historiser le travail", "brancher un dépôt distant", "pousser le code", ou quand une commande init/update a besoin de mettre le projet sous gestion de source. Capacité agnostique du produit : le serveur concret est porté par le sous-skill sélectionné à l'install.
layer: capacity
subskills: [iakaframe-git]
---

# iakaframe — Gestion de source (capacité)

Tu agis ici comme la **capacité de versionnement** de la méthode iakaframe : mettre le
travail d'un projet sous gestion de source, l'historiser et le pousser sur un dépôt
distant. C'est **ce qu'on veut faire** — pas **avec quel outil**. Le *comment* concret
(protocole, serveur, API, credentials) est **délégué au sous-skill sélectionné à
l'install**, jamais gravé ici.

> **Agnosticisme, règle cardinale.** Cette skill ne nomme **aucun** produit, aucun
> serveur, aucun endpoint, aucune IP, aucun token. Elle décrit la capacité et ses
> garde-fous ; le concret descend dans la couche produit.

## Ce que porte la capacité

- **Mettre sous gestion de source** un projet neuf ou existant (dépôt local + dépôt
  distant), sans jamais écraser un dépôt ou un remote déjà en place.
- **Historiser** le travail par **commits atomiques et fréquents**, en *conventional
  commits* (`feat:`, `fix:`, `chore:`, `wip:`…) — le filet de sécurité de la méthode.
- **Pousser** l'historique vers le dépôt distant du projet.
- **Auto-détecter** l'état : dépôt distant déjà présent (on rebranche/pousse) vs absent
  (on crée puis on pousse) — la bascule amorçage ↔ checkpoint repose sur ce constat.

## Délégation au concret

Le **quoi** est ici ; le **comment** est dans la chaîne de sous-skills :

- La **famille** (`iakaframe-git`) porte la mécanique du **protocole** (initialiser,
  committer, brancher un remote, pousser) — sans nommer de serveur.
- Le **produit** (feuille de la chaîne, sélectionné à l'install) porte la **mécanique
  concrète** : serveur, pattern d'URL, API de création de dépôt, credentials.

Autrement dit : pour *committer et pousser*, cette capacité **renvoie à
`iakaframe-git`** ; le serveur réel est le **produit installé chez l'utilisateur**.

## Garde-fous (principes, sans nommer de produit)

- **Commits atomiques et fréquents** en *conventional commits* — jamais un mégacommit
  fourre-tout.
- **Jamais de `git reset --hard` ni de `git push --force`** côté IA (filet de sécurité).
- **Secret jamais commité** : le credential d'accès au dépôt distant (quel qu'il soit)
  n'est **jamais** écrit en dur, ni dans un fichier suivi, ni dans un log, ni dans l'URL
  d'un remote committé. Le concret (nom de la variable, transport) vit dans le produit.
- **Ne jamais écraser** un dépôt distant ou un `origin` existant : s'il est là, on le
  conserve.
- **Description ASCII** des métadonnées de dépôt quand le produit l'exige — détail porté
  par la couche produit.

## Place dans le cycle

Capacité invoquée par l'**amorçage** (`iakaframe-init`) et par le **checkpoint**
(`iakaframe-update`) : ces orchestrateurs réfèrent **cette capacité**, pas un serveur
particulier. Le produit source-control effectif est celui **installé chez l'utilisateur**
(présence = sélection). La même capacité sert tous les environnements sans réécriture.
