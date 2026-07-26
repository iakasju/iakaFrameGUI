/**
 * personaPropose.integration.test.tsx — la brique B **de bout en bout par l'hôte** (`ElementReservoir`
 * + `personaKind` pilote). Prouve le geste complet SANS réseau : Fëanor propose → l'hôte re-seede
 * l'éditeur (remontage `key`, FORK D-a) → l'utilisateur relit → « Enregistrer » écrit par le chemin
 * EXISTANT (`persistPersona` → `poolWrite`), byte-préservant.
 *
 *   AC-B1  la proposition PRÉ-REMPLIT l'éditeur (champ visible après le geste).
 *   AC-B2  RIEN n'est écrit tant que « Enregistrer » n'est pas cliqué (persist non appelé à la proposition).
 *   AC-B4  round-trip byte-préservant : la proposition acceptée passe par `persistPersona` inchangé
 *          (édition = `patchFrontmatter` → description/corps/clés inconnues préservés à l'octet).
 *   C-1    id verrouillé en édition (jamais renommé par la proposition) ; en création, id dérivé.
 *
 * La proposition est ici DÉTERMINISTE (stub `proposeElement` qui ignore le transport) — zéro réseau
 * réel. Le résolveur honnête lui-même (live/repli) est prouvé par `personaProposition.test.ts` et
 * `FeanorHead.propose.test.tsx`.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { parseFrontmatter, parsePersona, type Persona } from "@iakaframe/core";
import { ElementReservoir } from "./ElementReservoir";
import { personaKind } from "./personaKind";
import { persistPersona } from "./personaPersist";
import type { ElementKind } from "./elementKind";
import type { Backend } from "../api/backend";

// `.md` persona réaliste avec `description` non modélisée (load-bearing) + corps — pour la préservation.
const GIMLI_MD =
  "---\n" +
  "id: gimli\n" +
  "name: Gimli\n" +
  "description: Blurb load-bearing de déclenchement du sous-agent — NE DOIT PAS être jeté.\n" +
  "mission: Implémente l'instruction validée.\n" +
  "roleKey: dev\n" +
  "royaume: IAKAFRAME\n" +
  'pastille: "🔴"\n' +
  "skills: [iakaframe-fabrication]\n" +
  "guardrails: [identity, perimeter]\n" +
  "vignette: none\n" +
  "---\n\n# ⚒️ Gimli\n\n> le forgeron\n";

const gimli = parsePersona(parseFrontmatter(GIMLI_MD).data)!;

/** Un `personaKind` dont la proposition est DÉTERMINISTE (zéro transport) — le reste inchangé. */
function stubKind(proposition: Partial<Persona>): ElementKind<Persona> {
  return {
    ...personaKind,
    proposeElement: async () => ({ proposition, source: "live" as const }),
  };
}

