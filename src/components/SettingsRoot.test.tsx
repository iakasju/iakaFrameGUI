import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsRoot } from "./SettingsRoot";
import type { Backend } from "../api/backend";
import type { UseAppUpdate } from "../hooks/useAppUpdate";

function fakeApi(over: Partial<Backend> = {}): Backend {
  return {
    isTauri: () => false,
    iakaframeHome: async () => "/home/user/work/iakaframe",
    setIakaframeHome: async () => {},
    authoringModel: async () => null,
    setAuthoringModel: async () => {},
    authoringEndpoint: async () => null,
    setAuthoringEndpoint: async () => {},
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
    // Nom EXACT « Effacer » : distingue du bouton « Effacer l'endpoint » (§ D3, même section).
    fireEvent.click(screen.getByRole("button", { name: "Effacer" }));
    await waitFor(() => expect(setAuthoringModel).toHaveBeenCalledWith(""));
  });
});

describe("SettingsRoot — charte graphique (déplacée du chrome)", () => {
  it("expose le sélecteur de charte dans les Réglages", async () => {
    render(<SettingsRoot api={fakeApi()} />);
    await screen.findByText("/home/user/work/iakaframe");
    // Le libellé propre au bloc Réglages + le sélecteur de CharteSelector.
    expect(screen.getByRole("heading", { name: "Charte graphique" })).toBeTruthy();
    expect(screen.getByLabelText(/Charte visuelle/)).toBeTruthy();
  });

  it("changer la charte depuis Réglages commute et persiste (useCharte / data-theme)", async () => {
    render(<SettingsRoot api={fakeApi()} />);
    await screen.findByText("/home/user/work/iakaframe");
    const select = screen.getByLabelText(/Charte visuelle/) as HTMLSelectElement;
    // Il y a au moins deux chartes disponibles pour pouvoir basculer.
    const options = Array.from(select.options).map((o) => o.value);
    expect(options.length).toBeGreaterThan(1);
    const target = options.find((v) => v !== select.value) ?? options[0];
    fireEvent.change(select, { target: { value: target } });
    // La bascule réelle : data-theme posé sur <html> + persistance localStorage.
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe(target));
    expect(localStorage.getItem("forge_charte")).toBe(target);
  });
});

