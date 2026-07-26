/**
 * guardrail.ts — le **garde-fou** (concept de 1re classe, AR-8) — cœur partagé 🟦.
 *
 * Contrat § 2.5 : une contrainte exécutée qui fait respecter la discipline (canal
 * d'identité, garde de périmètre, délégation, permissions). En P1, le cœur ne portait que
 * l'**intention** (id + kind). P3 a câblé le rendu **hook** (Claude Code). **P3b** ajoute le
 * point structurant : **une intention, DEUX rendus**. Les nœuds à hooks (`claude`) rendent la
 * garde en **hooks + scripts** ; les nœuds **sans hooks** (`codex`, `ollama-*`) ne peuvent pas
 * câbler de mécanisme → la garde est **embarquée en TEXTE comportemental** dans `AGENTS.md`.
 *
 * Le garde-fou porte donc désormais un `rendering` à deux facettes optionnelles
 * (`hook` / `prose`) : l'adaptateur **choisit** la facette selon la famille de son nœud, **sans
 * dupliquer l'intention**. La `prose` du canal d'identité **reproduit fidèlement** les mêmes
 * règles que le hook (badge `[ROYAUME][Persona]`, position ouverture/clôture, START/STOP
 * bannis, chaîne de badges, verbatim/anti-ventriloquie) — texte issu de l'éprouvé
 * `iakaframe/kit-openwebui/AGENTS.md` (§ Identité), jamais dénaturé (invariant § 7).
 */

import type { FrontmatterPatch } from "./frontmatter";

/** Nature d'un garde-fou (intention, agnostique du nœud). */
export type GuardrailKind =
  | "identity"
  | "perimeter"
  | "delegation"
  | "permission"
  | "custom";

/** Portée d'application d'un garde-fou. */
export type GuardrailScope = "team" | "persona" | "role";

/**
 * **Deux rendus d'une même intention de garde** (P3b). L'adaptateur choisit selon la famille
 * du nœud : Claude Code lit `hook` (nœud à hooks, P3) ; codex/ollama lisent `prose` (nœud sans
 * hooks). **Au moins un** des deux est présent pour une garde canonique rendue.
 */
export interface GuardrailRendering {
  /**
   * Rendu **HOOK** (nœud à hooks) : descripteur du câblage principal (évènement + matcher +
   * script). Résumé de premier plan — le câblage COMPLET (identité = 3 évènements) reste porté
   * par `adapters/guards.ts` (source de vérité de la génération Claude Code, inchangée en P3b).
   */
  hook?: { event: string; matcher?: string; script: string };
  /**
   * Rendu **TEXTE** (nœud sans hooks) : prose comportementale injectée telle quelle dans une
   * section de l'`AGENTS.md`. Reproduit fidèlement les règles de la garde.
   */
  prose?: { heading: string; body: string };
}

/** Déclaration d'un garde-fou (intention + rendus disponibles, P3b). */
export interface Guardrail {
  /** Id stable du garde-fou (ex. "identity-guard"). */
  id: string;
  /** Nature de la contrainte. */
  kind: GuardrailKind;
  /** Libellé lisible (menu d'attribution). */
  label: string;
  /** Portée par défaut (indicatif au MVP). */
  scope: GuardrailScope;
  /** Rendus disponibles (au moins un). Les gardes de méthode fournissent `hook` **et** `prose`. */
  rendering: GuardrailRendering;
  /**
   * Politique (prose de la garde) — **champ de fichier réel** de l'atome disque, porté ici pour être
   * **éditable** (chantier #4 Lot B). **Optionnel et additif** : absent du catalogue synthétique
   * `CATALOG_GUARDRAILS` (repli d'affichage), peuplé par `atomToRich` depuis le `.md` réel. Aucune
   * signature existante n'est modifiée ; les consommateurs historiques l'ignorent.
   */
  policy?: string;
}

/**
 * Prose du **canal d'identité** — rituel comportemental (nœud sans hooks). Reproduit
 * fidèlement les règles du hook `identity-guard.mjs` (badge, position ouverture/clôture,
 * START/STOP bannis) et de `iakaframe/kit-openwebui/AGENTS.md` § Identité (chaîne de badges,
 * verbatim/anti-ventriloquie). Texte éprouvé — **jamais dénaturé** (invariant § 7).
 */
