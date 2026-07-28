/**
 * FramesGallery — l'écran **galerie `models`** de 1er ordre (Lot 4,
 * alignement-gui-modele-de-frame.md § A4, Fork D), rendu **ACTIONNABLE**
 * (galerie-models-actionnable.md, Lot 1). Les cartes des frames du réservoir sont désormais
 * **cliquables** : cliquer une carte non active **pose cette frame comme active** (pointeur
 * `<projet>/iakaframe.json`, clé `frame`, écriture non destructive côté Rust) puis **re-résout**
 * l'assemblage affiché — la carte active bascule. Rendu comme la maquette validée
 * `specs/mock/gui/01-library.html` (grille de cartes à vignettes, Studio clair).
 *
 * GESTE PARTAGÉ (D-2) : la bascule passe par le hook `useFrameSwitch(api)` — le MÊME que
 * `OpenFramePanel` : `setActiveFrameId` → **recharge-depuis-disque** → dangling (I-4) → erreur.
 * Zéro état local optimiste (R5), zéro divergence de comportement (R4).
 *
 * DONNÉES — la vérité DÉRIVE des descripteurs `frames/*.md` (AR-1) : la galerie projette
 * `frame.frames` (réservoir) + `frame.assembly.frame` (active) via `galleryFromFrame`. Aucun contrat
 * de `packages/core` n'est touché : projection pure au-dessus du modèle (parité par construction).
 *
 * NO-OP (D-3, A2) : la carte de la frame active est **désactivée** — re-sélectionner l'active
 * n'écrit rien. Pas de modale de confirmation au MVP : le geste est non destructif et réversible ;
 * l'assemblage re-résolu + la notice inline donnent le retour visuel immédiat.
 */
import { backend, type Backend } from "../api/backend";
import { buildFramesGallery, galleryFromFrame } from "./frameCards";
import { useFrameSwitch, DANGLING_FRAME_HINT } from "./useFrameSwitch";
import { ViewModeToggle } from "./ViewModeToggle";
import { useViewMode } from "./viewMode";

export function FramesGallery({ api = backend }: { api?: Backend } = {}) {
  // Geste PARTAGÉ avec OpenFramePanel : chargement au montage (autoLoad) + bascule (switchTo).
  const { frame, busy, error, dangling, switchTo } = useFrameSwitch(api, { autoLoad: true });
  // Mode de présentation de la galerie (tuiles / lignes / liste), persisté best-effort, défaut = tuiles.
  const [viewMode, setViewMode] = useViewMode("iakaframe.viewMode.models");

  const { frames, activeId } = frame
    ? galleryFromFrame(frame)
    : { frames: [], activeId: null };
  const cards = buildFramesGallery(frames, activeId);
  const activeName = cards.find((c) => c.isActive)?.name ?? null;

  return (
    <section className="models-gallery" aria-label="Catalogue des frames">
      <div className="crumb">LIBRARY / MODELS</div>
      <div className="h1">Le catalogue des frames</div>
      <p className="sub">
        Les <strong>frames instanciables</strong> du réservoir — {cards.length} modèle
        {cards.length > 1 ? "s" : ""}, chacun un assemblage nommé <strong>méthode + team</strong>
        {" "}(frères) marié par un binding. <strong>Clique une carte</strong> pour poser cette frame
        comme active.
      </p>

      <div className="rvhead">
        <span className="seclabel">
          Frames <span className="n">— les modèles du réservoir · {cards.length}</span>
        </span>
        <ViewModeToggle value={viewMode} onChange={setViewMode} label="Mode de présentation — models" />
      </div>

      {/* Notice inline (D-3) : la frame active courante + assemblage re-résolu (retour visuel). */}
      {activeName && (
        <p className="models-notice" role="status">
          Frame active : <strong>{activeName}</strong> — assemblage re-résolu.
        </p>
      )}
      {dangling && (
        <p className="models-notice err" role="alert">
          {DANGLING_FRAME_HINT}
        </p>
      )}
      {error && (
        <p className="models-notice err" role="alert">
          {error}
        </p>
      )}

      {cards.length === 0 ? (
        <p className="models-empty">
          Aucune frame chargée. Ouvre une racine de frame (entrée <code>frame</code>) : la galerie
          liste alors les modèles déclarés dans <code>frames/</code>.
        </p>
      ) : (
        <div className="pgrid" data-view={viewMode}>
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`fcard${c.isActive ? " active" : ""}`}
              // No-op sur l'active (A2) : désactivée + aria-pressed ; busy verrouille pendant l'I/O.
              disabled={busy || c.isActive}
              aria-pressed={c.isActive}
              aria-label={`Frame ${c.name}${c.isActive ? " (active)" : ""}`}
              title={
                c.isActive
                  ? `${c.name} — frame active`
                  : `Poser ${c.name} comme frame active (méthode ${c.methodId} · team ${c.teamId})`
              }
              onClick={() => void switchTo(c.id)}
            >
              {c.isActive && (
                <span className="active-badge" aria-label="Frame active">
                  ● actif
                </span>
              )}
              <div className="top">
                <span
                  className="vg"
                  style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})` }}
                  aria-hidden="true"
                >
                  {c.initials}
                </span>
                <div>
                  <div className="nm">
                    {c.name}
                    {c.isDefault && (
                      <span className="star" title="Frame par défaut (repli du réservoir)">
                        {" "}
                        ★
                      </span>
                    )}
                  </div>
                  <div className="ref">v{c.version}</div>
                </div>
              </div>
              {/* Id (slug) — champ « détaillé » RÉVÉLÉ par CSS uniquement en mode liste. */}
              <span className="lid" title={c.id}>{c.id}</span>
              <div className="meta">
                <span className="chip mth" title="La méthode assemblée (frère « discipline »)">
                  méthode · {c.methodId}
                </span>
                <span className="chip team" title="La team assemblée (frère « casting »)">
                  team · {c.teamId}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
