# Évolution E2 — Séparation Méthode / Team, la strate Méthode (6 composants) & les Principes

> **Nature** : REFONTE MAJEURE du modèle de concepts (niveau portefeuille, décidée par le décideur
> **en session**) — **cadrage seul, aucun code**. · **Cadreur** : l'architecte-cadreur.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain).
> **Date** : 2026-07-14. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Amende** : `specs/contrat-concepts.md` (§ 2.1 Méthode, § 2.7 Workflow, § 2.8 Team, § 1 vue d'ensemble,
> § 1.1 couches), en s'appuyant sur `specs/instructions/E1-evolution-binding-ar1.md` (le Binding
> runner+modèle, qui reste valable et devient une **brique** du Kit).
> **Cible GUI** : `iakagraph/etudes/iakaframegui/v4-convergence/maquette-convergence.html` (+ son `README.md`).
> **Code réel touché** : `packages/core/src/{team,workflow,roster,adapters/*}.ts`, `src/components/*`,
> `src-tauri/src/handoff.rs`, et les tests associés (§ 6).

---

## 1. Déclencheur & insight

**Insight (décideur, en session)** : le contrat validé au jalon du 2026-07-05 **fond la méthode dans la
Team** (`Team.methodId`, `Team.workflowId`, workflow porté par la définition de team). Or **une méthode et
une équipe sont deux choses distinctes** : la **méthode** est la *discipline* (workflow, principes, rituels,
gardes, référentiel de rôles, scaffold) ; la **team** est un *casting* de personas. Les fondre empêche de
**réutiliser une même Team sur plusieurs méthodes** — et inversement une même méthode sur plusieurs castings.

**Conséquence** : on **sépare** en **deux artefacts de premier ordre**, fabriqués à la forge, **livrés
séparément**, et **bindés** au Cockpit via un troisième artefact d'assemblage — le **Kit**. Le **Binding
runner+modèle** d'E1 reste valable : il devient l'une des trois briques du Kit.

**Ancrage — état de l'art (vérifié le 2026-07-14, cf. § 12).** La séparation *discipline ↔ casting* est le
choix des frameworks multi-agents matures : **BMAD v6** (~49 k étoiles, juin 2026) distribue **workflows +
templates** d'un côté et **définitions de personas** de l'autre, comme deux jeux de fichiers. Côté **Claude
Code** (2026), la doctrine officielle « le bon outil dans la bonne couche » (CLAUDE.md / skills / hooks /
subagents) valide notre **continuum** Principe→Rituel→Garde (§ 2.3). La refonte n'est donc pas une lubie :
elle **converge** avec l'état de l'art.

**Ce n'est pas un patch — c'est un refactor.** P1→P6 + H1 sont **livrés** (code réel présent). E2 **casse le
schéma Team** et **déplace** le workflow : la **non-régression** est une exigence de premier plan (§ 6, gate
tenu par le rôle tests).

---

## 2. Le modèle cible — QUATRE strates (à graver)

```
 ┌─ MÉTHODE (discipline) ─ NOUVEAU concept de 1er ordre ────────────────┐
 │  1. Scaffold · 2. Workflow(phases+gates) · 3. Principes ·           │
 │  4. Rituels/gestes · 5. Gardes-fous · 6. Référentiel de rôles       │
 │  Ne NOMME aucun agent — que la discipline. Fabriquée à la forge.    │
 └──────────────────────────────────────────────────────────────────────┘
                              +   (indépendante)
 ┌─ TEAM (casting PUR, method-agnostic) ───────────────────────────────┐
 │  personas (rôle · royaume · skills · gardes · vignette) ·          │
 │  coordinateur · vignette de team.  JAMAIS de workflow/méthode ICI.  │
 │  Réutilisable sur PLUSIEURS méthodes. Fabriquée à la forge.         │
 └──────────────────────────────────────────────────────────────────────┘
                              +   (E1, brique reprise)
 ┌─ BINDING runner+modèle (E1, par nœud) ──────────────────────────────┐
 │  persona → runner + modèle · défaut suggéré (forge) / override      │
 │  (cockpit). Reste une couche SÉPARÉE et OPTIONNELLE.                │
 └──────────────────────────────────────────────────────────────────────┘
                              =
 ┌─ KIT (assemblage TOTAL par défaut) ─────────────────────────────────┐
 │  Méthode + Team + Binding(suggéré)  →  livrable STANDALONE          │
 │  Binding STRUCTUREL Méthode↔Team, override au Cockpit. Onglet Kit.  │
 └──────────────────────────────────────────────────────────────────────┘
```

