/**
 * ElementPoolPanel — rend **visible l'element pool** (le stock des sous-éléments) de l'élément
 * travaillé (Volet A).
 *
 * Read-only (identification/affichage au MVP) : pour l'`element` de l'étage courant, affiche la LISTE
 * TYPÉE du stock disponible (un groupe par type de sous-élément, avec compte + ids), chargée via
 * `useForgeElementPool` (adossé à `loadFrame`/G1/G2). Réutilise le **rail-stock en accordéon**
 * (`RailSection`, `Rail.tsx`) plutôt que d'inventer une surface — affichage sobre. Backend injectable.
 *
 * Frontière : c'est le **stock** (ce qui PEUT composer l'élément), pas l'assemblage courant ; le `+`
 * d'insertion réelle reste porté par les ateliers (non dupliqué ici).
 *
 * **Vocabulaire (AR-2, `reservoir-de-frames.md`)** : « réservoir » désigne désormais le *dépôt de
 * frames* ; ce panneau montre un **element pool**.
 */
import { ELEMENT_POOL_COMPOSITION, type ElementPoolTarget } from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { useForgeElementPool } from "./useForgeElementPool";
import { RailSection } from "./Rail";

/** Libellé lisible de l'élément dont on montre l'element pool. */
const ELEMENT_LABELS: Record<ElementPoolTarget, string> = {
  team: "Team",
  method: "Méthode",
  skill: "Skill",
  kit: "Kit",
  frame: "Frame",
};

export function ElementPoolPanel({
  element,
  api = backend,
}: {
  element: ElementPoolTarget;
  api?: Backend;
}) {
  const { elementPool, busy, error, reload } = useForgeElementPool(element, api);

  return (
    <section className="element-pool-panel" aria-label={`Réservoir de sous-éléments — ${ELEMENT_LABELS[element]}`}>
      <h3>
        Réservoir — {ELEMENT_LABELS[element]}{" "}
        {elementPool && <span className="element-pool-total">({elementPool.total} disponibles)</span>}
      </h3>
      <p className="settings-hint">
        Le <b>stock</b> des sous-éléments qui peuvent composer un <b>{ELEMENT_LABELS[element]}</b>,
        lu depuis la racine bibliothèque courante ({ELEMENT_POOL_COMPOSITION[element].length} type(s)).
      </p>

      <div className="settings-actions">
        <button type="button" className="docbtn" disabled={busy} onClick={() => void reload()}>
          Recharger
        </button>
      </div>

      {error && (
        <p className="settings-line err" role="alert">
          {error}
        </p>
      )}

      {elementPool &&
        elementPool.groups.map((g) => (
          <RailSection key={g.type} title={g.label} count={g.count}>
            {g.ids.length === 0 ? (
              <p className="empty">
                {g.count > 0
                  ? `${g.count} élément(s) — ids non listés (assemblage).`
                  : "Stock vide pour ce type."}
              </p>
            ) : (
              g.ids.map((id) => (
                <div className="sub element-pool-item" key={`${g.type}-${id}`}>
                  <span className={`tagg ${g.type}`} aria-hidden="true" />
                  <span className="sn">{id}</span>
                </div>
              ))
            )}
          </RailSection>
        ))}
    </section>
  );
}
