import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsRoot } from "./SettingsRoot";
import type { Backend } from "../api/backend";

function fakeApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: () => false,
    iakaframeHome: async () => "/home/user/work/iakaframe",
    setIakaframeHome: async () => {},
    authoringModel: async () => null,
    setAuthoringModel: async () => {},
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

describe("SettingsRoot — modèle d'authoring global (§ Volet B)", () => {
  it("affiche le modèle configuré quand il est défini", async () => {
    render(<SettingsRoot api={fakeApi({ authoringModel: async () => "ollama:qwen2.5-coder" })} />);
    expect(await screen.findByText("ollama:qwen2.5-coder")).toBeTruthy();
  });

  it("non défini → invite à pointer un modèle (aucun défaut)", async () => {
    render(<SettingsRoot api={fakeApi({ authoringModel: async () => null })} />);
    await screen.findByText("/home/user/work/iakaframe");
    expect(screen.getByText(/pointez un modèle/)).toBeTruthy();
  });

  it("« Enregistrer le modèle » persiste la saisie (setAuthoringModel)", async () => {
    const setAuthoringModel = vi.fn(async () => {});
    render(<SettingsRoot api={fakeApi({ setAuthoringModel })} />);
    await screen.findByText("/home/user/work/iakaframe");
    const input = screen.getByLabelText(/Identifiant ou endpoint du modèle/);
    fireEvent.change(input, { target: { value: "litellm:gpt-4o" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer le modèle/ }));
    await waitFor(() => expect(setAuthoringModel).toHaveBeenCalledWith("litellm:gpt-4o"));
  });

  it("« Effacer » vide le champ (setAuthoringModel(\"\") retire la clé)", async () => {
    const setAuthoringModel = vi.fn(async () => {});
    render(
      <SettingsRoot
        api={fakeApi({ authoringModel: async () => "litellm:gpt-4o", setAuthoringModel })}
      />,
    );
    await screen.findByText("litellm:gpt-4o");
    fireEvent.click(screen.getByRole("button", { name: /Effacer/ }));
    await waitFor(() => expect(setAuthoringModel).toHaveBeenCalledWith(""));
  });
});
