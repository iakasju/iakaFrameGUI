import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LearningAtelier } from "./LearningAtelier";
import { useForgeLearning, type LearningApi } from "../../hooks/useForgeLearning";
import type { ReviewProposal } from "../../api/backend";

/** Réservoir fixture : un REGISTRE (auto), un PROFIL (file), un SKILL (structurel), un déjà appliqué. */
const REGISTRE: ReviewProposal = {
  id: "2026-07-16T18-42-27--registre--forgejo",
  type: "memory",
  target: "registre",
  status: "en-attente",
  policy: "auto",
};
const PROFIL: ReviewProposal = {
  id: "2026-07-16T18-42-27--profil--concis",
  type: "memory",
  target: "profil",
  status: "en-attente",
  policy: "file",
};
const SKILL: ReviewProposal = {
  id: "2026-07-16T18-42-27--skill--deploy",
  type: "skill",
  status: "en-attente",
  policy: "file",
};
const APPLIED: ReviewProposal = {
  id: "2026-07-16T10-00-00--registre--old",
  type: "memory",
  target: "registre",
  status: "applique",
  policy: "auto",
};

function makeApi(overrides: Partial<LearningApi> = {}): LearningApi {
  return {
    isTauri: () => true,
    reviewList: vi.fn(async () => ({
      ok: true,
      proposals: [REGISTRE, PROFIL, SKILL, APPLIED],
    })),
    reviewShow: vi.fn(async (id: string) => ({
      ok: true,
      proposal: SKILL,
      text: `# ${id}\n\nquoi / où / pourquoi + artefact`,
    })),
    reviewApply: vi.fn(async (id: string) => ({
      ok: true,
      id,
      type: "memory",
      status: "applique",
      materialize: { kind: "memory", target: "registre", length: 12, cap: 400 },
    })),
    reviewReject: vi.fn(async (id: string) => ({ ok: true, id, type: "skill", status: "rejete" })),
    ...overrides,
  };
}

function Harness({ api }: { api: LearningApi }) {
  const learning = useForgeLearning(api);
  return <LearningAtelier learning={learning} />;
}

