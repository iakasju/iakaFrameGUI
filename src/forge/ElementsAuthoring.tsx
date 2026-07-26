/**
 * ElementsAuthoring — l'entrée de nav **« éléments »** devenue **réservoir authorable** (chantier #3
 * Lot 1, extension-feanor-en-tete-pages-elements.md § 4.2, FORK A retenu par le décideur). Remplace
 * l'ancien `ElementPoolPanel` read-only par le **geste décideur** : un **sélecteur de type** à gauche
 * → une **grille de fiches** → **New / sélection→édition** → **Fëanor-en-tête** (via l'hôte générique
 * `ElementReservoir`).
 *
 * Lot 1 : un pilote (le principe). **Lot 2** : les 5 pools de catalogue restants deviennent
 * authorables — **skill, rituel, garde-fou, rôle, scaffold** (sources `CATALOG_SKILLS`,
 * `CATALOG_RITUALS`, `CATALOG_GUARDRAILS`, `CANONICAL_ROLES`, `CATALOG_SCAFFOLDS`), édition locale de
 * session. Seul **workflow** reste « à venir » (Lot 3, cas riche à part). Brancher un pool = ajouter
 * une entrée à `AUTHORABLE` avec son `ElementKind` (rien d'autre à toucher ici : l'hôte est agnostique).
 */
import { useState, type ReactNode } from "react";
import { ElementReservoir } from "./ElementReservoir";
import { principleKind } from "./principleKind";
import { skillKind } from "./skillKind";
import { ritualKind } from "./ritualKind";
import { guardrailKind } from "./guardrailKind";
import { roleKind } from "./roleKind";
import { scaffoldKind } from "./scaffoldKind";

interface AuthorableEntry {
  /** Clé de type stable. */
  type: string;
  /** Libellé du pool (rail). */
  label: string;
  /** Pastille/icône du pool (décorative). */
  icon: string;
  /** Rend le réservoir authorable du pool. */
  render: () => ReactNode;
}

/**
 * Les pools **authorables** (pilote principe + les 5 pools de catalogue du Lot 2).
 *
 * Chaque réservoir porte un **`key` = son type** : les pools se rendent à la même position dans
 * `ea-main`, or un `ElementReservoir` porte son propre état de session (`items`). Sans `key`, changer
 * de pool réutiliserait l'instance ET son état (les fiches du pool précédent projetées avec le mauvais
 * `buildCards`). Le `key` force le remontage à chaque changement de type — l'hôte reste agnostique et
 * **inchangé** (la réinitialisation est une responsabilité du site de montage, patron React idiomatique).
 */
const AUTHORABLE: AuthorableEntry[] = [
  {
    type: "principle",
    label: "principes",
    icon: "⚖️",
    render: () => <ElementReservoir key="principle" kind={principleKind} />,
  },
  {
    type: "skill",
    label: "skills",
    icon: "🧩",
    render: () => <ElementReservoir key="skill" kind={skillKind} />,
  },
  {
    type: "ritual",
    label: "rituels",
    icon: "🔁",
    render: () => <ElementReservoir key="ritual" kind={ritualKind} />,
  },
  {
    type: "guardrail",
    label: "gardes-fous",
    icon: "🛡️",
    render: () => <ElementReservoir key="guardrail" kind={guardrailKind} />,
  },
  {
    type: "role",
    label: "rôles",
    icon: "🎯",
    render: () => <ElementReservoir key="role" kind={roleKind} />,
  },
  {
    type: "scaffold",
    label: "scaffolds",
    icon: "🏗️",
    render: () => <ElementReservoir key="scaffold" kind={scaffoldKind} />,
  },
];

/** Les pools **à venir** (Lot 3) — listés en repère honnête, non sélectionnables. */
const UPCOMING: { label: string; icon: string }[] = [
  { label: "workflows", icon: "🧭" },
];

export function ElementsAuthoring() {
  const [selected, setSelected] = useState<string>(AUTHORABLE[0].type);
  const active = AUTHORABLE.find((e) => e.type === selected) ?? AUTHORABLE[0];

  return (
    <div className="elements-authoring">
      <aside className="ea-rail" aria-label="Sélecteur de type d'élément">
        <div className="ea-rail-h">Pools authorables</div>
        {AUTHORABLE.map((e) => (
          <button
            key={e.type}
            type="button"
            className={`ea-pool${selected === e.type ? " on" : ""}`}
            aria-pressed={selected === e.type}
            onClick={() => setSelected(e.type)}
          >
            <span className="ea-icon" aria-hidden="true">
              {e.icon}
            </span>
            {e.label}
          </button>
        ))}

        <div className="ea-rail-h upcoming">À venir (Lots 2–4)</div>
        {UPCOMING.map((e) => (
          <span key={e.label} className="ea-pool disabled" aria-disabled="true">
            <span className="ea-icon" aria-hidden="true">
              {e.icon}
            </span>
            {e.label}
          </span>
        ))}
      </aside>

      <div className="ea-main">{active.render()}</div>
    </div>
  );
}
