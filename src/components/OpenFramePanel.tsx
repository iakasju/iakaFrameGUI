/**
 * OpenFramePanel — l'action **« Open frame »** (G3/G4, `open-frame-gui-stefframe2.md`). Un point
 * d'entrée qui : `pickDirectory()` → `setIakaframeHome(dir)` → **charge les 11 types** du frame
 * (8 atomes de pool en contenu via `poolReadAll`/G1 + 3 assemblages teams/methods/bindings via
 * `libraryList`, `bindings` câblé G2) → **affiche les comptes** par type + le verdict d'**intégrité
 * référentielle** de l'ensemble chargé (G4). Réutilise le plumbing racine existant (le sélecteur
 * natif + l'override persisté de `SettingsRoot`) — aucun manifeste de frame requis.
 *
 * LOT 2 (G6) : le frame chargé est désormais un **conteneur `Frame` de 1er ordre** (`@iakaframe/core`)
 * — sous les comptes + l'intégrité, on affiche la **facette portefeuille** (l'étage Odin : scaffold
 * `portfolio`, persona du rôle `portefeuille`, backlog transverse) + l'**assemblage résolu**
 * (méthode · team · binding). Read-only : on charge/affiche, on n'édite pas. Backend injectable (tests).
 */
import { useCallback, useState } from "react";
import { backend, type Backend } from "../api/backend";
import {
  FRAME_TYPES,
  FRAME_TYPE_LABELS,
  loadFrame,
  type Frame,
} from "../forge/frame";

export function OpenFramePanel({ api = backend }: { api?: Backend }) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Charge le frame de la racine courante (sans re-sélectionner de dossier). */
  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setFrame(await loadFrame(api));
    } catch {
      setError("Chargement du frame impossible (racine introuvable ?).");
    } finally {
      setBusy(false);
    }
  }, [api]);

  /** « Open frame » : choisir un dossier → le fixer comme racine → charger le frame. */
  const openFrame = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dir = await api.pickDirectory();
      if (!dir) return; // annulation utilisateur : on ne change rien.
      await api.setIakaframeHome(dir);
      setFrame(await loadFrame(api));
    } catch {
      setError("Ouverture du frame impossible.");
    } finally {
      setBusy(false);
    }
  }, [api]);

  const integrity = frame?.integrity;

  return (
    <section className="open-frame" aria-label="Ouvrir un frame iakaframe">
      <h3>Ouvrir un frame</h3>
      <p className="settings-hint">
        Pointe la racine d'un frame (ex. <code>StefFrame2/</code>) : la GUI charge et compte les
        11 types (8 pools <code>library/</code> + teams · méthodes · bindings à plat).
      </p>
      <div className="settings-actions">
        <button type="button" className="docbtn" disabled={busy} onClick={() => void openFrame()}>
          Ouvrir un frame…
        </button>
        <button
          type="button"
          className="docbtn"
          disabled={busy}
          onClick={() => void load()}
          title="Recharger depuis la racine courante"
        >
          Recharger
        </button>
      </div>

      {error && (
        <p className="settings-line err" role="alert">
          {error}
        </p>
      )}

      {frame && (
        <>
          {frame.root && (
            <p className="settings-line">
              Racine : <code className="home-path">{frame.root}</code>
            </p>
          )}
          <table className="frame-counts">
            <thead>
              <tr>
                <th>Type</th>
                <th>Compte</th>
              </tr>
            </thead>
            <tbody>
              {FRAME_TYPES.map((type) => (
                <tr key={type}>
                  <td>{FRAME_TYPE_LABELS[type]}</td>
                  <td
                    className="count"
                    aria-label={`${FRAME_TYPE_LABELS[type]} : ${frame.counts[type]}`}
                  >
                    {frame.counts[type]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {integrity && (
            <p
              className={`settings-line frame-integrity${integrity.ok ? " ok" : " err"}`}
              role={integrity.ok ? undefined : "alert"}
            >
              {integrity.ok ? (
                <>Intégrité référentielle : 0 référence cassée.</>
              ) : (
                <>
                  Intégrité : {integrity.missing.length} référence(s) cassée(s) —{" "}
                  {integrity.missing
                    .map((m) => `${m.source}.${m.field} → ${m.id}`)
                    .join(", ")}
                </>
              )}
            </p>
          )}

          {/* Facette portefeuille (l'étage Odin) — read-only, dérivée, aucun I/O neuf (G6). */}
          <div className="frame-portfolio" aria-label="Portefeuille (étage Odin)">
            <h4>Portefeuille (étage Odin)</h4>
            <p className="settings-line">
              Scaffold portefeuille : <code>{frame.portfolio.scaffoldId ?? "—"}</code>
            </p>
            <p className="settings-line">
              Persona portefeuille (Odin) : <code>{frame.portfolio.personaId ?? "—"}</code>
            </p>
            <p className="settings-line">
              Backlog transverse : <code>{frame.portfolio.backlog ?? "—"}</code>
            </p>
          </div>

          {/* Assemblage résolu : méthode · team · binding (repli « — »). */}
          <p className="settings-line frame-assembly">
            Assemblage résolu : Méthode <code>{frame.assembly.method?.id ?? "—"}</code> · Team{" "}
            <code>{frame.assembly.team?.id ?? "—"}</code> · Binding{" "}
            <code>{frame.assembly.binding?.id ?? "—"}</code>
          </p>
        </>
      )}
    </section>
  );
}
