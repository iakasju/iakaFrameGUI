# PROJET — iakaFrameGUI (la FORGE de la méthode)

> **VERSION VALIDÉE — jalon du 2026-07-05 (décideur).** Vision gravée + 9 décisions actées.
> Instruction fondatrice : `specs/instructions/cadrage-iakaframegui-et-moteur.md`.
> Modèle formel : `specs/contrat-concepts.md` · Glossaire : `specs/glossaire-concepts.md`.
> Espace de réflexion/cadrage — aucun code n'est écrit ici.

---

## Vision

**iakaFrameGUI est la forge de la méthode iakaframe** (build-time) : on y **configure, édite, assemble,
package et déploie** les méthodes, skills, **personas** (dont leur **nommage**), gardes-fous, connecteurs et
workflows. On assemble les personas en **teams**, puis on **déploie** ces teams — sous forme de **kits par
solution** — vers des **plateformes / nœuds d'exécution** cibles : `claude`, `codex`, `ollama-localhost`,
`ollama-lan`…

Frontière (validée le 2026-07-05) : **iakaFrameGUI FABRIQUE et DÉPLOIE ; IakaCockpit SÉLECTIONNE, LIE
(runner+modèle par persona) et PILOTE** les sessions. La forge **ne possède pas** le couple runner+modèle par
persona : c'est un concept **run-time**, propriété du Cockpit.

## Frontière forge / cockpit (le pipeline)

```
  FORGE (build-time) ─ FABRIQUE / PACKAGE / DÉPLOIE ─►  nœuds cibles ─►  PILOTAGE (run-time)
  personas (nommage) · teams · gardes · connecteurs        claude          sélectionne la team
  → kits par solution → adaptateur de runner               codex           affecte runner+modèle
                                                       ollama-localhost     exécute les sessions
                                                        ollama-lan
```

**On FABRIQUE/DÉPLOIE dans la forge → on SÉLECTIONNE/LIE/PILOTE dans le cockpit.**

## Les deux axes d'adaptateurs (nord de l'architecture)

- **Adaptateur de RUNNER** : traduit le cœur de concepts → surface concrète d'un nœud. C'est le cœur de la
  **génération de kits**. Premier de référence : **Claude Code** (subagents, skills, hooks/permissions = gardes,
  settings, MCP, plugins — cf. `contrat-concepts.md`). Puis Codex, Ollama, Open WebUI (différés).
- **Adaptateur de MÉTHODE** *(north-star, post-MVP)* : importer d'autres méthodes (BMAD, MetaGPT, SPARC…). Aucun
  code au MVP ; seule la **contrainte d'agnosticisme de méthode** du cœur est honorée dès maintenant.

## Décisions actées au jalon (2026-07-05)

