# Instruction P3b — Adaptateurs de runner codex + ollama (localhost/lan) : déploiement multi-nœuds (MVP)

> **Phase** : P3b — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Fondations** : `specs/instructions/P3-adaptateur-runner-generation-deploiement.md` (interface `RunnerAdapter`
> + générateur pur Claude Code livrés dans `@iakaframe/core/adapters/`, gate PASS ; déploiement Rust `kit_deploy`
> livré ; note étape 0 P3 `specs/notes/claude-code-schemas-*.md`), `specs/contrat-concepts.md` (§ 2.1 Garde-fou,
> § 3.2 Kit, § 3.4 Adaptateur, `KitFormat`), `specs/instructions/P2-coeur-partage-refactor-cli.md`
> (`NodeKind`/`KitFormat=agents-md`).
> **Gabarits in-repo réutilisés (étape 0)** : `iakaframe/kit-codex/AGENTS.md`, `iakaframe/kit-ollama/AGENTS.md`
> (+ `MODELES.md`), `iakaframe/kit-openwebui/AGENTS.md`.

---

## 1. Objectif

Compléter le **déploiement multi-nœuds** en implémentant les adaptateurs de runner **`codex`**,
**`ollama-localhost`** et **`ollama-lan`**, sur le **même patron pur** que Claude Code (P3). L'interface
`RunnerAdapter` existe déjà (ces nœuds sont `implemented:false` dans le registre) : il s'agit d'écrire leurs
`generate()` concrets — une team pure → un contrat **`AGENTS.md`** — et d'atteindre **4 nœuds implémentés**.

**Point de fond structurant** : ces nœuds **n'ont PAS de hooks** (mécanisme propre à Claude Code). Le canal
d'identité et les gardes ne peuvent donc **pas** être câblés en hooks : ils sont **embarqués comme TEXTE
comportemental** dans `AGENTS.md` (comme le font déjà les kits existants). Le cœur doit modéliser proprement **deux
rendus de garde** : **hook** (Claude Code) vs **texte** (codex/ollama). C'est le vrai livrable conceptuel de P3b.

---

## 2. Étape 0 (in-repo, sans web) — gabarits réutilisés

> Le format `AGENTS.md` est **vérifiable dans le dépôt** — **pas** de doc externe (contrairement à l'étape 0 de
> P3). On s'appuie sur les kits **déjà écrits et éprouvés**.

Le développeur-devops **lit et note ce qu'il réutilise** (dans `specs/notes/agents-md-gabarits-<date>.md`) :

| Gabarit | Ce qu'on réutilise |
|---|---|
| `kit-codex/AGENTS.md` | Ossature d'un contrat Codex : « Ce qu'est iakaframe », **rôles/personas**, 3 phases + gates, « cadrage avant code », **§ Identité comportementale** (`:78-94`), conventions. |
| `kit-ollama/AGENTS.md` | Variante **local/Ollama** : pré-requis (host `:11434`), « un rôle à la fois », **§ Identité** (`:60+`). |
| `kit-openwebui/AGENTS.md` | **Référence du rituel embarqué** (`:47-80`) : « pas de hook garde → rituel **comportemental** porté par le system prompt », position de pastille ouverture/clôture, chaîne de badges, verbatim/anti-ventriloquie. **Le texte de garde à générer s'inspire de cette section.** |

**Constat clé (`kit-openwebui/AGENTS.md:47-52`, `kit-codex/AGENTS.md:94`)** : les kits **portent déjà** le rituel
en prose et **assument l'absence de hook**. P3b **ne réinvente pas** ce texte — il le **génère depuis le modèle de
gardes** au lieu de le figer à la main.

**Réserve — MODELES.md** : les gabarits contiennent une **table modèle↔rôle** et un `MODELES.md`. **La forge ne
génère PAS ces éléments** (invariant AR-1 : le modèle est run-time/Cockpit). L'`AGENTS.md` généré décrit des
**personas/rôles**, **jamais** un modèle affecté. *(Cf. Q-3.)*

---

## 3. Le point structurant — nœud à hooks vs nœud sans hooks

