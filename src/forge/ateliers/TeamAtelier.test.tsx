import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { buildTeamFromRoster, type Team } from "@iakaframe/core";
import { TeamAtelier } from "./TeamAtelier";

/** Harnais : atelier CONTRÔLÉ (team + onTeamChange), team de départ semée (gabarit AR-5). */
function TeamHarness() {
  const [team, setTeam] = useState<Team>(() =>
    buildTeamFromRoster("Team iakaframe", "iakaframe"),
  );
  return (
    <div className="forge">
      <div className="workbench">
        <TeamAtelier team={team} onTeamChange={setTeam} />
      </div>
    </div>
  );
}

describe("TeamAtelier — sélection d'élément + insertion réelle de skill (E2b §2)", () => {
  it("clic sur une persona du rail = passage en édition", async () => {
    render(<TeamHarness />);
    // Coordinateur (Aragorn) édité par défaut.
    await screen.findByText(/Aragorn — persona en édition/);

    // Sélectionner Gimli (rôle fabrication) → il passe en édition.
    fireEvent.click(screen.getByRole("button", { name: /Gimli/ }));
    expect(await screen.findByText(/Gimli — persona en édition/)).toBeTruthy();
  });

  it("le `+` d'un skill du stock l'INSÈRE réellement dans la persona éditée (MD)", async () => {
    const { container } = render(<TeamHarness />);
    await screen.findByText(/Aragorn — persona en édition/);
    const md = container.querySelector(".mdpane") as HTMLElement;

    // Skill « iakaframe-odin » pas encore sur Aragorn → absent du MD.
    expect(md.textContent).not.toContain("iakaframe-odin");

    fireEvent.click(
      screen.getByRole("button", { name: /Insérer dans Aragorn : iakaframe-odin/ }),
    );

    // Après insertion (persistée puis reflétée), le skill apparaît dans le MD de la persona.
    await waitFor(() => expect(md.textContent).toContain("iakaframe-odin"));
  });
});
