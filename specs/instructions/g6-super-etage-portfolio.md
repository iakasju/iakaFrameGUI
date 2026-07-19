# Instruction — G6 : le SUPER-ÉTAGE (entité conteneur « Frame » de 1er ordre)

> Cadrée par **Gandalf** (P1 — Cadrage), read-only sur le code. LOT 2 de « Open frame ».
> Contexte : le socle G1→G5 est **livré et gaté PASS (v0.3.3)**. G6 **s'articule** avec ce
> socle — il ne le duplique pas : il **promeut** l'inventaire de lecture (`src/forge/frame.ts`)
> en **entité de 1er ordre** dans `@iakaframe/core`, enrichie de l'assemblage résolu et de la
> **facette portefeuille** (l'étage Odin).
>
> Réf. amont : `iakaframe/specs/instructions/open-frame-gui-stefframe2.md` — §2.3 (portefeuille
> éclaté), §3 É5 (absence du super-étage), §4.1 **G6**, §7 critère **F**.

---

## 0. Vérification externe (règle Gandalf) — pourquoi aucune

Le cadrage Gandalf s'appuie sur le web **dès qu'une décision dépend d'un fait externe** (version,
compatibilité, état de l'art d'une lib). **Aucune décision de G6 n'en dépend** : G6 **n'ajoute
aucune dépendance**, il réutilise `@iakaframe/core` (ESM, zéro dépendance runtime) et le socle
déjà livré/gaté sur la toolchain **déjà épinglée** (TypeScript + vitest). Le travail est une
**modélisation interne** (aggregate/conteneur au-dessus de Method/Team/Binding). Une recherche
web serait sans objet ici. Absence de vérification externe = **choix motivé**, pas un oubli.

---

## 1. Besoin (reformulé)

Après « Open frame », le frame ne doit plus être un **inventaire flottant** (11 comptes + verdict
d'intégrité, socle G3/G4) mais **UN conteneur de 1er ordre** — l'étage **portefeuille/Odin** qui
manquait (§3 É5) — qui, en un seul objet, expose :
1. l'**inventaire des 11 types** avec leurs comptes ;
2. l'**assemblage résolu** du frame : method + team + binding ;
3. la **facette portefeuille** : le scaffold de niveau `portfolio`, la persona du rôle
   `portefeuille` (« Odin » par défaut), et le backlog transverse (`BACKLOG.md`) — les **trois
   formes aujourd'hui éclatées** (§2.3) rassemblées dans un **foyer unique** ;
4. l'**intégrité référentielle** exécutée **dans son propre périmètre**.

**Read-only au MVP** : on **charge / affiche**. L'édition de cet étage est différée (cohérent E2).

---

## 2. Faits établis (lecture réelle du code)

### 2.1 Le socle livré (`src/forge/frame.ts`) — inventaire de lecture, PAS une entité cœur
Le module `src/forge/frame.ts` (G3/G4/G5) porte déjà, **côté forge** :
- la taxonomie des **11 types** : `POOL_FRAME_TYPES` (8), `COLLECTION_FRAME_TYPES` (3),
  `FRAME_TYPES`, avec `PoolFrameType`/`CollectionFrameType`/`FrameType` — mais `POOL_FRAME_TYPES`
  est **contraint au backend** (`satisfies readonly PoolType[]`, couplage à `../api/backend`) ;
- l'**intégrité** : `FrameMissingRef`, `FrameIntegrityReport`, `checkFrameRefs(...)` (pur, miroir
  en mémoire de `refs.ts`/`checkRefs`) ;
- l'**assemblage brut** : `FrameRaw` (mds bruts), `buildFrameInventory(raw)` (**pur**, sans I/O),
  `FrameInventory` (root + counts + poolIds + integrity) ;
- le schéma binding SF2 : `FrameBinding` (`{ id, methodId, teamId, personaIds }`) +
  `parseFrameBinding(md)` (via `parseBinding`/`parseFrontmatter` du cœur) ;
