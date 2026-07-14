/**
 * TeamAtelier — l'atelier **Team** (casting PUR) de la forge (E2b).
 *
 * Rail-stock à gauche : **Personas** (clic = édition) · **Stock de skills** · **Stock de hooks/
 * gardes** — le `+` **insère RÉELLEMENT** la skill/garde dans la persona éditée (état persisté via
 * `useForgeTeams.upsertPersona`, en s'appuyant sur `CATALOG_SKILLS`/`CATALOG_GUARDRAILS` du cœur).
 * À droite : vignette + copilote (coquille) + frontière runner + triptyque (MD dépliable 2/3 +
 * aperçu du fichier généré 1/3, via `generateClaudeCodeKit`). **Zéro runner/modèle** ici (Team pure).
 */
import { useMemo, useState } from "react";
import {
  CATALOG_GUARDRAILS,
  CATALOG_SKILLS,
  generateClaudeCodeKit,
  personaBadge,
  roleLabel,
  type Persona,
  type Team,
} from "@iakaframe/core";
import type { UseForgeTeams } from "../../hooks/useForgeTeams";
import { RailElement, RailNote, RailSection, StockItem } from "../Rail";
import { Vignette, UploadChip } from "../Vignette";
import { initialsOf } from "../casting";
import { CopiloteShell, RunnerFrontier } from "../CopiloteShell";
import { MdPane, type FoldNode } from "../FoldableMd";
import { FilePreview } from "../ContextGraph";

/** Nœuds dépliables du MD d'une persona : skills (→ garde imbriquée) + gardes. */
function personaNodes(persona: Persona): FoldNode[] {
  const skillNodes: FoldNode[] = persona.skills.map((sid, i) => {
    const known = CATALOG_SKILLS.find((s) => s.id === sid);
    return {
      kind: "skill",
      title: sid,
      role: known ? known.label : "skill hors catalogue",
      open: i === 0,
      body: (
        <p>
          Le « comment » outillé du rôle{" "}
          <b>{known ? roleLabel(known.roleKey) : "—"}</b>. Rendu en{" "}
          <code>.claude/skills/{sid}/SKILL.md</code> (corps riche <i>différé</i>).
        </p>
      ),
    };
  });
  const guardNodes: FoldNode[] = persona.guardrails.map((gid) => {
    const g = CATALOG_GUARDRAILS.find((x) => x.id === gid);
    const hook = g?.rendering.hook;
    return {
      kind: "garde",
      title: gid,
      role: g ? g.label : "garde hors catalogue",
      body: (
        <p>
          Contrainte exécutée qui fait respecter la discipline.
          {hook && (
            <>
              {" "}
              Câblage <code>{hook.event}</code>
              {hook.matcher ? ` · ${hook.matcher}` : ""} → <code>{hook.script}</code>.
            </>
          )}
        </p>
      ),
    };
  });
  return [...skillNodes, ...guardNodes];
}

