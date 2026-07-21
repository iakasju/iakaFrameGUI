# Instruction : D-8 — Le « gate menteur » : rendre un verdict inopposable sans sa mesure

> Cadrage Gandalf, 2026-07-21. Gate P1→P2 : **l'utilisateur (décideur)** tranche.
> Lot déclencheur : merge `8ae5748` portant « gate Legolas PASS » alors que le lint était rouge.

---

## 1. Contexte

Le merge `8ae5748` (20/07) porte la mention **« gate Legolas PASS »**. Le lint était **rouge** au
moment du merge : `packages/core/scripts/gen-fixtures.mjs`, introduit par ce même lot, produit
11 erreurs ESLint. Une garde a donc **déclaré un verdict sans produire la mesure qui le fonde**.

C'est la récidive du motif gravé la veille — règle (d), 2026-07-20 : *une garde ne vaut que ce que
vaut le fait sur lequel elle s'applique*. Cette fois le motif frappe **le gate lui-même**, dans le
dépôt où l'on venait de fermer ce défaut (lot D-7, merge `e9add1a`, 21/07).

Découvert par Legolas pendant le gate de D-7, **en re-mesurant** au lieu de faire confiance au
rapport de l'agent précédent. C'est ce geste — et lui seul — qui a révélé l'incident. Toute la
suite de cette instruction découle d'un constat simple : **le geste qui a marché n'est porté par
aucun instrument ; il n'a tenu qu'à la conscience professionnelle d'un agent.**

### 1.1 Ce que ce lot n'est pas

Ce n'est **pas** un assainissement d'historique de masse. 10 commits portent « gate Legolas PASS » ;
les 7 antérieurs à `8ae5748` (15-16/07) **précèdent l'existence** du fichier fautif
(`gen-fixtures.mjs`, introduit par `6706c39`). **Le dégât est borné à UN incident.**

> ⚠️ **Fait non re-mesuré par le cadrage.** Ce bornage repose sur les `git cat-file -e` d'Odin
> (21/07) ; la session de cadrage n'a **pas** eu accès à un shell et n'a **pas** pu rejouer ces
> commandes. Il est repris **sur la foi de la mesure d'Odin**, pas confirmé indépendamment.
> Vu le sujet du lot, cette réserve est écrite plutôt que tue. **Étape 0 ci-dessous la lève.**

---

## 2. Ce qui existe

| Élément | Où | État |
|---|---|---|
| Bloc globals navigateur | `eslint.config.js` l. 24-41 | `files` limité aux `.ts/.tsx` — **ne couvre aucun `.mjs`** |
| Bloc globals Node | `eslint.config.js` l. 42-48 | `files: ["*.config.{js,ts}"]` — racine seulement, **jamais `packages/**/scripts/`** |
| `*.config.js` dans `ignores` | `eslint.config.js` l. 19 | **incohérent** avec le bloc l. 44 — voir § 3.4 |
| `gen-fixtures.mjs` | `packages/core/scripts/` | **11 erreurs ESLint** — voir § 3.1 |
| `npm run lint:all` | prescrit par `CLAUDE.md` l. 33 | **N'EXISTE PAS** dans `package.json` |
| `npm run test:all` | prescrit par `CLAUDE.md` l. 32 | **N'EXISTE PAS** dans `package.json` |
| Scripts réels | `package.json` l. 10-19 | `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:coverage`, `tauri` |
| Critère A-14 de D-7 | `specs/instructions/d7-...md:394` | s'appuie sur `lint:all` — **instrument absent** |
| Hooks de méthode | `global/hooks/*.mjs` | présents (identity, perimeter, delegation) mais **non câblés** dans `.claude/settings.local.json` |
| `.claude/settings.local.json` | racine | permissions seules — **aucune section `hooks`** |

---

## 3. Faits mesurés par le cadrage

Mesures faites par **lecture de fichiers** (pas d'exécution : la session de cadrage n'avait pas de
shell). Tout fait ci-dessous est vérifiable en rouvrant le fichier cité.

