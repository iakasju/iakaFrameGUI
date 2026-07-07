/**
 * handoff.ts — le **paquet de HANDOFF** forge → cockpit (H1, MVP `team.json` + `handoff.json`).
 *
 * PUR (zéro I/O, zéro horloge lue ici) : construit les DEUX artefacts d'une livraison à partir
 * d'une `Team` PURE et d'un horodatage FOURNI (epoch ms, résolu côté Rust `now_millis` — jamais
 * `Date.now()` : l'artefact doit être reproductible et l'horloge vient du backend). L'écriture
 * disque vit dans la forge Rust (`handoff.rs`, façade unique) ; ce module ne fait que produire
 * les chaînes JSON.
 *
 * `team.json` = définition PURE (canonique, `serializeTeam` → aucun runner/modèle, AR-1).
 * `handoff.json` = MANIFESTE de provenance (§ 5 de l'instruction H1) : d'où vient la team, sa
 * version, et une **empreinte** (`originHash`) du contenu de `team.json`. C'est cette empreinte
 * que le cockpit compare au ré-import pour détecter une dérive (parade `CLAUDE.md`).
 */

import { serializeTeam, type Team } from "./team";

/** Provenance écrite par la forge à côté du `team.json` livré (source de vérité de l'origine). */
export interface HandoffManifest {
  /** Émetteur du paquet — toujours la forge au MVP (circulation descendante). */
  source: "forge";
  /** Id de la team livrée (= nom du sous-dossier de handoff). */
  teamId: string;
  /** Nom d'affichage de la team (confort de lecture côté cockpit). */
  teamName: string;
  /** Version de la livraison — empreinte courte, stable par contenu (change si la team change). */
  version: string;
  /** Horodatage ISO-8601 de la livraison (dérivé de l'epoch ms fourni par le backend). */
  timestamp: string;
  /** Empreinte du contenu exact de `team.json` (détection de dérive au ré-import). */
  originHash: string;
}

/** Le paquet complet produit par une livraison (les deux fichiers + le manifeste typé). */
export interface HandoffPackage {
  /** Contenu de `team.json` (Team PURE sérialisée). */
  teamJson: string;
  /** Contenu de `handoff.json` (manifeste de provenance sérialisé). */
  handoffJson: string;
  /** Le manifeste typé (pratique pour l'UI / les tests). */
  manifest: HandoffManifest;
}

/**
 * Empreinte déterministe et portable (FNV-1a 32 bits → hex 8 caractères). Ce n'est PAS un
 * hash cryptographique : son seul rôle est de **détecter un changement de contenu** (dérive)
 * de manière stable et reproductible entre la forge et le cockpit. Le même contenu produit
 * TOUJOURS la même empreinte (aucune horloge, aucun aléa).
 */
export function stableHash(content: string): string {
  let hash = 0x811c9dc5; // FNV offset basis (32 bits)
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i) & 0xff;
    // FNV prime 16777619, en arithmétique 32 bits non signée.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Construit le paquet de handoff d'une team. `nowMillis` = epoch ms fourni par le backend
 * (`now_millis`) — pas `Date.now()`. La team est passée par `serializeTeam` (garantit la
 * pureté AR-1 : aucune clé runner/model ne peut fuiter dans `team.json`, même si l'objet en
 * mémoire était pollué). L'`originHash` est calculé sur le contenu EXACT de `team.json`.
 */
export function buildHandoffPackage(team: Team, nowMillis: number): HandoffPackage {
  const teamJson = serializeTeam(team);
  const originHash = stableHash(teamJson);
  const timestamp = new Date(nowMillis).toISOString();
  const manifest: HandoffManifest = {
    source: "forge",
    teamId: team.id,
    teamName: team.name,
    version: originHash, // version = empreinte du contenu (stable, change si la team change)
    timestamp,
    originHash,
  };
  const handoffJson = JSON.stringify(manifest, null, 2);
  return { teamJson, handoffJson, manifest };
}

/** Nom canonique des fichiers du paquet (partagé forge/cockpit — évite les chaînes magiques). */
export const HANDOFF_FILES = {
  team: "team.json",
  manifest: "handoff.json",
} as const;
