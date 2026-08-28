// Tests du générateur de manifeste et de la garde d'alignement (auto-update.md, étape 7).
// Purement locaux : aucun réseau, aucun jeton, aucune release réelle — on ne teste ici que la
// partie du script qui DÉCIDE, pas celle qui téléverse.
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNamedArchitectures,
  assertPublishBranch,
  assertVersionsAligned,
  buildManifest,
  cargoVersion,
  collectArtifactsFromDir,
  commitAndPushManifest,
  downloadBase,
  lockVersions,
  MANIFEST_PATH,
  parseArgs,
  platformOfArtifact,
  artifactRank,
  versionPluginUpdater,
  PLATFORMS,
  VERSION_PLUGIN_UPDATER_VERIFIEE,
  PUBLISH_BRANCH,
  readRepoVersions,
  VERSION_CARRIERS,
  VERSION_NON_CARRIERS,
  versionOfTag,
} from "./publish-update.mjs";

/** Un jeu d'artefacts factices couvrant les 4 cibles historiques du workflow de release. */
const FOUR = [
  { name: "iakaFrameGUI_aarch64.app.tar.gz", signature: "SIG-MAC-ARM" },
  { name: "iakaFrameGUI_x64.app.tar.gz", signature: "SIG-MAC-X64" },
  { name: "iaka-frame-gui_0.1.5_amd64.AppImage", signature: "SIG-LINUX" },
  { name: "iakaFrameGUI_0.1.5_x64-setup.exe", signature: "SIG-WIN" },
];

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUIT = "iakaFrameGUI";
const VERSION = "0.1.5";

/**
 * LA TABLE DE CONFORMITÉ (AR-6 = O2) — `fixtures/updater-cles.json`, BYTE-IDENTIQUE dans les deux
 * dépôts. Les deux générateurs sont distincts ; c'est cette table, consommée par le test unitaire
 * de chacun, qui les empêche de diverger en silence.
 */
const TABLE = JSON.parse(readFileSync(resolve(RACINE, "fixtures/updater-cles.json"), "utf8"));
const nomReel = (g) => g.replaceAll("{PRODUIT}", PRODUIT).replaceAll("{VERSION}", VERSION);
/** Le jeu COMPLET d'artefacts de la table, chacun signé. */
const TOUS = TABLE.artefacts.map((a) => ({ name: nomReel(a.nom), signature: `SIG-${a.nom}` }));

