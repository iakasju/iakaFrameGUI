---
id: iakaframe-memoire-humaine
name: iakaframe-memoire-humaine
description: Publier et rafraîchir la mémoire humaine d'un projet — un espace par projet, une vue d'ensemble puis une sous-page par doc structurant (CLAUDE.md, specs/PROJET.md, specs/instructions/*, specs/etat-des-lieux.md, docs/qualite/*), de façon idempotente et non destructive. Utiliser cette skill quand l'utilisateur veut "publier la mémoire humaine", "documenter le projet hors du dépôt", "mettre à jour la mémoire humaine", "publier les specs dans l'espace du projet". Capacité agnostique du produit : l'outil de publication concret est porté par le sous-skill sélectionné à l'install.
layer: capacity
subskills: [iakaframe-appflowy-doc]
---

# iakaframe — Mémoire humaine (capacité)

Tu agis ici comme la **capacité de mémoire humaine** de la méthode iakaframe : tenir, hors
du dépôt, une trace **lisible et durable** des décisions et des docs structurants d'un
projet. C'est **ce qu'on veut faire** — pas **avec quel outil**. Le *comment* concret
(l'outil de publication, ses endpoints, ses identifiants) est **délégué au sous-skill
sélectionné à l'install**, jamais gravé ici.

> **Agnosticisme, règle cardinale.** Cette skill ne nomme **aucun** produit, aucun serveur,
> aucun endpoint, aucune IP, aucune variable d'identifiant. Elle décrit la capacité et ses
> garde-fous ; le concret descend dans la couche produit.

## Ce que porte la capacité

- **Un espace par projet** (nommé d'après le projet).
- Dans cet espace : **une vue d'ensemble** (synthèse + inventaire des sous-pages).
- **Une sous-page par doc structurant**, nommée d'après le **chemin relatif** du fichier.
- **Périmètre = docs structurants** : `CLAUDE.md`, `specs/PROJET.md`,
  `specs/instructions/*`, `specs/etat-des-lieux.md`, `docs/qualite/*`. **Jamais le code**,
  jamais les fichiers générés.
- **Miroir humain** de l'état des lieux du dépôt, pas son remplaçant : c'est la trace
  destinée à être **lue par des humains**.

## Délégation au concret

Le **quoi** est ici ; le **comment** est dans le sous-skill produit :

- Le **produit** (feuille de la chaîne, sélectionné à l'install) porte la **mécanique
  concrète** : outil de publication, base et endpoints, résolution des identifiants, CLI.

Autrement dit : pour *publier/rafraîchir la mémoire humaine*, cette capacité **renvoie au
produit installé** ; l'outil réel est celui **présent chez l'utilisateur** (présence =
sélection).

## Garde-fous (principes, sans nommer de produit)

- **Idempotent** : relancer deux fois laisse le **même état** (espace réutilisé par nom,
  pages rafraîchies sans doublon).
- **Non destructif** : ne toucher **jamais** aux espaces/pages hors du périmètre du projet.
- **Secret jamais commité** : les identifiants d'accès sont fournis par **variables
  d'environnement** (jamais en clair, jamais dans un fichier suivi). Le concret (noms des
  variables, transport) vit dans le produit.
- **Échec propre non bloquant** : configuration absente, service injoignable ou auth
  refusée → **message net + code de sortie non nul**, **sans bloquer** le flux appelant.

## Place dans le cycle

Capacité invoquée aux **moments de documentation** (changement de version, pause/reprise),
typiquement par la gardienne de la mémoire humaine du projet. Les rôles qui l'appellent
réfèrent **cette capacité**, pas un outil particulier ; le produit effectif est celui
**installé chez l'utilisateur**. La même capacité sert tous les environnements sans
réécriture.
