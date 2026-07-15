# Titre de document ÉDITABLE en ligne + consolidation du geste New

> **Nature** : évolution ciblée de la **forge GUI** (les fonctions fichier par onglet sont
> livrées) — rendre le **titre de document** (`DocTitle`) **éditable en ligne** (renommer le
> `name` directement dans le grand titre centré, sans passer par *Save As*) et **vérifier /
> consolider le geste `New` de bout en bout** (créer un vierge puis le nommer via ce champ).
> **Cadreur** : l'architecte-cadreur. · **Statut : CADRÉ — À VALIDER par le décideur**
> (jalon humain de cadrage).
> **Date** : 2026-07-15. Français ; code et identifiants en anglais.
>
> **Références (lues au cadrage, à `chemin:ligne`)**
> - Instruction sœur (contrats des 5 gestes, DocTitle §6, garde §4.6, dirty tracking, I1) :
>   `specs/instructions/gui-fonctions-fichier-persistance.md` (à citer, ce lot en est la suite).
> - `src/forge/DocTitle.tsx:6-17` — aujourd'hui **read-only** : props `{ name, dirty }`, `•` si dirty.
> - `src/forge/DocBar.tsx:37-39` — bouton `New` = `doc.requestNew` ; `src/forge/DocBar.tsx:106-133`
>   invite Save As (id + nom, états locaux `saId`/`saName`).
> - `src/forge/useForgeDocument.ts:77-109` — contrat `UseForgeDocument<T>` ; `:141` `name` **dérivé**
>   de `config.nameOf(artifact)` (pas d'état propre) ; `:153-156` `edit()` (dirty=true) ;
>   `:143-151` `loadBlank()` (New) ; `:402-414` `renameArtifact` **privé** (Save As uniquement).
> - `src/forge/ForgeShell.tsx:73-114` — instanciation des 3 documents ; `:116-124` semis d'un
>   vierge par onglet au montage ; `:182` `<DocTitle name={activeDoc.name} dirty={activeDoc.dirty} />`.
> - Types du cœur : `packages/core/src/team.ts:23-27` (`Team.id` + `Team.name`),
>   `packages/core/src/method.ts:34-38` (`Method.id` + `Method.name`),
>   `packages/core/src/kit.ts:23-34` (`Kit` : `id`, `methodId`, `teamId`, `node`, `runnerBindingId`
>   — **aucun champ `name`**).
> - `src/forge/mappers.ts:29-38,63-77,99-110` — `name` de Team/Méthode part bien en frontmatter au
>   Save ; Kit projette `id` (pas de `name`).
> - Tests existants : `src/forge/useForgeDocument.test.ts`, `src/forge/DocTitle.test.tsx`,
>   `src/forge/DocBar.test.tsx`.
> - État de l'art vérifié le 2026-07-15 (§ 10).

---

## 1. Problème (avant la solution)

La forge sait gérer un fichier (New · Open · Save · Save As · Close, persistance `.md`), mais le
**titre du document est un cul-de-sac d'édition** :

1. **`DocTitle` est purement présentationnel** (`src/forge/DocTitle.tsx:6-17`) : il **affiche** le
   `name` et le `•` mais ne permet pas de le **changer**. Le **seul** moyen de renommer un artefact
   est aujourd'hui le détour par **Save As** (`useForgeDocument.ts:211-239` → `renameArtifact`), qui
   impose de choisir un id ET d'écrire sur disque. Renommer « en cours de frappe » un brouillon non
   sauvé est **impossible**.
2. **Le hook n'a pas de setter de nom.** `name` est **dérivé** (`useForgeDocument.ts:141`) de
   `config.nameOf(artifact)` ; il n'existe **aucune** API publique `setName`. Le seul mutateur
   d'artefact est `edit(next: T)` (remplace tout l'artefact), et le seul renommage est **privé**
   (`renameArtifact`, réservé à Save As).
