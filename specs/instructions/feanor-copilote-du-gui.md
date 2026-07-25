# Instruction — Le copilote d'authoring du GUI **est Fëanor** (identité dérivée du canon)

> Cadrage P1, **2026-07-26**, sur décision explicite du décideur : *« le LLM interne au GUI est le
> persona Fëanor »*. **Rédigé par 🟡 Odin** — le cadrage revient normalement à 🔵 Gandalf ; il est
> porté ici sans délégation, et c'est dit plutôt que masqué.
> **Lecture seule sur le code pendant le cadrage** ; ce fichier est le seul artefact produit.
>
> **Doctrine non négociable : GUI ← frame.** La persona est **dérivée du canon**, jamais réécrite.
>
> ✅ **Arbitrages du décideur — rendus le 2026-07-26 (« reco »), fermés** :
> 1. **Persona dérivée du canon à l'exécution** (`library/personas/feanor.md` de la racine
>    bibliothèque active), **pas** de prompt système réécrit en dur.
> 2. **Activation explicite** = *ouvrir la console du copilote **et** soumettre une intention*.
>    Ce geste utilisateur **est** la demande explicite exigée par l'invariant canon.
>
> **Tous les constats du § 0 ont été mesurés sur le disque le 2026-07-26** — `preuve-avant-declaration`.

---

## 0. État de référence — mesuré, pas présumé

### 0.1 Le copilote est **anonyme**

| Symbole / surface | Ce qu'il dit aujourd'hui |
|---|---|
| `buildSystemPrompt()` (`src/forge/llm/prompt.ts`) | *« Tu es le copilote d'AUTHORING de la forge iakaframe (build-time). »* — chaîne **en dur**, aucune identité |
| `CopiloteShell.tsx` | *« Copilote d'authoring · {subject} »*, *« Copilote de forge · proposition »*, *« Vous · au copilote »* |
| Réponse du modèle | JSON `{intro, artefacts, ops}` — **aucun badge**, aucune identité |

`Fëanor` n'existe dans le GUI **qu'en deux endroits**, et jamais comme identité du copilote :
`roster.ts` (`frame: "Fëanor"`) et `casting.ts` (9ᵉ dégradé, flamme/braise `#c2410c`/`#7c2d12`).

### 0.2 Ce que le canon dit déjà — la décision **ferme** une relation à moitié écrite

`iakaframe/specs/instructions/role-frame-builder.md` (amendé 2026-07-24) : *« Fëanor est un résident
d'iakaFrameGUI »*, et son **« véhicule reste le LLM interrogeable dont le modèle est défini dans les
Settings d'iakaFrameGUI »**. Le décideur lit la relation dans l'autre sens : le LLM du GUI n'est pas
*au service de* Fëanor — il **est** Fëanor.

La fiche canon `library/personas/feanor.md` porte déjà tout ce qu'il faut pour dériver l'identité :

```
id: feanor · name: Fëanor · roleKey: frame · royaume: FRAME · pastille: "🟠"
skills: [iakaframe-frame] · guardrails: [identity, perimeter]
description: « … À déclencher UNIQUEMENT sur demande explicite de l'utilisateur (CLI, terminal ou
iakaFrameGUI) … Fëanor n'est JAMAIS spawné par le dispatch automatique d'équipe … ne touche jamais
l'infrastructure du réservoir (code CLI/GUI). »
```

### 0.3 L'invariant d'activation explicite est **déjà tenu par construction**

Mesuré : `resolveProposition` n'est appelé **que** depuis le handler de soumission de
`CopiloteShell.tsx`. Les deux `useEffect` du composant ne lisent que le modèle configuré et
l'endpoint — **aucun appel LLM au montage**. Le lot n'a donc pas à *créer* cette garantie : il doit
la **verrouiller par un test** avant qu'un futur lot ne l'entame sans s'en apercevoir.

---

## 1. Ce que la décision change

Le copilote cesse d'être un **outil anonyme** pour devenir un **membre identifié de l'équipe**, avec
les trois attributs que cela implique dans la méthode : **identité** (badge), **périmètre étanche**
(frontières), **activation explicite**.

