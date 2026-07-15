/**
 * SettingsRoot — Réglages de la **racine bibliothèque `IAKAFRAME_HOME`** (§5), point de vérité
 * **partagé avec le CLI**. Affiche la racine résolue (découverte auto / env / override), permet un
 * **override manuel** (sélecteur de dossier natif) persisté dans `<workspace>/settings.json`, et
 * rappelle la commande `export IAKAFRAME_HOME=…` pour que le **CLI voie la même racine** (un GUI ne
 * peut pas fixer l'env d'un autre process — arbitrage Q-2). Backend injectable (tests).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";

export function SettingsRoot({ api = backend }: { api?: Backend }) {
  const [home, setHome] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    let resolved: string | null = null;
    try {
      resolved = await api.iakaframeHome();
    } catch {
      resolved = null;
    }
    setHome(resolved);
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const choose = useCallback(async () => {
    setBusy(true);
    try {
      const dir = await api.pickDirectory();
      if (dir) {
        await api.setIakaframeHome(dir);
        await refresh();
      }
    } catch {
      /* annulation / hors Tauri : on ne casse pas le rendu */
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await api.setIakaframeHome("");
      await refresh();
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  return (
    <section className="settings-root" aria-label="Racine de la bibliothèque iakaframe">
      <h3>Bibliothèque iakaframe</h3>
      {!loaded ? (
        <p className="empty">Résolution de la racine…</p>
      ) : home ? (
        <>
          <p className="settings-line">
            Racine résolue : <code className="home-path">{home}</code>
          </p>
          <p className="settings-hint">
            Pour que le CLI voie la même racine, exportez-la :{" "}
            <code>export IAKAFRAME_HOME={home}</code>
          </p>
        </>
      ) : (
        <p className="settings-line err" role="alert">
          Bibliothèque introuvable — définissez-la manuellement.
        </p>
      )}
      <div className="settings-actions">
        <button type="button" className="docbtn" disabled={busy} onClick={() => void choose()}>
          Choisir le dossier…
        </button>
        <button type="button" className="docbtn" disabled={busy} onClick={() => void reset()}>
          Réinitialiser (auto)
        </button>
      </div>
    </section>
  );
}
