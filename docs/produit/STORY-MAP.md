# Story map

Carte du parcours des utilisateurs de Luniqo, selon la méthode de Jeff Patton
(*User Story Mapping*). Elle répond à deux questions : **que fait chaque
persona, dans l'ordre**, et **qu'est-ce qui entre dans le MVP**.

Rédigée le 2026-10-09 (LUN-60, bonus du cours « Coordination Front & Back »).
Personas : [PERSONAS.md](PERSONAS.md). Tickets : Jira, projet `LUN`.

## Comment la lire

- **De gauche à droite**, les grandes activités, dans l'ordre où elles arrivent
  dans la vie d'une crèche : mettre en place, accueillir, vivre la journée,
  piloter, suivre son enfant. C'est l'**épine dorsale** (*backbone*).
- **Sous chaque activité**, les tâches de l'utilisateur, puis les stories qui
  les réalisent.
- **De haut en bas**, la priorité. Les lignes horizontales découpent les
  versions : tout ce qui est au-dessus de la ligne **MVP** est nécessaire pour
  qu'une première crèche utilise Luniqo pour de vrai.
- ✅ : la partie API est faite (v2), il reste le front. Une story du MVP peut avoir une sous-tâche reportée en 1.1 (par exemple l'export des présences). `à créer` : la story n'est pas encore dans Jira.

## Objectif du MVP

> Une micro-crèche **remplace ses fiches papier de présence et de ménage**, et
> les parents voient la journée de leur enfant, **sans aucune donnée de santé**.

C'est le parcours central du projet, complété par la fiche de ménage, qui est le
besoin d'origine de Luniqo. Le MVP correspond à la version **1.0.0** : la
première mise en production chez une crèche (voir SemVer dans
[CONTRIBUTING.md](../../CONTRIBUTING.md#3-versions-semver)).

Critères de réussite (à mesurer avec la crèche pilote) : plus aucune fiche
papier de présence ni de ménage pendant un mois ; un pointage en moins de 10
secondes sur la tablette ; aucun départ d'enfant avec un adulte non autorisé.

## La carte

| | **1. Mettre en place la crèche**<br>Hélène, Nadia | **2. Accueillir les familles**<br>Hélène | **3. Vivre la journée**<br>Yasmine | **4. Piloter la crèche**<br>Hélène, Nadia | **5. Suivre son enfant**<br>Marc |
|---|---|---|---|---|---|
| **Tâches** | Se connecter en sécurité · Créer ses crèches · Donner accès au personnel · Préparer la tablette · Décrire les pièces à nettoyer | Créer la fiche de la famille · Dire qui peut venir chercher l'enfant · Inviter les parents | S'identifier sur la tablette · Pointer arrivées et départs · Remplir la fiche de ménage | Voir qui est là · Revenir sur les jours passés · Corriger une erreur · Présenter les fiches lors d'un contrôle | Créer son compte · Voir la journée de son enfant |
| **MVP** (v1.0.0) | Connexion et second facteur, codes de secours : LUN-68 ✅<br>Créer, modifier, fermer une crèche : LUN-70 ✅<br>Donner accès à un employé : LUN-71 ✅<br>Créer le compte d'un employé par invitation : LUN-55<br>Enrôler la tablette : LUN-72 ✅<br>Pièces et tâches de ménage : LUN-76 ✅ | Fiche famille, enfants, responsables : LUN-74 ✅<br>Autorisations par enfant (autorité parentale, peut venir chercher) : LUN-74 ✅<br>Invitation par lien à usage unique : LUN-75 ✅ | Choisir son nom et taper son PIN : LUN-72 ✅<br>Pointer, départ refusé si l'adulte n'est pas autorisé : LUN-72 ✅<br>Cocher les tâches de ménage : LUN-77 | Présents du jour : LUN-73 ✅<br>Historique des fiches de ménage : LUN-78 | Accepter l'invitation, choisir son mot de passe : LUN-75 ✅<br>Présence du jour et historique : LUN-75 ✅ |
| **Version 1.1** | Connexion par Face ID (passkeys) : LUN-69<br>Résumé par crèche : sous-tâche de LUN-70<br>Recherche d'un employé : sous-tâche de LUN-71 | Invitation envoyée par e-mail : LUN-59<br>Recherche d'un enfant : sous-tâche de LUN-74 | Pointage groupé d'une fratrie : sous-tâche de LUN-72 | Historique et export des présences : sous-tâches de LUN-73<br>Correction d'un pointage, avec motif : LUN-58<br>Export des fiches de ménage : sous-tâche de LUN-78 | Notification à l'arrivée et au départ : `à créer` |
| **Plus tard** | Administration par l'éditeur : LUN-56<br>Rôle de responsable de crèche : `à créer` | Allergies et PAI, après l'analyse RGPD et HDS : LUN-57 | Traçabilité HACCP de la cuisine : `à créer`<br>Transmissions de la journée : `à créer` | Statistiques multi-crèches : `à créer`<br>Facturation : `à créer` | Messagerie avec la crèche : `à créer` |

## Ce qui ne se voit pas mais conditionne le MVP

| Travail | Ticket | Pourquoi avant le MVP |
|---|---|---|
| Socle du front v2 et client TypeScript généré | LUN-79 | Toutes les stories marquées ✅ attendent leur écran |
| Environnements PRÉ-PROD et PROD sur un VPS | LUN-80 | Une crèche ne peut pas utiliser Luniqo sans production ; HTTPS est aussi requis par les passkeys |
| Purge des sessions et du journal au-delà de 6 mois | LUN-54 | Obligation RGPD avant toute donnée réelle |
| Revoir le parcours central pour y intégrer la fiche de ménage | LUN-50 | Cette carte en est la première version ; le fil rouge M2 reste à mettre à jour |

## Ce que la carte apprend

- **Le back est en avance, le front est le goulot.** Presque tout le MVP est fait
  côté API ; aucun écran v2 n'existe. La carte plaide pour faire passer LUN-79
  (front v2) juste après la publication de v0.1.0, avant les passkeys
  (proposition, à décider par l'équipe).
- **La fiche de ménage est le seul module du MVP sans API.** C'est pourtant le
  besoin d'origine : LUN-76 et LUN-77 sont à planifier tôt.
- **Les personas 3 et 4 font apparaître des besoins absents du backlog** :
  notifications aux parents, rôle de responsable de crèche. Ils sont notés
  `à créer` et seront discutés lors de la séance sur la vision produit.
