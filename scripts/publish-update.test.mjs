// Tests du générateur de manifeste et de la garde d'alignement (auto-update.md, étape 7).
// Purement locaux : aucun réseau, aucun jeton, aucune release réelle — on ne teste ici que la
// partie du script qui DÉCIDE, pas celle qui téléverse.
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertPublishBranch,
  assertVersionsAligned,
  buildManifest,
  cargoVersion,
  collectArtifactsFromDir,
  downloadBase,
  parseArgs,
  platformOfArtifact,
  PUBLISH_BRANCH,
  versionOfTag,
} from "./publish-update.mjs";

/** Un jeu d'artefacts factices couvrant les 4 cibles du workflow de release. */
const FOUR = [
  { name: "iakaFrameGUI_aarch64.app.tar.gz", signature: "SIG-MAC-ARM" },
  { name: "iakaFrameGUI_x64.app.tar.gz", signature: "SIG-MAC-X64" },
  { name: "iaka-frame-gui_0.1.5_amd64.AppImage", signature: "SIG-LINUX" },
  { name: "iakaFrameGUI_0.1.5_x64-setup.exe", signature: "SIG-WIN" },
];

describe("buildManifest — le manifeste latest.json", () => {
  it("porte les 4 plateformes, la version SANS le v, et des URL absolues", () => {
    const { manifest, missing } = buildManifest({ tag: "v0.1.5", artifacts: FOUR });

    expect(manifest.version).toBe("0.1.5");
    expect(missing).toEqual([]);
    expect(Object.keys(manifest.platforms).sort()).toEqual([
      "darwin-aarch64",
      "darwin-x86_64",
      "linux-x86_64",
      "windows-x86_64",
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

    expect(missing).toEqual(["windows-x86_64"]);
    expect(manifest.platforms["windows-x86_64"]).toBeUndefined();
    expect(Object.keys(manifest.platforms)).toHaveLength(3);
  });

  it("ignore un artefact sans signature (le client le refuserait de toute façon)", () => {
    const { manifest, missing } = buildManifest({
      tag: "v0.1.5",
      artifacts: [{ name: "iakaFrameGUI_aarch64.app.tar.gz", signature: "  " }],
    });
    expect(manifest.platforms).toEqual({});
    expect(missing).toHaveLength(4);
  });

  it("échappe le nom de fichier dans l'URL", () => {
    const { manifest } = buildManifest({
      tag: "v0.1.5",
      artifacts: [{ name: "iaka Frame GUI_aarch64.app.tar.gz", signature: "S" }],
    });
    expect(manifest.platforms["darwin-aarch64"].url).toContain("iaka%20Frame%20GUI_aarch64");
  });
});

describe("platformOfArtifact — ce qui est une cible de mise à jour, et ce qui n'en est pas", () => {
  it("classe les 4 cibles", () => {
    expect(platformOfArtifact("app_aarch64.app.tar.gz")).toBe("darwin-aarch64");
    expect(platformOfArtifact("app_x64.app.tar.gz")).toBe("darwin-x86_64");
    expect(platformOfArtifact("app_0.1.5_amd64.AppImage")).toBe("linux-x86_64");
    expect(platformOfArtifact("app_0.1.5_x64-setup.exe")).toBe("windows-x86_64");
  });

  it("écarte .deb / .rpm / .dmg — hors périmètre de l'updater (cf. hors-lot)", () => {
    expect(platformOfArtifact("app_0.1.5_amd64.deb")).toBeNull();
    expect(platformOfArtifact("app-0.1.5-1.x86_64.rpm")).toBeNull();
    expect(platformOfArtifact("app_0.1.5_aarch64.dmg")).toBeNull();
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

describe("assertVersionsAligned — la garde qui empêche l'updater de mentir (C7)", () => {
  it("passe quand les quatre valeurs coïncident", () => {
    const r = assertVersionsAligned("v0.1.5", { pkg: "0.1.5", conf: "0.1.5", cargo: "0.1.5" });
    expect(r).toEqual({ ok: true, version: "0.1.5" });
  });

  it("échoue explicitement sur une dérive, en citant le fichier fautif", () => {
    expect(() =>
      assertVersionsAligned("v0.1.5", { pkg: "0.1.5", conf: "0.1.4", cargo: "0.1.5" }),
    ).toThrow(/tauri\.conf\.json/);
  });

  it("échoue si une version est illisible plutôt que de la supposer bonne", () => {
    expect(() =>
      assertVersionsAligned("v0.1.5", { pkg: "0.1.5", conf: "0.1.5", cargo: null }),
    ).toThrow(/illisible/);
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
