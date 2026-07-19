/**
 * mock/copilote.ts — le **copilote d'authoring MOCKÉ, déterministe** (E2c §8, principe `mock-en-dev`).
 *
 * ⚠️ **AUCUN réseau, AUCUN vrai LLM** : le copilote réel est **[différé]** (§8/§11). Ce module ne
 * fait que **simuler** la boucle *intention → PROPOSITION d'artefacts → diff*. Il est **PUR** :
 * `propose(intention, context)` renvoie toujours la même `Proposition` pour la même entrée, sans
 * effet de bord. Il **ne matérialise rien** : la matérialisation (Valider) est portée par l'atelier
 * via ses **chemins d'insertion réels** (le `+` du rail) — le mock ne touche jamais la persistance.
 *
 * ⚠️ **FRONTIÈRE authoring ≠ exécution** : le runner d'authoring (build-time, ci-dessous) est
 * **distinct** du runner d'EXÉCUTION du Binding (run-time, cockpit). Le mock ne produit **jamais**
 * d'assignation de runner d'exécution (aucun `RunnerKind` par persona) — il ne touche pas au Binding.
 */

import {
  CATALOG_GUARDRAILS,
  CATALOG_PRINCIPLES,
  CATALOG_RITUALS,
  CATALOG_SCAFFOLDS,
  CATALOG_SKILLS,
  principleById,
  ritualById,
} from "@iakaframe/core";

// ---------------------------------------------------------------------------
// Runners d'AUTHORING (build-time) — distincts des `RunnerKind` d'exécution (run-time, Binding).
// ---------------------------------------------------------------------------

/** Runners d'authoring proposés (build-time, « m'assiste à concevoir »). NON persistés. */
export const AUTHORING_RUNNERS = [
  "claude-code (défaut · mock)",
  "ollama:qwen2.5-coder (mock)",
  "litellm:gpt-4o (mock)",
] as const;

export type AuthoringRunner = (typeof AUTHORING_RUNNERS)[number];

/**
 * **Pas de modèle d'authoring par défaut** (§ Volet B, ajustement décideur) : l'utilisateur DOIT
 * pointer un modèle dans les Réglages (`authoringModel`). Tant qu'aucun n'est réglé, le modèle est
 * **vide** — le copilote ne masque **jamais** l'absence par un défaut ; il la **signale** via ce
 * message clair (affiché dans le hint de la proposition et dans l'en-tête de la console).
 */
export const NO_AUTHORING_MODEL_HINT =
  "aucun modèle d'authoring configuré — pointez-en un dans les Réglages";

// ---------------------------------------------------------------------------
// Types de la boucle proposition → diff → matérialisation.
// ---------------------------------------------------------------------------

/** La surface éditée qui appelle le copilote (chaque atelier a son copilote, §8). */
export type CopiloteSurface = "team" | "methode" | "kit";

/**
 * Cible de matérialisation d'un artefact — **mappée** par l'atelier vers son **chemin d'insertion
 * réel** (le même que le `+` du rail). AUCUNE cible de runner d'EXÉCUTION ici (frontière §8).
 */
export type MaterializeTarget =
  | "persona-skill"
  | "persona-guardrail"
  | "method-principle"
  | "method-ritual"
  | "method-guardrail"
  | "method-scaffold"
  | "method-role"
  | "kit-binding";

/** Une opération de matérialisation : insérer l'`id` (issu d'un catalogue du cœur) dans la cible. */
export interface MaterializeOp {
  target: MaterializeTarget;
  /** Id canonique inséré (ex. "qualite", "identity-guard", "iakaframe-cadrage"). */
  id: string;
  /** Libellé lisible (feedback). */
  label: string;
}

