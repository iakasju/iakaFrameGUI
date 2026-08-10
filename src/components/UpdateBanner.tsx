/**
 * UpdateBanner — bandeau **discret et non modal** du contrôle de version (auto-update.md, étape 5).
 *
 * Il ne s'affiche que quand il a quelque chose à dire : une version disponible, un téléchargement en
 * cours, une installation prête — ou une erreur **explicitement demandée** (contrôle manuel). Les
 * états `idle`, `checking` et `up-to-date`, ainsi que l'erreur **silencieuse** du contrôle au
 * démarrage, ne rendent **rien** : une box éteinte reste invisible (C2).
 *
 * Aucune couleur en dur : tout passe par les tokens de la charte active (thème commutable).
 */
import type { UseAppUpdate } from "../hooks/useAppUpdate";

export function UpdateBanner({ update }: { update: UseAppUpdate }) {
  const { status, version, progressPct, error, errorVisible } = update;

  const showError = status === "error" && errorVisible;
  const visible =
    status === "available" || status === "downloading" || status === "ready" || showError;
  if (!visible) return null;

  if (showError) {
    return (
      <div className="update-banner err" role="alert">
        <span className="update-banner-msg">
          Contrôle des mises à jour impossible{error ? ` : ${error}` : "."}
        </span>
        <button
          type="button"
          className="update-banner-close"
          aria-label="Fermer le bandeau de mise à jour"
          onClick={update.dismiss}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="update-banner" role="status">
      <span className="update-banner-msg">
        {status === "available" ? (
          <>
            <b>Version {version} disponible</b>
          </>
        ) : status === "downloading" ? (
          <>
            Téléchargement de la version {version}
            {progressPct === null ? "…" : ` — ${progressPct} %`}
          </>
        ) : (
          <>Version {version} installée — redémarrage…</>
        )}
      </span>
      {status === "available" && (
        <button
          type="button"
          className="update-banner-action"
          onClick={() => void update.install()}
        >
          Installer et redémarrer
        </button>
      )}
      {status === "downloading" && progressPct !== null && (
        <span
          className="update-banner-bar"
          aria-hidden="true"
          style={{ ["--pct" as string]: `${progressPct}%` }}
        />
      )}
      <button
        type="button"
        className="update-banner-close"
        aria-label="Fermer le bandeau de mise à jour"
        onClick={update.dismiss}
      >
        ✕
      </button>
    </div>
  );
}
