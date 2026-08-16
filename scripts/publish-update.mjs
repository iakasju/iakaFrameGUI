// publish-update.mjs — LE PAS DE RECOPIE de la chaîne de mise à jour (auto-update.md, étape 6b).
//
// Pourquoi ce script existe : le builder (GitHub Actions) et le canal de distribution (Forgejo sur
// le LAN iakabox) sont **deux mondes disjoints** — GitHub ne peut pas atteindre le LAN. Il faut donc
// un pas exécuté **depuis le poste**, box en ligne, qui prend les binaires signés produits par le CI
// et les republie sur Forgejo avec le manifeste que le client interroge. Ce n'est pas un défaut du
// montage : c'est le prix de D2 (« changer de canal ne doit coûter qu'une URL »), et il disparaît le
// jour où le flux passe sur un site public.
//
// Usage :
//   node scripts/publish-update.mjs v0.1.5                 # GitHub → Forgejo → manifeste → push
//   node scripts/publish-update.mjs v0.1.5 --from ./dist   # artefacts locaux, sans GitHub
//   node scripts/publish-update.mjs v0.1.5 --check-only    # garde d'alignement SEULE (C7)
//   node scripts/publish-update.mjs v0.1.5 --dry-run       # tout sauf écrire/téléverser/pousser
//   node scripts/publish-update.mjs v0.1.5 --no-push       # publie et écrit, mais NE REND PAS VISIBLE
//                                                          # (release + binaires + manifeste local ;
//                                                          #  ni commit ni push → aucun client ne voit)
//   node scripts/publish-update.mjs v0.1.5 --notes "…"     # notes de version du manifeste
//
// Jetons : `$GITHUB_TOKEN` (lecture de la release amont), `$FORGEJO_TOKEN` (ou `~/work/.env`) pour
// la publication. **Jamais** en dur, jamais écrits dans un fichier suivi, jamais affichés.
//
// Le script s'arrête NET à la première anomalie : mieux vaut une publication interrompue qu'un
// manifeste qui ment sur ce qui est réellement téléchargeable.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_OWNER = "sjupin";
export const REPO_NAME = "iakaFrameGUI";
export const FORGEJO_BASE = "http://192.168.2.11:3001";

/**
 * LA branche que l'endpoint updater lit (`raw/branch/main/updater/latest.json`). Publier depuis une
 * autre branche est sans effet côté clients : c'est un échec, pas une variante — d'où la garde.
 */
export const PUBLISH_BRANCH = "main";

/** Racine du dépôt (le script vit dans `scripts/`). */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Base des URL de téléchargement d'une release Forgejo — les URL du manifeste sont ABSOLUES. */
export function downloadBase(base = FORGEJO_BASE, owner = REPO_OWNER, repo = REPO_NAME) {
  return `${base}/${owner}/${repo}/releases/download`;
}

// ---------------------------------------------------------------------------
// 1. Garde d'alignement des versions
// ---------------------------------------------------------------------------

/** Retire le `v` d'un tag (`v0.1.5` → `0.1.5`). Le manifeste porte la version SANS `v`. */
export function versionOfTag(tag) {
  return String(tag).replace(/^v/, "");
}

/** Lit la version déclarée par `Cargo.toml` (section `[package]`, sans dépendance TOML). */
export function cargoVersion(text) {
  const pkg = text.split(/^\[/m).find((s) => s.startsWith("package]"));
  const m = pkg ? pkg.match(/^\s*version\s*=\s*"([^"]+)"/m) : null;
  return m ? m[1] : null;
}

