# Etat des lieux - iakaFrameGUI

> Genere par iakaframe (CLI) le 2026-09-03 21:26 (motif: manual).
> A regenerer a chaque changement de version et a chaque pause/reprise.

## Etat courant

| Champ | Valeur |
|---|---|
| Version | v0.1.8 |
| Branche | main |
| Dernier commit | e47cf14 chore: checkpoint — dette de canal fermee, endpoint iakabox retire |
| Arbre | propre |
| Fichiers (suivis + non ignores) | 503 |
| Note | LOT A livre : mode guide du terminal, 3 paliers, --guide sur 10 cibles, regle unique de non-interactivite. Palier 2 NON RECETTE (geste humain, 2 OS). |

## Commits recents

| Hash | Date | Sujet |
|---|---|---|
| `e47cf14` | 2026-09-03 | chore: checkpoint — dette de canal fermee, endpoint iakabox retire |
| `496348d` | 2026-09-03 | merge: la dette de canal de la publication (gate Legolas PASS) |
| `77a7a91` | 2026-09-03 | fix(docs): rectifie EN DATANT les deux dernieres traces d'un cliquet a 20 |
| `87b4224` | 2026-09-03 | fix(convergence): cliquet 20 -> 23 — les trois fichiers de la dette de canal etaient inscrits SOUS le plancher |
| `2a408c3` | 2026-09-03 | fix(convergence): inscrit les 3 fichiers generiques de la dette de canal (cliquet 20 -> 23) |
| `cdf8534` | 2026-09-03 | docs(tests): CA-6 — ecrit la limite de la face 1 DANS le fichier de garde |
| `d52fdad` | 2026-09-03 | fix(update): reformule le commentaire de rendreCompte — CA-1 zero occurrence stricte du fichier |
| `4589c5c` | 2026-09-03 | fix(update): lint propre du script de face 2 (import inutilise, eslint-disable mort) |
| `eb293c7` | 2026-09-03 | docs: rectifie la promesse de visibilite (datee) et inscrit la dette de canal au backlog |
| `4d3c2e9` | 2026-09-03 | feat(update): face 2 hors gate — verifie ce que chaque endpoint sert reellement |

## Reprise du travail (a completer par Cowork)

- **Ou on en est** : le **LOT A du mode guide** est livre et fusionne — c'etait le plus gros lot de
  la serie (~5,25 j), **PASS au PREMIER passage**. Les trois depots sont alignes sur **les trois
  references** (local, NAS, GitHub), arbres propres.

### Le mode guide du terminal — LIVRE (lots 0, B et A ; la serie est complete)

**Trois paliers**, cables sur **10 cibles** — le critere etant *« le parametre a-t-il une autorite
enumerable en place ? »*, jamais « les plus utilisees » (non mesure, donc invérifiable) :

| Palier | Contenu |
|---|---|
| **0** | **refus loquaces** — chaque refus sur vocabulaire ferme **LISTE les valeurs derivees de l'autorite** |
| **1** | **listes numerotees**, patron `models` deja eprouve en production |
| **2** | **fleches, surbrillance, filtre a la frappe** — mode brut, **MEME couture que 1** |

⚠️ **Le palier 1 n'est PAS un brouillon du 2 : il en est le REPLI AUTOMATIQUE** quand le mode brut
n'est pas disponible (terminal exotique, Windows ancien).

