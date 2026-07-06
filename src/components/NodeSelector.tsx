/**
 * NodeSelector — choix du **nœud** de déploiement (P4, U-1). Le `<select>` est peuplé par
 * **`implementedNodes()`** du registre (jamais une liste en dur) : la disponibilité d'un nœud
 * est portée par son adaptateur (`implemented:true`), pas par l'UI. Pour **`ollama-lan`**, on
 * révèle un champ **host** (Q-5) : l'endpoint LAN est paramétrable à la génération.
 *
 * Présentationnel : aucune logique de flux ici — le hook `useForgeDeploy` porte l'état.
 */
import { implementedNodes, type NodeKind } from "@iakaframe/core";

/** Libellés lisibles des nœuds (les valeurs restent les `NodeKind` canoniques). */
const NODE_LABELS: Readonly<Record<NodeKind, string>> = {
  claude: "Claude Code",
  codex: "Codex",
  "ollama-localhost": "Ollama (localhost)",
  "ollama-lan": "Ollama (LAN)",
  openwebui: "Open WebUI",
};

export function NodeSelector({
  node,
  lanHost,
  onSelectNode,
  onLanHostChange,
}: {
  node: NodeKind | null;
  lanHost: string;
  onSelectNode: (n: NodeKind) => void;
  onLanHostChange: (h: string) => void;
}) {
  const nodes = implementedNodes();

  return (
    <>
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor="node-select">Nœud cible</label>
        <select
          id="node-select"
          aria-label="Nœud cible"
          value={node ?? ""}
          onChange={(e) => onSelectNode(e.target.value as NodeKind)}
        >
          <option value="" disabled>
            — choisir un nœud —
          </option>
          {nodes.map((n) => (
            <option key={n} value={n}>
              {NODE_LABELS[n]}
            </option>
          ))}
        </select>
      </div>

      {node === "ollama-lan" && (
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="lan-host">Host LAN</label>
          <input
            id="lan-host"
            aria-label="Host LAN"
            value={lanHost}
            placeholder="ex. 192.168.2.11"
            onChange={(e) => onLanHostChange(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