| # | Décision |
|---|---|
| AR-1 | Team forgée **PURE** (persona + rôle + skills) ; **runner + modèle = run-time, côté Cockpit**. |
| AR-2 | CLI : **refactor en strates** (garder la plomberie testée ; réaligner le vocabulaire). |
| AR-3 | **Package TS** (cœur) **+ CLI en sidecar Tauri** ; pas de rewrite Rust au MVP. |
| AR-4 | Nœuds `ollama-localhost` / `ollama-lan` **de 1er rang** (avec `claude`, `codex`). |
| AR-5 | **Nommage de persona libre**, roster canonique comme **gabarit de départ**. |
| AR-6 | **MVP resserré** : éditer/assembler personas + teams, déployer sur **UN nœud (Claude Code)**. |
| AR-7 | **Tauri (React+Rust)** + isolation Docker/ports **`iakaframegui-*`**. |
| AR-8 | **Garde-fou & Connecteur (MCP)** = concepts de **1re classe** du cœur. |
| AR-9 | **Agnosticisme de méthode** gravé dès le cœur (modélisation seule, zéro code d'import au MVP). |

## Objectifs

- Rendre l'**authoring** de la méthode visuel et éditable : personas nommées, teams composées, skills, gardes.
- **Packager** une team en kit et la **déployer** vers un nœud cible (Claude Code au MVP).
- **Réutiliser** la plomberie du CLI `@naonedge/iakaframe` (Forgejo, état des lieux, jalons) sans la réécrire.
- Extraire un **cœur de concepts partagé** (package TS) commun à la forge, au Cockpit et au CLI — **agnostique de
  méthode** par construction.

## Périmètre

**Dans le scope (MVP / P1) :**
- Coquille **Tauri (React + Rust)** calquée sur le Cockpit (gardes : façade unique d'`invoke`, CSP stricte jamais
  null, secrets keychain, SQLite non sensible).
- **Authoring persona** : nommage **libre** + rôle (parmi les 7 canoniques) + royaume + `roleIndex` + skills ;
  roster canonique comme gabarit de départ.
- **Composition de team** : roster de personas **pur** (sans runner/modèle) + coordinateur + casting.
- **Déploiement sur UN nœud (Claude Code)** via le CLI existant invoqué en **sidecar** — génération/pose du kit
  `.claude/` (subagents, skills, gardes = hooks/permissions).

**Hors scope (différé, tracé) :**
- Refactor du CLI (vocabulaire agent→persona, runner unifié, nœuds) → P2.
- **Multi-nœuds** (codex, ollama-localhost/lan), **génération de kit multi-cible**, **workflows** → P3.
- **Adaptateur de méthode** (import BMAD/MetaGPT/SPARC) → post-MVP (P∞) ; seule l'agnosticisme du cœur dès P0/P2.
- **Runner + modèle** : hors forge (restent au Cockpit). La forge peut au plus **suggérer** une table modèle↔rôle.
- **Recentrage du `TeamsEditor` du Cockpit** (authoring→forge) : instruction Cockpit dédiée, ultérieure.

---

## Stack technique — décision (validée, AR-7)

| Couche | Choix | Raison |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Aligné Cockpit ; cœur de concepts TS partageable |
| Backend | Tauri 2 / Rust (mince) | Déploiement = commandes locales (git, ssh, ollama) ; parité Cockpit |
| Données | SQLite non sensible + keychain (secrets) | Socle éprouvé du Cockpit |
| Cœur de concepts | Package **TS** partagé (AR-3) | Partagé forge + Cockpit + CLI, sans rewrite Rust |
| Moteur méthode | CLI `@naonedge/iakaframe` en **sidecar** | Réutiliser la plomberie testée (Forgejo, état, jalons) |
| Isolation | ports + stack Docker propres `iakaframegui-*` | Convention : pas de collision avec le Cockpit |

> Self-hosted / open-source d'abord ; réutiliser l'existant avant de réimplémenter.

---

## Architecture (esquisse validée)

```
  Forge (build-time)          Cœur partagé (AGNOSTIQUE de méthode)     Cockpit (run-time)
  authoring/packaging  ─────►  Team(PURE) · Persona · Rôle · Skill ◄───  sélection + runner/modèle
        │                      Garde-fou · Connecteur(MCP) · Kit · Nœud        │
        │                                    │
        │            Adaptateur de RUNNER (Claude Code d'abord : subagents,
        │            skills, hooks/permissions=gardes, settings, MCP, plugins)
        └── invoque ──► CLI @naonedge/iakaframe (plomberie : Forgejo, état des lieux, jalons)
                             │
                             └── déploie ──► nœud MVP : claude   |   différés : codex · ollama-localhost/lan

  North-star (post-MVP) : Adaptateur de MÉTHODE — importer BMAD / MetaGPT / SPARC…
```

---

## Sources de données / dépendances externes

| Besoin | Source | Stratégie en dev |
|---|---|---|
| Plomberie méthode (structure, Forgejo, état, jalons) | CLI `@naonedge/iakaframe` (sidecar) | invoquer le binaire réel ; mock des sorties en test |
| Modèle Team/Persona/Rôle mûr | `IakaCockpit/src/{theme/roles.ts,hooks/useTeams.ts}` | promu en graine du cœur partagé |
| Surface Claude Code (adaptateur runner) | `code.claude.com/docs` | inventaire durci en référence ; **chiffres/versions à revérifier avant câblage dur** |

---

## Backlog des features

Chaque feature reçoit son instruction dans `specs/instructions/` AVANT implémentation.

| Feature | Instruction | État |
|---|---|---|
| Cadrage forge + audit moteur CLI | `specs/instructions/cadrage-iakaframegui-et-moteur.md` | **validé (jalon)** |
| P0 — Contrat de concepts | `specs/contrat-concepts.md` | **livré (P0)** |
| P0 — Glossaire de concepts étendu | `specs/glossaire-concepts.md` | **livré (P0)** |
| P1 — Coquille forge + authoring persona/team | à écrire (développeur-devops) | prochaine étape |

---

## Décisions structurantes (journal)

- **2026-07-05** — Frontière forge/cockpit gravée (build-time vs run-time ; nommage à la forge ; runner+modèle au
  cockpit). Audit du moteur CLI livré (reco : refactor en strates + cœur partagé). Arbitrages AR-1→AR-9 ouverts.
- **2026-07-05** — Enrichissement : Garde-fou & Connecteur (MCP) au 1er rang ; deux axes d'adaptateurs (runner /
  méthode) ; cœur agnostique de méthode. AR-8/AR-9 ajoutés.
- **2026-07-05** — **JALON VALIDÉ** : AR-1→AR-9 tranchés (voir tableau ci-dessus). Descente en P0 : PROJET.md
  validé + contrat de concepts + glossaire étendu. P1 (coquille + authoring) confié au développeur-devops ensuite.
