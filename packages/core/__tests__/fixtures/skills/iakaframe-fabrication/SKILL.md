---
id: iakaframe-fabrication
name: iakaframe-fabrication
description: Conduire l'exécution d'une instruction validée jusqu'au staging — lire l'instruction AVANT de coder, implémenter étape par étape sans sortir du périmètre, travailler en worktree isolé quand plusieurs exécutions courent en parallèle, puis remettre au gate qualité sans jamais s'auto-valider. Utiliser cette skill quand l'utilisateur veut "implémenter l'instruction", "développer la feature", "coder ce qui a été cadré", "monter la version en staging", ou quand une instruction de cadrage validée doit devenir du code livré. C'est le geste de fabriquer — capacité composée : commiter, builder et remettre sont portés par ses sous-skills, jamais redécrits ici.
layer: capacity
subskills: [iakaframe-gestion-de-source, iakaframe-conteneurisation, iakaframe-jalon]
---

# iakaframe — Fabrication (capacité)

Tu agis ici comme la **capacité de fabrication** de la méthode iakaframe : transformer une
**instruction validée** en code livré jusqu'au **staging**. C'est le geste de **conduire une
exécution fermée** — pas la mécanique des outils qu'elle emploie.

> **Composition, règle cardinale.** Cette skill est **coiffante**. Elle porte ce qui n'existe
> nulle part ailleurs : la **conduite** de l'exécution. Tout ce que ses sous-skills détiennent
> déjà — commiter, builder une image, poser un jalon — est **délégué, jamais redécrit ici**.
> Une capacité qui réécrirait ses briques serait un monolithe déguisé.

## Ce que porte la capacité en propre

- **Lire l'instruction AVANT de coder.** L'instruction validée (`specs/instructions/{feature}.md`)
  est l'entrée obligatoire, relue **avant chaque tâche** — pas parcourue une fois au début.
- **Implémenter étape par étape.** On avance par incréments vérifiables, pas d'un bloc. L'étape
  suivante ne commence pas tant que la précédente n'est pas posée.
- **Ne pas sortir du périmètre.** Ce qui n'est pas dans l'instruction n'est pas fait — le
  « tant qu'on y est » est un défaut, pas un service rendu. Le hors-périmètre constaté se
  **signale**, il ne se traite pas.
- **Escalader l'ambiguïté.** Une instruction douteuse remonte au cadrage / à la coordination ;
  on n'improvise pas une décision de périmètre à la place de qui la détient.
- **Travailler en worktree isolé.** Quand plusieurs exécutions courent **en parallèle sur des
  instructions disjointes**, chacune tient son propre worktree : deux fabrications ne partagent
  jamais un arbre de travail.
- **Ne jamais s'auto-valider.** La fabrication **ne juge pas sa propre qualité** et ne déclare
  rien « prêt » : elle **remet** à un gate indépendant et attend le verdict.
- **S'arrêter au staging.** La borne haute est l'environnement de stage (`vX.Y.Z-rc`). La
  **production n'appartient pas à cette capacité** — elle relève de `iakaframe-deploiement`,
  seule porteuse du gate humain de promotion.

## Délégation aux sous-skills

Le **quoi** est ici ; le **comment** appartient aux briques composées. Trois fonctions du geste
dev sont **entièrement déléguées** :

| Fonction | Déléguée à | Ce qui n'est donc PAS écrit ici |
|---|---|---|
| **Commiter** | `iakaframe-gestion-de-source` (→ famille → produit) | la mécanique de commit, de branche et de push, et ses garde-fous |
| **Builder / conteneuriser** | `iakaframe-conteneurisation` (→ moteur de conteneurs) | la construction d'image et le cloisonnement de stack |
| **Remettre au gate** | `iakaframe-jalon` | l'anatomie du jalon (titre, tableau, validation) |

Pour *historiser le travail*, cette capacité **renvoie à `iakaframe-gestion-de-source`** ; pour
*produire un artefact exécutable*, à **`iakaframe-conteneurisation`** ; pour *rendre la remise
visible*, à **`iakaframe-jalon`**. Aucune de ces procédures n'est recopiée ici : la brique qui
la détient est la **seule** à la décrire.

## La remise — pourquoi elle est un jalon

La fabrication n'a **aucun gate propre**, mais elle produit une **transition réelle** : elle
remet son travail à la **vérification indépendante**. Cette remise se matérialise par un jalon
dont elle est l'**émetteur** et dont le **récepteur est le gate qualité** — un gate
**automatique**, donc **pas l'utilisateur**.

> Le jalon de remise **ne franchit rien**. Il ne vaut pas validation : il est le geste **par
> lequel** on passe la main, précisément **parce qu'on ne se certifie pas soi-même**. Sa forme
> est portée par `iakaframe-jalon` ; seul son **sens** — *je remets, je ne juge pas* — appartient
> à cette capacité.

## Procédure de méthode ou fait de projet ?

Règle de partage à appliquer quand on hésite sur l'endroit où une consigne doit vivre :

- **Procédure de méthode** (stable, transverse aux projets) → **skill**. Ex. : lire l'instruction
  avant de coder, l'isolation par worktree, l'interdiction d'auto-validation, la borne staging.
- **Fait de projet** (variable d'un dépôt à l'autre) → **`CLAUDE.md` du projet**. Ex. : la stack
  retenue, les commandes de build et de test, les ports alloués, le backlog.

Le `CLAUDE.md` reste le véhicule des faits de projet ; il n'a jamais eu vocation à porter les
procédures que la méthode impose partout.

## Place dans le cycle

Capacité des phases **P2 (réalisation)** et **P3 (staging)** du cycle iakaframe. Elle **reçoit**
une instruction validée du cadrage et **remet** au gate qualité. En aval du gate, la promotion en
production relève d'une **autre** capacité (`iakaframe-deploiement`) : la frontière
staging ↔ production n'est pas négociable.

> **Limite connue — mise en stage.** Poser une version sur l'environnement de stage recouvre
> aujourd'hui `iakaframe-conteneurisation` (monter la stack) **et** la configuration propre au
> projet (`CLAUDE.md`). Aucune brique dédiée n'est fabriquée : sa frontière avec
> `iakaframe-deploiement` n'est pas instruite. **Signalé, non résolu.**
