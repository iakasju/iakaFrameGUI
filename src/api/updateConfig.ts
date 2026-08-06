/**
 * updateConfig — **source unique** des constantes de mise à jour côté front.
 *
 * Rien n'est recopié à la main : la version courante et la liste ordonnée d'endpoints sont **lues
 * dans `tauri.conf.json`** au build (import JSON). C'est ce qui garantit que l'écran des Réglages
 * affiche l'endpoint **réellement interrogé** par le plugin, et la version **réellement bundlée** —
 * une constante dupliquée aurait dérivé au premier changement de canal (D2 : « le passage à un autre
 * flux ne coûte qu'un changement d'URL dans `tauri.conf.json` », donc **zéro** autre endroit à éditer).
 *
 * L'appel HTTP lui-même n'est PAS émis d'ici : il part du backend Rust (plugin updater). Ce module ne
 * fait que **dire** ce que la configuration contient.
 */
import tauriConf from "../../src-tauri/tauri.conf.json";

/** Version bundlée de l'application (celle que l'updater compare au manifeste). */
export const APP_VERSION: string = tauriConf.version;

/**
 * Liste **ordonnée** des endpoints du manifeste : le plugin les essaie dans l'ordre et le premier
 * qui répond gagne. Aujourd'hui un seul (Forgejo LAN) ; demain on **préfixe** sans toucher au code.
 */
export const UPDATE_ENDPOINTS: readonly string[] = tauriConf.plugins.updater.endpoints;

/** Endpoint de tête — celui qu'on montre à l'utilisateur (« d'où vient la mise à jour »). */
export const PRIMARY_UPDATE_ENDPOINT: string = UPDATE_ENDPOINTS[0] ?? "";
