/**
 * useForgeRetrait — AUTORITÉ de la surface « Retrait symétrique +/− » (S6,
 * symetrie-ajout-suppression.md).
 *
 * Ce hook est un **PILOTE** des verbes CLI de retrait (`attach`/`detach`/`remove`, lus via
 * `list`/`show`) : il ne possède **aucun** stockage et ne réimplémente **ni** le RESTRICT
 * (`findReferrers`), **ni** la corbeille `<root>/.trash-<ts>/`, **ni** la cascade, **ni** la
 * mutation du `skills:[]` — tout cela vit dans la CLI 1ʳᵉ tranche (source unique). Il orchestre les
 * verbes via la **façade unique** (`backend.libraryScan/personaSkills/attachSkill/detachSkill/
 * removeArtifact`, bornée par l'allow-list `plugin-shell` — cf. dérogation AR-1/AR-6 documentée
 * dans `backend.ts`). Le « titre du skill » et son `−` sont une **VUE** sur `skills:[]` (Option 1),
 * jamais une section écrite dans le corps du persona.
 *
 * Dégradation propre : hors contexte Tauri / CLI introuvable → état vide lisible, jamais de crash.
 *
 * Sûreté : aucun retrait sans geste humain explicite. La **cascade** (retrait de référents) n'est
 * JAMAIS déclenchée automatiquement : un refus RESTRICT est restitué avec ses référents, et la
 * cascade exige un second appel explicite (`removeCascade`, équivalent `--cascade --yes`).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  backend as defaultBackend,
  type AttachDetachResult,
  type Backend,
  type LibraryEntry,
  type RemoveKind,
  type RemoveReferrer,
  type RemoveResult,
} from "../api/backend";

/** Sous-ensemble de la façade réellement consommé (facilite le mock en test). */
export type RetraitApi = Pick<
  Backend,
  "isTauri" | "libraryScan" | "personaSkills" | "attachSkill" | "detachSkill" | "removeArtifact"
>;

/** Restitution verbatim du résultat d'un geste (attach/detach/remove), succès ou refus. */
export interface RetraitOutcome {
  kind: "attach" | "detach" | "remove";
  ok: boolean;
  message: string;
  /** Référents renvoyés par un refus RESTRICT (à traiter d'abord) — surface la liste de la CLI. */
  referrers?: RemoveReferrer[];
  /** Cible d'un refus RESTRICT sur `remove`, pour proposer la cascade explicite au même endroit. */
  restrict?: { kind: RemoveKind; id: string } | null;
}

export interface UseForgeRetrait {
  ready: boolean;
  loading: boolean;
  error: string | null;
  /** Personas de la bibliothèque (sélecteur du volet skill↔persona). */
  personas: LibraryEntry[];
  /** Skills de la bibliothèque (picker d'attache + cibles de `remove skill`). */
  skills: LibraryEntry[];
  teams: LibraryEntry[];
  methods: LibraryEntry[];
  bindings: LibraryEntry[];
  /** Persona sélectionné + son `skills:[]` (VUE Option 1, chaque skill portant un `−`). */
  selectedPersona: string | null;
  personaSkillList: string[];
  /** Geste en cours (désactive les boutons le temps de l'appel). */
  busy: boolean;
  outcome: RetraitOutcome | null;
  refresh: () => Promise<void>;
  selectPersona: (personaId: string) => Promise<void>;
  detach: (skillId: string) => Promise<void>;
  attach: (skillId: string) => Promise<void>;
  remove: (kind: RemoveKind, id: string) => Promise<void>;
  /** Cascade EXPLICITE (équivalent `--cascade --yes`) — jamais appelée sans geste humain dédié. */
  removeCascade: (kind: RemoveKind, id: string) => Promise<void>;
  clearOutcome: () => void;
}

function describeAttachDetach(r: AttachDetachResult, kind: "attach" | "detach"): RetraitOutcome {
  if (!r.ok) return { kind, ok: false, message: `Refus : ${r.error ?? "raison inconnue"}` };
  const verb = kind === "attach" ? "attaché" : "détaché";
  const list = r.skills && r.skills.length ? `[${r.skills.join(", ")}]` : "[]";
  if (r.changed === false) {
    return {
      kind,
      ok: true,
      message:
        kind === "attach"
          ? `Déjà attaché : ${r.skillId} → ${r.personaId} (no-op). skills: ${list}`
          : `Déjà absent : ${r.skillId} n'était pas sur ${r.personaId} (no-op). skills: ${list}`,
    };
  }
  return { kind, ok: true, message: `${r.skillId} ${verb} · ${r.personaId} — skills: ${list} (réversible).` };
}

function describeRemove(r: RemoveResult, kind: RemoveKind, id: string): RetraitOutcome {
  if (r.ok) {
    const detached = r.detached && r.detached.length ? ` · détaché de ${r.detached.join(", ")}` : "";
    return {
      kind: "remove",
      ok: true,
      message: `− ${kind} ${id} retiré (archivé dans ${r.trash ?? "corbeille"})${detached} — restaurable.`,
      restrict: null,
    };
  }
  if (r.reason === "restrict") {
    return {
      kind: "remove",
      ok: false,
      message:
        kind === "skill"
          ? `Refus (RESTRICT) : ${kind} ${id} est encore référencé — détache-le d'abord des personas ci-dessous, puis réessaie.`
          : `Refus (RESTRICT) : ${kind} ${id} est encore référencé — rien retiré. Retire les référents, ou lance une cascade explicite.`,
      referrers: r.referrers ?? [],
      restrict: kind === "skill" ? null : { kind, id },
    };
  }
  if (r.reason === "confirm-required") {
    return {
      kind: "remove",
      ok: false,
      message: `Confirmation requise : la cascade toucherait ${r.referrers?.length ?? 0} référent(s).`,
      referrers: r.referrers ?? [],
      restrict: { kind, id },
    };
  }
  return { kind: "remove", ok: false, message: `Refus : ${r.error ?? r.reason ?? "raison inconnue"}`, restrict: null };
}

