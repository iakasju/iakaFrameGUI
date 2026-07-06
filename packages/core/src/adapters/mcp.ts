/**
 * mcp.ts — rendu du **`.mcp.json`** au **format MCP standard** (P3b, Q-4).
 *
 * Décision Q-4 : le `.mcp.json` est généré pour **tous** les nœuds (claude/codex/ollama) dès
 * qu'une team déclare ≥ 1 connecteur, au **même format standard** que Claude Code (pas de
 * ciblage des formats propres des outils agentiques pour l'instant — évolution future notée).
 *
 * Pur, déterministe : ids dédupliqués + triés ; jamais de secret (au MVP la team ne porte que
 * des **ids** de connecteurs, la config complète est différée au déploiement/Cockpit).
 *
 * NB : l'adaptateur Claude Code P3 (`claudeCode.ts`) conserve sa propre copie privée de ce
 * rendu — il n'est **pas** modifié (invariant de non-régression § 7). Ce module sert les
 * adaptateurs `AGENTS.md` (codex/ollama) et centralise la logique pour eux.
 */

/** Sérialise un objet en JSON indenté (2 espaces) avec `\n` final (lisible sur disque). */
function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

/**
 * Rend un `.mcp.json` (format MCP standard) depuis une liste d'ids de connecteurs. Une entrée
 * `stdio` minimale par id (déclaration à compléter côté déploiement/Cockpit). Ids triés.
 */
export function renderMcpJson(connectors: string[]): string {
  const ids = [...new Set(connectors)].sort();
  const mcpServers: Record<string, { type: "stdio"; command: string }> = {};
  for (const id of ids) mcpServers[id] = { type: "stdio", command: id };
  return json({ mcpServers });
}
