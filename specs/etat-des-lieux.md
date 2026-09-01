# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-09-01 22:20 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.8 |
| Branche | main |
| Dernier commit | 6c863f6 fix(L43): la vitrine imprimait a l'operateur la phrase refutee — aux trois depots |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 496 |
| Note | L43 livre au 6e passage : balayage de completude. Trois mesures du banc jouees : --latest agit, false inerte, legacy AGIT. |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `6c863f6` | 2026-08-30 | fix(L43): la vitrine imprimait a l'operateur la phrase refutee — aux trois depots |
| `8ab9d95` | 2026-08-30 | fix(L43): l'etat des lieux cesse de promettre un vol "mecaniquement impossible" |
| `90c36f9` | 2026-08-30 | fix(L43): le cartouche cesse d'annoncer une reparation par une regle refutee |
| `4bf4929` | 2026-08-30 | fix(L43): le bloc latest et le backlog disent la mesure, sa liste de regles et son residu |
| `16eccd2` | 2026-08-30 | fix(L43): le bloc latest et le backlog cessent de promouvoir le banc en propriete generale |
| `2d372a1` | 2026-08-30 | fix(L43): le cartouche borne sa conclusion a la topologie du banc |
| `1413a5a` | 2026-08-30 | fix(L43): l'entree de backlog cesse de citer une empreinte inventee et un compte faux |
| `006f65b` | 2026-08-30 | fix(L43): le bloc `latest` du CLAUDE.md separe ce qui est mesure de ce qui est deduit |
| `5f63842` | 2026-08-30 | fix(L43): le cartouche cesse d'affirmer un MECANISME qu'aucune trace n'etablit |
| `589c4d6` | 2026-08-30 | docs(L43): backlog — la repetition est faite, le contrefactuel reel est suspendu |

## Reprise du travail (a completer par Cowork)

- 🆕 **2026-09-01 — LOT L44 « re-cadrage de la garde du `latest` » : le code est ecrit, remis au
  gate.** Ce qui suit **complete** ce qui precede ; rien n'est efface, tout est date.
  - **Le job REPARE, desormais.** La branche du vol ecrivait `--latest=false` sur le tag publie —
    ecriture **inerte**, mesuree deux fois ; elle **execute** maintenant
    `gh release edit "$PLUS_HAUT" --latest`. AR-7 = (a), tranche par le decideur sur la mesure
    **M1**. ⚠️ Il n'**EMPECHE** toujours pas : la release est creee **avant** lui. La fenetre du
    vol n'est pas fermee, elle est **raccourcie**.
  - **Le referent est corrige (2a), et c'etait le vrai defaut de code.** `PLUS_HAUT` se derive
    desormais de `repos/$DEPOT/releases` — brouillons et preversions exclus, comme les exclut
    `GET /releases/latest` —, et le cas « aucune release » **sort en succes en le disant**. Le
    **faux rouge** et la **dictee sur une release inexistante** sont **reproduits hors ligne,
    avant/apres**, sur six scenarios.
  - **Le trou mesure du GUI est ferme.** `fixtures/bloc-latest.sha256`,
    `scripts/lib/bloc-latest.mjs` (extraction **par marqueur**, unicite **assertee**) et
    `scripts/__tests__/bloc-latest.test.mjs` — byte-identiques, inscrits au registre de
    convergence, **cliquet 17 -> 20**. **Eprouve** : sous mutation d'un octet du workflow du GUI,
    les deux faces historiques restaient **vertes** (8/8 et 18 fichiers), la garde neuve
    **rougit**. Revocations prouvees au `sha256`.
  - **L'instrument cesse de mentir sur lui-meme.** L'en-tete de `registre-repli-latest.js` disait
    « TROIS PASSAGES » et se contredisait 26 lignes plus bas ; la cle `"//"` du JSON annoncait
    **quatre** detections pour **sept** reelles. Corriges **en datant**. **D-8** tient desormais
    les **cles de prose** du registre par empreinte, et les **13 exclusions de fichier** sont
    **ancrees ligne a ligne**.
  - **Le residu, a la precision que la mesure autorise** : la regle de repli **EXISTE**, elle vit
    sous `make_latest=legacy`, elle n'est atteignable que par `PATCH`, et elle **n'est PAS dirigee
    par la date la plus recente** — ni `created_at`, ni `published_at`, ni l'ordre
    d'enregistrement. ⚠️ **SA FORMULE RESTE INCONNUE : les deux releases mesurees sont DU MEME
    JOUR** ; une regle au grain du jour departagee par le semver donnerait la meme sortie. Le
    residu **(2) est REFERME** : le NO-OP siege dans la **semantique de la valeur `false`** cote
    API — ni le client, ni le transport, ni la lecture.
  - **La doc de GitHub est refutee par mesure** : `GET /releases/latest` s'y dit trie « by the
    `created_at` attribute » ; le banc la refute **deux fois** (avant M1, apres M3b, sur le
    `created_at` le plus **ancien**). Et `created_at` est la date du **commit** du tag.
  - ⚠️ **NON MESURE, et du au decideur** : le contrefactuel A/B **sur le banc** (CA-6) et la preuve
    de bout en bout **dans un run reel** (CA-10). Ce sont des **actes de release**, refuses aux
    agents. L'agent a joue l'equivalent **hors ligne**, sur un `gh` d'essai : ce n'est **pas** la
    meme mesure, et ce n'est pas ecrit comme telle.
  - **Prochaine etape concrete** : **gate Legolas**, puis les deux mesures de banc par le decideur.

