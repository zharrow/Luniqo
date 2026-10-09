# Jira : mise en place du projet LUN

Guide pas à pas pour créer le projet Jira de Luniqo, importer le backlog, le
relier à GitHub et automatiser le cycle de vie des tickets décrit dans
[CONTRIBUTING.md](../../CONTRIBUTING.md). Rédigé le 2026-10-09 (LUN-60). Les
noms de menus peuvent varier légèrement selon la langue de l'interface : les
deux sont donnés quand ils diffèrent.

**Ordre à respecter** : créer le projet (1), préparer les statuts et les champs
(2), importer le CSV (3) **avant de créer le moindre ticket à la main**.

> **Clés réelles du projet** `[RÉEL]` : le premier import du 2026-10-09 a raté
> et ses 31 tickets ont été supprimés ; Jira ne réutilisant jamais un numéro,
> le second import a commencé à `LUN-39`. **La ligne n du CSV est le ticket
> `LUN-(n+38)`**, et un ticket du backlog d'origine `LUN-0nn` est devenu
> `LUN-(nn+38)` (`LUN-006` → `LUN-44`). L'ancien numéro reste écrit dans la
> description de chaque ticket d'origine. Les clés citées ici sont les clés
> réelles.

## 1. Créer le site et le projet

1. Créer un site Jira gratuit (offre Free : jusqu'à 10 utilisateurs) sur
   <https://www.atlassian.com/software/jira/free>. La personne qui crée le site
   en est l'administrateur : c'est elle qui fera l'import.
2. **Créer un projet** → modèle **Scrum** → type **géré par l'entreprise**
   (*company-managed*) : il offre les composants, les versions et le
   paramétrage des workflows dont on a besoin.
3. Nom : `Luniqo`, **clé : `LUN`**. La clé est celle des branches et des
   commits : elle ne doit pas changer.
4. Inviter les membres de l'équipe (Paramètres → Utilisateurs).

## 2. Préparer statuts, champs et versions

### Workflow

Paramètres du projet → **Workflows** → modifier le workflow du projet. Statuts,
dans l'ordre :

| Statut | Catégorie Jira |
|---|---|
| À faire (*To Do*) | À faire |
| En cours (*In Progress*) | En cours |
| En revue | En cours |
| Intégré | En cours |
| En recette | En cours |
| Terminé (*Done*) | Terminé |

Autoriser les transitions vers tous les statuts (« Toutes les transitions »),
pour que les règles d'automatisation et les retours en arrière (refus en recette)
fonctionnent.

### Champs

- **Composants** (Paramètres du projet → Composants) : `Front`, `Back`, `Infra`, `Doc`.
- **Story Points** : déjà présent dans un projet Scrum.
- **Étiquettes** : libres, créées par l'import.
- **Versions** (Paramètres du projet → Versions, ou page *Releases*) : créer
  `v0.1.0`, puis `v0.2.0` (version en cours de développement).

## 3. Importer le backlog

Fichier : [jira-import.csv](jira-import.csv), 80 lignes :

| Lignes | Contenu | Clés obtenues |
|---|---|---|
| 1 à 21 | le backlog d'origine, dans l'ordre | `LUN-39` à `LUN-59` (= `LUN-001` à `LUN-021`) |
| 22 | le ticket de ce TD | `LUN-60` |
| 23 à 29 | 7 épics | `LUN-61` à `LUN-67` |
| 30 à 42 | 13 stories, chacune dans son épic | `LUN-68` à `LUN-80` |
| 43 à 80 | 38 sous-tâches `[Front]`, `[Back]`, `[Infra]`, `[Doc]` | `LUN-81` à `LUN-118` |

Import réalisé le 2026-10-09 par l'outil **« Création groupée »** (import CSV
proposé depuis la recherche de tickets), au deuxième essai. Ce qui suit décrit
le chemin qui a fonctionné.

**Avant l'import** : les composants `Front`, `Back`, `Infra`, `Doc` doivent
exister dans le projet, **avec exactement cette casse**. La Création groupée ne
crée pas de composant : un nom qui ne correspond pas est ignoré, avec un
simple avertissement.

1. **Configuration** : choisir le fichier ; ne pas cocher « Utiliser un
   fichier de configuration existant » au premier import.
2. **Paramètres** : projet **Luniqo (LUN)**, encodage **UTF-8**, délimiteur
   **`,`** ; le format de date est sans effet (aucune date dans le fichier).