describe("CA-1/CA-2 — les clés d'installeur, dérivées de la table de conformité", () => {
  it("CA-1 — émet la clé d'installeur de CHAQUE artefact et CONSERVE la générique", () => {
    const { manifest, missing } = buildManifest({ tag: "v0.1.5", artifacts: TOUS });
    // Le test NOMME l'ensemble attendu ; il ne compte pas les clés.
    expect(Object.keys(manifest.platforms)).toEqual(TABLE.clesAttenduesOrdonnees);
    expect(Object.keys(manifest.platforms)).toEqual(PLATFORMS);
    expect(missing).toEqual([]);
    for (const a of TABLE.artefacts) {
      if (!a.installeur) continue;
      expect(manifest.platforms[a.installeur].url.endsWith(nomReel(a.nom))).toBe(true);
    }
  });

  it("CA-2 — `windows-x86_64` désigne le NSIS et `linux-x86_64` l'AppImage (VALEUR, pas présence)", () => {
    const { manifest } = buildManifest({ tag: "v0.1.5", artifacts: TOUS });
    expect(manifest.platforms["windows-x86_64"].url.endsWith(`${PRODUIT}_${VERSION}_x64-setup.exe`)).toBe(true);
    expect(manifest.platforms["linux-x86_64"].url.endsWith(`${PRODUIT}_${VERSION}_amd64.AppImage`)).toBe(true);
    // La clé générique porte EXACTEMENT la même chose que la clé d'installeur de son porteur :
    // aucun client déjà installé ne change de comportement du seul fait de ce lot.
    expect(manifest.platforms["windows-x86_64"]).toEqual(manifest.platforms["windows-x86_64-nsis"]);
    expect(manifest.platforms["linux-x86_64"]).toEqual(manifest.platforms["linux-x86_64-appimage"]);
  });

  it("CA-2 — un `.deb` seul ne prend JAMAIS la clé générique Linux", () => {
    const { manifest } = buildManifest({
      tag: "v0.1.5",
      artifacts: [
        { name: `${PRODUIT}_${VERSION}_amd64.deb`, signature: "SIG-DEB" },
        { name: `${PRODUIT}-${VERSION}-1.x86_64.rpm`, signature: "SIG-RPM" },
      ],
    });
    expect(Object.keys(manifest.platforms)).toEqual(["linux-x86_64-deb", "linux-x86_64-rpm"]);
    expect(manifest.platforms["linux-x86_64"]).toBeUndefined();
  });

  it("CA-3 — un artefact sans signature ne produit AUCUNE clé, et il est signalé", () => {
    const sansSig = TOUS.map((e) =>
      e.name.endsWith(".msi") || e.name.endsWith("-setup.exe") ? { ...e, signature: "  " } : e,
    );
    const { manifest, unsigned } = buildManifest({ tag: "v0.1.5", artifacts: sansSig });
    expect(manifest.platforms["windows-x86_64"]).toBeUndefined();
    expect(manifest.platforms["windows-x86_64-nsis"]).toBeUndefined();
    expect(manifest.platforms["windows-x86_64-msi"]).toBeUndefined();
    expect(unsigned.sort()).toEqual(
      [`${PRODUIT}_${VERSION}_x64-setup.exe`, `${PRODUIT}_${VERSION}_x64_en-US.msi`].sort(),
    );
  });

  it("AR-3 — AUCUNE clé `darwin-*-app` n'est émise", () => {
    const { manifest } = buildManifest({ tag: "v0.1.5", artifacts: TOUS });
    for (const cle of Object.keys(manifest.platforms)) expect(cle.endsWith("-app")).toBe(false);
    expect(PLATFORMS.some((p) => p.endsWith("-app"))).toBe(false);
  });

  it("la générique reste NSIS quel que soit l'ordre, et le MSI garde SA clé", () => {
    const nsis = { name: `${PRODUIT}_${VERSION}_x64-setup.exe`, signature: "SIG-NSIS" };
    const msi = { name: `${PRODUIT}_${VERSION}_x64_en-US.msi`, signature: "SIG-MSI" };
    for (const artifacts of [[nsis, msi], [msi, nsis]]) {
      const { manifest } = buildManifest({ tag: "v0.1.5", artifacts });
      expect(manifest.platforms["windows-x86_64"].signature).toBe("SIG-NSIS");
      expect(manifest.platforms["windows-x86_64-nsis"].signature).toBe("SIG-NSIS");
      expect(manifest.platforms["windows-x86_64-msi"].signature).toBe("SIG-MSI");
    }
  });
});

describe("CA-15 — cliquet sur la version du plugin updater", () => {
  // La convention `{os}-{arch}-{installer}` n'est PAS documentée : elle n'existe que dans la
  // SOURCE de la version verrouillée. `Cargo.toml` déclarant `tauri-plugin-updater = "2"`, un
  // `cargo update` peut la faire changer sans un mot.
  const lock = readFileSync(resolve(RACINE, "src-tauri/Cargo.lock"), "utf8");

  it("la version VERROUILLÉE est celle contre laquelle la convention a été vérifiée", () => {
    expect(
      versionPluginUpdater(lock),
      "tauri-plugin-updater a change de version : RE-VERIFIER `get_urls` EN AMONT " +
        "(essaie-t-il toujours {os}-{arch}-{installer} puis {os}-{arch} ? Installer::name() " +
        "rend-il toujours appimage/deb/rpm/app/msi/nsis ?) AVANT de lever cette garde, puis " +
        "mettre a jour VERSION_PLUGIN_UPDATER_VERIFIEE et fixtures/updater-cles.json.",
    ).toBe(VERSION_PLUGIN_UPDATER_VERIFIEE);
    expect(TABLE.conventionVerifieeContre.version).toBe(VERSION_PLUGIN_UPDATER_VERIFIEE);
  });

  it("CONTREFACTUEL — une fixture qui monte la version fait tomber la garde", () => {
    // Sur une FIXTURE, jamais sur `Cargo.lock`.
    const fixture = lock.replace(/(name = "tauri-plugin-updater"\nversion = ")[^"]+/, "$12.11.0");
    expect(fixture).not.toBe(lock);
    expect(versionPluginUpdater(fixture)).toBe("2.11.0");
    expect(versionPluginUpdater(fixture)).not.toBe(VERSION_PLUGIN_UPDATER_VERIFIEE);
  });
});

