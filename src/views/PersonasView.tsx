/**
 * PersonasView — créer / nommer librement / éditer / supprimer des personas (§ 2.1.4, C-3).
 *
 * Les personas vivent DANS une team (schéma pur). Cette vue cible une team (sélecteur) et
 * expose l'éditeur + le roster (pastilles `[ROYAUME][Nom]`). Présentationnel : écritures via
 * `useForgeTeams`. AUCUN champ runner/modèle (AR-1).
 */
import { useEffect, useState } from "react";
import type { Persona } from "@iakaframe/core";
import type { UseForgeTeams } from "../hooks/useForgeTeams";
import { PersonaEditor } from "../components/PersonaEditor";
import { RosterList } from "../components/RosterList";

export function PersonasView({ forge }: { forge: UseForgeTeams }) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Persona | null>(null);

  useEffect(() => {
    if (teamId === null && forge.teams.length > 0) {
      setTeamId(forge.teams[0].id);
    }
  }, [forge.teams, teamId]);

  const team = teamId ? forge.teamById(teamId) : null;

  if (forge.teams.length === 0) {
    return (
      <div className="view">
        <h2>Personas</h2>
        <p className="sub">Créez d'abord une team (onglet Teams) pour y ajouter des personas.</p>
      </div>
    );
  }

  return (
    <div className="view">
      <h2>Personas</h2>
      <p className="sub">Nommage libre (AR-5) + rôle canonique + skills + gardes. Pastille [ROYAUME][Nom].</p>

      <div className="panel">
        <div className="field">
          <label>Team cible</label>
          <select value={teamId ?? ""} onChange={(e) => { setTeamId(e.target.value); setEditing(null); }}>
            {forge.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {team && (
        <>
          <PersonaEditor
            key={editing?.id ?? "new"}
            persona={editing ?? undefined}
            existingIds={team.personas.map((p) => p.id).filter((id) => id !== editing?.id)}
            onSubmit={(p) => {
              void forge.upsertPersona(team.id, p);
              setEditing(null);
            }}
            onCancel={editing ? () => setEditing(null) : undefined}
          />

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Roster de « {team.name} »</h3>
            <RosterList
              personas={team.personas}
              coordinatorId={team.coordinator}
              onEdit={(p) => setEditing(p)}
              onRemove={(id) => void forge.removePersona(team.id, id)}
              onSetCoordinator={(id) => void forge.setCoordinator(team.id, id)}
            />
          </div>
        </>
      )}
    </div>
  );
}
