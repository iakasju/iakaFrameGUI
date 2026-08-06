# Instruction : Auto-update de l'application (flux Forgejo LAN, endpoints extensibles)

> Rédigé au niveau **portefeuille** (🟡 Odin) le 2026-08-06 — **lot jumeau** : la même instruction
> est déposée dans `IakaCockpit/specs/instructions/L34-auto-update.md`, au § Annexe près (constantes
> propres au projet). Consommé par ⚒️ Gimli (P2), gate 🏹 Legolas (P3).
> Doc en français, code et identifiants en anglais.
>
> **Nature du lot** : lot **moyen**, à cheval sur trois surfaces — backend Tauri (2 plugins),
> front (1 hook + 1 bandeau + 1 entrée Réglages), chaîne de release (1 secret CI + 1 script de
> publication). Il **dépend du LAN iakabox** pour la recette de bout en bout (critère C5), mais
> **jamais** pour le développement, les tests ou le fonctionnement de l'appli.

---

## Problème

Les deux applis du portefeuille (iakaFrameGUI, IakaCockpit) sont installées sur les postes de
Stéphane et n'ont **aucun moyen de se mettre à jour**. Chaque version publiée impose de retrouver
le binaire, de le retélécharger et de le réinstaller à la main — friction qui, en pratique, laisse
tourner des versions périmées pendant des semaines. Le socle de fabrication existe pourtant déjà
en entier : `.github/workflows/release.yml` builde les **4 cibles** (macOS arm64, macOS x64, Linux,
Windows) via `tauri-action` sur tout tag `v*`. Il ne manque que **le canal de distribution** et
**le client qui le consulte**.

## Décisions d'arbitrage (Stéphane, 2026-08-06) — non rediscutables dans ce lot

| # | Décision |
|---|---|
| **D1** | Le flux de mise à jour est servi en **HTTP public sans authentification** — pas de token embarqué dans le binaire distribué. |
| **D2** | **Pour l'instant : Forgejo sur le LAN iakabox.** Le passage ultérieur à un site web ou à GitHub ne doit coûter **qu'un changement d'URL** dans `tauri.conf.json`, aucune reprise du code de l'appli. |
| **D3** | Pas d'installation silencieuse imposée : l'appli **propose**, Stéphane **décide** et déclenche l'installation. |

## Faits vérifiés le 2026-08-06 — **à ne PAS re-vérifier**

| Constat | Valeur |
|---|---|
| Forgejo iakabox | version **1.26.2**, joignable, `http://192.168.2.11:3001` |
| Visibilité des 2 dépôts | **`private: false`** (`/api/v1/repos/sjupin/iakaFrameGUI`, `/sjupin/iakacockpit`) → **lecture anonyme OK** |
| Lecture anonyme d'un fichier brut | `GET /sjupin/iakacockpit/raw/branch/main/README.md` → **HTTP 200 sans en-tête d'auth** |
| Releases présentes sur Forgejo | **aucune** (`/releases` → `[]`) sur les deux dépôts — tout l'historique de release vit sur le miroir GitHub |
| Branche par défaut | `main` sur les deux dépôts |
| Version courante | iakaFrameGUI **0.1.4** (`package.json`, `tauri.conf.json`, `Cargo.toml` alignés), dernier tag `v0.1.4` |
| Socle Tauri | **2.11.2**, `tauri-build` 2.6.2, Rust 1.77.2, plugins `dialog` et `shell` déjà montés |

## Conséquence directe de ces faits — la contrainte structurante du lot

**GitHub Actions ne peut pas atteindre le LAN iakabox.** Le builder (GitHub) et le canal de
distribution (Forgejo LAN) sont donc **deux mondes disjoints**, et il faut un **pas de recopie**
exécuté depuis le poste de Stéphane, box en ligne. Ce lot le livre sous forme de script
(§ Étape 6). Ce n'est pas un défaut du montage : c'est le prix de D2, et il **disparaît** le jour
où le flux passera sur un site web public ou sur GitHub.

