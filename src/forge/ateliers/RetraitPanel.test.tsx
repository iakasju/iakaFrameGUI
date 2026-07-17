/**
 * RetraitPanel + useForgeRetrait — surface « Retrait symétrique +/− » (S6,
 * symetrie-ajout-suppression.md). Vérifie que la GUI est un PILOTE des verbes CLI de retrait :
 *   - VUE Option 1 : les skills du persona rendus depuis `skills:[]`, chaque titre portant un `−` ;
 *   - `detach`/`attach` pilotent les verbes CLI et rafraîchissent la vue (skills après mutation) ;
 *   - `remove` refusé RESTRICT restitue la liste des référents et n'agit pas ;
 *   - la cascade exige un geste humain EXPLICITE (arm → confirmer, équivalent `--cascade --yes`) ;
 *   - retrait réussi non destructif : le chemin de corbeille est restitué ;
 *   - dégradation propre hors Tauri (aucune I/O).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RetraitPanel } from "./RetraitPanel";
import { useForgeRetrait, type RetraitApi } from "../../hooks/useForgeRetrait";
import type { LibraryEntry } from "../../api/backend";

const PERSONAS: LibraryEntry[] = [
  { type: "personas", id: "gandalf", label: "Gandalf", path: "/l/personas/gandalf.md" },
];
const SKILLS: LibraryEntry[] = [
  { type: "skills", id: "iakaframe-cadrage", label: "Cadrage", path: "/l/skills/iakaframe-cadrage" },
  { type: "skills", id: "iakaframe-learning", label: "Learning", path: "/l/skills/iakaframe-learning" },
];
const TEAMS: LibraryEntry[] = [{ type: "teams", id: "t1", label: "Team 1", path: "/teams/t1.md" }];

function makeApi(overrides: Partial<RetraitApi> = {}): RetraitApi {
  return {
    isTauri: () => true,
    libraryScan: vi.fn(async (type: string) => {
      if (type === "personas") return PERSONAS;
      if (type === "skills") return SKILLS;
      if (type === "teams") return TEAMS;
      return [];
    }),
    personaSkills: vi.fn(async () => ["iakaframe-cadrage"]),
    attachSkill: vi.fn(async (skillId: string, personaId: string) => ({
      ok: true,
      mode: "attach" as const,
      skillId,
      personaId,
      changed: true,
      skills: ["iakaframe-cadrage", skillId],
    })),
    detachSkill: vi.fn(async (skillId: string, personaId: string) => ({
      ok: true,
      mode: "detach" as const,
      skillId,
      personaId,
      changed: true,
      skills: [],
    })),
    removeArtifact: vi.fn(async (kind: string, id: string) => ({
      ok: true,
      kind,
      id,
      trash: "/l/.trash-2026-07-17_10-00-00",
      trashed: [{ type: kind, id, rel: `${kind}/${id}` }],
      manifest: "/l/.trash-2026-07-17_10-00-00/manifest.json",
    })),
    ...overrides,
  };
}

function Harness({ api }: { api: RetraitApi }) {
  const retrait = useForgeRetrait(api);
  return <RetraitPanel retrait={retrait} />;
}

async function selectPersona() {
  fireEvent.change(await screen.findByRole("combobox", { name: "Persona" }), {
    target: { value: "gandalf" },
  });
}

describe("RetraitPanel — surface de retrait symétrique +/− (S6, pilote CLI)", () => {
  it("dégradation propre hors Tauri : message lisible, aucune I/O de retrait", async () => {
    const api = makeApi({ isTauri: () => false });
    render(<Harness api={api} />);
    expect(await screen.findByText(/Hors contexte forge/)).toBeTruthy();
    expect(api.libraryScan).not.toHaveBeenCalled();
  });

  it("VUE Option 1 : les skills du persona sont rendus depuis skills:[] avec un `−` par titre", async () => {
    render(<Harness api={makeApi()} />);
    await selectPersona();
    // Le « titre du skill » est une projection du frontmatter (jamais une section du corps).
    expect(await screen.findByText("iakaframe-cadrage")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Détacher iakaframe-cadrage" })).toBeTruthy();
  });

  it("Détacher pilote `detach` et rafraîchit la vue (skills:[] après mutation)", async () => {
    const api = makeApi();
    render(<Harness api={api} />);
    await selectPersona();
    fireEvent.click(await screen.findByRole("button", { name: "Détacher iakaframe-cadrage" }));
    await waitFor(() => expect(api.detachSkill).toHaveBeenCalledWith("iakaframe-cadrage", "gandalf"));
    expect(await screen.findByText(/détaché · gandalf/)).toBeTruthy();
    // La vue reflète le skills:[] renvoyé par la CLI (vide) — plus de bouton détacher.
    expect(screen.getByText(/Aucun skill attaché/)).toBeTruthy();
  });

  it("Attacher pilote `attach` (le `+` symétrique)", async () => {
    const api = makeApi();
    render(<Harness api={api} />);
    await selectPersona();
    await screen.findByText("iakaframe-cadrage");
    fireEvent.change(screen.getByRole("combobox", { name: "Skill à attacher" }), {
      target: { value: "iakaframe-learning" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Attacher" }));
    await waitFor(() => expect(api.attachSkill).toHaveBeenCalledWith("iakaframe-learning", "gandalf"));
    expect(await screen.findByText(/attaché · gandalf/)).toBeTruthy();
  });

  it("Remove refusé RESTRICT : restitue la liste des référents et n'agit pas en cascade", async () => {
    const api = makeApi({
      removeArtifact: vi.fn(async (kind: string, id: string, cascade?: boolean) => {
        if (!cascade) {
          return {
            ok: false,
            reason: "restrict",
            kind,
            id,
            referrers: [{ type: "bindings", id: "b1", field: "team" }],
          };
        }
        return { ok: true, kind, id, trash: "/l/.trash-x" };
      }),
    });
    render(<Harness api={api} />);
    fireEvent.change(await screen.findByRole("combobox", { name: "Artefact à retirer" }), {
      target: { value: "t1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    await waitFor(() => expect(api.removeArtifact).toHaveBeenCalledWith("team", "t1", false));
    // La liste des référents est surfacée, la cascade n'est PAS déclenchée automatiquement.
    expect(await screen.findByText(/Refus \(RESTRICT\)/)).toBeTruthy();
    expect(screen.getByText(/b1/)).toBeTruthy();
    expect(api.removeArtifact).not.toHaveBeenCalledWith("team", "t1", true);
  });

  it("Cascade : geste humain EXPLICITE requis (arm → confirmer) avant `--cascade --yes`", async () => {
    const api = makeApi({
      removeArtifact: vi.fn(async (kind: string, id: string, cascade?: boolean) => {
        if (!cascade) {
          return { ok: false, reason: "restrict", kind, id, referrers: [{ type: "bindings", id: "b1", field: "team" }] };
        }
        return { ok: true, kind, id, trash: "/l/.trash-x", trashed: [] };
      }),
    });
    render(<Harness api={api} />);
    fireEvent.change(await screen.findByRole("combobox", { name: "Artefact à retirer" }), {
      target: { value: "t1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    // 1er geste : armer la cascade (aucun appel cascade encore).
    fireEvent.click(await screen.findByRole("button", { name: /Retirer en cascade/ }));
    expect(api.removeArtifact).not.toHaveBeenCalledWith("team", "t1", true);
    // 2e geste explicite : confirmer → appel `--cascade --yes`.
    fireEvent.click(await screen.findByRole("button", { name: "Confirmer la cascade" }));
    await waitFor(() => expect(api.removeArtifact).toHaveBeenCalledWith("team", "t1", true));
  });

  it("Remove réussi : non destructif — le chemin de corbeille est restitué", async () => {
    render(<Harness api={makeApi()} />);
    fireEvent.change(await screen.findByRole("combobox", { name: "Artefact à retirer" }), {
      target: { value: "t1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(await screen.findByText(/archivé dans \/l\/\.trash-/)).toBeTruthy();
  });

  it("Skill référencé (RESTRICT) : oriente vers le détach, sans bouton cascade", async () => {
    const api = makeApi({
      removeArtifact: vi.fn(async (kind: string, id: string) => ({
        ok: false,
        reason: "restrict",
        kind,
        id,
        referrers: [{ type: "personas", id: "gandalf", field: "skills" }],
      })),
    });
    render(<Harness api={api} />);
    fireEvent.change(await screen.findByRole("combobox", { name: "Type d'artefact à retirer" }), {
      target: { value: "skill" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Artefact à retirer" }), {
      target: { value: "iakaframe-cadrage" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(await screen.findByText(/détache-le d'abord/)).toBeTruthy();
    // Pour un skill référencé, pas de cascade proposée (on oriente vers detach).
    expect(screen.queryByRole("button", { name: /Retirer en cascade/ })).toBeNull();
  });
});