- **Ce qui vient d'etre fait** : le lot **L43 « contrefactuel du vol de `latest` »** est livre, gate
  **PASS au SIXIEME passage**, fusionne et pousse. Puis le decideur a joue **trois mesures** sur le
  banc prive, qui ont **renverse une premisse** du re-cadrage en cours.
- **Le fait etabli, et il a coute cher** : `make_latest=false` **est un NO-OP**. Deux mesures croisees
  refutent **8 regles de repli sur 9** — `created_at` (avec et sans exclusion), `published_at` (idem),
  **semver**, plus grand **`id`**, et le **repli differe** (refute par relecture ~13 h apres). Seul le
  NO-OP survit **parmi les regles enumerees**.
- **Les trois mesures du 2026-08-31, qui changent la lecture** :

  | Ecriture | Effet | Mesure |
  |---|---|---|
  | `--latest` (`true`) via `gh` | **AGIT** | M1 |
  | `--latest=false` via `gh` | **inerte** | 29/08 |
  | `make_latest=false` via `PATCH` brut | **inerte** | M2 |
  | **`make_latest=legacy` via `PATCH`** | **AGIT** | M3 |

  **M1** sauve le lot : le rattrapage que le job imprime **fonctionne**, ce n'est pas un mensonge.
  **M2** : le `PATCH` **brut** est accepte et sans effet -> **le NO-OP n'est PAS dans `gh`**, il siege
  dans l'API ou la lecture. **M3** : ⚠️ **`gh` REFUSE la valeur `legacy`** (`--latest` est un drapeau
  **booleen**, `strconv.ParseBool`) — elle n'est atteignable que par l'API ; et par l'API elle **AGIT**,
  le `latest` passant de `v0.9.0` a `v0.10.0`.
- **Ce que M3 etablit — et rien de plus** : `false` et `legacy` **ne sont pas equivalents**. Ecrire
  `false` **n'abandonne pas** la designation explicite ; **seul `legacy` la rend au calcul**. Et le
  `latest` est alle sur le **plus haut semver**, qui etait **le plus ancien sur les deux dates** :
  **la date la plus recente NE GAGNE PAS**. ⚠️ **Avec deux releases on ne separe pas « semver domine »
  d'une combinaison date+semver avec departage — on sait que la date ne dirige pas, pas la formule.**
- **Le job ecrit `--latest=false` en croyant relacher la designation ; il ne la relache pas.** C'est
  une **piste** de remede (ecrire `legacy`), **pas une conclusion** : `legacy` est inatteignable par
  `gh`, et rien n'est mesure sur son comportement **a la creation** par `tauri-action`.
- **Specifique a ce depot** : `v0.1.8` est publiee, `latest` mesure a `v0.1.8`, **9 cles / 9
  telechargeables**. ⚠️ **C'est le point faible** : son `release.yml` **n'est garde par AUCUNE face**
  de convergence — prouve par mutation (un octet mute, les deux faces vertes ; temoin sur un fichier
  inscrit : les deux rouges). Son `latest` repose sur la meme branche inerte. Le re-cadrage propose une
  fixture `bloc-latest.sha256` **plutot que d'aligner les deux `release.yml`**, qui **ne sont PAS**
  byte-identiques (deps Linux l.72, commentaire minisign l.96-99).
