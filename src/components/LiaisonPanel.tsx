/**
 * LiaisonPanel — **étape de liaison optionnelle** du flux Déploiement (P7). Présentationnel :
 * aucune logique de flux ici (l'état `binding` vit dans `useForgeDeploy`). Insérée **entre** le
 * choix du nœud et le bouton Générer.
 *
 * Sans liaison, le kit reste **pur** (comportement P4). Cocher « Lier ce kit » pose un Binding
 * par défaut (runner du nœud, modèles vides à compléter) : par persona, on choisit un **runner**
 * (`RunnerKind`) et un **modèle** (texte libre au MVP). Le modèle vient **toujours du Binding**,
 * jamais de la Team ; les intervenants sont désignés par leur **rôle** (jamais un nom de code).
 * Masqué tant qu'aucun nœud n'est choisi.
 */
import {
  RUNNER_KINDS,
  roleLabel,
  type Binding,
  type NodeKind,
  type RunnerKind,
  type Team,
} from "@iakaframe/core";

/** Le modèle est-il **requis** pour un kit standalone sur ce nœud ? (claude : facultatif) */
function modelRequiredFor(node: NodeKind): boolean {
  return node !== "claude";
}

/** Aide contextuelle par nœud (avertissement non bloquant si un modèle requis est vide). */
function modelHintFor(node: NodeKind): string {
  return modelRequiredFor(node)
    ? "Modèle requis pour un kit exécutable hors Cockpit (avertissement non bloquant si vide)."
    : "Modèle facultatif (Claude Code tourne sur ses défauts).";
}

/** Tri d'affichage des personas : rôle (casting) puis id — même ordre que le roster. */
function byRoleThenId(a: Team["personas"][number], b: Team["personas"][number]): number {
  return a.roleIndex - b.roleIndex || a.id.localeCompare(b.id);
}

export function LiaisonPanel({
  node,
  team,
  binding,
  onEnable,
  onClear,
  onSetRunner,
  onSetModel,
}: {
  node: NodeKind | null;
  team: Team | null;
  binding: Binding | null;
  onEnable: () => void;
  onClear: () => void;
  onSetRunner: (personaId: string, runner: RunnerKind) => void;
  onSetModel: (personaId: string, model: string) => void;
}) {
  // Masqué tant qu'aucun nœud n'est choisi (l'étape n'a pas de sens sans destination).
  if (node === null) return null;

  const enabled = binding !== null;
  const personas = team ? [...team.personas].sort(byRoleThenId) : [];
  const modelFor = (personaId: string): string =>
    binding?.assignments.find((b) => b.personaId === personaId)?.model ?? "";
  const runnerFor = (personaId: string): RunnerKind | "" =>
    binding?.assignments.find((b) => b.personaId === personaId)?.runner ?? "";

  return (
    <div className="panel" aria-label="Liaison (runner + modèle par persona)">
      <div className="row">
        <label className="check">
          <input
            type="checkbox"
            aria-label="Lier ce kit"
            checked={enabled}
            onChange={(e) => (e.target.checked ? onEnable() : onClear())}
          />{" "}
          Lier ce kit (runner + modèle par persona)
        </label>
      </div>
      <p className="sub" style={{ marginTop: 4 }}>
        Optionnel : rend le kit exécutable en terminal nu (sans Cockpit). Sans liaison, le kit
        reste <strong>pur</strong>. {modelHintFor(node)}
      </p>

      {enabled && (
        <div style={{ marginTop: 8 }}>
          {personas.length === 0 ? (
            <p className="sub" style={{ margin: 0 }}>
              La team sélectionnée n'a aucune persona à lier.
            </p>
          ) : (
            <table aria-label="Liaisons par persona" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Persona (rôle)</th>
                  <th style={{ textAlign: "left" }}>Harnais (runner)</th>
                  <th style={{ textAlign: "left" }}>Modèle</th>
                </tr>
              </thead>
              <tbody>
                {personas.map((p) => {
                  const missing = modelRequiredFor(node) && modelFor(p.id).trim() === "";
                  return (
                    <tr key={p.id}>
                      <td>
                        {p.name}{" "}
                        <span className="sub">({roleLabel(p.roleKey)})</span>
                      </td>
                      <td>
                        <select
                          aria-label={`Runner de ${p.name}`}
                          value={runnerFor(p.id)}
                          onChange={(e) =>
                            onSetRunner(p.id, e.target.value as RunnerKind)
                          }
                        >
                          {RUNNER_KINDS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          aria-label={`Modèle de ${p.name}`}
                          value={modelFor(p.id)}
                          placeholder={
                            modelRequiredFor(node) ? "ex. qwen2.5-coder:14b" : "(défaut du runner)"
                          }
                          onChange={(e) => onSetModel(p.id, e.target.value)}
                        />
                        {missing && (
                          <span
                            className="sub"
                            role="alert"
                            style={{ marginLeft: 6, color: "var(--warn, #b8860b)" }}
                          >
                            modèle requis
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
