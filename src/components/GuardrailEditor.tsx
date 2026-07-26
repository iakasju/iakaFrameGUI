/**
 * GuardrailEditor — créer / éditer un **garde-fou** (contrainte de discipline de 1re classe) —
 * présentationnel, sœur de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs (`Guardrail` du cœur, vue d'affichage ; l'atome disque est `{id, label, kind, hook, policy}`) :
 * **libellé** (libre) et **politique** (`policy`, prose de la garde) sont **éditables** (chantier #4
 * Lot B : `policy` modélisé par `guardrailFrontmatterPatch`). L'**id** est dérivé du libellé à la
 * création (`slugify`) et **verrouillé** ensuite (C-1).
 *
 * **Honnêteté (Lot B, AC1)** :
 * - **`kind`** est **load-bearing** (enum couplé au code des hooks) → **verrouillé** (affiché, non
 *   éditable), préservé verbatim par `guardrailFrontmatterPatch`. Le rendre éditable induirait un faux
 *   branchement de hook.
 * - Le **`scope`** n'est **PAS un champ du disque plat** (méta d'affichage dérivée du catalogue) : son
 *   contrôle éditable **était un fantôme** (valeur jetée au save) → **retiré**. `scope` reste porté par
 *   le type d'affichage (préservé tel quel), sans contrôle trompeur.
 *
 * Le champ riche **`rendering`** (hook/prose — descripteur de câblage) reste **préservé tel quel** en
 * édition et vaut **`{}`** en création (aucun rendu fabriqué). Ne persiste rien : remonte à `onSubmit`.
 */
import { useState } from "react";
import { slugify, type Guardrail } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const EMPTY: Guardrail = { id: "", kind: "custom", label: "", scope: "persona", rendering: {}, policy: "" };

export function GuardrailEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<Guardrail>) {
  const editing = Boolean(element);
  const [draft, setDraft] = useState<Guardrail>(element ? { ...element } : { ...EMPTY });

  function patch(p: Partial<Guardrail>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const label = draft.label.trim();
    if (label.length === 0) return;
    const id = editing && draft.id ? draft.id : uniqueId(slugify(label) || "guardrail", existingIds);
    onSubmit({
      ...draft,
      id,
      label,
      // kind : verrouillé (load-bearing) — préservé tel quel, jamais réattribué par l'édition.
      // scope : méta d'affichage préservée telle quelle (plus aucun contrôle fantôme).
      // rendering : préservé tel quel (édition) ou vide (création) — non éditable au MVP.
      rendering: draft.rendering ?? {},
      policy: draft.policy ?? "",
    });
    if (!editing) setDraft({ ...EMPTY });
  }

  const labelOk = draft.label.trim().length > 0;
  const hasRendering = Boolean(draft.rendering?.hook || draft.rendering?.prose);

  return (
    <div className="panel">
      <h3>{editing ? "Éditer le garde-fou" : "Nouveau garde-fou"}</h3>

      {editing && (
        <div className="field">
          <label>id</label>
          <input className="locked" value={draft.id} disabled />
          <div className="lockhint">🔒 id définitif — jamais renommé une fois créé (constitution C-1)</div>
        </div>
      )}

      <div className="field">
        <label>Libellé (libre)</label>
        <input
          value={draft.label}
          placeholder="ex. Canal d'identité (badges/pastilles)"
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Nature (kind)</label>
        <input className="locked" value={draft.kind} disabled />
        <div className="lockhint">
          🔒 nature load-bearing — enum couplé au câblage des hooks, préservé du disque (jamais réattribué)
        </div>
      </div>

      <div className="field">
        <label>Politique (policy)</label>
        <textarea
          rows={4}
          value={draft.policy ?? ""}
          placeholder="Prose de la garde : ce qu'elle fait respecter…"
          onChange={(e) => patch({ policy: e.target.value })}
        />
      </div>

      {hasRendering && (
        <div className="field">
          <label>Rendus (hook / prose)</label>
          <input
            className="locked"
            value={[draft.rendering?.hook ? "hook" : "", draft.rendering?.prose ? "prose" : ""]
              .filter(Boolean)
              .join(" + ")}
            disabled
          />
          <div className="lockhint">
            ⓘ rendus préservés — leur authoring (câblage hook / prose) est hors MVP
          </div>
        </div>
      )}

      <div className="row">
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn" type="button" disabled={!labelOk} onClick={submit}>
          {editing ? "Enregistrer" : "Créer le garde-fou"}
        </button>
      </div>
    </div>
  );
}

/** Assure un id unique dans le pool (suffixe -2, -3… si collision). */
function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
