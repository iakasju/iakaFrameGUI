/**
 * KitAtelier — l'atelier **Kit** (assemblage TOTAL par défaut) de la forge (E2b §9.6).
 *
 * Rail à 3 briques : **Méthode · Team · Binding**. Le `+` assemble une brique dans le kit
 * (`useState` local — **persistance différée**). À droite : copilote (coquille) + triptyque MD
 * (kit.json + 3 briques dépliables 2/3) + **aperçu de l'assemblage complet livré** 1/3
 * (`generateClaudeCodeKit`). Enfin la **carte Binding SÉPARÉE** (« défaut suggéré — override au
 * Cockpit ») : c'est le **seul** endroit où apparaît le runner d'EXÉCUTION (persona → runner),
 * distinct du runner d'authoring de la console. La livraison « → Cockpit » est portée par la barre.
 */
import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  generateClaudeCodeKit,
  roleLabel,
  RUNNER_KINDS,
  type Kit,
  type Method,
  type RunnerKind,
  type Team,
} from "@iakaframe/core";
import { RailNote, RailSection, StockItem } from "../Rail";
import { Vignette, UploadChip } from "../Vignette";
import { initialsOf } from "../casting";
import { CopiloteShell } from "../CopiloteShell";
import type { CopiloteContext, MaterializeOp } from "../mock/copilote";
import { MdPane, type FoldNode } from "../FoldableMd";
import { FilePreview } from "../ContextGraph";

/** Cartes de binding proposées (défaut suggéré) — libellés d'affichage, non persistés. */
const BINDING_PRESETS = [
  { id: "defaut-suggere", label: "défaut-suggéré", desc: "claude-code · override au Cockpit" },
  { id: "local-first", label: "local-first", desc: "ollama pour les rôles non critiques" },
];

