import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent, within, waitFor } from "@testing-library/react";
import { MethodeAtelier } from "./ateliers/MethodeAtelier";
import { useForgeMethod } from "./useForgeMethod";
import { CopiloteShell, COPILOTE_NO_PROPOSAL_PREFIX } from "./CopiloteShell";
import { fakeLlm } from "./llm/transport";
import { MOCK_DEMO_LABEL } from "./llm/resolve";
import { NO_AUTHORING_MODEL_HINT } from "./mock/copilote";
import { backend, type Backend } from "../api/backend";
import type { CopiloteContext } from "./mock/copilote";

/**
 * Harnais : le VRAI état d'authoring de méthode (insertion réelle) branché sur l'atelier — la
 * boucle copilote matérialise donc via le **même chemin** que le `+` du rail (`useForgeMethod`).
 *
 * ⚠️ **Honnêteté par défaut (option C).** Modèle vide ⇒ le copilote **avoue** (aucune proposition).
 * Pour prouver le **chemin d'insertion réel** (H-4) hors Tauri, on active le **mode démo opt-in** en
 * stubbant `backend.authoringModel → "mock"` : la proposition démo passe par le MÊME `propose()`
 * (mêmes ops) → même matérialisation réelle. Restauré après chaque test (pas de fuite de singleton).
 */
function MethodeHarness() {
  const { method, insert } = useForgeMethod();
  return (
    <div className="forge">
      <div className="workbench">
        <MethodeAtelier method={method} insert={insert} />
      </div>
    </div>
  );
}

/** Le nœud `.copilote` (console d'authoring), distinct du `.mdpane` (contrat MD lu). */
function copilote(container: HTMLElement): HTMLElement {
  return container.querySelector(".copilote") as HTMLElement;
}
function mdpane(container: HTMLElement): HTMLElement {
  return container.querySelector(".mdpane") as HTMLElement;
}

/** JSON live valide (ops sur un id RÉEL du réservoir méthode) — prouve le chemin live sans réseau. */
const liveRaw = JSON.stringify({
  intro: "Le modèle propose un principe qualité.",
  artefacts: [{ icon: "prin", tag: "PRIN", title: "Qualité", detail: "gate qualité" }],
  ops: [{ target: "method-principle", id: "qualite", label: "Qualité (live)" }],
});