### 3.1 La cause racine du lint rouge est structurelle

ESLint 9 en *flat config* lint par défaut `**/*.js`, `**/*.cjs` et `**/*.mjs`.
`js.configs.recommended` (l. 22) active donc `no-undef` sur `gen-fixtures.mjs`. Mais :

- le bloc l. 24-41 n'accorde `globals.browser` qu'aux `**/*.{ts,tsx}` ;
- le bloc l. 42-48 n'accorde `globals.node` qu'aux `*.config.{js,ts}` **à la racine**.

Un `.mjs` sous `packages/core/scripts/` **ne matche aucun bloc porteur de globals** → `process` est
un identifiant inconnu. **Ce n'est pas une faute d'inattention : la configuration n'a jamais prévu
la catégorie « script d'outillage ».** Tout futur `.mjs` d'outillage reproduira le défaut.

### 3.2 Correction au brief — 10 occurrences de `process`, pas 9

Le brief annonce « `no-undef` sur `process` ×9 … Total 11 erreurs » — 9 + 1 = 10, pas 11. Le
comptage à la lecture du fichier donne **10 occurrences de `process`** :
l. 62, 95, 131, 133, 135, 138, 140, 143, 146, 147. Avec `no-irregular-whitespace` l. 81 :
**10 + 1 = 11**. Le **total 11 était juste**, le détail « ×9 » était le lapsus.

**Conséquence opérationnelle** : le critère de sortie se formule en « 0 erreur », jamais en
« les 9 erreurs corrigées ». Un attendu chiffré faux est précisément ce qui invite à ajuster le
chiffre plutôt qu'à regarder la sortie.

### 3.3 Correction au brief — le bloc l. 42-48 n'est PAS mort

Le brief le suppose « probablement mort » du fait de l'`ignores` l. 19. **Infirmé** :
`ignores` porte `*.config.js` — **`.js` seulement**. Le bloc l. 42-48 porte `*.config.{js,ts}`,
donc aussi **`.ts`**. Or **`vite.config.ts` existe à la racine** (vérifié).

Le bloc est donc **vivant et utile** : il donne les globals Node à `vite.config.ts`. Seule sa
**moitié `.js` est neutralisée** par l'`ignores`. **Ne pas le supprimer** — ce serait casser le lint
de `vite.config.ts` en croyant nettoyer du code mort.

### 3.4 L'incohérence `ignores` / bloc node est réelle mais bénigne

`*.config.js` en `ignores` (l. 19) fait qu'`eslint.config.js` ne se lint pas lui-même. C'est un
choix défendable (le fichier de config est souvent exempté), mais **il n'est pas écrit** : rien ne
dit si c'est voulu ou hérité. À trancher — **Q-4**.

### 3.5 L'instrument prescrit n'existe pas — et le vice est plus large que « deux scripts manquants »

`CLAUDE.md` prescrit `npm run lint:all` et `npm run test:all` ; aucun n'existe. Mais la lecture du
fichier montre davantage : **toute la section « Commandes à utiliser » de `CLAUDE.md` est un
gabarit jamais rempli** — chaque ligne est commentée (`# ex:`), et la section « Ce qu'est ce
projet » porte encore `Stack : <!-- ex: ... -->`. Il en va de même dans `doc/index.html:178-179`,
qui recopie le gabarit.

**L'instrument n'a pas été cassé : il n'a jamais été posé.** Le lot est donc un **remplissage de
gabarit**, pas une réparation. C'est plus simple qu'annoncé, et cela rend l'arbitrage Q-1
tranchable sans regret.

> **Nuance à ne pas surjouer.** `npm run <script-absent>` **échoue** (code de sortie ≠ 0, `Missing
> script`). Un agent qui lit le code de sortie n'est donc pas trompé par l'absence. Le vrai risque
> est celui du brief : un agent qui **ne lit pas la sortie** ne distingue pas « la commande
> n'existe pas » de « la mesure est verte ». **Ce n'est pas un défaut d'outil, c'est un défaut de
> restitution** — et c'est ce que la strate méthode (§ 5) doit viser, pas l'absence de script.

