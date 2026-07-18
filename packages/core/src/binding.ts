/**
 * binding.ts — le **Binding** de 1re classe (E1, P7) : liaison `persona → runner + modèle`
 * pour rendre un kit **standalone-runnable** (exécutable hors Cockpit). Cœur 🟦.
 *
 * Le Binding est un **artefact SÉPARÉ** de la Team (AR-1) : `Team`/`Persona` ne portent JAMAIS
 * de `runner`/`model` (posés run-time côté cockpit) ; le Binding matérialise le couple
 * (runner, modèle) **par persona**, **par (team, nœud)** (E1 Q-2). Il est passé en **option de
 * génération** (`KitGenOptions.binding?`) — **sans Binding, la sortie reste byte-identique** au
 * kit pur (non-régression P3/P3b/P3c).
 *
 * Invariant secret (dur) : un Binding **ne contient AUCUN credential** — `runner` est un *kind*
 * (harnais), `model` un alias (nom de modèle), jamais une clé/token (ceux-là restent au
 * keychain, hors forge). Les parseurs sont **défensifs** (calqués sur `parseTeam`/`parsePersona`) :
 * un record invalide est ignoré, jamais d'exception.
 */

import { parseFrontmatter } from "./frontmatter";
import { isNodeKind, type NodeKind } from "./node";
import { parseRunnerKind, type RunnerKind } from "./runner";
import type { Team } from "./team";

/** Origines possibles d'un Binding (E1). Le MVP forge n'émet que `forge-default`. */
export type BindingOrigin = "forge-default" | "cockpit-override";

/** Liaison d'UNE persona : son harnais (`runner`) + son modèle (alias ; `""` = défaut runner). */
export interface PersonaBinding {
  /** Réf. `Persona.id` de la team. */
  personaId: string;
  /** Harnais d'exécution (vocab `RunnerKind` existant). */
  runner: RunnerKind;
  /** Alias/modèle ; `""` = défaut du runner → **aucune émission de modèle** (kit pur pour cette persona). */
  model: string;
}

/**
 * Le **Binding** d'une (team, nœud), **aligné sur le format frame** (`bindings/<id>.md`) : un jeu
 * de liaisons par persona (E1 Q-2) + l'appariement `methodId ↔ teamId` (I3). Un **seul** type,
 * lu par **deux portes** : `parseBinding` (JSON strict, déploiement) et `parseBindingMd` (`.md`
 * frame, tolérant). La clé de liaisons est `assignments` (nom du fichier de frame).
 */
export interface Binding {
  /** Slug stable (ex. `"iakaframe-claude-default"` en frame, `"iakaframe@claude"` en déploiement). */
  id: string;
  /**
   * Réf. `Method.id` appariée (venu du frame ; `""` toléré au parse). **Load-bearing** pour
   * open-frame (résolution portefeuille) ; ignoré par la génération de kit.
   */
  methodId: string;
  /** Réf. `Team.id` liée. */
  teamId: string;
  /** Nœud de destination du kit lié — un Binding est PAR nœud (E1 Q-2). */
  node: NodeKind;
  /** Provenance : la forge produit toujours `forge-default` (override cockpit = autre lot). */
  origin: BindingOrigin;
  /** Liaisons par persona (aucune n'est requise ; l'absence = défaut runner). */
  assignments: PersonaBinding[];
}

/**
 * Runner **par défaut** d'un nœud (E1 Q-3) : `claude → claude-code`, `codex → codex`,
 * `ollama-* / openwebui → ollama`. Sert d'amorce au Binding par défaut (l'utilisateur peut
 * changer chaque runner ensuite).
 */
export function defaultRunnerForNode(node: NodeKind): RunnerKind {
  switch (node) {
    case "claude":
      return "claude-code";
    case "codex":
      return "codex";
    default:
      // ollama-localhost / ollama-lan / openwebui : harnais Ollama par défaut.
      return "ollama";
  }
}

/**
 * Parse défensif d'UNE liaison de persona (record invalide → `null`, jamais d'exception).
 * `personaId` requis (string non vide) ; `runner` **validé** via `parseRunnerKind` (inconnu →
 * liaison ignorée) ; `model` non-string → `""`. Aucune autre clé (ex. credential) n'est lue.
 */
export function parsePersonaBinding(raw: unknown): PersonaBinding | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const personaId =
    typeof r.personaId === "string" && r.personaId.trim().length > 0
      ? r.personaId.trim()
      : null;
  if (!personaId) return null;

  const runner = parseRunnerKind(r.runner);
  if (runner === null) return null;

  const model = typeof r.model === "string" ? r.model.trim() : "";

  return { personaId, runner, model };
}

/**
 * Coerce une séquence brute `assignments` en `PersonaBinding[]` (défensif, partagé par les deux
 * portes). Chaque item passe par `parsePersonaBinding` : `runner` **validé** (inconnu → liaison
 * jetée, P-C), `personaId` requis. Non-tableau → `[]`.
 */
function coerceAssignments(raw: unknown): PersonaBinding[] {
  return Array.isArray(raw)
    ? raw.map(parsePersonaBinding).filter((b): b is PersonaBinding => b !== null)
    : [];
}

