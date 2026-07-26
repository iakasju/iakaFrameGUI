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
 * Persistance (Lot 5a, persistance-disque-authoring-elements.md) : la prop **optionnelle** `persist`
 * bascule l'`onSubmit` de l'état de session vers l'**écriture disque non-destructive** (persona
 * pilote — `PersonaReservoir` la fournit). Le save reste **optimiste** (la session reflète l'édition
 * immédiatement), écrit sur disque en arrière-plan, puis **réconcilie** depuis le disque (relecture).
 * Un échec (hors Tauri, racine non résolue…) **dégrade proprement** : l'édition reste en session +
 * un message clair (jamais une stack). Les pools **sans** `persist` gardent l'état de session (MVP,
 * 5b/5c différés). Fëanor reste **honnête** (aucun appel LLM au montage ; repli/aveu du #1).
 */
import { useEffect, useState } from "react";
import type { Persona } from "@iakaframe/core";
import { FeanorHead, type FeanorProposeCapability } from "./FeanorHead";
import type { AuthoredEntity } from "./feanorHeadModel";
import type { ElementCardVM, ElementKind } from "./elementKind";

type Mode = "grid" | "edit" | "create";

/** Upsert par id dans une liste de session (édition en place, sinon ajout). */
function upsertById<T>(prev: T[], next: T, idOf: (e: T) => string): T[] {
  const id = idOf(next);
  const idx = prev.findIndex((x) => idOf(x) === id);
  if (idx >= 0) {
    const copy = [...prev];
    copy[idx] = next;
    return copy;
  }
  return [...prev, next];
}

export function ElementReservoir<T>({
  kind,
  loadElements,
  persist,
}: {
  /** Le contrat du pool authorable (persona, principe, …). */
  kind: ElementKind<T>;
  /** Chargeur des éléments réels (injectable en test). Défaut : le repli hors-ligne du type. */
  loadElements?: () => Promise<T[]>;
  /**
   * Écriture disque non-destructive d'un élément (Lot 5a). **Absente** ⇒ édition en état de session
   * (comportement historique, pools 5b/5c différés). **Présente** (persona) ⇒ save optimiste +
   * écriture disque + réconciliation ; un échec dégrade en session + message (jamais une stack).
   */
  persist?: (element: T) => Promise<void>;
}) {
  // État éditable de session. Amorcé sur le repli hors-ligne (rendu synchrone immédiat), REMPLACÉ
  // par les éléments réels dès qu'ils sont chargés.
  const [items, setItems] = useState<T[]>(() => kind.fallback());
  const [mode, setMode] = useState<Mode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Proposition de Fëanor acheminée (brique B) : champs à pré-remplir dans l'éditeur. `null` = aucune.
  // Le `nonce` force le **remontage par `key`** de l'éditeur (FORK D-a) à chaque nouvelle proposition
  // — l'éditeur seede son `draft` par un initialiseur `useState`, seul un remontage le re-seede.
  const [seed, setSeed] = useState<Partial<T> | null>(null);
  const [seedNonce, setSeedNonce] = useState(0);

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

  const clearSeed = () => setSeed(null);

  const backToGrid = () => {
    setMode("grid");
    setSelectedId(null);
    clearSeed();
  };

  // Capability de proposition (brique B) transmise à Fëanor-en-tête — SEULEMENT si le pool l'équipe.
  // `run` est le résolveur honnête du pool (typé `Partial<T>` — sûr à la frontière de l'hôte) ;
  // `onProposal` acheminé re-seede l'éditeur (fusion + remontage `key`). C-1 : `id`/`roleIndex` ne
  // sont jamais dans la proposition (le parseur du pool ne les lit pas), l'id réel est donc préservé.
  const propose: FeanorProposeCapability | undefined = kind.proposeElement
    ? {
        run: kind.proposeElement,
        onProposal: (p: unknown) => {
          setSeed(p as Partial<T>);
          setSeedNonce((n) => n + 1);
        },
      }
    : undefined;

  const onSubmit = (next: T) => {
    // Optimiste : la session reflète l'édition immédiatement (rendu synchrone, non-régression).
    setItems((prev) => upsertById(prev, next, kind.idOf));
    setSaveError(null);
    backToGrid();
    if (!persist) return; // pool sans persistance disque (MVP) → état de session seul.
    // Écriture disque non-destructive, puis réconciliation depuis le disque (relecture).
    void persist(next)
      .then(() => loadElements?.())
      .then((real) => {
        if (real && real.length > 0) setItems(real);
      })
      .catch((e: unknown) => {
        setSaveError(e instanceof Error ? e.message : String(e));
      });
  };

  // --- Fiche : élément sélectionné (édition) OU nouvel élément (création) ---
  // Fëanor-en-tête monté SEULEMENT dans ces deux modes d'authoring (jamais sur la grille).
  if (mode === "edit" && selected) {
    const entity: AuthoredEntity = kind.toAuthoredEntity(selected);
    // Re-seed (FORK D-a) : la proposition se fusionne SUR l'élément réel (id/roleIndex préservés,
    // C-1) ; sans proposition, l'éditeur reçoit l'élément tel quel. La `key` inclut le nonce → une
    // NOUVELLE proposition remonte l'éditeur pré-rempli (l'édition en cours est repartie du réel).
    const edited: T = seed ? { ...selected, ...seed } : selected;
    return (
      <ElementFiche
        kind={kind}
        mode="edit"
        label={kind.idOf(selected)}
        entity={entity}
        feanorSource={feanorSource}
        propose={propose}
        onBack={backToGrid}
      >
        <kind.Editor
          key={`edit-${kind.idOf(selected)}-${seedNonce}`}
          element={edited}
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
    // Re-seed en création : la proposition se fusionne sur un élément VIERGE complet (`blankElement`),
    // pour qu'une proposition partielle ne casse pas l'éditeur. Sans seed (ou pool non équipé),
    // l'éditeur reçoit `null` (création vierge normale). L'id reste dérivé/généré au save (jamais proposé).
    const created: T | null =
      seed && kind.blankElement ? { ...kind.blankElement(), ...seed } : null;
    return (
      <ElementFiche
        kind={kind}
        mode="create"
        label="nouvelle"
        entity={kind.blankEntity}
        feanorSource={feanorSource}
        propose={propose}
        onBack={backToGrid}
      >
        <kind.Editor
          key={`create-${seedNonce}`}
          element={created}
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

      {saveError && (
        <p className="save-error" role="alert">
          {saveError}
        </p>
      )}

      <div className="rvhead">
        <span className="seclabel">
          {kind.sectionLabel} <span className="n">{kind.sectionMeta(cards.length)}</span>
        </span>
        <button
          type="button"
          className="newpersona"
          onClick={() => {
            setSelectedId(null);
            clearSeed();
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
            clearSeed();
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
  propose,
  onBack,
  children,
}: {
  kind: ElementKind<T>;
  mode: "edit" | "create";
  label: string;
  entity: AuthoredEntity | null;
  feanorSource?: readonly Persona[];
  /** Capability de proposition (brique B) — transmise à Fëanor-en-tête ; absente ⇒ conseil seul. */
  propose?: FeanorProposeCapability;
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
      <FeanorHead mode={mode} entity={entity} feanorSource={feanorSource} propose={propose} />
      {children}
    </section>
  );
}
