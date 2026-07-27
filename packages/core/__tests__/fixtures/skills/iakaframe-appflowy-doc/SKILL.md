---
id: iakaframe-appflowy-doc
name: iakaframe-appflowy-doc
description: Publier/rafraîchir la mémoire humaine d'un projet dans AppFlowy auto-hébergé selon le modèle iakadoc — un espace par projet, arborescence 00 Vue d'ensemble / 10 Le projet / 20 Où on en est / 30 Décisions & cadrage / 40 Qualité / 90 Notes, alimentée par CLAUDE.md, specs/PROJET.md, specs/instructions/*, specs/etat-des-lieux.md, docs/qualite/*. À utiliser quand il faut "documenter le projet dans AppFlowy", "mettre à jour la mémoire humaine", "publier les specs dans AppFlowy". Idempotent et non destructif ; le workspace cible est explicite, jamais deviné.
layer: product
---

# iakaframe — appflowy-doc

Exécuteur machine de la **mémoire humaine** AppFlowy (cf. `methode-de-travail.md` →
« Cycle de documentation → Mémoire humaine »). Publie/rafraîchit les **docs structurants**
d'un projet dans une instance AppFlowy auto-hébergée, par instrumentation, sans geste manuel.

> **Action récurrente portée par 📖 Nathalie** (gardienne de la mémoire humaine du projet).
> C'est sa skill-outil ; elle la déclenche aux moments de documentation (version, pause/reprise).

Le CLI `appflowy-doc.mjs` est **Node pur, zéro dépendance** (`fetch` natif) : pas de
`npm install`, fonctionne tel quel partout où Node ≥ 18 est présent.

## Le modèle `iakadoc` (arborescence publiée)

```
[WORKSPACE]  projects
└── [ESPACE]  <Projet>
    ├── 00 · Vue d'ensemble ................ GÉNÉRÉE (version, sections présentes/absentes, compteurs)
    ├── 10 · Le projet ..................... [conteneur] GÉNÉRÉ
    │   ├── 11 · Cadre de travail .......... ← CLAUDE.md
    │   └── 12 · Vision & décisions ........ ← specs/PROJET.md
    ├── 20 · Où on en est .................. ← specs/etat-des-lieux.md
    ├── 30 · Décisions & cadrage ........... [conteneur] GÉNÉRÉ
    │   ├── 30 · (index) ................... GÉNÉRÉ · date de modif. décroissante puis nom
    │   └── <une page par instruction> ..... ← specs/instructions/*.md
    ├── 40 · Qualité ....................... [conteneur] GÉNÉRÉ
    │   ├── 40 · (index) ................... GÉNÉRÉ · version décroissante
    │   └── <une page par version> ......... ← docs/qualite/vX.Y.Z.md
    ├── 50 · Recette (RQV) ................. ⏳ collecte activée au lot 4
    ├── 60 · Guide utilisateur ............. ⏳ collecte activée au lot 4
    └── 90 · Notes ......................... HUMAINE · create-if-missing · JAMAIS ÉCRASÉE
```

**Règles normatives**

- Séparateur des entrées de premier niveau : espace + `·` (U+00B7) + espace. `70` et `80`
  sont **réservés**.
- Les pages feuilles portent le **titre lisible** du document (1er `#` du fichier, à défaut
  le nom de fichier sans extension) — **plus jamais le chemin brut**. Le chemin source figure
  dans l'avertissement en tête de page. Deux titres identiques sont désambiguïsés par le
  nom de fichier.
- **Sections vides non créées** : elles sont listées comme absentes dans `00 · Vue d'ensemble`.
- **Ordre garanti** de `00` à `90`, et de l'index puis des feuilles dans chaque conteneur :
  l'ordre de création AppFlowy est non déterministe, l'ordre est donc **imposé** par un
  appel `move` par page mal placée.
- Les conteneurs sont créés **une fois** et **jamais** mis à la corbeille.

### Docs structurants collectés

`CLAUDE.md`, `specs/PROJET.md`, `specs/etat-des-lieux.md`, `specs/instructions/*.md`,
`docs/qualite/*.md`. **Jamais le code ni les fichiers générés.**

> **Exclusion des gabarits — règle sans exception** : tout fichier dont le **nom de base**
> commence par `_` (`_TEMPLATE.md`, `_workflow.md`, `_arborescence.md`, `_AGENT_TEMPLATE.md`…)
> est un gabarit et **n'est JAMAIS publié**. Un projet qui voudrait publier un tel fichier
> doit le **renommer**.

### Miroir strict et zone humaine

- Chaque page **générée** (`00`–`60`) porte, en **tout premier bloc**, l'avertissement :
  *« Page générée depuis `<source>` le `<date ISO>`. Toute modification faite ici sera perdue
  au prochain rafraîchissement. Pour écrire, utiliser « 90 · Notes ». »*
- Chaque page générée porte en plus le drapeau **`is_locked`** (verrou **déclaratif** : le
  client AppFlowy l'affiche verrouillée, le serveur n'oppose aucune résistance — la skill
  continue donc d'écrire).
- **`90 · Notes`** est créée si absente, puis **jamais** réécrite, **jamais** verrouillée,
  **jamais** mise à la corbeille — elle et **tous ses descendants**, quels qu'ils soient.

## Identifiants et workspace cible (résolution en cascade — jamais commités)

Les trois identifiants sont résolus dans cet ordre, **l'env ayant toujours priorité** :

1. **Variables d'env** : `APPFLOWY_URL`, `APPFLOWY_EMAIL`, `APPFLOWY_PASSWORD`.
2. **Repli fichier** : pour toute variable **encore absente** de l'env, lecture d'un fichier
   dotenv local — `$IAKAFRAME_APPFLOWY_ENV` s'il est défini, sinon
   `~/.config/iakaframe/appflowy.env`. Fichier absent/illisible → ignoré silencieusement.

| Variable | Rôle |
|---|---|
| `APPFLOWY_URL` | base de l'instance AppFlowy (ex. `http://host:3008`) |
| `APPFLOWY_EMAIL` | compte AppFlowy |
| `APPFLOWY_PASSWORD` | mot de passe |
| `APPFLOWY_WORKSPACE` | **workspace cible** : un **nom** exact ou un **`workspace_id`** |

**Le workspace cible est EXPLICITE.** Cascade : `--workspace` → env `APPFLOWY_WORKSPACE` →
fichier dotenv → **défaut : le workspace nommé `projects`**. Aucune correspondance →
**échec propre, code de sortie non nul, message citant les workspaces disponibles**.
**Jamais de repli sur le premier workspace renvoyé par l'API** : avec plusieurs workspaces et
aucun ordre garanti, la cible changerait d'une exécution à l'autre et l'idempotence ne
tiendrait plus. Deux workspaces homonymes → refus explicite, à départager par `workspace_id`.

**Format du fichier** (`KEY=VALUE`, un par ligne ; `#` = commentaire ; quotes entourantes
optionnelles) :

```
APPFLOWY_URL=http://host:port
APPFLOWY_EMAIL=email
APPFLOWY_PASSWORD=motdepasse
APPFLOWY_WORKSPACE=projects
```

> **Sécurité** : `chmod 600 ~/.config/iakaframe/appflowy.env`, **jamais commité** (ni le
> fichier, ni son contenu). Si après la cascade une valeur manque encore, message net citant
> **et** les variables d'env **et** le chemin du fichier attendu, code de sortie non nul.

## Utilisation

```bash
node appflowy-doc.mjs --project IakaPcl --root ~/work/IakaPcl
node appflowy-doc.mjs --project IakaPcl --root ~/work/IakaPcl --workspace projects
```

Résout les docs structurants présents sous `--root`, garantit l'espace `--project` dans le
workspace cible, construit l'arborescence `00`–`90`, régénère les pages générées, préserve
`90 · Notes`, verrouille les pages générées puis impose l'ordre canonique.

## Idempotence & non-destructivité

- **Espace** : réutilisé par nom s'il existe, créé sinon (jamais de doublon).
- **Conteneurs** (`10`, `30`, `40`) : créés une fois, **jamais** corbeillés.
- **Pages générées** : mise à jour = mise en corbeille de l'ancienne + recréation du contenu
  frais (l'API n'expose pas de remplacement in-place). **Relancer deux fois = même état.**
- **`90 · Notes`** : jamais touchée après création.
- Ne touche jamais aux espaces/pages hors périmètre du projet, ni à un autre workspace.

> ⚠️ **Sédiment connu** : la stratégie « corbeille puis recrée » laisse les anciennes versions
> **dans la corbeille** du workspace, sans jamais la vider. Le rafraîchissement incrémental
> par empreinte (lot 3) réduira le phénomène ; le vidage des débris se fait par
> `appflowy-purge.mjs --trash` (geste explicite et confirmé, cf. ci-dessous).

## Purge — `appflowy-purge.mjs` (outil **destructif**, désarmé par défaut)

Une purge = **deux appels** : `move-to-trash` **puis** `DELETE /trash/{view_id}`. S'arrêter à
la corbeille n'est **pas** une purge : le contenu resterait accessible.

```bash
# 1. inventaire — LECTURE SEULE, aucune écriture, comportement par DÉFAUT :
node appflowy-purge.mjs --workspace "<nom|id>" --space IakaCockpit --space IakaPcl \
     --page "iakaframe — preuve de concept API" --trash --dry-run

# 2. exécution — les DEUX drapeaux sont exigés, sinon rien n'est supprimé :
node appflowy-purge.mjs --workspace "<nom|id>" ... --execute --confirm <workspace_id>
```

- `--workspace` est **obligatoire** : aucun workspace par défaut pour un geste destructif.
- Sans `--execute`, le script **liste** et ne supprime rien.
- `--confirm` attend le **`workspace_id` résolu** : une commande copiée d'un autre contexte
  ne peut pas purger le mauvais workspace.
- **`90 · Notes` et tous ses descendants sont refusés comme cibles**, quoi qu'on demande.
- Une cible absente est **signalée**, jamais une erreur.
- Le chemin de publication (`appflowy-doc.mjs`) n'appelle **jamais** ce script.

## Mécanismes API (vérifiés en réel — spike lot 0, 2026-07-27, AppFlowy Cloud **0.15.21**)

1. Auth : `POST {base}/gotrue/token?grant_type=password` → `access_token` (~2 h).
2. Provision idempotente : `GET {base}/api/user/verify/{token}`.
3. Workspaces : `GET {base}/api/workspace` → `data[]` (`workspace_id`, `workspace_name`).
4. Arbre : `GET {base}/api/workspace/{wid}/folder?depth=N` — **`depth` tronque strictement**
   l'arbre rendu : la skill impose **`depth ≥ 6`**, sans quoi le modèle `00`–`90` serait amputé.
5. Créer un **espace** : `POST {base}/api/workspace/{wid}/space`
   `{name, space_permission, space_icon, space_icon_color}` → `view_id` (`is_space:true`).
6. Créer une page : `POST {base}/api/workspace/{wid}/page-view`
   `{parent_view_id, layout:0, name}` — `parent_view_id` accepte **une page** : l'imbrication
   fonctionne (3 niveaux relus).
7. Écrire : `POST {base}/api/workspace/{wid}/page-view/{vid}/append-block` `{"blocks":[…]}`.
8. **Ordonner** : `POST {base}/api/workspace/{wid}/page-view/{vid}/move`
   `{new_parent_view_id, prev_view_id}` — `prev_view_id: null` place en tête.
9. **Renommer / verrouiller** : `PATCH {base}/api/workspace/{wid}/page-view/{vid}`
   `{name, is_locked}` — le champ **`name` est obligatoire** (HTTP 400 sinon).
10. Corbeille : `POST …/page-view/{vid}/move-to-trash` (un espace y part avec **tous** ses
    descendants en un seul appel) ; inventaire `GET …/trash` (charge utile sous **`data.views`**) ;
    **suppression définitive `DELETE …/trash/{view_id}`**. `DELETE …/page-view/{vid}` → 405.
11. Recherche : `GET {base}/api/search/{wid}?query=…&mode=keyword` — **`mode=keyword` est
    obligatoire** ; les modes `semantic`/`hybrid` échouent faute d'embeddings. **Ne jamais
    configurer de clé OpenAI** : l'index mots-clés est local et suffit.

> ⚠️ **Le code HTTP ne prouve rien** : `append-block` renvoie 200 pour un type de bloc
> **inventé**, qui est persisté tel quel. La validité des blocs produits ne peut donc venir
> que des **tests unitaires du mapper**, jamais d'une recette « ça répond 200 ».

## Mise en forme

MVP = **paragraphes texte fidèles** (un paragraphe par ligne), plus les blocs `heading` et
`bulleted_list` pour les pages générées (vue d'ensemble, index). Les niveaux de titre au-delà
de `###` sont **clampés au niveau 3** (le rendu des niveaux supérieurs n'est pas vérifiable).
Le rendu riche du Markdown source (titres, listes, code fencé, citations, tableaux) est le
**lot 2**.

## Échec propre

Config absente, instance injoignable, auth refusée, **workspace introuvable** → **message net
+ code de sortie non nul**, sans stacktrace et **sans bloquer** le flux appelant. Token expiré
→ ré-auth automatique. Fichier illisible → ignoré proprement.

## Tests

`node test.mjs` — tests unitaires des fonctions **pures** (exclusion des gabarits, titres
lisibles, ordres canoniques, plan d'arborescence, plan de déplacement, sélection du workspace,
plan de purge, parseur dotenv) **et** de l'orchestration complète contre un **faux serveur en
mémoire** qui rejoue les comportements mesurés au spike (ordre de création non déterministe,
`move`, `PATCH name` obligatoire, corbeille). Le contrat HTTP du client est vérifié avec
`fetch` stubbé. **Aucun réseau, aucune instance touchée, aucun secret** (fixtures bidon).

## Hors périmètre (différé tracé)

- **Lot 2** : rendu riche Markdown → blocs (titres, listes, code, citations, tableaux en
  préformaté, inline gras/italique/code/lien).
- **Lot 3** : rafraîchissement incrémental par empreinte `sha256` (cache hors dépôt) et
  **balayage des pages orphelines**, avec exclusion stricte de `90 · Notes`.
- **Lot 4** : sections `50 · Recette (RQV)` (statut seul) et `60 · Guide utilisateur`
  (`docs/**.md` hors `qualite/`) — **collecte non encore branchée**, les deux sections sont
  aujourd'hui déclarées « absentes » dans la vue d'ensemble.
- **Lot 5** : branchement auto dans `iakaframe update` / snapshot (la skill est appelable ;
  le câblage aux moments version/pause/reprise reste à faire).
- Liens cliquables vue d'ensemble → sous-pages (MVP = inventaire texte).
- Téléversement d'images ; synchronisation remontante AppFlowy → dépôt.
- Secret au keychain (MVP = env, repli fichier dotenv local).
