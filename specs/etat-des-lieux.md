# Etat des lieux - iakaFrameGUI

> Regenere manuellement (reconciliation) le 2026-07-11 (motif: reprise).
> Le precedent etat etait fige a l'onboarding (v0.1.0, 1 commit) alors que le depot
> compte 33 commits et un MVP de forge quasi complet. A regenerer a chaque changement
> de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.0 (dev en cours, **non encore tague** ; MVP forge quasi complet) |
| Branche | main |
| Sync remote | **a jour avec origin/main** (0 ahead / 0 behind) |
| Dernier commit | `e1b5a0b` feat(handoff): livraison du paquet forge -> cockpit (H1 MVP) — 2026-07-07 |
| Arbre | propre, sauf `doc/index.html` **non suivi** (a committer ou ignorer) |
| Commits | 33 |
| Fichiers suivis (hors node_modules) | 125 |
| Tests presents | 16 fichiers (10 dans packages/core, 6 en front) — verdict qualite non relance dans ce checkpoint |

## Ce qui est livre (code committe)

- **P0** — contrat de concepts (`specs/contrat-concepts.md`) + glossaire (`specs/glossaire-concepts.md`) : livres.
- **Coeur partage** `@iakaframe/core` (`packages/core/`) : types de concepts, referentiels, parseurs defensifs,
  enums de vocabulaire canonique (RunnerKind, NodeKind, KitFormat) + tests.
- **P1** — coquille Tauri (React+TS / Rust mince) + authoring persona/team : facade unique d'invoke,
  `useForgeTeams`, editeurs persona/team, vues ; cote Rust `paths`/`pathguard`/`teams_store` (persistance JSON).
- **P3** — adaptateur de runner Claude Code (generateur pur team -> KitFileTree) + commande Tauri `kit_deploy`
  (deploiement disque non destructif).
- **P3b** — adaptateurs AGENTS.md codex + ollama-localhost/lan (4 noeuds).
- **P3c** — adaptateur Open WebUI (Models JSON, 5e noeud).
- **P4** — ecran « Generer & Deployer » (`useForgeDeploy` + composants + nav + plugin Tauri dialog / pickDirectory).
- **P5** — skin Cinabre par defaut + selecteur de charte (data-theme, persistance).
- **P6** — Workflow/Phase/Gate comme concept en donnee + renderer mutualise + affichage read-only du workflow.
- **H1** — handoff forge -> cockpit (livraison du paquet, MVP) — `src-tauri/src/handoff.rs`.

## Reprise du travail

- **Ce qui vient d'etre fait** : MVP de la forge monte de bout en bout — coeur de concepts partage, authoring
  persona/team, 5 adaptateurs de runner (claude, codex, ollama x2, open webui), ecran Generer & Deployer, skin
  Cinabre, workflows en donnee, et le handoff forge->cockpit (H1). L'etat des lieux et le backlog PROJET.md ont
  ete reconcilies avec la realite du code (ils etaient en retard).
- **En cours / a reprendre** : E1 (Binding + AR-1 revise, modele 3 couches) et P7 (etape de liaison au
  deploiement) sont **cadres, pas encore implementes**. Le refactor de vocabulaire du CLI @naonedge/iakaframe
  (P2, volet CLI) reste hors ce depot.
- **Prochaine etape concrete** : trancher le jalon E1/P7 (valider le modele 3 couches Team/Binding/Kit) puis
  confier l'implementation de la liaison Binding au developpeur. Committer/statuer sur `doc/index.html`.
- **Pieges connus** : le couple runner+modele par persona n'appartient PAS a la forge (concept run-time, propriete
  du Cockpit) — ne pas le reintroduire ici. Adaptateur de METHODE (BMAD/MetaGPT/SPARC) = post-MVP, aucun code au
  MVP. Chiffres/versions de la surface Claude Code a revérifier avant tout cablage dur.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-05 22:24 | version | v0.1.0 | main | onboarding initial |
| 2026-07-11 | reprise | v0.1.0 | main | reconciliation etat des lieux + backlog ; MVP forge quasi complet (33 commits, H1 livre) |
