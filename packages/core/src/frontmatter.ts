/**
 * frontmatter.ts — mini-(dé)sérialiseur de frontmatter `.md` **MAISON, zéro-dépendance**, +
 * (dé)sérialiseurs **par type** de la bibliothèque (team / method / kit) — cœur 🟦.
 *
 * ## Pourquoi maison
 * `@iakaframe/core` est **zéro-dépendance** (comme le CLI sidecar) : Node n'embarque aucun
 * parseur YAML natif, et tirer `js-yaml`/`yaml`/`gray-matter` violerait la contrainte. On couvre
 * donc le **sous-ensemble réellement présent** dans la bibliothèque (constaté sur les fichiers
 * réels `teams/`, `methods/`, `kits/`), pas YAML complet :
 *   1) délimiteurs `---` … `---` en tête ; corps rendu tel quel ;
 *   2) scalaires `clé: valeur` (quotes " ou ', emoji, booléens, entiers) ;
 *   3) listes flow `clé: [a, b, c]` pouvant s'étendre sur plusieurs lignes ;
 *   4) séquences de blocs `- { k: v, … }` (maps inline) ou `- "scalaire"`.
 *
 * ## Parité CLI ↔ cœur (byte-parité visée)
 * Ce parseur est un **miroir ligne-à-ligne** de `iakaframe/cli/src/lib/frontmatter.js` (même
 * sous-ensemble). Un fichier écrit par la GUI (`serialize*Md`) doit être **lu à l'identique** par
 * `iakaframe show`, et un fichier de `iakaframe list` doit être ouvert par la GUI. La sérialisation
 * est **canonique** (listes flow mono-ligne, ordre de champs = fichiers réels) : le wrapping manuel
 * multi-ligne présent dans certains fichiers écrits à la main n'est **pas** reproduit (non
 * reproductible génériquement) — la byte-parité est verrouillée sur des **golden fixtures
 * partagées** en forme canonique (cf. `__tests__/frontmatter.test.ts`, `teamMd.test.ts`, …).
 *
 * Défensif : jamais d'exception ; champ inconnu ignoré ; artefact sans `id` → `null`.
 */

import type { Workflow } from "./workflow";
import { parseWorkflow } from "./workflow";

// ---------------------------------------------------------------------------
// 1. PARSEUR générique (miroir du CLI) : parseFrontmatter(text) -> { data, body }
// ---------------------------------------------------------------------------

/** Valeur scalaire ou composée lue depuis le frontmatter. */
export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | FrontmatterValue[]
  | { [k: string]: FrontmatterValue };

export type FrontmatterData = Record<string, FrontmatterValue>;

/** Coupe `str` sur `sep` au NIVEAU SUPÉRIEUR (respecte quotes " ' et paires [] {}). */
function splitTopLevel(str: string, sep = ","): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (quote) {
      buf += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      buf += c;
      continue;
    }
    if (c === "[" || c === "{") {
      depth++;
      buf += c;
      continue;
    }
    if (c === "]" || c === "}") {
      depth--;
      buf += c;
      continue;
    }
    if (c === sep && depth === 0) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim() !== "" || out.length) out.push(buf);
  return out;
}

/** Coerce un scalaire brut : quotes strippées → string ; true/false/null ; entier → Number. */
function parseScalar(raw: string): FrontmatterValue {
  const s = String(raw).trim();
  if (s === "") return "";
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    return s.slice(1, -1);
  }
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}

/** Parse une liste flow `[a, b, "c, d"]` (contenu SANS crochets externes) → tableau de scalaires. */
function parseFlowList(inner: string): FrontmatterValue[] {
  const body = inner.trim();
  if (body === "") return [];
  return splitTopLevel(body).map(parseScalar);
}

