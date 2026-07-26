/**
 * SettingsRoot — Réglages de la **racine bibliothèque `IAKAFRAME_HOME`** (§5), point de vérité
 * **partagé avec le CLI**. Affiche la racine résolue (découverte auto / env / override), permet un
 * **override manuel** (sélecteur de dossier natif) persisté dans `<workspace>/settings.json`, et
 * rappelle la commande `export IAKAFRAME_HOME=…` pour que le **CLI voie la même racine** (un GUI ne
 * peut pas fixer l'env d'un autre process — arbitrage Q-2). Backend injectable (tests).
 *
 * § Volet B : porte aussi le **modèle d'authoring** UNIQUE et global (`authoringModel`) — l'identifiant/
 * endpoint de modèle utilisé par TOUS les prompts d'authoring de la forge (pas par persona). Persisté
 * comme `iakaframeHome` (même `<workspace>/settings.json`). Build-time, DISTINCT du runner d'EXÉCUTION.
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";

/** Aucun dossier de projet réglé : la forge ne sait pas où lire le pointeur de frame active. */
export const NO_PROJECT_HINT =
  "aucun dossier de projet réglé — la frame active du réservoir (default) sera utilisée";

/** Projet réglé mais sans pointeur : ce n'est pas une erreur, c'est le cas nominal du défaut. */
export const NO_ACTIVE_FRAME_HINT =
  "aucun pointeur posé — la frame « default » du réservoir est active";

