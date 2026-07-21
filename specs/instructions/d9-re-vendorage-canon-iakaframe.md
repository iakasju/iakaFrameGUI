# D-9 — Re-vendorage du canon `iakaframe` → `iakaFrameGUI`

> **Statut** : cadrage fermé, en attente de validation décideur (gate P1→P2).
> **Auteur** : 🔵 Gandalf — 2026-07-21.
> **Antécédents** : dette déclarée hors périmètre en A-16 de D-7, puis A-7 et A-12 de D-8.
> **Nature** : lot de **remise en conformité**, pas d'évolution fonctionnelle. Zéro code de
> production touché.

---

## 0. Avertissement de méthode — pourquoi cette instruction est majoritairement un tableau de chiffres

Ce lot **déplace des attendus chiffrés déjà écrits et déjà gatés**. C'est exactement la
situation où l'on est tenté d'ajuster l'attendu sur l'observé pour faire verdir la suite —
la faute que D-7 interdit en toutes lettres (`d7-perte-silencieuse-resolution-methode.md`
l. 360-362) et que D-8 érige en principe.

> **Règle de ce lot, sans appel.** Le § 4 énumère **exhaustivement** les valeurs qui ont le
> droit de bouger, leur ancienne valeur, leur nouvelle valeur et sa justification. **Toute
> valeur d'attendu modifiée qui n'est pas dans ce tableau = FAIL**, quel que soit l'état de
> la suite. Et **toute valeur du tableau qui ne bouge pas comme annoncé = FAIL aussi** : cela
> signifierait que le canon a encore bougé depuis le 2026-07-21, et le cadrage doit être
> refait avant de coder.

---

## 1. Faits mesurés le 2026-07-21 — et **trois corrections au brief**

Mesures faites en lecture directe des deux arbres (`/Users/sjupin/work/iakaframe` et
`/Users/sjupin/work/iakaFrameGUI`). **Je n'avais pas de shell sur cette session** : je n'ai
pas rejoué `vendor-check` moi-même, j'ai reconstitué son verdict fichier par fichier avec la
table de `cli/src/lib/vendor.js:76-114`. Les trois écarts ci-dessous sont donc des mesures
de contenu, pas des reprises sur parole.

### 1.1 Correction 1 — la décomposition des 18 dérives du brief est fausse (elle somme à 20)

Le brief annonce « 8 personas + 8 goldens + 1 binding + 3 dérivées ». Cela fait **20**, pas
18. L'arithmétique suffisait à l'invalider. La décomposition réelle est :

| Famille | Dérive | Fixtures concernées |
|---|---|---|
| personas | **7** | `gandalf`, `gimli`, `helm`, `legolas`, `loki`, `nathalie`, `odin` |
| goldens | **7** | les **mêmes 7** |
| binding | **1** | `binding/iakaframe-claude-default.md` |
| dérivées | **3** | `method.iakaframe.md`, `method.iakaframe-wrapped.md`, `team.iakaframe-8.md` |
| **Total** | **18** | ✔ concorde avec `DERIVE - 18 fixture(s) sur 21` |

**`aragorn` est propre des deux côtés** — persona **et** golden. Vérifié :
`library/personas/aragorn.md` et `packages/core/__tests__/fixtures/personas/aragorn.md` sont
identiques (167 lignes, contenu égal), et la ligne `aragorn` du binding est identique elle
aussi ; le contrat généré est donc inchangé, donc son golden aussi. C'est cohérent, pas un
hasard : un golden ne dérive que si sa persona ou sa ligne de binding dérive.

La **4ᵉ dérivée, le kit, est propre** : `fixtures/kit.iakaframe-claude.md` est byte-égal au
golden CLI dépouillé de son en-tête (`cli/test/fixtures/kit.iakaframe-claude.golden.md`
l. 10-19). Le descripteur de kit ne porte ni `skills` ni `guardrails` — les évolutions du
20/07 ne l'atteignent pas.

### 1.2 Correction 2 — `iakaframe assemble … --write` ne doit **PAS** être exécuté

