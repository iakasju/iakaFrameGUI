# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est lu en priorité par Claude Code à chaque session.
> Pour la vision complète du projet, lire `specs/PROJET.md`.
> Pour la méthode de collaboration, voir `methode-de-travail.md` (iakaframe).

---

## Rôles (rappel)

- **Cowork** (réflexion) rédige les instructions dans `specs/instructions/`. Il ne
  modifie jamais le code.
- **Claude Code** (toi) lis l'instruction correspondante AVANT chaque tâche, puis
  implémentes, builds, testes et commites.

---

## Ce qu'est ce projet

**iakaFrameGUI — la forge de la méthode iakaframe** : authoring de teams *pures*
(teams, méthodes, bindings, workflows, kits), dans une coquille de bureau. Elle
**crée et livre** ; le cockpit réceptionne et exécute.

Stack : React 18.3 + TypeScript 5.5 + Vite 6 + Tauri 2 (Rust 2.11) + Vitest 4,
monorepo **npm workspaces** (`packages/*`, dont `@iakaframe/core`).

---

## Commandes à utiliser

> **Invariant** : cette liste ne contient **que des scripts réellement exposés** par
> `package.json`. Une commande documentée mais inexistante est pire qu'absente — elle
> transforme un `Missing script` en faux vert pour qui ne lit pas la sortie. Toute
> commande ajoutée ici doit l'être **en même temps** que le script correspondant.

```bash
npm run dev            # démarrer le front en dev (Vite)
npm run tauri dev      # démarrer l'app de bureau complète (front + Rust)
npm run build          # build de prod (tsc && vite build)
npm run preview        # servir le build de prod

npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run lint:all       # typecheck + lint   <- mesure de gate

npm run test           # vitest run
npm run test:all       # la suite FRONT seule (vitest)   <- mesure de gate, ligne 1
npm run test:rust      # cargo test dans src-tauri/      <- mesure de gate, ligne 2 OBLIGATOIRE
npm run test:coverage  # vitest run --coverage
npm run test:vendor    # parité des atomes vendorés      <- HORS gate
npm run test:convergence  # byte-identité des fichiers partagés avec l'app jumelle <- HORS gate
```

Côté Rust, dans `src-tauri/` : `cargo test`, exposé par **`npm run test:rust`**.
**Volontairement hors de `test:all`** : en dépendre rendrait la mesure faillible sur toute machine
sans toolchain Rust. Cet arbitrage est écrit **dans le `package.json` lui-même** (clé `//test:all`)
et **ce lot ne le rouvre pas** — il corrige la **prétention**, pas le script (L41, D-5). Conséquence
non négociable : un verdict de gate porte `npm run test:rust` sur une **ligne distincte**
(cf. § *Rendre un verdict de gate*), et n'écrit **jamais** « les suites complètes ».

### Convergence avec l'application jumelle

Un jeu de fichiers est **byte-identique** avec l'autre application (gardes de canal, instrument de
mesure, table de conformité, instructions partagées). Leur registre d'empreintes vit dans
`fixtures/convergence.sha256`, et la garde est à **deux faces** :

- **face locale**, `npm run test:all` (dans `scripts/__tests__/forge-host-parity.test.mjs`) : les
  empreintes versionnées. Elle attrape l'édition **en place** d'une copie ;
- **face croisée**, `npm run test:convergence` : comparaison octet à octet des deux arbres de
  travail. **Hors gate** — elle dépend du dépôt frère, et **SKIP proprement** (exit `0`) sans lui.
  `IAKA_CONVERGENCE_HOME` désigne un frère explicite, et il est **autoritaire**.

**Règle opératoire** : tout fichier de ce registre se modifie **dans les deux dépôts au même commit
logique**, puis on **régénère les empreintes** (commande en tête de
`fixtures/convergence.sha256`) et on rejoue `npm run test:convergence`.

### Chaîne de publication de la mise à jour (scripts Node, hors `package.json`)

Ces deux-là ne sont **pas** des scripts npm : ce sont des gestes de publication, invoqués
nommément. L'invariant ci-dessus vaut quand même — ils existent tous les deux.

```bash
node scripts/publish-update.mjs vX.Y.Z                 # release GitHub → Forgejo + latest.json
node scripts/publish-update.mjs vX.Y.Z --check-only    # garde d'alignement des versions seule
node scripts/publish-update.mjs vX.Y.Z --dry-run       # le manifeste sur stdout, RIEN d'écrit
node scripts/publish-update.mjs vX.Y.Z --pub-date 2026-01-01T00:00:00Z   # date figée (L40)
```

`--pub-date` (défaut : maintenant) rend la publication **reproductible** : deux exécutions sur
le même tag avec la même date produisent un `updater/latest.json` **identique à l'octet**. Les
messages de progression sortent sur **stderr** — stdout ne porte que le manifeste.

