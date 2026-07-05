# Instruction P1 — Coquille forge + authoring de teams pures (MVP)

> **Phase** : P1 — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Doc en français ; code et identifiants en anglais ; **rôles jamais désignés par un nom
> de code**.
>
> **Fondations (à relire en premier)** : `specs/PROJET.md` (version validée), `specs/contrat-concepts.md`
> (modèle formel — **§ 2.8 Team pure**, § 3.1 Persona/nommage), `specs/glossaire-concepts.md`,
> `specs/instructions/cadrage-iakaframegui-et-moteur.md` § 7 (**décisions AR-1→AR-9 tranchées**).
>
> **Sources réutilisées (lues, lecture seule)** : `IakaCockpit/src/hooks/useTeams.ts:59-86`
> (schéma `Team`/`Agent` — on reprend **moins** `runner`/`model`), `IakaCockpit/src/theme/roles.ts:22-30`
> (7 rôles canoniques), `IakaCockpit/src/mock/demoTeam.ts:40-64` (roster canonique = gabarit + skills connus),
> `IakaCockpit/CLAUDE.md` (stack, gardes D7/CSP/keychain, port dev 3020),
> `IakaCockpit/package.json` (versions), `iakaFrameGUI/global/hooks/{identity-guard,perimeter-guard}.mjs`
> (gardes existantes, réutilisées telles quelles plus tard).

---

## 1. Objectif

Livrer la **coquille de la forge** (app Tauri iakaFrameGUI qui démarre) et le **premier atelier d'authoring** :
créer/nommer/éditer des **personas**, les associer à un **rôle** + des **skills**, **assembler une team PURE**
(sans runner ni modèle — AR-1) et la **persister localement**. Poser en même temps l'**amorce du cœur TS partagé**
(les types de concepts). **Aucun déploiement, aucune génération de kit** à ce stade (AR-6).

À la fin de P1, un utilisateur peut : ouvrir l'app, partir du roster canonique comme gabarit, renommer/ajouter des
personas, composer une team, l'enregistrer, fermer et rouvrir l'app, et **retrouver sa team intacte — sans qu'aucun
runner/modèle n'ait jamais été demandé ni stocké**.

---

## 2. Périmètre — IN / OUT

### 2.1 DANS le périmètre P1

1. **Coquille Tauri (React + Rust)** (AR-7) : l'app démarre, fenêtre, **navigation minimale** (au moins :
   *Personas*, *Teams*, *Réglages*). Gardes d'architecture calquées sur le Cockpit : **façade unique** d'`invoke`
   (`src/api/backend.ts`), **CSP stricte jamais `null`**, secrets au **keychain** (aucun secret manipulé en P1),
   SQLite non sensible **seulement si nécessaire** (la persistance MVP peut être fichier — § 6).
2. **Amorce du cœur TS partagé** (AR-3) : un package TS `@iakaframe/core` (workspace local) exportant les **types
   de concepts** du contrat : `Role`, `Persona`, `Skill`, `Guardrail`, `Connector`, `Team` (**pure**), + les
   référentiels (`CANONICAL_ROLES`, roster gabarit, catalogue de skills connus) + les **parseurs défensifs**.
   **MVP = les types + la persistance**, pas la génération de kits.
3. **Modèle de données « team PURE »** (AR-1) : `Persona` (nommage **libre** — AR-5) avec `roleKey`, `royaume`,
   `roleIndex`, `skills[]`, `guardrails[]` ; `Team` avec `coordinator`, `personas[]`, `connectors[]`, `methodId`,
   `vignetteTeam`. **Aucun champ `runner`, aucun champ `model`.**