`vendor-check` imprime ce geste en remède n° 2 (`cli/src/commands/vendor-check.js:27`). Sur
ce lot précis il est **inutile et dangereux** :

1. **Inutile** : la fixture kit est déjà conforme (§ 1.1). Le remède est imprimé
   statiquement, sans regarder quelles dérivées ont bougé.
2. **Dangereux** : `assemble --write` écrit `kits/iakaframe-claude.md`
   (`cli/src/commands/assemble.js:51`), refuse si la cible existe, et **avec `--force`
   écraserait** le corps rédigé de ce fichier (l. 11-15 : le paragraphe « Manifeste du
   livrable généré… ») par le stub `# Kit iakaframe-claude` du sérialiseur. Ce serait une
   **régression silencieuse dans le dépôt canon**.

> **Conséquence structurante : ce lot est MONO-DÉPÔT.** Il n'écrit **rien** dans
> `iakaframe`. La contrainte « deux écrivains simultanés sur `iakaframe` » évoquée au brief
> **tombe** : elle n'a pas lieu d'être ici. C'est un arbitrage que je ferme, pas un que je
> remonte.

### 1.3 Correction 3 — le champ `skills` ne bouge que sur **une** persona

Le brief dit « les personas gagnent `skills: [iakaframe-fabrication]` ». Mesuré : **seule
`gimli`** change (`skills: []` → `[iakaframe-fabrication]`). Les 7 autres portaient déjà leur
skill des deux côtés, à l'identique.

Et ce champ **n'a aucun consommateur** dans les tests : le seul lecteur des personas vendorées
est `parite-generateurs.test.ts:89-99`, qui lit `description`, `guardrails`, `tools` (depuis le
binding) et le **corps** — **jamais `skills`**. Le contrat d'agent généré ne porte pas de champ
`skills` (cf. `fixtures/agents-golden/gimli.md` l. 7-12). **Aucun impact.**

### 1.4 Ce qui a réellement changé, mesuré

| Artefact | Écart canon → miroir |
|---|---|
| 7 personas | corps : sections **« Jalon de … (obligatoire) »** et **« Obligation — bornage de l'écriture »** (gandalf, helm) ajoutées au canon |
| `gimli.md` | + `skills: [iakaframe-fabrication]` (frontmatter) |
| binding | **2 lignes** : `odin` gagne `Task` ; `helm` gagne `Write` |
| 7 goldens | conséquence des deux lignes ci-dessus (corps + `tools:`) ; le `sha256` de l'en-tête suit dans la copie |
| `method.iakaframe.md` | `principleIds` : **14 → 18** (+ `interruption-minimale-odin`, `merge-versionnement`, `canon-avant-citation`, `preuve-avant-declaration`) |
| `method.iakaframe-wrapped.md` | `principleIds` : **16 → 18** (+ `canon-avant-citation`, `preuve-avant-declaration`) ; découpe `[5,5,5,1]` → `[5,5,5,3]` |
| `team.iakaframe-8.md` | `guardrails` : `[identity, perimeter, delegation]` → **`[]`** — une **suppression** |

> **Point de vigilance n° 1 — les deux fixtures méthode ne sont pas au même stade de retard**
> (14 vs 16 principes) alors qu'elles dérivent du **même** fichier source. C'est le symptôme
> d'un vendorage partiel antérieur. Après ce lot, elles porteront **toutes deux 18**.
>
> **Point de vigilance n° 2 — `team.guardrails` est une SUPPRESSION.** Le canon a vidé la
> liste (les gardes-fous vivent désormais sur les personas, pas sur la team). Un agent qui
> verrait `[] ` apparaître pourrait croire à une perte accidentelle et « réparer » en
> remettant les trois ids : **ce serait un drift injecté dans le miroir**. La valeur cible est
> `[]`, elle est voulue, elle est ici pré-annoncée.

---

## 2. Problème posé

Les 21 fixtures de `packages/core/__tests__/fixtures/` sont le miroir vendoré d'artefacts
canon de `iakaframe`. Le canon a évolué le 2026-07-20 ; le miroir non. La suite GUI reste
verte parce qu'elle **compare ses copies à elles-mêmes**, jamais à la source
(`cli/src/lib/vendor.js:1-12`). Le miroir teste donc fidèlement une méthode qui n'existe plus.

