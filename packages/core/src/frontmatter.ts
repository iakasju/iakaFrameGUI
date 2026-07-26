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

import type { GateKind, Phase, Workflow, WorkflowKind } from "./workflow";
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

/** Rend un item de liste flow (quoté au besoin). */
function renderListItem(it: Scalar): string {
  return typeof it === "string" && needsListQuote(it) ? `"${it}"` : String(it);
}

/**
 * Rend une liste flow `[a, b, c]` (items quotés au besoin).
 *
 * `wrap` = **découpe en lignes physiques** (nombre d'items par ligne), telle que relevée sur le
 * fichier d'origine par {@link readListLayout}. Absent (ou incohérent avec `items`) → **une seule
 * ligne**, forme canonique historique, byte-identique au CLI (`renderFlowList`,
 * `cli/src/lib/frontmatter.js`). Les lignes de continuation sont indentées de 2 espaces, comme
 * dans les fichiers réels de la bibliothèque.
 */
function renderFlowList(items: readonly Scalar[], wrap?: readonly number[]): string {
  const rendered = items.map(renderListItem);
  const total = wrap?.reduce((a, b) => a + b, 0) ?? 0;
  // Garde : un `wrap` qui ne recouvre pas exactement la liste courante (liste éditée depuis la
  // lecture) est IGNORÉ — on retombe sur la forme canonique plutôt que de produire un rendu faux.
  if (!wrap || wrap.length < 2 || total !== rendered.length) {
    return `[${rendered.join(", ")}]`;
  }
  const rows: string[] = [];
  let at = 0;
  for (const n of wrap) {
    rows.push(rendered.slice(at, at + n).join(", "));
    at += n;
  }
  return `[${rows.join(",\n  ")}]`;
}

/** Une paire de frontmatter à écrire : scalaire (`kind:"scalar"`) ou liste flow (`kind:"list"`). */
type Field =
  | { key: string; kind: "scalar"; value: Scalar }
  | { key: string; kind: "list"; value: readonly Scalar[]; wrap?: readonly number[] };

/**
 * Découpe en lignes physiques d'une liste flow, par clé de frontmatter : `{ principleIds: [5,5,5,1] }`.
 * Produit par {@link readListLayout}, consommé par les sérialiseurs pour **préserver le wrapping**
 * d'un fichier relu.
 */
export type ListLayout = Record<string, number[]>;

/**
 * Relève, sur un `.md` **d'origine**, la façon dont ses listes flow sont **réparties sur les lignes**
 * — afin qu'une réécriture puisse la restituer à l'identique (zéro diff git parasite). Seules les
 * listes réellement wrappées (≥ 2 lignes) sont retenues ; les listes sur une ligne n'ont rien à
 * préserver. Jamais d'exception : un document illisible rend `{}`.
 *
 * Exemple : `methods/iakaframe.md` porte un `principleIds` de 16 ids wrappé sur 4 lignes → `{
 * principleIds: [5, 5, 5, 1] }`.
 */
export function readListLayout(text: string | undefined | null): ListLayout {
  const layout: ListLayout = {};
  if (text == null) return layout;
  const { raw } = splitDocument(String(text));
  if (!raw) return layout;
  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(KEY_RE);
    if (!m) continue;
    const rest = m[3];
    if (!rest.trim().startsWith("[") || balance(rest) <= 0) continue;
    // Liste flow multi-ligne : on compte les items ligne par ligne, en respectant les quotes.
    const counts: number[] = [];
    let quote: string | null = null;
    let depth = 0;
    let seen = false; // un item est-il en cours sur la ligne courante ?
    let onLine = 0;
    let j = i;
    for (; j < lines.length; j++) {
      const chunk = j === i ? rest : lines[j];
      for (const ch of chunk) {
        if (quote) {
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          seen = true;
          continue;
        }
        if (ch === "[") {
          depth++;
          continue;
        }
        if (ch === "]") {
          depth--;
          if (depth === 0) break;
          continue;
        }
        if (ch === "," && depth === 1) {
          if (seen) onLine++;
          seen = false;
          continue;
        }
        if (!/\s/.test(ch)) seen = true;
      }
      // Fin de ligne physique : on clôt le compte de cette ligne.
      if (depth === 0) {
        if (seen) onLine++;
        counts.push(onLine);
        break;
      }
      counts.push(onLine);
      onLine = 0;
    }
    if (counts.length >= 2) layout[m[2]] = counts;
    i = j;
  }
  return layout;
}