/** Briques dépliables du MD du kit (Méthode · Team · Binding). */
function kitNodes(method: Method, team: Team): FoldNode[] {
  return [
    {
      kind: "brique",
      title: "Méthode",
      role: `${method.id} · discipline`,
      open: true,
      body: (
        <p>
          Workflow + {method.principleIds.length} principes + {method.ritualIds.length} rituels +
          gardes. Se déploie en <code>CLAUDE.md</code> et gestes.
        </p>
      ),
    },
    {
      kind: "brique",
      title: "Team",
      role: `${team.personas.length} personas`,
      body: (
        <p>
          Casting pur, method-agnostic. Se déploie en <code>.claude/agents/*.md</code> + skills +
          hooks.
        </p>
      ),
    },
    {
      kind: "brique",
      title: "Binding",
      role: "défaut suggéré",
      body: (
        <p>
          Carte <b>séparée</b> persona → runner + modèle. Marquée « défaut suggéré » : le Cockpit
          l'override à l'exécution.
        </p>
      ),
    },
  ];
}

export function KitAtelier({
  method,
  team,
  kit,
  onKitChange,
}: {
  method: Method;
  team: Team;
  /** Kit persisté (piloté par `useForgeDocument` de l'onglet). */
  kit: Kit;
  /** Remonte toute édition du kit au document (dirty tracking + persistance). */
  onKitChange: Dispatch<SetStateAction<Kit>>;
}) {
  const setKit = onKitChange;
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [binding, setBinding] = useState<Record<string, RunnerKind>>({});

  // Arbre complet de l'assemblage livré (pur) — aperçu de 3ᵉ colonne à l'échelle du kit.
  const tree = useMemo(() => generateClaudeCodeKit(team, { method }), [team, method]);

  // Contexte du copilote : le binding STRUCTUREL déjà choisi (jamais le runner d'EXÉCUTION §8).
  const copiloteContext: CopiloteContext = {
    surface: "kit",
    diffFile: "kit.json",
    present: {
      "kit-binding": kit.runnerBindingId ? [kit.runnerBindingId] : [],
    },
  };

  /**
   * Valider une proposition → matérialisation RÉELLE via le même `setKit` que le `+` du rail.
   * ⚠️ Le copilote ne touche QUE le binding STRUCTUREL (défaut suggéré) ; il n'assigne JAMAIS de
   * runner d'EXÉCUTION par persona (`binding` local, réglé au Cockpit) — frontière §8 gravée.
   */
  function applyProposition(ops: MaterializeOp[]): void {
    for (const op of ops) {
      if (op.target === "kit-binding") setKit((k) => ({ ...k, runnerBindingId: op.id }));
    }
  }

  return (
    <>
      <aside className="rail">
        <div className="railhead">Stock — atelier Kit · assemblage total</div>

        <RailSection title="Méthode" count={1} defaultOpen>
          <StockItem
            tag="meth"
            tagLabel="MÉTH"
            name={method.id}
            desc={`${method.principleIds.length} principes`}
            addTitle="Assembler dans le Kit"
            onAdd={() => setKit((k) => ({ ...k, methodId: method.id }))}
          />
        </RailSection>

        <RailSection title="Team" count={1} defaultOpen>
          <StockItem
            tag="team"
            tagLabel="TEAM"
            name={team.id}
            desc={`${team.personas.length} personas`}
            addTitle="Assembler dans le Kit"
            onAdd={() => setKit((k) => ({ ...k, teamId: team.id }))}
          />
        </RailSection>

        <RailSection title="Binding" count="persona → runner" defaultOpen>
          {BINDING_PRESETS.map((b) => (
            <StockItem
              key={b.id}
              tag="bind"
              tagLabel="BIND"
              name={b.label}
              desc={b.desc}
              addTitle="Assembler dans le Kit"
              onAdd={() => setKit((k) => ({ ...k, runnerBindingId: b.id }))}
            />
          ))}
        </RailSection>

        <RailNote>
          Assemblage <b>total par défaut</b> : Méthode + Team + Binding. Le <b>Binding</b> reste une
          carte séparée — <b>défaut suggéré</b>, l'exécution réelle s'override au Cockpit.
        </RailNote>
      </aside>

      <main className="edit">
        <div className="edithead">
          <span className="icon gold">K</span>
          <div>
            <div className="nm">Kit {method.id} — assemblage en édition</div>
            <div className="meta">
              Méthode + Team + Binding · <code>kit/kit.json</code>
            </div>
          </div>
          <UploadChip label="⬆ vignette kit — glisser-déposer" />
        </div>

        <CopiloteShell
          subject="assiste l'assemblage du kit"
          context={copiloteContext}
          onApply={applyProposition}
          placeholder="Décrivez l'assemblage… ex. « prépare une carte de binding défaut suggéré pour le Cockpit »"
        />

        <div className="triptych">
          <MdPane
            kind="kit.json"
            filename="kit/kit.json"
            cols="assemblage total"
            frontmatter={[
              `kitId: ${kit.id}`,
              `methode: ${kit.methodId}`,
              `team: ${kit.teamId}`,
              `binding: ${kit.runnerBindingId ?? "défaut-suggéré (override Cockpit)"}`,
              `target: ${kit.node} (.claude/ + CLAUDE.md)`,
            ].join("\n")}
            nodes={kitNodes(method, team)}
          >
            <p>
              L'onglet Kit <b>réunit</b> les deux artefacts fabriqués séparément et y adjoint le{" "}
              <b>Binding</b>. Dépliez les briques de l'assemblage :
            </p>
          </MdPane>

          <FilePreview
            tree={tree}
            selectedPath={previewPath}
            onSelectPath={setPreviewPath}
            title="Aperçu de l'assemblage livré"
            badge="arbre complet du kit"
            targetPath="kit/ → cible Cockpit"
            caption={
              <>
                Onglet Kit → <b>aperçu à l'échelle de l'assemblage</b> : l'arbre complet du kit livré
                (<code>.claude/agents/*</code>, hooks, <code>CLAUDE.md</code>) tel qu'il atterrira au
                Cockpit.
              </>
            }
          />
        </div>

        {/* Carte Binding séparée — runner d'EXÉCUTION (2ᵉ sélecteur, distinct de l'authoring). */}
        <div className="bindcard">
          <div className="bh">
            <span className="rib">Binding</span>
            <span className="tt">Carte d'exécution — défaut suggéré</span>
            <span className="exec">runner d'exécution · override au Cockpit</span>
          </div>
          <div className="bsub">
            Distinct du runner d'authoring (barre noire, build-time). Ici : quel runner + modèle{" "}
            <b>proposés</b> par persona à l'exécution — le Cockpit tranche.
          </div>
          <div className="bindtbl">
            {team.personas.map((p) => (
              <div className="bindrow" key={p.id}>
                <span className="who">
                  <Vignette label={initialsOf(p.name)} roleIndex={p.roleIndex} size="sm" />
                  <span>
                    <span className="nm">{p.name}</span>{" "}
                    <span className="rl">{roleLabel(p.roleKey)}</span>
                  </span>
                </span>
                <span className="arw">→</span>
                <select
                  aria-label={`Runner d'exécution de ${p.name}`}
                  value={binding[p.id] ?? RUNNER_KINDS[0]}
                  onChange={(e) =>
                    setBinding((prev) => ({ ...prev, [p.id]: e.target.value as RunnerKind }))
                  }
                >
                  {RUNNER_KINDS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
