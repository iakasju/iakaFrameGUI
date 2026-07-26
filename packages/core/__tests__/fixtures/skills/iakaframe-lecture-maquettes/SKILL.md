---
id: iakaframe-lecture-maquettes
name: iakaframe-lecture-maquettes
description: Consulter les maquettes (fichiers HTML/PNG d'écrans, wireframes, prototypes) lors d'un cadrage d'UI, en les LISANT par leur chemin exact via Read plutôt qu'en s'appuyant sur Glob/Grep. Utiliser cette skill chaque fois qu'un besoin porte sur une interface, un écran, une page ou une maquette, pour confronter le cadrage au contenu réel des maquettes avant de fermer le périmètre. But : ne jamais cadrer une UI à l'aveugle.
---

# iakaframe — Consulter les maquettes lors d'un cadrage d'UI

Quand tu cadres une **UI**, un **écran**, une **page** ou une **maquette**, tu ne peux pas
fermer un périmètre sans avoir **vu** ce que la maquette montre. Cette skill fixe le geste
sûr pour y accéder.

## Règle — lire par le CHEMIN EXACT via `Read`

- **Lis les fichiers de maquette par leur chemin exact avec `Read`.** Ne te repose **pas** sur
  `Glob`/`Grep` pour les découvrir ni les fouiller : ces outils peuvent **échouer** si
  `ripgrep` est absent de l'environnement, et te laisser croire, à tort, qu'il n'y a rien.
- Les maquettes du **GUI** vivent dans `~/work/iakaframe/specs/mock/gui/` :
  - `01-library.html`
  - `02-feanor-prompt-element.html`
  - `03-assemblage.html`
  - `04-creation-workflow.html`
- Plus généralement, **lis les chemins fournis dans le brief**. Si le brief cite une maquette,
  ouvre-la ; s'il n'en cite aucune mais que le besoin est visuel, demande le chemin plutôt que
  de deviner.

## Discipline

**Confronte ton cadrage au contenu réel des maquettes** avant de fermer le périmètre : ce que
tu spécifies doit correspondre à ce que la maquette montre (écrans, champs, états, parcours).
Un cadrage d'UI qui contredit la maquette — ou qui l'ignore — est un cadrage à l'aveugle, et
c'est précisément ce que cette skill interdit.
