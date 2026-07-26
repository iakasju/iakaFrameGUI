/**
 * ListEditor — **socle d'édition de liste réutilisable** (chantier #4 Lot A, AC5). Composant
 * générique `<T>` : rend une liste de lignes typées avec **ajout / suppression / réordonnancement
 * ↑↓**, chaque ligne peinte par un `renderRow(item, onChange, index)` **injecté** — patron « composant
 * générique + injection » cohérent avec `ElementKind`/`ElementReservoir`.
 *
 * Contrôlé (source unique : `items` + `onChange`), il ne détient aucun état — l'éditeur parent porte
 * le brouillon. Sert les listes **structurées** (`scaffold.entries` = `{path, role, createIfAbsent}`,
 * le pilote) comme les listes **simples** (Lot C : `skill.subskills` = `string[]`, via un `renderRow`
 * d'un seul input). Réordonnancement = boutons ↑/↓ (pas de drag-and-drop au MVP — plus simple,
 * suffisant, et testable sans harnais pointeur).
 *
 * **Accessibilité (ARIA)** : le groupe porte `role="group"` + `aria-label` (`legend`) ; chaque ligne
 * est un `role="group"` étiqueté (`itemLabel`) ; les boutons ↑/↓/✕ portent un `aria-label` explicite
 * et sont `disabled` aux bornes (première ligne : ↑ inactif ; dernière : ↓ inactif).
 */
import type { ReactNode } from "react";

export interface ListEditorProps<T> {
  /** Les lignes courantes (source unique — composant contrôlé). */
  items: readonly T[];
  /** Remonte la nouvelle liste (add/remove/reorder/édition de ligne). */
  onChange: (items: T[]) => void;
  /**
   * Peint UNE ligne : reçoit l'item, un `onRowChange(next)` qui remplace cet item, et l'index.
   * L'injection permet une ligne simple (1 input) ou structurée (N champs) sans changer le socle.
   */
  renderRow: (item: T, onRowChange: (next: T) => void, index: number) => ReactNode;
  /** Fabrique une ligne vierge (ajout). */
  blankRow: () => T;
  /** Libellé du groupe (ARIA + titre visuel). Ex. « Entrées d'échafaudage ». */
  legend: string;
  /** Libellé du bouton d'ajout. Défaut : « Ajouter une entrée ». */
  addLabel?: string;
  /** Étiquette ARIA d'une ligne (défaut : « ligne N »). Ex. `(_, i) => \`entrée ${i + 1}\``. */
  itemLabel?: (item: T, index: number) => string;
  /** Libellé affiché quand la liste est vide. */
  emptyLabel?: string;
}

/** Le socle d'édition de liste (générique, réutilisable — cf. en-tête). */
export function ListEditor<T>({
  items,
  onChange,
  renderRow,
  blankRow,
  legend,
  addLabel = "Ajouter une entrée",
  itemLabel = (_item, index) => `ligne ${index + 1}`,
  emptyLabel = "Aucune ligne — utilisez « Ajouter ».",
}: ListEditorProps<T>) {
  function replaceAt(index: number, next: T) {
    onChange(items.map((it, i) => (i === index ? next : it)));
  }
  function removeAt(index: number) {
    onChange(items.filter((_it, i) => i !== index));
  }
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function add() {
    onChange([...items, blankRow()]);
  }

  return (
    <div className="list-editor" role="group" aria-label={legend}>
      {items.length === 0 && <p className="list-editor-empty">{emptyLabel}</p>}
      {items.map((item, index) => {
        const label = itemLabel(item, index);
        return (
          <div className="list-editor-row" role="group" aria-label={label} key={index}>
            <div className="list-editor-body">{renderRow(item, (next) => replaceAt(index, next), index)}</div>
            <div className="list-editor-ctrls">
              <button
                type="button"
                className="btn ghost list-editor-btn"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`monter ${label}`}
                title="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn ghost list-editor-btn"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`descendre ${label}`}
                title="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn danger list-editor-btn"
                onClick={() => removeAt(index)}
                aria-label={`supprimer ${label}`}
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" className="btn ghost list-editor-add" onClick={add}>
        + {addLabel}
      </button>
    </div>
  );
}