**Points de bascule à graver** :
1. **Méthode ≠ Team.** Deux artefacts **séparés**, fabriqués à la forge, **livrés séparément**, **bindés** au
   Cockpit. La méthode **ne porte plus la team** ; la team **ne porte plus la méthode**.
2. La **pureté de la Team** (E1/AR-1) est **renforcée** : la Team perd **aussi** son `workflowId` et son
   `methodId` — elle devient un **casting pur, method-agnostic**.
3. Le **Kit** est le point de rencontre : `Méthode + Team + Binding(?)`. C'est le **livrable standalone**,
   overridable au Cockpit. Le **Binding structurel** (quelle Méthode va avec quelle Team) est **distinct** du
   **Binding runner+modèle** d'E1 (l'une des briques).

---

## 3. La strate MÉTHODE — nouveau concept de 1er ordre, SIX composants

> **[MVP]** modélise les six comme **données** dans le cœur, seedées pour iakaframe, **affichées en lecture**
> (dépliables) dans l'onglet Méthode. L'**édition riche** de chaque composant est **[différé]** (§ 11).

### 3.1 Scaffold — la structure de folders (à deux niveaux)
Décrit l'**échafaudage** qu'un projet doit recevoir, sur **deux niveaux** :
- **Portefeuille** (`~/work`) : racine + **backlog transverse** (`~/work/BACKLOG.md`).
- **Projet** : `specs/` · `specs/instructions/` · `CLAUDE.md` · `.iakaframe` · **isolation Docker**
  (stack + ports préfixés par projet) · **remote Forgejo**.
- Attributs (indicatifs) : `id`, `level` (`portfolio` | `project`), `entries[]` (chemin + rôle + créé-si-absent),
  `nonDestructive: true` (ne jamais écraser l'existant — invariant de l'onboarding).

### 3.2 Workflow (phases + gates) — **MIGRÉ depuis la Team**
Le `Workflow`/`Phase`/`Gate` **existe déjà** (`packages/core/src/workflow.ts`, livré P6) et reste **inchangé
dans sa forme**. Ce qui change : il **appartient désormais à la Méthode**, plus à la Team. `resolveWorkflow`
et son usage par les adaptateurs se **re-sourcent** depuis la Méthode (§ 6). Le **canonique** iakaframe
(`IAKAFRAME_CANONICAL_WORKFLOW`) et le rendu **byte-identique** (`renderWorkflowMarkdown`) sont **préservés
tels quels** (non-régression P6).

### 3.3 Principes — **catalogue de règles composables** (NOUVEAU type `Principle`)
Chaque principe = `{ nom · politique · déclencheur }`. Catalogue **assemblable** : la Méthode en **référence**
un sous-ensemble (par id, comme `Persona.skills`). **Liste initiale à seeder** (14) :

