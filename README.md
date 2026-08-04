# iakaFrameGUI

**La forge de la méthode iakaframe : on y configure, édite, assemble, package et déploie
des équipes d'agents.**

iakaFrameGUI est une application de bureau dédiée au *build-time* de la méthode. On y
compose des **méthodes**, des **rôles**, des **skills**, des **gardes-fous**, des
**connecteurs** et des **workflows** ; on assemble les rôles en **équipes** ; puis on
**déploie** ces équipes sous forme de **kits** vers des plateformes d'exécution cibles
(Claude Code, Codex, Ollama en local ou sur le LAN…).

Frontière avec [IakaCockpit](https://github.com/iakasju/IakaCockpit) : la forge
**fabrique et livre** ; le cockpit **sélectionne, lie et exécute**.

---

## Installation

La version scellée courante est **[v0.1.4](https://github.com/iakasju/iakaFrameGUI/releases/tag/v0.1.4)** — voir
[toutes les versions](https://github.com/iakasju/iakaFrameGUI/releases).

> **À ce stade, les releases publient les sources, pas de binaire pré-compilé.**
> L'application se construit depuis l'archive de la version.

**Prérequis :** Node.js ≥ 20, Rust stable (avec `cargo`), et les
[dépendances système de Tauri 2](https://v2.tauri.app/start/prerequisites/) pour votre
plateforme (Xcode CLT sur macOS, WebView2 + Build Tools sur Windows, `webkit2gtk` et
`libayatana-appindicator` sur Linux).

```bash
# 1. Récupérer l'archive de la version depuis la page des releases
#    (Assets > Source code), puis la décompresser
cd iakaFrameGUI-0.1.4

# 2. Installer les dépendances (monorepo npm workspaces : packages/* inclus)
npm ci

# 3. Lancer en développement
npm run tauri dev

# 4. Ou produire l'exécutable de votre plateforme
npm run tauri build
```

Le binaire est produit dans `src-tauri/target/release/bundle/`.

**Réservoir.** La forge puise dans la bibliothèque partagée du dépôt
[iakaframe](https://github.com/iakasju/iakaframe) (`library/`, `methods/`, `teams/`,
`bindings/`, `kits/`). Le dossier chapeau est résolu depuis `IAKAFRAME_ROOT`
(défaut : `~/work`).

---

## Stack

| Couche | Technologie |
|---|---|
| Front | React 18.3 · TypeScript 5.5 · Vite 6 |
| Backend | Tauri 2 · Rust |
| Tests | Vitest 4 |
| Organisation | Monorepo **npm workspaces** — `packages/*`, dont `@iakaframe/core` |

Le paquet `@iakaframe/core` porte le modèle formel (frames, teams, bindings, workflows)
indépendamment de l'interface : il est testable et réutilisable hors GUI.

## Développement

```bash
npm run dev            # front seul (Vite)
npm run tauri dev      # application complète
npm run typecheck      # vérification des types
npm run lint           # lint
npm run lint:all       # typecheck + lint
npm run test           # tests unitaires (Vitest)
npm run test:coverage  # tests + couverture
```

> **Invariant du projet :** toute commande documentée doit exister réellement dans
> `package.json`. Une commande documentée mais absente transforme un `Missing script` en
> faux vert pour qui ne lit pas la sortie.

## Documentation

- [`specs/PROJET.md`](./specs/PROJET.md) — vision et décisions actées.
- [`specs/contrat-concepts.md`](./specs/contrat-concepts.md) — le modèle formel.
- [`specs/glossaire-concepts.md`](./specs/glossaire-concepts.md) — le glossaire.
- [`specs/instructions/`](./specs/instructions/) — les instructions de travail, une par lot.
- [`CLAUDE.md`](./CLAUDE.md) — contrat de travail des agents sur ce dépôt.

## Méthode

Ce projet est développé selon la méthode
[**iakaframe**](https://github.com/iakasju/iakaframe) : un décideur au-dessus d'une équipe
de rôles à périmètres étanches, et une instruction écrite et validée avant toute ligne de
code. La frame active du dépôt est déclarée dans `.iakaframe`.
