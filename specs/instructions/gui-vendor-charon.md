# GUI-VENDOR-CHARON — refermer `vendor-check` sur la scission du squad prod

> Phase P1 (cadrage). Rôle : `cadrage` (🔵 Gandalf). Dépôt : **`iakaFrameGUI`** (miroir).
> Lot **successeur nommé** de `iakaframe/specs/instructions/scission-squad-prod-charon-helm.md`
> (décision **D10**), débloqué par la satisfaction de **D3** (le lot de routage est landé dans
> `main` de `iakaframe`, `bbf5c7b`, `0.39.0`, gate 🏹 Legolas PASS).
> **Doctrine non négociable : GUI ← frame.** Le canon `iakaframe` est autoritaire ; le miroir ne
> le déforme jamais. Aucun octet de canon n'est écrit par ce lot.

---

## 0. Problème

Les fixtures de test d'`iakaFrameGUI` (`packages/core/__tests__/fixtures/`) sont des **copies
vendorées** d'artefacts canon d'`iakaframe`. La garde de parité cross-repo `vendor-check` (côté
canon) compare les deux et rend la dérive. La **scission du squad prod** (Charon = la bascule
*sur ordre*, Helm = la veille *sans ordre*) a fait bouger le canon ; le miroir n'a pas suivi.

La garde est **rouge, et c'est voulu** (D10 : « une garde verte qui ne regarde plus rien est pire
qu'une rouge »). **Ce lot n'a pas à re-justifier le rouge : il a à le fermer.**

---

## 1. Mesure — le chiffre, établi par ce cadrage

### 1.1 Méthode de mesure, et sa limite (à lire avant d'utiliser le chiffre)

Le cadrage **ne dispose pas de `Bash`** : `vendor-check` n'a **pas** pu être exécuté ici. La mesure
ci-dessous est **indépendante mais indirecte**, obtenue en lecture seule par trois écrans croisés :

1. **inventaire exact** — énumération des `.md` de `packages/core/__tests__/fixtures/` (82 fichiers)
   confrontée aux **86 lignes** de `fixtureTable()`
   (`iakaframe/cli/src/lib/vendor.js:119-207` @ `bbf5c7b`) ⇒ **exact, non approximatif** ;
2. **marqueur textuel** — `charon`/`surveillance` présents dans le canon, **absents du miroir**
   (`rg -ci charon` sur les fixtures GUI ⇒ **0 occurrence**, sur 16 fichiers canon ⇒ ≥1) ⇒ toute
   source porteuse du marqueur **diffère nécessairement** de sa copie ;
3. **comptes de lignes** appariés source ↔ fixture, pour attraper les écarts sans marqueur.

**Ce que cette méthode ne prouve pas** : une différence d'octet **sans** marqueur **et** à nombre
de lignes égal (typo, espace final, fin de ligne) resterait invisible. Le chiffre ci-dessous est
donc un **plancher mesuré**, pas un verdict. **Le verdict appartient à `AC-1`**, qui re-mesure par
la garde elle-même.

### 1.2 Le chiffre mesuré : **0 → 24**, dont **4 purement manquantes**

**Concordance avec l'annonce du brief : aucun écart.** 24 fixtures en dérive, dont 4 absentes.
Les trois chiffres antérieurs (3 manquantes ; 16 → 23 ; 23) sont **écartés** : la ligne de base est
`OK`/`drift:0`, donc le delta introduit par la pile est bien **0 → 24**.

