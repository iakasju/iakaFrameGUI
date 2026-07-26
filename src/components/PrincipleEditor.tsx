/**
 * PrincipleEditor — créer / éditer un **principe** (politique composable de la Méthode) —
 * présentationnel, sœur sobre de `PersonaEditor` (chantier #3 Lot 1,
 * extension-feanor-en-tete-pages-elements.md § 4.3).
 *
 * Champs (`Principle` du cœur : `{id, label, policy, trigger}`) : **libellé** (libre), **politique**
 * (le « quoi »/« pourquoi »), **déclencheur** (quand elle s'applique). L'**id** est dérivé du libellé
 * à la création (`slugify`) et **verrouillé** ensuite (constitution C-1 : jamais renommé). Ne persiste
 * rien lui-même : remonte le principe construit à `onSubmit` (l'hôte fait l'upsert de session).
 */
import { useState } from "react";
import { slugify, type Principle } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const EMPTY: Principle = { id: "", label: "", policy: "", trigger: "" };

export function PrincipleEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<Principle>) {
  const editing = Boolean(element);
  const [draft, setDraft] = useState<Principle>(element ? { ...element } : { ...EMPTY });

  function patch(p: Partial<Principle>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const label = draft.label.trim();
    if (label.length === 0) return;
    const id = editing && draft.id ? draft.id : uniqueId(slugify(label) || "principe", existingIds);
    onSubmit({
      id,
      label,
      policy: draft.policy.trim(),
      trigger: draft.trigger.trim(),
    });
    if (!editing) setDraft({ ...EMPTY });
  }

  const labelOk = draft.label.trim().length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer le principe" : "Nouveau principe"}</h3>

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
          placeholder="ex. MVP d'abord"
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Politique (le « quoi »/« pourquoi »)</label>
        <textarea
          value={draft.policy}
          placeholder="ex. MVP d'abord, puis itérer ; pas de sur-ingénierie."
          onChange={(e) => patch({ policy: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Déclencheur (quand la politique s'applique)</label>
        <input
          value={draft.trigger}
          placeholder="ex. cadrage d'une feature"
          onChange={(e) => patch({ trigger: e.target.value })}
        />
      </div>

      <div className="row">
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn" type="button" disabled={!labelOk} onClick={submit}>
          {editing ? "Enregistrer" : "Créer le principe"}
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
