import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { parseFrontmatter, parsePersona, type Persona } from "@iakaframe/core";
import { PersonaReservoir } from "./PersonaReservoir";
import { persistPersona } from "./personaPersist";
import type { Backend } from "../api/backend";
import { BACKEND_UNAVAILABLE_MSG } from "../api/backend";
import { NO_AUTHORING_MODEL_HINT } from "./mock/copilote";
import { FEANOR_NO_REPLY_PREFIX } from "./FeanorHead";

// Repli hors-ligne DÉTERMINISTE : aucune persona réelle → le composant garde le gabarit canonique.
// (Évite un appel réel à loadFrame en test ; prouve le chemin de repli des tests structurels du Lot 3.)
const offline = () => Promise.resolve<Persona[]>([]);

describe("PersonaReservoir — écran réservoir + fiche (Lot 3, A3)", () => {
  // 10 fiches depuis la scission du squad prod (canon 0.39.0) : le gabarit compte 10 personas.
  it("rend une grille de 10 fiches à vignettes (repli gabarit hors-ligne)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    const grid = document.querySelector(".persona-reservoir .pgrid") as HTMLElement;
    expect(grid).not.toBeNull();
    const cards = grid.querySelectorAll(":scope > .pcard");
    expect(cards.length).toBe(10);
    // Chaque fiche porte une vignette (initiales) et un badge dérivés — GUI-only.
    for (const name of ["Odin", "Gimli", "Fëanor"]) {
      expect(screen.getByLabelText(`Ouvrir la fiche de ${name}`)).toBeTruthy();
    }
  });

  it("sélectionner une fiche → mode ÉDITION (l'éditeur de persona, pastille ✎ édition)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gimli"));
    // La pastille de mode signale l'édition, cohérente avec le pattern du Lot 2.
    expect(screen.getByText("✎ édition")).toBeTruthy();
    // L'éditeur réutilisé est monté, pré-rempli avec la persona choisie.
    expect(screen.getByRole("heading", { name: "Éditer la persona" })).toBeTruthy();
    const nameInput = screen.getByPlaceholderText(/Aragorn, ou un nom choisi/) as HTMLInputElement;
    expect(nameInput.value).toBe("Gimli");
  });

  it("« Nouvelle persona » → mode CRÉATION (même composant, pastille ✚ création)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByRole("button", { name: /Nouvelle persona/ }));
    expect(screen.getByText("✚ création")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nouvelle persona" })).toBeTruthy();
  });

  it("revenir au réservoir depuis la fiche (fil d'Ariane)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gandalf"));
    expect(screen.getByText("✎ édition")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "library" }));
    // De retour sur la grille : les 10 fiches sont là.
    const grid = document.querySelector(".persona-reservoir .pgrid") as HTMLElement;
    expect(grid.querySelectorAll(":scope > .pcard").length).toBe(10);
  });

  it("éditer puis enregistrer met à jour la fiche dans le réservoir (état de session)", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Loki"));
    const nameInput = screen.getByPlaceholderText(/Aragorn, ou un nom choisi/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Loki le Malin" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    // De retour sur la grille, la fiche reflète le nouveau nom (id stable → même carte).
    const card = screen.getByLabelText("Ouvrir la fiche de Loki le Malin");
    expect(within(card).getByText("Loki le Malin")).toBeTruthy();
  });

  it("Fëanor-en-tête (Lot 6) : ABSENT sur la grille, PRÉSENT en édition ET en création", () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    // Sur la grille (ni création ni édition) → pas de Fëanor-en-tête.
    expect(document.querySelector(".feanor-head")).toBeNull();

    // Sélection d'une fiche → mode édition → Fëanor se glisse en tête.
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gandalf"));
    const headEdit = document.querySelector(".feanor-head") as HTMLElement;
    expect(headEdit).not.toBeNull();
    expect(within(headEdit).getByText(/Fëanor édite cet élément/)).toBeTruthy();
    // L'entité éditée est bien Gandalf (vignette GA).
    expect(headEdit.querySelector(".fh-vg")?.textContent).toBe("GA");

    // Retour grille → Fëanor disparaît (jamais en lecture seule).
    fireEvent.click(screen.getByRole("button", { name: "library" }));
    expect(document.querySelector(".feanor-head")).toBeNull();

    // « Nouvelle persona » → mode création → Fëanor présent (placeholder honnête).
    fireEvent.click(screen.getByRole("button", { name: /Nouvelle persona/ }));
    const headCreate = document.querySelector(".feanor-head") as HTMLElement;
    expect(headCreate).not.toBeNull();
    expect(within(headCreate).getByText(/Fëanor façonne cet élément/)).toBeTruthy();
    expect(within(headCreate).getByText("Nouvelle persona")).toBeTruthy();
  });

  it("Fëanor-en-tête : branché mais SANS modèle (hors Tauri) — envoyer n'invente aucune réponse d'IA", async () => {
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gimli"));
    // Aucun modèle configuré hors Tauri → l'absence est signalée honnêtement (jamais masquée).
    expect(screen.getByText(NO_AUTHORING_MODEL_HINT)).toBeTruthy();
    // Un envoi ne fabrique JAMAIS de réponse de Fëanor : aveu honnête, aucune zone de réponse.
    fireEvent.change(screen.getByLabelText(/Demander à Fëanor/), { target: { value: "conseille" } });
    fireEvent.click(screen.getByLabelText(/Envoyer à Fëanor/));
    await waitFor(() => expect(screen.getByText(new RegExp(FEANOR_NO_REPLY_PREFIX))).toBeTruthy());
    expect(document.querySelector(".fh-reply")).toBeNull();
  });

  it("consomme les personas RÉELLES du frame : royaume IAKAFRAME (pas DEV) + ligne de mission", async () => {
    const real: Persona[] = [
      parsePersona({
        id: "gimli",
        name: "Gimli",
        roleKey: "dev",
        royaume: "IAKAFRAME",
        pastille: "🔴",
        skills: ["iakaframe-fabrication"],
        guardrails: ["identity", "perimeter"],
        mission: "Implémente l'instruction validée, builde et commite, jusqu'au staging.",
      })!,
      parsePersona({
        id: "feanor",
        name: "Fëanor",
        roleKey: "frame",
        royaume: "FRAME",
        pastille: "🟠",
        skills: ["iakaframe-frame"],
        guardrails: ["identity", "perimeter"],
        mission: "Aide à forger une frame neuve, from scratch.",
      })!,
    ];
    render(<PersonaReservoir loadReservoir={() => Promise.resolve(real)} />);

    // Chargement asynchrone des personas réelles → la fiche Gimli remplace le gabarit.
    const gimli = await screen.findByLabelText("Ouvrir la fiche de Gimli");
    // La vraie cause du bug est corrigée : badge [IAKAFRAME][Gimli], jamais [DEV][Gimli].
    expect(within(gimli).getByText("[IAKAFRAME][Gimli]")).toBeTruthy();
    expect(within(gimli).queryByText("[DEV][Gimli]")).toBeNull();
    expect(within(gimli).getByText("IAKAFRAME")).toBeTruthy();
    // Ligne de mission surfacée, skill et garde réels.
    expect(
      within(gimli).getByText(/Implémente l'instruction validée, builde et commite/),
    ).toBeTruthy();
    expect(within(gimli).getByText("iakaframe-fabrication")).toBeTruthy();
    expect(within(gimli).getByText("⛨ perimeter")).toBeTruthy();
    // Royaume RÉEL hétérogène : Fëanor = FRAME (jamais roleKey.toUpperCase()).
    const feanor = screen.getByLabelText("Ouvrir la fiche de Fëanor");
    expect(within(feanor).getByText("[FRAME][Fëanor]")).toBeTruthy();
  });
});