```bash
node scripts/mesurer-artefacts.mjs                     # mesure et ÉCRIT updater/mesures.json
node scripts/mesurer-artefacts.mjs --dry-run           # mesure et affiche, sans écrire
# --- L42 — LA VITRINE ------------------------------------------------------------------------------
# La section « Installation » du README est GENEREE entre marqueurs (`<!-- vitrine:debut:<zone> -->`) :
# elle ne s'edite plus a la main. La version annoncee est DERIVEE de `package.json` (l'autorite), les
# noms de fichiers de `fixtures/vitrine-assets.json` (table BYTE-IDENTIQUE avec l'app jumelle), et le
# nom du produit de `productName` (src-tauri/tauri.conf.json) — la source que le BUNDLER emploie
# lui-meme pour nommer ses artefacts.
npm run vitrine              # reecrit les zones du README depuis l'autorite
npm run vitrine:check        # compare sans ecrire (code 1 si derive) — la meme chose que la garde
npm run vitrine:en-ligne     # FACE EN LIGNE, HORS GATE : anonyme, sans jeton, point de vue du visiteur
# Codes de `vitrine:en-ligne` : 0 concorde · 1 ecart(s) · 3 NON MESURE (pas de reseau — JAMAIS un vert).
#
# PROMIS = NOMME HORS D'UN BLOC D'ABSENCE DECLAREE — pas « ligne de tableau ». Le README promet des
# qu'il nomme un artefact ailleurs que dans le bloc « ⚠️ Non fourni » : prose, note ou tableau, c'est
# la meme promesse pour un visiteur. Restreindre la regle au tableau laissait passer une phrase en
# prose annoncant un `.dmg` inexistant, VERTE sur les deux faces (angle mort mesure puis ferme). Une
# plateforme qu'on ne livre pas se DECLARE dans `fixtures/vitrine-locale.json` ; elle ne se glisse
# pas dans un paragraphe.
#
# DEUX FACES, ET IL EN FAUT DEUX :
#   — LOCALE, dans `npm run test` (scripts/__tests__/vitrine.test.mjs) : rejoue le generateur en
#     memoire et compare au README versionne. Deterministe, hors reseau. Elle ne voit PAS un
#     changement de convention du bundler : elle compare deux derives de la MEME table.
#   — EN LIGNE, ci-dessus : la SEULE a confronter la table au monde reel (l'asset existe-t-il ? un
#     asset installable est-il tu ?). Hors gate parce qu'elle depend d'un tiers.
#
# ⚠️ CREER UNE RELEASE SUR UN TAG ANCIEN VOLE LE `latest` — la REPUBLIER, non. Mesure du
# 2026-08-29 (L43), LUE dans la source du SHA epingle par L41 : `createRelease` y est appele SANS
# `make_latest`, donc au defaut `true` ; mais `getOrCreateRelease` renvoie une release DEJA
# EXISTANTE telle quelle, sans aucun `updateRelease` — republier un tag dont la release existe ne
# touche donc PAS au drapeau, A CE SHA. RECTIFICATION : ce bloc disait, jusqu'au 2026-08-29,
# « REPUBLIER un tag ancien vole le latest » ; c'etait FAUX ici. L'incident iakaFrameGUI (v0.1.5 et
# v0.1.6 republiees le 18/08 apres v0.1.7 du 13/08) etait une CREATION, pas une mise a jour. Sur
# IakaCockpit, 25 tags sur 29 ne portent AUCUNE release (mesure du 2026-08-29) : les « republier »
# revient a en CREER une, donc a voler le `latest` ; sur iakaFrameGUI les quatre tags de version
# portent tous une release.
#
# ⚠️ ET LE JOB `latest` DU WORKFLOW N'EMPECHE PAS CE VOL — IL NE LE REPARE PAS NON PLUS.
#
# CE QUI EST MESURE, et rien de plus. Banc `iakasju/latest-contrefactuel`, run `33277643229`
# du 2026-08-29 : apres un vol REEL (creation de `v0.2.0` sans `--latest`, le `latest` passe de
# `v0.10.0` a `v0.2.0`), le job a pose `--latest=false` sur la release voleuse, et
# `GET /repos/.../releases/latest` a rendu `v0.2.0` — ligne du log :
# `VERIFICATION : latest effectif = v0.2.0 (attendu : v0.10.0)`, job ROUGE.
# CONCLUSION SURE, et la SEULE : la branche `--latest=false` NE REND PAS le `latest` au plus
# haut semver. C'est ce qui suffit a savoir qu'il ne faut pas compter dessus.
#
# CE QUI N'EST PAS MESURE — ecrit ici comme un fait jusqu'au 2026-08-30, RETROGRADE depuis :
# le MECANISME. « `make_latest=false` est un NO-OP », « il n'y a aucun repli » : DEDUCTION, pas
# mesure. La seule mesure existante NE DISCRIMINE RIEN — au moment ou elle a ete prise, la
# release voleuse `v0.2.0` etait AUSSI la plus recente par `created_at` (`22:20:00Z`, contre
# `22:10:00Z` pour `v0.9.0` et `22:01:35Z` pour `v0.10.0` ; dates forgees par les dates de
# commit, re-verifiees le 2026-08-30). « Drapeau inamovible » et « drapeau retire, repli par
# date » predisent donc EXACTEMENT la meme observation.
#
# CE QUI TRANCHERAIT, a cout nul — mais c'est un ACTE DE RELEASE, refuse aux agents :
#   gh release edit v0.10.0 --latest=false --repo iakasju/latest-contrefactuel
#   gh api repos/iakasju/latest-contrefactuel/releases/latest --jq .tag_name
# Le banc ne porte plus que deux releases (mesure du 2026-08-30) : `v0.10.0` (plus haut semver,
# `created_at` le plus ANCIEN, porteuse du `latest`) et `v0.9.0` (plus recente par date). Donc :
# drapeau inamovible ⇒ `v0.10.0` ; repli par date ⇒ `v0.9.0`. CONDITION DE LEVEE de la reserve :
# ce geste joue par le decideur, et sa sortie citee ici. Tant qu'il ne l'est pas, on ecrit
# « la branche `--latest=false` ne rend pas le `latest` » et RIEN sur le pourquoi.
#
# CE QUE LE JOB FAIT est mesure, lui : il DETECTE le vol (ligne `VERIFICATION : latest
# effectif = ...`), ROUGIT, et DICTE le rattrapage `gh release edit <PLUS_HAUT> --latest --repo
# <DEPOT>`. ⚠️ Que ce rattrapage FONCTIONNE n'a PAS de trace non plus — aucun run, aucun log.
# Le banc porte aujourd'hui `latest = v0.10.0`, mais la suppression de `v0.2.0` suffit a
# l'expliquer : les deux gestes sont confondus. A RE-MESURER avant d'en refaire un fait ; le
# « fonctionne en < 3 s » qui figurait ici est retire pour la meme raison que le NO-OP.
# Ne pas retirer le job — c'est le seul detecteur — et ne pas chercher a le remplacer par une
# entree de `tauri-action` : le SHA epingle par L41 n'en expose aucune.
```

`updater/mesures.json` n'est **jamais** écrit à la main. Il est produit par ce script, qui
télécharge chaque clé de plateforme **en anonyme** (aucun jeton), calcule `octets` + `sha256`,
vérifie la signature minisign du manifeste contre l'**octet servi** (signature globale + keyid),
et rejoue chaque signature sur un octet altéré (**témoin négatif**, qui doit rendre `invalide`).
Son champ `mesurePar` cite cette commande, et elle se relance : deux exécutions consécutives ne
diffèrent que par `mesureLe`. **La provenance déclarée par ce fichier était FAUSSE avant L40** —
elle nommait `iakaframe endpoints`, qui fait un `HEAD` et ne calcule ni `sha256` ni signature.

Le manifeste porte **neuf clés** depuis L40 : les quatre génériques `{os}-{arch}` (inchangées,
donc aucun client existant ne change de comportement) et cinq clés d'installeur
`{os}-{arch}-{installer}` — que `tauri-plugin-updater` cherche **en premier**. La table de
conformité `fixtures/updater-cles.json` est **byte-identique** avec celle d'`IakaCockpit`.

---

## Rendre un verdict de gate

**Un verdict de gate qui ne cite pas ses commandes et leurs sorties n'est pas un
verdict : c'est une opinion. Il ne franchit rien.**

Un « gate PASS » non sourcé est **inopposable** : la charge de la preuve pèse sur
l'émetteur, et un merge qui l'affirme sans mesure attachée est, par construction, un
merge **non gaté** — même s'il se trouve que le code était vert. Motif : le merge
`8ae5748` portait « gate Legolas PASS » alors que le lint était rouge
(cf. `specs/notes/rectifications.md`).

Tout verdict se rend donc dans ce **format contraint** — un tableau, jamais de la prose :

| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run lint:all` | `0` | `(aucune sortie)` |
| `npm run test:all` | `0` | `Test Files 53 passed (53) / Tests 496 passed (496)` |
| `npm run test:rust` | `0` | `test result: ok. 116 passed; 0 failed` |

