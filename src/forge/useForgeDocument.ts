/**
 * useForgeDocument — **modèle de document unifié** des 3 onglets de la forge (Q-1). Un seul hook
 * générique porte les **cinq gestes fichier** (New · Open · Save · Save As · Close), le **dirty
 * tracking**, la **garde « modifs non sauvées »** (modale in-app, §4.6) et l'**intégrité
 * référentielle I1** au Save (§8). Team/Méthode/Kit l'instancient avec leur `collection`, leur
 * `blank` (gabarit vierge), leurs (dé)sérialiseurs frontmatter (`@iakaframe/core`) et — optionnel —
 * leur `validateRefs` (miroir de `add`, CLI). Il **remplace** l'auto-persistance JSON silencieuse
 * de `useForgeTeams` et **comble** l'absence de persistance de Méthode/Kit (« repart à zéro »).
 *
 * Toute I/O passe par la **façade unique** `backend` (injectable pour les tests). Hors Tauri, le
 * **listing** échoue silencieusement (liste vide, l'état mémoire suffit) tandis que l'**écriture** et
 * l'**ouverture ciblée** — gestes explicites — surfacent un message utilisateur propre si le backend
 * est indisponible (garde `call()`, cf. `backend.ts`). Jamais d'échec de rendu.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { readListLayout, verbatimBody, type ListLayout } from "@iakaframe/core";
import { backend, type Backend, type LibraryCollection } from "../api/backend";

/**
 * Capture d'origine d'un document **ouvert** (défaut 2+3) : le corps markdown réel (`verbatimBody`,
 * byte-parité — PAS `parseFrontmatter().body` qui strippe la ligne blanche de tête) et la découpe
 * en lignes des listes flow wrappées (`readListLayout`). Rethreadés au Save pour que Open→Save sans
 * édition produise un **diff vide**. Un document **neuf** n'a pas d'origine → `{ body:null, layout:null }`
 * (repli boilerplate, comportement historique préservé).
 */
export interface OriginCapture {
  body: string | null;
  layout: ListLayout | null;
}

/** Capture vide (document neuf / fermé) : le Save retombe sur le boilerplate. */
const EMPTY_ORIGIN: OriginCapture = { body: null, layout: null };

/** Un id manquant au pool (rapport I1, miroir de `checkRefs`). */
export interface MissingRef {
  field: string;
  id: string;
  collection: string;
}

/** Verdict d'intégrité référentielle (I1). `warning` = pool absent → non bloquant (Q-4). */
export interface RefsReport {
  ok: boolean;
  missing: MissingRef[];
  warning?: string;
}

/** Source du document courant : neuf (jamais sauvé) ou issu de la bibliothèque. */
export type DocSource = "new" | "library";

/** Geste en attente derrière la garde « modifs non sauvées ». */
type PendingKind = { action: "new" } | { action: "open"; id: string } | { action: "close" };

/** Configuration d'une instance de document (une par onglet). */
export interface DocConfig<T> {
  /** Collection cible de la bibliothèque (`teams` / `methods` / `kits`). */
  collection: LibraryCollection;
  /** Gabarit vierge (New). */
  blank: () => T;
  /**
   * Sérialise l'artefact en `.md`-frontmatter. `origin` = capture d'Open (corps + wrapping réels) :
   * un document ouvert **rethreade** son corps/layout d'origine (byte-parité) ; un document neuf
   * (`origin.body == null`) retombe sur le boilerplate. **Règle d'or** : `body = origin.body ?? boilerplate`.
   */
  serialize: (artifact: T, origin: OriginCapture) => string;
  /** Parse un `.md`-frontmatter en artefact (`null` si illisible — défensif). */
  parse: (text: string) => T | null;
  /** Id stable de l'artefact (`""` autorisé pour un document neuf non nommé). */
  idOf: (artifact: T) => string;
  /** Libellé d'affichage (DocTitle, liste Open). */
  nameOf: (artifact: T) => string;
  /** Intégrité référentielle I1 au Save (Team/Méthode/Kit). Absent → aucune vérif. */
  validateRefs?: (artifact: T) => Promise<RefsReport>;
  /**
   * Pose le `name` (texte libre) sur l'artefact, **par type** — active le renommage en ligne
   * (`DocTitle` éditable, `setName`). Absent → titre read-only (ex. Kit, sans champ `name`).
   * **Ne slugifie jamais** (texte libre, cf. saut de curseur §10) ; ne touche que le libellé.
   */
  withName?: (artifact: T, name: string) => T;
  /** Façade backend injectable (tests). */
  api?: Backend;
}

