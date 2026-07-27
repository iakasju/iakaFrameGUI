# Instruction — Copilote d'atelier **honnête par défaut** ; le mock devient **opt-in étiqueté**

> Cadrage P1 (🔵 Gandalf), **2026-07-27**. Décision décideur : **option C**.
> Le Copilote d'atelier (`CopiloteShell` / `resolveProposition`) cesse de **fabriquer** une
> proposition mockée quand il ne peut pas inférer : par défaut il **avoue** (comme Fëanor-en-tête),
> et le mock ne subsiste que comme **mode démo hors-ligne opt-in, toujours étiqueté**.
>
> **Lecture seule sur le code pendant le cadrage** ; ce fichier est le seul artefact produit.
> Statut : **à valider** (jalon en fin de doc). Ne code rien avant « JALON VALIDÉ ».
>
> **Amende** `specs/instructions/copilote-inference-live.md` §3.5/§3.6/§6 (voir § 8 ci-dessous).
> **Réf. d'honnêteté (patron à réutiliser)** : `src/forge/llm/advise.ts`,
> `src/forge/elementProposition.ts`, `src/forge/FeanorHead.tsx`.

---

## 0. Le défaut mesuré (sur le disque, 2026-07-27) — `preuve-avant-declaration`

Deux résolveurs sœurs, **deux honnêtetés opposées** :

| Résolveur | Modèle absent / provider ≠ ollama / réseau KO / illisible | Honnête ? |
|---|---|---|
| `resolveProposition` (`src/forge/llm/resolve.ts` §1/§2/§3.catch/§parse-null) | **fabrique** une `Proposition` via `propose()` mocké, `source:"mock"` + `reason` | ❌ non |
| `resolveAdvice` (`advise.ts:202,209,232,237`) | `reply:null` + `reason` — **aucune fausse réponse** | ✅ oui |
| `resolveElementProposition` (`elementProposition.ts:223,230,253,258`) | `proposition:null` + `reason` — **aucune fausse proposition** | ✅ oui |

Le copilote présente donc une **proposition d'artefacts fabriquée** (ids réels tirés des
catalogues du cœur, diff « avant → après » calculé) là où Fëanor, lui, **avoue**. Un utilisateur
sans modèle réglé (cas nominal : `authoringModel` **vide par défaut**) reçoit une proposition qui
**ressemble** à une inférence — c'est exactement la confusion que l'invariant d'honnêteté interdit.

Les messages `FALLBACK_*` (`resolve.ts:49-51`) disent d'ailleurs « — repli mock » : ils sont
**déjà faux** côté Fëanor (`advise.ts`/`elementProposition.ts` les importent mais renvoient `null`,
sans rien mocker). Le pivot corrige les deux d'un coup.

---

## 1. Ce que la décision change (option C)

1. **Par défaut, le Copilote est honnête** : modèle absent, provider non supporté, réseau KO,
   réponse illisible → **`proposition: null` + `reason`** (un **aveu** affiché), **jamais** une
   proposition fabriquée. Strictement aligné sur `resolveAdvice`/`resolveElementProposition`.
2. **Le mock devient un mode démo OPT-IN** : l'utilisateur l'active **explicitement**, et toute
   proposition qui en sort est **étiquetée** de façon non ambiguë (« MOCK · démo hors-ligne — pas
   un vrai modèle »), visible sur **chaque** proposition mockée.
3. **Rien d'autre ne bouge** : le chemin d'inférence **live** (succès) est inchangé ; le chemin
   d'insertion réel (le `+` du rail, `onApply`) est inchangé ; le mock reste **injectable en test**
   (`deps.mock`) — c'est légitime et hors de ce pivot.

---

## 2. Nouveau comportement de `resolveProposition` (le cœur)

### 2.1 Contrat révisé (`ResolveResult`)

`proposition` devient **nullable** ; une 3ᵉ provenance `none` rend chaque branche auditable.

