import { describe, it, expect } from "vitest";
import { render, fireEvent, within, waitFor } from "@testing-library/react";
import { MethodeAtelier } from "./ateliers/MethodeAtelier";
import { useForgeMethod } from "./useForgeMethod";
import { CopiloteShell } from "./CopiloteShell";
import type { Backend } from "../api/backend";
import type { CopiloteContext } from "./mock/copilote";

/**
 * Harnais : le VRAI état d'authoring de méthode (insertion réelle) branché sur l'atelier — la
 * boucle copilote matérialise donc via le **même chemin** que le `+` du rail (`useForgeMethod`).
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

describe("CopiloteShell — boucle intention → proposition → diff → valider/rejeter (E2c §8)", () => {
  it("Proposer affiche une PROPOSITION (artefacts + diff + Valider/Rejeter) — rien avant", async () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    // Coquille au repos : pas de proposition, bouton Proposer désactivé (prompt vide).
    expect(c.querySelector(".conv")).toBeNull();
    const send = within(c).getByRole("button", { name: /Proposer/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    // Saisie d'une intention → Proposer actif → proposition rendue (chemin async → repli mock hors Tauri).
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    await waitFor(() => expect(c.querySelector(".conv")).not.toBeNull());
    expect(c.querySelector(".cdiff")).not.toBeNull();
    expect(within(c).getByRole("button", { name: /Valider/ })).toBeTruthy();
    expect(within(c).getByRole("button", { name: /Rejeter/ })).toBeTruthy();
  });

  it("VALIDER matérialise réellement : l'artefact apparaît dans le MD de la méthode", async () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    // `log-conversation` n'est pas dans le starter → absent du MD au départ.
    expect(mdpane(container).textContent).not.toContain("log-conversation");

    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    fireEvent.click(await within(c).findByRole("button", { name: /Valider/ }));

    // Après validation : le rituel est RÉELLEMENT inséré → visible dans le contrat MD lu.
    expect(mdpane(container).textContent).toContain("log-conversation");
    // La proposition est consommée et l'accusé de matérialisation s'affiche.
    expect(container.querySelector(".copilote .conv")).toBeNull();
    expect(copilote(container).textContent).toContain("Matérialisé");
  });

  it("REJETER ne change RIEN : aucune écriture dans le MD", async () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    fireEvent.click(await within(c).findByRole("button", { name: /Rejeter/ }));

    // Rejet : la proposition disparaît, le MD reste intact (log-conversation toujours absent).
    expect(copilote(container).querySelector(".conv")).toBeNull();
    expect(mdpane(container).textContent).not.toContain("log-conversation");
    expect(copilote(container).textContent).toContain("rejetée");
  });

  it("MODÈLE d'authoring (§ Volet B) : la console lit `authoringModel` des Settings et le consomme", async () => {
    const api = {
      authoringModel: async () => "ollama:qwen2.5-coder",
    } as unknown as Backend;
    const context: CopiloteContext = { surface: "methode", diffFile: "methode.md", present: {} };
    const { container } = render(
      <div className="forge">
        <CopiloteShell subject="test" context={context} onApply={() => {}} api={api} />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    // Le modèle configuré s'affiche dans l'en-tête (asynchrone : lu depuis le backend injecté).
    await waitFor(() =>
      expect(within(c).getByLabelText(/Modèle d'authoring configuré/).textContent).toContain(
        "ollama:qwen2.5-coder",
      ),
    );
    // Et une proposition le PORTE (repli mock hors Tauri : le modèle configuré est conservé).
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rapport qualité" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    await waitFor(() =>
      expect(c.querySelector(".amsg")?.textContent).toContain("ollama:qwen2.5-coder"),
    );
  });

  it("MODÈLE absent (§ Volet B) : aucun défaut → l'absence est signalée (console + proposition)", async () => {
    const api = { authoringModel: async () => null } as unknown as Backend;
    const context: CopiloteContext = { surface: "methode", diffFile: "methode.md", present: {} };
    const { container } = render(
      <div className="forge">
        <CopiloteShell subject="test" context={context} onApply={() => {}} api={api} />
      </div>,
    );
    const c = container.querySelector(".copilote") as HTMLElement;
    // En-tête : pas de modèle par défaut, mais un état clair d'absence.
    expect(within(c).getByLabelText(/Modèle d'authoring configuré/).textContent).toContain(
      "aucun modèle d'authoring configuré",
    );
    // La proposition signale aussi l'absence (dans le hint) sans inventer de modèle.
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rapport qualité" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    await waitFor(() =>
      expect(c.querySelector(".hint")?.textContent).toContain("aucun modèle d'authoring configuré"),
    );
  });

  it("FRONTIÈRE : le sélecteur de la console est un runner d'AUTHORING mocké (pas d'exécution)", () => {
    const { container } = render(<MethodeHarness />);
    const select = within(copilote(container)).getByLabelText(/Runner d'authoring/) as HTMLSelectElement;
    // Les options sont marquées « mock » (LLM réel différé) — build-time, pas run-time.
    const opts = Array.from(select.options).map((o) => o.value);
    expect(opts.every((o) => o.includes("mock"))).toBe(true);
    expect(copilote(container).textContent).toContain("LLM mocké");
  });
});
