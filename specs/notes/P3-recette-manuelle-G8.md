# Recette manuelle G-8 — canal d'identité contre un vrai `.claude/`

> **Geste HUMAIN (headless), hors CI** — à recetter par le décideur, comme le smoke P1.
> Objectif : vérifier qu'un kit **généré** puis **déployé** est reconnu par un vrai Claude
> Code, et que le **canal d'identité** fonctionne (badge exigé).

## Pré-requis
- Claude Code installé.
- Un **projet jouet** vide (ex. `/tmp/kit-jouet/`).
- Une team forgée avec **au moins la garde `identity-guard`** attachée à une persona (sinon
  aucun hook n'est câblé — cf. G-3 : le roster canonique P1 a `guardrails: []` par défaut).

## Procédure
1. **Générer** le kit (pur, `@iakaframe/core`) :
   `generateClaudeCodeKit(team)` → `KitFileTree`.
2. **Déployer** via la forge (`kit_deploy(destDir, files, force=false)`), destDir =
   `/tmp/kit-jouet`. Vérifier la sortie : liste des chemins écrits.
3. **Contrôler l'arborescence** posée :
   - `/tmp/kit-jouet/.claude/agents/<persona>.md` (un par persona), **sans** clé `model:`.
   - `/tmp/kit-jouet/.claude/skills/<skill>/SKILL.md`.
   - `/tmp/kit-jouet/CLAUDE.md`.
   - `/tmp/kit-jouet/.claude/settings.json` (hooks `Stop`/`SubagentStop`/`UserPromptSubmit` +
     `PreToolUse`).
   - `/tmp/kit-jouet/.claude/hooks/identity-guard.mjs` (+ `identity-remind.mjs`, et selon les
     gardes `perimeter-guard.mjs`/`delegation-guard.mjs`).
4. **Ouvrir Claude Code** dans `/tmp/kit-jouet` :
   - les **subagents** apparaissent (`/agents`), les **skills** sont reconnues ;
   - déclencher une prise de parole d'agent → le **hook d'identité** exige la pastille
     `[ROYAUME][Nom]` (ouverture AVANT le bloc, clôture APRÈS) ; sans badge → blocage.
5. **Non-destructif** : relancer le déploiement sans `force` sur le même dossier → **refus**
   (message listant les conflits, rien réécrit). Avec `force=true` → écrasement.

## Attendu (PASS)
- Subagents/skills reconnus par Claude Code.
- Canal d'identité **actif** (badge exigé, position de la pastille respectée).
- Déploiement **idempotent-sûr** : jamais d'écrasement silencieux.

> Résultat de recette à consigner ici par le décideur : _(à remplir)_.