describe("buildManifest — le manifeste latest.json", () => {
  it("porte les 4 plateformes, la version SANS le v, et des URL absolues", () => {
    const { manifest, missing } = buildManifest({ tag: "v0.1.5", artifacts: FOUR });

    expect(manifest.version).toBe("0.1.5");
    // Ces quatre artefacts couvrent 6 des 9 cles : les 4 generiques + les 2 cles d'installeur
    // de leurs porteurs (appimage, nsis). Les 3 manquantes sont deb, rpm, msi — absents du jeu.
    expect(missing).toEqual(["linux-x86_64-deb", "linux-x86_64-rpm", "windows-x86_64-msi"]);
    expect(Object.keys(manifest.platforms).sort()).toEqual([
      "darwin-aarch64",
      "darwin-x86_64",
      "linux-x86_64",
      "linux-x86_64-appimage",
      "windows-x86_64",
      "windows-x86_64-nsis",
    ]);
    for (const p of Object.values(manifest.platforms)) {
      expect(p.url.startsWith(`${downloadBase()}/v0.1.5/`)).toBe(true);
    }
    // La signature est le CONTENU du .sig, jamais un chemin.
    expect(manifest.platforms["darwin-aarch64"].signature).toBe("SIG-MAC-ARM");
    expect(manifest.platforms["darwin-aarch64"].url).not.toContain(".sig");
  });

  it("omet proprement une plateforme manquante — jamais d'URL fantôme", () => {
    const { manifest, missing } = buildManifest({
      tag: "v0.1.5",
      artifacts: FOUR.filter((a) => !a.name.endsWith("-setup.exe")),
    });

    expect(missing).toContain("windows-x86_64");
    expect(missing).toContain("windows-x86_64-nsis");
    expect(manifest.platforms["windows-x86_64"]).toBeUndefined();
    expect(manifest.platforms["windows-x86_64-nsis"]).toBeUndefined();
    expect(Object.keys(manifest.platforms)).toHaveLength(4);
  });

  it("ignore un artefact sans signature (le client le refuserait de toute façon)", () => {
    const { manifest, missing } = buildManifest({
      tag: "v0.1.5",
      artifacts: [{ name: "iakaFrameGUI_aarch64.app.tar.gz", signature: "  " }],
    });
    expect(manifest.platforms).toEqual({});
    expect(missing).toEqual(PLATFORMS);
  });

  it("échappe le nom de fichier dans l'URL", () => {
    const { manifest } = buildManifest({
      tag: "v0.1.5",
      artifacts: [{ name: "iaka Frame GUI_aarch64.app.tar.gz", signature: "S" }],
    });
    expect(manifest.platforms["darwin-aarch64"].url).toContain("iaka%20Frame%20GUI_aarch64");
  });
});

