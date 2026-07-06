/**
 * KitTreeView — visualisation du **kit généré** (P4, U-2/U-3). À gauche : la liste **triée**
 * des chemins du `KitFileTree` (arbre EN MÉMOIRE) ; à droite : l'**aperçu** en **lecture seule**
 * du contenu du fichier sélectionné. **Aucune écriture disque** : ce composant ne fait que
 * présenter le dictionnaire { chemin → contenu } produit par l'adaptateur pur.
 */
import type { KitFileTree } from "@iakaframe/core";

export function KitTreeView({
  kit,
  selectedPath,
  onSelectPath,
}: {
  kit: KitFileTree | null;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
}) {
  if (kit === null) {
    return (
      <p className="empty">
        Aucun kit généré. Choisissez une team et un nœud, puis « Générer ».
      </p>
    );
  }

  const paths = Object.keys(kit.files).sort();
  const content =
    selectedPath !== null ? (kit.files[selectedPath] ?? "") : "";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 40%) 1fr",
        gap: 12,
      }}
    >
      <div>
        <label className="sub" style={{ display: "block", marginBottom: 6 }}>
          Kit généré ({paths.length} fichier{paths.length > 1 ? "s" : ""})
        </label>
        <ul
          aria-label="Arborescence du kit"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {paths.map((p) => (
            <li key={p} style={{ marginBottom: 2 }}>
              <button
                type="button"
                className={selectedPath === p ? "active" : ""}
                onClick={() => onSelectPath(p)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background:
                    selectedPath === p ? "var(--panel-2)" : "transparent",
                  color:
                    selectedPath === p ? "var(--accent)" : "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "5px 8px",
                  fontSize: 12,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="sub" style={{ display: "block", marginBottom: 6 }}>
          Aperçu {selectedPath ? `— ${selectedPath}` : "(lecture seule)"}
        </label>
        <textarea
          aria-label="Aperçu du fichier"
          readOnly
          value={content}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 260,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            whiteSpace: "pre",
            overflow: "auto",
          }}
        />
      </div>
    </div>
  );
}