3. **Mapper les champs** (une ligne par nom de colonne : les 3 `Component` et
   les 4 `Labels` sont regroupées) :

   | Colonne du CSV | Champ Jira | « Mapper la valeur » |
   |---|---|---|
   | Component | Composants | non |
   | Description | Description | non |
   | Fix versions | Versions corrigées | non |
   | Labels | Étiquettes | non |
   | Parent | Parent | non |
   | Priority | Priorité | oui |
   | Status | **Ne pas mapper** (champ absent de la Création groupée) | — |
   | Story Points | **Ne pas mapper** (champ absent, voir après l'import) | — |
   | Summary | Résumé | non |
   | Work item ID | ID de ticket | non |
   | Work type | Type de ticket | oui |

   **Vérifier chaque ligne avant de continuer.** Une erreur ne bloque pas
   l'import, elle le fausse : au premier essai, la colonne `Labels` associée au
   Résumé a donné des titres comme « tablette », et les 49 lignes sans
   étiquette ont été rejetées faute de titre (31 tickets sur 80, numéros
   décalés). Supprimer ces tickets ne remet pas le compteur à zéro : Jira ne
   réutilise jamais un numéro. C'est pourquoi les clés réelles commencent à
   `LUN-39`.

4. **Mapper les valeurs** : High → High, Medium → Medium, Epic → Epic,
   Story → Story, Sub-task → Sous-tâche, Task → Tâche.
5. **Valider**, puis **Démarrer l'importation**. Le compteur de la validation
   ne compte pas les sous-tâches : il annonce **42** tickets alors que les
   **80** sont créés. Enregistrer le fichier de configuration proposé, utile
   pour un nouvel import.
6. **Vérifier** : 80 tickets, `LUN-44` = « Double authentification
   (ADR-004)… », `LUN-60` = « TD Coordination… », `LUN-63` = « Pointage sur
   tablette » avec deux tickets enfants (`LUN-72`, `LUN-73`), `LUN-72` avec
   quatre sous-tâches et les composants Back et Front.

### Après l'import : statuts et estimations

Tous les tickets arrivent « À faire ». Modification groupée → **Transition** :

| JQL | Statut |
|---|---|
| `key in (LUN-39, LUN-40, LUN-41, LUN-42, LUN-43, LUN-45, LUN-46, LUN-47, LUN-48, LUN-49)` | Terminé |
| `key in (LUN-44, LUN-60)` | En cours |

Story Points à saisir à la main (propositions, à revoir en planning poker) :
LUN-60 : 5 · LUN-68 : 5 · LUN-69 : 8 · LUN-70 : 5 · LUN-71 : 3 · LUN-72 : 8 ·
LUN-73 : 5 · LUN-74 : 5 · LUN-75 : 5 · LUN-76 : 5 · LUN-77 : 8 · LUN-78 : 5 ·
LUN-79 : 8 · LUN-80 : 8.

### Rattacher les tickets d'origine à leur épic

Le CSV ne peut pas le faire (un parent doit précéder ses enfants dans le
fichier, et les tickets d'origine passent en premier).
Dans la modification groupée, le champ **Parent apparaît mais reste grisé** :
passer par le **backlog** (panneau Épics activé), sélectionner les tickets
avec Cmd+clic puis les glisser sur l'épic, ou ajouter les tickets existants
depuis la section « Tickets enfant » de l'épic.

| Tickets | Épic |
|---|---|
| `key in (LUN-40, LUN-41, LUN-44, LUN-54, LUN-55)` | LUN-61 Authentification et sécurité des comptes |
| `key in (LUN-42, LUN-56)` | LUN-62 Crèches et personnel |
| `key in (LUN-43, LUN-48, LUN-58)` | LUN-63 Pointage sur tablette |
| `key in (LUN-47, LUN-49, LUN-57, LUN-59)` | LUN-64 Enfants et familles |
| `key in (LUN-50)` | LUN-65 Fiche de ménage |
| `key in (LUN-39, LUN-45, LUN-46, LUN-52, LUN-53)` | LUN-66 Socle technique et livraison |
| `key in (LUN-51, LUN-60)` | LUN-67 Pilotage du projet |

## 4. Boards et filtres

**Board Scrum** (créé avec le projet) :

- Colonnes : À faire | En cours | En revue | Intégré | En recette | Terminé
  (Paramètres du board → Colonnes, un statut par colonne).
- Couloirs (*swimlanes*) : par **épic**.
- Filtres rapides : `component = Front`, `component = Back`,
  `component in (Infra, Doc)`, `assignee = currentUser()`.
- Créer le **Sprint 1** depuis le backlog et y glisser les stories retenues en
  sprint planning.

**Boards complémentaires** (Rechercher → Boards → Créer un board → à partir d'un filtre) :

| Board | Filtre enregistré (JQL) | Pour |
|---|---|---|
| Front | `project = LUN AND component = Front ORDER BY Rank` | Pauline, Thomas |
| Back | `project = LUN AND component = Back ORDER BY Rank` | Julien, Thomas |
| Recette | `project = LUN AND status in (Intégré, "En recette") ORDER BY fixVersion` | le chef de projet avant une promotion |

Autres filtres utiles : `project = LUN AND labels = securite`,
`project = LUN AND fixVersion = v0.2.0`, `project = LUN AND "Story Points" is EMPTY AND type = Story`
(stories à estimer).

## 5. Relier Jira à GitHub

Il faut être administrateur du site Jira et propriétaire du dépôt GitHub
`zharrow/Luniqo` (Florent).

1. Jira : **Applications** (*Apps*) → **Explorer d'autres applications** →
   chercher **GitHub for Atlassian** (anciennement *GitHub for Jira*, éditée
   par Atlassian) → **Obtenir l'application** (gratuite).
2. **Commencer** (*Get started*) → **Continuer** → **GitHub Cloud** → **Suivant**,
   puis se connecter à GitHub.
3. Choisir le compte **zharrow** → **Connecter**. Le dépôt appartient à un
   compte personnel, pas à une organisation : il apparaît quand même dans la
   liste. Des difficultés sont signalées avec les comptes personnels ; si le
   dépôt n'apparaît pas, le noter et on cherchera une autre solution.
4. Côté GitHub, installer l'application Jira en choisissant **Only select
   repositories** → `Luniqo` seulement (moindre privilège), puis accepter les
   permissions demandées.
5. Attendre la fin de la synchronisation de l'historique (*backfill*).
   Vérification : ouvrir `LUN-60` ; le panneau **Développement** doit montrer la
   branche `docs/LUN-60-poc-coordination` et la PR #52. Les branches d'avant
   Jira (`feat/LUN-006-mfa`…) portent l'ancienne numérotation : elles ne sont
   reliées à aucun ticket, c'est normal.

Désormais, tout ce qui contient une clé `LUN-<n>` est relié au ticket :

| Où | Exemple |
|---|---|
| Nom de branche | `feat/LUN-72-mode-tablette` |
| Message de commit | `feat(api): pointage groupé (LUN-72)` |
| Titre de PR | `feat(api): pointage groupé (LUN-72)` |

## 6. Règles d'automatisation

Paramètres du projet → **Automatisation** → **Créer une règle**. Elles ne
fonctionnent qu'une fois GitHub relié (section 5), car leurs déclencheurs sont
des événements GitHub.

**Limite de l'offre gratuite** : 100 exécutions de règles par mois pour tout le
site. Une exécution compte quand une règle agit. Avec environ 3 exécutions par
ticket (branche, PR, fusion), cela suffit pour une trentaine de tickets par
mois. Surveiller le compteur (Automatisation → Utilisation) ; les contrôles
lourds restent côté GitHub Actions, sans limite.

| # | Déclencheur | Condition | Action |
|---|---|---|---|
| R1 | **Branche créée** (*Branch created*) | statut = À faire | Transition → **En cours** |
| R2 | **Pull request créée** | statut ≠ Terminé | Transition → **En revue** |
| R3 | **Pull request fusionnée** | comparaison avancée : `{{pullRequest.destinationBranch}}` égal à `develop` | Transition → **Intégré** ; puis Modifier le ticket → Versions corrigées → **version suivante non publiée** |
| R4 | **Version publiée** (*Version released*) | — | Branche « tickets de la version » (JQL : `fixVersion = "{{version.name}}" AND statusCategory != Done`) → Transition → **Terminé** |
| R5 | **Ticket transitionné** vers Intégré | type = Sous-tâche | Branche **Parent** → condition « toutes les sous-tâches » en Intégré, En recette ou Terminé → Transition → **Intégré** |

R1 à R3 font avancer le ticket tout seul au rythme de Git ; R4 clôt une version
d'un geste au moment de la mise en production ; R5 fait suivre la story quand
ses sous-tâches front et back sont intégrées. Le passage « En recette » reste
manuel (modification groupée des tickets `status = Intégré AND fixVersion = vX.Y.Z`)
au moment de la promotion `develop` → `staging`, car la PR de promotion ne
porte pas de clé de ticket.

Après création, tester chaque règle sur un ticket : l'onglet **Journal d'audit**
de la règle montre si elle s'est déclenchée et pourquoi elle a échoué.

## 7. Automatisations côté GitHub

Déjà dans le dépôt (pas de limite d'exécutions) :

| Workflow | Effet |
|---|---|
| [CI](../../.github/workflows/ci.yml) | lint, tests, images, démarrage de la pile sur chaque PR et chaque push sur `develop`, `staging`, `main` |
| [Conventions de PR](../../.github/workflows/pr-conventions.yml) | refuse une branche mal nommée, une cible interdite, un titre sans clé `LUN-<n>` |
| [Étiquettes de PR](../../.github/workflows/labels.yml) | pose `front`, `back`, `infra`, `doc` selon les fichiers modifiés |

À régler par le propriétaire du dépôt (Settings → **Rules** → **Rulesets**),
selon le tableau des protections de CONTRIBUTING.md :

- `develop` : PR obligatoire, 1 approbation, contrôles « API », « Images
  Docker » et « Branche, cible et titre » réussis.
- `staging` : PR obligatoire, mêmes contrôles.
- `main` : PR obligatoire, 2 approbations, mêmes contrôles.
- Settings → General → **Automatically delete head branches** : supprimer les
  branches de travail après fusion.
- Branche par défaut : `develop` (Settings → General), pour que les PR la
  visent d'office. Vérifier ensuite dans Vercel (Settings → Git → *Production
  Branch*) que la branche de production du front v1 reste `main`.
