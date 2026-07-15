# Fonctions fichier par onglet + persistance dans la bibliothèque + Settings racine + titre de document

> **Nature** : évolution de la **forge GUI** (E2b/E2c livrés) — ajout des **gestes fichier**
> (New · Open · Save · Save As · Close) sous chaque onglet, de la **persistance réelle** dans la
> **bibliothèque `iakaframe`** (`.md`-frontmatter), d'un **Settings racine** partagé avec le CLI et
> d'un **titre de document**. · **Cadreur** : l'architecte-cadreur. · **Statut : CADRÉ — À VALIDER
> par le décideur** (jalon humain de cadrage).
> **Date** : 2026-07-15. Français ; code et identifiants en anglais.
>
> **Références (lues au cadrage)**
> - Modèle gravé (4 strates, catalogues par id, Team pure) :
>   `./E2-separation-methode-team-principes.md`.
> - GUI actuelle : `src/forge/ForgeShell.tsx` (onglets Team·Méthode·Kit),
>   `src/forge/ateliers/{TeamAtelier,MethodeAtelier,KitAtelier}.tsx`,
>   `src/forge/useForgeMethod.ts` (état **LOCAL**, non persisté — le « repart à zéro »),
>   `src/hooks/useForgeTeams.ts` (persistée via façade), `src/api/backend.ts` (façade unique d'invoke).
> - Backend Rust : `src-tauri/src/{teams_store,pathguard,paths}.rs` (passe-plat + pathguard + racines).
> - Cœur : `packages/core/src/{team,method,kit}.ts` — les `serialize*`/`parse*Text` actuels sont en
>   **JSON**, **pas** en `.md`-frontmatter (écart à combler).
> - Cible bibliothèque + schémas de frontmatter par type :
>   `../../../iakaframe/specs/instructions/rangement-bibliotheque-pluriel.md` (§ 3.9 team, § 3.10
>   method, § 3.12 kit ; invariants I1–I5).
> - CLI jumeau (même racine, même format, même I1) :
>   `../../../iakaframe/specs/instructions/cli-bibliotheque-verbes.md` (§ 3.3 `add`, § 4.2
>   `IAKAFRAME_HOME`, § 4.3 mini-parseur frontmatter, § 4.4 `checkRefs`).
> - État de l'art vérifié le 2026-07-15 (§ 11).

---

## 1. Problème (avant la solution)

La forge à trois ateliers est **livrée** (E2b/E2c), mais elle **ne sait pas gérer un fichier** :

1. **Méthode et Kit ne persistent pas.** `useForgeMethod` tient la méthode éditée en **état local
   in-memory** (`src/forge/useForgeMethod.ts:5-9,77-78`) ; `KitAtelier` fait de même (`useState`
   local). À chaque rechargement, l'édition **repart à zéro**. Il n'existe aucune façade `methodWrite`
   / `kitWrite`.
2. **La Team persiste, mais au mauvais endroit et au mauvais format.** `useForgeTeams` écrit
   **silencieusement** chaque édition en **JSON** dans `<chapeau>/iakaframegui-workspace/teams/<id>.json`
   (`teams_store.rs`, `backend.ts:teamWrite`, `serializeTeam` = JSON). Or la **bibliothèque cible**
   range les artefacts en **`.md`-frontmatter** sous la **racine `iakaframe`**
   (`teams/ methods/ kits/`), lue par le CLI via `IAKAFRAME_HOME`. La GUI et le CLI **divergent**
   (racine différente, format différent) — un artefact forgé n'est **pas visible** par `iakaframe list`.
3. **Aucun geste fichier explicite.** Pas de New (repartir d'un artefact vierge), pas d'Open
   (rouvrir un artefact existant de la bibliothèque), pas de Save/Save As/Close, pas de garde
   « modifs non sauvées ? », pas de **titre du document courant**.
4. **Pas de réglage de racine.** L'utilisateur ne sait pas **où** est sa bibliothèque ni comment la
   **définir** ; `Settings` n'expose pas `IAKAFRAME_HOME`.

**Besoin (formulé par le décideur)** : sous **chaque** onglet, les **cinq gestes fichier**
(New · Open · Save · Save As · Close) ; une **persistance RÉELLE** dans la bibliothèque `iakaframe`
en `.md`-frontmatter **au même endroit et au même format que le CLI** ; un **Settings racine**
partagé avec le CLI (`IAKAFRAME_HOME`) ; et un **titre de document** centré sous la barre d'onglets.

**Ce lot branche la persistance de la forge sur la bibliothèque partagée.** Il n'écrit aucun moteur
de rendu multi-runner (déjà couvert par les adaptateurs) et ne réimplémente pas le CLI : il en
**réutilise la sémantique** (racine, format, intégrité référentielle).

---

## 2. Décisions du décideur (gravées)

1. **Sous CHAQUE onglet (Team · Méthode · Kit) : `New · Open · Save · Save As · Close`** — barre de
   gestes fichier (contrats § 4).
2. **Settings — racine `iakaframe`** : réglage pour **connaître/définir** la racine de la
   bibliothèque, **partagé avec le CLI** (même point de vérité `IAKAFRAME_HOME`, § 5). Découverte
   auto + override manuel.
3. **Titre de document** : sous la barre d'onglets, **en grand, centré**, le **nom de l'artefact
   courant** + indicateur « modifié » (`•`), § 6.

---

## 3. Frontière & invariants à graver

| Point | Décision gravée |
|---|---|
| **Save Team / Méthode = FABRICATION** | Écrit une **définition** dans la bibliothèque (`teams/`, `methods/`). |
| **Kit = ASSEMBLAGE** | Save écrit un **manifeste de références** (`kits/`), jamais une copie d'atome. |
| **Pureté (E1/AR-1)** | **Aucun runner/modèle** n'entre dans Team ni Méthode via ces gestes. Le runner d'exécution reste dans le Binding (carte séparée du Kit). |
| **Rust reste passe-plat** | Rust **ne (dé)sérialise pas** le schéma : il lit/écrit du **texte `.md` opaque** sous **pathguard**. La sérialisation frontmatter vit **côté front** (cœur, § 7.1). Calque exact de `teams_store.rs` (passe-plat JSON) — étendu au texte `.md`. |
| **Façade unique** | Tout nouvel accès backend passe par `src/api/backend.ts` (invariant C-8 : `grep invoke( hors backend.ts = 0`). |
| **Cohérence GUI ↔ CLI** | Save (GUI) et `add` (CLI) écrivent au **MÊME endroit** (`<IAKAFRAME_HOME>/<collection>/<id>.md`), au **MÊME format** (sous-ensemble frontmatter § 7.1), avec la **MÊME validation d'intégrité référentielle** (I1, § 8). **Byte-parité** vérifiée par test (§ 9, § 10). |
| **Non-destructivité** | Close/New/Open sur un document **modifié** ⇒ garde « modifs non sauvées ? ». Save As **refuse d'écraser** un id existant sans confirmation. |

---

## 4. Contrat de chaque geste (entrée → sortie)

> **Modèle de document (unifié pour les 3 onglets)** : un hook générique
> `useForgeDocument<T>({ collection, blank, serialize, parse, validateRefs })` porte l'état
> `{ artifact: T, id: string|null, name: string, dirty: boolean, source: "new"|"library" }` et
> expose `new() · open(id) · save() · saveAs(id,name) · close()`. Team/Méthode/Kit l'instancient
> avec leur `collection` (`teams`/`methods`/`kits`), leur `blank` (gabarit vierge) et leurs
> (dé)sérialiseurs frontmatter. Ce hook **remplace** l'auto-persistance JSON silencieuse de
> `useForgeTeams` (retirée, § 3) et **comble** l'absence de persistance de `useForgeMethod`/Kit.

### 4.1 `New` — nouvel artefact vierge **[MVP]**
- **Entrée** : clic New sous l'onglet courant.
- **Garde** : si le document courant est `dirty` → confirmation « abandonner les modifications non
  sauvées ? » (§ 4.6). Refus = no-op.
- **Traitement** : charge un **artefact vierge** de ce type (`blank`) : Team = casting minimal
  (repli `buildTeamFromRoster` du gabarit AR-5 **ou** team vide) ; Méthode = starter iakaframe
  (`IAKAFRAME_STARTER_METHOD`) **ou** méthode vide ; Kit = kit vide (`{ node: "claude" }`).
  `id = null`, `source = "new"`, `dirty = false`, `name = "sans-titre"`.
- **[juste derrière]** : **New depuis un gabarit** (choix d'un gabarit du pool) — voir § 4.5.
- **Sortie** : l'atelier édite un artefact neuf ; le titre affiche « sans-titre ».

### 4.2 `Open` — ouvrir un artefact de la bibliothèque **[MVP]**
- **Entrée** : clic Open → **liste** des artefacts de la `collection` de l'onglet, obtenue par
  **scan** de `<IAKAFRAME_HOME>/<collection>/` (façade `libraryList(collection)`, § 7.2). Chaque
  entrée = `id` + libellé (`name`), triée par id.
- **Garde** : document courant `dirty` → confirmation avant de remplacer (§ 4.6).
- **Traitement** : sélection d'un id → `libraryRead(collection, id)` → **parse frontmatter** (cœur,
  § 7.1) → charge dans l'atelier. `source = "library"`, `id` renseigné, `dirty = false`.
- **Erreurs** : fichier illisible/parse `null` → message inline, aucun changement d'état (défensif,
  jamais d'exception — esprit du cœur). Racine non résolue → invite à ouvrir Settings (§ 5).
- **Sortie** : l'artefact ouvert est édité ; le titre affiche son `name`.
- **Acceptation** : `list` de la bibliothèque = ce que montre Open (même scan que `iakaframe list`).

### 4.3 `Save` — persister au bon endroit, bon format **[MVP]**
- **Entrée** : clic Save (ou raccourci).
- **Traitement** :
  1. Si `id == null` (document neuf) → **bascule sur Save As** (§ 4.4) pour obtenir id + nom.
  2. **Sérialise** l'artefact en **`.md`-frontmatter** (cœur, § 7.1) selon le schéma du type
     (`rangement` § 3.9/3.10/3.12).
  3. **Valide l'intégrité référentielle (I1)** pour Team et Méthode (§ 8). Réf. cassée → **refus**,
     **aucune écriture**, rapport inline (ids manquants + collection attendue). Miroir exact de
     `add` (CLI).
  4. Écrit `<IAKAFRAME_HOME>/<collection>/<id>.md` via `libraryWrite` (Rust + pathguard). Save
     **remplace son propre fichier** (même id) sans confirmation (c'est le sens de « sauver »).
  5. `dirty = false`.
- **Sortie** : indicateur `•` retiré ; ligne d'état « enregistré dans `<chemin>` ».
- **Acceptation** : après Save d'une Méthode puis rechargement de l'app + Open, la méthode
  **revient identique** — le « repart à zéro » est **résolu**. Le fichier est lu par `iakaframe show <id>`.

### 4.4 `Save As` — même artefact sous un nouvel id/nom **[juste derrière]**
- **Entrée** : clic Save As → invite **id + nom** (l'id normalisé en slug, contrôle `id` non vide,
  segment simple sans séparateur — calque `validate_team_id`).
- **Traitement** : identique à Save (sérialise + I1) **mais** cible le nouvel id.
  **Non-destructif** : si `<collection>/<id>.md` **existe déjà** (`libraryExists`) et pas de
  confirmation explicite → **refus** (« existe déjà — remplacer ? »). Après écriture, le document
  se **rattache** au nouvel id (`source = "library"`).
- **Sortie** : titre mis à jour au nouveau nom.

### 4.5 `Close` — fermer l'artefact courant **[MVP]**
- **Entrée** : clic Close.
- **Garde** : `dirty` → confirmation « fermer sans sauvegarder ? » (§ 4.6). Refus = no-op.
- **Traitement** : vide le document de l'onglet → état **placeholder** (« Aucun artefact ouvert —
  New ou Open »). Aucune écriture.

### 4.6 Garde « modifs non sauvées ? » (transverse) **[MVP]**
Petite **modale in-app** (préférée à `window.confirm` pour la **testabilité** testing-library) :
titre + « Sauvegarder / Abandonner / Annuler ». Déclenchée par New, Open et Close quand `dirty`.
« Sauvegarder » enchaîne un Save (donc I1) avant de poursuivre le geste.

---

## 5. Settings — racine `iakaframe` (partagée CLI, `IAKAFRAME_HOME`)

- **Point de vérité unique** : la **même variable `IAKAFRAME_HOME`** que le CLI
  (`cli-bibliotheque-verbes.md` § 4.2). **Distincte** de `IAKAFRAME_ROOT` (le chapeau `~/work`) et
  de `IAKAFRAMEGUI_WORKSPACE` (workspace isolé de la forge) — trois racines à ne pas confondre.
- **Résolution (Rust, `paths.rs` — nouveau `resolve_iakaframe_home()`)**, priorité :
  1. **override persisté GUI** (fichier de réglages `<workspace>/settings.json`
     `{ "iakaframeHome": "<chemin>" }`) s'il est défini ;
  2. **`IAKAFRAME_HOME`** (env) si défini/non vide — **aligné CLI** ;
  3. **découverte auto** : `<chapeau>/iakaframe` **validé** par le **double marqueur** `library/`
     **et** `methods/` (robuste, calque de la détection CLI § 4.2) ;
  4. sinon **non résolue** → Settings signale « bibliothèque introuvable — définir manuellement ».
- **Override manuel** : bouton « Choisir le dossier… » via `pickDirectory` (plugin dialog, déjà
  cloisonné) → validation du double marqueur → **persisté** dans `<workspace>/settings.json`.
- **Affichage Settings** : chemin résolu + **origine** (override / env / auto) + rappel
  `export IAKAFRAME_HOME=<chemin>` pour que le **CLI voie la même racine** (un GUI ne peut pas fixer
  l'env d'un autre process → on **affiche** la commande de synchronisation plutôt que d'inventer un
  mécanisme divergent — arbitrage **Q-2**).
- **Façade** : `iakaframeHome(): Promise<string|null>` et `setIakaframeHome(path): Promise<void>`
  (§ 7.2). **[MVP]**.

---

## 6. Titre de document

Composant `DocTitle` inséré **sous la barre d'onglets** de `ForgeShell` : **grand, centré**, affiche
le `name` du document de l'onglet actif ; préfixe l'indicateur **`•`** quand `dirty`
(ex. `• Méthode iakaframe`). Vierge → « sans-titre ». Purement présentationnel, alimenté par le
`useForgeDocument` de l'onglet courant. **[MVP]**.

---

## 7. Points d'architecture tranchés

### 7.1 (Dé)sérialisation frontmatter — **côté front, dans le cœur** (TRANCHÉ)
- **Où** : nouveau module `packages/core/src/frontmatter.ts` + des (dé)sérialiseurs **par type** :
  `serializeTeamMd`/`parseTeamMd`, `serializeMethodMd`/`parseMethodMd`, `serializeKitMd`/`parseKitMd`.
  Le cœur **tient déjà le schéma** (`Team`/`Method`/`Kit` + parseurs défensifs) : la sérialisation
  frontmatter y est **à sa place**. Rust reste **passe-plat de texte** (§ 3).
- **Pourquoi pas dans Rust** : `teams_store.rs` est explicitement un passe-plat **sans connaissance
  du schéma** (AR-1) ; y mettre la sérialisation romprait cet invariant et dupliquerait le schéma en
  Rust. On étend le passe-plat de « JSON opaque » à « `.md` opaque ».
- **Pourquoi pas de dépendance YAML** : `@iakaframe/core` est **zéro-dépendance** (`package.json`
  sans `dependencies`) ; comme pour le CLI (Node sans YAML natif, § 11), on écrit un **mini-parseur
  maison** couvrant le **sous-ensemble réellement utilisé** par la bibliothèque : scalaires (quotés,
  emoji), listes flow `[a, b]` (multi-lignes), séquences de maps inline `- { k: v }`. Défensif :
  champ inconnu ignoré, jamais d'exception.
- **Parité CLI ↔ cœur** : le mini-parseur du cœur (TS) et celui du CLI (JS, `frontmatter.js`) sont
  **deux miroirs du même sous-ensemble** (comme `cli/lib/vocab.js` miroite `core`). Le **format
  d'octets** doit coïncider : un fichier écrit par Save (GUI) est lu par `iakaframe show`, et un
  fichier de `iakaframe list` est ouvert par la GUW. **Verrou** : golden fixtures partagées (§ 10).
- Les `serialize*`/`parse*Text` **JSON existants restent** (handoff/tests) : on **ajoute** la voie
  `*Md`, on ne casse pas l'existant.

### 7.2 I/O fichier — **commande Rust sous pathguard limité à `IAKAFRAME_HOME`** (TRANCHÉ)
- Nouveau `src-tauri/src/library_store.rs`, **calque de `teams_store.rs`** : fonctions pures
  `list_in/read_in/write_in/exists_in(dir, …)` sur `<home>/<collection>`, extension **`.md`**,
  **texte opaque**, **pathguard** (`safe_path`, réutilisé) + validation de l'`id` (segment simple)
  et de la `collection ∈ {teams, methods, kits}`.
- Commandes Tauri : `library_list(collection)`, `library_read(collection, id)`,
  `library_write(collection, id, text)`, `library_exists(collection, id)`, `iakaframe_home()`,
  `set_iakaframe_home(path)`.
- Façade `src/api/backend.ts` : ajoute `libraryList/libraryRead/libraryWrite/libraryExists`,
  `iakaframeHome`, `setIakaframeHome` (mêmes conventions snake_case d'args ; ajoutées à l'objet
  `backend` pour l'**injection en test**).
- **Non-régression** : `team_*` (JSON workspace) **restent** pour le handoff/legacy ; la voie
  bibliothèque est **additive**. La façade unique est préservée (aucun `invoke` hors `backend.ts`).

### 7.3 Migration de la persistance Team — **de JSON-workspace vers `.md`-bibliothèque** (TRANCHÉ)
La Team quitte l'**auto-persistance JSON silencieuse** (`useForgeTeams` écrivant chaque frappe dans
`iakaframegui-workspace/teams/*.json`) pour le **modèle document explicite** (New/Open/Save vers
`IAKAFRAME_HOME/teams/*.md`). `useForgeTeams` est **réusiné** derrière `useForgeDocument` (il garde
ses **gardes de cohérence** : id de persona unique, coordinateur valide). Le workspace JSON
n'est **plus la persistance de référence** ; son maintien éventuel comme **buffer d'auto-save de
sécurité** est **[différé]** (arbitrage **Q-3**).

---

## 8. Intégrité référentielle sur Save (I1) — miroir de `add`

Pour **Team** et **Méthode**, avant écriture, `validateRefs` vérifie (calque `checkRefs` CLI § 4.4)
que chaque id référencé **existe** dans le pool `<IAKAFRAME_HOME>/library/<type>/` (scan) :
- **Team** → `personas[]` ∈ `personas`, `coordinator` ∈ `personas`, `guardrails[]` ∈ `guardrails` ;
- **Méthode** → `workflowId` ∈ `workflows`, `principleIds[]` ∈ `principles`, `ritualIds[]` ∈
  `rituals`, `guardrailIds[]` ∈ `guardrails`, `roleKeys[]` ∈ `roles`, `scaffoldIds[]` ∈ `scaffolds`.
- **Kit** → `methodId` ∈ `methods`, `teamId` ∈ `teams`, `bindingId?` ∈ `bindings`.

Réf. cassée ⇒ **refus + rapport, aucune écriture** (I1). **Dégradation** : si le pool `library/` est
**absent** (bibliothèque non encore rangée), la validation ne peut pas s'exécuter → **avertissement
non bloquant** + Save autorisé (arbitrage **Q-4** : refuser strictement comme `add`, ou avertir).

---

## 9. Découpage MVP / juste derrière / différé

**[MVP]**
- Barre de gestes sous chaque onglet : **New · Open · Save · Close** (+ garde « modifs non sauvées »).
- `useForgeDocument<T>` générique + instances Team/Méthode/Kit ; **dirty tracking** ; **DocTitle**.
- (Dé)sérialiseurs **frontmatter** dans le cœur (Team/Méthode/Kit) + mini-parseur maison.
- I/O `library_store.rs` (Rust, pathguard) + façade `library*` + `resolve_iakaframe_home()`.
- **Settings racine** (affichage résolu + override manuel persisté + rappel `export`).
- **I1 sur Save** (Team/Méthode/Kit) miroir de `add`.
- **Résout le « repart à zéro »** de Méthode et Kit (persistance réelle).

**[juste derrière]**
- **Save As** (nouvel id/nom, non-destructif).
- **New depuis un gabarit** (choix d'un gabarit du pool).

**[différé]**
- **Historique / undo-redo** ; **auto-save** de sécurité (buffer JSON workspace, Q-3).
- **Édition riche** des composants (héritée E2 § 11) ; **vignettes persistantes**.
- **Synchronisation cross-process** automatique de `IAKAFRAME_HOME` GUI ↔ env CLI (au MVP : rappel
  `export`, Q-2).
- **Génération/écriture multi-runner** depuis un binding (couverte ailleurs).

---

## 10. Critères d'acceptation (vérifiables)

1. **Cinq gestes présents** : sous chacun des 3 onglets, la barre expose New · Open · Save · Save As
   · Close (Save As/gabarit peuvent être présents désactivés si « juste derrière »).
2. **Persistance Méthode** : éditer une méthode (insérer un principe) → Save → **recharger l'app** →
   Open la même méthode ⇒ le principe est **toujours là** (le « repart à zéro » a disparu).
3. **Même endroit, même format que le CLI** : Save écrit `<IAKAFRAME_HOME>/<collection>/<id>.md` en
   `.md`-frontmatter conforme aux schémas `rangement` § 3.9/3.10/3.12 ; le fichier est lisible par
   `iakaframe show <id>` (byte-parité vérifiée sur une **golden fixture partagée**).
4. **Round-trip cœur** : `parseTeamMd(serializeTeamMd(t))` ≡ `t` (idem Méthode, Kit) ; un frontmatter
   partiel/illisible → `null` (défensif, jamais d'exception).
5. **I1 sur Save** : une Team référençant une persona absente du pool → **refus, aucune écriture**,
   ids manquants listés ; une Team valide → écrite et visible par Open **et** `iakaframe list teams`.
6. **Open = scan** : Open liste exactement les `.md` de `<home>/<collection>/` (mêmes ids que
   `iakaframe list <collection>`).
7. **Garde non-sauvée** : New/Open/Close sur un document `dirty` déclenchent la modale ;
   « Annuler » = aucun changement d'état.
8. **Save As non-destructif** : cibler un id existant sans confirmation → **refus** (pas d'écrasement).
9. **Titre de document** : `DocTitle` centré affiche le nom courant ; `•` présent ssi `dirty`, retiré
   après Save.
10. **Settings racine** : affiche la racine résolue + origine ; override manuel persiste et survit au
    redémarrage ; racine introuvable → invite explicite.
11. **Façade unique préservée** : `grep -rn "invoke(" src` hors `src/api/backend.ts` = **0** (C-8).
12. **Non-régression** : `npm run test:all` + `cargo test` verts ; handoff (H1) et `team_*` JSON
    **inchangés** ; adaptateurs/kit de génération **inchangés**.

---

## 11. Plan de tests attendu

**Front (testing-library + Vitest)**
- `useForgeDocument.test.ts` — cycle New→dirty(edit)→Save(appelle `libraryWrite` avec
  `<collection>/<id>.md` et un texte débutant par `---` contenant `id:`)→dirty=false ; Open charge
  depuis un `libraryRead` mocké ; Close/New/Open sur `dirty` ouvrent la modale ; Save sur `id=null`
  bascule Save As.
- `DocBar.test.tsx` / `DocTitle.test.tsx` — 5 boutons rendus par onglet ; `•` ssi dirty ; nom affiché.
- `SettingsRoot.test.tsx` — affiche la racine résolue (mock `iakaframeHome`) ; override appelle
  `setIakaframeHome` ; état « introuvable ».
- `refsIntegrity.test.ts` — Save d'une Team à réf. cassée (pool mocké) ⇒ **pas** d'appel
  `libraryWrite` + rapport ; réf. valide ⇒ appel effectué.
- Backend mocké via l'objet `Backend` injectable (comme `useForgeTeams` aujourd'hui).

**Cœur (`packages/core/__tests__`)**
- `frontmatter.test.ts` — scalaires quotés/emoji, listes flow multi-lignes, maps inline, corps
  préservé, tolérance aux champs inconnus.
- `teamMd.test.ts` / `methodMd.test.ts` / `kitMd.test.ts` — round-trip + parse défensif (`null`) +
  **byte-parité** sur golden fixture alignée sur `rangement` § 3.9/3.10/3.12.

**Rust (`cargo test`)**
- `library_store` — round-trip write/read `.md`, `list_in` ignore non-`.md` et dossier absent,
  `exists_in`, pathguard/traversal refusé, `collection` invalide refusée (calque `teams_store`).
- `paths` — `resolve_iakaframe_home()` : override persisté > env `IAKAFRAME_HOME` > auto (double
  marqueur `library/`+`methods/`) > introuvable ; variantes testables (env/chapeau injectés).

---

## 12. Questions d'arbitrage (à trancher au jalon)

- **Q-1 — `useForgeDocument` générique unique** pour les 3 onglets (Team/Méthode/Kit) ? Reco : oui
  (un seul modèle document, 3 instanciations). → *Confirmer.*
- **Q-2 — Sync `IAKAFRAME_HOME` GUI ↔ CLI.** Un GUI ne peut pas fixer l'env d'un autre process. Reco
  MVP : Settings **affiche** la racine + la commande `export IAKAFRAME_HOME=…` ; persistance GUI dans
  `<workspace>/settings.json`. Sync automatique = [différé]. → *Confirmer.*
- **Q-3 — Sort du workspace JSON des teams.** Reco : la bibliothèque `.md` devient la persistance de
  référence ; le workspace JSON est **retiré** de la voie de sauvegarde (conservé éventuellement en
  **auto-save de sécurité [différé]**). → *Trancher : retirer ou garder en buffer.*
- **Q-4 — I1 sur Save quand le pool `library/` est absent.** Reco : **avertir** sans bloquer (la
  bibliothèque peut être partielle) ; refuser strictement comme `add` est plus dur mais plus cohérent.
  → *Trancher : avertir vs refuser.*
- **Q-5 — Save As & gabarits : « juste derrière » (MVP-2) ou dans le MVP ?** Reco : boutons présents
  au MVP, Save As actif juste derrière New/Open/Save/Close. → *Confirmer le découpage.*
- **Q-6 — Collections gérées par la GUI.** Reco MVP : `teams`/`methods`/`kits` (les 3 onglets) ; les
  atomes du pool (personas, principes…) s'éditent ailleurs (E2 différé). → *Confirmer.*

---

## 13. Faits vérifiés sur le web (2026-07-15) + sources

- **Node/JS sans parseur YAML natif** : tout support YAML passe par une dépendance tierce
  (`js-yaml`, `yaml`, `gray-matter`). `@iakaframe/core` étant **zéro-dépendance** (comme le CLI est
  zéro-dep runtime), on **écrit un mini-parseur maison** sur le sous-ensemble réellement utilisé —
  décision **identique** à celle déjà tranchée pour le CLI (`cli-bibliotheque-verbes.md` § 4.3, § 10),
  d'où la **parité de format** recherchée (§ 7.1).
- **BMAD v6** (référence d'état de l'art des deux lots amont) : pool `.md`+frontmatter, **index par
  scan de motif**, un artefact par fichier — **corrobore** Open = scan (§ 4.2) et le format `.md`
  écrit par Save.
- **Tauri v2 — plugin `dialog`** : `open({ directory: true })` reste l'API du sélecteur de dossier
  natif ; déjà cloisonnée dans `backend.pickDirectory` (réutilisée par Settings § 5).

Sources :
- [gray-matter — front-matter parser](https://github.com/jonschlinkert/gray-matter)
- [js-yaml — parser YAML JavaScript](https://github.com/nodeca/js-yaml)
- [BMAD-METHOD — dépôt officiel](https://github.com/bmad-code-org/BMAD-METHOD)
- [Tauri v2 — plugin Dialog](https://v2.tauri.app/plugin/dialog/)

---

## 14. Journal de décision

- **2026-07-15** — Le décideur cadre les **fonctions fichier par onglet** de la forge
  (New · Open · Save · Save As · Close), la **persistance réelle** dans la bibliothèque `iakaframe`
  en **`.md`-frontmatter**, un **Settings racine** partagé avec le CLI (`IAKAFRAME_HOME`) et un
  **titre de document** centré. **Tranché** : (dé)sérialisation frontmatter **côté front dans le
  cœur** (mini-parseur maison zéro-dep, miroir du CLI) ; **I/O sous pathguard limité à
  `IAKAFRAME_HOME`** dans un `library_store.rs` calqué sur `teams_store.rs` (Rust reste passe-plat de
  texte) ; **Save = fabrication** pour Team/Méthode, **Kit = assemblage** ; **I1 sur Save** miroir de
  `add` ; **non-destructivité** (garde modifs non sauvées, Save As sans écrasement) ; **byte-parité
  GUI ↔ CLI** verrouillée par golden fixtures. **MVP** = New/Open/Save/Close + persistance +
  Settings + I1 + titre (résout le « repart à zéro ») ; **juste derrière** = Save As + gabarits ;
  **différé** = undo/auto-save/sync env. **Cadrage seul, aucun code de production.**

> Tant que ce jalon n'est pas validé, **aucune** implémentation. Ce lot ne produit que du
> **cadrage** ; le développement (Gimli) suit la validation du décideur.
