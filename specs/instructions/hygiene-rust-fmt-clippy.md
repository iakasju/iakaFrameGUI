# Instruction : Hygiène Rust — éteindre la dette `fmt` + `clippy` de `main`

> Rédigé au niveau **portefeuille** (🟡 Odin) le 2026-08-10. Consommé par ⚒️ Gimli (P2),
> gate 🏹 Legolas (P3). Doc en français, code et identifiants en anglais.
>
> **Nature du lot** : lot **court**, **purement mécanique**, **sans aucune fonctionnalité**.
> Il ne livre rien à l'utilisateur : il **rend au dépôt sa référence verte**.

---

## Problème

`main` est **rouge sur le socle Rust**, et l'était **avant** le lot auto-update — mesuré le
2026-08-06 par ⚒️ Gimli sur un **worktree isolé de `main`** (f5bd130), puis **re-mesuré
indépendamment** par 🏹 Legolas, qui a comparé les listes d'emplacements des deux côtés et
constaté un **delta nul** :

| Instrument | État de `main` |
|---|---|
| `cargo fmt --check` | exit `1` — **49 hunks / 6 fichiers** (`llm.rs` 30, `library_store.rs` 10, `handoff.rs` 4, `settings.rs` 3, `project_conf.rs` 1, `lib.rs` 1) |
| `cargo clippy --all-targets -- -D warnings` | exit `101` — **8 erreurs** : `library_store.rs:146-147`, `llm.rs:11-12`, `llm.rs:284`, `llm.rs:442`, `paths.rs:103-104` |

Nature des 8 : **6 `doc list item without indentation`** (pure présentation de doc-comments) et
**2 `too many arguments`** (`llm.rs:284`, `llm.rs:442`).

**Pourquoi ça compte, au-delà de l'esthétique.** Le gate du lot auto-update a dû être rendu
**borné** par arbitrage du décideur, et son exécutant a dû monter un worktree isolé pour prouver
que sa contribution était nulle. **Tant que cette dette vit, chaque futur lot Rust paiera ce
même prix** — et un jour quelqu'un ne le paiera pas, et une régression réelle passera pour de
la dette. C'est le filet de non-régression qui est en jeu, pas la propreté.

## Décisions de cadrage — non rediscutables dans ce lot

| # | Décision |
|---|---|
| **D1** | **Zéro changement de comportement.** Le lot est mécanique. Aucune signature publique modifiée, aucune logique touchée, aucun test réécrit pour « passer ». |
| **D2** | Les **6 `doc list item`** se corrigent dans le doc-comment lui-même, **jamais par un `#[allow]`** — ce sont des défauts de présentation réels. **AMENDÉ le 2026-08-10** (voir ci-dessous) : le geste dépend de ce que la ligne **dit**. Si elle **continue la liste**, on l'**indente**. Si c'est une **synthèse portant sur la liste entière**, on insère une **ligne vide** — clippy propose les deux voies et la ligne vide éteint le lint tout autant. |
| **D3** | Les **2 `too many arguments`** ne se refactorent **pas** dans ce lot : une struct de paramètres changerait la forme du code appelant, donc le comportement du diff, donc le périmètre. On les **tait par un `#[allow(clippy::too_many_arguments)]` porté sur la fonction concernée, avec un commentaire d'une ligne disant pourquoi** — un refactor éventuel est un autre lot, à cadrer. *Un `allow` motivé et localisé est une dette assumée et visible ; un `allow` global au niveau du crate serait une dette cachée : interdit.* |
| **D4** | `cargo fmt` est appliqué **tel quel**, sans `rustfmt.toml` ajouté ni option exotique : la référence est l'outil par défaut, celui que le gate lance. |

### Amendement du 2026-08-10 — D2 était une sur-généralisation

Relevé par ⚒️ Gimli dans son rapport (sans dévier du cadrage, comme il devait), **confirmé sur
pièce** par 🏹 Legolas au gate, qui a corrigé au passage la granularité : les 6 erreurs clippy ne
sont pas 6 phrases mais **3 phrases de 2 lignes**. Le partage est net, **2 cas sur 3** :

