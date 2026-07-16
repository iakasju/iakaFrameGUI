/**
 * WorkflowAtelier — l'atelier **Workflow** ÉDITABLE de la forge (P6b, 4ᵉ onglet, iso-pattern
 * Team/Méthode/Kit). Le workflow est un **artefact autonome** de la collection `workflows/` (Q-1) :
 * on édite ici ses **phases/gates** (ajouter · supprimer · réordonner monter/descendre — Q-2 ; et
 * éditer name/description/roleKeys/offChain + gate) via les **helpers PURS** du cœur
 * (`addPhase`/`removePhase`/`movePhase`/`updatePhase*`, `order` normalisé, calage nettoyé — Q-3).
 * Le `FlowDiagram` (réutilisé) **reflète** l'état édité. **Zéro modèle/runner** (workflow pur, AR-1).
 */
import { useEffect, useState } from "react";
import {
  CANONICAL_ROLES,
  addPhase,
  movePhase,
  removePhase,
  roleLabel,
  updatePhaseFields,
  updatePhaseGate,
  type GateKind,
  type Workflow,
} from "@iakaframe/core";
import { RailNote, RailSection } from "../Rail";
import { UploadChip } from "../Vignette";
import { FlowDiagram } from "../ContextGraph";

export function WorkflowAtelier({
  workflow,
  onWorkflowChange,
}: {
  workflow: Workflow;
  onWorkflowChange: (wf: Workflow) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    workflow.phases[0]?.id ?? null,
  );

  // Garde la sélection valide si la phase courante disparaît (suppression/chargement).
  useEffect(() => {
    if (!workflow.phases.some((p) => p.id === selectedId)) {
      setSelectedId(workflow.phases[0]?.id ?? null);
    }
  }, [workflow, selectedId]);

  const phases = [...workflow.phases].sort((a, b) => a.order - b.order);
  const selected = phases.find((p) => p.id === selectedId) ?? null;
  const canRemove = workflow.phases.length > 1;

  const onAdd = (): void => {
    const before = new Set(workflow.phases.map((p) => p.id));
    const next = addPhase(workflow);
    onWorkflowChange(next);
    const added = next.phases.find((p) => !before.has(p.id));
    if (added) setSelectedId(added.id);
  };

  const toggleRole = (roleKey: string): void => {
    if (!selected) return;
    const has = selected.roleKeys.includes(roleKey);
    const roleKeys = has
      ? selected.roleKeys.filter((k) => k !== roleKey)
      : [...selected.roleKeys, roleKey];
    onWorkflowChange(updatePhaseFields(workflow, selected.id, { roleKeys }));
  };

  return (
    <>
      <aside className="rail">
        <div className="railhead">Stock — atelier Workflow · phases &amp; gates</div>

        <RailSection title="Phases" count={`${phases.length} · monter/descendre`} defaultOpen>
          {phases.map((p, i) => (
            <div className={`sub${p.id === selectedId ? " sel" : ""}`} key={`ph-${p.id}`}>
              <button
                type="button"
                className="sn"
                style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setSelectedId(p.id)}
                title="Éditer cette phase"
              >
                <span className="tagg phase">P{p.order + 1}</span>
                {p.name}
                <span className="sd">
                  {p.roleKeys.map(roleLabel).join(" + ") || "aucun rôle (à compléter)"}
                  {p.offChain ? " · hors chaîne" : ""}
                </span>
              </button>
              <span className="rowbtns" style={{ display: "inline-flex", gap: 2 }}>
                <button
                  type="button"
                  aria-label={`Monter ${p.name}`}
                  title="Monter"
                  disabled={i === 0}
                  onClick={() => onWorkflowChange(movePhase(workflow, p.id, "up"))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Descendre ${p.name}`}
                  title="Descendre"
                  disabled={i === phases.length - 1}
                  onClick={() => onWorkflowChange(movePhase(workflow, p.id, "down"))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Supprimer ${p.name}`}
                  title={canRemove ? "Supprimer" : "Au moins 1 phase requise"}
                  disabled={!canRemove}
                  onClick={() => onWorkflowChange(removePhase(workflow, p.id))}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
          <button type="button" className="addphase" onClick={onAdd}>
            + Ajouter une phase
          </button>
        </RailSection>

        <RailNote>
          Un workflow est un <b>artefact autonome</b> de la collection <code>workflows/</code>,
          référencé par la Méthode. Réordonnancement par <b>monter/descendre</b> ; <code>order</code>{" "}
          recalculé automatiquement. <b>Aucun runner ni modèle</b> — le workflow reste pur.
        </RailNote>
      </aside>

      <main className="edit">
        <div className="edithead">
          <span className="icon">W</span>
          <div>
            <div className="nm">Workflow {workflow.name} — en édition</div>
            <div className="meta">
              {phases.length} phases · <code>workflows/{workflow.id}.md</code>
            </div>
          </div>
          <UploadChip label="⬆ pictogramme workflow — glisser-déposer" />
        </div>

        <div className="triptych">
          <div className="phase-editor" aria-label="Éditeur de phase">
            {selected === null ? (
              <p className="empty">Aucune phase — ajoutez-en une.</p>
            ) : (
              <fieldset>
                <legend>Phase — {selected.name}</legend>

                <label>
                  Nom
                  <input
                    type="text"
                    value={selected.name}
                    onChange={(e) =>
                      onWorkflowChange(
                        updatePhaseFields(workflow, selected.id, { name: e.target.value }),
                      )
                    }
                  />
                </label>

                <label>
                  Description (entrée → sortie)
                  <input
                    type="text"
                    value={selected.description}
                    onChange={(e) =>
                      onWorkflowChange(
                        updatePhaseFields(workflow, selected.id, {
                          description: e.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <fieldset className="roles">
                  <legend>Rôles porteurs (par libellé)</legend>
                  {CANONICAL_ROLES.map((r) => (
                    <label key={r.key} className="chk">
                      <input
                        type="checkbox"
                        checked={selected.roleKeys.includes(r.key)}
                        onChange={() => toggleRole(r.key)}
                      />
                      {r.label}
                    </label>
                  ))}
                  {selected.roleKeys.length === 0 && (
                    <span className="warnrole" role="note">
                      ⚠ aucun rôle — autorisé mais à compléter (Q-6)
                    </span>
                  )}
                </fieldset>

                <label className="chk">
                  <input
                    type="checkbox"
                    checked={selected.offChain === true}
                    onChange={(e) =>
                      onWorkflowChange(
                        updatePhaseFields(workflow, selected.id, {
                          offChain: e.target.checked,
                        }),
                      )
                    }
                  />
                  Hors chaîne principale (exclue du tableau)
                </label>

                <fieldset className="gate">
                  <legend>Gate de sortie</legend>
                  <label>
                    Type
                    <select
                      value={selected.gate.kind}
                      onChange={(e) =>
                        onWorkflowChange(
                          updatePhaseGate(workflow, selected.id, {
                            kind: e.target.value as GateKind,
                          }),
                        )
                      }
                    >
                      <option value="human">humaine (validation décideur)</option>
                      <option value="auto">auto (gate qualité)</option>
                    </select>
                  </label>
                  <label>
                    Condition
                    <input
                      type="text"
                      value={selected.gate.condition}
                      onChange={(e) =>
                        onWorkflowChange(
                          updatePhaseGate(workflow, selected.id, {
                            condition: e.target.value,
                          }),
                        )
                      }
                    />
                  </label>
                  <label>
                    Jalon — rôle émetteur (from)
                    <select
                      value={selected.gate.from ?? ""}
                      onChange={(e) =>
                        onWorkflowChange(
                          updatePhaseGate(workflow, selected.id, { from: e.target.value }),
                        )
                      }
                    >
                      <option value="">—</option>
                      {CANONICAL_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Jalon — rôle récepteur (to)
                    <select
                      value={selected.gate.to ?? ""}
                      onChange={(e) =>
                        onWorkflowChange(
                          updatePhaseGate(workflow, selected.id, { to: e.target.value }),
                        )
                      }
                    >
                      <option value="">—</option>
                      {CANONICAL_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              </fieldset>
            )}
          </div>

          <FlowDiagram workflow={workflow} />
        </div>
      </main>
    </>
  );
}
