# Journal des versions

Toutes les évolutions notables de Luniqo. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[SemVer](https://semver.org/lang/fr/) (règles dans [CONTRIBUTING.md](CONTRIBUTING.md#3-versions-semver)).
Chaque ligne cite son ticket Jira `LUN-<n>`.

## [Non publié]

### Ajouté

- API : mise en route d'une crèche (`GET /api/v2/nurseries/{id}/onboarding`), réservée à sa direction : succès « personnel » (un employé actif a accès), « tablette » (une tablette ni révoquée ni expirée) et « premier pointage », chacun daté de sa plus ancienne preuve encore valable et perdu si sa condition disparaît (LUN-128).
- Front v2 : page « Mise en route » d'une crèche pour la direction, depuis sa carte sur l'accueil : progression, date de chaque succès, et pour chaque succès manquant ce qu'il faut faire, avec un lien vers les tablettes ou les présences du jour ; chargement, erreur avec « Réessayer », lisible en 800 × 600 (LUN-128).
- API : transmissions de la journée sur un enfant (`POST /api/v2/nurseries/{id}/children/{child_id}/notes`, `GET /api/v2/nurseries/{id}/notes?day=`), pour la direction et les employés ayant accès à la crèche ; jour à Paris, heure et auteur fixés par le serveur ; table `child_note` (migration 0015), enfant lié à sa crèche en base ; pas d'information médicale (LUN-146).
- Front v2 : transmissions du jour sous chaque enfant de « Présences du jour », les plus récentes d'abord, avec un formulaire d'ajout ; saisie refusée affichée sous le champ, panne ou coupure réseau avec « Réessayer » sans perte de la saisie ni renvoi automatique ; lisible en 800 × 600 (LUN-146).
- Front v2 : depuis les présences du jour, la direction peut corriger un pointage ou ajouter une présence oubliée, avec un motif obligatoire et actualisation immédiate du tableau après enregistrement (LUN-122).
- API : résumé de chaque crèche (`GET /api/v2/nurseries/{id}/summary`) avec les enfants accueillis (actifs et en adaptation), présents du jour à Paris et employés actifs ayant accès ; mêmes contrôles d'accès que la lecture d'une crèche (LUN-124).
- Front v2 : chaque carte de l'accueil affiche les enfants accueillis, présents et le personnel de la crèche, avec actualisation toutes les 30 secondes ; chargement, valeurs nulles et erreur locale avec possibilité de réessayer, sans bloquer les autres cartes ni leurs liens ; présentation adaptée à 800 × 600 (LUN-124).
- Historique des fiches de ménage : tâches cochées sur une période, annulées comprises, filtrables par pièce, et export CSV pour un contrôle (tableur en français, formules neutralisées) (LUN-71).
- Comptes des employés : la direction crée le compte et transmet un lien d'invitation à usage unique, l'employé choisit son mot de passe ; départ d'un salarié avec fermeture immédiate de ses sessions ; changement de mot de passe qui ferme les autres sessions (LUN-55).
- Documentation de l'API complétée (Swagger, `/api/docs`) : présentation de l'authentification et des conventions, chaque route décrite avec ses erreurs possibles et leurs messages, cookies déclarés comme schémas de sécurité, exemple pour chaque corps de requête ; schéma validé à chaque test (LUN-118).
- Variable `API_DOCS=false` pour désactiver Swagger UI et ReDoc en production ; le schéma `/api/openapi.json` reste servi (LUN-118).
- Protection des branches `develop`, `staging` et `main` : PR obligatoire, relectures, CI et conventions de PR obligatoires, ni suppression ni push forcé ; tags de version non modifiables ; branche par défaut `develop` ; configuration exportée dans `.github/rulesets/` (LUN-60).
- Purge RGPD : sessions expirées, journal des connexions au-delà de 6 mois et invitations expirées supprimés à chaque démarrage de l'API et par la commande `python -m app.purge` (LUN-54).
- Passkeys (Face ID, Touch ID, Windows Hello…) côté API : enregistrement de plusieurs passkeys nommées, second facteur après le mot de passe, connexion sans mot de passe qui vaut les deux facteurs ; la direction peut garder une passkey seule comme facteur (LUN-62).
- Front v2 (`front/`, React + Vite) : connexion, second facteur (code ou code de secours), activation d'une application d'authentification avec ses codes de secours, déconnexion, et un premier écran qui liste les crèches accessibles. Client d'API typé, généré depuis le schéma OpenAPI ; Storybook pour documenter les composants ; tests unitaires, de composants, de stories (accessibilité comprise) et parcours de bout en bout (LUN-107).
- CI : vérification du front v2 (contrat d'API à jour, lint, typage, tests, build, Storybook) et parcours Playwright contre la pile démarrée (LUN-107).
- TP Docker, consigne supplémentaire : conteneurs de CI `lint` (ruff, ShellCheck, refus de toute image Docker Hub) et `test` (tests unitaires et d'intégration sur une base jetable), enchaînés par `docker/pipeline.sh` (lint → test → déploiement de la pile) et lancés à chaque PR par la CI GitHub (LUN-115).
- TP Docker : banc de mesure de la consommation CPU des conteneurs (`docker/bench/bench.sh`, générateur de charge wrk), au repos, sous charge et pendant la CI, avec le coût de Docker lui-même (LUN-115).
- Front v2 : la direction gère les tablettes de chaque crèche, depuis l'accueil : enrôlement de l'appareil sur lequel la page est ouverte (le jeton reste dans un cookie que le JavaScript ne lit pas), liste avec l'état de chaque tablette (active, expirée, révoquée) et révocation après confirmation (LUN-87).
- Front v2, mode tablette (`/tablette`) : la tablette enrôlée affiche les employés de sa crèche ; l'employé choisit son nom et tape son PIN sur un pavé à grands boutons (ou au clavier), vérifié par l'API ; messages pour un PIN incorrect, bloqué ou non choisi ; l'employé identifié termine sa session, qui se ferme aussi d'elle-même au bout de 2 minutes (LUN-88).
- Front v2, mode tablette : après son PIN, l'employé pointe les enfants attendus aujourd'hui, rangés en « À accueillir », « Présents » et « Partis » ; arrivée en précisant, s'il le veut, qui amène l'enfant ; départ avec la personne qui vient le chercher, choisie parmi celles autorisées (les autres sont signalées) ; heure du serveur, confirmation affichée, retour au PIN si la session a expiré (LUN-89).
- Front v2 : présences du jour d'une crèche, pour la direction et les employés, depuis l'accueil : présents en ce moment, arrivées et départs, puis une ligne par arrivée avec les heures (Paris), qui a pointé et qui a amené ou cherché l'enfant ; relues toutes les 30 secondes (LUN-91).
- Front v2 : l'employé choisit ou change son PIN de tablette depuis son accueil (saisi deux fois, confirmé par son mot de passe) ; un nouveau PIN débloque aussi un PIN bloqué. Jusqu'ici, aucun écran ne le permettait (LUN-119).
- API : présences d'une crèche sur une période (`GET /api/v2/nurseries/{id}/attendance/history`, 7 derniers jours par défaut, 366 au plus) et leur export CSV pour un tableur (séparateur `;`, heures de Paris, formules neutralisées, jamais gardé en cache) (LUN-93).
- Front v2 : historique des présences d'une crèche, depuis les présences du jour, pour la direction et les employés : période choisie par deux dates ou un raccourci (7 derniers jours, mois en cours, mois précédent), gardée dans l'adresse ; chiffres de la période, un tableau par jour, départs oubliés signalés « Départ non pointé » ; bouton « Exporter en CSV » qui télécharge le fichier de la période affichée, ou affiche le refus de l'API (LUN-92).
- API : la direction corrige un pointage (heures, personne qui a amené ou cherché l'enfant), ajoute une présence oubliée ou annule une présence pointée sur le mauvais enfant, avec un motif obligatoire, sur les 31 derniers jours. Un départ oublié se ferme ainsi sans toucher à la base, et la tablette accepte de nouveau l'arrivée de l'enfant. Chaque correction est consignée dans un journal (auteur, heure, motif, avant et après) consultable sur une période ; les présences corrigées sont marquées, et l'export CSV gagne une colonne « Corrigé » (LUN-120).
- Front v2 : la direction corrige les pointages depuis l'historique des présences. Bouton « Corriger » sur chaque présence des 31 derniers jours (heures, personne qui a amené ou cherché l'enfant parmi celles autorisées, motif obligatoire), retrait d'une présence pointée sur le mauvais enfant après confirmation, ajout d'une présence oubliée ; les présences corrigées sont marquées « Corrigée », et le journal des corrections de la période (qui, quand, pourquoi, avant et après) s'affiche sous les tableaux. Les employés ne voient ni les boutons ni le journal (LUN-121).
- Story map v2 (conçue par Thomas) dans `docs/produit/` : version interactive `story-map.html` et sa transcription `STORY-MAP.md`, en trois niveaux (épics, US, sous-tâches), clés et avancement vérifiés dans Jira et dans le code, US du stagiaire et de l'équipe, gestion des erreurs dans les fondations ; personas imposés par le TD (Alex, Margeritte) ajoutés à `PERSONAS.md`, les six fiches illustrées (LUN-126).

### Modifié

- Contribution et onboarding : la CI refuse une PR dont le titre n'est pas au format d'un commit terminé par la clé de sa branche, ou dont le modèle est laissé tel quel ; modèle de PR avec la ligne `Closes #<issue>` pour un stage ; fins de ligne LF imposées (un clone sous Windows ne casse plus les images Docker) ; tests du front dans le navigateur toujours avec les styles réels ; onboarding mis à jour (Windows, gestion des erreurs, vérification en 800 × 600, suivi Jira d'un stage) et `docs/stage/` prêt pour plusieurs stages (LUN-145).
- Front v2 : une action qui échoue dit quoi faire. Après une panne du serveur ou du réseau, « Réessayer » sur les listes et sur le pointage de la tablette (renvoie le même choix, jamais tout seul) ; après trop de tentatives, un compte à rebours remplace le délai écrit dans le message, et le bouton reste désactivé jusqu'au bout (connexion, second facteur, PIN, pavé de la tablette) ; une bannière « Hors ligne » en haut de chaque page quand le réseau ou le serveur ne répond plus, retirée dès qu'il répond. Les lectures sont redemandées 2 fois sur une panne seulement ; un envoi n'est jamais rejoué ni gardé pour plus tard (LUN-142).
- Front v2 : une erreur serveur affiche, avec son message, la référence à transmettre au support (« Référence : … »), retrouvée dans les journaux ; les refus (4xx) n'en affichent pas (LUN-141).
- Passerelle : la référence de chaque requête (`X-Request-ID`) est créée ou reprise, transmise à l'API et écrite dans le journal d'accès ; si l'API ne répond pas, `/api/` renvoie une erreur JSON (`service_unavailable`, avec la référence) que le front sait lire, au lieu de la page HTML (LUN-139).
- API : chaque réponse porte une référence (`X-Request-ID`, reprise de la passerelle si elle est sûre), écrite aussi dans un journal JSON, une ligne par requête, sans IP ni données saisies ; une erreur imprévue répond 500 avec un message générique et cette référence, la pile n'allant qu'au journal (LUN-140).
- API : toute erreur renvoie `{"detail", "code", "fields"?}` ; le `code` est stable et documenté dans Swagger pour chaque route, les erreurs de saisie (422) sont traduites en français avec un message par champ, les dates incohérentes d'un enfant indiquent chaque champ fautif ; un test vérifie que toute erreur levée est documentée (LUN-137).
- Front v2 : une saisie refusée par l'API affiche son message sous le champ concerné (connexion, second facteur, PIN, enrôlement d'une tablette, correction et ajout d'une présence), le résumé restant en haut du formulaire ; le front décide sur le code de l'erreur, plus sur son texte (second facteur, PIN bloqué ou non choisi sur la tablette) (LUN-138).
- Front v2, tests : réponses d'erreur de l'API partagées par les tests et les stories (`front/test/handlers/errors.ts`), à la forme exacte du contrat ; plus aucun corps d'erreur écrit à la main dans un test ; stories « erreur serveur » et « hors ligne » pour chaque composant qui appelle l'API, « trop de tentatives » au second facteur et au choix du PIN ; tests d'une erreur serveur et d'une coupure réseau pendant un pointage sur la tablette, qui vérifient que le pointage n'est jamais renvoyé sans l'employé (LUN-143).
- API : toute réponse 429 indique le délai à attendre (`Retry-After`), y compris au changement de mot de passe, au choix du PIN et sur une tablette après trop d'erreurs de PIN (LUN-137).

- Onboarding mis à jour pour le stage du TD « Road to MVP » : matrice des droits, contribution par fork, front v2 (installation, tests, Storybook, contrat de l'API), design system du front v2 ; mission du stage et modèles de rapport (stagiaire, maître de stage) dans `docs/stage/` (LUN-123).
- La pile Docker retrouve une image `front` distincte : elle construit le front v2 et le sert avec un nginx dédié (politique de sécurité du contenu, cache) ; la passerelle `web` ne fait plus que relayer le front et l'API (LUN-117).
- La pile Docker sert le front v2 depuis l'image `web` (nginx), avec une politique de sécurité du contenu stricte et un cache adapté ; le conteneur du front Next.js v1 est retiré, la pile compte 4 images. La v1 reste en production sur Vercel jusqu'à la bascule (LUN-107).

### Sécurité

- Contributions par fork : la CI attend l'accord d'un membre de l'équipe à chaque exécution, l'étiquetage automatique est sauté (sans jeton en écriture) ; `staging` exige désormais une relecture, une promotion en pré-production demande deux personnes (LUN-123).
- Les fenêtres du front v2 utilisent l'élément natif `<dialog>` : le Dialog de Radix injectait une balise `<style>` que la politique de sécurité du contenu refuse, sans l'assouplir (LUN-121).
- Le blocage du TOTP au 100e échec consécutif ne dépend plus du journal des connexions : la purge ne peut plus le lever (LUN-54).

### Corrigé

- API : les migrations lancées dans le même processus (tests d'intégration) ne désactivent plus le journal JSON de l'API ; la CI de `develop` était rouge depuis la fusion de LUN-140 (LUN-139).
- Front v2 : une route qui exige de nouveau le second facteur menait à son écran, qui renvoyait aussitôt à l'accueil, la session en cache se disant encore vérifiée ; la session est désormais relue (LUN-138).
- Le test qui interdit les dépendances synchrones (régression LUN-41) ne vérifiait aucune route : FastAPI 0.143 ne les liste plus dans `app.routes`. Il parcourt désormais les routes effectives et échoue s'il n'en trouve pas (LUN-118).

## [0.1.0] - 2026-10-10

Première version numérotée. Elle rassemble le travail fait avant l'adoption de
ce journal, l'organisation du projet (LUN-60) et la fiche de ménage côté API
(LUN-69, LUN-70). Les clés sont celles de Jira ; un ticket du backlog d'origine a
pour clé son ancien numéro + 38 (`LUN-006` est devenu `LUN-44`).

> Clés corrigées le 2026-10-29 (LUN-116) : cette section citait à l'origine
> `LUN-76` et `LUN-77`, calculées avec une règle fausse pour les stories ; les
> PR et les commits de la version gardent ces anciennes clés
> ([correspondance](docs/projet/JIRA.md#8-anciennes-clés-citées-avant-le-2026-10-29)).

### Ajouté

- API v2 (FastAPI, PostgreSQL) : comptes et sessions, mots de passe Argon2id, limitation des tentatives (LUN-41).
- Entreprises, crèches et accès du personnel par crèche, isolation vérifiée en base (LUN-42).
- Tablettes enrôlées, PIN vérifié côté serveur, sessions d'action de 2 minutes (LUN-43).
- Second facteur obligatoire pour la direction : TOTP chiffré, codes de secours (LUN-44, partie 1).
- Familles, enfants, responsables et autorisations, sans données de santé (LUN-47).
- Pointage des arrivées et départs depuis la tablette, suivi par la direction (LUN-48).
- Comptes familles par invitation, consultation réservée à l'autorité parentale (LUN-49).
- Conteneurisation : 5 images construites depuis `scratch`, pile Docker Compose (LUN-39, tag `tp-docker-v1`).
- Tests d'intégration sur une vraie PostgreSQL (LUN-45) et intégration continue GitHub Actions (LUN-46).
- Organisation du projet : README pour les développeurs, CONTRIBUTING (branches `develop` / `staging` / `main`, SemVer, cycle de vie des tickets, Definition of Done), ce journal, import du backlog dans Jira (LUN-60).
- Vision produit : 4 personas et une story map avec la découpe du MVP ; diagramme `gitGraph` du circuit complet des branches (LUN-60).
- Automatisations GitHub : CI sur `develop`, `staging` et `main` ; contrôle des noms de branche, des cibles et des titres de PR ; étiquettes `front`, `back`, `infra`, `doc` posées selon les fichiers modifiés ; modèle de PR (LUN-60).
- Fiche de ménage, côté API : pièces de chaque crèche, catalogue des tâches de l'entreprise, fréquences (chaque jour, certains jours, le premier jour donné du mois) et fiche du jour en heure de Paris ; pièces fictives dans le jeu de démonstration (LUN-69).
- Fiche de ménage remplie depuis la tablette : l'employé identifié par PIN coche les tâches du jour (heure et auteur fixés par le serveur, noms recopiés tels qu'au moment de la coche) ; décocher le jour même annule la coche sans l'effacer (LUN-70).

### Corrigé

- Déploiement Vercel du front v1 refusé : le dossier `api/` était compté comme fonctions serverless ([ANO-003](M2/bloc-4-maintien-operationnel/anomalies/ANO-003-vercel-fonctions-api.md), LUN-49).

### Sécurité

- [ANO-001](M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md) (PIN de tablette vérifié dans le navigateur en v1) corrigée par conception dans la v2 (LUN-43). La v1 reste concernée.
