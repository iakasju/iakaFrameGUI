/**
 * TeamsView — assembler/gérer les teams (§ 7.3/7.4). Créer une team **depuis le gabarit**
 * canonique (AR-5) ou vide, la sélectionner, la renommer, la supprimer, et composer son
 * roster via `TeamComposer`. Présentationnel : écritures via `useForgeTeams`.
 */
import { useEffect, useState } from "react";
import { buildTeamFromRoster, emptyTeam } from "@iakaframe/core";
import type { UseForgeTeams } from "../hooks/useForgeTeams";
import { TeamComposer } from "../components/TeamComposer";

export function TeamsView({ forge }: { forge: UseForgeTeams }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  // Sélection par défaut = première team dès qu'elles sont chargées.
  useEffect(() => {
    if (selectedId === null && forge.teams.length > 0) {
      setSelectedId(forge.teams[0].id);
    }
  }, [forge.teams, selectedId]);

  const selected = selectedId ? forge.teamById(selectedId) : null;

  async function createFromRoster() {
    const name = newName.trim() || "Nouvelle team";
    const team = buildTeamFromRoster(name, uniqueTeamId(name, forge.teams.map((t) => t.id)));
    await forge.upsertTeam(team);
    setSelectedId(team.id);
    setNewName("");
  }

  async function createEmpty() {
    const name = newName.trim() || "Team vide";
    const team = emptyTeam(name, uniqueTeamId(name, forge.teams.map((t) => t.id)));
    await forge.upsertTeam(team);
    setSelectedId(team.id);
    setNewName("");
  }

  return (
    <div className="view">
      <h2>Teams</h2>
      <p className="sub">Assembler une team PURE (personas + rôles + skills), sans runner ni modèle.</p>

      <div className="panel">
        <div className="row">
          <input
            value={newName}
            placeholder="Nom de la nouvelle team"
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn" type="button" onClick={createFromRoster}>
            Créer depuis le gabarit (7 rôles)
          </button>
          <button className="btn ghost" type="button" onClick={createEmpty}>
            Team vide
          </button>
        </div>
      </div>

      {forge.teams.length > 0 && (
        <div className="panel">
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Team sélectionnée</label>
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {forge.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.personas.length})
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <button
                className="btn danger"
                type="button"
                onClick={async () => {
                  await forge.removeTeam(selected.id);
                  setSelectedId(null);
                }}
              >
                Supprimer cette team
              </button>
            )}
          </div>
        </div>
      )}

      {selected ? (
        <TeamComposer
          team={selected}
          onUpsertPersona={(p) => void forge.upsertPersona(selected.id, p)}
          onRemovePersona={(id) => void forge.removePersona(selected.id, id)}
          onSetCoordinator={(id) => void forge.setCoordinator(selected.id, id)}
          onAttachConnector={(id) => void forge.attachConnector(selected.id, id)}
          onDetachConnector={(id) => void forge.detachConnector(selected.id, id)}
          onRenameTeam={(name) =>
            void forge.upsertTeam({ ...selected, name })
          }
        />
      ) : (
        <p className="empty">Créez une team pour commencer.</p>
      )}
    </div>
  );
}

/** Id de team unique (suffixe -2, -3… en cas de collision). */
function uniqueTeamId(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "team";
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
