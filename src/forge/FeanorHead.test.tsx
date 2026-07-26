/**
 * FeanorHead.test.tsx — Fëanor-en-tête, **branché** sur le LLM (chantier
 * `feanor-en-tete-fonctionnel-llm.md`, MVP-A : conseil/chat).
 *
 * Couvre les AC du chantier :
 *   AC-1  Fëanor répond réellement (live via `fakeLlm`) : badge ouverture AVANT, clôture APRÈS.
 *   AC-2  Honnêteté / repli : réseau KO / réponse illisible → aveu clair, **jamais** de fausse réponse.
 *   AC-3  Activation explicite : AUCUN `llm.complete` au montage ; exactement un après le geste.
 *   AC-4  Identité dérivée du canon (golden fixture), jamais fabriquée.
 *   AC-8  Modèle absent → signalé honnêtement (aucune réponse d'IA fabriquée).
 * Conserve la fidélité de la coquille (vignettes entité + Fëanor, modes création/édition).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { parsePersona, type LlmTransport, type Persona } from "@iakaframe/core";
import { FeanorHead, FEANOR_READY_HINT, FEANOR_NO_REPLY_PREFIX } from "./FeanorHead";
import { NO_AUTHORING_MODEL_HINT } from "./mock/copilote";
import { fakeLlm } from "./llm/transport";
import type { Backend } from "../api/backend";
import feanorMd from "./__fixtures__/persona.feanor.md?raw";

const gandalf: Persona = parsePersona({
  id: "gandalf",
  name: "Gandalf",
  roleKey: "cadrage",
  royaume: "IAKAFRAME",
  pastille: "🔵",
  roleIndex: 2,
})!;

const feanorReal: Persona = parsePersona({
  id: "feanor",
  name: "Fëanor",
  roleKey: "frame",
  royaume: "FRAME",
  pastille: "🟠",
  roleIndex: 8,
  skills: ["iakaframe-frame"],
})!;

/** Backend simulé : `poolReadAll` sert l'identité canon ; `authoringModel`/`authoringEndpoint` optionnels. */
function api(personas: string[], model?: string): Backend {
  return {
    poolReadAll: async (type: string) => (type === "personas" ? personas : []),
    authoringModel: async () => model ?? null,
  } as unknown as Backend;
}

/** Transport LLM espionné : compte les appels réellement émis (AC-3). */
function spyLlm(reply = '{"reply":"ok"}'): { transport: LlmTransport; calls: () => number } {
  const complete = vi.fn(async () => reply);
  return {
    transport: { complete } as unknown as LlmTransport,
    calls: () => complete.mock.calls.length,
  };
}

describe("FeanorHead — fidélité de l'en-tête (vignettes, modes)", () => {
  it("mode ÉDITION : monte l'entité éditée + la vignette Fëanor (badge FË, flamme)", () => {
    render(<FeanorHead mode="edit" entity={gandalf} feanorSource={[feanorReal, gandalf]} />);
    const head = document.querySelector(".feanor-head") as HTMLElement;
    expect(head).not.toBeNull();
    expect(head.querySelector(".fh-vg")?.textContent).toBe("GA");
    expect(screen.getByText(/Gandalf/)).toBeTruthy();
    expect(screen.getByText(/persona · en édition/)).toBeTruthy();
    expect(head.querySelector(".fh-badge")?.textContent).toBe("FË");
    expect(screen.getByText(/Fëanor édite cet élément/)).toBeTruthy();
    expect(screen.getByText("🔥 édition")).toBeTruthy();
  });

  it("mode CRÉATION : même composant, placeholder honnête + « façonne » (✚)", () => {
    render(<FeanorHead mode="create" entity={null} feanorSource={[feanorReal]} />);
    const head = document.querySelector(".feanor-head") as HTMLElement;
    expect(head).not.toBeNull();
    expect(head.querySelector(".fh-vg")?.textContent).toBe("＋");
    expect(screen.getByText("Nouvelle persona")).toBeTruthy();
    expect(screen.getByText(/persona · en création/)).toBeTruthy();
    expect(screen.getByText(/Fëanor façonne cet élément/)).toBeTruthy();
    expect(screen.getByText("🔥 création")).toBeTruthy();
  });

  it("la vignette Fëanor dérive du persona réel (pastille 🟠 quand déclarée)", () => {
    render(<FeanorHead mode="edit" entity={gandalf} feanorSource={[feanorReal]} />);
    expect(screen.getByText(/🟠 Fëanor édite cet élément/)).toBeTruthy();
  });
});

