import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Method } from "@iakaframe/core";
import { MethodeAtelier } from "./MethodeAtelier";
import { useForgeMethod, IAKAFRAME_STARTER_METHOD } from "../useForgeMethod";

/** Harnais : branche le vrai état d'authoring de méthode (insertion RÉELLE) sur l'atelier. */
function MethodeHarness({ seed }: { seed?: Method } = {}) {
  const { method, insert } = useForgeMethod(seed);
  return (
    <div className="forge">
      <div className="workbench">
        <MethodeAtelier method={method} insert={insert} />
      </div>
    </div>
  );
}

/** Le bandeau D-7, ou `null` s'il n'est pas rendu (A-10 teste l'ABSENCE du nœud). */
function banner(): HTMLElement | null {
  return screen.queryByRole("status", { name: /non résolues par le catalogue du cœur/ });
}

describe("MethodeAtelier — rail à 6 catégories + insertion réelle de principe (E2b §5)", () => {
  it("affiche le diagramme de flux (graphe contextuel Méthode)", () => {
    render(<MethodeHarness />);
    expect(screen.getByRole("img", { name: /Flux du workflow/ })).toBeTruthy();
    expect(screen.getByText(/Diagramme de flux/)).toBeTruthy();
  });

  it("le `+` d'un principe du stock l'INSÈRE réellement dans le MD de la méthode", () => {
    const { container } = render(<MethodeHarness />);
    const md = container.querySelector(".mdpane") as HTMLElement;

    // « Self-hosted d'abord » n'est PAS dans le starter → absent du MD au départ.
    expect(md.textContent).not.toContain("Self-hosted d'abord");

    // Clic sur le + du principe (le bouton porte un aria-label ciblé).
    const addBtn = screen.getByRole("button", {
      name: /Assembler dans la Méthode : Self-hosted d'abord/,
    });
    fireEvent.click(addBtn);

    // Après insertion, le principe apparaît comme sous-élément dépliable du MD.
    expect(md.textContent).toContain("Self-hosted d'abord");
  });
});

/**
 * D-7 — le bandeau de **références non résolues** (A-10 … A-13). Il rend visible une perte qui
 * existait déjà en silence ; il ne bloque rien et ne désigne pas la méthode comme fautive.
 */
describe("MethodeAtelier — bandeau des références non résolues (D-7)", () => {
  /** Méthode dont TOUTES les références sont au catalogue du cœur (le starter l'est). */
  const clean: Method = IAKAFRAME_STARTER_METHOD;

  /** Méthode portant 3 références inconnues du cœur, sur 3 champs différents. */
  const dirty: Method = {
    ...IAKAFRAME_STARTER_METHOD,
    principleIds: [...IAKAFRAME_STARTER_METHOD.principleIds, "preuve-avant-declaration"],
    scaffoldIds: ["portefeuille"],
    guardrailIds: ["identity"],
  };

  it("A-10 — méthode sans référence non résolue : AUCUN bandeau rendu (absence du nœud)", () => {
    const { container } = render(<MethodeHarness seed={clean} />);
    expect(banner()).toBeNull();
    // Pas de bandeau vert « tout va bien » non plus : le nœud n'existe pas du tout.
    expect(container.querySelector(".unresolved")).toBeNull();
  });

  it("A-11 — méthode avec ≥ 1 référence non résolue : bandeau avec le compte et le détail `champ · id`", () => {
    const { container } = render(<MethodeHarness seed={dirty} />);
    const node = banner();
    expect(node).not.toBeNull();

    // Le compte, d'abord — c'est lui qui se compare dans le temps (instrument de suivi).
    expect(node!.textContent).toContain("3 références non résolues par le catalogue du cœur");

    // Puis le détail, un `champ · id` par référence perdue.
    const items = [...node!.querySelectorAll("li")].map((li) => li.textContent);
    expect(items).toEqual([
      "principleIds · preuve-avant-declaration",
      "scaffoldIds · portefeuille",
      "guardrailIds · identity",
    ]);

    // Le bandeau est bien en TÊTE du rail : premier enfant après le `railhead`, donc AVANT
    // la section Workflow (qui n'est plus le premier bloc du rail).
    const rail = container.querySelector(".rail") as HTMLElement;
    const blocks = [...rail.children];
    expect(blocks[0].className).toContain("railhead");
    expect(blocks[1].querySelector(".unresolved")).not.toBeNull();
  });

  it("A-11 — la formulation désigne le CŒUR comme la limite, pas la méthode comme fautive", () => {
    render(<MethodeHarness seed={dirty} />);
    const txt = banner()!.textContent ?? "";
    expect(txt).toContain("catalogue du cœur");
    expect(txt).toMatch(/légitimes/);
    // Aucun vocabulaire de faute imputée à l'utilisateur.
    expect(txt).not.toMatch(/invalide|erreur|faute|incorrect/i);
  });

  it("A-12 — le bandeau est NON BLOQUANT : il ne désactive AUCUN contrôle, `insert` fonctionne encore", () => {
    /** Signature des contrôles désactivés d'un rendu (mesure, pas déclaration). */
    const disabledSig = (root: HTMLElement): string[] =>
      [...root.querySelectorAll("button, input, select, textarea")]
        .filter((el) => (el as HTMLButtonElement).disabled)
        .map((el) => `${el.tagName}:${el.getAttribute("aria-label") ?? el.textContent}`)
        .sort();

    // Mesure DIFFÉRENTIELLE : avec bandeau vs sans bandeau, toutes choses égales par ailleurs.
    // (Le rendu de base porte déjà 2 contrôles désactivés — le `select` de workflow, faute de
    // `onWorkflowIdChange` dans le harnais, et le bouton « Proposer » à saisie vide. Ils ne
    // doivent NI disparaître NI se multiplier du fait du bandeau.)
    const withoutBanner = render(<MethodeHarness seed={clean} />);
    const before = disabledSig(withoutBanner.container);
    withoutBanner.unmount();

    const { container } = render(<MethodeHarness seed={dirty} />);
    expect(banner()).not.toBeNull();
    expect(disabledSig(container)).toEqual(before);

    // Le flux d'insertion continue de fonctionner à l'identique.
    const md = container.querySelector(".mdpane") as HTMLElement;
    expect(md.textContent).not.toContain("Self-hosted d'abord");
    fireEvent.click(
      screen.getByRole("button", { name: /Assembler dans la Méthode : Self-hosted d'abord/ }),
    );
    expect(md.textContent).toContain("Self-hosted d'abord");

    // …et le bandeau reste affiché, inchangé (il informe, il n'interdit pas).
    expect(banner()).not.toBeNull();
    expect(banner()!.textContent).toContain("3 références non résolues");
  });
});
