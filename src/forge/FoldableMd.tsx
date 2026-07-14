/**
 * FoldableMd — le **contrat MD par étage, en LECTURE dépliable récursive** (E2b §7/§9).
 *
 * Rend l'élément courant (persona / méthode / kit) comme un document markdown **lu** (jamais
 * édité en brut), dont les **sous-éléments** sont des `<details>` imbriqués **récursivement**
 * (skill → hook, phase → gate, principe → politique/déclencheur, brique de kit → composants).
 * La **structure typée du cœur reste la vérité** ; ce composant ne fait que la **rendre**.
 * **[différé]** : l'édition MD riche/brute (§11).
 */
import type { ReactNode } from "react";

/** Un nœud dépliable : un sous-élément avec un corps et, récursivement, des enfants. */
export interface FoldNode {
  /** Étiquette de type affichée dans le résumé (ex. "skill", "phase", "principe"). */
  kind: string;
  /** Titre du sous-élément. */
  title: string;
  /** Libellé secondaire (rôle / résumé) affiché à droite du titre. */
  role?: string;
  /** Corps rendu (paragraphes, méta politique/déclencheur…). */
  body?: ReactNode;
  /** Sous-nœuds imbriqués (récursif). */
  children?: FoldNode[];
  /** Ouvert par défaut. */
  open?: boolean;
}

/** Rend un nœud dépliable et, récursivement, ses enfants. */
export function Foldable({ node }: { node: FoldNode }) {
  return (
    <details className="ex" open={node.open}>
      <summary>
        <span className="chev">▶</span>
        <span className="kind">{node.kind}</span>
        <span className="snm">{node.title}</span>
        {node.role && <span className="srl">— {node.role}</span>}
      </summary>
      <div className="body">
        <div className="md">
          {node.body}
          {node.children?.map((child, i) => (
            <Foldable key={`${child.kind}-${child.title}-${i}`} node={child} />
          ))}
        </div>
      </div>
    </details>
  );
}

/**
 * MdPane — le panneau MD (colonne 2/3) : entête `kind`/nom de fichier, frontmatter en mono,
 * une intro, puis les nœuds dépliables récursifs. Lecture seule.
 */
export function MdPane({
  kind,
  filename,
  cols,
  frontmatter,
  children,
  nodes,
}: {
  kind: string;
  filename: string;
  cols: string;
  frontmatter: string;
  children?: ReactNode;
  nodes: FoldNode[];
}) {
  return (
    <div className="mdpane">
      <div className="h">
        <span className="kind">{kind}</span>
        <span className="fn">{filename}</span>
        <span className="cols2">{cols}</span>
      </div>
      <div className="fm">{frontmatter}</div>
      <div className="md">
        {children}
        {nodes.map((n, i) => (
          <Foldable key={`${n.kind}-${n.title}-${i}`} node={n} />
        ))}
      </div>
    </div>
  );
}

/** Méta d'un principe : politique + déclencheur (bloc `prinmeta`). */
export function PrincipleMeta({ policy, trigger }: { policy: string; trigger: string }) {
  return (
    <div className="prinmeta">
      <b>politique</b> : {policy}
      <br />
      <b>déclencheur</b> : {trigger}
    </div>
  );
}
