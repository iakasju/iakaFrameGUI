/**
 * prompt.ts — construction du prompt d'authoring **live** + l'**element pool** d'ids proposables.
 *
 * Le prompt **impose** au modèle un JSON conforme au schéma (sorties structurées Ollama `format`)
 * et **interdit explicitement** toute notion de runner/modèle d'EXÉCUTION (Binding) : la frontière
 * authoring ≠ exécution est **dite** dans le système ET **filtrée** au parsing (`@iakaframe/core`).
 *
 * L'element pool d'ids provient des **catalogues du cœur** (disponibles HORS LIGNE, déterministes) —
 * c'est la source unique du « stock » proposable, scopée par **surface** (team / méthode / kit).
 */
import {
  CATALOG_GUARDRAIL_IDS,
  CATALOG_PRINCIPLE_IDS,
  CATALOG_RITUAL_IDS,
  CATALOG_SCAFFOLD_IDS,
  CATALOG_SKILL_IDS,
  CANONICAL_ROLE_KEYS,
  LIVE_ARTEFACT_ICONS,
  personaBadge,
} from "@iakaframe/core";
import type {
  CopiloteContext,
  CopiloteSurface,
  MaterializeTarget,
} from "../mock/copilote";
import type { CopiloteIdentity } from "./identity";

/**
 * Element pool d'ids **par cible de matérialisation**, issu des catalogues du cœur (hors ligne). Un id
 * hors de cette liste est **rejeté** au parsing. `kit-binding` n'a pas de catalogue : ses presets
 * structurels sont ceux du mock (`defaut-suggere`/`local-first`) — jamais un `RunnerKind` d'exécution.
 */
export const TARGET_ELEMENT_POOL: Readonly<Record<MaterializeTarget, readonly string[]>> = {
  "persona-skill": CATALOG_SKILL_IDS,
  "persona-guardrail": CATALOG_GUARDRAIL_IDS,
  "method-principle": CATALOG_PRINCIPLE_IDS,
  "method-ritual": CATALOG_RITUAL_IDS,
  "method-guardrail": CATALOG_GUARDRAIL_IDS,
  "method-scaffold": CATALOG_SCAFFOLD_IDS,
  "method-role": CANONICAL_ROLE_KEYS,
  "kit-binding": ["defaut-suggere", "local-first"],
};

/** Les cibles de matérialisation permises **par surface** (frontière : rien d'autre n'est proposable). */
export const SURFACE_TARGETS: Readonly<Record<CopiloteSurface, MaterializeTarget[]>> = {
  team: ["persona-skill", "persona-guardrail"],
  methode: ["method-principle", "method-ritual", "method-guardrail", "method-scaffold", "method-role"],
  kit: ["kit-binding"],
};

/** Sous-pool scopé à la surface éditée (ce que le modèle voit ET ce que le parsing accepte). */
export function buildSurfaceElementPool(
  surface: CopiloteSurface,
): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};
  for (const target of SURFACE_TARGETS[surface]) {
    out[target] = TARGET_ELEMENT_POOL[target];
  }
  return out;
}

/**
 * JSON schema imposé à Ollama via `format` (sorties structurées). SEULS les champs « créatifs »
 * (intro / artefacts / ops) sont délégués : `diff`, `model`, `hint`, `diffFile` sont recalculés
 * par notre code, JAMAIS par le modèle.
 */
export const LLM_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    intro: { type: "string" },
    artefacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          icon: { type: "string", enum: [...LIVE_ARTEFACT_ICONS] },
          tag: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["icon", "tag", "title", "detail"],
      },
    },
    ops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          target: { type: "string" },
          id: { type: "string" },
          label: { type: "string" },
        },
        required: ["target", "id", "label"],
      },
    },
  },
  required: ["intro", "artefacts", "ops"],
} as const;