describe("brique B — intégration hôte (proposer → pré-remplir → Enregistrer)", () => {
  it("AC-B1/B2/B4/C-1 ÉDITION : la proposition pré-remplit, rien écrit avant save, round-trip byte + id verrouillé", async () => {
    let written: { id: string; text: string } | null = null;
    const api = {
      poolRead: async (poolType: string, id: string) =>
        poolType === "personas" && id === "gimli" ? GIMLI_MD : null,
      poolWrite: async (_poolType: string, id: string, text: string) => {
        written = { id, text };
      },
    } as unknown as Backend;
    const persist = vi.fn((p: Persona) => persistPersona(p, api));

    // La proposition ne porte QUE des champs éditables (jamais id/roleIndex, C-1).
    render(
      <ElementReservoir
        kind={stubKind({ royaume: "NAINS", mission: "Forge la brique B" })}
        loadElements={async () => [gimli]}
        persist={persist}
      />,
    );

    // Grille chargée → ouvrir la fiche de Gimli (édition).
    await waitFor(() => expect(screen.getByLabelText("Ouvrir la fiche de Gimli")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gimli"));
    expect(screen.getByText("✎ édition")).toBeTruthy();
    // Avant proposition : le royaume d'origine.
    expect(screen.getByDisplayValue("IAKAFRAME")).toBeTruthy();

    // Geste : proposer → l'hôte re-seede l'éditeur (remontage key).
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "renforce" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    // AC-B1 : l'éditeur est PRÉ-REMPLI par la proposition (royaume NAINS, mission proposée).
    await waitFor(() => expect(screen.getByDisplayValue("NAINS")).toBeTruthy());
    expect(screen.getByDisplayValue("Forge la brique B")).toBeTruthy();
    // AC-B2 : RIEN n'a été écrit à la proposition (le chemin de save n'est pas emprunté).
    expect(persist).not.toHaveBeenCalled();

    // Acceptation explicite : « Enregistrer ».
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    // AC-B4/C-1 : écrit via persistPersona → id verrouillé, champ proposé changé, reste préservé À L'OCTET.
    expect(written).not.toBeNull();
    const w = written!;
    expect(w.id).toBe("gimli"); // C-1 : jamais renommé
    const after = parseFrontmatter(w.text).data;
    expect(after.royaume).toBe("NAINS"); // champ proposé & accepté
    expect(after.mission).toBe("Forge la brique B");
    expect(after.description).toBe(
      "Blurb load-bearing de déclenchement du sous-agent — NE DOIT PAS être jeté.",
    );
    expect(after.vignette).toBe("none");
    expect(w.text).toContain("# ⚒️ Gimli");
    expect(w.text).toContain("> le forgeron");
  });

  it("C-1 ÉDITION : une proposition ne renomme JAMAIS l'id, même si le champ id était présent en amont", async () => {
    // Le stub renvoie une proposition SANS id (le parseur du pool l'écarte en amont, C-1). L'hôte
    // fusionne sur l'élément réel → l'id de Gimli est structurellement préservé.
    let writtenId: string | null = null;
    const api = {
      poolRead: async () => GIMLI_MD,
      poolWrite: async (_t: string, id: string) => {
        writtenId = id;
      },
    } as unknown as Backend;

    render(
      <ElementReservoir
        kind={stubKind({ name: "Nom Tout Neuf" })}
        loadElements={async () => [gimli]}
        persist={(p: Persona) => persistPersona(p, api)}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText("Ouvrir la fiche de Gimli")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gimli"));
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "renomme" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));
    await waitFor(() => expect(screen.getByDisplayValue("Nom Tout Neuf")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(writtenId).toBe("gimli")); // id inchangé malgré le nouveau nom
  });

  it("AC-B1/B2 CRÉATION : proposition pré-remplit l'éditeur vierge ; création écrite au save, id dérivé", async () => {
    let written: { id: string; text: string } | null = null;
    const api = {
      poolRead: async () => null, // fichier absent → création
      poolWrite: async (_t: string, id: string, text: string) => {
        written = { id, text };
      },
    } as unknown as Backend;
    const persist = vi.fn((p: Persona) => persistPersona(p, api));

    render(
      <ElementReservoir
        kind={stubKind({ name: "Samwise Neuf", roleKey: "dev" })}
        loadElements={async () => [gimli]}
        persist={persist}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText("Ouvrir la fiche de Gimli")).toBeTruthy());
    // New → création vierge.
    fireEvent.click(screen.getByRole("button", { name: /Nouvelle persona/ }));
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "propose" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    // Pré-remplissage du nom proposé, aucune écriture à la proposition.
    await waitFor(() => expect(screen.getByDisplayValue("Samwise Neuf")).toBeTruthy());
    expect(persist).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    // Création : id dérivé du nom (jamais proposé), roleIndex non persisté (canonique).
    expect(written).not.toBeNull();
    expect(written!.id).toBe("samwise-neuf");
    expect(written!.text).toContain("id: samwise-neuf");
    expect(written!.text).not.toContain("roleIndex");
  });
});
