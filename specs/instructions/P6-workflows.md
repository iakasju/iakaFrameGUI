# Instruction P6 — Workflows (concept de 1re classe extrait en donnée) (MVP)

> **Phase** : P6 — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Fondations** : `specs/contrat-concepts.md` (§ 2.7 **Workflow** — possédé par la forge, différé jusqu'ici ;
> § 0.4 agnosticisme AR-9), `specs/instructions/P3-*.md` / `P3b-*.md` / `P3c-*.md` (les 3 adaptateurs qui émettent
> aujourd'hui une section **phases/gates codée en dur**), `specs/instructions/P1-*.md` (schéma `Team`).
> **Source de vérité de la méthode (fidélité)** : `iakaframe/methode-de-travail.md` (§ phases / jalons) ; miroir
> in-repo des phases/gates : `iakaframe/kit-codex/AGENTS.md:51-67`, `iakaframe/kit-openwebui/AGENTS.md:33-43`.

---

## 1. Objectif & contexte

Dans le contrat de concepts (P0), **Workflow** est un concept **possédé par la forge**, resté **différé**.
Aujourd'hui, les trois adaptateurs (`claudeCode` P3, `agentsMd` P3b, `openwebui` P3c) émettent une section
**« 3 phases / gates / cadrage avant code » CODÉE EN DUR** — le workflow canonique iakaframe figé dans le code de
génération.

**P6 = extraire ce workflow en DONNÉE** et faire que les adaptateurs le **rendent depuis le modèle**, pour qu'il
devienne **paramétrable** — indispensable au north-star multi-méthodes (BMAD/MetaGPT/SPARC ont d'autres phases,
AR-9). **Non-régression impérative** : avec le workflow canonique par défaut, la sortie générée reste **équivalente
à aujourd'hui**.

---

## 2. Le modèle `Workflow` / `Phase` / `Gate` (`@iakaframe/core`)

```ts
// @iakaframe/core/src/workflow.ts

/** Type de gate d'une phase. */
export type GateKind = "human" | "auto";

export interface Gate {
  kind: GateKind;                 // humain (validation décideur) | auto (qualité)
  /** Libellé de la condition de franchissement (ex. "validation d'instruction",
   *  "PASS qualité (typecheck/lint/tests)", "feu vert humain"). */
  condition: string;
  /** Optionnel — jalon : rôle émetteur → rôle récepteur (clés de rôle canoniques). */
  from?: string;                  // roleKey (ex. "architecture")
  to?: string;                    // roleKey (ex. "coordination")
}

export interface Phase {
  id: string;                     // slug stable (ex. "cadrage")
  order: number;                  // 0..N-1 (ordre d'exécution)
  name: string;                   // libellé (ex. "Cadrage")
  description: string;            // courte : entrée → sortie
  roleKeys: string[];            // rôles porteurs (clés canoniques ; ≥1)
  gate: Gate;
  /** hors chaîne principale (ex. squad prod déclenché sur feu vert). */
  offChain?: boolean;
}

export interface Workflow {
  id: string;                     // slug stable (ex. "iakaframe-canonical")
  name: string;
  methodId: string;               // agnosticisme (AR-9) — "iakaframe" au MVP
  phases: Phase[];                // ordonnées par `order`
}
```

- **Pur, sans I/O** ; parseurs défensifs (`parseWorkflow`) calqués sur les autres types du cœur.
- **Agnosticisme (AR-9)** : `methodId` présent ; le workflow est une **donnée** — iakaframe n'en est qu'une
  **instance**. Aucun « iakaframe-only » hard-wiré dans la logique de rendu.

---

## 3. Le workflow canonique iakaframe (contenu exact, fidèle à la méthode)

**`IAKAFRAME_CANONICAL_WORKFLOW`** exporté par `@iakaframe/core` — fidèle à `methode-de-travail.md` et au miroir
`kit-codex/AGENTS.md:51-67` :

| order | id | name | description (entrée → sortie) | roleKeys | gate |
|---|---|---|---|---|---|
| 0 | `cadrage` | **Cadrage (P1)** | besoin → `specs/instructions/<feature>.md` | `architecture` | **human** — « le décideur valide l'instruction » (from `architecture` → to `coordination`) |
| 1 | `realisation` | **Réalisation (P2)** | instruction → branche + commits + tests verts | `fabrication`, `tests` | **auto** — « PASS qualité (typecheck/lint/tests) » |
| 2 | `staging` | **Déploiement staging (P3)** | PASS → build/déploiement staging (`vX.Y.Z-rc`) | `fabrication`, `tests` | **auto** — « build/déploiement staging OK » |
| 3 | `prod` | **Squad prod** *(offChain)* | staging → mise en production, surveillance, rollback | `coordination` *(squad prod)* | **human** — « feu vert humain » (`offChain:true`) |

> **Fidélité (non-régression sémantique)** : trois phases cible-staging (cadrage → réalisation → staging), gate
> **humain** au cadrage, gates **auto** en réalisation/staging, **squad prod hors chaîne** sur feu vert humain —
> exactement la structure des kits actuels (`kit-openwebui/AGENTS.md:33-43`). **Aucune** table modèle (AR-1).
>
> **Rôles en clés canoniques** : `architecture`=cadrage, `fabrication`=dev, `tests`=qualité, `coordination`=chef/
> squad. En **doc/rendu**, on emploie les **libellés de rôle**, jamais les noms de code.

---

## 4. Comment la Team référence le workflow — décision

**Décision (reco Q-1) : référence par ID + repli canonique.** `Team` gagne un champ **optionnel** `workflowId?:
string` ; **absent/inconnu → workflow canonique** (`IAKAFRAME_CANONICAL_WORKFLOW`). Le catalogue de workflows vit
dans `@iakaframe/core` (au MVP : **un seul**, le canonique).

```ts
interface Team {
  // … champs P1 (personas pures, coordinator, connectors, methodId, vignetteTeam) …
  workflowId?: string;          // NOUVEAU — défaut : workflow canonique si absent/inconnu
}
```

- **Pourquoi ID référencé plutôt qu'embarqué** : (a) **non-régression triviale** (les teams P1 existantes n'ont pas
  le champ → repli canonique → sortie inchangée) ; (b) **team reste légère** (pas de duplication du workflow dans
  chaque team) ; (c) **agnosticisme** : un jour, plusieurs workflows au catalogue, la team en **choisit** un.
