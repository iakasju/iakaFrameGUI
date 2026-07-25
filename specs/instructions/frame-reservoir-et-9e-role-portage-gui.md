# Instruction — Portage GUI du **réservoir de frames** (AR-1/AR-2) et du **9ᵉ rôle `frame`** (Fëanor)

> **Cadrage RÉTRO-PORTÉ, versé le 2026-07-25** (🟡 Odin, à la reprise). Il ne précède pas le code :
> il **régularise** sept commits mergés sur `main` les 24–25/07 **sans instruction locale**, le
> cadrage n'existant que dans le dépôt canon. Le dire est le point : une instruction rétro-portée
> vaut comme mémoire et comme contrat pour la suite, **jamais** comme preuve qu'on a cadré avant.
>
> **Sources canon** (autoritaires, non recopiées ici — s'y référer pour le « pourquoi ») :
> - `iakaframe/specs/instructions/reservoir-de-frames.md` (Gandalf, P1, 2026-07-24) — § 5.2 = volet GUI
> - `iakaframe/specs/instructions/role-frame-builder.md` (Gandalf, P1, 2026-07-23, amendé le 24) — § 5.2 = volet GUI
>
> **Doctrine non négociable : GUI ← frame.** Le canon `iakaframe` est autoritaire ; le miroir GUI
> le reflète, jamais l'inverse. Aucune déformation du canon pour arranger le GUI.
>
> **Tous les constats de ce fichier ont été mesurés sur le disque le 2026-07-25**, sur `main`
> `560d642`, arbre propre — `preuve-avant-declaration`. Citations par nom de symbole.

---

## 0. Pourquoi ce fichier existe

Sept commits ont livré côté GUI le portage de deux cadrages canon, sans qu'aucune instruction ne
soit versée dans `specs/instructions/` :

| Commit | Livraison |
|---|---|
| `b782e19` | type `frames` de 1re classe (AR-1) + `resolveAssembly` mono→multi |
| `3b2b14c` | renommage `reservoir` → `element-pool` (AR-2, A13) |
| `49dc84c` | collection `frames` chargée (backend + allow-list Rust), comptes 11→12 |
| `96accf1` | merge du réservoir de frames côté GUI |
| `453cd29` | 9ᵉ rôle `frame` (Constructeur de frame) + 9ᵉ dégradé de casting |
| `98a6259` | vendorage `feanor` + comptes 8→9 |
| `c88e8bf` | merge du support de Fëanor + vignette flamme |

C'était le **seul endroit où la méthode était enfreinte** au 2026-07-25 (cf. `CLAUDE.md` § Avant
toute tâche non triviale : *lire l'instruction correspondante ; si elle n'existe pas → le signaler*).
Ce fichier ferme l'écart et **borne ce qui reste**.

---

## 1. Ce qui est LIVRÉ — entrée canon ↔ preuve mesurée

### 1.1 Réservoir de frames (`reservoir-de-frames.md` § 5.2)

| # canon | Attendu | État mesuré le 2026-07-25 |
|---|---|---|
| 14 | `FRAME_TYPES` 11→12 (+`frames`), `FRAME_TYPE_LABELS` gagne la clé | ✅ `frame.ts` : `POOL_FRAME_TYPES` (8) + `COLLECTION_FRAME_TYPES = ["teams","methods","bindings","frames"]` (4) — commentaire « Les 12 types d'un frame » |
| 15 | `resolveAssembly` : pivot `bindings[0]` → frame active parmi N | ✅ mono→multi livré (`b782e19`) |
| 16 | `reservoir.ts` → `element-pool.ts` + renommage des symboles | ✅ **achevé le 2026-07-25** (partiel au versement de cette instruction) — voir § 2.2 |
| 18 | `library_store.rs` : +1 type `frames` dans l'allow-list de lecture | ✅ (`49dc84c`) |
| 19 | Sélecteur de **frame active** + pointeur projet/portefeuille | ❌ **non livré** — voir § 2.1 |
| 20 | Comptes de types (12), fixtures, tests renommés | ✅ |

### 1.2 Neuvième rôle `frame` / Fëanor (`role-frame-builder.md` § 5.2)

| # canon | Attendu | État mesuré le 2026-07-25 |
|---|---|---|
| 19 | `CANONICAL_ROLES` +1 (`key: "frame"`, `roleIndex: 8`) | ✅ `roles.ts` : `{ key: "frame", label: "Constructeur de frame", roleIndex: 8 }` |
| 21 | `CASTING_GRADIENTS` : 9ᵉ couple | ✅ `casting.ts` : `["#c2410c", "#7c2d12"] // 8 frame — flamme/braise (Fëanor)` |
| 22 | `roster.ts` : `DEFAULT_NAMES`/`DEFAULT_SKILLS` | ✅ `frame: "Fëanor"` |
| 23/24/26 | Comptes, gardes, fixtures vendorées | ✅ (`98a6259`, comptes 8→9) |
| 27/28 | `library_store.rs`, `refs.ts` | — rien à faire (déjà conforme) |