```ts
export type PropositionSource = "live" | "mock" | "none";
//  "live" = inférence réelle (proposition non-null)
//  "mock" = mode démo OPT-IN (proposition non-null, TOUJOURS étiquetée)
//  "none" = aveu honnête (proposition === null)

export interface ResolveResult {
  proposition: Proposition | null; // null ⇔ aveu (aucune proposition fabriquée)
  source: PropositionSource;
  reason?: string;                 // aveu (repli) OU étiquette (démo mock)
}
```

> **Reco Gandalf.** Ajouter la valeur `"none"` (plutôt que réutiliser `"mock"` pour l'aveu comme le
> fait `resolveAdvice`) : ici le Copilote a **trois** états là où Fëanor n'en a que deux (il gagne
> le mode démo). Rendre l'aveu explicite par `source` — pas seulement par `proposition === null` —
> ferme toute ambiguïté au lecteur ET au test. *Alternative plus légère, non retenue :* garder
> `"live" | "mock"` et discriminer l'aveu sur `proposition === null` (aligné byte-à-byte sur
> `resolveAdvice`, mais `source:"mock"` pour un aveu où rien n'est mocké reste trompeur).

### 2.2 Mapping des cas (ordre d'évaluation)

| # | Condition | Résultat | `reason` |
|---|---|---|---|
| 1 | `rawModel` vide | `{ null, "none" }` | `NO_AUTHORING_MODEL_HINT` (réutilisé, `mock/copilote.ts:44`) |
| 2 | **mode démo opt-in** (§3) actif | `{ propose(intention,context), "mock" }` | `MOCK_DEMO_LABEL` (§3.2) |
| 3 | provider ≠ `ollama` (ou model vide) | `{ null, "none" }` | `FALLBACK_UNSUPPORTED` |
| 4 | `llm.complete` **rejette** (réseau KO / timeout) | `{ null, "none" }` | `FALLBACK_UNAVAILABLE` |
| 5 | `parseLiveProposition` → `null` (illisible) | `{ null, "none" }` | `FALLBACK_UNREADABLE` |
| 6 | succès live | `{ proposition, "live" }` | — |

- **Le cas 2 passe AVANT le cas 3** : `mock` n'a pas de `:` → sans cet ordre il tomberait en
  « provider non supporté ». Le mock de repli reste `deps.mock ?? propose` (déterminisme intact) —
  seul son **déclenchement** change (opt-in, plus jamais automatique).
- **`resolveProposition` ne lève jamais** (invariant conservé) : tout rejet devient un aveu propre,
  **jamais** une stack.

### 2.3 Reformulation des messages `FALLBACK_*`

