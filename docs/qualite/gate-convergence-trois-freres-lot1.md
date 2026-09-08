# Gate qualité — CONVERGENCE-TROIS-FRERES lot 1 — iakaFrameGUI

> Ordre de mission d'Odin (portefeuille), 2026-09-08. Gate transverse à deux dépôts sœurs
> (`IakaCockpit`, `iakaFrameGUI`), branche `feat/convergence-trois-freres`, commits GUI
> `1cf20bf`, `b413d71`, `99a2b59`. Base : `iakaInstall/specs/instructions/convergence-trois-freres.md`
> (§3 AR-C1..C6, annexes A/B/C), `specs/instructions/release-brouillon-jusqua-matrice-verte-gui.md`.

## Verdict : PASS

## Verdict transverse (byte-identité iakaFrameGUI ↔ IakaCockpit) : PASS

## Mesures
| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run lint:all` (typecheck+lint) | `0` | `tsc --noEmit` puis `eslint .` — aucune erreur |
| `npm run test:all` (1er passage) | `1` | `Test Files 3 failed \| 129 passed (132)` / `Tests 3 failed \| 1356 passed \| 4 skipped (1363)` — **3 timeouts (5000ms) sur des tests à sous-processus réel**, flake attribué à la charge machine (voir § Flake) |
| Rejeu isolé `canaux-en-ligne.test.mjs` | `0` | `Test Files 1 passed (1)` / `Tests 20 passed (20)` |
| Rejeu isolé `release-publier-shell.test.mjs` | `0` | `Test Files 1 passed (1)` / `Tests 6 passed (6)` |
| `npm run test:all` (2e passage, complet) | `0` | `Test Files 132 passed (132)` / `Tests 1363 passed (1363)` |
| `npm run vitrine:check` | `0` | `vitrine : OK — README aligne sur v0.1.8 (3 zone(s)).` |
| `npm run test:convergence` | `0` | `OK — 1 frere(s) mesure(s) [IakaCockpit], 30 chemin(s) compare(s), 0 hors comparaison, 1 frere(s) nomme(s) SKIP [iakaInstall].` |
| `cargo fmt --check` (`src-tauri/`) | `0` | aucune sortie (rien à reformater) |
| `cargo clippy --all-targets -- -D warnings` | `0` | `Finished 'dev' profile … in 1.90s` |
| `cargo test` (`src-tauri/`) | `0` | `test result: ok. 116 passed; 0 failed; 0 ignored` |
| `git diff --stat main..HEAD -- '*.rs'` | `0` | sortie vide — **aucun `.rs` touché** |

## Flake du 1er passage — analysé, non retenu comme défaut
Le premier `npm run test:all` (lancé **en parallèle** du même run côté `IakaCockpit`, sur la même
machine) a rendu 3 timeouts de 5000ms, tous sur des tests qui spawnent un **vrai sous-processus**
(`bash`/`jq`/`gh` simulé) : `canaux-en-ligne.test.mjs` (CA-2 cas 1) et `release-publier-shell.test.mjs`
(étapes `publier` et `prepare`). Rejoués **individuellement**, les deux fichiers passent en
**671ms** et **2,40s** — largement sous le seuil. Le **rejeu complet de la suite** (132 fichiers)
est ensuite passé **intégralement vert en 22,4s**, sans aucune configuration changée. Diagnostic
retenu : **contention CPU** due à l'exécution simultanée de la suite `IakaCockpit` sur la même
machine au même instant — cohérent avec le flake déjà signalé (non reproduit) sur les gates L46/L48
du Cockpit. **Pas un défaut de ce lot** : aucune ligne de production concernée, deux rejeux
indépendants tous verts.

## Chaîne complète — détail
17 fichiers modifiés `main..HEAD` (1785 insertions / 100 suppressions) : mêmes fichiers que côté
Cockpit (`.github/workflows/release.yml`, `CLAUDE.md`, `README.md`, `fixtures/bloc-latest.sha256`,
`fixtures/convergence.sha256`, `fixtures/freres.json` (neuf), `fixtures/vitrine-locale.json`,
`scripts/__tests__/forge-host-parity.test.mjs`, `scripts/__tests__/release-publication.test.mjs`
(neuf), `scripts/__tests__/release-publier-shell.test.mjs` (neuf), `scripts/__tests__/vitrine.test.mjs`,
`scripts/lib/release-publication.mjs` (neuf), `scripts/lib/vitrine.mjs`, `scripts/test-convergence.mjs`,
`scripts/vitrine.mjs`, `specs/PROJET.md`,
`specs/instructions/release-brouillon-jusqua-matrice-verte-gui.md` (neuf)). Conforme à l'annonce des
annexes B/C — aucun fichier hors liste.

## 1. Byte-identité des 10 fichiers annoncés (iakaFrameGUI ↔ IakaCockpit)

| Fichier | `diff` |
|---|---|
| `fixtures/convergence.sha256` | **vide** |
| `fixtures/bloc-latest.sha256` | **vide** |
| `scripts/test-convergence.mjs` | **vide** |
| `scripts/lib/vitrine.mjs` | **vide** |
| `scripts/vitrine.mjs` | **vide** |
| `scripts/__tests__/vitrine.test.mjs` | **vide** |
| `scripts/lib/release-publication.mjs` | **vide** |
| `scripts/__tests__/release-publication.test.mjs` | **vide** |
| `scripts/__tests__/release-publier-shell.test.mjs` | **vide** |
| `scripts/__tests__/forge-host-parity.test.mjs` | **vide** |

**10/10 byte-identiques** (mesure unique, faite depuis Cockpit et valable dans les deux sens — un
`diff` est symétrique). `fixtures/freres.json` hors de cette liste, à raison : contenu différent et
légitime (chaque dépôt y nomme ses propres voisins — ici `IakaCockpit` + `iakaInstall`).

`fixtures/convergence.sha256` : **29 entrées** (`grep -cE '^[0-9a-f]{64}'`), fichier byte-identique
avec Cockpit. **Chaque empreinte re-calculée contre le fichier réel de CE dépôt** (script `node`
indépendant du registre, pas une comparaison à l'autre registre) : **29/29 correctes**.

## 2. Face croisée (`npm run test:convergence`)

**GUI → Cockpit** :
```
IakaCockpit (/Users/sjupin/work/IakaCockpit) : mesure — 30 chemin(s) compare(s), 0 hors comparaison
iakaInstall (../iakaInstall) : SKIP NOMME — ne porte pas (encore) fixtures/convergence.sha256
test:convergence : OK — 1 frere(s) mesure(s) [IakaCockpit], 30 chemin(s) compare(s), 0 hors comparaison,
1 frere(s) nomme(s) SKIP [iakaInstall].
```
Exit `0`. `iakaInstall` nommé dans `fixtures/freres.json`, absent (lot 2 non joué) → **SKIP nommé**,
conforme AR-C2(a)/AR-C4(a).

**Contrefactuels joués sur copies isolées** (`scratchpad/gui-copy`, `scratchpad/cockpit-copy`),
exécutés depuis le vrai `scripts/test-convergence.mjs` de ce dépôt :

| Contrefactuel | Attendu | Obtenu |
|---|---|---|
| `freres.json` vidé (`{"freres":[]}`) | SKIP global, exit 0 | `SKIP : aucun frere declare…` — **exit 0** ✓ |
| `IAKA_CONVERGENCE_HOME` sur un répertoire sans registre | exit 2, aucun repli | `IAKA_CONVERGENCE_HOME pointe « … », qui ne porte pas fixtures/convergence.sha256… Chemin autoritaire : aucun repli` — **exit 2** ✓ |
| Octet muté dans `scripts/lib/vitrine.mjs` chez le frère (copie de Cockpit) | DIVERGENT, exit 1 | `scripts/lib/vitrine.mjs : DIVERGENT (34380 o ici, 34421 o chez le frere)` — **exit 1** ✓ |

(Le 4ᵉ contrefactuel — frère pointé vers un chemin inexistant — a été joué et vérifié côté Cockpit ;
le mécanisme est **identique par byte-identité du script**, il n'a pas été rejoué une seconde fois
dans ce sens pour éviter une redite sans valeur ajoutée — le code exécuté est **le même fichier à
l'octet près**.)

Les 3 contrefactuels **révoqués** après mesure (`diff` de la copie mutée contre sa sauvegarde : vide).
`grep -n readdirSync scripts/test-convergence.mjs` → **une seule occurrence, dans un commentaire**
décrivant l'ancienne version — **aucune énumération dans le code exécutable** (CA-D1 satisfait).

## 3. `release.yml` — convention entière transposée d'`iakaInstall`

- `releaseDraft: true` posé une fois (l. 184) ; `releaseId` (l. 178) remplace `tagName`/`releaseName`.
- `prepare` crée le brouillon une seule fois par API (l. 100), exporte l'id.
- `publier:` → `needs: [build]`, **sans `if:`** (l. 221-222).
- `latest:` → `needs: publier`, **`if: always()` conservé** (l. 338-343).
- `grep -n "gh api.*--jq.*--arg"` → **vide**.
- `scripts/__tests__/release-publication.test.mjs` rejoué individuellement : **18/18 verts**
  (identique bit à bit au fichier Cockpit, donc mêmes témoins et contrefactuels CA-R1/R2/R3/R10).
- `scripts/__tests__/release-publier-shell.test.mjs` rejoué individuellement (après le flake du 1er
  passage) : **6/6 verts**, y compris le contrefactuel qui rejoue le texte d'avant correctif et
  rougit sur `accepts 1 arg(s)`.

**Diff `release.yml` GUI ↔ `iakaInstall`** : structure de base différente (même remarque que côté
Cockpit) — les points exigés par AR-C6(a) sont ceux transposés et vérifiés ligne à ligne ci-dessus.

**Diff `release.yml` GUI ↔ Cockpit** : deux divergences préexistantes et déclarées, **non touchées en
passant** — le GUI ne porte **pas** `libasound2-dev cmake pkg-config` dans ses dépendances Linux
(écart connu M-R6/`CONVERGENCE-RELEASE-YML-ALIGNEMENT`), et un commentaire minisign de formulation
différente (fond identique). Le reste des différences textuelles n'est que le nom du dépôt dans les
commentaires (`…-COCKPIT` vs `…-GUI`) — légitime.

**Cliquet `fixtures/bloc-latest.sha256`** : refixé, motif daté, anciennes valeurs conservées.
Empreinte recalculée avec `scripts/lib/bloc-latest.mjs` :
`55b39b01dfe655c28f24f678481a050f75fca16e5e347f54a2b74f071502eaf7` — **identique à la valeur du
fichier ET identique à celle recalculée côté Cockpit**.

## 4. `rendreSecurite` — remontée depuis `iakaInstall`

`fixtures/vitrine-locale.json` porte `absences_de_signature` (2 entrées identiques en structure à
celles du Cockpit — `macos-notarisation`, `windows-signature` — motif/depuis/condition_de_levee/
procedure), mesure dite **« STRUCTURELLE »** (pas `codesign`/`spctl`), conforme à l'énoncé.

README régénéré identique : `npm run vitrine:check` → `0` (`README aligne sur v0.1.8 (3 zone(s))`).

**Cliquet offline** (`scripts/__tests__/vitrine.test.mjs`) : fichier **byte-identique** au Cockpit
(§ 1), donc mêmes témoins/contrefactuels (témoin positif vert, câblage `APPLE_CERTIFICATE`/
`WINDOWS_CERTIFICATE` sur copie → rouge nommé) — déjà vérifiés dans les 1363 tests verts du 2e
passage complet.

## 5. Documentation

- `CLAUDE.md` § Backlog : entrée `CONVERGENCE-TROIS-FRERES (lot 1)` avec chiffres cités
  (`test:rust 0, 116 passed`, `test:convergence` cité verbatim) — **identiques à mes propres
  mesures**.
- Successeurs nommés présents : **lot 2 `iakaInstall`** et **`CONVERGENCE-RELEASE-YML-ALIGNEMENT`**,
  mot pour mot, à l'identique du Cockpit.
- `specs/PROJET.md` : entrée datée 2026-09-08 sur la convergence à trois.
- `specs/instructions/release-brouillon-jusqua-matrice-verte-gui.md` porte en tête le cartouche
  exact : *« Déposée par 🔷 Odin depuis `iakaInstall` (canal d'écriture d'un agent d'iakaInstall
  borné à ce dépôt, CA-R11) […] Jouée le 2026-09-08 par ⚒️ Gimli (posture portefeuille) […] REMISE
  AU GATE 🏹 Legolas, non auto-validée. »* — conforme, identique au cartouche Cockpit à
  Cockpit/GUI près.

## 6. `.claude/settings.local.json`
N'existe pas dans ce dépôt (`ls .claude/` : absent) — point de contrôle sans objet ici, il ne
concernait explicitement que `IakaCockpit`.

## Contrefactuels — synthèse
7 contrefactuels joués pour ce dépôt (3 sur la face croisée `test:convergence` en direct + 1 hérité
de la byte-identité côté Cockpit, sur le cliquet offline de sécurité hérité par byte-identité, plus
les contrefactuels internes des suites de release déjà comptés dans les 1363 tests verts). Tous
révoqués, tous nommés.

## Écarts relevés (non bloquants)
- **Flake du 1er passage `test:all`** (§ dédiée ci-dessus) — attribué à la contention CPU du poste
  (suite Cockpit tournant simultanément), pas reproduit sur deux rejeux indépendants. À surveiller
  si récurrent, cohérent avec un signalement déjà tracé (non bloquant) sur d'autres gates du Cockpit.
- Même écart que côté Cockpit sur le libellé exact « run de preuve = prochain tag », non répété mot
  pour mot dans `CLAUDE.md` (vit dans l'instruction déposée, CA-B8) — non bloquant.

## Ce qui reste au décideur
- **Run de preuve** (CA-B8/CA-B9) : le prochain tag réel de `iakaFrameGUI`, run nominal 4/4 vert +
  run saboté prouvant le brouillon conservé. **Acte de release, refusé aux agents.**
- Poser les secrets Apple/Windows si la levée des `absences_de_signature` est un jour décidée.
- Trancher/traiter `CONVERGENCE-RELEASE-YML-ALIGNEMENT`.
- Jouer le **lot 2** (`iakaInstall`), hors périmètre de ce gate.

[PORTEFEUILLE][Legolas] 🔴
