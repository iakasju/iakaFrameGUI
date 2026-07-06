/**
 * openwebui.ts — **adaptateur de runner Open WebUI** (P3c) : 5e nœud, 3e format de kit.
 *
 * Open WebUI n'importe pas un contrat markdown unique (`CLAUDE.md`/`AGENTS.md`) mais des
 * **Models JSON** (*Workspace > Models*), **un par persona** (`models/<personaId>.json`). Comme
 * codex/ollama, ce nœud **n'a pas de hooks** → le canal d'identité et les gardes s'embarquent en
 * **prose** dans le **system prompt** du Model (`params.system`), via le rendu `prose` du
 * catalogue de gardes **déjà en place (P3b)** — **texte jamais réécrit** (fidélité au hook).
 *
 * Invariants tenus (§ 6 instruction) :
 *  - **Zéro modèle fixé (AR-1)** : `base_model_id = ""` (placeholder documenté dans
 *    `meta.description`) ; **aucun** paramètre d'inférence (`temperature`/`num_ctx`/…) ; aucun
 *    tag de modèle. Seul `params.system` est peuplé. La forge décrit un **persona/rôle**, jamais
 *    un moteur (le couple runner/modèle est run-time, côté cockpit).
 *  - **Déterminisme** : personas triées par `roleIndex` puis `id` ; **timestamps constants**.
 *  - **JSON valide** : chaque Model est `JSON.parse`-able et conforme à la forme des gabarits
 *    `iakaframe/kit-openwebui/models/*.json`.
 *  - **Pas de `.mcp.json`** (Q-4) : Open WebUI n'a pas de mécanisme MCP natif (Tools/Functions/
 *    Pipelines hors MVP) → les connecteurs de team sont **ignorés** pour ce nœud (notés en prose).
 */

import { guardrailByKind, type Guardrail } from "../guardrail";
import type { Persona } from "../persona";
import { personaBadge } from "../persona";
import { roleLabel } from "../roles";
import type { Team } from "../team";
import type { KitFileTree } from "./types";

/**
 * Timestamp **constant** (déterminisme) — même valeur que les gabarits in-repo
 * `kit-openwebui/models/*.json`. Jamais `Date.now()` (l'arbre doit être reproductible).
 */
const CONSTANT_TIMESTAMP = 1_750_000_000;

/** Forme d'un **Model Open WebUI** importable (sous-ensemble minimal des gabarits — Q-5). */
export interface OpenWebUIModel {
  /** Slug du Model = `persona.id`. */
  id: string;
  /** Modèle de base **NON fixé** (AR-1) : vide, réglé à l'import par l'utilisateur. */
  base_model_id: "";
  /** Nom affiché = `persona.name` (nommage libre). */
  name: string;
  /** Paramètres du Model : **uniquement** le system prompt (aucun paramètre d'inférence). */
  params: { system: string };
  /** Métadonnées minimales (description + capabilities neutres + tags). */
  meta: {
    description: string;
    capabilities: { vision: boolean; usage: boolean; citations: boolean };
    tags: { name: string }[];
  };
  /** ACL : `null` (comme les gabarits). */
  access_control: null;
  /** Model actif. */
  is_active: true;
  /** Timestamps constants (déterminisme). */
  created_at: number;
  updated_at: number;
}

/** Tri déterministe des personas : rôle (casting) puis id (stabilité) — cf. P3b. */
function byRoleThenId(a: Persona, b: Persona): number {
  return a.roleIndex - b.roleIndex || a.id.localeCompare(b.id);
}

