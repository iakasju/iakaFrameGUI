# Instruction — Pointeur de **frame active** dans `iakaframe.json` du projet (sélecteur de forge)

> Cadrage P1, **2026-07-26**, sur arbitrage explicite du décideur : *« le pointeur de frame active va
> dans `iakaframe.json` du projet »*, complété par *« le projet = un dossier réglé dans les
> Settings »*. **Rédigé par 🟡 Odin** (le cadrage revient normalement à 🔵 Gandalf — dit, pas masqué).
> **Lecture seule sur le code pendant le cadrage.**
>
> Lève le blocage de `frame-reservoir-et-9e-role-portage-gui.md` § 2.1 (entrée 19 du canon) :
> *« le pointeur doit être une source unique lisible par le CLI ET par la GUI »*.
>
> **Tous les constats du § 0 ont été mesurés sur le disque le 2026-07-26** — `preuve-avant-declaration`.

---

## 0. État de référence — mesuré

### 0.1 Le fait qui débloque tout : `iakaframe config` **fusionne**

```js
let cfg = {};
if (fs.existsSync(cfgPath)) { try { cfg = JSON.parse(...) } catch { /* repart a vide */ } }
cfg.runner = runner; cfg.node = node; cfg.target = ...; cfg.note = ...;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
```

Le CLI **relit l'existant** et ne touche que ses propres clés. **Une clé posée par la GUI survit à un
`iakaframe config`.** La co-écriture CLI ↔ GUI est donc sûre — c'est ce qui rend l'arbitrage du
décideur réalisable sans modifier le CLI.

> ⚠️ **Une seule faille** : `catch { /* repart a vide */ }`. Si le JSON devient illisible, le CLI
> **repart d'un objet vide** et la clé de frame active est **perdue en silence**. À signaler au dépôt
> canon (§ 5, R1) — pas à corriger ici.

### 0.2 Structure réelle du fichier

`{ runner, node, target, note }` (+ `aiderModel` optionnel). Exemple réel (`~/work/iakaIDE`) :
`{"runner":"ps","target":"claude","note":"..."}`.

### 0.3 Côté GUI, `<projet>/iakaframe.json` est **totalement inconnu**

Mesuré : les seules occurrences dans le Rust sont un **faux positif** — `teams/iakaframe.json` est un
fichier de *team* nommé `iakaframe`, sans rapport avec la conf projet. **Tout est à construire.**

### 0.4 Le pivot d'assemblage est déjà multi-frame, mais **non pilotable**

`resolveAssembly` (cœur) choisit `frames.find(f => f.default) ?? frames[0]`. La capacité multi existe
(AR-1) ; **rien ne permet de désigner une autre frame**. C'est exactement le trou à combler.

### 0.5 Le motif de réglage est établi et répétable

`settings.rs` expose `read_string_key`/`write_string_key` (**fusion non destructive**, valeur vide =
retrait de la clé), puis 2 commandes Tauri par réglage, l'allow-list de `lib.rs`, et la façade unique
`src/api/backend.ts`. Trois réglages le suivent déjà : `iakaframeHome`, `authoringModel`,
`authoringEndpoint`. **Le lot calque, il n'invente pas.**

---

## 1. Conception retenue

### 1.1 Deux niveaux, à ne pas confondre

| Niveau | Où | Quoi |
|---|---|---|
| **Où est le projet** | `<workspace>/settings.json`, clé `projectDir` | réglage **de la forge** (comme `iakaframeHome`) |
| **Quelle frame est active** | `<projectDir>/iakaframe.json`, clé `frame` | **propriété du lieu**, partagée avec le CLI |

