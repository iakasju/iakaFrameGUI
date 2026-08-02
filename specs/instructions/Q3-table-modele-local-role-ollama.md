# Instruction — Q-3 : **découverte des modèles au nœud** & pré-remplissage du Binding par rôle

> ⚠️ **Titre du fichier périmé.** Ce document s'appelle encore
> `Q3-table-modele-local-role-ollama.md` alors qu'**il n'y a plus de table de modèles** : la liste
> vient du nœud interrogé. **Renommage recommandé** →
> `Q3-decouverte-modeles-noeud-preremplissage-binding.md`.
> **Non effectué** : un renommage casse les références croisées (`E1-evolution-binding-ar1.md:227`,
> `etat-des-lieux.md`) — c'est au décideur de le déclencher.

> **Nature** : cadrage de l'arbitrage laissé ouvert par `E1-evolution-binding-ar1.md` § 10bis.
> **Cadreur** : l'architecte-cadreur (P1 — Cadrage), **read-only sur le code, aucun code produit**.
> **Date** : 2026-08-01, **fermé le 2026-08-02**.
> Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> ## ✅ **Statut : FERMÉ — les six questions Q-3.a → Q-3.f sont TRANCHÉES** (§ 9).
> Prêt pour implémentation (P2 — Développement) contre les critères du § 10.
> Points explicitement **renvoyés à plus tard** : § 11 (aucun n'est bloquant).

---

## 0. Vérification externe (règle du cadrage) — faite, et **elle a changé la nature de Q-3**

Q-3 demandait de figer une **table de suggestion modèle-local ↔ rôle**. La vérification web du
**2026-08-01/02** a établi que cette table serait **fausse avant d'être livrée** :

| Fait vérifié | Source |
|---|---|
| `qwen3-vl` est passé de **cloud-only** (billet d'annonce d'oct. 2025) à **six tags locaux** (`2b` 1,9 Go → `235b` 143 Go) en ~9 mois | [ollama.com/blog/qwen3-vl](https://ollama.com/blog/qwen3-vl), [ollama.com/library/qwen3-vl](https://ollama.com/library/qwen3-vl) |
| `qwen3-coder` a supplanté `qwen2.5-coder` sur les configurations 24 Go+ ; son plus petit tag est `30b` à **19 Go** (9 tags vérifiés, **aucun** sous 15 Go) | [ollama.com/library/qwen3-coder](https://ollama.com/library/qwen3-coder) |
| Plusieurs agrégateurs citent des modèles (`gemma4`, `devstral-small-2`, `qwen3-coder-next`) que la **bibliothèque officielle ne confirme pas** | comparaison [ollama.com/library](https://ollama.com/library) vs [morphllm.com](https://www.morphllm.com/best-ollama-models) |
| Ollama expose une **API compatible OpenAI** : `/v1/models`, `/v1/models/{model}`, `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/responses` | doc officielle Ollama |
| **Aucun endpoint Ollama n'expose la VRAM totale** de la machine. `/api/ps` ne rend que la VRAM **consommée par les modèles chargés**, et **omet le champ quand il vaut 0** | doc officielle Ollama |

**Mesures sur le poste du décideur (2026-08-02)** :

- Ollama local répond en **v0.20.2** ; il ne contient **qu'un seul modèle** : **`llama3.1:8b`
  (4,9 Go)**.
- Le nœud LAN **`192.168.2.11:11434` n'a pas répondu.**

> **→ Conclusion qui renverse le cadrage initial.** Une table écrite à la main est (a) **périmée en
> mois**, (b) **invérifiable** sur le parc réel, et (c) **inutile** : le nœud sait déjà dire ce
> qu'il a. Le dernier fait est décisif — **la VRAM n'étant pas interrogeable**, tout dimensionnement
> par palier reposerait sur une déclaration humaine que rien ne vérifie. **Le paramètre matériel est
> donc supprimé, et la table avec lui.**

---

## 1. Besoin (reformulé après verdicts)

Sur un nœud qui **exige un modèle**, un kit n'est **exécutable hors Cockpit** que si chaque persona
en porte un. Aujourd'hui la forge pose `model: ""` partout : le décideur doit **saisir à la main**,
en **texte libre**, autant de noms de modèles qu'il y a de personas — sans savoir ce que le nœud
propose, sans validation, sans aide.

**Le besoin n'est donc pas « quel modèle recommander », mais « faire dire au nœud ce qu'il a, et
pré-remplir intelligemment ».**

---

## 2. Faits établis (lecture réelle du code, `chemin:ligne`)

### 2.1 Le comportement actuel — `model: ""`, confirmé

- `defaultBindingForNode(team, node)` — `packages/core/src/binding.ts:178` — produit **une liaison
  par persona** avec `runner: defaultRunnerForNode(node)` et **`model: ""`** (`:187`), `tools: []`
  (`:188`).
- `defaultRunnerForNode` — `binding.ts:73` : `claude→claude` ; `codex→chatgpt` (host-isé) ;
  `ollama-lan→ollama-distant` ; défaut (`ollama-localhost`, `openwebui`) `→ollama-local` (`:84`).
- `modelForPersona` — `binding.ts:199` : `""` ⇒ **aucune émission de modèle**, donc « kit pur pour
  cette persona ». **`""` est le pivot documenté de la rétro-compatibilité** (`binding.ts:195-197`).
  **C'est un défaut sûr, pas un oubli.**

### 2.2 Où l'utilisateur saisit le modèle aujourd'hui

- `src/components/LiaisonPanel.tsx` — étape « Liaison » du flux Déploiement, **entre le choix du
  nœud et le bouton Générer** (`:1-11`), **masquée tant qu'aucun nœud n'est choisi** (`:56`).
- Champ modèle = **`<input>` texte libre**, un par persona (`:123-130`), avec un `placeholder`
  **codé en dur** — `"ex. qwen2.5-coder:14b"` (`:127`) : une **table implicite d'un seul élément**,
  déjà périmée.
- Avertissement **non bloquant** « modèle requis » si vide sur un nœud ≠ `claude` : règle
  `modelRequiredFor` (`:22-24`), calcul `:100`, rendu `:131-139`.
- **Le `roleKey` est déjà disponible au point exact où la suggestion doit atterrir** :
  `LiaisonPanel.tsx:105` (`roleLabel(p.roleKey)`) ; tri par `roleIndex` (`:34-36`).
- Câblage : `src/views/DeployView.tsx:63-70` ; état dans `src/hooks/useForgeDeploy.ts:165-169`
  (`enableBinding`), `:174-175` (`clearBinding`), `:197-206` (`setPersonaModel`), `:274-275`
  (écriture de `binding.json`).

### 2.3 Le vocabulaire de rôles canon existe — fermé, stable, déjà l'axe du système

- `packages/core/src/roles.ts:46-56` — **`CANONICAL_ROLES`, 9 rôles** (`roleIndex` 0→8) :
  `portefeuille`, `coordination`, `cadrage`, `dev`, `qualite`, `deploiement`, `design`,
  `documentation`, **`frame`**.
- `CANONICAL_ROLE_KEYS` `:59` ; `roleByKey` `:70` ; `roleLabel` `:79` (**tolérant** : clé hors liste
  → rendue telle quelle).
- `Persona.roleKey` — `packages/core/src/persona.ts:26`, défensif au parse (`:90-92`).
- **Jurisprudence interne** : la facette portefeuille de G6 identifie par
  **`roleKey === "portefeuille"`**, **jamais** par le nom — `packages/core/src/frame.ts:604`, avec
  test prouvant qu'une **persona renommée** reste reconnue
  (`packages/core/__tests__/frame.test.ts:168`).

### 2.4 La source pressentie par E1 **n'est plus la source**

E1 demandait : *« Confirmer la source de la table de suggestion (réutiliser
`cible-ollama-modeles-agents.md` ?) »* (`E1-evolution-binding-ar1.md:196`).

Le fichier **existe** — `/Users/sjupin/work/iakaframe/specs/instructions/cible-ollama-modeles-agents.md`,
table en `:25-34` — mais il est **clé par nom de persona** (ce que G6 a proscrit), **incomplet**
(8 entrées pour 9 rôles : le rôle `frame` n'y figure pas), **périmé** (`qwen2.5-coder`,
`qwen2.5-vl`) et **hors dépôt** (`@iakaframe/core` ne peut pas l'importer). Il le dit lui-même :
*« Tableau à ajuster selon l'état de l'art »* (`:36-37`).

> **Réponse à E1 : NON.** La source n'est ni ce fichier ni aucun autre document — **c'est le nœud
> interrogé**. Ce fichier reste une doc du dépôt canon (il documente notamment la découverte
> `/api/tags` côté PowerShell, `:17-19`), mais **il n'a plus de rôle dans la forge**.

### 2.5 ⚠️ **Correction d'un constat erroné du cadrage initial** — la découverte EXISTE DÉJÀ

La première version de ce document affirmait que la GUI ne savait pas découvrir les modèles
(« zéro occurrence de `/api/tags` », comportement testé négativement
`src/components/SettingsRoot.test.tsx:242`) et chiffrait cette capacité comme **un lot backend à
ouvrir**. **C'était vrai pour `/api/tags` et trompeur au fond : la capacité est livrée sous un
autre endpoint.**

**`llm_models`** — `src-tauri/src/llm.rs:619` :

- fait **`GET {host}/v1/models`** (compatible OpenAI — donc **Ollama ET LiteLLM**), URL construite
  par `openai_models_url` (`:644`) ;
- **garde d'hôte** `host_allowed` (`:632`), **timeout dur** (défaut **10 s**, `:637`), **Bearer
  optionnel** lu **côté Rust** pour que le GUI ne détienne jamais le secret (`:648-657`) ;
- **ne renvoie JAMAIS d'`Err`** : tout échec devient `{ models: [], reason: Some(...) }` —
  hôte refusé (`:633`), injoignable (`:662`), statut non-2xx (`:665`), corps illisible (`:669`),
  aucun modèle (`:673`). La clé **n'apparaît jamais** dans `reason` (`:616`).
- Type de retour `ModelsResult` — `llm.rs:588-602` (`ok` `:596`, `empty` `:599`).
- Façade TS : `LlmModelsResult` — `src/api/backend.ts:379-382` ; `llmModels(endpoint, apiKey?,
  timeoutMs?)` — `:390-396`, exportée `:775`.

> **C'est exactement le patron d'aveu honnête dont Q-3 a besoin** : *jamais une fausse liste,
> toujours une raison lisible, et la saisie manuelle reste ouverte.* Il est **déjà écrit, déjà
> testé**. Q-3 n'a **rien de nouveau à construire côté backend**.

### 2.6 La limite réelle — **la garde d'hôte**, et le trou `ollama-lan`

`host_allowed` — `src-tauri/src/llm.rs:47` — autorise un hôte **si et seulement si** :

- son schéma est `http`/`https` (`:48-50`), **ET**
- son hostname est **loopback** (`localhost`, `127.0.0.1`, `::1`, `[::1]` — `is_loopback` `:35-37`),
  **OU** il **égale exactement** l'hôte de l'`authoringEndpoint` **persisté** (`:54-57`).

**Tout le reste est refusé** — invariant de sécurité **CA9**, testé sans réseau
(`llm.rs:688` `host_allowed_accepte_loopback`).

**Conséquence par nœud** :

| Nœud | Hôte de découverte | Passe la garde ? |
|---|---|---|
| `ollama-localhost` | `http://localhost:11434` | ✅ loopback |
| `openwebui` | Ollama loopback sous-jacent (runner `ollama-local`, `binding.ts:84`) | ✅ loopback |
| **`ollama-lan`** | le **`lanHost`** saisi au déploiement (`NodeSelector.tsx:54`, `useForgeDeploy.ts:228-234`) | ❌ **REFUSÉ**, sauf s'il **égale** l'`authoringEndpoint` réglé |

> **Le trou est réel et nommé** : un nœud Ollama **LAN** qui n'est pas, par ailleurs, l'endpoint
> d'authoring **ne sera pas découvert**. Traitement retenu : § 7.

### 2.7 Ce que `settings.json` contient — et sa frontière

`<workspace>/settings.json`, via `src-tauri/src/settings.rs` : `iakaframe_home` (`:129`),
`authoring_model` (`:142`), `authoring_endpoint` (`:155`), `project_dir` (`:162`),
`authoring_api_key` (`:180`) + leurs setters (`:135`, `:148`, `:173`, `:168`, `:186`) ;
façade TS `src/api/backend.ts:195`, `:207`, `:210`, `:225`.

**Trois de ces commentaires posent la même frontière, mot pour mot** :
*« Réglage build-time, **DISTINCT du runner d'EXÉCUTION du Binding** (frontière authoring ≠
exécution) »* — `settings.rs:140`, `:153`, `:178`.

> **Fait structurant pour Q-3.a** : `settings.json` est l'artefact de l'**authoring**. Le Binding
> est l'artefact de l'**exécution**. Y loger une donnée de déploiement **franchirait une frontière
> que le code défend explicitement à trois endroits**.

---

## 3. Le point de bascule — **mécanisme stable vs contenu volatil**, résolu par soustraction

Le diagnostic du cadrage initial est **validé** : Q-3 mêlait deux natures opposées.

```
 ┌─ MÉCANISME (stable) ────────────────────────────────────────────────┐
 │  « on interroge le nœud · on pré-remplit par rôle · l'utilisateur    │
 │    confirme · l'échec retombe sur model:"" »                        │
 │  → change tous les 2 ans. Va dans le CODE (@iakaframe/core + UI).   │
 └──────────────────────────────────────────────────────────────────────┘
 ┌─ CONTENU (volatil) ─────────────────────────────────────────────────┐
 │  « cadrage → deepseek-r1:14b ; dev → qwen3-coder:30b ; … »           │
 │  → change tous les 3 mois (§ 0).                                     │
 │  ⇒ **SUPPRIMÉ. Il n'y a plus de contenu à loger nulle part.**        │
 └──────────────────────────────────────────────────────────────────────┘
```

Le cadrage initial proposait de **déplacer** le contenu (option B : fichier de configuration
éditable). **Le décideur fait mieux : il le supprime.** La liste des candidats devient une
**propriété du nœud**, lue à la demande. Il ne reste **que du mécanisme** — donc **rien à
maintenir, rien à faire périmer, rien à persister**.

---

## 4. Périmètre — DANS / HORS

**DANS**

- Interroger le nœud cible via **`llmModels`** (existant, `backend.ts:390`) au moment de la liaison.
- Transformer le champ modèle de `LiaisonPanel` en **liste déroulante alimentée par la découverte**,
  **restant librement éditable**.
- **Pré-remplir** chaque persona par une **règle de motif** sur le nom du modèle, clé **`roleKey`**
  (§ 6), couvrant les **9 rôles canon**.
- **Repli honnête** quand la découverte échoue ou rend une liste vide : `model: ""` + `reason`
  affichée + saisie manuelle (§ 5.3).
- Non-régression : `""` reste le défaut sûr, évolution **additive** (§ 9, Q-3.e).

**HORS**

- **Toute table de modèles** écrite à la main — supprimée (§ 3).
- **Tout paramètre de VRAM / dimensionnement matériel** — supprimé : **non interrogeable** (§ 0).
- **Toute nouvelle commande Tauri** : `llm_models` existe et suffit (§ 2.5).
- **Tout élargissement de la garde d'hôte** `host_allowed` (`llm.rs:47`) — invariant de sécurité
  CA9 ; le cas `ollama-lan` est traité par dégradation, pas par ouverture (§ 7).
- **Toute persistance nouvelle** dans `settings.json` (§ 9, Q-3.a).
- L'axe **`tools`** par persona (`binding.ts:44`), l'**override cockpit** (E1 Q-5), et toute
  modification des schémas `Binding`/`PersonaBinding` (`binding.ts:30-59`) : **aucune requise**.
- Tout benchmark, classement ou installation automatique de modèles (`ollama pull`).
- Toute modification de `cible-ollama-modeles-agents.md` (autre dépôt).

---

## 5. Architecture retenue — le flux

### 5.1 Quand la découverte se déclenche

À l'**activation de la liaison** : cocher « Lier ce kit » (`LiaisonPanel.tsx:68-76`) appelle
`enableBinding` (`useForgeDeploy.ts:165-169`). C'est là que la découverte part — **une fois**, pas
à chaque frappe. **Pas de cache** au MVP : la liste est relue à chaque activation (simple, jamais
périmée).

### 5.2 Quel hôte est interrogé, selon le nœud

| Nœud | Hôte interrogé |
|---|---|
| `ollama-localhost` | `http://localhost:11434` |
| `openwebui` | Ollama loopback sous-jacent (runner `ollama-local`) |
| `ollama-lan` | le `lanHost` saisi (`useForgeDeploy.ts:228-234`) — **soumis à la garde**, cf. § 7 |
| `claude`, `codex` | **aucune découverte** (§ 9, Q-3.f) |

### 5.3 Ce qui se passe quand ça échoue — **un seul comportement**

`llmModels` ne rejette pas : il rend `{ models: [], reason }` (§ 2.5). Hors Tauri, la façade
**rejette** (`BACKEND_UNAVAILABLE_MSG`, `backend.ts:387-388`) — l'appelant capte.

**Les deux cas convergent sur le même comportement, sans exception** :

1. la liste déroulante est **vide** → le champ reste une **saisie libre** (comportement d'aujourd'hui) ;
2. la **`reason`** est **affichée telle quelle** à l'utilisateur (aveu honnête, jamais masqué) ;
3. le modèle pré-rempli est **`""`** ;
4. l'avertissement existant « modèle requis » (`LiaisonPanel.tsx:131-139`) **fait le reste** —
   il est déjà là, non bloquant.

> **Le cas est réel, pas théorique** : le nœud LAN du décideur **ne répond pas** (§ 0). Ce chemin
> sera emprunté dès le premier essai.

---

## 6. La **règle de pré-remplissage** — définition exacte

> **Entrée** : `models: string[]` (dans **l'ordre rendu par le nœud**) + `roleKey: string`.
> **Sortie** : un id **issu de `models`**, ou **`""`**. **Pure, déterministe, sans exception.**

### 6.1 Table de motifs — par `roleKey`, ordonnée

| `roleKey` | Motifs (ordre d'évaluation) |
|---|---|
| `dev` | `coder`, `code` |
| `qualite` | `coder`, `code` |
| `design` | `vl`, `vision` |
| `portefeuille`, `coordination`, `cadrage`, `deploiement`, `documentation`, `frame` | *(aucun)* |

**Union des motifs spécialisés** = { `coder`, `code`, `vl`, `vision` } — sert au défaut (§ 6.2, ⑤).

### 6.2 Algorithme

1. **Liste vide** → **`""`**. (fin — c'est le chemin d'échec du § 5.3)
2. **Casse** : comparaison sur `model.toLowerCase()`, motifs déjà en minuscules.
   **Test = sous-chaîne** (« le nom *contient* le motif »).
3. **Ordre d'évaluation : motif d'abord, liste ensuite.** Pour chaque motif **dans l'ordre du
   tableau**, on parcourt `models` **dans l'ordre du nœud** et on retient le **premier** id qui le
   contient. Un motif plus spécifique gagne donc toujours : `coder` l'emporte sur `code`, **même si**
   un id contenant `code` apparaît plus tôt dans la liste.
4. **Plusieurs modèles matchent le même motif** → **le premier dans l'ordre rendu par le nœud**.
   Déterministe et stable ; aucun tri, aucun score, aucun arbitrage caché.
5. **Aucun motif ne matche, ou rôle sans motif** → **défaut généraliste** = le **premier id ne
   contenant AUCUN motif de l'union spécialisée**. Si tous en contiennent (ou s'il n'y a qu'un seul
   modèle) → **`models[0]`**.
6. **`roleKey` inconnu / vide / non-string** → traité comme **rôle sans motif** (→ ⑤).
   **Jamais d'exception** (contrat des `parse*` du cœur, cf. `roles.ts:99`, `binding.ts:107`).

### 6.3 Déroulé sur les deux cas réels

**Cas A — le poste du décideur** : `models = ["llama3.1:8b"]`.
Aucun motif ne matche → défaut généraliste → `llama3.1:8b` n'est pas spécialisé → **les 9 rôles
reçoivent `llama3.1:8b`**. *Dégradation saine : un seul modèle disponible, il sert à tout.*

**Cas B — un nœud fourni** : `models = ["qwen2.5-coder:7b", "qwen3-vl:8b", "qwen3:8b"]`.

| Rôle | Résultat | Par quelle branche |
|---|---|---|
| `dev`, `qualite` | `qwen2.5-coder:7b` | motif `coder` ③ |
| `design` | `qwen3-vl:8b` | motif `vl` ③ |
| les 6 autres | `qwen3:8b` | défaut généraliste ⑤ (les deux premiers sont spécialisés) |

> Sans la branche ⑤ « généraliste », les six rôles non spécialisés auraient hérité de
> `qwen2.5-coder:7b` (premier de liste) — un codeur pour rédiger de la documentation. **La branche
> ⑤ n'est pas un raffinement cosmétique : elle évite un défaut manifestement absurde.**

### 6.4 Ce que la règle **ne fait pas**

Elle **ne classe pas** les modèles, **ne mesure rien**, **ne connaît aucun modèle par son nom**.
Elle n'a **aucune connaissance à maintenir** — seulement quatre motifs. C'est le prix à payer pour
n'avoir plus **aucune table**. Sa fragilité est nommée en **R-3** (§ 8).

---

## 7. Le trou `ollama-lan` — nommé, et **délibérément non refermé au MVP**

**Le problème** : `host_allowed` (`llm.rs:47`) n'autorise que loopback **ou** l'`authoringEndpoint`
persisté. Un `lanHost` saisi dans le flux de déploiement (`useForgeDeploy.ts:228-234`) **n'est pas**
l'`authoringEndpoint` → **découverte refusée**, `reason` = message d'hôte refusé (`llm.rs:633`).

**Trois façons de le fermer** :

| | Traitement | Coût / risque |
|---|---|---|
| **T-1** | **Ne rien changer** — `ollama-lan` dégrade sur le chemin § 5.3 (liste vide + aveu + saisie manuelle) | **Zéro risque. Zéro régression** : c'est exactement le comportement d'aujourd'hui pour ce nœud |
| **T-2** | **Contournement documenté** : régler l'`authoringEndpoint` (`SettingsRoot`, `backend.ts:225`) sur l'hôte LAN → la garde passe **sans modification de code** | Zéro code ; mais **couple** un réglage d'authoring à un besoin de déploiement — exactement la frontière que `settings.rs:140/:153/:178` défend |
| **T-3** | **Élargir la garde** au `lanHost` du flux de déploiement | **Touche un invariant de sécurité testé (CA9)**. Une allow-list qui s'ouvre depuis un champ de formulaire n'est plus une allow-list |

**Retenu : T-1**, avec **T-2 mentionné comme contournement** dans le message d'aveu.
**T-3 est renvoyé au § 11** — élargir une garde de sécurité n'est pas une décision que le cadrage
prend au détour d'un lot d'ergonomie.

> **Conséquence assumée** : sur `ollama-lan`, Q-3 **n'apporte rien** au MVP. C'est **honnête et sans
> régression** — le nœud LAN du décideur ne répond de toute façon pas (§ 0).

---

## 8. Réserves nommées

**Réserves maintenues** (elles survivent au changement de nature) :

- **R-1 — Péremption de l'écosystème.** Les modèles locaux bougent en **mois** (§ 0). *La
  résolution retenue neutralise cette réserve pour la forge* — il n'y a plus de contenu à périmer.
  Elle reste vraie **pour `cible-ollama-modeles-agents.md`** dans le dépôt canon, qui continue, lui,
  de porter une table datée et clé par nom de persona.
- **R-2 — Découverte ≠ pertinence.** Le nœud dit ce qu'il **a**, jamais ce qui est **bon** pour un
  rôle. Un nœud ne contenant qu'un modèle de vision proposerait ce modèle pour le développement. La
  forge **n'a aucun moyen de le savoir** et **ne prétendra pas le savoir** — l'utilisateur reste
  juge, le champ reste éditable.

**Réserve nouvelle** :

- **R-3 — La règle de motif repose sur une convention de nommage que RIEN ne garantit.**
  Ollama n'impose **aucune sémantique** aux noms de modèles ; ils viennent des éditeurs.
  - **Faux négatifs** (un codeur non détecté) : `devstral` ne contient **ni** `coder` **ni** `code`
    → il recevrait le défaut généraliste alors que c'est un modèle de code.
  - **Faux positifs** : `vl` est **court** ; toute suite de deux lettres peut apparaître
    accidentellement dans un nom sans rapport avec la vision.
  - **Aucun signal** n'est donné à l'utilisateur quand la règle se trompe : le champ est simplement
    pré-rempli avec un mauvais candidat.
  > **Le décideur a tranché en connaissance de cause.** L'atténuation est **structurelle** : le
  > champ est **toujours éditable** et **toujours visible** (§ 9, Q-3.d) — une erreur de motif est
  > **corrigible en un geste**, jamais silencieuse au point d'être irrattrapable. Enrichir la table
  > de motifs est possible (§ 11, **P-O-3**), au prix d'**une fragilité accrue à chaque ajout**.

**Réserves supprimées** (tombées avec le paramètre matériel) : les réserves sur `deploiement` /
`gpt-oss`, sur `mistral`, et sur l'écart poids-sur-disque vs occupation réelle en contexte —
**sans objet** : plus aucun modèle n'est nommé par la forge.

---

## 9. ✅ Verdict d'arbitrage du décideur (2026-08-02) — **les six questions sont tranchées**

> **Jalon VALIDÉ.** Le décideur tranche **Q-3.a → Q-3.f** et **supprime le paramètre matériel**.
> Verdict fondateur, textuel : *« si ollama liste un modèle on le liste, si litellm liste un modèle
> idem »* — **la source des candidats est le nœud, plus aucune table.**

| Question | Décision tranchée | Conséquence |
|---|---|---|
| **Q-3.a** — foyer de la table | **SANS OBJET** : il n'y a plus de table. **Rien de neuf n'est persisté** — ni dans `settings.json`, ni ailleurs | La règle de motif (§ 6) est un **mécanisme** → elle vit dans le **code** (`@iakaframe/core`), versionnée avec lui. `settings.json` **reste authoring-only**, frontière `settings.rs:140/:153/:178` **intacte**. **Simplification, pas oubli** |
| **Q-3.b** — clé de la table | **`roleKey` canon**, jamais le nom de persona. **Les 9 rôles sont couverts, `frame` inclus** | Aligné sur la jurisprudence G6 (`frame.ts:604`, test `frame.test.ts:168`). **Comble S-2** (le rôle `frame` manquait à la source canon). `roleKey` est déjà au point d'atterrissage (`LiaisonPanel.tsx:105`) |
| **Q-3.c** — modèle absent du nœud | **Reformulée : on interroge la source.** La question devient « que faire quand la découverte **échoue** ou rend une liste **vide** » → **`model: ""` + aveu honnête + saisie manuelle** | Réutilise `llm_models` (`llm.rs:619`) **tel quel** : il ne lève jamais, il rend `reason`. **Aucune commande Tauri nouvelle.** Chemin unique décrit en § 5.3 |
| **Q-3.d** — confirmation | **Pré-remplissage**, pas simple `placeholder`. Champ = **liste déroulante** alimentée par la découverte, **librement éditable**. **Cocher « Lier ce kit » reste l'acte de confirmation** | Ne pas cocher ⇒ `binding === null` ⇒ **aucun `binding.json`** (`useForgeDeploy.ts:274-275`) ⇒ **kit pur, comportement d'aujourd'hui**. Décocher efface (`:174-175`). Règle de motif définie en § 6, **fragilité inscrite en R-3** |
| **Q-3.e** — non-régression | **CONFIRMÉ.** `model: ""` reste le défaut sûr ; évolution **additive**, comme E1 | 4 invariants préservés : `defaultBindingForNode` pose toujours `""` (`binding.ts:178`, `:187`) ; `""` ⇒ aucune émission (`:195-206`) ; **sans binding, sortie byte-identique** (`:7-9`) ; **aucun champ ajouté** aux schémas (`:30-59`). **Les deux chemins vers `""`** (nœud hors périmètre / découverte échouée) **convergent sur le même comportement** — § 5.3 |
| **Q-3.f** — périmètre des nœuds | **CONFIRMÉ** : `ollama-localhost`, `ollama-lan`, `openwebui`. **Jamais `claude` ni `codex`** | **Pas d'élargissement** aux sources OpenAI-compatibles au seul motif que `/v1/models` le permettrait → renvoyé en § 11 (**P-O-1**). Nuance : `modelRequiredFor` (`LiaisonPanel.tsx:22-24`) vaut `node !== "claude"`, donc **`codex` exige un modèle mais n'a pas de découverte** → il **conserve la saisie libre** actuelle |
| **(supprimé)** — paramètre VRAM | **SUPPRIMÉ.** Plus aucun palier matériel déclaré | Motif : **aucun endpoint Ollama n'expose la VRAM totale** ; `/api/ps` ne rend que la VRAM consommée, champ omis à 0 (§ 0). Un palier serait une **déclaration humaine invérifiable**. Avec lui tombent la table indicative, les bandes de confort et le critère qui les inscrivait |

---

## 10. Critères d'acceptation VÉRIFIABLES

- **AC-Q3-1 — Clé par rôle, jamais par nom.** La résolution prend un **`roleKey`**. Test : deux
  personas de **noms différents** mais de **même `roleKey`** obtiennent le **même** pré-remplissage ;
  une persona **renommée** conserve le sien. *(Miroir de `packages/core/__tests__/frame.test.ts:168`.)*
- **AC-Q3-2 — Les 9 rôles canon sont couverts.** Pour **chaque** clé de `CANONICAL_ROLE_KEYS`
  (`roles.ts:59`) — **`frame` inclus** — et pour une liste découverte **non vide**, la règle rend un
  id **appartenant à cette liste** (jamais `""`, jamais un id inventé). Test : itération sur
  `CANONICAL_ROLE_KEYS`.
- **AC-Q3-3 — Déterminisme de la règle (§ 6).** Sur le **cas B** (§ 6.3) :
  `dev`/`qualite`→`qwen2.5-coder:7b` (motif `coder`), `design`→`qwen3-vl:8b` (motif `vl`), les **6**
  autres→`qwen3:8b` (**défaut généraliste**, pas `models[0]`). Test : la **priorité motif > ordre de
  liste** est prouvée par un cas où un id contenant `code` précède un id contenant `coder`.
- **AC-Q3-4 — Défensif, jamais d'exception.** `roleKey` inconnu / `""` / non-string, et `models`
  contenant des entrées vides → **aucune exception** ; `models` **vide** → **`""`**.
- **AC-Q3-5 — Chemin d'échec unique et honnête.** Découverte en échec (**hôte refusé**, **injoignable**,
  **liste vide**) ⇒ **les trois** produisent le **même** état : liste déroulante vide, **`reason`
  affichée telle quelle**, modèle **`""`**, **saisie manuelle possible**. Test : les 3 `reason` de
  `llm_models` (`llm.rs:633`, `:662`, `:673`) mènent au même rendu. **Jamais une fausse liste.**
- **AC-Q3-6 — Non-régression : `""` reste le défaut sûr.** `defaultBindingForNode` (`binding.ts:178`)
  pose **toujours `model: ""`** pour `claude` et `codex`, et pour tout rôle sans candidat. Les tests
  existants de `packages/core/__tests__/binding.test.ts` **restent verts sans modification**.
- **AC-Q3-7 — Kit pur inchangé.** **Sans binding**, la sortie de génération reste **byte-identique**
  (invariant `binding.ts:7-9`). `parite-generateurs.test.ts` et `adapters*.test.ts` **restent verts
  sans modification**.
- **AC-Q3-8 — Confirmation explicite.** Tant que « Lier ce kit » n'est **pas** coché :
  `binding === null`, **aucun `binding.json`** dans l'arbre (`useForgeDeploy.ts:274-275`). Après
  avoir coché sur un nœud du périmètre : les champs sont **pré-remplis** et **restent éditables**
  (`LiaisonPanel.tsx:129`). **Décocher efface** (`useForgeDeploy.ts:174-175`).
- **AC-Q3-9 — Périmètre des nœuds.** La découverte est déclenchée **exactement** pour
  `ollama-localhost`, `ollama-lan`, `openwebui` ; **jamais** pour `claude` ni `codex`. Test paramétré
  sur les 5 `NodeKind` (`packages/core/src/node.ts:18-23`) comptant les appels à `llmModels`.
- **AC-Q3-10 — Aucune commande Tauri nouvelle.** La découverte passe **exclusivement** par
  `llmModels` (`backend.ts:390`) / `llm_models` (`llm.rs:619`). Vérifié par recherche : **zéro**
  occurrence de `api/tags` ; `src-tauri` **inchangé** ; `host_allowed` (`llm.rs:47`) **non modifié**.
- **AC-Q3-11 — Plus aucun nom de modèle en dur.** Le `placeholder` `"ex. qwen2.5-coder:14b"`
  (`LiaisonPanel.tsx:127`) est **supprimé**. Recherche : **aucun identifiant de modèle littéral** ne
  subsiste dans `src/` ni dans `packages/core/src/`, **hors** les 4 **motifs** de § 6.1 (`coder`,
  `code`, `vl`, `vision`) — qui sont des **fragments**, pas des noms de modèles.
- **AC-Q3-12 — Rien de neuf n'est persisté.** `settings.json` **ne gagne aucune clé** : la liste des
  clés écrites par `settings.rs` est **inchangée** (`:135`, `:148`, `:168`, `:173`, `:186`). Aucun
  cache de liste découverte n'est écrit sur disque.

---

## 11. Points ouverts — **renvoyés, aucun bloquant**

- **P-O-1 — Élargir la découverte aux sources OpenAI-compatibles.** `/v1/models` est **générique** :
  la même mécanique servirait LiteLLM et OpenAI. **Non retenu ici** (Q-3.f borne à trois nœuds
  Ollama). *Le cadrage note que l'extension serait presque gratuite techniquement* — mais elle
  **change le périmètre du Binding**, donc elle appartient au décideur.
- **P-O-2 — Fermer le trou `ollama-lan` (T-3, § 7).** Élargir `host_allowed` (`llm.rs:47`) au
  `lanHost` du flux de déploiement. **Arbitrage de sécurité dédié** : c'est un invariant CA9 testé,
  pas un réglage d'ergonomie.
- **P-O-3 — Enrichir la table de motifs** (§ 6.1) : `devstral`, `starcoder`, `magistral`… **Chaque
  ajout accroît la fragilité R-3** et rapproche d'une table déguisée — exactement ce que le verdict
  a supprimé. À n'ouvrir que sur constat d'usage.
- **P-O-4 — Cache de la liste découverte.** Écarté au MVP (relecture à chaque activation). À
  reconsidérer si la latence gêne.
- **P-O-5 — Statut de `cible-ollama-modeles-agents.md`** dans le dépôt canon. Il **n'est plus la
  source** de la forge (§ 2.4), mais il reste publié et daté. Décider s'il est **amendé** (mention
  de son périmètre PowerShell), ou **laissé tel quel**. **Touche l'autre dépôt — hors périmètre.**
- **P-O-6 — Override cockpit** (E1 Q-5) : le pré-remplissage est un **défaut de forge**
  (`origin: "forge-default"`, `binding.ts:190`). Le Cockpit garde son pouvoir d'override.
  Instruction Cockpit dédiée.
- **P-O-7 — Renommage du fichier** (cf. en-tête) →
  `Q3-decouverte-modeles-noeud-preremplissage-binding.md`, avec mise à jour des références
  (`E1-evolution-binding-ar1.md:227`, `etat-des-lieux.md`).

---

## 12. Jalon (gate humain)

| Émetteur | Contenu | Récepteur |
|---|---|---|
| 🔵 Cadrage (P1) | Instruction fermée : verdict d'arbitrage Q-3.a→Q-3.f (§ 9), architecture du flux (§ 5), règle de pré-remplissage exacte (§ 6), traitement du trou `ollama-lan` (§ 7), réserves R-1→R-3 (§ 8), 12 critères d'acceptation (§ 10), 7 points renvoyés (§ 11) | 🟢 Le décideur → **validé** → implémentation (P2 — Développement) |

**Prêt pour implémentation.** Aucune commande Tauri à écrire, aucun schéma à modifier, aucune donnée
à persister. Le comportement actuel (`model: ""`) **reste le défaut sûr** sur tous les chemins.

---

## 13. Journal de décision

- **2026-07-07** — E1 pose Q-3 (politique de Binding par défaut par nœud). Reco : suggestion par
  rôle sur Ollama, confirmée par l'utilisateur ; source pressentie `cible-ollama-modeles-agents.md`.
  *(`E1-evolution-binding-ar1.md:193-196`.)*
- **2026-07-30** — « Go bloc » sur Q-1/Q-2/Q-4/Q-5/Q-6. **Q-3 laissée ouverte** : le runner par
  défaut est livré (`defaultRunnerForNode`), la table ne l'est pas.
  *(`E1-evolution-binding-ar1.md:225-227`.)*
- **2026-08-01** — **Cadrage initial.** Constats : `model: ""` confirmé (`binding.ts:187`) ; la
  source pressentie **existe** mais est clé par **nom de persona**, **incomplète** (rôle `frame`
  manquant), **périmée** et **hors dépôt**. Thèse posée : **séparer le mécanisme du contenu**. Six
  questions ouvertes + un paramètre matériel non tranché.
- **2026-08-02 (matin)** — Le décideur déclare un palier de **12 Go de VRAM**. Table re-normalisée
  sur ce palier ; `qwen3-coder:30b` (19 Go) et `gpt-oss:20b` (14 Go) écartés comme infaisables.
- **2026-08-02 — VERDICTS : changement de nature de Q-3.**
  - **Paramètre matériel SUPPRIMÉ**, et avec lui **le § 7 (palier, marges, bandes)**, **le § 8bis
    (exclusions, seuils d'upgrade)**, **la table indicative du § 8** et le critère qui l'inscrivait
    (**ex-`AC-Q3-10`**). Motif : **aucun endpoint Ollama n'expose la VRAM totale** — le palier était
    une déclaration invérifiable.
  - **La source des candidats devient le NŒUD** : *« si ollama liste un modèle on le liste, si
    litellm liste un modèle idem »*. **Plus aucune table à maintenir.** La thèse « mécanisme vs
    contenu » est validée **dans son diagnostic** et résolue **par soustraction**, plus radicalement
    que l'option B (fichier de configuration) que proposait le cadrage.
  - **⚠️ Erreur du cadrage initial, actée sans maquillage** : le § 2.5 affirmait que la GUI ne
    savait pas découvrir les modèles et chiffrait Q-3.c option 2 comme **« un lot backend : commande
    Tauri + allow-list »**. **C'était faux.** Le constat portait sur `/api/tags` alors que la
    capacité était **déjà livrée** sous `/v1/models` — `llm_models` (`llm.rs:619`), avec garde
    d'hôte, timeout, bearer et **aveu honnête sans jamais lever**. Le cadrage a mesuré l'absence
    d'un endpoint au lieu de mesurer la **capacité**. **L'essentiel du coût annoncé n'existait pas.**
  - **Six questions tranchées** (§ 9) : Q-3.a **sans objet** (rien de neuf persisté ;
    `settings.json` reste *authoring-only*) · Q-3.b **`roleKey`, 9 rôles** · Q-3.c **on interroge,
    échec → `""` + aveu** · Q-3.d **pré-remplissage en liste déroulante éditable** · Q-3.e
    **confirmé, 4 invariants** · Q-3.f **confirmé sur 3 nœuds, sans élargissement**.
  - **Limite nommée** : la garde d'hôte (`llm.rs:47`) **refuse un `ollama-lan`** qui n'est pas
    l'`authoringEndpoint`. Traitement **T-1** (dégradation honnête, zéro régression) ; l'élargir est
    renvoyé en **P-O-2** comme **arbitrage de sécurité**.
  - **Réserves** : R-1 et R-2 maintenues ; **R-3 ajoutée** (la règle de motif repose sur une
    convention de nommage que rien ne garantit — faux négatif `devstral`, faux positifs sur `vl`) ;
    celles liées à la VRAM supprimées.
  - **Instruction FERMÉE**, prête pour l'implémentation. **Titre du fichier périmé** : renommage
    recommandé, **non effectué** (P-O-7).
