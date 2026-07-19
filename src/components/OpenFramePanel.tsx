/**
 * OpenFramePanel — l'action **« Open frame »** (G3/G4, `open-frame-gui-stefframe2.md`). Un point
 * d'entrée qui : `pickDirectory()` → `setIakaframeHome(dir)` → **charge les 11 types** du frame
 * (8 atomes de pool en contenu via `poolReadAll`/G1 + 3 assemblages teams/methods/bindings via
 * `libraryList`, `bindings` câblé G2) → **affiche les comptes** par type + le verdict d'**intégrité
 * référentielle** de l'ensemble chargé (G4). Réutilise le plumbing racine existant (le sélecteur
 * natif + l'override persisté de `SettingsRoot`) — aucun manifeste de frame requis.
 *
 * LOT 1 (socle mécanique) : inventaire simple, PAS d'entité Portfolio de 1er ordre (G6/LOT 2).
 * Read-only : on charge/affiche, on n'édite pas. Backend injectable (tests).
 */
import { useCallback, useState } from "react";
import { backend, type Backend } from "../api/backend";
import {
  FRAME_TYPES,
  loadFrame,
  type FrameInventory,
  type FrameType,
} from "../forge/frame";

/** Libellés d'affichage des 11 types (ordre `FRAME_TYPES` : 8 pools puis 3 assemblages). */
const TYPE_LABELS: Record<FrameType, string> = {
  personas: "Personas",
  roles: "Rôles",
  principles: "Principes",
  rituals: "Rituels",
  guardrails: "Gardes-fous",
  scaffolds: "Scaffolds",
  workflows: "Workflows",
  skills: "Skills",
  teams: "Teams",
  methods: "Méthodes",
  bindings: "Bindings",
};

export function OpenFramePanel({ api = backend }: { api?: Backend }) {
  const [inventory, setInventory] = useState<FrameInventory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Charge le frame de la racine courante (sans re-sélectionner de dossier). */
  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setInventory(await loadFrame(api));
    } catch {
      setError("Chargement du frame impossible (racine introuvable ?).");
    } finally {
      setBusy(false);
    }
  }, [api]);

  /** « Open frame » : choisir un dossier → le fixer comme racine → charger l'inventaire. */
  const openFrame = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dir = await api.pickDirectory();
      if (!dir) return; // annulation utilisateur : on ne change rien.
      await api.setIakaframeHome(dir);
      setInventory(await loadFrame(api));
    } catch {
      setError("Ouverture du frame impossible.");
    } finally {
      setBusy(false);
    }
  }, [api]);

  const integrity = inventory?.integrity;

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

      {inventory && (
        <>
          {inventory.root && (
            <p className="settings-line">
              Racine : <code className="home-path">{inventory.root}</code>
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
                  <td>{TYPE_LABELS[type]}</td>
                  <td className="count" aria-label={`${TYPE_LABELS[type]} : ${inventory.counts[type]}`}>
                    {inventory.counts[type]}
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
        </>
      )}
    </section>
  );
}
