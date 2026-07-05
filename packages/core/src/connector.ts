/**
 * connector.ts — le **connecteur (MCP)** (concept de 1re classe, AR-8) — cœur 🟦.
 *
 * Contrat § 2.6 : une source d'outils/ressources externes (serveur MCP) attachable à une
 * team. En P1, une team ne porte que des **ids de connecteurs** (`Team.connectors:
 * string[]`) — la génération du `.mcp.json` et la découverte dynamique des tools sont
 * **différées**. On expose ici l'interface déclarative.
 *
 * Invariant secret (contrat § 2.6) : AUCUN credential dans la déclaration ; les secrets
 * vont au keychain (aucun secret manipulé en P1).
 */

/** Transport d'un connecteur MCP. */
export type ConnectorTransport = "stdio" | "http" | "sse" | "ws";

/** Déclaration d'un connecteur MCP (MVP = déclaration d'id ; génération différée). */
export interface Connector {
  /** Id stable du connecteur (ex. "filesystem"). */
  id: string;
  /** Libellé lisible. */
  name: string;
  /** Transport. */
  transport: ConnectorTransport;
}