/**
 * LE REGISTRE DES PORTEURS DE VERSION — une énumération, DÉCLARÉE comme telle.
 *
 * Cette garde **énumère**, elle ne découvre pas. Ce n'est pas une facilité : le dépôt ne porte pas
 * *une* version déclinée en N exemplaires, mais **plusieurs axes de versionnement indépendants**, et
 * rien dans la forme d'un champ `version` ne les distingue. Une découverte signalerait
 * `packages/core/package.json` (à `0.1.0`) comme une dérive et **forcerait par accident un
 * arbitrage — le versionnement unique du monorepo — que le décideur a explicitement réservé**. Une
 * garde qui s'arroge une décision de produit est un défaut plus grave que celui qu'elle corrige.
 *
 * Le défaut d'une liste en dur n'est pas d'être en dur, c'est d'être **muette**. Les trois silences
 * sont donc fermés ici : chaque entrée porte **sa raison** (ci-dessous), ce qui est **hors
 * couverture** est écrit noir sur blanc (`VERSION_NON_CARRIERS`), et un **cliquet** de test compare
 * les clés LUES par `readRepoVersions` aux clés DÉCLARÉES ici — ajouter une entrée sans câbler sa
 * lecture rend le test rouge.
 *
 * ⚠️ **Trou assumé, et déclaré plutôt que masqué** : un porteur de version qui apparaîtrait dans un
 * **fichier neuf** restera invisible tant qu'il n'est pas ajouté à ce registre. C'est le prix de
 * l'énumération ; il est le prix arbitré, pas un oubli.
 *
 * La clé sert au câblage (`readRepoVersions`), `file` est le libellé cité dans l'erreur.
 */
export const VERSION_CARRIERS = {
  pkg: {
    file: "package.json",
    reason:
      "manifeste npm de la racine — LA version produit, ecrite par `npm version` (jamais a la main)",
  },
  lockRoot: {
    file: "package-lock.json (racine)",
    reason:
      "ecrit par `npm version` en meme temps que package.json — a derive deux fois quand le bump " +
      "etait fait a la main (0.1.0 en 2026-07-31, 0.1.4 en 2026-08-16)",
  },
  lockPackages: {
    file: 'package-lock.json (packages[""])',
    reason:
      "second champ du meme fichier, distinct du premier — recopie de la racine par npm, invisible " +
      "a `npm ci` qui ne valide que la concordance des dependances (npm/cli#1177)",
  },
  conf: {
    file: "src-tauri/tauri.conf.json",
    reason: "version GRAVEE dans le binaire et annoncee au plugin updater — editee a la main",
  },
  cargo: {
    file: "src-tauri/Cargo.toml",
    reason: "version de la crate, GRAVEE dans le binaire — editee a la main",
  },
};

/**
 * CE QUE LA GARDE NE VOIT PAS, ET POURQUOI. *Une garde qui prétend tout voir et n'en voit qu'une
 * partie est pire qu'une garde honnêtement énumérante* : l'aveu est donc dans le code, exporté et
 * testé, pas relégué dans un commentaire qu'on ne lit plus.
 */
export const VERSION_NON_CARRIERS = {
  "packages/core/package.json":
    "bibliotheque distincte, volontairement a 0.1.0 — le versionnement unique du monorepo est un " +
    "arbitrage RESERVE AU DECIDEUR (ouvert depuis 2026-07-31) ; l'aligner ici le trancherait par accident",
  "updater/latest.json":
    "sortie de la publication : il decrit ce qui est PUBLIE et retarde donc legitimement d'un bump " +
    "— l'aligner ferait mentir la sortie du script sur son entree",
  "src-tauri/Cargo.lock":
    "auto-synchronise par cargo a chaque build : n'a jamais derive, le garder serait du bruit",
  "node_modules/**/package.json":
    "versions des dependances tierces — sans rapport avec la version du produit",
};

/**
 * Vérifie que les cinq porteurs de fichiers déclarés par `VERSION_CARRIERS` **et** le tag portent LA
 * MÊME version. Une dérive ici et l'updater ment sur la version disponible : le client télécharge un
 * binaire qui s'annonce autrement que ce que le manifeste promet, et la boucle « une version
 * toujours dispo » s'installe. On échoue donc explicitement, en citant **toutes** les valeurs vues.
 *
 * @returns {{ ok: true, version: string }}
 * @throws {Error} avec le détail de toutes les valeurs en cas de dérive.
 */