3. **Le geste `New` fonctionne mais le parcours « créer puis nommer » n'est pas bouclé.** `New`
   (`requestNew` → `loadBlank`, `useForgeDocument.ts:143-151,298`) charge bien un vierge
   (`id=null`, `source="new"`, `dirty=false`) et le Save d'un `id=null` bascule proprement sur Save
   As (`useForgeDocument.ts:199-209`). **Ce qui manque** pour la demande du décideur, c'est le
   **maillon central** : pouvoir **nommer ce vierge directement dans le titre** avant de le sauver.

**Besoin (formulé par le décideur, 2026-07-15)** :
1. Un **champ nom ÉDITABLE en grand, au milieu, sous les boutons fichier** (dans `DocTitle`).
2. **Consolider le geste `New` de bout en bout** : créer un vierge puis le **nommer via ce champ**.

**Ce lot est purement front + hook.** Il n'ajoute **aucune** I/O ni **aucun** code Rust : la
persistance (le `name` en frontmatter au Save) et les 5 gestes sont **déjà** en place (instruction
sœur). On ajoute **un setter de nom** au hook et on rend `DocTitle` éditable.

---

## 2. Décisions du décideur (gravées)

1. **`DocTitle` devient éditable en ligne** : grand, centré, sous la `DocBar` — on y **édite le
   `name`** de l'artefact courant sans passer par Save As. Le `•` (dirty) est **préservé**.
2. **Le geste `New` est consolidé** : après `New`, l'utilisateur **nomme le vierge dans ce champ**,
   puis Save (→ Save As pour un vierge, cf. § 5).

---

## 3. Frontière & invariants à graver

| Point | Décision gravée |
|---|---|
| **Renommer ≠ déplacer** | Éditer le `name` **ne touche jamais** l'`id` du document (identité de persistance). Pour Team/Méthode, `name` et `id` sont **deux champs distincts** (`team.ts:24-27`, `method.ts:35-38`) — non-destructif par construction. |
| **`name` = texte libre, `id` = slug** | Le `name` **n'est pas normalisé** (accents, espaces, emoji autorisés). Seul l'`id` est slugifié (`slugifyId`, Save As). Ne **jamais** slugifier dans le champ nom → évite le saut de curseur (§ 10). |
| **`dirty` sur rename** | Éditer le nom marque `dirty=true` (comme `edit`). Le `•` réapparaît ; il retombe au Save. |
| **Persistance du nom** | Le `name` part **déjà** en frontmatter au Save (`mappers.ts:32,66` → `serialize*Md`). Ce lot n'ajoute **aucune** persistance nouvelle : renommer + Save réécrit le même fichier (même id) avec le nouveau nom. |
| **Pureté (AR-1)** | Le champ nom ne fait **entrer aucun runner/modèle** dans Team ni Méthode. Il ne modifie qu'un libellé. |
| **Façade unique** | Le champ reste **présentationnel** : il appelle un callback ; toute mutation d'état passe par `useForgeDocument`. Aucun `invoke` (C-8 préservé). |
| **Rust intact** | **Zéro** changement Rust, **zéro** nouvelle commande, **zéro** nouvelle façade backend. Confirmé (§ 7). |

---

## 4. Contrat du champ nom éditable (entrée → sortie)

### 4.1 `DocTitle` — nouveau contrat
- **Props** : `{ name: string; dirty: boolean; onNameChange?: (name: string) => void; disabled?: boolean }`.
- **Rendu** :
  - Si `onNameChange` est fourni **et** `disabled !== true` → un `<input>` **contrôlé** stylé en
    grand titre centré (`value={name}`, `onChange={e => onNameChange(e.target.value)}`), précédé du
    `•` quand `dirty`.
  - Sinon (pas d'`onNameChange`, ou `disabled`) → l'actuel **span read-only** (comportement inchangé,
    non-régressif pour les tests existants `DocTitle.test.tsx`).
- **Accessibilité** : l'`<input>` porte `aria-label="Nom du document"` (input labellisé, clavier OK).
  Le `placeholder="sans-titre"` remplace le repli textuel. Le `•` conserve son `aria-label="modifié"`.
  Note : un `<input>` ne peut pas porter `role="heading"` — on **abandonne** `role/aria-level` sur la
  variante éditable (arbitrage **Q-5**).
- **Pas de transformation de valeur** : le composant renvoie la frappe **telle quelle** (aucun slug,
  aucun trim en cours de frappe) → pas de re-position du curseur (§ 10).

### 4.2 `useForgeDocument` — nouveau setter `setName`
- **Ajout au contrat** `UseForgeDocument<T>` (`useForgeDocument.ts:77-109`) :
  - `setName: (name: string) => void`
  - `canRename: boolean` (vrai ssi `config.withName` est fourni **et** un artefact est ouvert).
- **Ajout à `DocConfig<T>`** (`useForgeDocument.ts:37-54`) : `withName?: (artifact: T, name: string) => T`.
  Fonction **par type** qui pose le nom sur l'artefact (calque de la moitié « name » de
  `renameArtifact`, `useForgeDocument.ts:410-411`).
