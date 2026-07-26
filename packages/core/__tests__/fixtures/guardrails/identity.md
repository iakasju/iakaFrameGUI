---
id: identity
label: Double badge ouverture/clôture
kind: identity
hook: "Stop;SubagentStop;UserPromptSubmit"
policy: "La position de la pastille porte le sens ; « START/STOP » bannis ; badge en 1re ligne de toute parole adressée à l'utilisateur ; jamais sur logs ni traces."
---
# Double badge ouverture/clôture

Garde-fou iakaframe extrait de `methode-de-travail.md` et de `kit-claude/global/hooks/*`
(le narratif reste la référence, I5).

**Politique.** La position de la pastille porte le sens ; « START/STOP » bannis ; badge en 1re ligne de toute parole adressée à l'utilisateur ; jamais sur logs ni traces.

Garde d'identité (hooks `identity-guard` sur Stop/SubagentStop + `identity-remind` sur UserPromptSubmit) : vérifie que le tour courant OUVRE (pastille avant le bloc) et CLÔT (pastille après le bloc) par un badge `<pastille> [ROYAUME][Agent]`. Badge manquant ⇒ refus (exit 2), fail-open sur bug interne.
