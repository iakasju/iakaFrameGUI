/**
 * poolsPropose.integration.test.tsx — brique B **de bout en bout par l'hôte** pour les pools NEUFS
 * (au-delà du pilote persona). Prouve, SANS réseau (proposition DÉTERMINISTE stubée) :
 *   - AC-B1/B2 : la proposition PRÉ-REMPLIT l'éditeur ; RIEN n'est écrit avant « Enregistrer ».
 *   - le correctif éditeur scaffold/skill : la **création-avec-proposition** ne bloque plus le save
 *     (le champ nom reste saisissable car l'id n'est pas encore committé).
 *
 * Le résolveur honnête (live/repli) est prouvé par pool dans `<pool>Proposition.test.ts` et
 * `elementProposition.test.ts` ; ici on isole l'acheminement + le comportement des éditeurs.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Principle, Scaffold, SkillAtom } from "@iakaframe/core";
import { ElementReservoir } from "./ElementReservoir";
import { principleKind } from "./principleKind";
import { scaffoldKind } from "./scaffoldKind";
import { skillKind } from "./skillKind";
import { persistPrinciple } from "./principlePersist";
import type { ElementKind } from "./elementKind";
import type { Backend } from "../api/backend";

/** Fabrique un `kind` dont la proposition est DÉTERMINISTE (zéro transport). */
function withStub<T>(kind: ElementKind<T>, proposition: Partial<T>): ElementKind<T> {
  return { ...kind, proposeElement: async () => ({ proposition, source: "live" as const }) };
}

describe("brique B — intégration hôte, pools neufs", () => {
  it("principle ÉDITION : proposition pré-remplit, rien écrit avant save, écriture via persistPrinciple", async () => {
    const md =
      "---\nid: qualite\nlabel: Qualité\npolicy: tester avant de clore\ntrigger: à chaque tâche\nvignette: none\n---\n\n# Qualité\n";
    let written: { id: string; text: string } | null = null;
    const api = {
      poolRead: async () => md,
      poolWrite: async (_t: string, id: string, text: string) => {
        written = { id, text };
      },
    } as unknown as Backend;
    const persist = vi.fn((p: Principle) => persistPrinciple(p, api));
    const base: Principle = { id: "qualite", label: "Qualité", policy: "tester avant de clore", trigger: "à chaque tâche" };

    render(
      <ElementReservoir
        kind={withStub(principleKind, { policy: "tester ET typer avant de clore" })}
        loadElements={async () => [base]}
        persist={persist}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText("Ouvrir la fiche de Qualité")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Qualité"));
    expect(screen.getByText("✎ édition")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "renforce" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    // AC-B1 : l'éditeur est pré-rempli par la policy proposée.
    await waitFor(() => expect(screen.getByDisplayValue("tester ET typer avant de clore")).toBeTruthy());
    // AC-B2 : rien écrit à la proposition.
    expect(persist).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(written).not.toBeNull();
    expect(written!.id).toBe("qualite"); // C-1
    expect(written!.text).toContain("policy: tester ET typer avant de clore");
    expect(written!.text).toContain("vignette: none\n"); // clé non modélisée préservée
  });

  it("scaffold CRÉATION-avec-proposition : le champ nom reste saisissable → save NON bloqué (fix éditeur)", async () => {
    const onWrite = vi.fn();
    const api = {
      poolRead: async () => null,
      poolWrite: async (_t: string, id: string, text: string) => onWrite({ id, text }),
    } as unknown as Backend;
    let submitted: Scaffold | null = null;
    // On intercepte l'upsert de session via un persist factice qui capte l'élément soumis.
    render(
      <ElementReservoir
        kind={withStub(scaffoldKind, { level: "portfolio" })}
        loadElements={async () => []}
        persist={async (s: Scaffold) => {
          submitted = s;
          await api.poolWrite("scaffolds", s.id, "x");
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Nouveau scaffold/ }));
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "propose" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    // Attendre que la proposition ait REMONTÉ l'éditeur (sinon on saisirait dans le champ pré-remontage,
    // perdu au remount) : la confirmation de pré-remplissage garantit que le re-seed est appliqué.
    await screen.findByText(/pré-rempli l'éditeur/);
    // Le champ nom (placeholder « ex. project ») reste présent malgré l'élément seedé (correctif).
    const nameInput = screen.getByPlaceholderText("ex. project");
    fireEvent.change(nameInput, { target: { value: "Mono Repo" } });

    // Le bouton de save n'est PAS bloqué (nameOk vrai via le nom saisi).
    const saveBtn = screen.getByRole("button", { name: "Enregistrer" }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    fireEvent.click(saveBtn);

    await waitFor(() => expect(onWrite).toHaveBeenCalledTimes(1));
    expect(submitted).not.toBeNull();
    expect(submitted!.id).toBe("mono-repo"); // id dérivé du nom saisi
    expect(submitted!.level).toBe("portfolio"); // champ proposé conservé
  });

  it("skill CRÉATION-avec-proposition : nom saisissable → save NON bloqué (fix éditeur), description proposée conservée", async () => {
    const onWrite = vi.fn();
    let submitted: SkillAtom | null = null;
    render(
      <ElementReservoir
        kind={withStub(skillKind, { description: "Audite la sécurité — invoquer sur diff sensible." })}
        loadElements={async () => []}
        persist={async (s: SkillAtom) => {
          submitted = s;
          onWrite({ id: s.id });
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Nouvelle skill/ }));
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "propose" } });
    fireEvent.click(screen.getByLabelText("Proposer un élément"));

    // Description proposée pré-remplie + champ nom saisissable (placeholder skill).
    await waitFor(() =>
      expect(screen.getByDisplayValue("Audite la sécurité — invoquer sur diff sensible.")).toBeTruthy(),
    );
    const nameInput = screen.getByPlaceholderText("ex. iakaframe-revue-securite");
    fireEvent.change(nameInput, { target: { value: "Revue de sécurité" } });

    const saveBtn = screen.getByRole("button", { name: "Enregistrer" }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    fireEvent.click(saveBtn);

    await waitFor(() => expect(onWrite).toHaveBeenCalledTimes(1));
    expect(submitted!.id).toBe("revue-de-securite");
    expect(submitted!.description).toBe("Audite la sécurité — invoquer sur diff sensible.");
  });
});
