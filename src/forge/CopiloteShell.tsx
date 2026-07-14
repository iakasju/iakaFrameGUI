/**
 * CopiloteShell — la **coquille visuelle** du copilote d'authoring (E2b §9, console noire).
 *
 * ⚠️ **COQUILLE NON BRANCHÉE** : aucune boucle intention→proposition→diff→valider, aucun LLM
 * (même mocké) — c'est le **jalon E2c**. Ici on ne pose que le châssis : entête + **sélecteur de
 * runner d'AUTHORING** (build-time, « m'assiste à concevoir ») + zone de prompt inerte. Le
 * sélecteur d'authoring est **distinct** du runner d'EXÉCUTION (carte Binding du Kit, run-time) :
 * la frontière est gravée par `RunnerFrontier`. Aucun runner n'entre dans la définition Team/Méthode.
 */

/** Runners d'authoring proposés (build-time) — libellés d'affichage, non persistés (coquille). */
const AUTHORING_RUNNERS = [
  "claude-code (défaut)",
  "ollama:qwen2.5-coder",
  "litellm:gpt-4o",
];

export function CopiloteShell({ subject }: { subject: string }) {
  return (
    <div className="copilote">
      <div className="chead">
        <span className="k" />
        <span className="t">Copilote d'authoring · {subject}</span>
        <span className="runner">
          <span className="tagme">runner d'authoring · build-time</span>
          <select aria-label="Runner d'authoring (build-time)" defaultValue={AUTHORING_RUNNERS[0]}>
            {AUTHORING_RUNNERS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </span>
      </div>
      <div className="shell-note">
        <b>Coquille du copilote — non branchée.</b> La boucle intention → proposition d'artefacts →
        diff → valider/rejeter (avec LLM mocké) arrive au jalon <b>E2c</b>. Aucune écriture n'est
        produite ici : la forge n'écrira jamais sans votre validation.
      </div>
      <div className="cprompt">
        <textarea
          aria-label="Prompt copilote (inactif — E2c)"
          placeholder="Décrivez une intention… (copilote branché au jalon E2c)"
          disabled
        />
        <button type="button" className="send" disabled title="Copilote branché en E2c">
          Proposer ▸
        </button>
      </div>
    </div>
  );
}

/**
 * RunnerFrontier — grave la **frontière à deux étages** : runner d'AUTHORING (build-time, console)
 * ≠ runner d'EXÉCUTION (le **Binding**, run-time, réglé au Kit puis overridé au Cockpit). Rappelle
 * qu'aucun runner ni modèle n'habite la définition Team/Méthode (invariant AR-1 renforcé, E2).
 */
export function RunnerFrontier({ rib, children }: { rib: string; children: React.ReactNode }) {
  return (
    <div className="frontier">
      <span className="rib">{rib}</span>
      <div className="ft">{children}</div>
    </div>
  );
}
