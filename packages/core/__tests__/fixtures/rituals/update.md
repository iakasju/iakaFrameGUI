---
id: update
label: Checkpoint (update iakaframe)
triggers: [update iakaframe, update, checkpoint]
actions:
  - "Régénérer l'état des lieux (MD + HTML)"
  - "Commit global atomique (git add -A + commit)"
  - "Push sur Forgejo (option --no-push pour rester local)"
side: cockpit
---
# Checkpoint (update iakaframe)

Rituel iakaframe (geste outillé) extrait de `methode-de-travail.md` et du CLAUDE.md global
(le narratif reste la référence, I5). Côté `cockpit`.

Contrepartie en écriture de l'état des lieux. À faire à chaque changement de version et à chaque pause/reprise, ou comme simple point de sauvegarde.
