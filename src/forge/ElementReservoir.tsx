/**
 * ElementReservoir — l'**hôte générique** des pages d'authoring d'un élément de 1er ordre (chantier
 * #3 Lot 1, extension-feanor-en-tete-pages-elements.md § 4.2). Extrait du patron `PersonaReservoir`
 * (Lot 3), il porte **une seule fois** le montage réutilisé par tous les pools :
 *
 *   réservoir (grille de fiches à vignettes) · bouton **New** (✚ création) · sélection d'une fiche
 *   → **✎ édition** · **Fëanor-en-tête** glissé en haut en création ET en édition · éditeur injecté.
 *
 * Il est **paramétré par un `ElementKind<T>`** (cf. `elementKind.ts`) : la source, la projection en
 * fiches, l'adaptateur vers l'entité générique de Fëanor et l'éditeur de champs sont **injectés**.
 * L'hôte ne connaît AUCUN type concret — un lot suivant branche un nouveau pool en fournissant son
 * `ElementKind` (un `buildCards` + un `Editor` + un `toAuthoredEntity`), **sans toucher ce fichier**.
 *
 * Édition = **état local de session** (MVP, aucune écriture disque — la persistance est le Lot 5
 * différé, cross-repo). Fëanor reste **honnête** (aucun appel LLM au montage ; repli/aveu du #1).
 */
import { useEffect, useState } from "react";
import type { Persona } from "@iakaframe/core";
import { FeanorHead } from "./FeanorHead";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM, ElementKind } from "./elementKind";

type Mode = "grid" | "edit" | "create";

export function ElementReservoir<T>({
  kind,
  loadElements,
}: {
  /** Le contrat du pool authorable (persona, principe, …). */
  kind: ElementKind<T>;
  /** Chargeur des éléments réels (injectable en test). Défaut : le repli hors-ligne du type. */
  loadElements?: () => Promise<T[]>;
}) {
  // État éditable de session. Amorcé sur le repli hors-ligne (rendu synchrone immédiat), REMPLACÉ
  // par les éléments réels dès qu'ils sont chargés. Aucune écriture disque (MVP, § 4.3).
  const [items, setItems] = useState<T[]>(() => kind.fallback());
  const [mode, setMode] = useState<Mode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loadElements) return;
    let cancelled = false;
    void loadElements().then((real) => {
      if (!cancelled && real.length > 0) setItems(real);
    });
    return () => {
      cancelled = true;
    };
  }, [loadElements]);

  const cards = kind.buildCards(items);
  const selected = items.find((e) => kind.idOf(e) === selectedId) ?? null;
  const feanorSource: readonly Persona[] | undefined = kind.feanorSourceFrom?.(items);

  const backToGrid = () => {
    setMode("grid");
    setSelectedId(null);
  };

  const onSubmit = (next: T) => {
    setItems((prev) => {
      const id = kind.idOf(next);
      const idx = prev.findIndex((x) => kind.idOf(x) === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });
    backToGrid();
  };

  // --- Fiche : élément sélectionné (édition) OU nouvel élément (création) ---
  // Fëanor-en-tête monté SEULEMENT dans ces deux modes d'authoring (jamais sur la grille).
  if (mode === "edit" && selected) {
    const entity: AuthoredEntity = kind.toAuthoredEntity(selected);
    return (
      <ElementFiche
        kind={kind}
        mode="edit"
        label={kind.idOf(selected)}
        entity={entity}
        feanorSource={feanorSource}
        onBack={backToGrid}
      >
        <kind.Editor
          element={selected}
          existingIds={items
            .filter((x) => kind.idOf(x) !== kind.idOf(selected))
            .map((x) => kind.idOf(x))}
          onSubmit={onSubmit}
          onCancel={backToGrid}
        />
      </ElementFiche>
    );
  }
  if (mode === "create") {
    return (
      <ElementFiche
        kind={kind}
        mode="create"
        label="nouvelle"
        entity={kind.blankEntity}
        feanorSource={feanorSource}
        onBack={backToGrid}
      >
        <kind.Editor
          element={null}
          existingIds={items.map((x) => kind.idOf(x))}
          onSubmit={onSubmit}
          onCancel={backToGrid}
        />
      </ElementFiche>
    );
  }

  // --- Grille de fiches à vignettes (le réservoir) ---
  return (
    <section
      className={`element-reservoir ${kind.scopeClass}`}
      aria-label={`Réservoir de ${kind.crumbCollection}`}
    >
      <div className="crumb">{kind.crumb}</div>
      <div className="h1">{kind.title}</div>
      <p className="sub">{kind.subtitle}</p>

      <div className="rvhead">
        <span className="seclabel">
          {kind.sectionLabel} <span className="n">{kind.sectionMeta(cards.length)}</span>
        </span>
        <button
          type="button"
          className="newpersona"
          onClick={() => {
            setSelectedId(null);
            setMode("create");
          }}
        >
          <span className="plus" aria-hidden="true">
            +
          </span>{" "}
          {kind.newButtonLabel}
        </button>
      </div>

      <div className="pgrid">
        {cards.map((c) => (
          <ElementCard key={c.id} card={c} typeLabel={kind.typeLabel} onOpen={() => {
            setSelectedId(c.id);
            setMode("edit");
          }} />
        ))}
      </div>
    </section>
  );
}

