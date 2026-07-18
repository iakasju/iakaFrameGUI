# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-07-18 17:18 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.3.0 |
| Branche | main |
| Dernier commit | a65a9c7 merge(binding): Lot B1 — triplet persona {runner,model,tools} + 5 runners + host-isation codex (decouple d'open-frame) |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 14915 |
| Note | Multi-runner Lot B1 : PersonaBinding porte le triplet {runner,model,tools} ; RunnerKind aligne sur les 5 cibles (claude,chatgpt,ollama-local,ollama-distant,litellm) ; host-isation de codex (alias legacy conserve). Self-contained sur main (decouple d'open-frame parke). |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `a65a9c7` | 2026-07-18 | merge(binding): Lot B1 — triplet persona {runner,model,tools} + 5 runners + host-isation codex (decouple d'open-frame) |
| `6a41073` | 2026-07-18 | test(binding): tools defensifs + illustration team iakaframe multi-runner (B1) |
| `c19dc1c` | 2026-07-18 | feat(binding): triplet runner/model/tools par persona + host-isation codex (B1) |
| `bc4a1db` | 2026-07-18 | chore(iakaframe): update etat des lieux + commit global (version v0.2.0) |
| `ed96639` | 2026-07-18 | merge(vocab): Lot B2 — split host<->runner + chatgpt/litellm + toolKinds (source de verite core) |
| `8801c09` | 2026-07-18 | test(binding): repercute le renommage runner sur les alias (ps->claude, ollama->ollama-local) |
| `95bc9d3` | 2026-07-18 | test(runner): aligne l'enum runner sur le modele persona (renommage + alias legacy) |
| `99fe0e3` | 2026-07-18 | feat(vocab): split host<->runner + tools + alias legacy (B2) |
| `9bdaabb` | 2026-07-17 | feat(retrait): surface GUI du "-" au titre du skill (Option 1) + volet remove — S6 |
| `507fb3b` | 2026-07-17 | feat(retrait): etend le pont d'exec borne au retrait symetrique (attach/detach/remove) — S6 |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : <!-- ... -->
- **En cours / a reprendre** : <!-- ... -->
- **Prochaine etape concrete** : <!-- premiere action a faire en reprenant -->
- **Pieges connus** : <!-- ... -->

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-18 17:18 | version | v0.3.0 | main | Multi-runner Lot B1 : PersonaBinding porte le triplet {runner,model,tools} ; RunnerKind aligne sur les 5 cibles (claude,chatgpt,ollama-local,ollama-distant,litellm) ; host-isation de codex (alias legacy conserve). Self-contained sur main (decouple d'open-frame parke). |
| 2026-07-18 14:54 | version | v0.2.0 | main | Multi-runner Lot B2 (source de verite core) : vocab.json split hostKinds{claude,codex,openwebui} <-> runnerKinds{claude,chatgpt,ollama-local,ollama-distant,litellm} + toolKinds{comfyui-local} + alias legacy. Parite miroir avec le CLI iakaframe. |
| 2026-07-05 22:24 | version | v0.1.0 | main | onboarding initial |