describe("SettingsRoot — sélecteur de source d'inférence (Lot 1) + clé API (Lot 2)", () => {
  it("expose le sélecteur avec les presets (Ollama LAN, LiteLLM, mock, personnalisé)", async () => {
    render(<SettingsRoot api={fakeApi()} />);
    await screen.findByText("/home/user/work/iakaframe");
    const select = screen.getByLabelText("Source d'inférence") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("ollama-lan");
    expect(options).toContain("ollama-local");
    expect(options).toContain("litellm");
    expect(options).toContain("mock");
    expect(options).toContain("custom");
    // Libellé LiteLLM explicite (passerelle OpenAI-compatible).
    expect(screen.getByText(/LiteLLM \(Claude \/ ChatGPT \/ local\)/)).toBeTruthy();
  });

  it("« Ollama LAN » pré-remplit l'endpoint LAN + oriente le provider ollama (Option A)", async () => {
    const setAuthoringEndpoint = vi.fn(async () => {});
    const setAuthoringModel = vi.fn(async () => {});
    render(
      <SettingsRoot
        api={fakeApi({
          authoringModel: async () => "ollama:qwen2.5-coder",
          setAuthoringEndpoint,
          setAuthoringModel,
        })}
      />,
    );
    await screen.findByText("/home/user/work/iakaframe");
    const select = screen.getByLabelText("Source d'inférence");
    fireEvent.change(select, { target: { value: "ollama-lan" } });
    await waitFor(() =>
      expect(setAuthoringEndpoint).toHaveBeenCalledWith("http://192.168.2.11:11434"),
    );
    // Le nom de modèle courant est CONSERVÉ, seul le préfixe provider est (ré)écrit.
    expect(setAuthoringModel).toHaveBeenCalledWith("ollama:qwen2.5-coder");
  });

  it("« LiteLLM » pré-remplit http://localhost:4000 + oriente le provider openai", async () => {
    const setAuthoringEndpoint = vi.fn(async () => {});
    const setAuthoringModel = vi.fn(async () => {});
    render(
      <SettingsRoot
        api={fakeApi({
          authoringModel: async () => "ollama:qwen2.5-coder",
          setAuthoringEndpoint,
          setAuthoringModel,
        })}
      />,
    );
    await screen.findByText("/home/user/work/iakaframe");
    fireEvent.change(screen.getByLabelText("Source d'inférence"), { target: { value: "litellm" } });
    await waitFor(() => expect(setAuthoringEndpoint).toHaveBeenCalledWith("http://localhost:4000"));
    expect(setAuthoringModel).toHaveBeenCalledWith("openai:qwen2.5-coder");
  });

  it("« Mode démo (mock) » pose la valeur réservée du modèle (opt-in), sans toucher l'endpoint", async () => {
    const setAuthoringModel = vi.fn(async () => {});
    const setAuthoringEndpoint = vi.fn(async () => {});
    render(<SettingsRoot api={fakeApi({ setAuthoringModel, setAuthoringEndpoint })} />);
    await screen.findByText("/home/user/work/iakaframe");
    fireEvent.change(screen.getByLabelText("Source d'inférence"), { target: { value: "mock" } });
    await waitFor(() => expect(setAuthoringModel).toHaveBeenCalledWith("mock"));
    expect(setAuthoringEndpoint).not.toHaveBeenCalled();
  });

  it("réhydrate la source depuis les réglages (openai + localhost:4000 → LiteLLM sélectionné)", async () => {
    render(
      <SettingsRoot
        api={fakeApi({
          authoringModel: async () => "openai:claude-3-5-sonnet",
          authoringEndpoint: async () => "http://localhost:4000",
        })}
      />,
    );
    await screen.findByText("/home/user/work/iakaframe");
    const select = screen.getByLabelText("Source d'inférence") as HTMLSelectElement;
    expect(select.value).toBe("litellm");
  });

  it("champ clé API masqué (type password) ; « Enregistrer la clé » persiste (setAuthoringApiKey)", async () => {
    const setAuthoringApiKey = vi.fn(async () => {});
    render(<SettingsRoot api={fakeApi({ setAuthoringApiKey })} />);
    await screen.findByText("/home/user/work/iakaframe");
    const input = screen.getByLabelText("Clé API d'authoring (optionnel)") as HTMLInputElement;
    expect(input.type).toBe("password"); // masqué : le secret n'est jamais affiché en clair
    fireEvent.change(input, { target: { value: "sk-secret-litellm" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer la clé/ }));
    await waitFor(() => expect(setAuthoringApiKey).toHaveBeenCalledWith("sk-secret-litellm"));
  });

  it("indique la PRÉSENCE d'une clé sans jamais afficher sa valeur", async () => {
    render(<SettingsRoot api={fakeApi({ authoringApiKey: async () => "sk-super-secret" })} />);
    await screen.findByText("/home/user/work/iakaframe");
    // La valeur du secret n'apparaît nulle part dans le DOM.
    expect(screen.queryByText(/sk-super-secret/)).toBeNull();
    expect(screen.getByText(/Une clé est configurée/)).toBeTruthy();
  });
});