/** Une fiche à vignette du réservoir (générique : rend uniquement ce que la carte déclare). */
function ElementCard({
  card: c,
  typeLabel,
  onOpen,
}: {
  card: ElementCardVM;
  typeLabel: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="pcard"
      aria-label={`Ouvrir la fiche de ${c.name}`}
      onClick={onOpen}
    >
      {c.royaume && <span className="royaume">{c.royaume}</span>}
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
            {c.pastille ? `${c.pastille} ` : ""}
            {c.name}
          </div>
          {c.ref && <div className="ref">{c.ref}</div>}
        </div>
      </div>
      {c.roleLabel && (
        <div className="role">
          {c.roleLabel} <span className="ri">· index {c.roleIndex}</span>
        </div>
      )}
      {!c.roleLabel && <div className="role">{typeLabel}</div>}
      {c.summary && <div className="mission">{c.summary}</div>}
      <div className="chips">
        {c.chips.map((chip) => (
          <span key={chip.key} className={`chip ${chip.kind}`}>
            {chip.kind === "gd" ? "⛨ " : ""}
            {chip.text}
          </span>
        ))}
        {c.chips.length === 0 && <span className="chip muted">{c.emptyChipsLabel}</span>}
      </div>
    </button>
  );
}

/**
 * ElementFiche — coquille **partagée** de la fiche (édition/création) : fil d'Ariane + pastille de
 * mode (✎/✚) + **le Fëanor-en-tête monté UNE SEULE FOIS** (fonctionnel, chantier #1, désormais
 * agnostique) + l'éditeur de champs injecté. Réutilisée telle quelle par tous les pools — c'est ce
 * montage unique qui évite le copier-coller du #1 aux lots suivants.
 */
function ElementFiche<T>({
  kind,
  mode,
  label,
  entity,
  feanorSource,
  onBack,
  children,
}: {
  kind: ElementKind<T>;
  mode: "edit" | "create";
  label: string;
  entity: AuthoredEntity | null;
  feanorSource?: readonly Persona[];
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`element-reservoir element-fiche ${kind.scopeClass}`}
      aria-label={`Fiche ${kind.typeLabel}`}
    >
      <div className="crumb">
        <button type="button" className="crumblink" onClick={onBack}>
          library
        </button>{" "}
        / {kind.crumbCollection} / <span className="cur">{label}</span>
        <span className={`mode-pill ${mode}`}>{mode === "edit" ? "✎ édition" : "✚ création"}</span>
      </div>
      <FeanorHead mode={mode} entity={entity} feanorSource={feanorSource} />
      {children}
    </section>
  );
}
