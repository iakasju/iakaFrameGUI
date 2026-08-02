/**
 * LiaisonPanel.test.tsx — critères d'acceptation **Q-3** côté **rendu** : le champ modèle devient
 * une **liste déroulante alimentée par la découverte du nœud**, qui **reste librement éditable**,
 * et l'échec de découverte est **avoué tel quel**.
 *
 * Couvre : AC-Q3-5 (les 3 raisons de `llm_models` produisent le MÊME rendu), AC-Q3-8 (champs
 * pré-remplis mais éditables ; rien avant la coche), AC-Q3-11 (plus aucun nom de modèle en dur —
 * le `placeholder` `"ex. qwen2.5-coder:14b"` a disparu).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  buildTeamFromRoster,
  defaultBindingForNode,
  prefilledBindingForNode,
  type Binding,
  type NodeKind,
  type Team,
} from "@iakaframe/core";
import { LiaisonPanel } from "./LiaisonPanel";

/** Les **trois** aveux réels de `llm_models` (`llm.rs:633`, `:662`, `:673`). */
const REASONS = [
  "hote refuse (hors allow-list localhost + endpoint regle) : http://192.168.2.11:11434",
  "modeles indisponibles (endpoint injoignable) : error sending request",
  "aucun modele expose par la source",
];

const CAS_B = ["qwen2.5-coder:7b", "qwen3-vl:8b", "qwen3:8b"];

function team(): Team {
  return buildTeamFromRoster("Ma team", "ma-team");
}

function renderPanel(opts: {
  node: NodeKind;
  binding: Binding | null;
  models?: string[];
  reason?: string | null;
  onSetModel?: (personaId: string, model: string) => void;
}) {
  const t = team();
  const utils = render(
    <LiaisonPanel
      node={opts.node}
      team={t}
      binding={opts.binding}
      discoveredModels={opts.models ?? []}
      discoveryReason={opts.reason ?? null}
      discovering={false}
      onEnable={() => {}}
      onClear={() => {}}
      onSetRunner={() => {}}
      onSetModel={opts.onSetModel ?? (() => {})}
    />,
  );
  return { ...utils, team: t };
}

/** Le champ modèle d'une persona (par son nom d'affichage). */
function champModele(name: string): HTMLInputElement {
  return screen.getByLabelText(`Modèle de ${name}`) as HTMLInputElement;
}

