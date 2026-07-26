---
id: qualite
label: Rapport qualité sur version mineure
policy: "Une version mineure ⇒ rapport qualité complet (typecheck + lint + tests + couverture + revue), verdict PASS/FAIL rendu par un gate indépendant, avant scellement du jalon."
trigger: "bump SemVer x.Y.z (version mineure)"
---
# Rapport qualité sur version mineure

Principe transverse iakaframe extrait de `methode-de-travail.md` et du CLAUDE.md global
(§ « Conventions permanentes ») — le narratif reste la référence (I5).

**Politique.** Une version mineure ⇒ rapport qualité complet (typecheck + lint + tests + couverture + revue), verdict PASS/FAIL rendu par un gate indépendant, avant scellement du jalon.

**Déclencheur.** bump SemVer x.Y.z (version mineure).
