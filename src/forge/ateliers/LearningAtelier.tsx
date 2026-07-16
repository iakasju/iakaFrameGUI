/**
 * LearningAtelier — l'onglet **« Apprentissage »** de la forge (U2, surface-apprentissage.md).
 *
 * Vue graphique du **réservoir de propositions** : lister (défaut `en-attente` + filtre historique,
 * Q-4), voir le détail (sans éditeur, Q-5), **Valider** / **Rejeter** (boutons JUMEAUX, symétrie
 * +/− § 6). Le **garde de consentement** est rendu **visible** (structurel/PROFIL = « geste humain
 * requis ») mais **jamais contourné** : aucun bouton d'auto-application n'existe ici ; `Valider`
 * exécute `review apply` sur **clic humain explicite**, et `review`/`classify()` reste l'unique
 * autorité (la GUI ne re-décide rien). Purement présentationnel : toute la logique vit dans
 * `useForgeLearning` (pilote de `review`).
 */
import {
  isStructural,
  requiresHumanGesture,
  type LearningFilter,
  type UseForgeLearning,
} from "../../hooks/useForgeLearning";
import type { ReviewProposal } from "../../api/backend";

const FILTERS: { key: LearningFilter; label: string }[] = [
  { key: "en-attente", label: "En attente" },
  { key: "applique", label: "Appliquées" },
  { key: "rejete", label: "Rejetées" },
  { key: "all", label: "Toutes" },
];

const STATUS_MARK: Record<string, string> = {
  "en-attente": "•",
  applique: "✓",
  rejete: "✗",
};

/** Badge de politique de consentement (rendu visible, jamais contourné). */
function ConsentBadge({ p }: { p: ReviewProposal }) {
  if (isStructural(p)) {
    return (
      <span className="consent structural" title="Amendement structurel : geste humain requis, jamais auto.">
        structurel — geste humain requis
      </span>
    );
  }
  if (requiresHumanGesture(p)) {
    return (
      <span className="consent file" title="En file : approbation humaine explicite requise.">
        geste humain requis
      </span>
    );
  }
  return (
    <span className="consent auto" title="Auto-applicable (REGISTRE) selon la politique de review.">
      auto-applicable (REGISTRE)
    </span>
  );
}

export function LearningAtelier({ learning }: { learning: UseForgeLearning }) {
  const {
    ready,
    loading,
    error,
    visible,
    filter,
    detail,
    outcome,
    busyId,
    setFilter,
    refresh,
    view,
    closeDetail,
    apply,
    reject,
  } = learning;

  return (
    <div className="learning">
      <div className="learning-head">
        <div className="learning-title">
          <h2>Apprentissage</h2>
          <p className="sub">
            Propositions du réservoir — fenêtre sur <code>iakaframe review</code> (source unique).
          </p>
        </div>
        <div className="learning-filters" role="tablist" aria-label="Filtre de statut">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`chip${filter === f.key ? " on" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" className="learning-refresh" onClick={() => void refresh()} disabled={!ready || loading}>
          {loading ? "Chargement…" : "Rafraîchir"}
        </button>
      </div>

      {outcome && (
        <p className={`learning-outcome${outcome.ok ? " ok" : " ko"}`} role="status">
          {outcome.message}
        </p>
      )}

      {!ready ? (
        <p className="empty" role="note">
          Hors contexte forge (Tauri) — la revue passe par la CLI <code>iakaframe review</code>.
        </p>
      ) : error ? (
        <p className="empty" role="alert">
          Réservoir inaccessible : {error}. Vérifie que <code>iakaframe</code> est installé (PATH) ou
          que la racine bibliothèque est définie (Réglages).
        </p>
      ) : visible.length === 0 ? (
        <p className="empty" role="note">
          {filter === "en-attente"
            ? "Aucune proposition en attente — le réservoir est à jour."
            : "Aucune proposition pour ce filtre."}
        </p>
      ) : (
        <ul className="learning-list">
          {visible.map((p) => {
            const pending = p.status === "en-attente";
            const busy = busyId === p.id;
            return (
              <li key={p.id} className={`learning-item ${p.status}`}>
                <div className="li-main">
                  <span className={`li-mark ${p.status}`} aria-hidden="true">
                    {STATUS_MARK[p.status] ?? "•"}
                  </span>
                  <span className={`li-type ${p.type}`}>{p.type}</span>
                  {p.target && <span className="li-target">→ {p.target}</span>}
                  <span className="li-id">{p.id}</span>
                  <ConsentBadge p={p} />
                </div>
                <div className="li-actions">
                  <button type="button" className="act view" onClick={() => void view(p.id)}>
                    Voir
                  </button>
                  {/* Boutons JUMEAUX (symétrie +/−) : même proéminence, tous deux de premier plan. */}
                  <button
                    type="button"
                    className="act apply"
                    disabled={!pending || busy}
                    title={pending ? "Valider (review apply) — geste humain explicite" : `Déjà ${p.status}`}
                    onClick={() => void apply(p.id)}
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    className="act reject"
                    disabled={!pending || busy}
                    title={pending ? "Rejeter (review reject) — rien matérialisé" : `Déjà ${p.status}`}
                    onClick={() => void reject(p.id)}
                  >
                    Rejeter
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {detail && (
        <div className="learning-detail" role="dialog" aria-label={`Détail : ${detail.proposal.id}`}>
          <div className="ld-head">
            <span className="ld-id">{detail.proposal.id}</span>
            <button type="button" className="ld-close" onClick={closeDetail} aria-label="Fermer le détail">
              ✕
            </button>
          </div>
          {/* Aperçu en lecture seule (Q-5 : aucun éditeur d'artefact avant validation). */}
          <pre className="ld-body">{detail.text}</pre>
        </div>
      )}
    </div>
  );
}