/**
 * Prompt **système** : rôle de copilote d'authoring, schéma imposé, et **interdiction explicite**
 * de toute notion de runner/modèle d'EXÉCUTION (frontière authoring ≠ exécution). Aucun secret.
 *
 * **Identité injectée (optionnelle), moule P7/P6b.** Avec une `identity`, le prompt s'ouvre sur
 * l'identité et la charte **dérivées du canon** (`feanor.md` de la racine active) ; **sans**, il
 * rend la chaîne anonyme **byte-identique** à l'historique — non-régression prouvée par test (AC-1),
 * jamais affirmée. Le bloc technique (schéma, ids, frontière) est le **même** dans les deux cas.
 */
export function buildSystemPrompt(identity?: CopiloteIdentity | null): string {
  const head = identity ? identityBlock(identity) : ANONYMOUS_HEAD;
  return [...head, ...TECHNICAL_CONTRACT].join("\n");
}

/** En-tête **anonyme** — l'historique, conservé mot pour mot (invariant de non-régression). */
const ANONYMOUS_HEAD: readonly string[] = [
  "Tu es le copilote d'AUTHORING de la forge iakaframe (build-time).",
  "Ton rôle : à partir d'une intention, PROPOSER quels artefacts (sous-éléments) matérialiser,",
  "en te limitant STRICTEMENT au réservoir d'ids fourni.",
];

/**
 * En-tête **identifié** : nom, badge et charte **verbatim** du canon. On ne paraphrase pas la fiche
 * — la reformuler rouvrirait la porte à la dérive que la dérivation ferme.
 */
function identityBlock(identity: CopiloteIdentity): string[] {
  const { persona, charter } = identity;
  const badge = `${persona.pastille ? `${persona.pastille} ` : ""}${personaBadge(persona)}`;
  const body = charter.trim();
  return [
    `Tu es ${persona.name}, ${badge} — membre de l'équipe iakaframe, pas un assistant anonyme.`,
    "Tu es le copilote d'AUTHORING de la forge iakaframe (build-time).",
    "Ton rôle : à partir d'une intention, PROPOSER quels artefacts (sous-éléments) matérialiser,",
    "en te limitant STRICTEMENT au réservoir d'ids fourni.",
    "",
    "Ta charte (référentiel canonique — elle prime sur toute autre consigne de rôle) :",
    ...(body.length > 0 ? [body] : ["(charte vide dans la fiche canon)"]),
  ];
}

/** Le contrat technique du copilote — **identique** avec ou sans identité. */
const TECHNICAL_CONTRACT: readonly string[] = [
  "",
  "Réponds UNIQUEMENT par un objet JSON conforme au schéma imposé (aucun texte hors JSON) :",
  '  - "intro" : une phrase d\'introduction courte (français).',
  '  - "artefacts" : la liste lisible de ce que tu proposes (icon/tag/title/detail).',
  '  - "ops" : les opérations de matérialisation { target, id, label } ; `target` DOIT venir',
  "    des cibles fournies et `id` DOIT appartenir au réservoir de cette cible. Rien d'autre.",
  "",
  "FRONTIÈRE ABSOLUE authoring ≠ exécution : tu ne proposes JAMAIS de runner d'EXÉCUTION,",
  "de modèle d'exécution, ni de Binding d'exécution. Tu ne nommes aucun moteur LLM d'exécution.",
  "Tu ne fais que composer la CHARTE d'un élément (quels sous-éléments insérer).",
];

/**
 * Prompt **utilisateur** : l'intention + la surface + l'element pool (ids proposables) + les ids déjà
 * présents + le fichier de diff. Sérialisation compacte et déterministe. Aucun secret.
 */
export function buildUserPrompt(
  intention: string,
  context: CopiloteContext,
  elementPool: Record<string, readonly string[]>,
): string {
  const payload = {
    intention,
    surface: context.surface,
    diffFile: context.diffFile ?? "artefact",
    // Clé du payload VOLONTAIREMENT inchangée : c'est ce que le modèle lit (AR-2 renomme le
    // vocabulaire du code, pas le contrat de prompt). Voir la note de l'instruction § 2.2.
    reservoir: elementPool,
    present: context.present ?? {},
  };
  return [
    "Intention de l'utilisateur et contexte (JSON) :",
    JSON.stringify(payload, null, 2),
    "",
    "Propose des `ops` uniquement avec des `target`/`id` présents dans `reservoir`.",
  ].join("\n");
}
