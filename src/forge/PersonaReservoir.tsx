/**
 * PersonaReservoir — l'écran **réservoir de personas** de 1er ordre (Lot 3,
 * alignement-gui-modele-de-frame.md § A3, Fork F). Remplace le placeholder `persona` posé au
 * Lot 2. La persona devient un **élément de 1er ordre** (`library/personas/`), édité **hors team**,
 * rendu comme la maquette validée `specs/mock/gui/01-library.html` (grille de **fiches à
 * vignettes**) et `02-feanor-prompt-element.html` (la **fiche** en mode ✎ édition).
 *
 * DONNÉES — GUI-only : le réservoir est alimenté par les **personas vendorées** du cœur
 * (`CANONICAL_ROSTER` — les 9 : odin·aragorn·gandalf·gimli·legolas·helm·loki·nathalie·feanor).
 * La **vignette** est un rendu dérivé des champs EXISTANTS (initiales + dégradé casté par
 * `roleIndex`) — aucun asset ni champ canon neuf (règle cross-repo). Aucun contrat de
 * `packages/core` n'est touché : projection pure via `buildPersonaReservoir`.
 *
 * SÉLECTION → ÉDITION : cliquer une fiche l'ouvre en **mode édition** (pastille ✎ édition,
 * cohérente avec le pattern « élément sélectionné → mode édition » du Lot 2), et **New** ouvre le
 * **même composant** (`PersonaEditor`) en **création** (✚ création). Les modifications restent en
 * **état local** de session (MVP — aucune écriture disque : la persistance `library/personas/`
 * relève d'un chantier I/O ultérieur ; Fëanor-en-tête = Lot 6, NON implémenté ici).
 */
import { useState } from "react";
import { cloneCanonicalRoster, type Persona } from "@iakaframe/core";
import { buildPersonaReservoir } from "./personaCards";
import { PersonaEditor } from "../components/PersonaEditor";

type Mode = "grid" | "edit" | "create";

export function PersonaReservoir() {
  // Copie éditable du réservoir vendoré (les 9 personas canoniques). Aucune écriture disque.
  const [personas, setPersonas] = useState<Persona[]>(() => cloneCanonicalRoster());
  const [mode, setMode] = useState<Mode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cards = buildPersonaReservoir(personas);
  const selected = personas.find((p) => p.id === selectedId) ?? null;

  const backToGrid = () => {
    setMode("grid");
    setSelectedId(null);
  };

  const onSubmit = (p: Persona) => {
    setPersonas((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = p;
        return next;
      }
      return [...prev, p];
    });
    backToGrid();
  };

  // --- Fiche : élément sélectionné (édition) OU nouvelle persona (création) ---
  if (mode === "edit" && selected) {
    return (
      <PersonaFiche mode="edit" label={selected.id} onBack={backToGrid}>
        <PersonaEditor
          persona={selected}
          existingIds={personas.filter((p) => p.id !== selected.id).map((p) => p.id)}
          onSubmit={onSubmit}
          onCancel={backToGrid}
        />
      </PersonaFiche>
    );
  }
  if (mode === "create") {
    return (
      <PersonaFiche mode="create" label="nouvelle" onBack={backToGrid}>
        <PersonaEditor
          existingIds={personas.map((p) => p.id)}
          onSubmit={onSubmit}
          onCancel={backToGrid}
        />
      </PersonaFiche>
    );
  }

  // --- Grille de fiches à vignettes (le réservoir) ---
  return (
    <section className="persona-reservoir" aria-label="Réservoir de personas">
      <div className="crumb">LIBRARY / PERSONAS</div>
      <div className="h1">Le réservoir de personas</div>
      <p className="sub">
        Le <strong>casting du réservoir</strong> — {cards.length} personas de 1er ordre,
        réutilisables et référencées (jamais copiées) par les teams. Ouvrez une fiche pour l'éditer.
      </p>

      <div className="rvhead">
        <span className="seclabel">
          Personas <span className="n">— le casting · {cards.length}</span>
        </span>
        <button
          type="button"
          className="newpersona"
          onClick={() => {
            setSelectedId(null);
            setMode("create");
          }}
        >
          <span className="plus" aria-hidden="true">
            +
          </span>{" "}
          Nouvelle persona
        </button>
      </div>

      <div className="pgrid">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            className="pcard"
            aria-label={`Ouvrir la fiche de ${c.name}`}
            onClick={() => {
              setSelectedId(c.id);
              setMode("edit");
            }}
          >
            <span className="royaume">{c.royaume}</span>
            <div className="top">
              <span
                className="vg"
                style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})` }}
                aria-hidden="true"
              >
                {c.initials}
              </span>
              <div>
                <div className="nm">
                  {c.pastille ? `${c.pastille} ` : ""}
                  {c.name}
                </div>
                <div className="ref">{c.badge}</div>
              </div>
            </div>
            <div className="role">
              {c.roleLabel} <span className="ri">· index {c.roleIndex}</span>
            </div>
            <div className="chips">
              {c.skills.map((s) => (
                <span key={s} className="chip sk">
                  {s}
                </span>
              ))}
              {c.guardrails.map((g) => (
                <span key={g} className="chip gd">
                  ⛨ {g}
                </span>
              ))}
              {c.skills.length === 0 && c.guardrails.length === 0 && (
                <span className="chip muted">aucune skill déclarée</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * PersonaFiche — coquille de la **fiche** (mode édition/création) : fil d'Ariane + pastille de
 * mode (✎ édition / ✚ création, cohérente avec le Lot 2), puis le formulaire d'édition (l'éditeur
 * de persona existant, réutilisé — pattern d'ouverture/édition déjà en place). *Fëanor-en-tête =
 * Lot 6, NON monté ici.*
 */
function PersonaFiche({
  mode,
  label,
  onBack,
  children,
}: {
  mode: "edit" | "create";
  label: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="persona-reservoir persona-fiche" aria-label="Fiche persona">
      <div className="crumb">
        <button type="button" className="crumblink" onClick={onBack}>
          library
        </button>{" "}
        / personas / <span className="cur">{label}</span>
        <span className={`mode-pill ${mode}`}>
          {mode === "edit" ? "✎ édition" : "✚ création"}
        </span>
      </div>
      {children}
    </section>
  );
}
