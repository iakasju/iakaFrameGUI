# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-07-25 23:33 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | - |
| Branche | main |
| Dernier commit | c88e8bf merge(frame): support de Feanor cote GUI - 9e role/casting + vignette flamme |
| Arbre | MODIFICATIONS NON COMMITEES |
| Fichiers (hors .git/node_modules) | 18227 |
| Note | Reprise 25/07 : menage des refs (3 branches obsoletes supprimees local+origin, archivees par tags), backlog CLAUDE.md reecrit sur l etat mesure (4 items mensongers corriges, 4 dettes closes), CLI mis dans le PATH. Gate : lint:all exit 0, test:all 56 fichiers / 518 tests verts. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `c88e8bf` | 2026-07-25 | merge(frame): support de Feanor cote GUI - 9e role/casting + vignette flamme |
| `98a6259` | 2026-07-25 | test+fixtures(gui): sync vendorage feanor + comptes 8->9 |
| `453cd29` | 2026-07-25 | feat(core): 9e rôle frame (Constructeur de frame) + 9e dégradé de casting |
| `96accf1` | 2026-07-24 | merge(frame): support du reservoir de frames cote GUI - resolveAssembly mono->multi + renommage element-pool |
| `49dc84c` | 2026-07-24 | feat(gui): charge la collection frames (backend + allow-list Rust) + comptes 11->12 |
| `3b2b14c` | 2026-07-24 | refactor(core): renomme reservoir -> element-pool (AR-2, A13) |
| `b782e19` | 2026-07-24 | feat(core): type frames de 1re classe (AR-1) + resolveAssembly mono->multi |
| `721165a` | 2026-07-23 | chore(release): v0.1.4 - alignement cles de role sur le canon (B2) + cadrage versé |
| `6fb7e36` | 2026-07-23 | merge(roster): B2 - alignement des 5 cles de role sur le canon (cadrage/dev/qualite/design/documentation) + reordre canon + bug skill helm->deploiement - gate Legolas PASS |
| `292df50` | 2026-07-23 | test(core): aligner les tests derives sur les cles de role canon (B2) |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : l'objectif parent « charger le frame dans le GUI » est **ferme**
  (4 etapes / 4). Etapes 2+3 = Open->Save fidele au frame (v0.1.1, `c70dbe0`) ; etape 3bis = workflow
  au format frame autoritaire (v0.1.2, `68a7bf4`) ; etape 4 Lot 1 = roster 8/8 avec helm + byte-parite
  team `iakaframe-8` + tools 8/8 + option `test:vendor` (v0.1.3, `5011e38`) ; etape 4 Lot 2 = B2,
  alignement des 5 cles de role sur le canon (v0.1.4, `6fb7e36`). **Enchaine ensuite** (non versionne) :
  reservoir de frames — type `frames` de 1re classe (AR-1), `resolveAssembly` mono->multi, renommage
  `reservoir` -> `element-pool` (AR-2/A13), collection `frames` chargee cote GUI (allow-list Rust),
  comptes 11->12 types (`96accf1`) ; puis 9e role canonique **`frame` (Constructeur de frame)** + 9e
  degrade de casting + vignette flamme (Feanor), vendorage et comptes 8->9 synchronises (`c88e8bf`).
