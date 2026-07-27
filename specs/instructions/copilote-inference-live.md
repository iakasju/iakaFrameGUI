# Instruction — Copilote d'authoring : inférence LLM **live**

> Cadrage P1 (Gandalf). Branche le copilote d'authoring sur un **vrai** modèle (celui réglé
> dans les Réglages, clé `authoringModel`) au lieu du mock déterministe — le mock devient le
> **fallback**. Frontière **authoring ≠ exécution** absolue. Testable **sans réseau**.
>
> Statut : **à valider** (jalon en fin de doc). Ne code rien avant « JALON VALIDÉ ».

> ⚠️ **RÉVISÉ le 2026-07-27 (option C) — le repli n'est plus le mock.** Sur décision décideur,
> le comportement de repli défini ici est **remplacé** par `copilote-honnete-mock-opt-in.md` :
> modèle absent / provider non supporté / réseau KO / réponse illisible → **aveu honnête**
> (`proposition: null` + `reason`), **jamais** une proposition mockée fabriquée ; le mock devient
> un **mode démo opt-in étiqueté**. **Sections révisées : §3.5, §3.6, §6 (CA2-CA5).** Le reste de
> cette instruction (§2, §3.1-§3.4, §4, §5, §7) **reste valable**.

---

## 1. Besoin

Aujourd'hui, la console `CopiloteShell` appelle le mock **pur** `propose(intention, context)`
(`src/forge/mock/copilote.ts`) : reconnaissance de mots-clés → `Proposition` déterministe
(`intro` + `artefacts` + `ops` + `diff`). Le modèle réglé (`authoringModel`) ne fait que
**paramétrer** l'affichage — aucun appel LLM (l'inférence live était **différée**).

