# Instruction — Sélecteur de **source d'inférence** de Fëanor (et Copilote) : presets + passerelle LiteLLM

> Cadrage P1 (🔵 **Gandalf**, 2026-07-29), sur mission Aragorn, **recadré en cours** par une
> information décisive du décideur : **il fait tourner un LiteLLM**. **Cadrage pur — ZÉRO code produit
> ici.** Ce fichier est le seul artefact ; l'écriture Gandalf est bornée à `specs/instructions/`.
> Exécution downstream = ⚒️ Gimli (dépôt `iakaFrameGUI`) ; gate P2→P3 = 🏹 Legolas.
>
> **Filiation.** Suite directe de `copilote-inference-live.md` (D1..D4), `copilote-honnete-mock-opt-in.md`
> (option C — aveu honnête, mock opt-in étiqueté) et `feanor-extensions-mvpb-streaming-web-live.md`
> (streaming NDJSON + hôte allow-listé). Cette instruction ouvre le différé **« choisir la source
> d'inférence »** en tête de ces trois-là.
>
> **Constats mesurés sur le disque le 2026-07-29** (`preuve-avant-declaration`), dépôt GUI lu en
> lecture seule. Citations par **nom de fichier / de symbole** (les numéros de ligne vieillissent) ;
> le message de remise à Aragorn porte les `chemin:ligne` cliquables.
>
> **Limite de mesure assumée (honnêteté de sourcing).** L'outillage de listage (`rg`) était
> indisponible (`Glob`/`Grep` en échec). Les fichiers cités ont été **lus un par un** ; tout point
> d'intégration non listé ici est marqué **À-CONF** (à confirmer à l'ouverture par Gimli).

---

## 1. Problème (besoin reformulé)

Le décideur veut **choisir, dans les Réglages du GUI, la source d'inférence** de Fëanor (en-tête) et
du Copilote d'atelier (même transport) — au lieu de taper une URL d'endpoint à la main. Les options
souhaitées : **Ollama LAN** (`http://192.168.2.11:11434`), **Ollama localhost**, **« Claude local »**,
**« ChatGPT local »**.

**Reframe décisif (info décideur).** Le décideur fait tourner un **LiteLLM** — un proxy exposant une
**API OpenAI-compatible unique** (`/v1/chat/completions`, `/v1/models`) qui route vers Claude, OpenAI,
Ollama, modèles locaux… **selon le nom de modèle**. Conséquence structurante :

- « **local Claude** » et « **local ChatGPT** » **ne sont PAS deux protocoles distincts**. Ce sont des
  **modèles atteints via le LiteLLM** (ex. `claude-3-5-sonnet-…`, `gpt-4o-…`), tous deux servis par
  **le même wire OpenAI chat-completions**.
- Le besoin multi-provider **s'effondre à UN seul protocole neuf** : **OpenAI chat-completions**,
  pointé sur l'endpoint LiteLLM. **Aucun adaptateur Anthropic `/v1/messages` séparé n'est requis** —
  LiteLLM est la passerelle qui absorbe la différence de wire.

---

## 2. Pile actuelle — ce qui est paramétrable vs verrouillé (mesuré)

### 2.1 Ce qui est **déjà paramétrable** (aujourd'hui)

| Réglage | Clé `settings.json` | Où c'est câblé | Effet |
|---|---|---|---|
| **Modèle d'authoring** (global) | `authoringModel` | `settings.rs` (`AUTHORING_MODEL_KEY`), façade `backend.ts` (`authoringModel`/`setAuthoringModel`), UI `SettingsRoot.tsx` (champ texte `model-input`) | chaîne `provider:model` (ex. `ollama:qwen2.5-coder`). Vide ⇒ aveu « pas de modèle » |
| **Endpoint d'authoring** | `authoringEndpoint` | `settings.rs` (`AUTHORING_ENDPOINT_KEY`), façade (`authoringEndpoint`/`setAuthoringEndpoint`), UI (champ `Endpoint d'authoring`) | hôte à joindre. Vide ⇒ défaut `http://localhost:11434` |
| **Mode démo (mock)** | valeur réservée `mock` saisie dans `authoringModel` | `resolve.ts` (`MOCK_DEMO_MODEL`/`MOCK_DEMO_LABEL`) | proposition fabriquée **étiquetée**, opt-in |

