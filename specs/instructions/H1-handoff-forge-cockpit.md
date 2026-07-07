# Instruction : H1 — Le HANDOFF forge → cockpit (format d'échange & pont de modèles)

> Rédigé par 🧙 Gandalf (P1 — cadrage). Consommé par 🪓 Gimli (exécution), gate 🏹 Legolas.
> **Statut : CADRÉ — À VALIDER par Stéphane (gate humain obligatoire — touche LES DEUX apps).**
> Doc en français ; code/identifiants en anglais ; **rôles jamais désignés par un nom de code**.
> **Décision portefeuille encadrante (Stéphane, 2026-07-07) : DEUX logiciels séparés.**
> - **Forge** (iakaFrameGUI) = **CRÉE et LIVRE** (authoring canonique d'une team/méthode + déploiement d'un artefact).
> - **Cockpit** (IakaCockpit) = **RÉCEPTIONNE, MODIFIE si besoin, et RUN** (import de l'artefact + ré-édition
>   locale via « Le Cadre » (L22) + Binding runner/modèle + pilotage). **Le Cockpit n'est PAS en lecture seule.**

---

## 0. EN UNE PAGE — le problème et la réponse

Les deux apps ont **deux modèles de données distincts** et **déjà codés**. Pour que « la forge livre → le cockpit
réceptionne + ré-édite + run », il faut **un format d'échange commun** (un pont) — sinon chaque app improvise une
traduction et on reproduit la **dérive silencieuse** déjà vécue sur `CLAUDE.md`/skills.

**Ce que ce lot tranche :**
1. **Cartographie** des deux modèles — où ça colle, où ça diverge, ce qui manque de part et d'autre (§ 2).
2. **Le format d'échange canonique** = **un JSON pivot** (`team.json` pur + `binding.json` optionnel), **PAS**
   `agent.md` (§ 3). L'artefact livré est un **paquet de handoff** (§ 3.3).
3. **Le sens de circulation** forge → cockpit (réception, ré-édition, run) sans casser ce que la forge a livré (§ 4).
4. **Qui possède quoi** quand les deux éditent : forge = **origine canonique**, cockpit = **ajustement local** ;
   traçabilité par **provenance + empreinte**, réconciliation explicite, jamais d'écrasement silencieux (§ 5).

**Découverte structurante (à lire avant tout) :** les deux apps **n'ont pas le même « Cadre »**. Le modèle forge
`Team`/`Persona` est **plat** (skills et gardes = **ids** déclaratifs) ; le modèle cockpit `Frame` (L22) est **plus
riche** (Règle typée → Skill = paquet de règles + prose → Template → Agent). **La jointure entre les deux se fait par
les IDS de skills/gardes**, pas par le contenu. C'est le socle du pont (§ 2.4).

**Cet artefact ne produit AUCUN code.** Gate humain obligatoire (§ 10) avant implémentation dans l'une ou l'autre app.

---

## 1. LES DEUX MODÈLES À LA SOURCE (lecture, rien n'est supposé)

### 1.A Côté FORGE — `@iakaframe/core` (déjà codé, pur, testé)

| Concept | Fichier:ligne | Schéma (résumé) |
|---|---|---|
| **Team** (pure) | `packages/core/src/team.ts:28-49` | `{ id, name, methodId, vignetteTeam, coordinator, personas[], connectors[], workflowId? }` — **AUCUN runner/modèle** (AR-1) |
| **Persona** | `packages/core/src/persona.ts:19-34` | `{ id, name, roleKey, royaume, roleIndex, skills[], guardrails[] }` — skills/gardes = **ids** |
| **Skill** (catalogue) | `packages/core/src/skill.ts:11-33` | `{ id, roleKey, label }` — **déclaratif** (corps riche différé ; `renderSkill` émet un **stub**) |
| **Guardrail** (catalogue) | `packages/core/src/guardrail.ts:50-61,119-163` | `{ id, kind, label, scope, rendering:{hook?,prose?} }` — identité/périmètre/délégation |
| **Workflow** | `packages/core/src/workflow.ts` | phases/gates (rendu prose), `team.workflowId?` |
| **Node / Runner** | `node.ts:18-32` · `runner.ts:17` | nœud (destination) ≠ runner (harnais) |
| **Adaptateurs (kit)** | `adapters/claudeCode.ts:152-184` · `adapters/agentsMd.ts:142-172` | `team pure → KitFileTree` (`.claude/…` ou `AGENTS.md`) — **pur** |
| **Déploiement (I/O)** | `src/hooks/useForgeDeploy.ts:195-215` → `src-tauri/src/kit_deploy.rs:42` | écrit le `KitFileTree` sur disque (non destructif, pathguard) |
| **Persistance team** | `src/hooks/useForgeTeams.ts:57-87` → façade `teamWrite`/`teamList` | **une `team.json` par team** (`serializeTeam`, `team.ts:157`) |

