# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-08-29 10:51 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.7 |
| Branche | main |
| Dernier commit | 0ac8084 docs(claude): la doc disait D-4 GELE alors que le workflow est epingle depuis deux commits |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 490 |
| Note | Lot L41 gardes tiedes livre : les gardes qui ne pouvaient pas rougir rougissent. Gate PASS au second passage. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `0ac8084` | 2026-08-29 | docs(claude): la doc disait D-4 GELE alors que le workflow est epingle depuis deux commits |
| `408f53e` | 2026-08-29 | docs(instruction): CA-17 disait ce que AR-4 rend impossible — rectifie, et la limite est nommee |
| `0866254` | 2026-08-29 | test(convergence): le registre cesse de pouvoir MAIGRIR en silence — et ce qu il ne couvre pas est ECRIT |
| `e53f50b` | 2026-08-29 | test(gardes): un test qui ne pouvait pas rougir cesse d etre une garde tiede |
| `81f52fb` | 2026-08-29 | test(updater): CA-17 dans sa forme honnete — la garde nomme ce qu elle voit, et DECLARE ce qu elle ne voit pas |
| `0f64b79` | 2026-08-29 | docs(instruction): la byte-identite tient, ses chiffres non — et le registre s elargit |
| `9585bf9` | 2026-08-29 | ci(release): tauri-action epingle sur un SHA, et l entree que ce SHA connait |
| `06f2523` | 2026-08-29 | docs(gate): une commande de gate qui dit vrai — et D-4 GELE, remonte au decideur |
| `950c6a4` | 2026-08-29 | test(updater): la republication a l identique se prouve CONTRE le fichier versionne |
| `3f2f7e4` | 2026-08-29 | test(gardes): les jonctions cessent d etre libres — I4bis et la convergence |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : le lot **L41 « Gardes tiedes »** est livre, **gate PASS au second
  passage**, fusionne dans `main` et pousse. En une phrase : **les gardes qui ne pouvaient pas rougir
  rougissent maintenant.** Il fait suite a **L40** (cles d'installeur), livre le meme jour, qui a porte
  les manifestes de 4 a **9 cles, 9/9 telechargeables**.
- **Le fil du lot** : trois mecaniques distinctes, trois remedes distincts.
  1. **Predicats qui attestaient le faux** — `estPrive` cassait sur l'IPv6 litteral
     (`hote.split(":")[0]` rend `"["` sur `[::1]:3001`), au point de declarer **PUBLIQUE une boucle
     locale** : l'invariant `I2` concluait **l'inverse de la verite**. Repare par
     `new URL().hostname` + retrait des crochets, **et renversement de la charge** (prive par defaut,
     public a prouver). Et `mesureLe` n'etait contraint par rien : `"2020-01-01"` passait au vert.
  2. **Jonctions non gardees** — `I4bis` etait **vacuous** sur registre vide : ses assertions
     pouvaient etre **supprimees en silence**. Et la convergence des deux apps, acquise par L40,
     **n'etait gardee par rien** : un `diff` passe une fois a la main. C'est le defaut que le cadrage
     a **ajoute** au releve.
  3. **Referentiels mouvants** — le tag flottant `tauri-action@v0`.
- **Le fait le plus lourd, decouvert en cours de lot : L40 avait livre une correction qui ne
  s'executait pas.** `uploadUpdaterJson: false` est une entree **INCONNUE** de l'action reellement
  epinglee — a `84b9d35b` (= `action-v0.6.2`) elle s'appelle **`includeUpdaterJson`**. GitHub Actions
  ignore une entree inconnue **en silence**. Le volet G de L40 etait donc **inoperant**, et **CA-12
  n'aurait jamais pu se clore** dans cette configuration. C'etait exactement le risque que le gate L40
  avait nomme (**D-4**, *« ma preuve porte sur la branche `dev` »*) et que le tag flottant rendait
  invérifiable. **Le gate a nomme le doute, le lot suivant l'a converti en fait.**
- **Le remede : deux gardes, et il en fallait deux.** Le pin seul aurait **fige le referent en laissant
  l'entree inerte**. La seconde compare les entrees **posees** aux entrees **declarees** par le SHA.
  Preuve la plus parlante : remettre le workflow dans l'etat **exact** que L40 avait laisse fait rougir
  **7 tests sur 13** — la garde aurait attrape le defaut le jour meme.
- **Le critere generique du lot**, adopte du decideur : *toute garde touchee est eprouvee par une
  mutation qui la fait rougir* — la mutation portant sur le **programme**, jamais sur l'attendu, et
  pour une **jonction**, la mutation etant la **suppression de l'appel**.
- **Specifique a ce depot** : son generateur **derive `version` du tag** (`buildManifest({tag,…})`),
  donc il la **couvre** la ou IakaCockpit la laisse passer. `cargo test` est **volontairement hors de
  `test:all`** (motif ecrit : machines sans toolchain Rust) ; le lot a corrige la **pretention** du
  critere, pas le script — `test:rust` est expose a part.
- **Ce qui reste ouvert, et qui appartient au decideur** :
  1. **Etape 5.1 de L40 : bump + tag + run CI.** C'est la **seule** facon de constater que
     `includeUpdaterJson: false` supprime reellement le `latest.json` concurrent des releases —
     aujourd'hui c'est **prouve par lecture du bundle `dist/index.js` execute**, pas par observation.
     Clot aussi **CA-12** et la premiere moitie de **CA-13** de L40.
  2. **Les deux recettes reelles** : un client Windows **MSI** qui **remplace** son enregistrement au
     lieu de doubler ; un client Linux **`.deb`** qui **installe** au lieu d'echouer en
     `InvalidUpdaterFormat`. **Jamais observees.**
- **Cinq defauts au registre, tous declares, aucun bloquant** :
  1. **Fermeture manquee de `version`** cote IakaCockpit. Le motif retenu (« la seule fermeture
     disponible est une empreinte versionnee ») est **faux sur ce champ** : deriver la version du tag
     lu dans l'URL — ce que le generateur du GUI fait deja — la ferme **en une ligne de test**,
     byte-identite preservee. **Mesure au gate.** `I4` l'attrape par ailleurs.
  2. **`notes` n'est couvert par rien**, et **`pub_date` reculee** non plus. La borne est
     **asymetrique** : avancee au-dela de `mesureLe` -> rouge ; reculee -> vert. Declares avec
     condition de levee. Cause structurelle : **CA-16 prescrit lui-meme** de tirer `--notes` et
     `--pub-date` du fichier — un champ tire du fichier ne peut pas rougir en y revenant.
  3. **L'echange de lignes du registre de convergence passe au vert** — le compte est preserve, un
     fichier quitte silencieusement la couverture. Limite **declaree et prouvee vraie** au gate.
  4. **Resolution du depot frere par enumeration** : un 3e depot portant le registre changerait la
     cible. Remede autoritaire `IAKA_CONVERGENCE_HOME` (dossier sans registre -> `exit 2`, aucun repli).
  5. **Un rouge observe une fois puis perdu** (`1 failed | 1239 passed` cote GUI), non reproduit en
     **11 passes**. Le verificateur refuse de le declarer inexistant.
- **Prochaine etape concrete** : le successeur **« installer depuis rien »** — les 3 README annoncent
  une version scellee perimee, et GitHub designe **v0.1.6** comme `latest` du GUI alors que **v0.1.7**
  existe (il classe par **date de publication**, pas par numero). Autre audience, **trois** depots.
- **Pieges connus** :
  1. **Une entree inconnue d'une GitHub Action est ignoree EN SILENCE.** Ne jamais lire l'`action.yml`
     de `dev` pour une action epinglee sur un tag : lire **au SHA**, et verifier jusque dans le bundle
     `dist/index.js` si l'enjeu le merite.
  2. **`tauri-action` est epingle sur `84b9d35b5fc46c1e45415bdb6144030364f7ebc5` (`action-v0.6.2`)**,
     avec cliquet. **Epingler n'est pas monter** : passer en `v1` change le comportement du CI et se
     recette. La mutation du cliquet se fait **dans la fixture**, jamais dans le workflow.
  3. **Une prose de declaration vieillit sans que rien ne le signale.** Le lot y repond par un
     **cliquet a double sens** : la declaration rougit si le trou se referme **comme** s'il s'en ouvre
     un nouveau. Une limite ecrite mais non mesuree est une garde tiede de plus.
  4. **La partition des champs n'est pas la meme dans les deux depots** (le generateur du GUI derive
     `version` du tag, celui du Cockpit non). **Ne jamais dupliquer une declaration : la mesurer des
     deux cotes.**
  5. **Les actes de publication sont refuses aux agents** par le classifieur de permissions. Le
     decideur les tape lui-meme avec le prefixe `!`.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-08-29 10:51 | manual | v0.1.7 | main | Lot L41 gardes tiedes livre : les gardes qui ne pouvaient pas rougir rougissent. Gate PASS au second passage. |
