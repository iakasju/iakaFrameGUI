/**
 * ContextGraph — le **graphe contextuel** de 3ᵉ colonne (E2b §9, 1/3 de la zone).
 *
 * Il est **contextuel au niveau édité** :
 *  - **Méthode** → `FlowDiagram` : *diagramme de flux* (phases → gates, délégation pointillée,
 *    boucle feedback), généré **depuis le workflow résolu** de la méthode.
 *  - **Team** / **Kit** → `FilePreview` : *aperçu du fichier généré* (fenêtre éditeur : arbre des
 *    chemins + début du fichier courant), **adapté de `KitTreeView`** et alimenté par le
 *    générateur pur `generateClaudeCodeKit` (l'arbre réel qui atterrira au disque).
 */
import type { Workflow } from "@iakaframe/core";
import type { KitFileTree } from "@iakaframe/core";

/** Diagramme de flux SVG des phases → gates de la chaîne principale (data-driven). */
export function FlowDiagram({ workflow }: { workflow: Workflow }) {
  const phases = [...workflow.phases]
    .filter((p) => p.offChain !== true)
    .sort((a, b) => a.order - b.order);

  // Géométrie verticale : phase (rect) puis gate (losange) en alternance.
  const rowH = 62;
  const top = 14;
  const width = 250;
  const height = top + phases.length * rowH + 20;

  const nodes = phases.map((p, i) => {
    const y = top + i * rowH;
    return { phase: p, y };
  });

  return (
    <div className="graph">
      <div className="gt">
        Diagramme de flux<span className="badge">reflète le workflow</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Flux du workflow : phases et gates"
      >
        <defs>
          <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#9a9aa4" />
          </marker>
          <marker id="ard" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#b3261e" />
          </marker>
        </defs>
        {nodes.map(({ phase, y }, i) => {
          const gate = phase.gate;
          // Phase sans gate : pas de losange. La flèche relie directement les deux phases —
          // on ne dessine pas un feu vert que la méthode ne pose pas.
          const gateColor = gate?.kind === "human" ? "#bd2f27" : "#2b5f9e";
          const gateFill = gate?.kind === "human" ? "#fbeceb" : "#eaf1f9";
          const gy = y + 34;
          const isLast = i === nodes.length - 1;
          return (
            <g key={phase.id}>
              {/* Phase (rectangle) */}
              <rect
                x={45}
                y={y}
                width={160}
                height={26}
                rx={8}
                fill="#f3f3f6"
                stroke="#4a4a52"
                strokeWidth={1.4}
              />
              <text
                x={125}
                y={y + 17}
                fontFamily="var(--font-sans)"
                fontSize={10}
                fontWeight={700}
                fill="#141417"
                textAnchor="middle"
              >
                {(phase.badge ? `${phase.badge} ` : "") + phase.name}
              </text>
              {/* Phase SANS gate : aucun losange — la flèche relie directement les deux
                  phases. On ne dessine pas un feu vert que la méthode ne pose pas. */}
              {gate === undefined ? (
                !isLast && (
                  <line
                    x1={125}
                    y1={y + 26}
                    x2={125}
                    y2={y + rowH - 2}
                    stroke="#9a9aa4"
                    strokeWidth={1.5}
                    markerEnd="url(#ar)"
                  />
                )
              ) : (
                <>
                {/* Flèche phase → gate */}
                <line
                  x1={125}
                  y1={y + 26}
                  x2={125}
                  y2={gy - 2}
                  stroke="#9a9aa4"
                  strokeWidth={1.5}
                  markerEnd="url(#ar)"
                />
                {/* Gate (losange) */}
                <path
                  d={`M125,${gy} L158,${gy + 16} L125,${gy + 32} L92,${gy + 16} Z`}
                  fill={gateFill}
                  stroke={gateColor}
                  strokeWidth={1.5}
                />
                <text
                  x={125}
                  y={gy + 14}
                  fontFamily="var(--mono)"
                  fontSize={7}
                  fontWeight={700}
                  fill={gateColor}
                  textAnchor="middle"
                >
                  GATE
                </text>
                <text
                  x={125}
                  y={gy + 23}
                  fontFamily="var(--mono)"
                  fontSize={6}
                  fill={gateColor}
                  textAnchor="middle"
                >
                  {gate.kind === "human" ? "humaine" : "auto"}
                </text>
                {/* Flèche gate → phase suivante */}
                {!isLast && (
                  <line
                    x1={125}
                    y1={gy + 32}
                    x2={125}
                    y2={y + rowH - 2}
                    stroke="#9a9aa4"
                    strokeWidth={1.5}
                    markerEnd="url(#ar)"
                  />
                )}
                </>
              )}
            </g>
          );
        })}
        {/* Délégation coord → fabrication (pointillé rouge) */}
        {nodes.length >= 2 && (
          <path
            d={`M30,${top + 45} C10,${top + 45} 10,${top + rowH + 13} 40,${top + rowH + 13}`}
            fill="none"
            stroke="#b3261e"
            strokeWidth={1.4}
            strokeDasharray="3 3"
            markerEnd="url(#ard)"
          />
        )}
        {/* Boucle feedback (pointillé gris) */}
        {nodes.length >= 2 && (
          <path
            d={`M215,${top + (nodes.length - 1) * rowH + 13} C238,${top + (nodes.length - 1) * rowH + 13} 238,${top + 13} 215,${top + 13}`}
            fill="none"
            stroke="#9a9aa4"
            strokeWidth={1.2}
            strokeDasharray="2 3"
            markerEnd="url(#ar)"
          />
        )}
      </svg>
      <div className="gcap">
        Onglet Méthode → <b>diagramme de flux</b> : <b>phases</b> (rectangles) → <b>gates</b>
        (losanges), pointillé rouge = délégation, boucle grise = feedback vers le cadrage.
      </div>
    </div>
  );
}

/**
 * FilePreview — fenêtre éditeur : arbre des chemins d'un `KitFileTree` + aperçu du fichier
 * sélectionné. Adapté de `KitTreeView` (même source : un dictionnaire { chemin → contenu } pur).
 */
export function FilePreview({
  tree,
  selectedPath,
  onSelectPath,
  title,
  badge,
  caption,
  targetPath,
  previewLines = 14,
}: {
  tree: KitFileTree;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  title: string;
  badge: string;
  caption: React.ReactNode;
  targetPath: string;
  previewLines?: number;
}) {
  const paths = Object.keys(tree.files).sort();
  const current = selectedPath ?? paths[0] ?? null;
  const raw = current ? (tree.files[current] ?? "") : "";
  const preview = raw.split("\n").slice(0, previewLines).join("\n");

  return (
    <div className="graph win-wrap">
      <div className="gt">
        {title}
        <span className="badge">{badge}</span>
      </div>
      <div className="win">
        <div className="bar">
          <span className="dot" style={{ background: "#e05a52" }} />
          <span className="dot" style={{ background: "#e0b23a" }} />
          <span className="dot" style={{ background: "#57b368" }} />
          <span className="path">{targetPath}</span>
        </div>
        <div className="filelist" aria-label="Arborescence du kit généré">
          {paths.map((p) => (
            <button
              key={p}
              type="button"
              className={p === current ? "cur" : ""}
              onClick={() => onSelectPath(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="code" aria-label="Aperçu du fichier généré">
          {preview}
        </div>
      </div>
      <div className="gcap">{caption}</div>
    </div>
  );
}