**Gain non trivial** : Fëanor porte une frontière que le copilote anonyme n'a pas — *CONTENU de
frame* **vs** *INFRASTRUCTURE de réservoir* (N1 : il n'écrit jamais le code CLI/cœur/forge, ni la
frame `default`). L'inscrire dans le prompt système **durcit** la garde, il ne la relâche pas.

---

## 2. Conception retenue

### 2.1 Dérivation de l'identité (arbitrage 1)

`buildSystemPrompt()` devient **pur et injecté** — même moule que `KitGenOptions.binding?` (P7) et
`KitGenOptions.workflow` (P6b), déjà éprouvé deux fois dans ce dépôt :

```
buildSystemPrompt(persona?: Persona) → string
```

- **Avec** persona → identité + périmètre **dérivés de la fiche**, puis les contraintes techniques
  du copilote (schéma JSON imposé, ids du pool, frontière authoring ≠ exécution) **inchangées**.
- **Sans** persona → le prompt **anonyme actuel, byte-identique** (non-régression, invariant B-2).

La fiche est lue depuis la **racine bibliothèque active**, via le chemin déjà emprunté par
`loadFrame` (`poolReadAll("personas")`) — **aucun I/O neuf**, aucune duplication de la persona.

### 2.2 Repli — jamais d'identité inventée

Racine introuvable, `feanor.md` absent ou illisible → le copilote **le dit** (message utilisateur
explicite) et retombe sur le prompt anonyme. **Il n'invente jamais une identité Fëanor de
substitution** : une persona approximative serait une ventriloquie, et la dérive serait invisible.

### 2.3 Le badge — posé par l'UI, jamais demandé au modèle

Le canon exige le badge `🟠 [FRAME][Fëanor]` en première ligne de toute réponse à l'utilisateur.
Or le copilote répond en **JSON structuré** (`format:<schema>` Ollama). **Le schéma ne bouge pas** :

- l'**UI** rend le badge d'**ouverture** avant l'`intro`, et la **clôture** après le bloc de
  proposition — la position de la pastille portant le sens, comme partout dans la méthode ;
- le **modèle** ne produit aucun badge : on ne lui demande pas de se signer.

Ce n'est **pas** de la ventriloquie : l'UI identifie un contenu **réellement produit** par Fëanor,
elle ne lui fait pas dire des mots qu'il n'a pas produits.

### 2.4 Le mock porte la même identité

Le copilote a un chemin **mock** (offline-first) et un chemin **live**. Les deux doivent porter
l'identité, sinon Fëanor **clignote** selon la disponibilité du réseau — un défaut d'identité pire
que l'absence d'identité.

---

## 3. Périmètre — ce qui bouge

| # | Fichier / symbole | Ce qui bouge |
|---|---|---|
| 1 | `src/forge/llm/prompt.ts` — `buildSystemPrompt` | signature `(persona?)`, bloc identité + périmètre dérivé ; **sans persona = sortie byte-identique** |
| 2 | `src/forge/llm/resolve.ts` — `resolveProposition` | charge la fiche (chemin `loadFrame` existant), l'injecte ; repli explicite si absente |
| 3 | `src/forge/CopiloteShell.tsx` | libellés « Copilote d'authoring » → identité Fëanor ; **badge d'ouverture/clôture** autour de la proposition ; message de repli |
| 4 | `src/forge/mock/copilote.ts` | l'identité vaut aussi hors ligne (§ 2.4) |
| 5 | `packages/core/src/persona.ts` | **mesuré le 2026-07-26** : `Persona` porte `royaume` et le cœur expose déjà `personaBadge(p)` → `[ROYAUME][Nom]`. **Manque le seul champ `pastille`** (`"🟠"` au frontmatter canon, non parsé) : l'ajouter — **une ligne d'interface + une ligne de parseur défensif**, pas un chantier |
| 6 | tests | golden du prompt dérivé, non-régression sans persona, repli, garde d'activation explicite, badge |

