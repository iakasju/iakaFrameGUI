# Instruction — Extensions de Fëanor : passerelle MVP-B (matérialisation d'élément), streaming, web live

> Cadrage P1 (🔵 **Gandalf**, 2026-07-27), sur mission Aragorn (chantier « extensions Fëanor »,
> dernier priorisé par le décideur). **Cadrage pur — ZÉRO code produit ici.** Ce fichier est le seul
> artefact ; l'écriture Gandalf est bornée à `specs/instructions/`. Exécution downstream = ⚒️ Gimli
> (cross-repo `iakaFrameGUI`), gate P2→P3 = 🏹 Legolas.
>
> **Filiation.** Suite directe de `feanor-en-tete-fonctionnel-llm.md` (chantier #1, MVP-A LIVRÉ :
> `FeanorHead` branché sur le transport LLM existant → Ollama LAN, conseil/chat honnête). Cette
> instruction ouvre les **trois extensions différées** nommées en § 7 « Hors périmètre » du #1 :
> (B) génération/écriture d'élément depuis l'en-tête, (streaming), (web live).
>
> **Constats mesurés sur le disque le 2026-07-27** — `preuve-avant-declaration`. Côté iakaframe :
> `~/work/iakaframe` (réservoir/canon). Côté GUI : `~/work/iakaFrameGUI` (lecture seule). Citations
> par **nom de fichier / de symbole** (les pointeurs chiffrés vieillissent) ; le message de remise à
> Aragorn porte les `chemin:ligne` cliquables.
>
> **Où vit cette instruction & doctrine cross-repo.** L'exécution touche le **dépôt GUI** (`src/`,
> et pour le streaming/web `src-tauri` + possiblement `packages/core`). Le cadrage est versé **ici,
> dans le canon** (pattern établi par le #1). **Avant que Gimli ne code**, en verser une copie/miroir
> dans `~/work/iakaFrameGUI/specs/instructions/`.
>
> **Limite de mesure assumée (honnêteté de sourcing).** L'outillage de listage (`rg`) était
> indisponible (`Glob`/`Grep` en échec). Les fichiers cités ont été **lus un par un** ; un point
> d'intégration non listé au cadrage est marqué **À-CONF** (à confirmer à l'ouverture par Gimli).

---

## 0. Reframe décisif (mesuré) — le fait nouveau : authoring + persistance disque **existent**

Au #1, la matérialisation était **hors périmètre** faute d'infra d'écriture. Depuis (Lots 5a→5c,
`persistance-disque-authoring-elements.md`, v0.32.0), **le socle d'écriture disque byte-préservant
est livré et gaté pour les 7 pools**. « Matérialiser un élément » n'est donc plus « bâtir un chemin
d'écriture » (il existe) mais « **acheminer une proposition structurée de Fëanor jusqu'à l'éditeur
de pool, que l'utilisateur relit et enregistre par le chemin de save existant** ».

### 0.1 Comment le Copilote (`CopiloteShell`) matérialise DÉJÀ — et pourquoi ce n'est PAS le geste de B

Mesuré dans `src/forge/CopiloteShell.tsx` + `src/forge/llm/resolve.ts` + `src/forge/llm/prompt.ts` +
`src/forge/mock/copilote.ts` :

| Brique | Ce qu'elle fait (mesuré) |
|---|---|
| `resolveProposition` (`resolve.ts`) | oriente **live vs mock**, **ne lève jamais**, repli mock déterministe + `reason`. Le LLM ne pilote QUE `intro/artefacts/ops` ; `diff/model/hint/diffFile` sont **recalculés par notre code** (frontière de confiance). |
| Schéma `LLM_OUTPUT_SCHEMA` (`prompt.ts`) | sortie `{intro, artefacts, ops}` ; `ops = {target, id, label}` où `target ∈ SURFACE_TARGETS[surface]` et **`id ∈ TARGET_ELEMENT_POOL`** = **ids de catalogue déjà existants**. |
| `onApply(ops)` (`CopiloteShell`) | à « Valider », l'**atelier** insère les ops via son **chemin d'insertion réel** (le `+` du rail). Le copilote n'écrit **rien** lui-même. |

**Verdict de mesure : la matérialisation du Copilote est une matérialisation *par RÉFÉRENCE*** — elle
insère des **ids de sous-éléments déjà présents au catalogue** dans un **artefact composite**
(team / méthode / kit). Elle **n'écrit AUCUN nouveau `.md` de pool** ; elle ne compose pas les champs
d'un élément neuf. C'est un geste **différent** de la passerelle B.

