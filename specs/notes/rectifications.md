# Registre des rectifications

> **Ce fichier est en APPEND SEUL.** On n'y corrige rien, on n'y supprime rien : on **ajoute**.
> Une entrée décrit un **message de commit devenu faux** et rétablit le fait, **sans réécrire
> l'historique git** (`reset --hard` et `push --force` sont proscrits côté agent, et les commits
> concernés sont déjà poussés).

## Pourquoi ce fichier existe

Un message de commit est immuable une fois poussé. Quand il **affirme un fait faux** — typiquement
un « gate PASS » qui n'a pas été mesuré — on ne peut pas le corriger, mais on peut faire en sorte
qu'il **ne soit pas le dernier mot**. C'est le rôle de ce registre : rendre la rectification
**consultable**.

**Pourquoi un fichier versionné et non `git notes`.** Les notes sont techniquement idéales (elles
s'attachent au commit sans le réécrire), mais elles ne sont **pas poussées par défaut**
(`refs/notes/*` exige une refspec explicite) et Forgejo les affiche mal. **Une rectification que
personne ne voit ne rectifie rien.** Un fichier versionné est moins élégant et plus lu.

---

## `8ae5748` — « gate Legolas PASS » — RECTIFIÉ le 2026-07-21

**Ce que le message affirme**
`merge(gen-fixtures): geste de regeneration des fixtures vendorees (gate Legolas PASS)` (20/07).

**Ce qui était vrai**
Le lint était **ROUGE**. `packages/core/scripts/gen-fixtures.mjs` — fichier **introduit par ce
même lot** — produisait **11 erreurs ESLint** : 10 × `no-undef` sur `process`
(l. 62, 95, 131, 133, 135, 138, 140, 143, 146, 147) et 1 × `no-irregular-whitespace` (l. 81).

**Cause**
Cause **structurelle**, non fautive d'inattention : `eslint.config.js` n'accordait de globals Node
à **aucun `.mjs` hors racine**. Le bloc des globals navigateur était limité aux `.ts/.tsx` ; le bloc
Node était limité à `*.config.{js,ts}` **à la racine**. La configuration n'avait **jamais prévu la
catégorie « script d'outillage »** — tout futur `.mjs` d'outillage aurait reproduit le défaut.

**Découvert par**
**Legolas**, pendant le gate du lot D-7 (21/07), **en re-mesurant** au lieu de faire confiance au
rapport de l'agent précédent. C'est ce geste — et lui seul — qui a révélé l'incident.

**Fermé par**
Lot **D-8** (`specs/instructions/d8-gate-menteur-mesure-avant-verdict.md`), dont cette
rectification fait partie. D-8 ajoute à `eslint.config.js` un bloc couvrant la **catégorie**
« outillage Node ESM » (`globals.nodeBuiltin`), corrige le BOM l. 81, crée les scripts `lint:all`
et `test:all` que la doc prescrivait sans qu'ils existent, et grave dans `CLAUDE.md` le **format
de verdict contraint**.

**Portée**
**Incident unique.** 10 commits portent « gate Legolas PASS » ; les **8 autres** ne sont pas
concernés — 7 d'entre eux (15-16/07) **précèdent l'existence** du fichier fautif, et `e9add1a`
(D-7, 21/07) est le lot qui a **découvert** l'incident. Bornage **re-mesuré** :

```
$ for c in $(git log --all --grep='[Gg]ate Legolas PASS' --format='%h'); do
    git cat-file -e "$c:packages/core/scripts/gen-fixtures.mjs" 2>/dev/null \
      && echo "$c PRESENT" || echo "$c absent"; done
e9add1a PRESENT
8ae5748 PRESENT
9ecf97f absent   13f8fa0 absent   fc22eec absent   2a950fc absent
867c3c7 absent   7ef37d3 absent   b71e86f absent   8aad61b absent
```

**Exactement 2** commits portent le fichier, sur 10. Le bornage tient.

**Ce que l'incident enseigne**
Une règle interdisant le verdict non mesuré **existait déjà** au 20/07 et **n'a pas empêché** la
récidive du 21/07. Le motif n'est pas la mauvaise volonté : un agent qui écrit « gate PASS » **croit
sincèrement** avoir mesuré — il a lancé des commandes, il en a vu passer, il garde la **mémoire
d'avoir vérifié**. Une règle échoue parce qu'elle demande à l'agent de **se méfier de sa propre
mémoire**, ce qu'aucun texte n'obtient de façon fiable.

D'où le geste retenu par D-8 : **ne pas ajouter une règle, mais rendre le verdict coûteux à
falsifier** en le faisant passer d'une **affirmation** à une **citation**.

> **Un verdict de gate qui ne cite pas ses commandes et leurs sorties n'est pas un verdict :
> c'est une opinion. Il ne franchit rien.**
