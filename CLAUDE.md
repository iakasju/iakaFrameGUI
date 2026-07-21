# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est lu en priorité par Claude Code à chaque session.
> Pour la vision complète du projet, lire `specs/PROJET.md`.
> Pour la méthode de collaboration, voir `methode-de-travail.md` (iakaframe).

---

## Rôles (rappel)

- **Cowork** (réflexion) rédige les instructions dans `specs/instructions/`. Il ne
  modifie jamais le code.
- **Claude Code** (toi) lis l'instruction correspondante AVANT chaque tâche, puis
  implémentes, builds, testes et commites.

---

## Ce qu'est ce projet

**iakaFrameGUI — la forge de la méthode iakaframe** : authoring de teams *pures*
(teams, méthodes, bindings, workflows, kits), dans une coquille de bureau. Elle
**crée et livre** ; le cockpit réceptionne et exécute.

Stack : React 18.3 + TypeScript 5.5 + Vite 6 + Tauri 2 (Rust 2.11) + Vitest 4,
monorepo **npm workspaces** (`packages/*`, dont `@iakaframe/core`).

---

## Commandes à utiliser

> **Invariant** : cette liste ne contient **que des scripts réellement exposés** par
> `package.json`. Une commande documentée mais inexistante est pire qu'absente — elle
> transforme un `Missing script` en faux vert pour qui ne lit pas la sortie. Toute
> commande ajoutée ici doit l'être **en même temps** que le script correspondant.

```bash
npm run dev            # démarrer le front en dev (Vite)
npm run tauri dev      # démarrer l'app de bureau complète (front + Rust)
npm run build          # build de prod (tsc && vite build)
npm run preview        # servir le build de prod

npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run lint:all       # typecheck + lint   <- mesure de gate

npm run test           # vitest run
npm run test:all       # tous les tests     <- mesure de gate
npm run test:coverage  # vitest run --coverage
```

Côté Rust, dans `src-tauri/` : `cargo test`. **Volontairement hors de `test:all`** :
en dépendre rendrait la mesure faillible sur toute machine sans toolchain Rust.

---

## Rendre un verdict de gate

**Un verdict de gate qui ne cite pas ses commandes et leurs sorties n'est pas un
verdict : c'est une opinion. Il ne franchit rien.**

Un « gate PASS » non sourcé est **inopposable** : la charge de la preuve pèse sur
l'émetteur, et un merge qui l'affirme sans mesure attachée est, par construction, un
merge **non gaté** — même s'il se trouve que le code était vert. Motif : le merge
`8ae5748` portait « gate Legolas PASS » alors que le lint était rouge
(cf. `specs/notes/rectifications.md`).

Tout verdict se rend donc dans ce **format contraint** — un tableau, jamais de la prose :

| Commande | Code de sortie | Résumé cité |
|---|---|---|
| `npm run lint:all` | `0` | `(aucune sortie)` |
| `npm run test:all` | `0` | `Test Files 53 passed (53) / Tests 496 passed (496)` |

Règles d'usage, appliquées **sans examen du fond** :

- une case **vide**, un **« OK » sans chiffre**, ou un résumé **reformulé** ⇒ **FAIL** ;
- un critère **non mesuré** se déclare *non mesuré*, **jamais** *PASS* ;
- une mesure **reprise du rapport d'un autre agent** n'est pas une mesure : on
  **re-mesure**. C'est ce geste — et lui seul — qui a révélé l'incident `8ae5748`.

---

## Conventions

- **Langue du code** : anglais (identifiants, commits techniques).
- **Langue de la doc et des échanges** : français.
- **Commits** : *conventional commits* (`feat:`, `fix:`, `docs:`, `chore:`, `wip:`).
- **Commits atomiques et fréquents** : après chaque étape logique (filet de
  sécurité pour pouvoir revenir en arrière). Jamais de `reset --hard` ni de
  `push --force` de ton côté.
- **MVP d'abord, puis itérer.** Pas de sur-ingénierie.
- **Self-hosted / open-source d'abord** pour tout choix de backend ; cloud en
  fallback justifié seulement.
- **Réutiliser l'existant** (infra, services, MCP) avant de réimplémenter.
- En dev, **mocker les appels API** coûteux/limités (voir `specs/mock/`).

---

## Dépôt git : Forgejo (iakabox)

