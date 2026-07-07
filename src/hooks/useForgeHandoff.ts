/**
 * useForgeHandoff — AUTORITÉ du flux **livraison de handoff** (H1), séparé de `useForgeTeams`
 * et `useForgeDeploy` (single-responsibility). « Livrer » = déposer le paquet de handoff
 * (`team.json` PURE + `handoff.json` provenance) d'une team dans le canal partagé, pour que le
 * cockpit le réceptionne.
 *
 * Flux : (1) horloge du backend (`nowMillis`, jamais `Date.now()`) → (2) `buildHandoffPackage`
 * (PUR, `@iakaframe/core`) → (3) écriture via la **façade unique** (`handoffDeliver`, autorité
 * `handoff.rs` Rust). Hors Tauri (dev front pur / tests), la façade est mockée ; on ne casse
 * jamais le rendu.
 */
import { useCallback, useMemo, useState } from "react";
import { buildHandoffPackage, type Team } from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";

/** Résultat d'une livraison (surface pour l'UI). */
export interface DeliverResult {
  /** Id de la team livrée. */
  teamId: string;
  /** Dossier du canal où le paquet a été déposé. */
  dir: string;
  /** Empreinte du `team.json` livré (provenance). */
  originHash: string;
  /** Horodatage ISO de la livraison. */
  timestamp: string;
  /** Message d'erreur si la livraison a échoué. */
  error?: string;
}

export interface UseForgeHandoff {
  delivering: boolean;
  result: DeliverResult | null;
  /** Livre le paquet de handoff d'une team dans le canal partagé. */
  deliver: (team: Team) => Promise<void>;
  /** Efface le dernier résultat (ex. après changement de sélection). */
  clear: () => void;
}

export interface UseForgeHandoffDeps {
  api?: Backend;
}

export function useForgeHandoff(deps: UseForgeHandoffDeps = {}): UseForgeHandoff {
  const api = deps.api ?? backend;

  const [delivering, setDelivering] = useState<boolean>(false);
  const [result, setResult] = useState<DeliverResult | null>(null);

  const deliver = useCallback(
    async (team: Team): Promise<void> => {
      setDelivering(true);
      try {
        const now = await api.nowMillis();
        const pkg = buildHandoffPackage(team, now);
        const dir = await api.handoffDeliver(team.id, pkg.teamJson, pkg.handoffJson);
        setResult({
          teamId: team.id,
          dir,
          originHash: pkg.manifest.originHash,
          timestamp: pkg.manifest.timestamp,
        });
      } catch (e) {
        setResult({
          teamId: team.id,
          dir: "",
          originHash: "",
          timestamp: "",
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setDelivering(false);
      }
    },
    [api],
  );

  const clear = useCallback((): void => setResult(null), []);

  return useMemo(
    () => ({ delivering, result, deliver, clear }),
    [delivering, result, deliver, clear],
  );
}
