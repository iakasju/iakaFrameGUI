# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-08-02 21:55 (motif: pause).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.4 |
| Branche | main |
| Dernier commit | e3522bc docs(q3): VERDICT decideur - table figee remplacee par decouverte live du noeud |
| Arbre | propre |
| Fichiers (hors .git/node_modules) | 25862 |
| Note | Session de cadrage du 2026-08-02 (aucun code touche). DEUX ARBITRAGES EN ATTENTE TRAITES. (1) G6 super-etage portefeuille : le statut mentait - marque PROPOSE en attente de validation alors que livre et gate PASS depuis v0.3.4 (2026-07-19). Verification AC par AC, aucun AC ni P-x orphelin, aucun reste du. RATIFIE A POSTERIORI par le decideur : validation oui, deux derives d AC ratifiees (AC-2 passe a 12 types via frames/AR-1 ; AC-7 passe a 4 libraryList + pointeur de frame active sans commande Tauri neuve), paragraphe 5 (schema) fige en ARCHIVE HISTORIQUE - le code fait foi, doc vivante = en-tete packages/core/src/frame.ts:1-23. Instruction CLOSE. Meme classe de defaut que celle reconciliee pour E1 le 30/07 : le statut d instruction ne suit pas le code - DEUXIEME occurrence en une semaine, signal sur le cycle de mise a jour des statuts. (2) Q-3 (derniere question ouverte du bloc E1) : CHANGE DE NATURE, pas amendee. Le parametre VRAM est SUPPRIME - motif technique verifie : aucun endpoint Ollama n expose la VRAM totale, /api/ps ne rend que la VRAM consommee par les modeles charges et omet le champ quand il vaut 0, donc un palier declare n etait verifiable par rien. La source des candidats devient la DECOUVERTE LIVE du noeud (/v1/models) quel que soit le fournisseur : plus aucune table de modeles a maintenir. Six questions tranchees : a caduque (rien ne subsiste), b cle par roleKey canon sur 9 roles frame inclus, c on interroge la source, d pre-remplissage par motif dans le nom avec liste deroulante editable, e model vide reste le defaut sur (additif comme E1), f perimetre ollama-localhost + ollama-lan + openwebui jamais claude ni codex. ERREUR DE CADRAGE ACTEE : le chiffrage lot backend etait faux, llm_models (src-tauri/src/llm.rs:619) faisait deja GET /v1/models avec garde d hote, timeout et aveu honnete. TROUVAILLE : settings.json est l artefact de l AUTHORING et le Binding celui de l EXECUTION, frontiere defendue mot pour mot dans le code (settings.rs:140,153,178) - la caducite de Q-3.a evite une regression d architecture. MESURE : Ollama local repond en v0.20.2 avec UN SEUL modele installe (llama3.1:8b, 4.9 Go) ; le noeud LAN 192.168.2.11:11434 NE REPOND PAS (Forgejo sur :3001 repond, donc service Ollama eteint ou deplace, pas la machine). RESTE OUVERT : 7 points renvoyes non bloquants dont P-O-2 (trou ollama-lan, elargir la garde host_allowed llm.rs:47 est un arbitrage de SECURITE pas de cadrage) et P-O-7 (renommer Q3-table-modele-local-role-ollama.md dont le titre ne decrit plus rien - casserait E1:227 et l etat des lieux). Aucun test relance cette session : les chiffres de sante restent ceux du 31/07. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `e3522bc` | 2026-08-02 | docs(q3): VERDICT decideur - table figee remplacee par decouverte live du noeud |
| `38b2c22` | 2026-08-02 | docs(q3): cadrage initial de la table modele-local <-> role Ollama |
| `e517d4a` | 2026-08-02 | docs(g6): reconciliation doc-code + RATIFICATION a posteriori par le decideur |
| `e135d4d` | 2026-07-31 | docs(specs): renseigne la version du checkpoint (v0.1.4) |
| `54157f9` | 2026-07-31 | chore(iakaframe): update etat des lieux + commit global (pause) |
| `5f64fa1` | 2026-07-31 | fix(deps): resorbe 2 vulnerabilites high (postcss, brace-expansion) |
| `4052f77` | 2026-07-31 | chore(iakaframe): update etat des lieux + commit global (version v0.1.4) |
| `6997d7e` | 2026-07-30 | docs(e1): jalon VALIDE par le decideur (go bloc) — Q-1/Q-2/Q-4/Q-5/Q-6 tranches |
| `ba92318` | 2026-07-29 | merge(gui): source Feanor Lot 2b — /v1/models + materialisation structuree via LiteLLM |
| `ae81dae` | 2026-07-29 | feat(gui): dropdown modeles /v1/models dans Settings + facade llmModels |

