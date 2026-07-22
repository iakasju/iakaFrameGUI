/**
 * ForgeShell — la **coquille de la forge à trois ateliers** (E2b §9) : barre supérieure (marque +
 * onglets `Team · Méthode · Kit` + charte + Réglages + « Livrer au Cockpit → »), puis — sous les
 * onglets — la **barre de gestes fichier** (`DocBar`) et le **titre de document** (`DocTitle`) de
 * l'onglet actif, enfin l'atelier dans un `.workbench`.
 *
 * Chaque onglet est un **document** (`useForgeDocument`, Q-1) : New/Open/Save/Save As/Close +
 * dirty + persistance `.md` dans la bibliothèque `iakaframe` (`IAKAFRAME_HOME`). Team/Méthode/Kit
 * s'instancient avec leur collection, leur gabarit vierge et leurs (dé)sérialiseurs frontmatter
 * (via `mappers`). Le « repart à zéro » de Méthode et Kit est **résolu** (persistance réelle).
 */
import { useEffect, useRef, useState } from "react";
import {
  buildTeamFromRoster,
  cloneWorkflow,
  serializeTeamMd,
  serializeMethodMd,
  serializeKitMd,
  parseTeamMd,
  parseMethodMd,
  parseKitMd,
  parseWorkflowMd,
  IAKAFRAME_CANONICAL_WORKFLOW,
  DEFAULT_KIT_NODE,
  type Kit,
  type Method,
  type Team,
  type Workflow,
} from "@iakaframe/core";
import { useForgeHandoff } from "../hooks/useForgeHandoff";
import { useForgeDocument, type LibraryEntry } from "./useForgeDocument";
import { serializeWorkflowDoc } from "./workflowSerialize";
import { IAKAFRAME_STARTER_METHOD } from "./useForgeMethod";
import { insertMethodRef, type MethodRef } from "./methodEdit";
import { makeTeamValidateRefs, makeMethodValidateRefs } from "./refs";
import { resolveMethodWorkflow } from "./workflowResolve";
import {
  teamToMd,
  mdToTeam,
  methodToMd,
  mdToMethod,
  kitToMd,
  mdToKit,
} from "./mappers";
import { CharteSelector } from "../components/CharteSelector";
import { SettingsRoot } from "../components/SettingsRoot";
import { OpenFramePanel } from "../components/OpenFramePanel";
import { ReservoirPanel } from "./ReservoirPanel";
import type { ReservoirElement } from "@iakaframe/core";
import { DocBar } from "./DocBar";
import { DocTitle } from "./DocTitle";
import { TeamAtelier } from "./ateliers/TeamAtelier";
import { MethodeAtelier } from "./ateliers/MethodeAtelier";
import { KitAtelier } from "./ateliers/KitAtelier";
import { WorkflowAtelier } from "./ateliers/WorkflowAtelier";
import { LearningAtelier } from "./ateliers/LearningAtelier";
import { useForgeLearning } from "../hooks/useForgeLearning";
import { useForgeRetrait } from "../hooks/useForgeRetrait";

type Tab = "team" | "methode" | "kit" | "workflow" | "apprentissage";

/**
 * Élément dont on montre le réservoir (Volet A) pour l'onglet actif : Team→team, Méthode→method,
 * Kit→kit ; les onglets sans mapping direct (workflow/apprentissage) retombent sur le frame entier.
 */
function reservoirElementForTab(tab: Tab): ReservoirElement {
  if (tab === "team") return "team";
  if (tab === "methode") return "method";
  if (tab === "kit") return "kit";
  return "frame";
}

const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: "team", label: "Team", sub: "casting pur" },
  { key: "methode", label: "Méthode", sub: "discipline" },
  { key: "workflow", label: "Workflow", sub: "phases · gates" },
  { key: "kit", label: "Kit", sub: "assemblage total" },
  { key: "apprentissage", label: "Apprentissage", sub: "réservoir · revue" },
];

/** Corps `.md` minimal généré au Save (renvoie au récit humain de la bibliothèque). */
const teamBody = (t: Team): string =>
  `# ${t.name}\n\nAssemblage de casting (ids de \`library/personas/\`). Forgé par iakaFrameGUI.\n`;
const methodBody = (m: Method): string =>
  `# ${m.name}\n\nAssemblage de discipline (ids vers \`library/*\`). Forgé par iakaFrameGUI.\n`;
const kitBody = (k: Kit): string =>
  `# Kit ${k.id || "sans-titre"}\n\nManifeste d'assemblage (méthode + team + binding). Forgé par iakaFrameGUI.\n`;

