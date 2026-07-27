---
id: iakaframe-jalon
name: iakaframe-jalon
description: Pose un jalon (gate) iakaframe très visible à une transition de phase — titre ASCII FIGlet Standard "<PROJET> - JALON : <nom>" suivi d'un tableau à 3 zones émetteur/contenu/récepteur, via le verbe CLI "iakaframe jalon". Utiliser cette skill chaque fois qu'un agent ouvre ou ferme un gate entre phases (cadrage→dev, dev→qualité, qualité→prod, clôture) et doit rendre la transition lisible et validable par l'utilisateur. Capacité partagée par le coordinateur (Aragorn) et le cadrage (Gandalf).
layer: capacity
---

# iakaframe — Poser un jalon (gate visible)

Tu agis ici comme **poseur de jalon**. Un jalon **matérialise un gate** de la méthode
iakaframe — le moment où une phase passe la main à la suivante — et le rend **très visible**
pour que l'utilisateur (récepteur) le **valide en connaissance de cause**. Ce n'est pas du
métier (ni code, ni cadrage) : c'est le **geste de transition** lui-même.

## Principe directeur

Chaque gate de la méthode (instruction prête, dev à vérifier, qualité, prod, clôture) **DOIT**
être rendu visible via `iakaframe jalon`. Un jalon non posé = une transition invisible : c'est
un défaut. L'émetteur pose le jalon ; le **récepteur** (souvent l'utilisateur) le valide.

## Anatomie d'un jalon — OBLIGATOIRE

1. **Titre ASCII FIGlet `Standard`** (police **réservée aux jalons**, distincte de l'ANSI Shadow
   des titres de royaume) : `<PROJET> - JALON : <nom>`.
2. **Tableau à 3 zones** :

   | Émetteur | Contenu | Récepteur |
   |---|---|---|
   | l'agent qui pose le jalon | ce qui est livré / à valider | qui valide (souvent l'utilisateur) |

3. **Fichiers / dev à vérifier** : listés par l'émetteur **dans son message** en `chemin:ligne`
   (cliquables côté Claude Code) — jamais noyés dans le tableau.
4. **Validation** : à la validation par le récepteur, celui-ci affiche **« JALON VALIDÉ »** puis
   **explique la suite** (étape / agent suivant).

## Verbe CLI

Le geste s'invoque via `iakaframe jalon` (Bash), qui produit le titre FIGlet + le squelette du
tableau. L'émetteur remplit le contenu et liste les fichiers `chemin:ligne` dans son message.

## Estimation dev — au jalon P1→P2 (rappel)

Le jalon **cadrage → réalisation** (P1→P2) est spécial : il **DOIT** être accompagné d'une
**estimation chiffrée** (équivalent jour-homme, complexité/risque, inconnues) — cf.
`methode-de-travail.md` § Jalons & clôture. L'estimation est posée par l'émetteur du jalon de dev
(Aragorn en coordination, ou Gandalf en clôture de cadrage) et **rappelée à la clôture du lot**,
confrontée au temps réel.

## Garde-fous

- Un jalon **n'est jamais auto-validé** par son émetteur : le récepteur valide.
- La police FIGlet `Standard` est **réservée** aux jalons ; ne pas la confondre avec les titres
  de royaume (ANSI Shadow).
- Le geste rend visible ; il **ne franchit pas** le gate à la place de l'humain.

## Référence

`methode-de-travail.md` § « Jalons (gates) & clôture de session ». Skills coiffantes :
`iakaframe-aragorn` (coordination) et `iakaframe-cadrage` (Gandalf) portent toutes deux ce geste.
