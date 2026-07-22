# Instruction : Réconciliation du format de workflow — GUI ← frame (étape 3bis)

> Cadré par Gandalf (P1). Consommé par Gimli (P2) comme instruction de travail.
> Dépôt : **iakaFrameGUI**. Objectif parent : « charger le frame dans le GUI » — **étape 3bis/4**
> (fait suite aux étapes 2+3, `specs/instructions/frame-open-save-fidelite.md`, qui ont **explicitement
> remonté** ce défaut : « Divergence de format du workflow… le workflow réel ne s'ouvre pas. Défaut
> distinct — remonté à Aragorn, à cadrer séparément »).
> **Doctrine non négociable : GUI ← frame.** Le format du **frame est autoritaire**. C'est le GUI qui
> apprend à lire/écrire le format du frame — **jamais** l'inverse. On ne modifie **pas** le workflow
> dans le frame pour arranger le GUI.

---

## Contexte — le workflow réel du frame ne s'ouvre même pas

Ouvrir le workflow réel du frame dans l'onglet **Workflow** de la forge échoue : le document affiche
`illisible : iakaframe-3phases` et l'atelier reste vide (`workflowArtifact === null`,
`ForgeShell.tsx:366`). Cause établie sur pièces : **le GUI et le frame encodent un workflow dans
deux formats radicalement différents**, et le parseur du GUI **rejette** (`null`) le format du frame.

Les étapes 2+3 ont réglé la fidélité Open→Save pour **method / team / kit** (capture du corps
verbatim + wrapping) mais ont laissé le workflow **hors périmètre**, car son défaut n'est pas une
perte de corps : c'est une **divergence de format totale**. C'est l'objet de la présente étape.

## Format autoritaire du frame (établi sur pièces)

**Fichier source** : `/Users/sjupin/work/iakaframe/library/workflows/iakaframe-3phases.md`
(copies **byte-identiques** :
`/Users/sjupin/work/iakaframe/frames/releases/StefFrame2/workflows/iakaframe-3phases.md`,
`/Users/sjupin/work/iakaframe/frames/releases/StefFrame2/library/workflows/iakaframe-3phases.md`,
`/Users/sjupin/work/iakaframe/cli/_bundled/library/workflows/iakaframe-3phases.md`).

Le schéma réel (`iakaframe-3phases.md:1-14`) :

- **Frontmatter YAML** (`---` … `---`) portant :
  - `id` (scalaire), `name` (scalaire) — **PAS de `methodId`** ;
  - `phases:` — **séquence de blocs**, chaque item une **map inline flow** `- { … }`, indentée de
    **2 espaces**. Champs par phase, **dans cet ordre** :
    `id`, `label`, **`side?`** (présent uniquement pour `prod`, inséré **après `label`**),
    `agentsRoleKeys` (liste flow `[a, b]`), `input`, `output` ;
  - `gates:` — **séquence de blocs séparée** (top-level, **pas** imbriquée dans les phases), chaque
    item `- { afterPhase, kind, criteria }`. `afterPhase` **référence l'`id` d'une phase** ;
    `kind ∈ {human, auto}`.
- **Corps markdown** : prose narrative (`# Workflow iakaframe — 3 phases…`) — le récit de la méthode.

Extrait littéral autoritaire (à traiter comme **golden**, cf. fixture) :

```
phases:
  - { id: p1, label: Cadrage, agentsRoleKeys: [cadrage], input: besoin, output: "specs/instructions/{feature}.md" }
  - { id: prod, label: Déploiement prod, side: prod, agentsRoleKeys: [deploiement], input: "rc recettée + feu vert humain", output: "prod (alias de version) + surveillance/rollback" }
gates:
  - { afterPhase: p1, kind: human, criteria: "l'utilisateur valide l'instruction" }
  - { afterPhase: p2, kind: auto,  criteria: "typecheck + lint + tests verts (verdict Legolas PASS, indépendant)" }
```

