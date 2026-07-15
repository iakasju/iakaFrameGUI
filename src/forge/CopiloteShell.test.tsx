import { describe, it, expect } from "vitest";
import { render, fireEvent, within } from "@testing-library/react";
import { MethodeAtelier } from "./ateliers/MethodeAtelier";
import { useForgeMethod } from "./useForgeMethod";

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
  it("Proposer affiche une PROPOSITION (artefacts + diff + Valider/Rejeter) — rien avant", () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    // Coquille au repos : pas de proposition, bouton Proposer désactivé (prompt vide).
    expect(c.querySelector(".conv")).toBeNull();
    const send = within(c).getByRole("button", { name: /Proposer/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    // Saisie d'une intention → Proposer actif → proposition rendue.
    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    expect(c.querySelector(".conv")).not.toBeNull();
    expect(c.querySelector(".cdiff")).not.toBeNull();
    expect(within(c).getByRole("button", { name: /Valider/ })).toBeTruthy();
    expect(within(c).getByRole("button", { name: /Rejeter/ })).toBeTruthy();
  });

  it("VALIDER matérialise réellement : l'artefact apparaît dans le MD de la méthode", () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    // `log-conversation` n'est pas dans le starter → absent du MD au départ.
    expect(mdpane(container).textContent).not.toContain("log-conversation");

    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    fireEvent.click(within(c).getByRole("button", { name: /Valider/ }));

    // Après validation : le rituel est RÉELLEMENT inséré → visible dans le contrat MD lu.
    expect(mdpane(container).textContent).toContain("log-conversation");
    // La proposition est consommée et l'accusé de matérialisation s'affiche.
    expect(container.querySelector(".copilote .conv")).toBeNull();
    expect(copilote(container).textContent).toContain("Matérialisé");
  });

  it("REJETER ne change RIEN : aucune écriture dans le MD", () => {
    const { container } = render(<MethodeHarness />);
    const c = copilote(container);

    const textarea = within(c).getByLabelText(/Prompt copilote/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "un rituel log-conversation de fin de session" } });
    fireEvent.click(within(c).getByRole("button", { name: /Proposer/ }));
    fireEvent.click(within(c).getByRole("button", { name: /Rejeter/ }));

    // Rejet : la proposition disparaît, le MD reste intact (log-conversation toujours absent).
    expect(copilote(container).querySelector(".conv")).toBeNull();
    expect(mdpane(container).textContent).not.toContain("log-conversation");
    expect(copilote(container).textContent).toContain("rejetée");
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
