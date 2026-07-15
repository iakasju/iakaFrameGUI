# Etat des lieux - iakaFrameGUI

> Regenere manuellement le 2026-07-15 (motif: pause) apres le lot **DocTitle editable + New**
> (merge `fc22eec`) et la cloture cross-depot de la **couche CLI bibliotheque** (depot `iakaframe`
> main `2c85702`, gate Legolas PASS 86/86). A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.0 (dev en cours, **non encore tague** ; forge feature-complete + gestes fichier + titre editable) |
| Branche | main |
| Sync remote | **a jour avec origin/main** (0 ahead / 0 behind ; `8158307` pousse) |
| Dernier commit | `8158307` docs(backlog) ; derniere feature GUI = `fc22eec` DocTitle editable + New — 2026-07-15 |
| Arbre | propre |
| Commits | 78 |
| Fichiers suivis (hors node_modules) | 182 |
| Tests | **301 verts** GUI (`npm run test`, 37 fichiers) ; CLI `iakaframe` **86 verts** |

## Ce qui est livre (code committe)

- **P0** — contrat de concepts (`specs/contrat-concepts.md`) + glossaire (`specs/glossaire-concepts.md`).
- **Coeur partage** `@iakaframe/core` (`packages/core/`) : types de concepts, referentiels, parseurs defensifs,
  enums de vocabulaire canonique (RunnerKind, NodeKind, KitFormat) + tests.
- **P1** — coquille Tauri (React+TS / Rust mince) + authoring persona/team ; cote Rust
  `paths`/`pathguard`/`teams_store` (persistance JSON).
- **P3 / P3b / P3c** — adaptateurs de runner : Claude Code, AGENTS.md codex, ollama-localhost/lan (4 noeuds),
  Open WebUI (Models JSON, 5e noeud).
- **P4** — ecran « Generer & Deployer » (`useForgeDeploy` + composants + nav + plugin Tauri dialog).
- **P5** — skin Cinabre par defaut + selecteur de charte (data-theme, persistance).
- **P6** — Workflow/Phase/Gate comme concept en donnee + renderer mutualise (golden P6 byte-identique preserve).
- **H1** — handoff forge -> cockpit (livraison du paquet, MVP) — `src-tauri/src/handoff.rs`.
- **E2a** — cœur `@iakaframe/core` refondu : types `Method`/`Principle`/`Ritual`/`Scaffold`/`Kit`, catalogues
  par id (**14 principes**), `resolveWorkflow(method)` ; Team purifiee (retrait de `methodId`/`workflowId`).
  Merge `8aad61b`.
- **E2b** — GUI de la forge : **3 onglets Team · Methode · Kit**, rail-stock accordeon avec insertion reelle (`+`),
  MD depliable recursif, graphe contextuel (flux Methode / apercu-fichier Team+Kit), carte Binding
  « defaut suggere — override Cockpit », vignettes + upload. Merge `b71e86f`.
