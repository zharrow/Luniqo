# AGENTS.md — Orientation de chaque nouvelle session

Ce fichier dit à tout agent (Claude Code, Codex…) **ce que l'on fait dans ce dépôt, pourquoi, et où on en est**. La référence technique (stack, architecture, règles de code) est dans [CLAUDE.md](CLAUDE.md).

> Dernière mise à jour : 2026-10-10. Mettre à jour « État d'avancement » à la fin de chaque session de travail.

## La mission en une phrase

Luniqo, l'application de gestion de crèches de Florent, sert de **projet fil rouge** pour valider son M2 chez Ynov Toulouse. La v1 actuelle (Next.js + Supabase Cloud) est **réécrite progressivement** en une v2 dotée d'un vrai backend (FastAPI) et de PostgreSQL, **conteneurisée, intégrée et déployée en continu sur un VPS, puis supervisée**. Le projet est piloté comme un projet d'équipe : le terrain est réel, l'équipe est fictive, le travail technique est réel.

## Avant de commencer une tâche

1. Lire ce fichier en entier, puis [CLAUDE.md](CLAUDE.md) (chargé automatiquement par Claude Code).
2. Lire [M2/FIL-ROUGE-RNCP39583.md](M2/FIL-ROUGE-RNCP39583.md) : plan annuel, matrice des preuves, règles de travail.
3. Lire les décisions ([M2/decisions/](M2/decisions/)), les anomalies ouvertes et l'état d'avancement ci-dessous.
4. Identifier la ou les compétences RNCP visées par la tâche (ex. `C2.1.2`) et le ticket correspondant (`LUN-###`). S'il n'y en a pas, le proposer avant de coder.
5. Si la tâche vient d'un cours, appliquer les contraintes de son sujet (voir « Cours en cours » et `M2/cours/`).
6. Si Florent dit seulement « continue » au début d'une conversation : reprendre au **Point de reprise** (fin de ce fichier), après avoir vérifié sur GitHub l'état des PR qui y sont citées.

## « Mets ta mémoire à jour » : comportement attendu

Quand Florent demande de mettre la mémoire à jour, l'assistant fait **les deux** :

1. **Sa mémoire persistante** (hors dépôt) : point de reprise exact, décisions et préférences nouvelles, leçons apprises.
2. **Ce fichier** : tableau « État d'avancement », « Prochaines actions » et **« Point de reprise »** réécrit pour qu'un « continue » dans une nouvelle conversation reprenne exactement là où le travail s'est arrêté : PR ouvertes et leur état, branche locale non poussée éventuelle, tâche suivante et ce qui la bloque, actions attendues de Florent. Ce fichier est versionné : la mise à jour passe par la PR en cours (ou une PR dédiée), jamais par un commit direct sur `main`.

Rien de secret ni de personnel dans ce fichier (dépôt public, règle 10).

## Le diplôme et les 4 blocs

- **Certification** : RNCP39583 « Expert en développement logiciel », certificateur YNOV, enregistrée du 01/10/2024 au 01/10/2029. C'est bien celle que Florent passe (confirmé le 2026-10-08), même si le nom commercial de la formation diffère (« Mastère Expert en Informatique et Système d'Information »).
- **Évaluation** : chaque bloc est une « mise en situation professionnelle réelle ou fictive » sur un logiciel développé pendant la formation. Commanditaire fictif et équipe simulée acceptés selon l'école (information rapportée par Florent, pas de confirmation écrite).
- **Référentiel officiel (17 p.)** : <https://www.francecompetences.fr/wp-json/api/v1/activity/export/26524/541984>. Il fait foi sur les intitulés et critères. Les identifiants `C1.1.1`, etc. viennent de ce document.

| Bloc | Intitulé officiel | Format d'évaluation | Ce que Luniqo doit prouver |
|---|---|---|---|
| **BC01** | Cadrer un projet de développement d'applications logicielles | **Oral** : soutenance de cadrage | Parties prenantes, analyse de la demande, SWOT/opportunités, audit de l'existant, registre des risques, veille, comparatif d'architectures, chiffrage (charge + budget), schéma d'architecture, argumentaire client |
| **BC02** | Concevoir et développer des applications logicielles | **Dossier écrit** + code source | Environnements, protocoles CI et CD, critères qualité/perf, prototype, tests unitaires, sécurité (OWASP, accessibilité), historique de versions, cahier de recettes, plan de correction, manuels (déploiement, utilisation, mise à jour) |
| **BC03** | Coordonner et piloter un projet de développement d'applications logicielles | **Oral** + démonstration | Méthodologie justifiée, planning (Gantt) découpé en lots, RACI, outil de suivi + indicateurs (délais, coûts, risques, RH), cas d'arbitrage (logigramme), management (styles, handicap, multiculturel), grille de compétences + plan de formation, comptes rendus client, indicateurs de satisfaction, démo |
| **BC04** | Maintenir l'application logicielle en condition opérationnelle | **Dossier écrit** | Processus de mise à jour des dépendances, supervision et alertes (sondes), collecte et consignation des anomalies, correctif déployé avec non-régression, axes d'amélioration, journal des versions, collaboration support |

