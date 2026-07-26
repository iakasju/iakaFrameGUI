---
id: merge-versionnement
label: Merge ⇒ versionnement (couplés)
policy: "Tout merge d'une branche de feature dans main est immédiatement suivi du checkpoint de version (iakaframe update : état des lieux + commit global + push). Merge et version sont couplés, sans instruction séparée."
trigger: "à chaque merge d'une branche de feature dans main"
---
# Merge ⇒ versionnement (couplés)

Principe transverse iakaframe. Un état *mergé-mais-non-versionné* ne doit pas subsister sur `main`.

**Politique.** Dès qu'une branche de feature est **mergée** dans `main` (sur feu vert de
l'utilisateur, y compris un « merge quand c'est vert »), **enchaîner immédiatement** le checkpoint de
version — `iakaframe update` : régénère l'état des lieux + `git add -A` + commit global + push
Forgejo — **sans attendre une instruction séparée**.

**Déclencheur.** À chaque merge d'une branche de feature dans `main`.

**Qui.** Tout rôle **coordinateur** — **Aragorn** (chef de projet) comme **Odin** (portefeuille).

**Cohérence.** N'entre pas en conflit avec « jamais de commit silencieux » (cf.
`commits-versionnement`) : c'est le **merge autorisé** qui **emporte** son versionnement — ce n'est
pas un commit non sollicité.

**Note d'évolution.** Discipline de workflow (principe). Si l'on veut l'**enforcer** automatiquement,
elle pourra devenir un *guardrail* hook-enforcé (ex. un check qui refuse un `main` mergé-mais-non-
versionné), au même titre que identité / périmètre / délégation.
