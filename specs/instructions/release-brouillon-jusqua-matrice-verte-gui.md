# RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-GUI + convergence (jumelle déposée)

> **Déposée par 🔷 Odin depuis `iakaInstall` (canal d'écriture d'un agent d'iakaInstall borné à ce dépôt, CA-R11) — copie des Annexes B et C de `specs/instructions/convergence-trois-freres.md` (iakaInstall), lot `CONVERGENCE-TROIS-FRERES`. Jouée le 2026-09-08 par ⚒️ Gimli (posture portefeuille), branche `feat/convergence-trois-freres`, REMISE AU GATE 🏹 Legolas, non auto-validée.**
>
> Rappel de cadrage (§ 0 à § 3 du corps de l'instruction, non recopiés ici, lire la source) :
> verdicts AR-C1(a), AR-C2(a), AR-C3(b), AR-C4(a), AR-C5(a), AR-C6(a). Lot 2 (`iakaInstall` lui-même,
> registre à trois entrées) est un successeur SÉPARÉ, hors périmètre de ce dépôt.

---


## ANNEXE B — `RELEASE-BROUILLON-JUSQUA-MATRICE-VERTE-GUI`

> **Même mandat que l'annexe A, dans `iakaFrameGUI`.** Les deux `release.yml` portent, au 2026-09-08,
> **les mêmes numéros de ligne** pour les points en cause (`:103-105`, `:127`, `:185-190`) : le geste
> est **identique**, le fichier est **différent**.

**Ce qui change par rapport à l'annexe A, et rien d'autre :**

1. **`scripts/quality.sh` n'existe pas dans ce dépôt** — la chaîne qualité s'y rend en **lignes
   séparées** : `npm run lint:all`, `npm run test:all`, **`npm run test:rust` sur une ligne
   distincte et obligatoire** (arbitrage écrit dans le `package.json` lui-même ; une formule
   d'ensemble vaut **FAIL**).
2. Les **écarts connus** avec le Cockpit — dépendances Linux l. 72, commentaire minisign l. 96-99 —
   **ne sont pas corrigés en passant**.
3. Les critères deviennent **CA-B1..CA-B9**, mot pour mot ceux d'A.5, avec **CA-B7** miroir :
   `fixtures/convergence.sha256` byte-identique avec `IakaCockpit`.

⚠️ **A et B sont UN SEUL commit logique.** `fixtures/bloc-latest.sha256` est un fichier
**convergent** (`convergence.sha256:44`) : jouer A sans B fait diverger le registre et rougir la
face croisée des deux côtés. **Aucune des deux ne se fusionne seule.**

---


## ANNEXE C — LOT 1, la part CONVERGENCE des deux sœurs

> **À déposer par 🔷 Odin dans les deux dépôts** — un seul commit logique. **Précède le lot 2**
> (AR-C4).

### C.1 Ce qui est livré (sous réserve d'AR-C1, AR-C2, AR-C5)

1. **`fixtures/freres.json`** dans chaque sœur — **local**, hors registre, nommant **les deux
   autres** dépôts (`iakaInstall` **compris**, bien qu'absent : AR-C2(a) le rend inoffensif), avec
   chemin relatif attendu et **une raison par entrée**.
2. **`scripts/test-convergence.mjs`** réécrit, **byte-identique entre les deux sœurs** :
   - résolution **par `freres.json`**, plus aucune énumération de voisins ;
   - `IAKA_CONVERGENCE_HOME` **conservé et autoritaire** (exit 2 inchangé) ;
   - mesure **N-1** : chaque frère nommé et présent est comparé ;
   - **SKIP NOMMÉ** pour un frère nommé et absent (exit 0), la ligne de succès **énumérant** mesurés
     et sautés — **forme reprise de `verifier-canaux-en-ligne.mjs:134`**, jamais réinventée ;
   - comparaison sur l'**INTERSECTION des deux registres** (AR-C3(b)), avec le compte **hors
     comparaison** dit ;
   - le hors-couverture `:59-68` **retiré en le datant** — il est **fermé**, c'est le lot.
3. **Remontée de `rendreSecurite()`** (AR-C5(a)) : la fonction, la zone `securite`, les deux
   fonctions du **cliquet offline**, et la clé `absences_de_signature` dans le
   `fixtures/vitrine-locale.json` **local** de chaque sœur — avec **son** motif, **sa** date, **sa**
   condition de levée. Les 5 fichiers de vitrine redeviennent alors byte-identiques **avec
   `iakaInstall`** et deviennent inscriptibles au registre à trois.
4. **README des deux sœurs régénérés** (`vitrine -- --write`), `vitrine:check` **0**,
   `vitrine:en-ligne` **rejoué et son code cité** (un `3` n'est jamais un succès).
5. **`fixtures/convergence.sha256` régénéré** des deux côtés, cliquet **relevé si et seulement si**
   un fichier **neuf** est inscrit ; `CLAUDE.md` des deux sœurs mis à jour (§ Convergence : la règle
   à trois).

**⚠️ AJOUT DATÉ (2026-09-08, gate 🏹 Legolas FAIL sur `iakaInstall`,
`docs/qualite/gate-garde-face-en-ligne-vitrine.md`, `f97835a`) — un bloc à REMONTER, candidat pour
ce lot 1.** `scripts/__tests__/vitrine-en-ligne.test.mjs` (successeur `GARDE-FACE-EN-LIGNE-
VITRINE-INSTALL`) porte, chez `iakaInstall` seul, un bloc `describe("Contrefactuel — un SKIP
travesti en succès…")` (2 `it`) **absent des deux sœurs** — ajouté sur exigence explicite d'🟠
Aragorn, pas par le cadrage d'origine du F-3. Il verrouille que le code `3`/« NON MESURE » ne
puisse jamais se travestir en succès (`0` + `OK —`), avec un témoin de contraste anti-vide.
**Candidat à porter dans le `vitrine-en-ligne.test.mjs` des deux sœurs** dans ce lot 1, pour que
les trois dépôts restent alignés sur la même garde — **non tranché ici**, décision du décideur/du
cadrage qui jouera ce lot.

### C.2 Critères

- [ ] **CA-D1** — plus aucun `readdirSync` de voisin dans `test-convergence.mjs`.
      *Contrefactuel* : `freres.json` vidé ⇒ SKIP global nommé, **jamais** un repli deviné.
- [ ] **CA-D2** — un frère nommé absent ⇒ **SKIP nommé**, exit 0, ligne de succès honnête, **avec
      témoin de contraste** (verrou anti-témoin-vide).
- [ ] **CA-D3** — `IAKA_CONVERGENCE_HOME` **inchangé dans son comportement** : chemin sans registre
      ⇒ exit **2**, aucun repli. *Contrefactuel* : rétablir un repli ⇒ rouge nommé.
- [ ] **CA-D4** — les deux `test-convergence.mjs` et les deux `convergence.sha256` sont
      byte-identiques **entre sœurs**. *Vérif* : `diff` vide.
- [ ] **CA-D5** — `rendreSecurite` remonté : les 5 fichiers de vitrine sont byte-identiques **entre
      les trois dépôts**. *Vérif* : empreintes des trois côtés, citées.
- [ ] **CA-D6** — le **cliquet offline** rougit sur chaque sœur si son `release.yml` câble un `env:`
      `APPLE_*`/`WINDOWS_*` actif. *Contrefactuel* : injecter le câblage sur une **copie en
      mémoire** ⇒ rouge nommé ; révoquer, `sha256` inchangé.
- [ ] **CA-D7** — chaîne qualité verte des deux côtés, **une ligne par commande** (`quality.sh` côté
      Cockpit ; `lint:all` + `test:all` + **`test:rust`** côté GUI).

---