### 3.1 Deux familles de nœuds

| Famille | Nœud(s) | Rendu des gardes |
|---|---|---|
| **À hooks** | `claude` | gardes = **hooks + scripts** dans `settings.json` (+ `.claude/hooks/`) — P3, inchangé. |
| **Sans hooks** | `codex`, `ollama-localhost`, `ollama-lan` | gardes = **TEXTE comportemental** dans `AGENTS.md` (§ Identité / § Périmètre en prose). |

### 3.2 Modélisation propre dans le cœur — le garde-fou expose DEUX rendus

Le `Guardrail` (contrat § 2.1) porte une **intention** (identité, périmètre, délégation…). P3b lui ajoute la
capacité d'être **rendu** de deux manières, **sans dupliquer l'intention** :

```ts
// @iakaframe/core
export interface GuardrailRendering {
  /** Rendu HOOK (nœud à hooks) : évènement + matcher + script à câbler. */
  hook?: { event: string; matcher?: string; script: string };
  /** Rendu TEXTE (nœud sans hooks) : prose comportementale à injecter dans AGENTS.md. */
  prose?: { heading: string; body: string };
}
export interface Guardrail {
  id: string;
  kind: "identity" | "perimeter" | "delegation" | "permission" | "custom";
  scope: "team" | "persona" | "role";
  rendering: GuardrailRendering;   // au moins un des deux rendus
}
```

- **Principe** : **une intention, deux rendus**. L'adaptateur **choisit** le rendu selon la famille du nœud :
  Claude Code lit `rendering.hook` (P3) ; codex/ollama lisent `rendering.prose`.
- **Catalogue de gardes** (`@iakaframe/core`) : les gardes canoniques de la méthode (`identity`, `perimeter`,
  `delegation`) fournissent **les deux** rendus — le `hook` (déjà utilisé en P3) **et** la `prose` (nouvelle, tirée
  du texte éprouvé de `kit-openwebui/AGENTS.md`).
- **Fidélité impérative** : la `prose` d'identité **reproduit fidèlement** les mêmes règles que le hook — **badge
  `<pastille> [ROYAUME][Persona]`, position ouverture/clôture, mots START/STOP bannis, chaîne de badges sans
  interjection, verbatim/anti-ventriloquie**. Le canal d'identité est **reproduit, jamais dénaturé** (invariant
  § 7), qu'il soit hook ou texte.

---

## 4. Périmètre — IN / OUT

### 4.1 DANS le périmètre P3b

1. **Adaptateur `codex`** : `team → AGENTS.md` (contrat au format des kits) — personas par rôle + 3 phases/gates +
   **rituel d'identité en texte** + périmètre en prose. `NodeKind.codex` → `KitFormat.agents-md`.
2. **Adaptateurs `ollama-localhost` et `ollama-lan`** : **même famille `AGENTS.md`**, **distincts par le
   nœud/endpoint** (localhost `http://localhost:11434` vs lan `http://<host-lan>:11434`) — la distinction apparaît
   dans le **rendu** (pré-requis/host) et dans l'identité du nœud.
3. **Modélisation des gardes en texte** (§ 3.2) dans le cœur : `GuardrailRendering.prose` + catalogue enrichi.
4. **Réutilisation** : générateur **pur** (`@iakaframe/core/adapters/`, sans I/O, testable sans nœud) + registre
   `RunnerAdapter` étendu + **déploiement Rust `kit_deploy` INCHANGÉ** + vocab P2 (`NodeKind`/`KitFormat`).

### 4.2 HORS périmètre P3b

- **Open WebUI** (format **Models JSON** `models/<persona>.json`, system prompt en `params.system`) = **3e format**
  distinct de `AGENTS.md`. **Reco : P3c séparé** (cf. § 8, Q-1) — **PAS dans P3b**.
- **Workflows** → toujours différés.
- **`MODELES.md` / choix de modèle par persona** = **run-time Cockpit, HORS forge** (invariant AR-1). Non généré.
- **UI** (sélecteur de nœud, prévisualisation enrichie) → todo séparé.
- **Adaptateur de méthode** → P∞.
- **Exécution réelle** sur ces nœuds (lancer codex/ollama) = **Cockpit** (run-time), hors forge.

