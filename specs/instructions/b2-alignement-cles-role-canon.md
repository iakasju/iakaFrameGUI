# Instruction : B2 — alignement des 5 clés de rôle GUI sur le canon iakaframe

> Cadré par 🔵 Gandalf (P1), 2026-07-23 (MODE MARCHE FORCÉE). Consommé par ⚒️ Gimli (P2),
> vérifié par 🏹 Legolas. **Lecture seule** faite sur les deux dépôts ; le seul artefact produit
> par ce cadrage est ce fichier.
> Dépôt d'exécution : **iakaFrameGUI** (mono-dépôt — voir § 6). Sources lues : **iakaframe**
> (canon autoritaire) *et* **iakaFrameGUI** (à aligner).
> Objectif parent : « charger le frame dans le GUI » — **LOT DE SUIVI B2**, fait suite à l'étape 4
> Lot 1 (`frame-parite-vendoring-garde.md` § B.4, sous-lot B2 explicitement reporté).
> **Doctrine non négociable : GUI ← frame.** Les clés de rôle du canon iakaframe sont autoritaires.
> Le GUI s'aligne sur elles ; on ne renomme **jamais** le canon pour arranger le GUI.

---

## 0. Contexte et cause racine

À l'étape 4 Lot 1, le sous-lot **B1** a ajouté le 8ᵉ rôle `deploiement` (persona helm) →
`CANONICAL_ROSTER` compte 8 personas (`packages/core/src/roles.ts:38`, ajout en 8ᵉ position). Mais
**5 clés de rôle du GUI restent périmées** vs le canon : elles portent un vocabulaire hérité du
Cockpit (`architecture`, `fabrication`, `tests`, `graphisme`, `doc`) au lieu du vocabulaire canon
(`cadrage`, `dev`, `qualite`, `design`, `documentation`). C'est une **dérive latente contraire à la
doctrine `GUI ← frame`** : la direction est tranchée (aligner sur le canon), seul le timing était
reporté. Ce lot ferme la dérive.

**Non-régression exigée** : B1 (roster 8/8, byte-parité round-trip de `team.iakaframe-8.md`) doit
rester vert ; la garde `vendor-check` doit rester **drift:0** dans les deux dépôts (ce lot ne touche
**aucune** fixture vendorée — cf. § 3 et § 4).

---

## 1. Correspondance des 5 clés — ÉTABLIE SUR PIÈCES (canon = source de vérité)

Les 8 `roleKey` du canon ont été **lus directement** dans le frontmatter de `library/personas/*.md`
et confirmés par l'ordre de `methods/iakaframe.md:11`. Table complète des 8 rôles :

| # canon | roleKey canon | Persona (id) | Preuve (chemin:ligne) | Clé GUI actuelle (`roles.ts`) | Statut |
|---|---|---|---|---|---|
| 0 | `portefeuille`  | odin     | `iakaframe/library/personas/odin.md:5`     | `portefeuille`  | ✅ aligné |
| 1 | `coordination`  | aragorn  | `iakaframe/library/personas/aragorn.md:5`  | `coordination`  | ✅ aligné |
| 2 | **`cadrage`**   | gandalf  | `iakaframe/library/personas/gandalf.md:5`  | `architecture` (`roles.ts:33`) | ❌ **à renommer** |
| 3 | **`dev`**       | gimli    | `iakaframe/library/personas/gimli.md:5`    | `fabrication` (`roles.ts:34`)  | ❌ **à renommer** |
| 4 | **`qualite`**   | legolas  | `iakaframe/library/personas/legolas.md:5`  | `tests` (`roles.ts:35`)        | ❌ **à renommer** |
| 5 | **`deploiement`** | helm   | `iakaframe/library/personas/helm.md:5`     | `deploiement` (`roles.ts:38`, **index 7**) | ⚠️ clé OK, **ordre faux** |
| 6 | **`design`**    | loki     | `iakaframe/library/personas/loki.md:5`     | `graphisme` (`roles.ts:36`)    | ❌ **à renommer** |
| 7 | **`documentation`** | nathalie | `iakaframe/library/personas/nathalie.md:5` | `doc` (`roles.ts:37`)      | ❌ **à renommer** |

