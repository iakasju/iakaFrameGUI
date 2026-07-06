# Instruction P5 — Skin Cinabre + sélecteur de charte (UI de la forge, MVP)

> **Phase** : P5 — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Fondations** : `specs/instructions/P1-coquille-forge-authoring.md` (`src/styles.css` neutre, façade unique,
> CSP stricte, `SettingsView`), P4 (persistance de préférences en localStorage / config non sensible).
> **Sources de charte in-repo (étape 0)** : `iakacharte/design-cinabre/cinabre.css` +
> `iakacharte/design-cinabre/cinabre-charte.md` ; `iakaframe/design-naonedge/naonedge-charte.md` (2e charte).

---

## 1. Objectif

Habiller l'UI de la forge **on-brand**, **Cinabre par défaut**, et ajouter un **sélecteur de charte** dans les
Réglages (`SettingsView`). **Portée = l'UI de la forge elle-même** (tranché : **PAS** ce que la forge génère). Le
front P1–P4 a aujourd'hui un `src/styles.css` neutre → le passer en **Cinabre**, avec **≥ 2 chartes** commutables
(Cinabre + NaonEdge) **persistées**. **C'est de l'habillage** : aucune logique métier ni layout n'est redessiné.

---

## 2. Contrainte CSP + décision d'embarquement (le cœur du lot)

**Contrainte.** La forge est une **app Tauri à CSP stricte (jamais `null`)** : **interdiction** de `<link>` vers une
feuille externe, de CDN, de `@import url(https://…)`. Les docs HTML historiques pointaient `iakacharte` en
**relatif** (contexte navigateur) — **inapplicable ici**. La charte doit être **EMBARQUÉE dans le bundle**.

