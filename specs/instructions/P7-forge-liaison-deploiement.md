# Instruction P7 — Forge : étape de liaison optionnelle au déploiement (Binding) (MVP)

> **Phase** : P7 — Réalisation · **Cadreur** : l'architecte-cadreur · **Exécutant** : le développeur-devops ·
> **Gate** : le responsable qualité.
> **Statut : JALON VALIDÉ par le décideur — 2026-07-15** (Q-1→Q-5 = toutes les recos) → **EN RÉALISATION**.
> **Réponses d'arbitrage** : Q-1 = front ajoute `binding.json` au KitFileTree (`kit_deploy` inchangé) ·
> Q-2 = l'adaptateur pur n'émet **pas** `binding.json` (matérialisé par la forge) · Q-3 = modèle **vide +
> placeholder** au MVP (table de suggestion = itération) · Q-4 = modèle requis = **avertissement non bloquant** ·
> Q-5 = `binding.json` = **produit de déploiement, non versionné** comme la Team.
> **Date cadrage** : 2026-07-07. Français ; identifiants en anglais ; **rôles jamais désignés par un nom de code**.
>
> **⚠️ Ce lot MODIFIE du code existant qui TOURNE** (P1–P6 codés, gatés, poussés — HEAD `5552491`). L'évolution
> est **ADDITIVE et rétro-compatible** : sans Binding, la sortie reste **byte-identique** à aujourd'hui.
>
> **Décision de référence** : `specs/instructions/E1-evolution-binding-ar1.md` (Binding en 1re classe, **AR-1
> révisé**, VALIDÉ) ; `specs/contrat-concepts.md` § 2.9 / § 1.1 (3 couches). **Code inspecté (lecture seule)** :
> `packages/core/src/adapters/{types,claudeCode,agentsMd,openwebui}.ts`, `packages/core/src/{node,team,persona}.ts`,
> `packages/core/__tests__/adaptersOpenwebui.test.ts` (invariant « zéro modèle » actuel),
> `src-tauri/src/kit_deploy.rs` (écrit un `KitFileTree` tel quel), `src/hooks/useForgeDeploy.ts` (flux P4),
> `src/views/DeployView.tsx`, `src/api/backend.ts`.

---

## 1. Objectif

Ajouter à la forge une **étape de liaison optionnelle au déploiement** : après avoir choisi une team et un nœud,
l'utilisateur peut poser un **Binding** (`persona → runner + modèle`) pour rendre le kit **standalone-runnable**
(exécutable en terminal nu, sans Cockpit). Les adaptateurs **émettent alors le modèle** au bon endroit selon le
nœud. **Sans Binding, rien ne change** (kit pur, tests golden identiques). Le Binding déployé est écrit **à côté**
du kit (`binding.json`).

---

## 2. Périmètre — IN / OUT

### 2.1 DANS le périmètre P7