/**
 * Assemble un document `.md` : `---\n<frontmatter>\n---\n<body>`. Les `undefined` de `fields`
 * (champs optionnels absents) sont ignorés. Corps optionnel (défaut vide).
 */
function buildDocument(fields: (Field | undefined)[], body = ""): string {
  const lines = fields
    .filter((f): f is Field => f !== undefined)
    .map((f) =>
      f.kind === "list"
        ? `${f.key}: ${renderFlowList(f.value, f.wrap)}`
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

/**
 * Une **phase** au schéma-fichier du frame (`workflows/<id>.md`, frontmatter `phases:`/`stages:`).
 * Miroir **exact** de la map inline `- { id, label, side?, actorsRoleKeys[], input, output }` —
 * champs `input`/`output`/`side`/`label` que le type riche `Phase` (fusionne en
 * `description`/`offChain`) ne porte pas. `side` présent uniquement hors chaîne (frame : `prod`).
 * Champ d'acteurs **unifié** `actorsRoleKeys` (canon A-2 ; l'alias `agentsRoleKeys` reste **lu** en
 * rétro-compat — correction-biais-modele-frame.md § 3.1).
 */
export interface WorkflowMdPhase {
  id: string;
  label: string;
  side?: string;
  actorsRoleKeys: string[];
  input: string;
  output: string;
}

/**
 * Une **gate** au schéma-fichier du frame (frontmatter `gates:`, **tableau séparé** appariée par
 * `afterPhase`). Miroir de `- { afterPhase, kind, criteria }`.
 */
export interface WorkflowMdGate {
  afterPhase: string;
  kind: GateKind;
  criteria: string;
}

/**
 * `workflows/<id>.md` (frame) — enregistrement **lean, miroir exact** du schéma-fichier autoritaire
 * (frontmatter `phases`/`gates`). Distinct du type riche `Workflow` : il **héberge sans perte** les
 * champs de fichier (`label`/`input`/`output`/`side`/`criteria` séparés) — même pattern que
 * `TeamMd`/`MethodMd`/`KitMd`. `methodId` **optionnel** : le frame ne le porte pas et on ne le
 * force pas (byte-parité : pas de ligne `methodId:` parasite).
 */
export interface WorkflowMd {
  id: string;
  name: string;
  methodId?: string;
  /**
   * **Famille de gouvernance** (`kind` first-class, § 3.1). Optionnel/présent-si-porté : absent du
   * fichier = non émis (lu `pipeline` par les consommateurs). MVP permissif (AC5).
   */
  kind?: WorkflowKind;
  phases: WorkflowMdPhase[];
  gates: WorkflowMdGate[];
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

/**
 * Sérialise un `MethodMd` (ordre des champs = fichier réel `methods/iakaframe.md`).
 *
 * `layout` (optionnel) = découpe en lignes relevée sur le fichier d'origine par
 * {@link readListLayout} : passée, elle **restitue le wrapping** des listes flow (le vrai
 * `methods/iakaframe.md` wrappe `principleIds` sur 4 lignes) au lieu de les reflower sur une seule
 * — donc **zéro diff git parasite** à la réécriture. Omise, la forme reste la **canonique
 * mono-ligne**, byte-identique au CLI (`buildDocument`, `cli/src/lib/frontmatter.js`).
 */
export function serializeMethodMd(
  m: MethodMd,
  body = "",
  layout: ListLayout = {},
): string {
  const workflow =
    m.workflowId && m.workflowId.trim().length > 0
      ? ({ key: "workflowId", kind: "scalar", value: m.workflowId } as Field)
      : undefined;
  const list = (key: string, value: string[]): Field => ({
    key,
    kind: "list",
    value,
    wrap: layout[key],
  });
  return buildDocument(
    [
      { key: "id", kind: "scalar", value: m.id },
      { key: "name", kind: "scalar", value: m.name },
      workflow,
      list("principleIds", m.principleIds),
      list("ritualIds", m.ritualIds),
      list("guardrailIds", m.guardrailIds),
      list("roleKeys", m.roleKeys),
      list("scaffoldIds", m.scaffoldIds),
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

// --- persona (Lot 5a : création d'un atome de pool persona) ------------------

/**
 * Sérialise une persona en `.md`-frontmatter **canonique** — réservé à la **CRÉATION** (fichier
 * neuf : rien à préserver). L'**édition** passe par {@link patchFrontmatter} (non-destructif), pas
 * par ce sérialiseur : un round-trip « parse → serialize » d'une persona existante **jetterait**
 * `description` (blurb de déclenchement du sous-agent, load-bearing) et `vignette` — clés que le
 * type `Persona` ne modélise pas. Ordre des champs = fichiers réels `library/personas/*.md` :
 * `id, name, mission?, roleKey, royaume, pastille?, skills, guardrails`. `roleIndex` n'est **pas** un
 * champ de fichier (dérivé du rôle). `body` = prose optionnelle.
 */
export function serializePersonaMd(
  p: {
    id: string;
    name: string;
    mission?: string;
    roleKey: string;
    royaume: string;
    pastille?: string;
    skills: readonly string[];
    guardrails: readonly string[];
  },
  body = "",
): string {
  const mission =
    p.mission && p.mission.length > 0
      ? ({ key: "mission", kind: "scalar", value: p.mission } as Field)
      : undefined;
  const pastille =
    p.pastille && p.pastille.length > 0
      ? ({ key: "pastille", kind: "scalar", value: p.pastille } as Field)
      : undefined;
  return buildDocument(
    [
      { key: "id", kind: "scalar", value: p.id },
      { key: "name", kind: "scalar", value: p.name },
      mission,
      { key: "roleKey", kind: "scalar", value: p.roleKey },
      { key: "royaume", kind: "scalar", value: p.royaume },
      pastille,
      { key: "skills", kind: "list", value: [...p.skills] },
      { key: "guardrails", kind: "list", value: [...p.guardrails] },
    ],
    body,
  );
}

// --- workflow (étape 3bis : réconciliation GUI ← frame) ----------------------

/**
 * Encodage `.md` du **workflow** — **format frame autoritaire** (doctrine `GUI ← frame`) : les
 * `phases`/`gates` vivent dans le **frontmatter** (séquences de maps inline `- { … }`), `gates` en
 * **tableau séparé** appariée par `afterPhase`. Le lean `WorkflowMd` en est le miroir byte-fidèle ;
 * un **mapper** `mdToWorkflow`/`workflowToMd` le projette sur le type riche `Workflow` (diagramme).
 *
 * L'ancien encodage GUI (frontmatter plat + phases en **bloc `` ```json ``** dans le corps) est
 * **retiré des écritures** ; il reste lu en **repli legacy** (non-régression des workflows créés
 * dans le GUI avant cette étape). Le parseur est défensif (jamais d'exception → `null`).
 */

/** Extrait le contenu du **premier** bloc ```json du corps (`null` si absent). Repli legacy. */
function extractJsonBlock(body: string): string | null {
  const m = body.match(/```json\s*\n([\s\S]*?)\n?```/);
  return m ? m[1] : null;
}

// -- quoting inline-map-aware (piège byte-parité : `,` `:` `{` `}` `[` `]` nus cassent le parse) --

/**
 * Une valeur scalaire **dans une map inline** `{ … }` doit-elle être quotée ? On étend
 * {@link needsScalarQuote} (vide, espace de bord, mot-clé, entier, tête ambiguë) aux caractères qui
 * **casseraient le parse de la map inline** s'ils restaient nus : `,` (sépare les paires), `:`
 * (sépare clé/valeur), `{` `}` `[` `]` (bornent maps/listes). Les valeurs simples (`besoin`,
 * `human`, `p1`, `Déploiement prod`) restent **nues** — byte-parité avec le fichier réel du frame.
 */
function needsInlineMapQuote(s: string): boolean {
  return needsScalarQuote(s) || /[,:{}[\]]/.test(s);
}

/** Rend une valeur scalaire de map inline (quotée au besoin, quoting inline-map-aware). */
function renderInlineScalar(v: string): string {
  return needsInlineMapQuote(v) ? `"${v}"` : v;
}

/** Rend une map inline `{ k: v, … }` à partir de paires déjà rendues. */
function renderInlineMap(pairs: string[]): string {
  return `{ ${pairs.join(", ")} }`;
}

/**
 * Sérialise un `WorkflowMd` en `.md` **frame-format canonique** (byte-parité **structurelle**, pas
 * l'alignement manuel — celui-ci passe par la capture verbatim côté hôte, cf. `serializeWorkflowDoc`).
 * `phases`/`gates` en **frontmatter**, maps inline indentées de 2 espaces, ordre de champ
 * `id, label, side?, actorsRoleKeys, input, output` (`side` omis si absent), `gates` en tableau
 * séparé `{ afterPhase, kind, criteria }`, **`methodId`/`kind` omis si absents**. `body` = prose.
 * **Aucun** bloc `` ```json `` n'est écrit.
 */
export function serializeWorkflowFrontmatterMd(md: WorkflowMd, body = ""): string {
  const lines: string[] = [
    `id: ${renderScalar(md.id)}`,
    `name: ${renderScalar(md.name)}`,
  ];
  if (md.methodId && md.methodId.trim().length > 0) {
    lines.push(`methodId: ${renderScalar(md.methodId)}`);
  }
  // `kind` first-class émis quand présent (jamais défaulté : un fichier sans `kind` le reste,
  // byte-neutralité — correction-biais-modele-frame.md § 3.1 / AC5).
  if (md.kind && md.kind.trim().length > 0) {
    lines.push(`kind: ${renderScalar(md.kind)}`);
  }
  lines.push("phases:");
  for (const p of md.phases) {
    const pairs = [`id: ${renderInlineScalar(p.id)}`, `label: ${renderInlineScalar(p.label)}`];
    if (p.side !== undefined && p.side.length > 0) {
      pairs.push(`side: ${renderInlineScalar(p.side)}`);
    }
    pairs.push(`actorsRoleKeys: ${renderFlowList(p.actorsRoleKeys)}`);
    pairs.push(`input: ${renderInlineScalar(p.input)}`);
    pairs.push(`output: ${renderInlineScalar(p.output)}`);
    lines.push(`  - ${renderInlineMap(pairs)}`);
  }
  lines.push("gates:");
  for (const g of md.gates) {
    lines.push(
      `  - ${renderInlineMap([
        `afterPhase: ${renderInlineScalar(g.afterPhase)}`,
        `kind: ${renderInlineScalar(g.kind)}`,
        `criteria: ${renderInlineScalar(g.criteria)}`,
      ])}`,
    );
  }
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

/** Construit un `WorkflowMd` (lean) depuis un frontmatter déjà parsé (frame-format). Défensif. */
function coerceWorkflowMd(id: string, data: FrontmatterData): WorkflowMd | null {
  if (!Array.isArray(data.phases)) return null;
  const phases: WorkflowMdPhase[] = [];
  for (const raw of data.phases) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const r = raw as Record<string, FrontmatterValue>;
    const pid = asString(r.id).trim();
    if (!pid) continue;
    // Champ d'acteurs unifié : `actorsRoleKeys` (canon A-2) sinon alias lu `agentsRoleKeys` (rétro-compat).
    const actorsRaw = r.actorsRoleKeys != null ? r.actorsRoleKeys : r.agentsRoleKeys;
    const phase: WorkflowMdPhase = {
      id: pid,
      label: asString(r.label) || pid,
      actorsRoleKeys: asStringArray(actorsRaw),
      input: asString(r.input),
      output: asString(r.output),
    };
    const side = asString(r.side).trim();
    if (side) phase.side = side;
    phases.push(phase);
  }
  if (phases.length === 0) return null;
  const gates: WorkflowMdGate[] = [];
  if (Array.isArray(data.gates)) {
    for (const raw of data.gates) {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
      const r = raw as Record<string, FrontmatterValue>;
      const afterPhase = asString(r.afterPhase).trim();
      if (!afterPhase) continue;
      gates.push({
        afterPhase,
        kind: asString(r.kind).trim() === "auto" ? "auto" : "human",
        criteria: asString(r.criteria),
      });
    }
  }
  const md: WorkflowMd = { id, name: asString(data.name) || id, phases, gates };
  const methodId = asString(data.methodId).trim();
  if (methodId) md.methodId = methodId;
  // `kind` first-class, présent-si-porté (permissif : toute valeur non vide, § 3.1 / AC5).
  const kind = asString(data.kind).trim();
  if (kind) md.kind = kind as WorkflowKind;
  return md;
}

/** Parse un `.md` frame-format → `WorkflowMd` (lean, byte-fidèle ; `null` si pas frame-format). */
export function parseWorkflowFrontmatterMd(text: string | undefined | null): WorkflowMd | null {
  const { data } = parseFrontmatter(text);
  const id = asString(data.id).trim();
  if (!id) return null;
  return coerceWorkflowMd(id, data);
}

// -- mapper WorkflowMd <-> Workflow (riche) : le fichier lean héberge input/output/side séparés ;
//    le riche fusionne (`description = input → output`, `offChain = side === "prod"`). Les champs
//    de calage riches (badge/roleDisplay/gate.display/section*) n'ont pas de home dans le frame :
//    ils restent in-memory (repli du diagramme), jamais écrits.

/** Séparateur « entrée → sortie » du champ riche `description` (miroir du littéral canonique). */
const WORKFLOW_IO_ARROW = " → ";
/** Méthode par défaut : `methodId` absent du fichier ⇒ riche défaulté ; réciproquement omis. */
const WORKFLOW_DEFAULT_METHOD_ID = "iakaframe";

/**
 * Projette un `WorkflowMd` (fichier) sur le type riche `Workflow` (diagramme/atelier). `label`→`name`,
 * `actorsRoleKeys`→`roleKeys`, `input`/`output`→`description` (« input → output »), `side: prod`→
 * `offChain`, gate appariée par `afterPhase` (`criteria`→`condition`). `order` = index de position.
 * `methodId` absent → défaulté (in-memory ; réciproquement omis à l'écriture).
 */
export function mdToWorkflow(md: WorkflowMd): Workflow {
  const gateByPhase = new Map<string, WorkflowMdGate>();
  for (const g of md.gates) if (!gateByPhase.has(g.afterPhase)) gateByPhase.set(g.afterPhase, g);
  const phases: Phase[] = md.phases.map((p, index) => {
    const g = gateByPhase.get(p.id);
    const description =
      p.output && p.output.length > 0 ? `${p.input}${WORKFLOW_IO_ARROW}${p.output}` : p.input;
    const phase: Phase = {
      id: p.id,
      order: index,
      name: p.label,
      description,
      roleKeys: [...p.actorsRoleKeys],
      gate: g ? { kind: g.kind, condition: g.criteria } : { kind: "human", condition: "" },
    };
    if (p.side === "prod") phase.offChain = true;
    return phase;
  });
  const wf: Workflow = {
    id: md.id,
    name: md.name,
    methodId:
      md.methodId && md.methodId.length > 0 ? md.methodId : WORKFLOW_DEFAULT_METHOD_ID,
    phases,
  };
  if (md.kind) wf.kind = md.kind; // `kind` traverse le mapper (present-si-porté).
  return wf;
}

/**
 * Reprojette un `Workflow` riche sur son `WorkflowMd` (fichier). `name`→`label`, `roleKeys`→
 * `actorsRoleKeys`, `description` **re-scindée** sur `WORKFLOW_IO_ARROW` en `input`/`output`,
 * `offChain`→`side: prod`, gate→`gates[]` séparé. `methodId` **omis** s'il est absent ou égal au
 * défaut (byte-parité : pas de ligne `methodId:` parasite sur le workflow du frame). Les champs de
 * calage riches ne sont **pas** portés (pas de home fichier).
 */
export function workflowToMd(wf: Workflow): WorkflowMd {
  const ordered = [...wf.phases].sort((a, b) => a.order - b.order);
  const phases: WorkflowMdPhase[] = ordered.map((p) => {
    const at = p.description.indexOf(WORKFLOW_IO_ARROW);
    const input = at >= 0 ? p.description.slice(0, at) : p.description;
    const output = at >= 0 ? p.description.slice(at + WORKFLOW_IO_ARROW.length) : "";
    const phase: WorkflowMdPhase = {
      id: p.id,
      label: p.name,
      actorsRoleKeys: [...p.roleKeys],
      input,
      output,
    };
    if (p.offChain === true) phase.side = "prod";
    return phase;
  });
  const gates: WorkflowMdGate[] = ordered.map((p) => ({
    afterPhase: p.id,
    kind: p.gate.kind,
    criteria: p.gate.condition,
  }));
  const md: WorkflowMd = { id: wf.id, name: wf.name, phases, gates };
  if (wf.methodId && wf.methodId.length > 0 && wf.methodId !== WORKFLOW_DEFAULT_METHOD_ID) {
    md.methodId = wf.methodId;
  }
  if (wf.kind) md.kind = wf.kind; // `kind` reprojeté sur le fichier (present-si-porté).
  return md;
}

/**
 * Sérialise un `Workflow` riche en `.md` **frame-format** (via `workflowToMd`). `body` = prose
 * optionnelle. **Aucun** bloc `` ```json ``. Pour le round-trip **byte-exact** d'un fichier ouvert
 * non édité (alignement manuel du frontmatter), l'hôte ré-émet le **source capturé verbatim** —
 * cette sérialisation est la forme **canonique** (édition / document neuf).
 */
export function serializeWorkflowMd(wf: Workflow, body = ""): string {
  return serializeWorkflowFrontmatterMd(workflowToMd(wf), body);
}

/**
 * Parse un `.md` workflow → `Workflow` riche (défensif ; `null` sans `id` ou sans donnée lisible).
 * **Frame-format autoritaire prioritaire** : `phases` en frontmatter → `coerceWorkflowMd` +
 * `mdToWorkflow`. **Legacy en repli** : pas de `phases` frontmatter mais un bloc `` ```json `` dans
 * le corps → ancien parcours (non-régression des workflows GUI-format). Sinon → `null`.
 */
export function parseWorkflowMd(text: string | undefined | null): Workflow | null {
  const { data, body } = parseFrontmatter(text);
  const id = asString(data.id).trim();
  if (!id) return null;
  // Frame-format autoritaire : phases en frontmatter.
  if (Array.isArray(data.phases)) {
    const md = coerceWorkflowMd(id, data);
    return md ? mdToWorkflow(md) : null;
  }
  // Legacy JSON-in-body (repli, lecture seule).
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

// ---------------------------------------------------------------------------
// 4. PATCHEUR NON-DESTRUCTIF (Lot 5a, C1) — édition-en-place du frontmatter
// ---------------------------------------------------------------------------
//
// AJOUT PUR (aucune signature existante modifiée). Le round-trip naïf « type → serialize »
// JETTE les clés non modélisées par le type (pour une persona : `description` — le blurb de
// déclenchement du sous-agent, load-bearing — et `vignette`) + le corps + le layout des listes.
// `patchFrontmatter` évite cette régression : il **ne réécrit une ligne que si sa valeur change
// réellement** ; toute clé absente du patch, toute clé inchangée, tout le corps et le layout
// d'origine sont **préservés à l'octet**. Un patch qui ne change rien ⇒ document byte-identique
// (invariant du round-trip AC3). Zéro dépendance : réutilise `parseFrontmatter`/`balance`/KEY_RE.

/** Une valeur de patch : scalaire (`clé: valeur`) ou liste flow (`clé: [a, b, …]`). */
export type PatchField =
  | { kind: "scalar"; value: Scalar }
  | { kind: "list"; value: readonly Scalar[] };

/** Un patch de frontmatter : par clé, la valeur voulue (les autres clés restent verbatim). */
export type FrontmatterPatch = Record<string, PatchField>;

/** Span de lignes (indices dans le bloc frontmatter, `end` exclusif) occupé par une clé. */
interface KeySpan {
  key: string;
  start: number;
  end: number;
}

/**
 * Relève, sur les lignes du **bloc frontmatter** (sans les `---`), le span de lignes de chaque clé
 * de 1er niveau. Miroir de la tokenisation de {@link parseFrontmatterBody} (blocs `- …` indentés,
 * listes/maps flow multi-lignes via {@link balance}) — indispensable pour remplacer une clé SANS
 * toucher aux voisines. Les lignes blanches/commentaires n'appartiennent à aucune clé.
 */
function frontmatterKeySpans(fmLines: string[]): KeySpan[] {
  const spans: KeySpan[] = [];
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const m = line.match(KEY_RE);
    if (!m) {
      i++;
      continue;
    }
    const baseIndent = m[1].length;
    const key = m[2];
    const rest = m[3];
    const start = i;
    if (rest.trim() === "") {
      // Valeur en bloc : séquence `- …` indentée (avec continuation flow multi-ligne).
      let j = i + 1;
      while (j < fmLines.length) {
        const l = fmLines[j];
        if (l.trim() === "") {
          j++;
          continue;
        }
        if (indentOf(l) <= baseIndent) break;
        const sm = l.match(/^\s*-\s?(.*)$/);
        if (!sm) break;
        let itemText = sm[1];
        while (balance(itemText) > 0 && j + 1 < fmLines.length) {
          j++;
          itemText += " " + fmLines[j].trim();
        }
        j++;
      }
      spans.push({ key, start, end: j });
      i = j;
      continue;
    }
    // Valeur inline, potentiellement liste/map flow multi-ligne.
    if ((rest.trim().startsWith("[") || rest.trim().startsWith("{")) && balance(rest) > 0) {
      let acc = rest;
      let j = i;
      while (balance(acc) > 0 && j + 1 < fmLines.length) {
        j++;
        acc += " " + fmLines[j].trim();
      }
      spans.push({ key, start, end: j + 1 });
      i = j + 1;
      continue;
    }
    spans.push({ key, start, end: i + 1 });
    i++;
  }
  return spans;
}

/** Rend UNE ligne de frontmatter pour une clé patchée (forme canonique, indent 0). */
function renderPatchLine(key: string, field: PatchField): string {
  return field.kind === "list"
    ? `${key}: ${renderFlowList(field.value)}`
    : `${key}: ${renderScalar(field.value)}`;
}

/** Deux valeurs de frontmatter sont-elles sémantiquement égales (⇒ ligne laissée verbatim) ? */
function sameFrontmatterValue(existing: FrontmatterValue | undefined, field: PatchField): boolean {
  if (field.kind === "list") {
    if (!Array.isArray(existing)) return false;
    if (existing.length !== field.value.length) return false;
    return existing.every((e, i) => String(e) === String(field.value[i]));
  }
  if (existing == null || Array.isArray(existing) || typeof existing === "object") return false;
  return String(existing) === String(field.value);
}

/**
 * Réécrit un `.md` en **préservant tout ce que le patch ne touche pas** (AC2/AC3). Pour chaque clé
 * du patch : si la valeur est **inchangée** (ou la clé bornée d'un span multi-ligne dont la valeur
 * n'a pas bougé), la/les ligne(s) d'origine sont laissées **verbatim** ; si elle **change**, son span
 * est remplacé par **une** ligne canonique ; si la clé est **absente**, une ligne canonique est
 * **ajoutée** en fin de frontmatter. Les clés hors patch (`description`, `vignette`, `id`, …), le
 * **corps** et les lignes blanches/commentaires du frontmatter restent **intacts à l'octet**.
 *
 * Défensif : document sans frontmatter délimité (`---` … `---`) → rendu inchangé. Travaille sur les
 * bytes en découpant sur `\n` (round-trip LF exact ; les fichiers de la bibliothèque sont en LF).
 */
export function patchFrontmatter(rawMd: string, patch: FrontmatterPatch): string {
  const src = String(rawMd);
  const lines = src.split("\n");
  if (lines[0] !== "---") return src;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---" || lines[i] === "...") {
      end = i;
      break;
    }
  }
  if (end < 0) return src;

  const fmLines = lines.slice(1, end);
  const tail = lines.slice(end); // le `---` fermant + le corps, préservés tels quels
  const { data } = parseFrontmatter(src);
  const spans = frontmatterKeySpans(fmLines);
  const spanByKey = new Map(spans.map((s) => [s.key, s]));

  // Remplacements en place (des plus BAS aux plus HAUTS, pour ne pas décaler les index restants).
  const touched = [...spans]
    .filter((s) => patch[s.key] !== undefined)
    .sort((a, b) => b.start - a.start);
  let next = [...fmLines];
  for (const s of touched) {
    const field = patch[s.key];
    if (sameFrontmatterValue(data[s.key], field)) continue; // valeur inchangée → verbatim
    next = [...next.slice(0, s.start), renderPatchLine(s.key, field), ...next.slice(s.end)];
  }

  // Ajouts (clés absentes du frontmatter d'origine) — en fin de bloc, ordre du patch.
  for (const key of Object.keys(patch)) {
    if (spanByKey.has(key)) continue;
    next.push(renderPatchLine(key, patch[key]));
  }

  return ["---", ...next, ...tail].join("\n");
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
