/**
 * RetraitPanel — surface **« Retrait symétrique +/− »** (S6, symetrie-ajout-suppression.md), rendue
 * dans l'onglet Apprentissage sous la revue.
 *
 * PILOTE PUR des verbes CLI de retrait (via `useForgeRetrait`) — aucune logique RESTRICT / corbeille
 * / cascade / mutation réimplémentée ici (source unique = CLI). Deux volets :
 *   1. **Skill ↔ persona** (cas emblématique) : la liste `skills:[]` du persona (VUE Option 1 — le
 *      frontmatter est la seule vérité, jamais une section du corps), chaque **titre de skill**
 *      portant un `−` qui pilote `detach`. Une attache `+` symétrique complète la paire.
 *   2. **Retirer un artefact** (team/method/binding/skill) : pilote `remove` ; un refus **RESTRICT**
 *      affiche la **liste des référents** renvoyée par la CLI ; la **cascade** n'est offerte
 *      qu'après ce refus et exige un **geste humain explicite** (confirmation dédiée).
 *
 * Sûreté : aucun retrait sans clic humain ; le retrait est **non destructif** (corbeille horodatée,
 * chemin restitué). Purement présentationnel — toute la logique vit dans `useForgeRetrait`.
 */
import { useState } from "react";
import type { RemoveKind } from "../../api/backend";
import type { UseForgeRetrait } from "../../hooks/useForgeRetrait";

const REMOVE_KINDS: { key: RemoveKind; label: string }[] = [
  { key: "team", label: "team" },
  { key: "method", label: "method" },
  { key: "binding", label: "binding" },
  { key: "skill", label: "skill (dé-matérialiser)" },
];