export function assertVersionsAligned(tag, versions) {
  const wanted = versionOfTag(tag);
  const seen = { tag: wanted };
  for (const [key, carrier] of Object.entries(VERSION_CARRIERS)) {
    seen[carrier.file] = versions[key];
  }
  const bad = Object.entries(seen).filter(([, v]) => v !== wanted);
  if (bad.length > 0) {
    // Largeur calculée sur la plus longue clé : `package-lock.json (packages[""])` dépasse
    // largement les 16 colonnes d'origine et écraserait la colonne des valeurs.
    const width = Math.max(...Object.keys(seen).map((k) => k.length));
    const detail = Object.entries(seen)
      .map(([k, v]) => `  ${k.padEnd(width)} ${v ?? "(illisible)"}`)
      .join("\n");
    throw new Error(
      `versions desalignees — le tag ${tag} ne correspond pas aux fichiers du depot :\n${detail}\n` +
        `sortie : npm version ${wanted} --no-git-tag-version --allow-same-version ` +
        "(ecrit package.json ET package-lock.json d'un seul geste), puis aligner a la main " +
        "src-tauri/tauri.conf.json et src-tauri/Cargo.toml.",
    );
  }
  return { ok: true, version: wanted };
}

/**
 * Lit les deux champs `version` du `package-lock.json` — la racine et `packages[""]`. Un lock
 * illisible rend `null` **des deux côtés** plutôt qu'une supposition : la garde dira « illisible »,
 * ce qui est un refus, quand supposer serait un faux vert.
 */
export function lockVersions(text) {
  try {
    const lock = JSON.parse(text);
    const root = lock?.version;
    const pkgs = lock?.packages?.[""]?.version;
    return {
      lockRoot: typeof root === "string" ? root : null,
      lockPackages: typeof pkgs === "string" ? pkgs : null,
    };
  } catch {
    return { lockRoot: null, lockPackages: null };
  }
}

/**
 * Lit les cinq porteurs de fichiers du dépôt (chemins réels). Les clés rendues ici sont **exactement**
 * celles de `VERSION_CARRIERS` — c'est le cliquet anti-omission, verrouillé par un test.
 */
export function readRepoVersions(root = ROOT) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const conf = JSON.parse(
    readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"),
  ).version;
  const cargo = cargoVersion(readFileSync(join(root, "src-tauri", "Cargo.toml"), "utf8"));
  const lockPath = join(root, "package-lock.json");
  const { lockRoot, lockPackages } = existsSync(lockPath)
    ? lockVersions(readFileSync(lockPath, "utf8"))
    : { lockRoot: null, lockPackages: null };
  return { pkg, lockRoot, lockPackages, conf, cargo };
}

// ---------------------------------------------------------------------------
// 2. Classement des artefacts par plateforme
// ---------------------------------------------------------------------------

/** Les 4 cibles du workflow de release, dans l'ordre où on veut les voir. */
export const PLATFORMS = ["darwin-aarch64", "darwin-x86_64", "linux-x86_64", "windows-x86_64"];

/**
 * Devine la plateforme updater d'un artefact d'après son nom. `null` = ce fichier n'est pas une
 * cible de mise à jour (ex. `.deb`, `.rpm`, `.dmg` — voir le hors-lot de l'instruction).
 */
export function platformOfArtifact(name) {
  const n = name.toLowerCase();
  if (n.endsWith(".app.tar.gz")) {
    if (n.includes("aarch64") || n.includes("arm64")) return "darwin-aarch64";
    if (n.includes("x64") || n.includes("x86_64")) return "darwin-x86_64";
    return null;
  }
  if (n.endsWith(".appimage")) return "linux-x86_64";
  if (n.endsWith("-setup.exe")) return "windows-x86_64";
  return null;
}

/**
 * PRÉ-VOL sur les NOMS SEULS : refuse un bundle macOS qui ne porte pas d'architecture.
 *
 * Cas RÉEL, et c'est le chemin `--from <dir>` que ce script documente lui-même : un build **local**
 * nomme le bundle `iakaFrameGUI.app.tar.gz`, **sans** architecture — c'est `tauri-action` qui injecte
 * `_aarch64` / `_x64` au moment de la publication. `platformOfArtifact` rend donc `null`, et macOS
 * serait **omis du manifeste** : signalé en sortie, mais omis — une plateforme entière privée de
 * mise à jour pour un défaut de nommage. On refuse **avant toute écriture Forgejo**, en disant quoi
 * faire ; aucune architecture n'est devinée (servir un binaire arm64 à un Mac Intel serait pire).
 *
 * @param {string[]} names noms de fichiers bruts (répertoire d'artefacts, assets de release)
 * @returns {{ ok: true }}
 * @throws {Error} en citant les noms fautifs et le renommage attendu.
 */
