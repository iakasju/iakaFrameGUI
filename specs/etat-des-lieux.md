# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-08-29 21:34 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.7 |
| Branche | main |
| Dernier commit | 78f3940 fix(vitrine): le temoin de la promesse en PROSE mesure enfin ce qu'il nomme |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 496 |
| Note | Lot L42 installer depuis rien livre : la vitrine ne promet plus ce qu elle n a pas. NAS injoignable, push GitHub seul. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `78f3940` | 2026-08-29 | fix(vitrine): le temoin de la promesse en PROSE mesure enfin ce qu'il nomme |
| `be2cc86` | 2026-08-29 | docs(claude): « promis » se lit hors bloc d'absence, pas « ligne de tableau » |
| `1c62041` | 2026-08-29 | fix(vitrine): promis, c'est promis PARTOUT — pas seulement dans un tableau |
| `f888367` | 2026-08-29 | docs: la regle du latest, les deux faces de la vitrine, et L42 au backlog |
| `f2f9992` | 2026-08-29 | ci(release): le latest est DESIGNE, plus subi — sans toucher au SHA epingle |
| `94cfec5` | 2026-08-29 | chore(convergence): cinq fichiers de vitrine au registre, plancher 12 -> 17 |
| `dd17a71` | 2026-08-29 | feat(vitrine): le README rejoint VERSION_CARRIERS — le cliquet existant fait le reste |
| `8183040` | 2026-08-29 | feat(vitrine): face EN LIGNE du cliquet — anonyme, hors gate, SKIP explicite |
| `60d373b` | 2026-08-29 | test(vitrine): face LOCALE du cliquet — dans le gate, hors reseau, deterministe |
| `a86e62c` | 2026-08-29 | fix(readme): trois lignes fausses reprises, pas une |

## Reprise du travail (a completer par Cowork)

- **Ce qui vient d'etre fait** : le lot **L42 « Installer depuis rien »** est livre, gate **PASS au
  troisieme passage**, fusionne dans `main` et pousse. Son critere n'etait pas technique : **ce qu'un
  inconnu obtient en suivant ce qu'on lui montre**. Il ne construit aucun installeur — **il rend vraie
  la page qu'on montre**.
- **Quatre defauts, pas trois** (le 4e trouve au cadrage) : **H-1** les 3 README annoncaient une
  version perimee (jusqu'a **dix-neuf mineures** d'ecart pour la CLI) · **H-2** GitHub ne classe pas
  par numero mais par un drapeau **`make_latest`** que personne n'avait jamais touche — republier une
  version ancienne **vole** le latest, et c'est ce qui s'etait passe · **H-3** la ligne de publication
  d'`iakaframe` s'etait tue depuis le 2026-08-04 · **H-4** la vitrine promettait des fichiers
  **inexistants** : la release « Latest » du Cockpit ne porte **aucun `.dmg`** alors que le README en
  promettait deux. **Un visiteur macOS repartait les mains vides.**
- **La cause de H-4, MESUREE et non intuitee** : `v0.32.1` a ete publiee par **deux
  `workflow_dispatch` successifs** (`platforms: windows` puis `platforms: linux`) — **aucun ne
  selectionnait macOS**. Le dernier run a matrice complete (`v0.31.2`) avait produit les deux `.dmg`
  sans difficulte. **Ce n'est pas un echec de build : l'artefact n'a jamais ete demande.**
- **Trois gates, deux FAIL, et le second est le plus instructif de la journee** : le lot qui supprime
  les gardes muettes contenait **un temoin vide** — un test nomme *« une promesse en PROSE est VUE »*
  qui **ne pouvait pas rougir**, parce qu'il visait un artefact **deja promis par le tableau**. Il
  aurait verdi meme si la fonction ignorait entierement la prose. Repare **et verrouille** : la
  premiere assertion exige desormais que le nom ne soit **pas** deja promis avant la prose. Le temoin
  ne peut plus redevenir creux en silence.
- **Ce qu'un inconnu obtient aujourd'hui** : **iakaFrameGUI** installable **de bout en bout sur les
  trois OS** (7 fichiers promis, 7 presents) · **IakaCockpit** Windows et Linux, l'absence macOS
  **declaree, datee et levable** au lieu d'etre promise · **la CLI** installable par
  `git clone && npm install -g ./cli` — **voie eprouvee deux fois**, dont sur un clone reel du depot
  public — avec ses deux impasses (`.tgz` et « Source code », toutes deux dependantes d'une release
  **absente**) nommees comme telles.
