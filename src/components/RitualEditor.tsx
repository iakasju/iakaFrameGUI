/**
 * RitualEditor — créer / éditer un **rituel** (geste outillé : déclencheurs → actions) —
 * présentationnel, sœur de `PrincipleEditor` (chantier #3 Lot 2).
 *
 * Champs (`Ritual` du cœur : `{id, label, triggers[], actions[], side}`) : **libellé** (libre),
 * **tranche** `forge`|`cockpit`|`team`, **déclencheurs** et **actions** (une par ligne). L'**id** est dérivé
 * du libellé à la création (`slugify`) et **verrouillé** ensuite (C-1). L'éditeur remonte le rituel
 * construit à `onSubmit` ; l'hôte `ElementReservoir` l'**upsert en session puis le persiste** via
 * `persistRitual`→`poolWrite` (câblé Lot 5c). Ce qui reste **différé** est l'**exécution** du geste
 * côté cœur (scripts, journalisation — `ritual.ts`), **pas** la persistance de l'édition.
 */
import { useState } from "react";
import { slugify, type Ritual, type RitualSide } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";

const EMPTY: Ritual = { id: "", label: "", triggers: [], actions: [], side: "cockpit" };

/** Lignes non vides d'un textarea → tableau (et inversement pour l'affichage). */
function toLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function RitualEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<Ritual>) {
  const editing = Boolean(element);
  const [draft, setDraft] = useState<Ritual>(
    element ? { ...element, triggers: [...element.triggers], actions: [...element.actions] } : { ...EMPTY },
  );
  const [triggersText, setTriggersText] = useState(draft.triggers.join("\n"));
  const [actionsText, setActionsText] = useState(draft.actions.join("\n"));

  function patch(p: Partial<Ritual>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const label = draft.label.trim();
    if (label.length === 0) return;
    const id = editing && draft.id ? draft.id : uniqueId(slugify(label) || "rituel", existingIds);
    onSubmit({
      id,
      label,
      triggers: toLines(triggersText),
      actions: toLines(actionsText),
      side: draft.side,
    });
    if (!editing) {
      setDraft({ ...EMPTY });
      setTriggersText("");
      setActionsText("");
    }
  }

  const labelOk = draft.label.trim().length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer le rituel" : "Nouveau rituel"}</h3>

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
          placeholder="ex. iakastart (bootstrap team)"
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Tranche</label>
        <select value={draft.side} onChange={(e) => patch({ side: e.target.value as RitualSide })}>
          <option value="forge">forge (fabrication)</option>
          <option value="cockpit">cockpit (run)</option>
          <option value="team">team (équipe)</option>
        </select>
      </div>

      <div className="field">
        <label>Déclencheurs (un par ligne)</label>
        <textarea
          value={triggersText}
          placeholder={"iakastart\niakaframe\nodin"}
          onChange={(e) => setTriggersText(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Actions (une par ligne)</label>
        <textarea
          value={actionsText}
          placeholder={"Afficher le banner + le roster.\nRendre la team prête au dispatch."}
          onChange={(e) => setActionsText(e.target.value)}
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
          {editing ? "Enregistrer" : "Créer le rituel"}
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