| # | Fixture (relative à `packages/core/__tests__/fixtures/`) | Famille | Raison attendue |
|---|---|---|---|
| 1 | `personas/aragorn.md` | personas | `contenu-different` |
| 2 | `personas/gimli.md` | personas | `contenu-different` |
| 3 | `personas/helm.md` | personas | `contenu-different` |
| 4 | `personas/legolas.md` | personas | `contenu-different` |
| 5 | **`personas/charon.md`** | personas | **`fixture-manquante`** |
| 6 | `agents-golden/aragorn.md` | goldens | `contenu-different` **+** `niveau2-contrat-vivant-different` |
| 7 | `agents-golden/gimli.md` | goldens | idem |
| 8 | `agents-golden/helm.md` | goldens | idem |
| 9 | `agents-golden/legolas.md` | goldens | idem |
| 10 | **`agents-golden/charon.md`** | goldens | **`fixture-manquante`** |
| 11 | `binding/iakaframe-claude-default.md` | binding | `contenu-different` |
| 12 | `workflow.iakaframe-3phases.md` | workflow | `contenu-different` |
| 13 | `roles/deploiement.md` | roles | `contenu-different` |
| 14 | **`roles/surveillance.md`** | roles | **`fixture-manquante`** |
| 15 | `skills/iakaframe-aragorn/SKILL.md` | skills | `contenu-different` |
| 16 | `skills/iakaframe-cadrage/SKILL.md` | skills | `contenu-different` |
| 17 | `skills/iakaframe-deploiement/SKILL.md` | skills | `contenu-different` |
| 18 | `skills/iakaframe-fabrication/SKILL.md` | skills | `contenu-different` |
| 19 | `skills/iakaframe-odin/SKILL.md` | skills | `contenu-different` |
| 20 | `skills/iakastart/SKILL.md` | skills | `contenu-different` |
| 21 | **`skills/iakaframe-surveillance/SKILL.md`** | skills | **`fixture-manquante`** |
| 22 | `method.iakaframe.md` | methode | `frontmatter-different` (`roleKeys`) |
| 23 | `method.iakaframe-wrapped.md` | methode-wrapped | `frontmatter-different` (`roleKeys`) |
| 24 | `team.iakaframe-8.md` | team | `frontmatter-different` (`personas`) |

**Conformes, à ne PAS toucher** (mesuré) : les 18 `principles`, les 6 `rituals`, les 3 `scaffolds`,
les 3 `guardrails`, les 9 autres `roles`, les 13 autres `skills`, les 5 autres personas/goldens,
et **la dérivée `kit.iakaframe-claude.md`** (le golden CLI dépouillé lui est byte-identique).
**Zéro `fixture-surnumeraire`.**

### 1.3 ⚠️ Ce que l'énumération du § 1.2 ne couvre pas

Cette liste est **un témoin daté**, pas une liste de travail. Elle est vraie **au 2026-08-17, contre
`iakaframe@bbf5c7b`**. Elle ne couvre **pas** :

- une dérive introduite **entre ce cadrage et l'exécution** (tout commit canon la déplace) ;
- une différence d'octet **sans marqueur et à nombre de lignes égal** (cf. § 1.1) ;
- tout artefact **hors `fixtureTable()`** : la garde ne voit que ce que sa table énumère, et sa
  table est **écrite à la main** (cf. § 5, successeur).

**La liste de travail autoritaire est la sortie vivante de `vendor-check --json`**, pas ce tableau.
Un écart entre les deux n'est pas une erreur d'exécution : c'est un **signal à lire** (`AC-2`).

---

## 2. Décision retenue

### 2.1 Le geste de re-vendorage est **MÉCANIQUE**, jamais éditorial — mais il est **mixte**

Tranché sur pièces. Il n'existe **aucun** script qui régénère l'ensemble des fixtures ; il existe
**trois** natures de geste, et elles ne se substituent pas l'une à l'autre :

| Nature | Combien | Geste | Outil |
|---|---|---|---|
| **Copies byte-à-byte** | **21** (17 divergentes + 4 absentes) | `cp <source canon> <dest GUI>`, **nommée**, jamais de joker | aucun script — la commande exacte est **imprimée par `vendor-check`** |
| **Dérivées sérialisées** | **3** (`method`, `method-wrapped`, `team`) | **régénération** | `node packages/core/scripts/gen-fixtures.mjs` |
| **Dérivée `kit`** | 0 | — | conforme, rien à faire |

**Aucune de ces étapes ne demande un jugement à l'exécutant.** Les 21 couples source → destination
sont **dérivés de la mesure** par `remediationFor()`
(`iakaframe/cli/src/commands/vendor-check.js:174-192`), triés par `ACTION_RANK` (régénérer **avant**
de copier, supprimer en dernier). Le geste canonique est donc :

```
vendor-check --json  →  appliquer chaque entrée `remediation` dans l'ordre  →  re-lancer  →  ok:true
```

**La preuve est la garde re-jouée, jamais la déclaration de l'exécutant** (`AC-1`). Corollaire
opposable : un « re-vendorage fait » sans sortie de garde attachée est **inopposable**
(`CLAUDE.md` § « Rendre un verdict de gate »).

