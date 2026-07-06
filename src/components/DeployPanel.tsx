/**
 * DeployPanel — **destination + déploiement** du kit (P4, U-4/U-5). Champ de chemin
 * destination + bouton **Parcourir…** (dialog natif via la façade unique), case **Écraser**
 * (`force`) et bouton **Déployer**. La **zone de résultat** rend explicite le retour de
 * `kit_deploy` : succès (N fichiers écrits), conflit (fichiers `skipped` non écrasés) ou
 * erreur — jamais de succès silencieux ni d'échec muet (§ 3.3).
 *
 * Présentationnel : l'écriture non destructive est portée par `kit_deploy` (Rust, inchangé),
 * surfacée via `useForgeDeploy.deploy` — ce composant ne touche jamais au disque directement.
 */
import type { DeployResult } from "../hooks/useForgeDeploy";

export function DeployPanel({
  destDir,
  force,
  result,
  canDeploy,
  deploying,
  onDestDirChange,
  onBrowse,
  onForceChange,
  onDeploy,
}: {
  destDir: string;
  force: boolean;
  result: DeployResult | null;
  canDeploy: boolean;
  deploying: boolean;
  onDestDirChange: (d: string) => void;
  onBrowse: () => void;
  onForceChange: (f: boolean) => void;
  onDeploy: () => void;
}) {
  return (
    <div className="panel">
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="dest-dir">Dossier destination</label>
          <input
            id="dest-dir"
            aria-label="Dossier destination"
            value={destDir}
            placeholder="/chemin/vers/projet"
            onChange={(e) => onDestDirChange(e.target.value)}
          />
        </div>
        <button className="btn ghost" type="button" onClick={onBrowse}>
          Parcourir…
        </button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <label className="checks" style={{ margin: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input
              type="checkbox"
              aria-label="Écraser les fichiers existants"
              checked={force}
              onChange={(e) => onForceChange(e.target.checked)}
              style={{ width: "auto" }}
            />
            Écraser les fichiers existants (force)
          </span>
        </label>
        <div style={{ flex: 1 }} />
        <button
          className="btn"
          type="button"
          disabled={!canDeploy}
          onClick={onDeploy}
        >
          {deploying ? "Déploiement…" : "Déployer"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 14 }} aria-label="Résultat du déploiement">
          {result.error ? (
            <p style={{ color: "var(--danger)" }}>
              ⚠ Échec : {result.error}
            </p>
          ) : (
            <>
              <p style={{ color: "var(--accent)", marginBottom: 6 }}>
                ✓ {result.written.length} fichier
                {result.written.length > 1 ? "s" : ""} écrit
                {result.written.length > 1 ? "s" : ""}.
              </p>
              {result.skipped.length > 0 && (
                <div>
                  <p style={{ color: "var(--danger)", marginBottom: 4 }}>
                    ⚠ {result.skipped.length} fichier
                    {result.skipped.length > 1 ? "s" : ""} non écrasé
                    {result.skipped.length > 1 ? "s" : ""} (cochez « Écraser »
                    pour forcer) :
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {result.skipped.map((p) => (
                      <li
                        key={p}
                        style={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