export function useForgeRetrait(api: RetraitApi = defaultBackend): UseForgeRetrait {
  const ready = api.isTauri();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personas, setPersonas] = useState<LibraryEntry[]>([]);
  const [skills, setSkills] = useState<LibraryEntry[]>([]);
  const [teams, setTeams] = useState<LibraryEntry[]>([]);
  const [methods, setMethods] = useState<LibraryEntry[]>([]);
  const [bindings, setBindings] = useState<LibraryEntry[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [personaSkillList, setPersonaSkillList] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<RetraitOutcome | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!ready) {
      setPersonas([]);
      setSkills([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, s, t, m, b] = await Promise.all([
        api.libraryScan("personas"),
        api.libraryScan("skills"),
        api.libraryScan("teams"),
        api.libraryScan("methods"),
        api.libraryScan("bindings"),
      ]);
      setPersonas(p);
      setSkills(s);
      setTeams(t);
      setMethods(m);
      setBindings(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "bibliothèque inaccessible");
      setPersonas([]);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [api, ready]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadPersonaSkills = useCallback(
    async (personaId: string): Promise<void> => {
      try {
        setPersonaSkillList(await api.personaSkills(personaId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "lecture des skills impossible");
        setPersonaSkillList([]);
      }
    },
    [api],
  );

  const selectPersona = useCallback(
    async (personaId: string): Promise<void> => {
      if (!ready) return;
      setSelectedPersona(personaId);
      setOutcome(null);
      await loadPersonaSkills(personaId);
    },
    [ready, loadPersonaSkills],
  );

  const detach = useCallback(
    async (skillId: string): Promise<void> => {
      if (!ready || !selectedPersona) return;
      setBusy(true);
      try {
        const r = await api.detachSkill(skillId, selectedPersona);
        setOutcome(describeAttachDetach(r, "detach"));
        if (r.ok && Array.isArray(r.skills)) setPersonaSkillList(r.skills);
      } catch (e) {
        setOutcome({ kind: "detach", ok: false, message: e instanceof Error ? e.message : "échec detach" });
      } finally {
        setBusy(false);
      }
    },
    [api, ready, selectedPersona],
  );

  const attach = useCallback(
    async (skillId: string): Promise<void> => {
      if (!ready || !selectedPersona) return;
      setBusy(true);
      try {
        const r = await api.attachSkill(skillId, selectedPersona);
        setOutcome(describeAttachDetach(r, "attach"));
        if (r.ok && Array.isArray(r.skills)) setPersonaSkillList(r.skills);
      } catch (e) {
        setOutcome({ kind: "attach", ok: false, message: e instanceof Error ? e.message : "échec attach" });
      } finally {
        setBusy(false);
      }
    },
    [api, ready, selectedPersona],
  );

  const remove = useCallback(
    async (kind: RemoveKind, id: string): Promise<void> => {
      if (!ready) return;
      setBusy(true);
      try {
        const r = await api.removeArtifact(kind, id, false);
        setOutcome(describeRemove(r, kind, id));
        if (r.ok) await refresh();
        if (r.ok && selectedPersona) await loadPersonaSkills(selectedPersona);
      } catch (e) {
        setOutcome({ kind: "remove", ok: false, message: e instanceof Error ? e.message : "échec remove" });
      } finally {
        setBusy(false);
      }
    },
    [api, ready, refresh, selectedPersona, loadPersonaSkills],
  );

  const removeCascade = useCallback(
    async (kind: RemoveKind, id: string): Promise<void> => {
      if (!ready) return;
      setBusy(true);
      try {
        const r = await api.removeArtifact(kind, id, true);
        setOutcome(describeRemove(r, kind, id));
        if (r.ok) await refresh();
        if (r.ok && selectedPersona) await loadPersonaSkills(selectedPersona);
      } catch (e) {
        setOutcome({ kind: "remove", ok: false, message: e instanceof Error ? e.message : "échec cascade" });
      } finally {
        setBusy(false);
      }
    },
    [api, ready, refresh, selectedPersona, loadPersonaSkills],
  );

  const clearOutcome = useCallback(() => setOutcome(null), []);

  return useMemo(
    () => ({
      ready,
      loading,
      error,
      personas,
      skills,
      teams,
      methods,
      bindings,
      selectedPersona,
      personaSkillList,
      busy,
      outcome,
      refresh,
      selectPersona,
      detach,
      attach,
      remove,
      removeCascade,
      clearOutcome,
    }),
    [
      ready, loading, error, personas, skills, teams, methods, bindings,
      selectedPersona, personaSkillList, busy, outcome,
      refresh, selectPersona, detach, attach, remove, removeCascade, clearOutcome,
    ],
  );
}