## Règles de conduite (non négociables)

1. **Réel ≠ simulé.** Tout document indique si un fait est réel (commande exécutée, mesure, commit, échange réel) ou simulé (réunion d'équipe fictive, validation d'un persona, budget valorisé). Mention explicite : `[RÉEL]` / `[SIMULÉ]`.
2. **Ne jamais inventer un résultat.** Une mesure, un taux de couverture, un temps de réponse ou un « ça marche » ne s'écrit qu'après exécution, avec la date, la version (commit/tag) et la commande. Sinon : statut « à vérifier ».
3. **Pas de faux commits.** Les commits de l'assistant sont ceux de Florent (avec la ligne `Co-Authored-By`). Les coéquipiers réels du cours de coordination signent leurs propres commits. On n'attribue jamais de code à un membre fictif : l'équipe fictive existe dans les documents de pilotage du RNCP, pas dans l'historique git ni dans Jira.
4. **Assistance déclarée.** Le M2 demande de distinguer contribution personnelle, assistance et sources. Quand l'assistant produit une part significative d'un livrable, le noter dans la fiche du travail ou le journal.
5. **Données synthétiques uniquement.** Jamais de données réelles d'enfants, de familles ou de salariés dans les seeds, captures, démos ou dépôts. Allergies, PAI et santé sont des données de santé : traiter le RGPD et la question de l'hébergement de données de santé (HDS) lors du cadrage.
6. **Pas de commande destructive sans cible connue.** `pnpm seed` / `db:reset` utilisent la clé service role de `.env.local`, qui peut pointer vers le Supabase Cloud de la v1. Vérifier la destination avant tout reset, migration ou suppression.
7. **Traçabilité.** Ticket `LUN-###` → branche → PR → version taguée → entrée du journal des versions. Chaque livrable M2 référence les compétences qu'il couvre.
8. **Contraintes de cours respectées.** Une contrainte imposée par un sujet prime sur nos préférences. Si elle ne sert pas Luniqo, en discuter avec Florent plutôt que de la contourner.
9. **Commanditaire réel, propos réels.** Bee a Baby et ses dirigeants sont réels : on ne leur attribue que ce qui a réellement été dit ou fait. Les revues et validations simulées sont tenues par la Product Owner fictive, qui représente le client (rôle normal en Scrum), jamais au nom de Simona. Un retour réel de la crèche est consigné comme tel, daté, avec son canal.
10. **Dépôt public.** `zharrow/Luniqo` (anciennement `nursery-app`, renommé le 2026-10-08) est public, et c'est le **seul dépôt du projet** (code, TP, documentation M2). Personnes réelles citées : Florent ; Simona (directrice de Bee a Baby) par choix de Florent ; Thomas, Pauline et Julien (équipe du cours de coordination, prénom et rôle, avec leur accord du 2026-10-09) ; personne d'autre. Aucune information sur les enfants accueillis ni sur la famille de Florent, aucun secret. Le détail d'une faille non corrigée reste sobre tant que la v1 est en ligne.
11. **Langue.** Documentation et échanges en français. Code, identifiants, noms de fichiers techniques en anglais (convention existante).

## Le scénario

### Commanditaire : la micro-crèche Bee a Baby (Escalquens) `[RÉEL]`

| | |
|---|---|
| Structure | BEE A BABY, SAS, SIREN 935 213 074, créée le 16/10/2024, un seul établissement |
| Activité | NAF 88.91A « accueil de jeunes enfants », à Escalquens (Haute-Garonne). Une micro-crèche accueille au plus 12 enfants simultanément |
| Lieu | Environ 170 m² : salle d'activité, deux dortoirs, espace de change, extérieur sécurisé. Repas bio, de saison, en circuit court |
| Sources | <https://www.beeababy.com> et <https://annuaire-entreprises.data.gouv.fr/entreprise/bee-a-baby-935213074>, consultés le 2026-10-08 |

Historique du besoin `[RÉEL]` :