describe("SettingsRoot — endpoint d'authoring optionnel (§ D3)", () => {
  it("affiche l'endpoint configuré quand il est défini", async () => {
    render(<SettingsRoot api={fakeApi({ authoringEndpoint: async () => "http://192.168.2.11:11434" })} />);
    expect(await screen.findByText("http://192.168.2.11:11434")).toBeTruthy();
  });

  it("« Enregistrer l'endpoint » persiste la saisie (setAuthoringEndpoint)", async () => {
    const setAuthoringEndpoint = vi.fn(async () => {});
    render(<SettingsRoot api={fakeApi({ setAuthoringEndpoint })} />);
    await screen.findByText("/home/user/work/iakaframe");
    const input = screen.getByLabelText(/Endpoint \(hôte\) du modèle/);
    fireEvent.change(input, { target: { value: "http://192.168.2.11:11434" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer l'endpoint/ }));
    await waitFor(() =>
      expect(setAuthoringEndpoint).toHaveBeenCalledWith("http://192.168.2.11:11434"),
    );
  });
});

describe("SettingsRoot — section « Mises à jour » (auto-update.md, C4)", () => {
  /** Contrôle de version injecté : la section se teste sans plugin Tauri ni réseau. */
  function fakeUpdate(over: Partial<UseAppUpdate> = {}): UseAppUpdate {
    return {
      status: "idle",
      version: null,
      progressPct: null,
      error: null,
      errorVisible: false,
      check: async () => {},
      install: async () => {},
      dismiss: () => {},
      ...over,
    };
  }

  it("contrôle manuel en échec → message d'erreur VISIBLE à l'écran (C4)", async () => {
    // C4 : « Vérifier les mises à jour » box injoignable doit PARLER — c'est la contrepartie du
    // silence du contrôle au démarrage (C2). L'erreur n'est montrée que si `errorVisible`.
    render(
      <SettingsRoot
        api={fakeApi()}
        update={fakeUpdate({
          status: "error",
          error: "error sending request for url (http://192.168.2.11:3001/…)",
          errorVisible: true,
        })}
      />,
    );
    await screen.findByText("/home/user/work/iakaframe");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Contrôle des mises à jour impossible");
    // La cause est citée telle quelle : un message d'erreur qui ne dit pas pourquoi ne sert à rien.
    expect(alert.textContent).toContain("error sending request for url");
  });
});

describe("SettingsRoot — découverte des modèles /v1/models (Lot 2b)", () => {
  it("source openai → bouton « Découvrir les modèles » ; le dropdown se peuple depuis /v1/models", async () => {
    const llmModels = vi.fn(async () => ({ models: ["claude-3-5-sonnet", "gpt-4o"] }));
    render(
      <SettingsRoot
        api={fakeApi({
          authoringModel: async () => "openai:gpt-4o",
          authoringEndpoint: async () => "http://localhost:4000",
          llmModels,
        })}
      />,
    );
    await screen.findByText("openai:gpt-4o");
    fireEvent.click(screen.getByRole("button", { name: /Découvrir les modèles/ }));
    await waitFor(() => expect(llmModels).toHaveBeenCalledWith("http://localhost:4000", undefined));
    // Le dropdown des modèles découverts apparaît avec les ids rendus.
    const select = await screen.findByLabelText(/Modèle découvert/);
    expect(select).toBeTruthy();
    expect(screen.getByRole("option", { name: "claude-3-5-sonnet" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "gpt-4o" })).toBeTruthy();
  });

  it("source ollama → AUCUN bouton de découverte (modèles non exposés par ce wire)", async () => {
    render(<SettingsRoot api={fakeApi({ authoringModel: async () => "ollama:qwen2.5-coder" })} />);
    await screen.findByText("ollama:qwen2.5-coder");
    expect(screen.queryByRole("button", { name: /Découvrir les modèles/ })).toBeNull();
  });

  it("liste vide + raison → AVEU honnête affiché, saisie manuelle conservée (jamais une fausse liste)", async () => {
    const llmModels = vi.fn(async () => ({ models: [], reason: "endpoint injoignable" }));
    render(
      <SettingsRoot
        api={fakeApi({ authoringModel: async () => "openai:gpt-4o", llmModels })}
      />,
    );
    await screen.findByText("openai:gpt-4o");
    fireEvent.click(screen.getByRole("button", { name: /Découvrir les modèles/ }));
    // L'aveu s'affiche et invite à la saisie manuelle ; aucun dropdown de modèles fabriqué.
    expect(await screen.findByText(/Découverte des modèles indisponible/)).toBeTruthy();
    expect(screen.getByText(/endpoint injoignable/)).toBeTruthy();
    expect(screen.queryByLabelText(/Modèle découvert/)).toBeNull();
    // Le champ de saisie manuelle du modèle reste disponible (repli honnête).
    expect(screen.getByLabelText(/Identifiant ou endpoint du modèle/)).toBeTruthy();
  });

  it("sélection d'un modèle découvert → persiste openai:<id> (préfixe provider conservé)", async () => {
    const setAuthoringModel = vi.fn(async () => {});
    const llmModels = vi.fn(async () => ({ models: ["gpt-4o"] }));
    render(
      <SettingsRoot
        api={fakeApi({
          authoringModel: async () => "openai:gpt-4o",
          setAuthoringModel,
          llmModels,
        })}
      />,
    );
    await screen.findByText("openai:gpt-4o");
    fireEvent.click(screen.getByRole("button", { name: /Découvrir les modèles/ }));
    const select = await screen.findByLabelText(/Modèle découvert/);
    fireEvent.change(select, { target: { value: "gpt-4o" } });
    await waitFor(() => expect(setAuthoringModel).toHaveBeenCalledWith("openai:gpt-4o"));
  });

  it("clé fraîche non enregistrée → transmise à la découverte (override du secret persisté)", async () => {
    const llmModels = vi.fn(async () => ({ models: ["gpt-4o"] }));
    render(
      <SettingsRoot
        api={fakeApi({ authoringModel: async () => "openai:gpt-4o", llmModels })}
      />,
    );
    await screen.findByText("openai:gpt-4o");
    // L'utilisateur saisit une clé mais ne l'enregistre pas : la découverte la passe en override.
    fireEvent.change(screen.getByLabelText("Clé API d'authoring (optionnel)"), {
      target: { value: "sk-fresh" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Découvrir les modèles/ }));
    await waitFor(() => expect(llmModels).toHaveBeenCalledWith("", "sk-fresh"));
  });
});