Ce n'est plus une dette de fond : c'est un **péage**. Tout gate futur de `iakaFrameGUI`
portant un critère `vendor-check clean` la rencontre. Elle a bloqué trois lots.

---

## 3. Les deux gestes de réparation

`vendor-check` insiste : **« DEUX gestes distincts — ne jamais copier une dérivée »**
(`vendor-check.js:60`). Les dérivées sont des **formes canoniques sérialisées** ; les copier
détruirait la forme sur laquelle `methodMd.test.ts` et `teamMd.test.ts` sont bâtis.

### 3.1 Geste A — les 17 copies, par `cp`

Depuis la racine de `iakaframe` :

```
cp cli/test/fixtures/agents-golden/*.md   ../iakaFrameGUI/packages/core/__tests__/fixtures/agents-golden/
cp library/personas/*.md                  ../iakaFrameGUI/packages/core/__tests__/fixtures/personas/
cp bindings/iakaframe-claude-default.md   ../iakaFrameGUI/packages/core/__tests__/fixtures/binding/
```

> ⚠️ `library/personas/` contient **`_TEMPLATE.md`**, qui n'est **pas** une des 21 fixtures.
> Un `cp *.md` naïf l'introduirait dans l'arbre vendoré et `vendor-check` le signalerait en
> **`fixture-surnumeraire`** (`vendor.js:228-237`) — le lot rendrait un rouge d'un autre
> genre. **Copier les 8 ids nommément, ou retirer `_TEMPLATE.md` après coup.** Le geste
> imprimé par `vendor-check` ne porte pas cette précaution ; elle est de la responsabilité de
> ce cadrage.

`aragorn.md` (persona et golden) sera recopié à l'identique : l'opération est idempotente
pour lui. **15 des 17 copies seulement apparaîtront modifiées au `git status`.**

### 3.2 Geste B — les 3 dérivées, par le sérialiseur

Depuis la racine de `iakaFrameGUI` :

```
node packages/core/scripts/gen-fixtures.mjs
```

L'outil existe déjà et il est correct : il **importe** les sérialiseurs du cœur (il ne les
réécrit pas), **régénère le frontmatter** depuis le canon et **préserve le corps verbatim**
(`gen-fixtures.mjs:17-20, 88-92`). Il porte aussi un mode `--check` non écrivain.

### 3.3 Ordre des gestes — **indifférent**, et c'est mesuré

`gen-fixtures.mjs` lit `canon/methods/iakaframe.md` et `canon/teams/iakaframe-8.md`
directement (l. 100-101). Il **ne lit aucune des 17 copies**. Il n'y a donc **aucune
dépendance** entre A et B : l'un ou l'autre d'abord, le résultat est identique.

L'ordre **A puis B** est néanmoins prescrit, pour une raison d'hygiène et non de correction :
il fait apparaître les deux natures de geste dans cet ordre au journal, et `gen-fixtures`
imprime en fin de course un rappel sur les 17 copies qui n'a de sens qu'après elles.

### 3.4 Geste C — **interdit**

`iakaframe assemble iakaframe iakaframe-8 --write` : **ne pas exécuter** (§ 1.2). Aucune
écriture dans le dépôt `iakaframe` sur ce lot.

---

## 4. Les attendus qui bougent — liste **exhaustive et fermée**

**Trois fichiers de test** sont modifiables. Aucun autre. Tout fichier de test hors de cette
liste apparaissant modifié au `git diff` = **FAIL**.

### 4.1 `packages/core/__tests__/parite-generateurs.test.ts`

| Ligne | Ancienne valeur | Nouvelle valeur | Justification |
|---|---|---|---|
| 153 | `toolsForPersona(binding,"odin")` → `["Read","Grep","Glob","Bash"]` | `["Read","Grep","Glob","Bash","Task"]` | le binding canon accorde `Task` à `odin` (`bindings/iakaframe-claude-default.md:8`) |

