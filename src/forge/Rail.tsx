/**
 * Rail — primitives du **rail-stock en accordéon par type** (E2b §9, parti H1 de la maquette).
 *
 * `RailSection` = un `<details class="acc">` repliable (titre + compteur). `RailElement` = un
 * élément de niveau cliquable (passe en **édition**). `StockItem` = un **sous-élément du stock**
 * avec un bouton `+` qui l'**insère réellement** dans l'élément en cours d'édition (l'insertion
 * est portée par le parent — ici on ne gère que le feedback visuel ✓). Purement présentationnel.
 */
import { useState, type ReactNode } from "react";
import { Vignette } from "./Vignette";

/** Section repliable du rail (accordéon par type). */
export function RailSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="acc" open={defaultOpen}>
      <summary>
        <span className="chev">▶</span>
        {title}
        <span className="cnt">{count}</span>
      </summary>
      <div className="list">{children}</div>
    </details>
  );
}

/** Élément de niveau (persona, méthode, kit…) : clic = passage en édition. */
export function RailElement({
  name,
  role,
  selected,
  roleIndex = 0,
  onSelect,
}: {
  name: string;
  role: string;
  selected: boolean;
  roleIndex?: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`el${selected ? " sel" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <Vignette label={initials(name)} roleIndex={roleIndex} size="sm" />
      <span>
        <span className="nm">{name}</span>
        <span className="rl" style={{ display: "block" }}>
          {role}
        </span>
      </span>
      {selected && <span className="edit-tag">en édition</span>}
    </button>
  );
}

/** Sous-élément du stock avec bouton `+` : l'insère RÉELLEMENT dans l'élément édité. */
export function StockItem({
  tag,
  tagLabel,
  name,
  desc,
  addTitle = "Insérer dans l'élément en édition",
  disabled = false,
  onAdd,
}: {
  tag: string;
  tagLabel: string;
  name: string;
  desc: string;
  addTitle?: string;
  disabled?: boolean;
  onAdd: () => void;
}) {
  const [done, setDone] = useState(false);
  return (
    <div className="sub">
      <span className={`tagg ${tag}`}>{tagLabel}</span>
      <span className="sn">
        {name}
        <span className="sd">{desc}</span>
      </span>
      <button
        type="button"
        className={`plus${done ? " done" : ""}`}
        title={addTitle}
        aria-label={`${addTitle} : ${name}`}
        disabled={disabled}
        onClick={() => {
          onAdd();
          setDone(true);
          window.setTimeout(() => setDone(false), 700);
        }}
      >
        {done ? "✓" : "+"}
      </button>
    </div>
  );
}

/** Note de bas de rail (explique le geste `+`). */
export function RailNote({ children }: { children: ReactNode }) {
  return <div className="railnote">{children}</div>;
}

/** Initiales (2 lettres) d'un nom pour la vignette de rail. */
function initials(name: string): string {
  const clean = (name || "").trim();
  return clean.length >= 2 ? clean.slice(0, 2) : clean || "?";
}
