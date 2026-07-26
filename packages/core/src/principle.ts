/**
 * principle.ts — le **Principe** (politique composable de la Méthode, E2 §3.3) — cœur 🟦.
 *
 * Un principe est une **règle de discipline** : `{ label · policy · trigger }`. Il vit dans un
 * **catalogue assemblable** ; la Méthode en **référence** un sous-ensemble par id (comme
 * `Persona.skills`/`guardrails`). Le continuum §3.7 le décline en Rituel (procédure) et Garde
 * (contrainte) — ici on ne porte que la **politique** (le « quoi »/« pourquoi »).
 *
 * Esprit du cœur : type pur + parseur défensif (record invalide → `null`, jamais d'exception).
 * NB de nommage : `label` (et non `name`) pour rester cohérent avec `Skill`/`Role`/`Guardrail`.
 */

import type { FrontmatterPatch } from "./frontmatter";

/** Un principe : politique nommée, avec son déclencheur. */
export interface Principle {
  /** Id stable, référencé par `Method.principleIds` (ex. "qualite"). */
  id: string;
  /** Libellé lisible (menu d'authoring). */
  label: string;
  /** La politique (le « quoi »/« pourquoi »), texte. */
  policy: string;
  /** Le déclencheur (quand la politique s'applique), texte. */
  trigger: string;
}

/**
 * **`CATALOG_PRINCIPLES`** — les 14 principes canoniques iakaframe (E2 §3.3), en DONNÉE.
 * La Méthode canonique les référence tous ; une autre méthode en choisirait un sous-ensemble.
 */
export const CATALOG_PRINCIPLES: readonly Principle[] = [
  {
    id: "qualite",
    label: "Qualité",
    policy:
      "Version mineure ⇒ rapport qualité complet (typecheck + lint + tests + revue).",
    trigger: "bump SemVer x.Y.z",
  },
  {
    id: "gestion-backlog",
    label: "Gestion du backlog",
    policy: "Backlog portefeuille tenu à jour.",
    trigger: "ouverture/clôture de session",
  },
  {
    id: "documentation",
    label: "Documentation",
    policy: "Régénérer l'état des lieux.",
    trigger: "changement de version · pause/reprise",
  },
  {
    id: "commits-versionnement",
    label: "Commits & versionnement",
    policy:
      "Commits atomiques, conventional ; jamais `reset --hard`/`push --force`.",
    trigger: "chaque étape logique achevée",
  },
  {
    id: "isolation-docker",
    label: "Isolation Docker",
    policy: "Une stack Docker + ports hôte distincts par projet.",
    trigger: "provisioning d'un environnement",
  },
  {
    id: "self-hosted-first",
    label: "Self-hosted d'abord",
    policy: "Self-hosted/open-source d'abord ; cloud en fallback justifié.",
    trigger: "choix d'un backend",
  },
  {
    id: "reutilisation-existant",
    label: "Réutilisation de l'existant",
    policy: "Réutiliser l'infra/services/MCP avant de réimplémenter.",
    trigger: "choix d'implémentation",
  },
  {
    id: "mvp-first",
    label: "MVP d'abord",
    policy: "MVP d'abord, puis itérer ; pas de sur-ingénierie.",
    trigger: "cadrage d'une feature",
  },
  {
    id: "identite-badges",
    label: "Identité (badges)",
    policy:
      "Double badge ouverture/clôture ; position = sens ; « START/STOP » bannis.",
    trigger: "chaque prise de parole d'un agent",
  },
  {
    id: "perimetres-etanches",
    label: "Périmètres étanches",
    policy: "Chaque rôle tient son périmètre ; pas d'auto-validation.",
    trigger: "exécution d'une tâche",
  },
  {
    id: "langue",
    label: "Langue",
    policy: "Doc/échanges en français ; code/identifiants en anglais.",
    trigger: "production de tout artefact",
  },
  {
    id: "mock-en-dev",
    label: "Mock en dev",
    policy: "Mocker les API coûteuses/limitées en dev (`specs/mock/`).",
    trigger: "dev contre une API externe",
  },
  {
    id: "cadrage-avant-code",
    label: "Cadrage avant code",
    policy: "Instruction écrite avant toute tâche non triviale.",
    trigger: "début d'une tâche non triviale",
  },
  {
    id: "confirmation-actes-destructifs",
    label: "Confirmation des actes destructifs",
    policy:
      "Confirmer par message avant tout acte destructif hors denylist.",
    trigger: "acte destructif hors garde auto",
  },
] as const;

/** Ids des principes du catalogue (ordre du catalogue). */
export const CATALOG_PRINCIPLE_IDS: readonly string[] = CATALOG_PRINCIPLES.map(
  (p) => p.id,
);

/** Un principe du catalogue par id (`undefined` si absent). */
export function principleById(id: string | undefined | null): Principle | undefined {
  return id ? CATALOG_PRINCIPLES.find((p) => p.id === id) : undefined;
}

/**
 * Parse défensif d'UN principe (`null` si inutilisable : pas d'`id`). `policy`/`trigger` vides
 * tolérés ; `label` repli sur l'`id`. Jamais d'exception.
 */
export function parsePrinciple(raw: unknown): Principle | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;
  const label =
    typeof r.label === "string" && r.label.trim().length > 0 ? r.label.trim() : id;
  const policy = typeof r.policy === "string" ? r.policy : "";
  const trigger = typeof r.trigger === "string" ? r.trigger : "";
  return { id, label, policy, trigger };
}

/**
 * Construit le **patch de frontmatter** d'un principe pour une réécriture **non-destructive**
 * (Lot 5b, C1) : uniquement les champs que l'éditeur modélise (`label, policy, trigger`).
 * **Exclu volontairement** : `id` (verrouillé en édition, C-1 : jamais de renommage). Toute clé non
 * modélisée (corps, clés inconnues) est **préservée à l'octet** par `patchFrontmatter` du seul fait
 * de son absence du patch. Un patch dont toutes les valeurs sont inchangées ⇒ document byte-identique
 * (round-trip). `policy`/`trigger` restent scalaires : `patchFrontmatter` ne réécrit la ligne que si
 * la valeur change (préservant les quotes du canon quand elle ne change pas).
 */
export function principleFrontmatterPatch(p: Principle): FrontmatterPatch {
  return {
    label: { kind: "scalar", value: p.label },
    policy: { kind: "scalar", value: p.policy },
    trigger: { kind: "scalar", value: p.trigger },
  };
}
