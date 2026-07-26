---
id: isolation-docker
label: Isolation Docker par projet
policy: "Chaque projet tourne dans sa propre stack Docker (réseau, volumes, containers nommés/préfixés par projet) et ses propres ports hôte distincts ; jamais de partage de stack ni de ressources entre projets."
trigger: "mise en place ou évolution de la stack d'un projet"
---
# Isolation Docker par projet

Principe transverse iakaframe extrait de `methode-de-travail.md` et du CLAUDE.md global
(§ « Conventions permanentes ») — le narratif reste la référence (I5).

**Politique.** Chaque projet tourne dans sa propre stack Docker (réseau, volumes, containers nommés/préfixés par projet) et ses propres ports hôte distincts ; jamais de partage de stack ni de ressources entre projets.

**Déclencheur.** mise en place ou évolution de la stack d'un projet.
