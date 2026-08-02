/**
 * discovery.ts — **découverte des modèles AU NŒUD** + règle de **pré-remplissage du Binding par
 * rôle** (Q-3). Cœur 🟦 : PUR, déterministe, zéro I/O, zéro dépendance runtime.
 *
 * Verdict fondateur de Q-3 : **il n'y a plus aucune table de modèles**. La liste des candidats est
 * une **propriété du nœud interrogé** (`GET {host}/v1/models`, via la commande Rust `llm_models`
 * **existante** — aucune commande nouvelle). Ce module ne porte donc que du **mécanisme** : quel
 * hôte interroger, et quel candidat proposer à quel rôle.
 *
 * Il ne connaît **aucun modèle par son nom** — seulement quatre **motifs** (`coder`, `code`, `vl`,
 * `vision`), qui sont des **fragments**, pas des noms de modèles. Rien n'est classé, rien n'est
 * mesuré, rien n'est persisté.
 *
 * ⚠️ Fragilité assumée (**réserve R-3**) : rien ne garantit la convention de nommage des modèles —
 * elle vient des éditeurs, pas du nœud. **Faux négatifs** : un modèle de code dont le nom ne porte
 * aucun des motifs reçoit le défaut généraliste. **Faux positifs** : `vl` est court et peut
 * apparaître par accident. L'atténuation est **structurelle**, pas algorithmique : côté UI le
 * champ modèle reste **toujours visible et toujours éditable** — une erreur de motif se corrige
 * en un geste, jamais silencieusement irrattrapable.
 */

import { defaultBindingForNode, type Binding } from "./binding";
import type { NodeKind } from "./node";
import type { Team } from "./team";

/** Port Ollama par défaut (le nœud parle l'API compatible OpenAI sur `/v1/models`). */
const OLLAMA_DEFAULT_PORT = 11434;

/**
 * **Motifs par `roleKey`** (§ 6.1), dans leur **ordre d'évaluation** : un motif plus spécifique
 * est listé avant le plus large (`coder` avant `code`). Les rôles absents de cette table
 * (`portefeuille`, `coordination`, `cadrage`, `deploiement`, `documentation`, `frame`) n'ont
 * **aucun motif** : ils tombent directement sur le défaut généraliste.
 *
 * Clé = **`roleKey` canon**, JAMAIS le nom de la persona (jurisprudence G6) : une persona
 * renommée conserve donc exactement le même pré-remplissage.
 */
export const MODEL_PATTERNS_BY_ROLE: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    dev: Object.freeze(["coder", "code"]),
    qualite: Object.freeze(["coder", "code"]),
    design: Object.freeze(["vl", "vision"]),
  });

/**
 * **Union des motifs spécialisés** — dérivée de la table (jamais recopiée, donc jamais désynchronisée).
 * Sert au **défaut généraliste** (§ 6.2 ⑤) : un id qui porte l'un de ces fragments est considéré
 * comme spécialisé, donc écarté du défaut des rôles non spécialisés.
 */
export const SPECIALIZED_MODEL_PATTERNS: readonly string[] = Object.freeze([
  ...new Set(Object.values(MODEL_PATTERNS_BY_ROLE).flat()),
]);

/**
 * Motifs d'un `roleKey` (défensif : valeur non-string / clé inconnue / vide → **aucun motif**,
 * donc défaut généraliste — § 6.2 ⑥). **Jamais d'exception** (contrat des `parse*` du cœur).
 */
export function patternsForRole(roleKey: unknown): readonly string[] {
  if (typeof roleKey !== "string") return [];
  const key = roleKey.trim().toLowerCase();
  if (key.length === 0) return [];
  return MODEL_PATTERNS_BY_ROLE[key] ?? [];
}

/**
 * Candidats exploitables d'une liste découverte (défensif) : entrées non-string et entrées vides
 * écartées. Les ids retenus sont rendus **verbatim** (jamais retaillés) — la sortie de la règle
 * appartient donc toujours, à l'octet, à la liste d'entrée.
 */
function usableCandidates(models: readonly unknown[] | null | undefined): string[] {
  if (!Array.isArray(models)) return [];
  return models.filter(
    (m): m is string => typeof m === "string" && m.trim().length > 0,
  );
}

/** Un id porte-t-il l'un des motifs spécialisés ? (comparaison en minuscules, test = sous-chaîne) */
function isSpecialized(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return SPECIALIZED_MODEL_PATTERNS.some((p) => lower.includes(p));
}

/**
 * **La règle de pré-remplissage** (§ 6.2), exacte et sans exception.
 *
 * Entrée : `models` **dans l'ordre rendu par le nœud** + un `roleKey`. Sortie : un id **issu de
 * `models`**, ou `""`. Pure et déterministe : aucun tri, aucun score, aucun arbitrage caché.
 *
 * 1. liste vide (ou sans candidat exploitable) → **`""`** — c'est le chemin d'échec § 5.3 ;
 * 2. comparaison sur `model.toLowerCase()`, **test = sous-chaîne** ;
 * 3. **motif d'abord, liste ensuite** : pour chaque motif dans l'ordre du rôle, on parcourt
 *    `models` dans l'ordre du nœud. Un motif plus spécifique gagne donc **même si** un id du motif
 *    plus large apparaît plus tôt dans la liste (`coder` l'emporte sur `code`) ;
 * 4. plusieurs ids pour un même motif → **le premier dans l'ordre du nœud** ;
 * 5. aucun motif ne matche (ou rôle sans motif) → **défaut généraliste** = premier id ne portant
 *    **aucun** motif spécialisé ; si tous en portent → `models[0]` ;
 * 6. `roleKey` inconnu / vide / non-string → rôle sans motif (→ ⑤).
 */
