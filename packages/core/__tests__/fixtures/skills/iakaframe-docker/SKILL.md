---
id: iakaframe-docker
name: iakaframe-docker
description: Scaffolde la stack Docker isolée d'un projet iakaframe — réseau, volumes et containers préfixés par projet, avec des ports hôte distincts qui n'entrent jamais en collision avec les autres projets de la famille. Utiliser cette skill quand l'utilisateur veut "mettre le projet sous Docker", "créer le docker-compose", "isoler la stack", "allouer les ports", "dockeriser", ou démarrer l'environnement de dev conteneurisé d'un projet. Matérialise la convention d'isolation Docker par projet de la méthode iakaframe.
layer: product
---

# iakaframe — Stack Docker isolée par projet

Tu agis ici comme l'**opérateur d'environnement**. La méthode iakaframe impose une règle
forte : **chaque projet tourne dans sa propre stack Docker**, sans partager ni réseau, ni
volumes, ni ports avec un autre projet de la famille. Cette skill produit un
`docker-compose` qui respecte cette isolation, sur **Windows + Docker Desktop**.

## Règle d'isolation — NON NÉGOCIABLE

- **Containers nommés/préfixés par projet** : `<projet>-dev-<service>` (ex.
  `robotimmo-dev-db`, `robotimmo-dev-api`).
- **Réseau dédié** : un network nommé `<projet>-dev`. Jamais de réseau partagé entre projets.
- **Volumes nommés/préfixés** : `<projet>-dev-<data>`. Jamais de volume partagé.
- **Ports hôte distincts** : chaque projet **décale** ses ports pour ne jamais entrer en
  collision avec un autre (ex. Postgres : robotimmo `5432` / robby-bo `5433` /
  robbycollect `5434`). Le port **interne** au container reste standard ; c'est le
  mapping hôte qui change.

## Procédure

1. **Choisir le préfixe** = nom du projet (= nom du dossier, cohérent avec le dépôt).
2. **Allouer les ports hôte** sans collision. Avant d'écrire le compose, **vérifier les
   ports déjà pris** par les autres projets de la famille et par Docker Desktop :
   ```bash
   docker ps --format '{{.Names}}\t{{.Ports}}'
   ```
   Réserver une plage propre au projet (ex. `54xx` pour les bases, `30xx` pour le web) et
   la **documenter** dans `CLAUDE.md`.
3. **Écrire `docker-compose.yml`** avec préfixes systématiques :
   ```yaml
   name: <projet>-dev
   services:
     db:
       container_name: <projet>-dev-db
       image: postgres:16
       ports: ["<port-hote-decale>:5432"]   # ex. 5433:5432
       volumes: ["<projet>-dev-pgdata:/var/lib/postgresql/data"]
       networks: ["<projet>-dev"]
   volumes:
     <projet>-dev-pgdata:
   networks:
     <projet>-dev:
   ```
4. **Démarrer et vérifier l'isolation** :
   ```bash
   docker compose up -d
   docker ps --filter "name=<projet>-dev"
   ```
5. **Consigner** dans `CLAUDE.md` : préfixe, réseau, volumes, et le **tableau des ports
   hôte** du projet (pour que le prochain projet sache quoi éviter).

## Garde-fous

- **Aucun partage** de stack/réseau/volume/port entre projets. Si un service doit parler
  à un autre projet, c'est via le réseau hôte/port publié, pas en rejoignant sa stack.
- **Ne jamais supprimer un volume nommé** d'un autre projet (denylist destructif).
- Sur conflit de port au `up`, **décaler** le port hôte du projet courant — ne pas
  toucher à la stack qui tient déjà le port.
- MVP d'abord : ne conteneuriser que les services réellement nécessaires.

## Place dans le cycle

Posée tôt (après l'amorçage, avant le dev) pour que l'environnement de dev soit
reproductible et cloisonné. Le tableau des ports vit dans `CLAUDE.md` et sert de
référence à toute la famille de projets.