Les trois constantes de `resolve.ts` **perdent le suffixe « — repli mock »** (mensonger dès lors
que le défaut est l'aveu, et déjà faux côté Fëanor). Reco de rédaction :

```ts
export const FALLBACK_UNSUPPORTED = "provider non supporté au MVP (ollama seul)";
export const FALLBACK_UNAVAILABLE = "modèle indisponible (réseau ou hôte injoignable)";
export const FALLBACK_UNREADABLE = "réponse du modèle illisible";
```

⚠️ **Ripple** : `advise.ts` et `elementProposition.ts` **importent** ces constantes ; le
reformulage **améliore** aussi leurs aveux (cohérence). Les tests qui **assertent** ces chaînes
(`resolve.test.ts`, tests `advise`/`elementProposition`/`FeanorHead`) sont à mettre à jour — c'est
attendu, pas un effet de bord.

---

## 3. Le mode mock **opt-in** — activation et étiquetage

### 3.1 Activation (DÉCISION — reco tranchée)

**Reco : valeur réservée dans le réglage existant `authoringModel`.** L'utilisateur saisit `mock`
(insensible à la casse, trimé ; provider `mock` accepté : `mock` ou `mock:<libellé>`) dans le champ
**Modèle d'authoring** déjà présent (`SettingsRoot.tsx:218`). Le résolveur détecte cette valeur
réservée (cas 2 du mapping) et route vers `propose()`.

*Motifs :* **zéro** nouvelle clé Settings, **zéro** Rust, **zéro** nouvelle méthode de façade — le
champ, sa persistance (`setAuthoringModel`), sa lecture (`authoringModel()`) et l'injection dans le
Shell (`configuredModel`) **existent déjà**. C'est le strict MVP demandé, et c'est **explicite** :
personne n'obtient de mock sans avoir tapé `mock`.

> **Alternative envisagée, non retenue au MVP** — un toggle dédié « mode démo hors-ligne »
> (nouvelle clé `authoringDemoMock: bool` dans `settings.rs` + façade + passe-plat Rust). Plus
> découvrable, mais **plus lourd** (surface backend + tests Rust) pour un gain marginal. À rouvrir
> si le décideur privilégie la découvrabilité sur la légèreté.

**Découvrabilité minimale (MVP)** : ajouter **une ligne d'aide** sous le champ Modèle d'authoring
(`SettingsRoot.tsx`, bloc `settings-authoring`) — ex. : *« Astuce démo : saisissez `mock` pour un
mode démo hors-ligne — propositions fabriquées et clairement étiquetées, jamais confondues avec une
vraie inférence. »* Aucune logique, un simple `<p className="settings-hint">`.

### 3.2 Étiquetage (non négociable — l'invariant d'honnêteté)

Toute proposition de source `"mock"` porte, **visible sur chaque proposition**, un **bandeau**
sans ambiguïté :

```ts
export const MOCK_DEMO_LABEL =
  "MOCK · démo hors-ligne — proposition fabriquée, pas une vraie inférence";
```

- Un élément dédié dans la bulle de proposition (ex. `<div className="mock-demo-banner">`), **au-
  dessus** de l'`intro`, portant `MOCK_DEMO_LABEL`.
- La ligne `who` (`CopiloteShell.tsx:230`) remplace le laconique « LLM mocké » par le libellé
  explicite (le même registre que le bandeau).
- Le badge d'ouverture/clôture de Fëanor (posé par l'UI, §2.4 de `feanor-copilote-du-gui.md`)
  **reste** autour de la proposition démo — le mode démo **est** Fëanor hors-ligne, étiqueté ; ce
  n'est pas de la ventriloquie (le contenu mock est réellement produit par le copilote).

---

## 4. UI `CopiloteShell` (impact ciblé)

### 4.1 Rendu de l'**aveu** (`proposition === null`) — miroir de `FeanorHead`

Aujourd'hui `CopiloteShell` reçoit **toujours** une `Proposition` non-null. Il faut gérer le `null` :

