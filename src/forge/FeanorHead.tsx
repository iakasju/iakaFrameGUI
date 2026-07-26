/**
 * FeanorHead — le composant **Fëanor-en-tête** (Lot 6, alignement-gui-modele-de-frame.md § A6,
 * Fork C). Monté en **haut** des pages d'authoring d'un élément — en mode **✚ création** ET en mode
 * **✎ édition** — fidèle à la maquette validée `specs/mock/gui/02-feanor-prompt-element.html`
 * (Studio clair) : une bande d'en-tête avec, à gauche, la **vignette de l'entité** en cours
 * d'authoring, et à droite, la **vignette de Fëanor** (le 9ᵉ persona, royaume FRAME, badge flamme)
 * + une **zone de prompt** (textarea + bouton d'envoi).
 *
 * ⚠️ **COQUILLE MVP — aucune IA branchée, aucune réponse simulée (Fork C).** Le bouton d'envoi
 * **n'appelle aucun modèle** et **ne fabrique aucune réponse** : il révèle un **état stub honnête**
 * (« Fëanor arrive bientôt — aucune IA branchée »). Le compagnon Fëanor **fonctionnel (LLM) est un
 * chantier SÉPARÉ** — délibérément NON implémenté ici. La coquille est *présente* visuellement mais
 * *inerte* fonctionnellement, et son libellé le dit. (Distinct du `CopiloteShell` d'authoring, qui
 * porte, lui, un transport LLM mocké/live — non réutilisé ici, précisément pour rester inerte.)
 */
import { useState } from "react";
import type { Persona } from "@iakaframe/core";
import { buildFeanorVignette, buildEntityVignette } from "./feanorHeadModel";

/** Message d'inertie honnête, affiché quand l'utilisateur tente d'« envoyer » à la coquille. */
export const FEANOR_STUB_NOTICE =
  "Fëanor arrive bientôt — coquille visuelle, aucune IA n'est branchée (chantier séparé). " +
  "Ta demande n'a pas été envoyée à un modèle.";

/** Note d'inertie permanente, visible avant même toute tentative d'envoi (honnêteté par défaut). */
export const FEANOR_INERT_HINT =
  "Coquille — Fëanor n'est pas encore branché (aucun modèle). Le compagnon fonctionnel est un chantier séparé.";

/** Suggestions de la maquette — inertes : cliquer ne fait que pré-remplir le champ (aucun envoi). */
const SUGGESTIONS = ["Réécris la mission", "Ajoute un garde-fou", "Génère une variante"];

export function FeanorHead({
  mode,
  entity,
  feanorSource,
}: {
  /** Mode d'authoring de la page hôte : `create` (✚) ou `edit` (✎). */
  mode: "create" | "edit";
  /** L'entité en cours d'authoring (persona réelle en édition ; `null` en création vierge). */
  entity: Persona | null;
  /** Personas réelles du frame (source de la vignette Fëanor). Repli : `CANONICAL_ROSTER`. */
  feanorSource?: readonly Persona[];
}) {
  const feanor = buildFeanorVignette(feanorSource);
  const ent = buildEntityVignette(entity);
  const [prompt, setPrompt] = useState("");
  const [stubbed, setStubbed] = useState(false);

  const verb = mode === "edit" ? "édite" : "façonne";
  const modeLabel = mode === "edit" ? "🔥 édition" : "🔥 création";
  const modeWord = mode === "edit" ? "édition" : "création";

  return (
    <div
      className="feanor-head"
      data-stub="true"
      aria-label="Fëanor en tête — coquille (aucune IA branchée)"
    >
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

      {/* — Fëanor glissé en tête : sa vignette (badge flamme) + la zone de prompt (INERTE) — */}
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
            aria-label={`Demander à Fëanor (coquille inerte) — ${modeWord}`}
            placeholder={`Demander à Fëanor de retravailler ${ent.name}…`}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setStubbed(false);
            }}
          />
          <button
            type="button"
            className="fh-send"
            aria-label="Envoyer à Fëanor (inerte — coquille, aucune IA)"
            title="Fëanor arrive bientôt — aucune IA branchée"
            onClick={() => setStubbed(true)}
          >
            ↥
          </button>
        </div>

        <div className="fh-sugg">
          {SUGGESTIONS.map((s) => (
            <button
              type="button"
              key={s}
              className="s"
              onClick={() => {
                setPrompt(s);
                setStubbed(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* État stub HONNÊTE : jamais de fausse réponse d'IA — juste l'aveu d'inertie. */}
        <p className={`fh-stub${stubbed ? " on" : ""}`} role={stubbed ? "status" : undefined}>
          {stubbed ? FEANOR_STUB_NOTICE : FEANOR_INERT_HINT}
        </p>
      </div>
    </div>
  );
}