export function TeamAtelier({ forge, team }: { forge: UseForgeTeams; team: Team }) {
  const [currentId, setCurrentId] = useState<string>(
    () => team.coordinator || team.personas[0]?.id || "",
  );
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const persona =
    team.personas.find((p) => p.id === currentId) ?? team.personas[0] ?? null;

  // Arbre généré (pur) reflétant la team courante — aperçu de 3ᵉ colonne.
  const tree = useMemo(() => generateClaudeCodeKit(team), [team]);
  const personaFile = persona ? `.claude/agents/${persona.id}.md` : null;

  /** Insère une skill dans la persona éditée (persisté). */
  function addSkill(skillId: string) {
    if (!persona || persona.skills.includes(skillId)) return;
    void forge.upsertPersona(team.id, {
      ...persona,
      skills: [...persona.skills, skillId],
    });
  }

  /** Insère une garde (par id de garde canonique) dans la persona éditée (persisté). */
  function addGuardrail(guardId: string) {
    if (!persona || persona.guardrails.includes(guardId)) return;
    void forge.upsertPersona(team.id, {
      ...persona,
      guardrails: [...persona.guardrails, guardId],
    });
  }

  return (
    <>
      <aside className="rail">
        <div className="railhead">Stock — atelier Team · casting pur</div>

        <RailSection title="Personas" count={team.personas.length} defaultOpen>
          {team.personas.length === 0 && (
            <p className="empty">Aucune persona.</p>
          )}
          {team.personas.map((p) => (
            <RailElement
              key={p.id}
              name={p.name}
              role={roleLabel(p.roleKey)}
              roleIndex={p.roleIndex}
              selected={p.id === persona?.id}
              onSelect={() => setCurrentId(p.id)}
            />
          ))}
        </RailSection>

        <RailNote>
          {team.personas.length} personas · <b>aucun runner, aucun modèle ici</b> (Team pure).
          Le <code>+</code> insère un skill/hook dans la persona éditée.
        </RailNote>

        <RailSection title="Stock de skills" count={CATALOG_SKILLS.length} defaultOpen>
          {CATALOG_SKILLS.map((s) => (
            <StockItem
              key={s.id}
              tag="skill"
              tagLabel="SKILL"
              name={s.id}
              desc={s.label}
              addTitle={persona ? `Insérer dans ${persona.name}` : "Sélectionnez une persona"}
              disabled={!persona}
              onAdd={() => addSkill(s.id)}
            />
          ))}
        </RailSection>

        <RailSection title="Stock de hooks / gardes" count={CATALOG_GUARDRAILS.length} defaultOpen>
          {CATALOG_GUARDRAILS.map((g) => (
            <StockItem
              key={g.id}
              tag="hook"
              tagLabel="HOOK"
              name={g.id}
              desc={
                g.rendering.hook
                  ? `${g.rendering.hook.event}${g.rendering.hook.matcher ? " · " + g.rendering.hook.matcher : ""}`
                  : g.label
              }
              addTitle={persona ? `Insérer dans ${persona.name}` : "Sélectionnez une persona"}
              disabled={!persona}
              onAdd={() => addGuardrail(g.id)}
            />
          ))}
        </RailSection>
      </aside>

      <main className="edit">
        {persona ? (
          <>
            <div className="edithead">
              <Vignette label={initialsOf(persona.name)} roleIndex={persona.roleIndex} size="lg" />
              <div>
                <div className="nm">{persona.name} — persona en édition</div>
                <div className="meta">
                  {roleLabel(persona.roleKey)} · roleIndex {persona.roleIndex} ·{" "}
                  <code>{team.id}/team/{persona.id}.md</code>
                </div>
              </div>
              <UploadChip label="⬆ vignette persona — glisser-déposer" />
            </div>

            <CopiloteShell subject={`assiste la conception de ${persona.name}`} />

            <RunnerFrontier rib="Team PURE">
              Aucun runner ni modèle dans la Team (method-agnostic). Le choix d'exécution — le{" "}
              <b>Binding</b> — est « défaut suggéré, override au Cockpit » et se règle dans l'onglet{" "}
              <b>Kit</b>, distinct du runner d'authoring de la barre noire.
            </RunnerFrontier>

            <div className="triptych">
              <MdPane
                kind="persona.md"
                filename={`${persona.id}.md`}
                cols="lecture · déplier en cascade"
                frontmatter={[
                  `roleKey: ${persona.roleKey}`,
                  `royaume: ${persona.royaume}`,
                  `roleIndex: ${persona.roleIndex}`,
                  `skills: [${persona.skills.join(", ")}]`,
                  `guardrails: [${persona.guardrails.join(", ")}]`,
                ].join("\n")}
                nodes={personaNodes(persona)}
              >
                <p>
                  <b>{persona.name}</b> incarne le rôle « {roleLabel(persona.roleKey)} ». Pastille{" "}
                  <code>{personaBadge(persona)}</code>. <b>Aucun workflow ici</b> — la discipline
                  vit dans l'onglet Méthode.
                </p>
                <p>Contrats imbriqués — dépliez en cascade :</p>
              </MdPane>

              <FilePreview
                tree={tree}
                selectedPath={previewPath ?? personaFile}
                onSelectPath={setPreviewPath}
                title="Aperçu du fichier généré"
                badge={`rendu de ${persona.id}.md`}
                targetPath={`kit/${personaFile ?? ""}`}
                caption={
                  <>
                    Onglet Team → <b>aperçu du fichier généré</b> : l'arbre + le début de{" "}
                    <code>{persona.id}.md</code> tel qu'il atterrira au disque. Reflète le MD
                    courant.
                  </>
                }
              />
            </div>
          </>
        ) : (
          <p className="empty">Team sans persona — ajoutez-en une pour l'éditer.</p>
        )}
      </main>
    </>
  );
}
