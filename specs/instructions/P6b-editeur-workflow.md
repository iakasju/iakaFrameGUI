# Instruction P6b — Éditeur de workflow (workflow ÉDITABLE, artefact de bibliothèque) (MVP)

> **Phase** : réalisation (suite de P6) · **Cadreur** : l'architecte-cadreur · **Exécutant** : le
> développeur · **Gate** : le responsable qualité (gate humain de validation d'abord).
> **Statut : JALON VALIDÉ par le décideur — 2026-07-16** (Q-1 = collection `workflows/` ; Q-2→Q-9 =
> recos) → **EN RÉALISATION**.
> **Réponses d'arbitrage** : Q-1 = workflow = **artefact autonome de la collection `workflows/`** (un
> `.md` par workflow, référencé par `Method.workflowId`) — PAS de JSON embarqué · Q-2 = réordonnancement
> par **boutons monter/descendre** (DnD différé) · Q-3 = **nettoyer l'override** du champ de calage édité ·
> Q-4 (rév.) = **id libre de bibliothèque** (slug au Save As ; New = deep-clone du canonique) · Q-5/Q-6bis =
> **4ᵉ onglet Workflow** dans la forge (iso-pattern ; `WorkflowPanel` orphelin laissé tel quel) · Q-6 =
> phase sans `roleKeys` **autorisée mais signalée** · Q-7 = référence absente/illisible → **repli canonique
> + signal non bloquant** · Q-8 = encodage `.md` = frontmatter plat (`id`/`name`/`methodId`) + **phases dans
> le corps** · Q-9 = collections `<home>/workflows/` (éditable) et `<home>/library/workflows/` (pool) =
> **distinctes et documentées** au MVP. **Extension Rust assumée** : ajout de `workflows` à l'allow-list
> `COLLECTIONS` (une entrée + tests).
> **Date** : 2026-07-16 (rév. 2 — collection `workflows/`). Français ; identifiants en anglais ;
> **rôles jamais désignés par un nom de code**.
>
> **Fondations (ne PAS contredire)** : `specs/instructions/P6-workflows.md` (workflow extrait en
> DONNÉE, read-only), `specs/instructions/E2-separation-methode-team-principes.md` (le workflow
> appartient à la **Méthode**, `resolveWorkflow`), `specs/instructions/P7-forge-liaison-deploiement.md`
> (injection d'un artefact résolu via `KitGenOptions`, comme le Binding),
> `specs/instructions/gui-fonctions-fichier-persistance.md` (les collections `.md` de la
> bibliothèque), `specs/contrat-concepts.md` (§ 2.7 Workflow, AR-1 pureté, AR-9 agnosticisme).
> **Vérification externe** : aucun fait externe (version/lib/compat) n'est porteur d'une décision de
> ce lot — réutilisation de la stack en place (React/TS + `useForgeDocument` + `@iakaframe/core` +
> façade Tauri `library_*`), **sans nouvelle dépendance**. Aucune recherche web nécessaire ; la seule
> brique tierce envisageable (drag-and-drop) est **différée** (§ 6.2, Q-2).

---

## 1. Objectif & contexte

P6 a promu le **Workflow** (`Phase` / `Gate`) en **donnée de 1re classe** du cœur ; E2 l'a rattaché à
la **Méthode**. Il est aujourd'hui **rendu et affiché en LECTURE SEULE** :

- `MethodeAtelier` (`src/forge/ateliers/MethodeAtelier.tsx`) montre les phases/gates du workflow
  **résolu** (`resolveWorkflow(method)`) dans la section « Workflow » du rail + le `FlowDiagram`
  (`src/forge/ContextGraph.tsx:15`) — **aucun contrôle d'édition**.
- `WorkflowPanel` (`src/components/WorkflowPanel.tsx`) est un composant read-only **orphelin**
  (défini, **jamais monté** — vérifié).

**P6b = rendre le workflow ÉDITABLE dans la forge**, en le traitant comme un **artefact de 1re classe
de la bibliothèque iakaframe** : une **collection `workflows/`** dédiée, chaque workflow = son propre
fichier `.md`, **au même titre que Team / Méthode / Kit / Binding** (décision Q-1 du décideur). La
Méthode **référence** un workflow par id ; l'édition (ajouter/supprimer/réordonner des phases, éditer
leurs champs et gates) et la **persistance** passent par un **document Workflow** branché sur
`useForgeDocument`, **sans modèle/runner** (workflow pur — AR-1) et **sans régresser** la sortie
canonique (golden P6 byte-identique tant qu'aucun workflow n'est référencé/édité).

