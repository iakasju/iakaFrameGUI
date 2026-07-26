/**
 * elementKind — le **contrat d'un pool authorable** (chantier #3 Lot 1,
 * extension-feanor-en-tete-pages-elements.md § 4.2). C'est la pièce de **factorisation** qui permet
 * à l'hôte générique `ElementReservoir` de servir N pools (persona, principe, …) **sans copier le
 * montage** (grille + fiche + `✚ création`/`✎ édition` + Fëanor-en-tête) à chaque type.
 *
 * Un `ElementKind<T>` **injecte** tout ce qui est propre à un type : sa source de données, sa
 * projection en fiches à vignettes (`buildCards`), son adaptateur vers l'entité générique de Fëanor
 * (`toAuthoredEntity`), et **son éditeur de champs** (`Editor`). L'hôte, lui, ne connaît que ce
 * contrat — patron « composant générique + injection de composant » (état de l'art React 2026,
 * sources de l'instruction § Sources). AUCUN I/O, AUCUN contrat `@iakaframe/core` touché : pure
 * addition `src/` au-dessus des catalogues déjà vendorés.
 */
import type { ReactElement, ReactNode } from "react";
import type { Persona } from "@iakaframe/core";
import type { AuthoredEntity } from "./feanorHeadModel";

/** Une puce d'une fiche : skill (`sk`), garde-fou (`gd`) ou méta (`meta`, ex. déclencheur). */
export interface ElementChip {
  key: string;
  text: string;
  kind: "sk" | "gd" | "meta";
}

/**
 * View-model **unifié** d'une fiche à vignette — assez générique pour une persona (riche : royaume,
 * rôle, mission, skills/gardes) comme pour un principe (sobre : libellé, politique, déclencheur).
 * Les champs non pertinents pour un type valent `null`/`[]` (jamais fabriqués) et l'hôte ne les rend
 * pas — même honnêteté que `personaCards` (ne montre que ce que l'élément déclare).
 */
export interface ElementCardVM {
  /** Id stable (clé de fiche + sélection). */
  id: string;
  /** Nom affiché (nom de persona / libellé de principe). */
  name: string;
  /** Initiales (2 lettres) — texte de la vignette. */
  initials: string;
  /** Couple de couleurs du dégradé de la vignette (rendu GUI, pas un asset canon). */
  gradient: [string, string];
  /** Emoji de pastille SI déclarée, sinon `null`. */
  pastille: string | null;
  /** Royaume MAJUSCULE (coin de fiche) SI pertinent (persona), sinon `null`. */
  royaume: string | null;
  /** Ligne de référence secondaire (badge persona / id de principe), sinon `null`. */
  ref: string | null;
  /** Libellé de rôle SI pertinent (persona), sinon `null` — masque la ligne de rôle. */
  roleLabel: string | null;
  /** Index de casting (affiché « · index N » uniquement si `roleLabel` présent). */
  roleIndex: number;
  /** Résumé (ligne de mission persona / politique de principe), sinon `null`. */
  summary: string | null;
  /** Puces (skills+gardes d'une persona / déclencheur d'un principe). */
  chips: ElementChip[];
  /** Libellé muté affiché quand `chips` est vide (« aucune skill déclarée » / « aucun déclencheur »). */
  emptyChipsLabel: string;
}

/** Props passées à l'éditeur de champs injecté d'un type (create = `element` null). */
export interface ElementEditorProps<T> {
  /** L'élément à éditer, ou `null` en création. */
  element: T | null;
  /** Ids déjà pris (unicité), hors l'élément en cours d'édition. */
  existingIds: string[];
  /** Remonte l'élément construit (l'hôte fait l'upsert en état de session). */
  onSubmit: (element: T) => void;
  /** Abandon → retour grille. */
  onCancel: () => void;
}

/**
 * Le **contrat d'un pool authorable** consommé par `ElementReservoir`. `T` = le type concret de
 * l'élément (`Persona`, `Principle`, …). Tout ce qui varie d'un type à l'autre est injecté ici ;
 * l'hôte reste agnostique.
 */
export interface ElementKind<T> {
  /** Type/pool ("persona" | "principle" | …) — passé tel quel au contexte LLM de Fëanor. */
  type: string;
  /** Libellé FR du type ("persona", "principe") — vignette + textes. */
  typeLabel: string;
  /** Classe CSS de scope ajoutée à la section (modificateur au-dessus de `.element-reservoir`). */
  scopeClass: string;
  /** Segment de fil d'Ariane du pool ("personas" | "principes"). */
  crumbCollection: string;
  /** Fil d'Ariane MAJUSCULE au-dessus du réservoir ("LIBRARY / PERSONAS"). */
  crumb: string;
  /** Titre H1 du réservoir ("Le réservoir de personas"). */
  title: string;
  /** Sous-titre explicatif (ReactNode : peut porter du gras). */
  subtitle: ReactNode;
  /** Libellé de la section ("Personas", "Principes"). */
  sectionLabel: string;
  /** Suffixe méta de section, en fonction du compte ("— le casting · 9"). */
  sectionMeta: (count: number) => string;
  /** Libellé du bouton de création ("Nouvelle persona", "Nouveau principe"). */
  newButtonLabel: string;
  /** Extrait l'id stable d'un élément. */
  idOf: (element: T) => string;
  /** Projette la liste en fiches à vignettes. */
  buildCards: (elements: readonly T[]) => ElementCardVM[];
  /** Adapte un élément vers l'entité générique de Fëanor-en-tête (édition). */
  toAuthoredEntity: (element: T) => AuthoredEntity;
  /** Descripteur d'entité pour la **création vierge** (name vide → placeholder honnête). */
  blankEntity: AuthoredEntity;
  /** Repli hors-ligne : la liste de départ quand la source réelle est indisponible. */
  fallback: () => T[];
  /**
   * Source de la vignette **Fëanor** dérivée des éléments chargés, SI le type porte des personas
   * (persona : lui-même). Absente ⇒ Fëanor retombe sur `CANONICAL_ROSTER` (repli honnête).
   */
  feanorSourceFrom?: (elements: readonly T[]) => readonly Persona[];
  /** L'éditeur de champs injecté (réutilise l'éditeur existant du type — jamais réimplémenté). */
  Editor: (props: ElementEditorProps<T>) => ReactElement;
}
