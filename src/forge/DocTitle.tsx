/**
 * DocTitle — titre de l'**artefact courant** (§6) : grand, centré, sous la barre d'onglets.
 * Préfixe l'indicateur `•` quand le document est modifié (`dirty`). Purement présentationnel
 * (alimenté par le `useForgeDocument` de l'onglet actif).
 */
export function DocTitle({ name, dirty }: { name: string; dirty: boolean }) {
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
