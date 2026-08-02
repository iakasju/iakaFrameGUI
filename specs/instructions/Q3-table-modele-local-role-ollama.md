# Instruction — Q-3 : table de suggestion **modèle local ↔ rôle** (nœuds Ollama)

> **Nature** : cadrage d'un arbitrage laissé **ouvert** par `E1-evolution-binding-ar1.md` § 10bis.
> **Cadreur** : l'architecte-cadreur (P1 — Cadrage), **read-only sur le code, aucun code produit**.
> **Date** : 2026-08-01. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de
> code**.
> **Statut** : **PROPOSÉ — en attente d'arbitrage du décideur.**
> **Tranché à ce jour** : le **paramètre matériel** — palier unique **12 Go de VRAM** (2026-08-02,
> § 7). **Toujours ouvertes** : les **six questions Q-3.a → Q-3.f** (§ 6).

---

## 0. Vérification externe (règle du cadrage) — **faite**, et elle change la recommandation

Cette décision dépend d'un **fait externe volatil** : *quels modèles locaux existent réellement,
sous quel tag, à quelle taille*. Vérification web du **2026-08-01** :

| Fait vérifié (2026-08-01) | Source |
|---|---|
| `deepseek-r1` : tags `1.5b, 7b, 8b, 14b, 32b, 70b, 671b` — modèle de raisonnement à chaîne de pensée visible | [ollama.com/library](https://ollama.com/library) |
| `qwen3` : tags `0.6b, 1.7b, 4b, 8b, 14b, 30b, 32b, 235b` | [ollama.com/library](https://ollama.com/library) |
| `gpt-oss` : tags `20b, 120b` | [ollama.com/library](https://ollama.com/library) |
| `qwen3-coder` : `30b` ≈ **19 Go** (MoE, ~3,3 B actifs, contexte 256K) et `480b` ≈ **290 Go** ; `:30b` **pullable en local**, `480b-cloud` sinon | [ollama.com/library/qwen3-coder](https://ollama.com/library/qwen3-coder) |
| `qwen2.5-coder` : tags `0.5b, 1.5b, 3b, 7b, 14b, 32b` — toujours présent, référence des petites VRAM | [ollama.com/library](https://ollama.com/library) |
| `qwen3-vl` : **désormais pullable en local** — `2b` (1,9 Go), `4b` (3,3 Go), `8b` (6,1 Go, `latest`), `30b` (20 Go), `32b` (21 Go), `235b` (143 Go) ; `235b-cloud` en plus | [ollama.com/library/qwen3-vl](https://ollama.com/library/qwen3-vl) |
| Le billet d'annonce Qwen3-VL (oct. 2025) annonçait **cloud seulement**, « local bientôt » — **c'est déjà faux aujourd'hui** | [ollama.com/blog/qwen3-vl](https://ollama.com/blog/qwen3-vl) |
| Repères VRAM/coding largement discutés : `qwen3-coder:30b` pour 24–32 Go ; `qwen2.5-coder:7b` pour 8 Go | [morphllm.com](https://www.morphllm.com/best-ollama-models), [localaimaster.com](https://localaimaster.com/models/best-local-ai-coding-models) |

> ⚠️ **Deux enseignements décisifs, et ils pèsent plus que le contenu de la table :**
> 1. **La donnée périme vite.** En ~9 mois, `qwen3-vl` est passé de *cloud-only* à **six tags
>    locaux** ; `qwen3-coder` a supplanté `qwen2.5-coder` sur les configurations 24 Go+. Une table
>    **compilée dans une release** serait fausse avant la release suivante.
> 2. **Les agrégateurs se contredisent.** Plusieurs pages de classement citent des modèles
>    (`gemma4`, `qwen3-coder-next`, `devstral-small-2`) que la **bibliothèque officielle Ollama ne
>    confirme pas** à cette date. **Seul `ollama.com/library` fait foi ici** ; tout le reste est
>    marqué *à confirmer*.
>
> **→ La vérification externe ne valide pas « figeons la bonne table ». Elle établit que le vrai
> sujet de Q-3 est le FOYER et le CYCLE DE VIE de la table, pas son contenu du jour.**

### 0bis. Seconde passe de vérification (2026-08-02) — tailles réelles **tag par tag**

Le décideur ayant fermé le paramètre matériel (**12 Go de VRAM**, cf. § 7), une **seconde
vérification** a été menée sur les pages `/tags` de la bibliothèque officielle — parce qu'à ce
palier, **le tag n'est plus un détail : c'est le critère d'admission**.

| Modèle | Tailles réelles par tag (source : `ollama.com/library/<m>/tags`, 2026-08-02) |
|---|---|
| `qwen3` | `0.6b` 523 Mo · `1.7b` 1,4 Go · `4b` 2,5 Go · **`8b` 5,2 Go** · **`14b` 9,3 Go** · `30b` 19 Go · `32b` 20 Go · `235b` 142 Go |
| `deepseek-r1` | `1.5b` 1,1 Go · `7b` 4,7 Go · **`8b` 5,2 Go** · **`14b` 9,0 Go** · `32b` 20 Go · `70b` 43 Go · `671b` 404 Go |
| `qwen2.5-coder` | `0.5b` ~0,4 Go · `1.5b` ~1,0 Go · `3b` 1,9 Go · **`7b` 4,7 Go** · **`14b` 9,0 Go** · `32b` 20 Go |
| `qwen3-coder` | **`30b` 19 Go** · `30b-a3b-q8_0` 32 Go · `480b` 290 Go — **9 tags au total, AUCUN sous 15 Go** |
| `qwen3-vl` | `2b` 1,9 Go · `4b` 3,3 Go · **`8b` 6,1 Go** · `30b` 20 Go · `32b` 21 Go · `235b` 143 Go |
| `gpt-oss` | **`20b` 14 Go** · `120b` 65 Go — **le plus petit tag dépasse déjà le palier** |
| `mistral` | **`7b`/`latest` 4,4 Go** · `q8_0` 7,7 Go · `fp16` 14 Go |

> **Ce que cette passe a corrigé dans le cadrage** : deux lignes de la table du § 8 étaient
> **matériellement infaisables** à 12 Go — `qwen3-coder:30b` (19 Go) pour `dev`/`qualite`, et
> `gpt-oss:20b` (14 Go) pour `deploiement`. Elles ont été remplacées (§ 8), et l'écart est
> documenté en § 8bis. **La contrainte matérielle a invalidé la meilleure recommandation
> technique** : c'est exactement le genre de fait qu'un cadrage hors-ligne aurait manqué.

---

## 1. Besoin (reformulé)

Sur un nœud **Ollama**, un kit déployé n'est **exécutable hors Cockpit** que si chaque persona
porte un **modèle**. Aujourd'hui la forge pose `model: ""` pour **toutes** les personas : le
décideur doit **saisir à la main**, en texte libre, autant de noms de modèles qu'il y a de
personas — sans aide, sans validation, sans savoir ce qui est installé sur le nœud.

Q-3 demande : **la forge doit-elle SUGGÉRER un modèle local par rôle**, et **d'où vient cette
suggestion** ?

---

## 2. Faits établis (lecture réelle du code, `chemin:ligne`)

### 2.1 Le comportement actuel — `model: ""`, confirmé

- `defaultBindingForNode(team, node)` — `packages/core/src/binding.ts:178`. Il produit **une
  liaison par persona** avec `runner: defaultRunnerForNode(node)` et **`model: ""`** :
  `binding.ts:187`. Le `tools: []` idem (`:188`).
- `defaultRunnerForNode(node)` — `binding.ts:73` : `claude→claude` ; `codex→chatgpt` (host-isé) ;
  `ollama-lan→ollama-distant` ; défaut (`ollama-localhost`, `openwebui`) `→ollama-local`.
  **Le runner par défaut est livré ; le modèle ne l'est pas.**
- `modelForPersona(...)` — `binding.ts:199` : `""` signifie **aucune émission de modèle**, donc
  « kit pur pour cette persona ». **`""` est le pivot documenté de la rétro-compatibilité**
  (`binding.ts:195-197`). C'est un **défaut sûr**, pas un oubli.

### 2.2 Où l'utilisateur saisit le modèle aujourd'hui

- `src/components/LiaisonPanel.tsx` — étape « Liaison » du flux Déploiement, **entre le choix du
  nœud et le bouton Générer** (`:1-11`), **masquée tant qu'aucun nœud n'est choisi** (`:56`).
- Champ modèle = **`<input>` texte libre**, un par persona : `LiaisonPanel.tsx:123-130`. Le
  `placeholder` porte déjà un exemple **codé en dur** — `"ex. qwen2.5-coder:14b"` (`:127`) : une
  **table implicite d'un seul élément**, déjà périmée au regard du § 0.
- Avertissement **non bloquant** « modèle requis » si vide sur un nœud ≠ `claude` :
  `LiaisonPanel.tsx:100`, `:131-139`, règle `modelRequiredFor` `:22-24`.
- **Le `roleKey` est déjà disponible exactement là où une suggestion devrait atterrir** :
  `LiaisonPanel.tsx:105` affiche `roleLabel(p.roleKey)` ; le tri d'affichage est **par
  `roleIndex`** (`:34-36`). **Aucune donnée nouvelle n'est nécessaire côté UI.**
- Câblage : `src/views/DeployView.tsx:63-70` ; état dans `src/hooks/useForgeDeploy.ts:165-169`
  (`enableBinding` → `defaultBindingForNode`), `:197-206` (`setPersonaModel`).

### 2.3 Le vocabulaire de rôles canon **existe** — il est fermé, stable et déjà l'axe du système

- `packages/core/src/roles.ts:46-56` — **`CANONICAL_ROLES`, 9 rôles**, dans l'ordre `roleIndex`
  0→8 :
  `portefeuille` (0), `coordination` (1), `cadrage` (2), `dev` (3), `qualite` (4),
  `deploiement` (5), `design` (6), `documentation` (7), `frame` (8).
- `CANONICAL_ROLE_KEYS` `roles.ts:59` ; `roleByKey` `:70` ; `roleLabel` `:79` (**tolérant** : une
  clé hors liste retombe sur elle-même — utile pour une méthode tierce).
- `Persona.roleKey` — `packages/core/src/persona.ts:26`, défensif au parse `:90-92`.
- **Précédent qui fait jurisprudence** : la facette portefeuille de G6 identifie la persona
  **par `roleKey === "portefeuille"`** et **jamais par le nom « odin »** —
  `packages/core/src/frame.ts:604`, avec un test dédié prouvant qu'une **persona renommée** est
  quand même reconnue (`packages/core/__tests__/frame.test.ts:168`).
  **→ Clé par rôle : ce n'est pas une préférence, c'est la convention déjà gravée et testée.**

### 2.4 La source pressentie **EXISTE** — mais elle n'est ni au bon endroit, ni à la bonne clé

`cible-ollama-modeles-agents.md` **n'est pas une source fantôme.** Fichier réel :
**`/Users/sjupin/work/iakaframe/specs/instructions/cible-ollama-modeles-agents.md`** — dans le
**dépôt canon `iakaframe`**, **pas** dans `iakaFrameGUI`. Sa table est en `:25-34`.

Elle pose **quatre problèmes** qu'il faut nommer avant de s'en servir :

| # | Problème | Constat |
|---|---|---|
| **S-1** | **Mauvaise clé** | La table est indexée par **nom de persona** (colonne « Agent » : Odin, Aragorn, Gandalf, Gimli, Legolas, Helm, Loki, Nathalie) — `cible-ollama-modeles-agents.md:27-34`. C'est **exactement ce que G6 a proscrit** (§ 2.3). Un renommage de persona casserait la table. La colonne « Rôle » existe (`portefeuille/raisonnement`, `coordination`, `cadrage/raisonnement`, `dev/code`, `qualité/tests`, `prod/ops`, `design/vision`, `guides/rédaction`) mais elle est **descriptive, pas normalisée** sur `CANONICAL_ROLE_KEYS`. |
| **S-2** | **Incomplète — 8 entrées pour 9 rôles** | Le **9ᵉ rôle `frame`** (`roles.ts:55`, `roleIndex` 8, ajouté sans renumérotation) **n'a aucune ligne**. Toute table dérivée telle quelle laisserait ce rôle sans suggestion. |
| **S-3** | **Périmée** | Elle recommande `qwen3`, `deepseek-r1`, `qwen2.5-coder`, `llama3.1`, `qwen2.5-vl`, `mistral`. Au 2026-08-01 : `qwen3-coder:30b` existe et supplante `qwen2.5-coder` sur 24 Go+ ; `qwen2.5vl` est concurrencé par **`qwen3-vl` désormais local** en 6 tags (§ 0). |
| **S-4** | **Hors dépôt** | Elle vit dans `iakaframe`, pas dans `iakaFrameGUI`. **`@iakaframe/core` ne peut pas l'importer.** Toute réutilisation est une **recopie manuelle** — donc une **divergence programmée** entre les deux dépôts. |

> Le document le dit lui-même : *« Les tags exacts (taille/quant) sont laissés au `ollama pull`.
> Tableau à ajuster selon l'état de l'art (le cadrage vérifie le web avant de figer) »*
> (`cible-ollama-modeles-agents.md:36-37`). **Il ne s'est jamais présenté comme une source figée.**

### 2.5 La forge **ne sait pas** ce qui est installé sur le nœud Ollama

- Aucun appel à `/api/tags` nulle part dans `src/` (recherche dépôt : **zéro occurrence**).
- Le backend Rust n'expose **qu'un** wire Ollama : `llm_complete` / `llm_complete_stream` →
  `POST {host}/api/chat`, allow-listé et borné — `src/api/backend.ts:316`, `:346`, `:286`.
  **C'est un wire d'inférence, pas un wire de découverte.**
- L'écran Réglages **assume explicitement** cette lacune : « modèles `/v1/models` — inutile pour
  Ollama (dont les modèles ne s'exposent pas par ce wire ici) » `src/components/SettingsRoot.tsx:302`,
  et **aucun bouton de découverte** pour la source `ollama` — comportement **testé** :
  `src/components/SettingsRoot.test.tsx:242`.
- Le dépôt canon, lui, **sait le faire** : `iakaframe-alternatives.ps1` confronte la table aux
  modèles réellement installés via **`/api/tags`** (`cible-ollama-modeles-agents.md:17-19`).
  **La capacité existe côté PowerShell, pas côté GUI.**

> **Conséquence dure pour le périmètre** : aujourd'hui, la forge **ne peut pas** savoir si un
> modèle suggéré est présent sur le nœud. Toute option qui l'exige **ajoute une commande Tauri et
> un appel réseau** — donc un lot d'un autre ordre de grandeur (cf. § 5, option C).

---

## 3. Le vrai point de bascule — **contenu volatil ≠ mécanisme stable**

Q-3 mélange deux questions de natures opposées. **Les séparer est le cœur de ce cadrage.**

```
 ┌─ MÉCANISME (stable, versionné avec le code) ─────────────────────────┐
 │  « il existe une suggestion, clé = roleKey, elle amorce le champ,    │
 │    l'utilisateur confirme, absence de suggestion → model:"" »        │
 │  → change tous les 2 ans. A sa place dans @iakaframe/core.           │
 └──────────────────────────────────────────────────────────────────────┘
 ┌─ CONTENU (volatil, à réviser sans release) ──────────────────────────┐
 │  « cadrage → deepseek-r1:14b ; dev → qwen3-coder:30b ; … »           │
 │  → change tous les 3 mois (démontré § 0). N'a PAS sa place           │
 │    dans une constante compilée.                                      │
 └──────────────────────────────────────────────────────────────────────┘
```

**Q-6 (« le schéma Binding vit dans le cœur ») a été tranché OUI — et c'était juste : un
*schéma* est un mécanisme.** En déduire que la *table* y va aussi serait une **fausse symétrie** :
la table est un **contenu**. C'est précisément la distinction que le décideur doit arbitrer en § 6.

---

## 4. Périmètre — DANS / HORS

**DANS**
- Un point d'entrée pur au cœur : *donner un `roleKey` (et le nœud), obtenir un modèle suggéré ou
  rien*. Défensif, **jamais d'exception**, `null`/`""` si aucune suggestion.
- La **clé** de la table et son **vocabulaire** (§ 6, Q-3.b).
- Le **foyer** du contenu de la table (§ 6, Q-3.a).
- Le **point de confirmation** dans le flux : `LiaisonPanel` (§ 6, Q-3.d).
- La **non-régression** : sans confirmation, `model` reste `""` (§ 6, Q-3.e).
- Couverture des **9 rôles canon**, `frame` inclus (comble **S-2**).

**HORS**
- **Toute découverte réseau** des modèles installés (`/api/tags`) — nouvelle commande Tauri,
  nouvel allow-list, gestion d'erreur/timeout : **lot distinct**, à cadrer séparément si le
  décideur choisit l'option C en § 6 Q-3.c.
- **Tout benchmark** ou classement automatique de modèles.
- **Toute détection de matériel** (VRAM disponible). Voir § 7.
- Le **`tools`** par persona (axe séparé, déjà livré, `binding.ts:44`).
- L'**override cockpit** (`origin:"cockpit-override"`) — instruction Cockpit dédiée (E1 Q-5).
- Toute modification du schéma `Binding`/`PersonaBinding` (`binding.ts:30-59`) : **aucune requise**.
- Toute modification de `cible-ollama-modeles-agents.md` dans le dépôt canon (autre dépôt).

---

## 5. Options structurantes — foyer de la table

| | **A — constante au cœur** | **B — donnée de configuration éditable** | **C — découverte live `/api/tags`** |
|---|---|---|---|
| **Où** | `packages/core/src/` (à côté de `binding.ts`, comme `CANONICAL_ROLES`) | Fichier de la racine `IAKAFRAME_HOME` (ex. `library/` ou à côté du réservoir), lu par la forge, **avec repli sur A** | Interrogation du nœud Ollama au moment de la liaison |
| **Qui peut la corriger** | **Personne sans release** : il faut recompiler + publier | **Le décideur, à l'éditeur de texte, sans release** | Personne — c'est le nœud qui répond |
| **Périme ?** | **Oui, structurellement** (§ 0 : 9 mois ont suffi) | Oui, mais **corrigeable le jour même** | **Non** — mais ne dit pas *quel* modèle pour *quel* rôle |
| **Suggère un modèle absent du nœud ?** | Oui, possible | Oui, possible | **Non par construction** |
| **Coût** | **Faible** — pur, testable hors I/O | **Moyen** — un parseur défensif + un chemin de lecture + le repli | **Élevé** — commande Tauri, allow-list réseau, timeout, mode hors-ligne, tests d'intégration |
| **Risque propre** | Table fausse gravée dans une release | Un fichier de plus à connaître ; divergence si personne ne l'édite | Écran qui dépend du réseau ; échec silencieux si le nœud est éteint |
| **Cohérent avec le canon ?** | Duplique `cible-ollama-modeles-agents.md` (**S-4**) | Peut être **alimenté** depuis le canon sans recompiler | Ignore le canon |

**Recommandation du cadrage : B, avec A en repli — et C explicitement reporté.**

Justification en une phrase : **le mécanisme va au cœur (stable), le contenu va en configuration
(volatil)**, et un **repli compilé** garantit qu'une racine sans fichier de configuration se
comporte quand même correctement — exactement le patron déjà employé par `CANONICAL_ROLES`
(`roles.ts:46`), qui est le **repli synthétique** des rôles réels lus du disque (`parseRole`
`roles.ts:99`, promotion Lot 5c `frame.ts:230`). **Ce patron est déjà éprouvé dans ce dépôt.**

---

## 6. Questions d'arbitrage — **ce que le décideur doit trancher**

> **État au 2026-08-02 : les six questions ci-dessous sont TOUTES OUVERTES.** Le décideur a
> tranché **le seul paramètre matériel** (§ 7 — palier 12 Go). Cet arbitrage **ne préjuge d'aucune**
> des six : il fixe *quels modèles sont atteignables*, pas *où vit la table*, *comment elle est
> clée*, ni *comment l'utilisateur confirme*.

### **Q-3.a — Foyer de la table.** Constante compilée, ou donnée éditable hors code ?
*Reco : **donnée éditable, avec repli compilé** (option B).*
**Conséquence si A** : chaque révision de modèle = une release de `@iakaframe/core`. Au rythme
constaté (§ 0), c'est ~2 à 4 releases/an **pour du contenu**.
**Conséquence si B** : le décideur corrige un fichier texte et redéploie — mais il faut **définir
le chemin et le format**, et accepter un artefact de configuration de plus.
→ **Trancher.**

### **Q-3.b — Clé de la table.** Par `roleKey` canon, ou par nom de persona ?
*Reco : **`roleKey`**, sans alternative sérieuse.*
Motifs, tous adossés au code : c'est la convention **déjà gravée et testée** par G6
(`frame.ts:604`, test `frame.test.ts:168`) ; `roleKey` est **déjà présent** au point d'atterrissage
(`LiaisonPanel.tsx:105`) ; le vocabulaire est **fermé et stable** (`roles.ts:46-56`) ; et
`roleLabel` est **tolérant** aux clés hors liste (`roles.ts:79`), donc une méthode tierce ne casse
rien. **Retenir le nom de persona reproduirait le défaut S-1** de la source canon.
→ **Confirmer.** Et **acter que les 9 rôles sont couverts**, `frame` inclus (comble **S-2**).

### **Q-3.c — Modèle suggéré absent du nœud Ollama.** Que fait la forge ?
Trois comportements possibles :
1. **Suggérer quand même**, sans vérifier — l'utilisateur voit le nom, corrige s'il le faut ;
2. **Interroger `/api/tags`** et ne suggérer que du présent ;
3. **Retomber sur `""`** en cas de doute.
*Reco : **1 au MVP, 2 reporté en lot distinct, jamais 3**.*
Motifs : la découverte réseau est **hors périmètre** (§ 4) et **n'existe pas** dans la GUI
(§ 2.5 — testé négativement, `SettingsRoot.test.tsx:242`) ; et retomber sur `""` **annulerait tout
le bénéfice** de Q-3. Une suggestion visible mais absente du nœud reste **strictement plus utile**
que le champ vide d'aujourd'hui : l'utilisateur peut la lire, la corriger, ou lancer le
`ollama pull` correspondant.
→ **Trancher**, en sachant que le choix 2 déclenche un lot backend (commande Tauri + allow-list).

### **Q-3.d — Confirmation utilisateur : où, et que se passe-t-il s'il ne confirme pas ?**
*Reco : la confirmation est **l'acte de cocher « Lier ce kit »**, dans `LiaisonPanel`
(`LiaisonPanel.tsx:68-76`) — pas un second geste.*
Mécanique proposée : cocher appelle `enableBinding` (`useForgeDeploy.ts:165-169`) ; les champs
modèle s'**pré-remplissent** avec les suggestions au lieu d'être vides ; **chaque champ reste
librement éditable** (`LiaisonPanel.tsx:129`) ; **décocher efface tout** (`clearBinding`,
`useForgeDeploy.ts:174-175`).
**S'il ne confirme pas** — c'est-à-dire s'il ne coche pas — **aucun binding n'est posé, aucun
`binding.json` n'est écrit** (`useForgeDeploy.ts:274-275`), le kit reste **pur**. **Comportement
d'aujourd'hui, à l'identique.**
*Alternative à considérer* : une suggestion **non pré-remplie**, affichée seulement en
`placeholder` (`LiaisonPanel.tsx:126-128`) — moins intrusive, mais elle n'épargne **aucune frappe**
à l'utilisateur, donc elle ne résout qu'à moitié le besoin.
→ **Trancher entre pré-remplissage et simple `placeholder`.**

### **Q-3.e — Non-régression.** Le défaut sûr reste-t-il `model: ""` ?
*Reco : **oui, sans exception**, et l'évolution doit être **additive**, comme E1.*
Invariants à préserver, tous vérifiables :
- `defaultBindingForNode` (`binding.ts:178`) **continue de poser `model: ""`** pour les nœuds
  **non-Ollama** et pour **tout rôle sans suggestion** ;
- `modelForPersona` → `""` **⇒ aucune émission de modèle** (`binding.ts:195-206`) : le pivot de
  rétro-compatibilité est **intouché** ;
- **sans binding, la sortie du kit reste byte-identique** au kit pur (`binding.ts:7-9`) ;
- aucun champ ajouté à `Binding`/`PersonaBinding` (`binding.ts:30-59`).
→ **Confirmer.**

### **Q-3.f — Périmètre des nœuds.** La suggestion vaut-elle pour les seuls nœuds Ollama ?
Q-3 ne parle que d'Ollama. Mais `defaultRunnerForNode` (`binding.ts:73-86`) mappe **aussi**
`openwebui → ollama-local` : un nœud `openwebui` tourne donc **sur un harnais Ollama** et exige un
modèle (`modelRequiredFor` `LiaisonPanel.tsx:22-24` : tout sauf `claude`).
*Reco : appliquer la suggestion aux nœuds dont le runner par défaut est `ollama-local` ou
`ollama-distant`, soit **`ollama-localhost`, `ollama-lan` et `openwebui`** — et **jamais**
`claude` (défaut runner, modèle facultatif) **ni** `codex` (runner `chatgpt` : modèles **distants**,
hors sujet d'une table **locale**).*
→ **Confirmer.**

---

## 7. Paramètre matériel — **TRANCHÉ : palier unique 12 Go de VRAM** (2026-08-02)

> ### ✅ **PALIER RETENU : 12 Go de VRAM.**
> **Traitement V-3** (un seul palier, déclaré explicitement) — conforme à la recommandation du
> cadrage. **La table du § 8 n'est valable QUE pour ce palier.** Tout changement de parc
> (nouvelle carte, seconde machine, passage en unified memory) **invalide le § 8** et impose sa
> révision.

### 7.1 Pourquoi le palier est le critère d'admission, pas une annotation

À 12 Go, la VRAM **n'est pas** un confort : c'est un **filtre binaire**. `qwen3-coder:30b` — la
meilleure suggestion technique pour le développement, et celle que ce cadrage recommandait en
première version — pèse **19 Go** et **ne se charge pas**. Le tag cesse d'être un détail
d'installation pour devenir la **décision**.

### 7.2 Marge retenue : **~25 %** → budget de poids **≤ 9 Go**, zone de confort **≤ 6,5 Go**

Les tailles annoncées par Ollama sont des **tailles de poids sur disque**. À l'exécution, la VRAM
doit loger **trois postes supplémentaires** :

1. le **KV cache**, qui **croît avec la fenêtre de contexte** — de quelques centaines de Mo en
   contexte court à **plusieurs Go** en contexte long (les architectures à GQA le réduisent
   fortement, d'où une forte variance d'un modèle à l'autre) ;
2. les **tampons de calcul** (activations, buffers de batch) ;
3. le **contexte du runtime** (CUDA/Metal/ROCm), de l'ordre de **0,5 à 1 Go**.

> ⚠️ **Ordres de grandeur, pas des specs vérifiées** — ces trois postes dépendent du modèle, du
> pilote et de la fenêtre demandée. Marqués **à confirmer** sur la machine réelle.

**Le risque n'est pas le crash — c'est la lenteur silencieuse.** Quand ça déborde, Ollama
**n'échoue pas** : il **décharge des couches sur le CPU** (*partial offload*). Le modèle répond
toujours, mais l'écroulement de vitesse est brutal, et **rien ne le signale à l'utilisateur**. Une
table qui frôle la limite produirait donc une forge « qui marche » et pourtant inutilisable.

D'où **deux bandes**, appliquées au § 8 :

| Bande | Budget de poids | Usage visé | Statut |
|---|---|---|---|
| 🟢 **Confort** | **≤ 6,5 Go** | contexte long (32K+), agentique multi-tours | **Suggestion primaire** du § 8 |
| 🟡 **Palier haut** | **9,0 – 9,3 Go** | contexte court/modeste, qualité supérieure | **Montée en gamme**, colonne dédiée, jamais le défaut |
| 🔴 **Exclu** | **> 9,3 Go** | — | Hors table (§ 8bis) |

**La bande 🟡 n'est jamais posée par défaut** : à 9,3 Go de poids sur 12 Go de VRAM, il ne reste
que ~2,7 Go pour les trois postes ci-dessus — tenable en contexte court, débordant au-delà. C'est
un choix que **l'utilisateur** fait en connaissance de cause, pas la forge à sa place.

### 7.3 Où cette hypothèse est inscrite pour qu'elle ne se perde pas

Une contrainte matérielle non écrite se perd en trois mois. Elle est donc inscrite en **quatre
endroits**, dont **deux dans l'artefact lui-même** :

| # | Emplacement | Nature |
|---|---|---|
| 1 | **Ce § 7** | Source de la décision (traçable, daté) |
| 2 | **En-tête du § 8** | Le palier est rappelé **au-dessus de la table**, inséparable d'elle |
| 3 | **Dans la table livrée** (fichier de configuration si Q-3.a = B, sinon commentaire de la constante) | **Exigé par `AC-Q3-10`** : la table porte **sa date de vérification ET son palier de VRAM** — un lecteur sait toujours *quand* elle a été vraie et *pour quelle machine* |
| 4 | **§ 8bis** | La liste de ce que le palier **exclut** — pour que la contrainte reste **visible comme un coût**, pas comme une évidence |

> `AC-Q3-10` était déjà écrit avant que le palier soit connu. **Il devient ici le mécanisme
> anti-oubli** : aucune table ne peut être livrée sans porter « 12 Go, vérifié le 2026-08-02 ».

### 7.4 Ce qui reste ouvert côté matériel

**V-2 (une table par palier de VRAM)** reste **disponible sans être retenu** : si le décideur
ajoute une seconde machine — ou passe à un GPU 24 Go+ —, la structure du § 8 (une ligne par
`roleKey`) accepte une **colonne de palier** supplémentaire sans refonte. **Rien à re-cadrer**,
seulement du contenu à ajouter. Le § 8bis chiffre d'ailleurs ce qu'un upgrade rendrait accessible.

---

## 8. Contenu **indicatif** de la table — à ratifier, pas une décision du cadrage

> ### 🖥️ **PALIER : 12 Go de VRAM** · vérifié le **2026-08-02** · source : `ollama.com/library/<m>/tags`
> Cette table **n'est valable que pour ce palier** (§ 7). Bande 🟢 confort ≤ 6,5 Go (défaut) ·
> bande 🟡 palier haut 9,0–9,3 Go (contexte court, **jamais posé par défaut**).

Normalisée sur les **9 `roleKey` canon** (`roles.ts:46-56`) — comble **S-1** (clé par rôle),
**S-2** (rôle `frame`), corrige **S-3** (obsolescence), et désormais **filtrée par le palier**.

| `roleKey` | Libellé | Nature du travail | 🟢 Suggestion (défaut) | Taille | 🟡 Montée en gamme | Taille | Raison du choix pour ce rôle |
|---|---|---|---|---|---|---|---|
| `portefeuille` | Portefeuille | arbitrage, vue d'ensemble | `qwen3:8b` | **5,2 Go** | `qwen3:14b` | 9,3 Go | Généraliste solide à mode de réflexion ; l'arbitrage demande de la largeur, pas de la spécialisation |
| `coordination` | Coordination | dispatch, synthèse | `qwen3:8b` | **5,2 Go** | `qwen3:14b` | 9,3 Go | Même profil ; tours courts et fréquents → la latence prime sur la puissance |
| `cadrage` | Cadrage | raisonnement long, options | `deepseek-r1:8b` | **5,2 Go** | **`deepseek-r1:14b`** | 9,0 Go | Seul modèle local à **chaîne de pensée explicite** — c'est ce qu'on veut voir pour peser des options. **Le rôle qui justifie le plus la bande 🟡** |
| `dev` | Développement | code, agentique | `qwen2.5-coder:7b` | **4,7 Go** | **`qwen2.5-coder:14b`** | 9,0 Go | ⚠️ **`qwen3-coder` est HORS PALIER** (§ 8bis) : son plus petit tag est 19 Go. `qwen2.5-coder` redevient le meilleur codeur **atteignable** — la source canon avait raison **par accident** |
| `qualite` | Qualité | tests, revue | `qwen2.5-coder:7b` | **4,7 Go** | `qwen2.5-coder:14b` | 9,0 Go | Même famille que `dev` : lire du code et le critiquer relève de la même compétence |
| `deploiement` | Déploiement | ops, scripts | `qwen3:8b` | **5,2 Go** | `qwen3:14b` | 9,3 Go | ⚠️ **`gpt-oss:20b` est HORS PALIER** (14 Go, § 8bis). Repli sur le généraliste ; l'ops mêle shell, YAML et prose → un généraliste sert mieux qu'un codeur pur |
| `design` | Design | vision, maquettes | **`qwen3-vl:8b`** | **6,1 Go** | *(aucune — voir note)* | — | **Seule ligne où le palier ne coûte rien** : `qwen3-vl:8b` est la génération courante et **tient confortablement**. Corrige `qwen2.5-vl` de la source canon (**S-3**) |
| `documentation` | Documentation | rédaction, guides | `mistral:7b` | **4,4 Go** | `mistral:7b-q8_0` | 7,7 Go | Réputé pour la fluidité en français ; conforme à la source canon. La montée en gamme se fait ici **en quantization**, faute de tag intermédiaire |
| **`frame`** | **Constructeur de frame** | structure, cohérence | `qwen3:8b` | **5,2 Go** | `qwen3:14b` | 9,3 Go | **AJOUT** — **absent de la source canon** (**S-2**). Travail structurel sur des `.md` et des refs → généraliste, pas codeur |

**Note `design`** : pas de montée en gamme proposée. Le tag suivant est `qwen3-vl:30b` (**20 Go**)
— il n'existe **rien entre 6,1 et 20 Go** dans cette famille. Le dire franchement vaut mieux que
d'inventer un palier intermédiaire.

**Aucun rôle n'est laissé sans candidat** à 12 Go. Le palier **dégrade** quatre lignes
(`dev`, `qualite`, `deploiement`, et `cadrage` en défaut), il n'en **supprime** aucune.

> ### **Statut de ce tableau : matière à ratification, pas une décision du cadrage.**
> **Les trois réserves initiales sont MAINTENUES** — la contrainte s'est précisée, elle n'a levé
> aucune incertitude :
> 1. **Réserve `deploiement`** — le choix d'origine (`gpt-oss`) reposait sur des classements
>    d'agrégateurs **non confirmés** par la bibliothèque officielle. Le palier l'a écarté pour une
>    raison de taille, **pas** parce que la réserve serait levée : elle reste entière, et le repli
>    `qwen3:8b` est lui-même **à confirmer** à l'usage.
> 2. **Réserve `mistral`** — n'expose **qu'un seul tag** (`7b`, 4,4 Go). Sa place tenait mal au
>    palier 24 Go ; elle tient **mieux** à 12 Go, mais le modèle reste **ancien** face aux `qwen3`.
>    *À confirmer.*
> 3. **Réserve de péremption** — **tout ce tableau sera périmé.** `qwen3-vl` est passé de
>    cloud-only à six tags locaux en ~9 mois (§ 0). **C'est l'argument central de Q-3.a** : ce
>    contenu n'a pas sa place dans une constante compilée.
>
> **Réserve supplémentaire (nouvelle, née du palier)** : les tailles ci-dessus sont des **poids sur
> disque**. La tenue réelle en 12 Go dépend du KV cache et de la fenêtre de contexte (§ 7.2) —
> **ordres de grandeur, non mesurés sur la machine cible**. Les lignes 🟡 à 9,0–9,3 Go sont les
> plus exposées au *partial offload* silencieux. **À confirmer par un essai réel.**

---

## 8bis. Ce que le palier 12 Go **exclut** — le coût, chiffré

Liste courte et volontairement lisible : **ce que le décideur perd** aujourd'hui, et donc **ce
qu'un upgrade matériel rachèterait**.

| Modèle écarté | Taille réelle | Rôle qu'il servait | Ce qu'on perd concrètement |
|---|---|---|---|
| **`qwen3-coder:30b`** | **19 Go** | `dev`, `qualite` | **La perte la plus lourde.** Codeur MoE (~3,3 B actifs) à **contexte 256K**, taillé pour l'agentique multi-fichiers. **Aucun tag plus petit n'existe** (9 tags vérifiés, le plancher est 19 Go) — impossible de « descendre en gamme » dans cette famille |
| **`gpt-oss:20b`** | **14 Go** | `deploiement` | Raisonnement de bon niveau à contexte 128K. Rate le palier de **2 Go** — le plus proche du seuil, donc le **premier candidat** en cas d'upgrade |
| `deepseek-r1:32b` | 20 Go | `cadrage` | Raisonnement nettement supérieur au `14b` sur les problèmes longs |
| `qwen3:30b` / `qwen3:32b` | 19 / 20 Go | rôles généralistes | Le palier de qualité au-dessus de `14b` |
| `qwen3-vl:30b` / `:32b` | 20 / 21 Go | `design` | Vision haut de gamme — mais `8b` couvre déjà l'essentiel ici |
| `llama3.3:70b`, `deepseek-r1:70b`, `qwen3-coder:480b`, `deepseek-r1:671b` | 43 → 404 Go | — | **Hors d'atteinte à toute échelle domestique** ; mentionnés pour clore la question |

**Lecture pour un arbitrage matériel** — trois seuils utiles :

- **16 Go** → débloque **`gpt-oss:20b`** (14 Go) et met les tags `14b` en bande confort. Gain
  modéré mais réel sur `cadrage` et `deploiement`.
- **24 Go** → débloque **`qwen3-coder:30b`** (19 Go), `qwen3:30b`, `deepseek-r1:32b`,
  `qwen3-vl:30b`. **C'est le seuil qui change la nature du poste** : il rend l'agentique de code
  local sérieusement praticable.
- **32 Go+** → confort sur les 30b avec contexte long, sans *partial offload*.

> **Ce paragraphe n'est pas une recommandation d'achat** — le cadrage n'a pas mandat pour cela.
> C'est la **contrepartie chiffrée** de la contrainte, pour que le décideur arbitre en sachant ce
> que 12 Go coûtent.

---

## 9. Critères d'acceptation VÉRIFIABLES

> À n'implémenter **qu'après arbitrage** du § 6. Formulés pour être vrais **quelle que soit** la
> réponse à Q-3.a (foyer), sauf mention contraire.

- **AC-Q3-1 — Clé par rôle, jamais par nom.** La résolution d'une suggestion prend un **`roleKey`**
  en entrée. Test : deux personas de **noms différents** mais de **même `roleKey`** obtiennent la
  **même** suggestion ; une persona **renommée** conserve la sienne. *(Miroir exact du test G6
  `packages/core/__tests__/frame.test.ts:168`.)*
- **AC-Q3-2 — Les 9 rôles canon sont couverts.** Pour **chaque** clé de `CANONICAL_ROLE_KEYS`
  (`roles.ts:59`), la table rend une suggestion **non vide** — **`frame` inclus** (**S-2** comblé).
  Test : itération sur `CANONICAL_ROLE_KEYS`, aucune entrée manquante.
- **AC-Q3-3 — Défensif, jamais d'exception.** `roleKey` inconnu / `null` / non-string / `""` →
  **pas de suggestion** (`null` ou `""`), **jamais d'exception**. *(Contrat des `parse*` du cœur,
  cf. `roles.ts:99`, `binding.ts:107`.)*
- **AC-Q3-4 — Non-régression : `""` reste le défaut sûr.** `defaultBindingForNode(team, node)`
  (`binding.ts:178`) pose **toujours `model: ""`** pour un nœud **non-Ollama** (`claude`, `codex`)
  et pour **tout rôle sans suggestion**. Les tests existants de `packages/core/__tests__/binding.test.ts`
  **restent verts sans modification**.
- **AC-Q3-5 — Périmètre des nœuds (si Q-3.f confirmé).** La suggestion s'applique **exactement**
  à `ollama-localhost`, `ollama-lan`, `openwebui` ; `claude` et `codex` conservent `model: ""`.
  Test paramétré sur les 5 `NodeKind` (`packages/core/src/node.ts:18-23`).
- **AC-Q3-6 — Kit pur inchangé.** **Sans binding**, la sortie de génération reste
  **byte-identique** à aujourd'hui (invariant `binding.ts:7-9`). Les tests de parité
  (`packages/core/__tests__/parite-generateurs.test.ts`, `adapters*.test.ts`) **restent verts sans
  modification**.
- **AC-Q3-7 — Confirmation explicite (si Q-3.d = pré-remplissage).** Tant que « Lier ce kit »
  n'est **pas** coché : `binding === null`, **aucun `binding.json`** n'est ajouté à l'arbre
  (`useForgeDeploy.ts:274-275`). Après avoir coché : les champs modèle des personas des nœuds
  Ollama sont **pré-remplis** et **restent éditables** (`LiaisonPanel.tsx:129`). **Décocher
  efface** (`useForgeDeploy.ts:174-175`).
- **AC-Q3-8 — Aucun I/O réseau ajouté (si Q-3.c = 1).** Aucune commande Tauri ajoutée ; **aucun
  appel à `/api/tags`** ; le seul wire Ollama reste `llm_complete`/`llm_complete_stream`
  (`src/api/backend.ts:316`, `:346`). Vérifié par recherche : **zéro** occurrence de `api/tags`.
- **AC-Q3-9 — Zéro doublon (si Q-3.a = B).** La table de repli est définie **une seule fois** ; le
  fichier de configuration, quand il existe, **remplace** l'entrée correspondante et ne la duplique
  pas. Le `placeholder` codé en dur `"ex. qwen2.5-coder:14b"` (`LiaisonPanel.tsx:127`) est
  **remplacé** par la suggestion résolue — **plus aucun nom de modèle en dur dans l'UI**.
- **AC-Q3-10 — Traçabilité de la source.** La table porte, **dans le même artefact**, sa **date de
  vérification** et son **palier de VRAM** (§ 7) — pour qu'un lecteur sache **quand** elle a été
  vraie et **pour quelle machine**.

---

## 10. Ce qui reste à décider ailleurs (nommé, pas cadré ici)

- **Lot « découverte des modèles installés »** — si Q-3.c = 2 : commande Tauri `/api/tags`,
  allow-list de l'hôte, timeout, mode hors-ligne, et **réconciliation** suggestion ↔ présence
  (le dépôt canon a déjà ce comportement en PowerShell :
  `iakaframe/specs/instructions/cible-ollama-modeles-agents.md:17-19`).
- **Convergence des deux dépôts (S-4)** — `cible-ollama-modeles-agents.md` (canon) et la table
  GUI sont **deux copies** d'une même connaissance. Décider laquelle **fait foi**, ou les faire
  dériver d'une source unique. **Non tranché ici** : cela touche le dépôt canon, hors périmètre de
  cette instruction.
- **Override cockpit** (E1 Q-5) — la suggestion est un **défaut de forge** (`forge-default`,
  `binding.ts:190`) ; le Cockpit garde son pouvoir d'override. Instruction Cockpit dédiée.

---

## 11. Jalon (gate humain)

| Émetteur | Contenu | Récepteur |
|---|---|---|
| 🔵 Cadrage (P1) | Instruction `Q3-table-modele-local-role-ollama.md` : constat du comportement réel (`model: ""`), état de l'art vérifié au 2026-08-01, statut de la source pressentie (**existe**, mais S-1→S-4), options de foyer (§ 5), arbitrages Q-3.a→Q-3.f (§ 6), paramètre VRAM à trancher (§ 7), table indicative (§ 8), critères d'acceptation (§ 9) | 🟢 Le décideur → valide → implémentation (P2 — Développement) |

**Rien n'est implémenté avant cet arbitrage.** Le comportement actuel (`model: ""`) reste en place
et **reste sûr**.

---

## 12. Journal de décision

- **2026-07-07** — E1 pose Q-3 (politique de Binding par défaut par nœud), reco : suggestion par
  rôle sur Ollama, à confirmer par l'utilisateur ; source pressentie
  `cible-ollama-modeles-agents.md`. *(`E1-evolution-binding-ar1.md:193-196`.)*
- **2026-07-30** — « Go bloc » sur Q-1/Q-2/Q-4/Q-5/Q-6. **Q-3 laissée explicitement ouverte** :
  le runner par défaut est livré, la table ne l'est pas. *(`E1-evolution-binding-ar1.md:225-227`.)*
- **2026-08-02** — **Le décideur tranche le paramètre matériel : palier unique = 12 Go de VRAM**
  (traitement **V-3**, conforme à la reco). Conséquences instruites le jour même : seconde passe de
  vérification **tag par tag** (§ 0bis) ; **§ 7 fermé** (marge ~25 % → poids ≤ 9 Go, confort
  ≤ 6,5 Go, risque de *partial offload* silencieux documenté) ; **§ 8 re-normalisé** sur les 9
  `roleKey` avec tag précis + taille vérifiée + raison par rôle ; **§ 8bis** ajouté (ce que le
  palier exclut + seuils d'upgrade). **Deux suggestions du cadrage initial invalidées par le
  matériel** : `qwen3-coder:30b` (19 Go, aucun tag plus petit n'existe) et `gpt-oss:20b` (14 Go).
  **Aucun rôle laissé sans candidat.** Les **trois réserves du § 8 sont maintenues** et une
  quatrième est ajoutée (poids sur disque ≠ occupation réelle en contexte). **Les six questions
  Q-3.a→Q-3.f restent OUVERTES** — le décideur n'a tranché que la VRAM.
- **2026-08-01** — **Cadrage de Q-3 (ce document).** Constats : `model: ""` confirmé
  (`binding.ts:187`) ; la source pressentie **existe** dans le dépôt canon mais est **clé par nom
  de persona** (S-1), **incomplète de 1 rôle** (S-2), **périmée** (S-3) et **hors dépôt** (S-4) ;
  la GUI **ne sait pas** interroger `/api/tags` (S-2.5). Vérification web du jour : `qwen3-vl` est
  passé de cloud-only à **6 tags locaux**, `qwen3-coder:30b` supplante `qwen2.5-coder` —
  **la donnée périme en mois, pas en années**. D'où la thèse du cadrage : **séparer le mécanisme
  (cœur, stable) du contenu (configuration, volatile)**. **Aucune décision prise** — six
  arbitrages (§ 6) + le paramètre VRAM (§ 7) sont remis au décideur.