| id | politique (résumé) | déclencheur |
|---|---|---|
| `qualite` | version **mineure** ⇒ rapport qualité complet (typecheck + lint + tests + revue) | bump SemVer `x.Y.z` |
| `gestion-backlog` | backlog portefeuille tenu à jour | ouverture/clôture de session |
| `documentation` | régénérer l'état des lieux | changement de version · pause/reprise |
| `commits-versionnement` | commits atomiques, conventional ; jamais `reset --hard`/`push --force` | chaque étape logique achevée |
| `isolation-docker` | une stack Docker + ports hôte distincts par projet | provisioning d'un environnement |
| `self-hosted-first` | self-hosted/open-source d'abord ; cloud en fallback justifié | choix d'un backend |
| `reutilisation-existant` | réutiliser l'infra/services/MCP avant de réimplémenter | choix d'implémentation |
| `mvp-first` | MVP d'abord, puis itérer ; pas de sur-ingénierie | cadrage d'une feature |
| `identite-badges` | double badge ouverture/clôture ; position = sens ; « START/STOP » bannis | chaque prise de parole d'un agent |
| `perimetres-etanches` | chaque rôle tient son périmètre ; pas d'auto-validation | exécution d'une tâche |
| `langue` | doc/échanges en français ; code/identifiants en anglais | production de tout artefact |
| `mock-en-dev` | mocker les API coûteuses/limitées en dev (`specs/mock/`) | dev contre une API externe |
| `cadrage-avant-code` | instruction écrite avant toute tâche non triviale | début d'une tâche non triviale |
| `confirmation-actes-destructifs` | confirmer par message avant tout acte destructif hors denylist | acte destructif hors garde auto |

Attributs du type `Principle` : `id`, `label`, `policy` (texte), `trigger` (texte). **[MVP]** : données +
parseur défensif + affichage lecture. **[différé]** : édition.

### 3.4 Rituels / gestes — NOUVEAU type `Ritual` (déclencheur + actions)
Un rituel = un **geste outillé** avec **déclencheur (mots-clés)** + **actions**. Attributs :
`id`, `label`, `triggers[]` (mots-clés, ex. `["iakastart","iakaframe","odin"]`), `actions[]` (étapes),
`side` (**`forge`** = fabrication | **`cockpit`** = run). **Liste initiale + tranche forge/cockpit à graver** :

