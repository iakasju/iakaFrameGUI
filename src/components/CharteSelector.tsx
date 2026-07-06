/**
 * CharteSelector — sélecteur de charte visuelle (dans SettingsView).
 *
 * Liste les chartes du registre (Cinabre par défaut + NaonEdge). Choisir une charte
 * commute instantanément l'UI (data-theme) et persiste le choix. Aucun I/O backend :
 * la persistance passe par localStorage (mécanique P4), la façade unique reste intacte.
 */
import { useCharte } from "../theme/useCharte";

export function CharteSelector() {
  const { charte, setCharte, charts } = useCharte();

  return (
    <div className="field" style={{ marginBottom: 0, maxWidth: 260 }}>
      <label htmlFor="charte-select">Charte visuelle</label>
      <select
        id="charte-select"
        value={charte}
        onChange={(e) => setCharte(e.target.value)}
      >
        {charts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
            {c.default ? " (défaut)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
