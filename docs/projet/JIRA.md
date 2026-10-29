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
> le second import a commencé à `LUN-32`. Il a créé **les 7 épics en premier**,
> puis le reste dans l'ordre du fichier :
>
> | Lignes du CSV | Clé réelle |
> |---|---|
> | 23 à 29 (épics) | `LUN-(n+9)` : `LUN-32` à `LUN-38` |
> | 1 à 22 (backlog d'origine, TD) | `LUN-(n+38)` : `LUN-39` à `LUN-60` ; `LUN-0nn` est devenu `LUN-(nn+38)` (`LUN-006` → `LUN-44`) |
> | 30 à 80 (stories, sous-tâches) | `LUN-(n+31)` : `LUN-61` à `LUN-111` |
>
> L'ancien numéro reste écrit dans la description de chaque ticket d'origine.
> Les clés citées ici sont les clés réelles, vérifiées dans Jira le 2026-10-29.
> Jusqu'à cette date, le dépôt appliquait « + 38 » à toutes les lignes : voir
> [Anciennes clés](#8-anciennes-clés-citées-avant-le-2026-10-29) (LUN-116).

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
| 23 à 29 | 7 épics | `LUN-32` à `LUN-38` |
| 30 à 42 | 13 stories, chacune dans son épic | `LUN-61` à `LUN-73` |
| 43 à 80 | 38 sous-tâches `[Front]`, `[Back]`, `[Infra]`, `[Doc]` | `LUN-74` à `LUN-111` |

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
   (ADR-004)… », `LUN-60` = « TD Coordination… », `LUN-34` = « Pointage sur
   tablette » avec deux tickets enfants (`LUN-65`, `LUN-66`), `LUN-65` avec
   quatre sous-tâches et les composants Back et Front.

### Après l'import : statuts et estimations

Tous les tickets arrivent « À faire ». Modification groupée → **Transition** :

| JQL | Statut |
|---|---|
| `key in (LUN-39, LUN-40, LUN-41, LUN-42, LUN-43, LUN-45, LUN-46, LUN-47, LUN-48, LUN-49)` | Terminé |
| `key in (LUN-44, LUN-60)` | En cours |

Story Points à saisir à la main (propositions, à revoir en planning poker) :
LUN-60 : 5 · LUN-61 : 5 · LUN-62 : 8 · LUN-63 : 5 · LUN-64 : 3 · LUN-65 : 8 ·
LUN-66 : 5 · LUN-67 : 5 · LUN-68 : 5 · LUN-69 : 5 · LUN-70 : 8 · LUN-71 : 5 ·
LUN-72 : 8 · LUN-73 : 8.

### Rattacher les tickets d'origine à leur épic

Le CSV ne peut pas le faire (un parent doit précéder ses enfants dans le
fichier, et les tickets d'origine passent en premier).
Dans la modification groupée, le champ **Parent apparaît mais reste grisé** :
passer par le **backlog** (panneau Épics activé), sélectionner les tickets
avec Cmd+clic puis les glisser sur l'épic, ou ajouter les tickets existants
depuis la section « Tickets enfant » de l'épic.

| Tickets | Épic |
|---|---|
| `key in (LUN-40, LUN-41, LUN-44, LUN-54, LUN-55)` | LUN-32 Authentification et sécurité des comptes |
| `key in (LUN-42, LUN-56)` | LUN-33 Crèches et personnel |
| `key in (LUN-43, LUN-48, LUN-58)` | LUN-34 Pointage sur tablette |
| `key in (LUN-47, LUN-49, LUN-57, LUN-59)` | LUN-35 Enfants et familles |
| `key in (LUN-50)` | LUN-36 Fiche de ménage |
| `key in (LUN-39, LUN-45, LUN-46, LUN-52, LUN-53)` | LUN-37 Socle technique et livraison |
| `key in (LUN-51, LUN-60)` | LUN-38 Pilotage du projet |

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

Désormais, tout ce qui contient une clé `LUN-<n>` est relié au ticket, et les
règles d'automatisation (section 6) le font changer de statut :

| Où | Exemple |
|---|---|
| Nom de branche | `feat/LUN-65-mode-tablette` |
| Message de commit | `feat(api): pointage groupé (LUN-65)` |
| Titre de PR | `feat(api): pointage groupé (LUN-65)` |
| Description de PR | toute clé citée, même en passant |

**Ne citer que la clé du ticket traité**, dans la branche, les commits, le
titre **et la description** de la PR. Une clé citée en passant (« suite à
prévoir dans LUN-59 ») rattache la PR à ce ticket et le fait passer « En
revue », puis « Intégré » à la fusion : constaté le 2026-10-29 sur douze
tickets. Pour renvoyer à un autre ticket, écrire son titre, ou
mettre le lien dans Jira plutôt que dans la PR.

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

## 8. Anciennes clés, citées avant le 2026-10-29

Du 2026-10-10 au 2026-10-29, les stories et sous-tâches ont été citées avec la
règle « ligne du CSV + 38 », fausse pour elles (voir l'encadré en tête). Constat
et correction : LUN-116.

**L'historique garde ses clés** : branches, messages de commit, titres et
descriptions des PR fusionnées, code, migrations, journal d'avancement
d'AGENTS.md. Cette table fait le lien. **Les documents de référence** (guides,
conventions, story map, README, registre des choix, journal des versions)
citent les clés réelles depuis le 2026-10-29.

| Ancienne clé (dépôt) | Clé réelle (Jira) | Ticket |
|---|---|---|
| `LUN-61` à `LUN-67` | `LUN-32` à `LUN-38` | les 7 épics (ancienne + 29) ; « LUN-65 » = épic Fiche de ménage, `LUN-36` |
| `LUN-68` à `LUN-80` | `LUN-61` à `LUN-73` | les 13 stories (ancienne − 7) |
| `LUN-81` à `LUN-118` | `LUN-74` à `LUN-111` | les 38 sous-tâches (ancienne − 7) |

Clés effectivement utilisées dans l'historique :

| Ancienne clé | Clé réelle | Où elle apparaît |
|---|---|---|
| `LUN-69` | `LUN-62` Passkeys | PR #70 (API), #71 (contrat du front) |
| `LUN-76` | `LUN-69` Pièces et tâches de ménage | PR #55, #56, #59, #60 (version 0.1.0) |
| `LUN-77` | `LUN-70` Remplir une fiche de ménage depuis la tablette | PR #57, #58 |
| `LUN-78` | `LUN-71` Historique et conservation des fiches | PR #61 |
| `LUN-79` | `LUN-72` Socle du front v2 | descriptions de #63, #67, #69 |
| `LUN-85`, `LUN-86` | `LUN-78`, `LUN-79` (back des passkeys) | description de #70 |
| `LUN-107` à `LUN-112` | `LUN-100` à `LUN-105` (sous-tâches de la fiche de ménage) | descriptions de #55, #57, #61 |
| `LUN-113` | `LUN-106` [Doc] ADR-002 | PR #63, #67 |
| `LUN-114` | `LUN-107` [Front] Squelette du front v2 | PR #69 (branche `feat/LUN-114-squelette-front-v2`) |

Ne pas confondre : **`LUN-114` est aussi une vraie clé**, « Parcours
d'onboarding » (PR #64, juste). `LUN-112` et `LUN-113` n'existent pas dans
Jira.

Effets dans Jira, corrigés le 2026-10-29 (LUN-116) : l'intégration GitHub a
rattaché ces PR aux tickets portant l'ancienne clé, et les règles R2, R3 et R5
ont changé leurs statuts (par exemple « Écran du personnel », passé
« Intégré » sans le moindre écran). Chaque ticket concerné porte un
commentaire « Correction de la numérotation » qui donne les bonnes PR, et son
statut suit désormais le travail réellement fait.