- **Résolution** : `resolveWorkflow(team) → Workflow` = catalogue[`team.workflowId`] **sinon** canonique. Défensif :
  jamais d'exception, toujours ≥ le canonique.
- **Invariant team pure** : le workflow **ne pose aucun modèle/runner** — c'est de la structure de phases/gates.

---

## 5. Rendu par les adaptateurs (remplacer le texte codé en dur)

Chaque adaptateur **résout** le workflow de la team (`resolveWorkflow`) puis **rend** la section phases/gates
**depuis la donnée**, au lieu du littéral figé. Le rendu est **mutualisé** (une fonction pure partagée) pour
garantir un texte cohérent entre les trois familles :

- **`renderWorkflowMarkdown(workflow) → string`** *(nouveau, `@iakaframe/core`)* : produit la **section markdown**
  « Les phases (cible : staging) + squad prod » — un tableau `| Phase | Rôle | Entrée → Sortie | Gate |` + la note
  squad prod, **identique** au texte actuel pour le workflow canonique.
- **`claudeCode`** : injecte cette section dans le `CLAUDE.md` généré (là où le texte était en dur).
- **`agentsMd`** (codex, ollama-localhost/lan) : injecte la même section dans `AGENTS.md`.
- **`openwebui`** : injecte la section dans `params.system` de chaque Model (là où le rituel de phases figurait).

### 5.1 Preuve de NON-RÉGRESSION (impératif)
- **Golden test** : pour chaque adaptateur, générer un kit **avant/après** avec une team au **workflow canonique
  par défaut** ; la section phases/gates rendue est **byte-identique** (ou les tests P3/P3b/P3c existants restent
  **verts sans modification de leurs attentes**). Si un ajustement cosmétique est inévitable, il est **appliqué au
  golden** et **justifié**, jamais une dérive sémantique.
- **Méthode** : extraire d'abord le **littéral actuel** en `IAKAFRAME_CANONICAL_WORKFLOW` + `renderWorkflowMarkdown`
  **calés pour reproduire ce littéral**, puis brancher les adaptateurs → la sortie ne bouge pas.

---

## 6. Périmètre — IN / OUT

