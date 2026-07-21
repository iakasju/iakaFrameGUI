# D-7 — Rendre VISIBLE la perte à la résolution des constituants d'une Méthode

> **Statut** : cadrage fermé, en attente du gate humain (P1→P2).
> **Défaut traité** : D-7, posé au § 7 de `iakaframe/specs/instructions/vocabulaire-roles-agnostique.md`.
> **Mesuré sur** : `iakaFrameGUI` **main** (lecture seule), le 2026-07-20.
> **Ne code rien avant lecture du § 3 (arbitrages) et du § 7 (critères d'acceptation).**

---

## 0. Avertissement de lecture — ce cadrage a CORRIGÉ trois hypothèses du brief

Ce lot appartient à la famille de défauts « la garde se trompe en silence et affiche vert ». Il
serait malvenu de le cadrer sur des suppositions. Trois points du brief d'entrée ont été **mesurés
et infirmés** ; ils changent le périmètre, pas seulement la rédaction.

| Hypothèse du brief | Mesure sur `main` | Effet |
|---|---|---|
| « la garde `vendor-check` impose une parité byte-à-byte — vérifie si `method.ts` est dans le périmètre vendoré, **ce point est structurant** » | **`method.ts` n'est PAS dans le périmètre vendoré.** `iakaframe/cli/src/lib/vendor.js` (`FIXTURES_REL`, `fixtureTable()`) ne couvre que **21 fichiers `.md`** sous `packages/core/__tests__/fixtures/` (17 copies + 4 dérivées). Aucun `.ts` de `src/`. | **Contrainte levée.** Le point n'est pas structurant. Il subsiste **une** contrainte réelle, différente et étroite → § 5.2. |
| « le motif se retrouve peut-être ailleurs dans le paquet » (point 4) | **Non.** Les autres `.filter(… !== null)` du paquet (`frame.ts`, `team.ts`, `workflow.ts`, `binding.ts`, `scaffold.ts`) sont des filtres **de parse** (un enregistrement illisible est écarté), pas des filtres **de résolution**. Famille différente, à ne pas confondre. | Périmètre **confiné à `method.ts`** — 3 occurrences, pas davantage. |
| « une méthode étrangère (BMAD/MetaGPT) est le cas où les ids inconnus sont probables » | **Le cas n'est pas à venir : il est déjà là.** La méthode **canonique iakaframe elle-même**, chargée depuis son fichier, perd **16 références sur 35** en silence. → § 1.2. | Le motif du lot cesse d'être préventif. Il devient **correctif**. |

---

## 1. Le problème

### 1.1 Le fait brut

`packages/core/src/method.ts` lignes 100-119 — trois résolveurs, un même geste :

```
principlesForMethod(m) → m.principleIds.map(principleById).filter(p => p !== undefined)
ritualsForMethod(m)    → m.ritualIds.map(ritualById).filter(r => r !== undefined)
scaffoldsForMethod(m)  → m.scaffoldIds.map(scaffoldById).filter(s => s !== undefined)
```

Un id absent du catalogue du cœur **disparaît**. Pas d'exception, pas d'avertissement, pas de trace,
pas de compteur. L'appelant reçoit un tableau plus court et **ne peut pas savoir** qu'il est plus
court : la longueur attendue n'est nulle part. L'assemblage paraît réussi.

Le commentaire « (ids inconnus filtrés) » documente la perte **pour qui lit le source**. Il n'en
informe **ni l'appelant, ni l'utilisateur**. C'est exactement la forme que prend la règle (d) gravée
le 2026-07-20 quand on l'enfreint : *l'intention est écrite, la mesure n'est pas produite.*

**Un quatrième porteur, non listé au brief** : `resolveWorkflow` (l. 89-93) se replie sur le
canonique quand `workflowId` est inconnu — même perte silencieuse, avec une aggravation : le
repli **fabrique un résultat plausible**. L'utilisateur voit un workflow complet et n'a aucun moyen
de savoir que ce n'est pas le sien. Il est couvert par ce lot.

### 1.2 La mesure qui fonde le lot — 16 références perdues sur la méthode canonique

`iakaframe/methods/iakaframe.md` (le fichier réel, chargé par la GUI via
`ForgeShell.tsx:127` → `parseMethodMd`) déclare 35 références. Résolues contre les catalogues du
cœur de `iakaFrameGUI`, voici le résultat exact, **vérifié id par id** :

| Champ | Déclaré (fichier) | Catalogue du cœur | Perdus |
|---|---|---|---|
| `ritualIds` | 5 | 5 | **0** ✅ |
| `principleIds` | 18 | 14 | **4** — `interruption-minimale-odin`, `merge-versionnement`, `canon-avant-citation`, `preuve-avant-declaration` |
| `scaffoldIds` | `portefeuille`, `projet` | `portfolio`, `project` | **2 — la totalité** (français vs anglais) |
| `guardrailIds` | `identity`, `perimeter`, `delegation` | `identity-guard`, `perimeter-guard`, `delegation-guard` | **3 — la totalité** (le fichier porte les `kind`, le catalogue les `id`) |
| `roleKeys` | 8 | 7 | **6** (seuls `portefeuille` et `coordination` coïncident) |
| `workflowId` | `iakaframe-3phases` | `iakaframe-canonical` | **1** (repli silencieux sur le canonique) |
| **Total** | **35** | | **16** |

> **Deux faits qu'il faut regarder en face.**
>
> 1. **Les scaffolds et les gardes-fous sont perdus à 100 %.** Pas dégradés : perdus. Personne ne le
>    sait, parce que rien ne le dit.
> 2. Parmi les 4 principes perdus figure **`preuve-avant-declaration`** — le principe même dont
>    l'infraction a produit ce défaut. La forge perd silencieusement le principe qui interdit de
>    déclarer sans mesurer. Ce n'est pas une ironie décorative : c'est la démonstration que la perte
>    silencieuse **ne se signale jamais d'elle-même**, y compris quand elle porte sur ce qui aurait
>    permis de la détecter.

### 1.3 Ce qui existe DÉJÀ et qui ne couvre pas le défaut

Il faut être précis, sinon on livre un doublon. Deux dispositifs existent :

| Dispositif | Référentiel | Moment | Portée | Bloquant |
|---|---|---|---|---|
| **I1** — `src/forge/refs.ts` (`makeMethodValidateRefs`) | le **pool sur disque** `library/<type>/` | au **Save** | les 6 constituants | **oui**, refuse d'écrire |
| **Résolveurs** — `method.ts` | le **catalogue codé en dur** du cœur (`CATALOG_*`) | à l'**affichage** | 3 constituants + workflow | non — **silencieux** |

**Ce sont deux référentiels différents, et c'est tout le défaut.** Un id peut exister dans le pool
(I1 vert, Save autorisé) et être absent du catalogue du cœur (résolveur muet, constituant invisible).
La mesure du § 1.2 est précisément ce cas : les 4 principes perdus **existent** dans
`iakaframe/library/principles/` (18 fichiers) — I1 les valide, le catalogue (14 entrées) les ignore.

> **La garde est verte et l'affichage est faux, en même temps, pour la même méthode.** C'est la
> signature exacte du motif à 7 occurrences de la session du 2026-07-20. D-7 en est la huitième, et
> elle est toujours vivante sur `main`.

### 1.4 Ce que ce lot NE ferme PAS — à acter explicitement

D-7 a été posé comme un **arbitrage de portée** : « les rôles seuls, ou le modèle (a)-(f) entier ? ».
La cause racine est que **les six constituants ont un catalogue codé en dur dans le cœur** ; la
guérison complète est de résoudre les constituants depuis le **référentiel chargé** (le chantier
d'agnosticisme, chiffré ~4 j-h pour les rôles seuls dans le lot `vocabulaire-roles-agnostique`).

**Ce lot-ci ne fait pas cela, et ne doit pas prétendre le faire.** Il sépare deux questions que le
brief mélangeait :

- **« la perte doit-elle exister ? »** → question d'agnosticisme. **Hors périmètre.**
- **« la perte doit-elle être visible ? »** → question de loyauté du logiciel. **C'est ce lot.**

Traiter la seconde d'abord est le bon ordre, pour une raison qui n'est pas de confort : **le
chantier d'agnosticisme n'a aujourd'hui aucun instrument de mesure de son propre avancement.** Ce
lot en produit un — le compteur passe de 16 vers 0 — et il transforme un chantier jugé à
l'intention en chantier jugé au fait. Il **désamorce** le grand lot au lieu de le retarder.

---

## 2. Ce que le lot doit produire

Une **fonction de rapport pure** dans le cœur, qui dit ce que la résolution a perdu, et une
**restitution non bloquante** dans l'atelier Méthode. Rien d'autre.

---

## 3. Points à trancher — arbitrages et recommandations

### D7-a — Posture face à un id inconnu : échec dur, contrat modifié, ou signal séparé ?

**Reco : signal séparé, additif. Les trois résolveurs gardent un comportement inchangé.**

Trois options ont été pesées :

| Option | Verdict |
|---|---|
| **Échec dur** (lever sur id inconnu) | ⛔ **Rejetée.** Contredit frontalement la doctrine du cœur, écrite en tête de `method.ts` : « type pur + parseur défensif — jamais d'exception ». Surtout : casser sur un id étranger, c'est rendre la forge **inutilisable** sur une méthode étrangère, à rebours de l'agnosticisme AR-9. Le principe directeur du brief est explicite : la perte doit être **visible**, pas fatale. |
| **Contrat de retour modifié** (`{ items, missing }`) | ⛔ **Rejetée au MVP.** Touche les 3 résolveurs, leur appelant GUI, 4 assertions de test, et paie un coût de rupture pour une information que l'option retenue fournit à coût nul. Sur-ingénierie au sens du CLAUDE.md. |
| **Fonction de rapport séparée** | ✅ **Retenue.** Additive, non bloquante, zéro rupture, zéro risque de régression sur les sorties existantes. |

**L'argument décisif n'est pas le coût, c'est la cohérence** : le dépôt a **déjà tranché cette
question exacte, dans le même sens, un étage plus haut.** `packages/core/src/frame.ts` traite
l'intégrité référentielle par un rapport séparé — `FrameMissingRef { source, field, id }` +
`FrameIntegrityReport { ok, missing }` + `checkFrameRefs(...)` — sans jamais modifier le contrat des
lecteurs. Mieux : le commentaire de `FrameMissingRef` l. 88-92 donne comme exemples de son propre
usage `source: "method:iakaframe"` et **`field: "principleIds"`**. La forme visée par D-7 est déjà
écrite, déjà testée, et documentée avec le champ exact de ce lot. **On ne conçoit pas ici, on
applique.**

### D7-b — Traitement uniforme sur les 6 constituants, ou seulement sur les 3 résolveurs ?

**Reco : uniforme sur les 6 constituants + `workflowId`.**

Le brief pose la question (point 5) au titre du modèle « Méthode élargi » du 2026-07-14. La mesure
la tranche : **les deux constituants perdus à 100 % (scaffolds, gardes-fous) sont précisément ceux
qui n'ont pas de résolveur.** Se limiter aux 3 résolveurs existants laisserait invisibles les deux
pertes les plus totales — c'est-à-dire reconduirait le défaut en croyant le corriger.

Un traitement partiel réintroduit par ailleurs la faute de fond : *certaines pertes seraient
signalées, d'autres resteraient muettes*, sans qu'aucune règle lisible ne dise lesquelles. Un
lecteur ne pourrait plus déduire d'un rapport vide que rien n'est perdu. **Un rapport partiel est
pire qu'aucun rapport, parce qu'il se lit comme complet.**

Coût de l'uniformité : nul. Les catalogues d'ids (`CATALOG_GUARDRAIL_IDS`, `CANONICAL_ROLE_KEYS`)
sont déjà exportés et déjà importés par `method.ts` (l. 16-20).

### D7-c — Où le signal remonte-t-il, et sous quelle forme ?

**Reco : un bandeau non bloquant en tête du rail de l'atelier Méthode.**

Vérification des appelants réels (le brief demandait de mesurer avant de trancher) :

- `principlesForMethod` → **un seul** appelant de production : `src/forge/ateliers/MethodeAtelier.tsx:114`.
- `ritualsForMethod`, `scaffoldsForMethod` → **aucun appelant de production**. Uniquement
  `packages/core/__tests__/method.test.ts`.

La surface GUI est donc **unique et étroite** : `MethodeAtelier`. Elle importe déjà `RailNote`
(l. 26) — le composant de note de rail existe, il n'y a pas de composant à créer.

Contenu du bandeau : le **nombre** de références non résolues, puis le détail **par champ**
(`champ · id`). Le nombre d'abord, parce que c'est lui qui se compare dans le temps et qui sert
d'instrument au chantier d'agnosticisme (§ 1.4).

> **Note pour l'implémenteur** : ne pas afficher ces ids comme des *erreurs de l'utilisateur*. Ce ne
> sont pas des fautes de frappe — ce sont des références **légitimes** que le cœur ne sait pas encore
> résoudre. La formulation doit désigner le cœur comme la limite, pas la méthode comme fautive.
> Rédaction retenue : « non résolus par le catalogue du cœur ». Le contraire installerait chez
> l'utilisateur l'idée que sa méthode est invalide, alors que c'est la forge qui est incomplète.

### D7-d — Le signal doit-il bloquer le Save, comme I1 ?

**Reco : non. Strictement non bloquant.**

I1 est bloquant à bon droit : une référence absente du **pool** signale une méthode qui se contredit
elle-même. Une référence absente du **catalogue du cœur** signale l'inverse — une méthode
parfaitement valide que **notre implémentation** ne couvre pas encore. Bloquer reviendrait à
interdire d'éditer la méthode canonique iakaframe (16 références) et **toute** méthode étrangère :
la forge se fermerait à son propre objectif.

### D7-e — Le bruit du jour 1 : 16 références signalées sur la méthode canonique. Acceptable ?

**Reco : oui, acceptée telle quelle — et c'est le seul point où le décideur doit se prononcer en
connaissance d'un effet visible immédiat.**

Dès la livraison, ouvrir la méthode canonique affichera un bandeau listant 16 références non
résolues, dont 6 `roleKeys` et 3 `guardrailIds`. **Cet affichage sera exact.** Ces 16 références
sont perdues aujourd'hui ; la seule chose qui change est qu'on le saura.

Deux réserves honnêtes, que je ne masque pas :

1. **Ça aura l'air d'une régression.** Un écran propre devient un écran qui signale 16 problèmes. Il
   faut le dire à l'avance — c'est fait ici — sinon la livraison sera lue comme une casse.
2. **Une partie du signal recoupe un chantier déjà cadré.** Les 6 `roleKeys` relèvent de
   `vocabulaire-roles-agnostique.md`, en cours. Le bandeau les affichera aussi. **Je recommande de
   ne pas les filtrer** : masquer un signal vrai au motif qu'un autre lot s'en occupe, c'est
   reconduire exactement le défaut qu'on ferme. Le bandeau dit ce qui est ; l'ordonnancement des
   corrections est une question de backlog, pas d'affichage.

**Option de repli** si le décideur juge le bruit inacceptable au MVP : livrer la fonction de rapport
du cœur (§ 4.1) **sans** le bandeau GUI (§ 4.2), et ne brancher l'affichage qu'après la résorption
des divergences. La perte resterait invisible à l'utilisateur mais deviendrait **mesurable et
testable** — soit environ 70 % de la valeur du lot pour 60 % de la charge. Je ne recommande pas ce
repli, mais il est cohérent et je le documente plutôt que de forcer la main.

### D7-f — La divergence mesurée doit-elle être corrigée dans ce lot ?

**Reco : non. Aucune correction de divergence ici.**

Les 16 références ne se corrigent pas au même endroit ni par la même main : `roleKeys` relève du lot
rôles ; `scaffoldIds` (FR/EN) et `guardrailIds` (`kind` vs `id`) relèvent d'un arbitrage de
vocabulaire non encore rendu — et pour les scaffolds, il n'est **pas** évident que ce soit le
fichier qui ait tort plutôt que le catalogue. Trancher cela ici, dans un lot d'instrumentation,
serait décider six vocabulaires en passant, sans cadrage. **Ce lot mesure. Il ne répare pas.**

Livrable attendu à la place : un **item de dette au backlog** portant le chiffre de départ (16) et
sa décomposition, pour que la résorption soit suivie.

---

## 4. Contenu du lot

### 4.1 Cœur — la fonction de rapport (`packages/core/src/method.ts`)

Ajouter, **sans modifier les fonctions existantes** :

- Un type de référence non résolue, **calqué sur `FrameMissingRef`** (`source`, `field`, `id`).
  Réutiliser le type de `frame.ts` s'il s'importe sans cycle ; sinon en déclarer un local de **forme
  identique** (mêmes noms de champs, même ordre). Ne pas inventer une troisième forme.
- Une fonction pure `unresolvedRefsForMethod(method: Method)` retournant la liste des références que
  les catalogues du cœur ne résolvent pas, couvrant **les 6 constituants + `workflowId`** (D7-b).
- `field` porte le **nom exact du champ** de `Method` (`principleIds`, `ritualIds`, `scaffoldIds`,
  `guardrailIds`, `roleKeys`, `workflowId`) — c'est la convention déjà tenue par `refs.ts` et
  `frame.ts`, et ce qui rend les trois rapports lisibles ensemble.
- Ordre de sortie **déterministe** : ordre des champs ci-dessus, puis ordre de déclaration des ids
  dans la méthode. Un rapport dont l'ordre varie n'est pas comparable d'une exécution à l'autre, et
  ne peut pas servir d'instrument de suivi.
- Défensive comme le reste du fichier : **jamais d'exception**, y compris sur une `Method` aux
  tableaux vides.
- Exporter depuis `packages/core/src/index.ts`.

**Interdits explicites** : ne pas modifier la signature ni le corps de `principlesForMethod`,
`ritualsForMethod`, `scaffoldsForMethod`, `resolveWorkflow`. Ne pas ajouter de `console.warn` dans
le cœur (effet de bord dans un module pur ; invisible en production ; intestable proprement).

### 4.2 GUI — la restitution (`src/forge/ateliers/MethodeAtelier.tsx`)

- Appeler `unresolvedRefsForMethod(method)` et, si la liste est non vide, rendre un `RailNote` en
  **tête du rail**, avant la section Workflow.
- Contenu : le compte total, puis le détail `champ · id`.
- **Non bloquant** : aucune désactivation de contrôle, aucun changement du flux de Save (D7-d).
- Liste vide → **aucun élément rendu** (pas de bandeau vert « tout va bien » : un bandeau permanent
  cesse d'être lu, et c'est un bandeau non lu qui a produit ce défaut).
- Corriger au passage le commentaire trompeur de `MethodeAtelier.tsx:110` — « idempotent, défensif
  (id inconnu filtré aux résolveurs) » — qui présente aujourd'hui la perte comme une propriété
  rassurante.

### 4.3 Backlog

Inscrire l'item de dette de D7-f : « résorber les 16 références non résolues de la méthode
canonique », avec la décomposition du § 1.2 et le renvoi vers ce fichier.

---

## 5. Contraintes vérifiées

### 5.1 Parité CLI↔GUI

**Aucun impact.** Recherche faite dans `iakaframe/cli/` : il n'existe pas d'équivalent CLI de
`principlesForMethod`/`ritualsForMethod`/`scaffoldsForMethod`. Le CLI valide les références contre
le **pool** (`checkRefs`, `cli/src/lib/library.js`), jamais contre un catalogue codé — il n'a donc
pas ce défaut, et rien à mettre en parité. La fonction ajoutée est **propre à la GUI**.

### 5.2 `vendor-check` — la seule contrainte réelle, et elle est étroite

`method.ts` est hors périmètre vendoré (§ 0). **Mais** `checkVendor` (`vendor.js` l. 228-237) signale
en drift toute fixture **surnuméraire** : tout fichier `.md` non attendu sous
`packages/core/__tests__/fixtures/` fait rougir la garde, sur les deux dépôts.

> ⚠️ **Contrainte pour l'implémenteur : n'ajouter AUCUN fichier `.md` sous
> `packages/core/__tests__/fixtures/`.** Les cas de test se construisent **en ligne**
> (objets `Method` littéraux) ou depuis les fixtures **déjà vendorées**. Un fichier de test
> `.ts`/`.tsx` ailleurs dans `__tests__/` est sans effet sur la garde (elle ne scanne que `.md`
> sous `fixtures/`).

Heureuse conséquence : la fixture nécessaire **existe déjà**.
`packages/core/__tests__/fixtures/method.iakaframe-wrapped.md` est documentée dans
`methodMd.test.ts:48` comme la « copie CONFORME du fichier réel » — c'est la copie vendorée de
`iakaframe/methods/iakaframe.md`, donc du cas mesuré au § 1.2. Le cas d'acceptation le plus fort du
lot se joue sur une fixture existante, sans en ajouter aucune.

### 5.3 Tests existants

`packages/core/__tests__/method.test.ts` l. 70-88 (`describe("résolveurs de composants…")`) reste
**valide sans modification** : le comportement des résolveurs ne change pas. Les tests nouveaux
s'ajoutent, aucun ne se réécrit. C'est le bénéfice direct de D7-a.

---

## 6. Hors périmètre — à ne pas faire

1. Rendre le cœur agnostique / résoudre les constituants depuis le référentiel chargé (§ 1.4).
2. Corriger l'une quelconque des 16 divergences mesurées (D7-f).
3. Réconcilier les vocabulaires de rôles — lot `vocabulaire-roles-agnostique.md`.
4. Modifier le comportement, la signature ou la sortie des 3 résolveurs et de `resolveWorkflow`.
5. Toucher à I1 (`refs.ts`), à `checkFrameRefs`, ou au flux de Save.
6. Ajouter une fixture `.md` (§ 5.2).
7. Étendre le rapport aux `Team`, `Kit` ou `Binding` — même famille de motif, autre lot.

---

## 7. Critères d'acceptation

Numérotés, vérifiables, cas **nominal** et cas **id inconnu** couverts.

### Cœur

**A-1** — `unresolvedRefsForMethod(IAKAFRAME_CANONICAL_METHOD)` retourne **`[]`**.
*(Cas nominal. La méthode canonique en mémoire est construite depuis les catalogues : elle ne peut
rien perdre. Ce test est le garde-fou anti-faux-positif — sans lui, une fonction qui signalerait tout
passerait les autres critères.)*

**A-2** — Pour une `Method` littérale déclarant `principleIds: ["qualite", "inconnu-42"]` et
`ritualIds: ["fantome"]`, le rapport contient **exactement 2** entrées :
`{ field: "principleIds", id: "inconnu-42" }` et `{ field: "ritualIds", id: "fantome" }`.
`"qualite"`, qui est résolu, **n'apparaît pas**. *(Cas de l'id inconnu, minimal.)*

**A-3** — Le rapport couvre les **6 constituants + `workflowId`** : un cas déclarant un id inconnu
dans **chacun** des 7 champs produit **7** entrées, une par champ, avec le `field` exact (D7-b).

**A-4** — `workflowId` inconnu → **une** entrée `{ field: "workflowId", … }`, **et**
`resolveWorkflow` retourne toujours `IAKAFRAME_CANONICAL_WORKFLOW` (le repli est conservé, il est
seulement devenu visible).

**A-5** — **Cas de référence, sur fixture vendorée existante.** `parseMethodMd` appliqué à
`fixtures/method.iakaframe-wrapped.md`, puis `unresolvedRefsForMethod`, produit **exactement 16**
entrées, réparties ainsi :

| `field` | Nombre | Ids attendus |
|---|---|---|
| `principleIds` | 4 | `interruption-minimale-odin`, `merge-versionnement`, `canon-avant-citation`, `preuve-avant-declaration` |
| `scaffoldIds` | 2 | `portefeuille`, `projet` |
| `guardrailIds` | 3 | `identity`, `perimeter`, `delegation` |
| `roleKeys` | 6 | les 6 de `roleKeys` absents de `CANONICAL_ROLE_KEYS` |
| `workflowId` | 1 | `iakaframe-3phases` |
| `ritualIds` | **0** | — |

> Si ce test échoue à la livraison, **ne pas ajuster le chiffre attendu pour le faire passer** :
> vérifier d'abord si la fixture ou un catalogue a bougé depuis le 2026-07-20. Aligner l'attendu sur
> l'observé sans l'expliquer serait rejouer le défaut que ce lot ferme.

**A-6** — Aucune exception sur entrée dégénérée : `Method` à tableaux vides → `[]` ; tableaux
contenant des chaînes vides → pas de plantage.

**A-7** — Ordre de sortie déterministe : deux appels successifs sur la même `Method` produisent des
listes **strictement égales** (`toEqual` sur le tableau ordonné).

**A-8** — **Non-régression** : `principlesForMethod`, `ritualsForMethod`, `scaffoldsForMethod`,
`resolveWorkflow` ont des sorties **inchangées**. Les tests l. 70-88 de `method.test.ts` passent
**sans avoir été modifiés** (à vérifier au diff : si ce fichier apparaît modifié dans ces lignes,
le critère est en échec).

**A-9** — La fonction et son type sont exportés depuis `@iakaframe/core` (import direct depuis un
test).

### GUI

**A-10** — Méthode sans référence non résolue → **aucun bandeau rendu** dans `MethodeAtelier`
(absence du nœud, pas seulement un texte vide).

**A-11** — Méthode avec ≥ 1 référence non résolue → bandeau présent en tête de rail, affichant le
**compte** et le détail `champ · id`.

**A-12** — Le bandeau est **non bloquant** : aucun contrôle désactivé, `insert` fonctionne, le flux
de Save est inchangé (D7-d).

**A-13** — Le commentaire `MethodeAtelier.tsx:110` ne présente plus le filtrage comme une propriété
rassurante (§ 4.2).

### Qualité

**A-14** — `npm run lint:all` (typecheck + lint) : **0 erreur**.

**A-15** — Suite `@iakaframe/core` **verte**, avec un total **strictement supérieur** au total avant
lot (les tests s'ajoutent, aucun ne disparaît — un total égal ou inférieur signale une suppression).

**A-16** — `iakaframe vendor-check` : statut **`clean`**, `checked = 17`, `derived = 4`. *(Vérifie
qu'aucune fixture surnuméraire n'a été introduite — § 5.2.)*

### Recette humaine

**A-17** — Ouvrir l'onglet Méthode (`npm run tauri dev`), charger `iakaframe/methods/iakaframe.md`,
constater le bandeau et ses 16 entrées ; puis, sur une méthode neuve créée depuis le stock du rail,
constater **l'absence** de bandeau.

---

## 8. Estimation — gate P1→P2

| Poste | Charge |
|---|---|
| **C1** — `unresolvedRefsForMethod` + type + export (cœur) | **0,25 j-h** |
| **C2** — Tests cœur A-1 … A-9 (dont A-5 sur fixture existante) | **0,25 j-h** |
| **C3** — Bandeau `RailNote` + tests GUI A-10 … A-13 | **0,25 j-h** |
| **C4** — Backlog (D7-f) + vérifications A-14 … A-16 | **0,25 j-h** |
| **Total** | **≈ 1 j-h** |

**Complexité : faible.** **Risque de régression : faible** — le lot est purement additif ; le seul
code de production modifié est un `RailNote` ajouté et un commentaire corrigé.

**Inconnues susceptibles de faire glisser l'estimation :**

1. **La plus probable — D7-e vire au débat.** Le chiffrage suppose que le bruit du jour 1 est
   accepté. S'il ouvre une discussion sur le filtrage des `roleKeys`, ou si le repli « cœur sans
   bandeau » est retenu, l'arbitrage coûtera plus que le code. **C'est un risque de cadrage, pas
   d'exécution.**
2. **Import de `FrameMissingRef` depuis `method.ts`** : si un cycle d'import apparaît, repli sur un
   type local de forme identique (+0,1 j-h). Non vérifié à ce cadrage — je le déclare plutôt que de
   le supposer résolu.
3. **A-5 pourrait échouer d'emblée** si la fixture vendorée a divergé du fichier source depuis ma
   mesure. Diagnostic, pas dépassement : +0,1 j-h — et l'échec serait alors une **information de
   valeur** sur un drift de vendorage.
4. **Rendu du bandeau** : si `RailNote` ne se prête pas à une liste structurée, un peu de CSS
   (+0,1 j-h).

**Ce n'est pas un engagement ferme** : un ordre de grandeur assumé et révisable, à confronter au
temps réel à la clôture du lot.

---

## 9. Fichiers concernés

| Fichier | Nature |
|---|---|
| `packages/core/src/method.ts` | **ajout seul** (§ 4.1) — l. 100-119 non modifiées |
| `packages/core/src/index.ts` | ajout d'export |
| `packages/core/__tests__/method.test.ts` | tests ajoutés ; l. 70-88 **intouchées** (A-8) |
| `src/forge/ateliers/MethodeAtelier.tsx` | bandeau + commentaire l. 110 |
| `CLAUDE.md` (backlog) ou `~/work/BACKLOG.md` | item de dette (D7-f) |

**Lecture seule / non modifiés** : `refs.ts`, `frame.ts`, `principle.ts`, `ritual.ts`,
`scaffold.ts`, `guardrail.ts`, `roles.ts`, `workflow.ts`, `iakaframe/methods/iakaframe.md`, et
l'ensemble de `packages/core/__tests__/fixtures/`.

---

## 10. Références

- `iakaframe/specs/instructions/vocabulaire-roles-agnostique.md` § 1.5, § 1.7, § 7 (D-7) — origine du
  défaut et modèle (a)-(f) du 2026-07-14.
- `iakaframe/specs/instructions/garde-vendor-check-cross-repo.md` + `iakaframe/cli/src/lib/vendor.js`
  — périmètre vendoré (§ 5.2).
- `iakaframe/library/principles/preuve-avant-declaration.md` — la règle (d) du 2026-07-20.
- `packages/core/src/frame.ts` l. 86-100 — `FrameMissingRef` / `FrameIntegrityReport`, forme réutilisée.
- `src/forge/refs.ts` — I1, le dispositif voisin à ne pas dupliquer (§ 1.3).