### 0.2 Ce que B demande — et ce que Fëanor-en-tête peut réutiliser

La passerelle B veut que Fëanor **compose un élément NEUF** (persona/skill/principe/…) : ses **champs
de frontmatter** (pour une persona : `name`, `roleKey`, `royaume`, `mission`, `pastille`, `skills[]`,
`guardrails[]`) et, à terme, son **corps**. Le chemin d'écriture existe déjà et est **uniforme** :

- **`FeanorHead`** est monté par l'hôte générique **`ElementReservoir`** (via `ElementFiche`) en tête
  des modes `edit`/`create` de **chaque pool**, paramétré par un **`ElementKind<T>`** (`elementKind.ts`)
  qui injecte source, fiches, adaptateur Fëanor et **l'éditeur** (`kind.Editor`).
- L'éditeur (ex. `src/components/PersonaEditor.tsx`) tient un **`draft` local** (seedé du prop
  `element` via un initialiseur `useState`), et à « Enregistrer » remonte l'élément à `onSubmit`.
- `ElementReservoir.onSubmit` appelle **`persist(next)`** = le module **`<pool>Persist.ts`**
  (`personaPersist`, `principlePersist`, … — les 7 pools, Lot 5) : `poolRead` (octets réels) →
  **`patchFrontmatter(existing, <pool>FrontmatterPatch(obj))`** en édition ou **`serialize<Pool>Md(obj)`**
  en création → **`poolWrite`** (Rust `pool_write`). **Round-trip byte-préservant déjà prouvé.**

**Conséquence : B n'a besoin d'AUCUN nouveau chemin d'écriture.** Le geste = *Fëanor propose des
champs → l'hôte pré-remplit `kind.Editor` → l'utilisateur relit et clique « Enregistrer » → le
chemin `persist<Pool>` → `poolWrite` existant écrit.* **L'acceptation explicite est le clic
« Enregistrer » déjà en place** — rien n'est écrit sans lui, par construction.

Ce qui **manque** (le vrai coût de B) :
1. un **schéma de proposition d'élément** (les champs éditables du pool) — **différent** de
   `LLM_OUTPUT_SCHEMA` (qui produit des `ops`, pas des champs). Il est **spécifique au pool**.
2. un **résolveur sœur** `resolveElementProposition` (calqué sur `advise.ts`/`resolve.ts` :
   live/mock, ne lève jamais, repli honnête) qui rend un **`Partial<T>` de champs** ou `null`.
3. l'**acheminement** de la proposition de `FeanorHead` vers `kind.Editor` (l'éditeur seede son
   `draft` par un initialiseur `useState` → **re-seed = remontage par `key` OU draft contrôlé** :
   **FORK D**).

**`resolveProposition` est-il réutilisable ?** Sa **discipline** (live/mock, never-throw, LLM pilote
les seuls champs créatifs, notre code tient la frontière de confiance) : **oui, comme patron**. Son
**schéma/parseur** (`parseLiveProposition` du cœur, `ops` vers composite) : **non** — mauvaise forme.
B reprend donc le **patron** de `advise.ts` (schéma + parseur **locaux `src/`**, jamais dans le cœur).

---

## 1. Le besoin, reformulé (le problème avant la solution)

Rendre Fëanor **productif au-delà du conseil**, en trois extensions **découpées et ordonnées** :

- **B — matérialisation d'élément** : Fëanor propose un élément structuré ; l'utilisateur l'accepte ;
  il est écrit dans la library — **sur acceptation explicite seulement**, **jamais** de fausse
  proposition si le modèle est absent, round-trip byte-préservant conservé.
- **Streaming** : afficher la réponse en **tokens progressifs** plutôt qu'en un bloc.
- **Web live** : donner à Fëanor-résident une **recherche web live** (érudition à jour).

**MVP d'abord, puis itérer** : on ne livre pas les trois d'un bloc. On tranche un **ordre** et une
**brique pilote**.

---

## 2. FORKS décideur (Gandalf propose, le décideur tranche)

### FORK ORDRE — quelle brique d'abord ? → **B d'abord, puis streaming, puis web live (hors MVP)** (reco forte)

Raisonnement :
- **B est GUI-only, petit et à forte valeur** : il rend Fëanor **productif** en réutilisant
  l'authoring/persistance **tout juste livrés** ; aucun cross-repo, aucune touche cœur/Rust/fixture.
