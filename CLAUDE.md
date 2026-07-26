# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est lu en priorité par Claude Code à chaque session.
> Pour la vision complète du projet, lire `specs/PROJET.md`.
> Pour la méthode de collaboration, voir `methode-de-travail.md` (iakaframe).

---

## Rôles (rappel)

- **Cowork** (réflexion) rédige les instructions dans `specs/instructions/`. Il ne
  modifie jamais le code.
- **Claude Code** (toi) lis l'instruction correspondante AVANT chaque tâche, puis
  implémentes, builds, testes et commites.

---

## Ce qu'est ce projet

**iakaFrameGUI — la forge de la méthode iakaframe** : authoring de teams *pures*
(teams, méthodes, bindings, workflows, kits), dans une coquille de bureau. Elle
**crée et livre** ; le cockpit réceptionne et exécute.

Stack : React 18.3 + TypeScript 5.5 + Vite 6 + Tauri 2 (Rust 2.11) + Vitest 4,
monorepo **npm workspaces** (`packages/*`, dont `@iakaframe/core`).

---

## Commandes à utiliser

> **Invariant** : cette liste ne contient **que des scripts réellement exposés** par
> `package.json`. Une commande documentée mais inexistante est pire qu'absente — elle
> transforme un `Missing script` en faux vert pour qui ne lit pas la sortie. Toute
> commande ajoutée ici doit l'être **en même temps** que le script correspondant.

```bash
npm run dev            # démarrer le front en dev (Vite)
npm run tauri dev      # démarrer l'app de bureau complète (front + Rust)
npm run build          # build de prod (tsc && vite build)
npm run preview        # servir le build de prod

npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run lint:all       # typecheck + lint   <- mesure de gate

npm run test           # vitest run
npm run test:all       # tous les tests     <- mesure de gate
npm run test:coverage  # vitest run --coverage
```

Côté Rust, dans `src-tauri/` : `cargo test`. **Volontairement hors de `test:all`** :
en dépendre rendrait la mesure faillible sur toute machine sans toolchain Rust.

---

## Rendre un verdict de gate

**Un verdict de gate qui ne cite pas ses commandes et leurs sorties n'est pas un
verdict : c'est une opinion. Il ne franchit rien.**

Un « gate PASS » non sourcé est **inopposable** : la charge de la preuve pèse sur
l'émetteur, et un merge qui l'affirme sans mesure attachée est, par construction, un
merge **non gaté** — même s'il se trouve que le code était vert. Motif : le merge
`8ae5748` portait « gate Legolas PASS » alors que le lint était rouge
(cf. `specs/notes/rectifications.md`).

Tout verdict se rend donc dans ce **format contraint** — un tableau, jamais de la prose :

| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run lint:all` | `0` | `(aucune sortie)` |
| `npm run test:all` | `0` | `Test Files 53 passed (53) / Tests 496 passed (496)` |

Règles d'usage, appliquées **sans examen du fond** :

- une case **vide**, un **« OK » sans chiffre**, ou un résumé **reformulé** ⇒ **FAIL** ;
- un critère **non mesuré** se déclare *non mesuré*, **jamais** *PASS* ;
- une mesure **reprise du rapport d'un autre agent** n'est pas une mesure : on
  **re-mesure**. C'est ce geste — et lui seul — qui a révélé l'incident `8ae5748`.

---

## Conventions

- **Langue du code** : anglais (identifiants, commits techniques).
- **Langue de la doc et des échanges** : français.
- **Commits** : *conventional commits* (`feat:`, `fix:`, `docs:`, `chore:`, `wip:`).
- **Commits atomiques et fréquents** : après chaque étape logique (filet de
  sécurité pour pouvoir revenir en arrière). Jamais de `reset --hard` ni de
  `push --force` de ton côté.
- **MVP d'abord, puis itérer.** Pas de sur-ingénierie.
- **Self-hosted / open-source d'abord** pour tout choix de backend ; cloud en
  fallback justifié seulement.
- **Réutiliser l'existant** (infra, services, MCP) avant de réimplémenter.
- En dev, **mocker les appels API** coûteux/limités (voir `specs/mock/`).

---

## Dépôt git : Forgejo (iakabox)

Remote par défaut : **Forgejo LAN** `http://192.168.2.11:3001/sjupin/<repo>.git`,
**HTTP + token** (SSH inutilisable). Token via `$env:FORGEJO_TOKEN` ou `.git/config`
local — **jamais commité**. Voir `iakabox-usage.html` (iakaframe) pour clone/push,
création de dépôt (API, description **ASCII**) et rotation de token.

