---
id: log-conversation
label: Journal de conversation (main courante)
triggers: [log-conversation, logguer la conversation, tracer cet échange]
actions:
  - "Pousser un message (utilisateur↔agent ou agent↔agent) dans la main courante iakaboxlogs"
  - "Publication MQTT ; persistance CouchDB (base conversations) via un pont"
  - "Consultable via Fauxton / dashboards"
side: cockpit
---
# Journal de conversation (main courante)

Rituel iakaframe (geste outillé) extrait de `methode-de-travail.md` et du CLAUDE.md global
(le narratif reste la référence, I5). Côté `cockpit`.

Brique transverse : n'importe quel agent peut tracer un échange dans la main courante centralisée `iakaboxlogs` (stack iakabox). Geste machine, config par env, aucun secret en dépôt.
