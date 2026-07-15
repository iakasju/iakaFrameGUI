/**
 * DocTitle — titre de l'**artefact courant** (§6) : grand, centré, sous la barre d'onglets.
 * Préfixe l'indicateur `•` quand le document est modifié (`dirty`).
 *
 * Deux variantes :
 * - **éditable** (si `onNameChange` fourni **et** `disabled !== true`) → `<input>` **contrôlé** stylé
 *   en grand titre, labellisé (`aria-label`), renvoyant la frappe **telle quelle** (texte libre, aucun
 *   slug/trim à la frappe → pas de saut de curseur, §10). Pas de `role="heading"` sur un `<input>` (Q-5).
 * - **read-only** (sinon) → l'actuel span (comportement inchangé, `role="heading"` conservé).
 *
 * Purement présentationnel : alimenté par le `useForgeDocument` de l'onglet actif ; toute mutation
 * d'état passe par le callback `onNameChange` (façade unique, aucun `invoke`).
 */
export function DocTitle({
  name,
  dirty,
  onNameChange,
  disabled,
}: {
  name: string;
  dirty: boolean;
  onNameChange?: (name: string) => void;
  disabled?: boolean;
}) {
  const editable = onNameChange != null && disabled !== true;

  if (editable) {
    return (
      <div className="doctitle doctitle-edit">
        {dirty && (
          <span className="doc-dirty" aria-label="modifié" title="modifications non sauvées">
            •
          </span>
        )}
        <input
          className="doc-name-input"
          aria-label="Nom du document"
          value={name}
          placeholder="sans-titre"
          onChange={(ev) => onNameChange(ev.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="doctitle" role="heading" aria-level={2}>
      {dirty && (
        <span className="doc-dirty" aria-label="modifié" title="modifications non sauvées">
          •
        </span>
      )}
      <span className="doc-name">{name || "sans-titre"}</span>
    </div>
  );
}
