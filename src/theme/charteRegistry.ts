/**
 * charteRegistry — registre MINIMAL des chartes disponibles (source de vérité, MVP).
 *
 * Reco Q-3 : au FRONT au MVP (c'est une préoccupation d'UI de la forge). Option notée :
 * remonter le concept « charte » dans `@iakaframe/core` plus tard, SI la forge et le
 * Cockpit doivent partager le catalogue. Non tranché ici → différé.
 *
 * Chaque `id` correspond à une feuille vendorisée `src/themes/<id>.css` exposant son jeu
 * de tokens scopé `:root[data-theme="<id>"]`. La commutation = poser data-theme sur <html>.
 */

export interface CharteDef {
  /** Identifiant technique = valeur de data-theme + nom du fichier de thème. */
  id: string;
  /** Libellé humain affiché dans le sélecteur. */
  label: string;
  /** Charte par défaut si aucune préférence n'est enregistrée. */
  default?: boolean;
}

export const charteRegistry: CharteDef[] = [
  { id: "cinabre", label: "Cinabre", default: true },
  { id: "naonedge", label: "NaonEdge" },
];

export type CharteId = string;

/** Id de la charte par défaut (Cinabre). Repli sûr si le registre changeait. */
export const DEFAULT_CHARTE: CharteId =
  charteRegistry.find((c) => c.default)?.id ?? charteRegistry[0]?.id ?? "cinabre";

/** Vrai si `id` correspond à une charte connue du registre. */
export function isKnownCharte(id: string | null | undefined): id is CharteId {
  return !!id && charteRegistry.some((c) => c.id === id);
}
