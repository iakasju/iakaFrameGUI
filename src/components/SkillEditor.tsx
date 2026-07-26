/**
 * SkillEditor — créer / éditer une **skill** (le « comment » outillé d'un rôle) — présentationnel,
 * sœur sobre de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs (`Skill` du cœur : `{id, roleKey, label}`) : **libellé** (libre) et **rôle de rattachement**
 * (choisi dans les rôles canoniques, saisie libre tolérée AR-5). L'**id** est dérivé du libellé à la
 * création (`slugify`) et **verrouillé** ensuite (constitution C-1 : jamais renommé). Le corps riche
 * d'une skill (`SKILL.md`, allowedTools, hooks) est **différé côté cœur** (skill.ts) — hors MVP.
 * Ne persiste rien : remonte la skill construite à `onSubmit` (l'hôte fait l'upsert de session).
 */
import { useState } from "react";
import { slugify, CANONICAL_ROLES, type Skill } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const EMPTY: Skill = { id: "", roleKey: "", label: "" };

export function SkillEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<Skill>) {
  const editing = Boolean(element);
  const [draft, setDraft] = useState<Skill>(element ? { ...element } : { ...EMPTY });

  function patch(p: Partial<Skill>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const label = draft.label.trim();
    if (label.length === 0) return;
    const id = editing && draft.id ? draft.id : uniqueId(slugify(label) || "skill", existingIds);
    onSubmit({ id, roleKey: draft.roleKey.trim(), label });
    if (!editing) setDraft({ ...EMPTY });
  }

  const labelOk = draft.label.trim().length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer la skill" : "Nouvelle skill"}</h3>

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
          placeholder="ex. Cadrage / architecture"
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Rôle de rattachement</label>
        <input
          list="skill-roles"
          value={draft.roleKey}
          placeholder="ex. cadrage"
          onChange={(e) => patch({ roleKey: e.target.value })}
        />
        <datalist id="skill-roles">
          {CANONICAL_ROLES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </datalist>
      </div>

      <div className="row">
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn" type="button" disabled={!labelOk} onClick={submit}>
          {editing ? "Enregistrer" : "Créer la skill"}
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