**`npm run test:rust` est une LIGNE OBLIGATOIRE, jamais fondue dans une autre** (L41, défaut D-5).
Motif : `test:all` n'exécute **que** la suite front et **exclut volontairement** `cargo test` — un
arbitrage écrit et motivé de ce dépôt (dépendre d'une toolchain Rust rendrait la mesure faillible
sur toute machine qui ne l'a pas), inscrit aussi **dans le `package.json` lui-même**. Ce n'est donc
pas la commande qui mentait, c'est **le critère** de L40, qui écrivait « les suites complètes sont
vertes » en la nommant. Un verdict qui écrit « les suites complètes » **sans nommer les commandes
une par une** vaut **FAIL** : on nomme, on ne résume pas.

Règles d'usage, appliquées **sans examen du fond** :

- une case **vide**, un **« OK » sans chiffre**, ou un résumé **reformulé** ⇒ **FAIL** ;
- une formule d'ENSEMBLE (« les suites complètes », « tout est vert ») ⇒ **FAIL** : chaque
  commande a **sa** ligne, avec **son** code de sortie et **son** chiffre ;
- un critère **non mesuré** se déclare *non mesuré*, **jamais** *PASS* ;
- une mesure **reprise du rapport d'un autre agent** n'est pas une mesure : on
  **re-mesure**. C'est ce geste — et lui seul — qui a révélé l'incident `8ae5748`.

---

## Conventions

- **Langue du code** : anglais (identifiants, commits techniques).
- **Langue de la doc et des échanges** : français.
- **Commits** : *conventional commits* (`feat:`, `fix:`, `docs:`, `chore:`, `wip:`).
- **Commits atomiques et fréquents** : après chaque étape logique (filet de
  sécurité pour pouvoir revenir en arrière). Jamais de `reset --hard` ni de
  `push --force` de ton côté.
- **MVP d'abord, puis itérer.** Pas de sur-ingénierie.
- **Self-hosted / open-source d'abord** pour tout choix de backend ; cloud en
  fallback justifié seulement.
- **Réutiliser l'existant** (infra, services, MCP) avant de réimplémenter.
- En dev, **mocker les appels API** coûteux/limités (voir `specs/mock/`).

---

## Dépôt git : Forgejo (iakabox)

Remote par défaut : **Forgejo LAN** `http://192.168.2.11:3001/sjupin/<repo>.git`,
**HTTP + token** (SSH inutilisable). Token via `$env:FORGEJO_TOKEN` ou `.git/config`
local — **jamais commité**. Voir `iakabox-usage.html` (iakaframe) pour clone/push,
création de dépôt (API, description **ASCII**) et rotation de token.

## Cycle de documentation (état des lieux)

Régénérer l'état des lieux **à chaque changement de version** et **à chaque pause /
préparation de reprise** :

```powershell
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason version -Version vX.Y.Z -Note "..."
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason pause   -Note "où on s'arrête, quoi reprendre"
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason reprise -Note "reprise"
```

Génère `specs/etat-des-lieux.md` + `.html` (faits git auto). **Compléter le récit de
reprise** dans le `.md` (ce qui vient d'être fait, ce qui reste, prochaine étape).

---

## Avant toute tâche non triviale

1. Lire l'instruction correspondante dans `specs/instructions/`.
2. Si elle n'existe pas → le signaler ; ne pas improviser une feature lourde sans
   spec. Proposer un plan court d'abord.
3. Implémenter étape par étape, avec commits intermédiaires.
4. Lancer typecheck + lint + tests avant de considérer la tâche finie.
5. Pour toute action vraiment destructive hors denylist : **demander confirmation
   par message texte avant d'agir.**

---

## Backlog

<!-- Liste des features priorisées. Chaque entrée pointe vers son instruction. -->

> Reste à faire sur **iakaFrameGUI**, au **2026-07-25** (reprise). État détaillé et récit de
> reprise : `specs/etat-des-lieux.md`. **Ce backlog n'inscrit un item comme livré qu'avec sa
> preuve** (merge + mesure) : un item coché sans référence est à re-mesurer, pas à croire.
>
> **Santé mesurée à la reprise du 2026-07-25** (`main` `c88e8bf`, arbre propre) :
> `npm run lint:all` → exit `0`, aucune sortie ; `npm run test:all` → exit `0`,
> `Test Files 56 passed (56) / Tests 518 passed (518)`. **`cargo test` non mesuré** à la reprise.

### Ouvert — à trancher ou à cadrer (avant tout code)

- [ ] **`GARDE-ALIGNEMENT-SORTIE-DERIVEE`** — **la garde des porteurs NOMME le 6e, mais ne sait pas
      le réparer.** *Constaté pendant le bump `v0.1.8` (2026-08-29), **déclaré et non corrigé** :
      élargir une garde au passage d'un bump mêlerait une correction de garde à une preuve de bump.*
      **Ce qui va bien** : `assertVersionsAligned` **voit** la dérive du README et la **nomme** —
      mesuré en direct, `README.md (section Installation, zone` `vitrine:binaires` `) 0.1.7` face à
      un tag `0.1.8`, exit `1`. La **couverture** n'est pas en cause.
      **Ce qui cloche** : la ligne `sortie :` du même message ne prescrit que
      `npm version … --no-git-tag-version` **et** l'édition à la main de `tauri.conf.json` /
      `Cargo.toml`. **Aucune des trois ne touche le README** — le remède réel est `npm run vitrine`.
      Un opérateur qui suit le message **à la lettre** laisse la dérive en place et relance la garde
      en boucle. Ce dépôt tient l'**actionnabilité** du message pour un critère, pas pour un confort
      (dette R1 : « message d'erreur **actionnable** (il dicte `npm version`) »).
      **Même origine, compte périmé** : `auto-update.md` § 6-0, les commentaires de
      `assertVersionsAligned` et `readRepoVersions`, et le `describe` de la sentinelle disent tous
      **cinq** porteurs — il y en a **six** depuis L42. Le **code** dérive le nombre du registre et
      reste juste ; c'est la **prose** qui est fausse, et c'est elle qu'on lit en panne.
      **Condition de levée** : un lot qui rend la ligne `sortie :` **dérivée** de
      `VERSION_CARRIERS` — chaque entrée portant, à côté de sa `reason`, **la commande qui la
      répare** — au lieu de l'énumérer en dur. Les compteurs périmés tombent avec, sans être un
      geste séparé.

- [ ] **`ROUGE-NON-REPRODUIT-RETRAITPANEL`** — **un rouge isolé dans la suite de gate, jamais
      revu.** *Observé le 2026-08-29 pendant les contrefactuels du bump `v0.1.8`.* Un run de
      `npm run test` a rendu `Tests 1 failed | 1259 passed (1260)` sur
      `src/forge/ateliers/RetraitPanel.test.tsx > … > VUE Option 1 : les skills du persona sont
      rendus depuis skills:[] avec un « − » par titre`. **La mutation en cours à cet instant portait
      sur `src-tauri/Cargo.lock`** — un fichier qu'aucun test React ne lit : le rouge **ne peut pas**
      en découler.
      **Non reproduit** : `4` suites complètes vertes (`1260/1260`) et `5` exécutions isolées du
      fichier vertes (`8/8`) après coup, arbre propre. **Ce qui n'est donc PAS établi** : que le test
      soit intermittent — une seule occurrence ne fait pas une loi, et la cause (ordonnancement des
      workers vitest, ou aléa de la machine) **n'est pas mesurée**.
      **Pourquoi l'inscrire quand même** : un rouge intermittent dans `test:all` atteindrait le
      **gate lui-même**, qui est l'instrument dont tout le reste dépend. Le taire parce qu'il n'est
      pas reproductible reviendrait à ne le voir qu'au moment où il coûte cher.
      **Condition de levée** : une seconde occurrence — qui donnerait une cause à chercher — ou une
      campagne de `N` runs consécutifs verts jugée suffisante par le gate pour clore l'observation.

- [ ] **L43** — **Contrefactuel du vol de `latest` : la branche `--latest=false` est INERTE**
      *(2026-08-29 — répétition en dépôt jetable faite ; contrefactuel réel NON fait, suspendu.)*
      Instruction : `iakaframe/specs/instructions/contrefactuel-du-vol-de-latest.md` ; procédure du
      décideur : `…/contrefactuel-ca5-procedure-decideur.md`.
      **FAIT — prose rectifiée** : le cartouche `release.yml:130-146` et le bloc `⚠️ REPUBLIER…` de
      ce `CLAUDE.md` affirmaient deux choses **fausses**, corrigées **en les datant**, pas en les
      effaçant. (i) « Republier un tag ancien vole le `latest` » : FAUX au SHA épinglé — lu dans
      `tauri-action@84b9d35b`, `getOrCreateRelease` renvoie une release **existante telle quelle**,
      sans `updateRelease` ; **le vol vient de la CRÉATION** (`createRelease` sans `make_latest`,
      défaut `true`). (ii) « Le job `latest` est ce qui l'en empêche » : FAUX aussi.
      **FAIT — répétition (V-D), dépôt privé `iakasju/latest-contrefactuel`, conservé (AR-4)** :
      topologie fabriquée sur trois commits distincts (`v0.10.0` plus haut semver / `created_at` le
      plus ancien · `v0.9.0` · `v0.2.0` le plus récent · tag `archive/feat/x`). **Mesuré** :
      `gh release create v0.2.0` sans `--latest` → `releases/latest` passe de `v0.10.0` à `v0.2.0`
      (**le vol est réel**) ; run `33277643229`, `plus haut semver: v0.10.0` (tri `sort -V` + filtre
      corrects sur le cas de bord `0.9` vs `0.10`), `DECISION : v0.2.0 n'est PAS le plus haut` →
      `--latest=false` **accepté**, et `VERIFICATION : latest effectif = v0.2.0 (attendu : v0.10.0)`.
      **DÉCOUVERTE MAJEURE** : `make_latest=false` est un **NO-OP** sur `GET /releases/latest`.
      Vérifié **quatre fois** — via `gh release edit --latest=false` sur la release au `created_at`
      le plus **ancien** et sur celle au plus **récent**, et via un `PATCH` REST **brut** hors `gh`.
      Ni repli par date, ni repli par semver : **aucun repli**. La branche `--latest=false` du job
      **ne rend rien**. En revanche `gh release edit <PLUS_HAUT> --latest` **fonctionne en < 3 s** :
      la procédure de restauration est **validée par la mesure**.
      **FAIT — transport de preuve (CA-5.8)** : le banc télécharge `release.yml` d'`IakaCockpit@main`
      et compare le bloc `latest:` octet à octet (`sha256`
      `3547f66746fae90721879ad0115cb84764ff5a2da5c07fd251b75c2634457173`). **Contrefactuel joué** :
      un octet muté (`publie`→`Publie`) → rouge **nommé** avec le `diff` et les deux empreintes
      (run `33278026605`) ; **révocation par `git revert`**, `sha256` revenu à l'origine et run vert
      (`33278079380`). Le banc n'est pas décoratif.
      **NON FAIT — AR-2 tombe, faute mesurée** : les deux `release.yml` **ne sont PAS byte-identiques**
      (`278a3f52…` Cockpit vs `9f020e32…` GUI ; deux écarts : dépendances Linux ligne 72 —
      `libasound2-dev cmake pkg-config` en plus côté Cockpit — et le commentaire des secrets minisign
      lignes 96-99). AR-2 prévoyait ce cas : **(b) s'impose**, on n'inscrit rien et on **ne les aligne
      pas en passant**. Le plancher de convergence **reste à 17** (registre à 18 entrées, inchangé).
      Le **bloc `latest:` (147-199), lui, EST byte-identique** entre les deux dépôts
      (`40d93359…`) — coïncidence utile mais **non gardée**.
      **NON FAIT — contrefactuel réel (V-C) : SUSPENDU.** AR-3 tranchait « V-D puis V-C » avec une
      clause d'arrêt ; la répétition l'a déclenchée. La fenêtre de vol n'est **pas** de quelques
      minutes refermées par le job : elle dure **jusqu'au geste manuel du décideur**. Séquence
      exacte, contrôles et restauration écrits § 3-4 de la procédure ; **question tranchée par le
      décideur** au § 5 : (α) lancer V-C · (β) clore en partiellement prouvé, daté · (γ) re-cadrer
      la garde d'abord *(recommandation de l'exécution)*.
      **HORS PÉRIMÈTRE, rappelé** : la dette de canal (NAS mort + `publish-update.mjs:418` qui ne
      pousse que vers `origin`), le bump du GUI et d'`iakaframe`, les porteurs de version non gardés,
      les cinq successeurs de L42.

- [ ] **L42** — **Installer depuis rien : la vitrine dit ce que l'étagère porte**
      → **instruction (copie UNIQUE, AR-5 = (b))** :
      `/Users/sjupin/work/iakaframe/specs/instructions/installer-depuis-rien.md`
      *(**ce dépôt n'en a PAS de copie**, et c'est délibéré : le défaut vit dans une **convention de
      portefeuille** appliquée à au moins quatre dépôts, pas dans deux implémentations jumelles ; et
      le registre de convergence ne connaît que **deux** frères, donc une troisième copie serait la
      seule **non gardée** — on installerait le défaut qu'on répare. Le chemin absolu ci-dessus est
      **une étape du lot**, pas une politesse.)*
      *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-08-29),
      branche `feat/L42-installer-depuis-rien`. Cadré par 🔵 Gandalf, 6 arbitrages TRANCHÉS.)*
      **Problème** : les trois dépôts publics annonçaient dans leur README une version périmée, et
      GitHub présentait comme « Latest » une release qui n'était pas la plus haute. Le défaut de fond
      n'est pas l'écart de numéro : **la vitrine et l'étagère n'étaient reliées par rien** — le README
      est de la prose recopiée, la release vient d'un CI, le `latest` est décidé par GitHub, et
      **aucun des trois ne rougissait** quand ils divergeaient.
      **Livré** : (V1) section *Installation* **générée** entre marqueurs, version dérivée de
      `package.json`, noms d'artefacts dérivés de `fixtures/vitrine-assets.json` (table
      **byte-identique** avec l'app jumelle) ; (V2) **cliquet à deux faces** — locale dans le gate
      (`scripts/__tests__/vitrine.test.mjs`, hors réseau, déterministe) et en ligne hors gate
      (`npm run vitrine:en-ligne`, anonyme, **`SKIP` code 3** sans réseau, jamais un vert muet) ;
      (V3) **maîtrise du `latest`** — job `latest` du workflow, `--latest` / `--latest=false`
      **conditionné au plus haut semver**, **sans toucher au SHA épinglé** de `tauri-action` ;
      (V5) **inventaire honnête** — une plateforme non produite est **déclarée manquante** avec
      motif, date et condition de levée, jamais promise.
      **Rattachement aux gardes existantes, pas de troisième mécanisme** : le README devient un **porteur de version de plein droit** —
      entrée `readme` dans `VERSION_CARRIERS` **avec sa raison**, câblage dans `readRepoVersions`,
      et le **cliquet existant** (clés lues ≡ clés déclarées) le vérifie sans une ligne de plus.
      **CA-17 prouvé par mutation** : retirer le câblage de lecture en gardant l'entrée déclarée
      fait rougir le cliquet (`expected [ …(3) ] to deeply equal [ …(4) ]`, `readme` manquant),
      révocation prouvée au `diff`. Au passage, le helper `aligned()` de la suite énumérait les
      **cinq** porteurs en dur : c'était une **copie périmée du registre**, il en est désormais
      **dérivé**.
      **Trois lignes fausses reprises, pas une** : le nom du DMG arm64 était faux **dans sa
      forme** (`iakaFrameGUI_v0.1.4_macos-arm64.dmg` — ni le `v`, ni `macos-arm64` : ce nom n'a
      jamais existé), il **manquait une ligne macOS Intel** alors que la chaîne produit
      `iakaFrameGUI_0.1.7_x64.dmg`, et la version était périmée de trois mineures. Corriger
      « 0.1.4 → 0.1.7 » aurait laissé les deux premières fausses. Mesuré en anonyme sur `v0.1.7` :
      **les sept plateformes de la table sont présentes**, la liste des absents est donc vide — et
      c'est ce qui autorise le générateur à écrire « Tous les systèmes sont couverts ». Cette phrase
      n'est plus un slogan recopié : elle n'est émise **que** si la liste des absents est vide.
      **H-2 était déjà refermé sur ce dépôt** par le décideur (`gh release edit v0.1.7 --latest`) ;
      ce lot livre le **cliquet** qui l'empêche de revenir, pas le geste.
      **NON FAIT — actes de publication, refusés aux agents** : l'étape 7 (republier, re-mesurer)
      et le contrefactuel **CA-5** (republier délibérément un tag ancien pour prouver que le
      `latest` n'est plus volé) appartiennent au décideur. **V3 est donc câblé et lisible, mais non
      prouvé en exécution réelle** — dit tel quel, jamais annoncé comme couvert.
      **Correctif post-gate — F-1, LE TÉMOIN ÉTAIT VIDE** *(gate 🏹 Legolas du 2026-08-29 : FAIL sur
      ce seul point, tout le reste acquis).* Le test `scripts/__tests__/vitrine.test.mjs` « une
      promesse en PROSE, hors tableau et hors marqueurs, est VUE par E-3 » — celui-là même que ce lot
      désignait comme *la reproduction exacte du cas* et *le seul qui morde sans réseau* — prenait
      `noms[TABLE.plateformes[0].cle]`, c'est-à-dire une plateforme **fournie**, donc **déjà promise
      par sa ligne du tableau du README**. Mesuré : `deja promis SANS la prose ? = true`. L'assertion
      était satisfaite par le tableau seul : le test serait resté **vert** même si `fichiersPromis`
      ignorait totalement la prose. Restaurer l'ancienne règle (`if (!/^\|/.test(ligne)) return;`) le
      laissait **✓** — **un faux vert à l'intérieur du lot dont c'est le sujet**, alors que le lot
      écrit lui-même, dans `scripts/vitrine-en-ligne.mjs:27`, qu'« un contrôle qui rend "succès"
      alors qu'il n'a rien mesuré est le pire des faux verts ». Le défaut d'origine, lui, portait sur
      un nom **déclaré absent** (`<App>_<v>_aarch64.dmg`) : en le remplaçant par un nom fourni, la
      reproduction avait été perdue. Un témoin vide est **pire qu'un témoin absent** — il invite à
      supprimer la vraie garde, puisqu'on lit un test vert qui porte son nom.
      **Réparé** : les deux témoins voisins partagent désormais un nom **fictif**
      (`{APP}_{V}_fantome-de-vitrine.dmg`, dérivé d'**aucune** plateforme de la table et absent des
      deux README), et le test porte un **verrou** — une première assertion exige que ce nom ne soit
      **pas déjà promis AVANT la prose**, pour qu'il ne puisse pas redevenir vide en silence.
      **Contrefactuel rejoué dans les DEUX dépôts** : l'ancienne règle restaurée fait rougir **ce
      test-là, nommément** (`expected [ …(N) ] to include '…_fantome-de-vitrine.dmg'`) ; révocation
      prouvée au `sha256` de `scripts/lib/vitrine.mjs` (`5be45af4…`, inchangé — **zéro ligne de
      production touchée par ce correctif**). `fixtures/convergence.sha256` régénéré des deux côtés
      (**seule** la ligne du test bouge), byte-identité et **18 fichiers / plancher 17** rejoués sur
      les deux faces.
      **Successeurs INSCRITS ICI, NON TRAITÉS** *(relevés au même gate — les inscrire est le geste,
      les traiter serait un « tant qu'on y est »)* :
      **(F-2)** une promesse n'est mesurable qu'**entre backticks**. Restent verts : un lien markdown
      dont l'URL porte le nom, un `curl -LO` en bloc de code, de la prose nue. La regex `ARTEFACT`
      est **pré-existante** (non modifiée par L42) et **aucun README actuel n'en contient** : c'est
      un **piège futur, pas un mensonge présent**. Mais le commentaire de `fichiersPromis` **promet
      plus que la mesure** (« lien », « quel que soit l'endroit ») — à réaligner dans un successeur.
      **(F-3)** la **face en ligne** (`scripts/vitrine-en-ligne.mjs`) n'est exercée par **aucun
      test** : désarmée **symétriquement dans les deux dépôts** avec régénération du registre, tout
      reste vert. L'empreinte de convergence prouve l'**altération**, pas le **comportement**.
      Cohérent avec l'arbitrage « hors gate », à écrire quand même.
      **(côté `iakaframe`, inscrits là-bas et volontairement NON dupliqués ici)** le nit de
      formulation D3 (`cli/scripts/lib/vitrine.js:49`) et l'**absence totale d'épinglage** dans
      `.github/workflows/release.yml` → `iakaframe/BACKLOG.md`.
- [ ] **Gardes tièdes — une garde qui ne peut pas rougir n'est pas une garde**
  → `specs/instructions/gardes-tiedes.md` (dupliquée **verbatim** dans
  `IakaCockpit/specs/instructions/`, byte-identique — une divergence est un défaut, CA-22).
  *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-08-29),
  branche `feat/L41-gardes-tiedes`. Le dépôt Cockpit numérote ce lot **L41** ; celui-ci ne
  numérote pas. Cadré par 🔵 Gandalf, 8 arbitrages TRANCHÉS par le décideur.)*
  **Le fil** : ce lot ne corrige pas des bugs, il corrige des **gardes qui ne peuvent pas
  échouer, ou qui échouent sur la mauvaise chose**.
  **Volet A — les prédicats qui attestaient le faux.** (D) `estPrive` découpait sur `":"`, ce
  qui rend `"["` sur `"[::1]:3001"` : `I2` **certifiait** qu'une boucle locale est publique.
  Extraction d'hôte par `new URL(...).hostname` (crochets IPv6 retirés) **et** charge de la
  preuve **inversée** (AR-2 = O3) : `estPublic` explicite, privé par défaut, le tout **extrait**
  dans la fonction pure `scripts/lib/verifier-mesures.mjs`. (C) `mesureLe` n'était contraint que
  par « non vide » : borne **relative au manifeste** `mesureLe ≥ pub_date` (AR-1 = O2), jamais
  calendaire — déterministe, comparée à un fichier versionné, hors-couverture **écrit dans le
  code**.
  **Volet B — les jonctions non gardées.** (E) `I4bis` était **vacuous** (registre vide) :
  supprimer l'appel laissait la suite verte, **mesuré**. Réparé par un **contrefactuel de
  forme**, sur le modèle d'`I4ter` — le registre versionné n'est **pas** peuplé (il est vide
  parce que 9/9 répondent 200, c'est un résultat). (CONV) la convergence des deux apps n'était
  gardée par **rien** : registre `fixtures/convergence.sha256` + garde **à deux faces** (locale
  dans le gate, croisée `npm run test:convergence` hors gate avec SKIP propre). **Complétude** :
  retirer une ligne du registre **dans les deux dépôts** rétrécissait la couverture sans qu'aucune
  face ne bronche (mesuré : la face croisée rendait « OK — 12 fichier(s) »). Un **cliquet de
  complétude** ferme ce résidu ; ce qu'il ne ferme pas — un **échange** de lignes garde le compte —
  est **déclaré**. La **commande de régénération** vit désormais en tête du registre.
  **Volet C — référentiels et canaux.** (D-6) la republication à l'identique est désormais
  **prouvée contre le fichier versionné** (`--notes` et `--pub-date` tirés de `updater/latest
  .json` lui-même — AR-4 = O3, les vraies notes de ce dépôt ne sont pas détruites). **Ce que
  cette garde NE voit PAS est déclaré, et MESURÉ** : un champ qui est une **entrée tirée du
  fichier** le **traverse par construction**. Ici : `notes`, `pub_date`, et la `signature` d'un
  artefact désigné par **une seule** clé — mais **pas** `version`, que ce générateur **dérive** du
  tag lu dans les URL et qui est donc **couvert** (la partition n'est **pas** la même que chez la
  jumelle, et elle est mesurée des deux côtés, jamais recopiée). La déclaration n'est pas de la
  prose : un test **rejoue la partition** et rougit **dans les deux sens**. **CA-17 a été rectifié
  en conséquence.** (D-5) la
  **prétention** est corrigée, pas le script : `test:rust` exposé, limite écrite **dans le
  `package.json`**, `cargo test` en **ligne de tableau obligatoire** du verdict de gate. (D-2)
  journal de `mesurer-artefacts.mjs` sur **stderr**, document sur stdout — **mesuré** par un test
  qui exécute le script. (D-3) les deux `console.log` résiduels de `publish-update.mjs`.
  **(D-4) l'étape 0.3 a mordu — et le lot a TRAITÉ ce qu'elle a révélé.** L'`action.yml` **au
  SHA vers lequel pointait `v0`** (`84b9d35b5fc46c1e45415bdb6144030364f7ebc5`, `action-v0.6.2`)
  contredit ce que L40 a lu sur `dev` : l'entrée s'y nomme **`includeUpdaterJson`**, et ni
  `uploadUpdaterJson` ni `uploadUpdaterSignatures` n'existent. Le `uploadUpdaterJson: false` du
  workflow était donc **ignoré en silence** par l'action qui s'exécute. Ce qui a été fait : le
  workflow est **épinglé sur le SHA de 40 caractères** (plus aucune occurrence de `@v0`),
  l'entrée posée est **`includeUpdaterJson: false`** — celle que ce SHA déclare réellement — et
  le **cliquet** vit dans `fixtures/tauri-action-pin.json`, source unique du référent, avec
  l'ordre de **re-lire `action.yml` au nouveau SHA** avant toute levée. **13 tests** l'éprouvent
  (`scripts/__tests__/pin-tauri-action.test.mjs`), toute mutation se faisant **dans la fixture,
  jamais dans le workflow**. **CA-13, CA-14 et CA-15 sont couverts.**
  **CE QUI RESTE REMONTÉ AU DÉCIDEUR :** le volet G de L40 a **cru** supprimer le `latest.json`
  concurrent posé par l'action, et ne l'a jamais fait sur ce qui tournait. **La première release
  qui passera par ce workflow est la première où la suppression sera réellement effective** —
  cet effet-là n'a pas de preuve hors ligne, et il n'en est pas réclamé une ici.
  **⚠️ Correction d'une déclaration fausse (relevé au gate).** Ce paragraphe a porté, jusqu'à ce
  commit, la mention « **D-4 GELÉ ET REMONTÉ [...] aucune ligne du workflow n'a été touchée : ni
  pin, ni cliquet** ». Elle était vraie quand elle a été écrite (`06f2523`) et **fausse dès le
  commit suivant** (`9585bf9`, qui épingle et pose le cliquet) ; la dernière écriture
  documentaire du lot (`0f64b79`) l'a laissée en place. **La doc doit dire ce que le lot a
  fait** : la trace du gel est conservée ici plutôt qu'effacée, mais elle ne décrit plus l'état
  du dépôt.
  **Aucun effet utilisateur** : ce lot n'a **pas de recette humaine**, sa seule preuve est la
  mesure — d'où la règle « toute garde touchée est éprouvée par une mutation qui la fait
  rougir », mutations **révoquées** avec preuve.

- [ ] **Clés d'installeur du manifeste updater — le manifeste dit enfin quel paquet il sert**
  → `specs/instructions/cles-installeur-manifeste-updater.md` (dupliquée **verbatim** dans
  `IakaCockpit/specs/instructions/`, byte-identique — une divergence est un défaut, CA-16).
  *(**implémenté côté ⚒️ Gimli — REMIS AU GATE 🏹 Legolas, non auto-validé** (2026-08-29),
  branche `feat/L40-cles-installeur-manifeste`. Le dépôt Cockpit numérote ce lot **L40** ;
  celui-ci ne numérote pas.)*
  **Livré** : (A) le générateur émet les **9 clés** — 4 génériques `{os}-{arch}` **inchangées**
  + 5 clés d'installeur `{os}-{arch}-{installer}`, que `tauri-plugin-updater` cherche **en
  premier** ; **divergence réparée** : ce générateur **ignorait totalement le `.msi`** (aucune
  branche), il ne pouvait donc pas émettre `windows-x86_64-msi`. (B) `I4` extraite en fonction
  **pure** `scripts/lib/verifier-mesures.mjs`, indexée par **plateforme** (l'index par URL
  s'effondrait au moment même où on s'en sert, plusieurs clés partageant la même URL par
  construction) — les **deux exploits écrits ROUGES d'abord** et figés dans l'historique.
  (J) instrument de mesure **versionné** `scripts/mesurer-artefacts.mjs` ; la provenance
  déclarée par `updater/mesures.json` était **fausse** (elle nommait `iakaframe endpoints`, qui
  fait un `HEAD` et ne calcule ni sha256 ni signature) — rectifiée. (G) `uploadUpdaterJson:
  false` (AR-5). (I) `--pub-date` pilotable. Convergence : **6 fichiers byte-identiques** avec
  le Cockpit, dont la garde `forge-host-parity.test.mjs`, qui gagne `HORS_COUVERTURE` + `I4bis`.
  **Fait mesuré contredisant un risque du cadrage** : `.deb` et `.rpm` sont **signés** sur les
  deux releases — R2/AR-2 sans objet, aucun `HORS_COUVERTURE` à ouvrir.
  **NON FAIT, et c'est le cœur du reste** : l'**étape 5.1** (bump + publication d'une version
  neuve) — les actes de publication (push, tag, release, workflow) sont **refusés aux agents**
  et appartiennent au décideur. Le lot se clôt en **« mesuré, non recetté »** ; les deux
  recettes réelles (Windows MSI, Linux `.deb`) restent le **gate humain**.

- [ ] **`CANON-VENDOR-TABLE-DERIVEE` — successeur nommé du lot GUI-VENDOR-CHARON (dépôt
  `iakaframe`, canon-side).** Mandat : **dériver** les 7 ensembles de `fixtureTable()` depuis le
  canon (`teams/iakaframe-8.md` → `personas` ; `methods/iakaframe.md` →
  `roleKeys`/`principleIds`/`ritualIds`/`scaffoldIds`/`guardrailIds` ; union des `persona.skills` +
  fermeture des `subskills` → skills) et **asserter l'égalité ensembliste avec les constantes
  déclarées** (`IDS`, `ROLE_KEYS`, `SKILL_IDS`… `vendor.js:34-70`), sur le modèle du cliquet **R1**
  (*clés lues ≡ clés déclarées*), **avec sa liste de hors-couverture déclarée et exportée**.
  *Raison* : ces listes **prétendent** être « l'ENSEMBLE RÉFÉRENCÉ par la méthode canonique » mais
  sont **transcrites, pas dérivées** — rien ne le vérifie. Cette fois la garde a rougi parce qu'un
  humain a pensé à bumper 78 → 82 ; un futur lot canon qui ajoute une 11ᵉ persona **sans** toucher
  `vendor.js` laissera la garde **verte et aveugle**. Effet visé : l'oubli rougit **au commit qui
  l'introduit**, **sans dépôt frère**. Réf. `specs/instructions/gui-vendor-charon.md` § 2.3.
  **Décision de non-action reconduite** : `npm run test:vendor` **reste hors de `test:all`**
  (`scripts/test-vendor.mjs:5-8`) — ne pas rouvrir.

- [x] 🛑 **`GATE-DE-PHASE-OPTIONNEL` — FERMÉ. Le GUI n'invente plus un feu vert que le canon
  refuse.** Remonté par ⚒️ Gimli **en cours** du lot `GUI-VENDOR-CHARON` et **hors de son
  périmètre**, confirmé indépendamment par 🏹 Legolas (hors harnais de test, bundle `esbuild`),
  cadré par 🔵 Gandalf (`specs/instructions/gate-de-phase-optionnel.md`, 16 CA).
  **Le défaut** : `Phase.gate` était **obligatoire** ; faute de gate appariée, `mdToWorkflow`
  (`frontmatter.ts:1088`) en **fabriquait** une, `workflowToMd` la **propageait**, et
  `serializeWorkflowMd` l'**écrivait au disque**. Ouvrir puis enregistrer le workflow canon
  **ajoutait un feu vert humain à une mission dont la nature est d'agir sans ordre**.
  **Livré** : `gate?: Gate` **présent-si-porté** (clé **omise**, jamais `undefined`) + les 4 sites
  de `workflow.ts` + **`removePhaseGate`** (symétrie) ; le mapper cesse de fabriquer (`map` →
  `flatMap`) ; **5 consommateurs d'UI**, dont `WorkflowPanel:77` qui **plantait** sur le canon
  (`surveillance` est `offChain`) et le câblage **`showGate` ↔ donnée** de `WorkflowAtelier` —
  l'interface affichait « ◇ Aucun gate » pendant que le fichier en écrivait un.
  **L'Option D a été écartée** (ne pas émettre un gate `human` à critère vide) : un raccourci
  d'une ligne qui aurait rendu le rouge vert **pour une mauvaise raison**, en confondant « pas de
  gate » avec « gate dont le critère n'est pas rédigé ». `AC-6` la ferait échouer.
  **Preuve mesurée** — `lint:all` `0` ; `test:all` `0`, `Test Files 120 passed (120)` /
  `Tests 1183 passed (1183)` (**avant : 1166 verts + 2 rouges**, soit **+15 tests, aucun
  supprimé**) ; `cargo test` `0`, `116 passed` ; `vendor-check --root <canon> --strict --json` ⇒
  `ok:true, checked:82, drift:0` ; `gen-fixtures --check --canon <canon>` ⇒ *« les 3 derivees sont
  a jour »*. **`AC-4` (preuve reine)** : `workflowMd.test.ts:130` est passé au vert **sans qu'une
  seule de ses lignes soit touchée** — *un test qu'on rend vert sans le modifier est la meilleure
  preuve qu'on a corrigé le programme et non l'attendu*. **`AC-8`** : **aucun** golden d'adaptateur
  édité (`renderWorkflowMarkdown` exclut les phases `offChain`) — la sortie des kits est
  byte-inchangée.
  ⚠️ **Écart déclaré** : `src/forge/workflowProposition.test.ts` n'était dans **aucune** liste du
  cadrage (ni les 11 sites, ni les 5 fichiers de test) et **son titre gravait l'invention**
  (*« gate absente → human/condition vide »*). Re-cadré : le programme a changé, pas l'attendu.

- [ ] **Réserve d'instrument — `AC-1`/`AC-4` de `gui-vendor-charon.md` ne pinnent pas le canon.**
  Signalée par ⚒️ Gimli et 🏹 Legolas ; **l'amendement des critères appartient à 🔵 Gandalf**, pas
  à l'exécution. `libraryRoot()` **ignore l'emplacement du script**, remonte depuis le **`cwd`** et
  retombe sur l'arbre principal d'`iakaframe` — en `0.38.0` au moment du lot. Lancées **mot pour
  mot**, ces commandes rendent `checked: 78, drift: 25` avec le message *« Anomalie du canon, pas
  du miroir. »* : un diagnostic **faux et accusatoire**, qui met en cause le canon alors que le
  miroir est juste. ⚠️ **Ce n'est ni `R-1` ni `R-3`** : c'est une **troisième variante** — mesurer
  contre le mauvais checkout **en croyant l'avoir désigné par le chemin du script**. Remède
  appliqué pendant le lot : `--canon` / `--root` **explicite** à chaque invocation. À graver dans
  les critères pour que la commande soit juste **telle qu'écrite**.

- [ ] **`WORKFLOW-CANONIQUE-EN-CODE-DERIVE`** (dépôt `iakaFrameGUI`) — successeur nommé, constaté
  pendant `GATE-DE-PHASE-OPTIONNEL`, **hors de son périmètre par nature**.
  `IAKAFRAME_CANONICAL_WORKFLOW` (`packages/core/src/workflow.ts:224-292`) est un littéral **en
  dur** qui a **décroché du canon** : **4** phases là où le fichier canon en porte **5**, et sa
  phase `prod` porte `roleKeys: ["coordination"]` là où le canon écrit
  `actorsRoleKeys: [deploiement]` (Charon). Il sert de **dernier repli** de résolution pour les
  kits (`workflow injecté → Méthode → canonique`, `claudeCode.ts:165`) : **un kit déployé sans
  workflow embarque donc un workflow périmé.** Le corriger **ferait bouger des goldens
  d'adaptateurs** — or ce littéral est *« calé pour reproduire à l'octet près le littéral
  historique »* (`workflow.ts:14-15`). **Lot distinct, à cadrer.**

- [ ] **`CANON-VENDOR-CHECK-RACINE-RENDUE`** (dépôt `iakaframe`, canon-side) — successeur nommé.
  `vendor-check` **dit contre quel MIROIR il a mesuré** (`miroir : <guiRoot>`) mais **jamais contre
  quel CANON** : la racine résolue par `libraryRoot()` n'apparaît **ni** dans le rapport humain
  **ni** dans la charge JSON (`vendor.js:363-371`, aucune clé `root`). C'est **la cause racine** du
  diagnostic faux du 2026-08-17 : l'outil mesure contre un arbre qu'il ne nomme pas, puis **accuse**
  — *« Anomalie du canon, pas du miroir. »* (`vendor-check.js:151-153`) — alors que la faute est
  **locale et de résolution**. Mandat en deux faces : (a) **rendre la racine** (`root` dans le JSON,
  `canon : <chemin>` dans le rapport humain, comme le fait déjà `gen-fixtures.mjs:138`) ;
  (b) **désarmer l'accusation** — une phrase qui impute une faute au canon ne doit être imprimée que
  par un outil capable d'établir qu'il a lu le bon. *Une garde qui ne dit pas ce qu'elle a mesuré ne
  peut pas dire qui a tort.* **Rend caduque la « Réserve d'instrument » ci-dessus une fois livré.**

- [ ] **Sous-lot B « cardinalité » — non commencé.** Le **lot A** (modèle de frame agnostique :
  `kind` first-class, acteurs/conteneur unifiés) a été livré **par une autre session** le 2026-07-26
  (`a6d9803`). Le **sous-lot B** de ce même cadrage reste dû : `coordinator` **optionnel** + N=1 dans
  `assemble`. ⚠️ Son instruction vit **dans le dépôt canon**
  (`iakaframe/specs/instructions/correction-biais-modele-frame.md`), pas ici — **verser le cadrage
  avant de coder**, comme pour le chantier frames.
- [ ] **Troisième sens de « réservoir » — non cadré.** L'onglet **Apprentissage** appelle
  « réservoir » son **stock de propositions** (`useForgeLearning.ts`, `LearningAtelier.tsx`,
  `backend.ts`, sous-titre d'onglet). Découvert en exécutant le renommage AR-2 : **aucun cadrage ne
  couvre ce sens**, il a donc été laissé intact. À trancher — le garder (sens distinct assumé) ou
  l'aligner. *Sans décision, le mot porte deux sens dans l'interface.*
- [ ] **Open WebUI : porter le workflow d'équipe ?** — *écarté le 2026-07-26 comme addition simple,
  avec sa raison* : cet adaptateur ne produit **aucun fichier-contrat d'équipe**, seulement un Model
  JSON **par persona** (`params.system` = « qui es-tu »). Y mettre le workflow dupliquerait une donnée
  d'équipe dans chaque persona et mélangerait les registres. Le porter supposerait un **artefact
  d'équipe séparé** qui n'existe pas dans ce format — **chantier distinct**, à cadrer si le besoin
  se confirme. Réf. `specs/instructions/phases-workflow-kits-claude.md` § 1.2.
- [ ] **Arbitrage reporté — « que doit produire New ? »** `requestNew` recharge un starter
  identique à celui semé au montage : dans l'état pristine, le geste est un **no-op visuel**.
  Décision de produit, pas de code. *(Réserve ouverte depuis le 2026-07-15, à re-vérifier.)*

### Recettes humaines (gestes visuels/interactifs — Legolas ne valide pas le pixel)

- [ ] Forge **Cinabre** + écran **Générer / Déployer** : voir la charte, basculer, cycle
  team → nœud → Générer → Déployer sur un dossier tmp (**U-10**).
- [ ] Cycle **handoff** Livrer → Réceptionner (forge → cockpit).
- [ ] **G-8** : déployer un kit dans un **vrai** projet Claude Code (subagents/skills reconnus +
  canal d'identité opérationnel) — `specs/notes/P3-recette-manuelle-G8.md`.
- [ ] **B-7 (P7)** : importabilité réelle d'un kit **lié** — Open WebUI avec `base_model_id` rempli
  (importable), Codex avec modèle référencé ; Claude Code sans modèle = pur et valide.
- [ ] **B-10 (P7)** : smoke visuel Binding bout-en-bout — team → nœud → **cocher « Lier »** (Open WebUI,
  un modèle) → Générer (voir `base_model_id` rempli) → Déployer sur tmp → `binding.json` présent à la racine.
- [ ] **P6b — 4ᵉ onglet Workflow** : recette visuelle — liste des phases, boutons monter/descendre/ajouter/
  supprimer, éditeur de phase (nom, description, rôles par cases, offChain, gate), reflet dans le `FlowDiagram`,
  sélecteur `workflowId` de l'onglet Méthode (`npm run tauri dev`).
- [ ] **Chantier frames** : recette visuelle du réservoir de frames (12 types, collection `frames`)
  et de la vignette flamme du 9ᵉ rôle.

### North-star (design gardé ouvert, hors MVP)

- [ ] **Import multi-méthodes** (BMAD / MetaGPT / SPARC) — agnosticisme de méthode gravé dès le cœur ;
  ne rien hard-wirer « iakaframe-only ».

### Livré — objectif « charger le frame dans le GUI », **FERMÉ 4 étapes / 4**

| Étape | Livré | Merge | Version |
|---|---|---|---|
| 2+3 | Open→Save fidèle au frame (capture corps + layout, rethread au Save) | `c70dbe0` | v0.1.1 |
| 3bis | Workflow au format frame autoritaire (frontmatter phases/gates) | `68a7bf4` | v0.1.2 |
| 4 Lot 1 | Roster 8/8 (helm) + byte-parité team `iakaframe-8` + tools 8/8 + `test:vendor` | `5011e38` | v0.1.3 |
| 4 Lot 2 | B2 — 5 clés de rôle alignées sur le canon + bug skill helm→deploiement | `6fb7e36` | v0.1.4 |

Instructions : `frame-open-save-fidelite.md`, `frame-workflow-format-reconciliation.md`,
`frame-parite-vendoring-garde.md`, `b2-alignement-cles-role-canon.md`.
**Doctrine tenue : GUI ← frame** — le canon `iakaframe` est autoritaire, le miroir ne le déforme jamais.

### Livré — jalons antérieurs (preuves conservées, détail dans `specs/etat-des-lieux.md`)

- [x] **D-7** — perte silencieuse à la résolution d'une Méthode rendue **visible**
  (`unresolvedRefsForMethod` + bandeau du rail Méthode), merge `e9add1a`.
- [x] **D-8** — réparation du **gate menteur** : scripts `lint:all`/`test:all` réellement exposés,
  format de verdict contraint gravé ci-dessus, registre `specs/notes/rectifications.md` ouvert
  (motif : le merge `8ae5748` portait « gate PASS » avec un lint rouge), merge `65e64f2`.
- [x] **D-9** — re-vendorage du canon `iakaframe` vers le miroir GUI, merge `e8cb7ba`.
- [x] **Modèle Méthode élargi** — `Method` porte `scaffoldIds` + `workflowId` + `principleIds` +
  `ritualIds` + `guardrailIds` + `roleKeys`, adossés aux catalogues composables du cœur
  (`principle.ts`, `ritual.ts`, `guardrail.ts`, `roles.ts`) et validés par `unresolvedRefsForMethod`.
  *(Item ré-évalué le 2026-07-25 : il était encore listé « à graver » alors que le code le porte.)*
- [x] **P7 — Binding réel** (2026-07-16, merge `9ecf97f`) — `Binding`/`PersonaBinding` +
  `defaultBindingForNode`, émission **conditionnelle** du modèle par adaptateur
  (`KitGenOptions.binding?`), `LiaisonPanel`, `binding.json` au `KitFileTree`. Invariant B-2 :
  **sans binding = sortie byte-identique**. `specs/instructions/P7-forge-liaison-deploiement.md`.
- [x] **P6b — Éditeur de workflow** (2026-07-16, merge `be9dcd4`) — collection `workflows/` comme
  artefact de 1re classe, 4ᵉ onglet, résolution pure par `KitGenOptions.workflow`, `COLLECTIONS +=
  workflows` côté Rust. `specs/instructions/P6b-editeur-workflow.md`.
- [x] **Champ nom éditable** (2026-07-15, merge `fc22eec`) — titre éditable Team/Méthode, Kit
  read-only, Save As prérempli. **Recette visuelle humaine PASSÉE (RAS).**
- [x] **Commandes terminal + livraison bibliothèque** (dépôt `iakaframe`, merges `2d481bf` +
  `2c85702`) — 5 verbes `list`/`show`/`assemble`/`add`/`switch(use)`, pool matérialisé. *Réserve
  mineure : CLI `existsSync` vs GUI `is_dir()` sur le marqueur de racine (cas de bord).*

### Dette R1 — porteurs de version déclarés (2026-08-16)

- [x] **R1 — le `package-lock.json` ne dérive plus, et la garde ne ment plus sur son périmètre.**
  Le lock portait `0.1.4` (deux champs : racine et `packages[""]`) face à un produit publié en
  `0.1.7` — **récidive** du même incident du 2026-07-31 (`specs/etat-des-lieux.md:46`). La garde
  `assertVersionsAligned` ne comparait que 4 porteurs ; ce cinquième lui a toujours été invisible.
  **Livré** : `VERSION_CARRIERS` (5 porteurs, **une raison par entrée**) + `VERSION_NON_CARRIERS`
  (hors-couverture **déclaré et exporté** : `packages/core` = arbitrage réservé au décideur,
  `updater/latest.json` = sortie de la publication, `Cargo.lock` = auto-synchronisé) + **cliquet**
  de test (clés lues ≡ clés déclarées) + **sentinelle** permanente dans `test:all` + message
  d'erreur **actionnable** (il dicte `npm version`). La source est tarie : `auto-update.md` § 6-0
  prescrit `npm version --no-git-tag-version` et **interdit** l'édition manuelle de `package.json`.
  **La découverte des champs `version` a été écartée à dessein** : elle signalerait
  `packages/core` (`0.1.0`) comme une dérive et trancherait par accident un arbitrage réservé.
  Commits `8239958` (garde + tests), `881bd79` (lock, **2 insertions / 2 deletions**, aucune
  ligne de dépendance touchée), `3a64822` (geste de bump gravé) puis `c8319d9` (l'instruction
  versée au dépôt, commit `docs:` **distinct** pour ne pas altérer la preuve d'`AC-3`).
  Instruction : `specs/instructions/r1-porteurs-de-version-declares.md`.
  **Merge `363a4af`** (`--no-ff`, branche `fix/r1-porteurs-de-version-declares`), sur gate
  🏹 Legolas **PASS** — verdict rendu par le gate indépendant, jamais par l'émetteur du lot.
  **Preuve mesurée** — `lint:all` `0` ; `test:all` `0`, `120 passed (120)` / `1163 passed (1163)`
  (**avant : 1151**, soit `+12` tests, **aucun supprimé**) ; `cargo test` `0`, `116 passed` ;
  `node scripts/publish-update.mjs v0.1.7 --check-only` → `0` **après** correction, `1` **avant**
  (message citant `package-lock.json` et `0.1.4`).
  Réserve `R-2` du gate (instruction hors dépôt) levée par l'amendement 🔵 Gandalf du 2026-08-16 —
  § Fichiers concernés porté à **6** fichiers, `AC-12` doté d'une seconde face — puis par `c8319d9`.
  `AC-12` est **re-mesuré par 🏹 Legolas seul**.

### Dettes closes le 2026-07-25 (re-mesurées à la reprise — ne pas les rouvrir sans preuve)

- ~~Perte du corps markdown au Save~~ — **close** par le lot Open→Save : `useForgeDocument.ts`
  capture `verbatimBody(text)` et `ForgeShell.tsx` sérialise `o.body ?? <boilerplate>`.
- ~~Câblage du wrapping des listes flow volontairement non fait~~ — **close** : `readListLayout`
  est capturé (`useForgeDocument.ts`) et passé à `serializeMethodMd` (`ForgeShell.tsx:124`).
- ~~Fixture `method.iakaframe-wrapped.md` au corps tronqué~~ — **close** : `diff` avec
  `~/work/iakaframe/methods/iakaframe.md` ne sort **rien** (22 lignes de part et d'autre).
- ~~Réserve P6b « total front consolidé non re-mesuré / `ForgeShell.test.tsx` à reconfirmer »~~ —
  **close** : `npm run test:all` → `56 passed (56)` / `518 passed (518)`, et le run ciblé
  `npx vitest run src/forge/ForgeShell.test.tsx` → `Test Files 1 passed (1) / Tests 3 passed (3)`.
- ~~Phases/workflow absentes du kit Claude Code~~ — **close, LIVRÉ 2026-07-26** : `CLAUDE.md` porte
  la section, au même rang que dans `AGENTS.md`, **via le même rendu** (`renderWorkflowMarkdown`) et
  le même ordre de résolution (workflow injecté → Méthode → canonique). Un kit Claude Code déployé ne
  perd plus l'information de workflow. **Trou révélé au passage : rien ne verrouillait la sortie de
  `renderClaudeMd`** — 5 gardes ajoutées, dont la comparaison du bloc avec celui d'`AGENTS.md`.
  Gate : `lint:all` `0`, `test:all` `0`, **`61 passed (61)` / `551 passed (551)`**, `cargo test`
  `83 passed`. Instruction : `specs/instructions/phases-workflow-kits-claude.md`.
- ~~Pointeur de frame active (cadré, non codé)~~ — **close, LIVRÉ 2026-07-26** : le pointeur vit
  dans `<projet>/iakaframe.json` (clé `frame`), le projet étant réglé dans les Settings. Écriture
  **non destructive** côté Rust, qui **refuse d'écrire** sur un JSON illisible plutôt que d'écraser
  les clés du CLI. `buildFrame(raw, activeFrameId?)` : **sans pointeur = comportement d'avant**,
  prouvé ; pointeur mort → repli sur `default` **avec alerte**. `Frame` expose `frames` (lister est
  requis pour choisir). Instruction : `specs/instructions/pointeur-frame-active.md` § 3bis.
  Gate : `lint:all` `0`, `test:all` `0`, **`60 passed (60)` / `546 passed (546)`**, `cargo test`
  **`83 passed`**.
  ⚠️ *Reste à confirmer au dépôt canon : le **nom de clé** `frame`, avant que le CLI ne s'y branche.*
- ~~Fëanor est le copilote du GUI (cadré, non codé)~~ — **close, LIVRÉ 2026-07-26** : identité
  **dérivée du canon** (`identity.ts` lit la fiche du rôle `frame` par `poolReadAll`, recherche par
  RÔLE et non par nom), `buildSystemPrompt(identity?)` injecté (**sans identité = byte-identique**,
  prouvé), badge d'ouverture/clôture **posé par l'UI** (schéma JSON intact), repli explicite sans
  identité inventée. Instruction : `specs/instructions/feanor-copilote-du-gui.md` § 4bis.
  Gate : `lint:all` `0`, `test:all` `0`, **`58 passed (58)` / `533 passed (533)`** (+15 tests).
- ~~`CopiloteShell` plante au montage sur un backend partiel~~ — **close** : `api.authoringModel?.()`
  aligné sur son voisin `authoringEndpoint?.()`. Le `.catch` seul ne protégeait pas — sur une méthode
  **absente**, l'appel lève **synchronement**, avant que la chaîne de promesse n'existe. Le fake des
  tests est redevenu **minimal** (`poolReadAll` seul) : il tient lieu de garde, et retirer le `?.`
  fait rougir immédiatement.
- ~~Renommage `reservoir` → `element pool` inachevé (A13)~~ — **close** : merge `--no-ff` de
  `refactor/element-pool-renommage` (`f55e0dd` code + `3136b00` libellés, isolé et révocable).
  Fichiers/symboles renommés, doc alignée. **Libellés visibles passés à « Briques »** (`16af12b`,
  arbitrage décideur : « outils » écarté car déjà pris par `Binding.tools`/`toolKinds`, et émis
  verbatim dans les contrats générés). **Contrat de prompt LLM volontairement inchangé** (clé
  `reservoir` du payload = contrat externe avec le modèle).
  Gate : `lint:all` `0`, `test:all` `0`, `56 passed (56)` / `518 passed (518)` — compte inchangé.
- ~~Chantier frames sans instruction locale~~ — **close** : cadrage rétro-porté dans
  `specs/instructions/frame-reservoir-et-9e-role-portage-gui.md` (les 7 commits des 24–25/07
  tracés entrée canon ↔ preuve mesurée, reste à faire borné en § 2). Sources canon :
  `iakaframe/specs/instructions/reservoir-de-frames.md` et `role-frame-builder.md`.
- ~~3 branches de travail obsolètes~~ — **supprimées** (local + `origin`) après archivage par tags
  `archive/feat/open-frame-portfolio` (`a9bc7ca`), `archive/feat/align-binding-format-frame`
  (`5152c72`), `archive/feat/ch-a-reconciliation-rolekey` (`27d8a2d`), poussés sur Forgejo.
  Résurrection : `git switch -c <nom> archive/<nom>`.