- **Comportement de `setName(name)`** :
  - `artifact === null` **ou** `config.withName` absent → **no-op** (on ne renomme pas le vide).
  - sinon → `setArtifact(config.withName(artifact, name))` + `setDirty(true)`
    (réutilise le chemin de `edit`). **Ne touche ni `id` ni `source`.**
- **Non-normalisation** : `withName` **ne slugifie pas** ; il pose le texte libre (Team/Méthode :
  `(a, name) => ({ ...a, name })`). Aucun `trim` en cours de frappe (le `trim` de sécurité, s'il en
  faut un, se fait **au Save**, pas à la frappe).

### 4.3 Câblage `ForgeShell`
- `teamDoc` et `methodDoc` reçoivent `withName: (a, name) => ({ ...a, name })`
  (`ForgeShell.tsx:73-97`).
- `kitDoc` : **pas de `withName`** au MVP → titre Kit **read-only** (le Kit n'a pas de champ `name` ;
  son libellé EST son `id`, cf. **Q-1**).
- `DocTitle` monté en `ForgeShell.tsx:182` devient :
  `<DocTitle name={activeDoc.name} dirty={activeDoc.dirty} onNameChange={activeDoc.canRename ? activeDoc.setName : undefined} disabled={activeDoc.artifact === null} />`.

### 4.4 Passage édition ↔ affichage
- **MVP** : champ **toujours éditable** (input permanent stylé en titre, façon titre Google Docs) —
  pas de bascule de mode. Simplicité, un seul état, clavier natif (**Q-3** : alternative
  click-to-edit = différé).
- Quand **aucun artefact** n'est ouvert (`artifact===null`, placeholder « Aucun artefact ouvert »),
  le champ est en variante **read-only/disabled** (on ne renomme pas le néant).

### 4.5 Comportement sur `New`
- `New` (déjà en place) charge le vierge (`id=null`, `source="new"`, `dirty=false`). Le champ nom
  est **éditable** immédiatement : l'utilisateur tape le nom → `setName` → `dirty=true`.
- Puis **Save** : `id===null` → bascule **Save As** (`useForgeDocument.ts:199-207`). Pour éviter que
  le nom saisi soit perdu, l'invite Save As est **préremplie** depuis le nom courant (§ 5, **Q-4**).

### 4.6 Comportement sur `Open`
- `Open` charge l'artefact ; `name` affiché = `nameOf(parsed)`. Le champ est éditable ; renommer +
  Save **réécrit le même id** (le document a déjà un `id`, `useForgeDocument.ts:199-208`), nouveau
  nom en frontmatter, `dirty=false`. **Non-destructif** (même fichier, même id).

---

## 5. Décision sur le geste `New` (déjà couvert ? complément ?)

**Le geste `New` est DÉJÀ couvert de bout en bout au niveau du hook** — vérifié :
- `requestNew` → garde si `dirty` (`useForgeDocument.ts:298,285-296`) → `performNew` → `loadBlank`
  (`:143-151,242-244`) : `id=null`, `source="new"`, `dirty=false`.
- Save d'un vierge (`id=null`) bascule sur Save As (`:199-207`), qui écrit id + nom (`:211-239`).
- Couvert par tests : `useForgeDocument.test.ts:59-67` (New = vierge) et `:69-83` (Save→Save As).

**Ce qui MANQUE pour le parcours demandé** (« créer un vierge puis le nommer via ce champ ») =
uniquement **le champ éditable** (§ 4) + un **complément d'ergonomie mineur** :