---

## Périmètre

### Dans le lot

1. Montage des plugins `updater` + `process` (Rust et JS).
2. Paire de clés de signature minisign, clé publique en config, clé privée hors dépôt.
3. Configuration `tauri.conf.json` : artefacts updater, clé publique, **liste ordonnée** d'endpoints.
4. Capacités Tauri (`updater`, `process`).
5. Front : un hook de mise à jour + un bandeau discret + une entrée manuelle dans les Réglages.
6. Chaîne de publication : secrets de signature dans le CI GitHub + script local de recopie vers
   Forgejo générant le manifeste `latest.json`.
7. Garde d'alignement des versions (`package.json` / `tauri.conf.json` / `Cargo.toml` / tag).
8. Tests unitaires front du hook (réseau **mocké**, aucun accès réseau en test).

### Hors du lot — à ne pas faire

- Notarisation Apple / signature Authenticode (indépendantes de la signature updater minisign).
- Canaux `beta` / `stable`, rollback de version, mises à jour différentielles.
- Installation silencieuse ou forcée (contraire à D3).
- Câblage effectif d'un flux site web ou GitHub : la **liste** d'endpoints le rend possible en une
  ligne, mais on ne publie sur aucun des deux dans ce lot.
- Mise à jour des paquets `.deb` / `.rpm` : l'updater Linux ne sait mettre à jour que l'**AppImage**
  (fait à consigner dans le guide utilisateur, pas à contourner ici).
- Toute mise à jour de la **bibliothèque** (réservoir, kits, personas) : ce lot met à jour
  **l'exécutable**, rien d'autre. Ne pas mélanger les deux gestes.

---

## Architecture retenue

### Le canal : un manifeste versionné, des binaires en release

Le point délicat sur Forgejo est qu'il n'existe **pas d'alias `latest`** utilisable comme URL
stable de téléchargement. La solution retenue évite le problème plutôt que de le contourner :

- **Le manifeste** `updater/latest.json` est un **fichier du dépôt**, sur `main`, servi en brut :
  `http://192.168.2.11:3001/sjupin/iakaFrameGUI/raw/branch/main/updater/latest.json`.
  URL **stable à jamais**, lisible anonymement (fait vérifié ci-dessus), et le feed gagne au
  passage un historique git.
- **Les binaires** vivent en pièces jointes d'une **release Forgejo** taguée, référencées par URL
  **absolue** depuis le manifeste. Le manifeste est le seul objet qui bouge à URL fixe.

### Le client : Rust appelle, le front décide

L'appel HTTP du contrôle de version est émis par **le backend Rust** (plugin updater), pas par la
webview. Trois conséquences à ne pas oublier :

- **La CSP de `tauri.conf.json` n'est pas concernée** — inutile d'ajouter l'hôte de la box à
  `connect-src`. Ne pas y toucher.
- Un endpoint en **`http://`** (le LAN, sans TLS) est **refusé par défaut** par le plugin. Il faut
  `"dangerousInsecureTransportProtocol": true` (champ Rust `dangerous_insecure_transport_protocol`,
  « Dangerously allow using insecure transport protocols for update endpoints »). C'est **assumé et
  borné** : LAN privé, charge utile **signée minisign** et vérifiée avant installation — l'absence
  de TLS n'ouvre pas la porte à un binaire non signé. À **retirer** le jour où le flux passe en
  HTTPS (site web / GitHub).
- **L'invariant AR-1/AR-6 est intact.** Cet egress n'est **ni** un appel runner (LLM), **ni** un
  sous-processus : c'est le contrôle de version de l'appli elle-même, borné à un endpoint réglé en
  configuration et à une charge utile signée. Le documenter comme tel dans `lib.rs` et dans la
  `description` du manifeste de capacités, au même niveau de soin que les dérogations existantes —
  mais ne pas le ranger **parmi** elles : ce n'en est pas une.

