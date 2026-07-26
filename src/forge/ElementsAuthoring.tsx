/**
 * ElementsAuthoring — l'entrée de nav **« éléments »** devenue **réservoir authorable** (chantier #3
 * Lot 1, extension-feanor-en-tete-pages-elements.md § 4.2, FORK A retenu par le décideur). Remplace
 * l'ancien `ElementPoolPanel` read-only par le **geste décideur** : un **sélecteur de type** à gauche
 * → une **grille de fiches** → **New / sélection→édition** → **Fëanor-en-tête** (via l'hôte générique
 * `ElementReservoir`).
 *
 * MVP (Lot 1) : **un seul pool pilote authorable — le principe** (source `CATALOG_PRINCIPLES`, édition
 * locale de session). Les autres pools (skill, rituel, garde-fou, rôle, scaffold, workflow) sont
 * annoncés « à venir » (Lots 2–4) — honnête, pas de fausse surface. Brancher un pool suivant = ajouter
 * une entrée à `AUTHORABLE` avec son `ElementKind` (rien d'autre à toucher ici).
 */
import { useState, type ReactNode } from "react";
import { ElementReservoir } from "./ElementReservoir";
import { principleKind } from "./principleKind";

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

/** Les pools **authorables** au MVP (un seul pilote : le principe). */
const AUTHORABLE: AuthorableEntry[] = [
  {
    type: "principle",
    label: "principes",
    icon: "⚖️",
    render: () => <ElementReservoir kind={principleKind} />,
  },
];

/** Les pools **à venir** (Lots 2–4) — listés en repère honnête, non sélectionnables. */
const UPCOMING: { label: string; icon: string }[] = [
  { label: "skills", icon: "🧩" },
  { label: "rituels", icon: "🔁" },
  { label: "gardes-fous", icon: "🛡️" },
  { label: "rôles", icon: "🎯" },
  { label: "scaffolds", icon: "🏗️" },
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