**Pièges byte-parité relevés sur le fichier réel** (déterminants pour le round-trip) :

1. **Quoting inline-map** : un `value` contenant `,` `:` `{` `}` **doit** être quoté (`output`,
   `criteria`). Les valeurs simples restent **nues** (`besoin`, `instruction`, `PASS`, `human`,
   `auto`, `p1`, `cadrage`). Le quoting scalaire actuel du cœur (`needsScalarQuote`,
   `frontmatter.ts:304`) **ne quote pas** sur virgule/deux-points interne → **insuffisant** pour une
   map inline (une virgule nue y casse le parse). Le sérialiseur workflow doit appliquer un quoting
   **inline-map-aware**.
2. **Ordre de champ variable** : `side` n'apparaît que pour `prod`, **inséré après `label`**. L'ordre
   n'est donc pas fixe colonne-à-colonne : `id, label, side?, agentsRoleKeys, input, output`.
3. **Alignement à la main (double espace)** : `iakaframe-3phases.md:11` porte `kind: auto,  criteria`
   — **deux** espaces après `auto,` pour aligner visuellement avec `human,` (ligne 10). Un sérialiseur
   générique canonique produit **un** espace → **1 octet de diff**. ⚠️ **Conséquence structurante**
   (cf. § Décision) : c'est **exactement** l'irrégularité manuelle que les étapes 2+3 ont déclarée
   « non reproductible génériquement » et verrouillée par **capture verbatim** ; ici elle vit dans le
   **frontmatter**, pas dans le corps.
4. **Absence de `methodId`** : le fichier n'en porte pas. Le sérialiseur doit **omettre** `methodId`
   quand la source ne l'a pas (sinon +1 ligne `methodId:` → diff non vide).

## Format que le GUI attend / produit aujourd'hui (établi sur pièces)

Le GUI encode un workflow **tout autrement** — `packages/core/src/frontmatter.ts` :

- **`serializeWorkflowMd(wf, body)`** (`frontmatter.ts:704`) : frontmatter **plat**
  `id` / `name` / **`methodId` toujours émis** (`frontmatter.ts:718`), puis les **phases/gates
  sérialisées en bloc `` ```json `` DANS LE CORPS** (`frontmatter.ts:708`), précédé d'un marqueur
  HTML `<!-- iakaframe:workflow … -->` (`frontmatter.ts:689`).
- **`parseWorkflowMd(text)`** (`frontmatter.ts:729`) : lit le frontmatter plat, puis
  **`extractJsonBlock(body)`** (`frontmatter.ts:693`) cherche un bloc `` ```json `` dans le corps.

### Où l'ouverture échoue — exactement