**Declenchement : `--guide`**, drapeau **opt-in**, **invisible des appelants existants**. Le verbe nu
est ecarte — il **casse la classe A** (`list` rend l'inventaire, `show` sort en `exit 1`).

**UNE REGLE UNIQUE de non-interactivite** (`peutDemander`) remplace **les DEUX regles divergentes** :
`models` **ne regardait PAS `CI`**, donc sur un runner avec pseudo-terminal **il prompterait et ferait
pendre le job**. ⚠️ **Changement de comportement OBSERVABLE, signale et documente aux deux endroits,
jamais glisse.**

🛑 **L'INTERDIT D'A4 TIENT, verifie par le gate qui a cherche le contournement** : aucune liste de
menu ne peut produire `--force` / `--yes` / `--cascade` / `--autoriser-creation-depot` **comme item**,
et un **test statique** double le filet runtime. **Un guidage qui proposerait `--force` aurait annule
la garde de l'Amendement A.** En valeur libre, **c'est `validateModelValue()` qui tranche, JAMAIS le
moteur** — mesure, pas lecture.

**Un VRAI bug trouve et corrige en route (CA-10)** : les trois points d'entree ne rendaient `'vide'`
que si `permettreLibre` etait faux — or **les 10 cibles passent toutes `true`**. Une autorite vide
affichait *« saisir un id »* au lieu de *« rien a guider »*. **Reproduit par le gate sur l'etat
d'avant**, remede verifie.

### 🛑 CE QUI RESTE DU AU DECIDEUR — trois gestes, et personne ne peut les faire a sa place

1. **La recette du palier 2** — `specs/recettes/mode-guide-palier-2-manuelle.md`, **8 scenarios, sur
   macOS ET Windows**, dont **Ctrl-C et la restauration du terminal**. **CA-13 N'EST PAS COCHEE** :
   le palier 2 est **LIVRE MAIS NON RECETTE**, et c'est ecrit tel quel partout. Le mode brut **n'est
   pas testable de bout en bout** — Node n'a pas de pty, `node-pty` serait **une dependance donc
   interdite**. Le gate a juge la recette **JOUABLE** : *« gestes precis, verdict binaire par ligne,
   pas vague »*.
2. **M-1** — sur une machine **hors LAN**, chronometrer un controle de mise a jour. Le NAS est en
   **position 1**, adresse **privee**, **sans delai configure**.
3. **M-4** — faire servir volontairement un **manifeste PERIME** par le NAS : **l'app dit-elle « a
   jour » ?** C'est **« la seule preuve du risque central »**, celui que le lot de la dette de canal
   contourne **sans l'avoir jamais vu**.

### Specifique a ce depot

- `v0.1.8` publiee, **9 cles / 9**, manifeste **regenere et servi** aux clients.
- **Non touche par le LOT A** (mode guide) : il vit dans `iakaframe` seul.
- **Il PEUT tester la jonction** que le Cockpit ne peut pas (`publish-update.test.mjs:530-534`) —
  divergence structurelle **preexistante**, non instruite.
- **Flake connu, non bloquant** : `personaPropose.integration.test.tsx` echoue ~1 fois sur 3 runs
  complets, **vert en isolation**, **sans lien** avec les lots gates.

### Prochaine etape concrete

1. 👤 **Les trois gestes ci-dessus.**
2. **`RESERVOIR-REDECLENCHE`** *(inscrit au backlog le 2026-09-03)* — le seuil du reservoir compte
   des **occurrences**, pas des **observations neuves**. Mesure : **8 propositions pour 2 sujets**,
   quatre cycles, sur **les memes deux lignes du 17 juillet**. Trois pistes inscrites, **aucune
   tranchee, aucune gratuite** — *« c'est un cadrage, pas un correctif »*.
3. **`CI-RELEASE-AUCUN-EPINGLAGE`** — le `release.yml` d'`iakaframe` **n'epingle rien** (trois tags
   flottants). Successeur legitime : *« aucune mesure de ce lot ne le refute »*.
4. **Ecart doc/code signale, non bloquant** : `docs/commandes.md` **sous-declare** le nombre
   d'exceptions a la regle A4.1 — **4 selections sur 10** n'offrent pas d'entree libre, **une seule
   est nommee**.
5. 🛑 **Tourner le jeton iakabox** et supprimer `feat/L0-CONTIENT-UN-JETON-NE-PAS-POUSSER`
   (**verifie** : cette branche **n'est PAS sur GitHub** — on ne pousse jamais `--all`).

### Pieges connus

1. ⚠️ **Le plugin updater s'arrete au premier endpoint qui REPOND, pas au premier qui est FRAIS.**
   Donc **un endpoint joignable et perime FAIT AUTORITE** sur un endpoint frais place apres lui.
   **Vaut pour le NAS**, position 1.
2. **Une garde de FRAICHEUR compare deux derives de la meme source** : elle ne voit pas une derive de
   la source. Il faut un **controle positif independant**.
3. **Un temoin vide est pire qu'un temoin absent.** Quatre trouves cette semaine. ⚠️ **Un test
   d'interactivite est NOTOIREMENT facile a ecrire a vide** : *« pas de prompt en non-TTY » est vert
   sur un CLI ou rien n'est branche*.
4. **Un plancher de cliquet SOUS le compte reel ne rougit jamais** ; **AU-DESSUS il rougit en
   permanence**. Se mesure, ne se suppose pas.
5. **Une interdiction par POINTEUR ne ferme pas une classe** : interdire d'aligner UN fichier laisse
   creer trois fichiers neufs non gardes. *On ne `grep` pas une implication.*
6. **Un motif sans condition de chute est une exclusion de confort** — et une condition **generique**
   en est une deguisee.
7. **`gh release edit --latest` est un drapeau BOOLEEN** ; `legacy` n'est atteignable que par l'API,
   et **`false` ne relache rien**. **M1 a prouve que `true` AGIT.**
8. **La doc de GitHub decrit une regle que l'endpoint NE SUIT PAS.** *Une doc ne se refute pas en la
   relisant, elle se refute en mesurant.*
9. ⚠️ **PUBLIER PERIME LE CORPUS** : `v0.39.0` a rendu FAUX **cinq** textes en une heure.
10. **Deux sessions dans le meme arbre = travail perdu.** Parade : **worktree isole**, **jamais
    `git add -A`**, chemins nommes, `git status` avant chaque commit.
11. **Verifier la branche courante AVANT de fusionner** : `git merge` depuis la branche elle-meme
    repond **« Already up to date »** pendant que `main` ne bouge pas.
12. ⚠️ **Un etat SAUVEGARDE n'est pas l'etat COURANT** (erreur d'Odin, 2026-09-02).
13. **Un agent qui s'enlise deux fois au meme endroit ne se relance pas a l'identique** : **couper le
    lot en deux** l'a debloque en cinq minutes.
14. ⚠️ **Regenerer un manifeste SANS relancer l'instrument de mesure fait rougir I4** (erreur d'Odin,
    attrapee par la garde).
15. **`node-pty` est INTERDIT** (zero dependance) : tout ce qui exige un vrai pty se recette **a la
    main**, et se declare **NON COUVERT** plutot que teste a vide.

## Journal (versions & pauses)

| Date | Motif | Version | Branche | Note |
|---|---|---|---|---|
| 2026-09-03 21:26 | manual | v0.1.8 | main | LOT A livre : mode guide du terminal, 3 paliers, --guide sur 10 cibles, regle unique de non-interactivite. Palier 2 NON RECETTE (geste humain, 2 OS). |
| 2026-09-03 18:54 | manual | v0.1.8 | main | Dette de canal fermee : fan-out sur les deux canaux, exit non nul si une cible echoue, face 2 hors gate. Endpoint iakabox retire. Cliquet 20->23. |
| 2026-09-03 14:51 | manual | v0.1.8 | main | Mode guide du CLI livre (lots 0+B) : 33 commandes /iaka-*, registre unique, aide derivee. Amendement A : la garde de vocabulaire echoue. A-1 clos. |
| 2026-09-02 18:06 | manual | v0.1.8 | main | L44 clos. iakaframe v0.39.0 publiee (1er run du CI). Chaine de maj reparee sur les 3 canaux. Contrefactuel du latest joue sur depot reel. |
| 2026-09-02 12:33 | pause | v0.1.8 | main | L44 PASS au 8e passage, fusionne et pousse. Correctif des ecarts consignes en cours : ecart 1 fait, 2-4 restants. |
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
