/**
 * FeanorHead — le composant **Fëanor-en-tête** (Lot 6 → chantier `feanor-en-tete-fonctionnel-llm.md`,
 * MVP-A). Monté en **haut** des pages d'authoring d'un élément — en mode **✚ création** ET en mode
 * **✎ édition** — fidèle à la maquette validée `specs/mock/gui/02-feanor-prompt-element.html`
 * (Studio clair) : une bande d'en-tête avec, à gauche, la **vignette de l'entité** en cours
 * d'authoring, et à droite, la **vignette de Fëanor** (le 9ᵉ persona, royaume FRAME, badge flamme)
 * + une **zone de prompt** (textarea + bouton d'envoi) + une **zone de réponse**.
 *
 * ✅ **BRANCHÉ (MVP-A, conseil/chat).** Le bouton d'envoi appelle **réellement** le LLM via la pile
 * réutilisée du copilote — AUCUN second transport : `realLlm(backend)` → Rust `llm_complete` → Ollama
 * LAN, identité Fëanor `loadCopiloteIdentity` (rôle `frame`, badge 🟠), réglage PARTAGÉ `authoringModel`
 * (+ `authoringEndpoint`). La **réponse** de Fëanor s'affiche dans l'en-tête, encadrée du badge
 * d'ouverture/clôture posé par l'UI (jamais par le modèle). MVP-A = **conseil seul** : Fëanor n'écrit
 * ni ne matérialise RIEN (la matérialisation d'élément vit dans `CopiloteShell`, non dupliquée ici).
 *
 * 🛡️ **Honnêteté par construction.** Aucun appel LLM au montage (activation explicite, seulement au
 * geste). Modèle absent / provider non supporté / réseau KO / réponse illisible → **aucune fausse
 * réponse** : l'en-tête affiche l'aveu honnête (`reason`), jamais une pseudo-réponse de Fëanor. En
 * test/dev, le transport est injecté (`fakeLlm`) — zéro réseau réel.
 */
import { useEffect, useState } from "react";
import type { LlmTransport, Persona } from "@iakaframe/core";
import { buildFeanorVignette, buildEntityVignette, type AuthoredEntity } from "./feanorHeadModel";
import { resolveAdvice, type AdviceResult, type FeanorContext } from "./llm/advise";
import type { ElementProposeDeps } from "./elementKind";
import {
  copiloteBadgeClose,
  copiloteBadgeOpen,
  loadCopiloteIdentity,
  type CopiloteIdentity,
} from "./llm/identity";
import { realLlm } from "./llm/transport";
import { NO_AUTHORING_MODEL_HINT } from "./mock/copilote";
import { backend, type Backend } from "../api/backend";

/** Invite neutre quand Fëanor est branché (modèle réglé) et n'attend qu'une demande. */
export const FEANOR_READY_HINT =
  "Fëanor est branché — décris ce que tu veux retravailler sur cet élément, il te conseille.";

/** Préfixe honnête d'un repli : Fëanor n'a PAS répondu (jamais une fausse réponse d'IA). */
export const FEANOR_NO_REPLY_PREFIX = "Fëanor n'a pas répondu";

/** Confirmation d'une proposition acheminée : l'éditeur est pré-rempli, RIEN n'est encore écrit. */
export const FEANOR_PROPOSAL_DONE =
  "Fëanor a pré-rempli l'éditeur — relisez, corrigez, puis « Enregistrer » (rien n'est écrit avant).";

/** Préfixe honnête d'un repli de proposition : Fëanor n'a PAS proposé (jamais une fausse proposition). */
export const FEANOR_NO_PROPOSAL_PREFIX = "Fëanor n'a pas proposé d'élément";