---

## 4. Décision — strate outillage

### 4.1 Réparer `eslint.config.js` par une catégorie « outillage Node »

Ajouter un bloc dédié — **sans toucher aux blocs existants** (§ 3.3) :

```js
{
  // Outillage Node en ESM (scripts de génération, hooks de méthode non vendorés).
  files: ["**/*.mjs", "**/scripts/**/*.{js,mjs}"],
  languageOptions: {
    globals: globals.nodeBuiltin,
  },
},
```

**Pourquoi `globals.nodeBuiltin` et non `globals.node`.** `globals.node` inclut les globals
**CommonJS** (`require`, `module`, `exports`, `__dirname`) qui **n'existent pas** dans un `.mjs`.
Les accorder rendrait le lint **complaisant** : il validerait un `require()` qui plante à
l'exécution. `globals.nodeBuiltin` ne fournit que les globals réellement présents en ESM
(`process`, `Buffer`, `URL`…). **Choisir la variante permissive ici serait rejouer, dans l'outil de
mesure, le défaut que ce lot ferme.**

Le bloc de la racine (l. 42-48) reste sur `globals.node` : `vite.config.ts` est chargé par Vite dans
un contexte qui tolère les deux — hors périmètre de ce lot.

### 4.2 Corriger les 11 erreurs de `gen-fixtures.mjs`

- Les 10 `no-undef` sur `process` **disparaissent d'elles-mêmes** par § 4.1. **Aucune modification
  du script n'est requise pour elles** — et aucune n'est autorisée : ajouter `import process from
  'node:process'` ou un `/* global process */` masquerait le défaut de config au lieu de le
  réparer.
- Le `no-irregular-whitespace` l. 81 est **réel et à corriger dans le script** : le littéral
  `/^﻿/` est écrit avec le caractère BOM **brut** dans la regex. Le remplacer par la
  **séquence d'échappement** `/^﻿/`. **Invariant : le comportement doit être identique** —
  c'est un changement d'écriture, pas de sémantique. Le fichier `gen-fixtures.mjs` manipule des
  fixtures byte-à-byte ; toute dérive s'y verrait, ce qui rend le critère A-7 (§ 7) non décoratif.

### 4.3 Doter le projet des scripts que sa doc prescrit — **arbitrage Q-1**

Deux voies :

| | **Option A — créer les scripts** (recommandée) | **Option B — corriger la doc** |
|---|---|---|
| Geste | ajouter `lint:all` et `test:all` à `package.json` | remplacer `lint:all` par `typecheck && lint` partout |
| Instructions déjà écrites | **restent vraies** | **deviennent fausses** (3 fichiers, dont D-7 A-14) |
| Coût | ~0 | réécriture d'archives |
| Risque | aucun | **réécrire une instruction livrée pour la faire correspondre au réel** |

**Recommandation : Option A.** Les instructions de `specs/instructions/` sont des **archives
contractuelles** : D-7 a été validé, mergé et son A-14 fait foi. Les amender rétroactivement pour
les aligner sur un outillage défaillant, c'est **ajuster l'attendu sur l'observé** — le geste que
D-7 lui-même interdit en toutes lettres (l. 360-362 : *« ne pas ajuster le chiffre attendu pour le
faire passer »*). L'option B ferait, à l'échelle du lot, ce que D-7 interdit à l'échelle d'un test.

Scripts à ajouter :

```json
"lint:all": "npm run typecheck && npm run lint",
"test:all": "npm run test"
```

`test:all` est aujourd'hui un **alias** de `test` (Vitest seul). Il est créé quand même : la doc le
prescrit, et il donne le **point d'accroche nommé** où brancher `cargo test` plus tard sans
retoucher les instructions qui le citent. **Il ne doit pas inclure `cargo test` dans ce lot** :
`cargo` n'est pas disponible sur toute machine où l'on veut linter, et rendre `test:all` dépendant
de la toolchain Rust le rendrait faillible pour de mauvaises raisons.

