# Instruction — Rendre **Fëanor-en-tête** fonctionnel : brancher un vrai LLM derrière `FeanorHead`

> Cadrage P1 (🔵 **Gandalf**, 2026-07-26), sur mission Aragorn (chantier #1 priorisé décideur).
> **Cadrage pur — ZÉRO code produit ici.** Ce fichier est le seul artefact ; l'écriture Gandalf est
> bornée à `specs/instructions/`. Exécution downstream = ⚒️ Gimli (cross-repo `iakaFrameGUI`), gate
> P2→P3 = 🏹 Legolas.
>
> **Ce chantier EST le « chantier séparé » nommé par le Lot 6.** `alignement-gui-modele-de-frame.md`
> § 7 Fork C (tranché décideur) : *« Le Lot 6 livre une COQUILLE (…), sans comportement d'IA.
> L'assistant fonctionnel (LLM branché) est un chantier SÉPARÉ, hors ce lot. »* La présente
> instruction ouvre ce chantier séparé.
>
> **Constats mesurés sur le disque le 2026-07-26** — `preuve-avant-declaration`. Côté iakaframe :
> `~/work/iakaframe` (réservoir/canon). Côté GUI : `~/work/iakaFrameGUI` (lecture seule). Citations
> par **nom de fichier / de symbole** (les pointeurs chiffrés vieillissent) ; le message de remise à
> Aragorn porte les `chemin:ligne` cliquables.
>
> **Où vit cette instruction & doctrine cross-repo.** L'exécution touche le **dépôt GUI** (`src/`).
> Le cadrage est versé **ici, dans le canon** (comme son parent `alignement-gui-modele-de-frame.md`
> et comme `correction-biais-modele-frame.md`). **Avant que Gimli ne code**, en verser une copie/miroir
> dans `~/work/iakaFrameGUI/specs/instructions/` (pattern établi : *« l'instruction vit dans le dépôt
> canon, pas ici — verser le cadrage avant de coder »*).

---

## 0. Reframe décisif (mesuré) — le LLM Fëanor est **déjà branché**, mais pas sur cette surface

Le brief demandait de « brancher un vrai LLM derrière la coquille inerte `FeanorHead` ». La mesure
révèle un fait qui **recadre tout le chantier** : **le transport LLM existe déjà, est livré, testé,
self-hosted et identifié Fëanor** — mais il est câblé sur une **autre** surface (`CopiloteShell`),
pas sur `FeanorHead`. Il y a **deux surfaces Fëanor** dans le GUI.

### 0.1 Surface A — `CopiloteShell` : LLM **fonctionnel, livré** (chantier `feanor-copilote-du-gui.md`, LIVRÉ 2026-07-26)

`src/forge/CopiloteShell.tsx` porte une **boucle complète et vivante** *intention → PROPOSITION
d'artefacts → diff → Valider/Rejeter → matérialisation par l'atelier*. Toute la pile LLM existe :

| Brique | Fichier / symbole | Ce qu'elle fait (mesuré) |
|---|---|---|
| **Transport** | `src/forge/llm/transport.ts` — `realLlm(backend)` / `fakeLlm(script)` | isole l'appel réseau derrière `LlmTransport` (cœur). `fakeLlm` = transport de test **zéro réseau** |
| **Voie réseau** | `src/api/backend.ts` — `llmComplete` → commande Rust `llm_complete` | appel **DIRECT à Ollama** (`POST {host}/api/chat`, `stream:false`, `format:<schema>`), reqwest, **self-hosted**. **Seule** voie réseau du front (façade C-8) |
| **Résolveur** | `src/forge/llm/resolve.ts` — `resolveProposition` | oriente **live vs mock**, **ne lève JAMAIS**, repli mock déterministe + `reason` clair (`FALLBACK_UNAVAILABLE/UNSUPPORTED/UNREADABLE`). Provider MVP = **`ollama` seul** ; timeout 20 s |
| **Mock déterministe** | `src/forge/mock/copilote.ts` — `propose` | même entrée → même sortie, sans réseau (`mock-en-dev`) |
| **Identité Fëanor** | `src/forge/llm/identity.ts` — `loadCopiloteIdentity` + `copiloteBadgeOpen/Close` | dérive l'identité du **canon** (`feanor.md`, rôle `frame`, par `poolReadAll`), badge 🟠 posé par l'UI |
| **Prompt** | `src/forge/llm/prompt.ts` — `buildSystemPrompt(identity?)` + schéma `LLM_OUTPUT_SCHEMA` | système injecté d'identité (sans → byte-identique) ; sortie structurée `{intro, artefacts, ops}` |
| **Réglages** | `authoringModel` / `authoringEndpoint` (Settings) | modèle d'authoring **global, sans défaut** (l'absence est signalée, jamais masquée) ; endpoint Ollama **LAN** (défaut `localhost:11434`). **Aucun secret** (Ollama = pas de clé) |