---

## 2. L'état de l'existant (ce sur quoi on se branche)

| Élément | Où | État | Conséquence pour P6b |
|---|---|---|---|
| Modèle `Workflow`/`Phase`/`Gate` + parseurs (`parseWorkflow`) | `packages/core/src/workflow.ts` | livré, pur | on édite **ces** structures ; parseurs défensifs déjà là |
| Champs de **calage** (`display`, `badge`, `roleDisplay`, `sectionTitle`, `sectionNote`) | `workflow.ts:34-86` | livrés (byte-identité) | **piège** : un override masque une édition → Q-3 (validée : nettoyage) |
| `IAKAFRAME_CANONICAL_WORKFLOW` + `WORKFLOW_CATALOG` (**gelé**, `Readonly`) | `workflow.ts:190-265` | livré, **immuable** | reste le **défaut code** quand aucun workflow n'est référencé ; **jamais muté** (seed = deep-clone) |
| `resolveWorkflow(method)` = `workflowById(method.workflowId) ?? canonique` — **PUR** | `packages/core/src/method.ts:89-93` | livré | **conservé** ; la résolution d'un workflow **externe** se fait côté forge + injection (§ 4) |
| `Method.workflowId?: string` (référence) | `method.ts:34-51` | livré | **c'est déjà le lien Méthode→Workflow** ; pointera désormais un id de la collection `workflows/` |
| **`KitGenOptions`** porte `method?` **et** `binding?` (injectés, **jamais lus du disque**) | `packages/core/src/adapters/types.ts:29-54` | livré | **pattern d'injection** à réutiliser : ajouter `workflow?` résolu (comme le Binding P7) |
| Adaptateur rend `renderWorkflowMarkdown(resolveWorkflow(opts?.method))` | `packages/core/src/adapters/agentsMd.ts:191` | livré | passera par `opts?.workflow ?? resolveWorkflow(opts?.method)` |
| Façade `library_{list,read,write,exists}` — **passe-plat `.md` par collection** | `src/api/backend.ts:70-104` | livré | réutilisable ; **`LibraryCollection` à étendre** (`+ "workflows"`) |
| **Store Rust NON générique** : `COLLECTIONS = ["teams","methods","kits"]` (allow-list figée) | `src-tauri/src/library_store.rs:22,48` | livré | **extension Rust obligatoire** : `+ "workflows"` (une entrée + tests) — cadrée § 6 |
| Pool d'atomes `POOL_TYPES` contient **déjà** `"workflows"` (read-only `library/workflows/`) | `library_store.rs:27-36` | livré | **écho de nommage** : la collection éditable `<home>/workflows/` ≠ le pool `<home>/library/workflows/` → à réconcilier (Q-9) |
| Frontmatter **plat** (scalaire + liste de chaînes) | `packages/core/src/frontmatter.ts:396-466` | livré | ne porte **pas** nativement des phases imbriquées → encodage du `.md` workflow à concevoir (Q-8) |
| `useForgeDocument<T>` (5 gestes + dirty + I1 `validateRefs`) ; `ForgeShell` instancie team/méthode/kit | `src/forge/useForgeDocument.ts`, `src/forge/ForgeShell.tsx:63-134` | livré | **iso-pattern** : ajouter une 4ᵉ instance `useForgeDocument<Workflow>` (collection `workflows`) |
| Validation I1 `makeMethodValidateRefs` (miroir `checkRefs`) | `src/forge/refs.ts`, `ForgeShell.tsx:69-70` | livré | à étendre : `Method.workflowId` doit exister dans `workflows/` (Q-7) |

**Fait structurant conservé (le point dur)** : le **cœur reste sans I/O**. Le workflow devient
**externe** (fichier `workflows/<id>.md`) et **référencé** par la Méthode ; la **forge le résout AVANT
génération** (lecture `.md` + parse → objet `Workflow`) et **l'injecte** dans les options de génération
(`KitGenOptions.workflow?`), exactement comme le **Binding** en P7. Les adaptateurs reçoivent un objet
`Workflow` déjà résolu — **jamais** de lecture disque dans le cœur.