**Et rien d'autre dans ce fichier.** Les trois autres tests (rendu==golden l. 122, garde
`sha256` l. 130, format autorité l. 137) sont **auto-cohérents** : persona, binding et golden
sont copiés **ensemble**, et le `sha256` voyage dans l'en-tête du golden. Ils doivent rester
verts **sans modification**. S'ils cassent, la copie est incomplète — on ne les ajuste pas.

> **`helm` gagne `Write` au binding mais aucun test ne l'assertait** : rien à modifier de ce
> côté. La ligne 153 ne couvre que `gandalf`, `gimli`, `odin`.

### 4.2 `packages/core/__tests__/methodMd.test.ts`

| Ligne | Ancienne valeur | Nouvelle valeur | Justification |
|---|---|---|---|
| 53 | `{ principleIds: [5, 5, 5, 1] }` | `{ principleIds: [5, 5, 5, 3] }` | la découpe du canon est 5+5+5+3 = 18 (`methods/iakaframe.md:5-8`) |
| 58 | `toHaveLength(16)` | `toHaveLength(18)` | idem |
| 48-50, 56 | commentaires et titre disant « 16 ids » | « 18 ids » | alignement rédactionnel |

**Restent INCHANGÉS dans ce fichier** — et doivent rester verts :

- l. 62 `principleIds[15] === "merge-versionnement"` : l'index 15 reste `merge-versionnement`
  (les deux ajouts sont en 16 et 17). **Ne pas y toucher.** *Ajout toléré, non requis* : une
  assertion `[17] === "preuve-avant-declaration"`.
- l. 59-61 (`[0]`, `[4]`, `[5]`) : inchangés.
- l. 36-40 et l. 65-70 (byte-parités) : auto-cohérentes avec la fixture régénérée.
- l. 76-79 (forme mono-ligne) : le préfixe testé est en tête de liste, inchangé.
- l. 12-21 (`const m`) : littéral indépendant des fixtures. **Ne pas toucher.**

### 4.3 `packages/core/__tests__/method.test.ts` — le critère **A-5 de D-7**

| Lignes | Ancienne valeur | Nouvelle valeur | Justification |
|---|---|---|---|
| 276-277 | libellé « 14 entrées… » + `toHaveLength(14)` | « 16 entrées… » + `toHaveLength(16)` | la fixture wrapped passe de 16 à 18 principes, dont **4** hors catalogue au lieu de 2 |
| 282-285 | `byField("principleIds")` = `["interruption-minimale-odin","merge-versionnement"]` | + `"canon-avant-citation"`, `"preuve-avant-declaration"` (dans cet ordre de déclaration) | ces 2 ids existent dans `library/principles/` mais pas dans `CATALOG_PRINCIPLES` (14 entrées) |
| 260-269 | bloc de commentaire « ⚠️ MESURE, PAS AJUSTEMENT » documentant l'écart 14/16 | réécrit : l'écart est **résorbé**, renvoi à la présente instruction | le commentaire décrit un état qui n'existe plus |
| 304-322 | test *« le fichier SOURCE (18 principes) donne bien les 16 du cadrage §1.2 »* | **supprimé et remplacé** (§ 4.4) | il **compense** le drift en réinjectant en ligne les 2 ids manquants ; sur la fixture à jour il les **dupliquerait** (20 principes, 6 non résolus) et **échouerait** |

**Restent INCHANGÉS** : l. 147, 156-157, 180-188, 190-197, 199-209, 211-228, 230-244, 246-254
(A-1 à A-4, A-6 à A-9 de D-7 : tous sur des `Method` littérales, aucun lien avec les
fixtures), l. 80-82 (A-8 de D-7 : `principlesForMethod` sur la méthode **canonique codée en
dur**, pas la fixture — reste `14`), l. 299-302.

### 4.4 Le test de remplacement (solde net de tests = **0**)

Le test supprimé perdait sa raison d'être. Il est remplacé, **au même endroit**, par un test
d'**ancrage anti-drift** qui gate ce que ce lot vient d'établir :

- la fixture wrapped déclare **exactement 18** `principleIds` ;
- les **4** derniers sont, dans l'ordre : `interruption-minimale-odin`,
  `merge-versionnement`, `canon-avant-citation`, `preuve-avant-declaration` ;
