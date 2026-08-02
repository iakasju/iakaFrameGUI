/**
 * LiaisonPanel — **étape de liaison optionnelle** du flux Déploiement (P7). Présentationnel :
 * aucune logique de flux ici (l'état `binding` vit dans `useForgeDeploy`). Insérée **entre** le
 * choix du nœud et le bouton Générer.
 *
 * Sans liaison, le kit reste **pur** (comportement P4). Cocher « Lier ce kit » pose un Binding
 * par défaut (runner du nœud, modèles à compléter) : par persona, on choisit un **runner**
 * (`RunnerKind`) et un **modèle**. Le modèle vient **toujours du Binding**, jamais de la Team ;
 * les intervenants sont désignés par leur **rôle** (jamais un nom de code). Masqué tant qu'aucun
 * nœud n'est choisi.
 *
 * **Q-3** : le champ modèle est une **liste déroulante alimentée par la découverte du nœud**
 * (`<datalist>`), qui **reste librement éditable** — la liste propose, elle n'impose pas.
 * Aucun nom de modèle n'est écrit ici : ce qui est proposé vient **du nœud interrogé**, jamais
 * de la forge. Quand la découverte échoue ou rend une liste vide, la raison est affichée
 * **telle quelle** et la saisie manuelle reste seule vérité — jamais une fausse liste.
 */
import {
  RUNNER_KINDS,
  roleLabel,
  supportsModelDiscovery,
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

/** Id du `<datalist>` partagé par toutes les lignes (une seule liste découverte par panneau). */
const MODELS_DATALIST_ID = "liaison-models";

/**
 * Invite du champ modèle — **jamais un nom de modèle** (Q-3, AC-Q3-11 : la forge n'en connaît
 * aucun). Elle dit seulement d'où viennent les candidats, ou qu'il n'y en a pas.
 */
function modelPlaceholderFor(node: NodeKind, discoveredCount: number): string {
  if (discoveredCount > 0) return "modèle du nœud (liste) ou saisie libre";
  return supportsModelDiscovery(node)
    ? "aucun modèle découvert — saisie libre"
    : "saisie libre (aucune découverte sur ce nœud)";
}

export function LiaisonPanel({
  node,
  team,
  binding,
  discoveredModels = [],
  discoveryReason = null,
  discovering = false,
  onEnable,
  onClear,
  onSetRunner,
  onSetModel,
}: {
  node: NodeKind | null;
  team: Team | null;
  binding: Binding | null;
  /** Modèles rendus par le **nœud interrogé** (Q-3). Vide = rien à proposer. */
  discoveredModels?: string[];
  /** Aveu honnête à afficher **tel quel** quand la liste est vide (§ 5.3). */
  discoveryReason?: string | null;
  /** Découverte en cours (l'appel porte un timeout dur côté Rust). */
  discovering?: boolean;
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
    binding?.bindings.find((b) => b.personaId === personaId)?.model ?? "";
  const runnerFor = (personaId: string): RunnerKind | "" =>
    binding?.bindings.find((b) => b.personaId === personaId)?.runner ?? "";

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
          {/* Q-3 § 5.3 — chemin d'ÉCHEC UNIQUE : hôte refusé, nœud injoignable ou liste vide
              produisent tous le même état visible. La raison du nœud est reprise VERBATIM, la
              liste reste vide, et la saisie manuelle demeure seule vérité. Jamais fabriquée. */}
          {discovering && (
            <p className="sub" role="status" style={{ marginTop: 0 }}>
              Découverte des modèles au nœud…
            </p>
          )}
          {!discovering && discoveryReason !== null && (
            <p className="sub" role="status" style={{ marginTop: 0 }}>
              Découverte des modèles indisponible ({discoveryReason}) —{" "}
              <b>saisissez le modèle à la main</b>. Aucune liste fabriquée.
              {node === "ollama-lan" && (
                <>
                  {" "}
                  Contournement : régler l'<b>endpoint d'authoring</b> (Réglages) sur cet hôte LAN
                  autorise sa découverte.
                </>
              )}
            </p>
          )}
          {!discovering && discoveredModels.length > 0 && (
            <p className="sub" role="status" style={{ marginTop: 0 }}>
              {discoveredModels.length} modèle(s) découvert(s) au nœud — proposés par rôle,{" "}
              <b>modifiables</b>.
            </p>
          )}
          {/* Liste déroulante commune : elle PROPOSE ce que le nœud a dit, sans jamais l'imposer. */}
          <datalist id={MODELS_DATALIST_ID}>
            {discoveredModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

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
                        {/* Liste déroulante (datalist) + saisie LIBRE : la découverte propose,
                            l'utilisateur tranche. Aucun nom de modèle n'est écrit par la forge —
                            le placeholder lui-même n'en porte plus aucun. */}
                        <input
                          aria-label={`Modèle de ${p.name}`}
                          list={MODELS_DATALIST_ID}
                          value={modelFor(p.id)}
                          placeholder={
                            modelRequiredFor(node)
                              ? modelPlaceholderFor(node, discoveredModels.length)
                              : "(défaut du runner)"
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