1. **Préremplir l'invite Save As** avec le nom déjà saisi dans le titre (sinon le nom tapé est
   perdu quand Save bascule sur Save As). À l'ouverture de Save As, initialiser
   `saName ← doc.name` et `saId ← slugifyId(doc.name)` (`DocBar.tsx:12-13,106-133`). **In-scope**
   (coût faible, sert directement le parcours) — confirmer **Q-4**.

2. **Nom de départ d'un vierge** : aujourd'hui les `blank()` de `ForgeShell` produisent des
   **starters nommés** (`ForgeShell.tsx:75` « Team iakaframe », `:88` starter méthode, `:101`
   `id="iakaframe-kit"`), **pas** un « sans-titre » vide. Décision recommandée : **conserver** le
   contenu starter (utile comme point de départ) et **laisser l'utilisateur renommer librement** —
   ne PAS forcer le nom à vide. (Si le décideur préfère un nom vide invitant au nommage → **Q-2**.)

**Conclusion** : le geste New n'exige **aucun** remaniement de sa mécanique. Le seul complément
nécessaire est le champ éditable (demande 1) ; le préremplissage Save As (point 1) est un petit
ajout d'ergonomie qui **ferme** le parcours « New → nommer → Save ».

---

## 6. Périmètre FERMÉ

**Inclus (MVP)**
- `DocTitle` éditable en ligne (input contrôlé, `•` préservé, labellisé, texte libre) pour les
  onglets **Team** et **Méthode**.
- `setName` + `canRename` sur `useForgeDocument` ; `withName?` dans `DocConfig`.
- Câblage `ForgeShell` (withName pour team/méthode ; disabled si artefact null ; Kit read-only).
- Préremplissage de l'invite Save As depuis le nom courant (ferme le parcours New, Q-4).
- Tests front (hook + composant) — § 9.

