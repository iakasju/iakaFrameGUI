/**
 * useForgeTeams — AUTORITÉ de l'authoring de teams PURES (calque `useTeams` du Cockpit).
 *
 * SEULE autorité du modèle côté front (pas de god-component) : charge les teams depuis le
 * workspace (façade `teamList` → `parseTeamText`), expose la résolution (lecture) et la
 * définition (écriture) — chaque écriture **persiste puis met à jour l'état** via la façade
 * unique (`teamWrite`/`teamDelete`). AUCUNE notion de runner/modèle n'existe ici (AR-1).
 *
 * Gardes de cohérence (calque `useTeams`) : id de persona unique dans la team ; on ne
 * retire pas le coordinateur courant sans en désigner un autre ; `coordinator` invalide →
 * repli `personas[0]`. Hors Tauri (dev front pur / tests), la persistance dégrade en mémoire
 * (l'état suffit) — on n'échoue jamais au rendu.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseTeamText,
  serializeTeam,
  type Connector,
  type Persona,
  type Team,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";

export interface UseForgeTeams {
  teams: Team[];
  loaded: boolean;
  // --- Résolution (lecture) ---
  teamById: (id: string) => Team | null;
  coordinatorOf: (team: Team) => Persona | null;
  // --- Définition (écriture, persistée) ---
  upsertTeam: (team: Team) => Promise<void>;
  removeTeam: (teamId: string) => Promise<void>;
  upsertPersona: (teamId: string, persona: Persona) => Promise<void>;
  removePersona: (teamId: string, personaId: string) => Promise<void>;
  setCoordinator: (teamId: string, personaId: string) => Promise<void>;
  attachConnector: (teamId: string, connectorId: string) => Promise<void>;
  detachConnector: (teamId: string, connectorId: string) => Promise<void>;
  /** Relit le workspace (après un import externe, par ex.). */
  reload: () => Promise<void>;
}

export interface UseForgeTeamsDeps {
  api?: Backend;
}

export function useForgeTeams(deps: UseForgeTeamsDeps = {}): UseForgeTeams {
  const api = deps.api ?? backend;

  const [teams, setTeams] = useState<Team[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Réf miroir : écrire l'état courant sans le mettre en dépendance des callbacks.
  const teamsRef = useRef<Team[]>(teams);
  teamsRef.current = teams;

  /** Persiste UNE team (fichier JSON) puis met à jour l'état local. */
  const persistTeam = useCallback(
    async (team: Team): Promise<void> => {
      const json = serializeTeam(team);
      try {
        await api.teamWrite(team.id, json);
      } catch {
        /* hors Tauri / test sans backend : l'état mémoire suffit */
      }
      setTeams((prev) => {
        const exists = prev.some((t) => t.id === team.id);
        return exists
          ? prev.map((t) => (t.id === team.id ? team : t))
          : [...prev, team];
      });
    },
    [api],
  );

  const load = useCallback(async (): Promise<void> => {
    let raw: string[] = [];
    try {
      raw = await api.teamList();
    } catch {
      raw = [];
    }
    const parsed = raw
      .map((text) => parseTeamText(text))
      .filter((t): t is Team => t !== null);
    setTeams(parsed);
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Résolution (lecture) ---

  const teamById = useCallback(
    (id: string): Team | null =>
      teamsRef.current.find((t) => t.id === id) ?? null,
    [],
  );

  const coordinatorOf = useCallback((team: Team): Persona | null => {
    return (
      team.personas.find((p) => p.id === team.coordinator) ??
      team.personas[0] ??
      null
    );
  }, []);

  // --- Définition (écriture) ---

  const upsertTeam = useCallback(
    async (team: Team): Promise<void> => {
      await persistTeam(team);
    },
    [persistTeam],
  );

  const removeTeam = useCallback(
    async (teamId: string): Promise<void> => {
      try {
        await api.teamDelete(teamId);
      } catch {
        /* dégradation mémoire */
      }
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    },
    [api],
  );

  const upsertPersona = useCallback(
    async (teamId: string, persona: Persona): Promise<void> => {
      const team = teamsRef.current.find((t) => t.id === teamId);
      if (!team) return;
      const exists = team.personas.some((p) => p.id === persona.id);
      const personas = exists
        ? team.personas.map((p) => (p.id === persona.id ? persona : p))
        : [...team.personas, persona];
      // Première persona d'une team vide → coordinateur par défaut.
      const coordinator = team.coordinator || personas[0]?.id || "";
      await persistTeam({ ...team, personas, coordinator });
    },
    [persistTeam],
  );

  const removePersona = useCallback(
    async (teamId: string, personaId: string): Promise<void> => {
      const team = teamsRef.current.find((t) => t.id === teamId);
      if (!team) return;
      // Garde : on ne retire pas le coordinateur courant (en désigner un autre d'abord).
      if (team.coordinator === personaId && team.personas.length > 1) return;
      const personas = team.personas.filter((p) => p.id !== personaId);
      const coordinator = personas.some((p) => p.id === team.coordinator)
        ? team.coordinator
        : (personas[0]?.id ?? "");
      await persistTeam({ ...team, personas, coordinator });
    },
    [persistTeam],
  );

  const setCoordinator = useCallback(
    async (teamId: string, personaId: string): Promise<void> => {
      const team = teamsRef.current.find((t) => t.id === teamId);
      if (!team) return;
      // Coordinateur invalide refusé (garde de cohérence).
      if (!team.personas.some((p) => p.id === personaId)) return;
      await persistTeam({ ...team, coordinator: personaId });
    },
    [persistTeam],
  );

  const attachConnector = useCallback(
    async (teamId: string, connectorId: string): Promise<void> => {
      const team = teamsRef.current.find((t) => t.id === teamId);
      if (!team || connectorId.trim().length === 0) return;
      if (team.connectors.includes(connectorId)) return;
      await persistTeam({
        ...team,
        connectors: [...team.connectors, connectorId],
      });
    },
    [persistTeam],
  );

  const detachConnector = useCallback(
    async (teamId: string, connectorId: string): Promise<void> => {
      const team = teamsRef.current.find((t) => t.id === teamId);
      if (!team) return;
      await persistTeam({
        ...team,
        connectors: team.connectors.filter((c) => c !== connectorId),
      });
    },
    [persistTeam],
  );

  return useMemo(
    () => ({
      teams,
      loaded,
      teamById,
      coordinatorOf,
      upsertTeam,
      removeTeam,
      upsertPersona,
      removePersona,
      setCoordinator,
      attachConnector,
      detachConnector,
      reload: load,
    }),
    [
      teams,
      loaded,
      teamById,
      coordinatorOf,
      upsertTeam,
      removeTeam,
      upsertPersona,
      removePersona,
      setCoordinator,
      attachConnector,
      detachConnector,
      load,
    ],
  );
}

/** Type ré-exporté pour les consommateurs (connecteurs déclarés par id au MVP). */
export type { Connector };