Donc **l'endpoint est déjà réglable** (texte libre) et **le modèle aussi**. Ce qui manque, côté
Ollama, est **uniquement un sélecteur convivial** (presets) au lieu d'une URL à taper.

### 2.2 Ce qui est **verrouillé** (le vrai travail neuf)

- **Provider** : `MVP_PROVIDER = "ollama"` (`resolve.ts`). Tout autre provider ⇒ **aveu honnête**
  `FALLBACK_UNSUPPORTED` (« provider non supporté au MVP (ollama seul) »). Idem côté conseil
  (`advise.ts`, même constante). **Défense en profondeur côté Rust** : `llm_complete` et
  `llm_complete_stream` (`llm.rs`) rejettent explicitement `provider != "ollama"`.
- **Protocole** : le corps de requête est **Ollama-spécifique** — `build_chat_body`/
  `build_stream_chat_body` posent `POST {host}/api/chat`, `messages:[system,user]`, `format:<schema>`
  (D4), et `extract_content` lit `message.content` ; le streaming lit du **NDJSON** (`parse_stream_line`,
  un objet JSON par ligne, `done:true`). Rien de tout cela n'est OpenAI chat-completions.
- **Garde d'hôte** : `host_allowed` (`llm.rs`) autorise **loopback** (`localhost`/`127.0.0.1`/`::1`,
  **quel que soit le port**) **OU** l'hôte **égal à `authoringEndpoint` réglé**. Tout le reste est
  refusé. Pur, testé sans réseau.

### 2.3 Fait déterminant sur la **CSP** (corrige une idée reçue du brief)

L'appel réseau vers le modèle **part de Rust (reqwest)**, **pas du webview**. La directive CSP
`connect-src` (`tauri.conf.json` : `'self' ipc: http://ipc.localhost`) **ne gouverne donc PAS** ces
appels — elle ne filtre que les `fetch`/XHR du front. **Conclusion : aucune modification de CSP n'est
nécessaire** pour ajouter LiteLLM. Le **seul** garde-fou d'hôte est `host_allowed` côté Rust, et il
**admet déjà** `http://localhost:4000` (loopback, port indifférent). Un LiteLLM sur le **LAN** (IP
non-loopback) passe par le mécanisme **déjà existant** de `authoringEndpoint` (l'hôte réglé est
allow-listé). Les commandes Tauri custom (`llm_complete*`) sont autorisées par leur enregistrement
dans l'`invoke_handler` (pas via `capabilities/*.json`, qui ne concerne que les plugins) — **rien à
ouvrir là non plus**. **À-CONF** par Gimli à l'ouverture.

---

## 3. État de l'art vérifié (web, 2026 — obligation de sourcing)

- **LiteLLM** : proxy par défaut sur **port 4000** (`http://localhost:4000` / `http://0.0.0.0:4000`),
  expose l'API **OpenAI-compatible** `POST /v1/chat/completions` et **`GET /v1/models`** (liste les
  modèles configurés). Auth : `Authorization: Bearer <clé>` (master key `sk-…` ou virtual key). Le
  wire est OpenAI standard : réponse `choices[0].message.content` (bloquant) et **SSE** `data: {…}`
  (streaming, terminé par `data: [DONE]`). C'est **la** passerelle qui unifie Claude/OpenAI/Ollama/
  local sous un seul protocole. [1][2]
- **LM Studio / llama.cpp / Ollama-`/v1`** : eux aussi exposent l'OpenAI-compat (`/v1/chat/completions`).
  Donc l'adaptateur OpenAI écrit pour LiteLLM **resservira** tel quel si le décideur pointe l'un
  d'eux. LM Studio écoute par défaut `http://localhost:1234/v1`, sans auth (bind loopback). [3][4]
