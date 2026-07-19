# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-07-19 11:15 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.3.3 |
| Branche | main |
| Dernier commit | 3925419 chore(iakaframe): update etat des lieux + commit global (version v0.3.2) |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 15145 |
| Note | Open frame LOT 1 (socle G1-G5) : backend pool_read_all/pool_read (contenu des atomes) + bindings chargeable (COLLECTIONS 4->5) ; loader frame.ts (11 types + integrite checkFrameRefs + workflow compte 1x) ; action UI OpenFramePanel + bouton 'Ouvrir un frame'. Charge SF2 : 8/8/16/5/3/2/1/17/1/1/1, 0 dangling. Gate Legolas PASS (412 front + 63 Rust verts). G6 (entite Portfolio) = LOT 2 a venir. Cablage IPC Tauri + test OpenFramePanel a recetter. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `3925419` | 2026-07-19 | chore(iakaframe): update etat des lieux + commit global (version v0.3.2) |
| `5f7ab2c` | 2026-07-19 | chore(iakaframe): update etat des lieux + commit global (version v0.3.1) |
| `f6cd81c` | 2026-07-18 | chore(iakaframe): update etat des lieux + commit global (version v0.3.0) |
| `a65a9c7` | 2026-07-18 | merge(binding): Lot B1 — triplet persona {runner,model,tools} + 5 runners + host-isation codex (decouple d'open-frame) |
| `6a41073` | 2026-07-18 | test(binding): tools defensifs + illustration team iakaframe multi-runner (B1) |
| `c19dc1c` | 2026-07-18 | feat(binding): triplet runner/model/tools par persona + host-isation codex (B1) |
| `bc4a1db` | 2026-07-18 | chore(iakaframe): update etat des lieux + commit global (version v0.2.0) |
| `ed96639` | 2026-07-18 | merge(vocab): Lot B2 — split host<->runner + chatgpt/litellm + toolKinds (source de verite core) |
| `8801c09` | 2026-07-18 | test(binding): repercute le renommage runner sur les alias (ps->claude, ollama->ollama-local) |
| `95bc9d3` | 2026-07-18 | test(runner): aligne l'enum runner sur le modele persona (renommage + alias legacy) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : <!-- ... -->
- **En cours / a reprendre** : <!-- ... -->
- **Prochaine etape concrete** : <!-- premiere action a faire en reprenant -->
- **Pieges connus** : <!-- ... -->

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-19 11:15 | version | v0.3.3 | main | Open frame LOT 1 (socle G1-G5) : backend pool_read_all/pool_read (contenu des atomes) + bindings chargeable (COLLECTIONS 4->5) ; loader frame.ts (11 types + integrite checkFrameRefs + workflow compte 1x) ; action UI OpenFramePanel + bouton 'Ouvrir un frame'. Charge SF2 : 8/8/16/5/3/2/1/17/1/1/1, 0 dangling. Gate Legolas PASS (412 front + 63 Rust verts). G6 (entite Portfolio) = LOT 2 a venir. Cablage IPC Tauri + test OpenFramePanel a recetter. |
| 2026-07-19 10:42 | version | v0.3.2 | main | Fix boucle de rendu infinie onglet Methode (config litteral instable -> workflowDoc reboucle a chaque rendu, CPU 100%). Option B : configRef stabilise l'identite du doc dans useForgeDocument ; ForgeShell.tsx intact. +2 gardes anti-boucle. npm test global termine enfin vert (405/405). Corrige aussi la mauvaise attribution 'VM Docker saturee' de l'etat des lieux. Gate Legolas PASS 8/8. |
| 2026-07-19 09:20 | version | v0.3.1 | main | Fix DocBar : garde backend en ecriture hors Tauri (message utilisateur propre au lieu d'une stack invoke) + reset saveAsOpen au Close/New (invite Save As orpheline). +2 tests vitest. Gate Legolas PASS 8/8. Inclut le protocole de recette Tauri (docs/recette-docbar-persistance.md). Hang pre-existant ForgeShell.test.tsx = ticket separe. |
| 2026-07-18 17:18 | version | v0.3.0 | main | Multi-runner Lot B1 : PersonaBinding porte le triplet {runner,model,tools} ; RunnerKind aligne sur les 5 cibles (claude,chatgpt,ollama-local,ollama-distant,litellm) ; host-isation de codex (alias legacy conserve). Self-contained sur main (decouple d'open-frame parke). |
| 2026-07-18 14:54 | version | v0.2.0 | main | Multi-runner Lot B2 (source de verite core) : vocab.json split hostKinds{claude,codex,openwebui} <-> runnerKinds{claude,chatgpt,ollama-local,ollama-distant,litellm} + toolKinds{comfyui-local} + alias legacy. Parite miroir avec le CLI iakaframe. |
| 2026-07-05 22:24 | version | v0.1.0 | main | onboarding initial |
