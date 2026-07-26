/**
 * RoleEditor — créer / éditer un **rôle** canonique (la FONCTION d'un intervenant) — présentationnel,
 * sœur de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs (`Role` du cœur : `{id?, key, label, roleIndex, scope?}`) : **libellé** (libre) et **portée**
 * (`scope`, ex. `team`) sont **éditables** (chantier #4 Lot B : `scope` modélisé par
 * `roleFrontmatterPatch`). La clé stable d'un rôle est **`key`** : dérivée du libellé à la création
 * (`slugify`) et **verrouillée** ensuite (C-1 : jamais renommée). Ne persiste rien : remonte le rôle
 * construit à `onSubmit` (l'hôte fait l'upsert de session).
 *
 * **Honnêteté (Lot B, AC1)** : `roleIndex` est **préservé verbatim, jamais recalculé** à l'écriture
 * (`roleFrontmatterPatch` ne l'émet pas — 5c). Le rendre éditable serait un **contrôle fantôme** (valeur
 * jetée au save) ; il est donc affiché **verrouillé** (`locked` + `lockhint`), comme `key`.
 */
import { useState } from "react";
import { slugify, type Role } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const EMPTY: Role = { key: "", label: "", roleIndex: 0, scope: "team" };

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
    const scope = (draft.scope ?? "team").trim() || "team";
    onSubmit({
      ...draft,
      key,
      label,
      // roleIndex : préservé tel quel (jamais recalculé) — verrouillé à l'écran, jamais un fantôme.
      roleIndex: Number.isFinite(draft.roleIndex) ? draft.roleIndex : 0,
      scope,
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
        <label>Portée (scope)</label>
        <input
          value={draft.scope ?? "team"}
          placeholder="ex. team"
          onChange={(e) => patch({ scope: e.target.value })}
        />
      </div>

      <div className="field">
        <label>roleIndex</label>
        <input className="locked" style={{ width: 70 }} value={draft.roleIndex} disabled />
        <div className="lockhint">
          🔒 index de casting — préservé du disque, jamais recalculé (verrouillé, jamais persisté par l'édition)
        </div>
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
