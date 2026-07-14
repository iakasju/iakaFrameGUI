/**
 * ForgeShell — la **coquille de la forge à trois ateliers** (E2b §9) : barre supérieure
 * (marque + onglets de 1er étage `Team · Méthode · Kit` + sélecteur de charte + « Livrer au
 * Cockpit → ») et, dessous, l'atelier actif dans un `.workbench` (rail + zone d'édition).
 *
 * Autorités du modèle centralisées ICI (pas de god-component réparti) : `useForgeTeams` (Team
 * PURE, persistée), `useForgeMethod` (Méthode éditée, locale — persistance différée), `useForgeHandoff`
 * (livraison au Cockpit). Une **team de départ** est semée si le workspace est vide (gabarit AR-5),
 * pour que les ateliers aient un élément à éditer. La **charte Cinabre** est la charte par défaut.
 */
import { useEffect, useState } from "react";
import { buildTeamFromRoster } from "@iakaframe/core";
import { useForgeTeams } from "../hooks/useForgeTeams";
import { useForgeHandoff } from "../hooks/useForgeHandoff";
import { useForgeMethod } from "./useForgeMethod";
import { CharteSelector } from "../components/CharteSelector";
import { TeamAtelier } from "./ateliers/TeamAtelier";
import { MethodeAtelier } from "./ateliers/MethodeAtelier";
import { KitAtelier } from "./ateliers/KitAtelier";

type Tab = "team" | "methode" | "kit";

const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: "team", label: "Team", sub: "casting pur" },
  { key: "methode", label: "Méthode", sub: "discipline · workflow" },
  { key: "kit", label: "Kit", sub: "assemblage total" },
];

export function ForgeShell() {
  const forge = useForgeTeams();
  const handoff = useForgeHandoff();
  const { method, insert } = useForgeMethod();
  const [tab, setTab] = useState<Tab>("team");

  // Team de départ (gabarit AR-5) si le workspace est vide, pour avoir un élément à éditer.
  useEffect(() => {
    if (forge.loaded && forge.teams.length === 0) {
      void forge.upsertTeam(buildTeamFromRoster("Team iakaframe", "iakaframe"));
    }
  }, [forge.loaded, forge.teams.length, forge]);

  const team = forge.teams[0] ?? null;

  return (
    <div className="forge">
      <div className="topbar">
        <span className="brand">
          iaka<span className="f">Frame</span>GUI
        </span>
        <div className="tabs" role="tablist" aria-label="Ateliers de la forge">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab${tab === t.key ? " on" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="subl">{t.sub}</span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <span className="charte-pick">
          <CharteSelector />
        </span>
        <button
          type="button"
          className="to-cockpit"
          disabled={team === null || handoff.delivering}
          title={team ? "Livrer le kit assemblé au Cockpit (handoff)" : "Aucune team à livrer"}
          onClick={() => team && void handoff.deliver(team)}
        >
          <span className="d" />
          {handoff.delivering ? "Livraison…" : "Livrer au Cockpit →"}
        </button>
      </div>

      <div className="workbench">
        {team === null ? (
          <div className="edit">
            <p className="empty">Chargement de l'atelier…</p>
          </div>
        ) : tab === "team" ? (
          <TeamAtelier forge={forge} team={team} />
        ) : tab === "methode" ? (
          <MethodeAtelier method={method} insert={insert} />
        ) : (
          <KitAtelier method={method} team={team} />
        )}
      </div>

      {handoff.result && (
        <div style={{ padding: "8px 22px" }}>
          {handoff.result.error ? (
            <p className="empty" role="alert">
              Échec de la livraison : {handoff.result.error}
            </p>
          ) : (
            <p className="empty">
              Livré dans <code>{handoff.result.dir}</code> — empreinte{" "}
              <code>{handoff.result.originHash}</code>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