// --- Lot 5a : persistance disque du pilote persona (persistance-disque-authoring-elements.md) ---

// Un `.md` persona réaliste PORTANT une `description` non modélisée (blurb de déclenchement du
// sous-agent, load-bearing) + un corps — pour prouver la préservation à l'édition.
const GIMLI_MD =
  "---\n" +
  "id: gimli\n" +
  "name: Gimli\n" +
  "description: Blurb load-bearing de déclenchement du sous-agent — NE DOIT PAS être jeté.\n" +
  "mission: Implémente l'instruction validée.\n" +
  "roleKey: dev\n" +
  "royaume: IAKAFRAME\n" +
  'pastille: "🔴"\n' +
  "skills: [iakaframe-fabrication]\n" +
  "guardrails: [identity, perimeter]\n" +
  "vignette: none\n" +
  "---\n\n# ⚒️ Gimli\n\n> le forgeron\n";

describe("PersonaReservoir — persistance disque du pilote persona (Lot 5a)", () => {
  it("ÉDITION : `persistPersona` patche NON-DESTRUCTIVEMENT (description/corps préservés) puis `poolWrite`", async () => {
    let written: { poolType: string; id: string; text: string } | null = null;
    const api = {
      poolRead: async (poolType: string, id: string) =>
        poolType === "personas" && id === "gimli" ? GIMLI_MD : null,
      poolWrite: async (poolType: string, id: string, text: string) => {
        written = { poolType, id, text };
      },
    } as unknown as Backend;

    const persona = parsePersona(parseFrontmatter(GIMLI_MD).data)!;
    await persistPersona({ ...persona, royaume: "NAINS" }, api);

    expect(written).not.toBeNull();
    const w = written!;
    expect(w.poolType).toBe("personas");
    expect(w.id).toBe("gimli"); // id verrouillé (C-1)
    const after = parseFrontmatter(w.text).data;
    // Le champ édité a bougé…
    expect(after.royaume).toBe("NAINS");
    // …mais la description non modélisée + vignette + corps sont préservés À L'OCTET.
    expect(after.description).toBe(
      "Blurb load-bearing de déclenchement du sous-agent — NE DOIT PAS être jeté.",
    );
    expect(after.vignette).toBe("none");
    expect(w.text).toContain("# ⚒️ Gimli");
    expect(w.text).toContain("> le forgeron");
  });

  it("CRÉATION : fichier absent → `serializePersonaMd` canonique via `poolWrite`", async () => {
    let written: { id: string; text: string } | null = null;
    const api = {
      poolRead: async () => null, // aucun fichier existant → création
      poolWrite: async (_poolType: string, id: string, text: string) => {
        written = { id, text };
      },
    } as unknown as Backend;

    const fresh: Persona = {
      id: "samwise",
      name: "Samwise",
      roleKey: "dev",
      royaume: "SHIRE",
      roleIndex: 0,
      skills: [],
      guardrails: [],
    };
    await persistPersona(fresh, api);

    expect(written).not.toBeNull();
    expect(written!.id).toBe("samwise");
    expect(written!.text).toContain("id: samwise");
    expect(written!.text).toContain("royaume: SHIRE");
    expect(written!.text).not.toContain("roleIndex");
  });

  it("Enregistrer → écrit via `persist` puis RÉCONCILIE depuis le disque (relecture)", async () => {
    const calls: Persona[] = [];
    // Après écriture, la relecture disque rend la persona ÉDITÉE (mission changée) → réconciliation.
    const reloaded: Persona[] = [
      parsePersona({
        id: "loki",
        name: "Loki",
        roleKey: "design",
        royaume: "IAKAFRAME",
        skills: [],
        guardrails: [],
        mission: "Mission rechargée du disque.",
      })!,
    ];
    let loadCount = 0;
    const loadReservoir = () => {
      loadCount += 1;
      // 1er chargement = amorçage (repli []) ; après écriture = la vue disque réconciliée.
      return Promise.resolve<Persona[]>(loadCount === 1 ? [] : reloaded);
    };
    const persist = async (p: Persona) => {
      calls.push(p);
    };

    render(<PersonaReservoir loadReservoir={loadReservoir} persist={persist} />);
    fireEvent.click(await screen.findByRole("button", { name: /Nouvelle persona/ }));
    fireEvent.change(screen.getByPlaceholderText(/Aragorn, ou un nom choisi/), {
      target: { value: "Loki" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Créer la persona/ }));

    // `persist` a été appelé (écriture disque), puis la grille reflète la RELECTURE disque.
    await waitFor(() => expect(calls.length).toBe(1));
    const card = await screen.findByLabelText("Ouvrir la fiche de Loki");
    expect(within(card).getByText(/Mission rechargée du disque/)).toBeTruthy();
  });

  it("ÉCHEC de persistance (hors Tauri) → dégrade proprement : message clair + édition en session", async () => {
    const offline = () => Promise.resolve<Persona[]>([]);
    // `persist` par défaut = backend réel → hors Tauri, rejette avec BACKEND_UNAVAILABLE_MSG.
    render(<PersonaReservoir loadReservoir={offline} />);
    fireEvent.click(screen.getByLabelText("Ouvrir la fiche de Gimli"));
    fireEvent.change(screen.getByPlaceholderText(/Aragorn, ou un nom choisi/), {
      target: { value: "Gimli le Forgeron" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    // L'édition optimiste survit (jamais perdue)…
    expect(screen.getByLabelText("Ouvrir la fiche de Gimli le Forgeron")).toBeTruthy();
    // …et l'échec est signalé par un message clair (jamais une stack).
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(BACKEND_UNAVAILABLE_MSG),
    );
  });
});