## Reprise du travail

> Session du **2026-08-02** — **cadrage seul, aucun code touche, aucun test relance.**
> Les chiffres de sante (lint 0, vitest 1065, cargo 116, couverture 86,5 %) restent ceux
> mesures le **31/07** : ils n'ont pas ete re-verifies et rien ne les a invalides.

- **Ce qui vient d'etre fait** — les **deux arbitrages qui bloquaient la reprise sont
  traites**, en 3 commits de doc (`e517d4a`, `38b2c22`, `e3522bc`), pousses sur Forgejo.
  1. **G6 (super-etage portefeuille) est CLOS.** Son statut mentait : marque « PROPOSE, en
     attente de validation » alors qu'il est **livre et gate PASS depuis v0.3.4 (19/07)**.
     Verification AC par AC : aucun AC ni P-x orphelin, **aucun reste du**. Ratifie a
     posteriori par le decideur sur les 3 points — validation oui ; **AC-2 → 12 types**
     (`frames`, AR-1) et **AC-7 → 4 `libraryList` + pointeur** (sans commande Tauri neuve) ;
     **§ 5 fige en archive historique**, le code fait foi (doc vivante =
     `packages/core/src/frame.ts:1-23`).
  2. **Q-3 est FERMEE**, et elle a **change de nature**. Le **parametre VRAM est supprime** :
     aucun endpoint Ollama n'expose la VRAM totale (`/api/ps` ne rend que la VRAM *consommee
     par les modeles charges*, et omet le champ a 0) — un palier declare n'etait verifiable
     par rien. La source des candidats devient la **decouverte live du nœud** (`/v1/models`),
     donc **plus aucune table de modeles a maintenir**. Six questions tranchees : **a**
     caduque, **b** cle par `roleKey` (9 roles, `frame` inclus), **c** on interroge la source,
     **d** pre-remplissage par motif avec liste deroulante editable, **e** `model: ""` reste
     le defaut sur (additif comme E1), **f** perimetre `ollama-localhost` + `ollama-lan` +
     `openwebui`, jamais `claude` ni `codex`.