1. **Schéma `Binding`** dans `@iakaframe/core` (+ parseurs défensifs + helper **binding par défaut d'un nœud**).
2. **Étape de liaison optionnelle** dans le flux Déploiement (P4) : panneau « Liaison » pour choisir **runner +
   modèle par persona** → produit un `Binding origin:"forge-default"`.
3. **Adaptateurs (claudeCode / agentsMd / openwebui) — émission CONDITIONNELLE du modèle** via un
   `KitGenOptions.binding?` **optionnel** (§ 5). Sans binding = sortie actuelle ; avec = modèle émis.
4. **Déploiement écrit `binding.json`** à côté du kit (la forge l'ajoute au `KitFileTree` — `kit_deploy`
   **inchangé**, § 6).
5. **RE-ANCRER les tests « zéro modèle »** au niveau **Team (définition)**, pas au niveau Kit (§ 7).

### 2.2 HORS périmètre P7 (différés)

- **Override côté Cockpit** (`origin:"cockpit-override"`) → **instruction Cockpit** (recentrage), autre lot.
- **Credentials** : jamais dans `binding.json` — restent au **keychain** (aucun secret manipulé ici).
- **UI avancée de liaison** : MVP = **choix simple** runner + modèle par persona (pas de suggestion automatique
  élaborée, pas de détection de modèles installés). La table de suggestion par rôle = option (Q-4).
- **Défaut Ollama** raffiné (table modèle↔rôle) → à confirmer (Q-4) ; MVP = champ libre + placeholder.

---

## 3. Schéma `Binding` (`@iakaframe/core`, nouveau — E1 Q-6)

```ts
// packages/core/src/binding.ts (nouveau)
import type { RunnerKind } from "./runner";
import type { NodeKind } from "./node";

export interface PersonaBinding {
  personaId: string;      // réf. Persona de la team
  runner: RunnerKind;     // claude-code | ollama | litellm | codex (vocab existant)
  model: string;          // alias/modèle ; "" = défaut du runner (pas d'émission)
}

export interface Binding {
  id: string;
  node: NodeKind;                                   // Binding PAR (team, nœud) — E1 Q-2
  teamId: string;
  bindings: PersonaBinding[];
  origin: "forge-default" | "cockpit-override";
}
```

- **Parseurs défensifs** (`parseBinding`, `parsePersonaBinding`) calqués sur `parseTeam`/`parsePersona` :
  record invalide → ignoré, **jamais d'exception** ; `runner` validé via `parseRunnerKind` existant ; `model`
  non-string → `""`.
- **Invariant secret (dur)** : `Binding` **ne contient aucun credential** (runner = kind, modèle = alias). Test.
- **Helper défaut par nœud** (E1 Q-3) :
  ```ts
  export function defaultBindingForNode(team: Team, node: NodeKind): Binding;
  ```
  - **`claude`** : `runner:"claude-code"`, `model:""` pour toutes les personas → **pas d'émission de modèle**
    (kit reste équivalent au pur ; Claude Code tourne sur ses défauts).
  - **`codex`** : `runner:"codex"`, `model:""` → **modèle requis** pour un kit standalone (l'UI signale les
    modèles manquants ; défaut = vide, à compléter).
  - **`ollama-localhost` / `ollama-lan`** : `runner:"ollama"`, `model:""` → **modèle requis** (Q-4 : table de
    suggestion par rôle en option ; MVP = vide + placeholder).
  - **`openwebui`** : `runner:"ollama"` (ou libre), `model:""` → **modèle requis** pour remplir `base_model_id`.
  - **Exporté** depuis `packages/core/src/index.ts`.

> **Le Binding n'est JAMAIS fusionné dans la Team** : `Team` (schéma `team.ts`) **n'est pas modifié** — pas de
> champ runner/model ajouté. Le Binding est un **artefact séparé** passé en option de génération.

---

## 4. Étape de liaison dans le flux Déploiement (UI — modifie P4)

Le flux P4 actuel (`useForgeDeploy` + `DeployView`) est : **team → nœud → Générer → Déployer**. P7 **insère** une
étape **optionnelle** entre « nœud » et « Générer » :

```
 team → nœud → [ Liaison (optionnelle) ] → Générer → Déployer
                └ panneau « Liaison » : runner + modèle par persona
```

### 4.1 `useForgeDeploy` — extension additive
- **Nouvel état** : `binding: Binding | null` (défaut `null` = **kit pur**, comportement P4 inchangé).
- **Nouvelles actions** : `enableBinding()` (initialise via `defaultBindingForNode(team, node)`),
  `setPersonaRunner(personaId, runner)`, `setPersonaModel(personaId, model)`, `clearBinding()` (retour au pur).
- **Invalidation** : `binding` fait partie des entrées de `generate` → changer team/nœud **réinitialise ou
  invalide** le binding (comme le kit, garde U-8 existante). Changer le binding **invalide le kit affiché**.
- **`generate`** : passe le binding à l'adaptateur —
  `getAdapter(node).generate(team, { ...opts, binding: binding ?? undefined })`. **Sans binding → appel
  identique à aujourd'hui** (option absente).
- **`deploy`** : si `binding` présent, **ajoute `binding.json` au KitFileTree** avant l'appel façade (§ 6).

### 4.2 `LiaisonPanel` (nouveau composant) dans `DeployView`
- Affiché **entre** `NodeSelector` et le bouton Générer. **Repliable** ; **désactivé/masqué** tant qu'aucun nœud
  n'est choisi.
- **Case « Lier ce kit (runner + modèle par persona) »** : cochée → `enableBinding()` ; décochée → `clearBinding()`
  (kit pur).
- Par persona (liste, triée comme le roster) : **`<select>` runner** (vocab `RunnerKind`) + **champ modèle**
  (texte libre au MVP). Le rôle/nom de la persona sont affichés (libellé de rôle, jamais nom de code comme
  concept).
- **Aide contextuelle par nœud** : Claude Code → « modèle facultatif (défaut runner) » ; Codex/Open WebUI/Ollama →
  « modèle requis pour un kit exécutable hors Cockpit » (avertissement non bloquant si vide).

---

## 5. Émission conditionnelle du modèle par adaptateur (cœur — additif)

**Mécanique commune (rétro-compat parfaite)** : ajouter **`binding?: Binding`** à **`KitGenOptions`**
(`adapters/types.ts`) — **aucune signature `generate(team, opts?)` ne change**. Chaque adaptateur lit
`opts?.binding` ; **absent → comportement actuel** ; présent → émet le modèle **par persona** (via
`binding.bindings.find(b => b.personaId === persona.id)`, `model` vide → **rien émis**).

| Adaptateur | Sans binding (INCHANGÉ) | Avec binding (nouveau, conditionnel) |
|---|---|---|
| **claudeCode** (`renderAgent`) | frontmatter **sans `model`** (`.claude/agents/*.md`) | ajoute **`model: <b.model>`** au frontmatter **si** `b.model` non vide |
| **agentsMd** codex/ollama (`renderRoster` ou nouvelle section) | `AGENTS.md` sans modèle | ajoute une colonne/section **« moteur par persona »** listant le modèle **depuis le binding** (jamais en dur) |
| **openwebui** (`buildOpenWebUIModel`) | `base_model_id: ""` | **`base_model_id: <b.model>`** si non vide ; sinon `""` (inchangé) |

**Règles impératives** :
- Le modèle vient **toujours du Binding**, **jamais de la Team**.
- **Déterminisme** conservé (tri des personas inchangé ; le binding est un lookup).
- `model` vide dans un `PersonaBinding` = **aucune émission** (équivalent au pur pour cette persona) → un binding
  Claude Code « tout vide » produit un kit **identique** au pur.
- Les renderers d'identité/périmètre/workflow (P6) sont **inchangés**.
- **openwebui** : le type `OpenWebUIModel.base_model_id` (aujourd'hui littéral `""`) devient `string` ; sans
  binding il reste `""` (test O-4 ré-ancré, § 7).

---

## 6. Déploiement de `binding.json` — `kit_deploy` INCHANGÉ (décision)

`kit_deploy` écrit un `KitFileTree` (`{ relPath → contenu }`) **tel quel**, avec pathguard + non-destructif
(`kit_deploy.rs` inchangé). **Décision** : la **forge (front) ajoute `binding.json` au KitFileTree** avant
l'appel façade — **pas** de nouvelle commande Rust, **pas** de modif de `kit_deploy`.

- Dans `useForgeDeploy.deploy` : si `binding` présent, `files = { ...kit.files, "binding.json": JSON.stringify(
  binding, null, 2) + "\n" }` puis `api.kitDeploy(destDir, files, force)`.
- **Emplacement (E1 Q-1)** : `binding.json` **à la racine du kit** (à côté de `CLAUDE.md`/`AGENTS.md`/`models/`),
  artefact **distinct** de la définition → **rebindable sans régénérer la team**.
- Le `binding.json` **n'est pas** produit par l'adaptateur pur (qui ne connaît que le rendu du modèle *dans* les
  fichiers) : c'est la **forge** qui matérialise l'artefact de liaison. *(Alternative : l'adaptateur émet aussi
  `binding.json` — écartée, garde l'adaptateur focalisé sur le format du nœud ; cf. Q-2.)*

---

## 7. RE-ANCRAGE des tests « zéro modèle » (impératif — E1)

Aujourd'hui l'invariant « zéro modèle » est asserté **au niveau du Kit** (ex.
`adaptersOpenwebui.test.ts:114-138` : `base_model_id === ""`, aucun `deepseek`/`qwen`/`:latest` dans le contenu).
**Tel quel, il bloquerait le Binding.** Re-ancrage :

- **Au niveau Team (définition)** — **RENFORCER** : `Team`/`Persona` (schéma `team.ts`/`persona.ts`) **ne
  contiennent aucun** `runner`/`model` ; un parseur qui rencontre ces clés en entrée les **ignore**. Test dédié
  « la définition de Team est pure » (assertion sur le **type/schéma**, pas sur le kit).
- **Au niveau Kit** — **REFORMULER** : *sans binding*, le kit **reste pur** (les golden actuels restent
  **byte-identiques** — non-régression P3/P3b/P3c) ; *avec binding*, le kit **peut** porter le modèle → nouveaux
  tests « avec binding, le modèle apparaît au bon endroit ».
- **Concrètement** : les tests actuels « zéro modèle » deviennent des tests « **sans binding → zéro modèle**
  (golden identique) » ; on **ajoute** des tests « **avec binding → modèle émis** ». Aucun test n'est supprimé sans
  remplacement ; la garde AR-1 est **maintenue au bon niveau** (Team pure), pas relâchée.

---

## 8. Fichiers touchés (prévisionnel)

**`@iakaframe/core`**
- `src/binding.ts` *(nouveau)* — `Binding`/`PersonaBinding` + parseurs + `defaultBindingForNode`.
- `src/index.ts` — exports `Binding`, `parseBinding`, `defaultBindingForNode`.
- `src/adapters/types.ts` — `KitGenOptions.binding?: Binding`.
- `src/adapters/claudeCode.ts` — `renderAgent` émet `model:` conditionnel.
- `src/adapters/agentsMd.ts` — section « moteur par persona » conditionnelle.
- `src/adapters/openwebui.ts` — `base_model_id` conditionnel ; type `string`.
- `__tests__/*` — re-ancrage (§ 7) + nouveaux tests « avec binding » + golden « sans binding ».

**Front (forge)**
- `src/hooks/useForgeDeploy.ts` — état `binding` + actions + `generate`/`deploy` (ajout `binding.json`).
- `src/components/LiaisonPanel.tsx` *(nouveau)*.
- `src/views/DeployView.tsx` — insère `LiaisonPanel` entre nœud et Générer.
- `src/hooks/useForgeDeploy.test.ts`, `src/views/DeployView.test.tsx` — cas binding.

**Rust** : **AUCUN** (`kit_deploy` inchangé — § 6).

---

## 9. Critères d'acceptation (vérifiables)

- **B-1 — Schéma Binding + défaut par nœud exportés.** `@iakaframe/core` exporte `Binding`, `PersonaBinding`,
  `parseBinding` (défensif), `defaultBindingForNode` ; `defaultBindingForNode(team, "claude")` → tous `model:""` ;
  `"codex"/"ollama-*"/"openwebui"` → runner adéquat, `model:""` (à compléter). Test.
- **B-2 — Non-régression : `generate` SANS binding = golden identique.** Pour les 5 nœuds, `generate(team)` (option
  binding absente) produit un arbre **byte-identique** à HEAD `5552491` (les tests P3/P3b/P3c **restent verts sans
  changer leurs attentes de contenu**). C'est le critère bloquant.
- **B-3 — `generate` AVEC binding → modèle au bon endroit.** claudeCode : `model:` dans le frontmatter du subagent
  ssi `b.model` non vide ; openwebui : `base_model_id` = `b.model` ; codex/ollama : le modèle par persona apparaît
  dans `AGENTS.md`. Le modèle vient **du binding**, jamais de la team (test).
- **B-4 — Binding « tout vide » = kit pur.** Un binding dont tous les `model` sont `""` produit un arbre
  **identique** au kit sans binding (aucune émission) — test (renforce B-2).
- **B-5 — Tests « zéro modèle » ré-ancrés.** Un test asserte que la **définition de Team** est pure (aucun
  `runner`/`model` dans `Team`/`Persona`, ignorés au parse) ; les ex-tests « kit zéro modèle » deviennent « sans
  binding → zéro modèle » (verts).
- **B-6 — Déploiement écrit `binding.json`.** Avec binding, `deploy` ajoute `binding.json` (racine) au
  `KitFileTree` → écrit par `kit_deploy` **inchangé** ; `binding.json` **parsable**, contient `origin:
  "forge-default"`, **aucun credential**. Sans binding → **pas** de `binding.json` (arbre inchangé).
- **B-7 — Claude Code sans modèle reste valide ; Codex/Open WebUI liés portent le modèle.** Recette : kit Claude
  Code sans binding = pur et valide ; kit Open WebUI avec binding → `base_model_id` rempli, importable ; kit Codex
  avec binding → modèle référencé.
- **B-8 — `kit_deploy` inchangé.** `src-tauri/src/kit_deploy.rs` non modifié ; `cargo test` (pathguard/non-destructif)
  vert.
- **B-9 — UI : étape de liaison optionnelle.** `DeployView` affiche `LiaisonPanel` après le nœud ; cocher « Lier »
  révèle runner+modèle par persona ; décocher → kit pur ; façade unique préservée (`grep invoke(` hors
  `backend.ts` = 0). **B-10 — Smoke visuel** (geste humain) : team → nœud → lier (Open WebUI, un modèle) → Générer
  (voir `base_model_id` rempli) → Déployer (tmp) → `binding.json` présent.
- **B-11 — Qualité.** core typecheck + tests verts ; front lint/test/build verts ; **B-12 — Rôles jamais en noms de
  code**.

---

## 10. Dépendances, risque & questions d'arbitrage

**Dépendances** : E1 validé ; P1–P6 codés/poussés (HEAD `5552491`) ; vocab `RunnerKind`/`NodeKind` existant.

**Risque** — **la non-régression B-2** (ne rien changer sans binding). Neutralisé par : option `binding?`
**optionnelle** (absente = code actuel) + **golden byte-identique** + binding-vide=pur (B-4). Risque secondaire :
fuite d'un modèle dans la **Team** → B-5 (garde ré-ancrée).

**Questions d'arbitrage (prose)**
- **Q-1 — `binding.json` : forge (front) l'ajoute au KitFileTree (reco) ou `kit_deploy` le prend en 2e argument ?**
  *Reco : **front l'ajoute à l'arbre*** → `kit_deploy` **inchangé**, zéro nouvelle commande Rust. → *Trancher.*
- **Q-2 — L'adaptateur pur émet-il aussi `binding.json` ?** *Reco : **non*** — l'adaptateur rend le **format du
  nœud** (modèle *dans* les fichiers) ; `binding.json` (artefact de liaison séparé) est **matérialisé par la
  forge**. → *Confirmer.*
- **Q-3 — Défaut Ollama/Codex : modèle vide (MVP) ou table de suggestion par rôle ?** *Reco : **vide + placeholder
  au MVP*** (choix simple, non bloquant) ; table de suggestion (réutiliser `iakaframe/.../cible-ollama-modeles-
  agents.md`) = itération. → *Trancher.*
- **Q-4 — Modèle « requis » : bloquant ou avertissement ?** *Reco : **avertissement non bloquant*** — on peut
  générer un kit Codex/Ollama sans modèle (il ne sera juste pas standalone-runnable), la forge **signale**. →
  *Confirmer.*
- **Q-5 — `binding.json` versionné avec le kit ?** (rappel E1 Q-4 : Team et Kit lié = 2 artefacts). *Reco : le
  `binding.json` est un **produit de déploiement** (environnement-spécifique), pas une source à versionner comme la
  Team.* → *Confirmer.*

> Tant que ce jalon n'est pas validé, **aucun code**. À la validation : « JALON VALIDÉ » + réponses Q-1→Q-5.

---

## 11. Phasage interne (un seul livrable P7)

| Étape | Contenu | Critères |
|---|---|---|
| **1. Schéma** | `binding.ts` (types + parseurs + `defaultBindingForNode`) + exports | B-1 |
| **2. Émission conditionnelle** | `KitGenOptions.binding?` + 3 adaptateurs (modèle conditionnel) | B-2, B-3, B-4 |
| **3. Re-ancrage tests** | garde « Team pure » + golden « sans binding » + tests « avec binding » | B-2, B-5 |
| **4. UI liaison** | `binding` dans `useForgeDeploy` + `LiaisonPanel` + `binding.json` au déploiement | B-6, B-9 |
| **5. Recette + qualité** | smoke bout-en-bout + `cargo test` inchangé + qualité | B-7, B-8, B-10, B-11, B-12 |

---

## 12. Journal de décision

- **2026-07-07** — Cadrage P7 (l'architecte-cadreur), **sur code existant (HEAD 5552491)** : **Binding** de 1re
  classe dans `@iakaframe/core` (`{id,node,teamId,bindings:[{personaId,runner,model}],origin}`) + parseurs +
  `defaultBindingForNode` (Claude Code sans modèle ; Codex/Open WebUI/Ollama modèle requis). **Étape de liaison
  optionnelle** dans le flux Déploiement (`LiaisonPanel`), produisant un `Binding origin:"forge-default"`.
  **Émission conditionnelle du modèle** via `KitGenOptions.binding?` (option **optionnelle** → **non-régression
  golden byte-identique sans binding**). **`binding.json`** ajouté au `KitFileTree` par la forge (**`kit_deploy`
  inchangé**). **Tests « zéro modèle » ré-ancrés au niveau Team** (pas Kit). Invariants : Team **jamais** fusionnée
  avec le Binding ; sans binding = P1–P6 identique. Override Cockpit = lot séparé. Arbitrages Q-1→Q-5.
