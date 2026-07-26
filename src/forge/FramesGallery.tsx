/**
 * FramesGallery — l'écran **galerie `models`** de 1er ordre (Lot 4,
 * alignement-gui-modele-de-frame.md § A4, Fork D). Remplace le placeholder `models` posé au Lot 2.
 * `models` est une **page dédiée** qui **parcourt** les frames du réservoir (les 8 modèles
 * instanciables : iakaframe, scrum, kanban, shapeup, design-thinking, lean-startup, waterfall, gtd)
 * — rendue comme la maquette validée `specs/mock/gui/01-library.html` (grille de **cartes à
 * vignettes**, même pattern que le réservoir de personas du Lot 3, pour la cohérence Studio clair).
 *
 * DONNÉES — la vérité DÉRIVE des descripteurs `frames/*.md` (AR-1) : la galerie est alimentée par
 * le **réservoir de frames RÉEL** du frame chargé (`frame.frames`, `FrameDescriptor[]`), et la
 * carte de la frame **active** (`frame.assembly.frame`, défaut = frame `default` du réservoir) est
 * **distinguée** par un marqueur « actif ». Aucun contrat de `packages/core` n'est touché :
 * projection pure via `buildFramesGallery`, sélection via `galleryFromFrame`.
 *
 * PÉRIMÈTRE MVP — **affichage + marqueur seulement**. Le **changement de frame active** est un
 * chantier séparé (backlog) : les cartes sont read-only (pas de bascule ici). Sans réservoir chargé
 * (hors-ligne / racine introuvable), la galerie affiche un état vide explicite — aucune table
 * synthétique de frames n'est fabriquée (fidèle au geste « la vérité dérive des .md » du Lot 3).
 */
import { useEffect, useState } from "react";
import type { FrameDescriptor } from "@iakaframe/core";
import { buildFramesGallery, galleryFromFrame } from "./frameCards";
import { loadFrame } from "./frame";

/** Réservoir de frames + id de la frame active, projeté d'un `Frame` chargé (injectable en test). */
export interface GallerySource {
  frames: FrameDescriptor[];
  activeId: string | null;
}

/**
 * Source par défaut : charge le frame et en dérive le réservoir + l'active. Repli sur galerie vide
 * (jamais d'exception) → le composant affiche alors l'état vide (aucune frame inventée).
 */
async function defaultLoadGallery(): Promise<GallerySource> {
  try {
    return galleryFromFrame(await loadFrame());
  } catch {
    return { frames: [], activeId: null };
  }
}

export function FramesGallery({
  loadGallery = defaultLoadGallery,
}: {
  /** Chargeur du réservoir de frames (injectable en test). Défaut : `frame.frames` via `loadFrame`. */
  loadGallery?: () => Promise<GallerySource>;
} = {}) {
  const [frames, setFrames] = useState<FrameDescriptor[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadGallery().then((src) => {
      if (cancelled) return;
      setFrames(src.frames);
      setActiveId(src.activeId);
    });
    return () => {
      cancelled = true;
    };
  }, [loadGallery]);

  const cards = buildFramesGallery(frames, activeId);

  return (
    <section className="models-gallery" aria-label="Catalogue des frames">
      <div className="crumb">LIBRARY / MODELS</div>
      <div className="h1">Le catalogue des frames</div>
      <p className="sub">
        Les <strong>frames instanciables</strong> du réservoir — {cards.length} modèle
        {cards.length > 1 ? "s" : ""}, chacun un assemblage nommé <strong>méthode + team</strong>
        {" "}(frères) marié par un binding. La frame <strong>active</strong> est marquée.
      </p>

      <div className="rvhead">
        <span className="seclabel">
          Frames <span className="n">— les modèles du réservoir · {cards.length}</span>
        </span>
      </div>

      {cards.length === 0 ? (
        <p className="models-empty">
          Aucune frame chargée. Ouvre une racine de frame (entrée <code>frame</code>) : la galerie
          liste alors les modèles déclarés dans <code>frames/</code>.
        </p>
      ) : (
        <div className="pgrid">
          {cards.map((c) => (
            <article
              key={c.id}
              className={`fcard${c.isActive ? " active" : ""}`}
              aria-label={`Frame ${c.name}${c.isActive ? " (active)" : ""}`}
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
              <div className="meta">
                <span className="chip mth" title="La méthode assemblée (frère « discipline »)">
                  méthode · {c.methodId}
                </span>
                <span className="chip team" title="La team assemblée (frère « casting »)">
                  team · {c.teamId}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