describe("CopiloteShell — honnête par défaut : démo opt-in, aveu, live (option C)", () => {
  // Mode démo opt-in via le réglage partagé, pour les tests END-TO-END du chemin d'insertion réel.
  let origAuthoringModel: typeof backend.authoringModel;
  beforeEach(() => {
    origAuthoringModel = backend.authoringModel;
    backend.authoringModel = async () => "mock";
  });
  afterEach(() => {
    backend.authoringModel = origAuthoringModel;
  });

  it("DÉMO opt-in : Proposer affiche une PROPOSITION étiquetée (bandeau + artefacts + diff + Valider/Rejeter)", async () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    // Coquille au repos : pas de proposition, bouton Proposer désactivé (prompt vide).
    expect(c.querySelector(".conv")).toBeNull();
    const send = within(c).getByRole("button", { name: /Proposer/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    // Le mode démo (`authoringModel = "mock"`) est lu de façon asynchrone : attendre son chargement.
    await waitFor(() =>
      expect(within(c).getByLabelText(/Modèle d'authoring configuré/).textContent).toContain("mock"),
    );

    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    await waitFor(() => expect(c.querySelector(".conv")).not.toBeNull());
    expect(c.querySelector(".cdiff")).not.toBeNull();
    expect(within(c).getByRole("button", { name: /Valider/ })).toBeTruthy();
    expect(within(c).getByRole("button", { name: /Rejeter/ })).toBeTruthy();
    // H-2 : la proposition démo est TOUJOURS étiquetée (bandeau visible).
    const banner = c.querySelector(".mock-demo-banner");
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(MOCK_DEMO_LABEL);
  });

  it("VALIDER (démo) matérialise réellement : l'artefact apparaît dans le MD de la méthode", async () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    // `log-conversation` n'est pas dans le starter → absent du MD au départ.
    expect(mdpane(container).textContent).not.toContain("log-conversation");
    await waitFor(() =>
      expect(within(c).getByLabelText(/Modèle d'authoring configuré/).textContent).toContain("mock"),
    );

    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    fireEvent.click(await within(c).findByRole("button", { name: /Valider/ }));

    // Après validation : le rituel est RÉELLEMENT inséré → visible dans le contrat MD lu (H-4 intact).
    expect(mdpane(container).textContent).toContain("log-conversation");
    expect(container.querySelector(".copilote .conv")).toBeNull();
    expect(copilote(container).textContent).toContain("Matérialisé");
  });

  it("REJETER (démo) ne change RIEN : aucune écriture dans le MD", async () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    await waitFor(() =>
      expect(within(c).getByLabelText(/Modèle d'authoring configuré/).textContent).toContain("mock"),
    );
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    fireEvent.click(await within(c).findByRole("button", { name: /Rejeter/ }));

    expect(copilote(container).querySelector(".conv")).toBeNull();
    expect(mdpane(container).textContent).not.toContain("log-conversation");
    expect(copilote(container).textContent).toContain("rejetée");
  });

  it("FRONTIÈRE : le sélecteur de runner est un DÉCOR legacy (ne prétend plus « mocké par défaut »)", () => {
    const { container } = render(<MethodeHarness />);
    const select = within(copilote(container)).getByLabelText(/Runner d'authoring/) as HTMLSelectElement;
    // Le sélecteur est décoratif/legacy — il ne pilote pas l'inférence, et ne ment plus sur « mock ».
    const opts = Array.from(select.options).map((o) => o.value);
    expect(opts.every((o) => o.includes("décoratif"))).toBe(true);
    expect(copilote(container).textContent).toContain("décoratif");
    expect(copilote(container).textContent).not.toContain("LLM mocké");
  });
});

describe("CopiloteShell — aveu honnête et démo étiquetée (rendu direct, modèle injecté)", () => {
  const context: CopiloteContext = { surface: "methode", diffFile: "methode.md", present: {} };

  it("AVEU : modèle vide → le copilote AVOUE (préfixe + raison), SANS Valider ni diff", async () => {
    const { container } = render(
      <div className="forge">
        <CopiloteShell subject="test" context={context} onApply={() => {}} model="" />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rapport qualité" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));

    // Aveu rendu : préfixe + raison (absence de modèle) ; aucune proposition fabriquée.
    await waitFor(() => expect(c.querySelector(".copilote-aveu")).not.toBeNull());
    const aveu = c.querySelector(".copilote-aveu") as HTMLElement;
    expect(aveu.textContent).toContain(COPILOTE_NO_PROPOSAL_PREFIX);
    expect(aveu.textContent).toContain(NO_AUTHORING_MODEL_HINT);
    // Ni bulle de proposition, ni diff, ni bouton Valider.
    expect(c.querySelector(".conv")).toBeNull();
    expect(c.querySelector(".cdiff")).toBeNull();
    expect(within(c).queryByRole("button", { name: /Valider/ })).toBeNull();
  });

  it("AVEU : provider non supporté (litellm, sans réseau) → aveu, jamais une proposition mockée", async () => {
    const { container } = render(
      <div className="forge">
        <CopiloteShell
          subject="test"
          context={context}
          onApply={() => {}}
          model="litellm:gpt-4o"
          llm={fakeLlm(liveRaw)}
        />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rapport qualité" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));

    await waitFor(() => expect(c.querySelector(".copilote-aveu")).not.toBeNull());
    expect(c.querySelector(".conv")).toBeNull();
  });

  it("DÉMO : `authoringModel = mock` → proposition ÉTIQUETÉE (bandeau MOCK_DEMO_LABEL + who explicite)", async () => {
    const { container } = render(
      <div className="forge">
        <CopiloteShell subject="test" context={context} onApply={() => {}} model="mock" />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rapport qualité" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));

    await waitFor(() => expect(c.querySelector(".mock-demo-banner")).not.toBeNull());
    expect((c.querySelector(".mock-demo-banner") as HTMLElement).textContent).toContain(MOCK_DEMO_LABEL);
    // La ligne `who` porte aussi l'étiquette explicite (plus de « LLM mocké » laconique).
    expect((c.querySelector(".amsg .who") as HTMLElement).textContent).toContain(MOCK_DEMO_LABEL);
  });

  it("LIVE : modèle ollama + transport fakeLlm valide → proposition LIVE portant le modèle", async () => {
    const { container } = render(
      <div className="forge">
        <CopiloteShell
          subject="test"
          context={context}
          onApply={() => {}}
          model="ollama:qwen2.5-coder"
          llm={fakeLlm(liveRaw)}
        />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rapport qualité" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));

    await waitFor(() => expect(c.querySelector(".amsg")?.textContent).toContain("ollama:qwen2.5-coder"));
    expect((c.querySelector(".amsg .who") as HTMLElement).textContent).toContain("LLM live");
    expect(c.querySelector(".mock-demo-banner")).toBeNull(); // le live ne porte JAMAIS le bandeau démo
  });

  it("Lot 2b : clé authoringApiKey câblée jusqu'au transport (openai/LiteLLM), jamais dans le corps", async () => {
    // Le Copilote lit la clé + l'endpoint des Réglages et les thread au résolveur → transport.
    const api = {
      authoringApiKey: async () => "sk-secret-litellm",
      authoringEndpoint: async () => "http://localhost:4000",
    } as unknown as Backend;
    const llm = fakeLlm(liveRaw);
    const { container } = render(
      <div className="forge">
        <CopiloteShell
          subject="test"
          context={context}
          onApply={() => {}}
          model="openai:gpt-4o"
          api={api}
          llm={llm}
        />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    // Attend que les effets de montage (clé, endpoint) aient flushé avant le geste.
    await within(c).findByText(/Boucle intention/);
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rapport qualité" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));

    await waitFor(() => expect(llm.calls.length).toBe(1));
    const req = llm.calls[0];
    expect(req.provider).toBe("openai");
    expect(req.host).toBe("http://localhost:4000");
    // La clé voyage dans la requête (→ header Bearer côté Rust) — jamais fabriquée, jamais dans le corps.
    expect(req.apiKey).toBe("sk-secret-litellm");
  });

  it("MODÈLE absent : l'en-tête SIGNALE l'absence (aucun défaut fabriqué)", async () => {
    const api = { authoringModel: async () => null } as unknown as Backend;
    const { container } = render(
      <div className="forge">
        <CopiloteShell subject="test" context={context} onApply={() => {}} api={api} />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    expect(within(c).getByLabelText(/Modèle d'authoring configuré/).textContent).toContain(
      "aucun modèle d'authoring configuré",
    );
  });
});