describe("platformOfArtifact — le COUPLE générique/installeur", () => {
  it("chaque nom de la table est classé exactement comme la table le dit", () => {
    for (const a of TABLE.artefacts) {
      const c = platformOfArtifact(nomReel(a.nom));
      if (a.generique === null) {
        expect(c, `${a.nom} devrait etre hors perimetre`).toBeNull();
        continue;
      }
      expect(c, `${a.nom} devrait etre classe`).not.toBeNull();
      expect(c.generique, `${a.nom} : generique`).toBe(a.generique);
      expect(c.installeur, `${a.nom} : installeur`).toBe(a.installeur);
      expect(artifactRank(nomReel(a.nom)) > 0, `${a.nom} : porte le generique ?`).toBe(
        a.porteLeGenerique,
      );
    }
  });

  it("classe les 4 cibles historiques, et le `.msi` que ce generateur IGNORAIT", () => {
    expect(platformOfArtifact("app_aarch64.app.tar.gz")).toEqual({
      generique: "darwin-aarch64",
      installeur: null,
    });
    expect(platformOfArtifact("app_x64.app.tar.gz")).toEqual({
      generique: "darwin-x86_64",
      installeur: null,
    });
    expect(platformOfArtifact("app_0.1.5_amd64.AppImage")).toEqual({
      generique: "linux-x86_64",
      installeur: "linux-x86_64-appimage",
    });
    expect(platformOfArtifact("app_0.1.5_x64-setup.exe")).toEqual({
      generique: "windows-x86_64",
      installeur: "windows-x86_64-nsis",
    });
    // DIVERGENCE REPAREE : aucune branche `.msi` n'existait ici.
    expect(platformOfArtifact("app_0.1.5_x64_en-US.msi")).toEqual({
      generique: "windows-x86_64",
      installeur: "windows-x86_64-msi",
    });
  });

  it("`.deb` et `.rpm` obtiennent leur cle d'INSTALLEUR ; le `.dmg` reste hors perimetre", () => {
    expect(platformOfArtifact("app_0.1.5_amd64.deb")).toEqual({
      generique: "linux-x86_64",
      installeur: "linux-x86_64-deb",
    });
    expect(platformOfArtifact("app-0.1.5-1.x86_64.rpm")).toEqual({
      generique: "linux-x86_64",
      installeur: "linux-x86_64-rpm",
    });
    expect(platformOfArtifact("app_0.1.5_aarch64.dmg")).toBeNull();
    expect(platformOfArtifact("app_aarch64.app.tar.gz.sig")).toBeNull();
  });
});

describe("assertNamedArchitectures — le bundle local sans architecture est REFUSÉ, pas omis", () => {
  it("refuse le nom que produit réellement un build local (`iakaFrameGUI.app.tar.gz`)", () => {
    // Sans cette garde, `platformOfArtifact` rend `null` et macOS disparaît du manifeste :
    // signalé en sortie, mais publié sans macOS. Le chemin `--from <dir>` est exactement celui-là.
    expect(platformOfArtifact("iakaFrameGUI.app.tar.gz")).toBeNull();
    expect(() => assertNamedArchitectures(["iakaFrameGUI.app.tar.gz"])).toThrow(
      /sans architecture/,
    );
    // Le message dit QUOI FAIRE : le renommage attendu, avec les deux formes acceptées.
    expect(() => assertNamedArchitectures(["iakaFrameGUI.app.tar.gz"])).toThrow(
      /iakaFrameGUI_aarch64\.app\.tar\.gz/,
    );
  });

  it("laisse passer les noms déjà suffixés par `tauri-action`", () => {
    expect(assertNamedArchitectures(FOUR.map((a) => a.name))).toEqual({ ok: true });
  });

  it("ignore les fichiers hors périmètre updater (.dmg, .deb, .sig)", () => {
    expect(
      assertNamedArchitectures([
        "iakaFrameGUI.dmg",
        "iaka-frame-gui_0.1.5_amd64.deb",
        "iakaFrameGUI_aarch64.app.tar.gz.sig",
      ]),
    ).toEqual({ ok: true });
  });
});

