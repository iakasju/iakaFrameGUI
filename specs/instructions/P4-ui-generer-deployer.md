# Instruction P4 — UI « Générer & Déployer » : le chaînon authoring → production (MVP)

> **Phase** : P4 — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : CADRÉ — À VALIDER par le décideur** (jalon humain) avant tout code.
> **Date** : 2026-07-06. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **Fondations** : `specs/instructions/P1-coquille-forge-authoring.md` (authoring : `useForgeTeams`,
> `PersonaEditor`/`TeamComposer`/vues, **façade unique** `src/api/backend.ts`, CSP stricte),
> `specs/instructions/P3-adaptateur-runner-generation-deploiement.md` (générateur pur + `RunnerAdapter` +
> **`kitDeploy`/`kit_deploy`** non destructif + pathguard), `specs/instructions/P3b-adaptateurs-codex-ollama.md`
> (4 nœuds `implemented:true`), `specs/instructions/P2-coeur-partage-refactor-cli.md` (`NodeKind`).

---

## 1. Objectif

Livrer le **chaînon UI manquant** : relier, **dans la fenêtre de la forge**, l'**authoring de teams** (P1) au
**backend de génération/déploiement** (P3 Claude Code + P3b codex/ollama, gates PASS). L'utilisateur doit pouvoir,
sans quitter l'app :

1. **choisir une team** (déjà authorée/persistée) ;
2. **choisir un nœud cible** (`claude` / `codex` / `ollama-localhost` / `ollama-lan`) ;
3. **Générer** → **voir l'arborescence du kit** produit (`KitFileTree`), **sans écrire sur disque** ;
4. **Déployer** → choisir un **dossier destination** → écriture disque **non destructive** (option écraser).

P4 est de la **tuyauterie UI** : on **câble** l'existant, on n'ajoute **aucune capacité backend** (sauf,
éventuellement, un dialog de dossier — à justifier, § 7).

---

## 2. Périmètre — IN / OUT

### 2.1 DANS le périmètre P4 (MVP)

1. **Sélecteur de nœud** : les **4 nœuds implémentés** listés via **`implementedNodes()`** du registre (jamais une
   liste en dur) ; pour **`ollama-lan`**, un champ **host** paramétrable (cf. Q-5 de P3b).