- commentaire expliquant qu'un futur écart entre ce test et le canon **se répare par
  `gen-fixtures.mjs`, jamais en éditant le chiffre**.

**Un retiré, un ajouté** : le total de la suite `@iakaframe/core` est **strictement
inchangé**. Un total qui bougerait = FAIL (voir A-8).

### 4.5 Fichiers de test explicitement **NON modifiables**

| Fichier | Pourquoi il ne bouge pas |
|---|---|
| `teamMd.test.ts` | l. 36-40 (byte-parité) auto-cohérente. Le littéral `const t` l. 10-17 porte `guardrails: ["identity","perimeter","delegation"]` : il ne teste qu'un **aller-retour**, ne lit pas la fixture, et **reste vert**. Il devient sémantiquement périmé — c'est acté au § 7, **pas corrigé ici**. |
| `kitMd.test.ts` | fixture kit conforme (§ 1.1) |
| `principle.test.ts` (`toHaveLength(14)`) | c'est le **catalogue du cœur**, pas la fixture. Ce lot **n'ajoute aucun principe au catalogue** (§ 7). |
| `frame.test.ts`, `reservoir.test.ts`, `persona.test.ts`, `adapters*.test.ts`, tout `src/**` | ne consomment aucune fixture vendorée |
| tout `src-tauri/**` | zéro Rust dans ce lot |

---

## 5. Ce que le lot **ne fait pas** (périmètre fermé, à acter)

1. **Aucune écriture dans le dépôt `iakaframe`.** Lot mono-dépôt (§ 1.2).
2. **Aucun outillage nouveau.** Pas de `vendor-sync`, pas de script npm, pas de hook CI.
   Le geste reste manuel et conscient — c'est un choix explicite de
   `gen-fixtures.mjs:4-5` (« le geste reste CONSCIENT et EXPLICITE — jamais de
   synchronisation automatique »). → arbitrage **Q-1**.
3. **Aucun élargissement de catalogue.** `CATALOG_PRINCIPLES` reste à 14, `CATALOG_SKILLS`
   à 7, `CANONICAL_ROLE_KEYS` inchangé. Les 16 références non résolues **restent 16** : ce
   lot les rend *exactes*, il ne les *résorbe pas*. C'est la dette D7-f, distincte.
4. **Aucun code de production.** `packages/core/src/**` et `src/**` sont intacts.
5. **Aucune recette visuelle.** Rien d'observable à l'écran ne change.

---

## 6. Critères d'acceptation

Numérotés, mesurables, cités avec leur sortie. Un critère non mesuré se déclare *non mesuré*,
jamais *PASS*.

### Nominal — l'état d'arrivée

**A-1** — `node cli/src/index.js vendor-check --root <chemin absolu vers iakaframe>` rend
**exactement** : `vendor-check : OK - 17 copies + 4 derivees conformes au canon.`
Statut `clean`, `checked = 17`, `derived = 4`, `drift = 0`.
> ⚠️ **`--root` désigne le CANON, jamais le miroir.** L'inverser produit un faux
> `22 fixture(s) / source-introuvable`. Ce piège a déjà fait tomber un gate.

**A-2** — `node packages/core/scripts/gen-fixtures.mjs --check` (depuis le GUI) rend
`gen-fixtures --check : les 3 derivees sont a jour.` et **exit 0**.

**A-3** — `npm run lint:all` : **0 erreur**, exit 0.

**A-4** — `npm run test:all` : **vert**, avec le total de tests **strictement égal** au total
mesuré avant le lot (cf. A-8). Le total **avant** doit être capté et cité **avant** de
toucher quoi que ce soit.

**A-5** — Aucune fixture **surnuméraire** : `packages/core/__tests__/fixtures/` contient
**exactement 21** fichiers `.md`. En particulier **pas de `personas/_TEMPLATE.md`** (§ 3.1).

**A-6** — Le `git diff --stat` du lot porte **exactement 21 fichiers** :
15 copies + 3 dérivées + 3 fichiers de test. Ni plus, ni moins.
*(2 des 17 copies — `personas/aragorn.md` et `agents-golden/aragorn.md` — sont recopiées à
l'identique et n'apparaissent pas.)*