- **En cours / a reprendre** — **rien n'est en cours.** Arbre propre, `main` synchronise
  avec Forgejo. Q-3 est **cadree mais non implementee** : c'est le prochain lot de dev
  disponible, et il est petit (`llm_models` existe deja, l'essentiel du cout annonce
  n'existait pas).

- **Prochaine etape concrete** — **implementer Q-3** (execution, sur instruction fermee) :
  brancher `llm_models` sur `LiaisonPanel`, transformer les champs modele en listes
  deroulantes alimentees par la decouverte, et implementer la regle de pre-remplissage
  en 6 etapes du § 6 avec ses criteres d'acceptation. **Prealable non technique** :
  trancher **P-O-7** (renommer le fichier `Q3-table-modele-local-role-ollama.md`, dont le
  titre ne decrit plus rien — casserait `E1-evolution-binding-ar1.md:227` et ce fichier).

- **Pieges connus**
  - **Le statut des instructions derive du code — 2e occurrence en une semaine** (E1 le
    30/07, G6 le 02/08). Ne pas croire un § Statut sans le confronter au code et a
    l'etat des lieux. C'est un defaut de **cycle**, pas d'instruction.
  - **Le nœud Ollama LAN `192.168.2.11:11434` NE REPOND PAS** (teste le 02/08). Forgejo
    repond sur `:3001` — donc le **service Ollama** est eteint ou deplace, pas la machine.
    A verifier avant tout travail s'appuyant sur `ollama-lan`.
  - **Le poste local n'a QU'UN SEUL modele installe** : `llama3.1:8b` (4,9 Go), Ollama
    v0.20.2. Toute recette de la suggestion par role sera degeneree (les 9 roles recevront
    ce modele) tant que d'autres modeles ne sont pas `pull`.
  - **P-O-2 — le trou `ollama-lan` reste ouvert et c'est delibere** : la garde
    `host_allowed` (`llm.rs:47`) n'autorise que loopback ou l'`authoringEndpoint`, donc un
    nœud LAN est **refuse**. L'elargir est un **arbitrage de securite** (invariant CA9
    teste), pas une decision de cadrage — ne pas le faire au fil de l'eau.
  - **R-3 — la regle de pre-remplissage est fragile par construction** : elle lit des
    motifs (`coder`, `code`, `vl`, `vision`) dans le **nom** du modele, convention que rien
    ne garantit (faux negatif connu : `devstral`). Choix assume par le decideur ;
    attenuation structurelle = le champ reste visible et editable.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-08-02 21:55 | pause | v0.1.4 | main | Session de cadrage du 2026-08-02 (aucun code touche). DEUX ARBITRAGES EN ATTENTE TRAITES. (1) G6 super-etage portefeuille : le statut mentait - marque PROPOSE en attente de validation alors que livre et gate PASS depuis v0.3.4 (2026-07-19). Verification AC par AC, aucun AC ni P-x orphelin, aucun reste du. RATIFIE A POSTERIORI par le decideur : validation oui, deux derives d AC ratifiees (AC-2 passe a 12 types via frames/AR-1 ; AC-7 passe a 4 libraryList + pointeur de frame active sans commande Tauri neuve), paragraphe 5 (schema) fige en ARCHIVE HISTORIQUE - le code fait foi, doc vivante = en-tete packages/core/src/frame.ts:1-23. Instruction CLOSE. Meme classe de defaut que celle reconciliee pour E1 le 30/07 : le statut d instruction ne suit pas le code - DEUXIEME occurrence en une semaine, signal sur le cycle de mise a jour des statuts. (2) Q-3 (derniere question ouverte du bloc E1) : CHANGE DE NATURE, pas amendee. Le parametre VRAM est SUPPRIME - motif technique verifie : aucun endpoint Ollama n expose la VRAM totale, /api/ps ne rend que la VRAM consommee par les modeles charges et omet le champ quand il vaut 0, donc un palier declare n etait verifiable par rien. La source des candidats devient la DECOUVERTE LIVE du noeud (/v1/models) quel que soit le fournisseur : plus aucune table de modeles a maintenir. Six questions tranchees : a caduque (rien ne subsiste), b cle par roleKey canon sur 9 roles frame inclus, c on interroge la source, d pre-remplissage par motif dans le nom avec liste deroulante editable, e model vide reste le defaut sur (additif comme E1), f perimetre ollama-localhost + ollama-lan + openwebui jamais claude ni codex. ERREUR DE CADRAGE ACTEE : le chiffrage lot backend etait faux, llm_models (src-tauri/src/llm.rs:619) faisait deja GET /v1/models avec garde d hote, timeout et aveu honnete. TROUVAILLE : settings.json est l artefact de l AUTHORING et le Binding celui de l EXECUTION, frontiere defendue mot pour mot dans le code (settings.rs:140,153,178) - la caducite de Q-3.a evite une regression d architecture. MESURE : Ollama local repond en v0.20.2 avec UN SEUL modele installe (llama3.1:8b, 4.9 Go) ; le noeud LAN 192.168.2.11:11434 NE REPOND PAS (Forgejo sur :3001 repond, donc service Ollama eteint ou deplace, pas la machine). RESTE OUVERT : 7 points renvoyes non bloquants dont P-O-2 (trou ollama-lan, elargir la garde host_allowed llm.rs:47 est un arbitrage de SECURITE pas de cadrage) et P-O-7 (renommer Q3-table-modele-local-role-ollama.md dont le titre ne decrit plus rien - casserait E1:227 et l etat des lieux). Aucun test relance cette session : les chiffres de sante restent ceux du 31/07. |
