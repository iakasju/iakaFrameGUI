# R1 — Porteurs de version déclarés : résorber la dérive du `package-lock.json` et fermer la garde d'alignement

> Lot d'**hygiène**, ouvert par le gate qualité du 2026-08-13 (dette R1). Renvoyé ici par
> ⚒️ Gimli, qui a refusé de le traiter dans le commit de bump pour ne pas en casser l'atomicité.
> Cadrage : 🔵 Gandalf, 2026-08-16.
>
> **Amendement du 2026-08-16 (post-gate, réserve `R-2` de 🏹 Legolas)** — le § Fichiers concernés
> et `AC-12` fermaient le périmètre sur **cinq** fichiers en oubliant **la présente instruction**,
> laissée `??` : la branche transportait donc du code dont la spécification n'était pas dans le
> dépôt. Corrigé ci-dessous — **six** fichiers, et le fichier d'instruction explicitement suivi.
> Seuls le § Périmètre (Inclus), le § Fichiers concernés, `R-g` et `AC-12` changent ; **aucune
> décision technique du lot n'est rouverte**.

---

## Problème

`package-lock.json` porte encore `0.1.4` — **deux fois** (racine `:3` et `packages[""]` `:9`) —
alors que le projet est publié en `0.1.7`. La garde `assertVersionsAligned`
(`scripts/publish-update.mjs:81`) ne compare que **quatre** porteurs (`package.json`,
`tauri.conf.json`, `Cargo.toml`, le tag) : ce cinquième porteur lui est invisible, et l'a
toujours été.

