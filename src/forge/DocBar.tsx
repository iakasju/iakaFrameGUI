/**
 * DocBar — la **barre de gestes fichier** d'un onglet (§4) : New · Open · Save · Save As · Close,
 * plus la **garde « modifs non sauvées »** (modale in-app testable, §4.6), l'**invite Save As**
 * (id + nom) et la **liste Open** (scan de la collection). Générique : pilotée par le
 * `useForgeDocument<T>` de l'onglet. Purement UI — toute I/O vit dans le hook (façade unique).
 *
 * Dismiss cohérent (correctif recette #2) : les menus **Open** et **Save As** se ferment au **clic
 * extérieur** et à **Escape** via `useDismiss`. Chaque menu est enveloppé (déclencheur + panneau)
 * dans un conteneur `.docmenu` porteur de la `ref` : un clic sur le bouton ou dans le panneau reste
 * « intérieur » (pas de dismiss parasite), un clic ailleurs ferme. `.docmenu` est `display:contents`
 * → le panneau garde son positionnement absolu relatif à la `.docbar` (aucun changement visuel).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { slugifyId, type LibraryEntry, type UseForgeDocument } from "./useForgeDocument";
import { useDismiss } from "./useDismiss";

export function DocBar({ doc }: { doc: UseForgeDocument<unknown> }) {
  const [openPanel, setOpenPanel] = useState(false);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [saId, setSaId] = useState("");
  const [saName, setSaName] = useState("");

  // Conteneurs (déclencheur + panneau) pour le dismiss clic-extérieur/Escape (correctif recette #2).
  const openRef = useRef<HTMLSpanElement>(null);
  const saveAsRef = useRef<HTMLSpanElement>(null);
  const closeOpen = useCallback(() => setOpenPanel(false), []);
  useDismiss(openPanel, closeOpen, openRef);
  useDismiss(doc.saveAsOpen, doc.closeSaveAs, saveAsRef);

  // Préremplit l'invite Save As depuis le nom courant à l'ouverture (ferme le parcours New →
  // nommer dans le titre → Save : Q-4). Ne clobbe pas la frappe ensuite (déclenché à l'ouverture).
  const wasSaveAsOpen = useRef(false);
  useEffect(() => {
    if (doc.saveAsOpen && !wasSaveAsOpen.current) {
      const base = doc.name === "sans-titre" ? "" : doc.name;
      setSaName(base);
      setSaId(slugifyId(base));
    }
    wasSaveAsOpen.current = doc.saveAsOpen;
  }, [doc.saveAsOpen, doc.name]);

  const toggleOpen = useCallback(async () => {
    if (!openPanel) {
      setEntries(await doc.listEntries());
    }
    setOpenPanel((v) => !v);
  }, [openPanel, doc]);

  const chooseOpen = useCallback(
    (id: string) => {
      setOpenPanel(false);
      doc.requestOpen(id);
    },
    [doc],
  );

  const submitSaveAs = useCallback(async () => {
    await doc.saveAs(saId, saName || saId);
  }, [doc, saId, saName]);

  return (
    <div className="docbar" role="toolbar" aria-label="Gestes fichier">
      <button type="button" className="docbtn" onClick={doc.requestNew}>
        New
      </button>
      <span className="docmenu" ref={openRef}>
        <button type="button" className="docbtn" onClick={() => void toggleOpen()}>
          Open
        </button>
        {/* Liste Open (scan de la collection). */}
        {openPanel && (
          <div className="docpanel openlist" role="listbox" aria-label="Ouvrir un artefact">
            {entries.length === 0 ? (
              <p className="empty">Aucun artefact dans la bibliothèque.</p>
            ) : (
              entries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="openrow"
                  onClick={() => chooseOpen(e.id)}
                >
                  <span className="oid">{e.id}</span>
                  <span className="onm">{e.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </span>
      <button
        type="button"
        className="docbtn primary"
        disabled={doc.artifact === null}
        onClick={() => void doc.save()}
      >
        Save
      </button>
      <span className="docmenu" ref={saveAsRef}>
        <button
          type="button"
          className="docbtn"
          disabled={doc.artifact === null}
          onClick={doc.openSaveAs}
        >
          Save As
        </button>
        {/* Invite Save As (id + nom, non destructif). */}
        {doc.saveAsOpen && (
          <div className="docpanel saveaspanel" role="dialog" aria-label="Enregistrer sous">
            <label>
              id
              <input
                aria-label="id de l'artefact"
                value={saId}
                onChange={(ev) => setSaId(ev.target.value)}
                placeholder="mon-artefact"
              />
            </label>
            <label>
              nom
              <input
                aria-label="nom de l'artefact"
                value={saName}
                onChange={(ev) => setSaName(ev.target.value)}
                placeholder="Mon artefact"
              />
            </label>
            <button type="button" className="docbtn primary" onClick={() => void submitSaveAs()}>
              Enregistrer
            </button>
            <button type="button" className="docbtn" onClick={doc.closeSaveAs}>
              Annuler
            </button>
          </div>
        )}
      </span>
      <button
        type="button"
        className="docbtn"
        disabled={doc.artifact === null}
        onClick={doc.requestClose}
      >
        Close
      </button>

      {doc.savedPath && (
        <span className="docstatus ok">enregistré dans {doc.savedPath}</span>
      )}
      {doc.lastWarning && (
        <span className="docstatus warn" role="status">
          {doc.lastWarning}
        </span>
      )}
      {doc.lastError && (
        <span className="docstatus err" role="alert">
          {doc.lastError}
        </span>
      )}

      {/* Garde « modifs non sauvées » (§4.6). */}
      {doc.guardOpen && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-label="Modifications non sauvées">
            <p className="modal-title">Modifications non sauvées</p>
            <p>Le document courant a des modifications non enregistrées.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="docbtn primary"
                onClick={() => void doc.guardSaveThenProceed()}
              >
                Sauvegarder
              </button>
              <button
                type="button"
                className="docbtn"
                onClick={doc.guardDiscardThenProceed}
              >
                Abandonner
              </button>
              <button type="button" className="docbtn" onClick={doc.guardCancel}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