export function RetraitPanel({ retrait }: { retrait: UseForgeRetrait }) {
  const {
    ready,
    loading,
    error,
    personas,
    skills,
    teams,
    methods,
    bindings,
    selectedPersona,
    personaSkillList,
    busy,
    outcome,
    refresh,
    selectPersona,
    detach,
    attach,
    remove,
    removeCascade,
  } = retrait;

  const [attachChoice, setAttachChoice] = useState("");
  const [removeKind, setRemoveKind] = useState<RemoveKind>("team");
  const [removeId, setRemoveId] = useState("");
  const [pendingCascade, setPendingCascade] = useState<{ kind: RemoveKind; id: string } | null>(null);

  const removeOptions =
    removeKind === "team"
      ? teams
      : removeKind === "method"
        ? methods
        : removeKind === "binding"
          ? bindings
          : skills;

  if (!ready) {
    return (
      <section className="retrait">
        <h3>Retrait symétrique +/−</h3>
        <p className="empty" role="note">
          Hors contexte forge (Tauri) — le retrait passe par la CLI{" "}
          <code>iakaframe detach / attach / remove</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="retrait">
      <div className="retrait-head">
        <div>
          <h3>Retrait symétrique +/−</h3>
          <p className="sub">
            Défaire ce qu'un <code>+</code> a ajouté — pilote{" "}
            <code>iakaframe detach / attach / remove</code> (source unique : RESTRICT + corbeille +
            cascade vivent dans la CLI).
          </p>
        </div>
        <button type="button" className="retrait-refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Chargement…" : "Rafraîchir"}
        </button>
      </div>

      {error && (
        <p className="empty" role="alert">
          Bibliothèque inaccessible : {error}. Vérifie que <code>iakaframe</code> est installé (PATH)
          ou que la racine bibliothèque est définie (Réglages).
        </p>
      )}

      {outcome && (
        <div className={`retrait-outcome${outcome.ok ? " ok" : " ko"}`} role="status">
          <p>{outcome.message}</p>
          {outcome.referrers && outcome.referrers.length > 0 && (
            <ul className="referrers">
              {outcome.referrers.map((r) => (
                <li key={`${r.type}:${r.id}:${r.field}`}>
                  référent : <b>{r.type}</b> {r.id} <span className="field">(champ {r.field})</span>
                </li>
              ))}
            </ul>
          )}
          {/* Cascade offerte UNIQUEMENT après un refus RESTRICT, et derrière un geste humain explicite. */}
          {outcome.restrict && (
            <div className="cascade">
              {pendingCascade &&
              pendingCascade.kind === outcome.restrict.kind &&
              pendingCascade.id === outcome.restrict.id ? (
                <>
                  <span className="warn">
                    Confirmer la cascade : elle archivera/détachera aussi les référents ci-dessus
                    (équivalent <code>--cascade --yes</code>). Non destructif (corbeille), restaurable.
                  </span>
                  <button
                    type="button"
                    className="act cascade-confirm"
                    disabled={busy}
                    onClick={() => {
                      const t = outcome.restrict!;
                      setPendingCascade(null);
                      void removeCascade(t.kind, t.id);
                    }}
                  >
                    Confirmer la cascade
                  </button>
                  <button type="button" className="act cancel" onClick={() => setPendingCascade(null)}>
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="act cascade-arm"
                  disabled={busy}
                  onClick={() => setPendingCascade(outcome.restrict ?? null)}
                >
                  Retirer en cascade (référents inclus)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- Volet 1 : skill ↔ persona (cas emblématique) --- */}
      <div className="retrait-volet">
        <h4>Skill ↔ persona (détacher / attacher)</h4>
        <label className="field">
          <span>Persona</span>
          <select
            value={selectedPersona ?? ""}
            onChange={(e) => void selectPersona(e.target.value)}
          >
            <option value="" disabled>
              — choisir un persona —
            </option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.id})
              </option>
            ))}
          </select>
        </label>

        {selectedPersona && (
          <>
            {/* VUE Option 1 : le « titre du skill » rendu depuis skills:[], chaque titre porte un `−`. */}
            <ul className="skill-view" aria-label={`Skills de ${selectedPersona}`}>
              {personaSkillList.length === 0 ? (
                <li className="empty">Aucun skill attaché à ce persona.</li>
              ) : (
                personaSkillList.map((sid) => (
                  <li key={sid} className="skill-line">
                    <span className="skill-title">{sid}</span>
                    <button
                      type="button"
                      className="act detach"
                      disabled={busy}
                      title={`Détacher ${sid} de ${selectedPersona} (mute skills:[], réversible)`}
                      aria-label={`Détacher ${sid}`}
                      onClick={() => void detach(sid)}
                    >
                      − Détacher
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="attach-row">
              <select
                aria-label="Skill à attacher"
                value={attachChoice}
                onChange={(e) => setAttachChoice(e.target.value)}
              >
                <option value="" disabled>
                  — skill à attacher —
                </option>
                {skills
                  .filter((s) => !personaSkillList.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.id})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="act attach"
                disabled={busy || attachChoice.length === 0}
                onClick={() => {
                  if (attachChoice.length > 0) void attach(attachChoice);
                }}
              >
                + Attacher
              </button>
            </div>
          </>
        )}
      </div>

      {/* --- Volet 2 : retirer un artefact livré (le `−` de add + dé-matérialisation) --- */}
      <div className="retrait-volet">
        <h4>Retirer un artefact (RESTRICT par défaut, non destructif)</h4>
        <div className="remove-row">
          <select
            aria-label="Type d'artefact à retirer"
            value={removeKind}
            onChange={(e) => {
              setRemoveKind(e.target.value as RemoveKind);
              setRemoveId("");
            }}
          >
            {REMOVE_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Artefact à retirer"
            value={removeId}
            onChange={(e) => setRemoveId(e.target.value)}
          >
            <option value="" disabled>
              — {removeKind} à retirer —
            </option>
            {removeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} ({o.id})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="act remove"
            disabled={busy || removeId.length === 0}
            onClick={() => {
              if (removeId.length > 0) void remove(removeKind, removeId);
            }}
          >
            Retirer
          </button>
        </div>
        <p className="note">
          Un élément encore référencé est <b>refusé</b> (RESTRICT) avec la liste des référents ;
          l'artefact retiré est <b>archivé en corbeille</b> (restaurable), jamais supprimé sec.
        </p>
      </div>
    </section>
  );
}