| id | déclencheur (mots-clés) | actions (résumé) | côté |
|---|---|---|---|
| `iakastart` | `iakastart` · `iakaframe` · `odin` | banner + roster des rôles, rend la team prête au dispatch (n'en spawn aucune) | **cockpit** (run) |
| `init` | `init iakaframe` · `initialise` | onboard/reprise : scaffold non destructif + dépôt Forgejo + état des lieux | **forge** (fabrication) |
| `update` | `update iakaframe` · `update` | régénère l'état des lieux + commit global + push | **cockpit** (run) |
| `snapshot` | `snapshot` · pause/reprise/version | capte les faits git → `specs/etat-des-lieux.md` (+ récit de reprise) | **cockpit** (run) |
| `log-conversation` | fin de session / archivage | consigne la conversation (mémoire humaine) | **cockpit** (run) |

> **Règle tranchée** : `init` est le **seul geste de fabrication** (il **crée** la structure d'un projet →
> **forge**). `iakastart` / `update` / `snapshot` / `log-conversation` sont des gestes de **run** (ils
> opèrent sur un projet **déjà** monté → **cockpit**). Cette ligne suit la frontière forge/cockpit (PROJET.md).

### 3.5 Gardes-fous — type `Guardrail` **existant** (référencé, pas redéfini)
Le type `Guardrail` (`packages/core/src/guardrail.ts`, livré P3/P3b) reste **inchangé** : `identity`,
`perimeter`, `delegation` (+ `permission`/`custom`). La Méthode **les référence** (comme la Team référence
`Persona.guardrails`). **⚠️ Non-régression dure** : le **canal d'identité** (`IDENTITY_PROSE_BODY` + hooks)
n'est **jamais** dénaturé par la migration (invariant § 7 du contrat).

### 3.6 Référentiel de rôles — type `Role` **existant** (les 7 canoniques)
Le référentiel `CANONICAL_ROLES` (`packages/core/src/roles.ts`) **monte dans la Méthode** comme composant :
c'est le **jeu de rôles que le casting d'une Team doit couvrir**. La Méthode **déclare** ses rôles ; la Team
**caste** des personas dessus. Agnosticisme AR-9 préservé : une autre méthode déclarerait ses propres rôles.

### 3.7 L'articulation à graver — le CONTINUUM Principe → Rituel → Garde
> **Principe = politique** (le *quoi*/*pourquoi*) · **Rituel = procédure qui l'applique** (le *comment*
> outillé) · **Garde = contrainte qui le fait respecter** (le *filet* exécuté). **Un même principe se décline
> dans les trois.**
>
> Exemple (le principe-phare `qualite`) : **politique** « version mineure ⇒ rapport qualité complet » →
> **rituel** `quality-report` (`bash scripts/quality-report.sh`) → **garde** `PreToolUse` sur le tag (refuse
> un tag mineur sans rapport joint). Le copilote de forge (§ 8) matérialise volontiers **les trois d'un coup**.

Le type `Method` porte donc des **références** vers ces catalogues (ids), pas des copies :
```ts
interface Method {
  id: string;                 // agnosticisme AR-9 — "iakaframe" au MVP
  name: string;
  scaffoldIds: string[];      // réf. Scaffold (portefeuille + projet)
  workflowId: string;         // réf. Workflow (le canonique au MVP) — MIGRÉ depuis Team
  principleIds: string[];     // réf. Principle (sous-ensemble du catalogue § 3.3)
  ritualIds: string[];        // réf. Ritual (§ 3.4)
  guardrailIds: string[];     // réf. Guardrail (§ 3.5)
  roleKeys: string[];         // réf. Role — le jeu que le casting doit couvrir (§ 3.6)
}
```

---

## 4. La strate TEAM — casting PUR, method-agnostic (décision #3)

La Team devient un **casting pur** : personas (rôle · royaume · skills · gardes · vignette), coordinateur,
vignette de team. **On SUPPRIME de la Team** :
- `Team.workflowId` → **monte dans la Méthode** (§ 3.2).
- `Team.methodId` → **disparaît de la Team** (l'appariement Méthode↔Team se fait au **Kit**, § 5).

```ts
interface Team {              // schéma cible E2
  id: string;
  name: string;
  vignetteTeam: string;       // casting visuel ("none" = pastilles)
  coordinator: string;        // id de persona (chef de projet)
  personas: Persona[];        // inchangé (§ 2.8 contrat) — déjà PUR (E1)
  connectors: string[];       // ids de connecteurs MCP
  // PLUS de methodId, PLUS de workflowId (E2)
}
```
`Persona` reste **inchangé** (déjà pur E1 : rôle · royaume · roleIndex · skills · guardrails, jamais
runner/modèle). **Conséquence produit** : une **même Team** est désormais **réutilisable sur plusieurs
méthodes** — l'agnosticisme monte d'un cran.

---

## 5. Le KIT — assemblage total & Binding structurel (décision #5)

- **Kit** = **Méthode + Team + Binding(runner suggéré)**. La forge en **propose un par défaut** (assemblage
  **total**), **livrable standalone**, **overridable au Cockpit**.
- **Binding STRUCTUREL** (nouveau) : l'appariement **quelle Méthode va avec quelle Team** (référence
  `methodId` + `teamId`). **Distinct** du **Binding runner+modèle** d'E1 (qui reste l'une des briques).
- Type cible :
```ts
interface Kit {
  id: string;
  methodId: string;           // réf. Méthode (Binding structurel)
  teamId: string;             // réf. Team    (Binding structurel)
  runnerBindingId?: string;   // réf. Binding runner+modèle E1 (suggéré, optionnel)
  node: NodeKind;             // cible de génération (claude au MVP)
}
```
- **Génération** : depuis un Kit, l'adaptateur de runner émet l'arbre complet (`.claude/agents/*` + skills +
  hooks + `CLAUDE.md` où la **méthode** vient de `Method`, plus `team.json`, plus `binding.json` si lié).
- **Livraison** : le handoff (`handoff.rs`, H1) livre **méthode + team + kit** (au lieu de la seule team) —
  additif, § 6.

---

## 6. Migrations du cœur `@iakaframe/core` — refactor cadré (décision #4)

> **Ne PAS coder ici.** On **cadre** les changements et on **borne la non-régression**. L'esprit du cœur est
> non négociable : **parseur défensif** (record invalide → `null`, jamais d'exception), **fonctions pures**,
> **déterminisme**, **zéro runner/modèle dans la Team**.

### 6.1 Nouveaux types (parseurs défensifs obligatoires)
- **`method.ts`** : type `Method` (§ 3.7) + `parseMethod`/`parseMethodText`/`serializeMethod` + un
  `IAKAFRAME_CANONICAL_METHOD` (seed) + catalogue + `methodById`. Défensif : ids inconnus filtrés ; `null` si
  inutilisable.
- **`principle.ts`** : type `Principle` (§ 3.3) + `CATALOG_PRINCIPLES` (14) + `parsePrinciple` + helpers.
- **`ritual.ts`** : type `Ritual` (§ 3.4) + `CATALOG_RITUALS` (5) + `parseRitual` + helpers.
- **`scaffold.ts`** : type `Scaffold` (§ 3.1) + seeds portefeuille/projet + `parseScaffold`.
- **`kit.ts`** : type `Kit` (§ 5) + `parseKit`/`serializeKit`.
- (`Binding` runner+modèle : type déjà cadré en E1 — l'implémenter **ici** si pas encore présent, sinon
  réutiliser.)

### 6.2 Retraits & déménagements (le cœur du refactor)
| Fichier | Changement | Points d'appel réels à traiter |
|---|---|---|
| `team.ts` | **retirer** `Team.methodId` et `Team.workflowId` ; **retirer** `resolveWorkflow` (déménage vers Method) ; retirer `DEFAULT_METHOD_ID` de Team | `team.ts:34,48,74-77,97,103-107,113-118` |
| `workflow.ts` | inchangé en forme ; devient possédé par `Method` ; `resolveWorkflow` **prend une `Method`** (plus une `Team`) | `workflow.ts:74,161,166` (garder) |
| `roster.ts` | retirer `methodId: DEFAULT_METHOD_ID` des teams seedées | `roster.ts:79,93` |
| `adapters/agentsMd.ts` | `renderWorkflowMarkdown(resolveWorkflow(team))` → **sourcer le workflow depuis la Méthode** du Kit | `agentsMd.ts:27-28,151` |
| `adapters/claudeCode.ts` | `team.methodId` (×2) et `opts.methodInstructions` → **sourcer depuis `Method`** (nom + corps de méthode) | `claudeCode.ts:115-117,121` |
| `adapters/openwebui.ts` | `buildOpenWebUIModel(persona, team.methodId)` → `methodId` vient de la **Méthode** du Kit | `openwebui.ts:120,139,157` |
| `adapters/types.ts` | `KitGenOptions.methodInstructions?` → évoluer vers un **contexte de méthode** (`method?: Method`), **rétro-compatible** (champ optionnel) | `types.ts:29-37` |

### 6.3 Signature des adaptateurs — additive & rétro-compatible
Principe (repris d'E1) : **rétro-compat par optionalité**. La génération évolue vers
`generate(team, { method?, binding? })` — **sans `method` → repli sur le canonique** (`IAKAFRAME_CANONICAL_
METHOD` / workflow canonique) : la sortie reste **byte-identique** à l'actuelle. **Avec `method`** → la
section méthode/workflow provient de l'artefact Méthode. Le **renderer d'identité/périmètre/workflow** (P6)
reste **inchangé**. `kit_deploy` **inchangé**.

### 6.4 Impact sur le code DÉJÀ LIVRÉ (à signaler pour la NON-RÉGRESSION — gate rôle tests)
| Zone livrée | Impact | Non-régression exigée |
|---|---|---|
| **P6 workflow rattaché Team** | le workflow **déménage** vers Method ; `resolveWorkflow` change de signature | `renderWorkflowMarkdown(IAKAFRAME_CANONICAL_*)` **byte-identique** (tests golden `workflow.test.ts:106-200`) |
| **Adaptateurs P3/P3b/P3c** | re-sourcing du `methodId`/workflow depuis Method | **sans `method`** fourni, l'arbre généré est **identique octet-à-octet** à l'actuel (snapshots des kits) |
| **Handoff H1 (`src-tauri/src/handoff.rs`)** | livrer méthode + kit **en plus** de `team.json` | `team.json` + `handoff.json` **inchangés** ; nouveaux fichiers **additifs** (l'`originHash` de la team ne bouge pas) |
| **`TeamsEditor` / `TeamComposer` (Cockpit + forge)** | `team.methodId` retiré de l'affichage | `TeamComposer.tsx:59` (input `team.methodId`) → **relocaliser** vers l'onglet Méthode/Kit ; `WorkflowPanel.tsx:28` (`resolveWorkflow(team)`) → résoudre via la **Méthode** |
| **Tests** | attentes sur `methodId`/`workflowId` de Team | mettre à jour `team.test.ts:40`, `roster.test.ts:36`, `workflow.test.ts:83-84` ; **ajouter** des tests « la Team ne porte plus `methodId`/`workflowId` » |

### 6.5 Amendements de specs inclus dans le lot (produits par le cadrage, pas du code)
- **`specs/contrat-concepts.md`** : réécrire § 2.1 (Méthode = concept de 1er ordre à 6 composants),
  § 2.7 (Workflow possédé par Method), § 2.8 (Team perd `methodId`/`workflowId`), § 1 + § 1.1 (4 strates :
  Méthode / Team / Binding / Kit), **ajouter** § Principe, § Rituel, § Scaffold, § Kit (assemblage).
- **`specs/glossaire-concepts.md`** : entrées **Méthode**, **Principe**, **Rituel**, **Scaffold**, **Kit
  (assemblage)** + note « Méthode ≠ Team ».
- Ces amendements sont **le préalable** au code (l'implémenteur code **contre** le contrat amendé).

---

## 7. Contrat MD par étage, LECTURE au MVP (décision #7)

- **Chaque étage** (persona, méthode, kit, et leurs sous-éléments) a un **contrat en MD** — la **surface de
  lecture**. La **structure typée du cœur reste la vérité** ; le MD est **rendu** depuis la donnée.
- **[MVP]** : **LECTURE** uniquement (pas d'édition MD brute). Les sous-éléments sont **expandables
  récursivement** (`<details>` imbriqués, cf. maquette : skill → hook, phase → gate, principe → politique/
  déclencheur, brique de kit → composants).
- **[différé]** : l'édition MD riche/brute.

---

## 8. Copilote de forge — à chaque niveau (décision #6)

- **Un copilote par niveau édité** (persona, méthode, kit) : **champ prompt** + **sélecteur de runner
  d'AUTHORING LOCAL** (build-time, « m'assiste à concevoir »).
- **⚠️ FRONTIÈRE À GRAVER (deux étages, jamais confondus)** : le **runner d'authoring** (build-time, barre
  noire du copilote) **≠** le **runner d'EXÉCUTION** du Binding E1 (run-time, cockpit). La maquette les
  sépare visuellement (barre noire « runner d'authoring » vs carte Binding « runner d'exécution »).
- **Boucle obligatoire** : **intention** → **PROPOSITION d'artefacts** (le copilote peut proposer **plusieurs
  artefacts d'un coup**, ex. 1 skill + 2 hooks ; ou 1 principe + 1 rituel + 1 garde) → **diff** →
  l'humain **VALIDE / REJETTE**. **Jamais d'écriture directe** : le décideur est au-dessus (« la forge n'écrit
  rien sans votre validation »).
- **En dev, MOCKER le LLM d'authoring** (`specs/mock/`) — principe `mock-en-dev`.
- **[MVP]** : la **coquille** de la boucle (prompt, sélecteur de runner d'authoring, zone proposition→diff→
  valider/rejeter) **avec LLM mocké** ; la matérialisation applique un **diff pré-scénarisé** (mock).
- **[différé]** : le copilote LLM **réel** (génération d'artefacts par un vrai runner d'authoring).

---

## 9. GUI cible (décision #8, réf. maquette v4-convergence)

- **Onglets** `Team · Méthode · Kit` (barre supérieure ; bouton « Livrer au Cockpit → »).
- **Rail-stock à gauche**, **accordéon par type** :
  - Team : Personas · Stock de skills · Stock de hooks/gardes.
  - Méthode : Workflow (phases + gates) · Principes · Rituels/gestes · Scaffold · Gardes-fous · Référentiel
    de rôles.
  - Kit : Méthode · Team · Binding.
  - **Clic** sur un élément = **édition/copie** ; **`+`** sur un sous-élément l'**insère dans l'élément édité**.
- **À droite** : **prompt copilote noir en haut** (+ runner d'authoring) puis **3 colonnes** —
  **MD dépliable sur 2/3** + **graphe contextuel sur 1/3** :
  - **Méthode** → **diagramme de flux** (phases → gates, délégation pointillée, boucle feedback).
  - **Team** → **aperçu du fichier généré** (fenêtre éditeur : arbre + début du `.md`).
  - **Kit** → **aperçu de l'assemblage complet livré** (arbre `.claude/agents/*`, hooks, `CLAUDE.md`,
    `team.json`, `binding.json`).
- **Vignettes + dropzone d'upload** partout (persona, méthode, kit).
- **[MVP]** : les 3 onglets, le rail accordéon, la zone d'édition, le MD lecture dépliable récursif, le graphe
  contextuel, les vignettes (affichage) + dropzone. **[différé]** : upload **persistant** réel des vignettes,
  édition riche des composants.

---

## 10. Découpage en jalons (un seul document cohérent)

- **E2a — Cœur : séparation Méthode/Team + Principes [MVP].** Types `Method`/`Principle`/`Ritual`/`Scaffold`/
  `Kit` + parseurs défensifs + seeds (dont catalogue des 14 principes) ; retrait `Team.methodId`/`workflowId` ;
  déménagement Workflow→Method ; re-sourcing des adaptateurs (additif) ; amendements de contrat/glossaire
  (§ 6.5). **Gate : non-régression byte-identique (§ 6.4) — rôle tests.**
- **E2b — GUI trois ateliers (Team/Méthode/Kit) [MVP].** Onglets + rail accordéon + zone d'édition + MD
  lecture dépliable récursif + graphe contextuel + Kit (assemblage + carte Binding) + vignettes/dropzone.
  **Gate : parité visuelle avec la maquette v4-convergence.**
- **E2c — Copilote de forge (coquille + LLM mocké) [MVP partiel].** Boucle intention→proposition→diff→
  valider/rejeter avec **mock** (`specs/mock/`) + sélecteur de runner d'authoring + garde de frontière
  authoring≠exécution. **Copilote LLM réel = [différé].**

> L'ordre est contraint : **E2a avant E2b** (le cœur avant l'UI) ; **E2c** s'appuie sur E2a/E2b.

---

## 11. Ce qui est [MVP] vs [différé] (récapitulatif)

**[MVP]**
- Types `Method` · `Principle` · `Ritual` · `Scaffold` · `Kit` (+ parseurs défensifs, seeds iakaframe).
- Catalogue des **14 principes** (données) ; **5 rituels** (avec tranche forge/cockpit) ; scaffold 2 niveaux.
- **Team purifiée** (retrait `methodId`/`workflowId`) ; **Workflow migré** dans Method.
- Adaptateurs re-sourcés, **rétro-compatibles** (sans `method` → sortie identique).
- Handoff **additif** (livre méthode + kit en plus de team) ; amendements contrat/glossaire.
- **GUI** 3 onglets + rail accordéon + MD **lecture** dépliable récursif + graphe contextuel + vignettes.
- **Kit** : assemblage total par défaut + carte Binding « défaut suggéré ».
- **Copilote** : coquille de la boucle avec **LLM mocké**.

**[différé]**
- **Copilote LLM d'authoring réel** (génération par un vrai runner).
- **Édition riche** : MD brut, corps de principe/rituel/scaffold, gardes custom, corps de skill.
- **Override cockpit** du Binding + pilotage → **instruction Cockpit dédiée** (recentrage, hérité E1 § 8).
- **Upload persistant** des vignettes (dropzone présente au MVP, persistance partielle).
- **Import multi-méthode** (adaptateur de méthode BMAD/MetaGPT/SPARC) → reste **P∞** ; seule l'agnosticisme
  du cœur (`methodId` paramétrable) est honorée.

---

## 12. Faits vérifiés sur le web (2026-07-14) + sources

- **BMAD v6** (juin 2026, ~49 k étoiles) distribue **workflows + templates** d'un côté et **définitions de
  personas** de l'autre — **corrobore** la séparation Méthode ≠ Team (décision #1). *(Ne pas importer BMAD au
  MVP — c'est le north-star P∞ ; on note la convergence architecturale.)*
- **Claude Code (2026)** : doctrine « le bon outil dans la bonne couche » (CLAUDE.md / rules / skills / hooks /
  subagents) — **valide** le continuum **Principe (politique) → Rituel (procédure) → Garde (contrainte)**
  (§ 3.7). Le **frontmatter subagent** (`name`, `description`, `model`, `hooks`, `skills`, `mcpServers`,
  `permissionMode`…) reste la surface visée par l'adaptateur — **`model` porté par le Binding**, jamais par la
  Team (invariant E1 préservé).

Sources :
- [BMAD-METHOD — dépôt officiel](https://github.com/bmad-code-org/BMAD-METHOD)
- [BMAD Method Explained (multi-agent, rôles/workflows)](https://codemyspec.com/blog/bmad-method-explained)
- [Steering Claude Code — skills, hooks, rules, subagents (Anthropic)](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)
- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)

---

## 13. Questions d'arbitrage (à confirmer par le décideur au jalon)

- **Q-1 — Trois artefacts livrés séparément ?** Reco : `method.json` + `team.json` (déjà) + `kit.json`
  (manifeste de références Méthode/Team/Binding) livrés côte à côte au handoff. → *Confirmer.*
- **Q-2 — Où vivent Principe/Rituel/Scaffold ?** Reco : **catalogues dans le cœur**, la Méthode les
  **référence par id** (cohérent avec `Persona.skills`/`guardrails`). Alternative « inline dans Method » =
  moins réutilisable. → *Trancher.*
- **Q-3 — `resolveWorkflow` prend une `Method` (plus une `Team`).** Confirme le déménagement (§ 6.2) et le
  repli canonique quand aucune méthode n'est fournie (rétro-compat adaptateurs). → *Confirmer.*
- **Q-4 — Le `methodId` retiré de la Team remonte au Kit (Binding structurel).** Reco : oui — l'appariement
  Méthode↔Team se décide **au Kit**, pas dans la Team. → *Confirmer.*
- **Q-5 — Rituels : `log-conversation` est-il [MVP] ou [différé] ?** Reco : **modélisé [MVP]** (données),
  **outillage réel différé** (pas de code de journalisation dans ce lot). → *Confirmer.*

> Tant que ce jalon n'est pas validé, **aucune** implémentation (E2a/E2b/E2c). Ce lot ne produit que du
> **cadrage** ; le code et les amendements de contrat suivent la validation.

---

## 14. Journal de décision

- **2026-07-14** — Le décideur (session) tranche la **refonte E2** : **Méthode ≠ Team**, deux artefacts
  séparés + **Kit** (assemblage total). Naissance de la strate **Méthode** (concept de 1er ordre, 6
  composants : scaffold · workflow migré · principes · rituels · gardes · rôles). Nouveau type **Principle**
  (catalogue de 14). **Team** devient un **casting pur** (retrait `methodId`/`workflowId`). Migrations du cœur
  cadrées, **additives & rétro-compatibles** (sans `method` → sortie byte-identique), avec **non-régression**
  exigée sur P6/adaptateurs/handoff/Cockpit (gate rôle tests). **Binding structurel** (Méthode↔Team) distinct
  du **Binding runner+modèle** d'E1 (brique du Kit). **Copilote de forge** à chaque niveau (LLM mocké au MVP ;
  frontière authoring≠exécution gravée). Contrat MD par étage en **lecture** ; GUI = maquette v4-convergence.
  Découpage E2a (cœur) → E2b (GUI) → E2c (copilote). Convergence état de l'art vérifiée (BMAD v6, Claude
  Code 2026). **Cadrage seul, aucun code.**