describe("LiaisonPanel — Q-3 : liste déroulante découverte, toujours éditable", () => {
  it("le champ modèle est relié à un `datalist` peuplé par la découverte du nœud", () => {
    const t = team();
    renderPanel({
      node: "ollama-localhost",
      binding: prefilledBindingForNode(t, "ollama-localhost", CAS_B),
      models: CAS_B,
    });
    const input = champModele("Gimli");
    const listId = input.getAttribute("list");
    expect(listId).toBeTruthy();
    const datalist = document.getElementById(listId!) as HTMLDataListElement;
    expect(datalist).toBeTruthy();
    expect([...datalist.options].map((o) => o.value)).toEqual(CAS_B);
  });

  it("AC-Q3-8 — les champs sont pré-remplis par rôle et restent ÉDITABLES (saisie libre)", () => {
    const t = team();
    const onSetModel = vi.fn();
    renderPanel({
      node: "ollama-localhost",
      binding: prefilledBindingForNode(t, "ollama-localhost", CAS_B),
      models: CAS_B,
      onSetModel,
    });
    // Pré-remplissage par rôle : Gimli porte `dev`, Loki `design`, Nathalie `documentation`.
    expect(champModele("Gimli").value).toBe("qwen2.5-coder:7b");
    expect(champModele("Loki").value).toBe("qwen3-vl:8b");
    expect(champModele("Nathalie").value).toBe("qwen3:8b");

    // Toujours un `input` (jamais un `select` fermé) → une valeur hors liste reste saisissable.
    const input = champModele("Gimli");
    expect(input.tagName).toBe("INPUT");
    expect(input.disabled).toBe(false);
    expect(input.readOnly).toBe(false);
    fireEvent.change(input, { target: { value: "un-modele-hors-liste" } });
    expect(onSetModel).toHaveBeenCalledWith("gimli", "un-modele-hors-liste");
  });

  it("AC-Q3-8 — tant que la liaison n'est pas cochée, aucun champ modèle n'est rendu", () => {
    renderPanel({ node: "ollama-localhost", binding: null, models: CAS_B });
    expect(screen.queryByLabelText("Modèle de Gimli")).toBeNull();
    expect((screen.getByLabelText("Lier ce kit") as HTMLInputElement).checked).toBe(false);
  });

  it("AC-Q3-5 — les TROIS raisons produisent le même rendu, et sont affichées TELLES QUELLES", () => {
    const t = team();
    const rendus: string[] = [];
    for (const reason of REASONS) {
      const { container, unmount } = renderPanel({
        node: "ollama-localhost",
        binding: defaultBindingForNode(t, "ollama-localhost"),
        models: [],
        reason,
      });
      // La raison du nœud apparaît VERBATIM.
      expect(screen.getByText(new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeTruthy();
      // Liste déroulante VIDE (jamais une fausse liste) et saisie manuelle conservée.
      const input = champModele("Gimli");
      expect(input.value).toBe("");
      expect(input.disabled).toBe(false);
      const datalist = document.getElementById(input.getAttribute("list")!) as HTMLDataListElement;
      expect(datalist.options).toHaveLength(0);
      // Empreinte du rendu, raison neutralisée : les trois doivent être identiques.
      rendus.push(container.innerHTML.replace(reason, "«RAISON»"));
      unmount();
    }
    expect(new Set(rendus).size).toBe(1);
  });

  it("AC-Q3-5 — sur ollama-lan, l'aveu mentionne le contournement documenté (T-2, § 7)", () => {
    const t = team();
    renderPanel({
      node: "ollama-lan",
      binding: defaultBindingForNode(t, "ollama-lan"),
      models: [],
      reason: REASONS[0],
    });
    expect(screen.getByText(/endpoint d'authoring/i)).toBeTruthy();
  });

  it("AC-Q3-11 — aucun nom de modèle en dur : le placeholder `ex. qwen2.5-coder:14b` a DISPARU", () => {
    const t = team();
    const { container } = renderPanel({
      node: "ollama-localhost",
      binding: defaultBindingForNode(t, "ollama-localhost"),
      models: [],
    });
    expect(container.innerHTML).not.toContain("qwen");
    expect(screen.queryByPlaceholderText("ex. qwen2.5-coder:14b")).toBeNull();
    // Le placeholder subsistant ne porte ni tag (`:`) ni nom d'éditeur — il dit seulement l'origine.
    const ph = champModele("Gimli").getAttribute("placeholder") ?? "";
    expect(ph.length).toBeGreaterThan(0);
    expect(ph).not.toMatch(/:\s*\d|qwen|llama|mistral|gemma|deepseek|phi|gpt/i);
  });

  it("sur un nœud sans découverte (codex), le modèle reste en saisie libre, sans fausse promesse", () => {
    const t = team();
    renderPanel({ node: "codex", binding: defaultBindingForNode(t, "codex"), models: [] });
    const input = champModele("Gimli");
    expect(input.value).toBe("");
    expect(input.getAttribute("placeholder")).toContain("aucune découverte");
    expect(screen.getAllByText("modèle requis")).toHaveLength(t.personas.length);
  });

  it("l'avertissement non bloquant « modèle requis » disparaît dès que le champ est pourvu", () => {
    const t = team();
    const { rerender } = render(
      <LiaisonPanel
        node="ollama-localhost"
        team={t}
        binding={defaultBindingForNode(t, "ollama-localhost")}
        discoveredModels={[]}
        discoveryReason={null}
        discovering={false}
        onEnable={() => {}}
        onClear={() => {}}
        onSetRunner={() => {}}
        onSetModel={() => {}}
      />,
    );
    expect(screen.getAllByText("modèle requis")).toHaveLength(t.personas.length);
    rerender(
      <LiaisonPanel
        node="ollama-localhost"
        team={t}
        binding={prefilledBindingForNode(t, "ollama-localhost", CAS_B)}
        discoveredModels={CAS_B}
        discoveryReason={null}
        discovering={false}
        onEnable={() => {}}
        onClear={() => {}}
        onSetRunner={() => {}}
        onSetModel={() => {}}
      />,
    );
    expect(screen.queryAllByText("modèle requis")).toHaveLength(0);
  });

  it("découverte en cours : l'état est dit, sans jamais prétendre à une liste", () => {
    const t = team();
    render(
      <LiaisonPanel
        node="ollama-localhost"
        team={t}
        binding={defaultBindingForNode(t, "ollama-localhost")}
        discoveredModels={[]}
        discoveryReason={null}
        discovering
        onEnable={() => {}}
        onClear={() => {}}
        onSetRunner={() => {}}
        onSetModel={() => {}}
      />,
    );
    expect(screen.getByText(/Découverte des modèles au nœud/)).toBeTruthy();
  });
});