- **Specifique a ce depot** : c'est le **seul des trois qu'un inconnu installe de bout en bout
  aujourd'hui** — 7 fichiers promis, 7 presents, sur les trois OS. Son `latest` avait ete **vole** par
  la republication de v0.1.5/v0.1.6 apres v0.1.7 ; **rendu a v0.1.7 par le decideur** (`gh release
  edit --latest`), et un cliquet empeche desormais le vol de revenir. Son `absents` est **vide**, ce
  qui rend sa couverture de test asymetrique avec le frere (successeur nº3).
- **Etat des canaux — DETTE A RATTRAPER** : le **NAS `192.168.1.139` est tombe pendant la fusion**
  (timeout 75 s, code 000). **`main` est pousse sur GitHub, en avance sur `origin`.** Rien n'est
  perdu ; le verbe livre la veille est fait pour ca : **`iakaframe canaux --rattraper`** au retour du
  NAS, **en avance rapide seulement**.
- **Prochaine etape concrete** : **l'etape 5.1 de L40** — bump + tag + run CI. C'est **la seule preuve
  manquante de toute la chaine** : on sait par lecture du bundle execute que `includeUpdaterJson: false`
  supprimera le manifeste concurrent, **personne ne l'a vu**. Elle clot aussi CA-12 et la moitie de
  CA-13 de L40. ⚠️ **Pour `iakaframe`, ce serait la PREMIERE execution de son workflow** : mesure
  `actions/runs` -> **`total_count: 0`**, et le commit qui ajoute le workflow **n'est meme pas un
  ancetre du tag `v0.20.4`** (douze jours d'ecart). **Le premier essai sera un essai.**
- **Cinq successeurs inscrits, aucun bloquant** :
  1. **F-2** — une promesse n'est mesurable qu'**entre backticks**. Un lien markdown dont l'URL porte
     le nom, un `curl -LO` en bloc de code, une prose nue : **verts**. Pre-existant, aucun README
     actuel n'en contient — *« pas un mensonge present, un piege futur »*. Mais le commentaire du code
     promet plus que la mesure.
  2. **F-3** — la **face en ligne n'est exercee par aucun test**. Desarmee **symetriquement dans les
     deux depots**, tout reste vert : l'empreinte de convergence prouve l'**alteration**, pas le
     **comportement**.
  3. **Couverture asymetrique** — sous une meme mutation, le Cockpit rougit sur **3** tests et le GUI
     sur **1**, parce que `absents: []` cote GUI. **Le fichier est convergent, sa couverture ne l'est
     pas.**
  4. **`D3-OBSERVABLE-ENREGISTREMENT`** — une phrase dit « avant que le workflow n'existe » la ou la
     mesure dit « son enregistrement ».
  5. **`CI-RELEASE-AUCUN-EPINGLAGE`** — le workflow d'`iakaframe` **n'epingle rien** (`checkout@v4`,
     `setup-node@v4`, `action-gh-release@v2`, trois **tags flottants**). C'est le depot dont le CI n'a
     jamais tourne, et le seul a ne pas avoir l'acquis de L41.
- **Pieges connus** :
  1. **GitHub ne classe pas les releases par numero.** Le `latest` suit **`make_latest`** (defaut
     `true`, reecrit a chaque creation/mise a jour). **Publier une version ancienne vole le latest.**
     Remede : `gh release edit &lt;tag&gt; --latest`, ou le job conditionne au plus haut semver.
  2. **Les `.app.tar.gz` ne sont PAS des installeurs macOS** — ce sont des charges d'updater, on ne
     les double-clique pas. Ce piege a fait compter de faux installeurs **deux fois** dans la journee.
  3. **Un temoin qui vise un cas deja couvert par ailleurs ne prouve rien.** Verifier qu'il rougit
     **quand on restaure le defaut**, pas seulement qu'il est vert.
  4. **Une mutation de gate peut survivre a une interruption d'agent.** Un agent coupe a laisse
     `npm install -g ./CLI` dans un README. **Muter et revoquer une par une**, en verifiant la
     revocation immediatement — jamais en fin de campagne.
  5. **Le quota de l'API GitHub anonyme est de 60/h** et s'epuise vite en recette. Un `SKIP` doit
     rendre un **code distinct** (ici **3**), jamais 0.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-08-29 21:34 | manual | v0.1.7 | main | Lot L42 installer depuis rien livre : la vitrine ne promet plus ce qu elle n a pas. NAS injoignable, push GitHub seul. |
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