Le workflow du frame a un corps de **prose pure, sans bloc `` ```json ``**. Donc :

- `parseWorkflowMd` : `extractJsonBlock(body)` renvoie `null` →
  **`if (raw === null) return null;`** (`frontmatter.ts:733-734`). **Le workflow ne s'ouvre pas.**
- Côté hôte : `useForgeDocument.performOpen` reçoit `parsed === null`
  (`useForgeDocument.ts:323-327`) → `setLastError("illisible : …")`. D'où le message utilisateur.

De plus, le schéma des **champs** diffère du frame (le GUI attend `phases[].{name, description,
roleKeys, gate:{kind,condition}}`, `Phase`/`Gate`/`Workflow` dans `packages/core/src/workflow.ts`),
avec les gates **imbriquées** dans chaque phase (`workflow.ts:55`) — là où le frame les tient en
**tableau séparé** clé `afterPhase`. Même si un bloc JSON existait, les noms de champs du frame
(`label`/`agentsRoleKeys`/`input`/`output`/`criteria`/`side`) seraient ignorés.

**Note d'état** : le cœur sait **déjà partiellement** lire le frontmatter du frame — `frame.ts:283
parseWorkflowRefs` agrège `data.phases[].agentsRoleKeys` **depuis le frontmatter** pour l'intégrité.
Le parseur générique de frontmatter (`parseFrontmatterBody`, `frontmatter.ts:179`) gère **déjà** les
séquences `- { … }` (via `parseInlineMap`). **Le côté lecture du frame est donc à portée** ; c'est le
**mapping vers le modèle riche** et le **sérialiseur** qui manquent.

## Décision structurante — évaluée, tranchée (pas d'escalade)

**Trigger d'escalade évalué** (mandat) : « aligner le GUI casserait-il des workflows créés *dans* le
GUI ? » **Réponse : non**, pour deux raisons :

1. Le frame ne livre **qu'un** workflow, en format frontmatter. Il n'existe **aucun parc** de
   workflows GUI-format à protéger (GUI pré-release ; le format JSON-in-body est une **invention du
   GUI** qui diverge du frame).
2. On rend le parseur **tolérant aux deux formats** (frame-format **autoritaire** + JSON-in-body
   **legacy en repli**), tandis que le sérialiseur **n'écrit QUE** le frame-format. Un éventuel
   fichier GUI-format ancien **s'ouvre encore** ; toute écriture neuve **converge** vers le frame.

→ **Ce n'est pas un conflit produit fondamental. Gandalf tranche** (pas d'escalade) :
**le GUI adopte le format frontmatter phases/gates du frame comme encodage autoritaire sur disque ;
le JSON-in-body est retiré des écritures et conservé en lecture legacy seulement.**

## Ce qu'il faut faire (réconciliation GUI ← frame)

### 1. Lecture — `parseWorkflowMd` apprend le format du frame (autoritaire)

Réécrire `parseWorkflowMd` (`packages/core/src/frontmatter.ts:729`) pour **détecter et lire les deux
formats**, frame-format **prioritaire** :

- **Frame-format (autoritaire)** : si le frontmatter porte `phases` (séquence de maps), construire le
  workflow **depuis le frontmatter** :
  - `id`/`name` depuis le frontmatter (comme aujourd'hui) ;
  - chaque phase : `id`←`id`, `name`←`label`, `roleKeys`←`agentsRoleKeys`, `order`←index de position,
    et **input/output/side conservés** (voir §3, modèle-fichier) ;
  - **gates** : apparier `gates[].afterPhase === phase.id`, projeter `criteria`→`condition`,
    `kind`→`kind` dans la gate de la phase ;
  - `methodId` **absent** conservé comme absent (ne pas forcer « iakaframe » sur le modèle-fichier —
    cf. §3).
- **Legacy JSON-in-body (repli)** : si **pas** de `phases` en frontmatter mais un bloc `` ```json ``
  dans le corps → comportement actuel (parcours inchangé, non-régression des workflows GUI-format).
- Défensif inchangé : ni `phases` frontmatter ni bloc JSON lisible → `null`.

### 2. Écriture — sérialiseur frame-format + capture verbatim (byte-parité)

Deux mécanismes **combinés**, pour couvrir à la fois l'édition et le round-trip byte-exact :

- **Sérialiseur canonique frame-format** : `serializeWorkflowMd` (ou un nouveau
  `serializeWorkflowFrontmatterMd`) émet `phases:`/`gates:` **en frontmatter**, séquences de maps
  inline `- { … }`, indent 2 espaces, ordre de champs `id, label, side?, agentsRoleKeys, input,
  output` (side omis si absent), gates en **tableau séparé** `{ afterPhase, kind, criteria }`,
  **`methodId` omis si absent**, **quoting inline-map-aware** (piège 1). Corps = prose (préservée).
  Le **JSON-in-body est retiré** des écritures.