**Aucun changement Rust. Aucun credential. Le schéma de sortie JSON reste intact.**

---

## 4. Invariants

- **I-1 — GUI ← frame.** La persona est **dérivée**, jamais recopiée. Une identité réécrite en dur
  dériverait du canon en silence : c'est la classe de défaut du **contrat fantôme** (v0.3.10),
  cohérente et invisible aux tests.
- **I-2 — Activation explicite.** Aucun appel LLM sans geste utilisateur. Déjà vrai (§ 0.3) : à
  **verrouiller par un test**, pas à construire.
- **I-3 — Authoring ≠ exécution.** Fëanor ne nomme aucun runner/modèle/binding d'**exécution**.
  Contrainte **existante**, à conserver mot pour mot.
- **I-4 — Le copilote n'écrit rien lui-même.** « Valider » reste un geste **humain** ; la
  matérialisation reste portée par l'atelier.
- **I-5 — Pas de ventriloquie.** Le badge n'habille que du contenu réellement produit par Fëanor.
- **I-6 — Contrat de sortie inchangé.** `{intro, artefacts, ops}` et le `format:<schema>` ne bougent pas.

---

## 5. Critères d'acceptation

- **AC-1** — `buildSystemPrompt()` **sans** persona rend **exactement** la chaîne actuelle
  (comparaison byte-à-byte en test) : la non-régression est prouvée, pas affirmée.
- **AC-2** — `buildSystemPrompt(feanor)` contient le `name`, la `description` et le périmètre issus
  de la fiche **canon vendorée**, vérifiés par **golden** — un `feanor.md` modifié fait **rougir** le test.
- **AC-3** — Racine introuvable / fiche absente → message utilisateur explicite **et** repli anonyme ;
  **aucune** chaîne « Fëanor » fabriquée côté code.
- **AC-4** — Aucun `llm.complete` n'est émis au montage du `CopiloteShell` (test explicite).
- **AC-5** — Le badge d'**ouverture** précède l'`intro` et la **clôture** suit le bloc ; le **JSON
  demandé au modèle est inchangé** (le badge n'y figure pas).
- **AC-6** — Mock et live portent **la même** identité (§ 2.4).
- **AC-7** — `npm run lint:all` et `npm run test:all` rendent `0`, **cités avec leur sortie** au
  format de verdict contraint. Compte de tests **non diminué**.

---

## 6. Risques

| # | Risque | Parade |
|---|---|---|
| R1 | Identité réécrite en dur → dérive silencieuse du canon | I-1 + golden AC-2 |
| R2 | Fiche canon **longue** → prompt système volumineux (coût/contexte) | **mesurer** la taille du prompt dérivé ; si excessif, borner à `description` + périmètre, **jamais** en paraphrasant |
| R3 | La fiche dépend de la **frame active** — non encore sélectionnable (§ 2.1 de `frame-reservoir-et-9e-role-portage-gui.md`) | repli AC-3 ; le lot « sélecteur de frame active » lèvera la dépendance |
| R4 | Identité clignotante live/mock | § 2.4 + AC-6 |

---

## 7. Hors périmètre

- Le **sélecteur de frame active** (lot distinct, décision à deux dépôts).
- Le **3ᵉ sens de « réservoir »** (stock de propositions de l'onglet Apprentissage).
- Toute évolution du **schéma JSON** de sortie, du binding, ou du chemin d'exécution.
- Le déploiement d'une 9ᵉ persona dans `~/.claude/agents/` : **signalé, jamais écrit** par un agent.

---

## 8. Estimation

| Poste | j-h | Incertitude |
|---|---|---|
| `buildSystemPrompt` injecté + dérivation + golden | 0,4 | faible |
| Chargement de la fiche + repli (`resolve.ts`) | 0,3 | faible |
| UI : identité, badge ouverture/clôture, message de repli | 0,3 | faible |
| Mock aligné + gardes (activation explicite, non-régression) | 0,3 | faible |
| **Total** | **~1,3 j-h** | **faible** |