/** Un artefact proposé (affichage : pastille de type + titre + détail). */
export interface ProposedArtefact {
  /** Classe d'icône réutilisant le CSS de la maquette (`skill`/`hook`/`prin`/`rit`/`bind`). */
  icon: "skill" | "hook" | "prin" | "rit" | "bind" | "scaf" | "role";
  /** Étiquette courte de la pastille (ex. "SKILL", "HOOK"). */
  tag: string;
  /** Titre de l'artefact. */
  title: string;
  /** Détail lisible (le « quoi »). */
  detail: string;
}

/** Une ligne de diff avant→après (mono, style git). */
export interface DiffLine {
  kind: "add" | "del" | "same";
  text: string;
}

/** La proposition rendue par le copilote mocké : artefacts + diff + ops de matérialisation. */
export interface Proposition {
  /** L'intention reçue, renvoyée telle quelle (bulle utilisateur). */
  intention: string;
  /**
   * Le **modèle d'authoring** ciblé (§ Volet B) — lu depuis `CopiloteContext.model` (Settings).
   * **Aucun défaut** : si aucun modèle n'est configuré, ce champ est la **chaîne vide** et l'absence
   * est signalée dans `hint` (jamais masquée par un modèle de repli). **L'inférence LLM live réelle
   * est [différée]** : ici aucun appel réseau — le modèle ne fait que **paramétrer** l'exécuteur mocké.
   */
  model: string;
  /** Phrase d'introduction du copilote (bulle assistant). */
  intro: string;
  /** Les artefacts proposés (le copilote peut en proposer plusieurs d'un coup). */
  artefacts: ProposedArtefact[];
  /** Le diff avant→après (calculé depuis `context.present`). */
  diff: DiffLine[];
  /** En-tête du diff (nom de fichier cible, ex. "methode.md · avant → après"). */
  diffFile: string;
  /** Les opérations à appliquer si l'humain **valide** (via le chemin d'insertion réel). */
  ops: MaterializeOp[];
  /** Message-garde affiché sous les boutons (« la forge n'écrit rien sans votre validation »). */
  hint: string;
}

/** Contexte fourni par l'atelier : sa surface + les ids déjà présents (pour le diff avant→après). */
export interface CopiloteContext {
  surface: CopiloteSurface;
  /** Ids déjà présents, par cible de matérialisation (pour distinguer add vs déjà-présent). */
  present: Partial<Record<MaterializeTarget, string[]>>;
  /** Nom de fichier cible pour l'en-tête du diff (ex. "gimli.md", "methode.md", "kit.json"). */
  diffFile?: string;
  /**
   * **Modèle d'authoring** configuré (§ Volet B, Settings `authoringModel`), UNIQUE et global (tous
   * les étages). Injecté par la console ; le mock le consomme. **Aucun défaut** : absent/vide →
   * l'absence est signalée (jamais un modèle de repli). NON persisté dans l'élément (build-time) et
   * sans rapport avec le runner d'EXÉCUTION du Binding.
   */
  model?: string;
}

// ---------------------------------------------------------------------------
// Normalisation (insensible casse + accents) pour la reconnaissance de mots-clés.
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

// ---------------------------------------------------------------------------
// Fabriques d'artefacts depuis les catalogues du cœur (déterministes).
// ---------------------------------------------------------------------------

function principleArtefact(id: string): ProposedArtefact {
  const p = principleById(id);
  return {
    icon: "prin",
    tag: "PRIN",
    title: p ? p.label : id,
    detail: p ? `politique : ${p.policy} · déclencheur : ${p.trigger}` : "principe hors catalogue",
  };
}

function ritualArtefact(id: string): ProposedArtefact {
  const r = ritualById(id);
  return {
    icon: "rit",
    tag: "RIT",
    title: r ? r.id : id,
    detail: r ? `${r.label} · côté ${r.side}` : "rituel hors catalogue",
  };
}

