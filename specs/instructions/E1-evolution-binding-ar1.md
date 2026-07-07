# Évolution E1 — Le Binding (liaison persona→runner+modèle) & révision d'AR-1

> **Nature** : ÉVOLUTION DU MODÈLE DE CONCEPTS (niveau portefeuille, décidée par le décideur) — **cadrage seul,
> aucun code**. · **Cadreur** : l'architecte-cadreur.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain).
> **Date** : 2026-07-07. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Fondations touchées** : `specs/contrat-concepts.md` (AR-1, niveaux, Runner/Modèle), `specs/glossaire-
> concepts.md`, et — **par ricochet de modèle** — P1 (team pure), P3 (`model` omis), P3b/P3c (`base_model_id:""`),
> P6 (workflow). Réf. décision : `specs/instructions/cadrage-iakaframegui-et-moteur.md` § 7 (AR-1 d'origine).

---

## 1. Déclencheur & insight

**Insight (décideur)** : un **kit déployé doit pouvoir tourner tout seul dans un terminal, SANS le Cockpit.** Or,
pour les nœuds qui **exigent un modèle** (Ollama, Codex, Open WebUI), un kit **sans modèle** n'est **pas
exécutable** hors Cockpit. Donc le couple **runner+modèle** doit pouvoir être **posé dès la forge** (au
déploiement).

**Conséquence** : **AR-1 dans sa forme d'origine (« la forge ne pose JAMAIS de modèle ») était trop rigide.** Il
confondait deux choses distinctes : la **pureté de la Team** (définition) — qui reste absolue — et l'**exécutabilité
du Kit** — qui doit pouvoir être liée. On sépare ces deux plans par un **nouveau concept de 1re classe : le
Binding**.

---

## 2. Le modèle cible — TROIS couches (à graver)

```
 ┌─ 1. TEAM (DÉFINITION) ───────────────────────────────────────────────┐
 │  personas · rôles · skills · gardes · workflow · connecteurs         │
 │  PURE · agnostique · portable · JAMAIS de runner/modèle ICI          │
 │  Foyer unique de définition : la FORGE (le Cockpit consomme)         │
 └──────────────────────────────────────────────────────────────────────┘
                              +  (éventuellement)
 ┌─ 2. BINDING / LIAISON (concept de 1re classe NOUVEAU) ───────────────┐
 │  persona → runner + modèle   (par nœud)                              │
 │  couche SÉPARÉE · OPTIONNELLE · ENVIRONNEMENT-SPÉCIFIQUE             │
 │  posé par défaut par la FORGE au déploiement ; OVERRIDABLE par le    │
 │  COCKPIT au run-time                                                 │
 └──────────────────────────────────────────────────────────────────────┘
                              =
 ┌─ 3. KIT DÉPLOYÉ  =  Team  +  (Binding?)  →  EXÉCUTABLE ───────────────┐
 │  sans Binding → kit PUR (comportement actuel P1–P6, inchangé)        │
 │  avec Binding → kit STANDALONE-RUNNABLE en terminal nu               │
 └──────────────────────────────────────────────────────────────────────┘
```

**Le point de bascule conceptuel** : la **pureté** est une propriété de la **Team**, **pas** du **Kit**. Une Team
reste pure et agnostique pour toujours ; un **Kit**, lui, **peut être lié** (bound) pour devenir exécutable. Le
Binding est le **pont** entre la définition portable et un environnement d'exécution concret.

---

## 3. Le concept **Binding** (nouveau, 1re classe)

- **Définition.** Une **couche de liaison** qui associe, **pour un nœud donné**, chaque **persona** à un **runner**
  et un **modèle**. Séparée de la Team, **optionnelle**, **spécifique à un environnement**.
- **Niveau.** 🟧 la **forge** en pose un **par défaut** au déploiement ; 🟩 le **cockpit** peut l'**overrider** au
  run-time. Le **schéma** est 🟦 partagé (forge + cockpit doivent parler le même Binding).
- **Attributs (schéma cible)** :
  ```ts
  interface PersonaBinding {
    personaId: string;      // réf. Persona de la Team
    runner: RunnerKind;     // claude-code | ollama | litellm | codex (vocab P2)
    model: string;          // alias/modèle ; "" = défaut du runner (Claude Code)
  }
  interface Binding {
    id: string;
    node: NodeKind;         // le Binding est PAR NŒUD (Q-2)
    teamId: string;         // team à laquelle il s'applique
    bindings: PersonaBinding[];
    origin: "forge-default" | "cockpit-override";  // provenance (traçabilité)
  }
  ```
- **Invariant secret** : le Binding **ne contient aucun credential** (runner = kind, modèle = alias) — les secrets
  restent au **keychain** (comme le Cockpit). Un modèle distant → référence, pas de clé en clair.
- **Séparation dure** : le Binding **n'entre jamais** dans la **définition de Team** (§ 5). C'est un artefact
  **distinct**.

---

## 4. AR-1 révisé (texte exact à graver)

> **AR-1 (révisé, 2026-07-07).** La **Team** (définition) reste **PURE** : zéro runner, zéro modèle — personas,
> rôles, skills, gardes, workflow, connecteurs uniquement. Le couple **runner+modèle** vit dans le **Binding**, une
> **couche séparée et optionnelle** : la **forge** en pose un **par défaut au déploiement** (rendant le kit
> **standalone-runnable** en terminal nu), et le **cockpit** peut l'**overrider** au run-time (sans jamais toucher à
> la définition). L'**agnosticisme est préservé au niveau Team** ; le **Kit**, lui, **peut être lié**.