- l'**I/O** : `loadFrame(api)` — appelle **uniquement** `api.iakaframeHome()`,
  `api.poolReadAll(type)` (G1) et `api.libraryList(collection)` (G2).
- son en-tête déclare explicitement : *« PAS d'entité Portfolio/Frame de 1er ordre (G6/LOT 2
  séparé) »*. **G6 lève exactement ce report.**

> **Conséquence** : la matière de l'entité **existe déjà** (comptes, poolIds, intégrité). G6
> **n'invente rien** — il **déplace la partie pure dans le cœur**, l'**enrichit** de l'assemblage
> résolu + de la facette portefeuille, et laisse la forge sur son **seul** rôle : l'I/O + l'UI.

### 2.2 Le style du cœur (à respecter à la lettre)
Chaque entité de `@iakaframe/core` = **type pur + parseur défensif** (`parseScaffold`,
`parseMethod`, `parseBinding`, `parsePersona`…) qui **ne jette JAMAIS** : record invalide →
`null` ; champ illisible → repli sûr ; tableau de refs filtré en `string[]`. G6 **calque** ce
contrat.

### 2.3 La matière de la facette portefeuille est déjà présente et détectable sans I/O neuf
- **Scaffold portfolio** : `parseScaffold(data)?.level === "portfolio"` (`scaffold.ts:115`) —
  détectable en parsant chaque `md` du pool `scaffolds` (déjà lu par G1, présent dans
  `FrameRaw.pools.scaffolds`). `PORTFOLIO_SCAFFOLD` (`scaffold.ts:36`) porte l'entrée canonique
  `BACKLOG.md`.
- **Persona portefeuille** : `parsePersona(data)?.roleKey === "portefeuille"` (rôle **canonique**,
  `roles.ts:27`) — détectable en parsant les `md` du pool `personas`. Le nom « Odin » est un
  **défaut éditable** (`roster.ts:17`) : on identifie par **rôle**, jamais par le nom en dur.
- **Backlog transverse** : entrée `BACKLOG.md` de `PORTFOLIO_SCAFFOLD` — **valeur dérivée**, pas
  un I/O.

> **Donc** : la facette est **entièrement dérivable** de ce que le socle charge déjà. **Aucun
> nouvel I/O backend** — confirmation directe de §4.1 G6 (« assemblé côté front à partir des
> lectures existantes, aucun nouvel I/O backend au-delà de G1/G2 »).

---

## 3. Décision de NOMMAGE — **`Frame`** (l'entité) + facette **`portfolio`**

**Un seul nom, appliqué partout : l'entité de 1er ordre s'appelle `Frame`.** La facette
portefeuille est un **champ** `portfolio` de cette entité (elle **n'est pas** l'entité).

