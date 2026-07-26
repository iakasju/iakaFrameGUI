import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useState } from "react";
import { ListEditor } from "./ListEditor";

/** Harnais : un ListEditor de strings (liste simple), contrôlé par un état local de test. */
function StringListHarness({ initial = [] as string[], onItems }: { initial?: string[]; onItems?: (v: string[]) => void }) {
  const [items, setItems] = useState<string[]>(initial);
  return (
    <ListEditor<string>
      items={items}
      onChange={(v) => {
        setItems(v);
        onItems?.(v);
      }}
      blankRow={() => ""}
      legend="Sous-skills"
      addLabel="Ajouter une sous-skill"
      itemLabel={(_it, i) => `sous-skill ${i + 1}`}
      renderRow={(item, onRowChange) => (
        <input aria-label="valeur" value={item} onChange={(e) => onRowChange(e.target.value)} />
      )}
    />
  );
}

describe("ListEditor — socle générique add/remove/reorder (Lot A, AC5)", () => {
  it("le groupe et les lignes portent des labels ARIA (accessibilité)", () => {
    render(<StringListHarness initial={["a", "b"]} />);
    expect(screen.getByRole("group", { name: "Sous-skills" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "sous-skill 1" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "sous-skill 2" })).toBeTruthy();
  });

  it("liste vide → message d'invite, un seul bouton (ajout)", () => {
    render(<StringListHarness initial={[]} />);
    expect(screen.getByText(/Aucune ligne/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Ajouter une sous-skill" })).toBeTruthy();
  });

  it("ajout : + Ajouter crée une ligne vierge via blankRow", () => {
    const onItems = vi.fn();
    render(<StringListHarness initial={["x"]} onItems={onItems} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une sous-skill" }));
    expect(onItems).toHaveBeenLastCalledWith(["x", ""]);
  });

  it("édition d'une ligne : onRowChange remplace le bon index", () => {
    const onItems = vi.fn();
    render(<StringListHarness initial={["a", "b"]} onItems={onItems} />);
    const row2 = screen.getByRole("group", { name: "sous-skill 2" });
    fireEvent.change(within(row2).getByLabelText("valeur"), { target: { value: "B!" } });
    expect(onItems).toHaveBeenLastCalledWith(["a", "B!"]);
  });

  it("suppression : ✕ retire la ligne ciblée", () => {
    const onItems = vi.fn();
    render(<StringListHarness initial={["a", "b", "c"]} onItems={onItems} />);
    fireEvent.click(screen.getByRole("button", { name: "supprimer sous-skill 2" }));
    expect(onItems).toHaveBeenLastCalledWith(["a", "c"]);
  });

  it("réordonnancement : ↓ échange avec le suivant, ↑ avec le précédent", () => {
    const onItems = vi.fn();
    render(<StringListHarness initial={["a", "b", "c"]} onItems={onItems} />);
    fireEvent.click(screen.getByRole("button", { name: "descendre sous-skill 1" }));
    expect(onItems).toHaveBeenLastCalledWith(["b", "a", "c"]);
  });

  it("bornes : ↑ désactivé sur la première ligne, ↓ désactivé sur la dernière", () => {
    render(<StringListHarness initial={["a", "b"]} />);
    const up1 = screen.getByRole("button", { name: "monter sous-skill 1" }) as HTMLButtonElement;
    const down2 = screen.getByRole("button", { name: "descendre sous-skill 2" }) as HTMLButtonElement;
    expect(up1.disabled).toBe(true);
    expect(down2.disabled).toBe(true);
  });
});
