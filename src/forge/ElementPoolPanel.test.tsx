import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { ElementPoolPanel } from "./ElementPoolPanel";
import type { Backend } from "../api/backend";

const persona = (id: string, roleKey: string): string =>
  `---\nid: ${id}\nname: ${id}\nroleKey: ${roleKey}\n---\n# ${id}\n`;
const named = (id: string): string => `---\nid: ${id}\nlabel: ${id}\n---\n# ${id}\n`;

/** Backend simulé : loadFrame lit iakaframeHome + poolReadAll(type) + libraryList(collection). */
function fakeApi(): Backend {
  const pools: Record<string, string[]> = {
    personas: [persona("odin", "portefeuille"), persona("gimli", "dev")],
    principles: [named("mvp-first"), named("qualite")],
    rituals: [named("snapshot")],
    guardrails: [],
    roles: [],
    scaffolds: [],
    workflows: [],
    skills: [named("iakaframe-cadrage")],
  };
  return {
    iakaframeHome: async () => "/lib",
    poolReadAll: async (type: string) => pools[type] ?? [],
    libraryList: async () => [],
  } as unknown as Backend;
}

describe("ElementPoolPanel — rend visible le stock typé de l'élément (Volet A)", () => {
  it("Team : affiche le groupe Personas avec les ids du frame chargé", async () => {
    render(<ElementPoolPanel element="team" api={fakeApi()} />);
    const section = await screen.findByLabelText(/Pool d'éléments — sous-éléments de Team/);
    // Le groupe Personas et ses ids (odin, gimli) sont rendus.
    await waitFor(() => expect(within(section).getByText("odin")).toBeTruthy());
    expect(within(section).getByText("gimli")).toBeTruthy();
    // Team ← personas UNIQUEMENT : pas de section Principes.
    expect(within(section).queryByText("Principes")).toBeNull();
  });

  it("Méthode : affiche les 6 types de composition (Principes, Rituels…)", async () => {
    render(<ElementPoolPanel element="method" api={fakeApi()} />);
    const section = await screen.findByLabelText(/Pool d'éléments — sous-éléments de Méthode/);
    await waitFor(() => expect(within(section).getByText("Principes")).toBeTruthy());
    expect(within(section).getByText("mvp-first")).toBeTruthy();
    expect(within(section).getByText("qualite")).toBeTruthy();
    // La Méthode ne référence pas les personas.
    expect(within(section).queryByText("odin")).toBeNull();
  });
});
