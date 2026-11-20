# « À traiter » sur l'accueil de la direction

> Conception du 2026-11-20 (validée par Florent le 2026-11-20). Piste « le travail d'abord », planche F
> (<https://claude.ai/artifact/QmL4oNBwdtak6zABc8T64G>). Approche A choisie par Florent : la liste est calculée par
> l'API. Recherche : [docs/recherches/a-traiter-2026-11-20.md](../../recherches/a-traiter-2026-11-20.md).

## Ce qu'on construit

Deux sous-tâches, dans cet ordre : l'API, puis l'écran.

### 1. API : `GET /api/v2/to-do`

- Réservée à la direction (`owner`) ; couvre toutes ses crèches ; paramètre facultatif `nursery_id` (même contrôle
  d'accès que la lecture d'une crèche ; une crèche d'une autre entreprise → 404).
- Réponse : `{ "items": [ToDoItem], "total": int }`, items triés par priorité puis ancienneté. `ToDoItem` :
  `kind`, `nursery_id`, `nursery_name`, `subject_id`, `subject_name`, `since` (date-heure UTC), et selon le genre
  `day` (jour à Paris). Aucun texte de phrase : le front les écrit.
- Genres, du plus prioritaire au moins prioritaire :

| `kind` | Condition | Sujet | Geste proposé |
|---|---|---|---|
| `pin_locked` | employé actif ayant accès à la crèche, `pin_locked_at` non nul | l'employé | « Débloquer » (route existante `POST /api/v2/staff/{id}/pin/unlock`) |
| `tablet_expired` | tablette non révoquée, expirée depuis 30 jours au plus | la tablette | « Enrôler de nouveau » → écran Tablettes |
| `departure_missing` | présence sans départ, jour antérieur à aujourd'hui (Paris), dans les 31 derniers jours | l'enfant (+ `day`) | « Corriger » → historique des présences sur ce jour |
| `tablet_expiring` | tablette non révoquée qui expire dans 7 jours ou moins | la tablette | « Renouveler » → écran Tablettes |
| `onboarding_incomplete` | mise en route de la crèche incomplète (LUN-128) | la crèche | « Voir la mise en route » |

- Règles pures dans `api/app/todo/policy.py` (seuils, ordre), lecture dans `service.py`, en lecture seule ; tests
  unitaires des règles, tests d'intégration sur PostgreSQL (isolation entre entreprises, crèche sans accès,
  employé inactif, tablette révoquée, présence d'une autre crèche, jour à Paris autour de minuit) ; erreurs déclarées
  dans Swagger comme les autres routes ; contrat du front régénéré.

### 2. Écran : accueil de la direction

- Titre : « N choses à régler » quand la liste n'est pas vide, sinon « Accueil » ; date en surtitre.
- Section « À traiter » : une ligne par élément (icône de sa famille, phrase, crèche, un seul bouton), 5 lignes puis
  « Voir les N autres ». « Débloquer » agit sur place (puis la liste est relue) ; les autres boutons mènent à l'écran.
- Liste vide : « Rien à régler pour l'instant », une phrase sur ce qui apparaîtra ici, la créature `today` (LUN-151).
- Puis « Vos crèches maintenant » (cartes existantes).
- Choix « Tout le groupe » ou une crèche : la liste suit la crèche courante.
- Employés et parents : accueil inchangé (« Ma journée » viendra avec la planche H).

## Hors périmètre (plus tard)

Invitations d'employés et de parents en attente (il faut un lien à copier tant que les e-mails n'existent pas,
LUN-59) : avec les écrans Personnel et Familles. Tablette muette, transmissions manquantes : non retenus pour l'instant.

## Contraintes

Règles du dépôt (module API, migrations : aucune ici, tests et mutations, parcours sur pile Docker isolée), front :
cadre LUN-150, personnage LUN-151 (PR #108 à fusionner avant l'écran), règles de la fiche de recherche.