| 2026-07-31 22:40 | pause | v0.1.4 | main | Cloture de la session d audit. ETAT FINAL, tout verifie : lint:all 0 erreur, vitest 1065 tests / 115 fichiers, cargo test 116, npm run build OK (158 modules), couverture 86.5 pct stmts / 89.2 lines / 78.3 branches, npm audit 0 vulnerabilite, vendor-check OK drift 0. TROIS GESTES LIVRES depuis le snapshot v0.1.4 : (1) versions alignees sur 0.1.4 - Cargo.toml et tauri.conf.json etaient restes en 0.1.0, un build Tauri aurait estampille l app 0.1.0 ; recompilation Rust verifiee. (2) le package-lock portait LUI AUSSI 0.1.0 en racine - quatrieme porteur manque au premier passage, corrige par npm. (3) 2 vulnerabilites high resorbees sur des deps INDIRECTES d outillage de build, jamais embarquees dans l app livree : postcss 8.5.16->8.5.25 (path traversal sur les source maps) et brace-expansion 1.1.15->1.1.18 / 5.0.7->5.0.9 (DoS) ; que des montees de PATCH, package.json inchange, recette complete passee derriere car postcss est dans la chaine Vite. NON TRAITE VOLONTAIREMENT : packages/core reste en 0.1.0 (bibliotheque distincte, versionnement unique du monorepo a trancher par le decideur) ; avertissement npm approve-scripts sur esbuild et fsevents (politique d environnement, pas une faille) ; src-tauri/target pese 4,9 Go de cache de compilation (gitignore, cargo clean au besoin). RESTE OUVERT : instruction g6-super-etage-portfolio.md en attente de validation decideur ; backlog projet 7 chantiers dont le cycle handoff forge->cockpit, le 4e onglet Workflow et l import multi-methodes. |
| 2026-07-31 22:26 | version | v0.1.4 | main | Audit portefeuille + realignement de version. SANTE : lint:all 0 erreur, vitest 1065 tests / 115 fichiers, cargo test 116, couverture 86.5 pct stmts / 89.2 lines / 78.3 branches (packages/core a 92.4 / 98.2 funcs). Parite cross-repo vendor-check OK, drift 0, verifiee des deux depots. VERSIONS ALIGNEES sur 0.1.4 : Cargo.toml et tauri.conf.json etaient restes en 0.1.0 alors que package.json etait en 0.1.4 - un build Tauri aurait estampille l app 0.1.0. Recompilation Rust verifiee (Compiling iakaframegui v0.1.4, 116 tests verts, Cargo.lock suivi). NON ALIGNE volontairement : packages/core reste en 0.1.0, c est une bibliotheque distincte, sa version n a pas a suivre celle de l app - a trancher si on veut un versionnement unique du monorepo. DERIVE DE TRACABILITE RESORBEE : le precedent etat des lieux datait du 26/07 et accusait 133 commits de retard (il annoncait 551 tests / cargo 83, la suite a double depuis) ; deux lots Feanor livres entre-temps (selecteur de source d inference, provider LiteLLM/OpenAI, /v1/models, materialisation structuree) plus le jalon E1 valide le 30/07. RESTE : instruction g6-super-etage-portfolio.md en attente de validation decideur ; 2 vulnerabilites high en deps INDIRECTES de build (brace-expansion DoS, postcss path traversal) non embarquees dans l app, npm audit fix disponible, non applique ce lot ; src-tauri/target pese 4,9 Go de cache de compilation (gitignore, cargo clean au besoin). |
| 2026-07-26 02:33 | pause | - | main | Session du 25-26/07 : menage des refs + 5 lots livres (renommage element pool/briques, Feanor copilote identifie, garde de montage, pointeur de frame active dans iakaframe.json, phases dans le kit Claude Code). Gate final : lint:all 0, test:all 61 fichiers / 551 tests, cargo test 83. |
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
