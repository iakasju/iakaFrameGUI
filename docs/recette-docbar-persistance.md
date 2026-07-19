# Recette manuelle — Persistance DISQUE des 5 gestes fichier de la DocBar

> **Gate humain non automatisable.** Ce protocole valide la persistance **fichier réelle**
> (écriture/lecture sur disque via le runtime **Tauri natif**) des 5 gestes de la DocBar :
> **New · Open · Save · Save As · Close**. Ces chemins d'I/O **n'existent que sous Tauri**
> (commandes Rust `library_*`) et sont **hors de portée** de la suite headless (Vitest mocke
> la façade `backend`). Le décideur (Stéphane) déroule ce document lui-même dans l'app packagée.
>
> Émetteur : Legolas (qualité). Récepteur : Stéphane (décideur). Réf. code vérifiée le 2026-07-19.

---

## 0. Ce que ce gate couvre — et ce qu'il ne re-teste pas

| Niveau | Couvert par | Portée |
|---|---|---|
| Logique du hook (dirty, garde, bascule Save→Save As, I1) | **Tests auto (Vitest)** — 47/47 verts | façade `backend` **mockée** en mémoire |
| I/O fichier Rust (`write_in`/`read_in`/`exists_in`, pathguard) | **Tests auto (Cargo)** — 41 tests unitaires | dossiers **temporaires**, hors app |
| **Persistance disque réelle bout-en-bout sous Tauri** | **CE PROTOCOLE MANUEL** | app packagée → `IAKAFRAME_HOME` réel → fs réel → interop CLI |

> Autrement dit : les tests auto prouvent que *chaque brique* est correcte isolément ;
> **seul ce gate manuel** prouve que l'app native, lancée pour de vrai, écrit et relit les
> bons octets aux bons chemins, et que la **CLI sœur** voit les mêmes fichiers.

---

## 1. Cartographie du code (chemins exacts — pour tracer un échec)

| Élément | Fichier | Détail |
|---|---|---|
| Barre de gestes (UI) | `src/forge/DocBar.tsx` | boutons New/Open/Save/Save As/Close, panneau Open, invite Save As, modale garde |
| Modèle de document | `src/forge/useForgeDocument.ts` | dirty tracking, bascule Save→Save As, garde, I1, slugify id |
| Intégrité référentielle I1 | `src/forge/refs.ts` | `makeTeamValidateRefs` / `makeMethodValidateRefs` |
| Façade backend (SEUL `invoke`) | `src/api/backend.ts` | `libraryWrite/Read/Exists/List`, `poolList/Present`, `setIakaframeHome` |
| I/O disque (Rust) | `src-tauri/src/library_store.rs` | `write_in` → `<home>/<collection>/<id>.md` (crée les dossiers) |
| Résolution de la racine | `src-tauri/src/paths.rs` | `resolve_iakaframe_home()` |
| Réglage racine persisté | `src-tauri/src/settings.rs` | `set_iakaframe_home` → `<workspace>/settings.json` clé `iakaframeHome` |
| Réglages (UI) | `src/components/SettingsRoot.tsx` | bouton « Choisir le dossier… » → `pickDirectory` → `setIakaframeHome` |
| Onglets → collections | `src/forge/ForgeShell.tsx` | Team→`teams`, Méthode→`methods`, Kit→`kits`, Workflow→`workflows` |

**Chemin d'écriture (source `library_store.rs::write_in`, l.122) :**
`<IAKAFRAME_HOME>/<collection>/<id>.md` — `write_in` crée l'arborescence au besoin ;
`library_write` **échoue** si la racine est introuvable
(`"racine bibliothèque introuvable — définir IAKAFRAME_HOME (Réglages)"`).