> 🛑 **Interdit absolu — `cp` sur une dérivée sérialisée.** `gen-fixtures.mjs` régénère le
> **frontmatter** depuis le canon et **préserve le corps verbatim**. Le corps de
> `team.iakaframe-8.md` est un stub rédigé à la main (`# La compagnie iakaframe (casting des 8)`)
> qui n'est **pas** le titre du canon : un `cp` l'écraserait et détruirait la forme sur laquelle
> `teamMd.test.ts` / `methodMd.test.ts` sont bâtis. Invariant historique A14.

### 2.2 Le re-vendorage **force** un alignement du catalogue de rôles du cœur — ce n'est pas un « tant qu'on y est »

Établi sur pièces : vendorer les 24 fixtures **sans** toucher au cœur rend le GUI rouge, par deux
chemins **indépendants** :

1. `packages/core/__tests__/roster.test.ts:73` compare `Object.keys(canonByRole)` — dérivé des
   personas **vendorées** — à `CANONICAL_ROLES.map(r => r.key)`. Après vendorage, les personas
   portent **10** `roleKey` distincts (`helm.roleKey: surveillance`, `charon.roleKey: deploiement`)
   contre **9** au catalogue ⇒ **échec**.
2. `packages/core/__tests__/method.test.ts:283-298` fige `refs` à **11** et
   `byField("roleKeys")` à **`[]`**. La fixture méthode re-vendorée porte
   `roleKeys: [… deploiement, surveillance, design, documentation, frame]` ; `surveillance` étant
   absent de `CANONICAL_ROLES`, `unresolvedRefsForMethod` le remonte ⇒ **12 / `["surveillance"]`**
   ⇒ **échec**.

Deux voies, une seule tenable :