Remote par défaut : **Forgejo LAN** `http://192.168.2.11:3001/sjupin/<repo>.git`,
**HTTP + token** (SSH inutilisable). Token via `$env:FORGEJO_TOKEN` ou `.git/config`
local — **jamais commité**. Voir `iakabox-usage.html` (iakaframe) pour clone/push,
création de dépôt (API, description **ASCII**) et rotation de token.

## Cycle de documentation (état des lieux)

Régénérer l'état des lieux **à chaque changement de version** et **à chaque pause /
préparation de reprise** :

```powershell
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason version -Version vX.Y.Z -Note "..."
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason pause   -Note "où on s'arrête, quoi reprendre"
pwsh C:\iakaframe\iakaframe-snapshot.ps1 -Reason reprise -Note "reprise"
```

Génère `specs/etat-des-lieux.md` + `.html` (faits git auto). **Compléter le récit de
reprise** dans le `.md` (ce qui vient d'être fait, ce qui reste, prochaine étape).

---

## Avant toute tâche non triviale

1. Lire l'instruction correspondante dans `specs/instructions/`.
2. Si elle n'existe pas → le signaler ; ne pas improviser une feature lourde sans
   spec. Proposer un plan court d'abord.
3. Implémenter étape par étape, avec commits intermédiaires.
4. Lancer typecheck + lint + tests avant de considérer la tâche finie.
5. Pour toute action vraiment destructive hors denylist : **demander confirmation
   par message texte avant d'agir.**

---

## Backlog

<!-- Liste des features priorisées. Chaque entrée pointe vers son instruction. -->

> Reste à faire sur **iakaFrameGUI** — miroir des items du backlog portefeuille
> (`~/work/BACKLOG.md`) qui concernent ce projet, au **2026-07-15**. État détaillé et
> récit de reprise : `specs/etat-des-lieux.md`.

### Prochaine étape / à cadrer (avant tout code)
- [x] **Champ nom ÉDITABLE en grand, au milieu, sous les boutons fichier** — **LIVRÉ 2026-07-15**
  (instruction `specs/instructions/gui-doctitle-editable-et-new.md`, merge `fc22eec`, gate Legolas
  PASS 301/301, poussé). Titre éditable en ligne pour Team/Méthode (Kit read-only), `setName`/
  `canRename`/`withName`, Save As prérempli, geste New confirmé. **Recette visuelle humaine PASSÉE
  (RAS) 2026-07-15** : titre éditable Team/Méthode OK, `•` dirty OK, Save As prérempli OK, Kit
  read-only OK. *Réserve non bloquante consignée (pas de code, arbitrage reporté par le décideur) :
  **New = no-op visuel** — `requestNew` recharge un starter identique à celui semé au montage, donc
  aucun changement à l'écran dans l'état pristine. Décision « que doit produire New » à trancher plus tard.*
- [x] **Commandes terminal + livraison bibliothèque** — **LIVRÉ (dépôt `iakaframe`)** : 5 verbes
  `list`/`show`/`assemble`/`add`/`switch(use)` codés + testés, **gate Legolas PASS, mergé + poussé**
  (`iakaframe` main `2d481bf`), pool matérialisé (`library/`+`teams/`+`methods/`+`bindings/`+`kits/`).
  **Lot de convergence LIVRÉ 2026-07-15** (merge `2c85702`, gate Legolas PASS, 86/86, poussé) : les 3 écarts
  (racine partagée `<chapeau>/iakaframe`, schéma binding E1 `node`/`origin` additif, parité `assemble`↔cœur
  + golden byte-à-byte) **résolus** ; bonus `etat.test.js` réparé. *Réserve mineure non bloquante : CLI
  `existsSync` vs GUI `is_dir()` sur le marqueur de racine (cas de bord).* **Item clos.**
- [ ] **Modèle Méthode élargi** — à graver par Gandalf : Méthode = scaffold + workflow (migré) +
  **assemblage de principes composables** (qualité, backlog, doc/état des lieux, commits/versionnement,
  isolation Docker, self-hosted-first, réutilisation, MVP-first, identité/badges, périmètres étanches,
  langue, mock, cadrage-avant-code, confirmation actes destructifs) + rituels + gardes-fous + rôles.
  *NB : la séparation **Méthode ≠ Team** est déjà livrée (E2a/b/c) ; reste le modèle de principes.*

### Cadré, non codé
- [x] **P7 — Binding réel** — **LIVRÉ 2026-07-16** (jalon validé décideur Q-1→Q-5 = recos, merge `--no-ff`
  `9ecf97f`, **gate Legolas PASS** : typecheck/lint 0, vitest **330/330**, cargo **56/56**, build OK, poussé).
  Schéma `Binding`/`PersonaBinding` + `defaultBindingForNode` dans `@iakaframe/core` ; émission
  **conditionnelle** du modèle par adaptateur via `KitGenOptions.binding?` (optionnel) ; `LiaisonPanel` dans
  le flux Déploiement ; `binding.json` ajouté au `KitFileTree` par la forge (`kit_deploy` **inchangé**, zéro
  Rust). Invariant B-2 tenu : **sans binding = sortie byte-identique**. Team pure, façade unique, zéro credential.
  `specs/instructions/P7-forge-liaison-deploiement.md`. *Reste : **recettes humaines B-7/B-10** (voir ci-dessous).*

### À faire
- [x] **Éditeur de workflow** — **LIVRÉ 2026-07-16** (instruction `specs/instructions/P6b-editeur-workflow.md`,
  jalon validé décideur : Q-1 = **workflow = artefact de 1re classe de la bibliothèque** (collection `workflows/`),
  Q-2→Q-9 = recos ; merge `--no-ff` `be9dcd4`, poussé). Collection `workflows/` (4ᵉ onglet, `useForgeDocument`,
  sérialiseur `.md` frontmatter plat + phases en corps), résolution **pure** par injection `KitGenOptions.workflow`
  (moule P7), extension Rust `COLLECTIONS += workflows`, I1 Méthode validant `workflowId` contre la collection +
  catalogue. Golden P6 byte-identique, canonique non muté, façade unique, zéro runner/modèle. **Gate Legolas :
  FAIL initial (EW-13 = faux-négatif I1 pool vs collection) → corrigé (`8c94769`) → re-vérif indépendante `refs`
  10/10, cœur 251/251, cargo 57/57, front 116/116 hors ForgeShell**. *Réserve documentée (acceptée décideur) :
  total front consolidé non re-mesuré ici (machine saturée VM Docker) — 2 tests `ForgeShell.test.tsx` à
  reconfirmer sur CI/machine reposée. Reste : recette visuelle du 4ᵉ onglet.*
- [ ] **Arbitrage** : afficher la section phases/workflow aussi dans les kits **Claude Code / Open WebUI**
  (addition assumée + golden dédié ; aujourd'hui seuls codex/ollama la portent).

### Recettes humaines (gestes visuels/interactifs — Legolas ne valide pas le pixel)
- [ ] Forge **Cinabre** + écran **Générer / Déployer** : voir la charte, basculer, cycle
  team → nœud → Générer → Déployer sur un dossier tmp (**U-10**).
- [ ] Cycle **handoff** Livrer → Réceptionner (forge → cockpit).
- [ ] **G-8** : déployer un kit dans un **vrai** projet Claude Code (subagents/skills reconnus +
  canal d'identité opérationnel) — `specs/notes/P3-recette-manuelle-G8.md`.
- [ ] **B-7 (P7)** : importabilité réelle d'un kit **lié** — Open WebUI avec `base_model_id` rempli
  (importable), Codex avec modèle référencé ; Claude Code sans modèle = pur et valide.
- [ ] **B-10 (P7)** : smoke visuel Binding bout-en-bout — team → nœud → **cocher « Lier »** (Open WebUI,
  un modèle) → Générer (voir `base_model_id` rempli) → Déployer sur tmp → `binding.json` présent à la racine.
- [ ] **P6b — 4ᵉ onglet Workflow** : recette visuelle — liste des phases, boutons monter/descendre/ajouter/
  supprimer, éditeur de phase (nom, description, rôles par cases, offChain, gate), reflet dans le `FlowDiagram`,
  sélecteur `workflowId` de l'onglet Méthode (`npm run tauri dev`).
- [ ] **P6b — total front consolidé** : rejouer `npm run test` complet (≈ 42 fichiers / ~369 tests) sur
  **CI / machine reposée** pour lever la réserve `ForgeShell.test.tsx` (non re-mesurable sur machine saturée).

### North-star (design gardé ouvert, hors MVP)
- [ ] **Import multi-méthodes** (BMAD / MetaGPT / SPARC) — agnosticisme de méthode gravé dès le cœur ;
  ne rien hard-wirer « iakaframe-only ».