describe("collectArtifactsFromDir — la signature est le critère d'appariement", () => {
  it("ne retient que les fichiers accompagnés de leur .sig", () => {
    const dir = mkdtempSync(join(tmpdir(), "iakaframegui-test-"));
    writeFileSync(join(dir, "app_aarch64.app.tar.gz"), "binaire");
    writeFileSync(join(dir, "app_aarch64.app.tar.gz.sig"), "SIGNATURE\n");
    writeFileSync(join(dir, "app_x64.app.tar.gz"), "binaire non signe");
    writeFileSync(join(dir, "orphan.sig"), "signature orpheline");

    const got = collectArtifactsFromDir(dir);
    expect(got.map((a) => a.name)).toEqual(["app_aarch64.app.tar.gz"]);
    expect(got[0].signature).toBe("SIGNATURE");
  });
});

/** Les 5 porteurs de fichiers, tous alignés — base à laquelle chaque test ne dérange QU'UN champ. */
const aligned = (v = "0.1.5") => ({
  pkg: v,
  lockRoot: v,
  lockPackages: v,
  conf: v,
  cargo: v,
});

describe("assertVersionsAligned — la garde qui empêche l'updater de mentir (C7)", () => {
  it("passe quand les quatre valeurs coïncident", () => {
    const r = assertVersionsAligned("v0.1.5", aligned("0.1.5"));
    expect(r).toEqual({ ok: true, version: "0.1.5" });
  });

  it("échoue explicitement sur une dérive, en citant le fichier fautif", () => {
    expect(() =>
      assertVersionsAligned("v0.1.5", { ...aligned("0.1.5"), conf: "0.1.4" }),
    ).toThrow(/tauri\.conf\.json/);
  });

  it("échoue si une version est illisible plutôt que de la supposer bonne", () => {
    expect(() =>
      assertVersionsAligned("v0.1.5", { ...aligned("0.1.5"), cargo: null }),
    ).toThrow(/illisible/);
  });

  // --- le cinquième porteur, invisible à la garde jusqu'à ce lot -------------------------------
  //
  // Le défaut RÉEL du dépôt au 2026-08-16 : `package.json` à 0.1.7, les deux champs du lock restés
  // à 0.1.4. Rien ne cassait — `npm ci` ne valide que la concordance des dépendances, jamais le
  // champ `version` racine (npm/cli#1177) — et c'était une RÉCIDIVE (même incident le 2026-07-31).

  it("attrape une dérive du LOCK SEUL, tous les autres porteurs étant alignés", () => {
    expect(() =>
      assertVersionsAligned("v0.1.7", { ...aligned("0.1.7"), lockRoot: "0.1.4" }),
    ).toThrow(/package-lock\.json/);
    expect(() =>
      assertVersionsAligned("v0.1.7", { ...aligned("0.1.7"), lockRoot: "0.1.4" }),
    ).toThrow(/0\.1\.4/);
  });

  it("traite `packages[\"\"]` comme un porteur DISTINCT de la racine du lock", () => {
    // Les deux champs vivent dans le même fichier mais dérivent séparément : n'en lire qu'un
    // laisserait l'autre mentir. L'erreur cite donc le champ, pas seulement le fichier.
    expect(() =>
      assertVersionsAligned("v0.1.7", { ...aligned("0.1.7"), lockPackages: "0.1.4" }),
    ).toThrow(/packages\[""\]/);
  });

  it("refuse un lock illisible ou absent (null) plutôt que de le supposer aligné", () => {
    expect(() =>
      assertVersionsAligned("v0.1.7", { ...aligned("0.1.7"), lockRoot: null, lockPackages: null }),
    ).toThrow(/illisible/);
  });

  it("dit QUOI FAIRE : la commande de sortie, pas seulement le constat", () => {
    // Une garde qui refuse sans indiquer la sortie reporte le travail sur celui qui la rencontre —
    // c'est déjà le contrat d'`assertNamedArchitectures`, qui dicte le renommage attendu.
    expect(() =>
      assertVersionsAligned("v0.1.7", { ...aligned("0.1.7"), lockRoot: "0.1.4" }),
    ).toThrow(/npm version 0\.1\.7 --no-git-tag-version --allow-same-version/);
  });

  it("aligne le détail sur la plus longue clé — le libellé du lock déborde des 16 colonnes", () => {
    let message = "";
    try {
      assertVersionsAligned("v0.1.7", { ...aligned("0.1.7"), lockRoot: "0.1.4" });
    } catch (e) {
      message = e.message;
    }
    const lines = message.split("\n").filter((l) => l.startsWith("  "));
    expect(lines.length).toBe(Object.keys(VERSION_CARRIERS).length + 1); // + le tag
    // Toutes les valeurs commencent à la MÊME colonne, y compris derrière la plus longue clé.
    const columns = [...new Set(lines.map((l) => l.search(/\S+$/)))];
    expect(columns).toHaveLength(1);
    expect(columns[0]).toBeGreaterThan('  package-lock.json (packages[""])'.length);
  });
});

