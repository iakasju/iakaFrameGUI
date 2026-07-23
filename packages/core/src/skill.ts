/**
 * skill.ts — la **skill** (méthode outillée d'un rôle) + catalogue connu (cœur 🟦).
 *
 * Contrat § 2.3 : une skill est le « comment » d'un rôle (id `iakaframe-*`). En P1, une
 * persona ne porte que des **ids de skills** (`Persona.skills: string[]`) ; l'éditeur de
 * corps riche (`SKILL.md`, allowedTools, hooks…) est **différé**. On expose ici l'interface
 * déclarative + un catalogue de skills connues servant de suggestions à l'authoring.
 */

/** Déclaration d'une skill (MVP = attribution d'id ; corps riche différé). */
export interface Skill {
  /** Id stable de la skill (ex. "iakaframe-cadrage"). */
  id: string;
  /** Rôle auquel la skill se rattache (réf. `Role.key`). */
  roleKey: string;
  /** Libellé lisible (menu d'attribution). */
  label: string;
}

/**
 * Catalogue des skills connues (gabarit d'authoring). Dérivé de la table
 * `SKILL_BY_AGENT` du Cockpit (`mock/demoTeam.ts:55-64`), reclassé **par rôle** (jamais
 * par nom de code). La saisie libre d'un id hors-catalogue reste tolérée (AR-5).
 */
export const CATALOG_SKILLS: readonly Skill[] = [
  { id: "iakaframe-odin", roleKey: "portefeuille", label: "Odin (portefeuille)" },
  { id: "iakaframe-aragorn", roleKey: "coordination", label: "Coordination projet" },
  { id: "iakaframe-cadrage", roleKey: "cadrage", label: "Cadrage / architecture" },
  { id: "iakaframe-qualite", roleKey: "qualite", label: "Qualité / gate" },
  { id: "iakaframe-naonedge", roleKey: "design", label: "Charte NaonEdge" },
  { id: "iakaframe-nathalie", roleKey: "documentation", label: "Documentation" },
  { id: "iakaframe-deploiement", roleKey: "deploiement", label: "Déploiement (Helm)" },
] as const;

/** Ids de skills connues (ordre du catalogue). */
export const CATALOG_SKILL_IDS: readonly string[] = CATALOG_SKILLS.map(
  (s) => s.id,
);

/** Skills connues d'un rôle (par clé, insensible à la casse) ; `[]` si aucune. */
export function skillsForRole(roleKey: string): Skill[] {
  const k = roleKey.toLowerCase();
  return CATALOG_SKILLS.filter((s) => s.roleKey === k);
}
