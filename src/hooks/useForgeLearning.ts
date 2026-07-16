/**
 * useForgeLearning — AUTORITÉ de l'onglet « Apprentissage » (U2, surface-apprentissage.md).
 *
 * Ce hook est un **PILOTE** de `iakaframe review` : il ne possède **aucun** stockage et ne
 * réimplémente **ni** la politique de consentement **ni** les plafonds (source unique = `review`,
 * T5). Il orchestre les 4 verbes via la **façade unique** (`backend.reviewList/Show/Apply/Reject`,
 * elle-même bornée par l'allow-list `plugin-shell` — cf. dérogation AR-1/AR-6 documentée dans
 * `backend.ts`). Le filtre de statut (Q-4 : `en-attente` par défaut + historique) est appliqué
 * **côté vue** sur le champ `status` renvoyé par `review list --json` (aucun argv variable).
 *
 * Dégradation propre (§ 4.4) : hors contexte Tauri / CLI introuvable / réservoir vide → état vide
 * lisible, jamais de crash (calque du comportement `iakaframeHome() → null`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  backend as defaultBackend,
  type Backend,
  type ReviewApplyResult,
  type ReviewProposal,
  type ReviewRejectResult,
} from "../api/backend";

/** Filtre d'affichage (Q-4). `all` = tout l'historique ; défaut = `en-attente`. */
export type LearningFilter = "en-attente" | "applique" | "rejete" | "all";

/** Sous-ensemble de la façade réellement consommé (facilite le mock en test). */
export type LearningApi = Pick<
  Backend,
  "isTauri" | "reviewList" | "reviewShow" | "reviewApply" | "reviewReject"
>;

export interface LearningDetail {
  proposal: ReviewProposal;
  /** `proposal.md` complet (quoi / où / pourquoi + artefact) — affiché tel quel, sans éditeur (Q-5). */
  text: string;
}

/** Restitution verbatim du résultat d'un `apply`/`reject` (succès ou refus). */
export interface LearningOutcome {
  id: string;
  kind: "apply" | "reject";
  ok: boolean;
  /** Message humain dérivé de la sortie `review` (où c'est allé, ou le refus explicite). */
  message: string;
}

export interface UseForgeLearning {
  /** Contexte prêt (Tauri) : sinon dégradation propre (état vide « hors forge »). */
  ready: boolean;
  loading: boolean;
  /** Erreur d'accès (CLI introuvable, sortie illisible…) — jamais un crash. */
  error: string | null;
  /** Toutes les propositions du réservoir (non filtrées). */
  proposals: ReviewProposal[];
  /** Propositions visibles après application du filtre de statut (Q-4). */
  visible: ReviewProposal[];
  filter: LearningFilter;
  /** Détail de la proposition ouverte (`show`), ou `null`. */
  detail: LearningDetail | null;
  /** Dernier résultat d'action (apply/reject) restitué verbatim. */
  outcome: LearningOutcome | null;
  /** Action en cours (id) — désactive les boutons jumeaux le temps du geste. */
  busyId: string | null;
  setFilter: (f: LearningFilter) => void;
  refresh: () => Promise<void>;
  view: (id: string) => Promise<void>;
  closeDetail: () => void;
  apply: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
}

/** Types d'amendements STRUCTURELS (miroir de `STRUCTURAL_TYPES` de review — jamais auto). */
const STRUCTURAL = new Set(["skill", "hook", "config"]);

/**
 * Une proposition exige-t-elle un **geste humain** (garde de consentement rendu visible, § 4.4) ?
 * VRAI pour tout structurel et pour `memory/profil` ; VRAI aussi dès que `review` la classe `file`.
 * NB : ceci est **de l'affichage** — la décision fait autorité côté `review` (on ne re-décide rien).
 */
export function requiresHumanGesture(p: ReviewProposal): boolean {
  if (STRUCTURAL.has(p.type)) return true;
  if (p.type === "memory" && p.target === "profil") return true;
  return p.policy === "file";
}

/** Une proposition est-elle STRUCTURELLE (jamais auto, quel que soit le réglage) ? */
export function isStructural(p: ReviewProposal): boolean {
  return STRUCTURAL.has(p.type);
}