describe("VERSION_CARRIERS / VERSION_NON_CARRIERS — l'énumération est DÉCLARÉE, pas muette", () => {
  it("cliquet anti-omission : les clés LUES sont exactement les clés DÉCLARÉES", () => {
    // C'est la seule réponse mécanique à « on a ajouté un porteur mais on a oublié de le brancher » :
    // toucher au registre sans câbler `readRepoVersions` (ou l'inverse) rend ce test rouge.
    expect(Object.keys(readRepoVersions()).sort()).toEqual(Object.keys(VERSION_CARRIERS).sort());
  });

  it("chaque porteur gardé porte son libellé de fichier ET sa raison d'être gardé", () => {
    for (const [key, carrier] of Object.entries(VERSION_CARRIERS)) {
      expect(carrier.file, `${key}.file`).toMatch(/\S/);
      // Une « raison » vide ou télégraphique laisserait la liste muette : c'est le défaut corrigé.
      expect(String(carrier.reason ?? "").trim().length, `${key}.reason`).toBeGreaterThan(20);
    }
  });

  it("déclare ce qui est HORS couverture, avec la raison de l'être", () => {
    // Une garde qui prétend tout voir et n'en voit qu'une partie est pire qu'une garde honnêtement
    // énumérante. Les trois exclusions arbitrées sont donc écrites dans le code, pas devinées.
    expect(Object.keys(VERSION_NON_CARRIERS)).toEqual(
      expect.arrayContaining([
        "packages/core/package.json",
        "updater/latest.json",
        "src-tauri/Cargo.lock",
      ]),
    );
    for (const [path, reason] of Object.entries(VERSION_NON_CARRIERS)) {
      expect(String(reason ?? "").trim().length, path).toBeGreaterThan(20);
    }
  });

  it("aucun fichier n'est à la fois gardé et déclaré hors couverture", () => {
    const guarded = Object.values(VERSION_CARRIERS).map((c) => c.file.replace(/ \(.*\)$/, ""));
    for (const path of Object.keys(VERSION_NON_CARRIERS)) {
      expect(guarded).not.toContain(path);
    }
  });
});

describe("lockVersions — les deux champs du package-lock, ou rien", () => {
  it("lit la racine et packages[\"\"] séparément", () => {
    expect(
      lockVersions(JSON.stringify({ version: "0.1.7", packages: { "": { version: "0.1.4" } } })),
    ).toEqual({ lockRoot: "0.1.7", lockPackages: "0.1.4" });
  });

  it("rend null des DEUX côtés sur un lock illisible — jamais une supposition", () => {
    expect(lockVersions("{ pas du json")).toEqual({ lockRoot: null, lockPackages: null });
    expect(lockVersions("{}")).toEqual({ lockRoot: null, lockPackages: null });
  });
});

describe("sentinelle permanente — les 5 porteurs du DÉPÔT RÉEL coïncident", () => {
  it("échoue si un porteur de fichier dérive, sans jamais regarder le tag", () => {
    // Hors chemin de publication : cette mesure tourne dans `test:all`, à chaque run, y compris
    // pendant un lot non tagué. Elle ne compare donc que les FICHIERS entre eux — un bump en cours
    // (`npm version` + les 2 fichiers Tauri) les laisse alignés à tout instant.
    const seen = readRepoVersions();
    const byFile = Object.fromEntries(
      Object.entries(VERSION_CARRIERS).map(([key, carrier]) => [carrier.file, seen[key]]),
    );
    const reference = seen.pkg;
    expect(byFile).toEqual(
      Object.fromEntries(Object.keys(byFile).map((file) => [file, reference])),
    );
  });
});