On veut fermer ce différé : quand un modèle est configuré et disponible, la proposition
(la « charte/spec » de l'élément : quels artefacts insérer depuis le réservoir) est produite
par **inférence réelle** ; sinon (modèle vide / provider non supporté / réseau KO / réponse
illisible) on **retombe sur le mock**, sans jamais lever d'exception ni bloquer l'UI.

**Contrainte structurante** : l'environnement dev/CI **n'a pas de réseau** vers le LAN. La
slice doit donc être **entièrement testable sans vrai LLM** (transport injectable). L'inférence
réseau réelle est un item de **recette Tauri**, hors de la boucle CI.

---

## 2. Point d'insertion (investigué)

- **Appelant unique du mock** : `CopiloteShell.handlePropose()` (`src/forge/CopiloteShell.tsx:71`)
  fait `setProposition(propose(trimmed, { ...context, model: configuredModel }))` — appel
  **synchrone**. Les 3 ateliers (`TeamAtelier` `:204`, `MethodeAtelier` `:259`, `KitAtelier`
  `:175`) montent `CopiloteShell` en lui passant `context` + `onApply`.
- **Modèle configuré** : lu via `api.authoringModel()` → Settings `authoringModel`
  (`src-tauri/src/settings.rs`, façade `backend.ts:189`). **Vide par défaut** → le mock
  signale l'absence via `NO_AUTHORING_MODEL_HINT`.
- **Façade I/O unique** : tout `invoke` passe par `src/api/backend.ts` (invariant C-8 :
  `grep "invoke(" hors backend.ts = 0`). Le backend Rust est **passe-plat** ; invariant
  **AR-1/AR-6** (`src-tauri/src/lib.rs:1-8`) : « AUCUNE commande réseau, AUCUN appel runner ».
- **Diff de confiance** : `buildDiff(ops, context)` (`copilote.ts:212`) calcule le diff
  avant→après **localement** depuis `ops` + `context.present`. À réutiliser tel quel : le
  diff ne sera **jamais** dicté par le LLM.
- **Réservoir** : les ids proposables viennent des **catalogues du cœur** déjà importés par le
  mock (`CATALOG_SKILLS`, `CATALOG_GUARDRAILS`, `CATALOG_PRINCIPLES`, `CATALOG_RITUALS`,
  `CATALOG_SCAFFOLDS` de `@iakaframe/core`) — **disponibles hors ligne**, déterministes. C'est
  la source du « réservoir de sous-éléments dispo » pour le prompt.

**Insertion retenue** : rendre le chemin de proposition **asynchrone et injectable**, sans
toucher la signature publique de `propose()` (le mock reste pur et inchangé). On introduit un
**résolveur** `resolveProposition(intention, context, deps)` qui **oriente** vers live ou mock,
et un **transport** `LlmTransport` injectable. `CopiloteShell` passe d'un appel sync à un appel
async (état `pending` pendant l'inférence).

---

## 3. Architecture retenue (avec justification) + décisions décideur

### 3.1 Transport injectable `LlmTransport` (socle de testabilité)

Nouveau module **cœur front** `src/forge/llm/transport.ts` :

```ts
export interface LlmRequest {
  provider: string;   // "ollama" (MVP)
  model: string;      // ex. "qwen2.5-coder"
  system: string;     // prompt système (schéma JSON imposé)
  user: string;       // intention + contexte sérialisé
  timeoutMs: number;  // budget (défaut 20000)
}
export interface LlmTransport {
  /** Renvoie le TEXTE brut de la complétion. Rejette sur réseau KO / timeout / provider indispo. */
  complete(req: LlmRequest): Promise<string>;
}
```

- **`realLlm(backend)`** : implémentation branchée sur la façade (§3.2).
- **`fakeLlm(scripted)`** : implémentation de test — renvoie/rejette une réponse **scriptée**,
  **zéro réseau**. C'est l'outil qui prouve le chemin live en CI.

`CopiloteShell` reçoit un prop optionnel `llm?: LlmTransport` (défaut `realLlm(backend)`),
comme il reçoit déjà `api?: Backend`. Les tests injectent `fakeLlm`.

### 3.2 Où vit l'appel réseau — **DÉCISION DÉCIDEUR** (reco donnée)

L'appel LLM réel doit vivre quelque part. Deux options, **isolées derrière `LlmTransport`**
(donc la décision est **réversible à faible coût** : le code front est identique, seule
l'implémentation du transport change).

| | **Option A — commande Rust `llm_complete`** (reco) | **Option B — front (plugin-http / fetch)** |
|---|---|---|
| Cohérence I/O | ✅ tout passe par la façade unique `backend.ts` (C-8) | ⚠️ 2ᵉ canal réseau hors façade |
| CSP | ✅ rien à configurer | ⚠️ `connect-src` à ouvrir (localhost + hôte LAN) |
| Testabilité | ✅ garde d'hôte + parsing testables en Rust **et** transport `fakeLlm` en front | ✅ transport `fakeLlm` en front |
| Secrets/robustesse | ✅ timeout + garde d'hôte centralisés Rust | ⚠️ éparpillés |
| Invariant **AR-1/AR-6** | ❌ **élargit** la dérogation : Rust ferait 1 appel réseau LLM | ✅ Rust reste **littéralement** pur |

**Reco Gandalf : Option A** — une commande Rust `llm_complete(provider, model, host, system,
user, timeout_ms)` via **`reqwest`** (le crate est déjà **ré-exporté par `tauri-plugin-http`**,
sinon dépendance directe ; pas de proxy — appel **direct** à Ollama). Motifs : façade unique
(auditable en un point), pas de bataille CSP, garde d'hôte + timeout centralisés côté Rust.

⚠️ **Ce choix demande au décideur d'accepter une extension BORNÉE et ASSUMÉE de AR-1/AR-6** —
dans le même esprit que la dérogation déjà en place pour le pilote `review`/`remove`
(`backend.ts:253`, `capabilities/default.json`) : le backend ferait **UN** appel HTTP
**allow-listé** (provider `ollama` uniquement), **borné en hôte** (localhost + hôte LAN réglé,
jamais une URL arbitraire) et **borné en temps** (timeout), pour de l'**authoring build-time** —
**jamais** le runner d'exécution du Binding. À documenter en commentaire de commande + dans les
capabilities, exactement comme la dérogation existante.

> Si le décideur préfère garder Rust **littéralement** pur (Option B), l'instruction reste
> valable : seule l'implémentation de `realLlm` change (plugin-http + `connect-src`), le reste
> (résolveur, prompt, parsing, tests) est **identique**.

### 3.3 Provider(s) MVP — **DÉCISION DÉCIDEUR** (reco : Ollama seul)

- **Reco : Ollama uniquement au MVP** (self-hosted/open-source d'abord ; cloud = fallback
  justifié, **différé**). Tout autre provider (`litellm:*`, `openai:*`…) → **non supporté →
  fallback mock + message** clair, tant que le décideur ne l'arbitre pas.
- **Parsing `provider:model`** : split sur le **premier** `:`. `provider` = partie gauche
  (normalisée, minuscules) ; `model` = **tout le reste** (un modèle peut contenir `:`, ex.
  `qwen2.5-coder:7b`). `provider` vide / `≠ ollama` → fallback mock + message.
- **Hôte Ollama — sous-décision** : le format `provider:model` **n'encode pas l'hôte**.
  - Reco : hôte par défaut **`http://localhost:11434`** ; hôte LAN via un **réglage optionnel**
    dédié (nouvelle clé Settings `authoringEndpoint`, même moule que `authoringModel` dans
    `settings.rs`) — vide ⇒ localhost. **À trancher** : ajoute-t-on ce réglage au MVP, ou
    localhost seul d'abord ? (mémoire : « Ollama localhost **et/ou** LAN »).
- **Endpoint + payload** (fait vérifié, cf. §7) : **`POST {host}/api/chat`**, `stream:false`,
  `messages:[{role:"system"...},{role:"user"...}]`, **`format: <JSON schema>`** (sorties
  structurées Ollama). Reco `/api/chat` plutôt que `/api/generate` (rôles système/user
  propres, voie recommandée pour les sorties structurées).

### 3.4 Sortie structurée + parsing **défensif** (jamais d'exception)

Le prompt système **impose** un JSON conforme à un schéma **restreint** — seuls les champs
« créatifs » sont délégués au LLM ; tout le reste est **recalculé par notre code** :

```jsonc
{
  "intro": "string",                       // phrase d'introduction (bulle assistant)
  "artefacts": [                            // 1..n
    { "icon": "skill|hook|prin|rit|bind|scaf|role",
      "tag": "string", "title": "string", "detail": "string" }
  ],
  "ops": [                                  // 1..n — matérialisation
    { "target": "<MaterializeTarget>", "id": "string", "label": "string" }
  ]
}
```

- `target` **doit** appartenir à l'union `MaterializeTarget` (`copilote.ts:58`) — **aucune
  cible d'exécution n'existe** dans ce type (frontière **type-safe**).
- `id` **devrait** correspondre à un id du réservoir (catalogues du cœur) ; sinon l'op est
  **rejetée** (le diff ne montrerait rien de matérialisable).
- **`intention`, `model`, `diff`, `diffFile`, `hint` NE sont JAMAIS pris du LLM** : ils sont
  posés par notre code (comme le mock). `diff` = `buildDiff(ops, context)` (réutilisé).

Nouveau parseur **défensif** `parseLiveProposition(raw, intention, context)` dans
`src/forge/llm/parse.ts`, dans l'**esprit `parse*` du cœur** (`packages/core/src/kit.ts:41`,
`72`) : `try/catch` sur `JSON.parse` ; validation champ par champ ; **filtrage** des artefacts
/ ops invalides ; **retourne `null`** (jamais d'exception) si le résultat est inexploitable
(JSON illisible, ou zéro `ops` valide). `null` ⇒ le résolveur **retombe sur le mock**.

### 3.5 Résolveur + repli — la logique d'orientation

> ⚠️ **RÉVISÉ le 2026-07-27 (option C).** Le repli n'est **plus** le mock : c'est un **aveu
> honnête**. Voir `copilote-honnete-mock-opt-in.md` §2.2 pour le mapping complet. Résumé :

`resolveProposition(intention, context, { llm, mock, endpoint, identity }): Promise<ResolveResult>`
avec `ResolveResult.proposition: Proposition | null` et `source: "live" | "mock" | "none"` :

1. `model` vide/absent → **aveu** (`proposition: null`, `source: "none"`, `reason:
   NO_AUTHORING_MODEL_HINT`). *Plus de proposition fabriquée.*
2. **Mode démo opt-in** (`model = "mock"`, valeur réservée) → **mock** `propose()`
   (`source: "mock"`, `reason: MOCK_DEMO_LABEL`) — proposition **étiquetée**. Ce test passe
   **avant** le test provider.
3. `provider:model` → provider ≠ `ollama` (MVP) → **aveu** (`null`, `"none"`,
   `FALLBACK_UNSUPPORTED`).
4. Sinon : construire `LlmRequest` (prompt §3.4 + réservoir + `present`), `await llm.complete`.
   - **rejet** (réseau KO / timeout / indispo) → **aveu** (`null`, `"none"`,
     `FALLBACK_UNAVAILABLE` ; message clair, **jamais une stack**).
   - succès → `parseLiveProposition(raw, …)` ; `null` → **aveu** (`null`, `"none"`,
     `FALLBACK_UNREADABLE`) ; sinon → la Proposition **live** (diff recalculé).

Aligné **byte pour byte** sur le socle honnête `resolveAdvice`/`resolveElementProposition`. Le mock
reste **injectable en test** (`deps.mock`) et **déterministe** — seul son **déclenchement runtime**
devient opt-in (cas 2). L'aveu et l'étiquette s'affichent dans les canaux existants
(`hint`/`who`/bandeau) — cf. §3.6 révisé.

### 3.6 UI `CopiloteShell` (impact minimal)

- `handlePropose` devient `async` : état `pending` (bouton « Proposer » désactivé + libellé
  « Le modèle réfléchit… ») pendant `await`. Un seul appel en vol (garde anti-double-clic).
- Bandeau existant : afficher `modèle <code>…</code> · **LLM live**` quand la proposition vient
  du live, `LLM mocké (repli)` + raison quand c'est un fallback. Réutiliser les emplacements
  `hint` / `who` déjà présents (`CopiloteShell.tsx:113,131`).
- `onApply` / Valider / Rejeter : **inchangés** (matérialisation toujours par l'atelier via le
  chemin d'insertion réel ; la forge n'écrit rien sans validation humaine).

---

## 4. Périmètre exact des fichiers

**Créés**
- `src/forge/llm/transport.ts` — `LlmRequest`, `LlmTransport`, `realLlm(backend)`, `fakeLlm(...)`.
- `src/forge/llm/prompt.ts` — construction du prompt système (schéma) + user (intention +
  réservoir + `present`) ; export du **JSON schema** pour Ollama `format`.
- `src/forge/llm/parse.ts` — `parseLiveProposition` (défensif) + le résolveur
  `resolveProposition`.
- Tests : `src/forge/llm/*.test.ts` (transport `fakeLlm`, parsing défensif, résolveur/repli).

**Modifiés**
- `src/forge/CopiloteShell.tsx` — appel async via `resolveProposition` + état `pending` + prop
  `llm?`. Le mock reste importé pour le repli.
- `src/api/backend.ts` — (si Option A) `llmComplete(...)` + ajout à l'objet `backend`.
- `src-tauri/src/lib.rs` + nouveau `src-tauri/src/llm.rs` — (si Option A) commande `llm_complete`
  (reqwest, garde d'hôte, timeout) + enregistrement + tests Rust.
- `src-tauri/capabilities/default.json` — (si Option A) documenter la dérogation bornée.
- `src-tauri/src/settings.rs` + `backend.ts` — (si sous-décision §3.3 retenue) clé
  `authoringEndpoint` (moule `authoringModel`).

**Interdits de modification (frontière)**
- `src/forge/mock/copilote.ts` : `propose()` **reste pur et déterministe** (au plus : export de
  types/constantes réutilisés). Aucun réseau n'y entre.
- Tout ce qui touche le **runner d'EXÉCUTION** du Binding (`@iakaframe/core` binding, Cockpit,
  `kit_deploy`) : **zéro** modification.

---

## 5. Contrats

**Transport** — `complete(req)` renvoie le **texte brut** de la complétion ; **rejette** sur
réseau KO / timeout / provider indispo (le résolveur traduit tout rejet en repli mock). Aucune
connaissance du schéma `Proposition` dans le transport (séparation nette).

**Prompt** — système : rôle « copilote d'authoring iakaframe », **impose** le JSON schema §3.4,
interdit tout texte hors JSON, **interdit explicitement** toute notion de runner/modèle
d'exécution (frontière). User : `intention` + `surface` + **réservoir** (ids proposables du
cœur pour la surface) + `present` (ids déjà là) + `diffFile`. **Aucun secret** dans le prompt.

**Parsing** — `parseLiveProposition` : `null` sur JSON illisible ou zéro op valide ; sinon
Proposition dont `intention/model/diff/diffFile/hint` sont **posés par notre code**, `ops`/
`artefacts`/`intro` **filtrés** du LLM (targets ∈ `MaterializeTarget`, ids ∈ réservoir).
**Jamais** d'exception propagée à l'UI.

---

## 6. Critères d'acceptation (TESTABLES, sans réseau)

1. **Live nominal** : `fakeLlm` renvoyant un JSON valide (ops sur ids réels) ⇒
   `resolveProposition` rend une Proposition **live** ; `diff` = `buildDiff(ops, context)` ;
   `ops` matérialisables.
2. **JSON invalide → repli mock** : `fakeLlm` renvoyant `"{pas du json"` ⇒ Proposition ==
   `propose(intention, context)` (mock) + message « réponse illisible — repli mock ».
3. **Provider indisponible → repli + message** : `fakeLlm` qui **rejette** (timeout/réseau) ⇒
   repli mock + message « modèle indisponible » ; **aucune** exception ne remonte à l'UI ;
   aucune stack affichée.
4. **Provider non supporté** : `model = "litellm:gpt-4o"` ⇒ repli mock + message « provider non
   supporté au MVP (ollama) ».
5. **Modèle vide** : `model = ""` ⇒ mock direct, hint = `NO_AUTHORING_MODEL_HINT` (comportement
   actuel **inchangé**).
6. **Déterminisme du fallback intact** : dans les cas 2/3/4/5, même entrée → **même** sortie
   mock (le test de déterminisme existant `copilote.test.ts` reste vert).
7. **Frontière Binding non touchée** : toute `op` d'une Proposition (live ou mock) a
   `target ∈ MaterializeTarget` ; **aucune** op ne porte de runner/modèle d'exécution
   (type-enforced + assertion de test). `parseLiveProposition` **rejette** une op à target
   inconnue.
8. **Façade unique préservée** : `grep "invoke(" hors backend.ts = 0` (Option A) ;
   `realLlm` n'appelle le réseau **que** via la façade.
9. **Garde Rust** (Option A) : `llm_complete` **refuse** un hôte hors allow-list (localhost +
   hôte réglé) — testé côté Rust ; timeout respecté.
10. **Gate Legolas** : typecheck + lint 0, `vitest` + `cargo test` verts, build OK, **sans
    aucun accès réseau** en CI.

---

## 7. Faits vérifiés sur le web (sources)

- **Ollama — sorties structurées** : le paramètre **`format`** de `POST /api/chat` (et
  `/api/generate`) accepte un **JSON schema** (`{type:"object", properties, required}`) ; avec
  `stream:false` le modèle rend un JSON conforme. Port par défaut **11434**. Voir
  [docs.ollama.com/capabilities/structured-outputs](https://docs.ollama.com/capabilities/structured-outputs),
  [ollama.com/blog/structured-outputs](https://ollama.com/blog/structured-outputs),
  [API ref](https://github.com/ollama/ollama/blob/main/docs/api.md).
- **Tauri 2 — appel HTTP** : le plugin HTTP **ré-exporte `reqwest`** côté Rust (appel réseau
  depuis une commande) ; côté front, `plugin-http` a un **scope d'URL** et nécessite d'ouvrir
  la **CSP `connect-src`**. Le retour d'expérience communautaire recommande, pour un appel
  localhost fiable, de **passer par une commande Rust + reqwest** (conforte l'Option A). Voir
  [HTTP Client Tauri](https://v2.tauri.app/plugin/http-client/),
  [plugin-http JS ref](https://v2.tauri.app/reference/javascript/http/).

---

## 8. Hors-périmètre (MVP)

- **Inférence réseau réelle** = item de **recette Tauri** (hors CI, comme B-7/B-10) : régler
  `authoringModel = ollama:qwen2.5-coder`, un Ollama joignable, vérifier intention → Proposition
  live → Valider → matérialisation.
- **Cloud** (litellm/openai/anthropic…) : **différé**, sauf arbitrage décideur (§3.3).
- **Streaming** de la réponse, retry/backoff, cache : hors MVP.
- **Multi-modèle par persona** : non — `authoringModel` reste **unique et global** (Volet B).
- **Runner d'EXÉCUTION du Binding** : **intouché** (frontière authoring ≠ exécution).

---

## 9. Points que SEUL le décideur tranche

- **D1 — Appel réseau : Rust (`llm_complete`, reco) vs front (plugin-http/fetch)** →
  implique d'accepter (Option A) une **extension bornée de AR-1/AR-6**, ou (Option B) de
  garder Rust littéralement pur au prix d'une config CSP. *Reco : A, bornée et documentée.*
- **D2 — Provider MVP : Ollama seul (reco) ?** Confirmer que tout autre provider ⇒ fallback
  mock jusqu'à arbitrage.
- **D3 — Hôte Ollama** : localhost seul au MVP, ou **ajouter le réglage `authoringEndpoint`**
  (localhost + LAN) dès cette slice ? *Reco : localhost par défaut + réglage optionnel LAN.*
- **D4 — Endpoint** : `/api/chat` (reco) vs `/api/generate`.
- **D5 — Message de repli** : réutiliser le canal `hint`/en-tête (reco, MVP) ou un bandeau
  d'état dédié.

---

## 10. Jalon

À poser via `iakaframe jalon` (titre FIGlet `Standard` + tableau émetteur/contenu/récepteur)
au moment de la validation. Émetteur : Gandalf (cadrage). Contenu : la présente instruction
`specs/instructions/copilote-inference-live.md` + les décisions D1–D5. Récepteur : décideur
(Stéphane) → sur « JALON VALIDÉ », l'exécution (Gimli) démarre l'implémentation, MVP d'abord,
commits atomiques, gate Legolas avant clôture.