**Ce qui change vs AR-1 d'origine** : on ne dit plus « la forge ne pose jamais de modèle » (trop rigide). On dit :
« la **Team** ne porte jamais de modèle ; le **Kit** peut être lié via un **Binding**, posé par défaut par la forge
et overridable par le cockpit ». La frontière **forge/cockpit** est **précisée**, pas abolie.

---

## 5. Qui pose le Binding — répartition forge / cockpit

| | **Forge** (build-time) | **Cockpit** (run-time) |
|---|---|---|
| Team (définition) | **définit** (foyer unique) | **consomme** (jamais ne redéfinit) |
| Binding | **pose un défaut au déploiement** (kit standalone) | **override** (change runner/modèle par persona) |
| Exécution | — | **pilote** les sessions |

- **Forge — Binding par défaut** : au déploiement, la forge propose/pose un Binding par nœud :
  - **Claude Code** : `model` **omissible** → sans Binding, le kit tourne sur les **défauts** du runner (déjà le cas
    P3). Un Binding y est **facultatif**.
  - **Ollama / Codex / Open WebUI** : ces nœuds **exigent un modèle** → la forge **DOIT permettre de choisir** le
    modèle (sinon kit non exécutable hors Cockpit). Le Binding par défaut y est **nécessaire** pour un kit
    standalone.
- **Cockpit — override + limite** : le Cockpit **sélectionne** un kit déployé et son **pouvoir/​limite** = **changer
  les runners/modèles des personas** (override du Binding) **sans toucher à la définition** (la Team reste intacte),
  puis **pilote**.

---

## 6. Ce que chaque adaptateur ferait d'un Binding (DESIGN — pas d'implémentation ici)

**Principe transverse (rétro-compat)** : `generate(team, node, binding?)` — **`binding` optionnel**. **Sans
binding** → sortie **actuelle** (pure) inchangée. **Avec binding** → émission **conditionnelle** du modèle.