- **Anthropic natif `/v1/messages`** : *inutile ici* — LiteLLM absorbe déjà « Claude » en OpenAI-compat.
  On **n'implémente pas** l'adaptateur Anthropic (sobriété : périmètre fermé). [5]

> **Sécurité — alerte sourcée à porter en risque** : les versions PyPI LiteLLM **1.82.7 / 1.82.8** ont
> livré du code malveillant (vol de credentials). C'est **l'infra du décideur**, hors de notre code,
> mais à **mentionner** : épingler une version saine. [5]

---

## 4. Décision retenue (à arbitrer au jalon — Gandalf propose, le décideur tranche)

**Un sélecteur de source dans les Réglages**, alimenté par des **presets `{ provider, endpoint }`**,
persistés dans `settings.json`, plus **un seul provider neuf** (`openai` OpenAI-compatible) qui
débloque **Claude ET ChatGPT ET tout modèle du LiteLLM d'un coup**. L'invariant d'**honnêteté** (aveu
si injoignable, jamais de fausse réponse ; mock opt-in étiqueté) est **préservé sans exception**.

### 4.1 Presets proposés (contenu du dropdown)

| Preset (libellé UI) | `provider` | `endpoint` par défaut | Protocole | Statut |
|---|---|---|---|---|
| Ollama LAN | `ollama` | `http://192.168.2.11:11434` | Ollama `/api/chat` (existant) | **Lot 1** |
| Ollama localhost | `ollama` | `http://localhost:11434` | Ollama `/api/chat` (existant) | **Lot 1** |
| LiteLLM (Claude / ChatGPT / local) | `openai` | `http://localhost:4000` | OpenAI `/v1/chat/completions` (neuf) | **Lot 2** |
| Mode démo (mock) | — | — | valeur réservée `mock` (existant) | **Lot 1** (déjà là) |
| Personnalisé… | (choisi) | (saisi) | selon provider | Lot 1 (endpoint libre conservé) |

Le **modèle** (`authoringModel`) reste le sélecteur du LLM **derrière** la source : `claude-*` /
`gpt-*` / un modèle local via LiteLLM, ou `qwen2.5-coder` via Ollama. **Amélioration Lot 2** : peupler
une liste de modèles depuis **`GET /v1/models`** du LiteLLM (au lieu d'une saisie libre) — *nice-to-have*,
pas bloquant.

### 4.2 Choix structurant à trancher — **où vit le `provider`** (2 options)

Aujourd'hui le provider est **le préfixe de la chaîne `authoringModel`** (`parseProviderModel` sur le
premier `:`), partagé par `resolve.ts` et `advise.ts`.

