/**
 * MethodeAtelier — l'atelier **Méthode** (la discipline) de la forge (E2b).
 *
 * Rail à 6 catégories (Workflow · Principes · Rituels · Scaffold · Gardes · Rôles). Le `+` d'un
 * sous-élément du stock **insère RÉELLEMENT** son id dans la méthode éditée (`useForgeMethod`,
 * état local — **persistance différée**). Les **Principes** (`CATALOG_PRINCIPLES`) sont rendus en
 * MD `{ nom · politique · déclencheur }`. À droite : copilote (coquille) + triptyque MD dépliable
 * 2/3 + **diagramme de flux** 1/3 (phases → gates). **Aucun agent nommé** (Méthode ≠ Team).
 */
import {
  CATALOG_GUARDRAILS,
  CATALOG_PRINCIPLES,
  CATALOG_RITUALS,
  CATALOG_SCAFFOLDS,
  CANONICAL_ROLES,
  principlesForMethod,
  resolveWorkflow,
  roleLabel,
  unresolvedRefsForMethod,
  type Gate,
  type Method,
  type Phase,
  type Workflow,
} from "@iakaframe/core";
import type { MethodRef } from "../useForgeMethod";
import type { LibraryEntry } from "../useForgeDocument";
import { RailNote, RailSection, StockItem } from "../Rail";
import { UploadChip } from "../Vignette";
import { CopiloteShell, RunnerFrontier } from "../CopiloteShell";
import type { CopiloteContext, MaterializeOp, MaterializeTarget } from "../mock/copilote";
import { Foldable, MdPane, PrincipleMeta, type FoldNode } from "../FoldableMd";
import { FlowDiagram } from "../ContextGraph";

/** Texte lisible d'une gate. */
function gateText(g: Gate): string {
  const kind = g.kind === "human" ? "humaine" : "auto";
  return g.condition.length > 0 ? `${kind} — ${g.condition}` : kind;
}

/** Cible de matérialisation du copilote → composant référençable de la Méthode (`insert`). */
const TARGET_TO_REF: Partial<Record<MaterializeTarget, MethodRef>> = {
  "method-principle": "principleIds",
  "method-ritual": "ritualIds",
  "method-guardrail": "guardrailIds",
  "method-scaffold": "scaffoldIds",
  "method-role": "roleKeys",
};