- **Streaming est cross-repo (Rust `src-tauri`) et de valeur purement UX** (confort, pas capacité
  neuve) : il vient **après**.
- **Web live est le plus risqué et le moins « MVP »** (voie réseau neuve hors façade C-8, CSP /
  capabilities, honnêteté de sourcing) : **hors MVP**, north-star derrière un flag, à **re-cadrer**.

→ **Reco : engager B seul comme lot pilote** ; streaming en lot suivant ; web live sorti du MVP.
**À trancher décideur** : valider cet ordre, ou re-prioriser.

### FORK B-SCOPE — B sur **un pool pilote** vs **les 7 pools d'un coup** → **pilote persona d'abord** (reco)

Le schéma de proposition est **spécifique au pool** (champs différents ; `skills` est un cas à part —
dossier `SKILL.md`, corps markdown différé). Comme Lot 5 (persistance) a procédé **pool par pool**,
B fait de même : **piloter sur `persona`** (le pool de référence, `feanorSourceFrom` présent), prouver
le geste de bout en bout, **puis généraliser** pool par pool (incrément faible chacun), OU introduire
une **abstraction de descripteurs de champs** sur `ElementKind` pour dériver le schéma génériquement
(coût initial, gain ensuite). **Reco : pilote persona**, généralisation en itérations. **À trancher**.

### FORK D — acheminement de la proposition vers l'éditeur → **remontage par `key`** (reco)

L'éditeur seede son `draft` par un initialiseur `useState(persona ? {...persona} : {...EMPTY})`
(mesuré `PersonaEditor.tsx`) : un changement de prop **ne re-seede pas** sans remontage. Deux voies :
- **(D-a, reco) remontage par `key`** : l'hôte lève la proposition au niveau `ElementReservoir`, la
  fusionne (`{...blank, ...proposal}`), la passe comme `element` **avec une `key` dérivée** → l'éditeur
  se remonte pré-rempli. **Zéro modification de l'éditeur** (réutilisation pure).
- **(D-b) draft contrôlé** : ajouter à l'éditeur un prop `seed`/`draft` contrôlé. Plus intrusif,
  touche tous les éditeurs.

