# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-07-18 14:54 (motif: version).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.2.0 |
| Branche | main |
| Dernier commit | ed96639 merge(vocab): Lot B2 — split host<->runner + chatgpt/litellm + toolKinds (source de verite core) |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 14915 |
| Note | Multi-runner Lot B2 (source de verite core) : vocab.json split hostKinds{claude,codex,openwebui} <-> runnerKinds{claude,chatgpt,ollama-local,ollama-distant,litellm} + toolKinds{comfyui-local} + alias legacy. Parite miroir avec le CLI iakaframe. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `ed96639` | 2026-07-18 | merge(vocab): Lot B2 — split host<->runner + chatgpt/litellm + toolKinds (source de verite core) |
| `8801c09` | 2026-07-18 | test(binding): repercute le renommage runner sur les alias (ps->claude, ollama->ollama-local) |
| `95bc9d3` | 2026-07-18 | test(runner): aligne l'enum runner sur le modele persona (renommage + alias legacy) |
| `99fe0e3` | 2026-07-18 | feat(vocab): split host<->runner + tools + alias legacy (B2) |
| `9bdaabb` | 2026-07-17 | feat(retrait): surface GUI du "-" au titre du skill (Option 1) + volet remove — S6 |
| `507fb3b` | 2026-07-17 | feat(retrait): etend le pont d'exec borne au retrait symetrique (attach/detach/remove) — S6 |
| `77ede5c` | 2026-07-16 | feat(learning): onglet Apprentissage (U2) — vue du reservoir, pilote de review |
| `b6e0b1d` | 2026-07-16 | feat(learning): pont d'acces borne review depuis la GUI (U1, plugin-shell) |
| `0408fd4` | 2026-07-16 | docs(etat-des-lieux): checkpoint pause — P7 + P6b livres, recette visuelle differee (RAM) |
| `22e4d3f` | 2026-07-16 | docs(P6b): editeur de workflow LIVRE (merge be9dcd4, gate PASS avec reserve front ForgeShell) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : <!-- ... -->
- **En cours / a reprendre** : <!-- ... -->
- **Prochaine etape concrete** : <!-- premiere action a faire en reprenant -->
- **Pieges connus** : <!-- ... -->

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-18 14:54 | version | v0.2.0 | main | Multi-runner Lot B2 (source de verite core) : vocab.json split hostKinds{claude,codex,openwebui} <-> runnerKinds{claude,chatgpt,ollama-local,ollama-distant,litellm} + toolKinds{comfyui-local} + alias legacy. Parite miroir avec le CLI iakaframe. |
| 2026-07-05 22:24 | version | v0.1.0 | main | onboarding initial |