Le premier est un confort d'outil ; le second est la **donnée partagée**. Les mélanger ferait du
pointeur un état de la GUI — précisément ce que le canon refuse (« pas d'état global mutable »).

### 1.2 Nom de la clé — **`frame`** (reco, à confirmer côté canon)

Dans un fichier déjà nommé `iakaframe.json`, à côté de `runner`/`node`/`target`, la clé `frame`
portant l'**id de la frame active** est la plus lisible. Le canon parle d'un pointeur nommé
`iakaframeactive` sans en fixer le support ; **le nom de clé est à confirmer au dépôt `iakaframe`
avant que le CLI ne la lise** (§ 5, R2). Tant qu'il ne la lit pas, aucun risque de divergence.

### 1.3 Résolution — injection optionnelle, même moule que P7/P6b/Fëanor

```
buildFrame(raw, activeFrameId?)  →  resolveAssembly(..., activeFrameId?)
active = frames.find(f => f.id === activeFrameId)   // pointeur
      ?? frames.find(f => f.default)                // défaut du réservoir
      ?? frames[0] ?? null                          // repli legacy
```

**Sans pointeur, le comportement est celui d'aujourd'hui, à l'identique** — non-régression prouvée
par test, pas affirmée. Un pointeur qui désigne une frame **absente** retombe sur le défaut **et le
dit** (jamais un écran silencieusement faux).

### 1.4 Écriture — incluse, et non destructive

Le canon autorisait à différer l'écriture ; l'arbitrage (« le pointeur **va dans** `iakaframe.json` »)
la rend attendue. Elle applique le **même contrat que le CLI** : relire, ne modifier que la clé
`frame`, réécrire. **Jamais de réécriture complète du fichier** — les clés du CLI sont intouchables.

---

## 2. Périmètre

| # | Fichier / symbole | Ce qui bouge |
|---|---|---|
| 1 | `src-tauri/src/settings.rs` | réglage `projectDir` : `project_dir` / `set_project_dir` (calque de `iakaframe_home`) |
| 2 | `src-tauri/src/project_conf.rs` **(neuf)** | lire/écrire la clé `frame` de `<projectDir>/iakaframe.json`, **fusion non destructive**, défensif (fichier absent/illisible → `None`) |
| 3 | `src-tauri/src/lib.rs` | allow-list des nouvelles commandes |
| 4 | `packages/core/src/frame.ts` | `buildFrame`/`resolveAssembly` : paramètre `activeFrameId?` **optionnel** |
| 5 | `src/api/backend.ts` | façade unique : `projectDir`/`setProjectDir`, `activeFrameId`/`setActiveFrameId` |
| 6 | `src/forge/frame.ts` — `loadFrame` | lit le pointeur et le passe à `buildFrame` |
| 7 | `src/components/SettingsRoot.tsx` | champ « dossier de projet » |
| 8 | `src/forge/` — sélecteur | liste des frames + frame active + bascule |
| 9 | tests | non-régression sans pointeur, pointeur valide, pointeur mort, fusion non destructive, Rust |

---

## 3. Invariants

- **I-1 — Source unique CLI/GUI.** Le pointeur vit dans `iakaframe.json`, lisible des deux côtés.
  Aucun miroir dans `settings.json` : deux copies divergeraient sans qu'aucune garde ne le voie.
- **I-2 — Écriture non destructive.** On ne réécrit jamais le fichier entier : `runner`/`node`/
  `target`/`note`/`aiderModel` sont **la propriété du CLI**.
- **I-3 — Sans pointeur = comportement actuel**, à l'identique.
- **I-4 — Un pointeur mort ne ment pas.** Frame introuvable → repli sur le défaut **et message**.
- **I-5 — Le pointeur est propriété du lieu**, pas un état de la GUI.

---

## 3bis. ✅ LIVRÉ le 2026-07-26 — état d'exécution

> Merge `--no-ff` de `feat/pointeur-frame-active` (`26b4855`). **Gate : `lint:all` exit `0` ;
> `test:all` exit `0`, `Test Files 60 passed (60) / Tests 546 passed (546)` ; `cargo test`
> **`83 passed`** (+8).**

| AC | État | Preuve |
|---|---|---|
| AC-1 | ✅ | assemblage comparé avec `null` **et** `undefined` : strictement identique |
| AC-2 | ✅ | pointeur → method/team/binding pivotent ; **prime sur `default`** |
| AC-3 | ✅ | repli sur `default` + `activeFrameIsDangling` + alerte UI |
| AC-4 | ✅ | test Rust : `runner`/`node`/`target`/`note` intacts après écriture |
| AC-5 | ✅ | fichier absent, clé vide, JSON illisible, projet inexistant, backend sans commande |
| AC-6 | ✅ | voir gate ci-dessus — **`cargo test` mesuré**, le lot touchant le Rust |

**Écarts et décisions d'exécution :**

- **`Frame` expose désormais `frames`.** Manque révélé en écrivant le test : `assembly.frame` ne dit
  que la frame **active**, or **choisir** suppose de **lister**. Sans ça, le sélecteur n'aurait rien
  eu à afficher.
- **Refus d'écrire sur un `iakaframe.json` illisible** (plutôt que d'écraser). Va plus loin que le
  cadrage : c'est la réponse côté GUI au R1 — là où le CLI « repart à vide », la forge s'abstient.