- **Le vrai defaut de code, trouve A LA LECTURE et non par l'outil** : `release.yml:167` derive
  `PLUS_HAUT` de `repos/<depot>/tags`, alors que `GET /releases/latest` ne peut rendre qu'un tag
  **PORTEUR d'une release** — **4 sur 29** au Cockpit. Sur build rouge (le cas que `if: always()`
  couvre expres), un tag de version reste sans release, **`VERIFICATION` rougit A TORT**, et le
  rattrapage dicte **s'adresse a une release qui n'existe pas**. Cette ligne **ne porte aucun mot du
  motif** : aucune empreinte ne la tenait. **C'est la meilleure demonstration disponible de la borne
  de l'instrument.**
- **L'instrument livre par L43** : un **registre d'enonces** (442 entrees) et un **balayage de
  completude** (D-5/D-6/D-7 + cliquet) — dans un fichier couvert, toute ligne du motif doit etre
  **tenue par une empreinte** : inscrite, ou **declaree hors couverture avec motif ET empreinte du
  texte exclu**. **Sa preuve** : relance sur l'etat que le gate venait de declarer `CONFORME` ->
  **253 lignes NON TENUES**. *« C'est ca, l'ecart entre une liste et un critere. »*
- **Sa borne, demontree et declaree — H-1** : *« la completude est celle du **MOTIF**, jamais celle du
  **SENS** »*. **173 des 442 entrees** sont ancrees sur des lignes que le balayage **ne verrait
  jamais** ; **7 enonces du coeur du residu ont ete trouves a la lecture** ; et on peut ajouter
  **70 lignes affirmant le contraire de tout le lot** sans qu'aucun compteur ne bouge. **La lecture
  reste dans la boucle.**
- **Pourquoi six passages** : le gate a diagnostique un **front qui recule** — le mecanisme, puis la
  portee, puis la propagation, puis la couverture de l'instrument. *« Les corrections sont pilotees
  par le pointeur, et les pointeurs d'un gate sont des **exemples**, pas une enumeration. **On ne
  `grep` pas une implication.** »* Le 6e passage a reussi parce que le **critere de cloture** a change :
  un balayage auto-verifiable, pas une liste.
- **Prochaine etape concrete** : Gandalf **amende** le re-cadrage avec M1/M2/M3 — la decision (2b)
  etait « re-affirmer `--latest` », **M3 ouvre « ecrire `legacy` »**, qui n'etait pas sur la table. Il
  dira aussi **s'il faut une 4e mesure** (une 3e release au banc casserait la correlation semver/date).
- **Pieges connus** :
  1. **`gh release edit --latest` est un drapeau BOOLEEN.** `legacy` — une des trois valeurs
     documentees — est **inatteignable par le client**. Seule l'API l'ecrit.
  2. **`false` n'est pas `legacy`.** Le premier ne relache rien, le second rend le drapeau au calcul.
  3. **Une liste de pointeurs n'est jamais une cloture.** Cinq listes successives ont ete des
     echantillons — y compris celles du gate, et **celle du gate omettait les cibles de sa propre
     mutation**.
  4. **Un registre muet est un defaut.** Le hors-couverture se declare **ligne a ligne, avec motif et
     empreinte du texte exclu** — sinon exclure ouvre un trou neuf.
  5. **Le banc `iakasju/latest-contrefactuel`** (prive, conserve) est la piece a conviction :
     `v0.10.0` plus haut semver et plus **ancien**, `v0.9.0` plus recente sur les deux dates. **Cette
     topologie adverse est ce qui rend l'elimination possible** — ne pas la casser.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-09-01 22:20 | manual | v0.1.8 | main | L43 livre au 6e passage : balayage de completude. Trois mesures du banc jouees : --latest agit, false inerte, legacy AGIT. |
| 2026-08-29 23:51 | version | v0.1.8 | main | Bump v0.1.8 gate PASS, fusionne, tag pousse, run 33276696343 lance en matrice complete. |
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
