---
id: mock-en-dev
label: Mocker les API en dev
policy: "En dev, mocker les API coûteuses ou limitées dans specs/mock/ et cacher agressivement ; zéro appel API superflu."
trigger: "dépendance à une API externe en dev ou test"
---
# Mocker les API en dev

Principe transverse iakaframe extrait de `methode-de-travail.md` et du CLAUDE.md global
(§ « Conventions permanentes ») — le narratif reste la référence (I5).

**Politique.** En dev, mocker les API coûteuses ou limitées dans specs/mock/ et cacher agressivement ; zéro appel API superflu.

**Déclencheur.** dépendance à une API externe en dev ou test.
