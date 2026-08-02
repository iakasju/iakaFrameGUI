/**
 * useForgeDeploy — AUTORITÉ du flux **génération → déploiement** (P4), séparé de
 * `useForgeTeams` (single-responsibility, pas de god-hook). Ce hook orchestre :
 *
 *  1. le **choix** d'une team (consommée en lecture depuis `useForgeTeams`), d'un **nœud**
 *     (`implementedNodes()`) et d'un **host LAN** (si `ollama-lan`) ;
 *  2. **Générer** : appelle l'adaptateur du registre (`getAdapter(node).generate(team)`), PUR
 *     — produit un `KitFileTree` **en mémoire**, ZÉRO I/O disque (aucun `kitDeploy`/`invoke`) ;
 *  3. **Déployer** : écrit l'arbre via la **façade unique** `kitDeploy(destDir, files, {force})`
 *     — non destructif (autorité `kit_deploy` Rust, inchangé), retour succès/conflit explicite.
 *
 * Q-3 : à l'**activation de la liaison**, il interroge en outre le **nœud** pour lui faire dire
 * quels modèles il porte (`llmModels` → `llm_models`, **commande existante**) et **pré-remplit**
 * chaque persona par `roleKey` (§ 6 de l'instruction Q-3). La liste découverte est **volatile** :
 * relue à chaque activation, **jamais persistée** (aucune clé nouvelle, aucun cache disque).
 *
 * Garde-fou clé (U-8) : tout changement de **team** ou de **nœud/host** **invalide** le kit et
 * le résultat affichés (on ne déploie jamais un kit périmé). Persistance légère (Q-4) du dernier
 * `node`/`destDir`/`lanHost` via `localStorage` (config non sensible, best-effort).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultBindingForNode,
  discoveryEndpointForNode,
  getAdapter,
  prefillBindingModels,
  serializeBinding,
  type Binding,
  type KitFileTree,
  type KitGenOptions,
  type NodeKind,
  type RunnerKind,
  type Team,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";

/** Résultat d'un déploiement (surface du retour `kit_deploy`). */
export interface DeployResult {
  /** Chemins effectivement écrits. */
  written: string[];
  /** Chemins non écrasés faute de `force` (conflit non destructif). */
  skipped: string[];
  /** Message d'erreur si le déploiement a échoué (façade/backend). */
  error?: string;
}

export interface UseForgeDeploy {
  // --- État de sélection ---
  selectedTeamId: string | null;
  node: NodeKind | null;
  lanHost: string;
  // --- État de liaison (P7, optionnel) ---
  binding: Binding | null;
  // --- Découverte des modèles au nœud (Q-3) : jamais persistée, relue à chaque activation ---
  /** Ids rendus par le nœud interrogé (`GET {host}/v1/models`). Vide = rien à proposer. */
  discoveredModels: string[];
  /** Aveu honnête quand la liste est vide (hôte refusé / injoignable / aucun modèle). */
  discoveryReason: string | null;
  /** Découverte en cours (l'appel a un timeout dur côté Rust). */
  discovering: boolean;
  // --- État du kit / aperçu ---
  kit: KitFileTree | null;
  selectedPath: string | null;
  // --- État du déploiement ---
  destDir: string;
  force: boolean;
  result: DeployResult | null;
  deploying: boolean;
  // --- Gardes d'UX dérivées ---
  canGenerate: boolean;
  canDeploy: boolean;
  // --- Actions de sélection (invalident le kit) ---
  selectTeam: (id: string | null) => void;
  selectNode: (n: NodeKind) => void;
  setLanHost: (h: string) => void;
  // --- Actions de liaison (P7) : optionnelles, invalident le kit ---
  enableBinding: () => void;
  clearBinding: () => void;
  setPersonaRunner: (personaId: string, runner: RunnerKind) => void;
  setPersonaModel: (personaId: string, model: string) => void;
  // --- Actions du flux ---
  generate: () => void;
  selectPreview: (path: string | null) => void;
  setDestDir: (d: string) => void;
  setForce: (f: boolean) => void;
  browseDestDir: () => Promise<void>;
  deploy: () => Promise<void>;
}

export interface UseForgeDeployDeps {
  /** Façade backend (injectable pour tests). */
  api?: Backend;
  /** Résolution d'une team par id (fournie par `useForgeTeams`). */
  teamById: (id: string) => Team | null;
}