---

## Étapes

### Étape 1 — Paire de clés de signature (une fois, ne se refait jamais)

```bash
npm run tauri signer generate -- -w ~/.tauri/iakaframegui.key
```

- La **clé privée** et sa passphrase ne sont **jamais** commitées, ni écrites dans un `.env` du
  dépôt. Sauvegarde hors dépôt obligatoire (coffre) : **perdre cette clé, c'est condamner toutes
  les versions déjà installées à ne plus jamais pouvoir se mettre à jour** — il faudrait une
  réinstallation manuelle sur chaque poste.
- La **clé publique** (contenu du `.pub`, pas un chemin) part dans `tauri.conf.json`.
- Clé **distincte** de celle du Cockpit : deux applis, deux clés, aucune confiance croisée.

### Étape 2 — Dépendances et montage

`src-tauri/Cargo.toml` :

```toml
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

`package.json` : `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`.

`src-tauri/src/lib.rs`, dans `run()`, à la suite des plugins existants — avec un commentaire
d'intention dans le style du fichier (le montage est un **passe-plat**, aucune logique métier) :

```rust
.plugin(tauri_plugin_updater::Builder::new().build())
.plugin(tauri_plugin_process::init())
```

### Étape 3 — `src-tauri/tauri.conf.json`

```json
"bundle": {
  "createUpdaterArtifacts": true
},
"plugins": {
  "updater": {
    "pubkey": "<contenu de la clé publique>",
    "dangerousInsecureTransportProtocol": true,
    "endpoints": [
      "http://192.168.2.11:3001/sjupin/iakaFrameGUI/raw/branch/main/updater/latest.json"
    ],
    "windows": { "installMode": "passive" }
  }
}
```

La liste est **ordonnée** : les endpoints sont essayés dans l'ordre et le premier qui répond gagne.
C'est le mécanisme qui honore D2 — le jour venu, on **préfixe** la liste avec l'URL HTTPS publique
sans rien changer d'autre. Ne pas retirer l'entrée Forgejo à ce moment-là : elle devient le repli LAN.

### Étape 4 — Capacités

`src-tauri/capabilities/default.json`, ajouter aux `permissions` :

```json
"updater:default",
"process:allow-restart"
```

Compléter la `description` du manifeste **sans toucher à l'allow-list `shell:allow-execute`
existante** : le contrôle de mise à jour est un egress réseau sortant vers l'endpoint réglé, borné
par la vérification de signature minisign, et **distinct** de l'egress d'authoring Ollama déjà
documenté.

### Étape 5 — Front : un hook, un bandeau, une entrée manuelle

**Hook** `src/hooks/useAppUpdate.ts` — machine à états explicite :

`idle → checking → up-to-date | available | downloading(pct) | ready | error`

- **Contrôle au démarrage** : différé de ~3 s après le montage de l'appli, **non bloquant**. En cas
  d'échec (box injoignable, DNS, timeout) → état `error` **silencieux à l'écran**, trace console
  unique, **aucune boîte de dialogue**, **aucune UI dégradée**. Une box éteinte ne doit jamais se
  voir. C'est l'application directe du principe « iakabox optionnelle ».
- **Contrôle manuel** : même hook, drapeau `verbose` → l'erreur, elle, **s'affiche** (Stéphane a
  demandé, il mérite une réponse).
- L'installation n'est déclenchée **que** par un clic explicite (D3), puis `relaunch()`.

**Bandeau** : discret, non modal, **conforme à la charte active** (thème commutable de la forge, pas
de couleur en dur) — « **Version X.Y.Z disponible** » + bouton « Installer et redémarrer » +
fermeture. Pendant le téléchargement, la progression issue des événements `Started` / `Progress` /
`Finished`.

**Réglages** (`src/components/SettingsRoot.tsx`) : une section « Mises à jour » affichant la version
courante, un bouton « Vérifier les mises à jour », et l'endpoint interrogé en texte gris (savoir
d'où vient la mise à jour fait partie du contrat).

**Pas d'i18n dans ce projet** : chaînes en français directement, comme le reste de la forge.

### Étape 6 — Chaîne de publication

**6a — CI GitHub.** Dans `.github/workflows/release.yml`, sur l'étape `tauri-apps/tauri-action@v0`,
ajouter au bloc `env` :

```yaml
TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

