import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ForgeShell } from "./ForgeShell";

describe("ForgeShell — onglets de 1er étage Team · Méthode · Kit (E2b §9)", () => {
  it("bascule vers l'atelier Méthode puis Kit", async () => {
    render(<ForgeShell />);

    // Atelier Team par défaut (après semis de la team de départ).
    expect(await screen.findByText(/Stock — atelier Team · casting pur/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Méthode/ }));
    expect(await screen.findByText(/Stock — atelier Méthode · la discipline/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Kit/ }));
    expect(await screen.findByText(/Stock — atelier Kit · assemblage total/)).toBeTruthy();
  });

  it("le bouton « Livrer au Cockpit » est présent dans la barre", async () => {
    render(<ForgeShell />);
    expect(await screen.findByRole("button", { name: /Livrer au Cockpit/ })).toBeTruthy();
  });

  // --- Anti-boucle (garde de non-régression) : l'onglet Méthode ne doit PAS reboucler ---
  it("anti-boucle : ouvrir l'onglet Méthode atteint la quiescence (aller-retour Méthode → Team fluide, sans hang)", async () => {
    // Ouvrir l'onglet Méthode déclenchait une boucle de rendu infinie (100 % CPU) : l'effet de
    // rafraîchissement des workflows dépendait d'un `workflowDoc` recréé à chaque rendu et posait
    // un `setWorkflowOptions(nouveau [])` en microtâche → arbre jamais quiescent. Sur l'ancien
    // code, ce test NE TERMINE PAS (timeout vitest = échec) : la seule terminaison < seuil est le
    // signal anti-régression. Après correctif, l'arbre se stabilise et la navigation reste fluide.
    const { unmount } = render(<ForgeShell />);
    expect(await screen.findByText(/Stock — atelier Team · casting pur/)).toBeTruthy();

    // Bascule sur Méthode : sur l'ancien code, la boucle démarre ici et le worker ne rend plus la main.
    fireEvent.click(screen.getByRole("tab", { name: /Méthode/ }));
    expect(await screen.findByText(/Stock — atelier Méthode · la discipline/)).toBeTruthy();

    // Retour sur Team : preuve que l'event loop n'est PAS saturé (navigation encore réactive).
    fireEvent.click(screen.getByRole("tab", { name: /Team/ }));
    expect(await screen.findByText(/Stock — atelier Team · casting pur/)).toBeTruthy();

    unmount(); // démontage propre : plus aucune microtâche de rendu en attente.
  });
});
