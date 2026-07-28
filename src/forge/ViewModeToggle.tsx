/**
 * ViewModeToggle — le **sélecteur de mode de présentation** partagé (lot « modes de présentation »,
 * GUI-only). Un segment-control de trois boutons (⊞ Tuiles · ▤ Lignes · ☰ Liste détaillée) posé en
 * tête de la barre du réservoir/galerie. Consommé **tel quel** par les deux hôtes de grilles
 * (`ElementReservoir`, `FramesGallery`) — zéro copier-coller.
 *
 * ACCESSIBILITÉ : `role="radiogroup"` sur le conteneur, `role="radio"` + `aria-checked` sur chaque
 * bouton (motif ARIA d'un choix unique exclusif). Le glyphe est décoratif (`aria-hidden`) ; le
 * libellé porte le sens et l'`aria-label`. Studio clair (styles dans `viewMode.css`).
 */
import { VIEW_MODES, type ViewMode } from "./viewMode";

export function ViewModeToggle({
  value,
  onChange,
  label = "Mode de présentation",
}: {
  /** Le mode actuellement sélectionné. */
  value: ViewMode;
  /** Remonte le mode choisi (l'hôte persiste via `useViewMode`). */
  onChange: (mode: ViewMode) => void;
  /** Libellé accessible du groupe (contexte de la page). */
  label?: string;
}) {
  return (
    <div className="view-toggle" role="radiogroup" aria-label={label}>
      {VIEW_MODES.map((opt) => {
        const active = opt.mode === value;
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            className={`view-toggle-btn${active ? " active" : ""}`}
            onClick={() => onChange(opt.mode)}
          >
            <span className="vt-icon" aria-hidden="true">
              {opt.icon}
            </span>
            <span className="vt-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