/** Entrée de la liste Open (scan de la collection). */
export interface LibraryEntry {
  id: string;
  name: string;
}

/** Résultat d'un Save / Save As. */
export interface SaveOutcome {
  ok: boolean;
  /** `true` si Save a basculé sur Save As (document neuf sans id). */
  requiresSaveAs?: boolean;
  /** Rapport I1 en cas de refus. */
  missing?: MissingRef[];
  /** Chemin logique écrit (`<collection>/<id>.md`). */
  path?: string;
  /** Avertissement non bloquant (pool absent, Q-4). */
  warning?: string;
  /** Message d'erreur d'écriture. */
  error?: string;
}

export interface UseForgeDocument<T> {
  /** Artefact courant (`null` = aucun document ouvert → placeholder). */
  artifact: T | null;
  id: string | null;
  name: string;
  dirty: boolean;
  source: DocSource;
  /** Édite l'artefact courant (marque `dirty`). */
  edit: (next: T) => void;
  /**
   * Renomme l'artefact courant en ligne (pose le `name`, marque `dirty`) via `config.withName`.
   * No-op si aucun artefact ouvert ou si `withName` absent. **Ne touche ni `id` ni `source`.**
   */
  setName: (name: string) => void;
  /** Vrai ssi le renommage en ligne est possible (`config.withName` fourni **et** artefact ouvert). */
  canRename: boolean;
  /** New / Open / Close — passent par la garde si `dirty`. */
  requestNew: () => void;
  requestOpen: (id: string) => void;
  requestClose: () => void;
  /** Persiste (bascule sur Save As si document neuf). */
  save: () => Promise<SaveOutcome>;
  /** Persiste sous un nouvel id/nom (non destructif). */
  saveAs: (id: string, name: string) => Promise<SaveOutcome>;
  /** Liste les artefacts de la collection (scan) pour l'écran Open. */
  listEntries: () => Promise<LibraryEntry[]>;
  // --- Garde « modifs non sauvées » (modale in-app, §4.6) ---
  guardOpen: boolean;
  guardSaveThenProceed: () => Promise<void>;
  guardDiscardThenProceed: () => void;
  guardCancel: () => void;
  // --- Invite Save As (id/nom) ---
  saveAsOpen: boolean;
  openSaveAs: () => void;
  closeSaveAs: () => void;
  // --- Rapports d'état ---
  lastError: string | null;
  lastWarning: string | null;
  savedPath: string | null;
}

