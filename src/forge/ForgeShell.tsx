/**
 * ForgeShell — la **coquille de la console** (Lot 2, alignement-gui-modele-de-frame.md § 4/§7).
 * La barre supérieure porte désormais la **nav à 9 entrées**
 * (`frame · méthode · team · persona · éléments · assemblage · models · kit · apprentissage`,
 * Fork B) qui remplace l'ancienne coquille à 5 onglets-documents (Team·Méthode·Workflow·Kit·
 * Apprentissage). Migration **PROGRESSIVE** (Fork A) : les ateliers existants sont **conservés
 * comme surfaces d'édition** derrière les entrées correspondantes ; les entrées
 * `frame`/`éléments`/`assemblage`/`persona`/`models` réutilisent leur écran dédié (`OpenFramePanel`,
 * `ElementsAuthoring` — réservoir authorable, chantier #3 Lot 1, ex-`ElementPoolPanel` read-only,
 * `AssemblyView` du Lot 1, `PersonaReservoir` du Lot 3, `FramesGallery` du Lot 4).
 *
 * Chrome : la marque, la nav, un bouton **New** (crée une nouvelle entité du type courant, comme la
 * maquette), puis les utilitaires conservés (charte, Réglages, « Livrer au Cockpit → »). Les entrées
 * **documentaires** (team · méthode · kit) gardent leur **cycle de document** (`useForgeDocument`,
 * DocBar : New/Open/Save/Save As/Close + dirty), et **sélectionner** un élément existant (via Open)
 * l'ouvre en **mode ÉDITION** (pastille de mode ✎ édition / ✚ création). *Fëanor-en-tête = Lot 6,
 * NON implémenté ici.*
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
import { useForgeDocument, poolStorage, type LibraryEntry, type UseForgeDocument } from "./useForgeDocument";
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
import { AssemblyView } from "./AssemblyView";
import { PersonaReservoir } from "./PersonaReservoir";
import { FramesGallery } from "./FramesGallery";
import { ElementsAuthoring } from "./ElementsAuthoring";
import { DocBar } from "./DocBar";
import { DocTitle } from "./DocTitle";
import { TeamAtelier } from "./ateliers/TeamAtelier";
import { MethodeAtelier } from "./ateliers/MethodeAtelier";
import { WorkflowAtelier } from "./ateliers/WorkflowAtelier";
import { KitAtelier } from "./ateliers/KitAtelier";
import { LearningAtelier } from "./ateliers/LearningAtelier";
import { useForgeLearning } from "../hooks/useForgeLearning";
import { useForgeRetrait } from "../hooks/useForgeRetrait";
import { ForgeCreateContext, type CreateHandler, type ForgeCreateApi } from "./forgeCreate";

/** Les 9 entrées de la nav (Fork B). L'ordre est celui de la maquette + Kit/Apprentissage conservés. */
type NavKey =
  | "frame"
  | "methode"
  | "team"
  | "persona"
  | "elements"
  | "assemblage"
  | "models"
  | "kit"
  | "apprentissage";