export function suggestModelForRole(
  models: readonly string[] | null | undefined,
  roleKey: unknown,
): string {
  const candidates = usableCandidates(models);
  if (candidates.length === 0) return ""; // ①

  // ③ + ④ : le motif prime sur l'ordre de la liste ; à motif égal, le premier rendu par le nœud.
  for (const pattern of patternsForRole(roleKey)) {
    const hit = candidates.find((m) => m.toLowerCase().includes(pattern));
    if (hit !== undefined) return hit;
  }

  // ⑤ : défaut généraliste — sinon un codeur rédigerait la documentation (§ 6.3).
  return candidates.find((m) => !isSpecialized(m)) ?? candidates[0];
}

/**
 * Nœuds pour lesquels la découverte est **déclenchée** (§ 9, Q-3.f) : les trois nœuds Ollama.
 * **Jamais** `claude` ni `codex` — `codex` exige un modèle (`modelRequiredFor`) mais **conserve
 * la saisie libre**, sans découverte. Aucun élargissement aux autres sources OpenAI-compatibles
 * (renvoyé en P-O-1).
 */
export const MODEL_DISCOVERY_NODES: readonly NodeKind[] = Object.freeze([
  "ollama-localhost",
  "ollama-lan",
  "openwebui",
]);

/** Le nœud est-il dans le périmètre de découverte ? (défensif : valeur inconnue → `false`) */
export function supportsModelDiscovery(node: unknown): boolean {
  return (
    typeof node === "string" &&
    MODEL_DISCOVERY_NODES.includes(node as NodeKind)
  );
}

/**
 * **Hôte à interroger** pour un nœud (§ 5.2), ou `null` quand il n'y a **rien à interroger** :
 * nœud hors périmètre (`claude`, `codex`) ou `ollama-lan` sans host saisi.
 *
 * - `ollama-localhost` et `openwebui` → l'Ollama **loopback** sous-jacent (runner `ollama-local`) ;
 * - `ollama-lan` → le `lanHost` saisi au déploiement, toléré en host nu (`192.168.2.11`), en
 *   `host:port` ou en URL complète.
 *
 * ⚠️ L'URL rendue reste **soumise à la garde d'hôte** `host_allowed` côté Rust, **non modifiée**
 * (invariant de sécurité CA9) : un `ollama-lan` qui n'est pas l'endpoint d'authoring persisté sera
 * **refusé** — traitement **T-1** (§ 7), dégradation honnête, jamais ouverture de la garde.
 */
export function discoveryEndpointForNode(
  node: NodeKind,
  lanHost?: string,
): string | null {
  if (!supportsModelDiscovery(node)) return null;
  if (node === "ollama-lan") {
    const raw = (lanHost ?? "").trim();
    if (raw.length === 0) return null;
    if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, "");
    // Host nu → port Ollama par défaut ; `host:port` déjà porté → simple schéma.
    return raw.includes(":")
      ? `http://${raw}`
      : `http://${raw}:${OLLAMA_DEFAULT_PORT}`;
  }
  return `http://localhost:${OLLAMA_DEFAULT_PORT}`;
}

/**
 * **Pré-remplit** les liaisons d'un Binding depuis les modèles découverts au nœud, par `roleKey`.
 *
 * Additif et non destructif :
 * - seules les liaisons **encore vides** (`model === ""`) sont pourvues — une saisie de
 *   l'utilisateur n'est **jamais** écrasée (la découverte est asynchrone, elle peut atterrir
 *   après une première frappe) ;
 * - nœud hors périmètre ou **liste vide/échec** → Binding **rendu inchangé**, donc `model: ""`
 *   partout : le défaut sûr du § 5.3 est le **même objet de comportement** qu'aujourd'hui ;
 * - `team` sert **uniquement** à retrouver le `roleKey` de chaque persona (le Binding, lui, ne
 *   porte que des `personaId` — aucun schéma n'est modifié).
 */
export function prefillBindingModels(
  binding: Binding,
  team: Team,
  models: readonly string[] | null | undefined,
): Binding {
  if (!supportsModelDiscovery(binding.node)) return binding;
  if (usableCandidates(models).length === 0) return binding;

  const roleByPersonaId = new Map<string, string>(
    team.personas.map((p) => [p.id, p.roleKey]),
  );
  return {
    ...binding,
    bindings: binding.bindings.map((b) =>
      b.model === ""
        ? { ...b, model: suggestModelForRole(models, roleByPersonaId.get(b.personaId)) }
        : b,
    ),
  };
}

/**
 * Confort de test/appel : le **Binding par défaut** d'un (team, nœud) **déjà pré-rempli** depuis
 * une liste découverte. Strictement équivalent à `prefillBindingModels(defaultBindingForNode(…))`
 * — `defaultBindingForNode` reste **inchangé** et continue de poser `model: ""` (non-régression).
 */
export function prefilledBindingForNode(
  team: Team,
  node: NodeKind,
  models: readonly string[] | null | undefined,
): Binding {
  return prefillBindingModels(defaultBindingForNode(team, node), team, models);
}