**Conséquence n°1 : il n'y a rien à réinventer côté transport.** Self-hosted (Ollama), mock
déterministe, identité canon, honnêteté (never-throw + `reason`), activation explicite (aucun
appel LLM au montage — seulement au geste), zéro secret : **tout est déjà là et gaté**.

### 0.2 Surface B — `FeanorHead` : la **coquille inerte** (Lot 6, Fork C)

`src/forge/FeanorHead.tsx` (+ `feanorHeadModel.ts`) = une **bande d'en-tête** posée **en haut des
pages d'authoring d'un élément** (persona, en mode ✚ création ET ✎ édition) : vignette de l'entité +
vignette Fëanor (flamme) + zone de prompt + bouton d'envoi **inerte** + aveu honnête
(`FEANOR_STUB_NOTICE` / `FEANOR_INERT_HINT`). Son docstring **dit** explicitement qu'elle
**n'appelle rien** et **ne réutilise pas** `CopiloteShell` *« précisément pour rester inerte »*. Ses
suggestions (« Réécris la mission », « Ajoute un garde-fou », « Génère une variante ») visent un UX
de **conseil/chat en texte libre** sur l'élément courant.

**Conséquence n°2 : le vrai objet du chantier n'est pas « bâtir un transport » (il existe) mais
« brancher `FeanorHead` sur la pile existante », en tranchant CE QUE fait cette surface** —
et comment elle **coexiste** avec `CopiloteShell` sans redondance ni double emploi.

### 0.3 Les deux surfaces ne sont **pas** redondantes (verdict)

- `CopiloteShell` = **console par atelier** (surfaces `team`/`methode`/`kit`), boucle
  **propose-ops → matérialise** depuis l'element-pool (une forme de génération d'élément).
- `FeanorHead` = **en-tête par élément** sur la page d'authoring d'une persona, UX **conseil/chat**
  sur l'entité en cours.

Placements et gestes distincts → **complémentaires**. Le chantier ne supprime ni ne fond `CopiloteShell` ;
il donne vie à `FeanorHead` **dans son propre registre** (conseil), en **réutilisant** la pile LLM.

