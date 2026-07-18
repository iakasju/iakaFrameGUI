# Instruction — Aligner le modèle `Binding` du cœur GUI sur le format frame (`assignments` + `methodId`)

> Cadrage : Gandalf (P1). Rôle : `iakaframe-cadrage`. Cible d'exécution : Gimli.
> Réf. audit : A9.1 / recoupe open-frame É3 (divergence des modèles de binding).
> État : **PRÊT POUR IMPLÉMENTATION** — 2 micro-arbitrages tranchés par défaut (reco), à
> confirmer au jalon (§ 9).

---

## 1. Problème (avant la solution)

Il existe **deux modèles de binding** dans `@iakaframe/core`, incompatibles au niveau du schéma :

| | **Modèle A — `Binding`** (`binding.ts`) | **Modèle B — `BindingMd`** (`frontmatter.ts`) |
|---|---|---|
| Support | JSON (`binding.json`, déploiement) | `.md` frontmatter (fichier de frame) |
| Liaisons | clé **`bindings`** : `PersonaBinding[]` | clé **`assignments`** : `BindingAssignmentMd[]` |
| `methodId` | **absent** | **présent** (requis) |
| `node` | `NodeKind` (strict, invalide → `null`) | `string` (tolérant, défaut `"claude"`) |
| `origin` | `BindingOrigin` (union) | `string` (défaut `"forge-default"`) |
| `runner` | `RunnerKind` (validé, invalide → liaison jetée) | `string` (tolérant) |
| Rôle | option de génération de kit (P7) + artefact déployé | assemblage de frame (open-frame, portfolio) |

Le **format RÉEL** d'un binding de frame est celui du Modèle B — vérifié sur
`/Users/sjupin/work/iakaframe/frames/releases/StefFrame2/bindings/iakaframe-claude-default.md` :

```yaml
---
id: iakaframe-claude-default
methodId: iakaframe
teamId: iakaframe-8
node: claude
origin: forge-default
assignments:
  - { personaId: odin,     runner: claude-code, model: "opus" }
  - { personaId: aragorn,  runner: claude-code, model: "opus" }
  # … 8 assignations, opus×3 (odin/aragorn/gandalf), sonnet×5 (gimli/legolas/helm/loki/nathalie)
---
```

**Conséquence de la divergence** : si l'on faisait lire un binding de frame par
`parseBinding` (Modèle A), il chercherait la clé `bindings` (absente) → **binding aux
liaisons VIDES**, et `methodId` serait perdu. Pour contourner, un **shim** `BindingMd` /
`parseBindingMd` a été ajouté dans `frontmatter.ts` (feature open-frame). On a donc **deux
domaines parallèles** pour une même notion.

**Décision décideur** : **aligner `binding.ts` sur le format frame** (`assignments` +
`methodId`), réconcilier proprement en **absorbant le shim `BindingMd`** — un seul type
`Binding`, lu **nativement** par open-frame via `binding.ts`.

---

## 2. Vérification amont (règle web)

Cette décision est un **refactor interne** (réconciliation de deux modèles maison) : **aucune
dépendance à un fait externe** (pas de version de lib, pas d'API tierce, pas de format
standardisé à valider). La contrainte « cœur zéro-dépendance » reste tenue (aucun nouveau
paquet). Aucune vérification web n'est donc load-bearing ici — noté explicitement pour lever
toute ambiguïté. La byte-parité frontmatter (miroir CLI) reste garantie par le parseur maison
existant (`parseFrontmatter`), inchangé.

---

## 3. Cible : le `Binding` unifié

Un **seul** type `Binding` dans `binding.ts`, aligné sur le format frame :

```ts
export interface PersonaBinding {   // INCHANGÉ (forme)
  personaId: string;
  runner: RunnerKind;               // validé (défensif)
  model: string;                    // "" = aucune émission (kit pur)
}

export interface Binding {
  id: string;
  methodId: string;                 // ← NOUVEAU (venu du frame) ; "" toléré au parse
  teamId: string;
  node: NodeKind;
  origin: BindingOrigin;
  assignments: PersonaBinding[];    // ← RENOMMÉ (ex-`bindings`)
}
```

Deux **portes d'entrée**, un seul type de sortie, avec une strictesse **documentée** selon le
support (cf. § 9 arbitrage P-B) :