export function assertNamedArchitectures(names, product = REPO_NAME) {
  const guilty = names.filter(
    (n) => n.toLowerCase().endsWith(".app.tar.gz") && platformOfArtifact(n) === null,
  );
  if (guilty.length > 0) {
    throw new Error(
      `bundle macOS sans architecture : ${guilty.join(", ")} — publication refusee avant toute ` +
        `ecriture. Renommer en « ${product}_aarch64.app.tar.gz » ou « ${product}_x64.app.tar.gz » ` +
        "(le .sig avec) puis relancer ; aucune architecture n'est devinee.",
    );
  }
  return { ok: true };
}

/**
 * Construit le manifeste `latest.json` attendu par le plugin updater.
 *
 * Règles dures :
 * - `version` **sans** le `v` du tag ;
 * - `signature` = le **contenu** du `.sig`, jamais son chemin ;
 * - URL **absolues** vers la release Forgejo du tag ;
 * - une plateforme dont l'artefact (ou sa signature) manque est **omise** et signalée — jamais
 *   écrite avec une URL fantôme, qui produirait un échec de téléchargement chez le client.
 *
 * @param {{ tag: string, notes?: string, pubDate?: string, base?: string,
 *           artifacts: Array<{ name: string, signature: string }> }} input
 * @returns {{ manifest: object, missing: string[], used: Record<string,string> }}
 */
export function buildManifest(input) {
  const { tag, notes = "", pubDate, artifacts, base } = input;
  const version = versionOfTag(tag);
  const urlBase = `${base ?? downloadBase()}/${tag}`;
  const platforms = {};
  const used = {};
  for (const art of artifacts) {
    const plat = platformOfArtifact(art.name);
    if (plat === null) continue;
    const sig = (art.signature ?? "").trim();
    if (sig.length === 0) continue;
    // Premier arrivé, premier servi : deux artefacts pour une même plateforme est anormal, on
    // garde le premier et on le dit plutôt que d'en écraser un silencieusement.
    if (platforms[plat] !== undefined) continue;
    platforms[plat] = {
      signature: sig,
      url: `${urlBase}/${encodeURIComponent(art.name)}`,
    };
    used[plat] = art.name;
  }
  const missing = PLATFORMS.filter((p) => platforms[p] === undefined);
  const manifest = {
    version,
    notes,
    pub_date: pubDate ?? new Date().toISOString(),
    platforms,
  };
  return { manifest, missing, used };
}

/**
 * Apparie les fichiers d'un répertoire : tout `<nom>.sig` désigne l'artefact `<nom>`. La signature
 * est le CRITÈRE : un binaire sans `.sig` n'est pas publiable (le client le refuserait de toute
 * façon), il est donc ignoré ici plutôt que de gonfler un manifeste inutilisable.
 */
