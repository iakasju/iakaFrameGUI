/**
 * openFrame — « Open frame » (G3/G4, open-frame-gui-stefframe2.md) : charge **les 11 types** d'un
 * frame (pointé par `IAKAFRAME_HOME`) dans le **conteneur Portfolio** du cœur (G6), puis vérifie
 * l'intégrité référentielle **dans le périmètre du frame**.
 *
 * Répartition des lectures (§5) : les **8 atomes** de pool depuis `<root>/library/<type>/` via
 * `poolReadAll` (contenu, G1) ; les **3 assemblages** `teams`/`methods`/`bindings` depuis
 * `<root>/{teams,methods,bindings}/` à plat via `libraryList` (`bindings` câblé par G2). `workflows`
 * est compté **une seule fois** — l'atome de pool (G5) ; l'espace collection `workflows/` reste un
 * détail interne MVP et n'entre pas dans les 11.
 *
 * `assembleFrame` est **pur** (texte → `Portfolio`, aucun I/O) donc testable ; `loadFramePortfolio`
 * orchestre les lectures backend puis délègue à `assembleFrame` + `checkPortfolioRefs`.
 */
import {
  buildPortfolio,
  checkPortfolioRefs,
  parseFrontmatter,
  parsePersona,
  parseScaffold,
  parseMethodMd,
  parseTeamMd,
  parseBindingMd,
  type FrameAtom,
  type Persona,
  type Portfolio,
  type PortfolioRefsReport,
  type Scaffold,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";

/** Contenus `.md` bruts des 11 types d'un frame (déjà lus depuis le backend). */
export interface FrameRawReads {
  root: string;
  /** 8 pools (contenu `.md`, depuis `library/<type>/`). */
  personas: string[];
  roles: string[];
  principles: string[];
  rituals: string[];
  guardrails: string[];
  scaffolds: string[];
  workflows: string[];
  skills: string[];
  /** 3 assemblages (contenu `.md`, à plat sous la racine). */
  methods: string[];
  teams: string[];
  bindings: string[];
}

/** Un frame chargé : le Portfolio + son rapport d'intégrité (critère B). */
export interface LoadedFrame {
  portfolio: Portfolio;
  refs: PortfolioRefsReport;
}

/** Id d'un atome depuis son frontmatter (`""` si absent) — pour les pools où seul l'id compte. */
function atomOf(md: string): FrameAtom {
  const { data } = parseFrontmatter(md);
  const id = typeof data.id === "string" ? data.id.trim() : "";
  return { id };
}

/** Mappe une liste de contenus `.md` en `FrameAtom[]` (ids), en filtrant les sans-id. */
function atoms(list: readonly string[]): FrameAtom[] {
  return list.map(atomOf).filter((a) => a.id.length > 0);
}

/** Personas parsées (contenu `.md`) — typées pour repérer `odin` (roleKey `portefeuille`). */
function personasOf(list: readonly string[]): Persona[] {
  return list
    .map((md) => parsePersona(parseFrontmatter(md).data))
    .filter((p): p is Persona => p !== null);
}

/** Scaffolds parsés (contenu `.md`) — typés pour repérer le niveau `portfolio`. */
function scaffoldsOf(list: readonly string[]): Scaffold[] {
  return list
    .map((md) => parseScaffold(parseFrontmatter(md).data))
    .filter((s): s is Scaffold => s !== null);
}

/**
 * Assemble un `Portfolio` (les 11 types) depuis les contenus `.md` bruts d'un frame (PUR). Chaque
 * type est parsé par le parseur idoine du cœur ; les records illisibles tombent (défensif). Le
 * Portfolio résultant porte l'inventaire (comptes), l'assemblage résolu et la facette portefeuille.
 */
export function assembleFrame(reads: FrameRawReads): Portfolio {
  return buildPortfolio({
    root: reads.root,
    personas: personasOf(reads.personas),
    roles: atoms(reads.roles),
    principles: atoms(reads.principles),
    rituals: atoms(reads.rituals),
    guardrails: atoms(reads.guardrails),
    scaffolds: scaffoldsOf(reads.scaffolds),
    workflows: atoms(reads.workflows),
    skills: atoms(reads.skills),
    methods: reads.methods
      .map((md) => parseMethodMd(md))
      .filter((m): m is NonNullable<typeof m> => m !== null),
    teams: reads.teams
      .map((md) => parseTeamMd(md))
      .filter((t): t is NonNullable<typeof t> => t !== null),
    bindings: reads.bindings
      .map((md) => parseBindingMd(md))
      .filter((b): b is NonNullable<typeof b> => b !== null),
  });
}

/**
 * Charge le frame courant (racine = `IAKAFRAME_HOME` résolue) : lit les 8 pools (`poolReadAll`) et
 * les 3 collections (`libraryList`), assemble le `Portfolio` puis exécute l'intégrité référentielle.
 * `null` si la racine est introuvable (l'appelant invite alors à la définir). Défensif : une lecture
 * en échec dégrade en liste vide (jamais d'exception propagée).
 */
export async function loadFramePortfolio(
  api: Backend = backend,
): Promise<LoadedFrame | null> {
  const root = await api.iakaframeHome();
  if (!root) return null;

  const safe = async (p: Promise<string[]>): Promise<string[]> => {
    try {
      return await p;
    } catch {
      return [];
    }
  };

  const [
    personas,
    roles,
    principles,
    rituals,
    guardrails,
    scaffolds,
    workflows,
    skills,
    methods,
    teams,
    bindings,
  ] = await Promise.all([
    safe(api.poolReadAll("personas")),
    safe(api.poolReadAll("roles")),
    safe(api.poolReadAll("principles")),
    safe(api.poolReadAll("rituals")),
    safe(api.poolReadAll("guardrails")),
    safe(api.poolReadAll("scaffolds")),
    safe(api.poolReadAll("workflows")),
    safe(api.poolReadAll("skills")),
    safe(api.libraryList("methods")),
    safe(api.libraryList("teams")),
    safe(api.libraryList("bindings")),
  ]);

  const portfolio = assembleFrame({
    root,
    personas,
    roles,
    principles,
    rituals,
    guardrails,
    scaffolds,
    workflows,
    skills,
    methods,
    teams,
    bindings,
  });
  return { portfolio, refs: checkPortfolioRefs(portfolio) };
}