| 2026-08-29 01:55 | manual | v0.1.7 | main | Lot L40 cles d installeur livre et fusionne : 9 cles par app, 9/9 telechargeables. Gate PASS 16/18 CA. |
| 2026-08-28 21:55 | pause | v0.1.7 | main | Fin du lot 0 (trois canaux synchrones) + L1 (publication des artefacts) — auto-update reellement telechargeable |
| 2026-08-28 14:32 | pause | v0.1.7 | feat/L0-trois-canaux-synchrones | Recit de reprise redige (lot 0 - part 0.b, trou a moitie bouche). |
| 2026-08-17 01:23 | pause | v0.1.7 | main | Train GUI-VENDOR-CHARON + GATE-DE-PHASE-OPTIONNEL merge dans main (gate Legolas PASS 29/29) |
| 2026-08-10 20:16 | version | v0.1.6 | main | Auto-update de l'application livre, gate PASS borne, publie sur le canal Forgejo LAN et bascule recettee (0.1.5 -> 0.1.6) |
| 2026-08-02 23:20 | pause | v0.1.4 | main | Session du 2026-08-02 : cycle COMPLET parcouru en une session (2 arbitrages bloques -> cadrage -> verdicts -> reecriture -> implementation -> gate vert). 6 commits, tous pousses. (1) G6 super-etage portefeuille : statut mensonger corrige et instruction CLOSE, ratifiee a posteriori sur 3 points (validation oui ; AC-2 passe a 12 types via frames/AR-1 ; AC-7 passe a 4 libraryList + pointeur ; paragraphe 5 fige en ARCHIVE HISTORIQUE, le code fait foi). (2) Q-3 : a CHANGE DE NATURE puis a ete LIVREE. Le parametre VRAM est supprime (aucun endpoint Ollama n expose la VRAM totale ; /api/ps ne rend que la VRAM consommee par les modeles charges) ; la source des candidats devient la DECOUVERTE LIVE du noeud via GET /v1/models (commande llm_models existante, aucune commande Tauri neuve) ; pre-remplissage par regle de motif clee roleKey sur 9 roles. Six questions tranchees. Fichier renomme (P-O-7) en Q3-decouverte-modeles-noeud-preremplissage-binding.md ; la reference E1:227 annoncee cassee N EXISTAIT PAS, et la vraie peremption d E1 (paragraphe 10bis affirmait Q-3 reste OUVERTE) a ete resorbee : le bloc E1 est desormais integralement tranche. IMPLEMENTATION : coeur pur packages/core/src/discovery.ts + raccord LiaisonPanel (input list + datalist, editable) + useForgeDeploy (etat volatil, jeton de course). Deux gardes non prevues par l instruction et ajoutees car elles evitent des defauts reels : le pre-remplissage ne pourvoit que les champs vides (sinon une frappe pendant le timeout de 10 s serait ecrasee) et un jeton de course empeche une reponse tardive de ressusciter un binding decoche. Quatrieme mode d echec decouvert (ollama-lan sans lanHost) converge sur le meme etat visible que les trois autres. GATE RELANCE ET VERIFIE INDEPENDAMMENT (pas repris du rapport d execution) : lint:all exit 0, vitest 1116 tests / 118 fichiers verts (avant 1065 / 115, soit +51 tests / +3 fichiers), cargo test 116 passed 0 failed, npm run build OK 159 modules. AUCUN test existant modifie, src-tauri INCHANGE (porcelain vide). RESTE OUVERT : recette humaine contre un noeud vivant (tout est prouve par test, RIEN par l usage) ; arbitrage AC-Q3-11 sur 3 litteraux de modele ANTERIEURS a Q-3 et hors perimetre (SettingsRoot.tsx:387 cote authoring, forge/mock/copilote.ts:36 etiquete mock, packages/core/src/llm.ts:25 en commentaire) - lot de nettoyage distinct volontairement non fait ; P-O-2 trou ollama-lan (elargir host_allowed est un arbitrage de SECURITE) ; 5 autres points ouverts non bloquants. VERSION NON CHANGEE (v0.1.4) : une feature est livree, le bump semver est une decision du decideur. |
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
