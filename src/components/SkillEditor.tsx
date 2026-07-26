/**
 * SkillEditor — créer / éditer une **skill** (le « comment » outillé d'un rôle), rebranché sur
 * l'atome **DISQUE** `SkillAtom {id, name, description, subskills}` (chantier #4 Lot C, AR-E E1).
 *
 * Avant le Lot C, l'éditeur parlait le type d'**attribution catalogue** `Skill {id, roleKey, label}` :
 * `label`/`roleKey` étaient des **contrôles fantômes** (édités à l'écran mais **jetés au save**, car
 * `persistSkill` relisait l'atome réel et **ignorait** l'entrée de l'éditeur → l'édition d'une skill
 * était un quasi no-op). Le Lot C **rebranche sur l'atome disque** — la vérité DÉRIVE du `.md` (même
 * doctrine que le Lot 5) — et rend l'authoring **honnête et complet** :
 *
 * - **id** (== nom de dossier `library/skills/<id>/SKILL.md`) : **verrouillé** (C-1, jamais renommé).
 * - **name** (== id au canon) : **verrouillé** (préservé verbatim au MVP, non éditable).
 * - **description** : **éditable** (textarea) — **load-bearing** (blurb de déclenchement du sous-agent :
 *   sa formulation conditionne la découverte / l'invocation de la skill) → **garde visible** (avertit
 *   sans empêcher : le risque est un jugement d'authoring, pas une corruption ; scalaire round-trip sûr).
 * - **subskills** : **éditable** via le socle réutilisable `<ListEditor>` du Lot A (liste de strings,
 *   `renderRow` = 1 input par ligne). Remonté en `string[]` ; `skillFrontmatterPatch` ne l'émet que non
 *   vide (piège du round-trip : `subskills: []` ajouterait une ligne parasite sur une skill atomique).
 * - **corps `SKILL.md`** (le vrai payload) : **différé** — préservé verbatim (`verbatimBody`), non exposé.
 *
 * Ne persiste rien : remonte l'atome construit à `onSubmit` (l'hôte fait l'upsert + l'écriture disque
 * non-destructive via `persistSkill`).
 */
import { useState } from "react";
import { slugify, type SkillAtom } from "@iakaframe/core";
import type { ElementEditorProps } from "../forge/elementKind";
import { ListEditor } from "./ListEditor";

const EMPTY: SkillAtom = { id: "", name: "", description: "", subskills: [] };

export function SkillEditor({
  element,
  existingIds = [],
  onSubmit,
  onCancel,
}: ElementEditorProps<SkillAtom>) {
  const editing = Boolean(element);
  const [draft, setDraft] = useState<SkillAtom>(
    element ? { ...element, subskills: [...element.subskills] } : { ...EMPTY },
  );
  // Champ « nom » libre en création (la skill est un dossier `<id>/` → l'id naît du nom saisi, name == id).
  const [nameDraft, setNameDraft] = useState(draft.name);

  function patch(p: Partial<SkillAtom>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function submit() {
    const name = editing ? draft.name : nameDraft.trim();
    if (name.length === 0) return;
    const id = editing && draft.id ? draft.id : uniqueId(slugify(name) || "skill", existingIds);
    onSubmit({
      id,
      // name == id au canon (verrouillé C-1) : préservé verbatim en édition, == id à la création.
      name: editing ? draft.name : id,
      description: draft.description,
      // subskills édités via <ListEditor> — lignes vides filtrées (ligne à demi saisie non persistée).
      subskills: draft.subskills.map((s) => s.trim()).filter((s) => s.length > 0),
    });
    if (!editing) {
      setDraft({ ...EMPTY });
      setNameDraft("");
    }
  }

  const nameOk = (editing ? draft.name : nameDraft.trim()).length > 0;

  return (
    <div className="panel">
      <h3>{editing ? "Éditer la skill" : "Nouvelle skill"}</h3>

      {editing ? (
        <>
          <div className="field">
            <label>id</label>
            <input className="locked" value={draft.id} disabled />
            <div className="lockhint">🔒 id définitif — jamais renommé une fois créé (constitution C-1)</div>
          </div>
          <div className="field">
            <label>Nom (name)</label>
            <input className="locked" value={draft.name} disabled />
            <div className="lockhint">🔒 nom préservé du disque (== id au canon) — non éditable au MVP</div>
          </div>
        </>
      ) : (
        <div className="field">
          <label>Nom / id (libre)</label>
          <input
            value={nameDraft}
            placeholder="ex. iakaframe-revue-securite"
            onChange={(e) => setNameDraft(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>Description (blurb de déclenchement)</label>
        <textarea
          rows={4}
          value={draft.description}
          placeholder="Ce que fait la skill + quand l'invoquer (déclenchement du sous-agent)…"
          onChange={(e) => patch({ description: e.target.value })}
        />
        <div className="lockhint">
          ⚠️ champ load-bearing — ce blurb pilote la <strong>découverte / l'invocation</strong> de la
          skill par le sous-agent : sa formulation conditionne le routage du dispatch. À rédiger avec soin.
        </div>
      </div>

      <div className="field">
        <label>Sous-skills (composition)</label>
        <ListEditor<string>
          items={draft.subskills}
          onChange={(subskills) => patch({ subskills })}
          blankRow={() => ""}
          legend="Sous-skills composées"
          addLabel="Ajouter une sous-skill"
          itemLabel={(s, i) => (s.trim() ? `sous-skill ${s}` : `sous-skill ${i + 1}`)}
          emptyLabel="Aucune sous-skill — skill atomique (aucune fermeture de composition)."
          renderRow={(sub, onRowChange) => (
            <input
              aria-label="id de sous-skill"
              placeholder="ex. iakaframe-gestion-de-source"
              value={sub}
              onChange={(e) => onRowChange(e.target.value)}
            />
          )}
        />
      </div>

      <div className="row">
        <div style={{ flex: 1 }} />
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn" type="button" disabled={!nameOk} onClick={submit}>
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