### 2.1 CSS — **vendoriser** (décision)
**Décision : vendoriser les feuilles de charte dans `src/themes/`**, importées par **Vite** (`import
"./themes/cinabre.css"`), donc **bundlées** dans l'app — **self-contained, CSP-safe** (servies en `'self'`).
- **Pourquoi vendoriser plutôt que ré-extraire des tokens à la main** : `cinabre.css` **est déjà** une feuille de
  tokens propre (`:root` variables + composants) et **la source de vérité** ; la ré-écrire introduirait une
  **divergence**. On **copie** la feuille (ou son bloc `:root` + les règles utiles à l'app) telle quelle.
- **Traçabilité** : un en-tête de fichier note l'origine (`vendorisé depuis iakacharte/design-cinabre/cinabre.css,
  <date>`) pour une resynchro manuelle ultérieure. *(La sync automatique = hors MVP.)*

### 2.2 Fonts — **fallback système au MVP** (décision)
Les fonts Cinabre (Inter / Spectral / JetBrains Mono) sont des **Google Fonts** → **CDN interdit par la CSP**.
**Décision : fallback système au MVP.** Les variables de la charte **déclarent déjà** des piles de repli
système (`cinabre.css:50-52` : `-apple-system,BlinkMacSystemFont,"Segoe UI"` ; `Georgia,"Times New Roman"` ;
`ui-monospace,'SF Mono',Menlo,Consolas`) → **on garde les variables telles quelles**, les polices custom **absentes
tombent** proprement sur le système. **Aucune requête réseau.**
- **Note (différé)** : self-héberger les `.woff2` (vendorisés en `src/assets/fonts/` + `@font-face` local
  `'self'`) est **CSP-safe** mais alourdit le bundle → **itération 2** (Q-2). Le rendu Cinabre reste fidèle en
  fallback système (la charte est pensée avec ces replis).

---

## 3. Étape 0 (in-repo, sans web) — sources réutilisées

Le développeur-devops **note ce qu'il réutilise** dans `specs/notes/chartes-<date>.md` :

| Source | Réutilisé |
|---|---|
| `iakacharte/design-cinabre/cinabre.css` | **Feuille vendorisée** : bloc `:root` (tokens surfaces/texte/accent/formes/typo) + règles de composants utiles. Fond `#e8e8eb`, accent `#bd2f27`, encre `#9e211a`, **un seul accent**. |
| `iakacharte/design-cinabre/cinabre-charte.md` | Règles de marque : **« un seul accent porte la marque »** (`:53`), deux rouges/deux rôles (`--accent` aplats / `--accent-ink` texte), sémantique = états seulement. |
| `iakaframe/design-naonedge/naonedge-charte.md` | **2e charte** du sélecteur (NaonEdge, accent or) : mêmes noms de variables (drop-in) → commutation par simple jeu de tokens. |

**Constat clé** : Cinabre et NaonEdge partagent **la même API de variables** (drop-in, `cinabre-charte.md:5-7`) →
la commutation de charte = **changer le jeu de variables `:root`**, pas réécrire les composants.

---

## 4. Périmètre — IN / OUT

### 4.1 DANS le périmètre P5

1. **Vendoriser la charte Cinabre** (+ NaonEdge) dans `src/themes/` (CSS/tokens embarqués, CSP-safe).
2. **Re-skinner l'UI de la forge en Cinabre par défaut** : appliquer les tokens Cinabre aux composants **existants**
   (Personas / Teams / Deploy / Settings) **sans changer leur logique** — habillage via variables CSS.
3. **Sélecteur de charte** dans `SettingsView` : liste des chartes du catalogue (**Cinabre par défaut** + **NaonEdge**
   en 2e), **commutation par thème** (attribut `data-theme` sur `<html>`/racine + jeu de variables), **persisté**
   (localStorage / config non sensible, calque P4).
4. **Registre de chartes minimal** (source de vérité des chartes dispo) — **au FRONT au MVP** (§ 5, Q-3).

### 4.2 HORS périmètre P5

- **Appliquer une charte à ce que la forge GÉNÈRE** : **hors sujet** (tranché) — P5 habille **l'UI de la forge**, pas
  les kits produits.
- **Créer de nouvelles chartes** (on réutilise Cinabre + NaonEdge existantes).
- **Refonte de layout** : on **habille**, on ne **redessine pas** les écrans (mêmes composants, mêmes structures).
- **Charte du Cockpit** (produit distinct).
- **Fonts self-hostées** (`.woff2` vendorisées) → itération 2 (Q-2).
- **Registre de chartes dans `@iakaframe/core`** → option notée, différée (Q-3).

---

## 5. Où vivent les thèmes, le registre, le sélecteur

```
src/
├─ themes/
│  ├─ cinabre.css          # vendorisé depuis iakacharte/design-cinabre/cinabre.css (:root + composants)
│  ├─ naonedge.css         # vendorisé (2e charte, mêmes variables, accent or)
│  └─ base.css             # règles structurelles NEUTRES de l'app (layout), indépendantes de la charte
├─ theme/
│  ├─ charteRegistry.ts    # registre MINIMAL : liste des chartes { id, label, default? }
│  └─ useCharte.ts         # hook : charte courante + setCharte + persistance + application data-theme
├─ components/
│  └─ CharteSelector.tsx   # <select> des chartes (dans SettingsView)
└─ styles.css              # → importe base.css + les thèmes ; applique via [data-theme="…"]
```

### 5.1 Mécanisme de commutation (data-theme + variables)
- Chaque feuille de charte expose son jeu de variables **scopé** : `:root[data-theme="cinabre"] { --bg-primary:…; … }`
  et `:root[data-theme="naonedge"] { … }` (adapter les `:root` vendorisés en sélecteurs `data-theme`). Défaut
  **Cinabre** si l'attribut est absent.
- `useCharte` pose `document.documentElement.dataset.theme = charteId`. **Commutation instantanée**, sans rechargement,
  **sans requête réseau** (tout est déjà bundlé).
- Les composants existants n'utilisent **que** des variables (`var(--bg-card)`, `var(--accent-ink)`…) → **aucun**
  hex en dur dans les composants (règle d'habillage).

### 5.2 Registre de chartes (front, MVP)
`charteRegistry.ts` = tableau `[{ id:"cinabre", label:"Cinabre", default:true }, { id:"naonedge", label:"NaonEdge" }]`.
**Reco** : **au front** pour le MVP (c'est une préoccupation d'UI de la forge). **Option notée** : remonter le concept
« charte » dans `@iakaframe/core` **plus tard**, si le Cockpit et la forge doivent partager le catalogue (question
laissée ouverte au cadrage vision — non tranchée ici, Q-3).

### 5.3 Persistance
Clé dédiée (ex. `forge_charte`) en localStorage / config non sensible (calque de la persistance P4) ; lue au boot
pour appliquer `data-theme` **avant** le premier rendu (éviter le flash de charte par défaut).

---

## 6. Ce qu'on réutilise

- **`cinabre.css` / `naonedge.css`** vendorisées (tokens + composants) — **pas de réécriture de charte**.
- **Les variables CSS** comme unique surface d'habillage (les composants P1–P4 pointent déjà, ou sont adaptés à
  pointer, sur `var(--…)`).
- **La persistance de préférence P4** (localStorage / config non sensible) — même mécanique.
- **`SettingsView`** existant — on y **ajoute** le `CharteSelector`, sans refonte.
- **CSP + façade uniques** — inchangées.

---

## 7. Critères d'acceptation (vérifiables)

P5 est **PASS** si **tous** les points sont vérifiés :

- **T-1 — Cinabre par défaut au démarrage.** Au boot (sans préférence enregistrée), l'UI est en **Cinabre** : fond de
  page **`#e8e8eb`**, cartes **`#ffffff`**, accent cinabre **`#bd2f27`** / encre **`#9e211a`** ; `data-theme="cinabre"`
  posé sur `<html>`. Vérifiable par inspection + test (valeur calculée des variables).
- **T-2 — Sélecteur ≥ 2 chartes, commute réellement.** `SettingsView` liste **au moins Cinabre + NaonEdge** ;
  choisir NaonEdge **change effectivement** les variables appliquées (accent or) **sans rechargement** ni requête
  réseau ; revenir à Cinabre restaure l'accent cinabre.
- **T-3 — Persistance.** La charte choisie est **persistée** (`forge_charte`) et **réappliquée** après fermeture/
  réouverture (ou reload) — pas de retour forcé à Cinabre si une préférence existe.
- **T-4 — CSP inchangée, zéro asset distant.** `tauri.conf.json` : CSP **non `null`**, **inchangée** (aucune origine
  ajoutée). `grep -RnE "https?://|cdn|fonts.googleapis|<link[^>]+href" src/` = **0** référence à un asset **distant**
  (les `@font-face`/imports sont locaux `'self'` ou absents). Aucune requête réseau au chargement (vérif onglet
  réseau en smoke).
- **T-5 — Un seul accent.** La charte appliquée respecte « **un seul accent** » (cinabre pour Cinabre) ; les couleurs
  sémantiques ne servent que d'**états** (pas de 2e accent décoratif) — revue.
- **T-6 — Aucun changement de logique métier.** Le **diff** se limite à : `src/themes/*`, `src/theme/*`,
  `src/styles.css`, `CharteSelector` + son branchement dans `SettingsView`, et le **remplacement d'éventuels hex en
  dur par des variables** dans les composants. **Aucune** modification de `useForgeTeams`/`useForgeDeploy`/adaptateurs/
  Rust. Vérifiable par revue de diff.
- **T-7 — Non-régression.** Les tests existants (P1–P4) restent **verts** ; `npm run typecheck` + `npm run lint` +
  `npm run test` + `npm run build` verts.
- **T-8 — Façade unique préservée.** `grep -Rn "invoke(" src/` hors `src/api/backend.ts` = **0** (P5 n'ajoute aucun
  I/O ; la persistance de charte passe par la mécanique existante).
- **T-9 — Smoke visuel (geste humain).** `npm run tauri dev` : l'UI s'ouvre **en Cinabre** ; le sélecteur commute
  visuellement Cinabre ↔ NaonEdge ; la préférence survit à un reload. *(Recette manuelle.)*
- **T-10 — Rôles jamais en noms de code** (libellés d'UI par rôle).

---

## 8. Dépendances, risque & questions d'arbitrage

**Dépendances**
- **P1–P4 livrés** (front avec `styles.css`, `SettingsView`, persistance de préférence).
- **Sources de charte in-repo** (`iakacharte/design-cinabre/*`, `iakaframe/design-naonedge/*`) — fait.

**Risque** — faible : habillage sans changement de logique. Deux vigilances : (a) **ne pas casser la CSP** (tout
embarqué, T-4) ; (b) **éviter les hex en dur** résiduels dans les composants (sinon la commutation de charte est
partielle) → revue T-5/T-6.

**Questions d'arbitrage (prose)**
- **Q-1 — Vendoriser la feuille entière vs extraire les tokens.** *Reco : **vendoriser** `cinabre.css`* (source de
  vérité, drop-in, zéro divergence). Alternative : n'extraire que le bloc `:root` + réécrire les composants app —
  plus léger mais **diverge** de la charte. → *Trancher.*
- **Q-2 — Fonts : fallback système (reco MVP) ou self-host `.woff2` ?** *Reco : **fallback système** au MVP*
  (CSP-safe, zéro poids, replis déjà dans la charte) ; self-host vendorisé = **itération 2** si le rendu système ne
  satisfait pas. → *Confirmer.*
- **Q-3 — Registre de chartes : front (reco MVP) ou `@iakaframe/core` ?** *Reco : **front au MVP*** (préoccupation
  d'UI de la forge) ; remonter dans le cœur **si** le Cockpit doit partager le catalogue (différé). → *Confirmer.*
- **Q-4 — Nombre de chartes au MVP.** *Reco : **2** (Cinabre défaut + NaonEdge)* — suffit à prouver la commutation.
  Ajouter d'autres chartes du réservoir (`iakagraph/theme` / `design-*`) = ultérieur. → *Confirmer.*
- **Q-5 — Périmètre du re-skin.** *Reco : habiller **tous** les écrans P1–P4 via variables* (cohérence) ; option
  minimale : n'habiller que le shell + Settings d'abord. → *Confirmer (reco : tout, c'est peu coûteux via variables).*

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5.

---

## 9. Phasage interne (un seul livrable P5)

| Étape | Contenu | Critères |
|---|---|---|
| **0. Sources** | note `chartes-<date>.md` (réutilisation in-repo) | (traçabilité) |
| **1. Vendorisation** | `src/themes/cinabre.css` + `naonedge.css` (`:root[data-theme]`) + `base.css` | T-4 |
| **2. Skin Cinabre** | composants pointent sur variables ; retrait des hex en dur ; défaut Cinabre | T-1, T-5, T-6 |
| **3. Sélecteur + persist** | `charteRegistry` + `useCharte` + `CharteSelector` dans Settings + persistance | T-2, T-3, T-8 |
| **4. Non-régression + smoke** | tests P1–P4 verts + build + recette visuelle | T-7, T-9, T-10 |

---

## 10. Journal de décision

- **2026-07-06** — Cadrage P5 (l'architecte-cadreur) : skin **Cinabre par défaut** de l'UI de la forge +
  **sélecteur de charte** (≥ 2 : Cinabre + NaonEdge) dans `SettingsView`, commutation `data-theme` + variables CSS,
  **persistée** (calque P4). **Contrainte CSP** tranchée : charte **vendorisée** dans `src/themes/` (bundlée par
  Vite, `'self'`), **fonts en fallback système** au MVP (CDN interdit ; replis déjà dans la charte ; self-host
  `.woff2` = itération 2). **Registre de chartes au front** au MVP (option cœur notée pour un partage forge↔cockpit
  ultérieur). Habillage **pur** : aucune logique métier ni layout modifiés (diff = thème + Settings). Invariants :
  CSP non-`null` inchangée, façade unique, « un seul accent » Cinabre, non-régression P1–P4. Arbitrages Q-1→Q-5.
