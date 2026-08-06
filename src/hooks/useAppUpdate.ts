/**
 * useAppUpdate — AUTORITÉ du **contrôle de version de l'application** (auto-update.md, étape 5).
 *
 * Machine à états explicite, unique surface que l'UI consomme :
 *
 *   idle → checking → up-to-date | available | downloading(pct) | ready | error
 *
 * Trois règles de comportement, non négociables (elles viennent du cadrage) :
 *
 * 1. **Une box éteinte ne doit jamais se voir.** Le contrôle au démarrage est différé (~3 s), non
 *    bloquant, et son échec (LAN coupé, DNS, timeout) tombe en `error` **silencieux** : aucune boîte
 *    de dialogue, aucune zone rouge, **une seule** trace console. C'est l'application directe du
 *    principe « iakabox optionnelle » — l'appli fonctionne entièrement sans elle.
 * 2. **Un contrôle demandé mérite une réponse.** Le même contrôle appelé avec `verbose` rend son
 *    erreur **visible** (`errorVisible`) : Stéphane a cliqué, il doit savoir.
 * 3. **L'appli propose, l'humain décide** (D3). Aucune installation n'est déclenchée par ce hook ;
 *    `install()` n'existe que pour être appelé par un clic explicite, et n'agit qu'une fois.
 *
 * L'appel réseau part du **backend Rust** (plugin updater), pas de la webview : la CSP n'est pas
 * concernée, et la charge utile est vérifiée par signature minisign avant toute installation.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { check as checkForUpdate, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** Les états de la machine — jamais deux à la fois, jamais d'état implicite. */
export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

/** Délai du contrôle au démarrage : assez pour laisser l'appli se monter, assez court pour servir. */
export const STARTUP_CHECK_DELAY_MS = 3000;

export interface UseAppUpdate {
  /** État courant de la machine. */
  status: UpdateStatus;
  /** Version proposée par le manifeste (`null` hors état `available`/`downloading`/`ready`). */
  version: string | null;
  /** Progression 0–100 pendant le téléchargement (`null` si la taille totale est inconnue). */
  progressPct: number | null;
  /** Message d'erreur du dernier échec (toujours renseigné, même quand il reste invisible). */
  error: string | null;
  /** L'erreur doit-elle être MONTRÉE ? Vrai seulement après un contrôle `verbose` (règle 2). */
  errorVisible: boolean;
  /** Lance un contrôle. `verbose` = contrôle demandé par l'utilisateur (erreur affichée). */
  check: (verbose?: boolean) => Promise<void>;
  /** Télécharge, installe, puis redémarre. Idempotent : un second appel pendant l'installation est ignoré. */
  install: () => Promise<void>;
  /** Ferme le bandeau (retour à `idle`) sans rien annuler côté serveur. */
  dismiss: () => void;
}

export interface UseAppUpdateOptions {
  /** Contrôle différé au montage. Mettre à `false` en test ou sur une surface secondaire. */
  autoCheck?: boolean;
  /** Délai du contrôle au démarrage (ms). */
  startupDelayMs?: number;
}

export function useAppUpdate(opts: UseAppUpdateOptions = {}): UseAppUpdate {
  const { autoCheck = true, startupDelayMs = STARTUP_CHECK_DELAY_MS } = opts;

  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [version, setVersion] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState<boolean>(false);

  // La mise à jour retenue par le dernier `check()` réussi — objet opaque du plugin, jamais rendu.
  const updateRef = useRef<Update | null>(null);
  // Garde de ré-entrance de l'installation : posée SYNCHRONEMENT, avant tout `await`. C'est elle
  // (et pas un `disabled` d'UI, qui arrive un rendu trop tard) qui rend le double-clic inoffensif.
  const installingRef = useRef<boolean>(false);
  // Garde de ré-entrance du contrôle : deux contrôles concurrents n'apportent rien.
  const checkingRef = useRef<boolean>(false);
  // « Une seule trace » : un LAN coupé ne doit pas remplir la console à chaque tentative.
  const tracedRef = useRef<boolean>(false);

  const check = useCallback(async (verbose: boolean = false): Promise<void> => {
    if (checkingRef.current || installingRef.current) return;
    checkingRef.current = true;
    setStatus("checking");
    setError(null);
    setErrorVisible(false);
    try {
      const upd = await checkForUpdate();
      if (upd) {
        updateRef.current = upd;
        // Version exposée TELLE QUELLE : le manifeste fait foi, on ne normalise pas (un `v` de trop
        // dans le feed doit se voir à l'écran, pas être maquillé par le client).
        setVersion(upd.version);
        setStatus("available");
      } else {
        updateRef.current = null;
        setVersion(null);
        setStatus("up-to-date");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setErrorVisible(verbose);
      setStatus("error");
      if (!tracedRef.current) {
        tracedRef.current = true;
        console.warn(`[maj] contrôle de version indisponible : ${msg}`);
      }
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const install = useCallback(async (): Promise<void> => {
    const upd = updateRef.current;
    if (upd === null || installingRef.current) return;
    installingRef.current = true;
    setProgressPct(0);
    setStatus("downloading");
    let total = 0;
    let received = 0;
    try {
      await upd.downloadAndInstall((ev) => {
        if (ev.event === "Started") {
          total = ev.data.contentLength ?? 0;
          received = 0;
          setProgressPct(total > 0 ? 0 : null);
        } else if (ev.event === "Progress") {
          received += ev.data.chunkLength;
          setProgressPct(total > 0 ? Math.min(100, Math.round((received / total) * 100)) : null);
        } else if (ev.event === "Finished") {
          setProgressPct(100);
        }
      });
      setStatus("ready");
      await relaunch();
    } catch (e) {
      // Un échec d'installation, lui, se VOIT toujours : il fait suite à un geste explicite.
      installingRef.current = false;
      setError(e instanceof Error ? e.message : String(e));
      setErrorVisible(true);
      setStatus("error");
    }
  }, []);

  const dismiss = useCallback((): void => {
    setStatus("idle");
    setError(null);
    setErrorVisible(false);
    setProgressPct(null);
  }, []);

  // Contrôle au démarrage : différé, non bloquant, silencieux en cas d'échec (règle 1).
  useEffect(() => {
    if (!autoCheck) return;
    const timer = setTimeout(() => {
      void check(false);
    }, startupDelayMs);
    return () => clearTimeout(timer);
  }, [autoCheck, startupDelayMs, check]);

  return useMemo(
    () => ({ status, version, progressPct, error, errorVisible, check, install, dismiss }),
    [status, version, progressPct, error, errorVisible, check, install, dismiss],
  );
}
