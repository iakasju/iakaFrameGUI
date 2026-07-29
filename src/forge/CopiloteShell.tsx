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
 * changer.
 *
 * 🛡️ **Honnête par défaut (option C, `copilote-honnete-mock-opt-in.md`).** Le résolveur infère avec le
 * modèle d'authoring réglé, ou **avoue** (`proposition === null` → miroir de `FeanorHead`, sans
 * Valider/Rejeter ni diff). Le mock n'apparaît **que** sur opt-in explicite (`authoringModel = "mock"`)
 * ET **toujours étiqueté** (`MOCK_DEMO_LABEL`, bandeau + ligne `who`). Le sélecteur `AUTHORING_RUNNERS`
 * est **décoratif/legacy** (il ne pilote pas le résolveur) — sa copie ne prétend plus « mocké par défaut ».
 */
import { useEffect, useState } from "react";
import type { LlmTransport } from "@iakaframe/core";
import {
  AUTHORING_RUNNERS,
  NO_AUTHORING_MODEL_HINT,
  type AuthoringRunner,
  type CopiloteContext,
  type MaterializeOp,
  type Proposition,
} from "./mock/copilote";
import {
  resolveProposition,
  MOCK_DEMO_LABEL,
  type PropositionSource,
} from "./llm/resolve";
import {
  copiloteBadgeClose,
  copiloteBadgeOpen,
  loadCopiloteIdentity,
  type CopiloteIdentity,
} from "./llm/identity";
import { realLlm } from "./llm/transport";
import { backend, type Backend } from "../api/backend";

/**
 * Repli d'identité (AC-3) : la fiche du rôle `frame` est introuvable dans la racine bibliothèque
 * active. On le **dit** et on retombe sur le copilote anonyme — on n'invente jamais une identité
 * de substitution, qui rendrait la dérive invisible.
 */
export const IDENTITY_MISSING_HINT =
  "identité indisponible (fiche du rôle « frame » introuvable dans la racine bibliothèque)";

/**
 * Préfixe honnête d'un **aveu** (miroir de `FEANOR_NO_REPLY_PREFIX`) : le copilote n'a pas proposé
 * d'artefact — on le DIT (`+ " — " + reason`), on ne fabrique **jamais** une proposition de substitution.
 */
export const COPILOTE_NO_PROPOSAL_PREFIX = "Le copilote n'a pas proposé d'artefact";