/** Parse une map inline `{ k: v, k2: [a,b] }` (contenu AVEC accolades) → objet. */
function parseInlineMap(text: string): Record<string, FrontmatterValue> {
  const t = text.trim().replace(/^\{/, "").replace(/\}$/, "");
  const obj: Record<string, FrontmatterValue> = {};
  for (const pair of splitTopLevel(t)) {
    const seg = pair.trim();
    if (!seg) continue;
    const idx = seg.indexOf(":");
    if (idx < 0) continue;
    const k = seg.slice(0, idx).trim();
    const v = seg.slice(idx + 1).trim();
    obj[k] = parseValue(v);
  }
  return obj;
}

/** Parse une valeur inline (après `clé:`), déjà mono-ligne (crochets/accolades équilibrés). */
function parseValue(v: string): FrontmatterValue {
  const s = v.trim();
  if (s.startsWith("[") && s.endsWith("]")) return parseFlowList(s.slice(1, -1));
  if (s.startsWith("{") && s.endsWith("}")) return parseInlineMap(s);
  return parseScalar(s);
}

const KEY_RE = /^(\s*)([A-Za-z0-9_.-]+):\s?(.*)$/;

/** Extrait le bloc frontmatter en tête. Retourne { raw, body } (raw `null` si absent). */
function splitDocument(text: string): { raw: string | null; body: string } {
  const norm = String(text).replace(/^\uFEFF/, "");
  const lines = norm.split(/\r?\n/);
  if (lines[0] !== "---") return { raw: null, body: norm };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---" || lines[i] === "...") {
      end = i;
      break;
    }
  }
  if (end < 0) return { raw: null, body: norm };
  return {
    raw: lines.slice(1, end).join("\n"),
    body: lines
      .slice(end + 1)
      .join("\n")
      .replace(/^\n+/, ""),
  };
}

const indentOf = (l: string): number => (l.match(/^(\s*)/)?.[1] || "").length;

/** Solde des paires ouvrantes/fermantes [] {} (hors quotes) : > 0 = non équilibré. */
function balance(str: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") depth--;
  }
  return depth;
}

/** Parse le corps du frontmatter (sans les `---`) en objet. */
function parseFrontmatterBody(raw: string | null): FrontmatterData {
  const data: FrontmatterData = {};
  if (!raw) return data;
  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const m = line.match(KEY_RE);
    if (!m) {
      i++;
      continue;
    } // ligne hors sous-ensemble : ignorée (tolérance)
    const baseIndent = m[1].length;
    const key = m[2];
    const rest = m[3];

    if (rest.trim() === "") {
      // Valeur en bloc : séquence `- …` indentée, sinon rien.
      let j = i + 1;
      const seq: FrontmatterValue[] = [];
      let sawSeq = false;
      while (j < lines.length) {
        const l = lines[j];
        if (l.trim() === "") {
          j++;
          continue;
        }
        if (indentOf(l) <= baseIndent) break;
        const sm = l.match(/^\s*-\s?(.*)$/);
        if (!sm) break;
        sawSeq = true;
        let itemText = sm[1];
        if (itemText.trim().startsWith("{")) {
          while (balance(itemText) > 0 && j + 1 < lines.length) {
            j++;
            itemText += " " + lines[j].trim();
          }
          seq.push(parseInlineMap(itemText));
        } else if (itemText.trim().startsWith("[")) {
          while (balance(itemText) > 0 && j + 1 < lines.length) {
            j++;
            itemText += " " + lines[j].trim();
          }
          seq.push(parseFlowList(itemText.trim().replace(/^\[/, "").replace(/\]$/, "")));
        } else {
          seq.push(parseScalar(itemText));
        }
        j++;
      }
      if (sawSeq) {
        data[key] = seq;
        i = j;
        continue;
      }
      data[key] = "";
      i++;
      continue;
    }

    // Valeur inline. Liste flow / map potentiellement multi-ligne.
    if (rest.trim().startsWith("[") && balance(rest) > 0) {
      let acc = rest;
      let j = i;
      while (balance(acc) > 0 && j + 1 < lines.length) {
        j++;
        acc += " " + lines[j].trim();
      }
      data[key] = parseValue(acc.trim());
      i = j + 1;
      continue;
    }
    if (rest.trim().startsWith("{") && balance(rest) > 0) {
      let acc = rest;
      let j = i;
      while (balance(acc) > 0 && j + 1 < lines.length) {
        j++;
        acc += " " + lines[j].trim();
      }
      data[key] = parseValue(acc.trim());
      i = j + 1;
      continue;
    }
    data[key] = parseValue(rest);
    i++;
  }
  return data;
}

