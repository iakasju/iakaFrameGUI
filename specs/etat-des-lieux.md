# Etat des lieux - iakaFrameGUI

> Regenere manuellement le 2026-07-15 (motif: pause) apres la seance E2 (a+b+c).
> Refonte majeure : la Methode et la Team sont desormais deux artefacts orthogonaux,
> bindes au Cockpit. A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.0 (dev en cours, **non encore tague** ; forge E2 livree) |
| Branche | main |
| Sync remote | **a jour avec origin/main** (0 ahead / 0 behind) |
| Dernier commit | `867c3c7` merge(e2c): copilote de forge mocke (gate Legolas PASS) — 2026-07-15 |
| Arbre | propre |
| Commits | 57 |
| Fichiers suivis (hors node_modules) | 155 |
| Tests | **237 verts** (`npm run test`) |

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

## Reprise du travail

- **Ce qui vient d'etre fait (cette seance)** : **E2 complet (a+b+c)** — refonte separant **Methode != Team**
  (deux artefacts orthogonaux, bindes au Cockpit). E2a (cœur : Method/Principle/Ritual/Scaffold/Kit, 14 principes,
  `resolveWorkflow`, Team purifiee), E2b (forge 3 onglets, rail-stock avec insertion reelle, graphe contextuel,
  carte Binding, vignettes/upload), E2c (copilote mocke deterministe, boucle proposition/diff/valider/rejeter,
  frontiere runner d'authoring != execution). Chaque jalon : **gate Legolas independant PASS**, merge `--no-ff`
  et pousse. **237 tests verts.** Charte « Studio clair » portee depuis `iakagraph/theme/studio/clair` (PASS +
  pousse). Design : 4 series de maquettes (`iakagraph/etudes/iakaframegui/` v1->v4) -> convergence v4 validee
  (rail H1 + graphe contextuel flux/apercu). Hors ce depot : la vraie team + la vraie methode ont ete rangees
  en bibliotheque pool/assemblages dans le depot `iakaframe` (`library/` + `teams/methods/bindings/kits/`) —
  chantier connexe, PASS Legolas, pousse.
- **A reprendre / backlog** :
  - **Couche CLI/terminal** sur la bibliotheque : `list` / `add` (= livraison) / `assemble` / `switch` —
    cadrage a faire.
  - **Persistance Methode/Kit** (aujourd'hui etat local, repart a zero au lancement) et **handoff Rust**
    additif — differes.
  - **Vrai LLM d'authoring** du copilote (E2c = mock) — differe.
  - **Micro-dette** : `iakaframe` `library/skills/README.md` obsolete (« Treize skills » + ancien chemin
    `agents/`).
  - **Recette visuelle/interactive fine** = geste humain (Legolas ne valide pas le pixel).
- **Prochaine etape concrete** : cadrer la **couche CLI/terminal** de la bibliotheque
  (`list`/`add`/`assemble`/`switch`) avant de coder.
- **Pieges connus** : le couple **runner+modele n'appartient JAMAIS a la Team ni a la Methode** — uniquement au
  **Binding**, propriete du Cockpit. **Deux selecteurs de runner distincts** : runner d'authoring (build-time,
  du copilote) != runner d'execution (run-time). Golden P6 byte-identique a preserver.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-05 22:24 | version | v0.1.0 | main | onboarding initial |
| 2026-07-11 | reprise | v0.1.0 | main | reconciliation etat des lieux + backlog ; MVP forge quasi complet (33 commits, H1 livre) |
| 2026-07-15 | pause | v0.1.0 | main | seance E2 (a+b+c) : Methode != Team bindes au Cockpit + copilote mocke + charte Studio clair ; 57 commits, 237 tests verts |
| 2026-07-15 | reprise | v0.1.0 | main | reprise post-E2 : arbre propre, a jour origin/main. Cadrage `gui-fonctions-fichier-persistance.md` livre (commit 3eadcb8) — **CADRE, EN ATTENTE DE VALIDATION du decideur** (6 arbitrages Q-1..Q-6). Aucune implementation avant feu vert. |
</content>
</invoke>
