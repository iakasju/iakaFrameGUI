/**
 * FeanorHead.propose.test.tsx — l'action **PROPOSER un élément** de Fëanor-en-tête (brique B,
 * `feanor-extensions-mvpb-streaming-web-live.md`). Prouve l'honnêteté du geste au niveau de l'en-tête :
 *   AC-B1  proposer → la proposition (champs) est ACHEMINÉE à l'hôte (`onProposal`), zéro réseau réel.
 *   AC-B2  RIEN n'est écrit à la proposition — `onProposal` pré-remplit, l'écriture reste « Enregistrer ».
 *   AC-B3  modèle absent → aveu honnête, `onProposal` JAMAIS appelé (aucune proposition fabriquée).
 *   AC-B6  activation explicite : aucun appel LLM au montage ; exactement un après le geste.
 *   non-régression : un pool SANS capability n'affiche AUCUNE action « proposer » (conseil seul).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { LlmTransport } from "@iakaframe/core";
import {
  FeanorHead,
  FEANOR_PROPOSAL_DONE,
  FEANOR_NO_PROPOSAL_PREFIX,
  type FeanorProposeCapability,
} from "./FeanorHead";
import { PERSONA_BLANK_ENTITY } from "./feanorHeadModel";
import { resolvePersonaProposition } from "./personaProposition";
import { fakeLlm } from "./llm/transport";
import type { Backend } from "../api/backend";
import feanorMd from "./__fixtures__/persona.feanor.md?raw";

/** Backend simulé (offline) : identité canon via `poolReadAll`, modèle optionnel. */
function api(personas: string[], model?: string): Backend {
  return {
    poolReadAll: async (type: string) => (type === "personas" ? personas : []),
    authoringModel: async () => model ?? null,
  } as unknown as Backend;
}

/** Capability de proposition branchée sur le vrai résolveur persona (avec transport injecté). */
function proposeCap(
  llm: LlmTransport,
  onProposal = vi.fn(),
): FeanorProposeCapability & { onProposal: ReturnType<typeof vi.fn> } {
  return {
    run: (prompt, ctx, deps) => resolvePersonaProposition(prompt, ctx, { ...deps, llm }),
    onProposal,
  };
}

describe("FeanorHead — action PROPOSER (brique B)", () => {
  it("AC-B1/B2 : proposer → proposition acheminée à onProposal (pré-remplissage), rien écrit ici", async () => {
    const live = '{"name":"Nain Forgeron","roleKey":"dev","skills":["iakaframe-cadrage"]}';
    const onProposal = vi.fn();
    render(
      <FeanorHead
        mode="create"
        entity={PERSONA_BLANK_ENTITY}
        api={api([feanorMd], "ollama:llama3")}
        llm={fakeLlm(live)}
        model="ollama:llama3"
        propose={proposeCap(fakeLlm(live), onProposal)}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), {
      target: { value: "propose un dev" },
    });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    // La proposition (champs validés) est acheminée à l'hôte — le seul « effet » du geste.
    await waitFor(() => expect(onProposal).toHaveBeenCalledTimes(1));
    expect(onProposal).toHaveBeenCalledWith({
      name: "Nain Forgeron",
      roleKey: "dev",
      skills: ["iakaframe-cadrage"],
    });
    // Confirmation honnête : l'éditeur est pré-rempli, RIEN n'est encore écrit.
    expect(screen.getByText(FEANOR_PROPOSAL_DONE)).toBeTruthy();
  });

  it("AC-B3 : modèle absent → aveu honnête, onProposal JAMAIS appelé (aucune proposition fabriquée)", async () => {
    const onProposal = vi.fn();
    const spy = vi.fn(async () => '{"name":"x"}');
    render(
      <FeanorHead
        mode="create"
        entity={PERSONA_BLANK_ENTITY}
        api={api([feanorMd])}
        llm={{ complete: spy } as unknown as LlmTransport}
        model=""
        propose={proposeCap({ complete: spy } as unknown as LlmTransport, onProposal)}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "aide" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    await waitFor(() =>
      expect(screen.getByText(new RegExp(FEANOR_NO_PROPOSAL_PREFIX))).toBeTruthy(),
    );
    expect(onProposal).not.toHaveBeenCalled();
    // Aucun appel réseau tenté sans modèle (zéro réseau réel, transport espionné).
    expect(spy).not.toHaveBeenCalled();
  });

  it("AC-B3 : réseau KO → aveu honnête, onProposal JAMAIS appelé, aucune stack affichée", async () => {
    const onProposal = vi.fn();
    render(
      <FeanorHead
        mode="create"
        entity={PERSONA_BLANK_ENTITY}
        api={api([feanorMd], "ollama:llama3")}
        llm={fakeLlm(new Error("ECONNREFUSED stacktrace…"))}
        model="ollama:llama3"
        propose={proposeCap(fakeLlm(new Error("ECONNREFUSED stacktrace…")), onProposal)}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "x" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    await waitFor(() =>
      expect(screen.getByText(new RegExp(FEANOR_NO_PROPOSAL_PREFIX))).toBeTruthy(),
    );
    expect(onProposal).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("stacktrace");
  });

  it("AC-B6 : aucun appel LLM au montage ; exactement UN après le geste de proposition", async () => {
    const complete = vi.fn(async () => '{"name":"N"}');
    const transport = { complete } as unknown as LlmTransport;
    render(
      <FeanorHead
        mode="create"
        entity={PERSONA_BLANK_ENTITY}
        api={api([feanorMd], "ollama:llama3")}
        llm={transport}
        model="ollama:llama3"
        propose={proposeCap(transport)}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText("Proposer un élément")).toBeTruthy());
    expect(complete).toHaveBeenCalledTimes(0); // rien au montage (activation explicite)

    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "propose" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1)); // exactement un par geste
  });

  it("non-régression : SANS capability propose, aucune action « proposer » (les 6 autres pools)", () => {
    render(<FeanorHead mode="create" entity={PERSONA_BLANK_ENTITY} />);
    expect(screen.queryByLabelText("Proposer un élément")).toBeNull();
    // Le conseil (bouton d'envoi) reste, lui, présent — MVP-A intact.
    expect(screen.getByLabelText(/Envoyer à Fëanor/)).toBeTruthy();
  });
});
