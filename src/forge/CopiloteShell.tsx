/**
 * CopiloteShell — la **console du copilote d'authoring** (E2c §8), branchée sur un **LLM MOCKÉ**.
 *
 * Boucle **intention → PROPOSITION d'artefacts → DIFF avant→après → Valider / Rejeter**. Le prompt
 * est **actif** (le bouton « Proposer » n'est plus `disabled`) ; le sélecteur choisit le **runner
 * d'AUTHORING** (build-time, `AUTHORING_RUNNERS`), **distinct** du runner d'EXÉCUTION du Binding
 * (run-time, carte Kit) — frontière gravée par `RunnerFrontier`.
 *
 * ⚠️ **Le copilote n'écrit RIEN lui-même** : « Valider » délègue la matérialisation à l'atelier via
 * `onApply` (les **mêmes chemins d'insertion** que le `+` du rail). « Rejeter » jette sans rien
 * changer. Le **LLM réel est [différé]** (§8/§11) : ici tout vient du mock déterministe `propose`.
 */
import { useState } from "react";
import {
  AUTHORING_RUNNERS,
  propose,
  type AuthoringRunner,
  type CopiloteContext,
  type MaterializeOp,
  type Proposition,
} from "./mock/copilote";

export function CopiloteShell({
  subject,
  context,
  onApply,
  placeholder = "Décrivez une intention…",
}: {
  subject: string;
  context: CopiloteContext;
  /** Matérialise les ops via le **chemin d'insertion réel** de l'atelier (Valider). */
  onApply: (ops: MaterializeOp[]) => void;
  placeholder?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [runner, setRunner] = useState<AuthoringRunner>(AUTHORING_RUNNERS[0]);
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [done, setDone] = useState<null | "validated" | "rejected">(null);

  function handlePropose() {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) return;
    // Runner d'authoring MOCKÉ, déterministe, sans réseau — sortie identique pour la même entrée.
    setProposition(propose(trimmed, context));
    setDone(null);
  }

  /** Valider : l'HUMAIN décide → matérialisation réelle par l'atelier (jamais le copilote). */
  function handleValidate() {
    if (!proposition) return;
    onApply(proposition.ops);
    setProposition(null);
    setPrompt("");
    setDone("validated");
  }

  /** Rejeter : jette la proposition, aucune écriture. */
  function handleReject() {
    setProposition(null);
    setDone("rejected");
  }

  return (
    <div className="copilote">
      <div className="chead">
        <span className="k" />
        <span className="t">Copilote d'authoring · {subject}</span>
        <span className="runner">
          <span className="tagme">runner d'authoring · build-time · LLM mocké</span>
          <select
            aria-label="Runner d'authoring (build-time, mocké)"
            value={runner}
            onChange={(e) => setRunner(e.target.value as AuthoringRunner)}
          >
            {AUTHORING_RUNNERS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </span>
      </div>

      {proposition ? (
        <div className="conv">
          <div className="umsg">
            <div className="who">Vous · au copilote</div>
            {proposition.intention}
          </div>
          <div className="amsg">
            <div className="who">Copilote de forge · proposition · LLM mocké</div>
            <p>{proposition.intro}</p>
            {proposition.artefacts.map((a, i) => (
              <div className="arte" key={`arte-${i}`}>
                <span className={`ic ${a.icon}`}>{a.tag}</span>
                <span className="at">
                  <b>{a.title}</b> <span className="d">— {a.detail}</span>
                </span>
              </div>
            ))}
            <div className="cdiff">
              <span className="fl">Diff · {proposition.diffFile}</span>
              {proposition.diff.map((d, i) => (
                <span key={`diff-${i}`} className={d.kind}>
                  {d.text}
                </span>
              ))}
            </div>
            <div className="cact">
              <button type="button" className="btn-ok" onClick={handleValidate}>
                ✓ Valider &amp; matérialiser
              </button>
              <button type="button" className="btn-no" onClick={handleReject}>
                Rejeter
              </button>
              <span className="hint">{proposition.hint}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="shell-note">
          {done === "validated" ? (
            <>
              <b>Matérialisé.</b> Les artefacts ont été insérés par l'atelier via le{" "}
              <b>chemin d'insertion réel</b> (le même que le <code>+</code> du rail). Copilote{" "}
              <b>LLM mocké</b> — le runner d'authoring réel est <b>différé</b>.
            </>
          ) : done === "rejected" ? (
            <>
              <b>Proposition rejetée</b> — aucune écriture. La forge n'écrit rien sans votre
              validation. Copilote <b>LLM mocké</b> (runner réel <b>différé</b>).
            </>
          ) : (
            <>
              <b>Boucle intention → proposition → diff → valider/rejeter.</b> Le copilote est{" "}
              <b>mocké</b> (déterministe, sans réseau) ; le runner d'authoring réel est{" "}
              <b>différé</b>. La forge n'écrira jamais sans votre validation.
            </>
          )}
        </div>
      )}

      <div className="cprompt">
        <textarea
          aria-label={`Prompt copilote — ${subject}`}
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handlePropose();
          }}
        />
        <button
          type="button"
          className="send"
          onClick={handlePropose}
          disabled={prompt.trim().length === 0}
          title="Proposer des artefacts (copilote mocké)"
        >
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