- Nouvel état : `proposition` peut être `null` **avec** un `reason` (l'aveu) après `handlePropose`.
- Rendu **calqué sur `FeanorHead:396-401`** : bloc encadré du badge d'ouverture/clôture (si
  identité), texte `COPILOTE_NO_PROPOSAL_PREFIX + " — " + reason`, **sans** artefacts, **sans** diff,
  **sans** boutons Valider/Rejeter (il n'y a rien à matérialiser). Nouvelle constante :

  ```ts
  export const COPILOTE_NO_PROPOSAL_PREFIX = "Le copilote n'a pas proposé d'artefact";
  ```

- `handlePropose` distingue trois retours : `source === "live"` (bulle live inchangée),
  `source === "mock"` (bulle + bandeau démo §3.2), `proposition === null` (aveu ci-dessus).

### 4.2 Copie mensongère à corriger (le défaut « mocké par défaut » disparaît)

- `shell-note` au repos / après validation / après rejet (`CopiloteShell.tsx:266-287`) affirme « le
  copilote est **mocké** (déterministe, sans réseau) ; le runner d'authoring réel est **différé** ».
  **Faux** désormais : réécrire pour refléter le défaut **honnête** (le copilote infère avec le
  modèle réglé, ou **avoue** ; le mode démo `mock` est explicite et étiqueté).
- Le bandeau du sélecteur de runner « runner d'authoring · build-time · **LLM mocké** »
  (`:190`) et les options `AUTHORING_RUNNERS` (`mock/copilote.ts:30-34`) affirment « mocké » en
  dur. Ce sélecteur **ne pilote pas** le résolveur (`runner` n'est pas lu par `resolveProposition`)
  — il est **décoratif/legacy**. MVP : **relibeller** pour ne plus prétendre « mocké par défaut »
  (simple copie). Refonte/suppression du sélecteur = **hors périmètre**.

### 4.3 Ce qui NE bouge PAS

- `handleValidate` / `onApply` : la matérialisation reste portée par l'atelier via le chemin
  d'insertion réel. **Aucune régression du `+` du rail.**
- Le chemin **live** (succès) : `intro`/`artefacts`/`ops` du modèle, `diff`/`model`/`hint`/`diffFile`
  recalculés par notre code. Inchangé.
- L'identité dérivée du canon, le badge ouverture/clôture, l'activation explicite (aucun appel LLM
  au montage). Inchangés.

---

## 5. Périmètre exact des fichiers

**Modifiés**
- `src/forge/llm/resolve.ts` — `ResolveResult.proposition: Proposition | null` ; `PropositionSource`
  `+ "none"` ; détection valeur réservée `mock` (cas 2, **avant** le test provider) ; cas 1/3/4/5 →
  aveu (`null` + `reason`) ; export `MOCK_DEMO_LABEL` ; reformulage `FALLBACK_*` (§2.3).
- `src/forge/CopiloteShell.tsx` — gestion du `null` (aveu §4.1), bandeau démo (§3.2), correction de
  la copie « mocké » (§4.2), export `COPILOTE_NO_PROPOSAL_PREFIX`.
- `src/components/SettingsRoot.tsx` — **une** ligne d'aide « saisissez `mock` pour le mode démo »
  (§3.1). Aucune logique, aucune nouvelle clé.
- CSS (`src/**/*.css` de la surface copilote) — classe `mock-demo-banner` (bandeau étiqueté).
- Tests : `src/forge/llm/resolve.test.ts` (réécriture des CA2-CA5 : aveu au lieu de mock ; nouveau
  CA « mode démo `mock` → proposition étiquetée » ; nouveau CA « modèle vide → aveu ») ;
  `CopiloteShell` test (rendu de l'aveu, présence du bandeau démo, absence de Valider sur aveu) ;
  ajustement des tests `advise`/`elementProposition`/`FeanorHead` qui assertent les `FALLBACK_*`.

**Interdits de modification (frontière — inchangés)**
- `src/forge/mock/copilote.ts` — `propose()` **reste pur et déterministe** (au plus : export de la
  constante `MOCK_DEMO_LABEL` si on préfère la loger là plutôt que dans `resolve.ts`). Aucun réseau.
- `src/forge/llm/advise.ts` / `elementProposition.ts` — le **patron** honnête, référence ; on n'y
  touche QUE si le reformulage `FALLBACK_*` l'exige côté tests (les constantes vivent dans
  `resolve.ts`, donc aucun changement de source ici).
- `@iakaframe/core` (`LlmTransport`, `parseLiveProposition`), **Rust**, `settings.rs`, le runner
  d'**exécution** du Binding : **zéro** modification.

---

## 6. Invariants (tenus toute la session)

- **H-1 — Honnêteté (non négociable).** Aucune proposition fabriquée présentée comme réelle. Hors
  mode démo opt-in, l'échec d'inférence → **aveu** (`null` + `reason`).
- **H-2 — Mock toujours étiqueté.** Quand `source === "mock"`, `MOCK_DEMO_LABEL` est visible sur
  **chaque** proposition (bandeau + ligne `who`).
- **H-3 — Alignement sur le socle.** Le mapping des cas est **identique** à `resolveAdvice`/
  `resolveElementProposition` (mêmes bornes, mêmes `reason`), au mode démo près.
- **H-4 — Frontière d'insertion intacte.** `onApply` / le `+` du rail / la matérialisation par
  l'atelier : inchangés. Toute `op` (live ou démo) a `target ∈ MaterializeTarget`.
- **H-5 — Déterminisme du test préservé.** Le mock reste injectable (`deps.mock`) ; `propose()`
  reste pur. Seul son **déclenchement runtime** devient opt-in.
- **H-6 — Activation explicite.** Aucun appel LLM au montage (déjà vrai, à ne pas casser).

---

## 7. Critères d'acceptation (TESTABLES, sans réseau)

1. **Modèle vide → aveu** : `model = ""` ⇒ `{ proposition: null, source: "none",
   reason: NO_AUTHORING_MODEL_HINT }` ; le transport n'est **jamais** appelé.
2. **Provider non supporté → aveu** : `model = "litellm:gpt-4o"` ⇒ `{ null, "none",
   FALLBACK_UNSUPPORTED }` ; `llm.calls` vide.
3. **Réseau KO → aveu, sans stack** : `fakeLlm(new Error("… stacktrace …"))` ⇒ `{ null, "none",
   FALLBACK_UNAVAILABLE }` ; `reason` ne contient pas « stacktrace » ; **aucune** exception remonte.
4. **Illisible → aveu** : `fakeLlm("{pas du json")` ⇒ `{ null, "none", FALLBACK_UNREADABLE }`.
5. **Mode démo opt-in → proposition étiquetée** : `model = "mock"` ⇒ `{ propose(intention,context),
   "mock", MOCK_DEMO_LABEL }` ; la proposition **égale** `propose(intention, context)` (déterminisme) ;
   le transport n'est **jamais** appelé.
6. **Live nominal inchangé** : `fakeLlm(<json valide>)` + `model = "ollama:…"` ⇒ Proposition
   **live** ; `diff === buildDiff(ops, context)` ; `source === "live"`.
7. **UI — aveu** : `CopiloteShell` avec un résolveur rendant `null` affiche `COPILOTE_NO_PROPOSAL_
   PREFIX` + `reason`, **sans** bouton « Valider » ni diff, encadré des badges d'ouverture/clôture.
8. **UI — démo étiquetée** : une proposition `source === "mock"` affiche le bandeau
   `mock-demo-banner` portant `MOCK_DEMO_LABEL` ; la ligne `who` ne dit plus un laconique « mocké »
   sans l'étiquette.
9. **Frontière Binding** : toute `op` (live ou démo) a `target ∈ MaterializeTarget` ; aucune op de
   runner d'exécution. `onApply` inchangé (test de non-régression du chemin d'insertion).
10. **Gate Legolas** : `lint:all` = 0, `test:all` = 0 (compte **non diminué**), build OK, **sans
    aucun accès réseau** en CI.

---

## 8. Amendement de `copilote-inference-live.md` (ce qu'il faut réécrire)

> Cette instruction **révise** `copilote-inference-live.md` sur le seul point du **repli**. Le reste
> (transport injectable §3.1, où vit l'appel réseau §3.2, provider MVP §3.3, sortie structurée +
> parsing défensif §3.4, faits web §7) **reste valable et n'est pas redéfini**.

À amender **dans** `copilote-inference-live.md` (fait par Gandalf, cf. § relais) :

- **§3.5 « Résolveur + repli »** — remplacer la logique « repli = **mock** `propose()` » par
  « repli = **aveu** (`null` + `reason`) ; le mock devient le **cas 2 opt-in étiqueté** ». Renvoyer
  vers la présente instruction pour le mapping complet (§2.2 ici).
- **§3.6 « UI CopiloteShell »** — la ligne « `LLM mocké (repli)` + raison quand c'est un fallback »
  devient « **aveu** (aucune proposition) + raison ; `MOCK · démo` uniquement en mode opt-in ».
- **§6 CA2/CA3/CA4/CA5** — ces critères assertent « repli mock (== `propose`) » ; ils sont
  **remplacés** par les CA1-CA5 de la présente instruction (aveu + démo opt-in). CA1 (live), CA6
  (déterminisme du mock **injecté**), CA7 (frontière) restent valides.
- **§8 Hors-périmètre** — inchangé.

---

## 9. Verdict cross-repo

**GUI-only.** Le pivot vit **entièrement** dans `src/forge/` (+ `SettingsRoot.tsx` + un CSS + les
tests). **Aucune** touche à `@iakaframe/core`, **aucune** commande/kit/catalogue du cœur, **aucun**
Rust, **aucune** clé `settings.rs` (reco valeur réservée `authoringModel`). Le golden kit CLI↔cœur
n'est pas concerné → **`vendor-check` drift 0** (attendu, à confirmer au gate Legolas). Aucune action
côté dépôt `iakaframe`.

---

## 10. Estimation (au jalon P1→P2)

| Poste | j-h | Risque / incertitude |
|---|---|---|
| `resolve.ts` : `proposition` nullable + `"none"` + démo opt-in + mapping + `FALLBACK_*` reformulés | 0,4 | faible |
| `CopiloteShell.tsx` : rendu de l'aveu (miroir `FeanorHead`) + bandeau démo + correction copie | 0,4 | faible-moyen (copie legacy du sélecteur runner) |
| `SettingsRoot.tsx` (1 ligne d'aide) + CSS `mock-demo-banner` | 0,1 | faible |
| Tests : `resolve.test.ts` réécrit + `CopiloteShell` (aveu/démo) + ripple `FALLBACK_*` sur advise/element/FeanorHead | 0,4 | moyen (ampleur du ripple des assertions de chaînes) |
| **Total** | **~1,3 j-h** | **faible-moyen** |

- **Complexité** : faible — c'est un **alignement** sur un patron déjà prouvé (`advise.ts`), pas une
  invention. Aucune I/O neuve, aucun backend.
- **Inconnues** (peuvent faire glisser) : (a) **ampleur du ripple** des assertions `FALLBACK_*` dans
  les tests de Fëanor (advise/elementProposition/FeanorHead) — à mesurer d'abord ; (b) la **copie
  legacy** du sélecteur de runner d'authoring (`AUTHORING_RUNNERS`, bandeau « LLM mocké ») : si le
  décideur veut le **retirer** plutôt que le relibeller, c'est un petit lot en plus (hors ce MVP).
- **Ce n'est pas un engagement ferme** : ordre de grandeur assumé et révisable, rappelé et confronté
  au temps réel à la clôture du lot.

---

## 11. Points que SEUL le décideur tranche

- **D1 — Mécanisme d'opt-in** : valeur réservée `authoringModel = "mock"` (reco, MVP) **vs** toggle
  dédié « mode démo hors-ligne » (`settings.rs` + façade + Rust). *Reco : valeur réservée.*
- **D2 — Sort du sélecteur de runner d'authoring** (`AUTHORING_RUNNERS`, décoratif) : **relibeller**
  (reco MVP) **vs** le **retirer** (petit lot distinct). *Reco : relibeller au MVP.*

---

## 12. Hors-périmètre (MVP)

- Refonte ou suppression du sélecteur `AUTHORING_RUNNERS` (au-delà d'un relibellage de copie).
- Toggle Settings dédié (`authoringDemoMock`) + surface Rust — seulement si D1 bascule.
- Toute évolution du schéma JSON de sortie, du chemin d'insertion réel, du binding, du runner
  d'exécution : **intouchés**.
- Streaming / retry / cache : hors sujet (déjà hors MVP côté copilote).

---

## 13. Jalon (P1→P2)

À poser via `iakaframe jalon` (titre FIGlet `Standard` + tableau émetteur/contenu/récepteur) au
moment de la validation. **Émetteur** : 🔵 Gandalf (cadrage) — contenu : la présente instruction
`specs/instructions/copilote-honnete-mock-opt-in.md` **+ son estimation** (§10) + l'amendement de
`copilote-inference-live.md` (§8) + les points D1/D2 (§11). **Récepteur** : **le décideur
(Stéphane)** — ce gate est **humain**. Sur « JALON VALIDÉ », l'exécution (⚒️ Gimli) démarre, MVP
d'abord, commits atomiques, gate Legolas (dont `vendor-check` drift 0) avant clôture.
