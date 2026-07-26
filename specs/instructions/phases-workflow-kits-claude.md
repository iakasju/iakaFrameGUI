# Instruction — Section **phases/workflow** dans le kit **Claude Code** (et pourquoi pas Open WebUI)

> Cadrage + arbitrage P1, **2026-07-26**, rendus par 🟡 Odin **en autonomie** (mandat explicite du
> décideur : « go autonomie »). Le backlog portait l'item comme un **arbitrage à trancher** :
> *« afficher la section phases/workflow aussi dans les kits Claude Code / Open WebUI »*.
>
> **Tous les constats du § 0 ont été mesurés le 2026-07-26** — `preuve-avant-declaration`.

---

## 0. État mesuré

| Adaptateur | Artefact produit | Section phases |
|---|---|---|
| `agentsMd.ts` (codex) | `AGENTS.md` — **fichier-contrat d'équipe** | ✅ `renderWorkflowMarkdown(...)` |
| `claudeCode.ts` | `CLAUDE.md` — **fichier-contrat d'équipe** | ❌ absente |
| `openwebui.ts` | `models/<persona>.json` — **un Model par persona**, `params.system` | ❌ absente |

Le rendu est **déjà factorisé et pur** : `renderWorkflowMarkdown(workflow)` dans `workflow.ts`, et la
résolution suit le moule éprouvé `opts?.workflow ?? resolveWorkflow(opts?.method)` — injection P6b
d'abord, Méthode du Kit ensuite, canonique en dernier recours.

---

## 1. L'arbitrage — **OUI pour Claude Code, NON pour Open WebUI**

Le backlog mettait les deux dans le même sac. **La mesure les sépare** : ce ne sont pas deux formats
du même objet, ce sont deux objets différents.

### 1.1 Claude Code — **oui**, c'est le jumeau exact de codex

`CLAUDE.md` et `AGENTS.md` sont le **même artefact** : un fichier-contrat **d'équipe**, en markdown,
lu par le runner au démarrage. Que l'un porte le processus de travail et pas l'autre est une
**asymétrie non voulue**, pas une décision : un kit Claude Code déployé perd aujourd'hui l'information
de workflow que le kit codex conserve. C'est une **perte fonctionnelle réelle**, pas un manque cosmétique.

### 1.2 Open WebUI — **non**, et ce n'est pas un renoncement

`openwebui.ts` ne produit **aucun** fichier-contrat d'équipe : il produit **un Model JSON par
persona**, dont `params.system` répond à la question *qui es-tu*. Y injecter le workflow de l'équipe
entière reviendrait à :

- **dupliquer** le même tableau dans **chaque** persona (N copies d'une donnée d'équipe) ;
- **mélanger les registres** : un system prompt décrit une identité, pas le processus collectif ;
- pousser un **tableau markdown** dans un champ JSON destiné à de la prose.

Porter le workflow dans Open WebUI supposerait un **artefact d'équipe séparé**, qui n'existe pas dans
ce format. C'est un chantier distinct, pas une addition — **hors périmètre**, inscrit au backlog.

---

## 2. Périmètre

| # | Fichier | Ce qui bouge |
|---|---|---|
| 1 | `packages/core/src/adapters/claudeCode.ts` | `renderClaudeMd` gagne la section, **au même rang** que dans `AGENTS.md` (après la Team, avant la Méthode) |
| 2 | tests | golden dédié + **non-régression sans `method`/`workflow`** |

**Aucun changement Rust. Aucun autre adaptateur touché.**

---

## 3. Invariants

- **I-1 — Sans `method` ni `workflow`, la sortie est le canonique**, comme pour `AGENTS.md`. Le kit
  reste **pur** : aucune donnée d'exécution n'entre par cette porte.
- **I-2 — Un seul rendu.** On appelle `renderWorkflowMarkdown`, on ne le réimplémente pas : deux
  rendus divergeraient en silence, exactement comme deux copies d'une persona.
- **I-3 — Même ordre de résolution que codex** (`opts?.workflow ?? resolveWorkflow(opts?.method)`).

---

## 4. Critères d'acceptation

- **AC-1** — `CLAUDE.md` porte la section, **au même rang** que dans `AGENTS.md`.
- **AC-2** — Le **tableau rendu est identique** à celui de `AGENTS.md` pour un même workflow —
  preuve directe de I-2 (comparaison des deux sorties dans un test).
- **AC-3** — Un `workflow` injecté (P6b) **prime** sur celui de la Méthode.
- **AC-4** — `lint:all` et `test:all` à `0`, cités ; compte de tests non diminué.

---

## 5. Hors périmètre

- **Open WebUI** (§ 1.2) : demanderait un artefact d'équipe qui n'existe pas dans ce format.
- Toute modification de `renderWorkflowMarkdown` ou du modèle `Workflow`.