**Gate mesuré à la reprise** — `npm run lint:all` → exit `0`, aucune sortie ;
`npm run test:all` → exit `0`, `Test Files 56 passed (56) / Tests 518 passed (518)`.
`cargo test` **non mesuré** (hors `test:all` par conception).

---

## 2. Ce qui RESTE OUVERT — mesuré, borné

### 2.1 Entrée 19 — le sélecteur de frame active n'existe pas

**Mesure** : `grep -rn "iakaframeactive\|frameActive\|activeFrame"` sur `src/`, `packages/core/src/`
et `src-tauri/src/` rend **zéro occurrence**.

Le cœur sait désormais résoudre **N** assemblages (`resolveAssembly` multi, entrée 15), mais **rien
dans la forge ne permet de choisir lequel est actif** : la capacité est dans le moteur, absente de
l'interface. Le canon l'avait explicitement autorisé — *« MVP = affichage + sélection ; l'écriture
peut être différée au lot bascule »* — donc **ce n'est pas un défaut, c'est un lot non commencé**.

**Reste à faire (lot suivant, à cadrer par 🔵 Gandalf avant tout code)** :
- lecture du pointeur de frame active (projet, avec fallback portefeuille) ;
- affichage + sélection dans la forge (`SettingsRoot.tsx` / `ForgeShell.tsx` / panneau frame) ;
- l'**écriture** du pointeur reste différable au lot bascule.

⚠️ Dépendance amont : le pointeur est une **source unique lisible par le CLI ET par la GUI**
(`reservoir-de-frames.md` § 5 : *« à condition que la valeur soit lisible par le CLI ET par la
GUI »*). Le poser côté GUI seul fabriquerait une divergence GUI≠CLI — **exactement** la classe de
défaut qu'aucune garde ne détecte, déjà rencontrée sur le wrapping des listes (état des lieux
v0.3.11) et sur le contrat fantôme (v0.3.10). **Décision à deux dépôts.**

### 2.2 A13 — le renommage `reservoir` → `element pool` — ✅ **LIVRÉ le 2026-07-25**

> **Fait** — merge `--no-ff` de `refactor/element-pool-renommage` (commits `f55e0dd` code +
> `3136b00` libellés). Gate : `lint:all` exit `0`, `test:all` exit `0`,
> `Test Files 56 passed (56) / Tests 518 passed (518)` — compte **inchangé**, aucun golden touché.
>
> **Découverte de l'exécution — le mot portait TROIS sens, pas deux.** Le premier inventaire
> (`grep -i "reservoir"`) était **aveugle aux accents** et manquait toutes les occurrences
> « ré*servoir* ». L'inventaire correct (`grep -iE "r[ée]servoir"`) a séparé :
>
> | Sens | Traitement |
> |---|---|
> | **pool de sous-éléments** (visé par AR-2) | ✅ renommé — symboles, fichiers, doc, libellés |
> | **dépôt de frames** (sens neuf, correct) | ✅ intact — `frame.ts`, fixtures vendorées (canon, jamais déformé) |
> | **réservoir de propositions** de l'onglet Apprentissage | ⚠️ **intact, hors périmètre** — `useForgeLearning.ts`, `LearningAtelier.tsx`, `backend.ts`. **Aucun cadrage ne le couvre** : à trancher séparément. |
>
> **Décision d'exécution consignée — le contrat de prompt LLM n'a pas bougé.** La clé du payload
> reste `reservoir` (commentée comme telle dans `prompt.ts`) et les phrases du prompt système sont
> inchangées : c'est un **contrat externe avec le modèle**, cohérent en lui-même. Le renommer aurait
> changé le comportement live sans rien désambiguïser — le LLM ne connaît pas le sens « dépôt de frames ».
>
> **Libellés visibles isolés dans `3136b00`** (« Réservoir » → « Pool d'éléments ») : ils relèvent de
> l'arbitrage du décideur, pas du renommage mécanique. Révocables par `git revert 3136b00` **sans**
> défaire le renommage de code.

**État initial constaté (conservé pour mémoire)** :

AR-2 **libère** le mot « réservoir » pour le sens *dépôt / frame*. Le critère canon A13 exige que
`reservoir` ne désigne plus le pool de sous-éléments. **Mesuré le 2026-07-25 — tenu dans
`element-pool.ts`, non tenu ailleurs** :

| Emplacement | Mesure (`grep -ric`, en lignes) | Sens porté |
|---|---|---|
| `packages/core/src/element-pool.ts` | 1 | ✅ légitime — note de vocabulaire AR-2 |
| `packages/core/src/llm.ts`, `llm.test.ts` | champ `reservoir` de l'option | ❌ ancien sens, **dans le cœur** |
| `src/forge/useForgeReservoir.ts` | 10 | ❌ ancien sens |
| `src/forge/ReservoirPanel.tsx` (+ `.test.tsx`) | 10 | ❌ ancien sens |
| `src/forge/ForgeShell.tsx` | `ReservoirPanel`, `reservoirElementForTab`, `reservoirOpen` | ❌ ancien sens |
| `src/forge/llm/prompt.ts`, `llm/resolve.ts` | `TARGET_RESERVOIR`, `buildSurfaceReservoir` | ❌ ancien sens |

**Conséquence à assumer** : le mot est aujourd'hui **ambigu dans le même dépôt** — `frames` (sens
dépôt) et `ReservoirPanel` (sens pool) cohabitent. C'est précisément ce qu'AR-2 voulait éviter.