export function MethodeAtelier({
  method,
  insert,
  workflow: resolvedWorkflow,
  workflowOptions = [],
  onWorkflowIdChange,
}: {
  method: Method;
  insert: (ref: MethodRef, id: string) => void;
  /**
   * P6b : workflow **résolu** (référence `method.workflowId` → collection `workflows/`, sinon
   * canonique) pour l'affichage (rail read-only + diagramme). Absent → repli catalogue/canonique.
   */
  workflow?: Workflow;
  /** Workflows de la collection pour le sélecteur de référence (`workflowId`). */
  workflowOptions?: LibraryEntry[];
  /** Pose/retire la référence `method.workflowId` (undefined = canonique par défaut). */
  onWorkflowIdChange?: (id: string | undefined) => void;
}) {
  const workflow = resolvedWorkflow ?? resolveWorkflow(method);
  const mainPhases = [...workflow.phases]
    .filter((p) => p.offChain !== true)
    .sort((a, b) => a.order - b.order);

  // Nœuds MD : phases (→ gate imbriquée) puis principes (→ politique/déclencheur).
  const phaseNodes: FoldNode[] = mainPhases.map((p: Phase, i) => ({
    kind: "phase",
    title: p.name.replace(/^P\d+ — /, ""),
    role: p.description,
    open: i === 0,
    body: <p>{p.description}. Portée : {p.roleKeys.map(roleLabel).join(" + ")}.</p>,
    // Nœud « GATE » enfant OMIS quand la phase n'en porte pas : le rail ne montre pas
    // un franchissement là où la méthode n'en demande aucun.
    children:
      p.gate === undefined
        ? []
        : [
            {
              kind: "gate",
              title: `gate-${p.gate.kind === "human" ? "humaine" : "auto"}`,
              role: gateText(p.gate),
              body: (
                <p>
                  Condition de franchissement : <b>{gateText(p.gate)}</b>.
                </p>
              ),
            },
          ],
  }));

  // Contexte du copilote : les ids déjà présents (pour le diff avant→après).
  const copiloteContext: CopiloteContext = {
    surface: "methode",
    diffFile: "methode.md",
    present: {
      "method-principle": method.principleIds,
      "method-ritual": method.ritualIds,
      "method-guardrail": method.guardrailIds,
      "method-scaffold": method.scaffoldIds,
      "method-role": method.roleKeys,
    },
  };

  /**
   * Valider une proposition → matérialisation RÉELLE via le même `insert` que le `+` du rail.
   *
   * L'insertion est **idempotente**. Elle n'est en revanche PAS une garantie de résolution : un id
   * que le catalogue du cœur ne connaît pas est inséré dans la méthode puis **silencieusement
   * écarté par les résolveurs** — il n'apparaîtra nulle part dans le MD. Cette perte n'est pas une
   * propriété rassurante : c'est le défaut D-7, désormais **rendu visible** par le bandeau de
   * références non résolues en tête de rail (`unresolvedRefsForMethod`).
   */
  function applyProposition(ops: MaterializeOp[]): void {
    for (const op of ops) {
      const ref = TARGET_TO_REF[op.target];
      if (ref) insert(ref, op.id);
    }
  }

  /**
   * D-7 — références déclarées par la méthode que **le catalogue du cœur** ne résout pas. Elles
   * sont perdues à l'affichage depuis toujours ; la seule chose qui change est qu'on le sait.
   * Liste vide → **aucun nœud rendu** (pas de bandeau « tout va bien » : un bandeau permanent
   * cesse d'être lu, et c'est un bandeau non lu qui a produit ce défaut).
   */
  const unresolvedRefs = unresolvedRefsForMethod(method);

  const principleNodes: FoldNode[] = principlesForMethod(method).map((pr, i) => ({
    kind: "principe",
    title: pr.label,
    role: pr.trigger,
    open: i === 0,
    body: <PrincipleMeta policy={pr.policy} trigger={pr.trigger} />,
  }));

  return (
    <>
      <aside className="rail">
        <div className="railhead">Stock — atelier Méthode · la discipline</div>

        {unresolvedRefs.length > 0 && (
          <RailNote>
            <div
              className="unresolved"
              role="status"
              aria-label="Références non résolues par le catalogue du cœur"
            >
              <b>
                {unresolvedRefs.length} référence{unresolvedRefs.length > 1 ? "s" : ""} non
                résolue{unresolvedRefs.length > 1 ? "s" : ""} par le catalogue du cœur
              </b>
              <span className="sd">
                Ces références sont <b>légitimes</b> : c'est la forge qui ne sait pas encore les
                résoudre. Elles n'apparaissent pas dans le MD ci-contre. Rien n'est bloqué —
                l'édition et l'enregistrement restent possibles.
              </span>
              <ul>
                {unresolvedRefs.map((r, i) => (
                  <li key={`${r.field}-${r.id}-${i}`}>
                    <code>{r.field}</code> · <code>{r.id}</code>
                  </li>
                ))}
              </ul>
            </div>
          </RailNote>
        )}

        <RailSection title="Workflow" count="phases + gates" defaultOpen>
          <div className="sub wfref">
            <label className="sn" style={{ display: "block" }}>
              Workflow référencé
              <select
                aria-label="Workflow référencé par la méthode"
                value={method.workflowId ?? ""}
                disabled={onWorkflowIdChange === undefined}
                onChange={(e) => onWorkflowIdChange?.(e.target.value || undefined)}
              >
                <option value="">canonique (par défaut)</option>
                {workflowOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.id})
                  </option>
                ))}
              </select>
              <span className="sd">
                référence (pas d'édition inline) — éditez le workflow dans l'onglet Workflow
              </span>
            </label>
          </div>
          {mainPhases.map((p) => (
            <div className="sub" key={`phase-${p.id}`}>
              <span className="tagg phase">PHASE</span>
              <span className="sn">
                {p.name.replace(/^P\d+ — /, "")}
                <span className="sd">{p.description}</span>
              </span>
            </div>
          ))}
          {mainPhases
            .filter((p) => p.gate !== undefined)
            .map((p) => (
              <div className="sub" key={`gate-${p.id}`}>
                <span className="tagg gate">GATE</span>
                <span className="sn">
                  gate-{p.gate!.kind === "human" ? "humaine" : "auto"}
                  <span className="sd">{gateText(p.gate!)}</span>
                </span>
              </div>
            ))}
        </RailSection>

        <RailSection title="Principes" count={CATALOG_PRINCIPLES.length} defaultOpen>
          {CATALOG_PRINCIPLES.map((pr) => (
            <StockItem
              key={pr.id}
              tag="prin"
              tagLabel="PRIN"
              name={pr.label}
              desc={pr.policy}
              addTitle="Assembler dans la Méthode"
              onAdd={() => insert("principleIds", pr.id)}
            />
          ))}
        </RailSection>

        <RailNote>
          Les <b>Principes</b> sont un catalogue de règles nommées{" "}
          <code>{"{ nom · politique · déclencheur }"}</code> ; chaque <code>+</code> assemble un
          principe dans la méthode.
        </RailNote>

        <RailSection title="Rituels / gestes" count={CATALOG_RITUALS.length}>
          {CATALOG_RITUALS.map((r) => (
            <StockItem
              key={r.id}
              tag="rit"
              tagLabel="RIT"
              name={r.id}
              desc={`${r.label} · ${r.side}`}
              addTitle="Assembler dans la Méthode"
              onAdd={() => insert("ritualIds", r.id)}
            />
          ))}
        </RailSection>

        <RailSection title="Scaffold" count={CATALOG_SCAFFOLDS.length}>
          {CATALOG_SCAFFOLDS.map((s) => (
            <StockItem
              key={s.id}
              tag="scaf"
              tagLabel="SCAF"
              name={`${s.id}/`}
              desc={s.level === "portfolio" ? "racine + backlog transverse" : "specs/ · CLAUDE.md · docker/"}
              addTitle="Assembler dans la Méthode"
              onAdd={() => insert("scaffoldIds", s.id)}
            />
          ))}
        </RailSection>

        <RailSection title="Gardes-fous" count={CATALOG_GUARDRAILS.length}>
          {CATALOG_GUARDRAILS.map((g) => (
            <StockItem
              key={g.id}
              tag="guard"
              tagLabel="GARD"
              name={g.id}
              desc={g.label}
              addTitle="Assembler dans la Méthode"
              onAdd={() => insert("guardrailIds", g.id)}
            />
          ))}
        </RailSection>

        <RailSection title="Référentiel de rôles" count={CANONICAL_ROLES.length}>
          {CANONICAL_ROLES.map((r) => (
            <StockItem
              key={r.key}
              tag="role"
              tagLabel="RÔLE"
              name={r.key}
              desc={r.label}
              addTitle="Assembler dans la Méthode"
              onAdd={() => insert("roleKeys", r.key)}
            />
          ))}
        </RailSection>
      </aside>

      <main className="edit">
        <div className="edithead">
          <span className="icon">M</span>
          <div>
            <div className="nm">Méthode {method.name} — en édition</div>
            <div className="meta">
              workflow {mainPhases.length} phases + {method.principleIds.length} principes ·{" "}
              <code>{method.id}/methode/methode.md</code>
            </div>
          </div>
          <UploadChip label="⬆ pictogramme méthode — glisser-déposer" />
        </div>

        <CopiloteShell
          subject="assiste la discipline de la méthode"
          context={copiloteContext}
          onApply={applyProposition}
          placeholder="Décrivez une règle de discipline… ex. « un principe : version mineure ⇒ rapport qualité complet »"
        />

        <RunnerFrontier rib="Méthode ≠ Team">
          La Méthode ne nomme aucun agent : elle décrit la <b>discipline</b> (workflow + principes
          + rituels + gardes). Le <b>casting</b> vit dans l'onglet Team ; leur <b>réunion + Binding</b>{" "}
          dans l'onglet Kit.
        </RunnerFrontier>

        <div className="triptych">
          <MdPane
            kind="methode.md"
            filename="methode/methode.md"
            cols="workflow + principes"
            frontmatter={[
              `methodId: ${method.id}`,
              `phases: [${mainPhases.map((p) => p.id).join(", ")}]`,
              `principes: [${method.principleIds.join(", ")}]`,
              `rituels: [${method.ritualIds.join(", ")}]`,
              `roles: [${method.roleKeys.join(", ")}]`,
            ].join("\n")}
            nodes={[]}
          >
            <h3>Workflow — la discipline</h3>
            <p>
              Réflexion/cadrage → <b>instruction écrite</b> (jamais de code) → validation →
              réalisation → test → boucle. Dépliez chaque phase :
            </p>
            {phaseNodes.map((n, i) => (
              <Foldable key={`ph-${i}`} node={n} />
            ))}
            <h3>Principes — catalogue assemblable</h3>
            <p>
              Règles nommées <code>{"{ nom · politique · déclencheur }"}</code>, chacune insérée
              depuis le rail. Dépliez :
            </p>
            {principleNodes.map((n, i) => (
              <Foldable key={`pr-${i}`} node={n} />
            ))}
          </MdPane>

          <FlowDiagram workflow={workflow} />
        </div>
      </main>
    </>
  );
}