### 4.4 Remplir le gabarit de `CLAUDE.md`

Décommenter et remplir la section « Commandes à utiliser » avec les scripts **réellement exposés**,
et renseigner `Stack :`. **Ne lister aucune commande qui n'existe pas** dans `package.json` — c'est
l'invariant de ce lot. `bash scripts/quality-report.sh`, présent dans le gabarit, **n'existe pas**
et doit disparaître, pas être créé.

> **Hors périmètre de Gandalf.** `CLAUDE.md` est un fichier de configuration de méthode ; le
> cadrage ne l'écrit pas. Il est ici **désigné comme cible d'un geste**, à exécuter par Gimli sous
> validation du décideur (voir § 8).

---

## 5. Décision — strate méthode

### 5.1 Analyse : une règle de plus est la mauvaise réponse. Je le dis.

Le brief demande de trancher, et l'analyse est nette : **la règle (d) existait le 20/07 et n'a pas
empêché la récidive le 21/07.** Une règle qui répète une règle déjà enfreinte n'ajoute rien —
elle ajoute du **texte que l'agent fautif aurait également lu et également enfreint**.

Il faut comprendre **pourquoi** la règle n'a pas mordu. Ce n'est pas de la mauvaise volonté : un
agent qui écrit « gate PASS » à la fin d'un lot **croit sincèrement** avoir mesuré. Il a lancé des
commandes, il en a vu passer, il a une **mémoire d'avoir vérifié**. Le principe
`preuve-avant-declaration` nomme exactement ce piège : *la mémoire d'avoir écrit n'est pas un
constat*. La règle échoue parce qu'elle demande à l'agent de **se méfier de sa propre mémoire** —
ce qu'aucun texte ne peut obtenir de façon fiable.

**Ce qui a marché, en revanche, est un fait observable** : Legolas a re-mesuré et a trouvé. Le geste
qui fonctionne existe déjà ; il n'est simplement **pas obligatoire, pas outillé, et sans trace**.

**Conclusion de cadrage : il ne faut pas écrire une règle, il faut rendre le verdict coûteux à
falsifier.** Un verdict doit cesser d'être une **affirmation** pour devenir une **citation**.

### 5.2 Le principe à graver : un verdict sans sortie citée est **inopposable**

Formulation retenue — **une seule phrase**, à ajouter au corpus de méthode :

> **Un verdict de gate qui ne cite pas ses commandes et leurs sorties n'est pas un verdict :
> c'est une opinion. Il ne franchit rien.**

Le mot **inopposable** est le bon : on n'interdit pas à un agent d'écrire « PASS » (on ne peut pas),
on **retire toute valeur** au PASS non sourcé. La charge de la preuve bascule sur l'émetteur. Un
merge dont le message porte « gate PASS » sans rapport attaché est, par construction, un merge
**non gaté** — même s'il se trouve que le code était vert.

### 5.3 Instrument — **arbitrage Q-2**

Trois niveaux, du moins au plus outillé. **Je ne tranche pas seul : le niveau engage le décideur.**

**Niveau 1 — Format de rapport contraint (recommandé pour ce lot).**
Le verdict de gate n'est plus de la prose. C'est un tableau, où chaque ligne porte la **commande
exacte**, son **code de sortie** et la **ligne de résumé** copiée de la sortie :

| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run lint:all` | `0` | `(aucune sortie)` |
| `npm run test` | `0` | `Test Files 42 passed (42) / Tests 369 passed (369)` |

Règle d'usage : **une case vide, un « OK » sans chiffre, ou un résumé reformulé ⇒ FAIL**, sans
examen du fond. Un agent ne peut pas remplir ce tableau de mémoire : il faut avoir la sortie sous
les yeux. **Coût ≈ 0, aucune infrastructure, applicable dès le prochain gate.**

**Niveau 2 — Rapport horodaté ancré sur HEAD.**
Un script `npm run gate` enchaîne les commandes, écrit `.gate/report.json` :
`{ commit, date, commands: [{ cmd, exitCode, tail }] }`, et affiche le tableau du niveau 1. Le
verdict cite le rapport. **Un rapport dont le `commit` ≠ `HEAD` est périmé et ne vaut rien** — ce
qui ferme précisément le cas `8ae5748` : mesure faite avant l'ajout du fichier fautif.

**Niveau 3 — Garde outillée par hook.** Un `PreToolUse` sur le merge refusant un message
« gate … PASS » sans rapport frais.
**Déconseillé dans ce lot, pour trois raisons mesurées** : (a) `.claude/settings.local.json` **n'a
aucune section `hooks`** — le câblage est un **geste humain** (l'auto mode bloque l'édition des
settings de permissions/hooks) ; (b) les hooks de `global/hooks/` sont **vendorés depuis le canon
iakaframe** — les modifier ici créerait une seconde source de vérité, faute que la méthode
condamne ; (c) c'est de la sur-ingénierie avant d'avoir éprouvé le niveau 1.

**Recommandation : niveau 1 dans ce lot, niveau 2 en option ouverte, niveau 3 refusé pour
l'instant.** Motif : le niveau 1 est le seul qui soit **immédiatement opposable sans rien
installer**, et il suffit à rendre le mensonge de `8ae5748` impossible à écrire de bonne foi. Si
une récidive survient **malgré** le niveau 1, alors — et seulement alors — le niveau 2 est justifié
par un fait, pas par une crainte.

### 5.4 Où grave-t-on le principe ?

Le principe § 5.2 concerne **toute la méthode**, pas ce projet. Sa place canonique est le dépôt
`iakaframe` (`library/principles/`), pas `iakaFrameGUI`. **Ce lot ne peut donc pas le graver :
il est hors périmètre du dépôt.** → **Q-3**.

---

## 6. Décision — strate historique

**On ne réécrit pas l'historique git.** Interdit par la méthode (`git reset --hard` / `push
--force` proscrits côté IA), et `8ae5748` est un merge déjà poussé.

Le message de `8ae5748` restera donc **faux pour toujours**. C'est acceptable **à condition qu'il
ne soit pas le dernier mot**. Il faut une **trace de rectification consultable**.

**Décision : un registre de rectifications**, `specs/notes/rectifications.md`, en append seul :

```markdown
## 8ae5748 — « gate Legolas PASS » — RECTIFIÉ le 2026-07-21