describe("LearningAtelier — onglet Apprentissage, pilote de review (U2)", () => {
  it("liste par défaut les propositions EN ATTENTE (pas l'historique appliqué) — Q-4", async () => {
    render(<Harness api={makeApi()} />);
    // en-attente visibles
    expect(await screen.findByText(REGISTRE.id)).toBeTruthy();
    expect(screen.getByText(PROFIL.id)).toBeTruthy();
    expect(screen.getByText(SKILL.id)).toBeTruthy();
    // l'appliqué N'est PAS visible sous le filtre par défaut
    expect(screen.queryByText(APPLIED.id)).toBeNull();
  });

  it("rend VISIBLE le garde de consentement : structurel = « geste humain requis »", async () => {
    render(<Harness api={makeApi()} />);
    await screen.findByText(SKILL.id);
    expect(screen.getByText(/structurel — geste humain requis/)).toBeTruthy();
    // Le REGISTRE auto porte bien le badge « auto-applicable »…
    expect(screen.getByText(/auto-applicable \(REGISTRE\)/)).toBeTruthy();
  });

  it("N'expose AUCUN bouton d'auto-application (garde non contournable — critère 6)", async () => {
    render(<Harness api={makeApi()} />);
    await screen.findByText(SKILL.id);
    // « auto » n'apparaît que comme badge (span), jamais comme bouton actionnable.
    expect(screen.queryByRole("button", { name: /auto/i })).toBeNull();
  });

  it("symétrie +/− : Valider ET Rejeter présents et actifs pour chaque proposition en attente", async () => {
    render(<Harness api={makeApi()} />);
    await screen.findByText(SKILL.id);
    const valider = screen.getAllByRole("button", { name: "Valider" });
    const rejeter = screen.getAllByRole("button", { name: "Rejeter" });
    // 3 propositions en attente → 3 boutons jumeaux de chaque côté, tous activés.
    expect(valider).toHaveLength(3);
    expect(rejeter).toHaveLength(3);
    expect(valider.every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
    expect(rejeter.every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("Valider appelle review apply et restitue le résultat verbatim", async () => {
    const api = makeApi();
    render(<Harness api={api} />);
    await screen.findByText(REGISTRE.id);
    fireEvent.click(screen.getAllByRole("button", { name: "Valider" })[0]);
    await waitFor(() => expect(api.reviewApply).toHaveBeenCalled());
    expect(await screen.findByText(/Appliquée :/)).toBeTruthy();
  });

  it("Rejeter appelle review reject (statut rejete, rien matérialisé)", async () => {
    const api = makeApi();
    render(<Harness api={api} />);
    await screen.findByText(SKILL.id);
    fireEvent.click(screen.getAllByRole("button", { name: "Rejeter" })[0]);
    await waitFor(() => expect(api.reviewReject).toHaveBeenCalled());
    expect(await screen.findByText(/Rejetée :/)).toBeTruthy();
  });

  it("le filtre « Appliquées » montre l'historique (Q-4)", async () => {
    render(<Harness api={makeApi()} />);
    await screen.findByText(REGISTRE.id);
    fireEvent.click(screen.getByRole("tab", { name: "Appliquées" }));
    expect(await screen.findByText(APPLIED.id)).toBeTruthy();
    // Les en-attente disparaissent de la vue filtrée.
    expect(screen.queryByText(PROFIL.id)).toBeNull();
  });

  it("Voir affiche le détail (proposal.md) en lecture seule, sans éditeur (Q-5)", async () => {
    const api = makeApi();
    render(<Harness api={api} />);
    await screen.findByText(SKILL.id);
    fireEvent.click(screen.getAllByRole("button", { name: "Voir" })[0]);
    await waitFor(() => expect(api.reviewShow).toHaveBeenCalled());
    expect(await screen.findByText(/quoi \/ où \/ pourquoi/)).toBeTruthy();
    // Aucune zone d'édition de l'artefact (Q-5) : le détail est un <pre>, pas un textarea.
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("dégradation propre hors Tauri : état vide lisible, aucune I/O review (critère 9)", async () => {
    const api = makeApi({ isTauri: () => false });
    render(<Harness api={api} />);
    expect(await screen.findByText(/Hors contexte forge/)).toBeTruthy();
    expect(api.reviewList).not.toHaveBeenCalled();
  });

  // --- États explicites : vide / chargement / erreur (lot « apprentissage n'affiche rien ») ---

  it("état VIDE : 0 proposition → message franc + explication de la page (jamais un blanc)", async () => {
    const api = makeApi({ reviewList: vi.fn(async () => ({ ok: true, proposals: [] })) });
    render(<Harness api={api} />);
    // Message franc (l'absence n'est pas une panne)…
    expect(await screen.findByText(/Aucune proposition en attente/)).toBeTruthy();
    // …+ une phrase qui dit ce QU'EST la page (réservoir de review, geste humain).
    expect(screen.getByText(/de nouvelles propositions apparaîtront ici/i)).toBeTruthy();
  });

  it("état de CHARGEMENT : affiche « Chargement des propositions… » tant que le pilote n'a pas répondu", async () => {
    let resolveList!: (v: { ok: boolean; proposals: ReviewProposal[] }) => void;
    const pending = new Promise<{ ok: boolean; proposals: ReviewProposal[] }>((r) => {
      resolveList = r;
    });
    const api = makeApi({ reviewList: vi.fn(() => pending) });
    render(<Harness api={api} />);
    // Pendant l'attente : feedback explicite, pas l'état vide prématuré.
    expect(await screen.findByText(/Chargement des propositions/)).toBeTruthy();
    expect(screen.queryByText(/Aucune proposition/)).toBeNull();
    // À la réponse (vide) : le chargement laisse place à l'état vide franc.
    resolveList({ ok: true, proposals: [] });
    await waitFor(() => expect(screen.queryByText(/Chargement des propositions/)).toBeNull());
    expect(await screen.findByText(/Aucune proposition en attente/)).toBeTruthy();
  });

  it("état d'ERREUR : le pilote rejette → aveu honnête clair (aucun blanc, aucune stack)", async () => {
    const api = makeApi({
      reviewList: vi.fn(async () => {
        throw new Error("iakaframe introuvable (PATH)");
      }),
    });
    render(<Harness api={api} />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Impossible de charger le réservoir/);
    // Le message brut du pilote est relayé verbatim (pas noyé).
    expect(alert.textContent).toMatch(/iakaframe introuvable \(PATH\)/);
  });

  it("NON-RÉGRESSION : la liste s'affiche toujours quand il Y A une proposition en attente", async () => {
    const STUB: ReviewProposal = {
      id: "2026-07-27T09-00-00--registre--stub",
      type: "memory",
      target: "registre",
      status: "en-attente",
      policy: "auto",
    };
    const api = makeApi({ reviewList: vi.fn(async () => ({ ok: true, proposals: [STUB] })) });
    render(<Harness api={api} />);
    expect(await screen.findByText(STUB.id)).toBeTruthy();
    // Ni état vide, ni chargement résiduel quand il y a de la matière.
    expect(screen.queryByText(/Aucune proposition/)).toBeNull();
    expect(screen.queryByText(/Chargement des propositions/)).toBeNull();
  });
});