function guardrailArtefact(id: string): ProposedArtefact {
  const g = CATALOG_GUARDRAILS.find((x) => x.id === id);
  const hook = g?.rendering.hook;
  return {
    icon: "hook",
    tag: "HOOK",
    title: g ? g.id : id,
    detail: hook ? `${hook.event}${hook.matcher ? " · " + hook.matcher : ""} → ${hook.script}` : (g?.label ?? "garde hors catalogue"),
  };
}

function skillArtefact(id: string): ProposedArtefact {
  const s = CATALOG_SKILLS.find((x) => x.id === id);
  return {
    icon: "skill",
    tag: "SKILL",
    title: id,
    detail: s ? s.label : "skill hors catalogue",
  };
}

// ---------------------------------------------------------------------------
// Diff avant→après, calculé depuis les ids déjà présents pour la cible.
// ---------------------------------------------------------------------------

/** Étiquette de tableau lisible pour l'en-tête du diff, par cible. */
const ARRAY_LABEL: Record<MaterializeTarget, string> = {
  "persona-skill": "skills",
  "persona-guardrail": "guardrails",
  "method-principle": "principes",
  "method-ritual": "rituels",
  "method-guardrail": "gardes",
  "method-scaffold": "scaffolds",
  "method-role": "roles",
  "kit-binding": "binding",
};

/**
 * Diff avant→après, calculé LOCALEMENT depuis `ops` + `context.present`. **Exporté** (réutilisé par
 * le chemin d'authoring **live** : le diff n'est JAMAIS dicté par le LLM — même code, même confiance).
 * Reste PUR (aucun réseau, aucun effet de bord).
 */