**Ce n'est pas un défaut de build, c'est un défaut de traçabilité.** Mesuré par 🏹 Legolas :
le couple (`package.json` 0.1.7 + lock 0.1.4) reconstitué en copie isolée sort `0` à
`npm ci --dry-run` — npm ne valide que la **concordance des dépendances**, jamais le champ
`version` racine du lock ([npm/cli#1177](https://github.com/npm/cli/issues/1177)). La version
gravée dans les binaires vient de `tauri.conf.json` et `Cargo.toml`. Rien ne casse ; le dépôt
ment simplement sur ce qu'il est.

**Et c'est une récidive.** `specs/etat-des-lieux.md:46` (2026-07-31) consigne mot pour mot le
même incident : *« le package-lock portait LUI AUSSI 0.1.0 en racine — **quatrième porteur
manqué au premier passage**, corrigé par npm »*. Il avait été remis à `0.1.4` **par npm**, puis
les bumps 0.1.5 → 0.1.6 → 0.1.7, faits à la main, l'ont à nouveau laissé sur place. Corriger la
valeur sans corriger ce qui la produit garantit une troisième occurrence.

---

## Le point de conception — arbitré : **énumérer**, mais déclarer

La question posée est réelle : le projet frère `iakaframe` a démontré que **les gardes qui
énumèrent leur périmètre ratent par construction** ce qui apparaît après elles. Ajouter une
cinquième ligne à une liste en dur reconduit la forme qui produit l'oubli.

**La découverte est pourtant écartée ici — non par économie, mais parce qu'elle serait fausse.**
Le dépôt a été inventorié : il ne porte pas *une* version déclinée en N exemplaires, mais
**quatre axes de versionnement indépendants**, et rien dans la forme d'un champ `version` ne les
distingue.

| Champ trouvé | Valeur mesurée | Axe | À aligner ? |
|---|---|---|---|
| `package.json:4` | `0.1.7` | produit | **oui** |
| `package-lock.json:3` (racine) | `0.1.4` | produit | **oui — dérive** |
| `package-lock.json:9` (`packages[""]`) | `0.1.4` | produit | **oui — dérive** |
| `src-tauri/tauri.conf.json:4` | `0.1.7` | produit (gravé au binaire) | **oui** |
| `src-tauri/Cargo.toml:3` | `0.1.7` | produit (gravé au binaire) | **oui** |
| tag git | `v0.1.7` | produit | **oui** |
| `src-tauri/Cargo.lock:1462` | `0.1.7` | produit, **auto-synchronisé par cargo** | non — jamais dérivé |
| `packages/core/package.json:3` | `0.1.0` | **bibliothèque distincte** | **NON — délibéré** |
| `updater/latest.json:2` | `0.1.7` | **état publié** (retarde par construction) | **NON — c'est la sortie** |
| `node_modules/**/package.json` | ×288 | dépendances tierces | non |

Deux lignes tranchent le débat :

- **`packages/core` est à `0.1.0` volontairement.** `specs/etat-des-lieux.md:46` :
  *« NON TRAITE VOLONTAIREMENT : packages/core reste en 0.1.0 (bibliotheque distincte,
  versionnement unique du monorepo **a trancher par le decideur**) »*. Une garde qui découvre les
  champs `version` le signalerait comme dérive et **forcerait par accident un arbitrage que le
  décideur a explicitement réservé**. Ce n'est pas un faux positif cosmétique : c'est la garde qui
  s'arroge une décision de produit.
- **`updater/latest.json` retarde légitimement.** Au moment où l'on bump vers `0.1.8`, le manifeste
  dit encore `0.1.7` — et c'est correct, il décrit ce qui est *publié*. L'aligner reviendrait à
  faire mentir la sortie du script sur son entrée.

Une découverte qui saurait écarter ces deux-là aurait besoin d'**une règle par axe** — soit une
énumération déguisée, doublée d'une liste d'exclusions à maintenir. Deux listes au lieu d'une, pour
un dépôt qui en compte cinq entrées : c'est l'usine à gaz, et elle serait moins sûre.

**Ce qu'on retient de la leçon `iakaframe` sans en copier la conclusion.** Le défaut n'est pas
« la liste est en dur », c'est « la liste est **muette** » : rien ne dit pourquoi une entrée y est,
rien ne dit ce qui est dehors, et rien ne casse quand on ajoute une entrée sans la brancher. Le lot
corrige **ces trois silences**, à coût quasi nul :

1. **Registre déclaré** — chaque porteur porte sa **raison** d'être gardé (`VERSION_CARRIERS`).
2. **Hors-couverture déclaré** — ce que la garde ne voit **pas**, et pourquoi
   (`VERSION_NON_CARRIERS`). *Une garde qui prétend tout voir et n'en voit qu'une partie est pire
   qu'une garde honnêtement énumérante* : on écrit donc l'aveu dans le code, pas dans un commentaire.
3. **Cliquet anti-omission** — un test assert que l'ensemble des clés **lues** est exactement
   l'ensemble des clés **déclarées**. Ajouter un porteur au registre sans câbler sa lecture rend le
   test **rouge**. C'est la seule vraie réponse mécanique à « on a oublié de le brancher ».

Et surtout, **on retire la main de la boucle** : `npm version <v> --no-git-tag-version` écrit
`package.json` **et** `package-lock.json` d'un seul geste
([npm-version](https://docs.npmjs.com/cli/v11/commands/npm-version) : *« write the new data back to
`package.json`, `package-lock.json`, and, if present, `npm-shrinkwrap.json` »*). Les deux porteurs
npm deviennent alors **incapables de diverger**, par construction et non par vigilance. Restent deux
fichiers édités à la main (`tauri.conf.json`, `Cargo.toml`) — tous deux déjà dans la garde.

**Ce que la garde ne couvrira pas, dit franchement** : le versionnement de `packages/core`, le
manifeste `updater/latest.json`, `Cargo.lock` (cargo s'en charge, vérifié à `0.1.7` ce jour), et
tout porteur qui apparaîtrait dans un **fichier neuf** sans être ajouté au registre. Ce dernier trou
est **assumé et déclaré** : il est le prix de l'énumération, il n'est pas comblé par ce lot.

---

## Décision retenue

1. **Étendre** `assertVersionsAligned` aux **deux** champs du `package-lock.json`, via un registre
   déclaré (raison par entrée) et un hors-couverture déclaré.
2. **Prouver la garde sur le défaut réel avant de le corriger** — l'ordre est contraignant (§ Étapes).
3. **Corriger** les deux champs du lock à `0.1.7`, sans toucher à l'arbre de dépendances.
4. **Graver le geste de bump** (`npm version`) dans `auto-update.md` pour tarir la source.
5. **Ne pas** implémenter de découverte des porteurs.

---

## Périmètre

**Inclus**

- `assertVersionsAligned` + `readRepoVersions` étendus au lock (2 champs distincts, cités séparément).
- `VERSION_CARRIERS` / `VERSION_NON_CARRIERS` exportés, avec raison par entrée.
- Cliquet anti-omission (test d'égalité des clés lues ↔ déclarées).
- Sentinelle permanente dans `test:all` : les 5 porteurs **de fichiers** du dépôt réel coïncident.
- Correction des deux champs de `package-lock.json` → `0.1.7`.
- Mise à jour des 3 tests existants de `describe("assertVersionsAligned…")` et du message de sortie
  `--check-only`.
- Documentation du geste de bump dans `specs/instructions/auto-update.md` (§ Étape 6).
- **La présente instruction, versionnée avec le lot** — elle en fait partie au même titre que le
  code qu'elle spécifie (cf. § Fichiers concernés, note *Une instruction fait partie de son lot*).

**Exclu — explicitement**

- ❌ **Toute découverte/scan** de porteurs de version. Arbitré ci-dessus.
- ❌ **`packages/core` (0.1.0)** — arbitrage décideur ouvert depuis le 2026-07-31, hors lot.
- ❌ **`updater/latest.json`** — sortie de la publication, retarde par construction.
- ❌ **`Cargo.lock`** — auto-synchronisé par cargo, mesuré aligné.
- ❌ **Aucun bump de version.** Le dépôt reste en `0.1.7`.
- ❌ **Aucune republication**, aucune release, aucun `updater/latest.json` réécrit.
- ❌ **`src-tauri/**` (Rust), `.github/workflows/**`, `src/**` (front)** — non touchés.
- ❌ Aucune montée de dépendance, aucun `npm audit fix`, aucun `npm update`.

---

## Étapes d'implémentation

> **L'ordre 1→2→3 est contraignant.** Corriger le lock avant d'étendre la garde priverait le lot de
> sa seule preuve intéressante : que la garde attrape le **défaut réel**, et pas une fixture écrite
> pour elle.

1. **Voir rouge sur le vrai défaut.**
   Étendre d'abord `readRepoVersions` + `assertVersionsAligned`, puis, **le lock encore à `0.1.4`** :
   ```
   node scripts/publish-update.mjs v0.1.7 --check-only
   ```
   → doit sortir **`1`** et citer `package-lock.json` et `0.1.4`. **Consigner la sortie verbatim**
   dans le rapport de remise : c'est la preuve AC-1, elle n'est plus reproductible après l'étape 3.

2. **Écrire les tests** dans `scripts/publish-update.test.mjs` (rouges avant l'implémentation
   complète, verts après) :
   - les 3 tests existants de `describe("assertVersionsAligned…")` (`:141-158`) reçoivent les 2
     champs de lock — leurs assertions actuelles sont **conservées**, jamais affaiblies ;
   - dérive **sur le lock seul** → l'erreur cite `package-lock.json` ;
   - lock **illisible/absent** (`null`) → échec `/illisible/`, jamais une supposition ;
   - **cliquet** : clés lues ≡ `Object.keys(VERSION_CARRIERS)` ;
   - chaque entrée de `VERSION_CARRIERS` **et** de `VERSION_NON_CARRIERS` porte une raison non vide ;
   - **sentinelle** : `readRepoVersions()` sur le dépôt réel → les 5 porteurs de fichiers sont égaux
     entre eux (le tag n'entre pas dans cette comparaison — un lot en cours n'est pas encore tagué).

3. **Corriger le lock**, sans toucher à l'arbre de dépendances :
   ```
   npm version 0.1.7 --no-git-tag-version --allow-same-version
   ```
   Si la commande n'écrit rien (version déjà identique dans `package.json`), **repli assumé** :
   éditer à la main les deux champs `:3` et `:9`. Le critère n'est pas la commande employée mais la
   **forme du diff** (AC-3).

4. **Aligner le message de sortie** `publish-update.mjs:460` — la parenthèse
   `(package/tauri.conf/Cargo/tag)` doit mentionner le lock. Et **corriger le `padEnd(16)`**
   (`:86`) : `package-lock.json (packages[""])` fait plus de 16 caractères et casserait l'alignement
   du détail d'erreur → calculer la largeur sur la plus longue clé.

5. **Rendre le message actionnable** : l'erreur de dérive doit dire **quoi faire** —
   `npm version <v> --no-git-tag-version --allow-same-version` — comme `assertNamedArchitectures`
   dit déjà le renommage attendu (`:154-156`). Une garde qui refuse sans indiquer la sortie
   reporte le travail sur celui qui la rencontre.

6. **Documenter le geste de bump** dans `auto-update.md` § Étape 6 : le bump passe par
   `npm version`, **jamais** par une édition manuelle de `package.json` ; `tauri.conf.json` et
   `Cargo.toml` restent à éditer à la main, et `--check-only` est le contrôle **avant de taguer**.

7. **Mesurer et remettre** : `npm run lint:all`, `npm run test:all`, `cargo test` dans `src-tauri/`
   — verdict au format contraint de `CLAUDE.md` (tableau commande / code de sortie / résumé cité).
   Aucun verdict en prose.

---

## Fichiers concernés

| Fichier | Ce qui change |
|---|---|
| `scripts/publish-update.mjs` | `VERSION_CARRIERS` + `VERSION_NON_CARRIERS` (nouveaux exports), `readRepoVersions` (`:102`) lit les 2 champs du lock, `assertVersionsAligned` (`:81`) les compare, `padEnd` (`:86`) calculé, message actionnable, log `:460` |
| `scripts/publish-update.test.mjs` | 3 tests mis à jour (`:141-158`) + ~6 tests neufs (dérive lock, illisible, cliquet, raisons, sentinelle) |
| `package-lock.json` | `:3` et `:9` → `0.1.7`. **Rien d'autre.** |
| `specs/instructions/auto-update.md` | § Étape 6 : geste de bump par `npm version`, `--check-only` avant tag |
| `CLAUDE.md` | backlog : dette R1 close, avec sa preuve (merge + mesure) |
| `specs/instructions/r1-porteurs-de-version-declares.md` | **la présente instruction** — ajoutée au dépôt (elle était `??`), plus cet amendement. **Commit distinct** (`docs:`), cf. ci-dessous |

> **Une instruction fait partie du lot qu'elle spécifie — règle, pas exception.** Ce dépôt a déjà
> tranché la question par l'usage : `git ls-files specs/instructions/` rend **40 fichiers suivis**,
> dont `auto-update.md` que ce lot modifie lui-même. Une instruction laissée hors dépôt fait pointer
> `CLAUDE.md` vers un fichier absent et rompt, par le lot lui-même, la traçabilité
> instruction ↔ commits que ce lot prêche. Le § Fichiers concernés d'un lot inclut donc **toujours**
> son propre fichier d'instruction ; l'omission ici était une erreur de rédaction, pas un arbitrage.
> *(Portée : cette note n'engage que ce lot — la graver comme règle de projet suppose d'écrire dans
> `CLAUDE.md` ou dans la méthode, hors périmètre de ce lot comme de l'écriture du cadrage. Item
> proposé au décideur, cf. mon message de remise.)*
>
> **Commit séparé, obligatoire.** L'ajout se fait dans un commit **`docs:` distinct**, jamais en
> amendant `881bd79` : `AC-3` exige que le commit de correction du lock porte `package-lock.json`
> **seul** (`2 insertions(+), 2 deletions(-)`), et sa preuve est déjà rendue. Un squash détruirait
> cette preuve.

---

## Risques

| # | Risque | Mitigation |
|---|---|---|
| R-a | `npm version` **churne l'arbre de dépendances** (résolutions `^` recalculées) et le lot embarque des montées de version silencieuses | AC-3 impose la **forme du diff** : `package-lock.json` seul, **exactement 2 lignes**. Tout diff plus large ⇒ `git checkout package-lock.json` et repli sur l'édition manuelle |
| R-b | `npm version` bump aussi les **workspaces** (`packages/*`) | Sans `--workspaces`, npm ne touche que la racine. **Vérifier explicitement** que `packages/core/package.json` reste à `0.1.0` (AC-4) — c'est l'arbitrage réservé du décideur |
| R-c | Les 3 tests existants sont **réécrits** : occasion classique d'affaiblir une assertion en la « mettant à jour » | Les assertions actuelles (`/tauri\.conf\.json/`, `/illisible/`) sont **conservées mot pour mot** ; on n'ajoute que les champs de lock |
| R-d | La garde durcie **bloque une publication future** légitime | C'est l'effet recherché. Le message dit la commande de sortie (étape 5). `--check-only` reste sans garde de branche (`publish-update.test.mjs:261-273`) : utilisable depuis une branche de feature |
| R-e | La sentinelle dans `test:all` rougit **pendant** un bump en cours | Elle ne compare que les **fichiers entre eux**, jamais au tag. Un bump par `npm version` + édition des 2 fichiers Tauri les laisse alignés à tout instant |
| R-f | **Trou assumé** : un porteur de version dans un fichier **neuf** restera invisible | **Déclaré**, pas masqué : `VERSION_NON_CARRIERS` et l'en-tête du registre le disent. C'est le prix de l'énumération, arbitré ci-dessus |
| R-g | La présente instruction reste **hors dépôt** (`??`) : mergée telle quelle, la branche livre du code sans sa spécification, `CLAUDE.md:244` pointe vers un fichier absent, et le lot rompt la traçabilité qu'il prêche | Ajoutée au § Fichiers concernés et **exigée suivie par `AC-12`**. Ajout en commit **`docs:` distinct** pour ne pas altérer la preuve d'`AC-3`. Découvert au gate du 2026-08-16 (réserve `R-2`) |

---

## Critères d'acceptation

- [ ] **AC-1 — la garde attrape le défaut réel, avant sa correction.** Sortie verbatim de
      `node scripts/publish-update.mjs v0.1.7 --check-only`, lock encore à `0.1.4` : code de sortie
      **`1`**, message contenant `package-lock.json` **et** `0.1.4`. Preuve consignée dans la remise
      (non reproductible après AC-3).
- [ ] **AC-2 — vu rouge avant vu vert.** Les tests neufs de l'étape 2 échouent sur la version
      **non étendue** de `assertVersionsAligned` ; consigner le compte d'échecs observé.
- [ ] **AC-3 — correction chirurgicale.** `git diff --stat` sur le commit de correction :
      `package-lock.json` **seul**, `2 insertions(+), 2 deletions(-)`. Aucune ligne de dépendance
      touchée.
- [ ] **AC-4 — l'arbitrage réservé est intact.** `packages/core/package.json` porte toujours
      `0.1.0` après le lot (`grep '"version"' packages/core/package.json`).
- [ ] **AC-5 — alignement rétabli.** `node scripts/publish-update.mjs v0.1.7 --check-only` →
      code de sortie **`0`**, message citant les 5 porteurs de fichiers + le tag.
- [ ] **AC-6 — cliquet anti-omission opérant.** Ajouter une entrée à `VERSION_CARRIERS` **sans**
      câbler sa lecture rend le test rouge ; le prouver par une modification temporaire, puis la
      révoquer (l'arbre final est propre).
- [ ] **AC-7 — hors-couverture déclaré.** `VERSION_NON_CARRIERS` est exporté et cite **au moins**
      `packages/core/package.json`, `updater/latest.json` et `src-tauri/Cargo.lock`, chacun avec sa
      raison. Un test le vérifie.
- [ ] **AC-8 — message actionnable.** Un test assert que l'erreur de dérive contient
      `npm version` (la commande de sortie), pas seulement le constat.
- [ ] **AC-9 — sentinelle permanente.** Un test de `test:all` (hors chemin de publication) échoue si
      les 5 porteurs de fichiers divergent. Le prouver en désalignant temporairement le lock.
- [ ] **AC-10 — non-régression mesurée.** `npm run lint:all` → `0` ; `npm run test:all` → `0`, avec
      le compte **avant / après** cité (attendu : `+6` tests environ, `0` test supprimé) ;
      `cargo test` → `0`. Verdict au format contraint de `CLAUDE.md`.
- [ ] **AC-11 — la source est tarie.** `auto-update.md` § Étape 6 prescrit `npm version` et interdit
      l'édition manuelle de `package.json` ; `CLAUDE.md` inscrit R1 close **avec sa preuve**.
- [ ] **AC-12 — périmètre tenu, spécification comprise.** Deux faces, toutes deux mesurées :
      **(a)** `git diff --name-only` sur le lot ⊆ les **6** fichiers du § Fichiers concernés —
      `src-tauri/**`, `src/**` et `.github/**` **inchangés** (porcelain vide sur ces chemins) ;
      **(b)** la spécification du lot est **dans le dépôt** :
      `git ls-files --error-unmatch specs/instructions/r1-porteurs-de-version-declares.md` → code de
      sortie **`0`**, et `git status --porcelain specs/instructions/` ne rend **aucun `??`**. Aucun
      merge tant que (b) échoue : `CLAUDE.md:244` cite cette instruction, il ne doit pas citer un
      fichier absent.

---

## Estimation (jalon P1→P2)

| Composante | Valeur |
|---|---|
| **Équivalent jour-homme** | **0,5 j-h** (~3-4 h) — dont la moitié en tests et en mesures |
| **Complexité / risque** | **Faible.** Aucune logique métier, aucun réseau, aucun Rust. Le seul geste à surveiller est le diff de `npm version` (R-a) |
| **Inconnues** | (1) `npm version --allow-same-version` écrit-il le lock quand la valeur ne change pas ? Repli documenté = édition manuelle 2 lignes. (2) Coût réel de mise à jour des 3 tests existants s'ils s'avèrent plus couplés que lu. (3) La sentinelle AC-9 peut demander un petit utilitaire de lecture isolé si `readRepoVersions` s'avère difficile à pointer sur un dépôt jetable |

Ordre de grandeur assumé et révisable — **pas un engagement ferme**. À confronter au temps réel à
la clôture du lot.

---

## Sources vérifiées (2026-08-16)

- [npm-version](https://docs.npmjs.com/cli/v11/commands/npm-version) — écrit la version dans
  `package.json` **et** `package-lock.json` ; `--no-git-tag-version` désactive commit et tag.
- [npm-install](https://docs.npmjs.com/cli/v11/commands/npm-install) — `--package-lock-only` :
  *« only use the package-lock.json, ignoring node_modules »* (repli non retenu : recalcule les
  résolutions, cf. R-a).
- [npm/cli#1177](https://github.com/npm/cli/issues/1177) — `npm ci` ne détecte pas toutes les
  désynchronisations racine ; corrobore la mesure de 🏹 Legolas (`npm ci --dry-run` → `0`).
- Mesures locales de ce cadrage : `package.json:4` = `0.1.7` ; `package-lock.json:3` et `:9` =
  `0.1.4` ; `src-tauri/tauri.conf.json:4` et `src-tauri/Cargo.toml:3` = `0.1.7` ;
  `src-tauri/Cargo.lock:1462` = `0.1.7` ; `packages/core/package.json:3` = `0.1.0` ;
  `updater/latest.json:2` = `0.1.7`.
- Récidive documentée : `specs/etat-des-lieux.md:46` (2026-07-31).
