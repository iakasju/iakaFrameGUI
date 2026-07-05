/**
 * PersonaEditor — créer / nommer librement / éditer une persona (présentationnel).
 *
 * Champs (§ 7.2 instruction) : **nom** (libre — AR-5), **rôle** (`<select>` des 7 rôles
 * canoniques par label), **royaume** (texte, MAJUSCULE), **roleIndex** (dérivé du rôle,
 * éditable), **skills** (catalogue + saisie libre tolérée), **gardes** (catalogue d'ids
 * d'intention ; MVP = déclaration). **AUCUN champ runner/modèle** (AR-1). Ne persiste rien
 * lui-même : remonte la persona construite à `onSubmit` (le parent appelle `upsertPersona`).
 */
import { useMemo, useState } from "react";
import {
  CANONICAL_ROLES,
  CATALOG_GUARDRAILS,
  CATALOG_SKILLS,
  personaBadge,
  roleIndexOf,
  slugify,
  type Persona,
} from "@iakaframe/core";

interface Props {
  /** Persona à éditer (absente = création). */
  persona?: Persona;
  /** Ids déjà pris dans la team (unicité) — hors la persona en cours d'édition. */
  existingIds?: string[];
  onSubmit: (persona: Persona) => void;
  onCancel?: () => void;
}

const EMPTY: Persona = {
  id: "",
  name: "",
  roleKey: CANONICAL_ROLES[0].key,
  royaume: CANONICAL_ROLES[0].key.toUpperCase(),
  roleIndex: 0,
  skills: [],
  guardrails: [],
};

export function PersonaEditor({ persona, existingIds = [], onSubmit, onCancel }: Props) {
  const editing = Boolean(persona);
  const [draft, setDraft] = useState<Persona>(persona ? { ...persona } : { ...EMPTY });
  const [freeSkill, setFreeSkill] = useState("");

  const roleSkills = useMemo(
    () => CATALOG_SKILLS.filter((s) => s.roleKey === draft.roleKey),
    [draft.roleKey],
  );

  function patch(p: Partial<Persona>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function onRoleChange(roleKey: string) {
    // roleIndex & royaume suivent le rôle par défaut (éditables ensuite).
    patch({
      roleKey,
      roleIndex: roleIndexOf(roleKey),
      royaume: draft.royaume.trim().length === 0 ? roleKey.toUpperCase() : draft.royaume,
    });
  }

  function toggle(list: "skills" | "guardrails", id: string) {
    const cur = draft[list];
    patch({ [list]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } as Partial<Persona>);
  }

  function addFreeSkill() {
    const s = freeSkill.trim();
    if (s.length === 0 || draft.skills.includes(s)) return;
    patch({ skills: [...draft.skills, s] });
    setFreeSkill("");
  }

  function submit() {
    const name = draft.name.trim();
    if (name.length === 0) return;
    const id =
      editing && draft.id ? draft.id : uniqueId(slugify(name) || "persona", existingIds);
    onSubmit({
      ...draft,
      id,
      name,
      royaume: (draft.royaume || draft.roleKey).toUpperCase(),
    });
    if (!editing) setDraft({ ...EMPTY });
  }

  const nameOk = draft.name.trim().length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer la persona" : "Nouvelle persona"}</h3>

      <div className="field">
        <label>Nom (libre)</label>
        <input
          value={draft.name}
          placeholder="ex. Aragorn, ou un nom choisi"
          onChange={(e) => patch({ name: e.target.value })}
        />
      </div>

      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>Rôle</label>
          <select value={draft.roleKey} onChange={(e) => onRoleChange(e.target.value)}>
            {CANONICAL_ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Royaume (MAJUSCULE)</label>
          <input
            value={draft.royaume}
            onChange={(e) => patch({ royaume: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="field">
          <label>roleIndex</label>
          <input
            type="number"
            style={{ width: 70 }}
            value={draft.roleIndex}
            onChange={(e) => patch({ roleIndex: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="field">
        <label>Skills (catalogue du rôle + saisie libre)</label>
        <div className="checks">
          {roleSkills.map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={draft.skills.includes(s.id)}
                onChange={() => toggle("skills", s.id)}
              />
              {s.label}
            </label>
          ))}
          {roleSkills.length === 0 && (
            <span className="empty">Aucune skill connue pour ce rôle.</span>
          )}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            value={freeSkill}
            placeholder="id de skill libre (ex. iakaframe-xxx)"
            onChange={(e) => setFreeSkill(e.target.value)}
          />
          <button className="btn ghost" type="button" onClick={addFreeSkill}>
            Ajouter
          </button>
        </div>
        {draft.skills.length > 0 && (
          <div style={{ marginTop: 6 }}>
            {draft.skills.map((s) => (
              <span key={s} className="tag">
                {s} ×
                <button
                  type="button"
                  onClick={() => toggle("skills", s)}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
                  aria-label={`retirer ${s}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label>Gardes-fous (déclaration d'intention — MVP)</label>
        <div className="checks">
          {CATALOG_GUARDRAILS.map((g) => (
            <label key={g.id}>
              <input
                type="checkbox"
                checked={draft.guardrails.includes(g.id)}
                onChange={() => toggle("guardrails", g.id)}
              />
              {g.label}
            </label>
          ))}
        </div>
      </div>

      <div className="row">
        <span className="badge">{personaBadge({ royaume: draft.royaume, name: draft.name || "Nom" })}</span>
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn" type="button" disabled={!nameOk} onClick={submit}>
          {editing ? "Enregistrer" : "Créer la persona"}
        </button>
      </div>
    </div>
  );
}

/** Assure un id unique dans la team (suffixe -2, -3… si collision). */
function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