export function buildDiff(ops: MaterializeOp[], context: CopiloteContext): DiffLine[] {
  const lines: DiffLine[] = [];
  // Regroupe les ops par cible pour un diff de tableau lisible (avant → après).
  const byTarget = new Map<MaterializeTarget, MaterializeOp[]>();
  for (const op of ops) {
    const arr = byTarget.get(op.target) ?? [];
    arr.push(op);
    byTarget.set(op.target, arr);
  }
  for (const [target, targetOps] of byTarget) {
    const before = context.present[target] ?? [];
    const added = targetOps.map((o) => o.id).filter((id) => !before.includes(id));
    const label = ARRAY_LABEL[target];
    if (added.length === 0) {
      // Idempotent : déjà présent, aucune écriture (honnête).
      lines.push({ kind: "same", text: `${label}: [${before.join(", ")}] (déjà présent — aucune écriture)` });
      continue;
    }
    lines.push({ kind: "del", text: `${label}: [${before.join(", ")}]` });
    lines.push({ kind: "add", text: `${label}: [${[...before, ...added].join(", ")}]` });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Le cœur du mock : `propose(intention, context)` — déterministe, ≥ 4 patterns + repli.
// ---------------------------------------------------------------------------

/**
 * Simule le copilote d'authoring : reconnaît des mots-clés de l'`intention` et propose des
 * artefacts **issus des catalogues du cœur**, avec un diff avant→après et des ops de
 * matérialisation. **Déterministe** (même entrée → même sortie), **sans réseau**, **sans
 * effet de bord**. La reconnaissance dépend de la **surface** (persona / méthode / kit).
 */
export function propose(intention: string, context: CopiloteContext): Proposition {
  const text = normalize(intention);
  const diffFile = `${context.diffFile ?? "artefact"} · avant → après`;
  // § Volet B : le modèle d'authoring configuré (Settings) — **aucun défaut**. Absent/vide → chaîne
  // vide, et l'absence est SIGNALÉE dans le hint (jamais masquée). L'inférence LLM live réelle reste
  // **différée** (aucun appel réseau ici) ; le modèle ne fait que paramétrer l'exécuteur mocké.
  const model =
    typeof context.model === "string" && context.model.trim().length > 0
      ? context.model.trim()
      : "";
  const modelPart = model
    ? `Modèle d'authoring ciblé : ${model} (mocké · inférence live différée).`
    : `${NO_AUTHORING_MODEL_HINT} (mock actif · inférence live différée).`;
  const hint =
    (context.surface === "methode"
      ? "La méthode ne nomme aucun agent : que la discipline. "
      : "") + `${modelPart} La forge n'écrit rien sans votre validation.`;

  const build = (intro: string, artefacts: ProposedArtefact[], ops: MaterializeOp[]): Proposition => ({
    intention,
    model,
    intro,
    artefacts,
    diff: buildDiff(ops, context),
    diffFile,
    ops,
    hint,
  });

  // --- Pattern 1 : identité / badge → le continuum skill + 2 hooks (Stop + UserPromptSubmit). ---
  if (hasAny(text, ["badge", "identite", "identity", "pastille", "start/stop", "start", "stop"])) {
    const guardTarget: MaterializeTarget =
      context.surface === "methode" ? "method-guardrail" : "persona-guardrail";
    return build(
      "Le skill seul ne se contrôle pas : je propose 3 artefacts — 1 skill rédigé + 2 hooks qui le font respecter.",
      [
        skillArtefact("iakaframe-nathalie") /* skill de discipline d'expression (illustratif) */,
        { icon: "hook", tag: "HOOK", title: "Stop", detail: "identity-guard.mjs — vérifie le badge de clôture à chaque fin de tour." },
        { icon: "hook", tag: "HOOK", title: "UserPromptSubmit", detail: "identity-guard.mjs — rappelle le rituel d'ouverture." },
      ],
      [{ target: guardTarget, id: "identity-guard", label: "Canal d'identité (badges)" }],
    );
  }

  // --- Pattern 2 : qualité / rapport → principe `qualite` (+ rituel + garde, continuum §3.7). ---
  if (hasAny(text, ["qualite", "quality", "rapport", "typecheck", "lint", "revue"])) {
    if (context.surface === "methode") {
      return build(
        "Je matérialise un Principe nommé et le raccroche au workflow via un geste et une garde.",
        [
          principleArtefact("qualite"),
          { icon: "rit", tag: "RIT", title: "quality-report", detail: "bash scripts/quality-report.sh (outillage réel différé)." },
          { icon: "hook", tag: "HOOK", title: "PreToolUse · tag", detail: "refuse le tag mineur sans rapport joint (câblage différé)." },
        ],
        [{ target: "method-principle", id: "qualite", label: "Qualité" }],
      );
    }
    // Surfaces non-méthode : rattache la skill qualité au casting.
    return build(
      "Je rattache la skill de qualité (gate) au casting.",
      [skillArtefact("iakaframe-qualite")],
      [{ target: "persona-skill", id: "iakaframe-qualite", label: "Qualité / gate" }],
    );
  }

  // --- Pattern 3 : rituel / geste → un Ritual (choisi par sous-mot-clé, repli snapshot). ---
  if (hasAny(text, ["rituel", "geste", "snapshot", "update", "init", "iakastart", "etat des lieux", "log"])) {
    const ritualId = pickRitualId(text);
    if (context.surface === "methode") {
      return build(
        "Je matérialise un rituel outillé (déclencheur → actions), rangé côté forge/cockpit.",
        [ritualArtefact(ritualId)],
        [{ target: "method-ritual", id: ritualId, label: ritualId }],
      );
    }
    // Hors méthode : un rituel est une notion de discipline → repli générique de surface.
    return fallback(text, context, build);
  }

  // --- Pattern 4 : périmètre / docker / délégation → garde ou principe ciblé. ---
  if (hasAny(text, ["perimetre", "perimeter", "auto-validation", "auto validation"])) {
    const guardTarget: MaterializeTarget =
      context.surface === "methode" ? "method-guardrail" : "persona-guardrail";
    return build(
      "Je pose la garde de périmètre (contrainte exécutée qui tient le périmètre du rôle).",
      [guardrailArtefact("perimeter-guard")],
      [{ target: guardTarget, id: "perimeter-guard", label: "Garde de périmètre" }],
    );
  }
  if (hasAny(text, ["docker", "isolation", "stack", "ports", "conteneur", "container"])) {
    if (context.surface === "methode") {
      return build(
        "Je matérialise le principe d'isolation Docker (une stack + ports distincts par projet).",
        [principleArtefact("isolation-docker")],
        [{ target: "method-principle", id: "isolation-docker", label: "Isolation Docker" }],
      );
    }
    return fallback(text, context, build);
  }
  if (hasAny(text, ["delegation", "deleguer", "sous-agent", "subagent"])) {
    const guardTarget: MaterializeTarget =
      context.surface === "methode" ? "method-guardrail" : "persona-guardrail";
    return build(
      "Je pose la garde de délégation (canal des gestes réservé aux orchestrateurs).",
      [guardrailArtefact("delegation-guard")],
      [{ target: guardTarget, id: "delegation-guard", label: "Garde de délégation" }],
    );
  }

  // --- Pattern 5 (kit) : binding / assemblage → carte de binding « défaut suggéré ». ---
  if (context.surface === "kit" || hasAny(text, ["binding", "assemble", "assemblage", "kit", "cockpit", "livr"])) {
    const bindingId = hasAny(text, ["local", "ollama", "hors-ligne", "offline"]) ? "local-first" : "defaut-suggere";
    return build(
      "Je prépare une carte de Binding « défaut suggéré » (structurel Méthode↔Team) — override au Cockpit.",
      [
        {
          icon: "bind",
          tag: "BIND",
          title: bindingId,
          detail:
            bindingId === "local-first"
              ? "ollama pour les rôles non critiques · override au Cockpit"
              : "claude-code · override au Cockpit",
        },
      ],
      [{ target: "kit-binding", id: bindingId, label: bindingId }],
    );
  }

  // --- Repli générique selon la surface. ---
  return fallback(text, context, build);
}

/** Choix déterministe d'un rituel selon un sous-mot-clé (repli `snapshot`). */
function pickRitualId(text: string): string {
  if (text.includes("update")) return "update";
  if (text.includes("init")) return "init";
  if (text.includes("iakastart")) return "iakastart";
  if (text.includes("log")) return "log-conversation";
  return "snapshot";
}

/** Repli générique : propose un artefact « sûr » selon la surface éditée. */
function fallback(
  _text: string,
  context: CopiloteContext,
  build: (intro: string, artefacts: ProposedArtefact[], ops: MaterializeOp[]) => Proposition,
): Proposition {
  if (context.surface === "methode") {
    return build(
      "Je n'ai pas de motif précis : je propose un principe fondateur de la discipline (MVP d'abord).",
      [principleArtefact("mvp-first")],
      [{ target: "method-principle", id: "mvp-first", label: "MVP d'abord" }],
    );
  }
  if (context.surface === "kit") {
    return build(
      "Je n'ai pas de motif précis : je propose la carte de Binding par défaut (override au Cockpit).",
      [{ icon: "bind", tag: "BIND", title: "defaut-suggere", detail: "claude-code · override au Cockpit" }],
      [{ target: "kit-binding", id: "defaut-suggere", label: "defaut-suggere" }],
    );
  }
  // team / persona
  return build(
    "Je n'ai pas de motif précis : je rattache la skill de cadrage au casting.",
    [skillArtefact("iakaframe-cadrage")],
    [{ target: "persona-skill", id: "iakaframe-cadrage", label: "Cadrage / architecture" }],
  );
}

/** Sanity-check interne (utilisé par les tests) : les catalogues sont bien seedés. */
export const MOCK_CATALOG_SIZES = {
  principles: CATALOG_PRINCIPLES.length,
  rituals: CATALOG_RITUALS.length,
  guardrails: CATALOG_GUARDRAILS.length,
  scaffolds: CATALOG_SCAFFOLDS.length,
  skills: CATALOG_SKILLS.length,
} as const;