---

## 3. Périmètre — IN / OUT

### 3.1 DANS le périmètre P6b
1. **Collection `workflows/`** de 1re classe dans la bibliothèque : chaque workflow = un
   `workflows/<id>.md`. `LibraryCollection` (front) et `COLLECTIONS` (Rust) étendus de `"workflows"`.
2. **Document Workflow** branché sur `useForgeDocument<Workflow>` : 5 gestes New/Open/Save/Save As/
   Close + dirty + `DocTitle` (renommage en ligne via `withName`) + I1 au Save. **4ᵉ onglet** de la
   forge (`Team · Méthode · Kit · Workflow`) — iso-pattern (Q-6bis, reco = oui).
3. **(Dé)sérialiseur `.md` du workflow** dans `@iakaframe/core` (`serializeWorkflowMd`/
   `parseWorkflowMd`, défensifs), portant l'`id`/`name`/`methodId` + les phases/gates (encodage Q-8).
4. **Édition des phases** : **ajouter**, **supprimer**, **réordonner** (monter/descendre) ; `order`
   **recalculé** 0..N-1 ; **ids uniques**.
5. **Édition des champs de phase** : `name`, `description`, `roleKeys` (rôles canoniques, par
   **libellé**), bascule `offChain`. **Édition de la gate** : `kind`, `condition`, `from`/`to`.
6. **Seed depuis le canonique par deep-clone** (New/blank du document Workflow) : le constant gelé
   n'est **jamais** muté ; l'utilisateur part d'une copie éditable et **Save As** sous un id de son
   choix.
7. **Lien Méthode → Workflow** : `Method.workflowId` référence un id de la collection ; **défaut =
   canonique** (absent/introuvable → `IAKAFRAME_CANONICAL_WORKFLOW`).
8. **Résolution pure + injection** : `KitGenOptions.workflow?: Workflow` (résolu par la forge, injecté
   à la génération) ; adaptateurs rendent `opts?.workflow ?? resolveWorkflow(opts?.method)`.
9. **I1 Méthode** : `Method.workflowId` vérifié contre la collection `workflows/` au Save (non
   bloquant si pool absent — Q-7).
10. **UI d'édition** additive et **reflet** dans le `FlowDiagram` (réutilisé).
11. **Non-régression** : sans workflow référencé/injecté, la résolution rend le **canonique gelé** →
    **golden P6/P3/P3b/P3c byte-identique**.

### 3.2 HORS périmètre P6b (différés — à ne PAS traiter)
- **Embarqué JSON dans le frontmatter de la Méthode** — **écarté par Q-1** (le workflow est un
  artefact autonome de collection, pas un champ de la Méthode).
