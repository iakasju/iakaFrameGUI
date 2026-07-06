# Instruction P3c — Adaptateur de runner Open WebUI (Models JSON) : 5e nœud (MVP)

> **Phase** : P3c — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Fondations** : `specs/instructions/P3-adaptateur-runner-generation-deploiement.md` (interface `RunnerAdapter`
> + générateur pur + `kit_deploy`), `specs/instructions/P3b-adaptateurs-codex-ollama.md` (famille sans hooks →
> **`GuardrailRendering.prose`**, builder mutualisé, registre), `specs/instructions/P2-coeur-partage-refactor-cli.md`
> (`NodeKind`/`KitFormat` + parité miroir CLI), `specs/instructions/P4-ui-generer-deployer.md`
> (`NodeSelector` peuplé par `implementedNodes()`).
> **Gabarits in-repo réutilisés (étape 0)** : `iakaframe/kit-openwebui/models/*.json` (forme exacte d'un Model),
> `iakaframe/kit-openwebui/AGENTS.md:47-80` (rituel d'identité embarqué).

---

## 1. Objectif

Ajouter le **5e nœud `openwebui`** à la forge : un **3e format** de kit, distinct d'`AGENTS.md` (codex/ollama) et
de `CLAUDE.md` (Claude Code) — les **Models JSON importables** d'Open WebUI, **un Model par persona**
(`models/<personaId>.json`), importables dans *Workspace > Models*.

Comme codex/ollama, Open WebUI **n'a pas de hooks** → le canal d'identité et les gardes s'embarquent en **prose**
dans le **system prompt** du Model (`params.system`), via le rendu **`prose`** du `GuardrailRendering` **déjà en
place (P3b)**. P3c est donc surtout : un **nouveau conteneur** (JSON Model) autour du **même texte de garde
éprouvé**, et le passage à **5 nœuds implémentés**.

---

## 2. Étape 0 (in-repo, sans web) — forme exacte d'un Model Open WebUI

> Le format est **vérifiable dans le dépôt** — pas de doc externe. Le développeur-devops **note ce qu'il réutilise**
> dans `specs/notes/openwebui-models-<date>.md`.

**Forme confirmée** (d'après `kit-openwebui/models/gandalf.json`, `odin.json`) — un Model = un objet JSON :

| Champ | Rôle | Génération P3c |
|---|---|---|
| `id` | slug du Model | = `persona.id`. |
| `name` | nom affiché | = `persona.name` (nommage libre). |
| **`base_model_id`** | **le modèle de base** | ⚠️ **champ « modèle » — tension AR-1** (§ 3). |
| `params.system` | **system prompt** | = rôle + mission + **rituel d'identité en prose** (`guardrail(identity).prose`) + périmètre (`perimeter.prose`). **Le cœur du livrable.** |
| `meta.description` | courte description | dérivée du rôle (ASCII, comme les gabarits). |
| `meta.capabilities` | `{vision,usage,citations}` | valeurs **neutres** par défaut (`vision:false` sauf rôle graphisme ; à cadrer minimal — Q-5). |
| `meta.suggestion_prompts[]` | amorces | optionnel ; dérivable du rôle (ou omis au MVP). |
| `meta.tags[]` | tags | `[{name:"iakaframe"}]` (+ `methodId` éventuel, agnosticisme). |
| `access_control` | ACL | `null` (comme gabarits). |
| `is_active` | actif | `true`. |
| `created_at`/`updated_at` | timestamps | valeur **stable/déterministe** (constante), pas `Date.now()` (déterminisme — § 6). |

**Réutilisé** : la structure JSON complète des gabarits + le **texte d'identité** de `kit-openwebui/AGENTS.md:47-80`
(déjà source de `GuardrailRendering.prose` en P3b) → **aucune réécriture créative** du rituel.

---

## 3. Point d'arbitrage structurant — `base_model_id` vs AR-1

**La tension.** Un Model Open WebUI référence un `base_model_id` (les gabarits historiques mettent
`deepseek-r1:latest`, `qwen3:latest`…). Or **AR-1** : **la forge ne pose PAS de modèle** (le modèle = run-time,
Cockpit). Fixer `base_model_id` **violerait** l'invariant.

**Reco (à confirmer — Q-1) : NE PAS fixer de modèle.** `base_model_id` est **laissé vide** (`""`) — un
**placeholder documenté** que l'utilisateur **règle à l'import** dans Open WebUI (le sélecteur de base model de
l'écran d'édition d'un Model). Justification :
- **cohérent AR-1** : la forge décrit un **persona/rôle**, jamais un modèle ;
- **honnête** : le kit est « prêt à recevoir un modèle », le choix reste au run-time (Cockpit / l'utilisateur
  Open WebUI) ;
- **non bloquant** : Open WebUI permet de choisir le base model à l'import / après.

> **Variante si `base_model_id:""` est refusé à l'import par Open WebUI** (à vérifier à l'étape 0) : émettre un
> placeholder **explicite non-modèle** (ex. `"<a-configurer>"`) accompagné d'une note dans `meta.description`
> (« choisir le modèle de base à l'import »). **Jamais** un vrai tag de modèle. → Q-1.

**Autres champs « qui sentent le modèle »** : ne fixer **aucun** paramètre d'inférence lié au modèle
(`params.temperature`, `num_ctx`, etc.) — laissés **absents** (défaut Open WebUI). Seul `params.system` est peuplé.

---

## 4. Périmètre — IN / OUT

### 4.1 DANS le périmètre P3c

1. **`NodeKind.openwebui`** ajouté au vocab `@iakaframe/core` (avec le même soin qu'en P2 : enum + **parité miroir
   CLI** si le CLI a un miroir de `NodeKind` — **à vérifier** ; sinon signaler) + **rétro-compat** (aucune valeur
   existante changée).
2. **`KitFormat.openwebui-models`** *(nouveau)* : le format Models JSON (≠ `claude-md`, ≠ `agents-md`). Décision et
   justification en § 5.
3. **Adaptateur `openwebui`** : `generate(team) → KitFileTree` produisant **un `models/<personaId>.json` par
   persona**, `params.system` = system prompt du rôle + **rituel d'identité en prose** + périmètre ; **aucun modèle
   fixé** (§ 3). `.mcp.json` selon Q-4 (par défaut **omis** — cf. § 5.3).
4. **Registre** → `openwebui` `implemented:true` (**5 nœuds**), interface `RunnerAdapter` **stable**.
5. **Réutilisation** : générateur **pur** (core, sans I/O, testable sans nœud) + **`kit_deploy` INCHANGÉ** + le
   **builder de gardes prose** mutualisé de P3b (le texte d'identité/périmètre est **le même**, seul le conteneur
   change).

### 4.2 HORS périmètre P3c

- **Workflows** → différés.
- **Liaison runner + modèle** (dont `base_model_id` réel) → **Cockpit** (run-time).
- **UI** : **aucun code UI** — le `NodeSelector` (P4) se peuple via `implementedNodes()` → le 5e nœud **doit
  apparaître automatiquement**. **Vérifier** (critère O-6) ; si un mapping de libellé en dur existe côté UI, le
  **signaler** (mais ne pas l'étendre en P3c au-delà d'une entrée de libellé triviale).
- **`MODELES.md` / table modèle↔rôle** → **non généré** (AR-1).
- **Slash-commands `prompts/`, Tools/Functions/Pipelines** Open WebUI (cf. `kit-openwebui/AGENTS.md:101-102`) →
  hors MVP.
- **Adaptateur de méthode** → P∞.

---

## 5. Décisions de modélisation

### 5.1 KitFormat — nouveau `openwebui-models` (justifié)
Le format Models JSON est **structurellement différent** des deux existants : ni un contrat markdown unique
(`CLAUDE.md`/`AGENTS.md`) ni une arborescence `.claude/`, mais **N fichiers JSON** (un par persona), chacun un objet
importable. → **un `KitFormat` dédié `openwebui-models`** (plutôt que réutiliser `agents-md`), pour que
`contractFileForNode`/la logique de format **distinguent** proprement les trois familles. Cohérent avec la ligne
P2 « format ≠ nœud ».

### 5.2 Où vit le code
| Brique | Emplacement |
|---|---|
| `NodeKind.openwebui` + `KitFormat.openwebui-models` | `@iakaframe/core/src/node.ts` (+ `vocab.json` pour la parité CLI P2) |
| Adaptateur `openwebui` (pur) | `@iakaframe/core/src/adapters/openwebui.ts` |
| Registre | `@iakaframe/core/src/adapters/registry.ts` → `openwebui: implemented:true` |
| Gardes prose (réutilisées) | `@iakaframe/core/src/guardrail.ts` (P3b) — **inchangé** |
| Déploiement | **Forge Rust `kit_deploy` — INCHANGÉ** |

### 5.3 MCP pour Open WebUI ?
Open WebUI n'a pas de mécanisme `.mcp.json` équivalent à Claude Code ; ses outils passent par Tools/Functions/
Pipelines (hors MVP). **Reco (Q-4) : ne PAS générer de `.mcp.json` pour `openwebui`** ; si la team déclare des
connecteurs, les **ignorer** pour ce nœud **avec une note** (dans `meta.description` ou un fichier `README`
optionnel) plutôt que produire un artefact non exploitable. → Confirmer.

---

## 6. Ce qui est généré (forme exacte)

`generate(team, "openwebui")` → `KitFileTree` :

| Fichier | Contenu |
|---|---|
| `models/<personaId>.json` (un par persona, N fichiers) | objet Model : `id`=persona.id, `name`=persona.name, **`base_model_id`=""** (§ 3), `params.system`=**system prompt du rôle + rituel d'identité (prose) + périmètre**, `meta.{description,capabilities,tags}`, `access_control:null`, `is_active:true`, timestamps **constants**. **Aucun paramètre d'inférence.** |

**Invariants de génération** :
- **Zéro modèle fixé** : `base_model_id` vide (ou placeholder non-modèle) ; aucun `params.temperature`/`num_ctx`/… ;
  aucun tag de modèle. Test O-4.
- **Déterminisme** : même team → mêmes fichiers (timestamps constants, tri des personas par `roleIndex`).
- **JSON valide et parsable** : chaque fichier `JSON.parse`-able et conforme à la forme des gabarits.
- **Fidélité d'identité** : `params.system` contient les **mêmes règles** de badge/position/verbatim que le hook et
  que la prose codex/ollama (réutilisation de `guardrail(identity).prose`, pas de réécriture).

---

## 7. Ce qu'on réutilise (ne rien réécrire)

| Réutilisé | Source | Usage P3c |
|---|---|---|
| `GuardrailRendering.prose` (identité + périmètre) | P3b | injecté dans `params.system`. |
| Builder de sections prose | P3b (builder mutualisé) | réutilisé pour composer le system prompt. |
| Interface `RunnerAdapter` + registre | P3 | ajoute `openwebui`, signatures **inchangées**. |
| `kit_deploy` / `kitDeploy` | P3 | écrit les `models/*.json` ; **inchangé**. |
| `implementedNodes()` + `NodeSelector` | P2/P4 | le 5e nœud apparaît **sans code UI**. |
| Gabarits Models JSON | `kit-openwebui/models/*.json` | forme de référence. |

---

## 8. Critères d'acceptation (vérifiables)

P3c est **PASS** si **tous** les points sont vérifiés :

- **O-1 — Vocab.** `@iakaframe/core` exporte `NodeKind.openwebui` et `KitFormat.openwebui-models` ; **parité CLI** :
  si le CLI tient un miroir de `NodeKind`/`KitFormat` (P2), il est mis à jour et le **test de parité est vert** ;
  s'il n'en tient pas, le **signaler** dans la note (pas de miroir à créer). **Rétro-compat** : aucune valeur
  existante modifiée.
- **O-2 — Registre : 5 nœuds implémentés.** `claude`, `codex`, `ollama-localhost`, `ollama-lan`, `openwebui` en
  `implemented:true` ; interface `RunnerAdapter` **stable** ; adaptateurs P3/P3b **non modifiés** (non-régression
  verte).
- **O-3 — Génération : N Models valides.** `generate(team_gabarit, "openwebui")` produit **un
  `models/<personaId>.json` par persona** (7), chacun **`JSON.parse`-able** et conforme à la forme des gabarits
  (`id`, `name`, `params.system`, `meta`, `access_control`, `is_active`).
- **O-4 — Zéro modèle fixé (AR-1).** Aucun Model généré ne porte un **modèle réel** : `base_model_id` est **vide**
  (ou placeholder non-modèle documenté) ; **aucun** `params.temperature`/`num_ctx`/tag de modèle. `grep`/assertion
  automatisée sur les N fichiers.
- **O-5 — Rituel d'identité en prose fidèle.** `params.system` de chaque Model contient les **mêmes règles** que le
  hook/prose (badge `[ROYAUME][Persona]`, position ouverture/clôture, START/STOP bannis, verbatim/anti-ventriloquie)
  — test comparant les invariants clés à `guardrail(identity).prose`.
- **O-6 — UI automatique.** Le `NodeSelector` (P4) affiche **`openwebui`** **via `implementedNodes()`** **sans code
  UI nouveau** (test/inspection) ; si un libellé lisible manque, l'ajout se limite à **une entrée de libellé**
  (signalée).
- **O-7 — Déploiement inchangé.** `kit_deploy`/`kitDeploy` écrit les `models/*.json` dans un tmp dir **sans
  modification** de la commande Rust ; non destructif + pathguard conservés (test).
- **O-8 — Pur & testable sans nœud.** Tous les tests tournent **sans Open WebUI** (générateur pur + inspection).
- **O-9 — Non-régression P3/P3b/P4.** Les tests des 4 nœuds antérieurs et de l'UI P4 restent **verts**.
- **O-10 — Qualité.** `@iakaframe/core` typecheck + tests verts ; front lint/test verts. **O-11 — Rôles jamais en
  noms de code** (doc/UI ; `name` de persona = donnée).

---

## 9. Dépendances, risque & questions d'arbitrage

**Dépendances**
- **P3 / P3b livrés** (interface, gardes prose, `kit_deploy`, registre) ; **P4** (UI via `implementedNodes()`).
- **Gabarits in-repo** `kit-openwebui/models/*.json` (fait).

**Risque** — faible : P3c est un **nouveau conteneur** autour d'un texte de garde **déjà éprouvé** ; le seul point
sensible est **`base_model_id` vs AR-1** (§ 3), tranché par la reco « vide/placeholder », plus la **vérification à
l'étape 0** que Open WebUI accepte un base model vide à l'import.

**Questions d'arbitrage (prose)**
- **Q-1 — `base_model_id` : vide `""` (reco) ou placeholder `"<a-configurer>"` ?** *Reco : **vide**, documenté dans
  `meta.description` (« régler le modèle de base à l'import ») — cohérent AR-1.* Si Open WebUI **refuse** un base
  vide à l'import (à vérifier étape 0), basculer sur le **placeholder explicite non-modèle**. **Jamais** un vrai
  modèle. → *Trancher.*
- **Q-2 — `KitFormat.openwebui-models` dédié (reco) ou réutiliser un format existant ?** *Reco : **dédié*** (format
  structurellement distinct : N JSON vs 1 markdown vs arbo `.claude/`). → *Confirmer.*
- **Q-3 — Parité CLI du `NodeKind`.** À l'exécution, **vérifier** si le CLI tient un miroir de `NodeKind`/`KitFormat`
  (P2). *Reco : si oui, l'aligner + test de parité ; si non, ne rien créer, juste noter.* → *Confirmer la conduite.*
- **Q-4 — MCP pour Open WebUI.** *Reco : **ne pas générer** de `.mcp.json`* (pas de mécanisme MCP natif ; Tools/
  Functions hors MVP) ; connecteurs déclarés → **notés, non matérialisés** pour ce nœud. → *Confirmer.*
- **Q-5 — Richesse du `meta`.** MVP minimal (`description` + `tags` + `capabilities` neutres) ou reprendre aussi
  `suggestion_prompts` des gabarits ? *Reco : **minimal** (description + tags + capabilities), suggestion_prompts
  optionnelles/différées.* → *Confirmer.*

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5.

---

## 10. Phasage interne (un seul livrable P3c)

| Étape | Contenu | Critères |
|---|---|---|
| **0. Gabarits** | note `openwebui-models-<date>.md` + vérif base model vide à l'import | O-4 (assise) |
| **1. Vocab** | `NodeKind.openwebui` + `KitFormat.openwebui-models` + parité CLI | O-1 |
| **2. Adaptateur** | `openwebui.ts` (Model JSON par persona, system=prose) + registre 5 nœuds | O-2, O-3, O-4, O-5 |
| **3. Intégration** | UI auto (`implementedNodes()`) + déploiement tmp inchangé | O-6, O-7, O-8 |
| **4. Non-régression + qualité** | P3/P3b/P4 verts + typecheck/tests | O-9, O-10, O-11 |

---

## 11. Journal de décision

- **2026-07-06** — Cadrage P3c (l'architecte-cadreur) : **5e nœud `openwebui`** → **3e format `openwebui-models`**
  (Models JSON, un par persona), `params.system` = rôle + **rituel d'identité en prose** (réutilise
  `GuardrailRendering.prose` de P3b, **jamais réécrit**). **Tension `base_model_id`/AR-1 tranchée** : **aucun modèle
  fixé** — `base_model_id` **vide** (repli placeholder non-modèle si l'import l'exige), aucun paramètre d'inférence.
  Registre à **5 nœuds implémentés**, interface stable, adaptateurs P3/P3b et `kit_deploy` **inchangés**. UI P4
  **automatique** via `implementedNodes()`. Étape 0 **in-repo** (`kit-openwebui/models/*.json`). Arbitrages Q-1→Q-5.