export function ForgeShell() {
  const handoff = useForgeHandoff();
  const [tab, setTab] = useState<Tab>("team");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [frameOpen, setFrameOpen] = useState(false);
  const [reservoirOpen, setReservoirOpen] = useState(false);

  // Onglet « Apprentissage » (U2) : PILOTE de `iakaframe review` (aucun document, pas de DocBar).
  const learning = useForgeLearning();
  // Retrait symétrique +/− (S6) : PILOTE de `iakaframe detach/attach/remove` (source unique CLI).
  const retrait = useForgeRetrait();

  // Validations I1 (miroir `checkRefs`), créées une fois (identité stable).
  const validateTeamRefs = useRef(makeTeamValidateRefs()).current;
  const validateMethodRefs = useRef(makeMethodValidateRefs()).current;

  // --- Trois documents (Q-1) : Team · Méthode · Kit ---
  const teamDoc = useForgeDocument<Team>({
    collection: "teams",
    blank: () => buildTeamFromRoster("Team iakaframe", "iakaframe"),
    serialize: (t, o) => serializeTeamMd(teamToMd(t), o.body ?? teamBody(t)),
    parse: (txt) => {
      const md = parseTeamMd(txt);
      return md ? mdToTeam(md) : null;
    },
    idOf: (t) => t.id,
    nameOf: (t) => t.name,
    withName: (t, name) => ({ ...t, name }),
    validateRefs: validateTeamRefs,
  });

  const methodDoc = useForgeDocument<Method>({
    collection: "methods",
    blank: () => ({ ...IAKAFRAME_STARTER_METHOD }),
    serialize: (m, o) =>
      serializeMethodMd(methodToMd(m), o.body ?? methodBody(m), o.layout ?? undefined),
    parse: (txt) => {
      const md = parseMethodMd(txt);
      return md ? mdToMethod(md) : null;
    },
    idOf: (m) => m.id,
    nameOf: (m) => m.name,
    withName: (m, name) => ({ ...m, name }),
    validateRefs: validateMethodRefs,
  });

  const kitDoc = useForgeDocument<Kit>({
    collection: "kits",
    blank: (): Kit => ({
      id: "iakaframe-kit",
      methodId: "iakaframe",
      teamId: "iakaframe",
      node: DEFAULT_KIT_NODE,
    }),
    serialize: (k, o) => serializeKitMd(kitToMd(k), o.body ?? kitBody(k)),
    parse: (txt) => {
      const md = parseKitMd(txt);
      return md ? mdToKit(md) : null;
    },
    idOf: (k) => k.id,
    nameOf: (k) => k.id,
  });

  // P6b : 4ᵉ document — Workflow (collection `workflows/`). Blank = **deep-clone du canonique gelé**
  // (EW-8, jamais muté) ; (dé)sérialisation `.md` = frontmatter plat + phases dans le corps (Q-8).
  const workflowDoc = useForgeDocument<Workflow>({
    collection: "workflows",
    blank: () => cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW),
    serialize: (w, o) => serializeWorkflowDoc(w, o),
    parse: (txt) => parseWorkflowMd(txt),
    idOf: (w) => w.id,
    nameOf: (w) => w.name,
    withName: (w, name) => ({ ...w, name }),
  });

  // Sème un artefact vierge dans chaque onglet au premier montage (un élément à éditer).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    teamDoc.requestNew();
    methodDoc.requestNew();
    kitDoc.requestNew();
    workflowDoc.requestNew();
  }, [teamDoc, methodDoc, kitDoc, workflowDoc]);

  const team = teamDoc.artifact;
  const method = methodDoc.artifact;
  const kit = kitDoc.artifact;
  const workflowArtifact = workflowDoc.artifact;

  // P6b : la Méthode **référence** un workflow (`workflowId`) de la collection. Le sélecteur de
  // l'onglet Méthode liste les workflows de `workflows/` ; le diagramme reflète le **résolu**
  // (collection → objet, sinon canonique — EW-7). Résolution isolée dans `resolveMethodWorkflow`.
  const [workflowOptions, setWorkflowOptions] = useState<LibraryEntry[]>([]);
  const [resolvedMethodWorkflow, setResolvedMethodWorkflow] = useState<Workflow>(
    IAKAFRAME_CANONICAL_WORKFLOW,
  );

  // Rafraîchit la liste des workflows de la collection quand on entre dans l'onglet Méthode.
  useEffect(() => {
    if (tab !== "methode") return;
    let alive = true;
    void workflowDoc.listEntries().then((entries) => {
      if (alive) setWorkflowOptions(entries);
    });
    return () => {
      alive = false;
    };
  }, [tab, workflowDoc, workflowArtifact]);

  // Résout le workflow référencé par la Méthode (pour le diagramme + le rail read-only).
  useEffect(() => {
    if (method === null) return;
    let alive = true;
    void resolveMethodWorkflow(method).then((res) => {
      if (alive) setResolvedMethodWorkflow(res.workflow);
    });
    return () => {
      alive = false;
    };
  }, [method]);

  const setMethodWorkflowId = (id: string | undefined): void => {
    if (method === null) return;
    const next: Method = { ...method };
    if (id && id.trim().length > 0) next.workflowId = id;
    else delete next.workflowId;
    methodDoc.edit(next);
  };

  const activeDoc = (
    tab === "team"
      ? teamDoc
      : tab === "methode"
        ? methodDoc
        : tab === "workflow"
          ? workflowDoc
          : kitDoc
  ) as unknown as import("./useForgeDocument").UseForgeDocument<unknown>;

  return (
    <div className="forge">
      <div className="topbar">
        <span className="brand">
          iaka<span className="f">Frame</span>GUI
        </span>
        <div className="tabs" role="tablist" aria-label="Ateliers de la forge">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab${tab === t.key ? " on" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="subl">{t.sub}</span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <span className="charte-pick">
          <CharteSelector />
        </span>
        <button
          type="button"
          className="settings-toggle"
          aria-pressed={frameOpen}
          title="Ouvrir un frame — charger et compter les 11 types"
          onClick={() => setFrameOpen((v) => !v)}
        >
          Ouvrir un frame
        </button>
        <button
          type="button"
          className="settings-toggle"
          aria-pressed={reservoirOpen}
          title="Réservoir — le stock des sous-éléments de l'élément courant"
          onClick={() => setReservoirOpen((v) => !v)}
        >
          Réservoir
        </button>
        <button
          type="button"
          className="settings-toggle"
          aria-pressed={settingsOpen}
          title="Réglages — racine de la bibliothèque"
          onClick={() => setSettingsOpen((v) => !v)}
        >
          Réglages
        </button>
        <button
          type="button"
          className="to-cockpit"
          disabled={team === null || handoff.delivering}
          title={team ? "Livrer le kit assemblé au Cockpit (handoff)" : "Aucune team à livrer"}
          onClick={() => team && void handoff.deliver(team)}
        >
          <span className="d" />
          {handoff.delivering ? "Livraison…" : "Livrer au Cockpit →"}
        </button>
      </div>

      {/* Barre de gestes fichier + titre de document de l'onglet actif. L'onglet « Apprentissage »
          n'est PAS un document (pilote de `review`, pas de New/Open/Save) : on masque DocBar/DocTitle. */}
      {tab !== "apprentissage" && (
        <>
          <DocBar doc={activeDoc} />
          <DocTitle
            name={activeDoc.name}
            dirty={activeDoc.dirty}
            onNameChange={activeDoc.canRename ? activeDoc.setName : undefined}
            disabled={activeDoc.artifact === null}
          />
        </>
      )}

      {frameOpen && (
        <div className="settings-panel">
          <OpenFramePanel />
        </div>
      )}

      {reservoirOpen && (
        <div className="settings-panel">
          <ReservoirPanel element={reservoirElementForTab(tab)} />
        </div>
      )}

      {settingsOpen && (
        <div className="settings-panel">
          <SettingsRoot />
        </div>
      )}

      <div className="workbench">
        {tab === "team" ? (
          team === null ? (
            <div className="edit">
              <p className="empty">Aucun artefact ouvert — New ou Open.</p>
            </div>
          ) : (
            <TeamAtelier team={team} onTeamChange={(t) => teamDoc.edit(t)} />
          )
        ) : tab === "methode" ? (
          method === null ? (
            <div className="edit">
              <p className="empty">Aucun artefact ouvert — New ou Open.</p>
            </div>
          ) : (
            <MethodeAtelier
              method={method}
              workflow={resolvedMethodWorkflow}
              workflowOptions={workflowOptions}
              onWorkflowIdChange={setMethodWorkflowId}
              insert={(ref: MethodRef, id: string) =>
                methodDoc.edit(insertMethodRef(method, ref, id))
              }
            />
          )
        ) : tab === "workflow" ? (
          workflowArtifact === null ? (
            <div className="edit">
              <p className="empty">Aucun artefact ouvert — New ou Open.</p>
            </div>
          ) : (
            <WorkflowAtelier
              workflow={workflowArtifact}
              onWorkflowChange={(w) => workflowDoc.edit(w)}
            />
          )
        ) : tab === "apprentissage" ? (
          <LearningAtelier learning={learning} retrait={retrait} />
        ) : kit === null ? (
          <div className="edit">
            <p className="empty">Aucun artefact ouvert — New ou Open.</p>
          </div>
        ) : (
          <KitAtelier
            method={method ?? { ...IAKAFRAME_STARTER_METHOD }}
            team={team ?? buildTeamFromRoster("Team iakaframe", "iakaframe")}
            kit={kit}
            onKitChange={(updater) =>
              kitDoc.edit(typeof updater === "function" ? updater(kit) : updater)
            }
          />
        )}
      </div>

      {handoff.result && (
        <div style={{ padding: "8px 22px" }}>
          {handoff.result.error ? (
            <p className="empty" role="alert">
              Échec de la livraison : {handoff.result.error}
            </p>
          ) : (
            <p className="empty">
              Livré dans <code>{handoff.result.dir}</code> — empreinte{" "}
              <code>{handoff.result.originHash}</code>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
