/**
 * CopiloteIdentite.test.tsx — le copilote **est Fëanor** dans l'interface.
 *
 * Couvre les AC de `specs/instructions/feanor-copilote-du-gui.md` :
 *   AC-3  fiche absente → message de repli explicite, **aucune identité fabriquée**.
 *   AC-4  **aucun appel LLM au montage** (invariant d'activation explicite, I-2).
 *   AC-5  badge d'**ouverture** avant la proposition, **clôture** après le bloc.
 *   AC-6  mock et live portent la **même** identité (le badge ne dépend pas de la source).
 */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
import { CopiloteShell, IDENTITY_MISSING_HINT } from "./CopiloteShell";
import type { Backend } from "../api/backend";
import type { CopiloteContext } from "./mock/copilote";
import type { LlmTransport } from "@iakaframe/core";
import feanorMd from "./__fixtures__/persona.feanor.md?raw";

const context: CopiloteContext = { surface: "methode", diffFile: "methode.md", present: {} };

/**
 * Backend simulé **MINIMAL** : seul `poolReadAll` est exposé.
 *
 * C'est délibéré — il tient lieu de garde. `CopiloteShell` appelait naguère `api.authoringModel()`
 * sans `?.`, ce qui levait SYNCHRONEMENT sur un backend partiel et faisait planter le montage. Si
 * quelqu'un retire la garde optionnelle, ces tests rougissent immédiatement.
 */
function api(personas: string[]): Backend {
  return {
    poolReadAll: async (type: string) => (type === "personas" ? personas : []),
  } as unknown as Backend;
}

/** Transport LLM espionné : compte les appels réellement émis. */
function spyLlm(): { transport: LlmTransport; calls: () => number } {
  const complete = vi.fn(async () => "{}");
  return {
    transport: { complete } as unknown as LlmTransport,
    calls: () => complete.mock.calls.length,
  };
}

function shell(container: HTMLElement): HTMLElement {
  return container.querySelector(".copilote") as HTMLElement;
}

describe("copilote identifié — Fëanor (décision décideur)", () => {
  it("AC-5 : l'en-tête porte le badge d'ouverture quand la fiche est là", async () => {
    const { container } = render(
      <CopiloteShell subject="test" context={context} onApply={() => {}} api={api([feanorMd])} />,
    );
    await waitFor(() =>
      expect(within(shell(container)).getByText(/🟠 \[FRAME\]\[Fëanor\]/)).toBeTruthy(),
    );
  });

  it("AC-3 : sans fiche, le repli est DIT et aucune identité n'est fabriquée", async () => {
    const { container } = render(
      <CopiloteShell subject="test" context={context} onApply={() => {}} api={api([])} />,
    );
    await waitFor(() =>
      expect(within(shell(container)).getByText(IDENTITY_MISSING_HINT)).toBeTruthy(),
    );
    expect(shell(container).textContent).not.toContain("Fëanor");
    expect(shell(container).textContent).not.toContain("🟠");
  });

  it("AC-4 : AUCUN appel LLM au montage (activation explicite, I-2)", async () => {
    const { transport, calls } = spyLlm();
    const { container } = render(
      <CopiloteShell
        subject="test"
        context={context}
        onApply={() => {}}
        api={api([feanorMd])}
        llm={transport}
        model="ollama:llama3"
      />,
    );
    // On laisse les effets de montage s'exécuter (identité, endpoint, modèle).
    await waitFor(() => expect(shell(container)).toBeTruthy());
    expect(calls()).toBe(0);
  });

  it("AC-4 : le clic de proposition, LUI, déclenche l'appel — le geste EST la demande", async () => {
    const { transport, calls } = spyLlm();
    const { container } = render(
      <CopiloteShell
        subject="test"
        context={context}
        onApply={() => {}}
        api={api([feanorMd])}
        llm={transport}
        model="ollama:llama3"
      />,
    );
    const zone = shell(container);
    const textarea = within(zone).getByLabelText(/Prompt copilote/);
    fireEvent.change(textarea, { target: { value: "ajoute la qualité" } });
    const bouton = within(zone).getAllByRole("button").find((b) => /Proposer/i.test(b.textContent ?? ""));
    if (bouton) fireEvent.click(bouton);
    await waitFor(() => expect(calls()).toBe(1));
  });

  it("AC-5/AC-6 : la proposition MOCK porte ouverture ET clôture (identité indépendante de la source)", async () => {
    const { container } = render(
      // Sans `model` : le résolveur retombe sur le mock déterministe, sans réseau.
      <CopiloteShell subject="test" context={context} onApply={() => {}} api={api([feanorMd])} />,
    );
    const zone = shell(container);
    await waitFor(() => expect(within(zone).getByText(/🟠 \[FRAME\]\[Fëanor\]/)).toBeTruthy());

    const textarea = within(zone).getByLabelText(/Prompt copilote/);
    fireEvent.change(textarea, { target: { value: "ajoute la qualité" } });
    const bouton = within(zone).getAllByRole("button").find((b) => /Proposer/i.test(b.textContent ?? ""));
    if (bouton) fireEvent.click(bouton);

    // Clôture : pastille APRÈS le bloc — la position porte le sens.
    await waitFor(() =>
      expect(within(zone).getByLabelText("Clôture du copilote").textContent).toBe(
        "[FRAME][Fëanor] 🟠",
      ),
    );
  });
});

describe("robustesse du montage — backend partiel (hors Tauri)", () => {
  it("un backend SANS `authoringModel` ni `authoringEndpoint` ne fait pas planter le montage", async () => {
    const nu = { poolReadAll: async () => [] } as unknown as Backend;
    const { container } = render(
      <CopiloteShell subject="test" context={context} onApply={() => {}} api={nu} />,
    );
    // Le composant se monte et rend sa console : aucune exception au montage.
    await waitFor(() => expect(shell(container)).toBeTruthy());
    expect(within(shell(container)).getByText(IDENTITY_MISSING_HINT)).toBeTruthy();
  });
});
