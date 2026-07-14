import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Foldable, MdPane, PrincipleMeta, type FoldNode } from "./FoldableMd";

describe("FoldableMd — contrat MD en lecture dépliable récursive (E2b §7)", () => {
  it("rend un <details> avec le titre et déplie récursivement ses enfants", () => {
    const node: FoldNode = {
      kind: "skill",
      title: "iakaframe-forgejo",
      role: "commit & livraison",
      body: <p>corps de la skill</p>,
      children: [{ kind: "hook", title: "perimeter-guard.mjs", body: <p>PreToolUse</p> }],
    };
    const { container } = render(<Foldable node={node} />);

    // Deux niveaux de <details> imbriqués (récursion).
    const details = container.querySelectorAll("details.ex");
    expect(details.length).toBe(2);
    expect(screen.getByText("iakaframe-forgejo")).toBeTruthy();
    expect(screen.getByText("perimeter-guard.mjs")).toBeTruthy();
    expect(screen.getByText("corps de la skill")).toBeTruthy();
  });

  it("MdPane affiche l'entête, le frontmatter et les nœuds", () => {
    const { container } = render(
      <MdPane
        kind="persona.md"
        filename="gimli.md"
        cols="lecture"
        frontmatter={"roleKey: fabrication"}
        nodes={[{ kind: "skill", title: "s1" }]}
      >
        <p>intro</p>
      </MdPane>,
    );
    expect(container.querySelector(".fm")?.textContent).toContain("roleKey: fabrication");
    expect(screen.getByText("intro")).toBeTruthy();
    expect(screen.getByText("s1")).toBeTruthy();
  });

  it("PrincipleMeta rend politique + déclencheur", () => {
    const { container } = render(<PrincipleMeta policy="pol-x" trigger="trig-y" />);
    const meta = container.querySelector(".prinmeta") as HTMLElement;
    expect(meta.textContent).toContain("pol-x");
    expect(meta.textContent).toContain("trig-y");
  });
});
