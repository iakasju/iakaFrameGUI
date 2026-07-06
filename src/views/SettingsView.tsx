/**
 * SettingsView — réglages minimaux (P1). Affiche le **dossier de travail** (workspace) où
 * sont persistées les teams, et un rappel de l'invariant AR-1. Aucun secret manipulé en P1.
 */
import { useEffect, useState } from "react";
import { backend } from "../api/backend";
import { CharteSelector } from "../components/CharteSelector";

export function SettingsView() {
  const [workspace, setWorkspace] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    backend
      .workspacePath()
      .then((p) => alive && setWorkspace(p))
      .catch(() => alive && setError("Hors Tauri : workspace résolu côté Rust au lancement de l'app."));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="view">
      <h2>Réglages</h2>
      <p className="sub">Forge iakaFrameGUI — MVP.</p>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Charte visuelle</h3>
        <p className="sub" style={{ marginBottom: 8 }}>
          Habille l'UI de la forge. Cinabre par défaut ; le choix est mémorisé et
          réappliqué au prochain lancement.
        </p>
        <CharteSelector />
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Dossier de travail (workspace)</h3>
        <p className="sub" style={{ marginBottom: 8 }}>
          Les teams sont enregistrées en fichiers JSON, un fichier par team.
        </p>
        <p>
          <span className="badge">{workspace || error || "…"}</span>
        </p>
        <p className="sub">
          Emplacement : <code>&lt;chapeau ~/work&gt;/iakaframegui-workspace/teams/*.json</code> (Q-1).
        </p>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Invariant « team pure » (AR-1)</h3>
        <p className="sub" style={{ marginBottom: 0 }}>
          Une team forgée ne porte jamais de runner ni de modèle : ce couple est run-time,
          côté Cockpit. La forge fabrique des teams pures et les déploiera (P3) — elle ne
          les exécute pas.
        </p>
      </div>
    </div>
  );
}
