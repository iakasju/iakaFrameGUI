---
id: iakaframe-conteneurisation
name: iakaframe-conteneurisation
description: Isoler l'environnement d'exécution d'un projet — chaque projet tourne dans sa propre stack, avec réseau, volumes et conteneurs préfixés par projet et des ports hôte distincts qui n'entrent jamais en collision avec les autres projets de la famille. Utiliser cette skill quand l'utilisateur veut "isoler la stack", "cloisonner l'environnement", "allouer les ports du projet", "monter l'environnement de dev conteneurisé", ou quand un projet doté d'un runtime a besoin d'un environnement reproductible et étanche. Capacité agnostique du produit : le moteur de conteneurs concret est porté par le sous-skill sélectionné à l'install.
layer: capacity
subskills: [iakaframe-docker]
---

# iakaframe — Conteneurisation (capacité)

Tu agis ici comme la **capacité d'isolation d'environnement** de la méthode iakaframe :
chaque projet doté d'un runtime tourne dans **sa propre** stack, cloisonnée de toutes les
autres. C'est **ce qu'on veut faire** — pas **avec quel moteur**. Le *comment* concret
(moteur de conteneurs, format de fichier de stack, CLI) est **délégué au sous-skill
sélectionné à l'install**, jamais gravé ici.

> **Agnosticisme, règle cardinale.** Cette skill ne nomme **aucun** moteur, aucun produit,
> aucun outil concret, aucun endpoint. Elle décrit la capacité et ses garde-fous ; le
> concret descend dans la couche produit. Le mot **« conteneur »** est légitime (c'est la
> capacité) ; un **nom de moteur** ne l'est pas.

## Ce que porte la capacité

- **Isoler par projet** : chaque projet a **sa propre** stack — jamais de partage de
  réseau, de volumes ni de ports avec un autre projet de la famille.
- **Préfixer par projet** : conteneurs, réseau et volumes portent le **nom du projet** en
  préfixe, pour qu'on sache toujours à qui appartient une ressource.
- **Allouer des ports hôte distincts** : chaque projet **décale** ses ports publiés pour ne
  jamais entrer en collision avec un autre. Le port **interne** reste standard ; c'est le
  mapping hôte qui change.
- **Reproductibilité** : l'environnement décrit est le même d'une machine à l'autre, sans
  réglage manuel.

## Délégation au concret

Le **quoi** est ici ; le **comment** est dans le sous-skill produit :

- Le **produit** (feuille de la chaîne, sélectionné à l'install) porte la **mécanique
  concrète** : moteur de conteneurs, format du fichier de stack, commandes de démarrage,
  conventions de nommage réelles.

Autrement dit : pour *monter la stack isolée*, cette capacité **renvoie au produit
installé** ; le moteur réel est celui **présent chez l'utilisateur** (présence = sélection).

## Garde-fous (principes, sans nommer de produit)

- **Aucun partage** de stack, de réseau, de volume ni de port entre projets. Si un service
  doit parler à un autre projet, c'est via un port publié, jamais en rejoignant sa stack.
- **Ne jamais supprimer un volume** appartenant à un autre projet (geste destructif).
- Sur **conflit de port**, **décaler** le port hôte du projet courant — ne pas toucher à la
  stack qui tient déjà le port.
- **MVP d'abord** : ne conteneuriser que les services **réellement nécessaires**, pas de
  stack vide « au cas où ».

## Place dans le cycle

Capacité **conditionnelle** et **post-amorçage** : invoquée **après l'amorçage, avant le
dev**, **uniquement** quand le projet a un **runtime** à isoler (services, base, web). Un
dépôt de docs, une library ou un CLI n'ont rien à conteneuriser → on la saute. Les
orchestrateurs qui l'appellent réfèrent **cette capacité**, pas un moteur particulier ; le
produit effectif est celui **installé chez l'utilisateur**. La même capacité sert tous les
environnements sans réécriture.
