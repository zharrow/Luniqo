# AGENTS.md — Orientation de chaque nouvelle session

Ce fichier dit à tout agent (Claude Code, Codex…) **ce que l'on fait dans ce dépôt, pourquoi, et où on en est**. La référence technique (stack, architecture, règles de code) est dans [CLAUDE.md](CLAUDE.md).

> Dernière mise à jour : 2026-10-08. Mettre à jour « État d'avancement » à la fin de chaque session de travail.

## La mission en une phrase

Luniqo, l'application de gestion de crèches de Florent, sert de **projet fil rouge** pour valider son M2 chez Ynov Toulouse. La v1 actuelle (Next.js + Supabase Cloud) est **réécrite progressivement** en une v2 dotée d'un vrai backend (FastAPI) et de PostgreSQL, **conteneurisée, intégrée et déployée en continu sur un VPS, puis supervisée**. Le projet est piloté comme un projet d'équipe : le terrain est réel, l'équipe est fictive, le travail technique est réel.

## Avant de commencer une tâche

1. Lire ce fichier en entier, puis [CLAUDE.md](CLAUDE.md) (chargé automatiquement par Claude Code).
2. Lire [M2/FIL-ROUGE-RNCP39583.md](M2/FIL-ROUGE-RNCP39583.md) : plan annuel, matrice des preuves, règles de travail.
3. Lire les décisions ([M2/decisions/](M2/decisions/)), les anomalies ouvertes et l'état d'avancement ci-dessous.
4. Identifier la ou les compétences RNCP visées par la tâche (ex. `C2.1.2`) et le ticket correspondant (`LUN-###`). S'il n'y en a pas, le proposer avant de coder.
5. Si la tâche vient d'un cours, appliquer les contraintes de son sujet (voir « Cours en cours » et `M2/cours/`).

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
3. **Pas de faux commits.** Tous les commits sont ceux de Florent (avec la ligne `Co-Authored-By` de l'assistant quand il a contribué). On n'attribue jamais de code à un membre fictif : l'équipe fictive existe dans les documents de pilotage, pas dans l'historique git.
4. **Assistance déclarée.** Le M2 demande de distinguer contribution personnelle, assistance et sources. Quand l'assistant produit une part significative d'un livrable, le noter dans la fiche du travail ou le journal.
5. **Données synthétiques uniquement.** Jamais de données réelles d'enfants, de familles ou de salariés dans les seeds, captures, démos ou dépôts. Allergies, PAI et santé sont des données de santé : traiter le RGPD et la question de l'hébergement de données de santé (HDS) lors du cadrage.
6. **Pas de commande destructive sans cible connue.** `pnpm seed` / `db:reset` utilisent la clé service role de `.env.local`, qui peut pointer vers le Supabase Cloud de la v1. Vérifier la destination avant tout reset, migration ou suppression.
7. **Traçabilité.** Ticket `LUN-###` → branche → PR → version taguée → entrée du journal des versions. Chaque livrable M2 référence les compétences qu'il couvre.
8. **Contraintes de cours respectées.** Une contrainte imposée par un sujet prime sur nos préférences. Si elle ne sert pas Luniqo, en discuter avec Florent plutôt que de la contourner.
9. **Commanditaire réel, propos réels.** Bee a Baby et ses dirigeants sont réels : on ne leur attribue que ce qui a réellement été dit ou fait. Les revues et validations simulées sont tenues par la Product Owner fictive, qui représente le client (rôle normal en Scrum), jamais au nom de Simona. Un retour réel de la crèche est consigné comme tel, daté, avec son canal.
10. **Dépôt public.** `zharrow/Luniqo` (anciennement `nursery-app`, renommé le 2026-10-08) est public, et c'est le **seul dépôt du projet** (code, TP, documentation M2). Personnes réelles citées : Florent, et Simona (directrice de Bee a Baby) par choix de Florent ; personne d'autre. Aucune information sur les enfants accueillis ni sur la famille de Florent, aucun secret. Le détail d'une faille non corrigée reste sobre tant que la v1 est en ligne.
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
| Backlog et sprints | **Trello** : colonnes Backlog → Prêt → Sprint → En cours → En revue → Recette → Terminé | Demandé par Florent, visuel, gratuit |
| Étiquettes Trello | `BC01`–`BC04`, type (`feat`, `fix`, `infra`, `doc`), cours (`cours:docker`…) | Relie chaque carte à une compétence et à un cours |
| Planning macro | **Diagramme de Gantt en Mermaid** versionné dans `M2/management/` + export image pour les oraux | Diffable : l'historique git montre la baseline et ses révisions (prévu/réel) |
| Code, revues, CI/CD | GitHub (`zharrow/Luniqo`), PR obligatoires, GitHub Actions | Preuves horodatées de la chaîne ticket → déploiement |
| Décisions | ADR (Architecture Decision Records) dans `M2/decisions/` | Trace des choix et des options écartées (C1.3.2, C3.2.2) |
| Communication équipe | Canal écrit (Slack/Discord simulé), visio sous-titrée | Cohérent avec la situation de handicap |

### Conventions

- Tickets : `LUN-001`, `LUN-002`… (numéro de la carte Trello, repris partout).
- Branches : `feat/LUN-012-api-skeleton`, `fix/LUN-030-pin-server-side`, `docs/LUN-005-cadrage`.
- Commits : Conventional Commits en français, avec le ticket (`feat(api): squelette FastAPI (LUN-012)`).
- Versions : SemVer avec tags git (`v0.1.0`…) et `CHANGELOG.md` à la racine (journal des versions BC04).

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
| [ADR-003](M2/decisions/ADR-003-authentification-v2.md) | Authentification v2 : sessions opaques en base, Argon2id, TOTP pour les comptes à privilèges, PIN lié à une tablette enrôlée | **Acceptée** le 2026-10-08 |

## Anomalies ouvertes

| Id | Résumé | Gravité | Statut |
|---|---|---|---|
| [ANO-001](M2/bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md) | Profils et hachés de PIN lisibles depuis le navigateur (v1) | Critique par conception ; aucune donnée réelle exposée (base v1 de test) | Ouverte, non reproduite ; corrigée par conception en v2 |
| [ANO-002](M2/bloc-4-maintien-operationnel/anomalies/ANO-002-lint-v1.md) | Le lint de la v1 ne démarre pas (ESLint 8 face à `eslint-config-next` 16) | Mineure, sans effet utilisateur | Ouverte, reproduite ; non corrigée (v1 gelée) |

## Cours en cours

| Cours | Contraintes clés | Calendrier | Fiche |
|---|---|---|---|
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
| 2026-10-08 | LUN-008 : CI GitHub Actions (API : ruff + tests unitaires et d'intégration ; images : build des 5 images, démarrage, sondes), actions épinglées par SHA. ANO-002 consignée (lint v1 cassé) | [RÉEL] |

### Prochaines actions

1. **Florent** : fusionner les PR de LUN-001 et LUN-002 (ADR-003 acceptée).
2. **Florent** : relire les PR de LUN-003 et LUN-004 (empilées : #40 → #41 → #42 → #43 → LUN-008) et vérifier le cookie de session dans un navigateur. Suite proposée : LUN-005 (tablette et PIN, corrige ANO-001 en v2) ou LUN-009 (enfants et familles).
3. LUN-014 : préparer l'oral du TP Docker avant la séance 4.
4. LUN-012, LUN-013, LUN-015 : fiche de ménage dans le parcours central, Trello et squelette `M2/`, phase 0 (voir le backlog).
