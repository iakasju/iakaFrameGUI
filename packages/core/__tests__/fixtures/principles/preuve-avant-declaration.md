---
id: preuve-avant-declaration
label: Preuve avant déclaration
policy: "Un agent ne déclare fait, livré ou supprimé que ce qu'il a constaté sur l'artefact produit : rendre et regarder un visuel, relire le fichier après écriture, exécuter la vérification. Une intention d'action ne vaut pas constat."
trigger: "toute déclaration de complétion / livraison / suppression"
---
# Preuve avant déclaration

Principe transverse iakaframe **né d'un manquement constaté** (série « amélioration des personas »,
2026-07-19) — et non extrait du narratif, contrairement à ses voisins.

**Politique.** Un agent ne déclare **fait**, **livré** ou **supprimé** que ce qu'il a **constaté** sur
l'artefact produit : rendre et regarder un visuel, relire le fichier après écriture, exécuter la
vérification. Une intention d'action ne vaut pas constat.

**Déclencheur.** toute déclaration de complétion / livraison / suppression.

**Ce que « constater » veut dire.** Ouvrir l'artefact, pas la mémoire de l'avoir écrit. Le constat
porte sur l'**état du disque**, jamais sur l'intention qui l'a précédé — un fichier qu'on croit écrit
et un fichier qu'on a relu ne sont pas le même fait.

**Origine.** Au 3ᵉ gate de la série, un agent a **confirmé une suppression qu'il n'avait pas
vérifiée** : l'item était encore vivant et serait parti au backlog comme mort. Le manquement a coûté
un cycle de gate complet. C'est **le même défaut** que livrer un visuel sans l'avoir rendu et
regardé — d'où la généralisation d'une règle jusque-là enfermée dans une charte de design, en termes
graphiques (« un visuel non rendu = non livré »).

**Contrôle — deux régimes.**

*Régime contractuel (défaut).* Pour la plupart des déclarations, rien ne distingue mécaniquement une
déclaration constatée d'une déclaration supposée. Le contrôle est **en revue** et le principe
**engage l'agent qui parle**.

*Régime opposable (verdicts de gate).* Pour un **verdict de gate**, ce régime ne suffit pas : il
demande au relecteur de juger une sincérité, ce qu'il ne sait pas faire. La règle y est donc plus
dure :

> **Un verdict de gate qui ne cite pas ses commandes et leurs sorties n'est pas un verdict :
> c'est une opinion. Il ne franchit rien.**

Le mot est **inopposable**, pas « interdit » : on ne peut pas empêcher un agent d'écrire « PASS »,
on **retire toute valeur** à un PASS non sourcé. La charge de la preuve pèse sur l'émetteur. Un
merge dont le message porte « gate PASS » sans mesure attachée est, **par construction**, un merge
non gaté — même s'il se trouve que le code était vert.

**Ce que ce second régime n'est pas.** Ce n'est **pas** une garde : aucune mécanique ne lit le
verdict. Le contrôle reste **humain**. Ce qui change n'est pas le contrôleur mais **le coût de la
faute** : un agent peut écrire « PASS » de mémoire, il ne peut pas inventer `Test Files 53
passed (53)`. Le manquement cesse d'être un for intérieur invérifiable pour devenir un **trou
visible sur l'artefact** — une case vide, un « OK » sans chiffre. La revue passe de *« juger une
sincérité »* à *« regarder si la case contient un chiffre »*.

**Le format opératoire de ce régime est détenu par `library/skills/iakaframe-qualite/SKILL.md`**
(§ Format de sortie) — il n'est pas redéfini ici.

**Origine du second régime.** Réfutation datée. La rédaction antérieure concluait « contractuel
seul, contrôle en revue » au motif qu'aucune mécanique ne distingue le constaté du supposé. La
prémisse reste vraie ; **la conclusion était fausse** — elle omettait le format contraint, à
mi-chemin de la garde et de la bonne foi. Le contre-exemple est le merge `8ae5748` d'`iakaFrameGUI`
(20/07), qui portait « gate Legolas PASS » avec le lint rouge — **le lendemain de la création de ce
principe, qui ne l'a pas empêché**. Fermé par le lot D-8 (21/07).