- **Édition des champs de calage** comme champs libres → différé ; MVP = dérivés/**nettoyés** (Q-3).
- **Réordonnancement par drag-and-drop** → différé ; MVP = **boutons monter/descendre** (aucune
  dépendance).
- **Catalogue multi-workflows partagé / import multi-méthodes** (BMAD/MetaGPT/SPARC) → north-star,
  aucun code. (La collection `workflows/` **ouvre la voie** sans l'implémenter.)
- **Édition du couple runner/modèle** → **interdit** : workflow pur (AR-1).
- **Régénération/aperçu live des kits** au fil de l'édition → hors lot.

---

## 4. Décision d'architecture — le workflow, artefact de bibliothèque référencé (Q-1 tranchée)

**Décision du décideur (Q-1, 2026-07-16)** : le workflow est un **artefact de 1re classe de la
bibliothèque** — collection **`workflows/`**, un fichier `.md` par workflow, comme Team/Méthode/Kit/
Binding. **Pas** de JSON embarqué dans la Méthode. La Méthode **référence** le workflow par
`workflowId`.

### 4.1 Modèle & lien
- `Method.workflowId?: string` (**inchangé**) référence désormais **prioritairement** un id de la
  collection `workflows/` ; à défaut un id du catalogue cœur ; à défaut → **canonique**.
- Le workflow lui-même est **inchangé en forme** (`Workflow` de `workflow.ts`) ; il gagne seulement un
  **(dé)sérialiseur `.md`** pour vivre en fichier (§ 6).

### 4.2 Flux de résolution (cœur SANS I/O — le point dur)
1. **Authoring / édition** : l'onglet Workflow (`useForgeDocument<Workflow>`, collection `workflows`)
   lit/écrit `workflows/<id>.md` via la façade `library_*` existante. La **forge** parse le `.md` en
   objet `Workflow` (`parseWorkflowMd`).
2. **Résolution avant génération** : quand la forge génère un kit pour une Méthode, elle **résout**
   `method.workflowId` ainsi (côté forge, une seule lecture) :
   `libraryRead("workflows", id)` → `parseWorkflowMd` → objet ; **si absent/illisible** → repli sur
   `resolveWorkflow(method)` (catalogue cœur, sinon canonique) + **signal non bloquant** (Q-7).
3. **Injection** : la forge passe l'objet résolu dans **`KitGenOptions.workflow?`** (nouveau champ,
   **optionnel**, calqué sur `binding?`/`method?`).
4. **Rendu (cœur pur)** : chaque adaptateur rend
   `renderWorkflowMarkdown(opts?.workflow ?? resolveWorkflow(opts?.method))`.
   **Sans** `workflow` injecté **et sans** `method` → `resolveWorkflow(undefined)` = **canonique** →
   sortie **byte-identique** (golden P6 intact).
- **`resolveWorkflow` reste pur et de signature inchangée** : il ne lit rien du disque ; la lecture du
  `workflows/<id>.md` est une **responsabilité de la forge** (front), pas du cœur (comme le Binding).

### 4.3 Seed & non-mutation du canonique
- Le **New/blank** du document Workflow **deep-clone** `IAKAFRAME_CANONICAL_WORKFLOW` (copie de valeur,
  aucun partage de référence) comme point de départ éditable, avec un id neutre (Q-4).
- Le constant gelé n'est **jamais** muté ; il reste le **défaut code** quand aucune référence n'existe.

### 4.4 Invariant pureté (AR-1)
- Ni `Workflow`, ni `KitGenOptions.workflow?`, ni le `.md` workflow ne portent de modèle/runner. À
  prouver par test (EW-11).

---

## 5. Comportement d'édition attendu (détail vérifiable)

1. **Onglet Workflow** (4ᵉ document) : `New` seede une copie du canonique ; `Open` liste/charge un
   `workflows/<id>.md` ; `Save`/`Save As` persistent ; `Close` + garde « modifs non sauvées » ; le
   `DocTitle` renomme en ligne (`withName`).
2. **Ajouter une phase** : insère une phase valide (`id` unique auto-slugifié, `name` par défaut,
   `order` = fin de chaîne, gate `kind:"human"`, `roleKeys: []`), marque **dirty**.
3. **Supprimer une phase** : retire la phase ; **`order` recalculé** ; refuse de descendre sous
   **1 phase** (EW-10).
4. **Réordonner** : monter/descendre échange l'ordre de deux phases adjacentes ; **`order` normalisé**.
5. **Éditer une phase** : `name`, `description`, `roleKeys` (multi-sélection par **libellé** de rôle),
   bascule `offChain`. Éditer un champ **nettoie** l'override de calage correspondant (Q-3) pour rendre
   l'édition visible au rendu/diagramme.
6. **Éditer la gate** : `kind` (humain/auto), `condition` (texte libre, vide toléré), `from`/`to`
   (rôles canoniques optionnels).
7. **Lien depuis la Méthode** : l'onglet Méthode expose le choix `workflowId` parmi les workflows de la
   collection (+ « canonique par défaut ») — **référence**, pas édition inline.
8. **Reflet** : `FlowDiagram` et la section rail reflètent l'état édité (re-render React).
9. **Persistance & résolution** : Save écrit `workflows/<id>.md` ; la génération d'un kit résout la
   référence de la Méthode et **injecte** l'objet (§ 4.2).
10. **Pureté** : aucun contrôle de l'éditeur ne pose ni n'atteint un modèle/runner.

---

## 6. Impacts fichiers (indicatif — l'exécutant tranche le détail)

- **Rust** `src-tauri/src/library_store.rs` — `COLLECTIONS` **+= `"workflows"`** (une entrée) ; tests
  existants étendus (`collection_invalide`, round-trip) à `workflows`. **Extension minimale, cadrée** :
  aucune logique nouvelle (le store est déjà générique par collection **au comportement**, seule la
  table d'autorité est figée).
- **Front façade** `src/api/backend.ts` — `LibraryCollection` **+= `"workflows"`**.
- **Cœur** `packages/core/src/frontmatter.ts` — `WorkflowMd` + `serializeWorkflowMd`/`parseWorkflowMd`
  (encodage Q-8, défensif) ; `packages/core/src/adapters/types.ts` — `KitGenOptions.workflow?: Workflow`;
  `packages/core/src/adapters/*.ts` — `opts?.workflow ?? resolveWorkflow(opts?.method)`. Helpers
  d'édition **purs** (ajout/suppression/réordonnancement + recalcul `order` + nettoyage calage) dans
  `workflow.ts` ; **le canonique gelé reste inchangé**.
- **Forge** `src/forge/ForgeShell.tsx` — 4ᵉ `useForgeDocument<Workflow>` (collection `workflows`,
  blank = deep-clone canonique, (dé)sérialiseurs, `withName`) + 4ᵉ onglet ; `src/forge/mappers.ts` —
  `workflowToMd`/`mdToWorkflow` si un pont riche/`.md` est nécessaire ; résolution+injection du
  workflow au moment de la génération/livraison (là où `method`/`binding` sont déjà injectés) ;
  `src/forge/refs.ts` — I1 Méthode étendue à `workflowId` (collection `workflows`).
- **Éditeur** un composant d'édition (rail « Workflow » éditable + panneau phase/gate) réutilisant
  `FlowDiagram` ; l'onglet Méthode gagne le **sélecteur** `workflowId`.
- **Tests** : `packages/core/__tests__/{workflow,method,frontmatter}.test.ts` (encodage round-trip,
  injection, précédence, golden inchangé) ; tests front (gestes d'édition + dirty + persistance mock) ;
  tests Rust (`library_store.rs`) pour `workflows`.

---

## 7. Critères d'acceptation (vérifiables — numérotés)

P6b est **PASS** si **tous** les points sont vérifiés :

- **EW-1 — Collection `workflows/`.** `LibraryCollection` (front) et `COLLECTIONS` (Rust) incluent
  `"workflows"` ; écrire/lire/lister/exister un `workflows/<id>.md` fonctionne (tests Rust + front).
- **EW-2 — (Dé)sérialiseur `.md` workflow.** `serializeWorkflowMd`/`parseWorkflowMd` round-trippent un
  workflow (id, name, methodId, phases/gates) **à l'identique** ; un `.md` illisible → `null` défensif.
- **EW-3 — Document Workflow (5 gestes).** L'onglet Workflow branché sur `useForgeDocument<Workflow>`
  fait New (seed canonique cloné) / Open / Save / Save As (non destructif) / Close + dirty + DocTitle
  éditable. Tests avec backend mock.
- **EW-4 — Persistance round-trip de collection.** Éditer → dirty → Save écrit `workflows/<id>.md` ;
  Open réhydrate un workflow **structurellement égal**. Test.
- **EW-5 — Résolution PURE + injection.** `KitGenOptions.workflow?` existe ; les adaptateurs rendent
  `opts?.workflow ?? resolveWorkflow(opts?.method)` ; `resolveWorkflow` **reste sans I/O et de
  signature inchangée**. Tests des branches (injecté / method / rien).
- **EW-6 — Non-régression P6 (critique).** Sans `workflow` injecté et sans `method`, la sortie de
  chaque adaptateur reste **byte-identique** / les golden **P3/P3b/P3c/P6 restent verts sans
  modification de leurs attentes**.
- **EW-7 — Référence Méthode → Workflow.** La forge résout `method.workflowId` depuis `workflows/` ;
  **absent/illisible → repli canonique + signal non bloquant** (Q-7). Tests présent / absent.
- **EW-8 — Seed sans mutation du canonique.** Le New du document Workflow **deep-clone** le canonique
  (aucun partage de référence) ; éditer la copie **ne modifie pas** `IAKAFRAME_CANONICAL_WORKFLOW`
  (test d'intégrité du constant).
- **EW-9 — Ajout/suppression/réordonnancement.** Produisent un workflow valide, `order` **normalisé
  0..N-1**, **ids uniques**. Tests des trois gestes.
- **EW-10 — Invariants de validité.** Au moins **1 phase** (suppression sous 1 refusée) ; ids uniques ;
  `order` contigu ; `roleKeys` filtrées. Tests.
- **EW-11 — Zéro modèle/runner (AR-1).** Aucun champ modèle/runner sur `Workflow`/`KitGenOptions.workflow`/
  le `.md` workflow ; kits générés sans `base_model_id`/model. Test/inspection.
- **EW-12 — Édition des champs + nettoyage de calage.** Éditer `name`/`description`/`roleKeys`/`offChain`/
  gate est reflété au rendu et au `FlowDiagram` ; éditer un champ à override de calage **nettoie**
  l'override ; un workflow non édité conserve son calage (byte-identité). Tests des deux cas.
- **EW-13 — I1 Méthode.** Au Save d'une Méthode, `workflowId` est vérifié contre `workflows/` (miroir
  `checkRefs`) ; pool absent → **warning non bloquant**. Test.
- **EW-14 — Rôles par libellé.** Toute sélection/affichage de rôle passe par le **libellé** (jamais un
  nom de code). Inspection + test.
- **EW-15 — Agnosticisme (AR-9).** L'éditeur/sérialiseur opèrent sur **n'importe quel** workflow bien
  formé (pas de hard-wire « iakaframe ») : test avec un workflow **factice à 2 phases**.
- **EW-16 — Qualité.** `@iakaframe/core` typecheck + tests verts ; Rust `cargo test` vert ; front lint +
  tests + build verts ; non-régression P4/P5 et de la vue read-only conservée.

---

## 8. Questions d'arbitrage

### 8.1 Tranchées (rappel, pour traçabilité)
- **Q-1 — Persistance du workflow — TRANCHÉE (décideur, 2026-07-16)** : **collection `workflows/` de
  1re classe** (un `.md` par workflow), **référencée** par la Méthode ; **pas** de JSON embarqué. Voir § 4.
- **Q-2 — Réordonnancement — VALIDÉE** : **boutons monter/descendre** (drag-and-drop différé).
- **Q-3 — Calage — VALIDÉE** : **nettoyer** l'override du champ édité (pas de saisie de calage au MVP).
- **Q-5 — Éditeur additif — VALIDÉE** : édition additive ; `WorkflowPanel.tsx` orphelin laissé tel quel.
- **Q-6 — `roleKeys` vides — VALIDÉE** : **autorisé mais signalé**.

### 8.2 À trancher (résiduelles, nées de la décision Q-1)
- **Q-4 (rév.) — Convention d'id du workflow.** L'ancien `<methodId>-workflow` **n'a plus lieu d'être**
  (le workflow est autonome). *Reco : **id libre de bibliothèque** (slug, choisi au Save As, comme
  team/method/kit), le seed proposant `iakaframe-canonical` (ou `mon-workflow`).* → *Confirmer.*
- **Q-6bis — Un 4ᵉ onglet Workflow dans la forge ?** *Reco : **oui**, un onglet/document Workflow
  (iso-pattern `useForgeDocument`, le plus cohérent avec « au même titre »).* Alternative : éditer le
  workflow dans un sous-panneau de l'onglet Méthode (sans nouvel onglet) — moins iso-collection, mêle
  authoring et référence. → *Confirmer (impacte la chrome de `ForgeShell`).*
- **Q-7 — Référence workflow absente/illisible au moment de générer.** *Reco : **repli canonique +
  signal non bloquant*** (warning `lastWarning`, cohérent avec le pool-absent I1) — jamais d'échec de
  génération sur une référence pendante. Alternative : bloquer la génération (plus strict, moins
  robuste). → *Confirmer.*
- **Q-8 — Encodage du `.md` workflow (frontmatter plat vs phases imbriquées).** Le frontmatter est plat
  (scalaire + liste de chaînes) ; un workflow a des phases/gates **imbriquées**. *Reco : **frontmatter
  scalaire** (`id`/`name`/`methodId`) **+ phases sérialisées dans le corps** en bloc structuré
  round-trippé (contenu dans le fichier workflow lui-même, sans polluer les autres schémas).*
  Alternative : **étendre `buildDocument`** aux structures imbriquées (plus « propre » visuellement mais
  touche le cœur du frontmatter partagé — risque golden). → *Trancher (détail d'implémentation, mais
  structurant pour la lisibilité du fichier).*
- **Q-9 — Réconciliation avec le pool `library/workflows/`.** Le pool d'atomes réserve **déjà**
  `"workflows"` (`POOL_TYPES`, read-only, `<home>/library/workflows/`) tandis que la nouvelle
  **collection** vit à `<home>/workflows/`. *Reco : **garder les deux distincts** au MVP (collection
  éditable ≠ pool d'atomes scanné pour I1), et **documenter** la distinction ; unifier plus tard si le
  modèle de bibliothèque cross-dépôt (CLI) le demande.* → *Confirmer (ou demander l'alignement immédiat
  sur le modèle CLI de bibliothèque).*

> Tant que ces résiduelles ne sont pas confirmées, **aucun code**. À la validation : « JALON VALIDÉ » +
> réponses Q-4(rév.), Q-6bis, Q-7, Q-8, Q-9.

---

## 9. Dépendances & risques

**Dépendances** : P6 (modèle + renderer + golden) et E2 (workflow rattaché à la Méthode) — livrés.
P7 (pattern d'injection `KitGenOptions`) — **cadré** ; le champ `workflow?` suit le même moule que
`binding?`. Façade `library_*` + `useForgeDocument` — livrés.

**Risques**
- **R1 — Régression golden (majeur, maîtrisé).** L'injection `KitGenOptions.workflow?` est **optionnelle**
  ; sans elle, résolution = canonique → byte-identique (EW-6).
- **R2 — Mutation du constant gelé (majeur, maîtrisé).** Le seed **deep-clone** le canonique (EW-8).
- **R3 — Extension Rust (moyen, maîtrisé).** `COLLECTIONS += "workflows"` : une entrée d'allow-list +
  tests ; aucune logique nouvelle (store générique au comportement). À livrer avec ses tests.
- **R4 — Encodage `.md` imbriqué (moyen).** Le frontmatter plat ne porte pas les phases ; Q-8 tranche
  l'encodage. Parseur **défensif** (illisible → `null` → repli canonique).
- **R5 — Référence pendante (moyen, maîtrisé).** Méthode pointant un `workflowId` absent → repli
  canonique + signal (Q-7, EW-7) ; I1 Méthode le signale au Save (EW-13).
- **R6 — Confusion collection ↔ pool `workflows` (faible).** Q-9 : distincts + documentés.
- **R7 — Réintroduction d'un modèle via le workflow (faible).** Interdit structurellement + EW-11.

---

## 10. Journal de décision

- **2026-07-16 (rév. 1)** — Cadrage P6b (l'architecte-cadreur) : workflow read-only → éditable ;
  reco initiale = workflow **embarqué** sur la Méthode.
- **2026-07-16 (rév. 2 — décision du décideur sur Q-1)** : le workflow devient un **artefact de 1re
  classe de la bibliothèque** — **collection `workflows/`** (un `.md` par workflow, comme Team/Méthode/
  Kit/Binding), **référencée** par la Méthode (`workflowId`) ; **abandon** de l'embarqué JSON. Impose :
  extension `COLLECTIONS` (Rust) + `LibraryCollection` (front), un **document Workflow**
  (`useForgeDocument`, 4ᵉ onglet reco), un **(dé)sérialiseur `.md`** du workflow, et surtout une
  **résolution qui garde le cœur SANS I/O** : la forge **résout la référence AVANT génération** et
  **injecte** l'objet via **`KitGenOptions.workflow?`** (moule du Binding P7) ; adaptateurs =
  `opts?.workflow ?? resolveWorkflow(opts?.method)`. Invariants tenus : **zéro modèle** (AR-1),
  **golden P6 byte-identique** sans workflow injecté (EW-6), **agnosticisme AR-9**, **seed = deep-clone**
  du canonique gelé. Q-2/Q-3/Q-5/Q-6 validées ; résiduelles Q-4(rév.)/Q-6bis/Q-7/Q-8/Q-9 à confirmer.
