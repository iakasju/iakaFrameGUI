/**
 * GuardrailEditor — créer / éditer un **garde-fou** (contrainte de discipline de 1re classe) —
 * présentationnel, sœur de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs **essentiels** (`Guardrail` du cœur : `{id, kind, label, scope, rendering}`) : **libellé**
 * (libre), **nature** (`kind`) et **portée** (`scope`). L'**id** est dérivé du libellé à la création
 * (`slugify`) et **verrouillé** ensuite (C-1).
 *
 * SIMPLIFICATION MVP (à remonter) : le champ **`rendering`** (hook/prose — descripteur de câblage +
 * prose comportementale) est une shape riche dont l'édition dépasse un formulaire de champs simples ;
 * il est **préservé tel quel en édition** et vaut **`{}` en création** (aucun rendu fabriqué). Son
 * authoring réel (éditer hook/prose) reste hors MVP. Ne persiste rien : remonte à `onSubmit`.
 */
import { useState } from "react";
import {
  slugify,
  type Guardrail,
  type GuardrailKind,
  type GuardrailScope,
} from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const KINDS: GuardrailKind[] = ["identity", "perimeter", "delegation", "permission", "custom"];
const SCOPES: GuardrailScope[] = ["team", "persona", "role"];

const EMPTY: Guardrail = { id: "", kind: "custom", label: "", scope: "persona", rendering: {} };

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
      id,
      label,
      kind: draft.kind,
      scope: draft.scope,
      // rendering préservé tel quel (édition) ou vide (création) — non éditable au MVP.
      rendering: draft.rendering ?? {},
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
        <label>Nature</label>
        <select value={draft.kind} onChange={(e) => patch({ kind: e.target.value as GuardrailKind })}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Portée</label>
        <select value={draft.scope} onChange={(e) => patch({ scope: e.target.value as GuardrailScope })}>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