export function SettingsRoot({ api = backend }: { api?: Backend }) {
  const [home, setHome] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  // § Volet B : le modèle d'authoring persisté (`null` = non défini → **aucun défaut** : le copilote
  // signale l'absence). `draft` = la saisie en cours (identifiant/endpoint), enregistrée à la demande.
  const [model, setModel] = useState<string | null>(null);
  const [modelDraft, setModelDraft] = useState<string>("");
  // § D3 : endpoint d'authoring optionnel (hôte Ollama LAN). `null` = non défini → défaut localhost.
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [endpointDraft, setEndpointDraft] = useState<string>("");
  // Dossier de PROJET : il dit OÙ est le projet. Le pointeur de frame active, lui, vit dans
  // `<projectDir>/iakaframe.json` et appartient au LIEU (partagé avec le CLI) — jamais ici.
  const [project, setProject] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<string>("");
  const [activeFrame, setActiveFrame] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    let resolved: string | null = null;
    try {
      resolved = await api.iakaframeHome();
    } catch {
      resolved = null;
    }
    setHome(resolved);
    let resolvedModel: string | null = null;
    try {
      resolvedModel = await api.authoringModel();
    } catch {
      resolvedModel = null;
    }
    setModel(resolvedModel);
    setModelDraft(resolvedModel ?? "");
    let resolvedEndpoint: string | null = null;
    try {
      resolvedEndpoint = await api.authoringEndpoint();
    } catch {
      resolvedEndpoint = null;
    }
    setEndpoint(resolvedEndpoint);
    setEndpointDraft(resolvedEndpoint ?? "");
    let resolvedProject: string | null = null;
    try {
      resolvedProject = await api.projectDir();
    } catch {
      resolvedProject = null;
    }
    setProject(resolvedProject);
    setProjectDraft(resolvedProject ?? "");
    let resolvedFrame: string | null = null;
    try {
      resolvedFrame = await api.activeFrameId();
    } catch {
      resolvedFrame = null;
    }
    setActiveFrame(resolvedFrame);
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveModel = useCallback(async () => {
    setBusy(true);
    try {
      await api.setAuthoringModel(modelDraft.trim());
      await refresh();
    } catch {
      /* hors Tauri / erreur : on ne casse pas le rendu */
    } finally {
      setBusy(false);
    }
  }, [api, modelDraft, refresh]);

  // Efface le modèle : `setAuthoringModel("")` retire la clé `authoringModel` (il n'y a **aucun
  // défaut** — le champ revient vide et le copilote signale l'absence tant qu'aucun n'est réglé).
  const clearModel = useCallback(async () => {
    setBusy(true);
    try {
      await api.setAuthoringModel("");
      await refresh();
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  const saveEndpoint = useCallback(async () => {
    setBusy(true);
    try {
      await api.setAuthoringEndpoint(endpointDraft.trim());
      await refresh();
    } catch {
      /* hors Tauri / erreur : on ne casse pas le rendu */
    } finally {
      setBusy(false);
    }
  }, [api, endpointDraft, refresh]);

  const saveProject = useCallback(async () => {
    setBusy(true);
    try {
      await api.setProjectDir(projectDraft.trim());
      await refresh();
    } catch {
      /* hors Tauri / erreur : on ne casse pas le rendu */
    } finally {
      setBusy(false);
    }
  }, [api, projectDraft, refresh]);

  // Efface l'endpoint : `setAuthoringEndpoint("")` retire la clé (retour au défaut localhost).
  const clearEndpoint = useCallback(async () => {
    setBusy(true);
    try {
      await api.setAuthoringEndpoint("");
      await refresh();
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  const choose = useCallback(async () => {
    setBusy(true);
    try {
      const dir = await api.pickDirectory();
      if (dir) {
        await api.setIakaframeHome(dir);
        await refresh();
      }
    } catch {
      /* annulation / hors Tauri : on ne casse pas le rendu */
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await api.setIakaframeHome("");
      await refresh();
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  return (
    <section className="settings-root" aria-label="Racine de la bibliothèque iakaframe">
      <h3>Bibliothèque iakaframe</h3>
      {!loaded ? (
        <p className="empty">Résolution de la racine…</p>
      ) : home ? (
        <>
          <p className="settings-line">
            Racine résolue : <code className="home-path">{home}</code>
          </p>
          <p className="settings-hint">
            Pour que le CLI voie la même racine, exportez-la :{" "}
            <code>export IAKAFRAME_HOME={home}</code>
          </p>
        </>
      ) : (
        <p className="settings-line err" role="alert">
          Bibliothèque introuvable — définissez-la manuellement.
        </p>
      )}
      <div className="settings-actions">
        <button type="button" className="docbtn" disabled={busy} onClick={() => void choose()}>
          Choisir le dossier…
        </button>
        <button type="button" className="docbtn" disabled={busy} onClick={() => void reset()}>
          Réinitialiser (auto)
        </button>
      </div>

      {/* § Volet B : modèle d'authoring UNIQUE et global (tous les étages, pas par persona). */}
      <div className="settings-authoring" aria-label="Modèle d'authoring iakaFrameGUI">
        <h3>Modèle d'authoring</h3>
        <p className="settings-hint">
          Un seul modèle, global : l'identifiant/endpoint utilisé pour <b>tous</b> les prompts
          d'authoring (tous les étages). Build-time — <b>distinct</b> du runner d'exécution du
          Binding. {model ? null : <>Non défini : <b>pointez un modèle</b> — le copilote signale l'absence tant qu'aucun n'est réglé (aucun défaut).</>}
        </p>
        <div className="settings-actions">
          <input
            type="text"
            className="model-input"
            aria-label="Identifiant ou endpoint du modèle d'authoring"
            placeholder="ex. ollama:qwen2.5-coder"
            value={modelDraft}
            disabled={busy}
            onChange={(e) => setModelDraft(e.target.value)}
          />
          <button type="button" className="docbtn" disabled={busy} onClick={() => void saveModel()}>
            Enregistrer le modèle
          </button>
          <button
            type="button"
            className="docbtn"
            disabled={busy}
            onClick={() => void clearModel()}
            title="Retire le modèle configuré (le champ revient vide — aucun défaut)"
          >
            Effacer
          </button>
        </div>
        {model && (
          <p className="settings-line">
            Modèle configuré : <code className="model-value">{model}</code>
          </p>
        )}
      </div>

      {/* § D3 : endpoint d'authoring optionnel — hôte Ollama LAN (vide ⇒ localhost:11434). */}
      <div className="settings-authoring" aria-label="Endpoint d'authoring iakaFrameGUI">
        <h3>Endpoint d'authoring (optionnel)</h3>
        <p className="settings-hint">
          Hôte Ollama pour l'inférence d'authoring <b>live</b>. Vide ⇒{" "}
          <code>http://localhost:11434</code>. Renseignez-le pour pointer un Ollama sur le{" "}
          <b>LAN</b>. Build-time — <b>distinct</b> du runner d'exécution du Binding.
        </p>
        <div className="settings-actions">
          <input
            type="text"
            className="model-input"
            aria-label="Endpoint (hôte) du modèle d'authoring"
            placeholder="ex. http://192.168.2.11:11434"
            value={endpointDraft}
            disabled={busy}
            onChange={(e) => setEndpointDraft(e.target.value)}
          />
          <button type="button" className="docbtn" disabled={busy} onClick={() => void saveEndpoint()}>
            Enregistrer l'endpoint
          </button>
          <button
            type="button"
            className="docbtn"
            disabled={busy}
            onClick={() => void clearEndpoint()}
            title="Retire l'endpoint configuré (retour au défaut localhost)"
          >
            Effacer l'endpoint
          </button>
        </div>
        {endpoint && (
          <p className="settings-line">
            Endpoint configuré : <code className="model-value">{endpoint}</code>
          </p>
        )}
      </div>

      <div className="settings-block">
        <h3>Dossier de projet</h3>
        <p className="settings-hint">
          Le projet dont la forge lit la <b>frame active</b>. Le pointeur lui-même vit dans{" "}
          <code>{"<projet>/iakaframe.json"}</code> (clé <code>frame</code>) — <b>propriété du lieu</b>,
          partagée avec le CLI, jamais recopiée dans les réglages de la forge.
        </p>
        <div className="settings-actions">
          <input
            type="text"
            className="model-input"
            aria-label="Dossier de projet"
            placeholder="ex. /Users/moi/work/mon-projet"
            value={projectDraft}
            disabled={busy}
            onChange={(e) => setProjectDraft(e.target.value)}
          />
          <button type="button" className="docbtn" disabled={busy} onClick={() => void saveProject()}>
            Enregistrer le projet
          </button>
        </div>
        {project ? (
          <p className="settings-line">
            Projet : <code className="model-value">{project}</code>
            {" · "}
            {activeFrame ? (
              <>
                frame active : <code className="model-value">{activeFrame}</code>
              </>
            ) : (
              <em className="no-model">{NO_ACTIVE_FRAME_HINT}</em>
            )}
          </p>
        ) : (
          <p className="settings-line">
            <em className="no-model">{NO_PROJECT_HINT}</em>
          </p>
        )}
      </div>
    </section>
  );
}