const NAV: { key: NavKey; label: string; title: string }[] = [
  { key: "frame", label: "frame", title: "Un frame = une méthode + une team, mariées par un binding" },
  { key: "methode", label: "méthode", title: "La méthode : workflow, principes, rôles abstraits" },
  { key: "team", label: "team", title: "La team : le casting de personas" },
  { key: "persona", label: "persona", title: "Fiche d'une persona (élément de 1er ordre)" },
  { key: "elements", label: "éléments", title: "Le réservoir partagé — les pools de sous-éléments" },
  { key: "assemblage", label: "assemblage", title: "Marier méthode + team (binding) — les deux frères" },
  { key: "models", label: "models", title: "Catalogue des frames — les modèles instanciables" },
  { key: "kit", label: "kit", title: "Le kit : assemblage total (méthode + team + binding)" },
  { key: "apprentissage", label: "apprentissage", title: "Réservoir de propositions · revue" },
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
  const [nav, setNav] = useState<NavKey>("team");
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Sous-surfaces de l'entrée « méthode » (Lot 5) : la **discipline** (principes/rôles/…) et le
  // **workflow** (type `kind` + phases/gates). Le workflow est un **élément de la méthode**
  // (maquette `04-creation-workflow.html`) — rétabli ici après son retrait de la nav au Lot 2.
  const [methodeTab, setMethodeTab] = useState<"discipline" | "workflow">("discipline");

  // Onglet « Apprentissage » (U2) : PILOTE de `iakaframe review` (aucun document, pas de DocBar).
  const learning = useForgeLearning();
  // Retrait symétrique +/− (S6) : PILOTE de `iakaframe detach/attach/remove` (source unique CLI).
  const retrait = useForgeRetrait();

  // Validations I1 (miroir `checkRefs`), créées une fois (identité stable).
  const validateTeamRefs = useRef(makeTeamValidateRefs()).current;
  const validateMethodRefs = useRef(makeMethodValidateRefs()).current;

  // Canal de création (correctif recette #1) : l'écran actif qui SAIT créer sans être un document
  // (réservoirs persona/éléments) publie ici son geste ✚ ; le New du chrome l'active et le déclenche.
  // `null` = l'entrée courante n'a pas de geste de réservoir (document, ou entrée read-only).
  const [reservoirCreate, setReservoirCreate] = useState<CreateHandler>(null);
  const createApi = useRef<ForgeCreateApi>({
    // On stocke une FONCTION en état → forme fonctionnelle (`() => fn`) pour ne pas l'exécuter.
    setCreateHandler: (fn: CreateHandler) => setReservoirCreate(() => fn),
  }).current;

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

  // Lot 5c (sous-lot 5c-workflow, Option A) : le document Workflow écrit désormais le **POOL**
  // `library/workflows/` (vérité unique) via `poolStorage("workflows")`, **plus** la collection
  // `<home>/workflows/` (chemin retiré — AC-W1 : aucune double écriture). La surface « éléments »
  // (`workflowPersist`) et la surface « méthode » (ci-dessous) convergent sur `pool_write`. Le
  // sélecteur de la Méthode liste donc les workflows du pool ; la résolution du diagramme aussi.
  const workflowDoc = useForgeDocument<Workflow>({
    storage: (api) => poolStorage("workflows", api),
    blank: () => cloneWorkflow(IAKAFRAME_CANONICAL_WORKFLOW),
    serialize: (w, o) => serializeWorkflowDoc(w, o),
    parse: (txt) => parseWorkflowMd(txt),
    idOf: (w) => w.id,
    nameOf: (w) => w.name,
    withName: (w, name) => ({ ...w, name }),
  });

  // Sème un artefact vierge dans chaque document au premier montage (un élément à éditer).
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
  // l'entrée Méthode liste les workflows de `workflows/` ; le diagramme reflète le **résolu**
  // (collection → objet, sinon canonique — EW-7). Résolution isolée dans `resolveMethodWorkflow`.
  const [workflowOptions, setWorkflowOptions] = useState<LibraryEntry[]>([]);
  const [resolvedMethodWorkflow, setResolvedMethodWorkflow] = useState<Workflow>(
    IAKAFRAME_CANONICAL_WORKFLOW,
  );

  // Rafraîchit la liste des workflows de la collection quand on entre dans l'entrée Méthode.
  useEffect(() => {
    if (nav !== "methode") return;
    let alive = true;
    void workflowDoc.listEntries().then((entries) => {
      if (alive) setWorkflowOptions(entries);
    });
    return () => {
      alive = false;
    };
  }, [nav, workflowDoc, workflowArtifact]);

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

  // Les entrées **documentaires** (team · méthode · kit) portent un cycle de document (DocBar,
  // mode édition/création). Les autres entrées sont des surfaces read-only ou des placeholders.
  const activeDoc: UseForgeDocument<unknown> | null =
    nav === "team"
      ? (teamDoc as unknown as UseForgeDocument<unknown>)
      : nav === "methode"
        ? // Lot 5 : sous « méthode », le cycle de document suit la sous-surface active — la
          // discipline édite `methodDoc`, le workflow édite `workflowDoc` (New/Open/Save ciblés).
          methodeTab === "workflow"
          ? (workflowDoc as unknown as UseForgeDocument<unknown>)
          : (methodDoc as unknown as UseForgeDocument<unknown>)
        : nav === "kit"
          ? (kitDoc as unknown as UseForgeDocument<unknown>)
          : null;

  return (
    <ForgeCreateContext.Provider value={createApi}>
    <div className="forge">
      <div className="topbar">
        <span className="brand">
          iaka<span className="f">Frame</span>GUI
        </span>
        <nav className="nav" role="tablist" aria-label="Architecture du produit">
          {NAV.map((n, i) => (
            <span key={n.key} className="navwrap">
              {i > 0 && <span className="navsep" aria-hidden="true">·</span>}
              <button
                type="button"
                role="tab"
                aria-selected={nav === n.key}
                className={`navlink${nav === n.key ? " on" : ""}`}
                title={n.title}
                onClick={() => setNav(n.key)}
              >
                {n.label}
              </button>
            </span>
          ))}
        </nav>
        <span className="spacer" />
        <button
          type="button"
          className="topbar-new"
          aria-label="Nouvelle entité"
          // Unifié (correctif recette #1) : actif si l'entrée est un document OU un réservoir qui a
          // publié son geste ✚ ; honnêtement désactivé sur les entrées read-only (frame/assemblage/
          // models/apprentissage), qui n'enregistrent aucun geste.
          disabled={activeDoc === null && reservoirCreate === null}
          title={
            activeDoc
              ? "Créer une nouvelle entité du type courant"
              : reservoirCreate
                ? "Créer un nouvel élément dans ce réservoir"
                : "Aucune entité créable sur cette entrée"
          }
          onClick={() => (activeDoc ? activeDoc.requestNew() : reservoirCreate?.())}
        >
          <span className="np" aria-hidden="true">
            +
          </span>{" "}
          New
        </button>
        <span className="charte-pick">
          <CharteSelector />
        </span>
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

      {/* Entrées documentaires : gestes fichier + titre + pastille de mode (édition/création). */}
      {activeDoc !== null && (
        <>
          <DocBar doc={activeDoc} />
          <DocTitle
            name={activeDoc.name}
            dirty={activeDoc.dirty}
            onNameChange={activeDoc.canRename ? activeDoc.setName : undefined}
            disabled={activeDoc.artifact === null}
          />
          {activeDoc.artifact !== null && (
            <div className="doc-mode">
              {activeDoc.source === "library" ? (
                <span className="doc-mode-pill edit">✎ édition</span>
              ) : (
                <span className="doc-mode-pill create">✚ création</span>
              )}
            </div>
          )}
        </>
      )}

      {settingsOpen && (
        <div className="settings-panel">
          <SettingsRoot />
        </div>
      )}

      {/* ---- Surface de l'entrée courante ---- */}
      {nav === "team" ? (
        <div className="workbench">
          {team === null ? (
            <div className="edit">
              <p className="empty">Aucun artefact ouvert — New ou Open.</p>
            </div>
          ) : (
            <TeamAtelier team={team} onTeamChange={(t) => teamDoc.edit(t)} />
          )}
        </div>
      ) : nav === "methode" ? (
        <>
          <div className="methode-subtabs" role="tablist" aria-label="Surfaces de la méthode">
            <button
              type="button"
              role="tab"
              aria-selected={methodeTab === "discipline"}
              className={`methode-subtab${methodeTab === "discipline" ? " on" : ""}`}
              title="La discipline : principes, rituels, gardes-fous, rôles"
              onClick={() => setMethodeTab("discipline")}
            >
              Discipline
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={methodeTab === "workflow"}
              className={`methode-subtab${methodeTab === "workflow" ? " on" : ""}`}
              title="Le workflow : type (kind), phases & gates — élément de la méthode"
              onClick={() => setMethodeTab("workflow")}
            >
              Workflow
            </button>
          </div>
          <div className="workbench">
            {methodeTab === "workflow" ? (
              workflowArtifact === null ? (
                <div className="edit">
                  <p className="empty">Aucun workflow ouvert — New ou Open.</p>
                </div>
              ) : (
                <WorkflowAtelier
                  workflow={workflowArtifact}
                  onWorkflowChange={(w) => workflowDoc.edit(w)}
                />
              )
            ) : method === null ? (
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
            )}
          </div>
        </>
      ) : nav === "kit" ? (
        <div className="workbench">
          {kit === null ? (
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
      ) : nav === "assemblage" ? (
        <div className="nav-surface">
          <AssemblyView />
        </div>
      ) : nav === "persona" ? (
        <div className="nav-surface">
          <PersonaReservoir />
        </div>
      ) : nav === "frame" ? (
        <div className="settings-panel">
          <OpenFramePanel />
        </div>
      ) : nav === "elements" ? (
        <div className="nav-surface">
          <ElementsAuthoring />
        </div>
      ) : nav === "models" ? (
        <div className="nav-surface">
          <FramesGallery />
        </div>
      ) : nav === "apprentissage" ? (
        <LearningAtelier learning={learning} retrait={retrait} />
      ) : null}

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
    </ForgeCreateContext.Provider>
  );
}