---

## 5. Ce qui est généré exactement (par nœud)

### 5.1 `codex` — `AGENTS.md` (KitFormat = agents-md)

`generate(team, "codex")` → `KitFileTree` :

| Fichier | Contenu (ossature `kit-codex/AGENTS.md`) |
|---|---|
| `AGENTS.md` | En-tête « contrat iakaframe (incarnation Codex) » ; « Ce qu'est iakaframe » ; **roster = personas de la team par rôle** (nom + rôle + pastille) ; 3 phases + gates ; « cadrage avant code » ; **§ Identité — rituel comportemental** (généré depuis `guardrail(identity).rendering.prose`) ; **§ Périmètre** (depuis `perimeter.prose`) ; conventions ; structure projet. **Aucun modèle, aucune table MODELES.** |
| `.mcp.json` *(si connecteurs)* | **seulement si** codex consomme MCP **et** la team déclare des connecteurs — sinon **non généré**. *(Support MCP côté codex = à confirmer étape 0/Q-4 ; par défaut : omis.)* |

### 5.2 `ollama-localhost` / `ollama-lan` — `AGENTS.md` (agents-md)

`generate(team, "ollama-localhost")` / `generate(team, "ollama-lan")` → `KitFileTree` :

| Fichier | Contenu (ossature `kit-ollama/AGENTS.md`) |
|---|---|
| `AGENTS.md` | En-tête « incarnation Ollama / local » ; **pré-requis avec l'endpoint du nœud** : `localhost` → `http://localhost:11434` ; `lan` → `http://<host-lan>:11434` (host paramétrable, cf. `NodeKind` P2) ; roster personas par rôle ; 3 phases + gates ; **§ Identité comportementale** (prose) ; **§ Périmètre** (prose) ; conventions. **Aucun modèle affecté** (le « modèle conseillé » des gabarits **n'est pas** repris — AR-1). |

> **Différence localhost/lan visible dans le rendu** : l'endpoint (`localhost:11434` vs `<host-lan>:11434`) et
> l'entête du nœud diffèrent → deux sorties **distinctes** pour la même team (critère G-3).

### 5.3 Invariants de génération (rappel)
- **Zéro `runner`/`model`** dans tout fichier généré (même codex/ollama) — test G-4.
- **Déterminisme** + tri des personas par `roleIndex`.
- **`KitFormat.agents-md`** résolu par les helpers P2 (`contractFileForNode(node)` → `AGENTS.md`).

---

## 6. Où vit le code — core pur + registre étendu

| Brique | Emplacement | Note |
|---|---|---|
| Adaptateurs `codex`/`ollama-localhost`/`ollama-lan` | **`@iakaframe/core/src/adapters/`** (`agentsMd.ts` mutualisé + specifics par nœud) | **purs**, sans I/O ; testables sans nœud. Mutualisent un **builder `AGENTS.md`** commun (DRY) paramétré par le nœud. |
| `GuardrailRendering.prose` + catalogue | `@iakaframe/core/src/guardrail.ts` | ajoute le rendu texte aux gardes canoniques. |
| Registre `RunnerAdapter` | `@iakaframe/core/src/adapters/registry.ts` | passe `codex`/`ollama-localhost`/`ollama-lan` à **`implemented:true`** ; interface **stable** (aucune signature changée). |
| Déploiement | **Forge Rust `kit_deploy` — INCHANGÉ** | écrit le `KitFileTree` (relatif) dans le dossier cible ; pathguard/non-destructif de P3 réutilisés tels quels. |

**Principe** : P3b **n'ajoute aucune I/O nouvelle** — seulement des `generate()` purs de plus + un rendu de garde
de plus. Le déploiement est **le même** que P3.

---

## 7. Invariants maintenus

1. **Team PURE en entrée** ; **zéro runner/model** en sortie (codex/ollama compris) — l'`AGENTS.md` **ne fixe pas**
   le modèle. Le modèle est posé au **run-time Cockpit**.