**Exclu (explicitement)**
- **Rename Kit** en ligne (pas de champ `name` ; risque id-artefact ≠ id-document) → **Q-1**, différé.
- **Renommer l'`id`** (identité de persistance) depuis le titre — reste le rôle de **Save As**.
- **Bascule mode affichage↔édition** (click-to-edit / double-clic, Escape=annuler) → **Q-3**, différé.
- **Renommage sur disque** (déplacer/renommer le fichier d'un artefact déjà sauvé) — hors sujet ;
  Save réécrit le même id, Save As en crée un nouveau (sémantique inchangée).
- **Undo/redo** du renommage, historique de noms.
- **Tout** changement Rust / façade backend / nouvelle I/O.

---

## 7. Impacts fichiers attendus

| Fichier | Nature du changement |
|---|---|
| `src/forge/DocTitle.tsx` | Rendu conditionnel input éditable (si `onNameChange`) vs span read-only ; `•` conservé ; `aria-label`. |
| `src/forge/useForgeDocument.ts` | `DocConfig.withName?` ; `setName` + `canRename` dans le retour + les deps `useMemo`. Réutilise le chemin `edit` (dirty=true), ne touche pas `id`. |
| `src/forge/ForgeShell.tsx` | `withName` sur `teamDoc`/`methodDoc` (pas `kitDoc`) ; props `onNameChange`/`disabled` au montage de `DocTitle` (`:182`). |
| `src/forge/DocBar.tsx` | Préremplir `saName`/`saId` depuis `doc.name` à l'ouverture de Save As (Q-4). |
| CSS (feuille de la forge, ex. `src/App.css` / `*.css` portant `.doctitle`) | Styler l'`<input>` en grand titre centré (fond transparent, hérite typo) ; état focus. Cosmétique, pas de logique. |
| `src/forge/useForgeDocument.test.ts` | Cas `setName` (dirty, id inchangé, no-op si null, canRename). |
| `src/forge/DocTitle.test.tsx` | Cas input éditable (onNameChange déclenché) + non-régression read-only. |
| `src/forge/DocBar.test.tsx` | (si Q-4 retenu) préremplissage Save As. |

**Rust : AUCUN changement — confirmé.** Le `name` transite déjà via `serialize*Md` (`mappers.ts`) ;
aucune commande ni pathguard à toucher.

---

## 8. Critères d'acceptation (vérifiables)

1. **Champ éditable présent** : sous Team et Méthode, `DocTitle` rend un `<input>` (rôle textbox)
   quand un artefact est ouvert ; sa valeur = le `name` courant.
2. **Frappe → nom** : taper dans le champ appelle `onNameChange` avec la valeur saisie ; `name`
   reflète la frappe (texte libre, accents/espaces/emoji conservés — non slugifié).
3. **`dirty` sur rename** : `setName("X")` sur un artefact ouvert ⇒ `dirty === true` et `•` visible.
4. **Non-destructif sur `id`** : `setName` **ne change pas** `id` ni `source` (un doc issu d'Open
   garde son `id` après rename ; un vierge garde `id===null`).
5. **No-op sur vide** : `setName` sans artefact (`artifact===null`) ⇒ aucun changement d'état ;
   le champ est `disabled` dans ce cas.
6. **Persistance du nom** : renommer un doc **déjà nommé** (id présent) puis Save ⇒ **même fichier**
   (`writes === ["<collection>/<id>.md"]`), frontmatter contenant le **nouveau** `name`, `dirty=false`.
7. **Parcours New complet** : `New` → champ éditable → `setName("Ma team")` → Save ⇒ bascule Save As ;
   l'invite Save As est **préremplie** (`nom = "Ma team"`, `id = "ma-team"`) ; Enregistrer écrit
   `<collection>/ma-team.md` (Q-4 retenu).
8. **Kit read-only** : sous l'onglet Kit, `DocTitle` n'expose **pas** de champ éditable (`canRename`
   faux) — le libellé reste affiché (Q-1).
9. **`•` préservé** : présent ssi `dirty`, retiré après Save (comportement §6 sœur inchangé).
10. **Accessibilité** : l'input a un `aria-label` ; atteignable et éditable au clavier.
11. **Façade unique** : `grep -rn "invoke(" src` hors `src/api/backend.ts` = **0** (C-8) ; **aucun**
    diff Rust (`git diff --stat src-tauri` vide pour ce lot).
12. **Non-régression** : `npm run test:all` + `cargo test` verts ; `DocTitle.test.tsx` read-only et
    tous les cas de `useForgeDocument.test.ts` existants restent verts ; Save As / garde inchangés.

---

## 9. Plan de tests attendu

**`useForgeDocument.test.ts` (ajouts)**
- `setName` sur artefact ouvert ⇒ `dirty=true`, `name` mis à jour, `id` **inchangé**, `source` inchangé.
- `setName` sur vierge (New) ⇒ `id` reste `null`, `dirty=true`.
- `setName` sans artefact (aucun New/Open) ⇒ no-op (`dirty` reste `false`, `artifact` reste `null`).
- `canRename` : vrai avec `withName` + artefact ouvert ; faux sans `withName` (config Kit) ; faux si
  `artifact===null`.
- Renommer + Save (doc déjà nommé) ⇒ `writes === ["methods/<id>.md"]`, texte contient le nouveau nom.

**`DocTitle.test.tsx` (ajouts + non-régression)**
- Avec `onNameChange` : rend un `textbox` de valeur `name` ; frappe déclenche `onNameChange` (verbatim).
- `disabled` (ou sans `onNameChange`) : pas de textbox, span read-only (les 3 tests actuels restent verts).
- `•` présent ssi `dirty` en mode éditable ; `aria-label` présent.

**`DocBar.test.tsx` (si Q-4 retenu)**
- Ouvrir Save As sur un doc de nom « Ma team » ⇒ champs préremplis `nom="Ma team"`, `id="ma-team"`.

---

## 10. Faits vérifiés sur le web (2026-07-15) + sources

- **Piège du saut de curseur (React controlled input)** : quand la valeur d'un `<input>` contrôlé est
  **transformée** de façon synchrone à la frappe (ex. slugification), le navigateur replace le curseur
  **en fin de champ**. **Conséquence de cadrage** : le champ nom **ne doit pas** normaliser la valeur
  (texte libre, aucun slug/trim à la frappe) — d'où le contrat « `name` = texte libre, `id` = slug »
  (§ 3, § 4.1-4.2). C'est aussi cohérent avec la sémantique déjà en place (l'id est slugifié **au Save
  As** via `slugifyId`, `useForgeDocument.ts:112-120,215`).
