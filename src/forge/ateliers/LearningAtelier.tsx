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
import type { UseForgeRetrait } from "../../hooks/useForgeRetrait";
import { RetraitPanel } from "./RetraitPanel";
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

export function LearningAtelier({
  learning,
  retrait,
}: {
  learning: UseForgeLearning;
  /** Pilote du retrait symétrique +/− (S6). Optionnel : absent = panneau non rendu (tests unitaires). */
  retrait?: UseForgeRetrait;
}) {
  const {
    ready,
    loading,
    error,
    proposals,
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
        // État d'ERREUR : aveu honnête et lisible du pilote qui n'a pas pu charger — jamais un blanc,
        // jamais une stack. Le message d'erreur brut de `review` est relayé tel quel (verbatim).
        <div className="learning-empty error" role="alert">
          <p className="le-title">Impossible de charger le réservoir de propositions.</p>
          <p className="le-hint">
            Le pilote <code>iakaframe review</code> n'a pas répondu : <em>{error}</em>. Vérifie que{" "}
            <code>iakaframe</code> est installé (PATH) ou que la racine bibliothèque est définie
            (Réglages), puis <strong>Rafraîchis</strong>.
          </p>
        </div>
      ) : loading && proposals.length === 0 ? (
        // État de CHARGEMENT : le pilote interroge `review` — feedback explicite au lieu de laisser
        // surgir l'état vide (garde n'affiche pas « aucune proposition » avant d'avoir la réponse).
        <p className="empty" role="status" aria-live="polite">
          Chargement des propositions…
        </p>
      ) : visible.length === 0 ? (
        // État VIDE FRANC : 0 proposition n'est pas une panne. On dit clairement ce qu'EST cette page
        // (réservoir de propositions de `review`, validées/rejetées par geste humain) — aucune
        // proposition factice n'est fabriquée (honnêteté § 2).
        <div className="learning-empty" role="note">
          <p className="le-title">
            {filter === "en-attente"
              ? "Aucune proposition en attente."
              : "Aucune proposition pour ce filtre."}
          </p>
          <p className="le-hint">
            Cette page est le <strong>réservoir des propositions d'apprentissage</strong> produites
            par <code>iakaframe review</code> : chaque entrée s'y <strong>valide</strong> ou s'y{" "}
            <strong>rejette</strong> par un geste humain explicite. Rien à traiter pour l'instant — de
            nouvelles propositions apparaîtront ici après un cycle de revue.
          </p>
        </div>
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

      {/* Retrait symétrique +/− (S6) : le `−` aussi accessible que le `+`, sous la revue. */}
      {retrait && <RetraitPanel retrait={retrait} />}
    </div>
  );
}
