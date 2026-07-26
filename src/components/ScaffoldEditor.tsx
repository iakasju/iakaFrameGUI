/**
 * ScaffoldEditor — créer / éditer un **scaffold** (échafaudage de dossiers d'un niveau) —
 * présentationnel, sœur de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs **essentiels** (`Scaffold` du cœur : `{id, level, entries[], nonDestructive}`) : le **nom/id**
 * (un scaffold n'a pas de `label` — son id EST son nom) et le **niveau** `portfolio`|`project`. L'id est
 * dérivé du nom saisi à la création (`slugify`) et **verrouillé** ensuite (C-1). `nonDestructive` est un
 * **invariant forcé à `true`** (jamais écraser l'existant).
 *
 * SIMPLIFICATION MVP (à remonter) : le champ **`entries`** (tableau `{path, role, createIfAbsent}`) est
 * une shape riche dont l'édition dépasse un formulaire simple ; il est **préservé tel quel en édition**
 * et vaut **`[]` en création**. Son authoring réel (ajouter/éditer des entrées) reste hors MVP. Ne
 * persiste rien : remonte à `onSubmit`.
 */
import { useState } from "react";
import { slugify, type Scaffold, type ScaffoldLevel } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const LEVELS: ScaffoldLevel[] = ["portfolio", "project"];

const EMPTY: Scaffold = { id: "", level: "project", entries: [], nonDestructive: true };

export function ScaffoldEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<Scaffold>) {
  const editing = Boolean(element);
  const [draft, setDraft] = useState<Scaffold>(
    element ? { ...element, entries: element.entries.map((e) => ({ ...e })) } : { ...EMPTY },
  );
  // Champ « nom » libre en création (le scaffold n'a pas de label → l'id naît du nom saisi).
  const [nameDraft, setNameDraft] = useState(draft.id);

  function patch(p: Partial<Scaffold>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const name = editing ? draft.id : nameDraft.trim();
    if (name.length === 0) return;
    const id = editing && draft.id ? draft.id : uniqueId(slugify(name) || "scaffold", existingIds);
    onSubmit({
      id,
      level: draft.level,
      // entries préservées (édition) ou vides (création) — non éditables au MVP.
      entries: draft.entries,
      nonDestructive: true, // invariant : jamais écraser l'existant.
    });
    if (!editing) {
      setDraft({ ...EMPTY });
      setNameDraft("");
    }
  }

  const nameOk = (editing ? draft.id : nameDraft.trim()).length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer le scaffold" : "Nouveau scaffold"}</h3>

      {editing ? (
        <div className="field">
          <label>id</label>
          <input className="locked" value={draft.id} disabled />
          <div className="lockhint">🔒 id définitif — jamais renommé une fois créé (constitution C-1)</div>
        </div>
      ) : (
        <div className="field">
          <label>Nom / id (libre)</label>
          <input
            value={nameDraft}
            placeholder="ex. project"
            onChange={(e) => setNameDraft(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>Niveau</label>
        <select value={draft.level} onChange={(e) => patch({ level: e.target.value as ScaffoldLevel })}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {editing && draft.entries.length > 0 && (
        <div className="field">
          <label>Entrées (chemins)</label>
          <input className="locked" value={`${draft.entries.length} entrée(s) préservée(s)`} disabled />
          <div className="lockhint">ⓘ entrées préservées — leur authoring (path/role) est hors MVP</div>
        </div>
      )}

      <div className="field">
        <label>Non destructif</label>
        <input className="locked" value="true (invariant d'onboarding)" disabled />
      </div>

      <div className="row">
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn" type="button" disabled={!nameOk} onClick={submit}>
          {editing ? "Enregistrer" : "Créer le scaffold"}
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