1. **Simona, directrice de la crèche**, remplit chaque jour à la main les fiches de ménage et doit les conserver. Premier besoin : les digitaliser pour supprimer l'écriture manuelle et le stockage papier. C'est l'origine du module nettoyage (pièces, tâches, sessions, historique).
2. **Son mari, qui l'assiste sur tout l'administratif**, a ensuite voulu ajouter la cuisine et l'HACCP (températures, repas, produits, traçabilité).
3. **Florent** a ensuite étendu Luniqo à tout le reste (enfants et familles, présences, personnel, inscriptions, facturation, portail parents, statistiques) pour en faire un logiciel de crèche complet, destiné aux micro-crèches, aux crèches et aux groupes qui en possèdent plusieurs.
4. Les échanges avec la crèche se sont ensuite arrêtés, sans validation de l'outil. Florent poursuit le projet de sa propre initiative.

Ce que cette histoire apporte au M2 :

- Des parties prenantes et des besoins initiaux réels (C1.1.1, C1.1.2).
- Un passage du besoin d'un client unique à un produit pour tout le marché des crèches : opportunités (C1.2.1) et dérive de périmètre à arbitrer (C3.2.2).
- Un risque « désengagement du commanditaire » qui s'est réellement produit (C1.2.3), et un plan de reprise de contact (C3.4.1).
- Le multi-établissements est justifié par la cible « groupes de crèches », pas par Bee a Baby.

Parcours central à démontrer (défini dans le fil rouge) : la direction crée une crèche et ses accès, un employé pointe une arrivée puis un départ, la direction consulte le suivi, une famille ne voit que ce qui la concerne, et un accès à la mauvaise crèche est refusé. **À revoir** : il n'inclut pas encore la fiche de ménage, qui est le besoin réel d'origine.

### Équipe projet (fictive, sauf Florent) — validée le 2026-10-08

