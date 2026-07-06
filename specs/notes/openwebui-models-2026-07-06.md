# Note d'étape 0 — forme d'un Model Open WebUI (P3c)

> Provenance in-repo (sans web). Vérification de la forme réutilisée pour l'adaptateur
> `openwebui`. Aucune doc externe — tout est confirmé depuis le dépôt `iakaframe`.

## Gabarits de référence
`~/work/iakaframe/kit-openwebui/models/*.json` (8 fichiers : aragorn, gandalf, gimli, helm,
legolas, loki, nathalie, odin). Un Model = **un objet JSON** avec les champs :
`id`, `base_model_id`, `name`, `params.system`, `meta.{profile_image_url, description,
capabilities, suggestion_prompts, tags}`, `access_control`, `is_active`, `created_at`,
`updated_at`.

## Ce qui est réutilisé
- **Structure JSON** des gabarits (forme d'un Model importable *Workspace > Models*).
- **Texte d'identité** : `~/work/iakaframe/kit-openwebui/AGENTS.md` § Identité (badges, position
  ouverture/clôture, START/STOP bannis, chaîne de badges, verbatim/anti-ventriloquie) — déjà
  source de `GuardrailRendering.prose` en P3b. **Aucune réécriture** : l'adaptateur injecte
  `guardrail("identity").rendering.prose` et `guardrail("perimeter").rendering.prose` verbatim
  dans `params.system`.

## Décisions appliquées (jalon validé, Q-1→Q-5)
- **Q-1** : `base_model_id = ""` (vide) + placeholder documenté dans `meta.description`
  (« régler le modèle de base à l'import »). **Jamais** de vrai tag de modèle, **aucun**
  paramètre d'inférence (`temperature`/`num_ctx`…). Seul `params.system` est peuplé. (AR-1 : la
  forge ne pose PAS de modèle.)
- **Q-2** : `KitFormat.openwebui-models` **dédié** (N Models JSON ≠ 1 markdown ≠ arbo `.claude/`).
- **Q-3 — parité CLI** : le CLI `@naonedge/iakaframe` tient bien un **miroir** de `NodeKind`/
  `KitFormat` dans `~/work/iakaframe/cli/src/lib/vocab.js`, vérifié par
  `~/work/iakaframe/cli/test/vocab-parity.test.js` (le test lit la source de vérité
  `iakaFrameGUI/packages/core/src/vocab.json`). **Ce lot est borné à iakaFrameGUI seulement** —
  le miroir CLI vit dans un **dépôt voisin** (`iakaframe`) hors périmètre. → **SIGNALÉ** : ajouter
  `openwebui` / `openwebui-models` au miroir CLI (+ vert du test de parité) doit faire l'objet
  d'un **lot compagnon sur le dépôt `iakaframe`** (à répartir par la coordination). Tant que ce
  lot n'est pas fait, le test de parité (exécuté depuis le dépôt `iakaframe`) échouera ; les tests
  d'iakaFrameGUI, eux, restent verts.
- **Q-4** : **pas de `.mcp.json`** pour Open WebUI (pas de MCP natif ; connecteurs ignorés pour ce
  nœud, notés en prose dans `meta.description`).
- **Q-5** : `meta` **minimal** — `description` + `capabilities` (neutres : `vision` seulement pour
  le rôle graphisme, `usage:false`, `citations:false`) + `tags: [{ name: methodId }]`. **Pas** de
  `suggestion_prompts`, **pas** de `profile_image_url` (différés).

## Détail de forme — Model généré
`generate(team) → { files: { "models/<personaId>.json": <Model> } }`, un par persona,
personas triées par `roleIndex` puis `id` (déterminisme), `created_at = updated_at = 1750000000`
(constante, comme les gabarits). `contractFileByFormat` **ne mappe pas** `openwebui-models` :
ce format n'a **pas** de fichier-contrat unique (N JSON) ; `contractFileForNode("openwebui")`
retombe sur le défaut (`AGENTS.md`), **jamais utilisé** dans le flux de déploiement.

## Base model vide à l'import
Reco du cadrage : `base_model_id:""` accepté par Open WebUI (le base model se choisit à l'écran
d'édition du Model). Repli documenté si refus : placeholder non-modèle. **Non vérifié en runtime
ici** (étape 0 in-repo, sans instance Open WebUI) — à confirmer par le décideur au premier import.
