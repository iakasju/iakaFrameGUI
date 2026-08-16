# GATE-DE-PHASE-OPTIONNEL — le GUI cesse d'inventer un feu vert que le canon refuse

> Phase P1 (cadrage). Rôle : `cadrage` (🔵 Gandalf). Dépôt : **`iakaFrameGUI`** (miroir).
> **Successeur nommé** de `specs/instructions/gui-vendor-charon.md`, ouvert au backlog par ⚒️ Gimli
> **en cours** de ce lot et **hors de son périmètre**, puis **confirmé indépendamment** par 🏹 Legolas
> (hors harnais de test, bundle `esbuild` exécuté directement).
> **Doctrine non négociable : GUI ← frame.** Le canon `iakaframe` est autoritaire ; le miroir ne le
> déforme jamais. Aucun octet de canon n'est écrit par ce lot.

---

## 0. Problème

Le cœur modélise `Phase.gate` comme **obligatoire** (`packages/core/src/workflow.ts:79`). Le
workflow canon `0.39.0` déclare **5 étapes pour 4 gates** : `surveillance` n'en a **aucun**, et le
fichier canon l'écrit lui-même, en toutes lettres, dans son propre frontmatter
(`packages/core/__tests__/fixtures/workflow.iakaframe-3phases.md:16-19`) :

> 🛑 *AUCUN gate pour l'étape `surveillance`, et c'est une **DÉCLARATION**, pas un oubli. […]
> Si un parseur venait à exiger un gate par étape : **REMONTER, ne pas en inventer un.***

Le GUI en invente un. Ouvrir puis enregistrer le workflow canon dans la forge **ajoute un feu vert
humain à une mission dont la nature est d'agir sans ordre** — le miroir déforme le canon, dans le
fichier même qui interdit cette déformation.

**Ce lot ne re-justifie pas le défaut : il le ferme, et il rend la fidélité mesurable.**

---

## 1. Mesure — le défaut, établi en lecture seule

> Le cadrage **ne dispose pas de `Bash`** : rien de ce qui suit n'a été *exécuté* ici. Tout est
> établi par **lecture du code**, chemin et ligne à l'appui — donc **vérifiable ligne à ligne** par
> l'exécutant. Le **verdict** appartient aux critères du § 7, qui re-mesurent.

### 1.1 Le lieu de naissance de l'invention — une ligne, pas une famille

L'invention naît en **un point unique**, `packages/core/src/frontmatter.ts:1088` :

```ts
gate: g ? { kind: g.kind, condition: g.criteria } : { kind: "human", condition: "" },
```

`mdToWorkflow` **doit** produire un `gate` parce que le type l'exige ; faute de gate apparié par
`afterPhase`, il en **fabrique** un. `workflowToMd` (`frontmatter.ts:1127-1131`) ne fait ensuite que
**propager** la fabrication : `ordered.map(...)` émet **une** entrée `gates[]` **par phase**, sans
condition. Puis `serializeWorkflowFrontmatterMd` (`frontmatter.ts:992-1001`) l'**écrit dans le
fichier**.

**Conséquence chiffrée, à quatre points de mesure**, sur la fixture canon (5 phases / 4 gates) :

| Point de mesure | phases | gates | Fidèle ? |
|---|---|---|---|
| `parseWorkflowFrontmatterMd(fixture)` (lean) | 5 | **4** | ✅ le parseur est fidèle |
| `mdToWorkflow(lean)` (riche) | 5 | **5** | ❌ le 5ᵉ est fabriqué |
| `workflowToMd(mdToWorkflow(lean))` (retour lean) | 5 | **5** | ❌ `{ afterPhase: "surveillance", kind: "human", criteria: "" }` |
| `serializeWorkflowMd(...)` (octets écrits) | 5 | **5** | ❌ la ligne `- { afterPhase: surveillance, … }` atterrit au disque |

**Le parseur n'est pas en cause. Le sérialiseur non plus, à proprement parler : c'est le MODÈLE qui
force la main aux deux.** C'est pourquoi le correctif porte d'abord sur `Phase.gate`, et non sur un
filtre au moment d'écrire (cf. § 2.1, Option D écartée).

### 1.2 La cascade — **mesurée**, pas estimée

⚒️ Gimli signale que toucher au modèle atteint « l'éditeur P6b, les adaptateurs et le rendu
markdown ». Balayage exhaustif de `\.gate\b` sur `*.ts`/`*.tsx` : **13 sites de production dans
7 fichiers**, **9 sites de test dans 3 fichiers**. Aucun accès par déstructuration
(`const { gate } = …`) ni par index (`phase["gate"]`) — le balayage est donc **complet**, et pas
seulement large.