- **Pattern « titre de document éditable »** : un titre **toujours éditable** (input permanent stylé
  en titre, façon barre de titre Google Docs) est un pattern courant et **accessible** dès lors que
  l'input est **labellisé** — ce qui motive l'`aria-label` et le choix MVP « pas de bascule de mode »
  (§ 4.4). L'alternative click-to-edit est reportée (Q-3).

Sources :
- [Solving Caret Jumping in React Inputs — DEV Community](https://dev.to/kwirke/solving-caret-jumping-in-react-inputs-36ic)
- [Bug: cursor jumps to end of controlled input — facebook/react #18404](https://github.com/react/react/issues/18404)
- [Keep that cursor still! — giacomocerquone.com](https://giacomocerquone.com/blog/keep-input-cursor-still/)
- [Make your document more accessible (titres signifiants) — Google Docs Help](https://support.google.com/docs/answer/6199477?hl=en)

---

## 11. Questions d'arbitrage (à trancher au jalon)

- **Q-1 — Titre du Kit.** Le `Kit` n'a **pas** de champ `name` (`kit.ts:23-34`) : son libellé EST son
  `id` (`ForgeShell.tsx:113`). Éditer le « nom » du Kit reviendrait à éditer son `id` d'artefact,
  **désynchronisé** de l'`id` de persistance (bug : fichier `<id-doc>.md` ≠ frontmatter `id`). **Reco :
  titre Kit read-only au MVP** ; le renommage du Kit passe par Save As. → *Confirmer.*
- **Q-2 — Nom de départ d'un vierge.** Garder les **starters nommés** actuels (« Team iakaframe »,
  starter méthode) ou **vider le nom** (« sans-titre ») sur New pour inviter au nommage ? **Reco :
  garder le contenu starter, laisser renommer librement** (moindre surprise). → *Trancher.*
- **Q-3 — Pattern d'édition.** Input **toujours éditable** (reco MVP, façon Google Docs) vs
  **click-to-edit** (span → input au clic/double-clic, Enter valide / Escape annule). **Reco :
  toujours éditable au MVP**, click-to-edit différé. → *Confirmer.*
- **Q-4 — Préremplir Save As depuis le nom saisi.** Retenir dans ce lot le préremplissage
  `saName ← doc.name`, `saId ← slugifyId(doc.name)` (ferme le parcours New → nommer → Save) ? **Reco :
  oui, in-scope** (coût faible). → *Confirmer.*
- **Q-5 — Sémantique ARIA du titre éditable.** Un `<input>` ne peut pas porter `role="heading"`. **Reco :
  input labellisé (`aria-label`)**, on abandonne `role/aria-level` sur la variante éditable ; le span
  read-only conserve son `role="heading"`. → *Confirmer.*

---

## 12. Journal de décision

- **2026-07-15** — Le décideur demande un **champ nom éditable en ligne** dans le grand titre centré
  (`DocTitle`) et la **consolidation du geste New** (créer un vierge puis le nommer via ce champ).
  **Constat de cadrage** : le geste New est **déjà** couvert de bout en bout au niveau du hook ; le
  seul maillon manquant est le **champ éditable** + un **setter `setName`** (le hook n'en a pas, le
  `name` étant dérivé). **Tranché** : `setName`/`canRename` sur `useForgeDocument`, `withName?` par
  type dans `DocConfig` ; `DocTitle` éditable (input labellisé, texte **non normalisé** pour éviter le
  saut de curseur) ; **non-destructif** (jamais l'`id`) ; **Kit read-only** (pas de champ `name`) ;
  **zéro Rust / zéro nouvelle I/O** (le `name` part déjà en frontmatter au Save) ; préremplissage
  Save As pour fermer le parcours New. **Cadrage seul, aucun code de production.**

> Tant que ce jalon n'est pas validé, **aucune** implémentation. Ce lot ne produit que du
> **cadrage** ; le développement (Gimli) suit la validation du décideur.