2. **Action « Générer »** : appelle **l'adaptateur du registre** (`RunnerAdapter.generate(team)`) → affiche le
   **`KitFileTree`** (liste des chemins + **aperçu du contenu** d'un fichier sélectionné) — **aucune I/O disque**.
3. **Action « Déployer »** : choisir un **dossier destination** (dialog natif Tauri **ou** champ de chemin +
   validation — § 5/Q-1), appeler **`kitDeploy`** (façade), avec option **écraser** (`force`) et un **retour clair**
   succès / conflit (non destructif).
4. **Façade unique préservée** : tout I/O via `src/api/backend.ts` ; **aucun `invoke(`** ailleurs (invariant P1).
   **CSP stricte** conservée (jamais `null`, aucune origine distante).

### 2.2 HORS périmètre P4 (différés)

- **Open WebUI** (adaptateur Models JSON) → **P3c**.
- **Workflows** → différés.
- **Édition du contenu** des skills / gardes (corps `SKILL.md`, prose de garde) → différé.
- **Liaison runner + modèle** → **Cockpit** (run-time, hors forge).
- **Skin Cinabre / sélecteur de charte** → **todo séparé** (P4 = câblage fonctionnel, pas d'habillage de marque).
- **Toute nouvelle capacité backend** : P4 **ne bouge pas** le backend — **exception unique possible** : le
  **dialog de dossier** (plugin Tauri `dialog`), à trancher (§ 7, Q-1). Le `kit_deploy`/`generate` restent
  **inchangés**.

---

## 3. Le flux UI (écrans / composants)

### 3.1 Nouvel écran « Générer & Déployer » (vue `DeployView`)

```
 ┌─ Générer & Déployer ─────────────────────────────────────────────┐
 │ Team :   [ ▼ sélecteur de team ]         (source : useForgeTeams) │
 │ Nœud :   [ ▼ claude | codex | ollama-localhost | ollama-lan ]     │
 │          (source : implementedNodes())                           │
 │          └─ si ollama-lan → Host : [ ______________ ]            │
 │                                                                   │
 │   [ Générer ]                                                     │
 │                                                                   │
 │ ┌ Kit généré (KitFileTree) ───────────────┬ Aperçu ────────────┐ │
 │ │ .claude/agents/aragorn.md               │ (contenu du       │ │
 │ │ .claude/agents/gandalf.md               │  fichier          │ │
 │ │ .claude/skills/iakaframe-cadrage/…      │  sélectionné,     │ │
 │ │ CLAUDE.md                               │  lecture seule)   │ │
 │ │ .claude/settings.json                   │                   │ │
 │ └─────────────────────────────────────────┴───────────────────┘ │
 │                                                                   │
 │ Destination : [ /chemin/vers/projet ] [ Parcourir… ]  □ Écraser  │
 │   [ Déployer ]        → Résultat : ✓ 6 fichiers écrits / ⚠ conflit│
 └───────────────────────────────────────────────────────────────────┘
```

### 3.2 Composants
- **`NodeSelector`** *(nouveau)* : `<select>` peuplé par `implementedNodes()` (libellés lisibles) ; révèle le champ
  **host** si `ollama-lan`.
- **`KitTreeView`** *(nouveau)* : liste des chemins du `KitFileTree` (triée) + panneau **aperçu** (contenu du
  fichier sélectionné, lecture seule). **Aucune écriture.**
- **`DeployPanel`** *(nouveau)* : champ destination + bouton **Parcourir…** (dialog ou saisie, § 5) + case
  **Écraser** (`force`) + bouton **Déployer** + **zone de résultat** (succès : N fichiers écrits ; conflit :
  liste des fichiers non écrasés ; erreur : message).
- **`DeployView`** *(nouveau)* : assemble le tout ; **présentationnelle** ; toute logique dans le hook (§ 4).
- **Navigation** : ajouter l'entrée **« Générer & Déployer »** au shell P1 (à côté de Personas / Teams / Réglages).

### 3.3 États & garde-fous d'UX
- **Générer** désactivé tant qu'une team + un nœud ne sont pas choisis (et host non vide si `ollama-lan`).
- **Déployer** désactivé tant qu'un kit n'a pas été généré **et** qu'une destination n'est pas saisie.
- Régénérer après changement de team/nœud **invalide** le kit affiché (évite de déployer un kit périmé).
- Retour de déploiement **explicite** : jamais de succès silencieux ni d'échec muet.

---

## 4. Où vit l'état UI (décision)

**Reco : un nouveau hook `useForgeDeploy`** (séparé de `useForgeTeams`), autorité du flux génération/déploiement :

```ts
interface UseForgeDeploy {
  selectedTeamId: string | null;
  node: NodeKind | null;
  lanHost: string;                     // utilisé seulement si node === "ollama-lan"
  kit: KitFileTree | null;             // résultat de Générer (null tant que pas généré)
  selectedPath: string | null;         // fichier dont on montre l'aperçu
  destDir: string;
  force: boolean;
  result: DeployResult | null;         // { written: string[], skipped: string[], error? }
  // actions
  selectTeam(id): void; selectNode(n): void; setLanHost(h): void;
  generate(): void;                    // registre.adapter(node).generate(team) → kit (PUR, pas d'I/O)
  selectPreview(path): void;
  setDestDir(d): void; setForce(f): void;
  deploy(): Promise<void>;             // via façade kitDeploy(destDir, kit.files, { force })
}
```

**Justification** : `useForgeTeams` reste l'autorité **authoring** (single-responsibility) ; le flux
génération/déploiement est un **concern distinct** (pas de god-hook). `useForgeDeploy` **consomme** `useForgeTeams`
(liste des teams) en lecture. *(Alternative « étendre `useForgeTeams` » = Q-3, non retenue par défaut.)*

**Persistance du dernier choix** *(Q-4)* : reco **oui, léger** — mémoriser `node`/`destDir`/`lanHost` récents via
la persistance existante (config non sensible), pour ne pas re-saisir à chaque session. Non bloquant si différé.

---

## 5. Sélection du dossier destination — reco

**Deux options :**
- **(a) Plugin Tauri `dialog`** : bouton **Parcourir…** ouvre le sélecteur natif de dossier. *Pour* : UX propre,
  chemins valides. *Contre* : **ajoute une dépendance** (`@tauri-apps/plugin-dialog`, déjà présent côté Cockpit
  `package.json`) **+ une permission** + une entrée façade.
- **(b) Champ de chemin texte + validation Rust** : l'utilisateur saisit/colle un chemin ; validation côté Rust
  (existe ? dossier ? dans un périmètre autorisé ?). *Pour* : **zéro dépendance nouvelle**. *Contre* : UX plus
  fruste, erreurs de saisie.

**Reco : (a) le plugin `dialog`** — le Cockpit l'utilise **déjà** (`@tauri-apps/plugin-dialog` dans son
`package.json`), donc **réutilisation de l'existant** et cohérence inter-produits ; l'ajout est mince et la façade
l'encapsule. **Repli acceptable** : si l'ajout de permission est jugé indésirable au MVP, **(b)** avec validation
`kit_deploy` (qui **valide déjà** le chemin via pathguard) suffit. → **À trancher (Q-1).**

> Dans les deux cas, **`kit_deploy` reste l'autorité** de l'écriture non destructive + pathguard : le dialog ne
> fait que **fournir un chemin**, il ne contourne aucune garde.

---

## 6. Ce qu'on réutilise (ne rien réécrire)

| Réutilisé | Source | Usage P4 |
|---|---|---|
| **Registre d'adaptateurs** + `generate` | `@iakaframe/core/src/adapters/` | `Générer` appelle `registry.get(node).generate(team)` (pur). |
| **`implementedNodes()`** | `@iakaframe/core` (registre) | peuple le `NodeSelector` (jamais de liste en dur). |
| **`kitDeploy`** (façade) + `kit_deploy` (Rust) | `src/api/backend.ts` + `src-tauri/…` | `Déployer` ; **inchangés** (non destructif + pathguard). |
| **`useForgeTeams`** | P1 | source des teams sélectionnables. |
| **Façade unique / CSP / shell nav** | P1 | invariants d'archi conservés. |
| **`NodeKind` / host lan** | P2 / P3b (Q-5) | typage du sélecteur + champ host. |

---

## 7. Fichiers à créer / modifier

**Front (l'essentiel)**
- `src/hooks/useForgeDeploy.ts` *(nouveau)* — autorité du flux (état + `generate`/`deploy`).
- `src/components/NodeSelector.tsx` *(nouveau)* — sélecteur de nœud (via `implementedNodes()`) + champ host lan.
- `src/components/KitTreeView.tsx` *(nouveau)* — liste `KitFileTree` + aperçu.
- `src/components/DeployPanel.tsx` *(nouveau)* — destination + Parcourir + force + Déployer + résultat.
- `src/views/DeployView.tsx` *(nouveau)* — assemble ; présentationnelle.
- `src/App.tsx` — ajoute l'entrée de navigation « Générer & Déployer ».
- `src/api/backend.ts` — **si option (a) dialog** : ajoute une méthode `pickDirectory()` encapsulant le plugin
  (sinon inchangé). **`kitDeploy` déjà présent (P3).**

**Rust (seulement si nécessaire)**
- **Aucun changement** si option (b). **Si (a)** : enregistrer le plugin `dialog` + permission dans
  `tauri.conf.json`/capabilities. **`kit_deploy` INCHANGÉ** dans les deux cas.

**Tests**
- `src/__tests__/useForgeDeploy.test.ts` *(nouveau)* — `generate` produit le kit sans I/O ; `deploy` appelle la
  façade avec `{destDir, files, force}` ; invalidation du kit au changement de team/nœud.
- `src/__tests__/DeployView.test.tsx` *(nouveau)* — 4 nœuds sélectionnables ; Générer affiche l'arbre ; Déployer
  déclenche la façade ; états désactivés.

---

## 8. Critères d'acceptation (vérifiables)

P4 est **PASS** si **tous** les points sont vérifiés :

- **U-1 — 4 nœuds sélectionnables.** Le `NodeSelector` liste exactement les nœuds de `implementedNodes()`
  (`claude`, `codex`, `ollama-localhost`, `ollama-lan`) ; **`ollama-lan`** révèle le champ **host**.
- **U-2 — Générer sans écrire sur disque.** Sélectionner une team + un nœud + **Générer** affiche le `KitFileTree`
  **attendu** (chemins conformes à l'adaptateur du nœud) ; **aucune I/O disque** (test : `generate` n'appelle
  jamais `kitDeploy`/`invoke` ; espion façade = 0 appel d'écriture).
- **U-3 — Aperçu.** Sélectionner un fichier de l'arbre affiche **son contenu** en lecture seule (ex. le frontmatter
  d'un `.claude/agents/*.md` pour `claude`, ou `AGENTS.md` pour codex/ollama).
- **U-4 — Déployer écrit le kit.** Choisir un dossier + **Déployer** appelle `kitDeploy(destDir, kit.files, {force})`
  et écrit l'arborescence ; **retour succès** = liste des fichiers écrits.
- **U-5 — Non destructif sans `force`.** Un fichier existant **n'est pas écrasé** sans `force` → retour **conflit**
  (fichiers `skipped` listés) ; **avec `force`** coché, il est écrasé. (Comportement porté par `kit_deploy` P3 —
  P4 le **surface**, ne le réimplémente pas.)
- **U-6 — Façade unique préservée.** `grep -Rn "invoke(" src/` **hors** `src/api/backend.ts` = **0**.
- **U-7 — CSP stricte.** `tauri.conf.json` : CSP **non `null`**, aucune origine distante ajoutée par P4 (si plugin
  `dialog` : seule la permission dossier est ajoutée, documentée).
- **U-8 — Kit invalidé au changement.** Changer de team ou de nœud **après** Générer **efface** le kit affiché
  (on ne peut pas déployer un kit périmé).
- **U-9 — Tests + build verts.** `npm run typecheck` + `npm run lint` + `npm run test` (dont `useForgeDeploy` /
  `DeployView`) verts ; `npm run build` (+ `cargo build` si Rust touché) réussit.
- **U-10 — Smoke visuel (geste humain).** `npm run tauri dev` : la fenêtre s'ouvre, l'écran « Générer & Déployer »
  s'affiche, un cycle team→nœud→Générer→Déployer (dossier tmp) fonctionne de bout en bout. *(Recette manuelle.)*
- **U-11 — Rôles jamais en noms de code** (libellés d'UI par rôle ; les noms de personas restent des **données**).

---

## 9. Dépendances, risque & questions d'arbitrage

**Dépendances**
- **P1** (authoring + façade), **P3** (`kitDeploy`/`kit_deploy` + générateur pur), **P3b** (registre 4 nœuds) —
  livrés, gates PASS.
- **Option (a)** : `@tauri-apps/plugin-dialog` (déjà utilisé par le Cockpit → réutilisation).

**Risque** — faible : P4 câble de l'existant, n'ajoute aucune capacité backend (hors dialog optionnel). Le seul
point de vigilance est de **ne pas contourner `kit_deploy`** (toute écriture passe par lui) et de **préserver la
façade unique**.

**Questions d'arbitrage (prose)**
- **Q-1 — Dialog de dossier : plugin `dialog` (a) ou champ texte + validation (b) ?** *Reco : **(a)**, réutilisé du
  Cockpit* (UX propre, ajout mince encapsulé par la façade). Repli **(b)** si l'on veut **zéro permission
  nouvelle** au MVP (pathguard `kit_deploy` valide déjà le chemin). → *Trancher.*
- **Q-2 — Aperçu du kit : liste seule ou liste + contenu ?** *Reco : **liste + contenu*** (l'aperçu rassure avant
  d'écrire, coût faible). Option minimaliste : liste seule pour un premier jet. → *Confirmer.*
- **Q-3 — État UI : `useForgeDeploy` dédié ou étendre `useForgeTeams` ?** *Reco : **hook dédié*** (single-
  responsibility, pas de god-hook). → *Confirmer.*
- **Q-4 — Persister le dernier nœud/dossier/host choisi ?** *Reco : **oui, léger*** (config non sensible), pour le
  confort ; différable sans risque. → *Confirmer.*
- **Q-5 — Emplacement de l'écran.** Onglet dédié « Générer & Déployer » (reco) ou action **depuis** l'écran Teams
  (bouton « Déployer cette team… ») ? *Reco : onglet dédié + éventuel raccourci depuis Teams plus tard.* →
  *Confirmer.*

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5.

---

## 10. Phasage interne (un seul livrable P4)

| Étape | Contenu | Critères |
|---|---|---|
| **1. Sélecteurs** | `NodeSelector` (via `implementedNodes()`) + host lan + choix team | U-1 |
| **2. Générer** | `useForgeDeploy.generate` + `KitTreeView` (liste + aperçu) | U-2, U-3, U-8 |
| **3. Déployer** | `DeployPanel` + dialog/champ (Q-1) + `kitDeploy` + retour | U-4, U-5, U-7 |
| **4. Intégration** | `DeployView` + nav + façade unique + persistance (Q-4) | U-6, U-9 |
| **5. Recette** | smoke `tauri dev` bout-en-bout | U-10, U-11 |

---

## 11. Journal de décision

- **2026-07-06** — Cadrage P4 (l'architecte-cadreur) : **chaînon UI** authoring→génération→déploiement dans la
  forge. Écran « Générer & Déployer » : sélecteur de team + **sélecteur de nœud (`implementedNodes()`, 4 nœuds,
  host lan)** + **Générer** (affiche `KitFileTree`, **zéro I/O**) + **Déployer** (dialog dossier + `kitDeploy`,
  **non destructif**, option `force`). **Réutilise** registre d'adaptateurs, `kitDeploy`/`kit_deploy` (inchangés),
  `useForgeTeams`, façade unique, CSP stricte. État dans un **hook dédié `useForgeDeploy`**. Reco dialog dossier :
  **plugin `dialog`** (réutilisé du Cockpit), repli champ texte + pathguard. Backend **inchangé** (sauf permission
  dialog si option a). Arbitrages Q-1→Q-5.