- **Option A — RETENUE : aligner le catalogue** (`packages/core/src/roles.ts` + `roster.ts`). C'est
  exactement le geste des VOLETS **B1** et **B2** (« la fixture vendorée est INCHANGÉE ; seul le
  catalogue GUI s'est aligné — GUI ← frame »). Le catalogue **rattrape** le canon.
- **Option C — ÉCARTÉE : garder le catalogue à 9 et enregistrer `surveillance` comme référence non
  résolue** (`refs` → 12). Cela **grave une régression fonctionnelle** dans un test : le GUI ne
  saurait plus caster un rôle que le canon déclare. C'est ajuster l'attendu sur l'observé —
  précisément l'anti-pattern que `method.test.ts:311-314` interdit en toutes lettres.

**Le fait décisif qui rend l'Option A sûre : le canon n'a PAS renuméroté.**
`library/roles/surveillance.md` porte `roleIndex: 10` (base bibliothèque 1) tandis que
`design`/`documentation`/`frame` gardent `7`/`8`/`9`. L'alignement GUI est donc un **ajout en
queue**, `roleIndex: 9` (base cœur 0 = bibliothèque − 1), **sans renumérotation** — l'invariant
**D-C** de `roles.ts:14-16` est respecté à la lettre, comme il l'avait été pour `frame`.
C'est aussi ce qu'exige `roster.test.ts:17-20` (`p.roleIndex === i`) : **appendre**, jamais insérer
en 7ᵉ position.

### 2.3 Ce que devient la garde une fois verte — et le successeur nommé

Une garde qui redevient verte **ne dit rien sur la prochaine dérive**. Le constat est net, et il est
inscrit dans le code même de la garde : `fixtureTable()` est bâtie sur des **listes écrites à la
main** — `IDS`, `ROLE_KEYS`, `SKILL_IDS`, `PRINCIPLE_IDS`, `RITUAL_IDS`, `SCAFFOLD_IDS`,
`GUARDRAIL_IDS` (`vendor.js:34-70`). Ces listes **prétendent** être « l'ENSEMBLE RÉFÉRENCÉ par la
méthode canonique » (leurs propres commentaires le disent), mais **rien ne le vérifie** : elles sont
**transcrites**, pas **dérivées**.

Conséquence exacte : cette fois la garde a rougi **parce qu'un humain a pensé à bumper 78 → 82**
dans le lot de scission. Un futur lot canon qui ajoute une 11ᵉ persona **sans** toucher `vendor.js`
laissera la garde **verte et aveugle** — la panne que D10 refusait, revenue par la porte de service.
**C'est la limite structurelle : une garde qui énumère rate ce qui apparaît après elle.**

**Le remède est le cliquet, et il est HORS DE CE LOT** — il vit dans `iakaframe/cli/`, pas dans le
GUI, et ce lot n'écrit pas une ligne dans le canon.

> **Successeur nommé : `CANON-VENDOR-TABLE-DERIVEE`** (dépôt `iakaframe`, canon-side).
> Mandat : **dériver** les 7 ensembles depuis le canon (`teams/iakaframe-8.md` → `personas` ;
> `methods/iakaframe.md` → `roleKeys`/`principleIds`/`ritualIds`/`scaffoldIds`/`guardrailIds` ;
> union des `persona.skills` + fermeture des `subskills` → skills) et **asserter l'égalité
> ensembliste avec les constantes déclarées**, sur le modèle du cliquet **R1**
> (`iakaFrameGUI/specs/instructions/r1-porteurs-de-version-declares.md` : *clés lues ≡ clés
> déclarées*), **avec sa liste de hors-couverture déclarée et exportée**. Effet : l'oubli rougit
> **au commit qui l'introduit**, dans la suite du canon — **sans dépôt frère**, donc sans la
> fragilité qui a fait sortir `test:vendor` de `test:all`. La détection se déplace de « comparer le
> miroir » (2 dépôts) à « comparer la table à son propre canon » (1 dépôt).

**Décision de non-action, explicite** : `npm run test:vendor` **reste hors de `test:all`**. Ce point
a déjà été tranché (`scripts/test-vendor.mjs:5-8` : la mesure dépend d'un dépôt frère, donc
faillible sur un clone isolé, comme `cargo test`). **Ne pas le rouvrir dans ce lot.**

---

## 3. Périmètre

### 3.1 Inclus

**V1 — re-vendorage (24 fixtures).** Les 21 copies nommées + la régénération des 3 dérivées, par le
protocole du § 2.1.

**V2 — alignement du catalogue du cœur** (forcé par V1, cf. § 2.2), strictement borné à :
- `packages/core/src/roles.ts` — **une entrée appendée** à `CANONICAL_ROLES` :
  `{ key: "surveillance", label: "Veille de production", roleIndex: 9 }` (`label` **repris verbatim**
  de `library/roles/surveillance.md`), + les commentaires de tête portés de 9 à 10 rôles ;
- `packages/core/src/roster.ts` — `DEFAULT_NAMES` : `deploiement: "Charon"` (**remplace `"Helm"`**)
  et `surveillance: "Helm"` ; `DEFAULT_SKILLS` : `surveillance: ["iakaframe-surveillance"]`
  (`deploiement` **inchangé**). `CANONICAL_ROSTER` étant **dérivé** de `CANONICAL_ROLES`, il passe
  à 10 personas **sans autre modification**.

**V3 — mise à jour des tests qui énumèrent.** Chaque compte modifié **doit citer le fait canon qui
le justifie** dans son commentaire. Périmètre mesuré :

| Fichier | Ligne(s) | 9 → 10 / 19 → 20 |
|---|---|---|
| `packages/core/__tests__/roster.test.ts` | `13`, `34`, `72` | roster & couverture de rôles |
| `packages/core/__tests__/pool-roundtrip-5c.test.ts` | `79`, `80`, `82` | roles 9→10, skills 19→20 |
| `packages/core/__tests__/role-scope-patch.test.ts` | `45`, `46` | roles 9→10 |
| `packages/core/__tests__/discovery.test.ts` | `100`, `102`, `111`, `114`, `120` | `CANONICAL_ROLE_KEYS`, liaisons |
| `packages/core/__tests__/adapters.test.ts` | `56` | agents 9→10 |
| `packages/core/__tests__/adaptersAgentsMd.test.ts` | `24`, `70`, `73`, `75` | lignes de roster |
| `packages/core/__tests__/adaptersOpenwebui.test.ts` | `21`, `77`, `79` | un `models/<id>.json` par persona |
| `packages/core/__tests__/frontmatter-patch.test.ts` | `5`, `50`, `57` | round-trip sur les personas vendorées |
| `packages/core/__tests__/parite-generateurs.test.ts` | `24-67`, `162`, `189-206` | **+ import `personas/charon.md` et `agents-golden/charon.md`** ⇒ `IDS` = 10, `expectedTools` = 10 |
| `src/hooks/useForgeTeams.test.ts` | `57` | team issue du roster |
| `src/forge/personaCards.test.ts` | `70` | cartes du réservoir |
| `src/forge/PersonaReservoir.test.tsx` | `21`, `53` | cartes rendues |

**V4 — un message faux dans l'outillage.** `packages/core/scripts/gen-fixtures.mjs:148` imprime
« *les 17 copies se re-vendorent par cp* » alors que la table en compte **82**. C'est la **dernière
phrase que lit l'opérateur** juste après avoir régénéré : une fausseté sur le chemin de remédiation.
Correction **de la chaîne de message uniquement**, **zéro changement de comportement**.

### 3.2 Exclu — explicitement

- **Tout octet du dépôt `iakaframe`** : canon, `cli/`, `vendor.js`, `docs/commandes.md`. Ce lot est
  **GUI-only**. Le cliquet (§ 2.3) est un **lot distinct**.
- **`vendor.js` / `EXPECTED_COPIES` / `EXPECTED_DERIVED`** : ne **jamais** redescendre ces
  constantes — l'interdiction est gravée `vendor.js:83-87`. La cible est `checked: 82`, pas 78.
- **`src/forge/ForgeShell.test.tsx:25`** (`getAllByRole("tab")` → **9**) : ces 9 sont les **onglets
  d'atelier**, sans aucun rapport avec les rôles. **Piège identifié : ne pas y toucher.**
- Le **kit** (`kit.iakaframe-claude.md`) et son golden : conformes.
- Les **18 principles / 6 rituals / 3 scaffolds / 3 guardrails** et les fixtures non listées au
  § 1.2 : conformes, aucune main dessus.
- Toute **recette visuelle** (vignette du 10ᵉ rôle, rendu des ateliers) : hors gate Legolas, elle
  s'inscrit au backlog des recettes humaines.
- Toute **documentation utilisateur** ou **mémoire humaine** (→ 📖 Nathalie).

---

## 4. Étapes d'implémentation

**Étape 0 — VÉRIFIER LA SOURCE AVANT DE COPIER (bloquante).**
> ⚠️ **Le piège le plus coûteux de ce lot, constaté au cadrage.** L'arbre de travail principal
> `~/work/iakaframe` est, à l'heure de ce cadrage, sur la branche **`feat/sauvegarde-portefeuille`
> en `0.38.0`** : il **ne contient ni `charon` ni `surveillance`**, et son `fixtureTable()`
> n'énumère que **78** copies. Y puiser les copies vendorerait un canon **d'une version en retard**
> et fabriquerait une **nouvelle** dérive, invisible aux tests du GUI.
> Le canon `main`/`bbf5c7b`/`0.39.0` est présent dans le worktree
> `~/work/iakaframe/.claude/worktrees/successeur`.

1. Constater la révision du canon : `git -C <canon> rev-parse HEAD` ⇒ **`bbf5c7b`** (ou un
   descendant de `main`), et `cli/package.json` ⇒ **`0.39.0`** ou plus.
2. Constater que ce canon voit bien 82 copies : `EXPECTED_COPIES = 82` dans `cli/src/lib/vendor.js`.
3. Si la mesure est jouée **depuis le worktree**, la résolution automatique du dépôt frère
   **échoue** (`path.resolve(root, '..', 'iakaFrameGUI')` ne pointe nulle part depuis
   `.claude/worktrees/`) et la garde sort **`SKIP`** — un `SKIP` n'est **pas** un vert.
   Passer explicitement `--gui <racine iakaFrameGUI>` (ou `IAKAFRAME_GUI_ROOT`).

**Étape 1 — mesurer avant de toucher.**
`node <canon>/cli/src/index.js vendor-check --gui <GUI> --json` → consigner `drift`, `checked`,
`derived` et la liste `remediation`. **Comparer aux 24 du § 1.2 et déclarer l'écart** (`AC-2`).

**Étape 2 — appliquer la remédiation, dans l'ordre rendu.**
`run` (régénération) d'abord, `copy` ensuite. Créer le dossier
`packages/core/__tests__/fixtures/skills/iakaframe-surveillance/` pour la fixture neuve.

**Étape 3 — re-mesurer.** `vendor-check` ⇒ `ok:true`, `drift:0`, `checked:82`, `derived:4`, exit 0.
**Ne pas poursuivre tant que ce n'est pas obtenu** : tout le reste dépend du contenu vendoré.

**Étape 4 — V2 (catalogue).** `roles.ts` puis `roster.ts`, § 3.1. Rien d'autre.

**Étape 5 — V3 (tests).** Un compte à la fois, chacun justifié en commentaire par le fait canon
correspondant. `parite-generateurs.test.ts` en dernier (c'est le plus dense : 2 imports + `IDS`).

**Étape 6 — V4** (message de `gen-fixtures.mjs`).

**Étape 7 — recette.** `npm run lint:all`, `npm run test:all`, `cargo test` (`src-tauri/`),
`vendor-check`, et `node packages/core/scripts/gen-fixtures.mjs --check` ⇒ « à jour ».
Verdict rendu dans le **tableau contraint** de `CLAUDE.md` — commande, code de sortie, résumé cité.

---

## 5. Fichiers concernés

**Cette instruction elle-même** — le § *Fichiers concernés* d'un lot inclut **toujours** son propre
fichier d'instruction ; l'omettre, c'est livrer un lot dont une partie du contenu n'est pas déclarée :

- `specs/instructions/gui-vendor-charon.md` — **ce fichier** (le cadrage, versé au dépôt du lot).

**Fixtures re-vendorées (24)** — sous `packages/core/__tests__/fixtures/` : les 24 lignes du § 1.2,
dont **4 fichiers créés** (`personas/charon.md`, `agents-golden/charon.md`, `roles/surveillance.md`,
`skills/iakaframe-surveillance/SKILL.md`).

**Cœur (2)**
- `packages/core/src/roles.ts` — `CANONICAL_ROLES` += `surveillance` (append, `roleIndex: 9`).
- `packages/core/src/roster.ts` — `DEFAULT_NAMES` (Charon/Helm), `DEFAULT_SKILLS` (+ surveillance).

**Tests (12)** — les 12 fichiers du tableau § 3.1 V3.

**Outillage (1)**
- `packages/core/scripts/gen-fixtures.mjs` — message final : « 17 copies » → **82**.

**Backlog (1)**
- `CLAUDE.md` § Backlog — l'entrée du lot, **avec sa preuve** (merge + mesure), conformément à
  l'invariant « un item coché sans référence est à re-mesurer, pas à croire ».

---

## 6. Risques

| # | Risque | Mitigation |
|---|---|---|
| R-1 | **Vendorer depuis le mauvais checkout** (`0.38.0`, sans Charon) ⇒ dérive neuve, invisible côté GUI | Étape 0 bloquante : `rev-parse` + version + `EXPECTED_COPIES = 82` **avant** toute copie |
| R-2 | **`cp` sur une dérivée sérialisée** ⇒ destruction de la forme canonique, `teamMd`/`methodMd` cassés | `gen-fixtures.mjs` **seul** sur les 3 dérivées ; `ACTION_RANK` place `run` avant `copy` |
| R-3 | **`SKIP` pris pour un vert** (dépôt frère non résolu depuis le worktree) | `--gui` explicite ; `AC-1` exige `status:"clean"` **et** `checked:82`, jamais l'absence d'erreur |
| R-4 | **Ajuster un attendu sur l'observé** pour faire taire un test ⇒ régression gravée | Chaque compte modifié **cite le fait canon** qui le justifie ; `AC-5` verrouille `refs = 11` et `roleKeys = []` — un 12 signerait l'Option C écartée |
| R-5 | **Renumérotation accidentelle** des `roleIndex` (insertion en 7ᵉ position pour suivre l'ordre des `roleKeys` du canon) ⇒ vignettes décalées, `roster.test.ts:18` rouge | **Appendre** en queue, `roleIndex: 9` ; le canon lui-même a appendu (`surveillance` = 10, `design` reste 7) |
| R-6 | **Débordement de périmètre** vers `ForgeShell.test.tsx:25` (les 9 **onglets**) | Nommé en exclusion § 3.2 ; sa valeur reste **9** |
| R-7 | **Le canon bouge entre cadrage et exécution** ⇒ la liste du § 1.2 ne colle plus | § 1.3 : la liste est un témoin, la remédiation vivante fait foi ; `AC-2` transforme l'écart en signal, pas en échec |
| R-8 | **10ᵉ rôle sans vignette** (le `roleIndex` est clé de casting visuel) | Hors gate automatisé : à porter en **recette visuelle humaine** (backlog), pas à deviner ici |

---

## 7. Critères d'acceptation

> Exécution : `<canon>` = un checkout d'`iakaframe` à `main` (`bbf5c7b` ou descendant) ;
> `<GUI>` = racine d'`iakaFrameGUI`.

| # | Critère | Vérification |
|---|---|---|
| **AC-1 — CENTRAL** | La garde est **verte, sur l'inventaire complet** | `node <canon>/cli/src/index.js vendor-check --gui <GUI> --strict --json` ⇒ `ok:true`, `status:"clean"`, `drift:0`, **`checked:82`**, `derived:4`, `remediation:[]`, **exit 0** |
| **AC-2** | La mesure d'entrée est **rendue**, et l'écart au cadrage **déclaré** | La sortie `vendor-check` **d'avant** l'étape 2 est citée (`drift`, liste des fixtures). Si ≠ 24 / ≠ § 1.2 : l'écart est **nommé fixture par fixture** dans le rapport de lot. Un écart déclaré **n'est pas un échec** ; un écart **tu** en est un |
| **AC-3** | Les 4 fixtures neuves existent et sont **byte-identiques** à leur source | `diff <canon>/library/personas/charon.md <GUI>/…/fixtures/personas/charon.md` ⇒ vide ; idem `agents-golden/charon.md`, `roles/surveillance.md`, `skills/iakaframe-surveillance/SKILL.md` |
| **AC-4** | Les dérivées sont **régénérées**, pas copiées | `node packages/core/scripts/gen-fixtures.mjs --check` ⇒ « les 3 dérivées sont à jour », exit 0. **ET** le corps de `team.iakaframe-8.md` contient toujours `# La compagnie iakaframe (casting des 8)` (preuve de non-écrasement) |
| **AC-5** | Le catalogue résout, **sans régression enregistrée** | `method.test.ts` : `refs` vaut **11** et `byField("roleKeys")` vaut **`[]`**. Un `12`/`["surveillance"]` ⇒ **FAIL** (Option C écartée) |
| **AC-6** | Aucune renumérotation | `CANONICAL_ROLES` : `design`/`documentation`/`frame` conservent `roleIndex` **6/7/8** ; `surveillance` vaut **9** et est **en dernière position**. `roster.test.ts` (`p.roleIndex === i`) vert |
| **AC-7** | Parité de contrat **10/10** | `parite-generateurs.test.ts` : rendu GUI == golden byte-à-byte **pour les 10 personas, charon compris** ; garde `sha256` verte ; `Object.keys(expectedTools).sort()` == `IDS` (**10**) |
| **AC-8** | Round-trip byte-préservant sur les pools élargis | `pool-roundtrip-5c.test.ts` : inventaire **10 + 3 + 20**, et chaque `.md` réel (dont `roles/surveillance.md` et `skills/iakaframe-surveillance/SKILL.md`) identité byte après lire → patcher → réécrire |
| **AC-9** | Gate qualité vert, **au format contraint** | `npm run lint:all` ⇒ `0` ; `npm run test:all` ⇒ `0`, **compte de tests ≥ la baseline, aucun test supprimé** ; `cargo test` ⇒ `0`. Verdict rendu en tableau (commande / code / résumé **cité**), jamais en prose |
| **AC-10** | **Zéro octet écrit dans le canon** | `git -C <canon> status --porcelain` ⇒ **vide** après l'exécution complète du lot |
| **AC-11** | Le message d'outillage ne ment plus | `rg "17 copies" packages/core/scripts/gen-fixtures.mjs` ⇒ **aucun résultat** ; la sortie du script cite **82** |
| **AC-12** | L'instruction est **dans le dépôt du lot** | `specs/instructions/gui-vendor-charon.md` présent et committé (réserve `R-2` du gate R1 : une instruction hors dépôt est une réserve ouverte) |
| **AC-13** | Le successeur est **nommé**, pas seulement constaté | `CLAUDE.md` § Backlog porte une entrée **ouverte** `CANON-VENDOR-TABLE-DERIVEE` (dépôt `iakaframe`), avec son mandat § 2.3 — une limite structurelle sans successeur nommé est une limite oubliée |

---

## 8. Estimation dev (⚒️ Gimli)

| Poste | Charge | Note |
|---|---|---|
| Étape 0-1 — vérification du checkout + mesure d'entrée | 0,10 j-h | bloquant, mais court |
| V1 — 21 copies nommées + 1 régénération + re-mesure | 0,20 j-h | **mécanique**, commandes imprimées par la garde |
| V2 — catalogue (`roles.ts`, `roster.ts`) | 0,15 j-h | 4 lignes ; le soin est doctrinal (append, pas insert) |
| V3 — 11 fichiers de comptes, chacun justifié | 0,40 j-h | **le gros du lot** ; répétitif, peu risqué |
| V3bis — `parite-generateurs.test.ts` (2 imports + `IDS` + assertions) | 0,20 j-h | le plus dense ; parité byte de charon |
| V4 + backlog + instruction versée | 0,05 j-h | trivial |
| Recette AC-1…AC-13 (dont `cargo test`) | 0,15 j-h | commandes fournies |
| **Total** | **≈ 1,25 j-h** | spec fermée |

**Complexité / risque : MODÉRÉ.** Le code est petit et localisé ; le risque est **procédural**
(copier depuis le mauvais checkout, R-1) et **doctrinal** (ajuster un attendu au lieu d'aligner le
catalogue, R-4).

> ⚠️ **Contradiction assumée avec une estimation antérieure.** Le canon annonce ce lot à
> **« ~0,5 j-h »** (`cli/src/lib/vendor.js:81`). Cette estimation ne couvre que **V1** : elle a été
> posée avant qu'on mesure que le vendorage **force** l'alignement du catalogue (§ 2.2) et la mise à
> jour de **12 fichiers de test**. Le chiffre retenu ici est **≈ 1,25 j-h**, soit **2,5×**. Ce
> n'est pas un engagement ferme : un ordre de grandeur assumé, à confronter au temps réel à la
> clôture du lot.

**Inconnues susceptibles de faire glisser :**

1. **Un test énumérant non repéré.** Les 12 fichiers sortent d'un balayage par motif
   (`toHaveLength(9)`, `toBe(19)`, `CANONICAL_ROLE`) : un compte écrit autrement (`length - 1`,
   comparaison de tableau en dur) échapperait au balayage. Borné par `AC-9` (suite complète), qui
   le révélerait — mais en fin de course. **Impact estimé : +0,1 à +0,3 j-h.**
2. **Le contrat de Charon.** `AC-7` exige que le rendu GUI de `charon` soit byte-identique au golden
   canon. Si un écart apparaît, il ne se corrige **pas** côté GUI : c'est un défaut de parité
   `renderAgentContract` cœur ↔ CLI, **à remonter**, pas à absorber.
3. **Vignette du 10ᵉ rôle** (R-8) : si l'UI casse au rendu, le volet visuel devient un lot à part.
4. **Dérive du canon** entre la validation de ce cadrage et l'exécution (R-7) : chaque commit canon
   déplace la liste du § 1.2, jamais le protocole du § 2.1.

---

## 9. Point porté à l'arbitrage (gate humain P1→P2)

Trois décisions sont **proposées**, pas prises — elles appartiennent au décideur :

1. **Ratifier l'Option A** (§ 2.2) : le catalogue de rôles du cœur passe à **10**, `surveillance`
   appendu. Conséquence produit assumée : **une team neuve issue du gabarit compte 10 personas**,
   avec `deploiement → Charon` et `surveillance → Helm`. C'est une conséquence **forcée** de la
   doctrine GUI ← frame, mais elle change ce que l'utilisateur voit à la création d'une team : elle
   mérite un feu vert conscient.
2. **Ratifier l'exclusion du cliquet** de ce lot et **l'ouverture du successeur**
   `CANON-VENDOR-TABLE-DERIVEE` (§ 2.3). Alternative possible : élargir ce lot au canon — **non
   recommandée** (deux dépôts, deux gates, dans un seul lot).
3. **Prendre acte de l'estimation à ≈ 1,25 j-h** contre les 0,5 j-h annoncés au canon, et décider :
   **engager tel quel**, **découper** (V1 seul, puis V2+V3), ou **re-cadrer**. À noter si le
   découpage tente : **V1 seul laisse le GUI rouge** au gate (§ 2.2) — les deux volets ne se
   séparent pas sans laisser une suite de tests cassée entre les deux.