**A-7** — `git status` du dépôt **`iakaframe`** : **arbre inchangé par ce lot**. En
particulier `kits/iakaframe-claude.md` n'est pas modifié.

### Conformité des attendus — le cœur du lot

**A-8** — **Les seules valeurs d'attendu modifiées sont celles du § 4**, une par une, vers
la valeur exacte annoncée. À vérifier **au `git diff` des 3 fichiers de test**, ligne à
ligne. Une valeur ajustée hors tableau, ou une valeur du tableau ajustée vers une autre
valeur que celle annoncée ⇒ **FAIL**, sans examen du fond.

**A-9** — Le test supprimé (`method.test.ts` l. 304-322) est **remplacé** par le test
d'ancrage du § 4.4. Le **compte de tests de `@iakaframe/core` est identique** avant et après :
un total **inférieur** signale une suppression sèche, un total **supérieur** un ajout non
cadré. Les deux sont un **FAIL**.

**A-10** — `parite-generateurs.test.ts` : les trois tests **auto-cohérents** (rendu==golden,
garde `sha256`, format autorité) passent **sans avoir été modifiés**. À vérifier au diff :
si ces blocs apparaissent touchés, le critère est en échec.

**A-11** — `teamMd.test.ts`, `kitMd.test.ts` et `principle.test.ts` sont **absents du diff**.

### Contenu — l'état des fixtures

**A-12** — `fixtures/team.iakaframe-8.md` porte `guardrails: []`. **Cette liste vide est la
valeur cible.** La « remplir » = FAIL (§ 1.4, point de vigilance n° 2).

**A-13** — `fixtures/method.iakaframe.md` **et** `fixtures/method.iakaframe-wrapped.md`
portent **chacune 18** `principleIds` ; la wrapped les découpe **5+5+5+3**.

**A-14** — Les **corps** des 3 dérivées sont **verbatim inchangés** :
`# Méthode iakaframe (assemblage de discipline)` et
`# La compagnie iakaframe (casting des 8)`. Le corps du canon (plus long) **ne doit pas**
apparaître dans les fixtures — `gen-fixtures.mjs:18-20` le garantit ; le vérifier au diff.

**A-15** — `fixtures/binding/iakaframe-claude-default.md` : `odin` porte `Task`, `helm` porte
`Write`.

### Cas de défaut — les pièges à éprouver, pas à supposer

**A-16** — **Copie d'une dérivée (geste interdit).** `cp` de `methods/iakaframe.md` sur
`fixtures/method.iakaframe.md` casse `methodMd.test.ts` (byte-parité l. 36-40, corps
différent). Le vérifier **une fois**, puis annuler. Sert à prouver que la garde attrape le
geste interdit — et non à supposer qu'elle l'attraperait.

**A-17** — **Fixture surnuméraire.** Déposer un `.md` quelconque sous
`fixtures/personas/` ⇒ `vendor-check` sort `fixture-surnumeraire`, exit **1**. Retirer.

**A-18** — **Fixture manquante.** Retirer temporairement une des 21 ⇒ `fixture-manquante`,
exit **1**, et le compte n'est **pas** allégé. Restaurer.

**A-19** — **Piège du `--root` inversé.** `vendor-check --root <miroir>` produit un rapport
`source-introuvable` : à **constater et citer** dans le verdict, pour que le prochain gate
sache reconnaître le faux rouge.

---

## 7. Arbitrages laissés au décideur

Je propose, je ne tranche pas.

**Q-1 — Outiller le geste (un `vendor-sync`, ou un script npm) dans ce lot ?**
*Recommandation : **non**.* L'outillage existe déjà à 80 % (`gen-fixtures.mjs` avec
`--check`) ; ce qui manque n'est qu'un `cp`. L'automatiser touche `package.json` voire le
dépôt `iakaframe`, élargit le périmètre, et **contredit un choix explicite** de la garde
(geste conscient, jamais automatique). → item de backlog séparé.