**Reco : D-a** (moins invasif, respecte « réutilise l'éditeur existant, jamais réimplémenté »).
**À trancher décideur / à confirmer à l'ouverture** (A-CONF : mécanique de re-seed retenue).

### FORK STREAMING — au MVP ou itération séparée ? → **itération séparée, cross-repo** (reco)

Fait externe vérifié (Sources) : le transport actuel est **`stream:false`** (Rust `llm_complete`,
un bloc). Le streaming exige côté **Rust `src-tauri`** de consommer le flux **NDJSON** d'Ollama
(`/api/chat` avec `stream:true`, `application/x-ndjson`, objet final `done:true`) **ligne par ligne**,
et de pousser les tokens au front via l'**API Channel de Tauri v2** (recommandée pour le streaming,
vs le bus d'événements pour de petits messages). Côté front : un abonnement + accumulation, plus la
**gestion honnête** de l'interruption/partiel. **Point de vigilance contrat** : l'interface
`LlmTransport` du cœur expose `complete(req): Promise<string>` ; un mode streaming demande soit une
**variante `stream(req, onToken)`** — qui **toucherait `@iakaframe/core`** (→ cross-repo + vendor) —
soit un canal **local `src/`** contournant l'interface (à qualifier). **Reco : hors MVP**, lot séparé.
**À trancher** : streaming au MVP (accepter le cross-repo Rust) ou différé.

### FORK WEB LIVE — au MVP ? → **NON, hors MVP** (reco forte)

Mesuré : `feanor.md` déclare `WebSearch`/`WebFetch` **au binding d'AGENT** (Claude Code), **pas** au
Fëanor **résident du GUI**. Le Fëanor résident parle à **Ollama**, qui **n'a pas** d'outil web. Chemin
possibles dans le GUI, tous problématiques :
- **Façade Tauri (reqwest)** vers un moteur de recherche : introduit une **voie réseau NEUVE hors
  façade C-8** (aujourd'hui bornée au **seul hôte Ollama** allow-listé) ; élargir les **capabilities /
  CSP** à « n'importe quel hôte web » **ouvre une surface de sécurité** difficile à borner.
- **Tool-calling Ollama / MCP de recherche** : plus lourd, hors MVP.
- **« citer depuis l'entraînement »** : ce n'est **pas** du live — l'appeler « web live » serait
  **malhonnête**.
- **Honnêteté** : tout résultat web doit être **sourcé et cité**, jamais halluciné (règle Fëanor).

**Reco : SANS web live au MVP** ; north-star derrière un flag ; **re-cadrage dédié** (avec un spike
de qualification CSP/capabilities). **À trancher** : confirmer « sans ».

---

## 3. Conception retenue — brique B (si l'ordre B-first est tranché)

1. **Schéma de proposition (pilote persona), local `src/`.** Un schéma JSON imposé à Ollama
   (`format`, sorties structurées) dont les propriétés sont **les champs éditables du pool** (persona :
   `name`, `roleKey`, `royaume`, `mission`, `pastille`, `skills[]`, `guardrails[]`). **Distinct** de
   `LLM_OUTPUT_SCHEMA` (I-6 : le schéma du copilote reste intouché). Vit dans `src/`, **jamais** dans
   le cœur — comme le schéma `{reply}` de `advise.ts`.
2. **Résolveur sœur `resolveElementProposition`.** Calqué sur `advise.ts` : oriente **live vs repli
   honnête**, **ne lève jamais**, réutilise le **transport** (`realLlm(backend)` → Rust `llm_complete`,
   `fakeLlm` en test), l'**identité** (`loadCopiloteIdentity`, rôle `frame`) et les **réglages**
   (`authoringModel`/`authoringEndpoint`). Rend un **`Partial<T>` de champs** validé (ids `skills`/
   `guardrails` filtrés au catalogue, comme le parsing du copilote) **ou `null` + `reason`**.
3. **Honnêteté (non négociable, calquée sur `advise.ts`, PAS sur `propose`).** Modèle absent / provider
   ≠ ollama / réseau KO / réponse illisible → **AUCUNE proposition fabriquée** (`null` + `reason`
   affichée). Le mock **déterministe** existe **pour le dev/les tests** (script `fakeLlm`), **jamais**
   présenté comme une vraie proposition de Fëanor, **jamais** auto-écrit. (Différence assumée avec le
   `propose` du copilote qui, lui, fabrique toujours un repli.)
4. **Acheminement (FORK D-a).** `FeanorHead` expose un `onProposeElement?(partial)` ; `ElementReservoir`
   lève la proposition, fusionne `{...kind.blankEntity-equivalent, ...partial}` en `T`, la passe à
   `kind.Editor` **avec un remontage par `key`** → éditeur **pré-rempli**. L'utilisateur **relit**,
   corrige, puis **« Enregistrer »** = chemin `persist<Pool>` existant.
5. **Acceptation explicite = save existant.** Aucun nouveau bouton d'écriture ; aucune écriture avant
   « Enregistrer ». Id **verrouillé** en édition (C-1, jamais de renommage). Élément écrit dans
   `library/<pool>/<id>.md` = **élément de 1er ordre référençable** (Constitution).
6. **UX en-tête.** Distinguer visuellement « conseil » (texte, MVP-A) de « proposition d'élément »
   (structurée, pré-remplit l'éditeur). Un mode/onglet ou un bouton dédié dans `FeanorHead`
   (A-CONF : forme d'UI, calée sur la maquette si une existe — sinon minimal honnête).

**Aucun changement Rust. Aucun changement `@iakaframe/core`. Aucun secret. `LLM_OUTPUT_SCHEMA`
intouché** (B a son propre schéma d'éléments local `src/`). Round-trip byte-préservant conservé
(réutilise `patchFrontmatter`/`serialize<Pool>Md` via `persist<Pool>`).

---

## 4. Verdict **cross-repo par brique**

| Brique | Verdict | Justification mesurée |
|---|---|---|
| **B — matérialisation** | **GUI-ONLY** | Chemin d'écriture (`persist<Pool>` → `poolWrite`) et transport/identité/réglages **existent**. B n'ajoute qu'un **schéma d'élément local `src/`**, un **résolveur sœur `src/`** et un **câblage UI** (addition au-dessus des contrats). Cœur / Rust / schéma vendoré / fixtures **intouchés** → **`vendor-check` drift 0 par construction** (invariant de sortie, pas une tâche). |
| **Streaming** | **CROSS-REPO (Rust)** | Touche `src-tauri` (lecture NDJSON `stream:true`, Channel Tauri v2), la façade `backend.ts`, et **possiblement `@iakaframe/core`** (variante streaming de `LlmTransport`). **Si le cœur est touché → `vendor-check --strict` drift 0, canon + fixtures régénérés ENSEMBLE.** |
| **Web live** | **À QUALIFIER, CROSS-REPO** | Voie réseau neuve hors C-8 : façade Tauri (reqwest) + **capabilities/CSP** élargies (`src-tauri`). Risque sécurité/honnêteté élevé. **Hors MVP** ; spike de qualification avant tout cadrage d'exécution. |

Règle opposable : **pour tout ce qui touche `packages/core` / Rust / fixtures → `vendor-check --strict`
drift 0, canon + fixtures ensemble** (jamais l'un sans l'autre).

---

## 5. Contraintes DURES inscrites (rappel opposable à Gimli)

- **Honnêteté Fëanor (non négociable)** : **pas de fausse proposition** ; matérialisation **sur
  acceptation explicite uniquement** (le « Enregistrer » existant) ; modèle absent / réseau KO /
  illisible → aveu clair (`reason`), **jamais** un élément fabriqué présenté comme proposé par Fëanor,
  **jamais** de stack brute à l'UI. Réutiliser le socle honnête du #1 (`advise.ts`), **pas** le
  `propose` toujours-mocké du copilote.
- **Self-hosted d'abord** : Ollama LAN (déjà en place), **aucun cloud** introduit ; **mock
  déterministe en dev** (via `fakeLlm`, zéro réseau) ; **jamais de secret commité** (Ollama sans clé ;
  modèle/endpoint en Settings, jamais en dur).
- **Round-trip byte-préservant conservé** pour toute écriture : réutiliser **`patchFrontmatter` /
  `<pool>FrontmatterPatch` / `serialize<Pool>Md`** via `persist<Pool>` ; **ne pas** réémettre un `.md`
  depuis le seul type (édition = patch sur octets réels relus par `poolRead`).
- **Activation explicite** : **aucun** appel LLM au montage ; seulement au geste (invariant Fëanor,
  déjà tenu par `FeanorHead`/`CopiloteShell` — à répliquer et **verrouiller par test** pour B).
- **Constitution** : les éléments matérialisés = **éléments de library de 1er ordre**, référencés ;
  **id verrouillé en édition (C-1, pas de renommage)** ; le **frame reste autoritaire**.
- **MVP d'abord, puis itérer** : B pilote (persona) livré et gaté **avant** généralisation ; streaming
  et web live en lots distincts (jamais les trois d'un bloc).
- **Identité dérivée du canon** (I-1) : jamais réécrite en dur ; repli anonyme **dit** si fiche
  `frame` introuvable.

---

## 6. Critères d'acceptation (mesurables)

**Brique B (pilote persona) :**
- **AC-B1 — proposition réelle (live).** Sur `authoringModel = ollama:<modèle>` joignable, un geste
  « proposer un élément » produit une **proposition structurée du modèle** qui **pré-remplit
  l'éditeur** (champs persona). Prouvé en test via `fakeLlm` (transport injecté, zéro réseau).
- **AC-B2 — acceptation explicite = save existant.** **Rien n'est écrit** tant que l'utilisateur n'a
  pas cliqué « Enregistrer » ; l'écriture emprunte **`persist<Pool>` → `poolWrite`** (aucun nouveau
  chemin d'écriture). Prouvé par test (aucun `poolWrite` avant le clic).
- **AC-B3 — honnêteté / jamais de fausse proposition.** Modèle absent/vide, provider ≠ `ollama`,
  réseau KO/timeout, réponse illisible → **aucune proposition affichée comme réelle** : aveu clair
  (`reason`). Prouvé par cas dédiés (`Error` scriptée dans `fakeLlm`).
- **AC-B4 — round-trip byte-préservant.** L'écriture d'un élément **édité** via une proposition
  préserve `description`/`vignette`/corps/clés inconnues à l'octet (édition = `patchFrontmatter`) ;
  création = `serialize<Pool>Md` canonique. Prouvé sur `.md` réels.
- **AC-B5 — id verrouillé (C-1).** Une proposition en **édition** ne renomme jamais l'id ; en
  **création**, l'id est dérivé/unique. Test explicite.
- **AC-B6 — activation explicite.** Aucun `llm.complete` au montage ; exactement un par geste ; garde
  anti-double-appel (`pending`). Test.
- **AC-B7 — GUI-only, zéro contrat touché.** `git diff` sur `packages/core/src/*`, schéma vendoré et
  fixtures = **vide** ; aucun changement Rust ; **`vendor-check` drift 0 inchangé**.

**Brique Streaming (si engagée) :**
- **AC-S1 — tokens progressifs.** La réponse s'affiche **incrémentalement** ; l'objet final `done:true`
  clôt proprement. **AC-S2 — honnêteté du partiel** : une interruption/erreur en cours **ne laisse
  pas** une réponse tronquée passée pour complète (état clair). **AC-S3 — parité cross-repo** : si
  `@iakaframe/core` est touché, `vendor-check --strict` drift 0, **canon + fixtures régénérés
  ensemble** ; sinon justifier le confinement `src/`.

**Transverse :**
- **AC-G — gate GUI vert** : `npm run lint:all` = 0 ; `npm run test:all` = 0, **compte de tests non
  diminué** ; **`vendor-check --strict` (côté iakaframe) drift 0**.

---

## 7. Estimation (obligatoire au jalon P1→P2 — ordre de grandeur assumé, révisable)

| Brique | Équivalent j-h | Complexité / risque | Inconnues (susceptibles de faire glisser) |
|---|---|---|---|
| **B — pilote persona** | **≈ 2–3 j-h** | **Faible-moyen** (GUI-only, réutilisation maximale ; le neuf = schéma d'élément + parseur + résolveur sœur + câblage re-seed + honnêteté + tests). | (1) **FORK D** re-seed éditeur (remontage `key` vs draft contrôlé) — A-CONF. (2) forme d'**UI** dans `FeanorHead` (maquette ?). (3) **modèle Ollama** cible sur le LAN. |
| **B — généralisation 6 autres pools** | **≈ +0,5–1 j-h/pool** (ou **≈ 1–2 j-h** pour une abstraction de descripteurs de champs sur `ElementKind`, puis très faible/pool) | **Faible** (incrément par pool). | `skills` = **cas à part** (dossier `SKILL.md`, corps markdown **différé**) ; champs riches par pool. |
| **Streaming** | **≈ 3–5 j-h** | **Moyen-haut** (**cross-repo** Rust NDJSON + Channel Tauri v2, façade `backend.ts`, accumulation front, honnêteté du partiel). | interface `LlmTransport` du **cœur** touchée (→ vendor) **ou** canal `src/`-local (à qualifier) ; interruption/abort ; parité fixtures si core. |
| **Web live** | **non estimé (hors MVP)** ; **spike de qualification ≈ 1 j-h** | **Haut** (voie réseau hors C-8, CSP/capabilities, honnêteté de sourcing). | faisabilité CSP ; bornage des hôtes ; tool-calling/MCP vs façade ; citation obligatoire des sources. |

> Rappel méthode : estimation **rappelée à la clôture du lot**, confrontée au **temps réel**, pour
> affiner les suivantes. Ce n'est **pas** un engagement ferme.

**Reco d'engagement** : ouvrir **B pilote persona seul** (≈ 2–3 j-h, GUI-only, faible risque),
gate Legolas, puis décider généralisation / streaming à la clôture.

---

## 8. Hors périmètre

- **Streaming** et **web live** hors du lot B (lots distincts ; web live d'abord **re-cadré**).
- **Corps markdown** des éléments (ex. `SKILL.md`) en authoring — **différé** (aligné sur l'état des
  lieux v0.32.0).
- Toute évolution **non nécessaire** de `@iakaframe/core`, du schéma vendoré, des fixtures, du Rust
  (B est GUI-only ; streaming/web sont cross-repo et cadrés à part).
- Le **sélecteur de frame active** (dépendance R3 connue : la fiche `frame` dépend de la frame active ;
  repli anonyme en attendant) — lot distinct.

---

## Sources (faits externes — obligation de sourcing)

Vérifiés le 2026-07-27 (faits qui **conditionnent le verdict cross-repo du streaming**) :

- **Tauri v2 — Channel API recommandée pour le streaming** (vs bus d'événements pour petits
  messages), émission Rust → front token par token :
  <https://v2.tauri.app/develop/calling-frontend/>
- **Ollama `/api/chat` — streaming NDJSON** (`stream:true` par défaut, `application/x-ndjson`, un objet
  JSON par ligne, objet final `done:true` ; `stream:false` = un bloc `application/json`) :
  <https://docs.ollama.com/api/streaming>

Les décisions de la brique **B** ne dépendent d'**aucun fait externe versionné** : la posture est la
**réutilisation** d'une pile déjà présente (transport Ollama, `poolWrite`/`persist<Pool>` livrés) —
faits **internes mesurés sur disque** (§ 0), l'existant primant sur l'état de l'art ici.