Le bundler produit alors, à côté de chaque binaire, son fichier `.sig`. **Sans ces secrets, le build
ne produit aucune signature et le lot ne sert à rien** : le renseignement des deux secrets côté
GitHub est un **gate humain** (§ Gates).

**6b — Recopie vers Forgejo.** Script `scripts/publish-update.mjs` (Node, sans dépendance externe,
dans l'esprit de `scripts/test-vendor.mjs`) :

```
node scripts/publish-update.mjs v0.1.5
```

Il enchaîne, en s'arrêtant net à la première anomalie :

1. **Garde d'alignement** : `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` et
   le tag passé en argument portent **la même version**, sinon échec explicite (une dérive ici et
   l'updater ment sur la version disponible).
2. Récupération des artefacts de la release GitHub du tag (jeton GitHub lu dans l'environnement,
   **jamais** en dur) — ou, en repli, d'un répertoire local passé en `--from <dir>` pour ne pas
   dépendre de GitHub le jour où on n'en veut plus.
3. Création de la release Forgejo du tag via l'API (`POST /api/v1/repos/sjupin/iakaFrameGUI/releases`)
   et téléversement des artefacts + `.sig`. Jeton via `$FORGEJO_TOKEN` / `~/work/.env`, **jamais**
   en dur (cf. convention portefeuille).
4. Génération de `updater/latest.json` au format attendu par le plugin :

```json
{
  "version": "0.1.5",
  "notes": "…",
  "pub_date": "2026-08-06T10:00:00Z",
  "platforms": {
    "darwin-aarch64": { "signature": "<contenu du .sig>", "url": "http://192.168.2.11:3001/sjupin/iakaFrameGUI/releases/download/v0.1.5/iakaFrameGUI_aarch64.app.tar.gz" },
    "darwin-x86_64":  { "signature": "…", "url": "…" },
    "linux-x86_64":   { "signature": "…", "url": "…" },
    "windows-x86_64": { "signature": "…", "url": "…" }
  }
}
```

   `version` **sans** le `v` du tag ; `signature` est le **contenu** du `.sig`, pas son chemin ; les
   URL sont **absolues**. Une plateforme dont l'artefact manque est **omise** (et signalée en
   sortie), jamais écrite avec une URL fantôme.
5. Commit + push de `updater/latest.json` sur `main` (commit conventionnel `chore(release): …`).
   C'est **ce push** qui rend la mise à jour visible : tant qu'il n'a pas eu lieu, rien ne bouge
   chez les clients — propriété utile, on peut publier les binaires puis ouvrir le robinet.

### Étape 7 — Tests

`src/hooks/useAppUpdate.test.ts`, avec `@tauri-apps/plugin-updater` **mocké** (`vi.mock`) —
**aucun accès réseau** :

| Cas | Attendu |
|---|---|
| `check()` renvoie `null` | état `up-to-date`, aucun bandeau |
| `check()` renvoie une version supérieure | état `available`, version exposée telle quelle |
| `check()` rejette (box injoignable), mode démarrage | état `error`, **rien à l'écran**, une seule trace |
| `check()` rejette, mode manuel (`verbose`) | état `error` **affiché** |
| installation déclenchée | `downloadAndInstall` puis `relaunch` appelés **dans cet ordre**, une seule fois |
| double clic sur « Installer » | `downloadAndInstall` appelé **une seule fois** |

Plus un test du générateur de manifeste (`scripts/`) : sur un jeu d'artefacts factices, le
`latest.json` produit porte les 4 plateformes, des URL absolues, et omet proprement une plateforme
manquante.

---

## Critères d'acceptation — le gate 🏹 Legolas les rejoue, commandes et sorties citées

| # | Critère | Vérification |
|---|---|---|
| **C1** | La chaîne qualité est verte | `npm run lint:all && npm run test`, puis `cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test` → exit 0 partout |
| **C2** | Box injoignable = invisible | lancer l'appli, box éteinte ou LAN coupé : aucune boîte de dialogue, aucune zone en erreur, UI complète et utilisable |
| **C3** | Détection correcte | avec un `latest.json` servi localement annonçant une version **supérieure** → bandeau avec la bonne version ; version **égale ou inférieure** → aucun bandeau |
| **C4** | Le contrôle manuel parle | « Vérifier les mises à jour » box injoignable → message d'erreur **explicite** à l'écran |
| **C5** | Bout en bout réel | une version installée détecte, télécharge, installe et redémarre sur la version suivante publiée sur Forgejo — **sur au moins une plateforme** (gate humain, cf. § Gates) |
| **C6** | Aucun secret dans le dépôt | `git grep -nE "TAURI_SIGNING_PRIVATE_KEY *= *[^$]\|untrusted comment"` → aucune correspondance ; `updater/latest.json` ne contient que des signatures publiques |
| **C7** | Versions alignées | `node scripts/publish-update.mjs vX.Y.Z --check-only` sur une version volontairement désalignée → échec explicite |

---

## Gates humains — ce que l'exécution **ne peut pas** faire seule

1. **Générer la paire de clés** et la sauvegarder hors dépôt (étape 1).
2. **Renseigner les deux secrets** `TAURI_SIGNING_PRIVATE_KEY` et
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` dans les réglages GitHub du dépôt miroir.
3. **Recetter C5** : installer une version, en publier une suivante, constater la bascule.

L'exécution livre tout le reste et **s'arrête** proprement devant ces trois-là, sans les simuler ni
les déclarer faits.

---

## Pièges connus — relevés au cadrage, à ne pas redécouvrir

- **macOS non notarisée.** La mise à jour remplace le bundle `.app` et fonctionne sans notarisation
  Apple : la confiance vient de la signature **minisign**, indépendante de Gatekeeper. La levée de
  quarantaine reste nécessaire à la **première** installation manuelle seulement.
- **L'échec DMG local n'est pas bloquant.** Sur le Mac de Stéphane, `tauri build` échoue à l'étape
  DMG (Apple Events refusés par le Finder). L'artefact updater est le `.app.tar.gz`, produit **avant**
  cette étape — et de toute façon les binaires publiés viennent du CI. À confirmer au premier build
  local, sans en faire un blocage.
- **`git push --force` proscrit** (règle méthode) : le feed vivant dans l'historique de `main`,
  réécrire l'historique casserait la traçabilité du canal de mise à jour.
- **AppImage seul** côté Linux : `.deb` et `.rpm` ne sont pas des cibles de mise à jour.
- **Ne pas toucher à la CSP** : l'appel sort du backend Rust, pas de la webview (cf. § Architecture).

---

## Annexe — constantes de ce projet

| Constante | Valeur |
|---|---|
| Dépôt Forgejo | `sjupin/iakaFrameGUI` (public, branche `main`) |
| Endpoint | `http://192.168.2.11:3001/sjupin/iakaFrameGUI/raw/branch/main/updater/latest.json` |
| Identifiant bundle | `com.iakateam.iakaframegui` |
| Nom de produit | `iakaFrameGUI` |
| Version au cadrage | `0.1.4` |
| Écran des réglages | `src/components/SettingsRoot.tsx` |
| i18n | **aucun** — chaînes en français dans le composant |
| Chaîne qualité | `npm run lint:all && npm run test` (+ `cargo fmt/clippy/test` côté `src-tauri`) |
| Clé de signature | `~/.tauri/iakaframegui.key` |
