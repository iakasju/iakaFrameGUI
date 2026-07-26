/**
 * ScaffoldEditor — créer / éditer un **scaffold** (échafaudage de dossiers d'un niveau) —
 * présentationnel, sœur de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs **essentiels** (`Scaffold` du cœur : `{id, level, entries[], nonDestructive}`) : le **nom/id**
 * (un scaffold n'a pas de `label` — son id EST son nom) et le **niveau** `portfolio`|`project`. L'id est
 * dérivé du nom saisi à la création (`slugify`) et **verrouillé** ensuite (C-1). `nonDestructive` est un
 * **invariant forcé à `true`** (jamais écraser l'existant).
 *
 * **Chantier #4 Lot A** : le champ **`entries`** (`{path, role, createIfAbsent}`) est désormais éditable
 * via le socle réutilisable `<ListEditor>` (add/remove/reorder ↑↓, ligne structurée = 2 inputs + 1
 * checkbox). Le cœur porte le round-trip : `scaffoldFrontmatterPatch` ré-émet `entries` **seulement si
 * la séquence change** (sinon verbatim). Ne persiste rien : remonte le scaffold édité à `onSubmit`.
 */
import { useState } from "react";
import { slugify, type Scaffold, type ScaffoldEntry, type ScaffoldLevel } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";
import { ListEditor } from "./ListEditor";

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
  // Un id est « committé » (verrouillé) dès qu'il est non vide — vrai en édition, mais AUSSI faux en
  // création-avec-proposition (brique B) où l'hôte seede un élément vierge (id "") : le champ nom reste
  // alors saisissable (sans quoi le save serait bloqué). Aligne le patron sur `PersonaEditor`.
  const hasCommittedId = draft.id.length > 0;

  function patch(p: Partial<Scaffold>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const name = hasCommittedId ? draft.id : nameDraft.trim();
    if (name.length === 0) return;
    const id = hasCommittedId ? draft.id : uniqueId(slugify(name) || "scaffold", existingIds);
    onSubmit({
      id,
      level: draft.level,
      // entries éditées via <ListEditor> (Lot A) — path vide filtré (ligne incomplète ignorée).
      entries: draft.entries.filter((e) => e.path.trim().length > 0),
      nonDestructive: true, // invariant : jamais écraser l'existant.
    });
    if (!editing) {
      setDraft({ ...EMPTY });
      setNameDraft("");
    }
  }

  const nameOk = (hasCommittedId ? draft.id : nameDraft.trim()).length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer le scaffold" : "Nouveau scaffold"}</h3>

      {hasCommittedId ? (
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

      <div className="field">
        <label>Entrées (chemins d'échafaudage)</label>
        <ListEditor<ScaffoldEntry>
          items={draft.entries}
          onChange={(entries) => patch({ entries })}
          blankRow={() => ({ path: "", role: "", createIfAbsent: true })}
          legend="Entrées d'échafaudage"
          addLabel="Ajouter une entrée"
          itemLabel={(e, i) => (e.path.trim() ? `entrée ${e.path}` : `entrée ${i + 1}`)}
          emptyLabel="Aucune entrée — cet échafaudage ne pose aucun fichier/dossier."
          renderRow={(entry, onRowChange) => (
            <>
              <input
                aria-label="chemin"
                placeholder="ex. specs/instructions/"
                value={entry.path}
                onChange={(e) => onRowChange({ ...entry, path: e.target.value })}
              />
              <input
                aria-label="rôle"
                placeholder="à quoi sert cette entrée"
                value={entry.role}
                onChange={(e) => onRowChange({ ...entry, role: e.target.value })}
              />
              <label className="list-editor-check">
                <input
                  type="checkbox"
                  checked={entry.createIfAbsent}
                  onChange={(e) => onRowChange({ ...entry, createIfAbsent: e.target.checked })}
                />
                créer si absent (non destructif)
              </label>
            </>
          )}
        />
      </div>

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