- **Option A — garder l'encodage `provider:model`** (recommandée pour la sobriété). Le preset, à la
  sélection, **écrit `authoringEndpoint`** et **réécrit le préfixe provider** de `authoringModel`
  (`openai:…` ou `ollama:…`) en conservant le nom de modèle. **Zéro nouvelle clé, zéro changement de
  parsing.** Le champ modèle et le dropdown source coexistent (le dropdown pilote le préfixe + l'hôte).
- **Option B — clé de source explicite** (`authoringSource`/`authoringProvider`) découplée du modèle.
  Plus « propre » sémantiquement, mais **touche le parsing partagé** `resolve.ts`/`advise.ts` et la
  détection du mock (`MOCK_DEMO_MODEL`) → plus de surface, plus de risque de régression.

**Recommandation : Option A.** Elle livre le sélecteur sans refactor du socle honnête. (Décideur : à
confirmer au jalon.)

### 4.3 Abstraction de provider (Lot 2, où ça vit)

**Dans Rust `llm.rs`** — un **dispatch par provider**, la voie réseau unique restant Rust (façade C-8,
invariant AR-1 déjà dérogé et borné pour l'authoring build-time) :

- `provider == "ollama"` → chemin **inchangé** (`build_chat_body`/`extract_content` ; streaming NDJSON).
- `provider == "openai"` → chemin **neuf** : `POST {host}/v1/chat/completions`, corps OpenAI
  (`model`, `messages:[{role,content}]`, `stream`), en-tête `Authorization: Bearer <clé>` **si** une clé
  est réglée ; extraction `choices[0].message.content` (bloquant) et **SSE** `data:` → `[DONE]`
  (streaming). Les fonctions pures (build body / parse ligne) sont **testables sans réseau**, comme
  l'existant Ollama.

Côté front, `resolve.ts` et `advise.ts` : **élargir l'ensemble de providers supportés** (`ollama` +
`openai`) au lieu du singleton `MVP_PROVIDER`. Le transport (`transport.ts`, `realLlm`/`realStreamLlm`)
et la façade (`backend.ts`, `llmComplete`/`llmCompleteStream`) passent déjà `provider` — **signature
inchangée** ; ajouter un champ optionnel **`apiKey`** à `LlmCompleteArgs` (transmis à Rust, jamais logué).

### 4.4 Structured output (D4) — wrinkle à borner

Le Copilote impose un **schéma JSON** via `format:<schema>` (Ollama, `LLM_OUTPUT_SCHEMA`). OpenAI
exprime ça par `response_format: { type: "json_schema", … }`. Le chemin **conseil/chat** (`advise.ts`)
est du **texte libre** (pas de schéma) → **trivial** en OpenAI. Le chemin **Copilote structuré** exige
une **cartographie `format` → `response_format`** côté adaptateur OpenAI. **Décision de sobriété** :
**Lot 2 câble d'abord le chemin conseil/chat (texte libre)** de bout en bout via LiteLLM ; le mapping
`response_format` du Copilote structuré est un **sous-lot 2b** (peut suivre). Un LiteLLM qui ignore
`response_format` retombe, au pire, sur l'**aveu honnête** existant (réponse illisible) — jamais une
fausse proposition.

---

## 5. Périmètre

**Inclus**
- **Lot 1 (MVP, GUI-only)** : sélecteur de source (dropdown de presets) dans `SettingsRoot.tsx` ;
  presets Ollama LAN / Ollama localhost / (LiteLLM, sélectionnable) / mock / personnalisé ; à la
  sélection, écriture de `authoringEndpoint` (+ préfixe provider de `authoringModel`, Option A) via la
  façade existante ; champ endpoint libre conservé pour « Personnalisé ». **Aucun Rust neuf.**
- **Lot 2 (provider OpenAI-compatible → LiteLLM)** : dispatch provider dans `llm.rs` (`openai` :
  `/v1/chat/completions` bloquant + SSE streaming ; en-tête Bearer si clé réglée) ; élargissement de
  l'allow-set provider dans `resolve.ts`/`advise.ts` ; champ optionnel `apiKey` dans `LlmCompleteArgs`
  (façade) + clé `authoringApiKey` dans `settings.rs` (lecture locale, jamais loguée). Chemin
  **conseil/chat** d'abord.
- **Lot 2b (optionnel)** : peuplement des modèles via `GET /v1/models` du LiteLLM ; mapping
  `format → response_format` pour le **Copilote structuré**.

**Exclu (fermé)**
- **Adaptateur Anthropic natif `/v1/messages`** — inutile, LiteLLM absorbe « Claude » en OpenAI-compat.
- **Ouverture CSP** ou nouvelle entrée `capabilities/*.json` — non requis (§2.3).
- **Ouverture à des hôtes arbitraires / web live** — hors périmètre. On reste **local/LAN** :
  `host_allowed` conserve son garde (loopback + endpoint réglé). Le web live reste différé.
- **Appel cloud** — un LiteLLM peut router vers le cloud avec une vraie clé cloud ; ce n'est **pas**
  notre affaire ici : on ne câble qu'un **endpoint local/LAN**. Si le décideur veut router vers du
  cloud via son LiteLLM, c'est **sa** config LiteLLM, transparente pour nous (on ne stocke que
  l'URL locale + une clé locale non commitée).
- **Runner d'EXÉCUTION du Binding** — frontière **authoring ≠ exécution** intacte ; tout ceci est
  **build-time**.

---

## 6. Étapes d'implémentation

**Lot 1 — sélecteur de source (GUI-only)**
1. Définir, côté `src/`, la table de presets `{ id, label, provider, endpoint }` (constante locale ;
   `mock` = entrée dédiée ; `custom` = endpoint libre).
2. Dans `SettingsRoot.tsx`, ajouter un `<select>` « Source d'inférence » **au-dessus** des champs
   modèle/endpoint. À la sélection d'un preset : appeler `api.setAuthoringEndpoint(preset.endpoint)` et
   (Option A) `api.setAuthoringModel("<provider>:<nom-modèle-courant>")` en conservant le nom de modèle
   saisi ; « Personnalisé » réaffiche les champs libres existants.
3. Refléter la source courante en relisant `authoringEndpoint`/`authoringModel` (mapping inverse vers
   le preset ; défaut « Personnalisé » si aucun preset ne correspond).
4. Tests front (Vitest) : sélection d'un preset → bons appels façade ; réhydratation ; non-régression
   du mock opt-in et du champ endpoint libre.

**Lot 2 — provider OpenAI-compatible (Rust + façade), chemin conseil/chat d'abord**
5. `llm.rs` : introduire un **dispatch** `provider` (`ollama` inchangé ; `openai` neuf). Fonctions
   **pures** : `build_openai_body(model, system, user, stream)` et `extract_openai_content(resp)` +
   `parse_openai_sse_line(line)` — **testées sans réseau** (miroir des tests Ollama existants).
6. `llm_complete` / `llm_complete_stream` : après la garde d'hôte (`host_allowed`, inchangée),
   brancher sur le dispatch ; pour `openai`, poser l'URL `/v1/chat/completions`, l'en-tête
   `Authorization: Bearer <clé>` **si** `apiKey` présent, et lire **SSE** (`data:` … `data: [DONE]`)
   au lieu du NDJSON. Honnêteté identique : flux coupé / illisible / sans `[DONE]` ⇒ `Error` + `Err`.
7. `settings.rs` : clé `authoringApiKey` (read/write non destructif, même patron que
   `authoringEndpoint`) + commandes Tauri `authoring_api_key`/`set_authoring_api_key`. **Jamais** de
   valeur de clé dans un message d'erreur ni un log.
8. `backend.ts` : champ optionnel `apiKey` dans `LlmCompleteArgs` (transmis à `llm_complete*`) ;
   exposer `authoringApiKey`/`setAuthoringApiKey` dans la façade + l'objet `backend`.
9. `resolve.ts` / `advise.ts` : remplacer le test `provider !== MVP_PROVIDER` par l'appartenance à
   l'ensemble `{ ollama, openai }` (constante partagée) ; passer `apiKey` (lu depuis les réglages) au
   `req`. Le reste du socle honnête (aveu, mock opt-in, diff recalculé) **inchangé**.
10. `SettingsRoot.tsx` : activer le preset **LiteLLM** + un champ **clé (optionnel)** masqué ; câbler
    `GET /v1/models` (Lot 2b) si retenu.
11. Tests : Rust (build/extract/SSE OpenAI, garde d'hôte inchangée, aveu sur flux rompu) ; front
    (`fakeLlm`/`fakeStreamLlm` scriptés pour un provider `openai`, aveu honnête sur rejet).

---

## 7. Fichiers concernés (mesurés)

- `src/components/SettingsRoot.tsx` — **Lot 1** : dropdown de source + presets ; **Lot 2** : preset
  LiteLLM + champ clé.
- `src/api/backend.ts` — **Lot 2** : `apiKey` dans `LlmCompleteArgs` ; `authoringApiKey`/
  `setAuthoringApiKey` ; ajout à l'objet `backend`.
- `src/forge/llm/resolve.ts` — **Lot 2** : allow-set provider `{ ollama, openai }` ; passage `apiKey`.
- `src/forge/llm/advise.ts` — **Lot 2** : idem (chemin conseil/chat, texte libre — pilote de Lot 2).
- `src/forge/llm/transport.ts` — **Lot 2** : passe `apiKey` (signatures déjà génériques ; à vérifier).
- `src-tauri/src/llm.rs` — **Lot 2** : dispatch provider ; `build_openai_body`/`extract_openai_content`/
  `parse_openai_sse_line` ; branchement dans `llm_complete`/`llm_complete_stream`.
- `src-tauri/src/settings.rs` — **Lot 2** : clé `authoringApiKey` + commandes Tauri.
- `src-tauri/src/lib.rs` (**À-CONF**) — enregistrement des 2 commandes neuves dans l'`invoke_handler`.
- `tauri.conf.json` / `capabilities/*.json` — **inchangés** (§2.3).
- Tests : `src/**/*.test.ts(x)` (front) et `#[cfg(test)]` de `llm.rs`/`settings.rs` (Rust).

---

## 8. Risques

- **Structured output non honoré par LiteLLM/backend** (D4) → le Copilote structuré peut retomber en
  aveu « illisible ». *Mitigation* : Lot 2 pilote le **chemin conseil/chat** (texte libre) ; mapping
  `response_format` en **2b**. L'aveu honnête est un filet, pas une régression.
- **SSE ≠ NDJSON** : le parsing streaming OpenAI diffère du Ollama. *Mitigation* : fonction pure
  `parse_openai_sse_line` testée sans réseau, calquée sur `parse_stream_line` ; même discipline d'aveu.
- **Clé LiteLLM** : ne **jamais** la committer, logguer, ni la mettre dans un message d'erreur.
  *Mitigation* : `authoringApiKey` en réglage local `settings.json` (workspace, hors dépôt) ou `$env` ;
  champ UI masqué ; aucune interpolation de la clé dans un `format!` d'erreur.
- **LiteLLM malveillant 1.82.7/1.82.8** (sourcé §3) : infra décideur, hors code, à **signaler**
  (épingler une version saine).
- **LAN multi-hôtes** : `authoringEndpoint` est **un** hôte ; changer de source LAN change l'hôte
  allow-listé. *Mitigation* : un preset écrit l'endpoint → l'allow-list suit. Acceptable au MVP.
- **Frontière authoring ≠ exécution** : ne jamais laisser cette source contaminer le runner du Binding.
  *Mitigation* : tout est en chemin d'authoring build-time (déjà borné) ; aucun toucher au Binding.

---

## 9. Critères d'acceptation (testables)

**Lot 1**
- [ ] Un `<select>` « Source d'inférence » apparaît dans les Réglages, avec au moins : Ollama LAN,
      Ollama localhost, LiteLLM, Mode démo (mock), Personnalisé.
- [ ] Sélectionner « Ollama LAN » persiste `authoringEndpoint = http://192.168.2.11:11434` (vérifié
      via la façade) ; « Ollama localhost » persiste `http://localhost:11434`.
- [ ] La source affichée se **réhydrate** au chargement depuis `authoringEndpoint`/`authoringModel`.
- [ ] Le **mock opt-in** et le **champ endpoint libre** (« Personnalisé ») restent fonctionnels
      (non-régression). Aucun code Rust modifié dans ce lot.
- [ ] `npm run build` / typecheck / lint / tests front verts.

**Lot 2**
- [ ] Avec la source **LiteLLM** et un modèle `openai:<nom>` (ou `gpt-*`/`claude-*` via LiteLLM), le
      **chemin conseil/chat** (`resolveAdvice`/streaming) produit une réponse **live** réelle
      (recette Tauri) et un **aveu honnête** si LiteLLM est injoignable — **jamais** de fausse réponse.
- [ ] `provider == "openai"` route sur `POST {host}/v1/chat/completions` ; réponse extraite de
      `choices[0].message.content` ; streaming lit le SSE et clôt sur `data: [DONE]` (tests Rust purs).
- [ ] Une **clé** réglée (`authoringApiKey`) est envoyée en `Authorization: Bearer …` et **n'apparaît
      dans aucun log ni message d'erreur** (test : erreur sur hôte refusé ne contient pas la clé).
- [ ] `host_allowed` **inchangé** : `http://localhost:4000` accepté (loopback) ; un LiteLLM LAN
      accepté **seulement** s'il égale `authoringEndpoint` réglé ; hôte arbitraire refusé (tests
      existants toujours verts).
- [ ] **CSP `tauri.conf.json` inchangée** ; aucune entrée `capabilities` ajoutée.
- [ ] Frontière **authoring ≠ exécution** intacte (aucun toucher au runner du Binding).
- [ ] typecheck / lint / tests front + `cargo test` verts.

---

## 10. Verdict cross-repo & vendor-check

- **Lot 1** : `src/` (GUI) **seul** — GUI-only.
- **Lot 2** : `src-tauri/` (Rust) **+** façade `src/api/backend.ts` **+** `resolve.ts`/`advise.ts`.
  `@iakaframe/core` **non touché** : l'interface `LlmRequest`/`LlmTransport` porte déjà `provider` ; le
  champ `apiKey` vit dans la façade `LlmCompleteArgs` (côté `src/`), pas dans le contrat cœur. **À-CONF**
  si un besoin de typage cœur émerge.
- **`vendor-check` : NON concerné.** Cette feature ne touche **aucun `.md` canon** (plomberie LLM
  runtime + réglages) ; il n'y a **pas** de parité CLI↔cœur en jeu. À confirmer à la remise Legolas.

---

## 11. Estimation (jalon P1→P2 — ordre de grandeur, non un engagement ferme)

| Lot | Équivalent jour-homme | Complexité / risque | Inconnues (glissement possible) |
|---|---|---|---|
| **Lot 1** (sélecteur + presets Ollama, GUI-only) | **~0,5 j** | **Faible** | mapping inverse endpoint→preset ; ergonomie « Personnalisé » |
| **Lot 2** (provider OpenAI-compat → LiteLLM, conseil/chat) | **~1,5–2 j** | **Moyenne** | parsing **SSE** ; en-tête clé sans fuite ; recette réseau réelle hors CI |
| **Lot 2b** (modèles `/v1/models` + `response_format` structuré) | **~1–1,5 j** | **Moyenne** | mapping `format→response_format` selon backend LiteLLM ; variabilité des réponses |

**Total pilote (Lot 1 + Lot 2)** : **~2–2,5 j**. **2b** optionnel, à la demande.
**Pilote recommandé : Lot 1 immédiatement (GUI-only), puis Lot 2 (OpenAI-compat → LiteLLM).** À
arbitrer par le décideur au jalon ci-dessous.

---

## 12. Sources (état de l'art vérifié)

- [1] LiteLLM — Model Discovery (`/v1/models`) : https://docs.litellm.ai/docs/proxy/model_discovery
- [2] LiteLLM — Quick Start (proxy port 4000, OpenAI-compat) : https://docs.litellm.ai/docs/proxy/quick_start
- [3] LM Studio — OpenAI Compatibility Endpoints (`:1234/v1`) : https://lmstudio.ai/docs/developer/openai-compat
- [4] Ollama — OpenAI compatibility (`:11434/v1/chat/completions`) : https://ollama.com/blog/openai-compatibility
- [5] LiteLLM — `/v1/messages` unifié + note sécurité versions : https://docs.litellm.ai/docs/anthropic_unified/

---

## Jalon — P1 → P2 (cadrage → réalisation)

> À poser via `iakaframe jalon`. **Gate humain** : Gandalf **propose**, le décideur **tranche**.
> Points à arbitrer : (a) Option A vs B pour le provider (§4.2, reco **A**) ; (b) pilote **Lot 1 →
> Lot 2** (reco) ; (c) confirmation que « Claude/ChatGPT local » = **modèles via LiteLLM** (OpenAI-compat),
> donc **pas** d'adaptateur Anthropic natif.
