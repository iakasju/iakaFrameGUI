/**
 * personaPersist — écriture disque **non-destructive** du pilote persona (Lot 5a,
 * persistance-disque-authoring-elements.md). Extrait de `PersonaReservoir` pour un module de
 * fonctions pur (fast-refresh : un fichier de composants n'exporte que des composants).
 *
 * Édition (fichier présent) → `patchFrontmatter` : ne réécrit que les champs édités, **préserve**
 * `description` (blurb de déclenchement du sous-agent, load-bearing), `vignette`, toute clé inconnue
 * et le corps, à l'octet. Création (fichier absent) → `serializePersonaMd` canonique. L'id est
 * **verrouillé** en édition (C-1 : jamais de renommage). Rust reste un passe-plat (`poolWrite`).
 */
import {
  patchFrontmatter,
  personaFrontmatterPatch,
  serializePersonaMd,
  type Persona,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";

/**
 * Persiste une persona dans `<IAKAFRAME_HOME>/library/personas/<id>.md`. Relire le `.md` d'origine
 * (`poolRead`) est ce qui rend le patch non-destructif : on repart des octets réels, on ne réémet
 * jamais depuis le seul type. Rejette (via `poolWrite`) hors Tauri / racine non résolue — l'appelant
 * dégrade proprement (message, jamais une stack).
 */
export async function persistPersona(persona: Persona, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("personas", persona.id);
  const md =
    existing != null
      ? patchFrontmatter(existing, personaFrontmatterPatch(persona)) // édition : patch en place
      : serializePersonaMd(persona); // création : fichier neuf, forme canonique
  await api.poolWrite("personas", persona.id, md);
}
