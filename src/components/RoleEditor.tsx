/**
 * RoleEditor — créer / éditer un **rôle** canonique (la FONCTION d'un intervenant) — présentationnel,
 * sœur de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs (`Role` du cœur : `{key, label, roleIndex}`) : **libellé** (libre) et **index de casting**
 * (0..8, pioche la teinte de vignette). La clé stable d'un rôle est **`key`** : elle est dérivée du
 * libellé à la création (`slugify`) et **verrouillée** ensuite (C-1 : jamais renommée). Ne persiste
 * rien : remonte le rôle construit à `onSubmit` (l'hôte fait l'upsert de session).
 */
import { useState } from "react";
import { slugify, type Role } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const EMPTY: Role = { key: "", label: "", roleIndex: 0 };

export function RoleEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<Role>) {
  const editing = Boolean(element);
  const [draft, setDraft] = useState<Role>(element ? { ...element } : { ...EMPTY });

  function patch(p: Partial<Role>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const label = draft.label.trim();
    if (label.length === 0) return;
    const key = editing && draft.key ? draft.key : uniqueId(slugify(label) || "role", existingIds);
    onSubmit({
      key,
      label,
      roleIndex: Number.isFinite(draft.roleIndex) ? draft.roleIndex : 0,
    });
    if (!editing) setDraft({ ...EMPTY });
  }

  const labelOk = draft.label.trim().length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer le rôle" : "Nouveau rôle"}</h3>

      {editing && (
        <div className="field">
          <label>clé (id)</label>
          <input className="locked" value={draft.key} disabled />
          <div className="lockhint">🔒 clé définitive — jamais renommée une fois créée (constitution C-1)</div>
        </div>
      )}

      <div className="field">
        <label>Libellé (libre)</label>
        <input
          value={draft.label}
          placeholder="ex. Coordination"
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Index de casting (0..8 — teinte de la vignette)</label>
        <input
          type="number"
          min={0}
          max={8}
          value={draft.roleIndex}
          onChange={(e) => patch({ roleIndex: Number(e.target.value) })}
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
          {editing ? "Enregistrer" : "Créer le rôle"}
        </button>
      </div>
    </div>
  );
}

/** Assure une clé unique dans le pool (suffixe -2, -3… si collision). */
function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