### Pourquoi `Frame` plutôt que `Portfolio`
| Critère | `Frame` (retenu) | `Portfolio` (écarté comme nom d'entité) |
|---|---|---|
| Cohérence avec le socle déjà livré | ✅ `frame.ts`, `FrameInventory`, `FRAME_TYPES`, `buildFrameInventory`, `checkFrameRefs`, action **« Open frame »** — tout est déjà « frame » | ❌ imposerait un **second** vocabulaire concurrent au socle gaté v0.3.3 |
| Collision de sens | ✅ « frame » = le **bundle ouvert comme un tout** (StefFrame2) ; aucun homonyme dans le cœur | ❌ « portfolio » est **déjà pris** par un sens précis et plus étroit : `ScaffoldLevel "portfolio"` + `PORTFOLIO_SCAFFOLD`. Nommer l'entité `Portfolio` **surchargerait** le mot (niveau de scaffold **vs** contehneur entier) |
| Fidélité au modèle iakaframe | ✅ §2.3/§4.2 amont : *« le frame lui-même EST le portefeuille (sa racine = le chapeau) »* → frame ≡ bundle de niveau portefeuille | — |
| Migration & churn | ✅ le socle **devient** le producteur d'un `Frame` cœur — continuité maximale | ❌ renommage transverse d'un socle fraîchement gaté |

**Résolution du `/` de l'énoncé (`parsePortfolio`/`parseFrame`)** : le nom retenu étant `Frame`,
le parseur cœur est **`parseFrame`** (et `buildFrame` pour l'assemblage). Le mot « portfolio »
**reste** réservé à son sens existant : le **niveau de scaffold** et la **facette** `Frame.portfolio`.

> **Le fichier de cette instruction garde `g6-super-etage-portfolio.md`** (nom imposé par
> l'amont, continuité avec §4.1/É5) ; l'**entité**, elle, est `Frame`.

**→ Point à ratifier au gate (P-1).** Gandalf **recommande** `Frame` ; l'alternative `Portfolio`
reste ouverte au décideur, au prix du renommage transverse du socle ci-dessus.

---

## 4. Emplacement & rapport au socle — `@iakaframe/core` maître, forge = I/O

**Principe (§4.1 G6)** : l'entité est de **1er ordre** → elle vit dans `packages/core/src/frame.ts`.
Le socle `src/forge/frame.ts` **s'y adosse** : il lit (I/O) puis **assemble l'entité via le cœur**.
Objectif transverse : **zéro doublon de types**.

### 4.1 Ce qui MIGRE vers `packages/core/src/frame.ts` (pur, zéro I/O)
1. **La taxonomie des 11 types** — `POOL_FRAME_TYPES` (8), `COLLECTION_FRAME_TYPES` (3),
   `FRAME_TYPES` + types dérivés — **découplée du backend** : en cœur, ce sont des littéraux
   `const` autonomes (le cœur **ne dépend pas** de `../api/backend`). La **compatibilité** avec
   l'enum `PoolType` du backend est **ré-assertée côté forge** (cf. 4.2).
2. **L'intégrité** — `FrameMissingRef`, `FrameIntegrityReport`, `checkFrameRefs(...)`. Le cœur en
   devient l'unique source ; l'intégrité s'exécute **dans le périmètre du `Frame`** (appelée par
   `buildFrame`).
3. **L'assemblage** — `FrameRaw` (DTO d'entrée pur), et `buildFrameInventory` **promu** en
   **`buildFrame(raw): Frame`** (enrichi : + assemblage résolu + facette portefeuille).
4. **Le binding SF2** — `FrameBinding` + `parseFrameBinding(md)` (déjà purs ; ils n'utilisent que
   `parseBinding`/`parseFrontmatter` du cœur). Documenté comme **distinct** du `Binding` E1 du cœur
   (schéma `assignments`, pas `bindings[]`).
5. **La nouvelle entité** — type `Frame`, `FrameAssembly`, `FramePortfolioFacet`, + `parseFrame`,
   exportés par `packages/core/src/index.ts`.

### 4.2 Ce qui RESTE dans `src/forge/frame.ts` (I/O + couplage backend)
- **`loadFrame(api)`** — les lectures asynchrones (`iakaframeHome`/`poolReadAll`/`libraryList`),
  puis **délègue** à `buildFrame` du cœur. **Inchangé fonctionnellement** (mêmes 3 I/O).
- **La compatibilité `PoolType`** — une assertion `satisfies readonly PoolType[]` (ou re-export
  typé) qui garantit que les 8 pools du cœur **correspondent** à l'enum backend. C'est le **seul**
  point où frame ↔ backend se touchent.
- **Re-exports de continuité** — `src/forge/frame.ts` **ré-exporte** `Frame`, `buildFrame`,
  `checkFrameRefs`, `FRAME_TYPES`, etc. depuis le cœur, pour que les imports existants
  (`OpenFramePanel`, `frame.test.ts`) **continuent de résoudre** avec un churn minimal.

### 4.3 Ce qui RESTE côté UI (`src/components/OpenFramePanel.tsx`)
Le **rendu** (déjà là) + un **ajout minimal** : afficher la facette portefeuille + l'assemblage
résolu (cf. §7). Read-only.

> **Anti-doublon (garantie)** : `FrameInventory` **n'est pas dupliqué** — il est **promu** en
> `Frame` (le `Frame` **subsume** `FrameInventory` : mêmes `root`/`counts`/`poolIds`/`integrity`,
> **plus** `assembly` et `portfolio`). Une **seule** définition de chaque type/fonction, dans le
> cœur ; la forge n'en garde **aucune copie**, seulement des re-exports.

---

## 5. Schéma de l'entité (contrat des champs)

```ts
// packages/core/src/frame.ts

/** L'assemblage résolu d'un frame (mono-méthode / mono-team au MVP, §2.3 amont). */
export interface FrameAssembly {
  /** Le binding, pivot de l'appariement (schéma SF2 `assignments`). `null` si aucun. */
  binding: FrameBinding | null;
  /** La méthode résolue depuis `binding.methodId` (repli : 1re méthode chargée). `null` si aucune. */
  method: MethodMd | null;
  /** La team résolue depuis `binding.teamId` (repli : 1re team chargée). `null` si aucune. */
  team: TeamMd | null;
}

/** La facette PORTEFEUILLE (l'étage Odin) — dérivée, jamais un nouvel I/O. */
export interface FramePortfolioFacet {
  /** Id du scaffold de niveau `portfolio` présent dans le frame (par `level`), sinon `null`. */
  scaffoldId: string | null;
  /** Id de la persona du rôle `portefeuille` (« Odin » par défaut, détectée par RÔLE), sinon `null`. */
  personaId: string | null;
  /** Backlog transverse : entrée `BACKLOG.md` (dérivée de `PORTFOLIO_SCAFFOLD`), sinon `null`. */
  backlog: string | null;
}

/** Le **Frame** : conteneur de 1er ordre au-dessus de Method/Team/Binding (G6). */
export interface Frame {
  /** Racine résolue (`IAKAFRAME_HOME`), ou `null`. */
  root: string | null;
  /** Inventaire des 11 types (les 11 clés toujours présentes) — critère A. */
  counts: Record<FrameType, number>;
  /** Ids scannés par pool (servent l'intégrité ET la détection de facette). */
  poolIds: Record<PoolFrameType, string[]>;
  /** L'assemblage résolu (method + team + binding). */
  assembly: FrameAssembly;
  /** La facette portefeuille (scaffold portfolio + persona odin + backlog). */
  portfolio: FramePortfolioFacet;
  /** Intégrité référentielle exécutée DANS le périmètre de ce frame — critère B. */
  integrity: FrameIntegrityReport;
}
```

**Détection défensive de la facette** (dans `buildFrame`, à partir des `md` déjà chargés) :
- `portfolio.scaffoldId` = premier `md` du pool `scaffolds` dont `parseScaffold(...)?.level ===
  "portfolio"` → son `.id` ; sinon `null`.
- `portfolio.personaId` = premier `md` du pool `personas` dont `parsePersona(...)?.roleKey ===
  "portefeuille"` → son `.id` ; sinon `null`. **Par rôle, jamais par le nom « odin ».**
- `portfolio.backlog` = `"BACKLOG.md"` (entrée `PORTFOLIO_SCAFFOLD`) **si** `scaffoldId !== null`,
  sinon `null`.
- `assembly.binding` = 1er binding parsé ; `assembly.method`/`team` = résolus par
  `binding.methodId`/`teamId` dans les méthodes/teams chargées (repli sur la 1re de chaque).

---

## 6. Parseurs défensifs — contrat (jamais d'exception)

Deux fonctions, deux rôles, **toutes deux défensives** (esprit cœur) :

### 6.1 `buildFrame(raw: FrameRaw): Frame` — l'assemblage (pur)
Promotion de `buildFrameInventory`. **Ne jette jamais** ; **ne renvoie jamais `null`** : dégrade
proprement (pool illisible → ignoré ; méthode/team/binding illisible → filtré ; facette
non trouvée → champs `null` ; `integrity.ok` reste calculable). Reprend **à l'identique** le
comptage (G5 : `workflows` compté **une fois**) et l'intégrité (`checkFrameRefs`) du socle — donc
**non-régression** des tests socle existants.

### 6.2 `parseFrame(raw: unknown): Frame | null` — la garde défensive de symétrie
Calque **exactement** le contrat des `parse*` du cœur (`parseScaffold`/`parseMethod`) :
- `raw` non-objet / `null` / forme inexploitable → **`null`** (jamais d'exception) ;
- sinon, coercition défensive des champs vers un `Frame` sûr (comptes manquants → `0` ; facette
  absente → `null` ; intégrité absente → `{ ok: true, missing: [] }`).

> **Pourquoi les deux** : `buildFrame` sert le flux « Open » (assemblage depuis les mds) ;
> `parseFrame` est la **garde défensive** exigée par le critère **F** (« record invalide → `null`,
> jamais d'exception ») et par la symétrie du cœur. Au MVP le `Frame` **n'est pas persisté**
> (read-only, pas de `frame.json` — §4.2 amont) : `parseFrame` reste **minimal** (garde + coercition),
> pas un désérialiseur lourd. **→ Point à ratifier au gate (P-3).**

---

## 7. Raccord UI minimal (`OpenFramePanel.tsx`) — la cible d'Open frame

G3/OpenFramePanel charge désormais **dans ce conteneur** (plus un inventaire flottant). Le
`loadFrame` retourne un `Frame` (au lieu de `FrameInventory`). **Ajout minimal, read-only**, sous
la table des comptes + la ligne d'intégrité déjà présentes :

1. **Bloc « Portefeuille (étage Odin) »** : trois lignes libellées
   - « Scaffold portefeuille : » `{frame.portfolio.scaffoldId ?? "—"}`
   - « Persona portefeuille (Odin) : » `{frame.portfolio.personaId ?? "—"}`
   - « Backlog transverse : » `{frame.portfolio.backlog ?? "—"}`
2. **Ligne « Assemblage résolu »** : « Méthode `{assembly.method?.id}` · Team `{assembly.team?.id}`
   · Binding `{assembly.binding?.id}` » (chaque valeur repli `—`).

Aucun contrôle d'édition (E2 différé). Aucun nouvel appel backend. Le reste du panneau (comptes,
intégrité) est inchangé.

---

## 8. Périmètre — DANS / HORS

**DANS**
- Entité `Frame` de 1er ordre dans `@iakaframe/core` (schéma §5) + `buildFrame` + `parseFrame` +
  `FrameAssembly` + `FramePortfolioFacet` (+ export `index.ts`).
- Migration depuis `src/forge/frame.ts` (taxonomie, intégrité, assemblage, binding SF2) — §4.1.
- Forge `loadFrame` **adossé** au cœur (I/O only) + re-exports de continuité — §4.2.
- Raccord UI minimal (facette + assemblage) — §7.
- Tests cœur + non-régression socle + test UI facette — §9.

**HORS**
- **Édition** de l'étage portefeuille ou des atomes (E2 **différé** au MVP).
- **Tout nouvel I/O backend** : aucune commande Tauri ajoutée ; G1/G2 suffisent (confirmé §2.1/§2.3).
- **Manifeste `frame.json`** : aucun (§4.2 amont — sur-ingénierie).
- **Multi-méthode / multi-team** au-delà du triple résolu singulier (mono-frame MVP, §2.3 amont).
- **Persistance** du `Frame` (read-only ; pas de sérialiseur d'écriture).
- Toute modification de StefFrame2 (aucune requise).

---

## 9. Critères d'acceptation VÉRIFIABLES

> Fixtures : réutiliser le **pattern SF2** de `src/forge/frame.test.ts` (frontmatter `.md`
> référentiellement cohérent). Tests cœur dans `packages/core/__tests__/frame.test.ts` (convention
> du cœur) ; non-régression socle dans `src/forge/frame.test.ts` ; test UI dans le dossier des
> composants.

- **AC-1 — Entité de 1er ordre.** `@iakaframe/core` **exporte** `Frame`, `FrameAssembly`,
  `FramePortfolioFacet`, `buildFrame`, `parseFrame`, `checkFrameRefs`, `FrameIntegrityReport`,
  `FrameMissingRef`, `FRAME_TYPES` (vérifié par import + `index.ts`).
- **AC-2 — Inventaire des 11 (critère A).** `buildFrame(fixtureSF2).counts` a **11 clés** =
  `FRAME_TYPES`, aux comptes SF2 (personas 8, roles 8, principles 16, rituals 5, guardrails 3,
  scaffolds 2, workflows 1, skills 17, teams 1, methods 1, bindings 1). `workflows` compté **une
  fois** (G5).
- **AC-3 — Facette portefeuille.** `buildFrame(fixtureSF2).portfolio` =
  `{ scaffoldId: <scaffold level:portfolio>, personaId: <persona roleKey:portefeuille>,
  backlog: "BACKLOG.md" }`. Détection **par level / par rôle** — un test prouve qu'un persona
  renommé (nom ≠ « odin ») mais de rôle `portefeuille` est **quand même** identifié ; un frame
  **sans** scaffold `portfolio` → `scaffoldId: null` et `backlog: null` (jamais d'exception).
- **AC-4 — Assemblage résolu.** `buildFrame(fixtureSF2).assembly` =
  `{ method.id: "iakaframe", team.id: "iakaframe-8", binding.id: "iakaframe-claude-default" }`,
  method/team **résolus** via `binding.methodId`/`teamId`.
- **AC-5 — Intégrité dans le périmètre (critère B).** `.integrity.ok === true` sur le fixture
  cohérent ; retrait d'un principe du pool → `.integrity.ok === false` avec l'entrée manquante
  `{ source:"method:iakaframe", field:"principleIds", id:"qualite" }` (comportement `checkFrameRefs`
  **préservé** — non-régression socle).
- **AC-6 — `parseFrame` défensif.** `parseFrame(null)`, `parseFrame(42)`, `parseFrame("x")`,
  `parseFrame([])`, `parseFrame({})` → **tous `null`**, **jamais d'exception**. `parseFrame` d'un
  record plausible → un `Frame` aux 11 clés de `counts`.
- **AC-7 — Zéro nouvel I/O backend.** Le test backend socle **reste vert** : `loadFrame` n'appelle
  **que** `iakaframeHome`/`poolReadAll`/`libraryList` (`libraryListCalls == ["bindings","methods",
  "teams"]`). **Aucune** commande Tauri ajoutée (revue `library_store.rs` inchangée).
- **AC-8 — Zéro doublon de types.** `FrameInventory` **n'existe plus en double** : promu en `Frame`
  (source unique cœur) ; `checkFrameRefs`/`FRAME_TYPES`/`FrameIntegrityReport` définis **une seule
  fois** (cœur), la forge ne fait que **re-exporter**. Vérifié par recherche (une seule déclaration).
- **AC-9 — Raccord UI (read-only).** Après « Open », `OpenFramePanel` affiche la facette
  (scaffold portefeuille, persona Odin, backlog) **et** l'assemblage résolu (method/team/binding),
  en plus des comptes + intégrité. **Aucun** contrôle d'édition. (Test composant : les libellés +
  valeurs de facette apparaissent.)
- **AC-F — Critère F d'origine (consolidation).** Après « Open frame », le frame est **UN
  conteneur `Frame`** qui : expose l'inventaire des 11 (AC-2) ; **identifie explicitement** le
  scaffold `portfolio`, la persona `odin` (rôle `portefeuille`) et lie l'assemblage résolu
  method+team+binding (AC-3+AC-4) ; exécute l'intégrité **dans son périmètre** (AC-5). Test cœur
  `parseFrame` défensif : record invalide → `null` sans exception (AC-6) ; `Frame` construit depuis
  le fixture SF2 porte les **11 comptes** (AC-2).

---

## 10. Points restant à trancher au gate (décideur)

| # | Point | Reco Gandalf | Alternative / coût |
|---|---|---|---|
| **P-1** | **Nom de l'entité** | **`Frame`** (cohérence socle, pas de collision avec `ScaffoldLevel "portfolio"`) | `Portfolio` → renommage transverse d'un socle gaté v0.3.3 + surcharge du mot « portfolio » |
| **P-2** | **Portée de migration** | **Promouvoir** `FrameInventory`→`Frame` dans le cœur ; forge = I/O + re-exports (zéro doublon) | *Wrapper* (garder `FrameInventory` en forge, `Frame` autour) → risque de **deux types** proches |
| **P-3** | **`parseFrame(unknown)`** | **Garder** la garde défensive minimale (exigée par F + symétrie cœur) | La retirer si l'on juge YAGNI (frame non persisté au MVP) → **mais** casse le critère F tel qu'énoncé |
| **P-4** | **Facette `backlog`** | Dérivée `"BACKLOG.md"` du `PORTFOLIO_SCAFFOLD` quand un scaffold `portfolio` est présent ; `null` sinon | Toujours `"BACKLOG.md"` (constante) → moins fidèle à la présence réelle |

Aucun point **bloquant** : ce sont des choix de design **assumés par Gandalf**, modifiables au jalon.

---

## 11. Jalon (gate humain)

```
      _    _    _     ___  _   _
     | |  / \  | |   / _ \| \ | |
  _  | | / _ \ | |  | | | |  \| |
 | |_| |/ ___ \| |__| |_| | |\  |
  \___//_/   \_\_____\___/|_| \_|
```

| Émetteur | Contenu | Récepteur |
|---|---|---|
| 🔵 Gandalf (Cadrage, P1) | Instruction `g6-super-etage-portfolio.md` : décision de nommage (**`Frame`**), promotion du socle en entité cœur (migration §4), schéma de l'entité (§5), parseurs défensifs (§6), raccord UI minimal (§7), critères d'acceptation dont **F** (§9), points à trancher P-1→P-4 (§10) | 🟢 Le décideur (Stéphane) → valide → implémentation **G6** (Gimli) |

**Fichiers à vérifier avant validation** (chemin:ligne) :
- Socle à promouvoir : `src/forge/frame.ts:36` (`POOL_FRAME_TYPES` + `satisfies PoolType[]`), `:76`
  (`FrameInventory`), `:98` (`FrameBinding`), `:175` (`checkFrameRefs`), `:228`
  (`buildFrameInventory`), `:266` (`loadFrame` = 3 I/O).
- Style cœur à calquer : `packages/core/src/scaffold.ts:109` (`parseScaffold`, `level` portfolio),
  `:36` (`PORTFOLIO_SCAFFOLD` / `BACKLOG.md`), `packages/core/src/method.ts:137` (`parseMethod`
  défensif), `packages/core/src/binding.ts:126` (`parseBinding`), `packages/core/src/roster.ts:16`
  (rôle `portefeuille` → « Odin »), `packages/core/src/roles.ts:27` (rôle canonique `portefeuille`),
  `packages/core/src/index.ts:34` (point d'export).
- UI à raccorder : `src/components/OpenFramePanel.tsx:36` (props/rendu), `:107` (table des comptes),
  `:126` (ligne d'intégrité).
- Tests de référence : `src/forge/frame.test.ts` (fixtures SF2 + non-régression),
  `packages/core/__tests__/scaffold.test.ts` (gabarit de test cœur).

**Points ouverts** : P-1→P-4 (§10) — non bloquants.

---

## Statut

**PROPOSÉ — en attente de validation décideur.** À « JALON VALIDÉ » → implémentation **G6** (Gimli) :
entité `Frame` dans `@iakaframe/core` (promotion du socle + assemblage résolu + facette
portefeuille), forge `loadFrame` adossé (I/O only), raccord UI minimal, contre les critères §9
(dont **F**). Aucune modification de StefFrame2, aucun nouvel I/O backend.