export function collectArtifactsFromDir(dir) {
  const files = readdirSync(dir);
  const out = [];
  for (const f of files) {
    if (!f.endsWith(".sig")) continue;
    const name = f.slice(0, -4);
    if (!files.includes(name)) continue;
    out.push({
      name,
      signature: readFileSync(join(dir, f), "utf8").trim(),
      path: join(dir, name),
      sigPath: join(dir, f),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Jetons — lus dans l'environnement, jamais en dur, jamais affichés
// ---------------------------------------------------------------------------

/** Lit une clé dans `~/work/.env` (source unique du portefeuille) sans rien exporter. */
export function readEnvFile(key, file = join(homedir(), "work", ".env")) {
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, "").trim() || null;
  }
  return null;
}

function forgejoToken() {
  const tok = process.env.FORGEJO_TOKEN || readEnvFile("FORGEJO_TOKEN");
  if (!tok) {
    throw new Error(
      "FORGEJO_TOKEN absent (ni environnement, ni ~/work/.env) — publication impossible. " +
        "Ne PAS ecrire de jeton dans le depot.",
    );
  }
  return tok;
}

// ---------------------------------------------------------------------------
// 4. Récupération des artefacts amont (GitHub) — repli `--from <dir>`
// ---------------------------------------------------------------------------

function githubRepoSlug() {
  try {
    const url = execFileSync("git", ["remote", "get-url", "github"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    const m = url.match(/github\.com[:/]+([^/]+)\/([^/.]+)/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    /* pas de remote github : on le dira au moment de s'en servir */
  }
  return null;
}

async function fetchGithubArtifacts(tag) {
  const slug = githubRepoSlug();
  if (slug === null) {
    throw new Error(
      "aucun remote `github` — utiliser --from <dir> pour publier depuis des artefacts locaux.",
    );
  }
  const token = process.env.GITHUB_TOKEN || readEnvFile("GITHUB_TOKEN");
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const relRes = await fetch(`https://api.github.com/repos/${slug}/releases/tags/${tag}`, {
    headers,
  });
  if (!relRes.ok) {
    throw new Error(`release GitHub ${tag} introuvable (HTTP ${relRes.status}) sur ${slug}`);
  }
  const rel = await relRes.json();
  const dir = mkdtempSync(join(tmpdir(), "iakaframegui-update-"));
  console.log(`  telechargement des artefacts GitHub dans ${dir}`);
  for (const asset of rel.assets ?? []) {
    const res = await fetch(asset.url, {
      headers: { ...headers, Accept: "application/octet-stream" },
    });
    if (!res.ok) throw new Error(`telechargement de ${asset.name} echoue (HTTP ${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(dir, asset.name), buf);
  }
  return dir;
}

// ---------------------------------------------------------------------------
// 5. Release Forgejo + téléversement
// ---------------------------------------------------------------------------

async function forgejoRelease(tag, notes, token) {
  const api = `${FORGEJO_BASE}/api/v1/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
  const head = { Authorization: `token ${token}`, "Content-Type": "application/json" };
  const existing = await fetch(`${api}/tags/${encodeURIComponent(tag)}`, {
    headers: { Authorization: `token ${token}` },
  });
  if (existing.ok) {
    const rel = await existing.json();
    console.log(`  release Forgejo ${tag} deja presente (id ${rel.id}) — reutilisee`);
    return rel;
  }
  const res = await fetch(api, {
    method: "POST",
    headers: head,
    body: JSON.stringify({ tag_name: tag, name: tag, body: notes, draft: false, prerelease: false }),
  });
  if (!res.ok) {
    throw new Error(`creation de la release Forgejo ${tag} echouee (HTTP ${res.status})`);
  }
  return res.json();
}

async function forgejoUpload(releaseId, filePath, name, token) {
  const api =
    `${FORGEJO_BASE}/api/v1/repos/${REPO_OWNER}/${REPO_NAME}/releases/${releaseId}/assets` +
    `?name=${encodeURIComponent(name)}`;
  const form = new FormData();
  form.append("attachment", new Blob([readFileSync(filePath)]), name);
  const res = await fetch(api, {
    method: "POST",
    headers: { Authorization: `token ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`televersement de ${name} echoue (HTTP ${res.status})`);
}

// ---------------------------------------------------------------------------
// 6. Garde de branche — le manifeste n'est visible que depuis `main`
// ---------------------------------------------------------------------------

/**
 * Refuse net une publication lancée depuis une autre branche que `main`.
 *
 * Sans cette garde, lancé depuis une branche de feature, le script commitait le manifeste, le
 * poussait **sur cette branche**, puis annonçait « la mise a jour est desormais visible des
 * clients » — alors que l'endpoint interrogé est `raw/branch/main/updater/latest.json` : rien
 * n'avait bougé chez personne. Un échec silencieux annoncé comme un succès est pire qu'un échec.
 *
 * @returns {{ ok: true, branch: string }}
 * @throws {Error} en citant la branche vue et la branche attendue.
 */
export function assertPublishBranch(branch, wanted = PUBLISH_BRANCH) {
  if (branch !== wanted) {
    throw new Error(
      `publication refusee : branche courante « ${branch ?? "(inconnue)"} », attendue « ${wanted} ». ` +
        `L'endpoint updater lit raw/branch/${wanted}/updater/latest.json — un manifeste pousse ` +
        `ailleurs n'est vu par AUCUN client. Basculer sur ${wanted} (ou utiliser --no-push).`,
    );
  }
  return { ok: true, branch };
}

/** Le manifeste, relatif à la racine — seul chemin que ce script a le droit de commiter. */
export const MANIFEST_PATH = "updater/latest.json";

/**
 * Exécute un `git` dans le dépôt. `capture` rend la sortie au lieu de la laisser filer à l'écran :
 * c'est ce qui permet de *lire* l'état de l'index sans polluer le journal de publication.
 */
export function gitRun(args, { cwd = ROOT, capture = false } = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
}

/**
 * Commit du manifeste **s'il a changé**, puis push. Rejouer une publication identique doit être un
 * NO-OP propre.
 *
 * Ce que ça répare : la release Forgejo est explicitement idempotente (« deja presente — reutilisee »),
 * donc republier un même tag est un geste **prévu**. Mais quand le manifeste produit était identique
 * à celui déjà versionné, `git commit -- updater/latest.json` sortait `1` (« nothing added to
 * commit ») et faisait tomber le script — **après** les téléversements. Un chemin nominal se
 * terminait donc par un échec, en fin de course, alors que tout s'était bien passé.
 *
 * On interroge donc l'index (`diff --cached` sur le seul chemin du manifeste) avant de commiter, et
 * on pousse dans les deux cas : un run précédent a pu commiter sans réussir à pousser, et un push
 * sans rien à envoyer est déjà un no-op côté git.
 *
 * @returns {{ committed: boolean }} `false` = manifeste inchangé, aucun commit créé.
 */
export function commitAndPushManifest(tag, { run = gitRun, cwd = ROOT } = {}) {
  run(["add", MANIFEST_PATH], { cwd });
  const staged = run(["diff", "--cached", "--name-only", "--", MANIFEST_PATH], {
    cwd,
    capture: true,
  });
  const committed = String(staged ?? "").trim().length > 0;
  if (committed) {
    run(["commit", "-m", `chore(release): manifeste de mise a jour ${tag}`, "--", MANIFEST_PATH], {
      cwd,
    });
  } else {
    console.log(`manifeste inchange — aucun commit (republication a l'identique de ${tag})`);
  }
  run(["push", "origin", "HEAD"], { cwd });
  return { committed };
}

/** Branche git courante du dépôt (`null` en HEAD détachée ou hors dépôt). */
export function currentBranch(root = ROOT) {
  try {
    const out = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return out === "HEAD" ? null : out;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 7. Pilote
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const args = { tag: null, from: null, notes: "", checkOnly: false, dryRun: false, push: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--from") args.from = argv[++i];
    else if (a === "--notes") args.notes = argv[++i] ?? "";
    else if (a === "--check-only") args.checkOnly = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--no-push") args.push = false;
    else if (!a.startsWith("--") && args.tag === null) args.tag = a;
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.tag === null) {
    console.error(
      "usage : node scripts/publish-update.mjs vX.Y.Z " +
        "[--from <dir>] [--check-only] [--dry-run] [--no-push] [--notes <texte>]",
    );
    return 2;
  }

  // (1) Garde d'alignement — toujours, y compris en --check-only.
  const versions = readRepoVersions();
  assertVersionsAligned(args.tag, versions);
  const carriers = Object.values(VERSION_CARRIERS)
    .map((c) => c.file)
    .join(", ");
  console.log(`versions alignees sur ${versionOfTag(args.tag)} (${carriers}, tag)`);
  if (args.checkOnly) return 0;

  // (1bis) Garde de branche. Elle protège **le geste qui rend visible** — le commit et le push du
  // manifeste sur la branche que l'endpoint updater lit. Elle est posée ici, avant les écritures
  // distantes, pour ne pas laisser derrière un échec tardif une release Forgejo à moitié remplie.
  //
  // Sous `--no-push`, elle ne s'applique PAS, et il faut le dire exactement : le script crée quand
  // même la release Forgejo et téléverse les binaires **sans aucune garde de branche**. Ce n'est pas
  // une garde oubliée, c'est le mode d'emploi de l'étape 6b — « publier les binaires, puis ouvrir le
  // robinet » : tant que le manifeste n'est pas sur `main`, aucun client ne voit quoi que ce soit,
  // quelle que soit la branche depuis laquelle on a téléversé. Ce qui est gardé, c'est le robinet ;
  // ce qui ne l'est pas, c'est le dépôt des binaires — et ce dernier est sans effet client.
  if (args.push && !args.dryRun) {
    const branch = currentBranch();
    assertPublishBranch(branch);
    console.log(`branche de publication : ${branch}`);
  }

  // (2) Artefacts : locaux (--from) ou release GitHub du tag.
  const dir = args.from ? resolve(args.from) : await fetchGithubArtifacts(args.tag);
  if (!existsSync(dir)) throw new Error(`repertoire d'artefacts introuvable : ${dir}`);
  const artifacts = collectArtifactsFromDir(dir);
  if (artifacts.length === 0) {
    throw new Error(
      `aucun artefact signe dans ${dir} — le CI a-t-il bien recu les secrets de signature ?`,
    );
  }
  // Tout ce qui se vérifie sur les NOMS se vérifie ici, avant la moindre écriture distante.
  assertNamedArchitectures(readdirSync(dir));

  // (3) Release Forgejo + téléversement des binaires ET de leurs `.sig`.
  const { manifest, missing, used } = buildManifest({
    tag: args.tag,
    notes: args.notes,
    artifacts,
  });
  for (const [plat, name] of Object.entries(used)) console.log(`  ${plat.padEnd(15)} ${name}`);
  for (const plat of missing) console.warn(`  ${plat.padEnd(15)} MANQUANT — plateforme omise`);
  if (Object.keys(manifest.platforms).length === 0) {
    throw new Error("aucune plateforme publiable — manifeste non ecrit");
  }

  if (!args.dryRun) {
    const token = forgejoToken();
    const rel = await forgejoRelease(args.tag, args.notes, token);
    for (const art of artifacts) {
      if (platformOfArtifact(art.name) === null) continue;
      await forgejoUpload(rel.id, art.path, art.name, token);
      await forgejoUpload(rel.id, art.sigPath, `${art.name}.sig`, token);
      console.log(`  televerse ${art.name} (+ .sig)`);
    }
  }

  // (4) Manifeste versionné : c'est CE fichier, poussé sur la branche de publication (garantie
  //     `main` par la garde de branche ci-dessus), qui ouvre le robinet.
  const outDir = join(ROOT, "updater");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "latest.json");
  const body = `${JSON.stringify(manifest, null, 2)}\n`;
  if (args.dryRun) {
    console.log(body);
    return 0;
  }
  writeFileSync(outFile, body);
  console.log(`manifeste ecrit : ${outFile}`);

  // (5) Commit + push. Jamais de --force : le feed vit dans l'historique de `main`.
  //     Le commit est LIMITÉ AU CHEMIN du manifeste (`-- updater/latest.json`) : sans ça, il
  //     emportait tout ce qui traînait dans l'index de la copie de travail — une publication ne
  //     doit jamais embarquer du code au passage.
  //     Le push vise `HEAD` et non `HEAD:main` **à dessein** : la garde de branche a déjà établi que
  //     HEAD est `main`, et viser HEAD garantit qu'une garde contournée ne pousserait pas une
  //     branche de feature sur la branche de publication.
  //     Le reste du geste — dont le no-op d'une republication à l'identique — vit dans
  //     `commitAndPushManifest`, où il est testable sans réseau ni release réelle.
  if (args.push) {
    const { committed } = commitAndPushManifest(args.tag);
    console.log(
      committed
        ? "manifeste pousse — la mise a jour est desormais visible des clients"
        : "rien a pousser — la mise a jour etait deja visible des clients",
    );
  }
  return 0;
}

// Exécution seulement quand le fichier est appelé directement (importable en test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(`publish-update : ${e.message}`);
      process.exit(1);
    });
}