/** Normalise un id en slug simple (segment sans séparateur — calque `validate_team_id`/CLI). */
export function slugifyId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les diacritiques (é → e)
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function useForgeDocument<T>(config: DocConfig<T>): UseForgeDocument<T> {
  const api = config.api ?? backend;

  const [artifact, setArtifact] = useState<T | null>(null);
  // Capture d'origine (défaut 2+3) : corps + wrapping réels d'un document ouvert, rethreadés au Save.
  const [origin, setOrigin] = useState<OriginCapture>(EMPTY_ORIGIN);
  const [id, setId] = useState<string | null>(null);
  const [source, setSource] = useState<DocSource>("new");
  const [dirty, setDirty] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingKind | null>(null);
  const [saveAsOpen, setSaveAsOpen] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  // Réf miroir : lire l'artefact courant sans le mettre en dépendance des callbacks.
  const artifactRef = useRef<T | null>(artifact);
  artifactRef.current = artifact;
  const idRef = useRef<string | null>(id);
  idRef.current = id;
  // Réf miroir de la capture d'origine : lue au Save sans figurer dans les deps de `writeArtifact`.
  const originRef = useRef<OriginCapture>(origin);
  originRef.current = origin;
  // Réf miroir du `config` : l'appelant recrée l'objet `config` (arrow-functions littérales) à
  // chaque rendu ; le lire via ref permet de retirer `config` des deps des callbacks, qui
  // redeviennent alors **stables** (identité doc constante hors changement d'état) — évite la
  // boucle de rendu infinie côté consommateurs (effet onglet Méthode). Configs statiques par
  // instance : aucune réactivité perdue en les lisant via ref.
  const configRef = useRef<DocConfig<T>>(config);
  configRef.current = config;

  const name = artifact ? config.nameOf(artifact) : "sans-titre";
  const canRename = config.withName != null && artifact !== null;

  const loadBlank = useCallback((): void => {
    setArtifact(configRef.current.blank());
    setOrigin(EMPTY_ORIGIN); // document neuf : aucun corps d'origine → boilerplate au Save.
    setId(null);
    setSource("new");
    setDirty(false);
    setLastError(null);
    setLastWarning(null);
    setSavedPath(null);
    setSaveAsOpen(false); // repart d'un vierge : referme une invite Save As orpheline.
  }, []);

  const edit = useCallback((next: T): void => {
    setArtifact(next);
    setDirty(true);
  }, []);

  // --- Renommage en ligne (DocTitle éditable) : pose le `name`, marque dirty, garde id/source ---
  const setName = useCallback((newName: string): void => {
    const current = artifactRef.current;
    const cfg = configRef.current;
    if (!current || !cfg.withName) return; // no-op : on ne renomme pas le vide.
    setArtifact(cfg.withName(current, newName)); // réutilise le chemin d'`edit`.
    setDirty(true);
  }, []);

  // --- Écriture bas niveau (partagée Save / Save As), avec I1 (§8) ---
  const writeArtifact = useCallback(
    async (target: T, targetId: string): Promise<SaveOutcome> => {
      const cfg = configRef.current;
      setLastError(null);
      setLastWarning(null);
      if (cfg.validateRefs) {
        let report: RefsReport;
        try {
          report = await cfg.validateRefs(target);
        } catch {
          report = { ok: true, missing: [] };
        }
        if (!report.ok) {
          setLastError(
            `références cassées : ${report.missing
              .map((m) => `${m.field} → ${m.id} (${m.collection})`)
              .join(", ")}`,
          );
          return { ok: false, missing: report.missing };
        }
        if (report.warning) setLastWarning(report.warning);
      }
      const text = cfg.serialize(target, originRef.current);
      try {
        await api.libraryWrite(cfg.collection, targetId, text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return { ok: false, error: msg };
      }
      const path = `${cfg.collection}/${targetId}.md`;
      setArtifact(target);
      setId(targetId);
      setSource("library");
      setDirty(false);
      setSavedPath(path);
      return { ok: true, path, warning: lastWarning ?? undefined };
    },
    [api, lastWarning],
  );

  const save = useCallback(async (): Promise<SaveOutcome> => {
    const current = artifactRef.current;
    if (!current) return { ok: false, error: "aucun document ouvert" };
    const currentId = idRef.current;
    if (!currentId) {
      // Document neuf → bascule sur Save As (§4.3.1).
      setSaveAsOpen(true);
      return { ok: false, requiresSaveAs: true };
    }
    return writeArtifact(current, currentId);
  }, [writeArtifact]);

  const saveAs = useCallback(
    async (rawId: string, displayName: string): Promise<SaveOutcome> => {
      const cfg = configRef.current;
      const current = artifactRef.current;
      if (!current) return { ok: false, error: "aucun document ouvert" };
      const targetId = slugifyId(rawId);
      if (!targetId) {
        setLastError("id invalide");
        return { ok: false, error: "id invalide" };
      }
      // Non-destructif : refuse d'écraser un id existant (garde §4.4).
      let exists = false;
      try {
        exists = await api.libraryExists(cfg.collection, targetId);
      } catch {
        exists = false;
      }
      if (exists && targetId !== idRef.current) {
        const msg = `existe déjà : ${targetId} (choisir un autre id)`;
        setLastError(msg);
        return { ok: false, error: msg };
      }
      // Rebaptise l'artefact (id + nom) avant écriture — best-effort selon le type.
      const renamed = renameArtifact(current, targetId, displayName, cfg);
      const outcome = await writeArtifact(renamed, targetId);
      if (outcome.ok) setSaveAsOpen(false);
      return outcome;
    },
    [api, writeArtifact],
  );

  // --- New / Open / Close derrière la garde « modifs non sauvées » (§4.6) ---
  const performNew = useCallback((): void => {
    loadBlank();
  }, [loadBlank]);

  const performOpen = useCallback(
    async (openId: string): Promise<void> => {
      const cfg = configRef.current;
      setLastError(null);
      setLastWarning(null);
      let text: string | null = null;
      try {
        text = await api.libraryRead(cfg.collection, openId);
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
        return;
      }
      if (text == null) {
        setLastError(`introuvable : ${openId}`);
        return;
      }
      const parsed = cfg.parse(text);
      if (!parsed) {
        setLastError(`illisible : ${openId}`);
        return;
      }
      // Capture d'origine (défaut 2+3) : corps réel VERBATIM (byte-parité) + wrapping des listes flow.
      setOrigin({ body: verbatimBody(text), layout: readListLayout(text) });
      setArtifact(parsed);
      setId(cfg.idOf(parsed) || openId);
      setSource("library");
      setDirty(false);
      setSavedPath(null);
    },
    [api],
  );

  const performClose = useCallback((): void => {
    setArtifact(null);
    setOrigin(EMPTY_ORIGIN); // plus de document ouvert : la capture d'origine s'efface.
    setId(null);
    setSource("new");
    setDirty(false);
    setSavedPath(null);
    setLastError(null);
    setLastWarning(null);
    setSaveAsOpen(false); // plus de document : referme une invite Save As orpheline.
  }, []);

  const runOrGuard = useCallback(
    (kind: PendingKind): void => {
      if (dirty && artifactRef.current) {
        setPending(kind);
        return;
      }
      if (kind.action === "new") performNew();
      else if (kind.action === "open") void performOpen(kind.id);
      else performClose();
    },
    [dirty, performNew, performOpen, performClose],
  );

  const requestNew = useCallback(() => runOrGuard({ action: "new" }), [runOrGuard]);
  const requestOpen = useCallback(
    (openId: string) => runOrGuard({ action: "open", id: openId }),
    [runOrGuard],
  );
  const requestClose = useCallback(() => runOrGuard({ action: "close" }), [runOrGuard]);

  const proceedPending = useCallback((): void => {
    const p = pending;
    setPending(null);
    if (!p) return;
    if (p.action === "new") performNew();
    else if (p.action === "open") void performOpen(p.id);
    else performClose();
  }, [pending, performNew, performOpen, performClose]);

  const guardDiscardThenProceed = useCallback((): void => {
    proceedPending();
  }, [proceedPending]);

  const guardSaveThenProceed = useCallback(async (): Promise<void> => {
    const outcome = await save();
    // Save neuf → bascule Save As : on garde la garde en suspens (l'UI ouvre Save As).
    if (outcome.requiresSaveAs || !outcome.ok) return;
    proceedPending();
  }, [save, proceedPending]);

  const guardCancel = useCallback((): void => {
    setPending(null);
  }, []);

  const listEntries = useCallback(async (): Promise<LibraryEntry[]> => {
    const cfg = configRef.current;
    let raw: string[] = [];
    try {
      raw = await api.libraryList(cfg.collection);
    } catch {
      raw = [];
    }
    return raw
      .map((text) => cfg.parse(text))
      .filter((a): a is T => a !== null)
      .map((a) => ({ id: cfg.idOf(a), name: cfg.nameOf(a) }))
      .sort((x, y) => x.id.localeCompare(y.id));
  }, [api]);

  const openSaveAs = useCallback(() => setSaveAsOpen(true), []);
  const closeSaveAs = useCallback(() => setSaveAsOpen(false), []);

  return useMemo(
    () => ({
      artifact,
      id,
      name,
      dirty,
      source,
      edit,
      setName,
      canRename,
      requestNew,
      requestOpen,
      requestClose,
      save,
      saveAs,
      listEntries,
      guardOpen: pending !== null,
      guardSaveThenProceed,
      guardDiscardThenProceed,
      guardCancel,
      saveAsOpen,
      openSaveAs,
      closeSaveAs,
      lastError,
      lastWarning,
      savedPath,
    }),
    [
      artifact,
      id,
      name,
      dirty,
      source,
      edit,
      setName,
      canRename,
      requestNew,
      requestOpen,
      requestClose,
      save,
      saveAs,
      listEntries,
      pending,
      guardSaveThenProceed,
      guardDiscardThenProceed,
      guardCancel,
      saveAsOpen,
      openSaveAs,
      closeSaveAs,
      lastError,
      lastWarning,
      savedPath,
    ],
  );
}

/**
 * Rebaptise un artefact pour Save As (id + nom) de façon **défensive** : on ne suppose que la
 * présence des champs `id`/`name` (communs aux 3 types riches) ; les autres champs sont conservés.
 */
function renameArtifact<T>(
  artifact: T,
  newId: string,
  displayName: string,
  config: DocConfig<T>,
): T {
  const rec = artifact as unknown as Record<string, unknown>;
  const next: Record<string, unknown> = { ...rec };
  if ("id" in rec) next.id = newId;
  if ("name" in rec && displayName.trim().length > 0) next.name = displayName.trim();
  void config; // signature homogène (extensible par type au besoin)
  return next as unknown as T;
}
