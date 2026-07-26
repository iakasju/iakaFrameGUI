---
id: canon-avant-citation
label: Canon avant citation
policy: "Toute citation désigne un canon unique, existant et identifiable, et pointe vers lui sans qu'il dépende d'elle ; quand un même changement touche le canon et ses citations, le canon est écrit AVANT. Sinon le dépôt porte, entre deux commits, deux fichiers qui affirment deux vérités contradictoires."
trigger: "un fichier reprend une information qu'un autre détient comme référence"
---
# Canon avant citation

Principe transverse iakaframe **né d'un défaut constaté** (série « amélioration des personas »,
2026-07-19) — et non extrait du narratif, contrairement à ses voisins.

**Politique.** Toute citation désigne un canon unique, existant et identifiable, et pointe vers lui
sans qu'il dépende d'elle ; quand un même changement touche le canon et ses citations, le canon est
écrit AVANT.

**Déclencheur.** un fichier reprend une information qu'un autre détient comme référence.

**Trois conditions structurelles.** *Existence* : ce qui est cité existe. *Unicité* : un seul
détenteur. *Direction* : la citation pointe vers le canon ; le canon reste compréhensible seul.

**Conséquence temporelle.** Le canon est écrit d'abord. Un canon écrit après sa citation rend
celle-ci irrésolvable ou contradictoire pendant tout l'intervalle.

**Origine.** `library/personas/nathalie.md` cite le tableau des chartes par défaut détenu par
`library/personas/loki.md`. Dans l'ordre initial, la citation aurait été corrigée deux commits avant
le canon : le dépôt aurait affirmé « conseil/pro → NaonEdge dark » d'un côté et « Cinabre, à
confirmer » de l'autre — sans qu'aucun test ne rougisse, aucun ne comparant deux chartes. D'où la
permutation Loki avant Nathalie.

**Contrôle.** En **revue**, pas par une garde : le canon existe (V1), il est unique (V2), la citation
ne le contredit pas (V3), et le canon précède dans l'ordre des commits (V4). Les citations n'étant
pas marquées, aucune mécanique ne peut le vérifier aujourd'hui.
