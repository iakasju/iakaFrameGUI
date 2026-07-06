/**
 * DeployView — écran « Générer & Déployer » (P4). **Présentationnel** : il assemble le
 * sélecteur de team + `NodeSelector` + `KitTreeView` + `DeployPanel` ; toute la logique du
 * flux vit dans le hook **`useForgeDeploy`** (autorité). Le chaînon manquant : relier
 * l'authoring de teams (P1) au backend de génération (P3/P3b) et de déploiement (P3), sans
 * quitter la forge.
 *
 * Invariants : la génération est **pure** (aucune I/O disque avant « Déployer ») ; toute
 * écriture passe par la façade `kitDeploy` → `kit_deploy` (non destructif, pathguard).
 */
import type { UseForgeTeams } from "../hooks/useForgeTeams";
import { useForgeDeploy } from "../hooks/useForgeDeploy";
import { NodeSelector } from "../components/NodeSelector";
import { KitTreeView } from "../components/KitTreeView";
import { DeployPanel } from "../components/DeployPanel";

export function DeployView({ forge }: { forge: UseForgeTeams }) {
  const deploy = useForgeDeploy({ teamById: forge.teamById });

  return (
    <div className="view">
      <h2>Générer &amp; Déployer</h2>
      <p className="sub">
        Générer le kit d'une team pure pour un nœud, puis le déployer dans un dossier
        (non destructif — option « Écraser »).
      </p>

      <div className="panel">
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="deploy-team">Team</label>
            <select
              id="deploy-team"
              aria-label="Team"
              value={deploy.selectedTeamId ?? ""}
              onChange={(e) => deploy.selectTeam(e.target.value || null)}
            >
              <option value="" disabled>
                — choisir une team —
              </option>
              {forge.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.personas.length})
                </option>
              ))}
            </select>
          </div>

          <NodeSelector
            node={deploy.node}
            lanHost={deploy.lanHost}
            onSelectNode={deploy.selectNode}
            onLanHostChange={deploy.setLanHost}
          />
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btn"
            type="button"
            disabled={!deploy.canGenerate}
            onClick={deploy.generate}
          >
            Générer
          </button>
          {forge.teams.length === 0 && (
            <span className="sub" style={{ margin: 0 }}>
              Aucune team : créez-en une dans l'onglet Teams.
            </span>
          )}
        </div>
      </div>

      <div className="panel">
        <KitTreeView
          kit={deploy.kit}
          selectedPath={deploy.selectedPath}
          onSelectPath={deploy.selectPreview}
        />
      </div>

      <DeployPanel
        destDir={deploy.destDir}
        force={deploy.force}
        result={deploy.result}
        canDeploy={deploy.canDeploy}
        deploying={deploy.deploying}
        onDestDirChange={deploy.setDestDir}
        onBrowse={() => void deploy.browseDestDir()}
        onForceChange={deploy.setForce}
        onDeploy={() => void deploy.deploy()}
      />
    </div>
  );
}
