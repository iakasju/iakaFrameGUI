# Instruction — « Open frame » : charger TOUT StefFrame2 dans iakaFrameGUI

> Cadrée par **Gandalf** (P1 — Cadrage), read-only sur le code des deux dépôts.
> **Feature cross-projet.** L'implémentation est **majoritairement côté `iakaFrameGUI`** (son
> propre dépôt — dimension portefeuille/**Odin**). Côté `iakaframe`/StefFrame2 : **aucun
> changement structurel requis** (voir §5). Cette instruction ne fait que **cadrer**.

---

## 1. Besoin (reformulé)

Dans iakaFrameGUI, l'action **« Open frame »** pointée sur le **répertoire** de StefFrame2
(`frames/releases/StefFrame2/`) doit **charger et afficher TOUS les éléments** du frame — les
**11 types** : `personas`, `roles`, `principles`, `rituals`, `guardrails`, `scaffolds`,
`workflows`, `skills`, `teams`, `methods`, `bindings`. Aujourd'hui ce n'est pas le cas.

---

## 2. Faits établis (lecture réelle des deux dépôts)

### 2.1 Modèle d'accès de la GUI — DEUX espaces distincts
Façade unique `src/api/backend.ts` → commandes Tauri `src-tauri/src/library_store.rs`. La racine
est **`IAKAFRAME_HOME`** (`resolve_iakaframe_home()`), partagée avec le CLI.

- **Collections éditables** (`COLLECTIONS`, `library_store.rs:27`) = **`teams, methods, kits,
  workflows`**. Lues **à plat** sous `<home>/<collection>/*.md` par `library_list` (`backend.ts:82`)
  / `library_read` — **contenu complet** renvoyé.
- **Pool d'atomes** (`POOL_TYPES`, `library_store.rs:32`) = **8 types** : `personas, skills,
  guardrails, principles, rituals, roles, workflows, scaffolds`. Lus sous
  **`<home>/library/<type>/`** par `pool_list` (`backend.ts:126`) — **IDS SEULEMENT** (scan pour
  l'intégrité référentielle I1 au Save), **pas le contenu**. `pool_present` teste `<home>/library/`.
  Les skills sont des **dossiers** (`<id>/SKILL.md`, géré `library_store.rs:155-159`).
- Le cœur `packages/core` modélise **tous** les concepts, **bindings compris**
  (`packages/core/src/binding.ts`, exporté `index.ts:34`).
- Le choix de racine existe déjà : `SettingsRoot.tsx` → `pickDirectory()` (plugin-dialog natif,
  `backend.ts:201`) → `setIakaframeHome(dir)` → persiste l'override. **Mais** il ne **charge/affiche
  rien** : il fixe seulement la racine.

### 2.2 Structure réelle de StefFrame2 (déjà DOUBLE, compatible)
- **Pools à plat** à la racine : `<root>/{personas,roles,principles,rituals,guardrails,scaffolds,
  workflows,methods,teams,bindings}/*.md` + `<root>/skills/` (16 dossiers).
- **Miroir `library/`** : `<root>/library/{personas,principles,rituals,guardrails,roles,workflows,
  scaffolds,skills}/…` (les **8** types de pool ; skills en dossiers `<id>/SKILL.md`).
- **Comptages réels** : personas **8** (+`_TEMPLATE` ignoré), roles **8**, principles **14**,
  rituals **5**, guardrails **3**, scaffolds **2**, workflows **1**, skills **16**, methods **1**
  (`methods/iakaframe.md`), teams **1** (`teams/iakaframe-8.md`), bindings **1**
  (`bindings/iakaframe-claude-default.md`).

> **Conséquence clé** : le layout DOUBLE de StefFrame2 **sert déjà** le modèle à deux espaces de
> la GUI — collections **à plat** (`teams/`, `methods/`, `bindings/`), atomes sous **`library/`**.
> Le GUI lit les collections depuis la racine à plat, et les 8 atomes depuis `library/`. Les deux
> coexistent proprement. **Aucun besoin de dénaturer StefFrame2.**

### 2.3 Le niveau PORTEFEUILLE dans le modèle GUI — présent mais FRAGMENTÉ, sans conteneur
Le « super-étage » (niveau **Odin** / chapeau, pendant du `~/work` détecté par iakastart) n'existe
**pas** comme **entité de 1er ordre**. Il est présent sous **trois formes éclatées** :
- un **scaffold de niveau portefeuille** : `ScaffoldLevel = "portfolio" | "project"`
  (`packages/core/src/scaffold.ts:11`), `PORTFOLIO_SCAFFOLD` = `~/work` + `BACKLOG.md`
  (`scaffold.ts:36`), **référencé** par `Method.scaffoldIds` (`method.ts:39`, `useForgeMethod.ts:32`) ;
- un **rôle `portefeuille`** dont le **nom par défaut est « Odin »** (`packages/core/src/roster.ts:17`),
  skill par défaut `iakaframe-odin` (`roster.ts:28`) — odin est donc une **persona comme les autres** ;
- un **`chapeau`** au niveau **chemins** (Rust `src-tauri/src/paths.rs`) : racine `~/work` calculée par
  OS, bibliothèque découverte à `<chapeau>/iakaframe` **validée par double marqueur `library/` +
  `methods/`** (`paths.rs:103`).

**Ce qui MANQUE** : aucune **entité conteneur « Portefeuille » (ou « Frame ») au-dessus de
Method/Team/Binding**. Le modèle de données **plafonne au niveau équipe/méthode** (mono-team,
mono-méthode) : `Method` (discipline), `Team` (casting), `Binding` (appariement + runner), `Kit`
(manifeste de déploiement). Il n'y a **pas** d'objet qui représente **un frame complet comme un
tout cohérent** ni qui incarne l'**étage portefeuille d'Odin** (backlog transverse, inventaire des
projets/teams, rattachement du scaffold `portfolio` + de la persona `odin`).

---

## 3. Diagnostic de l'écart (pourquoi « Open <StefFrame2> » ne charge pas tout)

| # | Écart | Localisation |
|---|---|---|
| **É1** | **Pas d'action « Open frame »** qui, après avoir fixé la racine, **charge et affiche** les 11 types avec leurs comptes. `SettingsRoot` fixe la racine mais n'orchestre aucun chargement. | GUI `SettingsRoot.tsx`, `ForgeShell.tsx` |
| **É2** | **Les 8 atomes de pool sont lus en IDS seulement**, jamais en **contenu**. Il n'existe **aucune** commande backend pour lire le contenu d'un `persona`/`role`/`principle`/`ritual`/`guardrail`/`scaffold`/`workflow`(pool)/`skill`. Impossible donc de « afficher N personas… » comme entités. | GUI `library_store.rs` (`pool_list` = ids), `backend.ts` |
| **É3** | **`bindings` non chargeable** : absent **à la fois** de `COLLECTIONS` (teams/methods/kits/workflows) **et** de `POOL_TYPES` (8). Le backend n'a aucun chemin pour lister/lire `<root>/bindings/`, alors que le cœur le modélise. → **0 binding** chargé. | GUI `library_store.rs:27` |
| **É4** | (Non-bloquant) `workflows` existe en **double espace** (pool `library/workflows/` + collection `<root>/workflows/`). Sans règle de comptage, risque de **double comptage**. | GUI logique de chargement |
| **É5** | **Absence du « super-étage » PORTEFEUILLE** (§2.3) : pas d'entité conteneur au-dessus de Method/Team. Un frame comme StefFrame2 est un **bundle de niveau portefeuille** (méthode + team + binding + tous les atomes + le scaffold `portfolio` + la persona `odin`) ; « Open frame » n'a **aucun foyer d'accueil cohérent** où charger ce tout. Les atomes de niveau portefeuille (`odin`, scaffold `portfolio`) restent **chargeables** individuellement, mais **sans conteneur qui reflète leur nature portefeuille** ni **sans représentation du frame-comme-tout**. | GUI `packages/core` (pas d'entité Portfolio), `refs.ts`, action Open |

**Le layout de StefFrame2 n'est PAS la cause** : il est déjà conforme. L'écart est **côté GUI**, à
deux niveaux : (a) **mécanique** — chargement du contenu des pools + support bindings + action
d'ouverture (É1-É4) ; (b) **structurel/modèle** — absence du **super-étage portefeuille** dans
lequel charger le frame comme un tout (É5).

> **Nuance importante** : les 11 types, en tant qu'atomes/assemblages, **ont tous un foyer**
> conceptuel une fois `bindings` câblé (É3→G2) — y compris `odin` (persona) et le scaffold
> `portfolio` (atome référencé par la méthode). Le strict « charger les 11 » est donc atteignable
> par G1-G4 **sans** entité Portfolio. Mais **le besoin du décideur va plus loin** : représenter le
> frame **en tant que portefeuille** (l'étage Odin), ce qui **exige** le super-étage (G6). É5 est
> donc la partie **structurelle** de la réponse, distincte de la partie mécanique.

---

## 4. Solution fermée — par dépôt

### 4.1 Dépôt `iakaFrameGUI` (Odin / portefeuille) — l'essentiel du travail
- **G1 — Backend : lire le CONTENU des atomes de pool.** Ajouter une commande Tauri
  `pool_read_all(pool_type)` (et/ou `pool_read(pool_type, id)`) dans `library_store.rs`, calquée
  sur `list_in`/`read_in`, lisant `<home>/library/<type>/` et renvoyant le **contenu `.md`**
  (skills : lire `<id>/SKILL.md`). Exposer dans `backend.ts` (façade + objet `backend`). Le front
  parse via les parseurs `@iakaframe/core` (`persona.ts`, `roles.ts`, `principle.ts`, `ritual.ts`,
  `guardrail.ts`, `scaffold.ts`, `workflow.ts`, `skill.ts`).
- **G2 — Backend : rendre `bindings` chargeable.** `bindings` est **à plat** sous
  `<root>/bindings/`. **Ajouter `"bindings"` à `COLLECTIONS`** (`library_store.rs:27`) → il est lu
  par `library_list("bindings")` comme les autres collections ; parse via `binding.ts`. (Mettre à
  jour le type `LibraryCollection` de `backend.ts:75` en cohérence.)
- **G3 — Frontend : l'action « Open frame ».** Un point d'entrée UI (bouton/menu, réutilisant le
  plumbing existant) qui : `pickDirectory()` → `setIakaframeHome(dir)` → **charge les 11 types** :
  les **8** atomes via `pool_read_all`, les **3** assemblages `teams`/`methods`/`bindings` via
  `library_list`, **assemble le tout dans le conteneur Portfolio (G6)** → puis **affiche les comptes**
  par type. Peut étendre `SettingsRoot` ou ajouter une commande dédiée « Ouvrir un frame… ».
- **G4 — Frontend : rendu + intégrité.** Afficher les 11 pools avec leurs comptes ; exécuter la
  **vérification de références** sur l'ensemble chargé (les ids référencés par `method`/`team`/
  `binding` existent dans les pools chargés — réutiliser la logique `refs.ts`/`checkRefs`).
- **G5 — Règle de comptage `workflows`** (É4) : compter le workflow **une fois** (l'atome de pool)
  pour l'affichage des 11 ; l'espace collection `workflows/` reste un détail interne MVP.
- **G6 — LE SUPER-ÉTAGE : entité conteneur « Portefeuille / Frame »** (É5) — le cœur de l'angle
  décideur. Introduire dans `packages/core` une **entité de 1er ordre au-dessus de Method/Team/
  Binding** (ex. `Portfolio` ou `Frame`) qui représente **un frame ouvert comme un tout** :
  * **Contenu** : chemin racine du frame + **inventaire des 11 types** (avec comptes) + l'assemblage
    résolu (**method + team + binding**) ;
  * **Facette portefeuille (niveau Odin)** : rattache explicitement le **scaffold `portfolio`**
    (`level:"portfolio"`), la **persona `odin`** (rôle `portefeuille`) et le **backlog transverse**
    (entrée `BACKLOG.md` du `PORTFOLIO_SCAFFOLD`) — leur donnant enfin un **foyer organisationnel**
    au lieu de trois formes éclatées (§2.3) ;
  * **Parseur défensif** (esprit cœur : type pur + `parse*` ne jetant jamais) ; **read-only au MVP**
    (on **charge/affiche** ; l'édition de cet étage est différée, cohérent E2).
  * **Cible de « Open frame »** : G3 charge le frame **dans** ce conteneur Portfolio (et non plus en
    inventaire flottant) → c'est **l'étage d'accueil** qui manquait. `refs.ts` : la vérification
    d'intégrité s'exécute **dans le périmètre du Portfolio** (les ids référencés par method/team/
    binding existent dans les pools chargés du même frame).
  * **Impact backend** : aucun nouveau I/O spécifique n'est requis au-delà de G1/G2 — le Portfolio
    est **assemblé côté front** à partir des lectures existantes (pools + collections). Le `chapeau`
    Rust (`paths.rs:103`, marqueur `library/`+`methods/`) reste la **résolution de racine** ; le
    Portfolio est sa **contrepartie modélisée** côté données.

> **Ordonnancement recommandé** : G1+G2+G3+G4 livrent « Open charge les 11 » (socle mécanique) ;
> **G6** ajoute l'étage portefeuille qui **accueille** ce chargement et incarne le niveau Odin. Les
> deux sont demandés ; G6 est la réponse directe à « il manque le super-étage ».

### 4.2 Dépôt `iakaframe` / StefFrame2 (notre contexte) — RIEN de structurel
- **Aucun manifeste de frame** à ajouter : la GUI résout par `IAKAFRAME_HOME` + **scan de
  dossiers** ; elle n'attend **pas** de `frame.json`. En ajouter un serait de la sur-ingénierie
  qui dénaturerait le livrable. **Recommandation : ne rien ajouter.**
- **Seule garantie à maintenir** : le **miroir `library/`** reste complet et synchronisé avec les
  pools à plat (c'est déjà le cas — vérifié §2.2). Si une divergence apparaît, la corriger côté
  build de frame (hors périmètre de cette instruction).
- **Le super-étage (G6) ne demande RIEN à StefFrame2** : les éléments de niveau portefeuille sont
  **déjà présents** dans le frame — scaffold `library/scaffolds/portefeuille.md` (`level:portfolio`),
  persona `library/personas/odin.md` (rôle portefeuille), et **le frame lui-même EST le portefeuille**
  (sa racine = le chapeau). La modélisation du conteneur est **entièrement côté GUI**. (Le
  `BACKLOG.md` transverse du `PORTFOLIO_SCAFFOLD` est `createIfAbsent` — non requis dans le frame.)

> **Pourquoi cette répartition** : la solution privilégiée **fait lire la GUI depuis ce que
> StefFrame2 expose déjà** (`library/` pour les atomes, racine à plat pour les assemblages), sans
> imposer de nouvelle structure au frame. Le manque est un manque de **capacité de lecture/rendu
> côté GUI**, pas un défaut de structure du frame.

---

## 5. Les 11 types — source StefFrame2 → cible modèle GUI

| Type | Espace GUI | Source dans StefFrame2 | Commande backend | Parseur core | Compte |
|---|---|---|---|---|---|
| personas | pool | `library/personas/*.md` | `pool_read_all("personas")` ⟵ **G1** | `persona.ts` | **8** |
| roles | pool | `library/roles/*.md` | `pool_read_all("roles")` ⟵ **G1** | `roles.ts` | **8** |
| principles | pool | `library/principles/*.md` | `pool_read_all("principles")` ⟵ **G1** | `principle.ts` | **14** |
| rituals | pool | `library/rituals/*.md` | `pool_read_all("rituals")` ⟵ **G1** | `ritual.ts` | **5** |
| guardrails | pool | `library/guardrails/*.md` | `pool_read_all("guardrails")` ⟵ **G1** | `guardrail.ts` | **3** |
| scaffolds | pool | `library/scaffolds/*.md` | `pool_read_all("scaffolds")` ⟵ **G1** | `scaffold.ts` | **2** |
| workflows | pool | `library/workflows/*.md` | `pool_read_all("workflows")` ⟵ **G1** | `workflow.ts` | **1** |
| skills | pool | `library/skills/<id>/SKILL.md` | `pool_read_all("skills")` ⟵ **G1** | `skill.ts` | **16** |
| teams | collection | `teams/*.md` (à plat) | `library_list("teams")` (existe) | `team.ts` | **1** |
| methods | collection | `methods/*.md` (à plat) | `library_list("methods")` (existe) | `method.ts` | **1** |
| bindings | collection | `bindings/*.md` (à plat) | `library_list("bindings")` ⟵ **G2** | `binding.ts` | **1** |

> `kits` (5 manifestes à plat) reste chargeable comme collection existante mais **hors des 11**
> (manifeste de déploiement, pas un atome de méthode). Non requis par l'acceptation.

---

## 6. Périmètre — DANS / HORS

**DANS**
- Diagnostic du lien iakaframe↔GUI et de l'écart (§2-§3).
- Solution fermée répartie par dépôt (§4), table des 11 types (§5), critères d'acceptation (§7).

**HORS**
- **Écriture de code** : nulle part (Gandalf cadre). L'implémentation **G1-G5 se fait dans le
  dépôt `iakaFrameGUI`** — décision/exécution **portefeuille (Odin)**, pas dans `iakaframe`.
- Édition des atomes de pool dans la GUI (E2 différé au MVP) : le besoin est **charger/afficher**,
  pas rendre éditable — hors périmètre.
- Toute modification de la structure de StefFrame2 (aucune requise).

---

## 7. Critères d'acceptation VÉRIFIABLES

**A. Chargement complet (comptes exacts).** « Open frame » pointé sur `frames/releases/StefFrame2/`
→ la GUI affiche :
- personas **8**, roles **8**, principles **14**, rituals **5**, guardrails **3**, scaffolds **2**,
  workflows **1**, skills **16**, methods **1**, teams **1**, bindings **1**. (`_TEMPLATE.md` et
  `README.md` **exclus** — cf. `library_store.rs:152`.)

**B. Intégrité référentielle = zéro erreur.** Sur l'ensemble chargé, tous les ids référencés
existent :
- `methods/iakaframe.md` : `principleIds`(14) ⊆ principles, `ritualIds`(5) ⊆ rituals,
  `guardrailIds`(3) ⊆ guardrails, `roleKeys`(8) ⊆ roles, `scaffoldIds`(2) ⊆ scaffolds,
  `workflowId`(1) résolu.
- `teams/iakaframe-8.md` : `personas[]` ⊆ personas ; `coordinator` ∈ personas.
- `bindings/iakaframe-claude-default.md` : `methodId`, `teamId`, `personaId`(s) tous résolus.
- **0** id manquant (pas d'avertissement `pool absent` puisque `<root>/library/` existe).

**C. `bindings` visible.** Avant G2 : 0 binding. Après G2 : **1** binding chargé et affiché
(non-régression : teams/methods/kits/workflows continuent de charger).

**D. Provenance des contenus.** Les 8 pools sont lus depuis `<root>/library/<type>/` (pas les
copies à plat) ; les 3 collections depuis `<root>/{teams,methods,bindings}/` à plat. `workflows`
compté **une seule fois** (§4.1 G5).

**E. Smoke test backend (hors UI).** Tests Rust `library_store` (calqués sur l'existant) :
`pool_read_all` renvoie N contenus non vides par type (skills via `SKILL.md`) ;
`library_list("bindings")` renvoie 1 entrée pour un `<home>` fixture reproduisant le layout SF2 ;
type/collection invalides toujours refusés (garde d'autorité inchangée).

**F. Super-étage portefeuille (G6).** Après « Open frame », le frame est représenté comme **UN
conteneur Portfolio** (et non un inventaire flottant) qui :
- expose l'**inventaire des 11 types** avec leurs comptes (critère A) ;
- **identifie explicitement les éléments de niveau portefeuille** : le scaffold `portfolio`
  (`level:"portfolio"`), la persona `odin` (rôle `portefeuille`), et lie l'assemblage résolu
  **method + team + binding** du frame ;
- exécute la vérification d'intégrité (critère B) **dans le périmètre de ce Portfolio**.
- Test unitaire cœur : `parsePortfolio`/`parseFrame` (défensif) — record invalide → `null`, jamais
  d'exception ; un Portfolio construit depuis le layout SF2 fixture porte les 11 comptes attendus.

---

## 8. Jalon (gate humain)

```
      _    _    _     ___  _   _
     | |  / \  | |   / _ \| \ | |
  _  | | / _ \ | |  | | | |  \| |
 | |_| |/ ___ \| |__| |_| | |\  |
  \___//_/   \_\_____\___/|_| \_|
```

| Émetteur | Contenu | Récepteur |
|---|---|---|
| 🔵 Gandalf (Cadrage, P1) | Instruction `open-frame-gui-stefframe2.md` : diagnostic écart iakaframe↔GUI **+ absence du super-étage portefeuille (É5)**, solution répartie (GUI G1-G6 / StefFrame2 = rien), table des 11 types, comptes & critères | 🟢 Le décideur (Stéphane) → valide → implémentation **côté iakaFrameGUI (Odin/portefeuille)** |

**Fichiers à vérifier avant validation** (chemin:ligne) :
- GUI — modèle d'accès : `iakaFrameGUI/src-tauri/src/library_store.rs:27` (`COLLECTIONS` sans `bindings`), `:32` (`POOL_TYPES`), `:136` (`pool_list_in` = ids), `iakaFrameGUI/src/api/backend.ts:75` (`LibraryCollection`), `:126` (`poolList`).
- GUI — racine & ouverture : `iakaFrameGUI/src/components/SettingsRoot.tsx:31` (pickDirectory→setIakaframeHome), `iakaFrameGUI/src/forge/refs.ts:116` (validation pools).
- GUI — cœur & super-étage : `iakaFrameGUI/packages/core/src/binding.ts`, `index.ts:34` (binding exporté), `packages/core/src/scaffold.ts:11` (`ScaffoldLevel portfolio`), `:36` (`PORTFOLIO_SCAFFOLD`), `packages/core/src/roster.ts:17` (rôle portefeuille → « Odin »), `packages/core/src/method.ts:39` (`scaffoldIds`), `iakaFrameGUI/src-tauri/src/paths.rs:103` (chapeau, marqueur `library/`+`methods/`).
- StefFrame2 — layout & portefeuille : `frames/releases/StefFrame2/library/` (8 pools présents), `frames/releases/StefFrame2/bindings/iakaframe-claude-default.md`, `frames/releases/StefFrame2/methods/iakaframe.md`, `frames/releases/StefFrame2/teams/iakaframe-8.md`, `frames/releases/StefFrame2/scaffolds/portefeuille.md`, `frames/releases/StefFrame2/personas/odin.md`.

**Points ouverts** : AUCUN bloquant. Choix **assumés par Gandalf** (modifiables au jalon) :
- « Open frame » **réutilise** le plumbing racine existant (`pickDirectory`+`setIakaframeHome`) ; pas
  de manifeste de frame ajouté à StefFrame2.
- Le super-étage (G6) est modélisé comme entité **Portfolio/Frame read-only au MVP** (charger/afficher ;
  édition différée) et **assemblé côté front** (pas de nouvel I/O backend au-delà de G1/G2).

---

## Statut

**VALIDÉ — prêt pour implémentation** (côté `iakaFrameGUI`, dimension portefeuille/Odin). Aucun
point bloquant. StefFrame2 ne requiert **aucune** modification. À « JALON VALIDÉ » → la suite se
joue dans le dépôt iakaFrameGUI :
- **Socle mécanique** — G1 : `pool_read_all` (contenu des 8 atomes) ; G2 : `bindings` en collection ;
  G3 : action « Open frame » ; G4 : rendu + intégrité ; G5 : comptage `workflows`.
- **Super-étage (réponse à « il manque le super-étage »)** — G6 : entité conteneur **Portefeuille/
  Frame** au-dessus de Method/Team, foyer d'accueil de « Open frame », rattachant scaffold
  `portfolio` + persona `odin` + backlog transverse.

Le tout contre les critères §7 (dont **F** pour le super-étage).