export function CopiloteShell({
  subject,
  context,
  onApply,
  placeholder = "Décrivez une intention…",
  api = backend,
  model,
  llm = realLlm(backend),
}: {
  subject: string;
  context: CopiloteContext;
  /** Matérialise les ops via le **chemin d'insertion réel** de l'atelier (Valider). */
  onApply: (ops: MaterializeOp[]) => void;
  placeholder?: string;
  /** Backend injectable (tests) — sert à lire le **modèle d'authoring** configuré (§ Volet B). */
  api?: Backend;
  /** Modèle d'authoring imposé (tests) — sinon lu depuis les Settings (`authoringModel`). */
  model?: string;
  /** Transport LLM injectable (tests : `fakeLlm`) — défaut = `realLlm(backend)` (commande Rust). */
  llm?: LlmTransport;
}) {
  const [prompt, setPrompt] = useState("");
  const [runner, setRunner] = useState<AuthoringRunner>(AUTHORING_RUNNERS[0]);
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [done, setDone] = useState<null | "validated" | "rejected">(null);
  // Provenance de la proposition affichée + raison éventuelle d'un repli (§3.6). `pending` = une
  // inférence en vol (bouton désactivé, garde anti-double-clic — un seul appel à la fois).
  const [source, setSource] = useState<PropositionSource | null>(null);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  // Endpoint d'authoring optionnel (D3) : hôte Ollama LAN. Vide → localhost (résolu par le résolveur).
  const [endpoint, setEndpoint] = useState<string | null>(null);
  // Clé API optionnelle (Lot 2b — LiteLLM/openai). Vide/absente → aucun header Bearer. JAMAIS loguée
  // ni affichée. Sert le chemin proposition du Copilote via la passerelle OpenAI-compatible.
  const [apiKey, setApiKey] = useState<string | null>(null);
  // Identite DERIVEE du canon (jamais fabriquee) : null = fiche introuvable -> copilote anonyme.
  const [identity, setIdentity] = useState<CopiloteIdentity | null>(null);
  // § Volet B : le modèle d'authoring UNIQUE et global, lu depuis les Settings (persisté comme
  // `iakaframeHome`). **Aucun défaut** : vide tant que rien n'est réglé → l'absence est signalée
  // (jamais masquée). Défensif hors Tauri : le mock reste actif, il indique juste l'absence de modèle.
  const [configuredModel, setConfiguredModel] = useState<string>(model ?? "");

  useEffect(() => {
    if (model !== undefined) {
      setConfiguredModel(model);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        // Appel OPTIONNEL (`?.`) : un `api` partiel peut ne pas exposer `authoringModel`. Le
        // `.catch` seul ne suffisait pas — sur une méthode absente, l'appel lève SYNCHRONEMENT
        // avant que la chaîne de promesse n'existe, et le montage du composant plantait.
        // Même forme que le voisin `authoringEndpoint?.()` ci-dessous.
        const m = await api.authoringModel?.();
        if (alive && m && m.trim().length > 0) setConfiguredModel(m.trim());
      } catch {
        /* hors Tauri / non défini : on garde le défaut (le copilote reste mocké) */
      }
    })();
    return () => {
      alive = false;
    };
  }, [api, model]);

  // Endpoint d'authoring (D3) : lu des Settings (`authoringEndpoint`). Vide/absent → localhost.
  // Défensif hors Tauri : on garde `null` (le résolveur retombe sur le défaut localhost).
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        // Appel optionnel : un `api` de test minimal peut ne pas exposer `authoringEndpoint`.
        const e = await api.authoringEndpoint?.();
        if (alive && e && e.trim().length > 0) setEndpoint(e.trim());
      } catch {
        /* hors Tauri / non défini : défaut localhost côté résolveur */
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  // Clé API d'authoring (Lot 2b — LiteLLM) : lue des Settings (`authoringApiKey`). Vide/absente ⇒
  // aucun header Bearer. Elle ne sert QUE le chemin proposition live (jamais loguée, jamais affichée).
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const k = await api.authoringApiKey?.();
        if (alive && k && k.trim().length > 0) setApiKey(k.trim());
      } catch {
        /* hors Tauri / non défini : aucune clé (LiteLLM sans auth) */
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  // Identite du copilote : lue de la racine bibliotheque active (fiche du role `frame`).
  // ⚠️ Lire la fiche n'est PAS activer l'agent : AUCUN appel LLM ici — l'invariant d'activation
  // explicite (I-2) porte sur `llm.complete`, declenche uniquement par `handlePropose`.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const found = await loadCopiloteIdentity(api);
      if (alive) setIdentity(found);
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  async function handlePropose() {
    const trimmed = prompt.trim();
    if (trimmed.length === 0 || pending) return; // garde anti-double-clic (un seul appel en vol)
    setPending(true);
    try {
      // Chemin d'authoring : le résolveur oriente vers l'inférence LIVE (transport injecté) ou le
      // MOCK déterministe (repli). Il NE lève jamais — tout rejet réseau devient un repli mock propre.
      const result = await resolveProposition(
        trimmed,
        { ...context, model: configuredModel },
        { llm, endpoint, apiKey, identity },
      );
      setProposition(result.proposition);
      setSource(result.source);
      setReason(result.reason);
      setDone(null);
    } finally {
      setPending(false);
    }
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
        <span className="t">
          {identity ? (
            <>
              {copiloteBadgeOpen(identity)} · copilote d'authoring · {subject}
            </>
          ) : (
            <>
              Copilote d'authoring · {subject}{" "}
              <em className="no-model" aria-label="Identité du copilote indisponible">
                {IDENTITY_MISSING_HINT}
              </em>
            </>
          )}
        </span>
        <span className="runner">
          <span className="tagme">
            runner d'authoring · build-time · sélecteur legacy (décoratif — ne pilote pas l'inférence)
          </span>
          <select
            aria-label="Runner d'authoring (build-time, sélecteur legacy décoratif)"
            value={runner}
            onChange={(e) => setRunner(e.target.value as AuthoringRunner)}
          >
            {AUTHORING_RUNNERS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="authoring-model" aria-label="Modèle d'authoring configuré">
            {configuredModel ? (
              <>
                modèle : <code>{configuredModel}</code>
              </>
            ) : (
              <em className="no-model">{NO_AUTHORING_MODEL_HINT}</em>
            )}
          </span>
        </span>
      </div>

      {proposition ? (
        <div className="conv">
          <div className="umsg">
            <div className="who">Vous · au copilote</div>
            {proposition.intention}
          </div>
          <div className="amsg" data-source={source ?? undefined}>
            <div className="who">
              {identity ? copiloteBadgeOpen(identity) : "Copilote de forge"} · proposition ·{" "}
              {proposition.model ? (
                <>
                  modèle <code>{proposition.model}</code>
                </>
              ) : (
                <em className="no-model">{NO_AUTHORING_MODEL_HINT}</em>
              )}{" "}
              · {source === "live" ? "LLM live" : MOCK_DEMO_LABEL}
            </div>
            {source === "mock" && (
              // H-2 — étiquetage NON négociable : toute proposition mockée porte le bandeau, visible.
              <div className="mock-demo-banner" role="note">
                {MOCK_DEMO_LABEL}
              </div>
            )}
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
            {identity && (
              <div className="who close" aria-label="Clôture du copilote">
                {copiloteBadgeClose(identity)}
              </div>
            )}
          </div>
        </div>
      ) : source === "none" && reason && done === null ? (
        // AVEU honnête (miroir de `FeanorHead`) : le copilote n'a pas proposé — on le DIT, sans
        // artefacts, sans diff, sans Valider/Rejeter (il n'y a rien à matérialiser). H-1.
        <div className="copilote-aveu" role="status" data-source="none">
          {identity && (
            <div className="who" aria-label="Ouverture du copilote">
              {copiloteBadgeOpen(identity)}
            </div>
          )}
          <p className="aveu-text">
            {COPILOTE_NO_PROPOSAL_PREFIX} — {reason}
          </p>
          {identity && (
            <div className="who close" aria-label="Clôture du copilote">
              {copiloteBadgeClose(identity)}
            </div>
          )}
        </div>
      ) : (
        <div className="shell-note">
          {done === "validated" ? (
            <>
              <b>Matérialisé.</b> Les artefacts ont été insérés par l'atelier via le{" "}
              <b>chemin d'insertion réel</b> (le même que le <code>+</code> du rail). La forge
              n'écrit rien sans votre validation.
            </>
          ) : done === "rejected" ? (
            <>
              <b>Proposition rejetée</b> — aucune écriture. La forge n'écrit rien sans votre
              validation.
            </>
          ) : (
            <>
              <b>Boucle intention → proposition → diff → valider/rejeter.</b> Le copilote{" "}
              <b>infère</b> avec le modèle d'authoring réglé, ou <b>avoue</b> s'il ne peut pas —
              jamais de proposition fabriquée présentée comme réelle. Saisissez <code>mock</code>{" "}
              dans les Réglages pour un <b>mode démo hors-ligne</b> (propositions étiquetées). La
              forge n'écrira jamais sans votre validation.
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
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void handlePropose();
          }}
        />
        <button
          type="button"
          className="send"
          onClick={() => void handlePropose()}
          disabled={prompt.trim().length === 0 || pending}
          title="Proposer des artefacts (copilote d'authoring)"
        >
          {pending ? "Le modèle réfléchit…" : "Proposer ▸"}
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
