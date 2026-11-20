# Proposition : éviter les doublons quand on clique sur « Réessayer »

> Proposition d'amélioration de la gestion des erreurs, faite pendant le stage
> (TD « Road to MVP »), après LUN-128 et LUN-146. Écart proposé : **E9** de
> [ERREURS.md](ERREURS.md). Constats `[RÉEL]` relus dans le code de `develop`
> le 2026-11-20 ; la solution est une **proposition**, rien n'est codé.
> Rédigée avec l'aide de Claude Code (règle 4 d'AGENTS.md).

## En bref

Le bouton « Réessayer » (LUN-142) peut **enregistrer deux fois** la même chose,
ou afficher une erreur alors que l'action a réussi. Cela arrive quand la requête
est bien arrivée à l'API, mais que la réponse s'est perdue. Je propose une
**clé d'idempotence** : l'écran envoie un identifiant par envoi de formulaire,
et l'API ne traite qu'une fois deux requêtes portant la même clé.

## 1. Le problème

[ERREURS.md § 4](ERREURS.md#4-côté-front--un-traitement-par-catégorie) dit
qu'une écriture n'est jamais rejouée automatiquement, parce que « rejouer un
pointage ou une coche pourrait l'enregistrer deux fois ». L'écran propose alors
« Réessayer ».

Le clic sur « Réessayer » a le même risque, dans un cas que le document ne
traite pas : **l'écriture a réussi, mais l'écran ne l'a pas su**.

| Cas | Ce qui se passe | Ce que voit l'employée |
|---|---|---|
| Wi-Fi de la tablette coupé pendant la réponse | L'API a enregistré, la réponse n'arrive pas | « Connexion au serveur impossible » + « Réessayer » |
| API lente | nginx coupe au bout de 30 s (`proxy_read_timeout`, [nginx.conf.template:103](../../docker/web/nginx.conf.template#L103)) et répond 504, mais l'API termine et valide l'écriture | « Service indisponible » + « Réessayer » |

Dans les deux cas, la personne clique sur « Réessayer » : c'est ce qu'on lui
propose.

### Conséquences selon la route `[RÉEL]`

| Écriture | Protection actuelle | Effet du second envoi |
|---|---|---|
| Arrivée d'un enfant (tablette) | une seule présence ouverte par enfant (index unique) | 409 « Arrivée déjà pointée » : **erreur affichée alors que le pointage a réussi** |
| Coche de ménage (tablette) | une coche par tâche et par jour (`uq_cleaning_check_one_per_day`) | 409 `task_already_done` : **même fausse erreur** |
| Pièce, tâche du catalogue | nom unique (`uq_room_nursery_name`, `uq_cleaning_task_enterprise_name`) | 409 `room_name_taken` ou `task_name_taken` : **fausse erreur** |
| Transmission (LUN-146), famille, enfant, responsable, tablette enrôlée | aucune | **doublon en base** |

Aucun mécanisme d'idempotence n'existe aujourd'hui : une recherche de
« idempot » dans `api/app` et `front/src` ne trouve que la purge et le seed.

## 2. La solution proposée

L'en-tête `Idempotency-Key` est la pratique courante des API d'écriture (Stripe
par exemple), en cours de normalisation à l'IETF.

### Côté front

- **Clé par envoi** : chaque envoi d'un formulaire reçoit une clé aléatoire (`crypto.randomUUID()`), envoyée dans l'en-tête `Idempotency-Key`.
- **« Réessayer »** : il réutilise **la même clé**.
- **Après un succès** : un nouvel envoi du formulaire crée une nouvelle clé.
- **Où le coder** : à un seul endroit (le client `openapi-fetch` ou un petit hook autour de `useMutation`), pour que chaque formulaire n'ait rien à faire.

### Côté API

- **Lecture de la clé** : une dépendance commune, sur le modèle de `ReadableNursery`, lit l'en-tête sur les routes d'écriture concernées.
- **Clé nouvelle** : la route s'exécute normalement, et l'API enregistre la clé, l'utilisateur (ou la tablette), la méthode et le chemin, une empreinte du corps, le statut et la réponse.
- **Même clé, même corps** : l'API renvoie **la réponse enregistrée**, sans rien réécrire.
- **Même clé, autre corps** : 422 avec un code stable, à ajouter au catalogue (proposition : `idempotency_key_reused`).
- **Clé encore en cours de traitement** : 409 avec un code stable (proposition : `idempotency_in_progress`).
- **Sans en-tête** : comportement actuel, inchangé (compatibilité).
- **Table** : une nouvelle table `idempotency_key`, donc une migration. Clé unique par utilisateur, pour qu'un compte ne puisse pas lire la réponse d'un autre.
- **Conservation** : 24 h, puis suppression par la purge existante (`python -m app.purge`, LUN-54).

### Ce que ça ne change pas

- Les écritures ne sont toujours **jamais rejouées automatiquement** : le choix reste à la personne.
- Les contraintes d'unicité en base restent : elles protègent même sans en-tête.

## 3. Découpage proposé (story pour l'épic LUN-127)

> En tant qu'employée qui pointe sur la tablette, je veux pouvoir cliquer sur
> « Réessayer » sans risque, afin de ne jamais enregistrer deux fois un enfant,
> une coche ou une transmission, ni voir une erreur pour une action réussie.

| Sous-tâche | Contenu |
|---|---|
| [Back] | Table `idempotency_key` et migration, dépendance commune, codes ajoutés au catalogue et documentés dans Swagger, purge à 24 h ; d'abord sur l'arrivée, le départ, la coche de ménage et la transmission |
| [Front] | Clé par envoi gardée par « Réessayer », sur les mêmes écrans ; story Storybook et test MSW « la réponse se perd, Réessayer ne crée qu'une ligne » |
| [Doc] | Écart E9 dans ERREURS.md § 1, règle ajoutée au § 4 et au § 6 (« ajouter une écriture ») |

### Critères d'acceptation

```gherkin
Fonctionnalité: Réessayer sans doublon

  Scénario: La réponse se perd, l'employée réessaie
    Étant donné une transmission enregistrée par l'API dont la réponse n'est pas arrivée
    Quand l'employée clique sur « Réessayer »
    Alors l'API renvoie la même transmission (201, même identifiant)
    Et une seule transmission existe en base

  Scénario: Arrivée déjà pointée, réponse perdue
    Étant donné une arrivée enregistrée dont la réponse n'est pas arrivée
    Quand l'employée clique sur « Réessayer »
    Alors l'écran affiche l'arrivée pointée, sans message d'erreur

  Scénario: Nouvel envoi volontaire
    Quand l'employée envoie une deuxième transmission après un succès
    Alors une nouvelle clé est utilisée et une deuxième transmission est créée

  Scénario: Clé réutilisée pour autre chose
    Quand une requête réutilise une clé avec un corps différent
    Alors l'API répond 422 avec le code idempotency_key_reused

  Scénario: Sans en-tête
    Quand une requête arrive sans Idempotency-Key
    Alors l'API se comporte comme aujourd'hui
```

### Tests à prévoir

- **Intégration** : même clé deux fois → une ligne et la même réponse ; deux clés → deux lignes ; clé d'un autre utilisateur → traitée comme nouvelle ; purge au-delà de 24 h.
- **Front** : MSW simule une écriture enregistrée puis une coupure réseau ; « Réessayer » envoie la même clé.
- **Mutations** : clé ignorée par l'API, clé régénérée par « Réessayer ».

## 4. Alternative plus légère

Si la story paraît trop grosse pour le moment : côté front seulement, traiter
comme un succès un `already_present` (arrivée) ou un `task_already_done` (coche) reçu
**juste après un « Réessayer »**, puis relire la liste. Cela supprime les fausses
erreurs sur la tablette, mais **pas les doublons** (transmissions, familles,
enfants, tablettes).

## 5. Questions pour l'équipe

1. Quelles écritures en premier : la tablette seulement, ou aussi les écrans de la direction ?
2. Durée de conservation des clés : 24 h suffisent-elles ?
3. Faut-il exiger l'en-tête sur ces routes (refus sans clé), ou le laisser facultatif ?
