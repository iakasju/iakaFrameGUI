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
import { CharteSelector } from "./CharteSelector";
import { INFERENCE_SOURCES, deriveSourceId, extractModelName } from "./inferenceSources";

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
  // Lot 2 : clé API OPTIONNELLE (LiteLLM/openai). On ne charge JAMAIS la valeur dans l'UI (secret) —
  // seulement sa PRÉSENCE (`apiKeySet`). La saisie (`apiKeyDraft`) part vide, masquée, écrite à la demande.
  const [apiKeySet, setApiKeySet] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState<string>("");
  // Lot 2b : découverte des modèles via `GET /v1/models` (source openai/LiteLLM). `models` peuple un
  // dropdown ; `modelsReason` = l'aveu honnête sur liste vide (endpoint injoignable / aucun modèle) —
  // dans ce cas la **saisie manuelle** (champ modèle) reste seule vérité, jamais une fausse liste.
  const [models, setModels] = useState<string[]>([]);
  const [modelsReason, setModelsReason] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
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
    // Présence de clé API uniquement (jamais la valeur) — non-fuite du secret dans l'UI.
    let hasKey = false;
    try {
      const k = await api.authoringApiKey?.();
      hasKey = typeof k === "string" && k.trim().length > 0;
    } catch {
      hasKey = false;
    }
    setApiKeySet(hasKey);
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

  // Sélection d'un preset de source (Lot 1). « Personnalisé » ne touche à rien (champs libres). « Mode
  // démo » pose la valeur réservée `mock`. Un preset réel écrit l'endpoint ET oriente le préfixe
  // provider de `authoringModel` (Option A), en CONSERVANT le nom de modèle courant (jamais fabriqué).
  const applySource = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        if (id === "custom") {
          /* champs libres conservés — rien à écrire */
        } else if (id === "mock") {
          await api.setAuthoringModel("mock");
        } else {
          const preset = INFERENCE_SOURCES.find((s) => s.id === id);
          if (preset && preset.provider && preset.endpoint) {
            await api.setAuthoringEndpoint(preset.endpoint);
            const name = extractModelName(modelDraft.length > 0 ? modelDraft : model ?? "");
            await api.setAuthoringModel(`${preset.provider}:${name}`);
          }
        }
        await refresh();
      } catch {
        /* hors Tauri / erreur : on ne casse pas le rendu */
      } finally {
        setBusy(false);
      }
    },
    [api, model, modelDraft, refresh],
  );

  // Écrit la clé API (Lot 2). La saisie masquée `apiKeyDraft` est vidée après écriture (le secret ne
  // reste pas dans l'état de l'UI). Vide ⇒ retrait de la clé (retour à « LiteLLM sans auth »).
  const saveApiKey = useCallback(async () => {
    setBusy(true);
    try {
      await api.setAuthoringApiKey?.(apiKeyDraft.trim());
      setApiKeyDraft("");
      await refresh();
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }, [api, apiKeyDraft, refresh]);

  const clearApiKey = useCallback(async () => {
    setBusy(true);
    try {
      await api.setAuthoringApiKey?.("");
      setApiKeyDraft("");
      await refresh();
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  }, [api, refresh]);

  // Lot 2b : peuple le dropdown de modèles depuis `GET /v1/models` (source openai/LiteLLM). HONNÊTE :
  // sur endpoint injoignable / liste vide, on VIDE le dropdown et on affiche `modelsReason` — la saisie
  // manuelle (champ modèle) reste disponible, jamais une fausse liste. La clé n'est pas détenue par
  // l'UI (secret) : le backend lit la clé persistée ; on ne passe que la saisie fraîche non enregistrée.
  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsReason(null);
    try {
      const freshKey = apiKeyDraft.trim().length > 0 ? apiKeyDraft.trim() : undefined;
      const res = await api.llmModels?.(endpointDraft.trim(), freshKey);
      if (!res) {
        // Façade sans `llmModels` (test partiel) ou hors Tauri → aveu, saisie manuelle conservée.
        setModels([]);
        setModelsReason("découverte indisponible — saisie manuelle du modèle");
        return;
      }
      setModels(res.models ?? []);
      setModelsReason(
        res.models && res.models.length > 0 ? null : res.reason ?? "aucun modèle exposé par la source",
      );
    } catch {
      // Hors Tauri / rejet : aveu honnête, jamais une fausse liste — la saisie manuelle reste.
      setModels([]);
      setModelsReason("découverte indisponible — saisie manuelle du modèle");
    } finally {
      setModelsLoading(false);
    }
  }, [api, endpointDraft, apiKeyDraft]);

  // Sélection d'un modèle dans le dropdown découvert : préfixe provider `openai` conservé (Option A),
  // persisté via la façade existante (aucun chemin neuf). Le champ de saisie libre reste la vérité.
  const chooseModel = useCallback(
    async (id: string) => {
      if (id.length === 0) return;
      setBusy(true);
      try {
        await api.setAuthoringModel(`openai:${id}`);
        await refresh();
      } catch {
        /* hors Tauri / erreur : on ne casse pas le rendu */
      } finally {
        setBusy(false);
      }
    },
    [api, refresh],
  );

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

  // Source openai/LiteLLM ? (préfixe provider du modèle). Conditionne l'affichage du dropdown de
  // modèles `/v1/models` — inutile pour Ollama (dont les modèles ne s'exposent pas par ce wire ici).
  const modelProvider = (() => {
    const m = (model ?? "").trim().toLowerCase();
    return m.includes(":") ? m.slice(0, m.indexOf(":")).trim() : "";
  })();
  const isOpenaiSource = modelProvider === "openai";

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

      {/* Charte graphique : préférence d'apparence de l'UI (thème visuel). Déplacée du chrome
          vers les Réglages — la bascule/persistance reste portée par `useCharte` (aucun backend). */}
      <div className="settings-block" aria-label="Charte graphique de l'interface">
        <h3>Charte graphique</h3>
        <p className="settings-hint">
          Le <b>thème visuel</b> de l'interface (Studio clair par défaut). La bascule est{" "}
          <b>instantanée</b> et persiste localement — sans rechargement ni requête réseau.
        </p>
        <CharteSelector />
      </div>

      {/* Lot 1 : sélecteur de SOURCE d'inférence — pré-remplit endpoint + oriente le provider (Option A). */}
      <div className="settings-authoring" aria-label="Source d'inférence de la forge">
        <h3>Source d'inférence</h3>
        <p className="settings-hint">
          Choisissez une <b>source</b> : elle pré-remplit l'endpoint et oriente le provider du modèle
          ci-dessous. <b>LiteLLM</b> = passerelle OpenAI-compatible (Claude / ChatGPT / local d'un seul
          wire). Vous gardez la main sur le modèle et l'endpoint via « Personnalisé ».
        </p>
        <div className="settings-actions">
          <select
            className="model-input"
            aria-label="Source d'inférence"
            value={deriveSourceId(model, endpoint)}
            disabled={busy}
            onChange={(e) => void applySource(e.target.value)}
          >
            {INFERENCE_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
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

        {/* Lot 2b : dropdown de modèles découverts via `GET /v1/models` (source openai/LiteLLM). Repli
            HONNÊTE : liste vide / injoignable ⇒ on le DIT et la saisie manuelle ci-dessus reste seule
            vérité (jamais une fausse liste). Absent pour Ollama (modèles non exposés par ce wire ici). */}
        {isOpenaiSource && (
          <div className="settings-models" aria-label="Modèles découverts (LiteLLM /v1/models)">
            <div className="settings-actions">
              <button
                type="button"
                className="docbtn"
                disabled={busy || modelsLoading}
                onClick={() => void loadModels()}
                title="Interroge GET /v1/models de la source pour peupler la liste (repli saisie manuelle)"
              >
                {modelsLoading ? "Découverte…" : "Découvrir les modèles"}
              </button>
              {models.length > 0 && (
                <select
                  className="model-input"
                  aria-label="Modèle découvert (LiteLLM)"
                  defaultValue=""
                  disabled={busy}
                  onChange={(e) => void chooseModel(e.target.value)}
                >
                  <option value="" disabled>
                    Choisir un modèle découvert…
                  </option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {modelsReason && (
              <p className="settings-hint settings-models-reason" role="status">
                Découverte des modèles indisponible ({modelsReason}) — <b>saisissez le modèle à la
                main</b> ci-dessus. Aucune liste fabriquée.
              </p>
            )}
          </div>
        )}

        {/* Découvrabilité de la valeur réservée d'opt-in du mode démo (option C, D1). */}
        <p className="settings-hint settings-mock-hint">
          Astuce démo : saisissez <code>mock</code> pour un <b>mode démo hors-ligne</b> —
          propositions fabriquées et <b>clairement étiquetées</b>, jamais confondues avec une vraie
          inférence.
        </p>
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

      {/* Lot 2 : clé API OPTIONNELLE (LiteLLM/openai). Secret local — jamais affiché, jamais logué. */}
      <div className="settings-authoring" aria-label="Clé API d'authoring iakaFrameGUI">
        <h3>Clé API (optionnel)</h3>
        <p className="settings-hint">
          Pour une source <b>LiteLLM / OpenAI-compatible</b> qui exige une clé. <b>Secret local</b> —
          stocké hors dépôt, jamais commité, jamais logué. Vide ⇒ aucune authentification (LiteLLM
          sans clé).
        </p>
        <div className="settings-actions">
          <input
            type="password"
            className="model-input"
            aria-label="Clé API d'authoring (optionnel)"
            placeholder={apiKeySet ? "•••••••• (une clé est configurée)" : "sk-…"}
            value={apiKeyDraft}
            disabled={busy}
            onChange={(e) => setApiKeyDraft(e.target.value)}
          />
          <button type="button" className="docbtn" disabled={busy} onClick={() => void saveApiKey()}>
            Enregistrer la clé
          </button>
          <button
            type="button"
            className="docbtn"
            disabled={busy}
            onClick={() => void clearApiKey()}
            title="Retire la clé configurée (retour à « sans authentification »)"
          >
            Effacer la clé
          </button>
        </div>
        {apiKeySet && (
          <p className="settings-line">
            <em className="no-model">Une clé est configurée (masquée — jamais affichée).</em>
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