describe("assertPublishBranch — publier ailleurs que sur main est sans effet", () => {
  it("laisse passer la branche de publication", () => {
    expect(assertPublishBranch(PUBLISH_BRANCH)).toEqual({ ok: true, branch: "main" });
  });

  it("refuse une branche de feature en citant les deux branches", () => {
    expect(() => assertPublishBranch("feat/auto-update")).toThrow(/feat\/auto-update/);
    expect(() => assertPublishBranch("feat/auto-update")).toThrow(/main/);
  });

  it("refuse une HEAD détachée (branche inconnue) plutôt que de publier au hasard", () => {
    expect(() => assertPublishBranch(null)).toThrow(/refusee/);
  });
});

describe("commitAndPushManifest — rejouer une publication identique est un NO-OP propre", () => {
  /**
   * Un dépôt jetable avec son `origin` local (bare, sur disque) : aucun réseau, aucun dépôt réel
   * touché. C'est le seul moyen honnête de couvrir ce point — le défaut ne vivait pas dans une
   * fonction pure mais dans la plomberie git elle-même (`git commit` sort `1` quand il n'y a rien à
   * commiter, ce qui faisait tomber le script APRÈS les téléversements).
   */
  function labRepo() {
    const root = mkdtempSync(join(tmpdir(), "iakaframegui-lab-"));
    const bare = join(root, "origin.git");
    const work = join(root, "work");
    execFileSync("git", ["init", "--quiet", "--bare", "-b", "main", bare]);
    execFileSync("git", ["init", "--quiet", "-b", "main", work]);
    const git = (...args) => execFileSync("git", args, { cwd: work, encoding: "utf8" });
    git("config", "user.email", "lab@example.invalid");
    git("config", "user.name", "lab");
    git("remote", "add", "origin", bare);
    writeFileSync(join(work, "README.md"), "lab\n");
    git("add", "-A");
    git("commit", "--quiet", "-m", "seed");
    git("push", "--quiet", "-u", "origin", "HEAD");
    return { work, git, count: () => Number(git("rev-list", "--count", "HEAD").trim()) };
  }

  /** Écrit le manifeste au chemin exact que le script s'autorise à commiter. */
  function writeManifest(work, body) {
    mkdirSync(join(work, "updater"), { recursive: true });
    writeFileSync(join(work, MANIFEST_PATH), body);
  }

  /** Runner silencieux : même contrat que `gitRun` (rend la sortie), sans polluer le journal. */
  const quiet = (args, { cwd }) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  // UN SEUL dépôt jetable pour les trois étapes : elles forment une séquence réelle (publier,
  // republier à l'identique, republier modifié) et un dépôt neuf par étape coûterait ~2 s chacun
  // pour rejouer exactement les mêmes gestes. L'ordre est ici porteur de sens, pas un accident.
  let lab;
  beforeAll(() => {
    lab = labRepo();
  });

  it("1. première publication : le manifeste est commité et poussé", () => {
    const before = lab.count();
    writeManifest(lab.work, '{"version":"0.1.5"}\n');

    expect(commitAndPushManifest("v0.1.5", { run: quiet, cwd: lab.work })).toEqual({
      committed: true,
    });
    expect(lab.count()).toBe(before + 1);
    expect(lab.git("log", "-1", "--pretty=%s").trim()).toBe(
      "chore(release): manifeste de mise a jour v0.1.5",
    );
    // Le commit ne porte QUE le manifeste (garde de chemin déjà en place, re-vérifiée ici).
    expect(lab.git("show", "--name-only", "--pretty=", "HEAD").trim()).toBe(MANIFEST_PATH);
  });

  it("2. rejeu à l'identique : aucun commit, aucune exception, pas d'abandon en fin de course", () => {
    const after = lab.count();

    // Le geste que la release Forgejo autorise explicitement (« deja presente — reutilisee ») :
    // republier le même tag. Avant correction, `git commit -- updater/latest.json` sortait `1`
    // (« nothing added to commit ») et faisait tomber le script — APRÈS les téléversements.
    expect(commitAndPushManifest("v0.1.5", { run: quiet, cwd: lab.work })).toEqual({
      committed: false,
    });
    expect(lab.count()).toBe(after);
    expect(lab.git("status", "--porcelain").trim()).toBe("");
  });

  it("3. manifeste réellement modifié après un rejeu : le commit repart", () => {
    const after = lab.count();
    writeManifest(lab.work, '{"version":"0.1.6"}\n');

    expect(commitAndPushManifest("v0.1.6", { run: quiet, cwd: lab.work })).toEqual({
      committed: true,
    });
    expect(lab.count()).toBe(after + 1);
  });
});

