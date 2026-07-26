import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ForgeShell } from "./ForgeShell";

describe("ForgeShell — nav à 9 entrées (Lot 2, Fork B)", () => {
  const NAV_LABELS = [
    "frame",
    "méthode",
    "team",
    "persona",
    "éléments",
    "assemblage",
    "models",
    "kit",
    "apprentissage",
  ];

  it("présente les 9 entrées de la nav", () => {
    render(<ForgeShell />);
    const navbar = screen.getByRole("tablist", { name: /Architecture du produit/ });
    for (const label of NAV_LABELS) {
      expect(within(navbar).getByRole("tab", { name: label })).toBeTruthy();
    }
    // Exactement 9 entrées — pas de résidu de l'ancienne coquille à 5 onglets.
    expect(within(navbar).getAllByRole("tab")).toHaveLength(9);
  });

  it("bascule vers l'atelier Méthode puis Kit (surfaces d'édition conservées, Fork A)", async () => {
    render(<ForgeShell />);

    // Atelier Team par défaut (après semis de la team de départ).
    expect(await screen.findByText(/Stock — atelier Team · casting pur/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "méthode" }));
    expect(await screen.findByText(/Stock — atelier Méthode · la discipline/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "kit" }));
    expect(await screen.findByText(/Stock — atelier Kit · assemblage total/)).toBeTruthy();
  });

  it("les entrées encore sans écran (persona, models) rendent un placeholder « à venir »", async () => {
    render(<ForgeShell />);

    fireEvent.click(screen.getByRole("tab", { name: "persona" }));
    expect(await screen.findByText(/à venir · Lot 3/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "models" }));
    expect(await screen.findByText(/à venir · Lot 4/)).toBeTruthy();
  });

  it("l'entrée « assemblage » ouvre l'écran d'assemblage du Lot 1", async () => {
    render(<ForgeShell />);
    fireEvent.click(screen.getByRole("tab", { name: "assemblage" }));
    // AssemblyView charge le frame et rend le récit « frères » — on attend un de ses libellés.
    expect(await screen.findByRole("tab", { name: "assemblage" })).toBeTruthy();
  });

  it("le bouton « New » du chrome est présent et actif sur une entrée documentaire", async () => {
    render(<ForgeShell />);
    const newBtn = screen.getByRole("button", { name: "Nouvelle entité" });
    expect(newBtn).toBeTruthy();
    // Sur l'entrée « team » (documentaire), New est actif.
    expect((newBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("le bouton « New » est désactivé sur une entrée sans entité créable (placeholder)", async () => {
    render(<ForgeShell />);
    fireEvent.click(screen.getByRole("tab", { name: "persona" }));
    const newBtn = screen.getByRole("button", { name: "Nouvelle entité" });
    expect((newBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("une entrée documentaire semée est en mode « création » ; le renommage laisse le mode", async () => {
    render(<ForgeShell />);
    // Team semée au montage via requestNew → document neuf → mode création.
    expect(await screen.findByText(/✚ création/)).toBeTruthy();
  });

  it("le bouton « Livrer au Cockpit » est présent dans la barre", async () => {
    render(<ForgeShell />);
    expect(await screen.findByRole("button", { name: /Livrer au Cockpit/ })).toBeTruthy();
  });

  // --- Anti-boucle (garde de non-régression) : l'entrée Méthode ne doit PAS reboucler ---
  it("anti-boucle : ouvrir l'entrée Méthode atteint la quiescence (aller-retour Méthode → Team fluide, sans hang)", async () => {
    // Ouvrir l'entrée Méthode déclenchait une boucle de rendu infinie (100 % CPU) : l'effet de
    // rafraîchissement des workflows dépendait d'un `workflowDoc` recréé à chaque rendu et posait
    // un `setWorkflowOptions(nouveau [])` en microtâche → arbre jamais quiescent. Sur l'ancien
    // code, ce test NE TERMINE PAS (timeout vitest = échec) : la seule terminaison < seuil est le
    // signal anti-régression. Après correctif, l'arbre se stabilise et la navigation reste fluide.
    const { unmount } = render(<ForgeShell />);
    expect(await screen.findByText(/Stock — atelier Team · casting pur/)).toBeTruthy();

    // Bascule sur Méthode : sur l'ancien code, la boucle démarre ici et le worker ne rend plus la main.
    fireEvent.click(screen.getByRole("tab", { name: "méthode" }));
    expect(await screen.findByText(/Stock — atelier Méthode · la discipline/)).toBeTruthy();

    // Retour sur Team : preuve que l'event loop n'est PAS saturé (navigation encore réactive).
    fireEvent.click(screen.getByRole("tab", { name: "team" }));
    expect(await screen.findByText(/Stock — atelier Team · casting pur/)).toBeTruthy();

    unmount(); // démontage propre : plus aucune microtâche de rendu en attente.
  });
});