const IDENTITY_PROSE_BODY = `> Ce nœud n'offre **pas de hook garde d'identité** : le rituel ci-dessous est **purement
> comportemental**, porté par le contrat, appliqué par chaque persona à chaque prise de parole.
> Aucun watcher ne le vérifie — la discipline est humaine et contractuelle.

Badge \`<pastille> [ROYAUME][Persona]\` sur **toute** prise de parole adressée au décideur (toute
réponse, même un simple compte rendu) — \`ROYAUME\` = nom du projet en **MAJUSCULE** (sauf le rôle
portefeuille : \`PORTEFEUILLE\`) ; **pastille = la phase** : 🔵 cadrage · 🔴 dev · 🟢 staging ·
🟣 prod · 🟡 portefeuille · 🟠 transverse. **Jamais** sur les logs ni les traces de réflexion ;
seulement les messages destinés au décideur.

**La POSITION de la pastille porte le sens** (jamais un mot-clé) :
- pastille **AVANT** le bloc = **ouverture** : \`<pastille> [ROYAUME][Persona] — <annonce de ce que tu vas faire>\` (première ligne) ;
- pastille **APRÈS** le bloc = **clôture** : \`<texte final> [ROYAUME][Persona] <pastille>\` (dernière ligne, **rien après la pastille**).

Les mots « START » / « STOP » (et toutes leurs variantes) sont **bannis** des badges et messages :
redondants avec la position. (Ils n'apparaissent ici que pour être explicitement proscrits.)

**Chaîne de badges sans interjection** (orchestrateurs — rôles portefeuille / coordination) :
délégation A→B : A ouvre + annonce qu'il délègue, A clôt, **immédiatement** B ouvre et parle à la
1ʳᵉ personne, B travaille puis clôt, **ensuite seulement** A rouvre. Entre l'ouverture et la
clôture de B, A ne place **aucune phrase dans sa voix**. Sans dispatch natif, la chaîne est
**narrative** (le décideur change de persona, ou l'orchestrateur cite) — jamais un vrai routage.

**Restitution verbatim / anti-ventriloquie** : toute restitution du travail d'un persona se fait
**sous le badge de l'agent émetteur**, **citée VERBATIM** ; on n'écrit **jamais** le badge d'un
persona pour lui faire dire des mots qu'il n'a pas produits. Toute reformulation/synthèse est la
voix de l'orchestrateur, sous **son** badge.`;

/** Prose de la **garde de périmètre** — comportementale (nœud sans hooks). */
const PERIMETER_PROSE_BODY = `Chaque persona **tient son périmètre** et ne déborde pas : pas de « tant qu'on y est » hors de
l'instruction en cours. On ne juge pas sa propre qualité, on ne s'auto-valide pas : la revue
(rôle tests) est une **passe distincte**. En cas de doute sur le périmètre d'une tâche, on
**remonte à la coordination / au cadrage** plutôt que d'improviser une extension de portée.

Avant toute action vraiment destructive (hors garde-fous automatiques), **demander confirmation
par message** avant d'agir. Jamais de \`git reset --hard\` ni de \`push --force\` côté agent.`;

/** Prose de la **garde de délégation** — comportementale (nœud sans hooks). */
const DELEGATION_PROSE_BODY = `La délégation est réservée aux **orchestrateurs** (rôles portefeuille / coordination). Un
orchestrateur ne fait pas le travail à la place du persona délégué : il **annonce** la délégation,
laisse le persona incarner son rôle à la 1ʳᵉ personne, puis **restitue** son travail verbatim sous
le badge de l'émetteur (cf. rituel d'identité). Sur un nœud sans dispatch natif, la délégation est
**narrative** : on change de persona, on ne route pas automatiquement.`;

/**
 * Catalogue des gardes de méthode connues (référence les hooks existants du dépôt **et** la
 * prose comportementale P3b). Chaque garde canonique porte **les deux rendus** (`hook` +
 * `prose`) : l'adaptateur choisit selon la famille de son nœud. Le descripteur `hook` résume
 * le câblage principal (câblage complet = `adapters/guards.ts`, inchangé).
 */
