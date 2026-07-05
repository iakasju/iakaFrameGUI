/**
 * App — shell + navigation minimale de la forge (Personas · Teams · Réglages).
 *
 * Pas de god-component : `App` ne fait que la navigation. L'unique instance de
 * `useForgeTeams` (autorité du modèle) est créée ici et passée aux vues ; toute écriture y
 * passe, tout I/O passe par la façade unique. Aucune notion de runner/modèle (AR-1).
 */
import { useState } from "react";
import { useForgeTeams } from "./hooks/useForgeTeams";
import { PersonasView } from "./views/PersonasView";
import { TeamsView } from "./views/TeamsView";
import { SettingsView } from "./views/SettingsView";

type Nav = "personas" | "teams" | "settings";

const TABS: { key: Nav; label: string }[] = [
  { key: "personas", label: "Personas" },
  { key: "teams", label: "Teams" },
  { key: "settings", label: "Réglages" },
];

export default function App() {
  const [nav, setNav] = useState<Nav>("teams");
  const forge = useForgeTeams();

  return (
    <div className="app">
      <nav className="rail">
        <h1>⚒ iakaFrameGUI</h1>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={nav === t.key ? "active" : ""}
            onClick={() => setNav(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="sub" style={{ padding: "0 8px", fontSize: 11 }}>
          {forge.loaded ? `${forge.teams.length} team(s)` : "chargement…"}
        </span>
      </nav>

      {nav === "personas" && <PersonasView forge={forge} />}
      {nav === "teams" && <TeamsView forge={forge} />}
      {nav === "settings" && <SettingsView />}
    </div>
  );
}