/** API publique : `parseFrontmatter(text)` → `{ data, body }`. Jamais d'exception. */
export function parseFrontmatter(text: string | undefined | null): {
  data: FrontmatterData;
  body: string;
} {
  if (text == null) return { data: {}, body: "" };
  const { raw, body } = splitDocument(text);
  return { data: parseFrontmatterBody(raw), body };
}

// ---------------------------------------------------------------------------
// 2. SÉRIALISEUR générique (canonique) : miroir du format des fichiers réels
// ---------------------------------------------------------------------------

/** Un scalaire de frontmatter à écrire (string | number | boolean). */
type Scalar = string | number | boolean;

/**
 * Un item de liste flow a-t-il besoin d'être quoté ? On quote (`"…"`) tout ce qui n'est PAS un
 * « mot plein » `[A-Za-z0-9_-]+`. Ainsi les ids simples restent nus (`odin`, `iakaframe-3phases`),
 * tandis que les chemins d'`emits[]` (`.claude/agents/*`, `CLAUDE.md`) sont quotés — exactement
 * comme dans les fichiers réels de la bibliothèque (byte-parité).
 */
function needsListQuote(item: string): boolean {
  return !/^[A-Za-z0-9_-]+$/.test(item);
}

/**
 * Une valeur scalaire (`clé: valeur`) a-t-elle besoin de quotes ? On reste minimal (les fichiers
 * réels n'en quotent aucune : `name: La compagnie iakaframe`, `vignetteTeam: none`) : on ne quote
 * que si l'absence de quotes casserait la relecture (vide, espace de bord, mot-clé, entier, ou
 * caractère de tête ambigu YAML).
 */