- **Capture verbatim du frontmatter** (parade au piège 3, alignement manuel) : pour qu'Open→Save
  **sans édition** du workflow réel donne **diff vide** malgré la double-espace non reproductible
  génériquement, étendre la capture d'origine au **frontmatter** (aujourd'hui `origin` ne capture que
  le corps, `useForgeDocument.ts:329`). Règle de Save :
  - phases/gates **non éditées** depuis l'Open → **ré-émettre le frontmatter capturé verbatim**
    (byte-identique, honore l'alignement manuel) ;
  - phases/gates **éditées** (ou document **neuf**) → **sérialisation canonique** frame-format
    (ré-authoring légitime ; l'alignement manuel n'est pas un invariant sémantique).

  Le mécanisme suit **l'esprit exact des étapes 2+3** (`verbatimBody` + `readListLayout`) : la
  byte-parité du contenu **écrit à la main** passe par la **capture**, pas par la régénération.
  Implémentation laissée à Gimli, deux options **équivalentes** :
  - **(a)** capturer le **texte source complet** à l'Open et le ré-émettre si l'artefact est resté
    deep-equal au parse d'origine (le plus simple ; le round-trip byte-exact devient trivial) ;
  - **(b)** capturer la **région frontmatter verbatim** (entre les deux `---`) en plus du corps, et
    n'appliquer le sérialiseur canonique que sur édition.

### 3. Modèle-fichier fidèle `WorkflowMd` + mapper (recommandé)

Pour héberger **sans perte** les champs du frame que le type riche `Workflow` (`workflow.ts:68`) ne
porte pas (`label`/`input`/`output`/`side`/`criteria` distincts), **introduire un enregistrement
lean `WorkflowMd`** miroir **exact** du schéma-fichier, à côté de `TeamMd`/`MethodMd`/`KitMd`
(`frontmatter.ts:511-540`) — **même pattern** que les 3 autres artefacts :

- `WorkflowMd = { id; name; methodId?; phases: { id; label; side?; agentsRoleKeys: string[]; input;
  output }[]; gates: { afterPhase; kind; criteria }[] }` ;
- `parseWorkflowMd`/`serializeWorkflowMd` (dé)sérialisent **`WorkflowMd`** byte-fidèlement ;
- un **mapper** `WorkflowMd ↔ Workflow` (riche, pour l'atelier/diagramme) : `mdToWorkflow`
  reconstruit `description = input → output`, `roleKeys = agentsRoleKeys`, `offChain = (side ===
  "prod")` pour l'affichage ; `workflowToMd` reprojette. Les champs riches **purement décoratifs**
  (`badge`/`roleDisplay`/`gate.display`/`sectionTitle`/`sectionNote`, calage historique des
  adaptateurs) **n'ont pas de home dans le frame** et **ne sont pas** écrits dans le fichier frame :
  ils restent in-memory (repli canonique du diagramme), jamais sérialisés en frame-format.

> Alternative écartée : étendre le type riche `Phase` de `input?`/`output?`/`side?`. Rejeté — pollue
> le type métier partagé (diagramme, ateliers) avec des champs de fichier ; le pattern `*Md` + mapper
> est **déjà** la convention établie (method/team/kit) et isole la byte-parité dans le record-fichier.

### 4. Hôte — retirer `workflowBody`/`workflowProse`, brancher la capture frontmatter

- `ForgeShell.tsx:88-99` : `workflowBody`/`workflowProse` (boilerplate + troncature au marqueur JSON)
  deviennent **caducs** pour le frame-format. La closure `serialize` du `workflowDoc`
  (`ForgeShell.tsx:171`) passe au frame-format (corps = prose capturée `?? ` prose neuve minimale ;
  **pas** de bloc JSON injecté). Conserver un boilerplate de prose **minimal** pour les workflows
  **neufs** uniquement.
- `useForgeDocument.ts` : étendre `OriginCapture` (`:26`) et `performOpen` (`:329`) pour capturer le
  frontmatter (option 3a ou 3b), remis à `null`/vide dans `loadBlank`/`performClose`
  (`:193`/`:341`), rethreadé dans `writeArtifact` (`:240`). Ce sont les **mêmes points d'ancrage**
  que 2+3.

## Fichiers concernés (lecture faite ; écriture = Gimli)

- `packages/core/src/frontmatter.ts` — `parseWorkflowMd`/`serializeWorkflowMd` (frame-format +
  legacy en lecture), `WorkflowMd`, quoting inline-map-aware. Retrait du JSON-in-body en écriture.
- `packages/core/src/workflow.ts` — mapper `mdToWorkflow`/`workflowToMd` (ou module dédié) ; type
  riche `Workflow` **inchangé** (pas de nouveaux champs de fichier).
- `src/forge/useForgeDocument.ts` — capture frontmatter (extension de `OriginCapture`/`performOpen`/
  `writeArtifact`).
- `src/forge/ForgeShell.tsx` — closure `serialize` du `workflowDoc` en frame-format ; `workflowBody`/
  `workflowProse` réduits au repli des **neufs**.
- `packages/core/__tests__/fixtures/workflow.iakaframe-3phases.md` — **fixture NOUVELLE = copie
  BYTE-FIDÈLE** de `library/workflows/iakaframe-3phases.md` (jamais réinventée, whitespace inclus).
- `packages/core/__tests__/workflowMd.test.ts` — round-trip + parse frame-format + legacy + gates.
- `src/forge/*.test.ts(x)` — round-trip **niveau document** (via closures `serialize`/`parse`).

## Critères d'acceptation testables

### AC-1 — Le workflow réel du frame S'OUVRE (le bug de base)
`parseWorkflowMd(fixture)` renvoie un `Workflow` **non nul** à **4 phases** (`p1`/`p2`/`p3`/`prod`),
`roleKeys` corrects (`[cadrage]`, `[dev, qualite]`, `[deploiement]`), gates appariées par
`afterPhase` (`human`/`auto`/`auto`/`human`), `prod` marqué hors-chaîne (`side: prod`). Aujourd'hui :
`null`. **C'est la preuve que le GUI lit le format autoritaire.**

### AC-2 — Round-trip byte-identique du workflow RÉEL (critère central, preuve-reine)
Ouvrir la **fixture byte-fidèle** puis Save **sans édition** produit un fichier **byte-identique**
(diff **vide**), y compris l'alignement manuel `auto,  criteria` (piège 3) et **sans** ligne
`methodId` (piège 4). Test exécuté **au niveau document** (closures `serialize`/`parse` avec capture
d'origine), même exigence que method/kit en 2+3.

### AC-3 — Sérialisation canonique valide et idempotente (workflow ÉDITÉ / neuf)
Pour un workflow édité (donc ré-sérialisé canoniquement) : `parseWorkflowMd(serialize(wf))` **deep-
equals** `wf`, et `serialize(parse(serialize(wf))) === serialize(wf)` (**point fixe** canonique).
Le frontmatter produit est **valide frame-format** (phases/gates en frontmatter, quoting correct,
`methodId` omis, gates en tableau séparé). **Aucun** bloc `` ```json `` n'est écrit.

### AC-4 — Prose du corps préservée verbatim
Open→Save (édité ou non) **préserve le corps narratif** du workflow (le `# Workflow iakaframe…`),
**sans** boilerplate ni bloc de données injecté. (Remplace l'ancien AC-6 de 2+3 « byte-parité NON
revendiquée » : elle l'est désormais.)

### AC-5 — Legacy JSON-in-body encore lisible (non-régression)
Un `.md` au **format GUI historique** (frontmatter plat + bloc `` ```json ``) **s'ouvre encore**
(`parseWorkflowMd` non nul) — les workflows créés dans le GUI avant cette étape ne se cassent pas.

### AC-6 — Workflow neuf inchangé côté création
New workflow (aucune capture) → Save écrit un frame-format canonique **valide** avec une prose neuve
minimale (pas de bloc JSON). Réouvrable, round-trippable (AC-3).

### AC-7 — Qualité
Typecheck OK · Lint OK · `vitest` vert. Testé dans l'app réelle : ouvrir le workflow du frame,
Save, `git diff` **vide** sur le fichier du frame.

## Vérification

- [ ] **AC-1** parse frame-format non nul (4 phases, gates appariées) sur la fixture byte-fidèle.
- [ ] **AC-2** round-trip **niveau document** byte-identique sur la fixture (diff vide) — inclut la
      double-espace et l'absence de `methodId`.
- [ ] **AC-3** point fixe canonique + validité frame-format sur workflow édité + workflow factice à 2
      phases (agnosticisme, cf. `workflowMd.test.ts:64`).
- [ ] **AC-4** corps préservé verbatim (édité et non édité).
- [ ] **AC-5** fixture legacy JSON-in-body → parse non nul.
- [ ] **AC-6** New → Save → reopen → round-trip.
- [ ] La fixture `workflow.iakaframe-3phases.md` est une **copie conforme** de
      `library/workflows/iakaframe-3phases.md` (diff vide à la copie), **jamais** retapée à la main.
- [ ] Typecheck · Lint · `vitest` verts ; `git diff` app réelle vide.

## Hors scope (réservé étape 4 ou lot distinct)

- **Garde vendor-check cross-repo**, **re-vendoring des personas** périmés, **roster 7→8** (helm),
  **byte-parité de la team** `teams/iakaframe-8.md`. **Étape 4** — ne pas replier ici.
- Édition **fine** dans `WorkflowAtelier` des champs `input`/`output`/`side` séparés (l'atelier édite
  aujourd'hui name/description/roleKeys/gate) : hors périmètre — le mapper les **préserve** même
  non exposés à l'UI ; exposition additive ultérieure.
- **Multi-workflows** / autres méthodes dans la collection : l'agnosticisme est **couvert par
  AC-3** (factice 2 phases) ; aucun catalogue neuf requis ici.

## Estimation dev (Gimli) — étape 3bis

- **Équivalent jour-homme** : **~1,5 à 2,5 j** (spec fermée). Détail : lecture frame-format +
  `WorkflowMd` + mapper (~0,6 j) ; sérialiseur frame-format + quoting inline-map-aware (~0,5 j) ;
  capture frontmatter verbatim dans `useForgeDocument`/`ForgeShell` (~0,4 j) ; repli legacy +
  boilerplate neuf (~0,2 j) ; fixture byte-fidèle + tests AC-1..AC-6 niveau document (~0,5 j).
- **Complexité / risque** : **modérée à élevée**. La logique de parse frontmatter existe (séquences
  `- {…}` déjà gérées) ; le risque se concentre sur la **byte-parité exacte** — quoting inline-map,
  ordre de champ à `side` optionnel, gates en tableau séparé, et surtout l'**alignement manuel
  double-espace** qui **impose la capture verbatim** (une sérialisation purement canonique
  échouerait AC-2). Les tests round-trip niveau document sont le filet.
- **Inconnues susceptibles de faire glisser** :
  1. **Capture verbatim frontmatter** — l'option retenue (3a texte complet vs 3b région frontmatter)
     peut révéler des cas de bord (workflow neuf sans capture, Save As) ; 3a est le repli le plus sûr.
  2. **Quoting inline-map-aware** — la règle exacte (virgule/deux-points/accolade → quote) doit être
     calée sur le fichier réel ; un cas non couvert = 1 octet de diff (révélé par AC-2).
  3. **Frontière avec l'étape 4** — la fixture workflow ne touche pas au roster/team ; veiller à ne
     pas entraîner de re-vendoring hors périmètre.
- **Nature** : ordre de grandeur assumé et révisable, **pas** un engagement ferme. Rappelé et
  confronté au réel à la clôture du lot.