## Cycle de documentation (état des lieux)

Régénérer l'état des lieux **à chaque changement de version** et **à chaque pause /
préparation de reprise** :

```powershell
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason version -Version vX.Y.Z -Note "..."
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason pause   -Note "où on s'arrête, quoi reprendre"
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason reprise -Note "reprise"
```

Génère `specs/etat-des-lieux.md` + `.html` (faits git auto). **Compléter le récit de
reprise** dans le `.md` (ce qui vient d'être fait, ce qui reste, prochaine étape).

---

## Avant toute tâche non triviale

1. Lire l'instruction correspondante dans `specs/instructions/`.
2. Si elle n'existe pas → le signaler ; ne pas improviser une feature lourde sans
   spec. Proposer un plan court d'abord.
3. Implémenter étape par étape, avec commits intermédiaires.
4. Lancer typecheck + lint + tests avant de considérer la tâche finie.
5. Pour toute action vraiment destructive hors denylist : **demander confirmation
   par message texte avant d'agir.**

---

## Backlog

<!-- Liste des features priorisées. Chaque entrée pointe vers son instruction. -->

> Reste à faire sur **iakaFrameGUI**, au **2026-07-25** (reprise). État détaillé et récit de
> reprise : `specs/etat-des-lieux.md`. **Ce backlog n'inscrit un item comme livré qu'avec sa
> preuve** (merge + mesure) : un item coché sans référence est à re-mesurer, pas à croire.
>
> **Santé mesurée à la reprise du 2026-07-25** (`main` `c88e8bf`, arbre propre) :
> `npm run lint:all` → exit `0`, aucune sortie ; `npm run test:all` → exit `0`,
> `Test Files 56 passed (56) / Tests 518 passed (518)`. **`cargo test` non mesuré** à la reprise.

### Ouvert — à trancher ou à cadrer (avant tout code)

- [ ] **Sous-lot B « cardinalité » — non commencé.** Le **lot A** (modèle de frame agnostique :
  `kind` first-class, acteurs/conteneur unifiés) a été livré **par une autre session** le 2026-07-26
  (`a6d9803`). Le **sous-lot B** de ce même cadrage reste dû : `coordinator` **optionnel** + N=1 dans
  `assemble`. ⚠️ Son instruction vit **dans le dépôt canon**
  (`iakaframe/specs/instructions/correction-biais-modele-frame.md`), pas ici — **verser le cadrage
  avant de coder**, comme pour le chantier frames.
- [ ] **Troisième sens de « réservoir » — non cadré.** L'onglet **Apprentissage** appelle
  « réservoir » son **stock de propositions** (`useForgeLearning.ts`, `LearningAtelier.tsx`,
  `backend.ts`, sous-titre d'onglet). Découvert en exécutant le renommage AR-2 : **aucun cadrage ne
  couvre ce sens**, il a donc été laissé intact. À trancher — le garder (sens distinct assumé) ou
  l'aligner. *Sans décision, le mot porte deux sens dans l'interface.*
- [ ] **Open WebUI : porter le workflow d'équipe ?** — *écarté le 2026-07-26 comme addition simple,
  avec sa raison* : cet adaptateur ne produit **aucun fichier-contrat d'équipe**, seulement un Model
  JSON **par persona** (`params.system` = « qui es-tu »). Y mettre le workflow dupliquerait une donnée
  d'équipe dans chaque persona et mélangerait les registres. Le porter supposerait un **artefact
  d'équipe séparé** qui n'existe pas dans ce format — **chantier distinct**, à cadrer si le besoin
  se confirme. Réf. `specs/instructions/phases-workflow-kits-claude.md` § 1.2.
- [ ] **Arbitrage reporté — « que doit produire New ? »** `requestNew` recharge un starter
  identique à celui semé au montage : dans l'état pristine, le geste est un **no-op visuel**.
  Décision de produit, pas de code. *(Réserve ouverte depuis le 2026-07-15, à re-vérifier.)*

### Recettes humaines (gestes visuels/interactifs — Legolas ne valide pas le pixel)

- [ ] Forge **Cinabre** + écran **Générer / Déployer** : voir la charte, basculer, cycle
  team → nœud → Générer → Déployer sur un dossier tmp (**U-10**).
- [ ] Cycle **handoff** Livrer → Réceptionner (forge → cockpit).
- [ ] **G-8** : déployer un kit dans un **vrai** projet Claude Code (subagents/skills reconnus +
  canal d'identité opérationnel) — `specs/notes/P3-recette-manuelle-G8.md`.
- [ ] **B-7 (P7)** : importabilité réelle d'un kit **lié** — Open WebUI avec `base_model_id` rempli
  (importable), Codex avec modèle référencé ; Claude Code sans modèle = pur et valide.
- [ ] **B-10 (P7)** : smoke visuel Binding bout-en-bout — team → nœud → **cocher « Lier »** (Open WebUI,
  un modèle) → Générer (voir `base_model_id` rempli) → Déployer sur tmp → `binding.json` présent à la racine.
- [ ] **P6b — 4ᵉ onglet Workflow** : recette visuelle — liste des phases, boutons monter/descendre/ajouter/
  supprimer, éditeur de phase (nom, description, rôles par cases, offChain, gate), reflet dans le `FlowDiagram`,
  sélecteur `workflowId` de l'onglet Méthode (`npm run tauri dev`).
- [ ] **Chantier frames** : recette visuelle du réservoir de frames (12 types, collection `frames`)
  et de la vignette flamme du 9ᵉ rôle.

### North-star (design gardé ouvert, hors MVP)

- [ ] **Import multi-méthodes** (BMAD / MetaGPT / SPARC) — agnosticisme de méthode gravé dès le cœur ;
  ne rien hard-wirer « iakaframe-only ».

### Livré — objectif « charger le frame dans le GUI », **FERMÉ 4 étapes / 4**

| Étape | Livré | Merge | Version |
|---|---|---|---|
| 2+3 | Open→Save fidèle au frame (capture corps + layout, rethread au Save) | `c70dbe0` | v0.1.1 |
| 3bis | Workflow au format frame autoritaire (frontmatter phases/gates) | `68a7bf4` | v0.1.2 |
| 4 Lot 1 | Roster 8/8 (helm) + byte-parité team `iakaframe-8` + tools 8/8 + `test:vendor` | `5011e38` | v0.1.3 |
| 4 Lot 2 | B2 — 5 clés de rôle alignées sur le canon + bug skill helm→deploiement | `6fb7e36` | v0.1.4 |

Instructions : `frame-open-save-fidelite.md`, `frame-workflow-format-reconciliation.md`,
`frame-parite-vendoring-garde.md`, `b2-alignement-cles-role-canon.md`.
**Doctrine tenue : GUI ← frame** — le canon `iakaframe` est autoritaire, le miroir ne le déforme jamais.

### Livré — jalons antérieurs (preuves conservées, détail dans `specs/etat-des-lieux.md`)

- [x] **D-7** — perte silencieuse à la résolution d'une Méthode rendue **visible**
  (`unresolvedRefsForMethod` + bandeau du rail Méthode), merge `e9add1a`.
- [x] **D-8** — réparation du **gate menteur** : scripts `lint:all`/`test:all` réellement exposés,
  format de verdict contraint gravé ci-dessus, registre `specs/notes/rectifications.md` ouvert
  (motif : le merge `8ae5748` portait « gate PASS » avec un lint rouge), merge `65e64f2`.
- [x] **D-9** — re-vendorage du canon `iakaframe` vers le miroir GUI, merge `e8cb7ba`.
- [x] **Modèle Méthode élargi** — `Method` porte `scaffoldIds` + `workflowId` + `principleIds` +
  `ritualIds` + `guardrailIds` + `roleKeys`, adossés aux catalogues composables du cœur
  (`principle.ts`, `ritual.ts`, `guardrail.ts`, `roles.ts`) et validés par `unresolvedRefsForMethod`.
  *(Item ré-évalué le 2026-07-25 : il était encore listé « à graver » alors que le code le porte.)*
- [x] **P7 — Binding réel** (2026-07-16, merge `9ecf97f`) — `Binding`/`PersonaBinding` +
  `defaultBindingForNode`, émission **conditionnelle** du modèle par adaptateur
  (`KitGenOptions.binding?`), `LiaisonPanel`, `binding.json` au `KitFileTree`. Invariant B-2 :
  **sans binding = sortie byte-identique**. `specs/instructions/P7-forge-liaison-deploiement.md`.
- [x] **P6b — Éditeur de workflow** (2026-07-16, merge `be9dcd4`) — collection `workflows/` comme
  artefact de 1re classe, 4ᵉ onglet, résolution pure par `KitGenOptions.workflow`, `COLLECTIONS +=
  workflows` côté Rust. `specs/instructions/P6b-editeur-workflow.md`.
- [x] **Champ nom éditable** (2026-07-15, merge `fc22eec`) — titre éditable Team/Méthode, Kit
  read-only, Save As prérempli. **Recette visuelle humaine PASSÉE (RAS).**
- [x] **Commandes terminal + livraison bibliothèque** (dépôt `iakaframe`, merges `2d481bf` +
  `2c85702`) — 5 verbes `list`/`show`/`assemble`/`add`/`switch(use)`, pool matérialisé. *Réserve
  mineure : CLI `existsSync` vs GUI `is_dir()` sur le marqueur de racine (cas de bord).*

### Dettes closes le 2026-07-25 (re-mesurées à la reprise — ne pas les rouvrir sans preuve)

- ~~Perte du corps markdown au Save~~ — **close** par le lot Open→Save : `useForgeDocument.ts`
  capture `verbatimBody(text)` et `ForgeShell.tsx` sérialise `o.body ?? <boilerplate>`.
- ~~Câblage du wrapping des listes flow volontairement non fait~~ — **close** : `readListLayout`
  est capturé (`useForgeDocument.ts`) et passé à `serializeMethodMd` (`ForgeShell.tsx:124`).
- ~~Fixture `method.iakaframe-wrapped.md` au corps tronqué~~ — **close** : `diff` avec
  `~/work/iakaframe/methods/iakaframe.md` ne sort **rien** (22 lignes de part et d'autre).
- ~~Réserve P6b « total front consolidé non re-mesuré / `ForgeShell.test.tsx` à reconfirmer »~~ —
  **close** : `npm run test:all` → `56 passed (56)` / `518 passed (518)`, et le run ciblé
  `npx vitest run src/forge/ForgeShell.test.tsx` → `Test Files 1 passed (1) / Tests 3 passed (3)`.
- ~~Phases/workflow absentes du kit Claude Code~~ — **close, LIVRÉ 2026-07-26** : `CLAUDE.md` porte
  la section, au même rang que dans `AGENTS.md`, **via le même rendu** (`renderWorkflowMarkdown`) et
  le même ordre de résolution (workflow injecté → Méthode → canonique). Un kit Claude Code déployé ne
  perd plus l'information de workflow. **Trou révélé au passage : rien ne verrouillait la sortie de
  `renderClaudeMd`** — 5 gardes ajoutées, dont la comparaison du bloc avec celui d'`AGENTS.md`.
  Gate : `lint:all` `0`, `test:all` `0`, **`61 passed (61)` / `551 passed (551)`**, `cargo test`
  `83 passed`. Instruction : `specs/instructions/phases-workflow-kits-claude.md`.
- ~~Pointeur de frame active (cadré, non codé)~~ — **close, LIVRÉ 2026-07-26** : le pointeur vit
  dans `<projet>/iakaframe.json` (clé `frame`), le projet étant réglé dans les Settings. Écriture
  **non destructive** côté Rust, qui **refuse d'écrire** sur un JSON illisible plutôt que d'écraser
  les clés du CLI. `buildFrame(raw, activeFrameId?)` : **sans pointeur = comportement d'avant**,
  prouvé ; pointeur mort → repli sur `default` **avec alerte**. `Frame` expose `frames` (lister est
  requis pour choisir). Instruction : `specs/instructions/pointeur-frame-active.md` § 3bis.
  Gate : `lint:all` `0`, `test:all` `0`, **`60 passed (60)` / `546 passed (546)`**, `cargo test`
  **`83 passed`**.
  ⚠️ *Reste à confirmer au dépôt canon : le **nom de clé** `frame`, avant que le CLI ne s'y branche.*
- ~~Fëanor est le copilote du GUI (cadré, non codé)~~ — **close, LIVRÉ 2026-07-26** : identité
  **dérivée du canon** (`identity.ts` lit la fiche du rôle `frame` par `poolReadAll`, recherche par
  RÔLE et non par nom), `buildSystemPrompt(identity?)` injecté (**sans identité = byte-identique**,
  prouvé), badge d'ouverture/clôture **posé par l'UI** (schéma JSON intact), repli explicite sans
  identité inventée. Instruction : `specs/instructions/feanor-copilote-du-gui.md` § 4bis.
  Gate : `lint:all` `0`, `test:all` `0`, **`58 passed (58)` / `533 passed (533)`** (+15 tests).
- ~~`CopiloteShell` plante au montage sur un backend partiel~~ — **close** : `api.authoringModel?.()`
  aligné sur son voisin `authoringEndpoint?.()`. Le `.catch` seul ne protégeait pas — sur une méthode
  **absente**, l'appel lève **synchronement**, avant que la chaîne de promesse n'existe. Le fake des
  tests est redevenu **minimal** (`poolReadAll` seul) : il tient lieu de garde, et retirer le `?.`
  fait rougir immédiatement.
- ~~Renommage `reservoir` → `element pool` inachevé (A13)~~ — **close** : merge `--no-ff` de
  `refactor/element-pool-renommage` (`f55e0dd` code + `3136b00` libellés, isolé et révocable).
  Fichiers/symboles renommés, doc alignée. **Libellés visibles passés à « Briques »** (`16af12b`,
  arbitrage décideur : « outils » écarté car déjà pris par `Binding.tools`/`toolKinds`, et émis
  verbatim dans les contrats générés). **Contrat de prompt LLM volontairement inchangé** (clé
  `reservoir` du payload = contrat externe avec le modèle).
  Gate : `lint:all` `0`, `test:all` `0`, `56 passed (56)` / `518 passed (518)` — compte inchangé.
- ~~Chantier frames sans instruction locale~~ — **close** : cadrage rétro-porté dans
  `specs/instructions/frame-reservoir-et-9e-role-portage-gui.md` (les 7 commits des 24–25/07
  tracés entrée canon ↔ preuve mesurée, reste à faire borné en § 2). Sources canon :
  `iakaframe/specs/instructions/reservoir-de-frames.md` et `role-frame-builder.md`.
- ~~3 branches de travail obsolètes~~ — **supprimées** (local + `origin`) après archivage par tags
  `archive/feat/open-frame-portfolio` (`a9bc7ca`), `archive/feat/align-binding-format-frame`
  (`5152c72`), `archive/feat/ch-a-reconciliation-rolekey` (`27d8a2d`), poussés sur Forgejo.
  Résurrection : `git switch -c <nom> archive/<nom>`.