| Emplacement | Ce que la ligne dit | Geste juste |
|---|---|---|
| `paths.rs:103-104` | continue littéralement l'item `3)` puis ouvre le `4)` — le texte **appartient** à la liste | **indentation** (D2 d'origine, fidèle) |
| `library_store.rs:146-147` | « Mêmes gardes d'autorité **dans les deux cas** » — conclusion des **deux** items | **ligne vide** |
| `llm.rs:11-12` | « Ce n'est PAS un runner d'exécution […] la frontière reste entière » — conclusion de **tout l'en-tête** | **ligne vide** |

Pourquoi ça compte, et pourquoi ce n'est pas une coquetterie : indentée, la phrase de
`library_store.rs` se rattache visuellement au **seul second item**, et la doc rendue laisse
entendre que ces gardes d'autorité ne valent que pour les skills — **c'est faux**. Celle de
`llm.rs` devient un sous-paragraphe de « timeout dur sur le client », rattachement absurde.

**Leçon de cadrage, à retenir au-delà de ce lot** : une règle vérifiée sur un cas a été édictée
pour trois. Un cadrage qui fige un correctif **avant** d'avoir lu ce que le texte dit fabrique un
défaut là où il croyait en supprimer un — et l'exécutant, qui a raison d'appliquer une décision
annoncée non rediscutable, ne peut que le signaler après coup.

---

## Périmètre

**Dans le lot** : `cargo fmt` sur `src-tauri/`, correction des 6 `doc list item`, `allow` motivé
sur les 2 `too many arguments`.

**Hors du lot — à ne pas faire** : tout refactor de signature ; toute correction de logique
aperçue en chemin (**se signale, ne se corrige pas** — elle sortirait du périmètre mécanique et
rendrait le diff illisible) ; toute modification du front, des specs ou du CI ; tout `#[allow]`
au niveau du crate ou du module.

---

## Étapes

1. **Mesurer AVANT**, et conserver les sorties : `cargo fmt --check` (compter les `Diff in`),
   `cargo clippy --all-targets -- -D warnings` (relever les 8 emplacements). C'est la ligne de
   base contre laquelle le gate vérifiera qu'on a éteint **ces** défauts et pas fabriqué d'autres.
2. **`cargo fmt`** — un commit dédié, **rien d'autre dedans**. Un commit de formatage doit rester
   lisible comme tel : mélangé à autre chose, il rend le reste invisible à la relecture.
3. **Les 6 `doc list item`** — un commit dédié (D2).
4. **Les 2 `too many arguments`** — un commit dédié, `allow` porté sur la fonction + commentaire
   d'une ligne (D3).
5. **Mesurer APRÈS** : `cargo fmt --check` exit `0`, `cargo clippy --all-targets -- -D warnings`
   exit `0`, `cargo test` **inchangé** (116 passed), `npm run lint:all` et `npm run test`
   inchangés (1151 tests).

---

## Critères d'acceptation

| # | Critère | Vérification |
|---|---|---|
| **C1** | Le socle Rust est vert | `cargo fmt --check` → exit `0` ; `cargo clippy --all-targets -- -D warnings` → exit `0` |
| **C2** | Aucune régression | `cargo test` → **116 passed** (inchangé) ; `npm run lint:all` → `0` ; `npm run test` → **1151 passed** (inchangé) |
| **C3** | Zéro changement de comportement | le diff ne contient **que** du formatage, de l'indentation de doc-comment et 2 attributs `allow` + leurs commentaires. Aucune ligne de logique, aucune signature modifiée |
| **C4** | Aucun `allow` global | `git grep -n "allow(clippy" -- src-tauri` ne rend que **2** occurrences, toutes deux **sur une fonction**, jamais en tête de crate ou de module |
| **C5** | `main` redevient une référence | après fusion, un worktree neuf de `main` mesure `fmt` et `clippy` à **0** — le prochain lot Rust n'aura plus à prouver son innocence |

---

## Piège connu

**Ne pas confondre l'invocation du gate avec celle du confort.** `cargo clippy --all-targets`
**sans** `-D warnings` sort `0` en affichant 8 *warnings* ; **avec** `-D warnings` il sort `101`
en les qualifiant d'*erreurs*. Les deux formes décrivent le même dépôt. Le gate lance la seconde :
c'est elle qui fait foi, et une mesure rendue avec la première serait **inopposable**.
