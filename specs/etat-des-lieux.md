# Etat des lieux - iakaFrameGUI

> Regenere manuellement le 2026-07-15 (motif: reprise) apres le palier **fonctions fichier +
> persistance bibliotheque** (merge `2a950fc`, gate Legolas PASS, pousse). Corrige un decalage :
> la session precedente avait ete **coupee net juste apres le merge**, avant la regeneration ;
> l'ancien recit s'arretait a E2c et decrivait a tort ce palier comme « cadre, en attente ».
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.0 (dev en cours, **non encore tague** ; forge feature-complete + gestes fichier) |
| Branche | main |
| Sync remote | **a jour avec origin/main** (0 ahead / 0 behind ; `2a950fc` pousse) |
| Dernier commit | `2a950fc` merge(gui): fonctions fichier + persistance bibliotheque (gate Legolas PASS) — 2026-07-15 |
| Arbre | propre |
| Commits | 65 |
| Fichiers suivis (hors node_modules) | 180 |
| Tests | **287 verts** (`npm run test`, 37 fichiers) |

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

## Reprise du travail

- **Ce qui vient d'etre fait (dernier palier)** : **fonctions fichier + persistance bibliotheque**
  (cadrage `gui-fonctions-fichier-persistance.md` VALIDE puis **implemente, gate Legolas PASS, merge `2a950fc`,
  pousse**). Cote **IHM** : les 5 gestes New/Open/Save/Save As/Close sous les 3 onglets, `DocTitle` centre,
  Settings racine, garde « modifs non sauvees ». Cote **interne** : `useForgeDocument<T>`, (de)serialiseurs
  frontmatter .md par type, `library_store` Rust sous pathguard. **287 tests verts.** NB : la session
  precedente s'est arretee juste apres ce merge, **avant** la regeneration de l'etat des lieux — d'ou le
  present rattrapage.
- **Demande du decideur a (re)traiter — recuperee 2026-07-15 (elle avait disparu du backlog)** :
  - **Champ nom EDITABLE en grand, au milieu, sous les boutons fichier.** Aujourd'hui `DocTitle`
    (`src/forge/DocTitle.tsx`) est **purement presentationnel** (affiche le nom, non editable ; le renommage
    passe seulement par Save As). Le decideur veut pouvoir **editer le nom directement** dans ce grand titre
    centre place **sous la `DocBar`**. -> a cadrer (edition inline, propagation `name`/`dirty`, non-destructif).
  - **Fonction New** — le bouton New existe deja dans `DocBar` (`doc.requestNew`) ; a **verifier/consolider
    dans le parcours vecu** (creer un artefact vierge « sans-titre », puis nommer via le champ editable
    ci-dessus). Confirmer que le geste attendu par le decideur est bien couvert.
- **A reprendre / backlog** :
  - **Couche CLI/terminal** sur la bibliotheque : `list` / `add` (= livraison) / `assemble` / `switch` —
    cadrage a faire.
  - **Persistance Methode/Kit** (l'etat local repartait a zero) — desormais couverte par le palier fichier
    pour les 3 onglets via `.md` ; **handoff Rust** additif encore differe.
  - **Vrai LLM d'authoring** du copilote (E2c = mock) — differe.
  - **Micro-dette** : `iakaframe` `library/skills/README.md` obsolete (« Treize skills » + ancien chemin
    `agents/`).
  - **Recette visuelle/interactive fine** = geste humain (Legolas ne valide pas le pixel).
- **Prochaine etape concrete** : **cadrer le champ nom editable** (`DocTitle` -> input inline sous la `DocBar`)
  + verifier le geste New de bout en bout, AVANT de coder ; puis la couche CLI/terminal de la bibliotheque
  (`list`/`add`/`assemble`/`switch`).
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
