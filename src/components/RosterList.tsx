/**
 * RosterList — liste de personas avec **pastille `[ROYAUME][Nom]`** (casting MVP = pastilles,
 * Q-4). Présentationnel : reçoit les personas + le coordinateur, émet des actions
 * (éditer / retirer / désigner coordinateur) que le parent branche sur `useForgeTeams`.
 */
import { personaBadge, roleLabel, type Persona } from "@iakaframe/core";

interface Props {
  personas: Persona[];
  coordinatorId?: string;
  onEdit?: (persona: Persona) => void;
  onRemove?: (personaId: string) => void;
  onSetCoordinator?: (personaId: string) => void;
}

export function RosterList({
  personas,
  coordinatorId,
  onEdit,
  onRemove,
  onSetCoordinator,
}: Props) {
  if (personas.length === 0) {
    return <p className="empty">Aucune persona dans ce roster.</p>;
  }
  return (
    <div>
      {personas.map((p) => (
        <div className="roster-item" key={p.id}>
          <div className="meta">
            <span className="badge">{personaBadge(p)}</span>
            <span className="role">
              {roleLabel(p.roleKey)} · index {p.roleIndex}
              {p.id === coordinatorId && <span className="coord"> · coordinateur</span>}
            </span>
            <span>
              {p.skills.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))}
              {p.guardrails.map((g) => (
                <span key={g} className="tag">
                  🛡 {g}
                </span>
              ))}
            </span>
          </div>
          <div className="row">
            {onSetCoordinator && p.id !== coordinatorId && (
              <button
                className="btn ghost"
                type="button"
                onClick={() => onSetCoordinator(p.id)}
              >
                Coordinateur
              </button>
            )}
            {onEdit && (
              <button className="btn ghost" type="button" onClick={() => onEdit(p)}>
                Éditer
              </button>
            )}
            {onRemove && (
              <button className="btn danger" type="button" onClick={() => onRemove(p.id)}>
                Retirer
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