- `parseBinding(raw: unknown): Binding | null` — porte **JSON/objet** (round-trip déploiement).
  **Stricte** : `node` invalide → `null` (l'artefact déployé doit être valide). Lit désormais
  `methodId` (défaut `""`) et `assignments` (au lieu de `bindings`).
- `parseBindingMd(text: string | null | undefined): Binding | null` — porte **`.md`
  frontmatter** (frame), **NOUVELLE dans `binding.ts`**. S'appuie sur `parseFrontmatter`
  (importé de `frontmatter.ts`), **tolérante** sur `node`/`origin` (défauts `"claude"` /
  `"forge-default"`), `null` si `id`/`methodId`/`teamId` manquant (contrat identique à
  l'actuel `BindingMd`). Réutilise la coercion d'assignations partagée avec `parseBinding`.

> **Sens du refactor** : la logique d'assignation (personaId/runner/model), de `methodId`/
> `teamId`, est **factorisée** ; seule la strictesse `node` diffère entre les deux portes.

Helpers `binding.ts` à mettre à jour :
- `defaultBindingForNode(team, node, methodId = "")` — **nouveau paramètre optionnel**
  `methodId` (défaut `""` : le déploiement n'utilise pas `methodId`, seul open-frame en a
  besoin) ; produit `assignments` (renommé).
- `modelForPersona(binding, personaId)` — lit `binding.assignments.find(...)` (renommé).
- `serializeBinding` / `parseBindingText` — inchangés dans le principe ; sérialisent/relisent
  la clé `assignments`. Invariant « zéro credential » **préservé**.

Pas de sérialiseur `.md` de binding : open-frame est **read-only** (émission `.md` = HORS, § 8).

---

## 4. Impact — fichier par fichier (surface complète relevée)

### 4.1 Cœur — le type et ses consommateurs de génération (clé `bindings` → `assignments`)

- `packages/core/src/binding.ts` — **propriétaire** : ajouter `methodId`, renommer
  `bindings`→`assignments` (interface + `parseBinding` L.107-116, `defaultBindingForNode`
  L.140-153, `modelForPersona` L.160-167, `serializeBinding`) ; **ajouter** `parseBindingMd`
  (import `parseFrontmatter`).
- `packages/core/src/adapters/types.ts` — `KitGenOptions.binding?: Binding` : **aucun
  changement de code** (type importé) ; commentaire L.47-54 mentionne « lookup
  `binding.bindings` » → mettre à jour la prose en `binding.assignments`.
- `packages/core/src/adapters/claudeCode.ts` (L.22, L.170-173), `adapters/openwebui.ts`
  (L.22, L.179), `adapters/agentsMd.ts` (L.23, L.88-91) — passent **tous** par
  `modelForPersona(...)` : **transparents** au renommage (aucune lecture directe de
  `.bindings`). Rien à changer côté code adaptateur.

### 4.2 Cœur — absorption du shim (`BindingMd` supprimé)

- `packages/core/src/frontmatter.ts` — **SUPPRIMER** : `BindingAssignmentMd` (L.499-503),
  `BindingMd` (L.505-518), `asAssignments` (L.520-536), `parseBindingMd` (L.538-553). Ne rien
  garder du domaine binding dans `frontmatter.ts` (il redevient un pur (dé)sérialiseur
  générique + team/method/kit/workflow).
- `packages/core/src/portfolio.ts` — `FrameAssembly.binding: BindingMd | null` →
  `Binding | null` ; import L.24 : retirer `BindingMd` de `./frontmatter`, importer `Binding`
  depuis `./binding` ; `coerceBindingMd` (L.343-379) → renommer/retyper en coercion de
  `Binding` (elle lit **déjà** `assignments` L.352 : cohérent) + lire `methodId`/`origin`/`node`
  (déjà fait) ; `buildPortfolio` résout via `binding.methodId`/`teamId` (L.181-187 :
  inchangé) ; `checkPortfolioRefs` lit `binding.assignments` (L.279-285 : inchangé).
- `packages/core/src/index.ts` — le barrel réexporte `./binding` et `./frontmatter` : le nom
  public `parseBindingMd` reste **exporté** (déplacé de module) → **les imports appelants ne
  changent pas** (`import { parseBindingMd } from "@iakaframe/core"`). Vérifier l'absence de
  collision de noms.

### 4.3 Front — construction/déploiement du Binding JSON (clé `bindings` → `assignments`)

- `src/hooks/useForgeDeploy.ts` — L.169 `defaultBindingForNode(team, node)` (option : passer
  `methodId` si disponible en scope, sinon défaut `""`) ; L.186 & L.204 `prev.bindings.map(...)`
  → `prev.assignments.map(...)` ; L.274 `serializeBinding(binding)` inchangé.
- `src/components/LiaisonPanel.tsx` — L.61 & L.63 `binding?.bindings.find(...)` →
  `binding?.assignments.find(...)`.
- `src/forge/openFrame.ts` — L.23 & L.105 `parseBindingMd` : **inchangé** (même nom, résolu
  par le barrel depuis `binding.ts`). C'est le **cœur de la cible** : open-frame charge le
  binding **nativement via `binding.ts`**, plus via le shim.
- `src/components/OpenFramePanel.tsx` (L.87) — lit `assembly?.binding?.id` : inchangé.
- `src/views/DeployView.tsx` (L.66) — passe le prop `binding` : inchangé.

### 4.4 Tests — à migrer (aucun test de binding cassé sans remplacement)

- `packages/core/__tests__/binding.test.ts` — remplacer la clé `bindings` par `assignments`
  (helper `bindingWithModel` L.36-39, parseBinding fixtures L.94-144, `defaultBindingForNode`
  L.58-64) ; **ajouter** un cas `methodId` (défaut au parse + threadé par
  `defaultBindingForNode`).
- `packages/core/__tests__/bindingMd.test.ts` — **fusionner** dans `binding.test.ts** (ou
  re-pointer l'import de `parseBindingMd`, désormais depuis `binding.ts`) : garder les cas
  frame (methodId/teamId/assignments, défensif id/methodId/teamId manquant, assignments
  absent → `[]`).
- `packages/core/__tests__/portfolio.test.ts` — retyper les fixtures `BindingMd`→`Binding`
  (mêmes champs).
- `src/hooks/useForgeDeploy.test.ts` — L.234 & L.276 `.bindings` → `.assignments`.
- `src/forge/openFrame.test.ts`, `src/forge/useOpenFrame.test.ts` — fixtures `.md` inline avec
  `assignments` : **inchangées** (déjà au format frame) ; vérifier qu'elles passent par le
  nouveau `parseBindingMd`.

---

## 5. Ce qui DISPARAÎT vs ce qui MIGRE

- **Disparaît** (le shim) : `BindingMd`, `BindingAssignmentMd`, `parseBindingMd` (version
  `frontmatter.ts`), `asAssignments`. `frontmatter.ts` ne connaît plus le domaine binding.
- **Migre / se met à jour** : le type `Binding` (gagne `methodId` + `assignments`) ; les
  parseurs (`parseBinding` strict JSON, `parseBindingMd` tolérant `.md` **dans `binding.ts`**) ;
  `defaultBindingForNode` (param `methodId`) ; `modelForPersona`/`serializeBinding` (renommage) ;
  `portfolio.ts` (retype `FrameAssembly.binding`) ; tous les tests listés en § 4.4.
- **Inchangé** : les 3 adaptateurs (transparents via `modelForPersona`), le parseur frontmatter
  générique (`parseFrontmatter`), le déploiement Rust `kit_deploy` (écrit l'arbre verbatim).

---

## 6. Périmètre

**DANS** :
- Unifier le type `Binding` sur le format frame (`assignments` + `methodId`) dans `binding.ts`.
- Déplacer le parseur `.md` (`parseBindingMd`) dans `binding.ts` et **supprimer** le shim de
  `frontmatter.ts`.
- Faire lire open-frame **nativement** via `binding.ts`.
- Mettre à jour `portfolio.ts`, le front (deploy/liaison) et **tous** les tests concernés.

**HORS** :
- Émettre/écrire des bindings `.md` (open-frame reste **read-only** MVP).
- Basculer l'artefact de déploiement `binding.json` vers `.md` (reste JSON, clé renommée — § 9 P-A).
- Toute évolution de l'UI Liaison au-delà du renommage de champ.
- Multi-binding par frame (mono-binding MVP conservé).
- Élargir `RunnerKind`/`NodeKind` (le frame réel n'utilise que des valeurs valides).

---

## 7. Branche

Le shim `BindingMd` et la feature open-frame sont **présents dans l'arbre de travail actuel**
(observé dans `frontmatter.ts`/`portfolio.ts`). Gimli **confirme** d'abord la base (open-frame
mergé sur `main`, ou encore sur `feat/open-frame-portfolio`) puis crée une **branche dédiée**
recommandée : `feat/align-binding-format-frame`, partant de la base qui porte le shim + open-frame.
Commits atomiques (conventional commits). Jamais de `reset --hard` / `push --force`.

---

## 8. Critères d'acceptation (VÉRIFIABLES)

1. **Type unifié** : `Binding` (`binding.ts`) = `{ id, methodId, teamId, node: NodeKind,
   origin: BindingOrigin, assignments: PersonaBinding[] }`. **Aucune** occurrence de
   `.bindings` résiduelle : `rg '\.bindings\b' packages/ src/` → **0** hit (hors historique).
2. **Shim supprimé** : `rg 'BindingMd|BindingAssignmentMd|asAssignments' packages/core/src/frontmatter.ts`
   → **0** hit. `frontmatter.ts` n'exporte plus de type/parseur de binding.
3. **Lecture native** : `openFrame.ts` charge le binding via `parseBindingMd` **résolu depuis
   `binding.ts`** (barrel) ; aucune référence à un type `BindingMd` distinct nulle part
   (`rg 'BindingMd' packages/ src/` → 0).
4. **Portfolio** : `FrameAssembly.binding: Binding | null` ; résolution method/team via
   `binding.methodId`/`teamId` conservée ; `checkPortfolioRefs` vérifie `binding.assignments`.
5. **Frame réel (bout-en-bout)** : charger `frames/releases/StefFrame2` produit un binding
   `methodId="iakaframe"`, `teamId="iakaframe-8"`, `node="claude"`, `origin="forge-default"`,
   **8 assignations** ; **chaque `personaId` résout** dans `inventory.personas` ;
   `checkPortfolioRefs(portfolio).ok === true`.
6. **Fixture binding réel** : un test lit le contenu de `bindings/iakaframe-claude-default.md`
   et vérifie 8 assignations (odin/aragorn/gandalf=`opus`, gimli/legolas/helm/loki/nathalie=`sonnet`,
   runner `claude-code`).
7. **Non-régression P7** : sans binding → arbre de kit **byte-identique** au pur (B-2) ;
   binding « tout `model:""` » ≡ kit pur (B-4) ; avec binding → modèle au bon endroit (B-3) ;
   modèle vient **toujours** du Binding, jamais de la Team (B-5). Les 3 adaptateurs restent
   inchangés (émission via `modelForPersona`).
8. **Round-trip + invariant** : `parseBinding(serializeBinding(b))` préserve la forme unifiée ;
   `serializeBinding` ne laisse fuiter **aucun** credential (`token`/`apiKey`/`password`) —
   test conservé.
9. **Déploiement** : `useForgeDeploy` construit/sérialise le Binding unifié ; `binding.json`
   émis avec la clé `assignments` ; test de déploiement mis à jour et vert.
10. **Qualité** : `npm run typecheck && npm run lint && npm run test` **verts** (cœur + front).
    **Aucun** test de binding supprimé sans remplacement ; `bindingMd.test.ts` fusionné ou
    re-pointé.

---

## 9. Points à arbitrer (tranchés par défaut — confirmer au jalon)

- **P-A — artefact de déploiement.** `binding.json` **reste JSON** (clé renommée `assignments`),
  l'émission `.md` de binding est HORS scope MVP. *Reco retenue : oui.* (Confirmer qu'aucun
  consommateur externe ne parse la clé `bindings` de `binding.json` — le Rust `kit_deploy`
  écrit l'arbre verbatim, ne le parse pas.)
- **P-B — strictesse `node` selon la porte.** `parseBinding` (JSON) reste **strict** (`node`
  invalide → `null`, artefact déployable valide) ; `parseBindingMd` (`.md` frame) reste
  **tolérant** (défaut `"claude"`, on affiche un frame imparfait plutôt que de masquer le
  binding). *Reco retenue : deux portes, coercion d'assignations partagée.*
- **P-C — strictesse `runner`.** `PersonaBinding.runner: RunnerKind` conservé (validé,
  assignation à runner inconnu **jetée**). Le frame réel n'utilise que `claude-code` → les 8
  survivent (critère 5/6 tenu). *Reco retenue : strict.* Si un frame futur porte un runner
  hors `RunnerKind`, évolution séparée.
- **P-D — `methodId`.** Requis dans le **type**, **toléré** au parse (défaut `""`), threadé en
  **paramètre optionnel** de `defaultBindingForNode`. Load-bearing **uniquement** pour
  open-frame (résolution portfolio) ; ignoré par la génération de kit. *Reco retenue : oui.*

---

## 10. Statut

**PRÊT POUR IMPLÉMENTATION.** Le périmètre est fermé ; les 4 arbitrages (§ 9) sont tranchés par
défaut selon la reco et **cohérents avec la décision décideur** (aligner sur le format frame,
absorber le shim). Le gate humain (validation de cette instruction) déclenche Gimli. Si un
arbitrage de § 9 est renversé au jalon, l'instruction est amendée avant exécution.