/** Clés de persistance légère (Q-4) — config non sensible, best-effort. */
const LS_NODE = "iakaframegui.deploy.node";
const LS_DEST = "iakaframegui.deploy.destDir";
const LS_HOST = "iakaframegui.deploy.lanHost";

function lsGet(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    /* best-effort : la persistance ne doit jamais casser le flux */
  }
}

// --- Q-3 : aveux de découverte (§ 5.3). Aucun n'est un nom de modèle ; tous convergent sur le
// MÊME état visible : liste vide + raison affichée + `model: ""` + saisie manuelle ouverte. ---

/** La façade ne peut pas répondre : hors Tauri, façade partielle, ou rejet de l'appel. */
export const DISCOVERY_UNAVAILABLE_REASON =
  "découverte indisponible — saisie manuelle du modèle";

/** Le nœud a répondu mais n'expose aucun modèle, et sans raison explicite. */
export const DISCOVERY_EMPTY_REASON = "aucun modèle exposé par le nœud";

/** `ollama-lan` sans host saisi : il n'y a **rien** à interroger (aucun appel à l'aveuglette). */
export const DISCOVERY_NO_HOST_REASON =
  "hôte LAN non renseigné — saisie manuelle du modèle";

export function useForgeDeploy(deps: UseForgeDeployDeps): UseForgeDeploy {
  const api = deps.api ?? backend;
  const { teamById } = deps;

  // Réf miroir de `teamById` : générer sans le mettre en dépendance du callback.
  const teamByIdRef = useRef(teamById);
  teamByIdRef.current = teamById;

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [node, setNode] = useState<NodeKind | null>(null);
  const [lanHost, setLanHostState] = useState<string>("");
  const [binding, setBinding] = useState<Binding | null>(null);
  // Q-3 : découverte des modèles AU NŒUD. État volatil de session — **rien n'est persisté**
  // (ni `settings.json`, ni cache disque, ni localStorage) : la liste est relue à chaque activation.
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [discoveryReason, setDiscoveryReason] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [kit, setKit] = useState<KitFileTree | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [destDir, setDestDirState] = useState<string>("");
  const [force, setForce] = useState<boolean>(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [deploying, setDeploying] = useState<boolean>(false);

  // Réhydratation légère du dernier choix (Q-4), une fois au montage.
  useEffect(() => {
    const savedDest = lsGet(LS_DEST);
    if (savedDest) setDestDirState(savedDest);
    const savedHost = lsGet(LS_HOST);
    if (savedHost) setLanHostState(savedHost);
    // `node` réhydraté sans invalidation (aucun kit encore généré).
    const savedNode = lsGet(LS_NODE);
    if (savedNode) setNode(savedNode as NodeKind);
  }, []);

  /** Invalide le kit affiché + son aperçu + le dernier résultat (U-8). */
  const invalidateKit = useCallback((): void => {
    setKit(null);
    setSelectedPath(null);
    setResult(null);
  }, []);

  // Jeton de course : seule la découverte la PLUS RÉCENTE peut écrire dans l'état. Une réponse
  // tardive (timeout dur de 10 s côté Rust) ne ressuscite donc jamais une liste périmée.
  const discoveryRunRef = useRef(0);

  /** Remet la découverte à zéro (changement de team/nœud, ou liaison retirée). */
  const resetDiscovery = useCallback((): void => {
    discoveryRunRef.current += 1;
    setDiscoveredModels([]);
    setDiscoveryReason(null);
    setDiscovering(false);
  }, []);

  // --- Sélections (chacune invalide le kit périmé) ---

  const selectTeam = useCallback(
    (id: string | null): void => {
      setSelectedTeamId(id);
      setBinding(null); // le binding est PAR (team, nœud) → réinitialisé au changement de team.
      resetDiscovery();
      invalidateKit();
    },
    [invalidateKit, resetDiscovery],
  );

  const selectNode = useCallback(
    (n: NodeKind): void => {
      setNode(n);
      lsSet(LS_NODE, n);
      setBinding(null); // le binding est PAR nœud (E1 Q-2) → réinitialisé au changement de nœud.
      resetDiscovery();
      invalidateKit();
    },
    [invalidateKit, resetDiscovery],
  );

  // --- Liaison (P7) : optionnelle, produit un Binding origin:"forge-default" ---

  /**
   * **Découverte des modèles au nœud** (Q-3 § 5) — déclenchée à l'activation de la liaison, **une
   * fois**, jamais à la frappe. Passe **exclusivement** par `llmModels` (`llm_models` : garde
   * d'hôte, timeout dur, Bearer lu côté Rust) — **aucune commande nouvelle**.
   *
   * **Un seul chemin d'échec** (§ 5.3) : hôte refusé, injoignable, ou aucun modèle produisent le
   * MÊME état — liste vide, `reason` conservée **telle quelle**, modèles laissés à `""`, saisie
   * manuelle ouverte. Jamais une fausse liste, jamais une exception qui remonte au flux.
   */
  const discoverModels = useCallback(
    async (team: Team, n: NodeKind, host: string): Promise<void> => {
      const run = (discoveryRunRef.current += 1);
      const stale = (): boolean => discoveryRunRef.current !== run;
      const endpoint = discoveryEndpointForNode(n, host);
      if (endpoint === null) {
        // Hors périmètre (`claude`/`codex`) : aucun appel, aucun aveu — la saisie libre suffisait
        // déjà. `ollama-lan` sans host : rien à interroger, mais on le DIT.
        setDiscoveredModels([]);
        setDiscoveryReason(n === "ollama-lan" ? DISCOVERY_NO_HOST_REASON : null);
        return;
      }
      setDiscovering(true);
      try {
        const res = await api.llmModels?.(endpoint);
        if (stale()) return;
        const models = res?.models ?? [];
        if (models.length === 0) {
          // Chemin unique : la raison du nœud est reprise VERBATIM quand elle existe.
          setDiscoveredModels([]);
          setDiscoveryReason(
            res ? (res.reason ?? DISCOVERY_EMPTY_REASON) : DISCOVERY_UNAVAILABLE_REASON,
          );
          return;
        }
        setDiscoveredModels(models);
        setDiscoveryReason(null);
        // Pré-remplissage par `roleKey` (§ 6) des seules liaisons encore vides. Le garde-fou
        // `prev.node/teamId` empêche une réponse tardive de polluer un autre (team, nœud) ; si la
        // liaison a été décochée entre-temps (`prev === null`), rien n'est ressuscité.
        setBinding((prev) =>
          prev && prev.node === n && prev.teamId === team.id
            ? prefillBindingModels(prev, team, models)
            : prev,
        );
        invalidateKit();
      } catch {
        // Hors Tauri / rejet de façade : aveu honnête, saisie manuelle conservée.
        if (stale()) return;
        setDiscoveredModels([]);
        setDiscoveryReason(DISCOVERY_UNAVAILABLE_REASON);
      } finally {
        if (!stale()) setDiscovering(false);
      }
    },
    [api, invalidateKit],
  );

  /**
   * Active la liaison en initialisant le binding par défaut du (team, nœud) courant — `model: ""`
   * partout, **immédiatement** (défaut sûr synchrone) — puis lance la découverte, qui viendra
   * pré-remplir. Cocher reste **l'acte de confirmation** (Q-3.d).
   */
  const enableBinding = useCallback((): void => {
    if (selectedTeamId === null || node === null) return;
    const team = teamByIdRef.current(selectedTeamId);
    if (!team) return;
    setBinding(defaultBindingForNode(team, node));
    setDiscoveredModels([]);
    setDiscoveryReason(null);
    invalidateKit();
    void discoverModels(team, node, lanHost);
  }, [selectedTeamId, node, lanHost, invalidateKit, discoverModels]);

  /** Retire la liaison → retour au **kit pur** (comportement P4 d'origine). */
  const clearBinding = useCallback((): void => {
    setBinding(null);
    resetDiscovery();
    invalidateKit();
  }, [invalidateKit, resetDiscovery]);

  /** Change le runner d'une persona dans le binding courant (no-op si pas de binding). */
  const setPersonaRunner = useCallback(
    (personaId: string, runner: RunnerKind): void => {
      setBinding((prev) =>
        prev
          ? {
              ...prev,
              bindings: prev.bindings.map((b) =>
                b.personaId === personaId ? { ...b, runner } : b,
              ),
            }
          : prev,
      );
      invalidateKit();
    },
    [invalidateKit],
  );

  /** Change le modèle d'une persona dans le binding courant (no-op si pas de binding). */
  const setPersonaModel = useCallback(
    (personaId: string, model: string): void => {
      setBinding((prev) =>
        prev
          ? {
              ...prev,
              bindings: prev.bindings.map((b) =>
                b.personaId === personaId ? { ...b, model } : b,
              ),
            }
          : prev,
      );
      invalidateKit();
    },
    [invalidateKit],
  );

  const setLanHost = useCallback(
    (h: string): void => {
      setLanHostState(h);
      lsSet(LS_HOST, h);
      invalidateKit();
    },
    [invalidateKit],
  );

  // --- Générer (PUR, zéro I/O disque) ---

  const generate = useCallback((): void => {
    if (selectedTeamId === null || node === null) return;
    if (node === "ollama-lan" && lanHost.trim().length === 0) return;
    const team = teamByIdRef.current(selectedTeamId);
    if (!team) return;
    // Options assemblées : `binding`/`lanHost` seulement s'ils s'appliquent. **Sans binding ni
    // host → `undefined`** (appel identique à P4 → sortie byte-identique, non-régression B-2).
    const opts: KitGenOptions = {};
    if (node === "ollama-lan") opts.lanHost = lanHost.trim();
    if (binding) opts.binding = binding;
    // Adaptateur du registre → arbre EN MÉMOIRE. Aucun appel façade/écriture ici.
    const tree = getAdapter(node).generate(
      team,
      Object.keys(opts).length > 0 ? opts : undefined,
    );
    setResult(null);
    setKit(tree);
    // Sélectionne d'office le 1er chemin (tri stable) pour un aperçu immédiat.
    const first = Object.keys(tree.files).sort()[0] ?? null;
    setSelectedPath(first);
  }, [selectedTeamId, node, lanHost, binding]);

  const selectPreview = useCallback((path: string | null): void => {
    setSelectedPath(path);
  }, []);

  // --- Déployer (via façade unique) ---

  const setDestDir = useCallback((d: string): void => {
    setDestDirState(d);
    lsSet(LS_DEST, d);
  }, []);

  const browseDestDir = useCallback(async (): Promise<void> => {
    try {
      const chosen = await api.pickDirectory();
      if (chosen) setDestDir(chosen);
    } catch {
      /* hors Tauri / annulation : on ne casse pas le flux */
    }
  }, [api, setDestDir]);

  const deploy = useCallback(async (): Promise<void> => {
    if (kit === null || destDir.trim().length === 0) return;
    setDeploying(true);
    try {
      // P7 : si un binding est posé, la **forge** ajoute `binding.json` à l'arbre (à la racine),
      // écrit par `kit_deploy` **inchangé**. Sans binding → arbre du kit tel quel.
      const files = binding
        ? { ...kit.files, "binding.json": serializeBinding(binding) }
        : kit.files;
      const written = await api.kitDeploy(destDir.trim(), files, force);
      // Non destructif : ce qui n'est pas écrit (sans force) est un conflit `skipped`.
      const allPaths = Object.keys(files);
      const skipped = force
        ? []
        : allPaths.filter((p) => !written.includes(p));
      setResult({ written, skipped });
    } catch (e) {
      setResult({
        written: [],
        skipped: [],
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setDeploying(false);
    }
  }, [api, kit, destDir, force, binding]);

  // --- Gardes d'UX dérivées (§ 3.3) ---

  const canGenerate =
    selectedTeamId !== null &&
    node !== null &&
    (node !== "ollama-lan" || lanHost.trim().length > 0);

  const canDeploy = kit !== null && destDir.trim().length > 0 && !deploying;

  return useMemo(
    () => ({
      selectedTeamId,
      node,
      lanHost,
      binding,
      discoveredModels,
      discoveryReason,
      discovering,
      kit,
      selectedPath,
      destDir,
      force,
      result,
      deploying,
      canGenerate,
      canDeploy,
      selectTeam,
      selectNode,
      setLanHost,
      enableBinding,
      clearBinding,
      setPersonaRunner,
      setPersonaModel,
      generate,
      selectPreview,
      setDestDir,
      setForce,
      browseDestDir,
      deploy,
    }),
    [
      selectedTeamId,
      node,
      lanHost,
      binding,
      discoveredModels,
      discoveryReason,
      discovering,
      kit,
      selectedPath,
      destDir,
      force,
      result,
      deploying,
      canGenerate,
      canDeploy,
      selectTeam,
      selectNode,
      setLanHost,
      enableBinding,
      clearBinding,
      setPersonaRunner,
      setPersonaModel,
      generate,
      selectPreview,
      setDestDir,
      browseDestDir,
      deploy,
    ],
  );
}
