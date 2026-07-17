/**
 * OpenFramePanel — surface de l'action « Open frame » (G3/G4, open-frame-gui-stefframe2.md). Un
 * bouton « Ouvrir un frame… » (réutilise `pickDirectory` + `setIakaframeHome` via `useOpenFrame`),
 * puis l'affichage du frame chargé **comme UN conteneur Portfolio** (le super-étage G6) :
 *   - l'**inventaire des 11 types** avec leurs comptes (critère A) ;
 *   - la **facette portefeuille** : scaffold `portfolio`, persona `odin`, backlog transverse (F) ;
 *   - l'**assemblage résolu** method + team + binding ;
 *   - le **verdict d'intégrité** référentielle dans le périmètre du frame (critère B).
 *
 * Read-only au MVP (on charge/affiche ; l'édition de cet étage est différée). Backend injectable.
 */
import {
  FRAME_ELEMENT_TYPES,
  frameCounts,
  frameTotal,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { useOpenFrame } from "../forge/useOpenFrame";

/** Libellés d'affichage des 11 types (ordre canonique). */
const TYPE_LABELS: Record<(typeof FRAME_ELEMENT_TYPES)[number], string> = {
  personas: "personas",
  roles: "roles",
  principles: "principles",
  rituals: "rituals",
  guardrails: "guardrails",
  scaffolds: "scaffolds",
  workflows: "workflows",
  skills: "skills",
  methods: "methods",
  teams: "teams",
  bindings: "bindings",
};

export function OpenFramePanel({ api = backend }: { api?: Backend }) {
  const { frame, busy, error, openFrame } = useOpenFrame(api);

  const counts = frame ? frameCounts(frame.portfolio) : null;
  const total = frame ? frameTotal(frame.portfolio) : 0;
  const facet = frame?.portfolio.facet;
  const assembly = frame?.portfolio.assembly;
  const refs = frame?.refs;

  return (
    <section className="open-frame" aria-label="Ouvrir un frame iakaframe">
      <h3>Frame (portefeuille)</h3>
      <p className="settings-hint">
        Ouvre un dossier de frame et charge ses 11 types comme un conteneur Portefeuille (super-étage
        Odin) : inventaire, assemblage résolu et intégrité référentielle.
      </p>
      <div className="settings-actions">
        <button type="button" className="docbtn" disabled={busy} onClick={() => void openFrame()}>
          {busy ? "Chargement…" : "Ouvrir un frame…"}
        </button>
      </div>

      {error && (
        <p className="settings-line err" role="alert">
          {error}
        </p>
      )}

      {frame && counts && (
        <div className="frame-report">
          <p className="settings-line">
            Racine : <code className="home-path">{frame.portfolio.root}</code> — {total} éléments.
          </p>

          <ul className="frame-counts" aria-label="Inventaire des 11 types">
            {FRAME_ELEMENT_TYPES.map((t) => (
              <li key={t} className="frame-count">
                <span className="frame-count-n">{counts[t]}</span> {TYPE_LABELS[t]}
              </li>
            ))}
          </ul>

          <p className="settings-line" aria-label="Facette portefeuille">
            Niveau portefeuille — scaffold&nbsp;:{" "}
            <code>{facet?.portfolioScaffoldId ?? "—"}</code>, persona&nbsp;:{" "}
            <code>{facet?.odinPersonaId ?? "—"}</code>, backlog&nbsp;:{" "}
            <code>{facet?.backlogPath ?? "—"}</code>
          </p>

          <p className="settings-line" aria-label="Assemblage résolu">
            Assemblage — méthode&nbsp;: <code>{assembly?.method?.id ?? "—"}</code>, team&nbsp;:{" "}
            <code>{assembly?.team?.id ?? "—"}</code>, binding&nbsp;:{" "}
            <code>{assembly?.binding?.id ?? "—"}</code>
          </p>

          {refs && (
            <p
              className={`settings-line${refs.ok ? "" : " err"}`}
              role={refs.ok ? undefined : "alert"}
            >
              Intégrité référentielle :{" "}
              {refs.ok ? "0 erreur." : `${refs.missing.length} référence(s) manquante(s).`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
