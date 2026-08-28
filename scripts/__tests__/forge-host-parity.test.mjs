// Parité de l'hôte de forge — garde de non-dérive du CANAL de distribution.
//
// Pourquoi elle existe, et pourquoi elle arrive après coup : le Cockpit avait la sienne
// (`scripts/__tests__/forge-host-parity.test.mjs`), le FrameGUI n'en avait AUCUNE. C'est cette
// absence — pas une inattention isolée — qui a laissé une incohérence être commitée : le
// `tauri.conf.json` avait été repointé sur la forge courante tandis que `publish-update.mjs` et
// les quatre URL du manifeste désignaient encore l'ancienne iakabox, machine éteinte. Rien ne
// pouvait le dire.
//
// Ce que la garde exige — et ce qu'elle N'exige PAS. Elle ne fige aucune adresse : la forge peut
// légitimement changer, et un flux HTTPS public se préfixera un jour à la liste. Elle exige la
// COHÉRENCE : on doit LIRE d'abord là où l'on PUBLIE, et le manifeste — qui est un fichier
// GÉNÉRÉ par `publish-update.mjs` à partir de `FORGEJO_BASE` — doit désigner ce même hôte. Une
// divergence entre ces trois-là signifie qu'on écrit à un endroit et qu'on lit à un autre.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const hostOf = (url) => new URL(url).host;

/** Hôte mesuré hors service : machine éteinte, elle ne reviendra pas (constat du 2026-08-28). */
const HOTE_MORT = "192.168.2.11:3001";

/** La liste ORDONNÉE d'endpoints de l'updater — source de vérité du canal de lecture. */
function endpoints() {
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
  const eps = conf.plugins?.updater?.endpoints ?? [];
  expect(eps.length, "aucun endpoint d'update déclaré").toBeGreaterThan(0);
  return eps;
}
/** Hôte de l'endpoint qui GAGNE (le premier de la liste). */
function hostFromTauriConf() {
  return hostOf(endpoints()[0]);
}
/** Hôte vers lequel `publish-update.mjs` PUBLIE (release + binaires + manifeste). */
function hostFromPublishScript() {
  // Ligne EFFECTIVE seulement : un commentaire peut citer l'ancienne adresse pour l'expliquer.
  const m = read("scripts/publish-update.mjs").match(/^export const FORGEJO_BASE = "([^"]+)";/m);
  expect(m, "publish-update.mjs doit déclarer FORGEJO_BASE").toBeTruthy();
  return hostOf(m[1]);
}
/** Hôtes des URL de téléchargement du manifeste — une par plateforme publiée. */
function hostsFromManifest() {
  const man = JSON.parse(read("updater/latest.json"));
  const plats = Object.entries(man.platforms ?? {});
  expect(plats.length, "manifeste sans plateforme").toBeGreaterThan(0);
  return plats.map(([nom, p]) => {
    expect(p?.url, `plateforme ${nom} sans url`).toBeTruthy();
    return [nom, hostOf(p.url)];
  });
}

describe("lot 0 — cohérence de l'hôte de forge (FrameGUI)", () => {
  it("on lit d'abord là où l'on publie : endpoint primaire = FORGEJO_BASE", () => {
    expect(hostFromPublishScript(), "publish-update.mjs ≠ endpoint primaire").toBe(
      hostFromTauriConf(),
    );
  });

  it("les quatre URL du manifeste désignent l'hôte de publication, et un seul", () => {
    const base = hostFromPublishScript();
    for (const [nom, hote] of hostsFromManifest()) {
      expect(hote, `manifeste[${nom}] ≠ FORGEJO_BASE`).toBe(base);
    }
  });

  it("l'hôte mort n'est ni la cible de publication, ni le premier endpoint lu", () => {
    // Le garder EN TÊTE, c'est promettre une mise à jour qui ne peut pas aboutir. Le garder en
    // DERNIER secours est légitime : il ne coûte qu'un essai, au cas où la machine revienne.
    expect(hostFromTauriConf(), "endpoint primaire mort").not.toBe(HOTE_MORT);
    expect(hostFromPublishScript(), "publication vers un hôte mort").not.toBe(HOTE_MORT);
    for (const [nom, hote] of hostsFromManifest()) {
      expect(hote, `manifeste[${nom}] pointe l'hôte mort`).not.toBe(HOTE_MORT);
    }
  });

  it("la liste porte au moins DEUX hôtes distincts : sans quoi il n'y a rien à basculer", () => {
    // CA-11 : « une app dont le premier endpoint est mort voit quand même la mise à jour ». Une
    // liste d'un seul hôte (ou d'un hôte répété) ne bascule sur rien — elle réessaie la panne.
    const hotes = endpoints().map(hostOf);
    expect(new Set(hotes).size, `endpoints en doublon : ${hotes.join(", ")}`).toBe(hotes.length);
    expect(new Set(hotes).size, "un seul hôte : aucune redondance").toBeGreaterThanOrEqual(2);
  });
});
