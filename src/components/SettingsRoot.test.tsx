import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsRoot } from "./SettingsRoot";
import type { Backend } from "../api/backend";

function fakeApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: () => false,
    iakaframeHome: async () => "/home/user/work/iakaframe",
    setIakaframeHome: async () => {},
    pickDirectory: async () => "/autre/racine",
    ...over,
  } as unknown as Backend;
}

describe("SettingsRoot — racine bibliothèque IAKAFRAME_HOME (§5)", () => {
  it("affiche la racine résolue + le rappel export", async () => {
    render(<SettingsRoot api={fakeApi()} />);
    expect(await screen.findByText("/home/user/work/iakaframe")).toBeTruthy();
    expect(screen.getByText(/export IAKAFRAME_HOME=/)).toBeTruthy();
  });

  it("racine introuvable → invite explicite", async () => {
    render(<SettingsRoot api={fakeApi({ iakaframeHome: async () => null })} />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/introuvable/)).toBeTruthy();
  });

  it("« Choisir le dossier… » persiste l'override (setIakaframeHome)", async () => {
    const setIakaframeHome = vi.fn(async () => {});
    render(<SettingsRoot api={fakeApi({ setIakaframeHome })} />);
    await screen.findByText("/home/user/work/iakaframe");
    fireEvent.click(screen.getByRole("button", { name: /Choisir le dossier/ }));
    await waitFor(() => expect(setIakaframeHome).toHaveBeenCalledWith("/autre/racine"));
  });
});