export const CATALOG_GUARDRAILS: readonly Guardrail[] = [
  {
    id: "identity-guard",
    kind: "identity",
    label: "Canal d'identité (badges/pastilles)",
    scope: "persona",
    rendering: {
      hook: { event: "Stop", matcher: "*", script: "identity-guard.mjs" },
      prose: {
        heading: "Identité — rituel comportemental (pas de hook garde sur ce nœud)",
        body: IDENTITY_PROSE_BODY,
      },
    },
  },
  {
    id: "perimeter-guard",
    kind: "perimeter",
    label: "Garde de périmètre",
    scope: "persona",
    rendering: {
      hook: {
        event: "PreToolUse",
        matcher: "Edit|Write|Bash|NotebookEdit",
        script: "perimeter-guard.mjs",
      },
      prose: {
        heading: "Périmètre — garde comportementale",
        body: PERIMETER_PROSE_BODY,
      },
    },
  },
  {
    id: "delegation-guard",
    kind: "delegation",
    label: "Garde de délégation",
    scope: "team",
    rendering: {
      hook: { event: "PreToolUse", matcher: "Task", script: "delegation-guard.mjs" },
      prose: {
        heading: "Délégation — canal des gestes (comportemental)",
        body: DELEGATION_PROSE_BODY,
      },
    },
  },
] as const;

/** Garde canonique par nature (accès direct au rendu, ex. `guardrailByKind("identity")`). */
export function guardrailByKind(kind: GuardrailKind): Guardrail | undefined {
  return CATALOG_GUARDRAILS.find((g) => g.kind === kind);
}

/** Ids de gardes connues (ordre du catalogue). */
export const CATALOG_GUARDRAIL_IDS: readonly string[] = CATALOG_GUARDRAILS.map(
  (g) => g.id,
);

// ---------------------------------------------------------------------------
// Lot 5c — persistance du pool `guardrails`. ADDITIONS PURES (type d'atome distinct du
// `Guardrail` riche P3b ci-dessus, qui porte `scope`/`rendering` — incompatible avec la forme
// disque, d'où un type dédié plutôt qu'une modification de signature existante).
// ---------------------------------------------------------------------------

/**
 * L'atome de garde-fou **réel** du disque (`library/guardrails/<id>.md`), forme **PLATE** mesurée
 * au canon : `{ id, label, kind, hook, policy }`. **PAS** de `rendering {hook, prose}` (vue mentale
 * du modèle riche, absente du disque). `kind` + `hook` + `policy` sont **load-bearing** (spec de
 * branchement + enum couplés au code des hooks) : préservés verbatim (hors patch). Identité = `id`.
 */
export interface GuardrailAtom {
  /** Id stable (== nom de fichier) — **identité (C-1)**. */
  id: string;
  /** Libellé lisible — seul champ éditable au MVP. */
  label: string;
  /** Nature (enum lié à l'implémentation des hooks) — préservé verbatim. */
  kind: string;
  /** Spec de branchement (ex. "Stop;SubagentStop;UserPromptSubmit") — load-bearing, préservé verbatim. */
  hook: string;
  /** Politique (prose de la garde) — préservée verbatim (non éditable au MVP). */
  policy: string;
}

/**
 * Parse défensif d'UN atome garde-fou réel — Lot 5c, calqué sur `parsePrinciple`. `null` si pas
 * d'`id`. `label` repli sur `id` ; `kind`/`hook`/`policy` défensifs (`""` si absents). Jamais
 * d'exception.
 */
export function parseGuardrail(raw: unknown): GuardrailAtom | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const s = (v: unknown): string => (typeof v === "string" ? v : "");
  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const label = s(r.label).trim().length > 0 ? s(r.label).trim() : id;
  return { id, label, kind: s(r.kind), hook: s(r.hook), policy: s(r.policy) };
}

/**
 * **Patch de frontmatter** d'un garde-fou (Lot 5c, C-1 ; `policy` ajouté au chantier #4 Lot B).
 * Champs **éditables** modélisés : `label` et `policy` (scalaires). **Exclus** : `id` (verrou C-1) et
 * les champs **load-bearing** `kind` + `hook` (enum + spec de branchement couplés au code des hooks —
 * **verrouillés** à l'écran, jamais des contrôles fantômes), préservés verbatim par `patchFrontmatter`.
 * `policy` est **toujours** présent au patch, mais `patchFrontmatter` ne réécrit sa ligne que si la
 * valeur **change réellement** (sinon verbatim) : round-trip sans édition ⇒ document byte-identique
 * (AC3). Tous les gardes-fous réels du canon portent une ligne `policy:` (mesuré) — le patch la
 * **remplace**, jamais ne l'ajoute. **Addition pure** au cœur : aucune signature retirée, aucun octet
 * de fichier `.md` touché hors réécriture explicite (drift `vendor-check` 0 par construction).
 */
export function guardrailFrontmatterPatch(g: GuardrailAtom): FrontmatterPatch {
  return {
    label: { kind: "scalar", value: g.label },
    policy: { kind: "scalar", value: g.policy },
  };
}
