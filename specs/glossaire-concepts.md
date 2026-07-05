# Glossaire de concepts étendu — iakaframe (cœur partagé)

> **Livrable P0 — fondation.** Source de vérité des **libellés de concepts** du cœur partagé (forge · cockpit ·
> CLI). Chaque concept : **libellé canonique** + **définition d'une ligne** + **niveau** + **MVP/différé**.
> **Statut : VALIDÉ** (jalon du 2026-07-05).
>
> **Articulation.** Ce glossaire traite les **concepts**. Les **rôles** (leurs libellés canoniques et leurs noms
> de code internes) sont définis **ailleurs** et **ne sont pas dupliqués ici** : voir
> **`iakaframe/specs/glossaire-iakaframe.md`** (source de vérité des rôles). Modèle formel des concepts :
> **`specs/contrat-concepts.md`**. Décisions : **`specs/instructions/cadrage-iakaframegui-et-moteur.md` § 7**.
>
> **Niveaux.** 🟦 cœur partagé · 🟧 forge (build-time) · 🟩 cockpit (run-time).
> **Règle de doc.** En documentation, un intervenant se désigne par son **rôle** (libellé canonique du glossaire
> des rôles), **jamais** par un nom de code interne.

---

## 1. Concepts du cœur partagé 🟦

| Concept | Libellé canonique | Définition (une ligne) | MVP |
|---|---|---|---|
| Méthode | **la méthode** | La discipline de travail (phases, gates, cycle d'instruction, identité) ; iakaframe en est une instance — le cœur en est agnostique. | [MVP] iakaframe seule |
| Rôle | **le rôle** | La fonction d'un intervenant (les 7 rôles canoniques : cf. glossaire des rôles), distincte du nom. | [MVP] |
| Skill | **la skill** | La méthode outillée d'un rôle (le « comment » ), identifiée `iakaframe-*`. | [MVP] attribution |
| Tool / Permission | **l'outil / la permission** | Un outil mobilisable et sa règle allow/ask/deny par patterns ; le mode actif est run-time. | [MVP] déclaration |
| Garde-fou | **le garde-fou** | Contrainte exécutée qui fait respecter la discipline (identité, périmètre, délégation, permissions) — concept universel, mécanisme propre au nœud. | [MVP] identité/périmètre |
| Connecteur (MCP) | **le connecteur** | Source d'outils/ressources externes (serveur MCP) attachable à une team. | [MVP] déclaration |
| Team | **la team** | Roster de personas + coordinateur + casting ; objet de 1er rang, **pure** (sans runner/modèle). | [MVP] |
| Kit (format) | **le kit** | Le paquet de fichiers déployables d'une team pour une solution cible (le kit EST le déployable). | [MVP] Claude Code |

## 2. Concepts de la forge 🟧 (build-time)

| Concept | Libellé canonique | Définition (une ligne) | MVP |
|---|---|---|---|
| Persona | **la persona** | L'incarnation **nommée** d'un rôle (nom + royaume + roleIndex + skills + gardes) ; **nommage libre**. | [MVP] |
| Nommage | **le nommage** | Choisir/éditer librement le nom d'une persona ; le roster canonique sert de gabarit de départ. | [MVP] |
| Workflow | **le workflow** | Enchaînement de rôles/phases/gates pour un type de travail. | [différé P3] |
| Nœud d'exécution | **le nœud** | Destination d'un déploiement : `claude`, `codex`, `ollama-localhost`, `ollama-lan` (localhost ≠ lan). | [MVP] `claude` ; reste différé |
| Adaptateur de runner | **l'adaptateur de runner** | Traduit le cœur → surface concrète d'un nœud (les fichiers/gardes à écrire) = cœur de la génération de kits. | [MVP] Claude Code |
| Adaptateur de méthode | **l'adaptateur de méthode** | Importe une méthode étrangère (BMAD, MetaGPT, SPARC…) dans le cœur agnostique. | [différé P∞] |

## 3. Concepts du cockpit 🟩 (run-time)

| Concept | Libellé canonique | Définition (une ligne) | Portée |
|---|---|---|---|
| Runner | **le runner** | Harnais d'exécution d'une persona (`claude-code`, `codex`, `ollama`, `litellm`…) ; jamais un fichier. | hors forge |
| Modèle | **le modèle** | Modèle LLM affecté à une persona à l'exécution. | hors forge |
| Liaison | **la liaison** | Surcouche cockpit `persona → (runner, modèle)` posée au run-time — **là** vivent runner+modèle (pas dans la team). | hors forge |

---

## 4. Distinctions à ne jamais confondre

- **Rôle ≠ Persona.** Le rôle est la **fonction** (coordination…) ; la persona est l'**incarnation nommée** de ce
  rôle. Un rôle, plusieurs personas possibles.
- **Nœud ≠ Runner.** Le **nœud** est une **destination de déploiement** (forge, ex. `claude`) ; le **runner** est
  un **harnais d'exécution** (cockpit, ex. `claude-code`). Noms voisins, niveaux différents.
- **Team pure ≠ Team liée.** La **team forgée** ne porte pas runner/modèle (AR-1) ; c'est la **liaison** cockpit
  qui les ajoute au run-time.
- **Garde-fou (intention) ≠ hook (mécanisme).** Le cœur porte l'**intention** de garde ; l'adaptateur de runner
  la traduit en **hook/permission** propre au nœud. Le **canal d'identité** est un garde-fou : il se **génère**,
  il ne se remplace jamais.
- **Déployable ≠ run-time.** Un **fichier écrit** (subagent, skill, hook, `.mcp.json`) = forge ; un **état actif**
  (modèle/runner actif, mode permission courant, exécution du hook) = cockpit.
- **Agent → Persona (v0.4.0).** Le terme **« agent »** comme concept est remplacé par **« persona »** ; « agent »
  ne subsiste que (a) comme **forme d'implémentation** d'un nœud (subagent Claude Code) et (b) dans le **canal
  d'identité** où le mot est conservé tel quel.

---

## 5. Renvois

- **Rôles (source de vérité)** : `iakaframe/specs/glossaire-iakaframe.md`.
- **Modèle formel des concepts** : `specs/contrat-concepts.md`.
- **Décisions (AR-1→AR-9)** : `specs/instructions/cadrage-iakaframegui-et-moteur.md` § 7.
- **Doc chapeau v0.4.0** (agnosticisme, kits par solution, agent→persona) : artefact méthode iakaframe.