/**
 * Capability de **proposition d'élément** (brique B) — OPTIONNELLE. Fournie par l'hôte
 * `ElementReservoir` quand le pool l'équipe (persona pilote). `run` = le résolveur honnête (calqué
 * `resolveAdvice`, ne lève jamais, repli `null`+`reason`) ; `onProposal` = l'acheminement vers
 * l'éditeur (l'hôte re-seede par remontage `key`). Proposition typée `unknown` ici : FeanorHead
 * reste **agnostique** du type de pool (le typage concret est tenu à la frontière de l'hôte).
 */
export interface FeanorProposeCapability {
  run: (
    prompt: string,
    ctx: FeanorContext,
    deps: ElementProposeDeps,
  ) => Promise<{ proposition: unknown; source: "live" | "mock"; reason?: string }>;
  onProposal: (proposition: unknown) => void;
}

/** Suggestions de la maquette : cliquer pré-remplit le champ (aucun envoi tant que l'on n'envoie pas). */
const SUGGESTIONS = ["Réécris la mission", "Ajoute un garde-fou", "Génère une variante"];

export function FeanorHead({
  mode,
  entity,
  feanorSource,
  propose,
  api = backend,
  llm = realLlm(backend),
  model,
}: {
  /** Mode d'authoring de la page hôte : `create` (✚) ou `edit` (✎). */
  mode: "create" | "edit";
  /**
   * L'entité en cours d'authoring, **descripteur générique** (§ 4.1) : élément nommé en édition ;
   * descripteur de création vierge (name vide) en création ; `null` = repli défensif « élément ».
   */
  entity: AuthoredEntity | null;
  /** Personas réelles du frame (source de la vignette **Fëanor**). Repli : `CANONICAL_ROSTER`. */
  feanorSource?: readonly Persona[];
  /**
   * Capability de **proposition d'élément** (brique B) — OPTIONNELLE. Absente ⇒ conseil seul
   * (MVP-A, comportement historique des 6 autres pools). Présente (persona pilote) ⇒ Fëanor peut
   * PROPOSER les champs de l'élément, qui pré-remplissent l'éditeur (l'utilisateur relit + enregistre).
   */
  propose?: FeanorProposeCapability;
  /** Backend injectable (tests) — sert à lire l'identité + le modèle/endpoint d'authoring. */
  api?: Backend;
  /** Transport LLM injectable (tests : `fakeLlm`) — défaut = `realLlm(backend)` (commande Rust). */
  llm?: LlmTransport;
  /** Modèle d'authoring imposé (tests) — sinon lu depuis les Settings (`authoringModel`, PARTAGÉ). */
  model?: string;
}) {
  const feanor = buildFeanorVignette(feanorSource);
  const ent = buildEntityVignette(entity);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState<AdviceResult | null>(null);
  // État de la dernière PROPOSITION (brique B) : succès (pré-remplissage acheminé) ou repli honnête
  // (aucune proposition fabriquée). `null` = aucune proposition demandée dans cette session de fiche.
  const [proposal, setProposal] = useState<{ ok: boolean; reason?: string } | null>(null);
  // Identité DÉRIVÉE du canon (jamais fabriquée) : null = fiche introuvable → réponse anonyme (dite).
  const [identity, setIdentity] = useState<CopiloteIdentity | null>(null);
  // Endpoint d'authoring optionnel : hôte Ollama LAN. Vide → localhost (résolu par le résolveur).
  const [endpoint, setEndpoint] = useState<string | null>(null);
  // Modèle d'authoring PARTAGÉ (`authoringModel`), lu des Settings — AUCUN défaut : l'absence est
  // signalée (jamais masquée). Défensif hors Tauri : le mock reste, il indique juste l'absence.
  const [configuredModel, setConfiguredModel] = useState<string>(model ?? "");

  // Modèle d'authoring (§ réglage PARTAGÉ) — même geste que `CopiloteShell` (appel OPTIONNEL `?.`).
  useEffect(() => {
    if (model !== undefined) {
      setConfiguredModel(model);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const m = await api.authoringModel?.();
        if (alive && m && m.trim().length > 0) setConfiguredModel(m.trim());
      } catch {
        /* hors Tauri / non défini : on garde le défaut vide (absence signalée) */
      }
    })();
    return () => {
      alive = false;
    };
  }, [api, model]);

  // Endpoint d'authoring : lu des Settings (`authoringEndpoint`). Vide/absent → localhost.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
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

  // Identité de Fëanor : lue de la racine bibliothèque active (fiche du rôle `frame`).
  // ⚠️ Lire la fiche n'est PAS activer l'agent : AUCUN appel LLM ici — l'invariant d'activation
  // explicite porte sur `llm.complete`, déclenché UNIQUEMENT par `handleSend` (le geste EST la demande).
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

  const verb = mode === "edit" ? "édite" : "façonne";
  const modeLabel = mode === "edit" ? "🔥 édition" : "🔥 création";
  const modeWord = mode === "edit" ? "édition" : "création";

  // Contexte de l'élément, partagé par le conseil ET la proposition (mode/type/nom/rôle réels).
  function feanorContext(): FeanorContext {
    return {
      mode,
      // Type RÉEL de l'élément (§ 4.1) — plus « persona » en dur : le contexte suit le pool hôte.
      entityType: entity?.type ?? "element",
      entityName: entity && entity.name.trim().length > 0 ? entity.name : null,
      entityRole: entity?.key ?? null,
    };
  }

  async function handleSend() {
    const trimmed = prompt.trim();
    if (trimmed.length === 0 || pending) return; // garde anti-double-appel (un seul appel en vol)
    setPending(true);
    try {
      // Chemin de conseil : le résolveur oriente LIVE (transport injecté) ou repli honnête. Il NE
      // lève jamais — modèle absent / réseau KO deviennent un aveu propre, jamais une fausse réponse.
      const result = await resolveAdvice(trimmed, feanorContext(), {
        llm,
        model: configuredModel,
        endpoint,
        identity,
      });
      setAnswer(result);
      setProposal(null); // le conseil chasse l'état de proposition (deux registres distincts).
    } finally {
      setPending(false);
    }
  }

  async function handlePropose() {
    const trimmed = prompt.trim();
    // Garde anti-double-appel partagée (un seul appel LLM en vol, conseil OU proposition).
    if (trimmed.length === 0 || pending || !propose) return;
    setPending(true);
    try {
      // Résolveur de proposition : LIVE (transport injecté) ou repli HONNÊTE. Ne lève jamais.
      const res = await propose.run(trimmed, feanorContext(), {
        llm,
        model: configuredModel,
        endpoint,
        identity,
      });
      if (res.proposition !== null && res.proposition !== undefined) {
        // Acheminement : l'hôte pré-remplit l'éditeur (remontage `key`). RIEN n'est encore écrit —
        // l'écriture reste le clic « Enregistrer » de l'éditeur (chemin `persist<Pool>` existant).
        propose.onProposal(res.proposition);
        setProposal({ ok: true });
        setAnswer(null);
      } else {
        // Repli honnête : Fëanor n'a PAS proposé — on le DIT (reason), aucune proposition fabriquée.
        setProposal({ ok: false, reason: res.reason });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="feanor-head" aria-label={`Fëanor en tête — ${modeWord}`}>
      {/* — L'entité en cours d'authoring (vignette + nom + type) — */}
      <div className="fh-entity">
        <div
          className="fh-vg"
          style={{ background: `linear-gradient(135deg, ${ent.gradient[0]}, ${ent.gradient[1]})` }}
          aria-hidden="true"
        >
          {ent.initials}
        </div>
        <div>
          <div className="fh-name">
            {ent.pastille ? `${ent.pastille} ` : ""}
            {ent.name}
          </div>
          <div className="fh-type">
            {ent.typeLabel} · en {modeWord}
          </div>
        </div>
      </div>

      <div className="fh-div" aria-hidden="true" />

      {/* — Fëanor glissé en tête : sa vignette (badge flamme) + la zone de prompt + la réponse — */}
      <div className="fh-feanor">
        <div className="fh-flabel">
          <span
            className="fh-badge"
            style={{
              background: `linear-gradient(135deg, ${feanor.gradient[0]}, ${feanor.gradient[1]})`,
            }}
            aria-hidden="true"
          >
            {feanor.initials}
          </span>
          <span className="fh-flabel-txt">
            {feanor.pastille ? `${feanor.pastille} ` : ""}
            {feanor.name} {verb} cet élément
          </span>
          <span className="fh-mode">{modeLabel}</span>
        </div>

        <div className="fh-field">
          <textarea
            rows={1}
            aria-label={`Demander à Fëanor — ${modeWord}`}
            placeholder={`Demander à Fëanor de retravailler ${ent.name}…`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void handleSend();
            }}
          />
          <button
            type="button"
            className="fh-send"
            aria-label="Envoyer à Fëanor"
            title="Demander conseil à Fëanor"
            onClick={() => void handleSend()}
            disabled={prompt.trim().length === 0 || pending}
          >
            ↥
          </button>
          {/* — Action de PROPOSITION (brique B) : présente SEULEMENT si le pool l'équipe. — */}
          {propose && (
            <button
              type="button"
              className="fh-propose"
              aria-label="Proposer un élément"
              title="Demander à Fëanor de PROPOSER les champs — il pré-remplit l'éditeur (rien n'est écrit)"
              onClick={() => void handlePropose()}
              disabled={prompt.trim().length === 0 || pending}
            >
              ✎+
            </button>
          )}
        </div>

        <div className="fh-sugg">
          {SUGGESTIONS.map((s) => (
            <button
              type="button"
              key={s}
              className="s"
              onClick={() => setPrompt(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* — Zone de réponse / d'état — jamais de fausse réponse d'IA. — */}
        {answer ? (
          answer.reply !== null ? (
            // Réponse RÉELLE du modèle : badge d'ouverture AVANT, clôture APRÈS (posés par l'UI).
            <div className="fh-answer" role="status" data-source={answer.source}>
              {identity && (
                <div className="fh-open" aria-label="Ouverture de Fëanor">
                  {copiloteBadgeOpen(identity)}
                </div>
              )}
              <p className="fh-reply">{answer.reply}</p>
              <div className="fh-prov">
                {answer.source === "live" ? "LLM live" : "LLM mocké"}
                {identity && (
                  <span className="fh-close" aria-label="Clôture de Fëanor">
                    {" · "}
                    {copiloteBadgeClose(identity)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            // Repli HONNÊTE : Fëanor n'a pas répondu — on le DIT (reason), aucune réponse fabriquée.
            <p className="fh-stub on" role="status">
              {FEANOR_NO_REPLY_PREFIX} — {answer.reason}
            </p>
          )
        ) : pending ? (
          <p className="fh-stub on" role="status">
            Fëanor réfléchit…
          </p>
        ) : (
          // Au repos : invite quand le modèle est réglé ; sinon on SIGNALE l'absence de modèle.
          <p className={`fh-stub${configuredModel ? "" : " on"}`}>
            {configuredModel ? FEANOR_READY_HINT : NO_AUTHORING_MODEL_HINT}
          </p>
        )}

        {/* — État de la dernière PROPOSITION (brique B) — jamais une fausse proposition. — */}
        {proposal &&
          (proposal.ok ? (
            <p className="fh-proposal ok" role="status">
              {FEANOR_PROPOSAL_DONE}
            </p>
          ) : (
            // Repli HONNÊTE : Fëanor n'a pas proposé — on le DIT (reason), aucune proposition fabriquée.
            <p className="fh-proposal on" role="status">
              {FEANOR_NO_PROPOSAL_PREFIX} — {proposal.reason}
            </p>
          ))}
      </div>
    </div>
  );
}