/** Replie les diacritiques pour un champ **ASCII** (comme les `meta.description` des gabarits). */
function asciiFold(value: string): string {
  // Plage des marques diacritiques combinantes (identique à `slugify` de persona.ts).
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Mission courte **dérivée du rôle** (jamais d'un nom de code — O-11). Le libellé provient de
 * `roleLabel` (source canonique) ; la phrase reste minimale et factuelle. Rôle hors-liste →
 * repli sur le libellé seul.
 */
function roleMission(roleKey: string): string {
  const missions: Record<string, string> = {
    portefeuille:
      "Vue d'ensemble du portefeuille : arbitrages, priorités, bascule de projet.",
    coordination:
      "Coordination (chef de projet) : répartir le travail, tenir le fil, ne pas coder à la place des rôles.",
    architecture:
      "Cadrer un besoin en instruction fermée et vérifiable (`specs/instructions/<feature>.md`) — avant tout code.",
    fabrication:
      "Implémenter l'instruction validée, builder, commiter atomiquement, jusqu'au staging.",
    tests:
      "Gate qualité indépendant : typecheck, lint, tests — verdict pass/fail, jamais d'auto-validation.",
    graphisme: "Design on-brand, cohérence visuelle.",
    doc: "Guides et documentation, en français.",
  };
  return missions[roleKey] ?? `Rôle ${roleLabel(roleKey)}.`;
}

/**
 * Rend une garde de méthode en **section de prose** (heading + body), depuis le rendu `prose`
 * du catalogue partagé (P3b) — **texte non réécrit**. `null` si la garde n'a pas de prose.
 */
function guardSection(g: Guardrail | undefined): string | null {
  const p = g?.rendering.prose;
  return p ? `## ${p.heading}\n\n${p.body}` : null;
}

/**
 * Compose le **system prompt** d'un Model : rôle + mission + **rituel d'identité en prose** +
 * **garde de périmètre en prose** (les deux réutilisés **verbatim** du catalogue de gardes,
 * mêmes règles que le hook — fidélité O-5). Aucun modèle, aucun paramètre d'inférence.
 */
function buildSystemPrompt(persona: Persona): string {
  const sections: (string | null)[] = [
    `Tu es **${persona.name}** — persona du rôle **${roleLabel(persona.roleKey)}** de la méthode iakaframe.
Royaume : **${persona.royaume.toUpperCase()}**. Pastille d'identité : \`${personaBadge(persona)}\`.`,
    `## Mission\n\n${roleMission(persona.roleKey)}`,
    guardSection(guardrailByKind("identity")),
    guardSection(guardrailByKind("perimeter")),
  ];
  return sections.filter((s): s is string => s !== null).join("\n\n");
}

/** Construit l'objet **Model Open WebUI** d'une persona (forme des gabarits, meta minimal). */
export function buildOpenWebUIModel(persona: Persona, methodId: string): OpenWebUIModel {
  const description = asciiFold(
    `Persona ${persona.name} - role ${roleLabel(persona.roleKey)}. ` +
      `Modele de base NON fixe (base_model_id vide) : regler le modele a l'import dans ` +
      `Open WebUI (AR-1 : la forge ne pose pas de modele).`,
  );
  return {
    id: persona.id,
    base_model_id: "",
    name: persona.name,
    params: { system: buildSystemPrompt(persona) },
    meta: {
      description,
      capabilities: {
        // Neutre par défaut ; vision seulement pour le rôle graphisme (§ 2 instruction).
        vision: persona.roleKey === "graphisme",
        usage: false,
        citations: false,
      },
      tags: [{ name: methodId }],
    },
    access_control: null,
    is_active: true,
    created_at: CONSTANT_TIMESTAMP,
    updated_at: CONSTANT_TIMESTAMP,
  };
}

/**
 * **Adaptateur Open WebUI (pur)** : team pure → `KitFileTree` avec **un `models/<personaId>.json`
 * par persona**. Aucun `.mcp.json` (Q-4), aucun `settings.json`, aucun hook. Déterministe
 * (tri des personas + timestamps constants). Testable **sans Open WebUI**.
 */
export function generateOpenWebUIKit(team: Team): KitFileTree {
  const personas = [...team.personas].sort(byRoleThenId);
  const files: Record<string, string> = {};
  for (const persona of personas) {
    const model = buildOpenWebUIModel(persona, team.methodId);
    files[`models/${persona.id}.json`] = JSON.stringify(model, null, 2) + "\n";
  }
  return { files };
}