describe("--check-only ne mesure QUE l'alignement (C7)", () => {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const SCRIPT = join(ROOT, "scripts", "publish-update.mjs");
  const repoVersion = () => JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

  it("sort 0 sur une version alignée, quelle que soit la branche courante", () => {
    // C7 est une mesure d'ALIGNEMENT. Si `--check-only` se mettait à échouer pour une autre raison
    // — typiquement la garde de branche, qui refuse tout sauf `main` — le critère deviendrait
    // inutilisable là où on s'en sert vraiment : depuis une branche de feature, avant de taguer.
    // Ce test tourne donc là où il est : dans le dépôt, sur la branche de travail du moment.
    // Le compte rendu de progression sort sur STDERR (la sortie standard porte le DOCUMENT en
    // `--dry-run`, et un document mele de journal ne se compare pas a l'octet — CA-14). On lit
    // donc stderr, et on verifie que stdout reste MUET : `--check-only` n'ecrit aucun document.
    const version = repoVersion();
    const vu = { stdout: "", stderr: "" };
    const res = spawnSync(process.execPath, [SCRIPT, `v${version}`, "--check-only"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    vu.stdout = res.stdout;
    vu.stderr = res.stderr;
    expect(res.status, `--check-only a echoue : ${vu.stderr}`).toBe(0);
    expect(vu.stderr).toContain(`versions alignees sur ${version}`);
    expect(vu.stdout).toBe("");
  });

  it("échoue pour DÉSALIGNEMENT, et jamais pour une histoire de branche", () => {
    let failure = null;
    try {
      execFileSync(process.execPath, [SCRIPT, "v9.9.9", "--check-only"], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      failure = e;
    }
    expect(failure).not.toBeNull();
    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain("versions desalignees");
    // Le motif cité est l'alignement, pas la branche : c'est ce qui rend le verdict lisible.
    expect(failure.stderr).not.toContain("branche");
  });
});

describe("lecture des versions et des arguments", () => {
  it("versionOfTag retire le v du tag", () => {
    expect(versionOfTag("v0.1.5")).toBe("0.1.5");
    expect(versionOfTag("0.1.5")).toBe("0.1.5");
  });

  it("cargoVersion lit la version de [package], pas celle d'une dépendance", () => {
    const toml = [
      "[package]",
      'name = "iakaframegui"',
      'version = "0.1.4"',
      "",
      "[dependencies]",
      'tauri = { version = "2.11.2" }',
    ].join("\n");
    expect(cargoVersion(toml)).toBe("0.1.4");
  });

  it("parseArgs reconnaît le tag et les drapeaux", () => {
    expect(parseArgs(["v0.1.5", "--check-only"])).toMatchObject({
      tag: "v0.1.5",
      checkOnly: true,
    });
    expect(parseArgs(["v0.1.5", "--from", "./dist", "--no-push"])).toMatchObject({
      tag: "v0.1.5",
      from: "./dist",
      push: false,
    });
  });
});