**Reste à faire** : achever le renommage (cœur `llm.ts` puis app), **mécanique et sans changement
de comportement**, avec les tests renommés de même. Lot indépendant du § 2.1, à mener **avant** que
de nouveaux consommateurs ne se greffent sur l'ancien nom.

### 2.3 Dette héritée non rouverte

L'**audit des consommateurs du compte de types** (R4 canon) est déclaré dû par le cadrage.
Le `Record<FrameType, …>` **mord à la compilation** (garde native, `typecheck` vert), ce qui couvre
les consommateurs typés — **pas** les comptes écrits en dur dans la doc ou les libellés.

---

## 3. Invariants à ne pas casser

- **I-1 — GUI ← frame.** Le canon est autoritaire ; une divergence se corrige **côté GUI**, jamais
  en déformant le canon.
- **I-2 — Source unique CLI/GUI.** Toute valeur partagée (pointeur de frame active en tête) est
  lisible des deux côtés, ou n'est pas posée. Un câblage GUI-seul est un défaut, pas un raccourci.
- **I-3 — Les comptes ne sont pas symétriques.** CLI `COLLECTIONS` **13**, GUI `FRAME_TYPES` **12** :
  l'écart vient de `kits`, collection côté CLI mais **non** un `FrameType` côté GUI. Les deux sont
  **corrects** — ne pas « corriger » l'un vers l'autre.
- **I-4 — Aucun `roleIndex` existant ne change.** L'ajout du 9ᵉ rôle est en **queue** (`roleIndex: 8`) ;
  les gardes portent sur la **distinction** et le **compte**, jamais sur les valeurs de teinte.
- **I-5 — Activation explicite de Fëanor.** Il n'est **jamais** spawné d'office — hors dispatch
  automatique de l'équipe, sur demande explicite seulement.

---

## 4. Critères d'acceptation du reste à faire

- **AC-1** — `grep -ric "reservoir"` sur `packages/core/src/` et `src/` ne rend plus que la **note de
  vocabulaire** d'`element-pool.ts` ; aucun symbole exporté ne porte le mot à l'ancien sens.
- **AC-2** — Le renommage du § 2.2 est **sans changement de comportement** : compte de tests
  **non diminué**, suites vertes, aucun golden modifié.
- **AC-3** — Le pointeur de frame active (§ 2.1) est **lu de la même source** par le CLI et par la
  GUI — démontré par une mesure, pas par une intention.
- **AC-4** — `npm run lint:all` et `npm run test:all` rendent `0`, **cités avec leur sortie** au
  format de verdict contraint (`CLAUDE.md` § Rendre un verdict de gate).
- **AC-5** — Le backlog de `CLAUDE.md` est mis à jour **avec la preuve** de ce qui est soldé.

---

## 5. Hors périmètre

- Le **rangement des 7 frames-brouillons** dans le réservoir
  (`iakaframe/specs/instructions/rangement-catalogue-frames-reservoir.md`) : chantier du dépôt
  canon, exécutant 🟠 Fëanor — **aucun geste GUI**.
- L'**outillage de forge** `frame new` / `frame lint` : chantier séparé, côté CLI.
- `~/.claude/CLAUDE.md` et `~/.claude/agents/` (roster déployé) : **signalés, jamais écrits** par un
  agent. Le passage du roster déployé à 9 personas relève d'une décision du décideur.