| Membre | Rôle | Localisation / contexte | Particularité utile au référentiel |
|---|---|---|---|
| **Florent** `[RÉEL]` | Chef de projet technique, Scrum Master, lead dev | Toulouse | Réalise tout le travail technique réel |
| Inès Haddad | Product Owner | Toulouse | Représente le client dans les rituels simulés, priorise le backlog |
| Mateo Fernández | Développeur front / UX | Valence (Espagne), télétravail | Contexte international, communication en français/anglais/espagnol |
| Sarah Lefèvre | Développeuse back / données | Toulouse | **Malentendante (RQTH)** : communication écrite d'abord, réunions sous-titrées, comptes rendus systématiques |
| Kwame Asante | QA / DevOps, alternant | Montréal → Toulouse (arrivée en cours d'année) | Junior, plan de montée en compétences ; fuseau horaire décalé au début |

Ces profils couvrent les critères BC03 : RACI, styles managériaux selon la maturité (délégatif avec Sarah, directif puis participatif avec Kwame), adaptation au handicap et au multiculturel, grille de compétences, plan de formation, simulation d'absence ou de conflit. Les fiches détaillées iront dans `M2/management/`.

### Méthode : Scrum + Gantt (hybride)

- **Macro (Gantt)** : phases, lots et jalons sur l'année. Sert au planning, au chiffrage et à la comparaison prévu/réel.
- **Micro (Scrum)** : sprints de **2 semaines**, chacun livre un incrément démontrable.
- **Rituels** (simulés, comptes rendus réels datés) : planning de sprint, daily **asynchrone écrit** (adapté à Sarah et au télétravail de Mateo), revue de sprint une fois par mois (démonstration à la PO, qui représente le client ; retour réel de Simona quand c'est possible, consigné comme tel), rétrospective.
- **Definition of Done** : code relu, tests passants, CI verte, documentation à jour, entrée du journal des versions.

### Outils

| Besoin | Outil retenu | Justification |
|---|---|---|
| Backlog et sprints | **Jira** (offre gratuite), projet `LUN` : épic → story → sous-tâche ; statuts À faire → En cours → En revue → Intégré → En recette → Terminé ; relié à GitHub. Mise en place : [docs/projet/JIRA.md](docs/projet/JIRA.md) | Remplace Trello le 2026-10-09 : choisi par l'équipe du cours de coordination (hiérarchie native, gratuit) ; un seul outil pour le cours et le RNCP. Jira ne contient que des personnes réelles |
| Champs Jira | composants `Front` / `Back` / `Infra` / `Doc`, étiquettes `bc01`–`bc04`, `cours-docker`, `cours-coordination`, `securite`, `rgpd`, `tablette`, Story Points, versions `vX.Y.Z` | Relie chaque ticket à une compétence, un cours et une version |
| Planning macro | **Diagramme de Gantt en Mermaid** versionné dans `M2/management/` + export image pour les oraux | Diffable : l'historique git montre la baseline et ses révisions (prévu/réel) |
| Code, revues, CI/CD | GitHub (`zharrow/Luniqo`), PR obligatoires, GitHub Actions | Preuves horodatées de la chaîne ticket → déploiement |
| Décisions | ADR (Architecture Decision Records) dans `M2/decisions/` | Trace des choix et des options écartées (C1.3.2, C3.2.2) |
| Communication équipe | Canal écrit (Slack/Discord simulé), visio sous-titrée | Cohérent avec la situation de handicap |

### Conventions

Détail complet : [CONTRIBUTING.md](CONTRIBUTING.md) (adopté le 2026-10-09).

- Tickets : clé Jira `LUN-<n>` **sans zéro devant** (`LUN-60`). Le premier import Jira a raté et Jira ne réutilise pas les numéros : les tickets `LUN-001` à `LUN-021` du backlog d'origine sont devenus `LUN-39` à `LUN-59` (**ancien numéro + 38**, écrit dans leur description). Les anciens numéros restent valables dans l'historique git et le journal ci-dessous.
- Branches durables : `develop` (INT) → `staging` (PRÉ-PROD, versions candidates) → `main` (PROD, tags). Seul ce qui est fini entre dans `develop`.
- Branches de travail : `feat/LUN-34-mode-tablette`, `fix/…`, `docs/…`, `infra/…`, `chore/…` depuis `develop` ; `hotfix/…` depuis `main`. Vérifié par le workflow « Conventions de PR ».
- Commits : Conventional Commits en français, avec le ticket (`feat(api): pointage groupé (LUN-34)`).
- Versions : SemVer, `vX.Y.Z-rc.N` sur `staging`, `vX.Y.Z` sur `main`, [CHANGELOG.md](CHANGELOG.md) (journal des versions BC04).

## Plan technique de l'année

| Phase | Objectif | Blocs nourris |
|---|---|---|
| 0. État des lieux v1 | Installer la v1, vérifier et classer le parcours central (vérifié / défaillant / non testé) : c'est l'audit de l'existant | BC01 |
| 1. Conteneurisation (TP Docker) | Front v1 + squelette API v2 + PostgreSQL + passerelle nginx sous Compose, images 100 % maison | BC02 |
| 2. Socle v2 | API : authentification, entreprises, crèches, droits d'accès, isolation testée ; migrations Alembic ; tests pytest | BC02 |
| 3. Intégration continue | GitHub Actions : lint, typage, tests, build des images à chaque PR | BC02 |
| 4. Parcours central v2 | Enfants, pointage, consultation famille ; le front passe de Supabase à l'API lot par lot | BC02, BC03 |
| 5. Déploiement continu | VPS, environnements recette et production, promotion par tag, retour arrière démontré | BC02, BC04 |
| 6. Exploitation | Supervision, sondes, alertes, sauvegardes, mises à jour de dépendances, traitement d'anomalies | BC04 |
| 7. Soutenances | Démo reproductible, dossiers consolidés, oraux blancs | BC01, BC03 |

Les modules hors parcours central (HACCP, facturation, RH, statistiques…) sont réécrits ensuite, s'il reste du temps. La v1 est gelée : plus de nouvelles fonctionnalités, seulement des correctifs de sécurité.

## Décisions

| ADR | Sujet | Statut |
|---|---|---|
| [ADR-001](M2/decisions/ADR-001-reecriture-backend.md) | Réécrire Luniqo avec un backend FastAPI | **Acceptée** le 2026-10-08 |
| [Registre](M2/decisions/CHOIX-TECHNIQUES.md) | Tous les choix techniques, raisons, options écartées et sources (tenu à jour) | En continu |
| ADR-002 | Front v2 : garder Next.js ou passer à React + Vite | À ouvrir après le TP Docker |
| [ADR-003](M2/decisions/ADR-003-authentification-v2.md) | Authentification v2 : sessions opaques en base, Argon2id, PIN lié à une tablette enrôlée | **Acceptée** le 2026-10-08 ; partie multifacteur remplacée par ADR-004 |
| [ADR-004](M2/decisions/ADR-004-double-authentification.md) | Double authentification : passkeys (Face ID…) en principal, TOTP en alternative, codes de secours, pas de SMS | **Acceptée** le 2026-10-09 |

## Anomalies ouvertes

| Id | Résumé | Gravité | Statut |
|---|---|---|---|
| [ANO-001](M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md) | Profils et hachés de PIN lisibles depuis le navigateur (v1) | Critique par conception ; aucune donnée réelle exposée (base v1 de test) | v1 : ouverte, non reproduite. **v2 : corrigée par conception** (LUN-005) |
| [ANO-002](M2/bloc-4-maintien-operationnel/anomalies/ANO-002-lint-v1.md) | Le lint de la v1 ne démarre pas (ESLint 8 face à `eslint-config-next` 16) | Mineure, sans effet utilisateur | Ouverte, reproduite ; non corrigée (v1 gelée) |
| [ANO-003](M2/bloc-4-maintien-operationnel/anomalies/ANO-003-vercel-fonctions-api.md) | Déploiement Vercel du front v1 refusé : `api/` (v2) compté comme fonctions serverless, limite de 12 dépassée | Majeure pour l'exploitation, sans effet sur la version en ligne | **Corrigée et vérifiée** le 2026-10-09 (`.vercelignore`, PR #50) |

## Cours en cours

| Cours | Contraintes clés | Calendrier | Fiche |
|---|---|---|---|
| Coordination Front & Back | Outil de gestion de projet avec parent ↔ enfant ; au moins 4 épics, sous-tâches front **et** back ; labels, champs, boards ; automatisations ; README, branching et SemVer, workflow des tickets. **Équipe réelle de 4, pour ce cours seulement** (Florent chef de projet, Thomas fullstack, Pauline front, Julien back), distincte de l'équipe fictive du RNCP | Commencé le 2026-10-09, rendu probablement en février 2027 | [M2/cours/coordination.md](M2/cours/coordination.md) |
| Docker | **0 image Docker Hub**, images personnalisées ; au moins 3 types (front, back, serveur web) ; arguments de ressources au run et dans le compose ; SIGTERM gérés ; ordre de démarrage ; schéma des communications ; choix documentés | 4 séances, la 2e est passée. Rendu : dernier commit avant la date butoir. Oral non confirmé | [M2/cours/docker.md](M2/cours/docker.md) |

Le TP vit dans `docker/` à la racine du dépôt (le dossier `M2/` est réservé aux preuves RNCP) ; le lien rendu au prof est celui du dépôt `zharrow/Luniqo`. Il remplace la première version (front/back/serveur de jeu sans lien avec Luniqo), dont l'historique reste sur l'ancien dépôt GitHub `zharrow/TP-Docker`, qui n'est plus utilisé.

## Arborescence de la documentation M2

```
M2/
├── FIL-ROUGE-RNCP39583.md      plan annuel, matrice des preuves
├── README.md                   index + tableau de statut des preuves par compétence (à créer)
├── bloc-1-cadrage/             BC01 : brief, parties prenantes, SWOT, risques, veille, chiffrage, architecture
├── bloc-2-conception-dev/      BC02 : environnements, CI/CD, tests, sécurité, recette, manuels
├── bloc-3-pilotage/            BC03 : méthode, Gantt, RACI, indicateurs, arbitrages, management, CR client
├── bloc-4-maintien-operationnel/  BC04 : dépendances, supervision, anomalies/, correctifs, versions
├── management/                 équipe fictive, rituels, comptes rendus de sprint, Gantt Mermaid
├── decisions/                  ADR-001, ADR-002…
├── journal/                    journal de bord daté (travail réel, temps passé, assistance)
└── cours/                      une fiche par travail de cours
```

Le dossier `M2/` ne contient que la documentation et les preuves du titre RNCP. Le code et l'infrastructure restent à la racine (`app/`, `api/`, `docker/`...).

Statuts des preuves (repris du fil rouge) : à vérifier / absent / partiel / démontré / à actualiser. « Démontré » est un statut interne, pas une validation du jury.

## État d'avancement

| Date | Fait | Nature |
|---|---|---|
| 2026-10-08 | Fil rouge RNCP39583 rédigé (`M2/FIL-ROUGE-RNCP39583.md`) | [RÉEL] |
| 2026-10-08 | Inspection statique de la v1 : pas de tests, pas de CI, couplage Supabase mesuré, logique métier exécutée dans le navigateur, RLS désactivée | [RÉEL] |
| 2026-10-08 | `CLAUDE.md` réécrit, `AGENTS.md` créé, ancien `CLAUDE.md` archivé dans `docs/archive/` | [RÉEL] |
| 2026-10-08 | Décisions de Florent : RNCP39583 confirmé, Bee a Baby comme terrain réel, équipe fictive validée, réécriture progressive (ADR-001), TP Docker refait sur Luniqo en gardant Next.js, branche `origin/docker` à supprimer | [RÉEL] |
| 2026-10-08 | ANO-001 consignée, fiche du TP Docker rédigée, `M2/Docker/` ignoré par git | [RÉEL] |
| 2026-10-08 | FastAPI et architecture du TP validés par Florent ; base v1 confirmée sans données réelles ; branche `origin/docker` supprimée (tag local `archive/origin-docker`) ; historique réel de Bee a Baby documenté | [RÉEL] |
| 2026-10-08 | Squelette de l'API v2 (`api/`) : FastAPI asynchrone, Alembic, données synthétiques, 7 tests au vert. TP Docker : images base, db, api, web construites, mesurées (charge, arrêts, panne de la base) et documentées | [RÉEL] |
| 2026-10-08 | Un seul dépôt : `M2/Docker/` intégré au dépôt principal (ancien `.git` supprimé). Image `front` (Next.js standalone) ajoutée : les exigences du TP sont couvertes, 5 images, build sans cache en 60 s. 11 problèmes corrigés au total, consignés dans la fiche. Rien n'est commité | [RÉEL] |
| 2026-10-08 | 25 commits poussés sur `feat/m2-docker-luniqo`. Conteneurisation déplacée de `M2/Docker/` vers `docker/` (M2 réservé au RNCP). Dépôt GitHub renommé `nursery-app` → `Luniqo`. README racine : section Docker pour le cours | [RÉEL] |
| 2026-10-08 | PR #37 fusionnée dans `main` avant les 5 derniers commits de la branche (déplacement vers `docker/`, renommage, README, `.env` du front) : deuxième PR ouverte pour les intégrer. Dossier local renommé `Luniqo` | [RÉEL] |
| 2026-10-08 | PR #38 fusionnée. Pile relancée depuis `main` (`e020a26`) : 4 conteneurs sains en 20 s, routes en 200. Tag `tp-docker-v1` posé et poussé. ADR-003 acceptée (authentification v2), registre des choix techniques créé, backlog provisoire `LUN-001` à `LUN-015` dans `M2/management/backlog.md` | [RÉEL] |
| 2026-10-08 | LUN-003 : module `app/auth/` de l'API v2 (comptes, Argon2id, sessions opaques, contrôle `Origin`, limitation des tentatives, journal), migration 0002, 73 tests au vert. Vérifié sur la pile Docker : migration, connexion, déconnexion, limitation, usurpation de `X-Forwarded-For` corrigée dans nginx, charge (60 connexions, 6 threads, limite mémoire jamais atteinte). Trois défauts trouvés et corrigés en cours de route (registre des choix techniques). Registre des choix techniques tenu à jour | [RÉEL] |
| 2026-10-08 | Durée de conservation du journal des connexions fixée à 6 mois (CNIL), décision de Florent. LUN-004 : module `app/nurseries/` (crèches, accès du personnel, règle d'accès unique, isolation doublée en base), migration 0003, 134 tests ; tests d'isolation éprouvés par mutation ; vérifié sur la pile Docker (migration sur base existante, contraintes SQL, parcours HTTP) | [RÉEL] |
| 2026-10-08 | LUN-007 : tests d'intégration sur PostgreSQL (base jetable `scripts/test-db.sh` avec l'image `luniqo/db`, transaction annulée par test, migrations réversibles et conformes aux modèles, garde-fou `_test`). 31 tests d'intégration + 134 unitaires au vert ; deux mutations détectées | [RÉEL] |
| 2026-10-08 | LUN-008 : CI GitHub Actions (API : ruff + tests unitaires et d'intégration ; images : build des 5 images, démarrage, sondes), actions épinglées par SHA. **Première exécution verte** sur la PR #44 (run `37842997099`) : 165 tests dont 31 d'intégration, 5 images construites, sondes 200 et 401 sans session, rapport JUnit conservé jusqu'au 2027-01-06. ANO-002 consignée (lint v1 cassé) | [RÉEL] |
| 2026-10-09 | PR #41 à #44 fusionnées chacune dans la branche de la précédente (PR empilées) : code absent de `main`, rattrapé par la PR #45 (CI verte, fusionnée le 2026-10-09). LUN-005 : module `app/tablets/` (enrôlement, PIN, sessions d'action de 2 min refusées par l'espace web), migration 0004, 211 tests ; cinq mutations détectées ; parcours vérifié sur la pile Docker. ANO-001 corrigée par conception en v2 | [RÉEL] |
| 2026-10-09 | #45 et #46 fusionnées (LUN-003 à LUN-008 et LUN-005 dans `main`, vérifié) ; six branches empilées supprimées. LUN-009 : module `app/children/` (familles, enfants, responsables, liens avec autorisations), cohérence famille ↔ crèche imposée en base, aucune donnée de santé (LUN-019 créé), migration 0005, 221 tests ; quatre mutations détectées ; vérifié sur la pile Docker | [RÉEL] |
| 2026-10-09 | #47 fusionnée (LUN-009 dans `main`). Double authentification revue avec Florent : il propose SMS, e-mail et Face ID ; comparaison sourcée (ANSSI, NIST, CNIL) ; ADR-004 acceptée : passkeys en principal, TOTP en alternative, codes de secours, pas de SMS, e-mail pour la récupération seulement. *(Ligne perdue lors de la résolution d'un conflit à la fusion de #49, restaurée avec LUN-011.)* | [RÉEL] |
| 2026-10-09 | LUN-010 : module `app/attendance/` (pointage depuis la tablette par PIN, départ refusé si la personne n'est pas autorisée, une présence ouverte par enfant garantie en base, jour en heure de Paris, suivi web), migration 0006, `tzdata` ajouté (absent de l'image Alpine), 246 tests ; cinq mutations détectées ; vérifié sur la pile Docker. Parcours central : il ne reste que la consultation famille (LUN-011) | [RÉEL] |
| 2026-10-09 | LUN-011 : module `app/family/` (invitation des parents par lien à usage unique, compte famille, consultation réservée à l'autorité parentale, contacts sans coordonnées, un compte pour plusieurs fiches), migration 0007, 261 tests ; cinq mutations détectées. **Parcours central complet au niveau de l'API**, rejoué sur la pile Docker ; pas encore dans l'interface (front v1 sur Supabase) | [RÉEL] |
| 2026-10-09 | ANO-003 : contrôle Vercel en échec sur la PR #50 (limite de 12 fonctions serverless du plan Hobby, l'API v2 de `api/` comptée comme fonctions). Cause lue dans l'API Vercel, `.vercelignore` ajouté, déploiement de prévisualisation vérifié (`Ready`, plus aucune fonction Python) | [RÉEL] |
| 2026-10-09 | #50 fusionnée (LUN-011 et ANO-003 dans `main`). LUN-006, partie 1 : module `app/mfa/` (session en deux temps, TOTP chiffré en AES-256-GCM, codes de secours Argon2id, obligation pour la direction et l'éditeur, TOTP désactivé après 100 échecs), migration 0008, `cryptography` ajouté, 369 tests ; 13 mutations détectées ; parcours rejoué sur une pile Docker isolée, mémoire mesurée. PR #51 | [RÉEL] |
| 2026-10-09 | #51 fusionnée (LUN-006 partie 1 dans `main`). Cours « Coordination Front & Back » : équipe réelle de 4 pour ce cours (Florent, Thomas, Pauline, Julien), distincte de l'équipe fictive du RNCP. Décisions de l'équipe : Jira (projet `LUN`, remplace Trello), branches `develop` / `staging` / `main` créées, SemVer, seul ce qui est fini entre dans `develop`, PRÉ-PROD et PROD documentées comme cibles (pas encore de VPS). LUN-60 (TD, numéroté LUN-22 avant l'import Jira) : README réécrit, CONTRIBUTING, CHANGELOG, guide et import Jira (80 tickets), workflows de conventions de PR et d'étiquettes ; Jira mis en place par Florent (80 tickets importés au deuxième essai, clés décalées de 38), personas et story map en bonus | [RÉEL] |
| 2026-10-09 | #52 et #53 fusionnées dans `develop`, puis #54 (`develop` → `main`) fusionnée par Florent : `staging` n'a pas été traversée, le contrôle « Branche, cible et titre » de #54 est en échec (attendu par CONTRIBUTING), aucun tag `v0.1.0` | [RÉEL] |
| 2026-10-10 | LUN-76, partie back (LUN-107) : module `app/cleaning/` (pièces par crèche, catalogue des tâches de l'entreprise, fréquences quotidienne / certains jours / premier jour donné du mois, fiche du jour en heure de Paris, isolation doublée par trois clés composites, désactivation au lieu de suppression), migration 0009, pièces fictives dans le seed, 399 tests ; 17 mutations détectées ; parcours rejoué sur une pile Docker isolée. PR #55 vers `develop` | [RÉEL] |

### Prochaines actions

1. **Florent** : relire et fusionner la PR #55 (LUN-76, vers `develop`) ; finir Jira (statuts, rattachement aux épics, Story Points, workflow, règles R1 à R5 : [docs/projet/JIRA.md](docs/projet/JIRA.md)) ; protections des branches et branche par défaut `develop`.
2. **Assistant, après #55** : LUN-77 côté back (LUN-109) : fiche cochée depuis la tablette par session PIN, heure et auteur fixés par le serveur, migration 0010. Puis LUN-78 côté back (LUN-111) : historique filtrable et export.
3. **Circuit de version à décider avec Florent** : #54 a fait passer `develop` dans `main` sans `staging` ni tag. Soit poser `v0.1.0` sur `main` tel quel et remettre `staging` à niveau par une PR `develop` → `staging`, soit publier la prochaine version (0.2.0, avec la fiche de ménage) par le circuit complet.
4. **À décider en équipe** (story map) : front v2 (story LUN-79, ADR-002) avant les passkeys (story LUN-69, LUN-44 partie 2). LUN-57 (santé) et LUN-59 (e-mails) avant toute donnée réelle.
5. LUN-52 : oral du TP Docker. LUN-50, LUN-51, LUN-53.

## Point de reprise

> Mis à jour le 2026-10-10, 4e session. Lire ceci quand Florent dit « continue ».

**Où on en est.** `develop` et `main` contiennent tout jusqu'à LUN-60 (#52, #53, puis #54 `develop` → `main`) ; `staging` est restée à #51. Aucun tag de version. **En attente** : PR #55 (LUN-76 partie back, branche `feat/LUN-76-pieces-taches-menage`, vers `develop`), à relire et fusionner par Florent.

**Jira** (projet `LUN`, importé le 2026-10-09) : clés = ligne du CSV + 38. Backlog d'origine `LUN-39` à `LUN-59` ; TD `LUN-60` ; épics `LUN-61` (auth) à `LUN-67` (pilotage), dont `LUN-65` Fiche de ménage ; stories `LUN-68` à `LUN-80` ; sous-tâches `LUN-81` à `LUN-118`. Fiche de ménage : LUN-76 (pièces et tâches ; back LUN-107 fait dans #55, front LUN-108), LUN-77 (remplir depuis la tablette ; back LUN-109, front LUN-110), LUN-78 (historique et export ; back LUN-111, front LUN-112). Restent côté Florent : statuts, rattachement aux épics, Story Points, workflow et règles d'automatisation.

**Prochaine tâche, après la fusion de #55 : LUN-77 côté back (LUN-109).** Branche `feat/LUN-77-fiche-menage-tablette` depuis `develop`. Une fiche par pièce et par jour (ou par crèche et par jour, à trancher en relisant le besoin papier) ; tâche cochée par l'employé en session PIN (`CurrentActor` de `app/tablets/`, comme le pointage), heure et auteur fixés par le serveur, jour en heure de Paris (`app/attendance/policy.local_day`) ; seules les tâches prévues ce jour-là (`app/cleaning/service.day_plan`) se cochent ; une tâche cochée une seule fois par jour (index unique), décocher ou corriger reste tracé ; la fiche garde le nom de la tâche au moment où elle est remplie (le catalogue peut être renommé ensuite). Migration **0010** ; mêmes vérifications (mutations, pile isolée).

**Ensuite** : LUN-78 côté back (historique filtrable par jour et par pièce, export pour un contrôle). Puis, selon la décision d'équipe, front v2 (LUN-79 : ADR-002, squelette, client TypeScript généré, sous-tâches LUN-113 à LUN-115) ou passkeys (LUN-69, sous-tâches back LUN-85 et LUN-86) selon [ADR-004](M2/decisions/ADR-004-double-authentification.md) : `webauthn` (py_webauthn 3.0.1 au 2026-10-09), `userVerification: required`, origine et `rpId` contrôlés, compteur de signatures, plusieurs passkeys nommées, tests avec authentificateur simulé (attestation `none`, ES256), migration suivante.

**Méthode suivie à chaque ticket** : branche depuis `develop` → module `api/app/<domaine>/` (règles pures dans `policy.py`) → migration numérotée suivante → tests unitaires et d'intégration (`api/scripts/test-db.sh up`) → mutations (introduire chaque faille visée, vérifier qu'un test échoue, restaurer) → parcours sur une pile Docker isolée (`docker compose -p <nom>`) → registre des choix techniques, `CHANGELOG.md` (section « Non publié »), `api/README.md`, `CLAUDE.md`, ce fichier → PR vers `develop`, suivi de la CI, des conventions de PR **et du contrôle Vercel** (ANO-003). Florent (ou un relecteur de l'équipe) relit et fusionne. Ne pas empiler les PR.

**En attente de Florent** : fusion de la PR #55 ; décision sur le circuit de version (prochaines actions, point 3) ; fin de la mise en place de Jira ; protections des branches, branche par défaut `develop`, « Automatically delete head branches » ; vérifier une fois le cookie de session dans un navigateur (Swagger `/api/docs`, voir PR #41) ; VPS à venir (environnements PRÉ-PROD et PROD).

**Environnement local** : depuis LUN-44 (ex-LUN-006), les comptes direction doivent enregistrer un TOTP à leur première connexion (secret à saisir dans une application d'authentification, ou code calculé avec `app.mfa.policy.hotp`). Le mot de passe des comptes de démonstration de la base locale habituelle (`luniqo_pgdata`) n'a pas été conservé. Pour rejouer un parcours sans toucher cette base, lancer une pile isolée : `cd docker && API_SEED_DEMO_PASSWORD=... docker compose -p luniqo-essai --env-file .env --env-file ../.env up -d --build --wait`, puis `docker compose -p luniqo-essai down -v`. Le dossier `coordination/` (sujet du cours, brouillons de l'équipe) est ignoré par git.