/** Replie une valeur brute sur l'union `BindingOrigin` (défaut `forge-default`). */
function coerceOrigin(raw: unknown): BindingOrigin {
  return raw === "cockpit-override" ? "cockpit-override" : "forge-default";
}

/**
 * Parse défensif d'UN Binding depuis un objet **JSON** (`binding.json`, déploiement) — porte
 * **stricte** (P-B) : `node` invalide → `null` (l'artefact déployé doit être valide). `id`/`teamId`
 * requis ; `methodId` lu (défaut `""`, non requis en JSON) ; `origin` replié sur `forge-default` si
 * absent/invalide. Les liaisons `assignments` passent par `parsePersonaBinding` (invalides tombent).
 */
export function parseBinding(raw: unknown): Binding | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
  if (!id) return null;

  const teamId =
    typeof r.teamId === "string" && r.teamId.trim().length > 0 ? r.teamId.trim() : null;
  if (!teamId) return null;

  if (!isNodeKind(r.node)) return null;
  const node = (r.node as string).toLowerCase() as NodeKind;

  const methodId = typeof r.methodId === "string" ? r.methodId.trim() : "";

  return {
    id,
    methodId,
    teamId,
    node,
    origin: coerceOrigin(r.origin),
    assignments: coerceAssignments(r.assignments),
  };
}

/**
 * Parse défensif d'UN Binding depuis un `.md` **frontmatter** (fichier de frame `bindings/<id>.md`)
 * — porte **tolérante** (P-B) : `node`/`origin` invalides ou absents → défauts (`"claude"` /
 * `"forge-default"`), on préfère afficher un frame imparfait plutôt que masquer le binding. `null`
 * si `id`/`methodId`/`teamId` manquant (contrat frame). S'appuie sur `parseFrontmatter` et réutilise
 * la coercion d'assignations partagée avec `parseBinding` (runner strict, P-C).
 */
export function parseBindingMd(text: string | undefined | null): Binding | null {
  const { data } = parseFrontmatter(text);

  const id = typeof data.id === "string" ? data.id.trim() : "";
  const methodId = typeof data.methodId === "string" ? data.methodId.trim() : "";
  const teamId = typeof data.teamId === "string" ? data.teamId.trim() : "";
  if (!id || !methodId || !teamId) return null;

  const node: NodeKind = isNodeKind(data.node)
    ? ((data.node as string).toLowerCase() as NodeKind)
    : "claude";

  return {
    id,
    methodId,
    teamId,
    node,
    origin: coerceOrigin(typeof data.origin === "string" ? data.origin.trim() : data.origin),
    assignments: coerceAssignments(data.assignments),
  };
}

/**
 * Parse le contenu texte d'un `binding.json` (défensif). `null` si illisible/invalide (jamais
 * d'exception) — l'appelant ignore le binding.
 */
export function parseBindingText(text: string | undefined | null): Binding | null {
  if (!text || text.trim().length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  return parseBinding(data);
}

/**
 * **Binding par défaut d'un (team, nœud)** (E1 Q-3) : une liaison par persona, `runner` =
 * défaut du nœud, `model: ""` (à compléter par l'utilisateur). Pour `claude`, un modèle vide
 * suffit (Claude Code tourne sur ses défauts → kit équivalent au pur) ; pour `codex`/`ollama-*`/
 * `openwebui`, le modèle est **requis** pour un kit standalone (l'UI le signale, non bloquant).
 * `methodId` est **optionnel** (défaut `""`) : le déploiement ne l'utilise pas, seul open-frame
 * (résolution portefeuille) en a besoin — le passer si disponible en scope.
 */
export function defaultBindingForNode(team: Team, node: NodeKind, methodId = ""): Binding {
  const runner = defaultRunnerForNode(node);
  return {
    id: `${team.id}@${node}`,
    methodId,
    teamId: team.id,
    node,
    origin: "forge-default",
    assignments: team.personas.map((p) => ({
      personaId: p.id,
      runner,
      model: "",
    })),
  };
}

/**
 * Modèle **effectif** d'une persona selon un binding (lookup) : `""` si pas de binding, pas de
 * liaison pour cette persona, ou modèle vide. Un `""` signifie **aucune émission** (kit pur pour
 * cette persona) — c'est le pivot de la rétro-compat (binding « tout vide » ≡ kit pur).
 */
export function modelForPersona(
  binding: Binding | null | undefined,
  personaId: string,
): string {
  if (!binding) return "";
  const found = binding.assignments.find((b) => b.personaId === personaId);
  return found ? found.model : "";
}

/**
 * Sérialise un Binding pour le déploiement (`binding.json`). Passe par `parseBinding` pour
 * **garantir l'invariant** (aucune clé étrangère/credential ne peut fuiter, même si l'objet en
 * mémoire était pollué). Indenté + `\n` final (lisible sur disque).
 */
export function serializeBinding(binding: Binding): string {
  const clean = parseBinding(binding) ?? binding;
  return JSON.stringify(clean, null, 2) + "\n";
}
