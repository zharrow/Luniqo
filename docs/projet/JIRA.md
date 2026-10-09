# Jira : mise en place du projet LUN

Guide pas à pas pour créer le projet Jira de Luniqo, importer le backlog, le
relier à GitHub et automatiser le cycle de vie des tickets décrit dans
[CONTRIBUTING.md](../../CONTRIBUTING.md). Rédigé le 2026-10-09 (LUN-22). Les
noms de menus peuvent varier légèrement selon la langue de l'interface : les
deux sont donnés quand ils diffèrent.

**Ordre à respecter** : créer le projet (1), préparer les statuts et les champs
(2), importer le CSV (3) **avant de créer le moindre ticket à la main**, sinon
les numéros ne correspondront plus à ceux du dépôt.

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

| Lignes | Contenu | Clés attendues |
|---|---|---|
| 1 à 21 | le backlog d'origine, dans l'ordre | `LUN-1` à `LUN-21` (= `LUN-001` à `LUN-021`) |
| 22 | le ticket de ce TD | `LUN-22` |
| 23 à 29 | 7 épics | `LUN-23` à `LUN-29` |
| 30 à 42 | 13 stories, chacune dans son épic | `LUN-30` à `LUN-42` |
| 43 à 80 | 38 sous-tâches `[Front]`, `[Back]`, `[Infra]`, `[Doc]` | `LUN-43` à `LUN-80` |

1. ⚙ **Paramètres** → **Système** → **Importer et exporter** → **Importation
   de système externe** (*External System Import*) → **CSV**. Réservé à
   l'administrateur du site.
2. Choisir le fichier ; encodage **UTF-8**, séparateur **virgule**.
3. Projet de destination : **Luniqo (LUN)**.
4. Correspondance des colonnes :

   | Colonne du CSV | Champ Jira |
   |---|---|
   | Work item ID | *Work item ID* (ou *Issue Id*) |
   | Work type | Type de ticket (*Work type*) |
   | Summary | Résumé |
   | Description | Description |
   | Parent | *Parent* (ou *Parent Id*) |
   | Status | Statut |
   | Priority | Priorité |
   | Story Points | Story Points (ou *Story point estimate*) |
   | Component (×3) | Composants |
   | Labels (×4) | Étiquettes |
   | Fix versions | Versions corrigées (*Fix versions*) |

   **Vérifier chaque ligne avant de valider.** Une erreur ne bloque pas
   l'import, elle le fausse : le 2026-10-09, une colonne `Labels` associée au
   Résumé a donné des titres comme « tablette », et les 49 lignes sans
   étiquette ont été rejetées faute de titre (31 tickets importés sur 80,
   numéros décalés). Dans ce cas, seule la suppression définitive du projet
   (corbeille comprise) permet de repartir de `LUN-1` : Jira ne réutilise
   jamais un numéro.

5. Correspondance des valeurs, si Jira la demande : types `Epic`, `Story`,
   `Task`, `Sub-task` vers leurs équivalents (Epic, Story, Tâche, Sous-tâche) ;
   statuts `À faire`, `En cours`, `Terminé` vers les statuts du workflow ;
   priorités `Highest`, `High`, `Medium` vers Plus élevée, Élevée, Moyenne.
6. Lancer l'import, puis **vérifier** : **80 tickets** créés (le journal de
   l'import liste les lignes rejetées), `LUN-6` = « Double authentification
   (ADR-004)… », `LUN-22` = « TD Coordination… », `LUN-25` = « Pointage sur
   tablette » avec deux tickets enfants (`LUN-34`, `LUN-35`). Sinon, ne rien
   créer à la main avant d'avoir corrigé.

### Rattacher les tickets d'origine à leur épic

Le CSV ne peut pas le faire (un parent doit précéder ses enfants dans le
fichier, et les tickets d'origine passent en premier pour garder leur numéro).
Pour chaque ligne : recherche avancée (JQL) → **Modification groupée** (*Bulk
change*) → Modifier → **Parent** → l'épic.

| JQL | Épic |
|---|---|
| `key in (LUN-2, LUN-3, LUN-6, LUN-16, LUN-17)` | LUN-23 Authentification et sécurité des comptes |
| `key in (LUN-4, LUN-18)` | LUN-24 Crèches et personnel |
| `key in (LUN-5, LUN-10, LUN-20)` | LUN-25 Pointage sur tablette |
| `key in (LUN-9, LUN-11, LUN-19, LUN-21)` | LUN-26 Enfants et familles |
| `key in (LUN-12)` | LUN-27 Fiche de ménage |
| `key in (LUN-1, LUN-7, LUN-8, LUN-14, LUN-15)` | LUN-28 Socle technique et livraison |
| `key in (LUN-13, LUN-22)` | LUN-29 Pilotage du projet |

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
   Vérification : ouvrir `LUN-6` ; le panneau **Développement** doit montrer la
   branche `feat/LUN-006-mfa` et ses PR. Les anciennes branches ont des zéros
   devant le numéro : si elles n'apparaissent pas, ce n'est pas grave, les
   nouvelles s'écrivent sans zéro.

Désormais, tout ce qui contient une clé `LUN-<n>` est relié au ticket :

| Où | Exemple |
|---|---|
| Nom de branche | `feat/LUN-34-mode-tablette` |
| Message de commit | `feat(api): pointage groupé (LUN-34)` |
| Titre de PR | `feat(api): pointage groupé (LUN-34)` |

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