**Résolution de `IAKAFRAME_HOME` (source `paths.rs::resolve_iakaframe_home_with`, l.116), par priorité :**
1. **override persisté** GUI : clé `iakaframeHome` de `<workspace>/settings.json` ;
2. variable d'env **`IAKAFRAME_HOME`** ;
3. découverte auto `<chapeau>/iakaframe` **validée** par le double marqueur `library/` + `methods/` ;
4. sinon `None` (Save impossible — l'UI Réglages invite à définir la racine).

`<workspace>` = env `IAKAFRAMEGUI_WORKSPACE`, sinon `<chapeau>/iakaframegui-workspace`.
`<chapeau>` = env `IAKAFRAME_ROOT`, sinon `~/work`.
→ Par défaut sur cette machine : `settings.json` vit dans
`/Users/sjupin/work/iakaframegui-workspace/settings.json`.

> **Note de conception vérifiée** : l'override (priorités 1 et 2) est pris **verbatim**, SANS
> exiger le double marqueur (celui-ci ne concerne que la découverte auto, priorité 3). Un dossier
> **jetable vide** est donc un `IAKAFRAME_HOME` valide pour Save. Pour les tests I1 (T5), il faudra
> juste y créer un sous-dossier `library/`.

---

## 2. Prérequis

### 2.1 Toolchain (présent sur la machine de recette — vérifié)
- Node `v24.18.0`, `cargo` (`~/.cargo/bin/cargo`), `tauri-cli 2.11.4` (via `npm run tauri`), `jq` (`/usr/bin/jq`).

### 2.2 Lancer l'app en mode natif — commande EXACTE du repo

Le script npm est `"tauri": "tauri"` (`package.json` l.18). La conf (`src-tauri/tauri.conf.json`)
lance Vite via `beforeDevCommand: "npm run dev"` sur `devUrl: http://localhost:3030`
(port figé, `vite.config.ts` → `port: 3030, strictPort: true`).

**Option A — mode dev natif (recommandé pour la recette, fenêtre native + HMR front) :**
```bash
cd /Users/sjupin/work/iakaFrameGUI
npm run tauri dev
```

**Option B — application packagée (bundle « comme livré ») :**
```bash
cd /Users/sjupin/work/iakaFrameGUI
npm run tauri build
# puis lancer le bundle produit, ex. macOS :
open "src-tauri/target/release/bundle/macos/iakaFrameGUI.app"
```

> ⚠️ **Prérequis à confirmer au premier lancement (potentiellement BLOQUANT) :** le premier
> `npm run tauri dev` **ou** `build` déclenche une **compilation Rust complète** de `src-tauri`
> (plusieurs minutes). Ce protocole n'a **pas** exécuté ce build (hors périmètre headless). Si
> le build échoue, **STOP** : c'est un prérequis bloquant à remonter à Gimli avant toute recette
> — noter l'erreur `cargo`/`tauri` exacte. La chaîne d'outils requise est présente ; seul le
> build effectif reste à confirmer.

### 2.3 Définir un `IAKAFRAME_HOME` de test propre (dossier jetable)

**Créer le dossier jetable AVANT de lancer l'app :**
```bash
export IAKAHOME_TEST="$HOME/work/_recette-docbar-$(date +%s)"
mkdir -p "$IAKAHOME_TEST"
echo "$IAKAHOME_TEST"   # NOTER ce chemin — il sert dans toutes les vérifs disque
```

**Le régler dans l'app (UI Réglages → `SettingsRoot` → `setIakaframeHome`) :**
1. Lancer l'app (`npm run tauri dev`).
2. Ouvrir **Réglages** (section « Bibliothèque iakaframe »).
3. Cliquer **« Choisir le dossier… »** → sélectionner `$IAKAHOME_TEST` dans le dialogue natif.
4. Vérifier que la ligne **« Racine résolue : … »** affiche bien `$IAKAHOME_TEST`.

Cela écrit l'override dans `settings.json` :
```bash
cat "$HOME/work/iakaframegui-workspace/settings.json"
# attendu : {"iakaframeHome":"/Users/.../_recette-docbar-XX…"}
```

**Rendre la même racine visible par la CLI** (un GUI ne fixe pas l'env d'un autre process —
la ligne « Pour que le CLI voie la même racine » de l'UI le rappelle). Dans le shell où vous
lancerez les vérifs CLI :
```bash
export IAKAFRAME_HOME="$IAKAHOME_TEST"
```

### 2.4 Rendre la CLI sœur `iakaframe` utilisable — **prérequis bloquant partiel**

> **Constat vérifié :** `iakaframe` **n'est PAS sur le PATH** de cette machine (`which iakaframe`
> → introuvable). Les vérifs d'interop CLI (byte-parité T1) **ne fonctionneront pas** avec la
> commande nue `iakaframe`. **Repli obligatoire** : invoquer la CLI par Node depuis le dépôt
> `iakaframe` voisin. On fige un alias de recette :

```bash
# Repli Node (le dépôt CLI sœur est /Users/sjupin/work/iakaframe) :
iaka() { node /Users/sjupin/work/iakaframe/cli/src/index.js "$@"; }
# Vérifier que la CLI répond :
iaka show --help 2>/dev/null || echo "CLI KO — vérifier le chemin du dépôt iakaframe"
```

Toutes les commandes `iaka …` de ce document utilisent ce repli. Si `iakaframe` est un jour
installé sur le PATH, remplacer `iaka` par `iakaframe`.

---

## 3. Protocole de test (T1 → T5 + cas limites)

> Convention : **onglet Team** = collection `teams` sauf mention contraire. Après chaque Save,
> l'UI affiche `enregistré dans <collection>/<id>.md` (source `DocBar.tsx` l.80-82).
> Chaque test indique **résultat attendu (UI)** ET **vérification disque (shell)**.

---

### T1 — Save / Save As écrit `<home>/<collection>/<id>.md` (byte-parité CLI)

**Couvre le point 1.** Le geste Save (doc déjà nommé) et Save As (doc neuf) matérialisent
réellement le fichier, lisible à l'identique par la CLI sœur.

**Préconditions :** `IAKAFRAME_HOME` réglé sur `$IAKAHOME_TEST` (§2.3), collection `teams` vide.

**Étapes UI :**
1. Onglet **Team**. Un artefact vierge est déjà semé (« Team iakaframe »).
2. Cliquer **Save As** → l'invite « Enregistrer sous » s'ouvre.
3. Saisir **id** = `recette-t1` , **nom** = `Recette T1`.
4. Cliquer **Enregistrer**.

**Résultat attendu (UI) :** l'invite se ferme ; bandeau vert **« enregistré dans teams/recette-t1.md »**.

**Vérification disque :**
```bash
ls -l "$IAKAHOME_TEST/teams/recette-t1.md"          # le fichier existe
cat "$IAKAHOME_TEST/teams/recette-t1.md"            # frontmatter + corps '# Recette T1'
# Interop CLI (byte-parité de résolution) :
iaka show recette-t1 --root "$IAKAHOME_TEST" --json | jq -r '.path'   # == $IAKAHOME_TEST/teams/recette-t1.md
iaka show recette-t1 --root "$IAKAHOME_TEST" --json | jq -r '.data.id'  # == recette-t1
```
> **Note byte-parité :** `iakaframe show <id>` **sans** `--json` **reformate** le frontmatter
> (tableau aligné + corps) — il n'est **pas** octet-pour-octet identique au fichier, c'est normal.
> La preuve de parité recherchée est : (a) `cat` montre exactement ce que le GUI a sérialisé, et
> (b) `show --json` **résout le même fichier** (`.path` pointe sur le fichier écrit par le GUI) et
> le **reparse sans perte** (`.data.id` = id, `.body` = corps). C'est l'interop GUI↔CLI qui est le
> critère, pas un `diff` contre une sortie reformatée.

**Second temps — Save (ré-écriture sur doc déjà nommé) :**
5. Modifier le nom dans le titre éditable (ex. « Recette T1 bis ») → l'artefact passe `dirty`.
6. Cliquer **Save** (bouton bleu, PAS Save As).

**Attendu (UI) :** bandeau **« enregistré dans teams/recette-t1.md »** (même id, pas de bascule Save As).
**Vérif disque :**
```bash
grep -i "Recette T1 bis\|recette-t1" "$IAKAHOME_TEST/teams/recette-t1.md"
```

---

### T2 — Open charge un `.md` réel (contenu dans l'atelier + titre reflété)

**Couvre le point 2.**

**Préconditions :** T1 exécuté (`teams/recette-t1.md` existe sur disque).

**Étapes UI :**
1. Onglet **Team** → cliquer **New** (repart d'un vierge, pour prouver qu'Open remplace bien).
2. Cliquer **Open** → le panneau liste les artefacts scannés de `teams/`.
3. Vérifier que **`recette-t1`** apparaît dans la liste (id + nom).
4. Cliquer la ligne **`recette-t1`**.

**Résultat attendu (UI) :** l'atelier affiche l'artefact chargé ; le **titre** reflète le nom
enregistré ; l'état n'est **pas** `dirty` (rien à sauver).

**Vérification disque :** (le contenu affiché doit correspondre au fichier)
```bash
cat "$IAKAHOME_TEST/teams/recette-t1.md"   # comparer visuellement au titre/contenu affiché
```

---

### T3 — Save As non-destructif : refus réel sur un id existant (fs réel + `libraryExists`)

**Couvre le point 3.** Source : `useForgeDocument.ts` l.246-256 (`api.libraryExists` → refus si
`exists && targetId !== id courant`).

**Préconditions :** `teams/recette-t1.md` existe (T1). Un document est ouvert dans l'onglet Team.

**Étapes UI :**
1. Onglet **Team** → **New** (nouveau doc neuf, id courant = aucun).
2. **Save As** → id = **`recette-t1`** (id DÉJÀ pris), nom = `Collision`.
3. Cliquer **Enregistrer**.

**Résultat attendu (UI) :** bandeau **rouge** `existe déjà : recette-t1 (choisir un autre id)` ;
l'invite Save As **reste ouverte** ; **aucune écriture**.

**Vérification disque (le fichier d'origine n'est pas altéré) :**
```bash
# empreinte avant/après identique : l'écriture a bien été refusée
shasum "$IAKAHOME_TEST/teams/recette-t1.md"
# doit rester ce qu'il était après T1 (aucune trace de 'Collision')
grep -c "Collision" "$IAKAHOME_TEST/teams/recette-t1.md"   # attendu : 0
```

---

### T4 — « Repart à zéro » résolu : Save d'une Méthode → relancer l'app → Open → contenu identique

**Couvre le point 4** (la persistance qui manquait à Méthode/Kit).

**Préconditions :** `IAKAFRAME_HOME` = `$IAKAHOME_TEST` (persisté dans `settings.json`, donc
retenu au relancement).

**Étapes UI (session 1) :**
1. Onglet **Méthode**.
2. Renommer le titre (ex. « Méthode Recette T4 ») → `dirty`.
3. **Save As** → id = `recette-t4`, nom = `Méthode Recette T4` → **Enregistrer**.
4. Attendu : **« enregistré dans methods/recette-t4.md »**.

**Vérification disque immédiate :**
```bash
cat "$IAKAHOME_TEST/methods/recette-t4.md"
shasum "$IAKAHOME_TEST/methods/recette-t4.md"   # NOTER l'empreinte (E1)
```

**Étapes UI (session 2 — preuve anti « repart à zéro ») :**
5. **Fermer complètement l'app** puis la **relancer** (`npm run tauri dev` à nouveau, ou rouvrir
   le bundle). Ne PAS retoucher les Réglages (l'override est persisté).
6. Onglet **Méthode** → **Open** → cliquer **`recette-t4`**.

**Résultat attendu (UI) :** l'artefact se recharge **identique** (titre + contenu) — aucune perte.

**Vérification disque (le fichier n'a pas bougé entre les sessions) :**
```bash
shasum "$IAKAHOME_TEST/methods/recette-t4.md"   # doit ÉGALER l'empreinte E1
```

---

### T5 — I1 (intégrité référentielle) sur Save avec un pool `library/` réel : refus + rapport des ids manquants

**Couvre le point 5.** Source : `refs.ts` (`makeTeamValidateRefs`) + `useForgeDocument.ts`
l.188-204 (pool présent + réf cassée → `ok:false` → **refus SANS écrire** + `lastError`).

**Préconditions — matérialiser un pool réel MAIS incomplet :**
```bash
# Un pool 'library/' présent (=> I1 s'active, non-warning) mais SANS le persona référencé
mkdir -p "$IAKAHOME_TEST/library/personas"
printf -- '---\nid: odin\n---\n' > "$IAKAHOME_TEST/library/personas/odin.md"
# On NE crée PAS les autres personas du roster iakaframe (ex. aragorn, gandalf, gimli...)
ls "$IAKAHOME_TEST/library/personas"    # doit ne contenir QUE odin.md
```

**Étapes UI :**
1. Onglet **Team** → **New** (l'artefact vierge « Team iakaframe » référence tout le roster :
   personas `aragorn`, `gandalf`, `gimli`, `legolas`, … + `coordinator`).
2. **Save As** → id = `recette-t5`, nom = `Recette T5` → **Enregistrer**.

**Résultat attendu (UI) :** bandeau **rouge** `références cassées : personas → aragorn (personas),
personas → gandalf (personas), …` (liste les ids **absents** du pool) ; **aucun fichier écrit**.

**Vérification disque (refus réel) :**
```bash
ls "$IAKAHOME_TEST/teams/recette-t5.md" 2>/dev/null && echo "KO: écrit à tort" || echo "OK: non écrit"
```

**Contre-épreuve (pool complété → Save passe) — optionnel mais probant :**
```bash
# Compléter le pool avec tous les personas manquants listés par l'erreur, ex. :
for p in aragorn gandalf gimli legolas helm loki nathalie; do
  printf -- '---\nid: %s\n---\n' "$p" > "$IAKAHOME_TEST/library/personas/$p.md"
done
```
3. Re-cliquer **Save** (ou Save As même id) dans l'UI.
**Attendu :** cette fois **« enregistré dans teams/recette-t5.md »**.
```bash
ls -l "$IAKAHOME_TEST/teams/recette-t5.md"   # présent
```

> **Rappel comportement (Q-4, `refs.ts` l.63) :** si le pool `library/` est **absent**, I1 n'est
> **pas** bloquant → Save autorisé avec un **warning** jaune. T5 exige donc un pool `library/`
> **présent** pour éprouver le **refus**.

---

## 4. Cas limites (à dérouler après T1–T5)

### L1 — Save sur un doc NEUF doit passer par Save As
Source : `useForgeDocument.ts` l.227-232 (id absent → `requiresSaveAs`, ouvre l'invite).
1. Onglet Kit → **New**. 2. Cliquer **Save** (pas Save As).
**Attendu :** l'invite **« Enregistrer sous »** s'ouvre automatiquement ; aucune écriture tant
qu'on n'a pas validé un id.
```bash
ls "$IAKAHOME_TEST/kits/" 2>/dev/null   # rien de nouveau tant que Save As non validé
```

### L2 — Save As collision (refus non-destructif) — cf. T3
Déjà couvert par T3 (id existant → refus). À rejouer sur l'onglet Kit ou Méthode pour confirmer
la généricité (le hook est partagé par les 4 onglets).

### L3 — Close sur doc modifié : garde « dirty », pas de perte
Source : `DocBar.tsx` l.147-174 (modale garde) + `useForgeDocument.ts` `runOrGuard`.
1. Ouvrir/charger un doc, le modifier (titre) → `dirty`.
2. Cliquer **Close**.
**Attendu :** la modale **« Modifications non sauvées »** s'ouvre (Sauvegarder / Abandonner / Annuler).
   - **Annuler** → le doc et ses modifs restent (aucune perte, rien écrit).
   - **Sauvegarder** → écrit puis ferme (vérifier le `.md` mis à jour sur disque).
   - **Abandonner** → ferme sans écrire (le `.md` disque garde sa version précédente).
```bash
# après 'Abandonner' sur une modif : le fichier disque n'a PAS la modif abandonnée
cat "$IAKAHOME_TEST/<collection>/<id>.md"
```

### L4 — Open d'un id inexistant (chemin défensif)
Source : `useForgeDocument.ts` l.282-284 (`text == null` → `introuvable : <id>`).
> Le panneau Open ne liste que des artefacts **scannés** (existants) : l'UI seule n'offre pas de
> saisie libre d'id. Pour éprouver ce garde, provoquer la course :
1. Onglet Team → **Open** (le panneau liste `recette-t1`).
2. **Sans fermer le panneau**, supprimer le fichier sur disque :
```bash
rm "$IAKAHOME_TEST/teams/recette-t1.md"
```
3. Cliquer la ligne **`recette-t1`** (désormais fantôme).
**Attendu :** bandeau **rouge** `introuvable : recette-t1` ; l'atelier ne charge rien de corrompu.

---

## 5. Matrice de recette (à cocher)

| # | Test | Résultat attendu (UI + disque) | OK | KO | Notes |
|---|------|--------------------------------|----|----|-------|
| Pré | Build natif (`npm run tauri dev`/`build`) | app native s'ouvre (sinon BLOQUANT) | ☐ | ☐ | |
| Pré | Racine réglée (Réglages → dossier jetable) | « Racine résolue : $IAKAHOME_TEST » + settings.json | ☐ | ☐ | |
| Pré | CLI sœur joignable (`iaka show --help`) | répond (repli node) | ☐ | ☐ | `iakaframe` absent du PATH |
| T1 | Save As Team → écrit + byte-parité CLI | bandeau vert `teams/recette-t1.md` ; `show --json .path` OK | ☐ | ☐ | |
| T1b | Save (ré-écriture même id) | `teams/recette-t1.md`, pas de bascule Save As | ☐ | ☐ | |
| T2 | Open charge le `.md` réel | contenu + titre reflétés, non dirty | ☐ | ☐ | |
| T3 | Save As id existant refusé | rouge `existe déjà` ; fichier inchangé (shasum) | ☐ | ☐ | |
| T4 | Méthode : Save → relance app → Open identique | shasum inchangé entre 2 sessions | ☐ | ☐ | anti « repart à zéro » |
| T5 | I1 pool réel incomplet → refus + ids | rouge `références cassées : …` ; **non écrit** | ☐ | ☐ | |
| T5b | Pool complété → Save passe | vert `teams/recette-t5.md` | ☐ | ☐ | contre-épreuve |
| L1 | Save doc neuf → bascule Save As | invite s'ouvre, rien écrit | ☐ | ☐ | |
| L2 | Save As collision (autre onglet) | refus non-destructif | ☐ | ☐ | |
| L3 | Close doc dirty → garde | modale ; Annuler/Abandonner ne perdent rien | ☐ | ☐ | |
| L4 | Open id inexistant | rouge `introuvable : <id>` | ☐ | ☐ | course fs |

---

## 6. Verdict

- **PASS** si toutes les lignes T1–T5 + L1–L4 sont **OK** (les prérequis inclus).
- **FAIL** dès qu'une ligne est **KO** : noter le test, le message UI exact, l'état disque
  observé et le fichier/ligne source suspect (§1) → retour à Gimli.

**Nettoyage post-recette :**
```bash
rm -rf "$IAKAHOME_TEST"
# Réinitialiser la racine dans l'app : Réglages → « Réinitialiser (auto) »
# (retire l'override iakaframeHome de settings.json)
```

---

### Rappel de périmètre
Ce document **ne teste pas** la logique déjà verte en auto (hook, garde, I1 mockée, I/O Rust sur
tmp). Il **isole** la seule chose que le headless ne peut pas prouver : **la persistance disque
réelle sous Tauri natif** et l'**interopérabilité avec la CLI sœur** sur un `IAKAFRAME_HOME` réel.