2. **Nœud ≠ runner/modèle** : la forge choisit le **nœud** (codex, ollama-localhost/lan) et son **endpoint** ; elle
   ne choisit **jamais** le modèle d'exécution d'une persona.
3. **Canal d'identité reproduit fidèlement** en texte (mêmes règles badges/position/verbatim que le hook) —
   **jamais dénaturé** (§ 3.2).
4. **Vocab P2 réutilisé** ; **`kit_deploy` inchangé** ; **interface `RunnerAdapter` stable**.
5. **Non-régression P3** : l'adaptateur **Claude Code** et ses tests restent **verts et inchangés** (on ajoute, on
   ne modifie pas son `generate`).
6. **Rôles jamais en noms de code** dans la doc/UI ; le `name` de persona (donnée) peut être libre.

---

## 8. Critères d'acceptation (vérifiables)

P3b est **PASS** si **tous** les points sont vérifiés :

- **G-1 — Registre : 4 nœuds implémentés.** Le registre `RunnerAdapter` liste `claude`, `codex`,
  `ollama-localhost`, `ollama-lan` avec `implemented:true` ; l'**interface est stable** (signatures inchangées ;
  l'adaptateur Claude Code P3 non modifié — test de non-régression vert).
- **G-2 — codex → `AGENTS.md` conforme.** `generate(team_gabarit, "codex")` produit un `AGENTS.md` contenant les
  **7 personas par rôle**, les 3 phases/gates, et le **rituel d'identité en texte** (badge `[ROYAUME][Persona]`,
  position ouverture/clôture, START/STOP bannis). **KitFormat = agents-md** (`AGENTS.md`, pas `CLAUDE.md`).
- **G-3 — ollama-localhost ≠ ollama-lan.** Les deux `generate()` produisent des `AGENTS.md` **distincts** :
  endpoint `localhost:11434` vs `<host-lan>:11434` (host paramétrable). Diff non vide sur l'entête/pré-requis.
- **G-4 — Zéro fuite runner/model.** `grep -R "runner\|model\|MODELES" <arbres générés codex+ollama>` ne renvoie
  **aucun** modèle affecté ni table de modèles. Test automatisé sur les trois nœuds.
- **G-5 — Fidélité du canal d'identité.** La `prose` d'identité générée contient **les mêmes règles** que le hook
  (assertion : présence des marqueurs badge/position/verbatim/anti-ventriloquie) — test comparant les invariants
  clés entre `rendering.hook` (référence) et `rendering.prose`.
- **G-6 — Gardes en texte pour les nœuds sans hooks.** Pour codex/ollama, **aucun `settings.json`/hook** n'est
  généré ; les gardes `identity`/`perimeter` apparaissent en **sections de prose** dans `AGENTS.md`.
- **G-7 — `.mcp.json` conditionnel** (si applicable au nœud) : généré **seulement si** connecteurs **et** support
  du nœud confirmé ; sinon absent (par défaut, omis pour codex/ollama — Q-4).