/** Message humain d'un `apply` (où c'est allé) ou de son refus explicite — verbatim. */
function describeApply(r: ReviewApplyResult): LearningOutcome {
  const id = r.id ?? "?";
  if (r.ok) {
    const m = r.materialize ?? {};
    const where =
      m.kind === "skill"
        ? `skill → ${m.dest ?? "bibliothèque"}`
        : `${m.target ?? r.type} (${m.length ?? "?"}/${m.cap ?? "?"} car.)`;
    return { id, kind: "apply", ok: true, message: `Appliquée : [${r.type}] → ${where}.` };
  }
  const m = r.materialize;
  let why = r.reason ?? "raison inconnue";
  if (m?.reason === "cap-exceeded")
    why = `plafond dur dépassé sur ${m.target} (${m.length}/${m.cap} car.) — consolidation requise.`;
  else if (m?.reason === "type-non-materialisable-mvp")
    why = `type « ${m.type} » non matérialisable au MVP (close ne le produit pas encore).`;
  else if (m?.reason === "skill-existe-deja")
    why = `un skill « ${m.id} » existe déjà (${m.dest}) — non écrasé.`;
  else if (r.reason === "deja-traitee")
    why = `proposition déjà ${r.status} (on ne l'applique pas deux fois).`;
  return { id, kind: "apply", ok: false, message: `Refus : ${why}` };
}

/** Message humain d'un `reject` (ou de son refus). */
function describeReject(r: ReviewRejectResult): LearningOutcome {
  const id = r.id ?? "?";
  if (r.ok) return { id, kind: "reject", ok: true, message: `Rejetée : [${r.type}] (statut rejete ; rien matérialisé).` };
  const why = r.reason === "deja-traitee" ? `proposition déjà ${r.status}.` : r.reason ?? "raison inconnue";
  return { id, kind: "reject", ok: false, message: `Refus : ${why}` };
}

export function useForgeLearning(api: LearningApi = defaultBackend): UseForgeLearning {
  const ready = api.isTauri();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ReviewProposal[]>([]);
  const [filter, setFilter] = useState<LearningFilter>("en-attente");
  const [detail, setDetail] = useState<LearningDetail | null>(null);
  const [outcome, setOutcome] = useState<LearningOutcome | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Anti-course : ignore les réponses d'un refresh périmé (garde de la dernière requête).
  const reqSeq = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    if (!ready) {
      setProposals([]);
      return;
    }
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.reviewList();
      if (seq !== reqSeq.current) return;
      if (!res.ok) {
        setError(res.error ?? "réservoir illisible");
        setProposals([]);
      } else {
        setProposals(res.proposals ?? []);
      }
    } catch (e) {
      if (seq !== reqSeq.current) return;
      setError(e instanceof Error ? e.message : "accès au réservoir impossible");
      setProposals([]);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [api, ready]);

  // Chargement initial (une fois le contexte prêt).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(
    () => (filter === "all" ? proposals : proposals.filter((p) => p.status === filter)),
    [proposals, filter],
  );

  const view = useCallback(
    async (id: string): Promise<void> => {
      if (!ready) return;
      try {
        const res = await api.reviewShow(id);
        if (res.ok && res.proposal) setDetail({ proposal: res.proposal, text: res.text ?? "" });
        else setError(res.error ?? `proposition introuvable : ${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "lecture impossible");
      }
    },
    [api, ready],
  );

  const closeDetail = useCallback(() => setDetail(null), []);

  const apply = useCallback(
    async (id: string): Promise<void> => {
      if (!ready) return;
      setBusyId(id);
      try {
        const r = await api.reviewApply(id);
        setOutcome(describeApply(r));
      } catch (e) {
        setOutcome({ id, kind: "apply", ok: false, message: e instanceof Error ? e.message : "échec apply" });
      } finally {
        setBusyId(null);
        await refresh();
      }
    },
    [api, ready, refresh],
  );

  const reject = useCallback(
    async (id: string): Promise<void> => {
      if (!ready) return;
      setBusyId(id);
      try {
        const r = await api.reviewReject(id);
        setOutcome(describeReject(r));
      } catch (e) {
        setOutcome({ id, kind: "reject", ok: false, message: e instanceof Error ? e.message : "échec reject" });
      } finally {
        setBusyId(null);
        await refresh();
      }
    },
    [api, ready, refresh],
  );

  return {
    ready,
    loading,
    error,
    proposals,
    visible,
    filter,
    detail,
    outcome,
    busyId,
    setFilter,
    refresh,
    view,
    closeDetail,
    apply,
    reject,
  };
}