| Adaptateur | Sans Binding (actuel, inchangé) | Avec Binding (nouveau, conditionnel) |
|---|---|---|
| **claudeCode** (P3) | frontmatter subagent **sans `model`** (défaut runner) | frontmatter avec **`model: <binding.model>`** par persona |
| **agentsMd — codex** (P3b) | `AGENTS.md` sans modèle | `AGENTS.md` **référence le modèle** par persona (section « moteur par persona », comme les gabarits historiques — mais **depuis le Binding**, pas en dur) |
| **agentsMd — ollama-localhost/lan** (P3b) | `AGENTS.md` sans modèle ; endpoint du nœud | idem + **modèle Ollama** par persona (nécessaire au standalone) |
| **openwebui** (P3c) | `base_model_id: ""` (placeholder) | **`base_model_id: <binding.model>`** par Model |

> Dans **tous** les cas : le modèle vient **du Binding**, jamais de la Team. Le renderer d'identité/périmètre/
> workflow (P6) est **inchangé**. `kit_deploy` **inchangé** (il écrit l'arbre, avec ou sans modèle dedans).

---

## 7. Évaluation d'impact sur P1–P6 — ADDITIVE & rétro-compatible

**Constat de l'existant (lecture)** : à ce jour, **aucun code n'est implémenté** dans iakaFrameGUI (`src/`,
`packages/`, `src-tauri/` **absents**) — P1–P6 sont **cadrés** (specs), pas codés. L'invariant « zéro runner/modèle »
est donc **modélisé dans les instructions**, pas encore gravé en tests. **L'évolution arrive AVANT implémentation**
— idéalement placée pour être absorbée sans dette.

**Preuve d'additivité** (l'évolution **n'invalide** aucun lot ; elle **ajoute** une couche) :

| Lot | Invariant actuel (spec) | Effet de E1 | Additif / rétro-compat ? |
|---|---|---|---|
| **P1** (team pure) | `Persona` **sans** runner/model ; `Team` pure | **INCHANGÉ** — la Team reste pure. Le Binding est **hors** Team. | ✅ aucune modif du schéma Team |
| **P3** (claudeCode, `model` omis) | frontmatter sans `model` | **INCHANGÉ sans Binding** ; `model:` **ajouté seulement si** Binding fourni | ✅ signature `generate(…, binding?)` optionnelle |
| **P3b** (codex/ollama, sans modèle) | `AGENTS.md` sans modèle | idem — modèle émis **seulement si** Binding | ✅ |
| **P3c** (openwebui, `base_model_id:""`) | placeholder vide | `base_model_id` rempli **seulement si** Binding | ✅ |
| **P4** (UI générer/déployer) | flux team→nœud→générer→déployer | **inchangé** ; le lot aval « liaison optionnelle » **ajoute** une étape avant génération | ✅ |
| **P5** (skin) | habillage | aucun impact | ✅ |
| **P6** (workflow) | rendu depuis donnée | aucun impact (le workflow n'est pas un modèle) | ✅ |

**Règle d'or de la migration** : **sans Binding → comportement ACTUEL** (kit pur, tests « zéro fuite modèle » **des
Teams** restent verts) ; **avec Binding → le Kit gagne une option** (le modèle apparaît, **traçable à `origin`**).
Les tests de non-fuite **se reformulent** : ils vérifient désormais que **la Team (définition)** ne contient pas de
modèle — **pas** que le **Kit** n'en contient jamais (le Kit lié **peut** légitimement en contenir).

> **Point d'attention pour l'implémentation à venir** : ne pas écrire les tests « zéro modèle » au niveau **Kit** de
> façon absolue (ils bloqueraient le Binding) — les ancrer au niveau **Team/définition**. E1 étant cadré **avant**
> le code, cette précision entre directement dans P1/P3/P3b/P3c.

---

## 8. Lots aval (nommés, pas cadrés en détail ici)

- **Forge — « Étape de liaison optionnelle au déploiement »** (lot **P7**, à cadrer) : avant génération, choisir
  **runner + modèle par persona** pour le nœud cible → pose un `Binding` `origin:"forge-default"` ; le kit devient
  standalone-runnable. UI : une étape entre « nœud choisi » et « Générer » (P4).
- **Cockpit — « Recentrage »** (instruction **Cockpit** dédiée) : **retirer la composition** (authoring/nommage) →
  monte dans la forge ; **garder** sélection d'un kit déployé + **override de Binding** (`origin:"cockpit-override"`)
  + pilotage. Retire `runner`/`model` de la **définition** de team (L11) → les déplace dans le Binding.

---

## 9. Mises à jour de specs incluses dans CE lot

- **`specs/contrat-concepts.md`** : ajout du concept **Binding** (§ 4 run-time devient « run-time & liaison »),
  **réécriture d'AR-1**, **table de répartition à 3 couches** (Team / Binding / Kit). *(Édité dans ce lot.)*
- **`specs/glossaire-concepts.md`** : entrée **Binding** + note « Team pure ≠ Kit lié ». *(Édité dans ce lot.)*

---

## 10. Questions d'arbitrage (prose)

- **Q-1 — Le Binding est-il stocké DANS le kit ou À CÔTÉ ?** *Reco : **à côté**, un artefact distinct* (ex.
  `binding.json` déployé aux côtés du kit, ou dans un sous-dossier) — préserve la séparation Team/Binding et permet
  de **rebinder sans régénérer**. Alternative « dans le kit » (modèle inline dans les fichiers générés) = plus
  autonome mais **mêle** définition et liaison → moins overridable. → *Trancher.*
- **Q-2 — Un Binding par nœud, ou un par (team, nœud) ?** *Reco : **par (team, nœud)*** — un même team déployée sur
  deux nœuds a deux Bindings ; le champ `node` + `teamId` du schéma (§ 3) le porte. → *Confirmer.*
- **Q-3 — Politique de Binding par défaut, par nœud.** Que met la forge par défaut ? *Reco : Claude Code → **pas de
  modèle** (défaut runner) ; Ollama → **un modèle local suggéré par rôle** (table indicative, ex. cadrage→
  raisonnement, dev→coder) que l'utilisateur **confirme** ; Codex/Open WebUI → **choix requis** avant déploiement
  standalone.* → *Confirmer la source de la table de suggestion (réutiliser `cible-ollama-modeles-agents.md` ?).*
- **Q-4 — Team pure et Kit lié : deux artefacts versionnés séparément ?** *Reco : **oui*** — la **Team** (définition)
  est versionnée dans la forge (source portable) ; le **Kit déployé + Binding** est un **produit** d'un
  environnement (peut être régénéré). Ne pas versionner le Kit comme s'il était la source. → *Confirmer.*
- **Q-5 — Override cockpit : persistant ou par session ?** *Reco : le Cockpit persiste son override
  (`origin:"cockpit-override"`) au niveau environnement, distinct du défaut forge* — mais c'est un **détail
  Cockpit** (instruction dédiée). → *Noter pour le recentrage.*
- **Q-6 — Le schéma Binding vit-il dans `@iakaframe/core` ?** *Reco : **oui*** (concept partagé forge↔cockpit, comme
  Team). → *Confirmer.*

> Tant que ce jalon n'est pas validé, **aucune** implémentation des lots aval (P7 forge / recentrage cockpit). Ce
> lot ne produit que du **cadrage + mises à jour de specs**.

---

## 11. Journal de décision

- **2026-07-07** — Le décideur (niveau portefeuille) tranche : un **kit déployé doit être runnable en terminal nu,
  sans Cockpit** → **AR-1 révisé**. Introduction du **Binding** (concept de 1re classe) : `persona → runner+modèle`
  par nœud, couche **séparée/optionnelle**. Modèle **3 couches** : **Team pure** (forge, définition) + **Binding**
  (forge défaut / cockpit override) = **Kit exécutable**. Évolution **additive & rétro-compatible** (sans Binding =
  comportement P1–P6 actuel ; avec Binding = émission conditionnelle du modèle par les adaptateurs). Tests « zéro
  modèle » **ancrés au niveau Team**, pas Kit. Lots aval nommés : **Forge P7** (liaison au déploiement),
  **recentrage Cockpit** (override + pilotage). Arbitrages Q-1→Q-6. **Cadrage seul, aucun code.**