### 6.1 DANS le périmètre P6
1. Concept **`Workflow`/`Phase`/`Gate`** dans `@iakaframe/core` (+ parseurs).
2. **`IAKAFRAME_CANONICAL_WORKFLOW`** (§ 3) + catalogue (un seul au MVP) + `resolveWorkflow(team)`.
3. **`Team.workflowId?`** (repli canonique) — schéma P1 étendu, non destructif.
4. **`renderWorkflowMarkdown`** + branchement des **3 adaptateurs** (rendu depuis la donnée), **pur/testable**.
5. **Golden/non-régression** : sortie canonique inchangée (P3/P3b/P3c verts).
6. *(Optionnel, léger — Q-2)* **Affichage read-only** du workflow d'une team (les phases/gates) dans l'UI existante.

### 6.2 HORS périmètre P6 (différés)
- **UI d'édition de workflow** (créer/réordonner phases, changer gates) → **lot ultérieur** (reco § 8, Q-2).
- **Workflows custom / multi-méthodes** (BMAD/MetaGPT/SPARC) → **north-star, aucun code** (seule l'agnosticisme est
  honorée : `methodId` + donnée paramétrable).
- **Liaison runner/modèle** → Cockpit.
- **`kit_deploy`** → **INCHANGÉ**.
- **Parité CLI** : le Workflow n'est **pas** dans le miroir de vocab CLI (P2 miroir = `NodeKind`/`KitFormat`/
  `RunnerKind`). **À vérifier/annoncer** : si le CLI ne référence pas de workflow, **rien à aligner** (le workflow
  est un concept forge, consommé par les adaptateurs du cœur, pas par le CLI). *(Constat attendu : hors miroir CLI.)*

---

## 7. Critères d'acceptation (vérifiables)

P6 est **PASS** si **tous** les points sont vérifiés :

- **W-1 — Workflow modélisé + canonique exporté.** `@iakaframe/core` exporte `Workflow`/`Phase`/`Gate` et
  **`IAKAFRAME_CANONICAL_WORKFLOW`** conforme au § 3 (4 phases dont `prod` `offChain`, gates human/auto aux bons
  endroits). Parseur défensif testé.
- **W-2 — Team référence le workflow, repli canonique.** `Team.workflowId?` existe ; `resolveWorkflow(team)` renvoie
  le canonique si absent/inconnu (test) ; une team P1 **sans** le champ → **canonique** (non-régression du schéma).
- **W-3 — Les 3 adaptateurs rendent depuis la donnée.** `claudeCode`, `agentsMd`, `openwebui` produisent la section
  phases/gates **via `renderWorkflowMarkdown(resolveWorkflow(team))`** — **plus aucun littéral de phases codé en
  dur** dans les adaptateurs (grep : la section provient du renderer).
- **W-4 — Non-régression de sortie (le point critique).** Pour une team au workflow **canonique**, le kit généré
  par chaque adaptateur est **équivalent à avant P6** : les **tests P3/P3b/P3c restent verts** (ou leurs golden sont
  **byte-identiques** ; tout ajustement cosmétique est justifié et **sans dérive sémantique**).
- **W-5 — Zéro modèle.** Le workflow et son rendu **ne posent aucun modèle/runner** ; les kits générés restent
  **sans `base_model_id`/model/table de modèles** (invariant AR-1, re-vérifié).
- **W-6 — Agnosticisme.** `methodId` présent sur `Workflow`/`Team` ; la logique de rendu **ne hard-wire pas**
  « iakaframe » (elle rend **n'importe quel** workflow bien formé — test avec un workflow **factice** à 2 phases qui
  se rend correctement, **sans** être le canonique).
- **W-7 — Pur & testable sans nœud.** Modèle + renderer + résolution testés en isolation (pas de nœud, pas d'I/O).
- **W-8 — Non-régression P4/P5.** UI « Générer & Déployer » (P4) et skin (P5) **inchangés/verts** ; si l'affichage
  read-only (Q-2) est inclus, il n'altère aucune logique.
- **W-9 — Parité CLI vérifiée.** Le Workflow **n'entre pas** dans le miroir de vocab CLI (constat annoncé dans la
  note) → **rien à aligner** ; si un lien inattendu existe, le signaler (test/inspection).
- **W-10 — Qualité.** `@iakaframe/core` typecheck + tests verts ; front lint/test/build verts. **W-11 — Rôles jamais
  en noms de code** (rendu par libellés de rôle).