**Les 5 renommages fermés (sens confirmé, direction GUI → canon) :**

```
architecture → cadrage        (gandalf, index 2)
fabrication  → dev            (gimli,   index 3)
tests        → qualite        (legolas, index 4)
graphisme    → design         (loki,    index 6)
doc          → documentation  (nathalie, index 7)
```

**Second fait structurant — l'ordre canonique diffère de l'ordre GUI actuel.**
`methods/iakaframe.md:11` fixe l'ordre : `[portefeuille, coordination, cadrage, dev, qualite,
deploiement, design, documentation]`. **`deploiement` est en position 5** (avant `design` et
`documentation`), alors que B1 l'a placé en position 7 (dernière). B2 **doit réordonner** pour que
`roleIndex` colle au casting canon. Impact du réordonnancement : `deploiement` 7→5, `design` 5→6,
`documentation` 6→7.

> **Aucune escalade nécessaire.** Chacune des 5 clés mappe **proprement** sur une clé canon (1:1,
> sens univoque) ; aucun choix produit irréductible ne se présente. La correspondance est fermée.

---

## 2. Blast radius mesuré (chemin:ligne) — CODE, puis TESTS, puis ce qu'on NE touche PAS

### 2.1 Code source — clés câblées en dur, à re-claver (load-bearing)

| Fichier:symbole | Nature de la retouche |
|---|---|
| `packages/core/src/roles.ts:30-39` (`CANONICAL_ROLES`) | **Source de vérité** : 5 clés + `label` + **ordre canonique** (deploiement à l'index 5). |
| `packages/core/src/roster.ts:17-26` (`DEFAULT_NAMES`) | Ré-claver les clés (`architecture→cadrage`, …). Valeurs (noms) inchangées. |
| `packages/core/src/roster.ts:29-38` (`DEFAULT_SKILLS`) | Ré-claver les clés. Valeurs (ids de skill) inchangées. |
| `packages/core/src/skill.ts:28-31` (`CATALOG_SKILLS`) | Ré-claver les `roleKey` (`iakaframe-cadrage`→`cadrage`, `iakaframe-qualite`→`qualite`, `iakaframe-naonedge`→`design`, `iakaframe-nathalie`→`documentation`). |
| `packages/core/src/skill.ts:32` (`iakaframe-helm`) | **Bug adjacent** : entrée `{ id:"iakaframe-helm", roleKey:"coordination" }` — la skill canon de helm est `iakaframe-deploiement` (`iakaframe/library/personas/helm.md:8`). Corriger en `{ id:"iakaframe-deploiement", roleKey:"deploiement", label:"Déploiement (Helm)" }`. |
| `packages/core/src/workflow.ts:205,207,211` (phase `cadrage`) | `roleKeys:["architecture"]→["cadrage"]`, `roleDisplay:"architecture"→"cadrage"`, `gate.from:"architecture"→"cadrage"`. |
| `packages/core/src/workflow.ts:221,235` (phases `realisation`/`staging`) | `roleKeys:["fabrication","tests"]→["dev","qualite"]` (×2). `roleDisplay` lignes 223,237 : `"fabrication + tests"→"dev + qualite"`, `"fabrication (devops) + tests"→"dev (devops) + qualite"`. |
| `packages/core/src/workflow.ts:198` (`sectionNote`, prose) | Aligner la prose : « graphisme (design on-brand), doc (guides) » → « design …, documentation … ». Prose, non bloquant, mais requis par B2-AC1 (cohérence vocabulaire). |
| `packages/core/src/adapters/openwebui.ts:82-95` (`roleMission`) | Ré-claver les clés de la map (`architecture→cadrage`, `fabrication→dev`, `tests→qualite`, `graphisme→design`, `doc→documentation`). Textes de mission inchangés. **Sinon repli silencieux** (cf. § 2.4). |
| `packages/core/src/adapters/openwebui.ts:149` (`vision`) | `persona.roleKey === "graphisme"` → `=== "design"`. |
| `src/forge/useForgeMethod.ts:46-54` (méthode par défaut) | Aligner la liste `roleKeys` sur le canon : **8 clés** dans l'ordre `[portefeuille, coordination, cadrage, dev, qualite, deploiement, design, documentation]` (actuellement 7 clés périmées, `deploiement` manquant). |
| `src/forge/casting.ts:8-17` (`CASTING_GRADIENTS` + commentaires) | Réordonner pour **préserver la couleur par rôle** : index 5 = deploiement (grenat), 6 = design (violet), 7 = documentation (orange) ; mettre à jour les commentaires 2/3/4 (`cadrage`/`dev`/`qualite`). |

### 2.2 Tests dérivés des données CANONIQUES — à mettre à jour (ils cassent sinon)

| Fichier:ligne | Retouche |
|---|---|
| `packages/core/__tests__/adaptersAgentsMd.test.ts:29-38` (`ROLE_LABELS`) | Remplacer les libellés périmés par les **nouveaux labels canon** (§ 5). Assertions `.toContain` order-indépendantes (`:71`). |
| `packages/core/__tests__/adaptersOpenwebui.test.ts:145` | `p.roleKey === "graphisme"` → `=== "design"`. |
| `packages/core/__tests__/adaptersOpenwebui.test.ts:193` | `find(p => p.roleKey === "fabrication")` → `=== "dev"` (sinon `undefined` → crash test). |
| `packages/core/__tests__/workflow.test.ts:40` | `expect(cadrage.gate.from).toBe("architecture")` → `"cadrage"`. |
| `packages/core/__tests__/workflow.test.ts:172-173` | Fixture synthétique + libellés `"Architecture"`/`"Fabrication + Tests"` : réaligner clés+labels sur le canon (ou keys clairement hors-liste). |
| `packages/core/__tests__/workflowEdit.test.ts:114-119` | Fixture synthétique `["fabrication","tests"]` + assertion `"Fabrication + Tests"` : réaligner. |

### 2.3 Tests à clés SYNTHÉTIQUES — tolérés, hygiène optionnelle (hors AC)

Ces tests utilisent une clé périmée comme **donnée d'exemple** (parsing générique), pas comme
assertion de canonicité. `B2-AC1` scope explicitement `packages/core/src/**` et `src/**` (pas
`__tests__`) : les laisser ne casse rien. Les aligner est un plus de propreté, **non requis**.
`persona.test.ts:25` · `team.test.ts:60` · `handoff.test.ts:28` · `useForgeTeams.test.ts:96` ·
`workflowResolve.test.ts:41` · `workflowFidelite.test.ts:118` · `workflowMd.test.ts:144,152,195` ·
`src-tauri/src/teams_store.rs:209`.

### 2.4 Point de vigilance (l'inconnue principale) — le repli silencieux openwebui

`openwebui.ts:82-95` indexe ses missions par **clé de rôle**. **Aujourd'hui** le roster porte
`architecture` et la map a la clé `architecture` → ça matche. Après re-clavage de `roles.ts` **seul**,
le roster porterait `cadrage` mais la map garderait `architecture` → **repli silencieux** vers
`Rôle ${roleLabel}`. C'est pourquoi `roles.ts` et `openwebui.ts` (+ tous les consommateurs § 2.1)
doivent changer **dans le même commit** (cf. ordre § 3). **Additif optionnel** : ajouter une entrée
`deploiement` à la map `roleMission` (helm n'en a pas → repli actuel `Rôle Déploiement.`) — polish,
non requis.

### 2.5 Ce qu'on NE touche PAS — fixtures vendorées (déjà canon-correctes)

Vérifié sur pièces : **aucune** fixture vendorée ne dépend des clés périmées, donc **aucune
régénération** n'est requise.
- `packages/core/__tests__/fixtures/personas/*.md` : le canon porte **déjà** les clés canon
  (`gandalf.md:5 roleKey: cadrage`, etc.) → fixtures byte-identiques au canon, inchangées.
- `packages/core/__tests__/fixtures/agents-golden/*.md` : les contrats d'agent **ne portent PAS de
  `roleKey`** (frontmatter = `name`, `description`, `tools`, `guardrails` — cf. `agents-golden/gandalf.md:8-11`)
  → insensibles à B2.
- `packages/core/__tests__/fixtures/method.iakaframe.md:8` : porte **déjà** `roleKeys: [portefeuille,
  coordination, cadrage, dev, qualite, deploiement, design, documentation]` → inchangée.
- `packages/core/__tests__/fixtures/team.iakaframe-8.md`, `.../fixtures/binding/*` : ne portent pas de
  `roleKey` → inchangées.

> ⚠️ **Interdit absolu** : « corriger » un `roleKey` dans une fixture vendorée. Le canon est déjà
> juste ; toute édition d'une fixture y injecterait une divergence et casserait la byte-parité
> `vendor-check`. Le geste B2 est **exclusivement** dans le code applicatif et ses tests.

### 2.6 Menus UI — auto-alignés (recette visuelle seule)

Tous les sélecteurs de rôle consomment `CANONICAL_ROLES`/`roleLabel` → ils reflètent
automatiquement `roles.ts` : `src/components/PersonaEditor.tsx:108`,
`src/forge/ateliers/MethodeAtelier.tsx:275-276`, `src/forge/ateliers/WorkflowAtelier.tsx:179,254,272`.
Aucune clé périmée codée en dur dans l'UI. Ce sont des points de **recette visuelle**, pas d'édition.

---

## 3. Ordre d'exécution ANTI-DRIFT (le point dur)

**Fait structurant qui simplifie tout** : B2 ne touche **aucune** fixture vendorée (§ 2.5) et les
tests d'adaptateurs sont **comportementaux, pas des snapshots figés** (vérifié : aucun `.snap`,
aucun `toMatchSnapshot` dans `packages/core/__tests__/`). Il n'y a donc **aucun golden à régénérer
depuis le canon**. Le risque « injecter un drift cohérent par régénération » **ne se pose pas** : la
seule façon de casser `vendor-check` serait d'éditer par erreur une fixture (§ 2.5, interdit). L'ordre
ci-dessous garantit qu'aucun **état intermédiaire incohérent** n'existe et **encadre** le lot par
deux mesures `vendor-check`.

| # | Étape | Pourquoi cet ordre |
|---|---|---|
| 0 | **Mesure d'ouverture.** `vendor-check --gui <GUI>` (les deux dépôts) **clean/drift:0** + `npm run test:all` **vert** + noter le **total de tests**. | Baseline : prouve qu'on part du vert ; capte le compte de tests avant. |
| 1 | **Commit atomique « source + tous consommateurs code ».** `roles.ts` (clés+labels+**réordre**) **et** dans le **même commit** : `roster.ts`, `skill.ts`, `workflow.ts`, `openwebui.ts`, `useForgeMethod.ts`, `casting.ts`. | Évite le **repli silencieux** (§ 2.4) : jamais un roster canon face à une map périmée. |
| 2 | **Commit « tests dérivés ».** Mettre à jour les tests § 2.2. `npm run test:all` **vert**. | Les tests suivent la donnée canonique ; pas de test rouge laissé. |
| 3 | **Recette visuelle** (§ 2.6) : les 8 rôles canon s'affichent dans les menus. | Vérif humaine (Legolas ne valide pas le pixel). |
| 4 | **Mesure de clôture.** Re-`vendor-check --gui <GUI>` (les deux dépôts) → **drift:0 inchangé** ; re-vérifier round-trip `team.iakaframe-8.md` (B1). `npm run lint:all` + `test:all` verts. | **Preuve anti-drift** : aucune fixture n'a bougé ; B1 non régressé. |

> Étapes 1 et 2 **peuvent** fusionner en un seul commit si Gimli préfère (le lot est petit et
> cohérent) ; l'essentiel est que **`roles.ts` ne parte jamais seul** sans ses consommateurs.

---

## 4. Critères d'acceptation (testables)

- **B2-AC1** — Aucune des 5 clés périmées (`architecture`, `fabrication`, `tests`, `graphisme`,
  `doc`) ne subsiste **comme clé de rôle** dans `packages/core/src/**` ni `src/**` (les mots en prose
  de commentaire sont hors sujet). Vérif : `rg -n '"(architecture|fabrication|tests|graphisme|doc)"'
  packages/core/src src` ne renvoie plus d'occurrence en position de clé de rôle.
- **B2-AC2** — `CANONICAL_ROLES` (`roles.ts`) est **identique (clés ET ordre)** à
  `methods/iakaframe.md:11` : `[portefeuille, coordination, cadrage, dev, qualite, deploiement,
  design, documentation]`. `CANONICAL_ROSTER` : 8 personas, `roleIndex` 0→7 dans cet ordre
  (`roster.test.ts:11-19` reste vert, auto-tracké).
- **B2-AC3** — `npm run test:all` **vert** ; les tests dérivés (§ 2.2) affirment les **nouvelles**
  clés/labels. **Aucun** golden `claudeCode` ne change (les contrats ne portent pas de `roleKey` —
  vérif au diff : `fixtures/agents-golden/*` intacts).
- **B2-AC4** — `vendor-check --gui <GUI>` rend **`ok:true`, drift:0** (17 copies + 4 dérivées)
  **avant ET après** le lot, dans les deux dépôts (sortie citée au verdict, non reformulée). Preuve
  qu'aucune fixture vendorée n'a été touchée.
- **B2-AC5 (non-régression B1)** — round-trip **byte-identique** de `team.iakaframe-8.md` au niveau
  document (Open → Save sans édition ⇒ diff vide, 8 personas). Le réordonnancement des `roleIndex`
  ne le casse pas (`mdToTeam` résout par **id** et préserve l'ordre de `md.personas`).
- **B2-AC6** — Adaptateurs openwebui/codex/agentsMd **régénérés cohérents** : la sortie porte les
  nouveaux libellés ; `vision:true` **uniquement** pour le rôle `design`
  (`adaptersOpenwebui.test.ts:145` vert). La méthode par défaut du forge
  (`useForgeMethod.ts`) expose **8** rôles canon.
- **B2-AC7 (recette visuelle)** — les menus de rôle (§ 2.6) affichent les 8 rôles canon avec leurs
  nouveaux labels.

---

## 5. Décision de LIBELLÉ (display) — recommandée, ajustable par le décideur

Le **canon impose la clé** (non négociable) ; le **label** est un affichage GUI. Recommandation
(capitalisation française naturelle), à trancher par le décideur :

| clé canon | label recommandé |
|---|---|
| `cadrage` | **Cadrage** |
| `dev` | **Développement** |
| `qualite` | **Qualité** |
| `deploiement` | **Déploiement** (déjà présent) |
| `design` | **Design** |
| `documentation` | **Documentation** |

> Seul point ouvert du lot : `dev → "Dev"` vs `"Développement"`. Recommandation : **« Développement »**
> (lisible dans les menus et l'`AGENTS.md`). Aucune incidence architecturale ; les tests § 2.2
> s'alignent sur le choix retenu.

---

## 6. Périmètre : MONO-DÉPÔT GUI (tranché sur pièces)

Ce lot est **mono-dépôt iakaFrameGUI**. Aucun lot `iakaframe` n'est requis :
- Le canon porte **déjà** les clés canon dans `methods/iakaframe.md:11` et tous les
  `library/personas/*.md` → rien à renommer côté source.
- Les goldens **côté canon** (`iakaframe/cli/test/fixtures/agents-golden/*`) proviennent de contrats
  qui **ne portent pas de `roleKey`** → insensibles à B2. Le générateur canon
  (`cli/src/lib/generate-agents.js`), les dérivées (`gen-fixtures.mjs`) et la garde (`vendor.js`)
  restent **corrects et intouchés** — invoqués seulement en **vérification** (`vendor-check`).

**Direction (canon autoritaire, `GUI ← frame`)** : le GUI s'aligne, point. Aucune décision produit
irréductible sur la correspondance d'une clé (§ 1) → **aucune escalade** au-delà du choix de label
(§ 5) et du timing (déjà tranché : maintenant, c'est ce lot).

---

## 7. Estimation (jalon P1→P2)

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** (spec fermée) | **0,5 – 1,0 j-h** |
| **Complexité / risque** | **faible-moyen** — renommage mécanique + réordonnancement ; pas de régénération de golden, tests comportementaux (pas de snapshot figé). |

**Inconnues susceptibles de faire glisser :**
1. **Réordonnancement `roleIndex`** (deploiement 7→5) — un test qui figerait un **ordre** de lignes
   de roster casserait (non repéré : `adaptersAgentsMd.test.ts:71` est order-indépendant, mais
   l'exécution doit re-scanner tout test d'ordre après réordre).
2. **Mesure d'ouverture rouge** — si le canon a bougé depuis ce cadrage, `vendor-check` peut sortir
   un drift préexistant (à traiter en amont, hors B2 : ce n'est pas B2 qui l'aurait créé).
3. **Choix de label `dev`** (§ 5) — à trancher avant de figer les tests § 2.2 (5 min).

Estimation **révisée à la baisse** vs le pré-cadrage Lot 1 (`frame-parite-vendoring-garde.md` § B.4 :
0,75–1,25 j-h) : l'analyse sur pièces montre **aucun golden d'adaptateur à régénérer** (tests
comportementaux) et **zéro fixture vendorée impactée** — le poste le plus incertain du pré-cadrage
s'effondre. Reste le coût du réordonnancement + le balayage des consommateurs (dont
`useForgeMethod.ts` et le bug `skill.ts:32`, non comptés au pré-cadrage). **Ordre de grandeur assumé
et révisable**, à confronter au temps réel à la clôture du lot.

---

## 8. Délégable / geste humain

| Geste | Qui |
|---|---|
| Renommage code + tests, réordonnancement, mesures `vendor-check` avant/après | **⚒️ Gimli** |
| Vérification indépendante des AC, verdict **sourcé** (re-mesure, ne reprend aucune mesure de Gimli) | **🏹 Legolas** |
| Recette visuelle des menus de rôle (B2-AC7) | **le décideur** (Legolas ne valide pas le pixel) |
| Choix de label `dev → « Dev » / « Développement »` (§ 5) + validation de cette instruction | **le décideur** |
| Merge + versionnement (**GUI seul** — mono-dépôt) | **🛡️ Aragorn**, sur feu vert |

## 9. Hors scope

- Toute modification du **canon iakaframe** (source déjà correcte — § 6).
- L'alignement des **ids de skill** au-delà de la correction du bug `skill.ts:32`
  (`iakaframe-helm`→`iakaframe-deploiement`) : le reste des ids de skill est inchangé (on ne re-clave
  que les `roleKey`).
- L'alignement des `guardrailIds` de `useForgeMethod.ts:45` (`identity-guard` vs canon `identity`) :
  divergence réelle mais **hors sujet clés de rôle** — à cadrer séparément si voulu.
- Les tests à clés synthétiques (§ 2.3) : hygiène optionnelle, hors AC.
