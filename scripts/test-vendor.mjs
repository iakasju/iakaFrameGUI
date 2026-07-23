// test-vendor.mjs — VOLET D (option additive) : surface un drift de VENDORAGE côté GUI en
// SHELL-OUT vers la garde du frère `iakaframe` (`cli/src/index.js vendor-check`). Ne RÉIMPLÉMENTE
// rien : l'autorité de mesure reste le canon (doctrine GUI ← frame ; l'Option B « test dans le GUI
// qui remonte » a été écartée par `garde-vendor-check-cross-repo.md` § 3.1).
//
// HORS `test:all` / hors gate par défaut : la mesure dépend d'un dépôt frère, donc faillible sur un
// clone isolé — comme `cargo test`. Tolérant à l'absence du frère : SKIP propre (exit 0), jamais un
// faux rouge en CI GUI. Sort le code de la garde (1 sur drift réel) quand le frère est présent.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const guiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Résolution du frère : override explicite, puis voisins de casse usuels (miroir de vendor.js).
const candidates = [
  process.env.IAKAFRAME_HOME,
  resolve(guiRoot, "..", "iakaframe"),
  resolve(guiRoot, "..", "iakaFrame"),
].filter(Boolean);

const siblingRoot = candidates.find(
  (c) => existsSync(resolve(c, "cli", "src", "index.js")),
);

if (!siblingRoot) {
  console.log(
    "test:vendor — SKIP : dépôt frère iakaframe introuvable (clone isolé). " +
      "Aucune mesure de vendorage effectuée (définir IAKAFRAME_HOME pour l'activer).",
  );
  process.exit(0);
}

const entry = resolve(siblingRoot, "cli", "src", "index.js");
const res = spawnSync(
  process.execPath,
  [entry, "vendor-check", "--gui", guiRoot],
  { stdio: "inherit" },
);

process.exit(res.status ?? 1);