- **Deux défauts attrapés à l'exécution** : `openFrame` ne relisait pas le pointeur (l'alerte de
  pointeur mort ne se serait **jamais** affichée sur ce chemin) ; et la bascule **recharge depuis le
  disque** au lieu d'un état local optimiste qui aurait menti si l'écriture avait échoué.

---

## 4. Critères d'acceptation

- **AC-1** — `buildFrame(raw)` **sans** `activeFrameId` rend **exactement** l'assemblage actuel (test).
- **AC-2** — Avec un `activeFrameId` valide, le pivot est **cette** frame (method/team/binding appariés).
- **AC-3** — `activeFrameId` inconnu → repli sur `default`, **signalé** à l'utilisateur.
- **AC-4** — Écrire le pointeur **préserve** `runner`/`node`/`target`/`note` : round-trip prouvé sur
  un `iakaframe.json` réaliste (test Rust).
- **AC-5** — `projectDir` absent / `iakaframe.json` absent / JSON illisible → **aucune exception**,
  état neutre + message.
- **AC-6** — `npm run lint:all` et `npm run test:all` rendent `0`, cités avec leur sortie ;
  `cargo test` **mesuré** (le lot touche le Rust) ; compte de tests non diminué.

---

## 5. Risques

| # | Risque | Parade |
|---|---|---|
| R1 | `iakaframe config` **repart à vide** sur un JSON illisible → pointeur perdu en silence | **signalé au dépôt canon** ; côté GUI, ne jamais produire de JSON invalide (écriture atomique, § 1.4) |
| R2 | Nom de clé non confirmé côté canon | **`frame` proposé** ; tant que le CLI ne la lit pas, aucune divergence possible. À trancher avant que le CLI ne s'y branche |
| R3 | L'utilisateur règle un `projectDir` sans `iakaframe.json` | AC-5 : état neutre + message, jamais de fichier créé à son insu |
| R4 | Deux sources de vérité si un jour on cache le pointeur dans `settings.json` | I-1, gravé |

---

## 6. Hors périmètre

- **Modifier le CLI** (lecture de la clé, correctif du `catch` de R1) : **dépôt `iakaframe`**.
- Le pointeur **portefeuille** (`~/work`) comme fallback hérité : second temps, une fois la clé
  confirmée au canon.
- Création/édition de descripteurs de frames (`frame new`, édition du `.md`) : chantier séparé.

---

## 7. Estimation

| Poste | j-h | Incertitude |
|---|---|---|
| Rust : réglage `projectDir` + lecture/écriture fusionnée + tests | 0,5 | faible |
| Cœur : `activeFrameId?` dans `buildFrame`/`resolveAssembly` + tests | 0,3 | faible |
| Façade + `loadFrame` | 0,2 | faible |
| UI : champ Settings + sélecteur de frame + messages de repli | 0,5 | moyenne (surface neuve) |
| **Total** | **~1,5 j-h** | **faible à moyenne** |
