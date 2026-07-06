# Note étape 0 (P3b) — gabarits `AGENTS.md` réutilisés (in-repo, sans web)

> Traçabilité de l'étape 0 de `specs/instructions/P3b-adaptateurs-codex-ollama.md`.
> Le format `AGENTS.md` est **vérifiable dans le dépôt** — aucune doc externe. On s'appuie sur
> les kits **déjà écrits et éprouvés** de `C:\work\iakaframe` (ici montés sous
> `/Users/sjupin/work/iakaframe/`).

## Gabarits lus et ce qui est réutilisé

| Gabarit (in-repo) | Ce qu'on réutilise | Ce qu'on **ne** reprend **pas** |
|---|---|---|
| `iakaframe/kit-codex/AGENTS.md` | Ossature d'un contrat Codex : en-tête « incarnation Codex », « Ce qu'est iakaframe », roster/personas par rôle, 3 phases + gates, « cadrage avant code », § Identité comportementale (`:78-94`), conventions, structure projet. | **Table modèle↔agent** (`:33-50`) + renvois `MODELES.md` (invariant AR-1 : le modèle est run-time/Cockpit). |
| `iakaframe/kit-ollama/AGENTS.md` | Variante **local/Ollama** : bloc **Pré-requis** avec l'endpoint `http://<host>:11434`, « un rôle à la fois », § Identité (`:60-79`). | Table « modèle local conseillé » (`:29-40`) + `MODELES.md`. |
| `iakaframe/kit-openwebui/AGENTS.md` | **Référence du rituel embarqué** (`:47-80`) : « pas de hook garde → rituel **comportemental** porté par le contrat », position de pastille ouverture/clôture (3.4), chaîne de badges sans interjection (3.5), verbatim/anti-ventriloquie (3.6). **C'est la source de la prose d'identité générée.** | (Le conteneur Models JSON `models/<persona>.json` = Open WebUI, **HORS lot** — P3c.) |

## Constat clé

Les trois kits **portent déjà** le rituel en prose et **assument l'absence de hook**
(`kit-openwebui/AGENTS.md:47-52`, `kit-codex/AGENTS.md:94`, `kit-ollama/AGENTS.md:79` : « Les
kits n'ont pas de hook garde → cette règle est purement **comportementale** »). P3b **ne
réinvente pas** ce texte : il le **génère depuis le modèle de gardes** (`guardrail.ts`, rendu
`prose`) au lieu de le figer à la main.

## Décisions d'arbitrage appliquées (jalon validé par le décideur)

- **Q-1** : Open WebUI = **HORS lot** (P3c). Non implémenté ici.
- **Q-2** : garde à **deux rendus** dans le cœur — `GuardrailRendering { hook?, prose? }`. Une
  intention, deux rendus ; l'adaptateur choisit (`hook` pour Claude Code, `prose` pour
  codex/ollama). L'adaptateur Claude Code P3 **n'est pas modifié** (il continue d'utiliser le
  câblage `hook` de `adapters/guards.ts`).
- **Q-3** : **jamais** de table modèle↔rôle ni de modèle dans le généré (invariant AR-1). Le
  « modèle conseillé » des gabarits historiques n'est **pas** repris.
- **Q-4 (inflexion du décideur)** : le `.mcp.json` est généré pour **tous** les nœuds
  (codex/ollama compris) dès qu'une team déclare ≥ 1 connecteur, au **format MCP standard**
  (comme Claude Code). Pas de ciblage des formats propres des outils agentiques pour l'instant
  (évolution future).
- **Q-5** : le **host LAN** est un **champ de nœud paramétrable** (`KitGenOptions.lanHost`) ;
  à défaut, l'`AGENTS.md` porte le **placeholder documenté** `<host-lan>`.

## Où c'est implémenté

- `packages/core/src/guardrail.ts` — `GuardrailRendering` + catalogue enrichi (prose fidèle).
- `packages/core/src/adapters/agentsMd.ts` — builder `AGENTS.md` mutualisé (DRY) + specifics par
  nœud (codex / ollama-localhost / ollama-lan) + adaptateurs purs.
- `packages/core/src/adapters/mcp.ts` — rendu `.mcp.json` standard partagé (Q-4).
- `packages/core/src/adapters/registry.ts` — 4 nœuds `implemented: true`.
- Déploiement : **forge Rust `kit_deploy` INCHANGÉ** (passe-plat content-agnostic ; `AGENTS.md`
  est un simple chemin relatif de plus).