| # | Fichier:ligne | Ce qui se produit sous `gate?: Gate` | Geste |
|---|---|---|---|
| 1 | `packages/core/src/workflow.ts:171` | `parsePhase` **fabrique** un gate pour tout objet brut sans `gate` | **présent-si-porté** : `r.gate == null` ⇒ **clé omise** ; `r.gate` présent mais malformé ⇒ `parseGate` défensif **inchangé** |
| 2 | `packages/core/src/workflow.ts:350` | `renderGateCell(p.gate)` — erreur de type | cellule `—` quand la gate est absente |
| 3 | `packages/core/src/workflow.ts:388` | `clonePhase` — `cloneGate(p.gate)` erreur de type | clone conditionnel, **clé omise** si absente |
| 4 | `packages/core/src/workflow.ts:520/531` | `updatePhaseGate` suppose une gate existante | **crée** la gate si absente (c'est le geste « poser un gate ») |
| 5 | `packages/core/src/frontmatter.ts:1088` | **le défaut** | `g ? {…} : ` ⇒ **ne rien poser** |
| 6 | `packages/core/src/frontmatter.ts:1127-1131` | émet un gate par phase | `flatMap` : **une entrée par phase QUI EN PORTE UNE** |
| 7 | `src/components/WorkflowPanel.tsx:64` (chaîne) et `:77` (hors chaîne) | erreur de type ; `:77` **planterait au runtime** sur le canon (le hors-chaîne `surveillance` n'a pas de gate) | rendu `◇ aucun gate` |
| 8 | `src/forge/ContextGraph.tsx:50-52` | `FlowDiagram` — losange de gate | **pas de losange** sans gate ; la flèche relie directement les deux phases |
| 9 | `src/forge/ateliers/WorkflowAtelier.tsx:312/329/342/360` | l'éditeur P6b lit `selected.gate.*` — **planterait** dès qu'on sélectionne `surveillance` | § 1.4 |
| 10 | `src/forge/ateliers/MethodeAtelier.tsx:83-87` et `:206-207` | nœud « GATE » du rail + `FoldNode` enfant | nœud **omis** quand la phase n'a pas de gate |
| 11 | `src/forge/workflowProposition.ts:121` | une phase proposée par le LLM **sans** gate en reçoit un | **ne pas en inventer** — même règle que le parseur |

**Les adaptateurs (`agentsMd.ts:189`, `claudeCode.ts:165`) ne sont PAS un site** : ils passent tous
deux par `renderWorkflowMarkdown`, seul point de rendu. Et comme celui-ci **exclut les phases
`offChain`** (`workflow.ts:344-346`) et que `surveillance` porte `side: prod` ⇒ `offChain`, **la
sortie des kits est byte-inchangée**. Ce n'est pas une espérance : c'est une propriété, et le § 7
la verrouille (`AC-8`).

### 1.3 Deux verts qui l'étaient pour une mauvaise raison

Fait contre-intuitif, et il commande la conception des preuves : **les round-trips existants passent
aujourd'hui alors que le défaut est là.**

- `workflowMd.test.ts:119-121` — `parseWorkflowMd(serializeWorkflowMd(wf)) ≡ wf` : **vert**.
- `workflowMd.test.ts:124-127` — point fixe `serialize(parse(serialize(wf))) === serialize(wf)` : **vert**.

Ils passent **parce que l'invention est symétrique** : elle est ré-écrite puis relue à l'identique.
Un round-trip qui se compare **à lui-même** ne peut pas voir une invention **stable**. Seule la
réciprocité **inter-niveaux** — `workflowToMd(mdToWorkflow(md))` comparé au **lean issu du
fichier** — la voit, et c'est exactement le test rouge `workflowMd.test.ts:130-132`.

**Règle qui en découle, et qui gouverne le § 2.2 :** une preuve de fidélité doit confronter la
sortie **au fichier**, jamais à une autre sortie du même programme.

### 1.4 La case à cocher ment déjà — le même défaut, côté UI

`WorkflowAtelier` porte **déjà** un affordance « pas de gate » :
`src/forge/ateliers/WorkflowAtelier.tsx:290-306` affiche, pour un `kind` non-gated (`cycle`,
`flow`), une case *« Poser un gate sur cette phase »* et, décochée, la mention
*« ◇ Aucun gate — étape libre »*. Or son propre commentaire l'avoue
(`WorkflowAtelier.tsx:80-81`) :

> *« état d'UI local ; **aucune donnée « sans gate » n'est fabriquée** — le contrat porte toujours
> une gate par phase »*

**L'interface affiche « aucun gate » et le fichier en écrit un.** C'est le défaut du § 1.1, vu par
l'autre bout. Le lot serait incomplet s'il réparait la donnée en laissant l'UI mentir : `showGate`
devient **dérivé de la donnée** (`selected.gate !== undefined`), et la case **agit** sur la donnée.

Second effet, plus dur : le canon est `kind: pipeline`, donc `gatesOptional === false`, donc
`showGate === true` — sélectionner l'étape `surveillance` ferait lire `selected.gate.kind` sur
`undefined`. **L'éditeur P6b ne peut pas rester en l'état** : ce n'est pas un raffinement, c'est un
plantage.

---

## 2. Décision retenue

### 2.1 `gate?: Gate` — **présent-si-porté**, la convention déjà en vigueur dans ce cœur

Quatre voies ont été pesées. **Option A retenue.**

| | Voie | Verdict |
|---|---|---|
| **A** | **`gate?: Gate` optionnel, clé OMISE quand absente** | ✅ **RETENUE** — c'est mot pour mot la convention « présent-si-porté » que le cœur applique déjà à `Workflow.kind` (`workflow.ts:104`), `WorkflowMd.methodId` (`frontmatter.ts:586`), `Gate.from`/`to`/`display`, `Phase.badge`/`roleDisplay`. Zéro vocabulaire neuf |
| **B** | `gate: Gate \| null` | ❌ rompt la convention, **et** casse une mécanique : `sameWorkflow` compare par `JSON.stringify` (`src/forge/workflowSerialize.ts:34-36`) — `null` **survit** à la sérialisation là où une clé omise disparaît. Un `null` réintroduit par un parse ferait diverger la capture d'origine de l'artefact courant ⇒ **le chemin Save verbatim (byte-parité `AC-2`) tomberait** |
| **C** | `gate` obligatoire + drapeau `hasGate: boolean` | ❌ deux sources de vérité pour un seul fait ; un sérialiseur pourrait encore écrire un gate « désactivé » |
| **D** | Ne rien changer au modèle : `workflowToMd` n'émet pas un gate dont `kind === "human"` **et** `condition === ""` | ❌ **écartée fermement.** C'est une **devinette** : elle confond « pas de gate » avec « gate humain dont le critère n'est pas encore rédigé », et **supprimerait** ce dernier. Elle rendrait `workflowMd.test.ts:130` vert **pour une mauvaise raison** — un vert obtenu par heuristique sur une valeur par défaut, pas par fidélité. C'est le raccourci d'une ligne, et c'est le piège de ce lot |

**Corollaire d'écriture, non négociable : la clé est OMISE, jamais posée à `undefined`.**
`exactOptionalPropertyTypes` n'est pas activé (`tsconfig.json:16-21` : `strict` seul), donc
TypeScript accepterait `gate: undefined` — et **`toEqual` de Vitest ne fait pas la différence entre
une clé absente et une clé à `undefined`** ([expect | Vitest](https://vitest.dev/api/expect)). Une
assertion écrite au `toEqual` **ne peut donc pas** prouver l'omission : `AC-3` l'exige par
`expect("gate" in phase).toBe(false)`, seule mesure qui discrimine.

**Ce qui NE change pas** (décisions de non-action, explicites) :

- **`addPhase` continue de poser une gate** `{ kind: "human", condition: "" }` (`workflow.ts:435-442`).
  Raison : le défaut par **présence** est le sûr — une gate posée est **visible et retirable** ;
  une gate absente est invisible. Non-régression de `workflowEdit.test.ts:70`.
  *Variante écartée* : `addPhase` sensible au `kind` (pas de gate sur un `flow`). `gated` est une
  **métadonnée d'UI** (`WorkflowAtelier.tsx:38-46`), pas une doctrine du cœur — l'y faire remonter
  est un autre arbitrage, hors lot.
- **Le geste de retrait existe** : symétrie ajout/suppression. `updatePhaseGate` **pose** (et crée
  si absente) ; un `removePhaseGate(wf, id)` pur **retire**. Un modèle qui laisse ajouter sans
  laisser retirer n'a fait que déplacer l'obligation.

### 2.2 La fidélité se **prouve**, elle ne se déclare pas — trois natures de preuve, re-jouables

L'exigence n'est pas « le sérialiseur cesse d'inventer » : elle est **« la fidélité est
re-mesurable par quiconque, à tout moment »**. Trois natures, dans un ordre de force décroissante ;
un lot qui n'aurait que la troisième n'aurait rien prouvé.

**P1 — AUTO-ORACLE (la preuve reine).** L'attendu **est le fichier**, jamais une liste écrite à la
main. `expect(workflowToMd(mdToWorkflow(md))).toEqual(md)` où `md = parseWorkflowFrontmatterMd(fixture)` :
il est **impossible** de satisfaire cette assertion en gravant l'invention, puisque la graver
changerait aussi… le côté droit ? **Non** — et c'est là qu'elle est solide : le côté droit vient du
**parseur**, dont le § 1.1 établit qu'il est **fidèle**. C'est `workflowMd.test.ts:130-132`, qui
devient vert **sans qu'une seule de ses lignes soit touchée**. *Un test qu'on rend vert sans le
modifier est la meilleure preuve qu'on a corrigé le programme et non l'attendu.*

**P2 — COMPTAGE.** Les cardinalités du tableau § 1.1, une assertion par point de mesure : `5` phases
et `4` gates à l'entrée, au milieu, à la sortie, **et dans les octets écrits** (`AC-5`). Un comptage
ne se négocie pas.

**P3 — NÉGATIVE NOMMÉE.** `expect(saved).not.toMatch(/afterPhase:\s*surveillance/)` — ce que le
fichier **ne doit pas** contenir. Faible seule (elle ne dit rien du reste), indispensable en
complément : c'est la seule qui parle **la langue de l'octet écrit**.

**P4 — GÉNÉRICITÉ (le garde-fou anti-gravure).** Les trois précédentes portent toutes sur le canon
iakaframe. Un correctif qui aurait codé en dur `id === "surveillance"` les satisferait toutes. On
ajoute donc un workflow **synthétique d'une autre méthode** (`methodId: "sparc"`, `kind: "flow"`,
une phase **médiane** sans gate) qui round-trippe : la fidélité est une **propriété du modèle**, pas
un cas particulier du canon. Sans P4, le lot est falsifiable.

### 2.3 Le sort des **quatre** tests rouges — et un rouge de plus, assumé

**Réponse directe : oui, ce lot les rend verts. Tous les quatre.** Et voici comment on le vérifie,
test par test — la distinction entre *corriger le programme* et *ajuster l'attendu* étant faite
**explicitement** pour chacun, parce que c'est l'anti-pattern **R-4** du lot précédent.

| Test | Pourquoi il est rouge | Ce que ce lot en fait | Programme ou attendu ? |
|---|---|---|---|
| `packages/core/__tests__/workflowMd.test.ts:29` (`:33`, `:41`, `:43-44`) | attendus écrits pour **4** phases ; la fixture re-vendorée en porte **5** | attendus **portés à 5**, et `:41` devient `p.gate?.kind` ⇒ `["human","auto","auto","human", undefined]`, **doublé** d'un `expect("gate" in phases[4]).toBe(false)` | **attendu — et c'est légitime** : la valeur attendue est **dictée par le fichier canon** (5 étapes, 4 gates), pas par la sortie du programme. Le geste **interdit** serait d'y écrire `"human"` en 5ᵉ position : *ça*, ce serait graver l'invention |
| `packages/core/__tests__/workflowMd.test.ts:130-132` | le défaut nu | **vert sans être touché** | **programme** — preuve P1 |
| `src/forge/workflowFidelite.test.ts:54` (`:62`) | `toHaveLength(4)` | porté à **5** + `expect(artifact.phases[4].gate).toBeUndefined()` | **attendu**, dicté par le fichier |
| `src/forge/workflowFidelite.test.ts:76` (`:102`) | liste d'ids à 4 | **élargi**, § 2.4 | **programme + attendu** |

**Un cinquième rouge est attendu, et il est voulu** : `src/forge/ateliers/WorkflowAtelier.test.tsx:66-77`
(*« un kind non-gated (cycle) rend le gate OPTIONNEL : off par défaut »*) repose sur l'état d'UI
**local** que le § 1.4 débranche. Une fois `showGate` dérivé de la donnée, une phase **qui porte**
une gate montre la case **cochée** — donc « off par défaut » devient faux **pour une phase gatée**.
Le test est **re-cadré** (fixture d'une phase sans gate pour le cas « off ») et **doublé** d'un test
qui manquait : décocher la case **retire la gate de la donnée** (`AC-7`). Ce n'est pas une
régression : c'est le test qui rattrape la donnée, alors qu'il ne mesurait qu'une apparence.

### 2.4 `workflowFidelite.test.ts:76` — **il est de mon lot, et il ne sera pas recompté**

🏹 Legolas pose une réserve sévère : le rendre vert **tel quel** — porter la liste d'ids de 4 à 5 —
le laisserait passer sur un fichier sauvegardé **contenant le gate inventé**, sans que rien ne le
voie. **La réserve est fondée, et elle est retenue.** Voici l'arbitrage, et sa raison.

Ce test est le **seul** du dépôt qui regarde ce que le **Save écrit réellement** : il emprunte le
chemin **édité** (`setName` ⇒ la capture verbatim ne s'applique plus ⇒ `serializeWorkflowMd` reprend
la main, `src/forge/workflowSerialize.ts:42-51`). C'est donc **exactement** le chemin par lequel le
gate inventé atteint le disque — et ses assertions (`:89-102`) ne regardent aujourd'hui **que** la
prose, le format et les ids. Le point aveugle est **au centre de la cible**.

**Tranché : le test appartient à CE lot, pas au lot en cours.** Deux raisons, dans cet ordre.

1. **Le recompter dans `GUI-VENDOR-CHARON` fabriquerait un faux vert et le landerait dans `main`.**
   Un `["p1","p2","p3","prod","surveillance"]` est *exact sur ce qu'il regarde* et *faux sur ce
   qu'il ne regarde pas*. C'est la définition même du gate menteur que **D-8** a déjà coûté une fois
   (merge `8ae5748`, `specs/notes/rectifications.md`) et que `CLAUDE.md` § « Rendre un verdict de
   gate » proscrit. On ne rachète pas un rouge honnête contre un vert aveugle.
2. **L'élargissement demandé n'a pas de sens tant que le modèle invente** : born-red, il
   appartient au lot qui le rend vert — celui-ci.

**Ce que devient le test** : il **constate les gates que le Save écrit**, en trois assertions
ajoutées après `:102` — comptage des lignes `- { afterPhase:` (**4**), négative nommée
(`not.toMatch(/afterPhase:\s*surveillance/)`), et réouverture (`parseWorkflowMd(saved)` ⇒ la 5ᵉ
phase **n'a pas** de clé `gate`).

**Conséquence assumée, à porter au gate humain** : `workflowFidelite.test.ts` (2 tests) **et**
`workflowMd.test.ts` (2 tests) **restent rouges à la clôture de `GUI-VENDOR-CHARON`** — or son
`AC-9` exige `npm run test:all ⇒ 0`. **Les deux lots ne se referment pas indépendamment.** Trois
modes d'atterrissage, arbitrage au § 10.

### 2.5 Deux successeurs nommés — constatés ici, **hors de ce lot**

> **`WORKFLOW-CANONIQUE-EN-CODE-DERIVE`** (dépôt `iakaFrameGUI`). `IAKAFRAME_CANONICAL_WORKFLOW`
> (`packages/core/src/workflow.ts:224-292`) est un littéral **en dur** qui a **décroché du canon** :
> il porte **4** phases là où le fichier canon en porte **5**, et sa phase `prod` porte
> `roleKeys: ["coordination"]` là où le canon écrit `actorsRoleKeys: [deploiement]` (Charon). Il
> sert de **dernier repli** de résolution pour les kits (`workflow injecté → Méthode → canonique`,
> `claudeCode.ts:165`) : **un kit déployé sans workflow embarque donc un workflow périmé.** Hors de
> ce lot **par nature** — le corriger change la sortie des kits, or ce littéral est *« calé pour
> reproduire à l'octet près le littéral historique »* (`workflow.ts:14-15`) et sa modification
> ferait bouger des goldens d'adaptateurs. **Lot distinct, à cadrer.**

> **`CANON-VENDOR-CHECK-RACINE-RENDUE`** (dépôt `iakaframe`, canon-side). `vendor-check` **dit contre
> quel MIROIR il a mesuré** (`miroir : <guiRoot>`, `vendor-check.js:205/210`) mais **jamais contre
> quel CANON** : la racine résolue par `libraryRoot()` **n'apparaît ni dans le rapport humain ni dans
> la charge JSON** (`vendor.js:363-371` — aucune clé `root`). C'est **la cause racine** du diagnostic
> faux du 2026-08-17 : l'outil mesure contre un arbre qu'il ne nomme pas, puis accuse
> — *« source absente cote iakaframe : … **Anomalie du canon, pas du miroir.** »*
> (`vendor-check.js:151-153`) — alors que la faute est **locale et de résolution**. Mandat en deux
> faces : (a) **rendre la racine** (`root` dans le JSON, `canon : <chemin>` dans le rapport humain,
> comme le fait déjà `gen-fixtures.mjs:138`) ; (b) **désarmer l'accusation** — une phrase qui impute
> une faute au canon ne doit être imprimée que par un outil capable d'établir qu'il a lu le bon.
> *Une garde qui ne dit pas ce qu'elle a mesuré ne peut pas dire qui a tort.*

---

## 3. Périmètre

### 3.1 Inclus

**V1 — le modèle.** `Phase.gate` devient `gate?: Gate` (`workflow.ts:79`) + les 4 sites de
`workflow.ts` du § 1.2 (`parsePhase`, `clonePhase`, `renderWorkflowMarkdown`, `updatePhaseGate`)
+ **`removePhaseGate(wf, id)`**, pur, exporté, symétrique.

**V2 — le mapper.** `mdToWorkflow` cesse de fabriquer (`frontmatter.ts:1088`) ; `workflowToMd`
n'émet que les gates portées (`frontmatter.ts:1127-1131`).

**V3 — les 5 consommateurs d'UI** du § 1.2 (7 à 11), dont le **câblage `showGate` ↔ donnée** de
`WorkflowAtelier` (§ 1.4) : la case pose et retire **la gate**, plus un booléen d'apparence.

**V4 — les preuves** (§ 2.2) : les 4 tests rouges rendus verts + le test d'UI re-cadré + les tests
neufs P2/P3/P4.

**V5 — l'instruction versée + le backlog** (`CLAUDE.md`), avec la preuve mesurée.

### 3.2 Exclu — explicitement

- **Tout octet du dépôt `iakaframe`** : canon, `cli/`, `vendor.js`, `vendor-check.js`. Ce lot est
  **GUI-only**. `CANON-VENDOR-CHECK-RACINE-RENDUE` (§ 2.5) est un **lot distinct**.
- **`IAKAFRAME_CANONICAL_WORKFLOW`** (`workflow.ts:224-292`) : **on n'y touche pas** — son décrochage
  est un successeur nommé (§ 2.5), et le modifier ici ferait bouger des goldens d'adaptateurs sous
  couvert d'un lot de modèle.
- **La sortie des kits** (`AGENTS.md`, `CLAUDE.md` générés) : **byte-inchangée**, verrouillée par
  `AC-8`. Aucun golden d'adaptateur n'est édité. *Un lot de modèle qui touche un golden a débordé.*
- **`addPhase` sensible au `kind`** (§ 2.1) : arbitrage distinct.
- **Le format de fichier** : `WorkflowMd`, `WorkflowMdGate`, l'ordre des champs, le quoting — rien
  ne bouge. Ce lot change **combien** de gates sont écrites, **jamais comment**.
- **Le re-vendorage et l'alignement du catalogue de rôles** : c'est `GUI-VENDOR-CHARON`.
- **L'amendement `AC-1`/`AC-4`** de `gui-vendor-charon.md` : **déjà porté** hors de ce lot (§ 9).
- Toute **recette visuelle** (losange retiré du `FlowDiagram`, case à cocher) : hors gate Legolas,
  au backlog des recettes humaines.
- Toute **documentation utilisateur** ou **mémoire humaine** (→ 📖 Nathalie).

---

## 4. Étapes d'implémentation

**Étape 0 — mesurer avant de toucher (bloquante).** `npm run test:all` ; **consigner la liste
NOMINATIVE des tests rouges** (fichier + nom du `it`). **Comparer aux 4 attendus du § 2.3 et
déclarer l'écart** (`AC-1`). *Le backlog `CLAUDE.md:174` annonce « 3 tests » dans `workflowMd` là où
ce cadrage n'en établit que 2 : l'écart est un **signal à lire**, pas un échec — il se déclare.*

**Étape 1 — V1 (modèle).** `workflow.ts` : le `?`, puis les 4 sites, puis `removePhaseGate`.
Le typecheck rougit alors **partout où une gate est lue sans garde** : c'est la carte de la cascade,
rendue par le compilateur. **La comparer au § 1.2 et déclarer tout site non prévu** (`AC-2`).

**Étape 2 — V2 (mapper).** `frontmatter.ts:1088` puis `:1127-1131`. À ce point, `workflowMd.test.ts:130`
**doit passer au vert sans avoir été touché** — c'est le jalon interne du lot. Si un attendu a dû
être modifié pour l'obtenir, **s'arrêter** : le correctif est faux.

**Étape 3 — V3 (UI).** Les 5 fichiers. `WorkflowAtelier` en dernier (le plus dense : garde + câblage
`showGate` ↔ donnée + le geste de retrait).

**Étape 4 — V4 (preuves).** Dans l'ordre P2 → P3 → P4, puis les 4 rouges, puis le test d'UI
re-cadré. Chaque attendu modifié **cite en commentaire le fait canon qui le justifie**
(`workflow.iakaframe-3phases.md:10` pour la 5ᵉ étape, `:11-19` pour les 4 gates et leur déclaration).

**Étape 5 — V5** (instruction versée, backlog).

**Étape 6 — recette.** `npm run lint:all`, `npm run test:all`, `cargo test` (`src-tauri/`), et la
**garde de non-régression byte des kits** (`AC-8`). Verdict rendu dans le **tableau contraint** de
`CLAUDE.md` — commande, code de sortie, résumé **cité**.

---

## 5. Fichiers concernés

**Cette instruction elle-même** — le § *Fichiers concernés* d'un lot inclut **toujours** son propre
fichier d'instruction ; l'omettre, c'est livrer un lot dont une partie du contenu n'est pas déclarée :

- `specs/instructions/gate-de-phase-optionnel.md` — **ce fichier** (le cadrage, versé au dépôt du lot).

**Cœur (2)**
- `packages/core/src/workflow.ts` — `gate?`, `parsePhase`, `clonePhase`, `renderWorkflowMarkdown`,
  `updatePhaseGate`, **+ `removePhaseGate`**.
- `packages/core/src/frontmatter.ts` — `mdToWorkflow` (l'invention), `workflowToMd` (sa propagation).

**Hôte / UI (5)**
- `src/forge/ateliers/WorkflowAtelier.tsx` — gardes + `showGate` **dérivé de la donnée** + retrait.
- `src/forge/ateliers/MethodeAtelier.tsx` — nœud « GATE » omis sans gate (2 emplacements).
- `src/components/WorkflowPanel.tsx` — chaîne principale **et** hors chaîne (`:77`, le plantage).
- `src/forge/ContextGraph.tsx` — `FlowDiagram` sans losange.
- `src/forge/workflowProposition.ts` — une phase proposée sans gate n'en reçoit pas.

**Tests (5)**
- `packages/core/__tests__/workflowMd.test.ts` — 2 rouges + P2/P4.
- `src/forge/workflowFidelite.test.ts` — 2 rouges, dont **l'élargi** du § 2.4 (P3).
- `packages/core/__tests__/workflow.test.ts` — `parsePhase` sans gate, rendu `—`.
- `packages/core/__tests__/workflowEdit.test.ts` — `removePhaseGate`, `updatePhaseGate` créatrice.
- `src/forge/ateliers/WorkflowAtelier.test.tsx` — re-cadré + la case **agit sur la donnée**.

**Backlog (1)**
- `CLAUDE.md` § Backlog — l'entrée `GATE-DE-PHASE-OPTIONNEL` fermée **avec sa preuve** (merge +
  mesure), et les **2 successeurs** du § 2.5 **ouverts**.

---

## 6. Risques

| # | Risque | Mitigation |
|---|---|---|
| **R-1** | **Graver l'invention** pour faire taire un test (écrire `"human"` en 5ᵉ position) — l'anti-pattern R-4 du lot précédent, ici à portée de main | `workflowMd.test.ts:130` doit devenir vert **sans être touché** (jalon d'Étape 2) ; chaque attendu modifié **cite le fait canon** ; `AC-3` mesure l'**absence de clé**, pas une valeur |
| **R-2** | **Corriger au sérialiseur** par heuristique (Option D, § 2.1) : 1 ligne, tentant, et **faux** — supprime un vrai gate humain à critère vide | `AC-6` : un gate `{ kind: "human", condition: "" }` **explicitement porté** est **conservé** au round-trip. C'est le test qui sépare A de D |
| **R-3** | **Coder en dur `surveillance`** (ou `side === "prod"`) et croire avoir généralisé | Preuve **P4** : workflow synthétique d'une autre méthode, gate absente sur une phase **médiane** de chaîne principale |
| **R-4** | **Poser `gate: undefined` au lieu d'omettre la clé** — invisible au `toEqual` de Vitest, invisible au typecheck (`exactOptionalPropertyTypes` absent) | `AC-3` par `expect("gate" in phase).toBe(false)` ; **ne jamais** mesurer l'omission au `toEqual` |
| **R-5** | **Casser la byte-parité Open→Save** (`workflowFidelite.test.ts:54`) : `sameWorkflow` compare par `JSON.stringify` (`workflowSerialize.ts:34-36`) — un `null` ou une clé posée à `undefined` ferait diverger capture et artefact ⇒ le chemin verbatim tomberait, silencieusement remplacé par le canonique | Option A (clé **omise**) neutralise le risque **par construction** ; `AC-4` le **mesure** malgré tout (`saved === frameWorkflow`, diff vide) — la construction se prouve |
| **R-6** | **Déborder sur la sortie des kits** en modifiant `renderWorkflowMarkdown` ou le canonique en dur | `AC-8` : goldens d'adaptateurs **inchangés**, **aucun** fichier golden édité. Le canonique en dur est un **successeur nommé** (§ 2.5) |
| **R-7** | **Un plantage d'UI non repéré** : `WorkflowPanel.tsx:77` et `WorkflowAtelier.tsx:312` lisent une gate là où le canon n'en a pas — sous `gate?` c'est le typecheck qui les attrape, mais **un accès dynamique lui échapperait** | Balayage `\.gate\b` **exhaustif** (§ 1.2, aucune déstructuration ni accès par index constaté) + `npm run lint:all` bloquant + `AC-7` (l'éditeur rend l'étape sans gate **sans lever**) |
| **R-8** | **Les deux lots ne se referment pas indépendamment** (§ 2.4) : `AC-9` de `GUI-VENDOR-CHARON` exige un `test:all` vert que 4 rouges empêchent | **Porté au gate humain** (§ 10, point 2). Aucun mode d'atterrissage n'est choisi par l'exécutant |

---

## 7. Critères d'acceptation

| # | Critère | Vérification |
|---|---|---|
| **AC-1** | La mesure d'entrée est **rendue**, et l'écart au cadrage **déclaré** | La sortie `npm run test:all` **d'avant** l'étape 1 est citée avec la **liste nominative** des rouges. Si ≠ 4 / ≠ § 2.3 : l'écart est **nommé test par test**. Un écart déclaré **n'est pas un échec** ; un écart **tu** en est un |
| **AC-2** | La cascade est **constatée**, pas supposée | La liste des sites rendus rouges par le typecheck après le seul `gate?` est citée et **confrontée aux 11 lignes du § 1.2**. Tout site non prévu est **nommé** |
| **AC-3 — CENTRAL** | Le modèle **n'invente plus**, et la clé est **absente** | `const wf = parseWorkflowMd(frameWorkflow)!` ⇒ `wf.phases` a **5** entrées, `wf.phases[4].id === "surveillance"`, et **`expect("gate" in wf.phases[4]).toBe(false)`**. Un `gate: undefined` ⇒ **FAIL** |
| **AC-4 — PREUVE REINE (P1)** | La réciprocité inter-niveaux est vraie, **sans que son attendu ait bougé** | `workflowMd.test.ts:130-132` **vert**, et `git diff` sur ce bloc ⇒ **vide**. Un attendu modifié pour l'obtenir ⇒ **FAIL** (R-1) |
| **AC-5 — COMPTAGE (P2)** | `5 phases / 4 gates` **conservé aux quatre points de mesure** | Le tableau du § 1.1 rejoué en assertions : lean `4`, riche `4` phases-avec-gate sur 5, retour lean `4`, **et dans les octets** : les lignes `/^\s*- \{ afterPhase:/m` de la sortie de `serializeWorkflowMd` comptent **exactement 4** |
| **AC-6 — anti-heuristique** | Un gate **explicitement porté** et **vide** est **conservé** | Un `WorkflowMd` dont une phase porte `{ afterPhase: "x", kind: "human", criteria: "" }` round-trippe **avec sa gate**. Sa disparition ⇒ **FAIL** (Option D écartée, R-2) |
| **AC-7 — l'UI ne ment plus** | L'éditeur P6b **rend** une phase sans gate, et la case **agit sur la donnée** | (a) Sélectionner l'étape `surveillance` du canon (`kind: pipeline`) **ne lève pas** et affiche `◇ aucun gate` ; (b) sur une phase **avec** gate, la case est **cochée** ; (c) la **décocher** produit un workflow dont la phase **n'a plus** de clé `gate` ; (d) la **recocher** en repose une |
| **AC-8 — non-régression byte des kits** | La sortie des adaptateurs est **inchangée** | `npm run test:all` : **aucun** golden d'adaptateur (`agents-golden/`, `parite-generateurs.test.ts`, `adaptersAgentsMd.test.ts`) modifié — `git diff --stat` sur les goldens ⇒ **vide**. Motif : `renderWorkflowMarkdown` exclut les phases `offChain` (`workflow.ts:344-346`) |
| **AC-9 — généricité (P4)** | La fidélité est une propriété du **modèle** | Un workflow `methodId: "sparc"`, `kind: "flow"`, dont la phase **médiane** (chaîne principale, **pas** `offChain`) n'a **pas** de gate, round-trippe fichier → riche → fichier **à l'identique** ; son rendu markdown porte `—` dans la cellule Gate |
| **AC-10 — le Save écrit la vérité (P3)** | Le fichier **écrit au pool** ne porte pas le gate inventé | `workflowFidelite.test.ts:76` élargi : sur le chemin **édité**, `saved` compte **4** lignes `- { afterPhase:`, **`not.toMatch(/afterPhase:\s*surveillance/)`**, et `parseWorkflowMd(saved).phases[4]` **n'a pas** de clé `gate` |
| **AC-11 — byte-parité Open→Save préservée** | Le chemin verbatim n'a pas été cassé (R-5) | `workflowFidelite.test.ts:54` : `saved === frameWorkflow` (diff **vide**), `writes` = une seule écriture |
| **AC-12 — symétrie** | Ce qui se pose se retire | `removePhaseGate` **exporté** depuis `@iakaframe/core` ; retirer puis reposer une gate rend un workflow **structurellement égal** à l'original ; `removePhaseGate` sur un id inconnu ⇒ **no-op** |
| **AC-13** | Gate qualité vert, **au format contraint** | `npm run lint:all` ⇒ `0` ; `npm run test:all` ⇒ `0`, **compte de tests ≥ baseline, aucun test supprimé** ; `cargo test` ⇒ `0`. Verdict en tableau (commande / code / résumé **cité**), jamais en prose |
| **AC-14** | **Zéro octet écrit dans le canon** | `git -C <canon> status --porcelain` ⇒ **vide** après l'exécution complète |
| **AC-15** | L'instruction est **dans le dépôt du lot** | `specs/instructions/gate-de-phase-optionnel.md` présent et committé (réserve `R-2` du gate R1 : une instruction hors dépôt est une réserve ouverte) |
| **AC-16** | Les successeurs sont **nommés**, pas seulement constatés | `CLAUDE.md` § Backlog porte deux entrées **ouvertes** — `WORKFLOW-CANONIQUE-EN-CODE-DERIVE` et `CANON-VENDOR-CHECK-RACINE-RENDUE` — avec leur mandat § 2.5 |

---

## 8. Estimation dev (⚒️ Gimli)

| Poste | Charge | Note |
|---|---|---|
| Étape 0 — mesure d'entrée + liste nominative des rouges | 0,10 j-h | bloquant, court |
| V1 — modèle (`workflow.ts` : `?` + 4 sites + `removePhaseGate`) | 0,25 j-h | petit, mais c'est le pivot |
| V2 — mapper (`frontmatter.ts` : 2 sites) | 0,15 j-h | **2 lignes de fond** ; le soin est doctrinal |
| V3 — UI (5 fichiers, dont le câblage `showGate` ↔ donnée) | 0,35 j-h | `WorkflowAtelier` porte l'essentiel |
| V4 — preuves (4 rouges + 1 re-cadré + ~8 tests neufs P2/P3/P4) | 0,45 j-h | **le gros du lot** ; c'est la valeur livrée |
| V5 — instruction versée + backlog (2 successeurs) | 0,05 j-h | trivial |
| Recette `AC-1`…`AC-16` (dont `cargo test`) | 0,15 j-h | commandes fournies |
| **Total** | **≈ 1,50 j-h** | spec fermée |

**Complexité : MODÉRÉE. Risque : ÉLEVÉ — et il est doctrinal, pas technique.** Le code à écrire est
minuscule (`?` + une poignée de gardes) ; ce qui est difficile est de **ne pas** prendre le
raccourci qui rend les tests verts sans rendre le programme fidèle (R-1, R-2, R-3). Un lot de cette
nature se rate **en réussissant sa suite de tests**.

**Inconnues susceptibles de faire glisser :**

1. **Le test d'UI re-cadré** (`WorkflowAtelier.test.tsx:66-77`, § 2.3). Il faut lui donner une
   fixture de phase **sans** gate là où il s'appuyait sur un état local ; si l'atelier n'expose pas
   commodément un workflow de test à phase dégatée, le geste peut s'allonger.
   **Impact estimé : +0,1 à +0,2 j-h.**
2. **Un consommateur de gate hors balayage.** Le § 1.2 est exhaustif sur `\.gate\b` en `.ts`/`.tsx`,
   mais un accès construit dynamiquement y échapperait. Borné par `AC-13` (suite complète) — révélé,
   mais tard. **Impact estimé : +0,1 j-h.**
3. **Le `FlowDiagram` sans losange** (`ContextGraph.tsx`) : la géométrie verticale est calculée en
   pas fixes (`rowH = 62`, `ContextGraph.tsx:21-29`). Retirer un losange sans retoucher la géométrie
   peut laisser un blanc. **Purement visuel** ⇒ **recette humaine**, jamais deviné ici.
4. **Le mode d'atterrissage** (§ 10, point 2) : le découpage retenu par le décideur change l'ordre
   des gestes, pas leur contenu.

---

## 9. Amendement déjà porté à `gui-vendor-charon.md` — **hors de ce lot**, tracé ici

Les deux points d'instrument remontés par 🏹 Legolas concernent la **reproductibilité du gate en
cours**, pas le défaut de modèle. Les reporter dans ce successeur aurait laissé
`GUI-VENDOR-CHARON` se recetter avec des critères non reproductibles. **Ils ont donc été portés
immédiatement, en amendement de l'instruction existante** (le 2026-08-17) :

- **`AC-1`** exige désormais `--root <canon>` **explicite** + citation du `rev-parse` et de la
  version du canon. Sans `--root`, `libraryRoot()` (`~/work/iakaframe/cli/src/lib/library.js:47-60`)
  ignore l'emplacement du script, remonte depuis le `cwd`, ne trouve pas le double marqueur, puis
  retombe sur l'ancre de chapeau `~/work/iakaframe` — **`0.38.0`** — d'où `checked: 78, drift: 25`
  et 4 `source-introuvable` portant *« Anomalie du canon, pas du miroir. »*
- **`AC-4`** exige `--canon <canon>` **explicite** + citation de la ligne `canon : <chemin>`
  (`gen-fixtures.mjs:138`). `resolveCanon()` (`gen-fixtures.mjs:61-76`) retombe sur
  `<GUI>/../iakaframe` — **le même mauvais arbre**.
- **`R-9`** nomme la **troisième variante** : *mesurer contre le mauvais checkout **en croyant
  l'avoir désigné par le chemin du script*** — distincte de `R-1` (vendorer depuis le mauvais
  checkout) et de `R-3` (SKIP pris pour un vert).

Le **message d'erreur** lui-même n'est pas amendable ici : il vit dans le canon
(`iakaframe/cli/src/commands/vendor-check.js:151-153`) et ce lot n'y écrit rien. Il devient le
successeur **`CANON-VENDOR-CHECK-RACINE-RENDUE`** (§ 2.5).

---

## 10. Points portés à l'arbitrage (gate humain P1→P2)

Trois décisions sont **proposées**, pas prises — elles appartiennent au décideur.

1. **Ratifier l'Option A** (§ 2.1) : `Phase.gate` devient optionnel, clé omise. Conséquence produit
   assumée : **une étape peut désormais n'avoir aucun gate**, dans le modèle comme dans l'éditeur —
   et la forge cesse d'imposer un feu vert que la méthode ne demande pas. C'est une conséquence
   **forcée** de la doctrine GUI ← frame, mais elle change ce que l'utilisateur peut exprimer :
   elle mérite un feu vert conscient.

2. **Trancher le mode d'atterrissage** avec `GUI-VENDOR-CHARON` (§ 2.4). Les deux lots ne se
   referment pas indépendamment : 4 tests rouges tiennent l'`AC-9` du premier.
   - **T1 — train unique (RECOMMANDÉ)** : ce successeur est développé sur la **même branche**, les
     deux merges se suivent, `AC-9` est mesuré **une seule fois sur l'état final**. `main` ne reçoit
     jamais d'état rouge. Coût : la branche vit plus longtemps.
   - **T2 — merge avec rouge déclaré nominatif** : `GUI-VENDOR-CHARON` merge avec 4 rouges nommés au
     message de merge et au backlog ; successeur immédiat. Coût : `main` porte un `test:all` rouge —
     ce que cette maison n'a jamais accepté, et ce dont **D-8** garde la trace.
   - **T3 — recompter les 4 rouges dans le lot en cours** : **non recommandé, et argumenté contre**
     au § 2.4 — ce serait acheter un vert aveugle contre un rouge honnête.

3. **Prendre acte de l'estimation à ≈ 1,50 j-h** et décider : **engager tel quel**, **découper**, ou
   **re-cadrer**. À noter si le découpage tente : **V1+V2 sans V4 ne prouve rien** (le programme
   serait corrigé sans que personne ne puisse le re-mesurer), et **V1+V2 sans V3 laisse l'éditeur
   P6b planter** sur l'étape `surveillance` (§ 1.4). Les trois volets ne se séparent pas.