**Q-2 — Le remède imprimé par `vendor-check` est partiellement faux** (il prescrit
`assemble --write`, inutile ici et destructif avec `--force` ; et son `cp library/personas/*.md`
embarque `_TEMPLATE.md`). *Recommandation : le corriger dans un lot **côté `iakaframe`**,
pas ici.* Une garde qui imprime un remède nuisible est une garde qu'on finit par ignorer —
mais la corriger ici ferait de D-9 un lot à deux dépôts, ce que le § 1.2 vient d'écarter.

**Q-3 — `teamMd.test.ts` l. 15** déclare `guardrails: ["identity","perimeter","delegation"]`
pour une team dont le canon porte `[]`. Le test reste **vert** (round-trip pur).
*Recommandation : **laisser**.* Le corriger serait une modification d'attendu non requise par
la mesure — exactement le geste que ce lot discipline. → note au backlog.

**Q-4 — Le cœur ignore 4 ids de skills du canon** (`iakaframe-fabrication`,
`iakaframe-deploiement`, `iakaframe-memoire-humaine`, `iakastart` sont absents de
`CATALOG_SKILLS`, qui compte 7 entrées). C'est **la même classe de défaut que D-7**,
transposée des principes aux skills — mais **silencieuse et sans conséquence mesurable
aujourd'hui** (rien ne lit `Persona.skills` dans les tests vendorés). *Recommandation : item
de backlog, hors de ce lot.*

**Q-5 — Faut-il rejouer la mesure `vendor-check` avant de coder ?** Le canon peut avoir bougé
entre ce cadrage (2026-07-21) et l'exécution. *Recommandation : **oui**, et c'est une
pré-condition.* Si la mesure d'ouverture ne rend plus `DERIVE - 18 fixture(s) sur 21` avec la
décomposition du § 1.1, **ne pas coder** : remonter à Gandalf pour re-cadrage. Un tableau
d'attendus pré-annoncés ne vaut que contre la mesure qui l'a fondé.

---

## 8. Estimation (jalon P1→P2)

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** | **0,5 j-h** (spec fermée) |
| **Complexité** | **faible** — aucun code de production, deux commandes, trois fichiers de test |
| **Risque** | **moyen** — le risque n'est pas technique, il est **disciplinaire** |

Décomposition :

| Étape | j-h |
|---|---|
| Mesure d'ouverture (Q-5) + capture du total de tests avant | 0,05 |
| Gestes A et B + purge `_TEMPLATE.md` | 0,10 |
| Ajustement des 3 fichiers de test (§ 4) + test de remplacement | 0,15 |
| Cas de défaut A-16 … A-19 | 0,10 |
| Vérification A-1 … A-15 + verdict sourcé | 0,10 |

**Inconnues susceptibles de faire glisser :**

1. **Un attendu non repéré par ce cadrage.** J'ai tracé les consommateurs de fixtures par
   recherche d'imports (`?raw`) : 5 fichiers de test, dont 2 non impactés. Le risque
   résiduel est une dépendance **indirecte** (un test lisant un fichier qui lit une fixture).
   Je l'estime faible, non nul. Impact : +0,1 j-h.
2. **Le canon a rebougé depuis le 2026-07-21** (Q-5). Impact : re-cadrage, le lot ne démarre pas.
3. **La tentation d'élargir.** Q-1 à Q-4 sont quatre portes vers un lot deux fois plus gros.
   C'est l'inconnue la plus probable, et elle est humaine, pas technique.

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à confronter
au temps réel à la clôture du lot.

---

## 9. Délégable / geste humain

| Geste | Qui |
|---|---|
| Gestes A et B, ajustement des 3 fichiers de test, cas de défaut, mesures | **⚒️ Gimli** — délégable intégralement |
| Vérification indépendante des critères, verdict sourcé | **🏹 Legolas** — contexte séparé, re-mesure (ne reprend aucune mesure de Gimli) |
| Validation de la présente instruction, arbitrages Q-1 à Q-5 | **le décideur** |
| Merge + versionnement | **🛡️ Aragorn**, sur feu vert |

Aucune recette visuelle : rien d'observable à l'écran ne change (§ 5.5).