**Ce que la forge sait produire aujourd'hui :** (a) des **`team.json` pures** (source portable) ; (b) un **kit
déployable** projeté vers un nœud (`.claude/agents/*.md`, `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `settings.json`,
`.mcp.json` — ou `AGENTS.md` pour codex/ollama). **Ce qui manque encore :** aucun **`Binding` (E1)** n'est codé dans
`@iakaframe/core` (Q-6 de E1 le prévoit) ; le lot forge **P7** (liaison au déploiement) n'existe pas.

### 1.B Côté COCKPIT — DEUX modèles coexistants (à ne pas confondre)

**(i) Le modèle « roster / pilotage » — `useTeams`** (L11) :

| Concept | Fichier:ligne | Schéma |
|---|---|---|
| **Agent** | `src/hooks/useTeams.ts:59-74` | `{ id, name, royaume, roleIndex, skills[], runner, model }` — **porte runner+modèle** (à sortir, recentrage) |
| **Team** | `src/hooks/useTeams.ts:76-86` | `{ id, name, vignetteTeam, coordinator, agents[] }` |
| **Liaison projet↔team** | `src/hooks/useTeams.ts:321-424` | clés `project_team:<id>`, `hasBinding`, `bindProjectTeam` — **⚠️ « binding » DÉJÀ pris** (voir § 6) |

**(ii) Le modèle « Le Cadre » — `frame.json`** (L22, plus riche) :

| Concept | Fichier:ligne | Schéma |
|---|---|---|
| **Rule** (typée) | `src/frame/model.ts:37-46` | `{ id, type∈{interdit,autorisation,obligation,tool,geste,competence}, label, value?, scope? }` |
| **Skill** (paquet) | `src/frame/model.ts:54-62` | `{ id, name, ruleIds[], description?(prose LLM), versions?[] }` |
| **AgentTemplate** | `src/frame/model.ts:65-74` | `{ id, name, roleKey?, skillIds[], ruleIds[] }` — **type d'agent** |
| **AgentInstance** | `src/frame/model.ts:81-90` | `{ id, name, templateId, extraSkillIds[], extraRuleIds[], brief?(prose LLM) }` |
| **Frame** | `src/frame/model.ts:99-110` | `{ version, teamId, rules[], skills[], templates[], agents[], projectRuleIds[], delegations[] }` |
| **Persistance** | `src-tauri/src/frame.rs:73-109` | `<hat>/.iakacockpit/frames/<team>.json` (Rust agnostique du schéma) |
| **Export `agent.md`** | `src/frame/export.ts:24-97` | un markdown par agent → `.iakacockpit/frames/<team>/*.md` (brief + skills + règles effectives + délégations) |

---

## 2. CARTOGRAPHIE DE CORRESPONDANCE (le cœur du lot)

### 2.1 Correspondance des concepts — forge ⇄ cockpit

| Forge (`@iakaframe/core`) | Cockpit — roster (`useTeams`) | Cockpit — Cadre (`frame.json`) | Verdict |
|---|---|---|---|
| **Team** `{id,name,methodId,vignetteTeam,coordinator,connectors,workflowId}` | **Team** `{id,name,vignetteTeam,coordinator}` | `Frame.teamId` (clé de jointure) | **Colle** sur `id/name/vignetteTeam/coordinator`. **Manque côté cockpit** : `methodId`, `connectors`, `workflowId`. |
| **Persona** `{id,name,roleKey,royaume,roleIndex,skills,guardrails}` | **Agent** `{id,name,royaume,roleIndex,skills}` (+`runner,model`→Binding) | **AgentInstance** `{id,name,templateId,brief,extras}` | **Colle** sur `id/name/royaume/roleIndex/skills`. **Diverge** : la forge n'a **pas** de `Template`/`brief` ; le cockpit-roster n'a **pas** de `roleKey`/`guardrails`. |
| **Skill** (catalogue) `{id,roleKey,label}` | `Agent.skills[]` = **ids** | **Skill** `{id,name,ruleIds,description,versions}` | **Jointure par `id`.** La forge = **référence** ; le cockpit-Cadre = **contenu riche** (règles + prose). Le `id` est la **lingua franca** (ex. `iakaframe-cadrage`). |
| **Guardrail** (catalogue) `{id,kind,rendering}` | — (absent) | Types de `Rule` (`interdit`/…/`geste`) + **graphe `delegations`** | **Diverge fort.** Forge = gardes de 1re classe attachables par id ; cockpit = règles typées + graphe de délégations. Correspondance **partielle** (§ 2.3). |
| **Workflow** `{phases,gates}` | — (absent) | — (absent) | **Manque des deux côtés cockpit.** Porté seulement par la forge. |
| **coordinator** (id persona) | `Team.coordinator` | (implicite via `delegations`) | **Colle** roster ; le Cadre l'exprime autrement (graphe). |
| — (runner/modèle **interdits** dans la Team) | `Agent.runner/model` → **Binding** (recentrage) | — | Le **Binding** (E1) est **hors définition** : ni dans `team.json`, ni dans `frame.json`. Artefact **séparé**. |

### 2.2 Correspondance des EXPORTS markdown (piège : faux jumeaux)

| | Forge `.claude/agents/<id>.md` (`claudeCode.ts:46-71`) | Cockpit `agent.md` (`export.ts:24-89`) |
|---|---|---|
| **Nature** | **System-prompt de subagent** (frontmatter `name`/`description` + rôle/périmètre/skills) | **Fiche de cadre** (brief + skills **avec prose** + **règles effectives** + délégations) |
| **Public** | Le runner Claude Code (consommé à l'exécution) | Documentation/consommation iakaframe du Cadre |
| **Round-trip ?** | **Non** (projection lossy vers un nœud) | **Non** (projection lossy du Cadre) |

> **Conclusion forte : `agent.md` NE PEUT PAS servir de lingua franca.** Les deux `agent.md` portent le même nom mais
> sont **deux projections différentes et non réversibles**. Un pont bâti sur du markdown serait ambigu et lossy. **Le
> pont doit être un JSON structuré** (§ 3).

### 2.3 Correspondance des gardes/règles (zone de divergence à assumer)

- Forge **Guardrail** `identity` / `perimeter` / `delegation` (`guardrail.ts:119-163`) ⇄ cockpit : le canal
  d'identité et le périmètre ne sont **pas** des `Rule` du Cadre — ils sont des **gardes de méthode** (hooks/prose).
  La `delegation-guard` ⇄ cockpit **graphe `delegations`** (`model.ts:92-96`).
- Cockpit **Rule** `tool`/`autorisation`/`interdit` ⇄ forge : correspond aux **permissions** (`settings.json`
  `allow`/`ask`/`deny`), pas au catalogue `Guardrail`.
- **Verdict MVP :** on **ne fusionne pas** ces deux vocabulaires. Le handoff **transporte les ids de gardes**
  (`Persona.guardrails[]`) ; l'enrichissement en règles typées reste **cockpit-local** (`frame.json`). Fusion
  gardes⇄règles = **différée** (Q-D § 9).

### 2.4 Ce qui MANQUE de part et d'autre (synthèse)

- **Manque côté cockpit-roster** (`useTeams`) : `roleKey`, `guardrails[]`, `methodId`, `connectors[]`, `workflowId`.
  → à **absorber** lors de la réception (champs additifs, tolérés par le parse défensif existant).
- **Manque côté forge** : la **granularité de règles** (Rule typée), le **Template**, la **prose LLM** (Skill
  `description`, Agent `brief`), le **graphe de délégations** explicite. → la forge ne consomme **pas** encore le
  Cadre riche ; le cockpit l'**enrichit localement** (voir circulation § 4).
- **Manque des deux côtés (codé)** : le **Binding** (E1) — schéma à créer dans `@iakaframe/core` (Q-6) puis à
  refléter côté cockpit (recentrage). C'est un artefact **du handoff**, pas de la définition.

---

## 3. LE FORMAT D'ÉCHANGE CANONIQUE (proposition)

### 3.1 Décision : un JSON pivot, pas de markdown

**L'artefact canonique = `team.json` (Team pure, schéma `@iakaframe/core`)**, éventuellement accompagné d'un
**`binding.json`** (schéma E1). Raisons :
1. Les deux apps **parlent déjà ce JSON** : la forge l'**écrit** (`serializeTeam`, `useForgeTeams`), le cockpit peut
   le **lire** dans son roster (`parseAgent`/`parseTeam` sont déjà défensifs et **ignorent les clés inconnues** —
   `useTeams.ts:127-155`).
2. Le schéma forge `Team`/`Persona` a été **littéralement dérivé** du cockpit `useTeams` (cf. en-tête de `team.ts`,
   `persona.ts`) → **même lignée**, réception **quasi sans transformation**.
3. `agent.md` est un **faux jumeau** (§ 2.2) : lossy, non réversible, différent des deux côtés.

### 3.2 Ce que le pivot transporte (et ne transporte pas)

- **Transporte (MVP) :** la **définition pure** — `id, name, methodId, vignetteTeam, coordinator, personas[]`
  (avec `roleKey/royaume/roleIndex/skills[]/guardrails[]`), `connectors[]`, `workflowId?`.
- **Transporte (optionnel) :** un **`binding.json`** par nœud (défaut forge) — `origin:"forge-default"`.
- **NE transporte PAS au MVP :** le **Cadre riche** (règles typées, templates, prose). Le cockpit peut l'**enrichir
  localement** (`frame.json`), joint par les **ids de skills** (§ 2.1). La remontée du Cadre vers la forge = **différée**.

### 3.3 Le paquet de HANDOFF (l'artefact livré)

Un **dossier de handoff** (versionnable), déposé par la forge, réceptionné par le cockpit :

```
<handoff>/
├── team.json          ← DÉFINITION pure (canonique, @iakaframe/core Team)   [obligatoire]
├── binding.json       ← LIAISON par défaut (E1, origin:"forge-default")     [optionnel]
├── kit/               ← DÉPLOYABLE projeté (.claude/… ou AGENTS.md)         [optionnel, informatif]
└── handoff.json       ← MANIFESTE de provenance (§ 5)                        [obligatoire]
```

- `team.json` = **la source de vérité importée** (ce que le cockpit réceptionne et ré-édite).
- `kit/` = **produit** d'un nœud (régénérable) — **jamais** la source ; fourni pour référence/exécution standalone.
- `handoff.json` = provenance (forge, version, `teamId`, empreinte, horodatage) — support de la traçabilité (§ 5).

> **MVP minimal :** `team.json` + `handoff.json`. `binding.json` et `kit/` suivent l'arrivée du lot forge **P7**.

### 3.4 Où vit le schéma partagé

Le **schéma `Team`/`Persona`** est **déjà** dans `@iakaframe/core` (source de vérité). Le **schéma `Binding`**
doit y **rejoindre** (E1 Q-6). **Reco :** le cockpit **importe le contrat de forme** depuis `@iakaframe/core`
(dépendance de type) plutôt que de re-déclarer un schéma jumeau → **une seule définition**, pas deux qui dérivent.
*(Alternative si on refuse le couplage de packages : un JSON Schema publié, vérifié par les deux — plus lourd.)*

---

## 4. SENS DE CIRCULATION (forge → cockpit, puis ré-édition locale)

```
 FORGE (crée & livre)                         COCKPIT (réceptionne, modifie, run)
 ────────────────────                         ──────────────────────────────────
 authoring Team pure                          1. RÉCEPTION : lit team.json → roster (useTeams)
   personas·rôles·skills·gardes                  provenance enregistrée (handoff.json)
   coordinateur·connecteurs·workflow          2. RÉ-ÉDITION LOCALE (autorisée) :
       │                                          - roster : nom/rôle/skills/coordinateur (useTeams)
       │  serializeTeam → team.json               - Le Cadre : règles/skills/templates (frame.json)
       │  (+ binding.json défaut, P7)             - Binding : runner+modèle par persona (override)
       ▼                                       3. RUN : pilotage (terminal L10, journal L4, Gantt L19)
 PAQUET DE HANDOFF  ───────────────────────►     via le coordinateur + Binding résolu
```

**Règles de circulation :**
1. **Le cockpit ne casse pas ce que la forge a livré.** La réception est **non destructive** : on importe dans le
   roster, on **conserve `team.json` d'origine** (référence) et on trace la provenance.
2. **La ré-édition locale est permise** (correction Stéphane : le Cockpit **n'est pas** en lecture seule). Toute
   modification cockpit est **marquée locale** (§ 5) — elle **n'altère pas** la définition d'origine côté forge.
3. **La jointure Cadre** se fait par **ids de skills** : un skill forge `iakaframe-cadrage` (id) devient, côté
   cockpit, un `Skill` du Cadre **même id**, que le cockpit peut enrichir de règles/prose **sans casser l'id**.
4. **Remontée cockpit → forge = HORS MVP.** Au MVP la circulation est **descendante** (forge → cockpit) ; la
   réconciliation inverse (le cockpit propose ses enrichissements à la forge) est un **lot ultérieur** (§ 9 Q-E).

---

## 5. QUI POSSÈDE QUOI — provenance & anti-dérive (leçon `CLAUDE.md`/skills)

**Principe :** la **forge = origine canonique** ; le **cockpit = ajustement local**. Pour éviter la **dérive
silencieuse** (le fléau déjà vécu où un `CLAUDE.md`/skill édité localement diverge sans trace de l'original) :

| Donnée | Origine | Le cockpit peut… | Traçabilité |
|---|---|---|---|
| Définition (`team.json`) | **Forge** (canonique) | ré-éditer **localement** | `handoff.json` garde l'empreinte de l'original |
| Binding (runner/modèle) | Forge (défaut) / **Cockpit** (override) | overrider | champ `origin:"forge-default"\|"cockpit-override"` (E1) |
| Cadre riche (`frame.json`) | **Cockpit** (enrichissement) | créer/éditer | joint à la définition par `teamId` + ids de skills |

**Mécanisme de provenance (`handoff.json`) — MVP minimal :**
```json
{
  "source": "iakaFrameGUI",
  "sourceVersion": "<version forge>",
  "teamId": "<id>",
  "importedAt": "<ISO-8601>",
  "originHash": "<empreinte du team.json d'origine>",
  "localEdits": false
}
```
- À la réception : le cockpit stocke la provenance + calcule `originHash` sur le `team.json` reçu.
- À la 1re ré-édition locale : `localEdits` passe à `true` → l'UI affiche **« modifié localement (diverge de la
  forge) »** (badge, calque du badge `origin` du Binding). **Pas d'écrasement silencieux.**
- **Détection de dérive** au **ré-import** d'une nouvelle livraison forge : si le cockpit a des `localEdits` **et**
  que l'`originHash` a changé, on **ne remplace pas d'autorité** → on **signale le conflit** (choix explicite de
  Stéphane : garder local / prendre la forge / fusionner). C'est **exactement** la parade à la dérive `CLAUDE.md`.

> **MVP = provenance + badge « modifié localement » + refus d'écrasement silencieux au ré-import.** La fusion
> assistée (3-way merge) est un **raffinement différé**.

---

## 6. ⚠️ COLLISION DE VOCABULAIRE « binding » (à trancher — piège réel)

Le mot **« binding »** est **déjà pris** côté cockpit pour la **liaison projet↔team** (`useTeams.ts:321-424` :
`hasBinding`, `bindProjectTeam`, `project_team:<id>`). Or E1 introduit un **autre** « Binding » (persona→runner+
modèle). **Deux sens différents** → risque de confusion dans le code et les specs.

**Reco :** réserver **« Binding »** au sens E1 (persona→runner+modèle) — c'est le terme du contrat partagé — et
**renommer** la liaison projet↔team existante en **« affectation projet »** (`projectTeamAssignment`) côté cockpit,
**progressivement** (le recentrage est l'occasion). *À trancher : rename tout de suite, ou cohabitation documentée
au MVP puis rename.* (Impact borné : `useTeams`, `App.tsx`, tests — pas le pilotage.)

---

## 7. RÉUTILISATION DE L'EXISTANT (ne rien réimplémenter)

- **Forge :** `serializeTeam`/`parseTeam` (`team.ts`) produisent déjà le `team.json` pur → **c'est le pivot**, tel
  quel. `useForgeDeploy` + `kit_deploy.rs` produisent déjà le `kit/` → réutilisés pour le sous-dossier informatif.
  À **ajouter** (forge) : l'écriture du **paquet de handoff** (dossier + `handoff.json`) et — quand P7 arrive — le
  `binding.json`. **Aucune** réécriture des adaptateurs.
- **Cockpit :** `parseAgent`/`parseTeam` (`useTeams.ts:127-192`) sont déjà **défensifs et tolérants aux clés
  inconnues** → la réception d'un `team.json` forge se déverse **sans transformation** (les champs manquants —
  `roleKey`, `guardrails`, `methodId` — sont additifs). `frame.rs`/`frame.json` et `parseFrame` (défensif) restent
  l'**autorité du Cadre**. À **ajouter** (cockpit) : une **façade de réception** (`handoffImport(dir)`), le stockage
  de provenance, et le badge « modifié localement ». **Aucune** réécriture du pilotage (L10/L4/L19).

---

## 8. CRITÈRES D'ACCEPTATION (testables)

### 8.1 Format & schéma
- [ ] **H-A** — Le pivot est le `team.json` **pur** (`@iakaframe/core Team`) : `serializeTeam` d'une team forge
      produit un JSON **sans** `runner`/`model` (invariant AR-1) ; `parseTeam(serializeTeam(t)) === t` (round-trip).
- [ ] **H-B** — Le schéma `Binding` (E1) existe dans `@iakaframe/core` (Q-6) et est **importé** par le cockpit (pas
      de schéma jumeau re-déclaré) — OU décision alternative tracée (§ 3.4).
- [ ] **H-C** — `agent.md` **n'est pas** utilisé comme format d'échange (grep : la réception cockpit lit `team.json`,
      jamais un `.md` forge).

### 8.2 Réception cockpit (non destructive)
- [ ] **H-D** — `handoffImport(dir)` lit `team.json` → crée/met à jour une team dans `useTeams` **sans** perdre les
      champs additifs (`roleKey`/`guardrails`/`methodId` conservés en passthrough) ; **idempotent** (ré-import du
      même paquet = aucune modification).
- [ ] **H-E** — La provenance (`handoff.json` : source/version/teamId/originHash/importedAt) est **stockée** et
      relisible ; `localEdits` démarre à `false`.
- [ ] **H-F** — Une ré-édition locale (roster ou Cadre) bascule `localEdits=true` et affiche le badge **« modifié
      localement »**. Le `team.json` d'origine (empreinte) reste conservé.

### 8.3 Anti-dérive
- [ ] **H-G** — Ré-import d'une **nouvelle** livraison (originHash différent) alors que `localEdits=true` → **aucun
      écrasement silencieux** : un **conflit explicite** est signalé (garder local / prendre forge / différer).
- [ ] **H-H** — La jointure Cadre par ids de skills : un `Persona.skills=["iakaframe-cadrage"]` reçu correspond au
      `Skill.id="iakaframe-cadrage"` du `frame.json` (même id) ; l'enrichissement local (règles/prose) **ne casse
      pas** l'id.

### 8.4 Non-régression (les deux apps mûres)
- [ ] **H-I** — Forge : adaptateurs (`generateClaudeCodeKit`/`generateAgentsMdKit`), `kit_deploy`, tests core
      **inchangés/verts**.
- [ ] **H-J** — Cockpit : pilotage (L10 terminal, L4 journal, L19 Gantt), `frame.rs`/`frame.json` (L22),
      `pty_runner_open` **inchangés/verts**.

---

## 9. QUESTIONS D'ARBITRAGE — À TRANCHER par Stéphane (prose)

- **Q-A — Le pivot est-il `team.json` seul (MVP) ou d'emblée le paquet complet (`+binding.json +kit/`) ?** *Reco :
  `team.json` + `handoff.json` au MVP ; `binding.json` et `kit/` arrivent avec le lot forge **P7**.*
- **Q-B — Canal de dépôt/réception : fichier/dossier partagé, ou dépôt commun ?** *Reco : un **dossier de handoff**
  que la forge écrit et que le cockpit lit (le plus simple, offline, versionnable). Alternative : un emplacement
  partagé pointé par les deux apps (config).* — **conditionne l'implémentation** ; **même question** que Q-B du
  recentrage (à décider une seule fois pour les deux lots).
- **Q-C — Le schéma partagé : dépendance `@iakaframe/core` côté cockpit, ou JSON Schema publié ?** *Reco :
  dépendance de type sur `@iakaframe/core` (une seule définition). Cf. § 3.4.*
- **Q-D — Fusionner gardes forge (`Guardrail`) et règles cockpit (`Rule`) ?** *Reco : **non au MVP** — transporter
  les **ids de gardes**, garder l'enrichissement en règles typées **cockpit-local**. Fusion = différée.*
- **Q-E — Remontée cockpit → forge (les enrichissements du Cadre repartent-ils vers la forge ?).** *Reco : **hors
  MVP** — circulation descendante d'abord. La remontée (le cockpit propose son Cadre enrichi à la forge comme
  origine canonique) est un lot ultérieur, une fois la forge capable de modéliser les règles riches.*
- **Q-F — Collision « binding » (§ 6) : renommer la liaison projet↔team maintenant ou plus tard ?** *Reco :
  réserver « Binding » au sens E1 ; renommer projet↔team en « affectation projet » progressivement (au recentrage).*

---

## 10. RISQUE + GATE HUMAIN (obligatoire)

**Ce lot touche DEUX applications MÛRES** — c'est le point de risque cardinal :
- **Forge** : ajoute une écriture de paquet de handoff **par-dessus** les adaptateurs existants (additif) — risque
  faible **si** on ne touche pas la génération de kit.
- **Cockpit** (v0.16.0, L0–L22, gel anti-scope-creep) : ajoute une **réception** + provenance + badge — **ne doit
  pas** casser le pilotage livré (L10 terminal, L4 journal, L19 Gantt) ni le Cadre (L22). Le recentrage (Binding)
  est un **lot jumeau** (`recentrage-cockpit-binding.md`) — H1 et le recentrage doivent **s'articuler** (H1 apporte
  la réception, le recentrage apporte la couche Binding).

**Dépendances amont non codées :** le **Binding** n'existe pas encore dans `@iakaframe/core` ; le lot forge **P7**
(liaison au déploiement) n'est pas fait. Donc **le paquet complet (binding.json) n'est pas livrable tant que P7
n'est pas codé** → **MVP de H1 = `team.json` + `handoff.json` + réception + provenance**, le reste suit P7.

**Décisions humaines requises avant tout code :**
1. **Valider le pivot** = `team.json` pivot JSON (pas `agent.md`) + paquet de handoff (§ 3).
2. **Valider le périmètre MVP** = réception `team.json` + provenance/anti-dérive (§ 5), `binding.json`/`kit/` différés
   à P7.
3. **Trancher Q-B** (canal de dépôt — commun avec le recentrage) et **Q-F** (collision « binding »).

> **Tant que le gate humain n'est pas franchi, aucune implémentation** — ni forge, ni cockpit. Ce lot ne produit que
> du cadrage.

---

## 11. JALON (gate humain)

```
  _   _    _    _   _ ____   ___  _____ _____
 | | | |  / \  | \ | |  _ \ / _ \|  ___|  ___|
 | |_| | / _ \ |  \| | | | | | | | |_  | |_
 |  _  |/ ___ \| |\  | |_| | |_| |  _| |  _|
 |_| |_/_/   \_\_| \_|____/ \___/|_|   |_|
```

| | |
|---|---|
| **Émetteur** | 🧙 Gandalf — [IAKACOCKPIT] (P1, cadrage) |
| **Contenu** | Instruction H1 « Handoff forge→cockpit » : pivot **`team.json` (JSON)** + paquet de handoff ; **pas `agent.md`** ; réception non destructive + **provenance/anti-dérive** ; jointure Cadre par **ids de skills** ; collision « binding » à trancher. MVP = `team.json`+`handoff.json`+réception ; `binding.json`/`kit/` différés au lot forge P7. |
| **Récepteur** | Stéphane (décideur) → validation → déclenche 🪓 Gimli (implémentation, forge + cockpit) |

**Fichiers à vérifier (chemin:ligne) :**
- Forge — `packages/core/src/team.ts:28-49,157` (Team + `serializeTeam` = pivot).
- Forge — `packages/core/src/persona.ts:19-34` (Persona pure).
- Forge — `packages/core/src/adapters/claudeCode.ts:46-71,152-184` (subagent `.md` = **faux jumeau**, pas le pivot).
- Forge — `src/hooks/useForgeTeams.ts:57-87` + `useForgeDeploy.ts:195-215` + `src-tauri/src/kit_deploy.rs:42` (production).
- Cockpit — `src/frame/model.ts:37-110` (Cadre riche) + `src/frame/export.ts:24-97` (`agent.md` = **faux jumeau**).
- Cockpit — `src/hooks/useTeams.ts:59-86` (roster, cible de réception) + `:321-424` (**collision « binding »**).
- Cockpit — `src-tauri/src/frame.rs:73-109` (persistance `frame.json`, autorité du Cadre — inchangée).
- Amont — `/Users/sjupin/work/iakaFrameGUI/specs/contrat-concepts.md:57-67,185-205` (3 couches, Binding) +
  `E1-evolution-binding-ar1.md:56-131,165-203` (Binding, adaptateurs, Q-1→Q-6).

À la validation : « JALON VALIDÉ » + Gimli implémente le **MVP de H1** (réception `team.json` + provenance) côté
cockpit, et l'**écriture du paquet de handoff** côté forge.

---

## 12. JOURNAL DE DÉCISION

- **2026-07-07** — Décision portefeuille (Stéphane) : **deux logiciels séparés** — Forge **crée & livre**, Cockpit
  **réceptionne, modifie si besoin, run**. Le Cockpit **n'est pas** en lecture seule (garde « Le Cadre »).
- **2026-07-07** — Gandalf cadre le handoff (lecture seule des deux codes) : constat que les deux apps ont **deux
  Cadres** distincts (forge **plat** : skills/gardes = ids ; cockpit **riche** : règles→skills→templates→agents),
  joints par les **ids de skills**. `agent.md` est un **faux jumeau** des deux côtés (lossy, non réversible) →
  **rejeté** comme lingua franca. **Pivot retenu = `team.json` (JSON pur `@iakaframe/core`)** + paquet de handoff
  (`handoff.json` provenance, `binding.json` et `kit/` optionnels/différés P7). Circulation **descendante**
  forge→cockpit ; ré-édition locale **permise** mais **tracée** (provenance + badge « modifié localement » + refus
  d'écrasement silencieux au ré-import) — parade directe à la **dérive `CLAUDE.md`/skills**. Signalé : **collision
  de vocabulaire « binding »** (projet↔team L11 vs runner/modèle E1). Arbitrages Q-A→Q-F. **Cadrage seul, aucun code.**