describe("FeanorHead — branché sur le LLM (MVP-A, conseil)", () => {
  it("AC-1 : envoi → réponse LIVE du modèle, badge d'ouverture AVANT et clôture APRÈS", async () => {
    const live = '{"reply":"Raccourcis la mission à une phrase active."}';
    render(
      <FeanorHead
        mode="edit"
        entity={gandalf}
        feanorSource={[feanorReal]}
        api={api([feanorMd])}
        llm={fakeLlm(live)}
        model="ollama:llama3"
      />,
    );
    // Identité chargée → l'en-tête est prêt (pas de « pas de modèle »).
    await waitFor(() => expect(screen.queryByText(NO_AUTHORING_MODEL_HINT)).toBeNull());

    const textarea = screen.getByLabelText(/Demander à Fëanor/);
    fireEvent.change(textarea, { target: { value: "raccourcis la mission" } });
    fireEvent.click(screen.getByLabelText(/Envoyer à Fëanor/));

    // La réponse RÉELLE du modèle s'affiche dans l'en-tête.
    await waitFor(() =>
      expect(screen.getByText(/Raccourcis la mission à une phrase active\./)).toBeTruthy(),
    );
    // Badge d'ouverture (pastille AVANT) et clôture (pastille APRÈS) posés par l'UI.
    expect(screen.getByLabelText("Ouverture de Fëanor").textContent).toBe("🟠 [FRAME][Fëanor]");
    expect(screen.getByLabelText("Clôture de Fëanor").textContent).toContain("[FRAME][Fëanor] 🟠");
    expect(document.querySelector(".fh-answer")?.getAttribute("data-source")).toBe("live");
  });

  it("AC-2 : réseau KO (transport rejette) → aveu honnête, AUCUNE fausse réponse ni stack", async () => {
    render(
      <FeanorHead
        mode="edit"
        entity={gandalf}
        feanorSource={[feanorReal]}
        api={api([feanorMd])}
        llm={fakeLlm(new Error("ECONNREFUSED stacktrace…"))}
        model="ollama:llama3"
      />,
    );
    const textarea = screen.getByLabelText(/Demander à Fëanor/);
    fireEvent.change(textarea, { target: { value: "conseille" } });
    fireEvent.click(screen.getByLabelText(/Envoyer à Fëanor/));

    await waitFor(() =>
      expect(screen.getByText(new RegExp(FEANOR_NO_REPLY_PREFIX))).toBeTruthy(),
    );
    // Jamais la stack du transport, jamais de zone de réponse fabriquée.
    expect(document.body.textContent).not.toContain("stacktrace");
    expect(document.querySelector(".fh-reply")).toBeNull();
    expect(document.querySelector(".fh-answer")).toBeNull();
  });

  it("AC-2 : réponse illisible (pas du JSON {reply}) → aveu « illisible », pas de fausse réponse", async () => {
    render(
      <FeanorHead
        mode="edit"
        entity={gandalf}
        feanorSource={[feanorReal]}
        api={api([feanorMd])}
        llm={fakeLlm("ceci n'est pas du json")}
        model="ollama:llama3"
      />,
    );
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "x" } });
    fireEvent.click(screen.getByLabelText(/Envoyer à Fëanor/));
    await waitFor(() =>
      expect(screen.getByText(new RegExp(FEANOR_NO_REPLY_PREFIX))).toBeTruthy(),
    );
    expect(screen.getByText(/illisible/)).toBeTruthy();
    expect(document.querySelector(".fh-reply")).toBeNull();
  });

  it("AC-8 : modèle absent → signalé honnêtement, l'envoi ne fabrique AUCUNE réponse d'IA", async () => {
    const { transport, calls } = spyLlm();
    render(
      <FeanorHead
        mode="edit"
        entity={gandalf}
        feanorSource={[feanorReal]}
        api={api([feanorMd])}
        llm={transport}
        model=""
      />,
    );
    // L'absence de modèle est signalée au repos (jamais masquée).
    expect(screen.getAllByText(NO_AUTHORING_MODEL_HINT).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "aide" } });
    fireEvent.click(screen.getByLabelText(/Envoyer à Fëanor/));
    await waitFor(() =>
      expect(screen.getByText(new RegExp(FEANOR_NO_REPLY_PREFIX))).toBeTruthy(),
    );
    // Aucune fausse réponse, et aucun appel réseau tenté sans modèle.
    expect(document.querySelector(".fh-reply")).toBeNull();
    expect(calls()).toBe(0);
  });

  it("AC-3 : AUCUN appel LLM au montage ; exactement UN après le geste (activation explicite)", async () => {
    const { transport, calls } = spyLlm();
    render(
      <FeanorHead
        mode="edit"
        entity={gandalf}
        feanorSource={[feanorReal]}
        api={api([feanorMd])}
        llm={transport}
        model="ollama:llama3"
      />,
    );
    // Les effets de montage (identité, modèle, endpoint) s'exécutent sans jamais appeler le LLM.
    await waitFor(() => expect(screen.getByText(FEANOR_READY_HINT)).toBeTruthy());
    expect(calls()).toBe(0);

    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "conseille" } });
    fireEvent.click(screen.getByLabelText(/Envoyer à Fëanor/));
    await waitFor(() => expect(calls()).toBe(1));
  });

  it("AC-4 : fiche introuvable → réponse SANS badge d'identité (jamais une identité fabriquée)", async () => {
    render(
      <FeanorHead
        mode="edit"
        entity={gandalf}
        feanorSource={[feanorReal]}
        api={api([])}
        llm={fakeLlm('{"reply":"conseil anonyme"}')}
        model="ollama:llama3"
      />,
    );
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "x" } });
    fireEvent.click(screen.getByLabelText(/Envoyer à Fëanor/));
    await waitFor(() => expect(screen.getByText(/conseil anonyme/)).toBeTruthy());
    // La réponse existe mais aucun badge « [FRAME][Fëanor] » n'est fabriqué sans fiche canon.
    expect(screen.queryByLabelText("Ouverture de Fëanor")).toBeNull();
    expect(document.querySelector(".fh-answer")?.textContent).not.toContain("[FRAME][Fëanor]");
  });
});
