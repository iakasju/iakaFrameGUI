/**
 * types.ts — contrat de l'**adaptateur de runner** (concept § 3.4) — cœur partagé 🟦.
 *
 * Un adaptateur traduit une **team PURE** en **arborescence de fichiers déployables**
 * (`KitFileTree`) pour un **nœud** donné (`NodeKind`). La fonction est **PURE** (aucune I/O,
 * aucun `fs`) → l'arbre est inspectable en mémoire, donc testable **sans nœud réel**.
 * L'écriture disque (déploiement) vit ailleurs (forge Rust `kit_deploy`), derrière un
 * pathguard.
 *
 * Extensibilité (AR-4) : l'interface `RunnerAdapter` est générique ; au MVP seul le nœud
 * `claude` est **implémenté**, les autres (`codex`, `ollama-*`) sont **déclarés** non
 * implémentés (P3b) — l'archi reste ouverte sans les coder.
 */

import type { Team } from "../team";
import type { Method } from "../method";
import type { Binding } from "../binding";
import type { KitFormat, NodeKind } from "../node";

/**
 * Arborescence de fichiers déployables **en mémoire** : chemins **relatifs** au dossier
 * cible → contenu texte. Ex. `".claude/agents/aragorn.md"`. Le déploiement écrit ce
 * dictionnaire tel quel (le pathguard valide chaque chemin).
 */
export interface KitFileTree {
  files: Record<string, string>;
}

/** Options de génération (contexte injecté par l'appelant, jamais lu du disque). */
export interface KitGenOptions {
  /**
   * **Contexte de méthode** (E2, Q-3) : la `Method` du Kit d'où proviennent le **workflow**
   * (via `resolveWorkflow`) et l'**id de méthode**. **Optionnel** (rétro-compat) : **sans
   * `method`**, les adaptateurs se replient sur le **canonique** → sortie **byte-identique**
   * à l'actuelle.
   */
  method?: Method;
  /** Corps du fichier-contrat de méthode (inséré tel quel dans `CLAUDE.md`). */
  methodInstructions?: string;
  /**
   * Host LAN pour le nœud `ollama-lan` (Q-5 : champ de nœud paramétrable). Injecté à la
   * génération ; si absent, l'`AGENTS.md` porte le **placeholder documenté** `<host-lan>` à
   * compléter par l'utilisateur. Ignoré par les autres nœuds.
   */
  lanHost?: string;
  /**
   * **Binding** de liaison (P7, E1) : couple `runner + modèle` **par persona**, produit par la
   * forge. **Optionnel** (rétro-compat) : **sans `binding`**, aucun modèle n'est émis → sortie
   * **byte-identique** à l'actuelle (kit pur). Avec `binding`, chaque adaptateur émet le modèle
   * **de la persona** (lookup `binding.bindings`, modèle vide → rien émis). Le modèle vient
   * **toujours du Binding**, **jamais de la Team**.
   */
  binding?: Binding;
}

/**
 * Adaptateur de runner : `team pure → KitFileTree` pour un `NodeKind`. Fonction **pure**.
 * `implemented` distingue l'adaptateur de référence (`claude`) des nœuds différés (P3b) :
 * un adaptateur non implémenté existe (archi ouverte) mais `generate` lève.
 */
export interface RunnerAdapter {
  /** Nœud de destination (AR-4). */
  readonly node: NodeKind;
  /** Format de kit associé (résolu via les helpers P2, jamais réécrit). */
  readonly kitFormat: KitFormat;
  /** `true` = adaptateur réel (MVP : `claude` seul) ; `false` = déclaré, non codé (P3b). */
  readonly implemented: boolean;
  /** Génère l'arborescence déployable pour la team (pur). Lève si non implémenté. */
  generate(team: Team, opts?: KitGenOptions): KitFileTree;
}