4. **Authoring UI** :
   - créer / **nommer librement** / éditer / supprimer un **persona** ; lui affecter un **rôle** (menu des 7
     canoniques), des **skills** (parmi le catalogue connu, saisie libre tolérée), et des **gardes** (liste
     d'ids, MVP = déclaration) ;
   - **assembler une team** : ajouter/retirer des personas, désigner le **coordinateur**, choisir le casting
     visuel, attacher des **connecteurs** (MVP = déclaration d'ids) ;
   - **gabarit de départ** (AR-5) : proposer le **roster canonique** (7 rôles → 7 personas nommées par défaut)
     comme point de départ d'une nouvelle team, **éditable ensuite**.
5. **Persistance locale** : enregistrer/relire les teams (format § 6). Recharge à froid **sans perte**.
6. **Isolation** (AR-7) : app id, **port dev distinct** du Cockpit, et **stack Docker/ports `iakaframegui-*`** si
   une stack est introduite (aucune collision avec IakaCockpit).

### 2.2 HORS périmètre P1 (différés — à ne PAS coder)

- **Déploiement / génération de kits** (adaptateur de runner, écriture de `.claude/`) → **P3**.
- **Multi-nœuds** (codex, ollama-localhost/lan) ; en P1 aucun nœud n'est ciblé → **P3**.
- **Adaptateur de runner concret** (Claude Code) → **P3**.
- **Workflows** (éditeur d'enchaînement) → **P3**.
- **Adaptateur de méthode** (import BMAD/MetaGPT/SPARC) → **P∞** ; en P1 on n'honore que l'**agnosticisme**
  (champ `methodId`, rôles paramétrables) — **aucun import**.
- **Éditeur riche de corps de skill / de garde custom** ; **découverte MCP dynamique** → différés.
- **Liaison runner + modèle** : **hors forge**, appartient au Cockpit (instruction Cockpit séparée).
- **CLI en sidecar** : **non branché en P1** (il servira au déploiement P3). On documente l'emplacement prévu,
  on ne l'invoque pas encore.
- **Vignettes/chartes iakagraph** : réutilisables plus tard ; en P1 un **fallback pastille `[ROYAUME][Nom]`**
  suffit (pas d'assets à embarquer).

---

## 3. Stack cible (calquée sur le Cockpit — AR-7)

| Couche | Choix | Version de référence (Cockpit) |
|---|---|---|
| Front | React + TypeScript + Vite | React `18.3.1`, TS `5.5.4`, Vite `^6` |
| Desktop | Tauri 2 / Rust | `@tauri-apps/api ^2`, `@tauri-apps/cli ^2` |
| Tests | Vitest (front) + `cargo test` (Rust) | Vitest `^4` |
| Lint/format | ESLint + `cargo fmt`/`clippy` | eslint `^9` |
| Persistance | **fichiers JSON** (MVP) ; SQLite non sensible seulement si besoin | — |
| Cœur partagé | package TS `@iakaframe/core` (workspace) | — |

- **App id** : `com.iakateam.iakaframegui` (distinct du Cockpit `com.iakateam.iakacockpit`).
- **Port dev Vite** : **`3030`** (le Cockpit occupe `3020` — **pas de collision**, mémoire iakaIDE/port).
- **CSP** : stricte, **jamais `null`** (reprendre la politique du Cockpit).

---

## 4. Arborescence cible

```
iakaFrameGUI/
├─ package.json                 # workspaces: ["packages/*"] ; scripts dev/build/test/lint/tauri
├─ packages/
│  └─ core/                     # @iakaframe/core — AMORCE DU CŒUR PARTAGÉ (AR-3)
│     ├─ package.json           # name "@iakaframe/core", type module, exports types
│     ├─ src/
│     │  ├─ roles.ts            # CANONICAL_ROLES (7) — repris de roles.ts Cockpit
│     │  ├─ persona.ts          # interface Persona (SANS runner/model) + parseur défensif
│     │  ├─ skill.ts            # interface Skill + CATALOG_SKILLS connus (gabarit)
│     │  ├─ guardrail.ts        # interface Guardrail (intention ; kind identity|perimeter|…)
│     │  ├─ connector.ts        # interface Connector (MCP ; transport stdio|http|sse|ws)
│     │  ├─ team.ts             # interface Team PURE + parseTeam/parseTeams défensifs
│     │  ├─ roster.ts           # CANONICAL_ROSTER (gabarit 7 personas — AR-5)
│     │  └─ index.ts            # ré-exports publics
│     └─ __tests__/             # vitest : parseurs défensifs, invariant "no runner/model"
├─ src/                         # FRONT de la forge (app Tauri)
│  ├─ api/backend.ts            # FAÇADE UNIQUE d'invoke (seul point d'appel Rust)
│  ├─ hooks/useForgeTeams.ts    # autorité authoring : CRUD persona/team + persistance (via façade)
│  ├─ components/
│  │  ├─ PersonaEditor.tsx      # créer/nommer/éditer un persona (rôle + skills + gardes)
│  │  ├─ TeamComposer.tsx       # assembler une team (roster, coordinateur, casting, connecteurs)
│  │  └─ RosterList.tsx         # liste/roster (fallback pastille [ROYAUME][Nom])
│  ├─ views/
│  │  ├─ PersonasView.tsx
│  │  ├─ TeamsView.tsx
│  │  └─ SettingsView.tsx
│  ├─ App.tsx                   # shell + navigation minimale (pas de god-component)
│  └─ main.tsx
├─ src-tauri/                   # BACKEND Rust (mince)
│  ├─ src/
│  │  ├─ lib.rs                 # enregistre les commandes
│  │  ├─ paths.rs               # dossier de travail de la forge (workspace) cross-OS
│  │  ├─ pathguard.rs           # anti-traversal (repris de l'esprit L0 Cockpit)
│  │  └─ teams_store.rs         # team_list / team_read / team_write / team_delete (JSON)
│  └─ tauri.conf.json           # app id, port dev 3030, CSP stricte
├─ docker/                      # SEULEMENT si une stack est nécessaire ; préfixe iakaframegui-*
├─ global/hooks/                # gardes existantes (identity-guard, perimeter-guard) — RÉUTILISÉES en P3
└─ specs/                       # docs P0 + cette instruction
```

> **Note MVP persistance** : si l'introduction de commandes Rust JSON alourdit trop le MVP, une **alternative
> acceptable** est le plugin `@tauri-apps/plugin-fs` scopé au dossier de travail. **Reco** : commandes Rust
> `teams_store` (calque du socle `config`/`pathguard` du Cockpit) — plus sûr (pathguard), testable en `cargo
> test`, et cohérent avec la **façade unique**. À trancher au § 12 (Q-2).

---

## 5. Ce qu'on RÉUTILISE (ne pas réinventer)

1. **Le schéma `Team`/`Persona` du Cockpit** (`useTeams.ts:59-86`) — **repris MOINS `runner` et `model`** (AR-1).
   Les parseurs défensifs (`parseAgent`/`parseTeam`/`parseTeams`, `useTeams.ts:127-192`) sont un **excellent
   modèle** : les porter dans `@iakaframe/core` en retirant les champs runner/model.
2. **Les 7 rôles canoniques** (`roles.ts:22-30`) — copiés dans `core/roles.ts` (source unique côté forge).
3. **Le roster canonique + skills connus** (`demoTeam.ts:40-64`) — deviennent `CANONICAL_ROSTER` (gabarit AR-5)
   et `CATALOG_SKILLS` dans `@iakaframe/core`. **En doc, on désigne par le rôle**, jamais par le nom de code ; le
   `name` d'une persona est une **donnée** librement éditable (le gabarit propose des noms par défaut).
4. **Les gardes de méthode existantes** (`global/hooks/identity-guard.mjs`, `perimeter-guard.mjs`) — **référencées**
   comme `Guardrail` d'intention `identity`/`perimeter` dans le catalogue, mais **branchées seulement en P3**
   (génération). En P1 : déclaration uniquement.
5. **La discipline d'archi du Cockpit** : façade unique, pas de god-component, CSP stricte, hooks séparés,
   socle `paths`/`pathguard` cross-OS. On **copie l'esprit**, on n'importe pas le code Rust du Cockpit.
6. **Le CLI `@naonedge/iakaframe`** : **emplacement réservé** pour le sidecar de déploiement (P3) — **non
   invoqué** en P1.

---

## 6. Modèle de données & format de persistance (fermé)

### 6.1 Types du cœur (`@iakaframe/core`) — team PURE

```ts
// roles.ts — repris de IakaCockpit/src/theme/roles.ts
export interface Role { key: string; label: string; roleIndex: number; }
export const CANONICAL_ROLES: readonly Role[]; // 7 : portefeuille…doc (ordre roleIndex 0..6)

// persona.ts — AUCUN runner, AUCUN model (AR-1)
export interface Persona {
  id: string;            // slug stable, unique dans la team
  name: string;          // NOMMAGE LIBRE (AR-5)
  roleKey: string;       // réf. Role.key
  royaume: string;       // MAJUSCULE — pastille [ROYAUME][Nom]
  roleIndex: number;     // 0..N-1
  skills: string[];      // ids de skills
  guardrails: string[];  // ids de gardes (intention ; MVP = déclaration)
}

// team.ts — Team PURE
export interface Team {
  id: string;
  name: string;
  methodId: string;      // agnosticisme (AR-9) — "iakaframe" au MVP
  vignetteTeam: string;  // casting visuel ; "none" = pastilles
  coordinator: string;   // id de persona
  personas: Persona[];
  connectors: string[];  // ids de connecteurs (MVP = déclaration)
}
```

`Skill`, `Guardrail`, `Connector` : interfaces déclaratives (cf. contrat-concepts § 2.3/2.5/2.6). En P1, `skills`,
`guardrails`, `connectors` sont des **listes d'ids** (pas d'éditeur de corps).

### 6.2 Format de fichier (persistance MVP)

- **Un fichier JSON par team** : `<workspace>/teams/<teamId>.json`, contenu = un objet `Team` sérialisé.
- **Dossier de travail (`<workspace>`)** : résolu par `paths.rs` (cross-OS, calque `IAKAFRAME_ROOT`/chapeau du
  Cockpit). Défaut : `<chapeau>/iakaframegui-workspace/` (ou app-data si pas de chapeau). **Jamais** de chemin
  Windows en dur.
- **Invariant de schéma (dur)** : le JsON d'une team **ne contient JAMAIS** de clé `runner` ni `model` (AR-1) ni
  aucun secret (AR-8/§ keychain). Un test le vérifie (§ 10, C-6).
- **Parse défensif** : un fichier illisible/partiel → team ignorée (jamais d'exception), calque
  `useTeams.ts:157-192`.

---

## 7. Comportements — front (fermés)

### 7.1 Hook `useForgeTeams` (autorité authoring)
- `teams: Team[]`, `loaded: boolean`.
- Lecture : `teamById(id)`, `coordinatorOf(team)`.
- Écriture (persiste puis met à jour l'état, via la façade) : `upsertTeam`, `removeTeam`, `upsertPersona`,
  `removePersona`, `setCoordinator`, `attachConnector`/`detachConnector`.
- **Gardes de cohérence** (calque `useTeams`) : ne pas retirer le coordinateur courant sans en désigner un autre ;
  id de persona unique ; `coordinator` invalide → repli `personas[0]`.
- **Aucune** notion de runner/modèle n'existe dans ce hook (invariant AR-1).

### 7.2 `PersonaEditor`
- Champs : **nom** (libre — AR-5), **rôle** (`<select>` `CANONICAL_ROLES` par label), **royaume** (texte,
  MAJUSCULE), **roleIndex** (dérivé du rôle par défaut, éditable), **skills** (multi — catalogue + saisie libre),
  **gardes** (multi — ids d'intention `identity`/`perimeter`/… ; MVP déclaration). **Pas** de champ runner/modèle.

### 7.3 `TeamComposer`
- Créer une team **à partir du gabarit** `CANONICAL_ROSTER` (7 personas nommées par défaut, éditables) ou vide.
- Roster : ajouter/retirer des personas, **désigner le coordinateur** (`<select>`), **casting** (`<select>` ;
  `none` par défaut au MVP), **connecteurs** (liste d'ids).
- Persistance **par action** (calque des `setChef*`/`upsert*` L11) via `useForgeTeams`.

### 7.4 `App` + navigation
- Shell minimal : rail/onglets **Personas · Teams · Réglages**. Pas de god-component ; les vues sont
  présentationnelles ; toute écriture passe par `useForgeTeams` ; tout I/O par la **façade unique**.

---

## 8. Comportements — Rust (mince)

- `teams_store.rs` : commandes `team_list()`, `team_read(id)`, `team_write(id, json)`, `team_delete(id)` — lisent/
  écrivent `<workspace>/teams/*.json`. **Validation de chemin par `pathguard`** (anti-traversal), **jamais** hors
  workspace. Sérialisation = passe-plat (le front tient le schéma via `@iakaframe/core`).
- `paths.rs` : résout `<workspace>` cross-OS (calque du socle Cockpit ; `IAKAFRAME_ROOT`/chapeau ; zéro constante
  Windows).
- `lib.rs` : enregistre les commandes ; **aucune** commande réseau, **aucun** secret, **aucun** appel runner.
- **Tests `cargo test`** : `pathguard` (traversal refusé), round-trip `team_write`→`team_read`, `team_delete`,
  workspace résolu hors constante Windows.

---

## 9. Amorce du cœur TS partagé (AR-3) — ce qui est livré / ce qui ne l'est pas

- **Livré** : le package `@iakaframe/core` avec **les types + référentiels + parseurs défensifs**, consommé par le
  front de la forge (`import { Team, Persona, CANONICAL_ROLES } from "@iakaframe/core"`). Testé en isolation.
- **Non livré (P2/P3)** : consommation par le **CLI sidecar** et par le **Cockpit** (adoption cross-dépôt =
  instruction P2 dédiée) ; **génération de kit** ; toute logique d'adaptateur. Le package est **conçu pour** être
  publié/partagé plus tard (nom scoping `@iakaframe/*`, zéro dépendance runtime, ESM), mais P1 le garde **local**.

---

## 10. Critères d'acceptation (vérifiables)

P1 est **PASS** si **tous** les points sont vérifiés :

- **C-1 — L'app build et démarre.** `npm install` puis `npm run tauri dev` ouvre la fenêtre iakaFrameGUI ;
  `npm run build` (tsc + vite) réussit ; `cargo build` (src-tauri) réussit.
- **C-2 — Navigation minimale.** Les vues **Personas**, **Teams**, **Réglages** sont accessibles.
- **C-3 — Nommage libre + rôle.** On crée un persona avec un **nom libre** (ex. un nom non canonique) et un rôle
  choisi parmi les 7 ; il apparaît dans le roster avec sa pastille `[ROYAUME][Nom]`.
- **C-4 — Gabarit de départ.** Créer une team « depuis le gabarit » produit **7 personas** (une par rôle
  canonique), **éditables** (renommables, retirables).
- **C-5 — Assemblage + persistance + recharge.** On assemble une team (personas + coordinateur), on l'enregistre,
  on **ferme et rouvre** l'app : la team est **rechargée intacte** — **sans** qu'aucun runner/modèle n'ait été
  demandé ni stocké.
- **C-6 — Invariant « team pure » (AR-1).** Le JSON persisté d'une team **ne contient AUCUNE** clé `runner` ni
  `model` (test automatisé : `grep`/assertion sur le fichier + test unité sur le type/parseur). Aucun secret dans
  le fichier.
- **C-7 — Le package `@iakaframe/core` exporte les types du contrat.** `import { Team, Persona, Role, Skill,
  Guardrail, Connector, CANONICAL_ROLES, CANONICAL_ROSTER } from "@iakaframe/core"` compile ; un test vérifie que
  `Persona` **n'a pas** de champ `runner`/`model` (test de type + parseur défensif qui **ignore** ces clés si
  présentes en entrée).
- **C-8 — Façade unique.** `grep -R "invoke(" src/` hors `src/api/backend.ts` = **0** (calque garde D7 Cockpit).
- **C-9 — CSP stricte.** `tauri.conf.json` : CSP **non `null`**, aucune origine distante ; app id
  `com.iakateam.iakaframegui`.
- **C-10 — Isolation (AR-7).** Port dev = **3030** (≠ 3020 Cockpit) ; si un dossier `docker/` est introduit, tous
  les noms de réseau/volumes/containers/ports sont préfixés **`iakaframegui-*`**, sans collision avec le Cockpit.
- **C-11 — Agnosticisme (AR-9).** Le champ `methodId` existe sur `Team` (défaut `"iakaframe"`) et la liste de
  rôles est un **référentiel paramétrable** (pas de « iakaframe » hard-wiré dans la logique de composition) —
  **aucun** import de méthode codé.
- **C-12 — Qualité.** `npm run typecheck` + `npm run lint` + `npm run test` (front) et `cargo fmt --check` +
  `cargo clippy -D warnings` + `cargo test` (Rust) **verts**.
- **C-13 — Rôles jamais en noms de code (doc/UI).** Les libellés d'UI et de doc utilisent les **rôles** ; les noms
  de code n'apparaissent **que** comme valeurs par défaut de `name` (donnée éditable), jamais comme désignation.

---

## 11. Dépendances

- **Docs P0** validées (fait) : PROJET.md, contrat-concepts.md, glossaire-concepts.md.
- **Accès lecture** au Cockpit (`useTeams.ts`, `roles.ts`, `demoTeam.ts`) pour porter le schéma — **lecture seule**,
  aucune modification du Cockpit en P1.
- **Toolchain** : Node + npm (workspaces), Rust stable + Tauri 2 CLI.
- **Aucune** dépendance réseau, **aucun** secret, **aucun** service Docker requis pour le MVP (le `docker/` est
  optionnel et différable).

---

## 12. Gate humain & questions résiduelles (avant de coder)

**Risque à valider (gate humain recommandé)** : le **choix du dossier de travail** (`<workspace>`) et du **format
de persistance** engage la suite (déploiement P3 lira ces teams). Un mauvais choix se paie plus tard. → soumettre
Q-1/Q-2 au décideur **avant** d'écrire le store.

- **Q-1 — Emplacement du workspace.** Défaut proposé : `<chapeau>/iakaframegui-workspace/teams/*.json`. Alternative :
  app-data OS. *(Reco : sous le chapeau, cohérent avec l'écosystème iaka + futur déploiement.)*
- **Q-2 — Persistance : commandes Rust JSON (pathguard) vs plugin fs vs SQLite non sensible.** *(Reco : commandes
  Rust `teams_store` + pathguard — sûr, testable, façade unique.)*
- **Q-3 — Monorepo dès P1 ?** Poser `packages/core/` en **workspace npm** maintenant (reco, AR-3) ou garder les
  types dans `src/` et extraire plus tard ? *(Reco : workspace dès P1 — c'est précisément l'amorce demandée.)*
- **Q-4 — Casting visuel.** MVP = `none`/pastilles suffit (reco) ; réutiliser les vignettes iakagraph plus tard ?
- **Q-5 — Découpage/gate.** Un seul gate en fin de P1, ou gate intermédiaire après la coquille (C-1/C-2) puis
  après l'authoring (C-3→C-7) ? *(Reco : gate unique fin P1, périmètre resserré.)*

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5
> déclenchent l'implémentation par le développeur-devops.

---

## 13. Phasage interne (guide d'implémentation — un seul livrable P1)

| Étape | Contenu | Critères couverts |
|---|---|---|
| **1. Coquille** | app Tauri, nav minimale, façade unique, CSP, app id, port 3030 | C-1, C-2, C-8, C-9, C-10 |
| **2. Cœur TS** | `@iakaframe/core` (types + référentiels + parseurs), tests | C-7, C-11 |
| **3. Store** | `paths`/`pathguard`/`teams_store` Rust + tests | C-5 (persistance), C-6 |
| **4. Authoring** | `useForgeTeams` + `PersonaEditor` + `TeamComposer` + vues | C-3, C-4, C-5, C-13 |
| **5. Qualité** | typecheck/lint/tests front + Rust, revue invariants | C-6, C-12 |

---

## 14. Journal de décision

- **2026-07-06** — Cadrage P1 (l'architecte-cadreur) : coquille forge + authoring de **teams pures** (AR-1),
  nommage **libre** (AR-5), amorce du **cœur TS** `@iakaframe/core` (AR-3), stack Tauri + isolation
  `iakaframegui-*` (AR-7), **aucun** déploiement/kit/runner (AR-6, différés P3/P∞). Schéma repris du Cockpit
  **moins** runner/model. Gate humain sur le format de persistance (Q-1/Q-2) avant code.