> **Limite de mesure assumée (honnêteté de sourcing).** L'outillage de listage de l'environnement
> était indisponible (`rg` absent → `Glob`/`Grep` en échec). Le **point de montage exact** de
> `FeanorHead` (quelle page/atelier de persona l'instancie, avec quels `mode`/`entity`/`feanorSource`)
> **n'a pas pu être localisé** au fichier. Il est **à confirmer à l'ouverture** par Gimli (A-CONF) ;
> le docstring de `FeanorHead` (« en haut des pages d'authoring d'un élément ») et
> `FeanorHead.test.tsx` (props `mode`/`entity`/`feanorSource`) en fixent le contrat d'entrée.

---

## 1. Le besoin, reformulé (le problème avant la solution)

Rendre `FeanorHead` **utile et honnête** : quand l'utilisateur écrit une intention dans l'en-tête et
envoie, Fëanor **répond réellement** (via le LLM self-hosted déjà en place), **avec son identité**
(badge 🟠 ouverture/clôture posé par l'UI). Tant que rien n'est branché/joignable, la coquille
**reste honnête** (mock déterministe + mention claire, **jamais** de fausse réponse d'IA). Le tout
en **réutilisant** la pile `llm/` existante — **sans** dupliquer un second transport, **sans** toucher
un contrat de données.

---

## 2. FORKS décideur (Gandalf propose, le décideur tranche)

> Le reframe § 0 **referme par l'existant** ce qui, dans le brief, semblait ouvert (quel transport,
> self-hosted vs cloud, mock). Je le **signale** plutôt que de le rouvrir. Restent **trois** vrais
> arbitrages de périmètre.

### FORK A — Transport & modèle → **RÉUTILISER l'existant** (reco forte, quasi-tranché par l'existant)

- **Reco : réutiliser intégralement** `realLlm(backend)` → Rust `llm_complete` → **Ollama** direct,
  endpoint **LAN** via `authoringEndpoint`, modèle via `authoringModel`, repli **mock déterministe**,
  identité **Fëanor** via `loadCopiloteIdentity`, provider **`ollama` seul** au MVP, timeout 20 s,
  **aucun secret**. **Self-hosted d'abord** : déjà satisfait (Ollama), **aucun cloud** introduit.
- **Modèle par défaut : aucun** (conforme au choix décideur déjà pris pour l'authoring : l'absence
  est **signalée**, pas masquée). Reco de **configuration** (non hard-wirée) : un modèle Ollama
  d'instruction générale disponible sur l'iakabox ; à confirmer selon ce qui tourne sur le LAN.
- **Ce qui reste à trancher au décideur** : rien de structurant — valider que **réutiliser** (et non
  ré-implémenter) est le cap. *(À confirmer : le modèle d'authoring `authoringModel` est-il partagé
  avec Fëanor-en-tête, ou Fëanor-en-tête mérite-t-il son propre réglage de modèle ? **Reco :
  partager** `authoringModel` au MVP — un seul modèle d'authoring global, comme aujourd'hui.)*

### FORK B — Périmètre MVP : **conseil/chat (A)** vs **conseil + génération d'élément (B)**

- **MVP-A — conseil/chat en texte libre (RECO).** L'intention part au LLM, la **réponse texte**
  s'affiche dans l'en-tête (badge Fëanor ouverture/clôture), **SANS aucune écriture**. Réutilise
  `realLlm` + identité + repli mock ; ajoute un **chemin texte** (un prompt Fëanor-conseil + un schéma
  de sortie minimal `{reply: string}`), **addition `src/` pure**, **zéro contrat cœur touché**. C'est
  le plus petit truc **utile ET honnête**, et il colle à l'UX voulu de `FeanorHead` (« réécris la
  mission », « génère une variante » = du **texte**, pas des ids d'element-pool).
- **MVP-B — conseil + génération d'élément.** Fëanor **propose** un élément que l'utilisateur peut
  **accepter** → écriture dans `library/` (sur demande explicite, non destructif). **Déjà porté par
  `CopiloteShell`** dans son registre (propose-ops → `onApply` de l'atelier). Le refaire dans
  `FeanorHead` **dupliquerait** ce geste et forcerait l'UX chat dans le moule propose-ids — **contre
  la maquette**.
- **Reco : MVP-A d'abord** (FeanorHead = surface de **conseil**), MVP-B **écarté de ce lot** (déjà
  couvert par `CopiloteShell` ; une éventuelle génération depuis l'en-tête = **itération** ultérieure,
  cadrée à part). **À trancher décideur** : A seul, ou A+passerelle vers la matérialisation de
  `CopiloteShell` ?

### FORK C — Accès **web live** au MVP → **NON** (reco)

- `feanor.md` déclare `WebSearch`/`WebFetch`, mais **à son binding d'AGENT** (Claude Code, hors GUI).
  Le Fëanor **résident du GUI** parle via le LLM Ollama d'authoring — qui **n'a pas** d'outil web, et
  lui en ajouter un serait de la **sur-ingénierie** au MVP (et introduirait une voie réseau nouvelle
  hors façade C-8). **Reco : SANS web live au MVP**, laissé en **north-star** derrière un flag.
  **À trancher décideur** : confirmer « sans ».

### (Non-fork) Sous-décision de scoping à acter — **streaming**

Le transport actuel est **`stream:false`** (Rust `llm_complete`). Le brief évoquait un affichage
« streaming ». **Reco : réponse en un bloc au MVP** (réutilisation directe, honnête) ; le **streaming
= itération** (il faut un canal événementiel Rust — plus lourd, hors MVP). **À acter** : MVP non-streamé.

---

## 3. Conception retenue (si MVP-A tranché) — réutilisation maximale, zéro contrat touché

1. **Chemin texte réutilisant le transport.** Un résolveur de conseil, sœur de `resolveProposition`
   mais rendant du **texte** : oriente **live** (`realLlm.complete` avec un `LlmRequest` dont
   `system` = prompt Fëanor-conseil, `format` = schéma minimal `{reply}` **local `src/`**) **vs mock
   déterministe** ; **ne lève jamais** ; repli mock + `reason` clair sur réseau KO / illisible /
   provider non supporté. **Même discipline que `resolve.ts`.**
2. **Prompt système = identité Fëanor dérivée du canon.** Réutiliser `loadCopiloteIdentity` (rôle
   `frame`) + un bloc « tu conseilles sur l'élément en cours d'authoring, tu n'écris rien toi-même ».
   **Aucune identité fabriquée** : fiche introuvable → repli anonyme **dit** (comme AC-3 du copilote).
3. **Badge posé par l'UI, jamais demandé au modèle** : `copiloteBadgeOpen/Close` (déjà là) —
   ouverture avant la réponse, clôture après. Le modèle ne se signe pas (pas de ventriloquie).
4. **Honnêteté par construction** : tant qu'aucun modèle n'est configuré/joignable → **mock
   déterministe** + mention claire (réutiliser l'esprit de `NO_AUTHORING_MODEL_HINT` et des `FALLBACK_*`).
   **Jamais** de fausse réponse : la coquille n'affiche une « réponse Fëanor » **que** si elle vient
   réellement du modèle (ou est explicitement étiquetée « mock/repli »).
5. **Câblage `FeanorHead`** : le bouton d'envoi (aujourd'hui `onClick={() => setStubbed(true)}`)
   appelle le résolveur ; le prompt et la réponse remplacent l'aveu d'inertie ; garde **anti-double
   appel** (`pending`) et **aucun appel au montage** (activation explicite, comme `CopiloteShell`).
   Retirer / conditionner `FEANOR_STUB_NOTICE` **seulement** une fois le vrai chemin en place — pas de
   fenêtre où la coquille ment.

**Aucun changement Rust. Aucun changement `@iakaframe/core`. Aucun secret. Le schéma de sortie du
copilote (`LLM_OUTPUT_SCHEMA`) n'est pas touché** (le chat a son propre schéma `{reply}` local `src/`).

---

## 4. Verdict **cross-repo vs GUI-only**

**GUI-ONLY.** Le transport (`realLlm`, `LlmTransport`/`LlmRequest`, `llm_complete` Rust), l'identité
(`loadCopiloteIdentity`), le mock et le schéma copilote **existent déjà et sont réutilisés tels
quels**. MVP-A n'ajoute qu'un **prompt**, un **schéma `{reply}` local**, un **résolveur de conseil**
et le **câblage UI** — **pure addition dans `src/` du GUI**, au-dessus de la ligne des contrats.

- **`packages/core/src/*` : intouché** (aucun sérialiseur/schéma/parseur modifié).
- **Schéma vendoré & fixtures vendorées : intouchés** — `persona.feanor.md` est **déjà** vendorée
  (chantier copilote). Donc **`vendor-check` n'est pas un objet de ce chantier** : il reste **drift 0**
  par construction (invariant de sortie, pas une tâche).
- **Rust (`src-tauri`) : intouché** — `llm_complete` couvre déjà l'appel Ollama.
- **Pas de cross-repo canon.** *(Si une itération future voulait un parseur de chat **dans le cœur**,
  ou le **streaming** via canal Rust, CE serait cross-repo — hors MVP, à re-cadrer.)*

---

## 5. Contraintes DURES inscrites (rappel opposable à Gimli)

- **Self-hosted / open-source d'abord** : Ollama (déjà en place), **aucun cloud** introduit au MVP.
- **Mock des API en dev** : repli **déterministe** obligatoire (réseau absent/KO → mock + `reason`).
- **Jamais de secret commité** : Ollama sans clé ; endpoint/modèle en **Settings** (`$env`/config
  locale), jamais en dur.
- **Honnêteté** : pas de fausse réponse ; la coquille reste **honnête** tant que le LLM n'est pas
  branché ; états d'erreur/timeout **clairs** (jamais une stack brute à l'UI).
- **Activation explicite** : **aucun** appel LLM au montage ; seulement sur geste utilisateur (invariant
  Fëanor, déjà tenu par `CopiloteShell` — à **répliquer et verrouiller par test** sur `FeanorHead`).
- **Fëanor n'écrit rien lui-même** au MVP-A (conseil seul) ; toute écriture (itération/MVP-B) est
  **sur demande explicite** et **non destructive**.
- **Identité dérivée du canon** (I-1 « GUI ← frame ») : jamais réécrite en dur ; repli anonyme dit.

---

## 6. Critères d'acceptation (mesurables)

- **AC-1 — Fëanor répond réellement (live).** Sur `authoringModel` = `ollama:<modèle>` joignable, un
  envoi produit une **réponse texte du modèle** dans l'en-tête, précédée du badge d'**ouverture**
  `🟠 [FRAME][Fëanor]` et suivie de la **clôture** `[FRAME][Fëanor] 🟠`. Prouvé en test via `fakeLlm`
  (transport injecté, zéro réseau).
- **AC-2 — Honnêteté / repli.** Modèle absent/vide, provider ≠ `ollama`, réseau KO/timeout, ou réponse
  illisible → **mock déterministe** + message de `reason` clair, **jamais** de fausse réponse ni de
  stack. Prouvé par cas de test dédiés (une `Error` scriptée dans `fakeLlm`).
- **AC-3 — Activation explicite.** **Aucun** `llm.complete` au montage de `FeanorHead` ; exactement un
  après le geste d'envoi. Garde anti-double-appel (`pending`) vérifiée. Test explicite.
- **AC-4 — Identité dérivée, jamais fabriquée.** Le prompt système contient l'identité/charte issues
  de `feanor.md` **canon** (golden) ; fiche introuvable → repli **anonyme dit**, aucune chaîne
  « Fëanor » inventée côté code.
- **AC-5 — Zéro contrat touché (parité par construction).** `git diff` sur `packages/core/src/*`
  (sérialiseurs/schéma), schéma vendoré et fixtures vendorées = **vide**. Aucun changement Rust.
- **AC-6 — Pas de secret.** Aucune clé/API en dur ni commitée ; endpoint/modèle lus des Settings.
- **AC-7 — Gate GUI vert** (format de verdict contraint du GUI) : `npm run lint:all` = `0` ;
  `npm run test:all` = `0`, **compte de tests non diminué** ; `vendor-check` (côté iakaframe) **drift 0**
  inchangé.
- **AC-8 — Honnêteté de la coquille pendant la transition.** À aucun instant `FeanorHead` n'affiche
  une réponse trompeuse : `FEANOR_STUB_NOTICE`/`FEANOR_INERT_HINT` ne subsistent que sur les chemins
  réellement inertes (mock étiqueté / repli), retirés uniquement là où le vrai chemin est en place.
- **AC-9 (A-CONF)** — le point de montage réel de `FeanorHead` est **ouvert et confronté** (§ 0.3
  limite de mesure) ; le câblage respecte le contrat de props (`mode`/`entity`/`feanorSource`).

---

## 7. Hors périmètre

- La **génération/écriture d'élément depuis l'en-tête** (MVP-B) — **déjà** porté par `CopiloteShell` ;
  passerelle éventuelle = itération à cadrer.
- Le **web live** (Fork C : NON au MVP).
- Le **streaming** (transport `stream:false` ; itération = canal Rust, cross-repo).
- Toute évolution de `@iakaframe/core`, du schéma vendoré, des fixtures, ou du Rust.
- Le **sélecteur de frame active** (dépendance connue R3 du copilote : la fiche dépend de la frame
  active ; repli AC-4 en attendant) — lot distinct.

---

## 8. Estimation (obligatoire au jalon P1→P2 — ordre de grandeur assumé, révisable)

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** | **MVP-A ≈ 1–2 j-h.** Faible car **réutilisation maximale** : transport, mock, identité, badge, Settings **existent**. Le neuf = un prompt de conseil + un schéma `{reply}` local + un résolveur texte (sœur de `resolveProposition`) + le câblage `FeanorHead` + tests. |
| **Complexité / risque** | **Faible.** Parité tenue **par construction** (GUI-only, addition `src/` au-dessus des contrats — § 4). Le risque résiduel est d'UX/intégration, pas de contrat. |
| **Inconnues (susceptibles de faire glisser)** | (1) **Point de montage exact de `FeanorHead`** non localisé au cadrage (`rg` absent) — à ouvrir (AC-9) ; s'il faut instancier la page d'authoring persona elle-même, léger surcoût. (2) **Arbitrage Fork B** (A seul vs passerelle B) — B élargirait sensiblement. (3) **Modèle Ollama cible** sur le LAN à confirmer (Fork A). (4) **Streaming** si le décideur le veut au MVP → cross-repo (canal Rust), sort de cette estimation. |

> Rappel méthode : estimation **rappelée à la clôture du lot**, confrontée au **temps réel**. Ce
> n'est **pas** un engagement ferme.

---

## Sources (faits externes — obligation de sourcing)

- **Aucune décision de ce cadrage ne dépend d'un fait externe versionné** : la posture est la
  **réutilisation** d'une pile déjà présente (Ollama local, provider `ollama` seul), **sans dépendance
  nouvelle** — donc aucune question de compatibilité de version ouverte. La voie réseau et le format
  Ollama (`POST /api/chat`, `stream:false`, `format`) sont ceux **déjà** implémentés et gatés par le
  chantier `feanor-copilote-du-gui.md` (LIVRÉ 2026-07-26, merge `440c9d2`). Faits internes mesurés sur
  disque (§ 0) plutôt que sourcés du web, l'existant primant sur l'état de l'art ici.