- **G-8 — Pur & testable sans nœud.** Tous les tests P3b tournent **sans codex ni ollama installés** (générateurs
  purs + inspection d'arbre). **G-9 — Déploiement réutilise `kit_deploy` sans le modifier** : un test déploie un
  `AGENTS.md` généré dans un tmp dir via la commande **existante** (aucune signature Rust changée).
- **G-10 — Qualité.** `@iakaframe/core` typecheck + tests verts ; non-régression P3 (Claude Code) verte ; front
  lint/test verts. **G-11 — Rôles jamais en noms de code** (doc/UI/logs).

---

## 9. Dépendances, risque & questions d'arbitrage

**Dépendances**
- **P3 livré et gate PASS** : interface `RunnerAdapter`, générateur pur Claude Code, `kit_deploy`, note étape 0 P3.
- **Gabarits in-repo** : `kit-codex`/`kit-ollama`/`kit-openwebui` (fait).
- **Pas de doc externe** : étape 0 in-repo.

**Risque** — faible : le patron pur + le déploiement existent (P3) ; P3b ajoute des `generate()` et un rendu de
garde. Le seul point délicat est la **fidélité du texte d'identité** (ne pas dénaturer le canal) → **test G-5**
bloquant, et **réutilisation** du texte éprouvé de `kit-openwebui/AGENTS.md` (pas de réécriture créative).

**Questions d'arbitrage (prose — à trancher avant dispatch)**
- **Q-1 — Open WebUI : IN P3b ou P3c ?** *Reco : **P3c séparé.*** Open WebUI est un **3e format** (Models JSON,
  `params.system`), pas `AGENTS.md` — l'inclure dilue le MVP P3b (qui unifie la **famille AGENTS.md**). Le gabarit
  `kit-openwebui` sert **déjà** de source pour la **prose d'identité** ; l'adaptateur Models JSON mérite son propre
  cadrage. → *Confirmer P3c, ou l'intégrer si tu le juges trivial (même prose, conteneur JSON différent).*
- **Q-2 — Modélisation garde hook-vs-texte.** *Reco : `GuardrailRendering { hook?, prose? }` (§ 3.2)* — une
  intention, deux rendus, l'adaptateur choisit. Alternative rejetée : deux `Guardrail` distincts (duplique
  l'intention, risque de divergence). → *Confirmer le modèle à deux rendus.*
- **Q-3 — Table modèle↔rôle : vraiment jamais dans le kit ?** *Reco : **jamais** (AR-1)* — la forge ne pose pas de
  modèle ; l'`AGENTS.md` décrit des personas/rôles. Les gabarits historiques la contenaient (héritage) ; on ne la
  reproduit pas. → *Confirmer (ou : injecter une table de **suggestion** clairement marquée « indicatif, réglage
  au run-time » — non-normative).*
- **Q-4 — MCP côté codex/ollama.** `.mcp.json` s'applique-t-il à ces nœuds ? *Reco : **omettre par défaut*** (le
  support MCP hors Claude Code n'est pas garanti) ; générer seulement si un besoin confirmé apparaît. → *Confirmer.*
- **Q-5 — Host LAN paramétrable.** `ollama-lan` : le host est-il un **champ du nœud** (saisi à la génération) ou un
  placeholder `<host-lan>` à compléter par l'utilisateur dans l'`AGENTS.md` ? *Reco : champ de nœud si dispo, sinon
  placeholder documenté.* → *Confirmer.*

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5.

---

## 10. Phasage interne (un seul livrable P3b)

| Étape | Contenu | Critères |
|---|---|---|
| **0. Gabarits** | note `agents-md-gabarits-<date>.md` (réutilisation in-repo) | (traçabilité) |
| **1. Gardes deux-rendus** | `GuardrailRendering.prose` + catalogue enrichi + test fidélité | G-5, G-6 |
| **2. Builder AGENTS.md** | builder pur mutualisé (DRY) + adaptateur `codex` | G-2, G-4 |
| **3. Ollama localhost/lan** | specifics endpoint + registre `implemented:true` | G-1, G-3 |
| **4. Déploiement + qualité** | test `kit_deploy` inchangé (tmp) + non-régression P3 + tests | G-7, G-8, G-9, G-10, G-11 |

---

## 11. Journal de décision

- **2026-07-06** — Cadrage P3b (l'architecte-cadreur) : adaptateurs **codex** + **ollama-localhost/lan** sur le
  patron pur P3 → **famille `AGENTS.md`** (`KitFormat.agents-md`), **4 nœuds implémentés**, interface `RunnerAdapter`
  stable, `kit_deploy` inchangé. **Point structurant** : nœuds **sans hooks** → gardes rendues en **TEXTE**
  comportemental dans `AGENTS.md` ; le cœur modélise **deux rendus** (`GuardrailRendering { hook?, prose? }`), une
  intention. Canal d'identité **reproduit fidèlement** (texte issu de `kit-openwebui/AGENTS.md`, jamais dénaturé).
  Invariant AR-1 tenu : **aucun modèle** dans le généré (le modèle reste run-time/Cockpit). **Open WebUI (Models
  JSON) = P3c différé** (reco). Étape 0 **in-repo** (gabarits `kit-codex`/`kit-ollama`/`kit-openwebui`).
