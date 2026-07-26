---
id: iakaframe-git
name: iakaframe-git
description: Porte le protocole git de la méthode iakaframe — initialiser un dépôt, committer en conventional commits, brancher un remote et pousser, indépendamment du serveur d'hébergement. Utiliser cette skill quand il faut "committer", "brancher le remote", "pousser sur le dépôt", "gérer l'historique git" d'un projet. Famille de protocole : elle nomme git (le protocole), jamais un serveur ; le serveur concret (API de création de dépôt, URL, token) est porté par le sous-skill produit sélectionné à l'install.
layer: family
subskills: [iakaframe-forgejo]
---

# iakaframe — git (famille / protocole)

Tu agis ici comme la **famille de protocole** de la capacité `iakaframe-gestion-de-source` :
la mécanique **git** commune à tous les hébergeurs. Cette skill nomme **git** — le
protocole — mais **jamais un serveur** particulier. Le *où* concret (quel hébergeur, quelle
API de création de dépôt, quelle URL, quel token) descend dans le **sous-skill produit**
sélectionné à l'install.

> **Frontière d'agnosticisme.** Le mot **git** est légitime ici (c'est le protocole de
> cette famille). En revanche : aucun nom d'hébergeur, aucun endpoint, aucune IP, aucun
> pattern d'URL réel, aucun nom de variable de token. Ces éléments vivent dans le produit.

## Le protocole git — les gestes communs

Quel que soit l'hébergeur en dessous, la mécanique git est la même :

1. **Initialiser** le dépôt local si absent :
   ```bash
   git init
   ```
2. **Committer** le travail en **conventional commits**, atomiques et fréquents
   (`feat(scope): message`, `fix: …`, `chore: …`) :
   ```bash
   git add -A
   git commit -m "feat(scope): message"
   ```
3. **Brancher un remote** — sans jamais écraser un `origin` déjà présent :
   ```bash
   git remote get-url origin 2>/dev/null \
     || git remote add origin "$REMOTE_URL"
   ```
   > `$REMOTE_URL` = l'URL réelle du dépôt distant, fournie par le **produit** (couche 3),
   > jamais gravée ici.
4. **Pousser** l'historique :
   ```bash
   git push -u origin HEAD
   ```

## Auto-détection amorçage ↔ checkpoint

Le protocole ne décide pas seul de créer ou non le dépôt distant : il **constate** son
existence (via le produit) puis pousse. La bascule « créer puis pousser » vs « rebrancher
puis pousser » est portée par le **produit** (qui connaît l'API de son serveur) ; la
famille git se contente d'ajouter le remote et de pousser une fois le dépôt distant prêt.

## Ce que délègue la famille au produit

- La **création du dépôt distant** (API du serveur) et le **pattern d'URL** du remote.
- Le **credential** concret (nom de la variable d'environnement, transport HTTP/SSH) et
  la manière de l'injecter sans le persister en clair.
- La **détection d'existence** du dépôt côté serveur.

## Garde-fous (protocole)

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `wip:`…), atomiques et fréquents.
- **Jamais de `git reset --hard` ni de `git push --force`** côté IA.
- **Ne jamais écraser un `origin` existant** : s'il est là, on le conserve.
- **Secret jamais commité** : ni dans un fichier suivi, ni dans un log, ni dans l'URL d'un
  remote committé. Vérifier au moindre doute `git config --get remote.origin.url`. Le
  *quel* credential est un détail produit.

## Place dans la chaîne

Famille au milieu de la chaîne source-control : `iakaframe-gestion-de-source` (capacité)
→ **`iakaframe-git`** (cette famille) → produit sélectionné à l'install (feuille). Demain,
la même famille pourra coiffer plusieurs produits alternatifs sous `subskills` ; l'install
en déploie **un** pour l'environnement de l'utilisateur (présence = sélection).
