/**
 * TeamComposer — assembler une team PURE (§ 7.3 instruction).
 *
 * Roster (ajouter/retirer des personas), **désigner le coordinateur**, **casting**
 * (`none` = pastilles au MVP, Q-4), **connecteurs** (déclaration d'ids). Présentationnel :
 * toute écriture passe par les mutateurs `useForgeTeams` reçus en props. **Aucun** champ
 * runner/modèle (AR-1).
 */
import { useState } from "react";
import { type Persona, type Team } from "@iakaframe/core";
import { RosterList } from "./RosterList";
import { PersonaEditor } from "./PersonaEditor";

interface Props {
  team: Team;
  onUpsertPersona: (persona: Persona) => void;
  onRemovePersona: (personaId: string) => void;
  onSetCoordinator: (personaId: string) => void;
  onAttachConnector: (connectorId: string) => void;
  onDetachConnector: (connectorId: string) => void;
  onRenameTeam: (name: string) => void;
}

const CASTINGS = ["none"]; // MVP : pastilles seules (Q-4).

export function TeamComposer({
  team,
  onUpsertPersona,
  onRemovePersona,
  onSetCoordinator,
  onAttachConnector,
  onDetachConnector,
  onRenameTeam,
}: Props) {
  const [editing, setEditing] = useState<Persona | null>(null);
  const [adding, setAdding] = useState(false);
  const [connectorId, setConnectorId] = useState("");

  return (
    <div>
      <div className="panel">
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Nom de la team</label>
            <input value={team.name} onChange={(e) => onRenameTeam(e.target.value)} />
          </div>
          <div className="field">
            <label>Casting visuel</label>
            <select value={team.vignetteTeam} disabled>
              {CASTINGS.map((c) => (
                <option key={c} value={c}>
                  {c === "none" ? "Pastilles [ROYAUME][Nom]" : c}
                </option>
              ))}
            </select>
          </div>
          {/* E2 : la Team est method-agnostic — le champ « Méthode » remonte à l'onglet Méthode/Kit (E2b). */}
        </div>
        <p className="sub" style={{ marginBottom: 0 }}>
          Team <span className="badge">{team.id}</span> · {team.personas.length} persona(s)
        </p>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Roster</h3>
          <button className="btn" type="button" onClick={() => { setAdding(true); setEditing(null); }}>
            + Ajouter une persona
          </button>
        </div>

        <RosterList
          personas={team.personas}
          coordinatorId={team.coordinator}
          onEdit={(p) => { setEditing(p); setAdding(false); }}
          onRemove={onRemovePersona}
          onSetCoordinator={onSetCoordinator}
        />
      </div>

      {(adding || editing) && (
        <PersonaEditor
          persona={editing ?? undefined}
          existingIds={team.personas
            .map((p) => p.id)
            .filter((id) => id !== editing?.id)}
          onSubmit={(p) => {
            onUpsertPersona(p);
            setEditing(null);
            setAdding(false);
          }}
          onCancel={() => { setEditing(null); setAdding(false); }}
        />
      )}

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Connecteurs (MCP) — déclaration d'ids</h3>
        <div className="row">
          <input
            value={connectorId}
            placeholder="id de connecteur (ex. filesystem)"
            onChange={(e) => setConnectorId(e.target.value)}
          />
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              onAttachConnector(connectorId);
              setConnectorId("");
            }}
          >
            Attacher
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          {team.connectors.length === 0 && <span className="empty">Aucun connecteur.</span>}
          {team.connectors.map((c) => (
            <span key={c} className="tag">
              {c}{" "}
              <button
                type="button"
                onClick={() => onDetachConnector(c)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
                aria-label={`détacher ${c}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