function needsScalarQuote(s: string): boolean {
  if (s === "") return true;
  if (/^\s|\s$/.test(s)) return true;
  if (s === "true" || s === "false" || s === "null" || s === "~") return true;
  if (/^-?\d+$/.test(s)) return true;
  return /^[[{"'#&*!|>%@`,]/.test(s);
}

/** Rend une valeur scalaire pour l'écriture (quotée au besoin). */
function renderScalar(v: Scalar): string {
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return needsScalarQuote(v) ? `"${v}"` : v;
}

/** Rend une liste flow `[a, b, c]` (items quotés au besoin). */
function renderFlowList(items: readonly Scalar[]): string {
  const inner = items
    .map((it) =>
      typeof it === "string" && needsListQuote(it) ? `"${it}"` : String(it),
    )
    .join(", ");
  return `[${inner}]`;
}

/** Une paire de frontmatter à écrire : scalaire (`kind:"scalar"`) ou liste flow (`kind:"list"`). */
type Field =
  | { key: string; kind: "scalar"; value: Scalar }
  | { key: string; kind: "list"; value: readonly Scalar[] };

/**
 * Assemble un document `.md` : `---\n<frontmatter>\n---\n<body>`. Les `undefined` de `fields`
 * (champs optionnels absents) sont ignorés. Corps optionnel (défaut vide).
 */
function buildDocument(fields: (Field | undefined)[], body = ""): string {
  const lines = fields
    .filter((f): f is Field => f !== undefined)
    .map((f) =>
      f.kind === "list"
        ? `${f.key}: ${renderFlowList(f.value)}`
        : `${f.key}: ${renderScalar(f.value)}`,
    );
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

/**
 * Extrait le corps d'un `.md` en **PRÉSERVANT exactement** ce qui suit le `---` fermant (y compris
 * la ligne blanche de tête et le `\n` final). Miroir de `verbatimBody` du CLI
 * (`generate-agents.js`) : contrairement à `parseFrontmatter().body` qui strippe les `\n` de tête,
 * la byte-parité du **contrat déployé** exige cette ligne blanche de tête.
 */
export function verbatimBody(text: string): string {
  const norm = String(text).replace(/^\uFEFF/, "");
  const lines = norm.split(/\r?\n/);
  if (lines[0] !== "---") return norm;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---" || lines[i] === "...") {
      end = i;
      break;
    }
  }
  if (end < 0) return norm;
  return lines.slice(end + 1).join("\n");
}

/**
 * Sérialise le **contrat d'agent Claude Code** `.claude/agents/<id>.md` — **format AUTORITÉ**
 * partagé byte-à-byte avec le CLI (`renderAgentContract`, `generate-agents.js`). Ordre FIXE
 * `name, description, tools?, guardrails` : `name` = **id** ; `tools` = **scalaire virgule OMIS si
 * vide** (héritage de tous les outils) ; `guardrails` = **flow-list** ; **PAS de `model`** (le
 * modèle vit dans le `binding.json`, hors contrat). Corps rendu verbatim.
 */
export function serializeAgentContract(
  fm: { id: string; description: string; tools: string[]; guardrails: string[] },
  body = "",
): string {
  const tools =
    fm.tools.length > 0
      ? ({ key: "tools", kind: "scalar", value: fm.tools.join(", ") } as Field)
      : undefined;
  return buildDocument(
    [
      { key: "name", kind: "scalar", value: fm.id },
      { key: "description", kind: "scalar", value: fm.description },
      tools,
      { key: "guardrails", kind: "list", value: fm.guardrails },
    ],
    body,
  );
}

/** Coerce une valeur de frontmatter en `string[]` (ids), défensif (ignore non-string/vides). */
function asStringArray(raw: FrontmatterValue | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.length > 0);
}

/** Coerce une valeur de frontmatter en `string` (`""` si absente/non-string). */
function asString(raw: FrontmatterValue | undefined): string {
  return typeof raw === "string" ? raw : raw == null ? "" : String(raw);
}

// ---------------------------------------------------------------------------
// 3. Enregistrements au SCHÉMA de la bibliothèque (ids seulement, cf. rangement §3.9/3.10/3.12)
//    Distincts des types riches GUI (Team porte des Persona[], etc.) : ici on (dé)sérialise
//    le FICHIER `.md` (que des ids), byte-parité avec le CLI.
// ---------------------------------------------------------------------------

/** `teams/<id>.md` (§3.9) — assemblage de casting, que des ids. */
export interface TeamMd {
  id: string;
  name: string;
  personas: string[];
  coordinator: string;
  guardrails: string[];
  vignetteTeam: string;
}

/** `methods/<id>.md` (§3.10) — assemblage de discipline, que des ids. */
export interface MethodMd {
  id: string;
  name: string;
  workflowId?: string;
  principleIds: string[];
  ritualIds: string[];
  guardrailIds: string[];
  roleKeys: string[];
  scaffoldIds: string[];
}

/** `kits/<id>.md` (§3.12) — manifeste d'assemblage (références). */
export interface KitMd {
  id: string;
  methodId: string;
  teamId: string;
  bindingId?: string;
  node: string;
  emits?: string[];
}

// --- team --------------------------------------------------------------------

/** Sérialise un `TeamMd` en `.md`-frontmatter (ordre des champs = fichiers réels). */
export function serializeTeamMd(t: TeamMd, body = ""): string {
  return buildDocument(
    [
      { key: "id", kind: "scalar", value: t.id },
      { key: "name", kind: "scalar", value: t.name },
      { key: "personas", kind: "list", value: t.personas },
      { key: "coordinator", kind: "scalar", value: t.coordinator },
      { key: "guardrails", kind: "list", value: t.guardrails },
      { key: "vignetteTeam", kind: "scalar", value: t.vignetteTeam },
    ],
    body,
  );
}

/** Parse un `.md` team → `TeamMd` (défensif ; `null` sans `id`). */
export function parseTeamMd(text: string | undefined | null): TeamMd | null {
  const { data } = parseFrontmatter(text);
  const id = asString(data.id).trim();
  if (!id) return null;
  return {
    id,
    name: asString(data.name) || id,
    personas: asStringArray(data.personas),
    coordinator: asString(data.coordinator),
    guardrails: asStringArray(data.guardrails),
    vignetteTeam: asString(data.vignetteTeam) || "none",
  };
}

// --- method ------------------------------------------------------------------

/** Sérialise un `MethodMd` (ordre des champs = fichier réel `methods/iakaframe.md`). */
export function serializeMethodMd(m: MethodMd, body = ""): string {
  const workflow =
    m.workflowId && m.workflowId.trim().length > 0
      ? ({ key: "workflowId", kind: "scalar", value: m.workflowId } as Field)
      : undefined;
  return buildDocument(
    [
      { key: "id", kind: "scalar", value: m.id },
      { key: "name", kind: "scalar", value: m.name },
      workflow,
      { key: "principleIds", kind: "list", value: m.principleIds },
      { key: "ritualIds", kind: "list", value: m.ritualIds },
      { key: "guardrailIds", kind: "list", value: m.guardrailIds },
      { key: "roleKeys", kind: "list", value: m.roleKeys },
      { key: "scaffoldIds", kind: "list", value: m.scaffoldIds },
    ],
    body,
  );
}

/** Parse un `.md` method → `MethodMd` (défensif ; `null` sans `id`). */
export function parseMethodMd(text: string | undefined | null): MethodMd | null {
  const { data } = parseFrontmatter(text);
  const id = asString(data.id).trim();
  if (!id) return null;
  const method: MethodMd = {
    id,
    name: asString(data.name) || id,
    principleIds: asStringArray(data.principleIds),
    ritualIds: asStringArray(data.ritualIds),
    guardrailIds: asStringArray(data.guardrailIds),
    roleKeys: asStringArray(data.roleKeys),
    scaffoldIds: asStringArray(data.scaffoldIds),
  };
  const workflowId = asString(data.workflowId).trim();
  if (workflowId) method.workflowId = workflowId;
  return method;
}

// --- kit ---------------------------------------------------------------------

/** Sérialise un `KitMd` (ordre des champs = fichier réel `kits/iakaframe-claude.md`). */
export function serializeKitMd(k: KitMd, body = ""): string {
  const binding =
    k.bindingId && k.bindingId.trim().length > 0
      ? ({ key: "bindingId", kind: "scalar", value: k.bindingId } as Field)
      : undefined;
  const emits =
    k.emits !== undefined
      ? ({ key: "emits", kind: "list", value: k.emits } as Field)
      : undefined;
  return buildDocument(
    [
      { key: "id", kind: "scalar", value: k.id },
      { key: "methodId", kind: "scalar", value: k.methodId },
      { key: "teamId", kind: "scalar", value: k.teamId },
      binding,
      { key: "node", kind: "scalar", value: k.node },
      emits,
    ],
    body,
  );
}

/** Parse un `.md` kit → `KitMd` (défensif ; `null` sans `id`/`methodId`/`teamId`). */
export function parseKitMd(text: string | undefined | null): KitMd | null {
  const { data } = parseFrontmatter(text);
  const id = asString(data.id).trim();
  const methodId = asString(data.methodId).trim();
  const teamId = asString(data.teamId).trim();
  if (!id || !methodId || !teamId) return null;
  const kit: KitMd = {
    id,
    methodId,
    teamId,
    node: asString(data.node) || "claude",
  };
  const bindingId = asString(data.bindingId).trim();
  if (bindingId) kit.bindingId = bindingId;
  if (Array.isArray(data.emits)) kit.emits = asStringArray(data.emits);
  return kit;
}

// --- workflow (P6b) ----------------------------------------------------------

/**
 * Encodage `.md` du **workflow** (P6b, Q-8) : frontmatter **plat** (`id`/`name`/`methodId`, lisible
 * par le CLI/`iakaframe show` **sans** étendre `buildDocument` — protège le golden) + les
 * **phases/gates** sérialisées **dans le corps** en bloc JSON structuré round-trippé. Ce bloc reste
 * **contenu dans le fichier workflow** (les autres schémas — team/method/kit — ne le voient jamais).
 * Le parseur est **défensif** (bloc absent/illisible → `null` → repli canonique côté forge).
 */

/** Marqueur du bloc de phases (données) dans le corps — informatif, non porteur de sens au parse. */
const WORKFLOW_PHASES_MARKER =
  "<!-- iakaframe:workflow — phases/gates (données, ne pas éditer à la main) -->";

/** Extrait le contenu du **premier** bloc ```json du corps (`null` si absent). */
function extractJsonBlock(body: string): string | null {
  const m = body.match(/```json\s*\n([\s\S]*?)\n?```/);
  return m ? m[1] : null;
}

/**
 * Sérialise un `Workflow` en `.md` (Q-8). Frontmatter plat `id`/`name`/`methodId` via
 * `buildDocument` (champs scalaires — **aucune** extension du frontmatter partagé) ; les phases +
 * le calage de section (`sectionTitle`/`sectionNote`) vivent dans le **corps** en bloc JSON. `body`
 * = prose humaine optionnelle (insérée avant le bloc de données).
 */
export function serializeWorkflowMd(wf: Workflow, body = ""): string {
  const payload: Record<string, unknown> = { phases: wf.phases };
  if (wf.sectionTitle !== undefined) payload.sectionTitle = wf.sectionTitle;
  if (wf.sectionNote !== undefined) payload.sectionNote = wf.sectionNote;
  const dataBlock = `${WORKFLOW_PHASES_MARKER}\n\n\`\`\`json\n${JSON.stringify(
    payload,
    null,
    2,
  )}\n\`\`\`\n`;
  const fullBody = body.trim().length > 0 ? `${body.trim()}\n\n${dataBlock}` : dataBlock;
  return buildDocument(
    [
      { key: "id", kind: "scalar", value: wf.id },
      { key: "name", kind: "scalar", value: wf.name },
      { key: "methodId", kind: "scalar", value: wf.methodId },
    ],
    fullBody,
  );
}

/**
 * Parse un `.md` workflow → `Workflow` (défensif ; `null` sans `id`, sans bloc de données lisible,
 * ou sans phase valide). Fusionne le frontmatter plat (`id`/`name`/`methodId`) et le bloc JSON du
 * corps (phases + calage), puis délègue à `parseWorkflow` (mêmes garanties défensives que le cœur).
 */
export function parseWorkflowMd(text: string | undefined | null): Workflow | null {
  const { data, body } = parseFrontmatter(text);
  const id = asString(data.id).trim();
  if (!id) return null;
  const raw = extractJsonBlock(body);
  if (raw === null) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const methodId = asString(data.methodId).trim();
  return parseWorkflow({
    id,
    name: asString(data.name) || id,
    methodId: methodId.length > 0 ? methodId : undefined,
    phases: p.phases,
    sectionTitle: p.sectionTitle,
    sectionNote: p.sectionNote,
  });
}

/** Interne exposé pour les tests (parité fine avec le CLI). */
export const _frontmatterInternal = {
  splitTopLevel,
  parseScalar,
  parseFlowList,
  parseInlineMap,
  balance,
  needsScalarQuote,
  needsListQuote,
};