**Ce que le message affirme** : gate Legolas PASS.
**Ce qui était vrai** : lint ROUGE — 11 erreurs ESLint dans
`packages/core/scripts/gen-fixtures.mjs` (10 × `no-undef` sur `process`,
1 × `no-irregular-whitespace`), introduites par ce même merge.
**Cause** : `eslint.config.js` n'accordait de globals Node à aucun `.mjs` hors racine.
**Découvert par** : Legolas, gate de D-7 (21/07), en re-mesurant.
**Fermé par** : lot D-8 (cette rectification).
**Portée** : incident unique. Les 7 autres commits « gate Legolas PASS » (15-16/07)
précèdent l'existence du fichier fautif — vérifié par `git cat-file -e`.
```

**Alternative écartée : `git notes`.** Techniquement idéale (attache la note au commit sans
réécrire), mais écartée : les notes ne sont **pas poussées par défaut** (`refs/notes/*` demande une
refspec explicite), Forgejo les affiche mal, et une rectification que personne ne voit ne rectifie
rien. Un fichier versionné est **moins élégant et plus lu**. → recommandation ; le décideur peut
préférer les deux (Q-5).

---

## 7. Critères d'acceptation

Numérotés, vérifiables, **cas nominal et cas de défaut**.

### Étape 0 — Vérification préalable (avant tout code)

**A-0** — **Cas nominal.** Rejouer le bornage du § 1.1 : pour chacun des 10 commits portant
« gate Legolas PASS », `git cat-file -e <commit>:packages/core/scripts/gen-fixtures.mjs`. Attendu :
**exactement 2** commits où le fichier existe (`8ae5748`, `e9add1a`), 8 où il est absent.
**A-0-bis** — **Cas de défaut.** Si le compte diffère de 2, **arrêter** et remonter au décideur :
le périmètre du lot change (le § 1.1 est faux). **Ne pas élargir le lot de sa propre initiative.**

### Outillage — ESLint

**A-1** — **Cas nominal.** `npx eslint packages/core/scripts/gen-fixtures.mjs` : **0 erreur, 0
avertissement**.
**A-2** — **Cas de défaut (anti-complaisance).** Ajouter temporairement `require('node:fs')` dans
`gen-fixtures.mjs` : le lint **DOIT** signaler `no-undef` sur `require`. Puis retirer la ligne.
*Prouve que `globals.nodeBuiltin` a bien été retenu, et non `globals.node`.* **Si ce test ne lève
rien, le § 4.1 a été mal appliqué** — critère en échec même si A-1 passe.
**A-3** — **Cas de défaut (non-régression du bloc vivant).** `npx eslint vite.config.ts` : **0
erreur**. *Prouve que le bloc l. 42-48 n'a pas été supprimé sur la foi du « probablement mort » du
brief (§ 3.3).*
**A-4** — **Cas de défaut (couverture future).** Créer un `packages/core/scripts/_probe.mjs`
contenant `process.exit(0)` : lint **vert**. Le supprimer. *Prouve que la réparation vise la
catégorie, pas le fichier.*

### Outillage — scripts et doc

**A-5** — `npm run lint:all` **existe** et sort avec le code **0**. Vérifier le **code de sortie**
(`echo $?`), pas l'absence de texte.
**A-6** — `npm run test:all` **existe** et sort avec le code **0**.
**A-7** — **Cas de défaut (invariant du § 4.2).** `node packages/core/scripts/gen-fixtures.mjs
--check` : la sortie annonce **`les 3 derivees sont a jour`** et le code de sortie est **0**. *Prouve
que la correction du BOM l. 81 n'a rien changé au comportement. Si des fixtures sont annoncées
« à regénérer », la correction a modifié la sémantique → critère en échec, ne pas regénérer les
fixtures pour faire passer le test.*
**A-8** — **Cas de défaut.** Aucune commande listée dans `CLAUDE.md` § « Commandes à utiliser » ne
sort en erreur « Missing script ». Vérification : lancer chacune. `quality-report.sh` **ne doit
plus y figurer**.
**A-9** — `CLAUDE.md` : la ligne `Stack :` est renseignée ; plus aucun `<!-- ex: -->` ni `# ex:`
dans les deux sections traitées.

### Non-régression

**A-10** — `npm run test` : suite **verte**, total **≥** au total d'avant lot. Le total est **cité
en chiffres** dans le rapport de gate, jamais « tout passe ».
**A-11** — `git diff` sur `packages/core/scripts/gen-fixtures.mjs` : **une seule ligne modifiée**
(l. 81). Toute autre ligne touchée est un dépassement de périmètre → critère en échec.
**A-12** — `iakaframe vendor-check` : statut **`clean`**. *(Prouve qu'aucun fichier vendoré de
`global/hooks/` n'a été modifié — cf. § 5.3 (b).)*

### Méthode

**A-13** — Le verdict de gate de **ce lot** est rendu au **format contraint du § 5.3 niveau 1** :
tableau commande / code de sortie / résumé cité. **Ce lot est son propre premier cas d'usage.**
**A-14** — **Cas de défaut.** Le tableau comporte au moins une ligne dont le résumé est une
**sortie réelle copiée** (avec ses chiffres). Un tableau intégralement rempli de `OK` sans aucun
chiffre ⇒ gate **FAIL**.

### Historique

**A-15** — `specs/notes/rectifications.md` existe et contient l'entrée `8ae5748` du § 6, avec les
5 rubriques (affirmé / vrai / cause / découvert par / fermé par).
**A-16** — **Cas de défaut.** `git log` est **inchangé** : aucun commit réécrit, aucun `--force`,
aucun `reset --hard`. Vérification : le SHA `8ae5748` est toujours joignable.

---

## 8. Répartition — délégable / geste humain

| Geste | Qui | Nature |
|---|---|---|
| A-0 (vérification préalable) | ⚒️ Gimli | délégable |
| § 4.1 `eslint.config.js` | ⚒️ Gimli | délégable |
| § 4.2 correction BOM l. 81 | ⚒️ Gimli | délégable |
| § 4.3 scripts `package.json` | ⚒️ Gimli | délégable — **après arbitrage Q-1** |
| § 4.4 remplissage `CLAUDE.md` | ⚒️ Gimli | délégable — **contenu validé par le décideur** (fichier de méthode) |
| § 6 registre de rectifications | ⚒️ Gimli | délégable |
| Vérification A-1 … A-16 | 🏹 Legolas | délégable — **et re-mesuré, jamais repris du rapport de Gimli** |
| **Arbitrages Q-1 … Q-5** | **🧔 le décideur** | **geste humain** |
| **Gravure du principe § 5.2 dans `iakaframe`** | **🧔 le décideur** | **geste humain — autre dépôt, hors périmètre de ce lot** |
| **Câblage d'un hook de gate (niveau 3)** | **🧔 le décideur** | **geste humain — `settings.local.json`, bloqué en auto mode** |

---

## 9. Questions au décideur

**Q-1 — `lint:all` : créer le script (A) ou corriger la doc (B) ?**
→ *Reco : **A**. B réécrirait des instructions livrées pour les aligner sur un outillage
défaillant, exactement ce que D-7 interdit (§ 4.3).*

**Q-2 — Niveau d'instrument pour le gate : 1 (format contraint), 2 (rapport ancré sur HEAD),
3 (hook) ?**
→ *Reco : **1 maintenant, 2 en option ouverte, 3 refusé**. Le niveau 1 est opposable sans rien
installer. Escalader avant d'avoir éprouvé le niveau 1, c'est sur-ingénierer une crainte (§ 5.3).*

**Q-3 — Le principe § 5.2 se grave dans `iakaframe` (canon). Ce lot le propose-t-il seulement, ou
ouvre-t-on un lot dédié dans l'autre dépôt ?**
→ *Reco : **lot dédié dans `iakaframe`**. Le graver ici en créerait une seconde source de vérité —
la faute que le § 5.3 (b) condamne par ailleurs.*

**Q-4 — `*.config.js` dans `ignores` : voulu ou hérité ?**
→ *Reco : **le garder et l'écrire** (commentaire d'une ligne : « le fichier de config ne se lint
pas lui-même — choix assumé »). Le retirer n'apporte rien et risque une cascade d'erreurs sur
`eslint.config.js` lui-même, hors sujet de ce lot.*

**Q-5 — Rectification : fichier versionné seul, ou fichier + `git notes` ?**
→ *Reco : **fichier seul**. Les notes ne sont pas poussées par défaut ; une rectification invisible
ne rectifie rien (§ 6).*

---

## 10. Hors scope

- **Réécriture de l'historique git** — interdit, et § 6 y répond autrement.
- **Assainissement des 7 commits « gate PASS » antérieurs** — hors sujet, ils précèdent le fichier
  fautif (§ 1.1). *Sauf si A-0 infirme ce bornage.*
- **Gravure du principe dans `iakaframe`** — autre dépôt (Q-3).
- **Câblage de hooks** dans `.claude/settings.local.json` — geste humain, niveau 3 refusé (§ 5.3).
- **Modification de `global/hooks/*.mjs`** — fichiers vendorés, source de vérité ailleurs.
- **Ajout de `cargo test` à `test:all`** — dépendance de toolchain, § 4.3.
- **Refonte de `eslint.config.js`** au-delà du bloc ajouté — A-3 et A-11 la proscrivent.
- **Les recettes humaines en attente** (U-10, G-8, B-7, B-10, P6b) — inchangées.

---

## 11. Estimation — gate P1→P2

| Poste | Charge |
|---|---|
| **C0** — A-0, vérification préalable du bornage | **0,1 j-h** |
| **C1** — Bloc `eslint.config.js` + BOM l. 81 (§ 4.1, 4.2) | **0,15 j-h** |
| **C2** — Scripts `package.json` + remplissage `CLAUDE.md` (§ 4.3, 4.4) | **0,15 j-h** |
| **C3** — Registre de rectifications (§ 6) | **0,1 j-h** |
| **C4** — Vérifications A-1 … A-16, dont les 6 cas de défaut | **0,25 j-h** |
| **Total** | **≈ 0,75 j-h** |

**Complexité : faible.** **Risque de régression : faible** — le lot est quasi intégralement
**additif** (un bloc ESLint, deux scripts npm, un fichier neuf). La seule ligne de code de
production modifiée est le littéral l. 81 de `gen-fixtures.mjs`, verrouillée par A-7 et A-11.

**Inconnues susceptibles de faire glisser l'estimation :**

1. **La plus probable — Q-2 vire au débat de méthode.** Le chiffrage suppose le **niveau 1**
   retenu. Si le décideur veut le niveau 2 (`npm run gate` + `.gate/report.json`), compter
   **+0,5 j-h** et un nouveau périmètre (format du rapport, ancrage HEAD, tests du script). Si le
   niveau 3 est retenu, c'est un **autre lot** — pas une extension de celui-ci. **C'est un risque
   de cadrage, pas d'exécution.**
2. **A-0 infirme le bornage du § 1.1.** Le cadrage n'a pas pu re-mesurer l'historique. Si plus de
   2 commits portent le fichier, le § 6 doit couvrir plusieurs incidents : **+0,25 j-h** et
   retour au décideur avant de continuer.
3. **Le remplissage de `CLAUDE.md` ouvre la question « quelle est la stack ? ».** Le champ est vide
   depuis l'origine ; le renseigner peut déclencher une discussion de fond sans rapport avec ce
   lot. **Repli : renseigner le factuel observable** (React 18.3 + TypeScript 5.5 + Vite 6 + Tauri 2
   + Vitest 4, workspaces npm) **sans ouvrir de débat d'architecture.**
4. **Effet de bord du bloc ESLint sur `global/hooks/*.mjs`.** Ces fichiers sont **ignorés**
   (`ignores: ["global"]`, l. 17), donc a priori intacts — mais si l'ignore venait à être levé, le
   nouveau bloc les prendrait en charge. **A-12 (`vendor-check clean`) garde ce flanc.**

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à confronter au
temps réel à la clôture du lot.

---

## 12. Sources (vérifications web du cadrage)

- ESLint — *Configuration Files* (flat config, `files`/`ignores`, `languageOptions.globals`) :
  https://eslint.org/docs/latest/use/configure/configuration-files
- ESLint — *Introduction to flat config* (ESM par défaut pour `.js`/`.mjs`) :
  https://eslint.org/blog/2022/08/new-config-system-part-2/
- typescript-eslint — *FAQs* (`no-undef` déconseillé sur TS, pertinent pour ne pas l'étendre aux
  `.ts`) : https://typescript-eslint.io/troubleshooting/faqs/eslint/

Versions constatées dans `package.json` : `eslint ^9.39.4`, `typescript-eslint ^8.61.1`,
`globals ^15.14.0`. `globals.nodeBuiltin` est disponible en v15 — **à confirmer par A-2**, qui
échouera bruyamment si l'export n'existe pas.
