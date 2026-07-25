/**
 * identity.ts — l'**identité du copilote d'authoring**, DÉRIVÉE du canon (jamais réécrite).
 *
 * Décision du décideur (2026-07-25, `specs/instructions/feanor-copilote-du-gui.md`) : le LLM interne
 * du GUI **est** le persona **Fëanor** (9ᵉ rôle canonique `frame`). Ce module lit sa fiche dans la
 * **racine bibliothèque active** — par le chemin déjà emprunté par `loadFrame` (`poolReadAll`),
 * **aucun I/O neuf** — et en dérive l'identité + la charte injectées dans le prompt système.
 *
 * **Doctrine GUI ← frame (I-1)** : rien n'est recopié ici. Une identité réécrite en dur dériverait
 * du canon en silence — la classe de défaut du « contrat fantôme » (v0.3.10), cohérente et invisible
 * aux tests.
 *
 * **Dérivation par RÔLE, pas par nom** (`roleKey === "frame"`) : même geste que la facette
 * portefeuille du `Frame` (v0.3.4), robuste au renommage libre de la persona (AR-5).
 *
 * Défensif de bout en bout : racine introuvable, fiche absente ou illisible → `null`. **Jamais
 * d'identité de substitution** : une persona approximative serait une ventriloquie (I-5).
 */
import {
  parseFrontmatter,
  parsePersona,
  personaBadge,
  verbatimBody,
  type Persona,
} from "@iakaframe/core";
import { backend, type Backend } from "../../api/backend";

/** Clé du rôle canonique porté par le copilote du GUI (9ᵉ rôle, « Constructeur de frame »). */
export const COPILOTE_ROLE_KEY = "frame";

/** L'identité injectable : la persona canon + sa charte (le corps VERBATIM de sa fiche). */
export interface CopiloteIdentity {
  persona: Persona;
  /** Corps markdown de la fiche, **verbatim** — le périmètre étanche tel que le canon l'écrit. */
  charter: string;
}

/**
 * Badge d'**ouverture** : pastille **AVANT** le bloc (`🟠 [FRAME][Fëanor]`). La **position** de la
 * pastille porte le sens — jamais un mot-clé « START ».
 *
 * Posé par l'**UI**, jamais demandé au modèle : le schéma JSON de sortie reste intact (I-6). Ce
 * n'est pas de la ventriloquie (I-5) — l'UI identifie un contenu **réellement produit** par Fëanor,
 * elle ne lui fait pas dire des mots qu'il n'a pas produits.
 */
export function copiloteBadgeOpen(identity: CopiloteIdentity): string {
  const { pastille } = identity.persona;
  return `${pastille ? `${pastille} ` : ""}${badgeCore(identity)}`;
}

/** Badge de **clôture** : pastille **APRÈS** le bloc (`[FRAME][Fëanor] 🟠`). */
export function copiloteBadgeClose(identity: CopiloteIdentity): string {
  const { pastille } = identity.persona;
  return `${badgeCore(identity)}${pastille ? ` ${pastille}` : ""}`;
}

function badgeCore(identity: CopiloteIdentity): string {
  return personaBadge(identity.persona);
}

/**
 * Charge l'identité du copilote depuis la racine bibliothèque active.
 *
 * `null` si la racine est introuvable, si aucune fiche ne porte le rôle `frame`, ou si la fiche est
 * illisible — l'appelant **le dit à l'utilisateur** et retombe sur le prompt anonyme.
 */
export async function loadCopiloteIdentity(
  api: Backend = backend,
): Promise<CopiloteIdentity | null> {
  let files: string[];
  try {
    files = await api.poolReadAll("personas");
  } catch {
    return null; // racine introuvable / backend indisponible (hors Tauri) → pas d'identité.
  }

  for (const text of files) {
    const { data } = parseFrontmatter(text);
    const persona = parsePersona(data);
    if (persona && persona.roleKey === COPILOTE_ROLE_KEY) {
      // `verbatimBody` et NON `parseFrontmatter().body` : ce dernier strippe la ligne blanche de
      // tête. « Verbatim » doit vouloir dire verbatim — même exigence que la capture d'Open→Save.
      return { persona, charter: verbatimBody(text) };
    }
  }
  return null;
}