---

## 8. Dépendances, risque & questions d'arbitrage

**Dépendances**
- **P3/P3b/P3c livrés** (adaptateurs + golden/tests existants), **P1** (schéma Team).
- **Source de fidélité** : `methode-de-travail.md` (§ phases/jalons) + miroir kits in-repo.

**Risque** — modéré, **concentré sur la non-régression** (W-4) : extraire un texte figé sans en changer la sortie.
Neutralisé par la **méthode « littéral → donnée calée pour reproduire le littéral »** (§ 5.1) + golden tests.
Risque secondaire : réintroduire un modèle via une phase → W-5.

**Questions d'arbitrage (prose)**
- **Q-1 — Team : `workflowId` référencé (reco) ou workflow embarqué ?** *Reco : **référencé** + repli canonique*
  (non-régression triviale, team légère, agnosticisme). Embarqué = plus autonome mais duplique et alourdit la
  non-régression. → *Trancher.*
- **Q-2 — UI du workflow : read-only dans P6 (reco léger) ou entièrement différée ?** *Reco : **affichage
  read-only** minimal* (montrer les phases/gates de la team choisie, ex. dans Teams ou Deploy) — **pas d'éditeur**.
  L'**éditeur de workflow** (réordonner/ajouter des phases, changer les gates) = **lot ultérieur** dédié. →
  *Confirmer (ou tout différer si tu préfères P6 100 % backend).*
- **Q-3 — Granularité du gate.** *Reco : `Gate { kind: human|auto, condition, from?, to? }`* — suffisant pour rendre
  le texte et, plus tard, piloter. Alternative plus riche (types de gate multiples, conditions structurées) =
  sur-ingénierie au MVP. → *Confirmer.*
- **Q-4 — `prod` : phase `offChain` ou entité séparée ?** *Reco : **phase `offChain:true`** dans le même workflow*
  (le squad prod fait partie de la méthode, mais hors chaîne cible-staging) — fidèle et simple. → *Confirmer.*
- **Q-5 — Catalogue de workflows : dans le cœur (reco) ou ailleurs ?** *Reco : **`@iakaframe/core`*** (le workflow
  est un concept du cœur, comme rôles/skills) ; un seul (canonique) au MVP. → *Confirmer.*

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5.

---

## 9. Phasage interne (un seul livrable P6)

| Étape | Contenu | Critères |
|---|---|---|
| **1. Modèle** | `Workflow`/`Phase`/`Gate` + parseurs + `IAKAFRAME_CANONICAL_WORKFLOW` + catalogue + `resolveWorkflow` | W-1, W-2, W-6, W-7 |
| **2. Renderer** | `renderWorkflowMarkdown` **calé sur le littéral actuel** + tests golden | W-3, W-4 |
| **3. Branchement adaptateurs** | claudeCode / agentsMd / openwebui rendent depuis la donnée ; retrait des littéraux | W-3, W-4, W-5 |
| **4. Team + (opt) read-only** | `Team.workflowId?` + repli ; affichage read-only si Q-2 | W-2, W-8 |
| **5. Non-régression + qualité** | P3/P3b/P3c/P4/P5 verts + parité CLI vérifiée | W-4, W-8, W-9, W-10, W-11 |

---

## 10. Journal de décision

- **2026-07-06** — Cadrage P6 (l'architecte-cadreur) : **Workflow** promu **concept de 1re classe en donnée**
  (`Workflow`/`Phase`/`Gate` dans `@iakaframe/core`) ; **workflow canonique iakaframe** (cadrage→réalisation→staging
  + squad prod `offChain`, gates human/auto) fidèle à `methode-de-travail.md`. **Team référence par `workflowId`**
  (repli canonique — non-régression triviale). Les **3 adaptateurs rendent la section phases/gates DEPUIS la
  donnée** (`renderWorkflowMarkdown`), remplaçant le texte codé en dur, avec **preuve de non-régression** (golden
  byte-identique / tests P3–P3c verts). Invariants : **zéro modèle** (AR-1), canal d'identité inchangé,
  **agnosticisme AR-9** (rend n'importe quel workflow bien formé). **UI éditeur différée** ; read-only optionnel.
  `kit_deploy` inchangé ; Workflow **hors** miroir vocab CLI. Arbitrages Q-1→Q-5.