- **Menage fait a la reprise (2026-07-25)** : les 3 branches datees non mergees ont ete
  **supprimees en local ET sur `origin`**, apres archivage par tags annotes pousses sur Forgejo —
  `archive/feat/open-frame-portfolio` (`a9bc7ca`), `archive/feat/align-binding-format-frame`
  (`5152c72`), `archive/feat/ch-a-reconciliation-rolekey` (`27d8a2d`). Leur contenu avait ete
  **refait autrement sur main** (main porte `src/forge/frame.ts`, pas `openFrame.ts`/`useOpenFrame.ts` ;
  le role `deploiement` de CH-A est deja canonique a l'index 5, et main est passe a 9 roles).
  Resurrection possible : `git switch -c <nom> archive/<nom>`. Il ne reste que `main`.
  Le **backlog de `CLAUDE.md`** a ete reecrit sur l'etat reel (il datait du 15-16/07).
- **En cours / a reprendre** : rien d'ouvert. La reprise a ete versee par `iakaframe update`
  (motif `manual`) : `CLAUDE.md` + etat des lieux commites et pousses sur `origin/main`.
- **PIEGE DU CLI, vu en direct le 25/07** : `iakaframe update` regenere l'etat des lieux AVANT de
  commiter, et `cli/src/commands/snapshot.js:106-109` **reecrit le fichier entier** avec les
  placeholders vides — donc **toute regeneration DETRUIT ce recit**. Sauvegarder la section
  « Reprise du travail » avant tout `snapshot`/`update`, puis la reinjecter. Dette a remonter au
  depot `iakaframe` : le snapshot devrait preserver la section si elle est remplie.
- **Cadrage du chantier frames : VERSE le 25/07** — `specs/instructions/frame-reservoir-et-9e-role-portage-gui.md`
  (retro-porte, assume comme tel). Il trace les 7 commits des 24-25/07 entree canon <-> preuve
  mesuree, et **borne le reste**. Sources canon : `iakaframe/specs/instructions/reservoir-de-frames.md`
  et `role-frame-builder.md`. Plus aucun code merge sans instruction locale.
- **Prochaine etape concrete** : deux lots ouverts, mesures, a cadrer par Gandalf avant tout code —
  (1) **selecteur de frame active** (le coeur resout N assemblages, la forge ne sait pas choisir :
  0 occurrence de `iakaframeactive`/`frameActive`/`activeFrame` ; **decision a deux depots**, le
  pointeur doit etre lisible CLI ET GUI) ; (2) **renommage `reservoir` -> `element pool` inachevé**
  (A13 tenu au coeur seulement ; `llm.ts`, `useForgeReservoir.ts`, `ReservoirPanel.tsx`,
  `ForgeShell.tsx`, `llm/prompt.ts`, `llm/resolve.ts` portent encore l'ancien sens -> mot ambigu
  dans le meme depot). Le (2) est mecanique et sans changement de comportement : le faire d'abord.
- **Mesure de reprise (2026-07-25)** : `npm run lint:all` -> exit `0`, aucune sortie ;
  `npm run test:all` -> exit `0`, `Test Files 56 passed (56) / Tests 518 passed (518)`.
  Cargo (`src-tauri/`) **non mesure** a la reprise.
- **Dettes du 19/07 RE-MESUREES et CLOSES le 25/07** (ne pas les rouvrir sans preuve) : perte du
  corps markdown au Save -> close (`useForgeDocument.ts` capture `verbatimBody`, `ForgeShell.tsx`
  serialise `o.body ?? boilerplate`) ; cablage du wrapping des listes flow -> close (`readListLayout`
  capture et passe a `serializeMethodMd`, `ForgeShell.tsx:124`) ; fixture `method.iakaframe-wrapped.md`
  au corps tronque -> close (`diff` avec `~/work/iakaframe/methods/iakaframe.md` ne sort rien) ;
  reserve P6b `ForgeShell.test.tsx` -> close (run cible : 1 fichier / 3 tests verts).
- **Pieges connus** : (1) le CLI `iakaframe` n'etait pas dans le PATH — **corrige le 25/07** par un
  wrapper `~/.local/bin/iakaframe` (exec node sur `~/work/iakaframe/cli/src/index.js` ; pas d'install
  npm globale, donc pas de rupture quand nvm change de version) ; (2) le champ Version du snapshot est
  vide (`-`) alors que `package.json` porte `0.1.4` ; (3) `cargo test` est **volontairement hors de
  `test:all`** et n'a pas ete mesure a la reprise ; (4) recettes visuelles humaines toujours en
  attente (U-10, handoff, G-8, B-7/B-10, 4e onglet P6b, reservoir de frames).

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-07-25 23:33 | manual | - | main | Reprise 25/07 : menage des refs (3 branches obsoletes supprimees local+origin, archivees par tags), backlog CLAUDE.md reecrit sur l etat mesure (4 items mensongers corriges, 4 dettes closes), CLI mis dans le PATH. Gate : lint:all exit 0, test:all 56 fichiers / 518 tests verts. |
| 2026-07-25 23:13 | reprise | - | main | reprise de session 2026-07-25 |
| 2026-07-19 23:10 | pause | v0.3.11 | main | Capacite de preservation du wrapping des listes flow dans serializeMethodMd : readListLayout (releve la decoupe en lignes d'un .md source, tokenizer respectant les quotes) + Field.wrap + type ListLayout + 3e parametre OPTIONNEL de serializeMethodMd. Fixture method.iakaframe-wrapped.md (principleIds wrappe sur 4 lignes) + 5 cas de test dont round-trip byte-a-byte et layout perime ignore (retombe sur la forme canonique au lieu de produire un rendu faux). COMPORTEMENT PAR DEFAUT INCHANGE (mono-ligne) et cablage ForgeShell.tsx:125 VOLONTAIREMENT NON FAIT : cli/src/lib/frontmatter.js:217-222 reflow exactement pareil, donc activer cote GUI seul aurait fabrique une divergence GUI!=CLI - precisement la classe de defaut qu'aucune garde ne detecte (cf. contrat fantome v0.3.10). Le cablage est rattache au chantier vendor-check cross-repo, decision a deux depots. Tests 480 pass / 0 fail (53 fichiers), tsc --noEmit clean, eslint clean. Gate Legolas PASS. Dettes ouvertes cote GUI : perte du corps markdown au Save (ForgeShell.tsx:84-86 regenere un boilerplate de 2 lignes - ecraserait tout le recit d'un fichier de methode) ; fixture method.iakaframe-wrapped.md declaree 'copie conforme' alors que son corps est tronque de 8 lignes (frontmatter byte-identique, validite du test intacte). |
| 2026-07-19 22:36 | version | v0.3.10 | main | Re-vendorage des fixtures depuis iakaframe v0.17.14 : les 3 fixtures aragorn (golden, persona, binding) figeaient un contrat FANTOME (Task sans Write) mutuellement coherent et sha-valide, donc invisible aux 475 tests. Remises au canon (tools: Read, Grep, Glob, Write, Bash, Task ; sha f89e1b89 -> 249b51cb). Parite byte-a-byte re-verifiee sur les 17 fixtures vendorees, sha256 des 8 goldens recalcules. Tests 475/475, typecheck + lint verts. Gate Legolas PASS. Dette ouverte cote iakaframe : aucune garde ne detecte une derive cohérente cross-repo (drift injecte binding+golden+sha ensemble = 475/475 verts) -> vendor-check a cadrer. |
| 2026-07-19 21:01 | version | v0.3.9 | main | Parite generateurs (GUI converge sur le CLI) : serializeAgentContract/renderAgentContract format autorite (name=id, description, tools depuis binding via toolsForPersona, guardrails, PAS de model), corps verbatim canon via loader de fixture -> byte-identique aux 8 contrats CLI ; test golden + garde sha256 (cliquet bilateral). model retire du contrat claude (vit dans binding.json) ; openwebui/codex non regresses. Gate Legolas PASS (475 front + 75 Rust verts). |
| 2026-07-19 18:06 | version | v0.3.8 | main | Modele de composition (cœur) : FrameAssignment triplet {runner,model,tools} + parseFrameBinding de-ampute (T4), checkFrameRefs elargi (T1 persona->skills/roleKey/guardrails, T5 workflow->roles, T6 team.guardrails, subskills subset+anti-self-ref), reservoir ReservoirElement 'skill' + composition skill<-skills, projection tools en facette du binding (OpenFramePanel). Gate Legolas PASS (471 front + 75 Rust verts). Miroir de iakaframe v0.17.9. |
| 2026-07-19 13:34 | version | v0.3.7 | main | Copilote inference LLM live (MVP offline-first) : commande Rust llm_complete (reqwest http-only, /api/chat, host_allowed + timeout) ; transport injectable (fakeLlm -> 10 CA prouves sans reseau) ; resolveProposition (live/mock fallback, diff recalcule, jamais dicte par le LLM) ; parseLiveProposition defensif (core) ; Ollama seul, localhost + reglage authoringEndpoint LAN ; frontiere authoring != execution (binding inatteignable) ; derogation AR-1/AR-6 bornee + note d'audit capabilities. Inference reseau reelle = recette Tauri. Gate Legolas PASS (461 front + 75 Rust verts). |
| 2026-07-19 12:52 | version | v0.3.6 | main | Forge : reservoir de sous-elements (buildReservoir cœur pur adosse a G1/G2 + panneau read-only) + modele d'authoring dans les Settings (persiste comme iakaframeHome, un seul modele global pour tous les etages). Modele VIDE par defaut (config forcee) -> copilote mock signale 'aucun modele configure'. Libelles des 11 types en source unique (core/frame.ts). Frontiere authoring != execution respectee ; inference LLM live differee. Gate Legolas PASS (445 front + 67 Rust verts). Reste : recette IPC Tauri. |
| 2026-07-19 12:18 | version | v0.3.5 | main | Dette doc : comptes SF2 rafraichis dans g6-super-etage-portfolio.md AC-2 (principes 14->16, skills 16->17). Doc uniquement. |
| 2026-07-19 12:10 | version | v0.3.4 | main | Open frame LOT 2 (G6 super-etage) : entite Frame de 1er ordre promue dans packages/core (root+counts+poolIds+assembly method/team/binding+facette portefeuille+integrite). Facette derivee par ROLE portefeuille (robuste au renommage persona) et scaffold level=portfolio, zero I/O backend neuf. parseFrame defensif. UI OpenFramePanel facette read-only + assemblage resolu. Gate Legolas PASS (AC-1..9 + AC-F ; 428 front + 63 Rust verts). Reste : recette IPC Tauri end-to-end. |
| 2026-07-19 11:15 | version | v0.3.3 | main | Open frame LOT 1 (socle G1-G5) : backend pool_read_all/pool_read (contenu des atomes) + bindings chargeable (COLLECTIONS 4->5) ; loader frame.ts (11 types + integrite checkFrameRefs + workflow compte 1x) ; action UI OpenFramePanel + bouton 'Ouvrir un frame'. Charge SF2 : 8/8/16/5/3/2/1/17/1/1/1, 0 dangling. Gate Legolas PASS (412 front + 63 Rust verts). G6 (entite Portfolio) = LOT 2 a venir. Cablage IPC Tauri + test OpenFramePanel a recetter. |
| 2026-07-19 10:42 | version | v0.3.2 | main | Fix boucle de rendu infinie onglet Methode (config litteral instable -> workflowDoc reboucle a chaque rendu, CPU 100%). Option B : configRef stabilise l'identite du doc dans useForgeDocument ; ForgeShell.tsx intact. +2 gardes anti-boucle. npm test global termine enfin vert (405/405). Corrige aussi la mauvaise attribution 'VM Docker saturee' de l'etat des lieux. Gate Legolas PASS 8/8. |
| 2026-07-19 09:20 | version | v0.3.1 | main | Fix DocBar : garde backend en ecriture hors Tauri (message utilisateur propre au lieu d'une stack invoke) + reset saveAsOpen au Close/New (invite Save As orpheline). +2 tests vitest. Gate Legolas PASS 8/8. Inclut le protocole de recette Tauri (docs/recette-docbar-persistance.md). Hang pre-existant ForgeShell.test.tsx = ticket separe. |
| 2026-07-18 17:18 | version | v0.3.0 | main | Multi-runner Lot B1 : PersonaBinding porte le triplet {runner,model,tools} ; RunnerKind aligne sur les 5 cibles (claude,chatgpt,ollama-local,ollama-distant,litellm) ; host-isation de codex (alias legacy conserve). Self-contained sur main (decouple d'open-frame parke). |
| 2026-07-18 14:54 | version | v0.2.0 | main | Multi-runner Lot B2 (source de verite core) : vocab.json split hostKinds{claude,codex,openwebui} <-> runnerKinds{claude,chatgpt,ollama-local,ollama-distant,litellm} + toolKinds{comfyui-local} + alias legacy. Parite miroir avec le CLI iakaframe. |
| 2026-07-05 22:24 | version | v0.1.0 | main | onboarding initial |
