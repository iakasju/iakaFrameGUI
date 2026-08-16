/**
 * WorkflowPanel — affichage **READ-ONLY** du workflow d'une team (P6, Q-2).
 *
 * Montre les phases/gates du workflow **résolu** (`resolveWorkflow`) : chaîne principale en
 * tableau + phases hors chaîne (`offChain`, ex. squad prod). **Aucun éditeur** au MVP (créer/
 * réordonner/changer les gates = lot ultérieur) : purement présentationnel, lecture seule.
 */
import {
  resolveWorkflow,
  roleLabel,
  type Gate,
  type Phase,
} from "@iakaframe/core";

/** Libellé lisible d'une gate (kind + condition), sans jargon de code. */
function gateText(gate: Gate): string {
  const kind = gate.kind === "human" ? "humain" : "auto";
  return gate.condition.length > 0 ? `${kind} — ${gate.condition}` : kind;
}

/** Cellule « Rôle » : override de calage sinon libellés canoniques (jamais un nom de code). */
function roleText(phase: Phase): string {
  return phase.roleDisplay ?? phase.roleKeys.map(roleLabel).join(" + ");
}

export function WorkflowPanel() {
  // E2 : le workflow appartient désormais à la **Méthode** (plus à la Team). Ajustement minimal
  // MVP → workflow **canonique** (repli sans méthode) ; le câblage Méthode↔vue relève de E2b.
  const workflow = resolveWorkflow();
  const phases = [...workflow.phases].sort((a, b) => a.order - b.order);
  const mainPhases = phases.filter((p) => p.offChain !== true);
  const offChain = phases.filter((p) => p.offChain === true);

  return (
    <div className="panel workflow-panel">
      <div className="workflow-head">
        <h3>Workflow · {workflow.name}</h3>
        <span className="tag">lecture seule</span>
      </div>
      <p className="sub">
        Phases &amp; gates de la méthode (référence : <code>{workflow.id}</code>). Éditeur de
        workflow différé — cette vue est en lecture seule.
      </p>

      <table className="workflow-table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Rôle</th>
            <th>Entrée → Sortie</th>
            <th>Gate</th>
          </tr>
        </thead>
        <tbody>
          {mainPhases.map((p) => (
            <tr key={p.id}>
              <td>
                {p.badge ? `${p.badge} ` : ""}
                <strong>{p.name}</strong>
              </td>
              <td>{roleText(p)}</td>
              <td>{p.description}</td>
              <td>
                {p.gate === undefined ? (
                  <span className="gate gate-none">◇ aucun gate</span>
                ) : (
                  <span className={`gate gate-${p.gate.kind}`}>{gateText(p.gate)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {offChain.length > 0 && (
        <div className="workflow-offchain">
          <span className="tag">hors chaîne</span>
          {offChain.map((p) => (
            <p key={p.id} className="sub">
              <strong>{p.name}</strong> — {roleText(p)} · {p.description} ·{" "}
              {/* Hors chaîne : c'est ICI que le canon plantait — l'étape `surveillance`
                  (side: prod ⇒ offChain) n'a AUCUN gate. */}
              {p.gate === undefined ? (
                <span className="gate gate-none">◇ aucun gate</span>
              ) : (
                <span className={`gate gate-${p.gate.kind}`}>{gateText(p.gate)}</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