- **Charte « Studio clair »** — portee depuis le reservoir `iakagraph/theme/studio/clair` (papier + indigo #5b5bd6),
  AA respecte ; **Cinabre reste le defaut**. Merge `7ef37d3`.
- **E2c** — copilote de forge **mocke deterministe** (zero reseau) : boucle
  **intention -> proposition -> diff -> Valider/Rejeter** ; Valider materialise reellement ; frontiere
  **runner d'authoring != runner d'execution** verrouillee par test. Merge `867c3c7`.
- **Fonctions fichier + persistance bibliotheque** (cadrage `specs/instructions/gui-fonctions-fichier-persistance.md`,
  merge `2a950fc`, **gate Legolas PASS + pousse**) :
  - **Ecrans IHM** — barre de gestes fichier **New · Open · Save · Save As · Close** sous **chacun des
    3 onglets** (`src/forge/DocBar.tsx`), avec garde « modifs non sauvees », liste Open (scan collection),
    invite Save As non destructive ; **`DocTitle`** grand/centre sous la barre d'onglets (`•` si dirty) ;
    **Settings racine** (`SettingsRoot`) + cablage du Save (`fec56b4`, `validateRefs` runtime team+methode,
    scan pool `library/`). Commits `228f0bf`/`d86a668`.
  - **Palier interne (persistance reelle .md)** — hook generique `useForgeDocument<T>` (5 gestes,
    dirty tracking) + facade `library*` ; cote coeur, (de)serialiseurs **frontmatter .md par type**
    (team/method/kit), zero-dep (`b846f4c`) ; cote Rust, `library_store` .md sous pathguard
    `IAKAFRAME_HOME` + `resolve_iakaframe_home` (`d867561`).
- **DocTitle editable + consolidation New** (instruction `specs/instructions/gui-doctitle-editable-et-new.md`,
  merge `fc22eec`, **gate Legolas PASS 301/301 + pousse**) : le grand titre central est **editable en ligne**
  pour **Team et Methode** (Kit read-only, sans champ `name`) — input controle labellise (`aria-label`,
  texte libre non slugifie, `•` dirty preserve). Hook : `setName` + `canRename` + `withName?` dans `DocConfig`
  (ne touche ni `id` ni `source`, no-op si vierge). Invite **Save As prereremplie** depuis le nom saisi
  (`nom -> slugifyId(id)`). Geste **New** confirme de bout en bout (creer vierge -> nommer -> Save As).
  Zero Rust, facade unique preservee (AR-1 tenue : `withName` ne pose qu'un libelle). Commits `242b0c4`->`cab86a3`.

## Reprise du travail

- **Ce qui vient d'etre fait (dernier lot)** : **DocTitle editable + consolidation New**
  (cadrage Gandalf `gui-doctitle-editable-et-new.md` VALIDE « tout vert » Q-1..Q-5 -> implemente par Gimli
  sur `feat/doctitle-editable` -> **gate Legolas independant PASS 301/301** -> merge `--no-ff` `fc22eec` ->
  pousse). Le grand titre central devient **editable en ligne** (Team/Methode ; Kit read-only), Save As
  prereremplie, geste New confirme. Repond a la **demande du decideur recuperee** ce jour (le champ nom
  n'etait qu'affiche, pas editable). Zero Rust, facade unique preservee.
- **Palier precedent (meme jour)** : **fonctions fichier + persistance bibliotheque** (merge `2a950fc`,
  gate PASS) — 5 gestes New/Open/Save/Save As/Close sous les 3 onglets, `DocTitle`, Settings racine ; cote
  interne `useForgeDocument<T>`, (de)serialiseurs frontmatter .md, `library_store` Rust sous pathguard.
- **Reliquat de ce lot : SOLDE** — **recette visuelle humaine PASSEE (RAS) 2026-07-15** :
  titre editable Team/Methode OK, `•` dirty OK, Save As prereremplie OK, Kit read-only OK
  (`npm run tauri dev`). **Reserve non bloquante consignee (pas de code) : le geste `New` est un
  no-op visuel** — `requestNew`->`loadBlank` recharge un starter identique a celui deja seme au
  montage (`ForgeShell.tsx:118-126`), donc aucun changement a l'ecran dans l'etat pristine. Le bouton
  fire bien ; ce n'est pas un crash. Arbitrage « que doit produire New (vierge a nommer vs starter) »
  **reporte par le decideur** (« on garde pour l'instant »).
- **Chantier connexe cross-depot CLOS (meme jour)** : la **couche CLI/terminal de la bibliotheque**
  (depot `iakaframe`, hors ce depot) etait deja livree (5 verbes `list`/`show`/`assemble`/`add`/`switch`, pool
  materialise) ; un **lot de convergence** l'a alignee sur la GUI/cœur — racine partagee `<chapeau>/iakaframe`,
  binding E1 (`node`/`origin`, additif), parite `assemble`<->`@iakaframe/core` (golden byte-a-byte), bonus
  `etat.test.js` repare. Merge `iakaframe` `2c85702`, gate Legolas PASS **86/86**, pousse. Cadrage de ratification :
  `specs/instructions/cli-bibliotheque-list-add-assemble-switch.md`.
- **A reprendre / backlog** :
  - **CLI bibliotheque** : CLOS (cf. ci-dessus). Reserve mineure non bloquante : CLI `existsSync` vs GUI
    `is_dir()` sur le marqueur de racine (cas de bord).
  - **Persistance Methode/Kit** (l'etat local repartait a zero) — desormais couverte par le palier fichier
    pour les 3 onglets via `.md` ; **handoff Rust** additif encore differe.
  - **Vrai LLM d'authoring** du copilote (E2c = mock) — differe.
  - **Micro-dette** : `iakaframe` `library/skills/README.md` obsolete (« Treize skills » + ancien chemin
    `agents/`).
  - **Recette visuelle/interactive fine** = geste humain (Legolas ne valide pas le pixel).
  - **Reserve New** (non bloquante, sans code) : arbitrage du comportement de `New` reporte (cf. supra).
- **Prochaine etape concrete** : recette du titre editable **PASSEE**. Au choix desormais :
  **editeur de workflow** (P6 read-only), **P7 Binding reel** (cadre, non code), ou **modele Methode elargi**
  (assemblage de principes composables, a graver par Gandalf). CLI bibliotheque = CLOS.
- **Pieges connus** : le couple **runner+modele n'appartient JAMAIS a la Team ni a la Methode** — uniquement au
  **Binding**, propriete du Cockpit. **Deux selecteurs de runner distincts** : runner d'authoring (build-time,
  du copilote) != runner d'execution (run-time). Golden P6 byte-identique a preserver. Persistance .md sous
  pathguard `IAKAFRAME_HOME` (ne jamais ecrire hors de ce perimetre).

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-05 22:24 | version | v0.1.0 | main | onboarding initial |
| 2026-07-11 | reprise | v0.1.0 | main | reconciliation etat des lieux + backlog ; MVP forge quasi complet (33 commits, H1 livre) |
| 2026-07-15 | pause | v0.1.0 | main | seance E2 (a+b+c) : Methode != Team bindes au Cockpit + copilote mocke + charte Studio clair ; 57 commits, 237 tests verts |
| 2026-07-15 | reprise | v0.1.0 | main | rattrapage post-coupure : le palier **fonctions fichier + persistance bibliotheque** (merge `2a950fc`, gate PASS, pousse) etait absent du recit (session coupee avant regen). 65 commits, 180 fichiers, **287 tests verts**. Demande recuperee : **champ nom editable en grand sous les boutons fichier** + verifier **New**. |
| 2026-07-15 | pause | v0.1.0 | main | lot **DocTitle editable + New** livre : titre editable en ligne (Team/Methode ; Kit read-only), Save As prereremplie, New confirme. Chaine Gandalf->Gimli->gate Legolas PASS **301/301**->merge `fc22eec`->pousse. 74 commits, 180 fichiers. Reliquat = recette visuelle humaine. |
| 2026-07-15 | pause | v0.1.0 | main | cloture cross-depot **couche CLI bibliotheque** (`iakaframe`) : lot de convergence (racine partagee, binding E1, parite `assemble`<->cœur + golden) merge `iakaframe` `2c85702`, gate Legolas PASS **86/86**, pousse. GUI = 78 commits, 182 fichiers. Prochain = recette visuelle titre editable ; puis editeur workflow / P7 / modele Methode elargi. |
| 2026-07-15 | reprise | v0.1.0 | main | **recette visuelle titre editable PASSEE (RAS)** : titre editable Team/Methode, `•` dirty, Save As prereremplie, Kit read-only — tous OK. Reserve non bloquante consignee (sans code) : **geste `New` = no-op visuel** (recharge un starter identique au seme du montage) ; arbitrage reporte par le decideur. Reliquat du lot DocTitle = SOLDE. Prochain = editeur workflow / P7 / modele Methode elargi. |
