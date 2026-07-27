---
id: recette-guidee
level: project
nonDestructive: true
entries:
  - { path: "specs/recettes/", role: "recettes guidées de la RQV humaine (une par version mineure)", createIfAbsent: true }
  - { path: "specs/recettes/_TEMPLATE.recette.html", role: "gabarit HTML self-contained de recette guidée (à copier par version)", createIfAbsent: true }
---
# Scaffold recette-guidee

Échafaudage NON DESTRUCTIF du **gabarit de recette guidée HTML**, instrument standard de la
**Revue Qualité de Version (RQV) humaine** (canon : `library/personas/legolas.md` § RQV). On pose
ce qui manque, on n'écrase jamais — même mécanique que le `_TEMPLATE.md` du scaffold `projet`.

## Ce que le scaffold pose

- `specs/recettes/` : le dossier des recettes guidées d'un projet ;
- `specs/recettes/_TEMPLATE.recette.html` : le **gabarit** (un seul fichier, CSS/JS inline, zéro
  dépendance réseau), à **copier** en `specs/recettes/recette-vX.Y.0.html` puis remplir à la main
  pour chaque version mineure.

La **source canonique** du gabarit vit dans le repo iakaframe (`specs/recettes/_TEMPLATE.recette.html`).
Sa **matérialisation automatique** par init/onboard (copie du contenu, pas seulement du chemin) est
une **itération différée** (cf. instruction `specs/instructions/recette-guidee-rqv.md` § 7) ; au MVP,
la copie du gabarit dans un projet est faite à la main par l'auteur de la recette.

## Comment on s'en sert (pratique RQV)

La recette guidée **dérive des critères d'acceptation** des instructions de cadrage : **1 AC
vérifiable → 1 scénario** (`id` traçable vers l'AC), plus les angles que le gate auto ne couvre pas
(rendu visuel, gestes réels de bout en bout, honnêteté observable). 📖 Nathalie **assemble** (part
documentaire), 🏹 Legolas **valide la couverture** ; le **décideur** déroule la recette dans l'app
réelle ; le **jalon RQV reste émis par Legolas**, récepteur = décideur. Canon inchangé.
</content>
</invoke>
