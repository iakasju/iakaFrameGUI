/**
 * identity.test.ts — l'identité du copilote est **dérivée du canon**, jamais fabriquée.
 *
 * Couvre les AC de `specs/instructions/feanor-copilote-du-gui.md` :
 *   AC-1  `buildSystemPrompt()` sans identité = chaîne anonyme **byte-identique** (non-régression).
 *   AC-2  avec identité : nom, description et charte **verbatim** de la fiche canon (golden).
 *   AC-3  fiche absente / racine introuvable → `null`, aucune identité de substitution.
 *
 * La fixture `persona.feanor.md` est une **copie conforme** de `library/personas/feanor.md`
 * (vérifiée byte-à-byte au versement) : la modifier côté canon doit faire **rougir** ces tests.
 */
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./prompt";
import { loadCopiloteIdentity, copiloteBadgeOpen, copiloteBadgeClose } from "./identity";
import type { Backend } from "../../api/backend";
import feanorMd from "../__fixtures__/persona.feanor.md?raw";

/** Backend simulé : `poolReadAll("personas")` rend les fiches passées. */
function fakeApi(personas: string[]): Backend {
  return {
    poolReadAll: async (type: string) => (type === "personas" ? personas : []),
  } as unknown as Backend;
}

/** Backend en échec (hors Tauri / racine introuvable) : `poolReadAll` rejette. */
function brokenApi(): Backend {
  return {
    poolReadAll: async () => {
      throw new Error("racine introuvable");
    },
  } as unknown as Backend;
}

const autrePersona = `---
id: gimli
name: Gimli
roleKey: dev
royaume: TERRE
---
# Gimli
`;

describe("identité du copilote — dérivée du canon (I-1)", () => {
  it("AC-2 : trouve la persona par RÔLE (`frame`), pas par nom", async () => {
    const found = await loadCopiloteIdentity(fakeApi([autrePersona, feanorMd]));
    expect(found).not.toBeNull();
    expect(found?.persona.roleKey).toBe("frame");
    expect(found?.persona.name).toBe("Fëanor");
    expect(found?.persona.royaume).toBe("FRAME");
    expect(found?.persona.pastille).toBe("🟠");
  });

  it("AC-2 : la charte est le corps VERBATIM de la fiche (aucune paraphrase)", async () => {
    const found = await loadCopiloteIdentity(fakeApi([feanorMd]));
    // Le corps de la fiche canon commence après le frontmatter : on vérifie qu'il est repris tel quel.
    const corpsCanon = feanorMd.split("---\n").slice(2).join("---\n");
    expect(found?.charter).toBe(corpsCanon);
  });

  it("AC-3 : aucune fiche du rôle `frame` → null (jamais d'identité de substitution)", async () => {
    expect(await loadCopiloteIdentity(fakeApi([autrePersona]))).toBeNull();
  });

  it("AC-3 : racine introuvable (backend en échec) → null, sans exception", async () => {
    await expect(loadCopiloteIdentity(brokenApi())).resolves.toBeNull();
  });

  it("AC-3 : pool vide → null", async () => {
    expect(await loadCopiloteIdentity(fakeApi([]))).toBeNull();
  });
});

describe("badges — la POSITION de la pastille porte le sens", () => {
  it("ouverture = pastille AVANT le bloc ; clôture = pastille APRÈS", async () => {
    const identity = await loadCopiloteIdentity(fakeApi([feanorMd]));
    expect(identity).not.toBeNull();
    expect(copiloteBadgeOpen(identity!)).toBe("🟠 [FRAME][Fëanor]");
    expect(copiloteBadgeClose(identity!)).toBe("[FRAME][Fëanor] 🟠");
  });

  it("pastille non déclarée → badge sans emoji (jamais de pastille inventée)", () => {
    const sans = {
      persona: {
        id: "x",
        name: "X",
        roleKey: "frame",
        royaume: "FRAME",
        roleIndex: 8,
        skills: [],
        guardrails: [],
      },
      charter: "",
    };
    expect(copiloteBadgeOpen(sans)).toBe("[FRAME][X]");
    expect(copiloteBadgeClose(sans)).toBe("[FRAME][X]");
  });
});

describe("prompt système — identité injectée (moule P7/P6b)", () => {
  /** Le prompt anonyme historique, figé ici : toute dérive le fait rougir. */
  const ANONYME_ATTENDU = [
    "Tu es le copilote d'AUTHORING de la forge iakaframe (build-time).",
    "Ton rôle : à partir d'une intention, PROPOSER quels artefacts (sous-éléments) matérialiser,",
    "en te limitant STRICTEMENT au réservoir d'ids fourni.",
    "",
    "Réponds UNIQUEMENT par un objet JSON conforme au schéma imposé (aucun texte hors JSON) :",
    '  - "intro" : une phrase d\'introduction courte (français).',
    '  - "artefacts" : la liste lisible de ce que tu proposes (icon/tag/title/detail).',
    '  - "ops" : les opérations de matérialisation { target, id, label } ; `target` DOIT venir',
    "    des cibles fournies et `id` DOIT appartenir au réservoir de cette cible. Rien d'autre.",
    "",
    "FRONTIÈRE ABSOLUE authoring ≠ exécution : tu ne proposes JAMAIS de runner d'EXÉCUTION,",
    "de modèle d'exécution, ni de Binding d'exécution. Tu ne nommes aucun moteur LLM d'exécution.",
    "Tu ne fais que composer la CHARTE d'un élément (quels sous-éléments insérer).",
  ].join("\n");

  it("AC-1 : sans identité → byte-identique à l'historique (non-régression PROUVÉE)", () => {
    expect(buildSystemPrompt()).toBe(ANONYME_ATTENDU);
    expect(buildSystemPrompt(null)).toBe(ANONYME_ATTENDU);
  });

  it("AC-2 : avec identité → nom, badge et charte verbatim du canon", async () => {
    const identity = await loadCopiloteIdentity(fakeApi([feanorMd]));
    const prompt = buildSystemPrompt(identity);

    expect(prompt).toContain("Tu es Fëanor, 🟠 [FRAME][Fëanor]");
    expect(prompt).toContain(identity!.charter.trim());
    // La description canon (activation explicite, frontière infra) arrive par la charte/fiche.
    expect(prompt).toContain("Ta charte");
  });

  it("I-3/I-6 : le contrat technique est IDENTIQUE avec et sans identité", async () => {
    const identity = await loadCopiloteIdentity(fakeApi([feanorMd]));
    const technique = [
      "Réponds UNIQUEMENT par un objet JSON conforme au schéma imposé (aucun texte hors JSON) :",
      "FRONTIÈRE ABSOLUE authoring ≠ exécution",
      "Tu ne fais que composer la CHARTE d'un élément (quels sous-éléments insérer).",
    ];
    for (const bloc of technique) {
      expect(buildSystemPrompt()).toContain(bloc);
      expect(buildSystemPrompt(identity)).toContain(bloc);
    }
  });
});
