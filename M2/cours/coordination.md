# Fiche de travail — Cours « Coordination Front & Back » : POC d'organisation sur Luniqo

| | |
|---|---|
| Cours | Coordination Front & Back (M2, Ynov Toulouse), cours surtout consacré à la gestion de projet |
| Sujet | TD « POC » : documentation pour développeurs, branching et SemVer, workflow des tickets, outil de gestion de projet, automatisations (sujet complet : `coordination/TP.md`, non versionné) |
| Équipe | **Équipe réelle de 4 personnes, constituée pour ce cours seulement** : Florent (chef de projet), Thomas (fullstack), Pauline (front), Julien (back). Elle est distincte de l'équipe fictive du dossier RNCP |
| Échéance | Probablement février 2027 (à confirmer). Le TD sert de base aux travaux suivants (vision produit, MVP) |
| Rendu | Lien du dépôt `zharrow/Luniqo` et lien du projet Jira, sur la feuille de suivi du cours |
| Ticket | LUN-22 |
| Compétences RNCP | C3.1 (méthode et organisation), C3.2.1 (outil de suivi), C2.1.2 (protocole d'intégration continue) |
| Statut | En cours (2026-10-09) |

## Contraintes imposées par le sujet

1. Un outil de gestion de projet avec un **lien parent ↔ enfant** entre tâches.
2. Au moins **4 épics** détaillés ; au moins 2 fullstack ; chaque épic avec des sous-tâches front **et** back (le sujet se contredit : on rend 5 épics fullstack sur 7 pour satisfaire les deux lectures).
3. Outil fonctionnel : retrouver, trier, visualiser (étiquettes, estimations, champs, boards).
4. Documentation pour développeurs à la racine : contexte, installation, branching (SemVer), workflow des tickets ; fichiers comme `CONTRIBUTING.md`.
5. Automatisations basiques ; code au strict minimum pour démarrer.

## Barème et réponse

| Critère | Points | Réponse |
|---|---|---|
| Mise en forme du markdown | 1 | [README.md](../../README.md), [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| Contexte du projet | 1 | README, « Le projet » |
| Installation | 2 | README, « Installer le projet » (3 options : pile Docker, API, front v1) |
| Branching strategy | 2 | CONTRIBUTING, sections 2 et 3 : `develop` / `staging` / `main`, SemVer, versions candidates, correctif urgent |
| Hiérarchie entre les tâches | 1 | Jira : épic → story → sous-tâche ([import CSV](../../docs/projet/jira-import.csv)) |
| Automation basique | 1 | Jira : 5 règles reliées à GitHub ; GitHub Actions : conventions de PR, étiquettes, CI ([guide](../../docs/projet/JIRA.md)) |
| Labels, champs | 1 | composants Front / Back / Infra / Doc, étiquettes, Story Points, priorités, versions |
| Boards | 1 | board Scrum + boards Front, Back et Recette |

## Décisions de l'équipe `[RÉEL]` (2026-10-09)

| Décision | Raison | Écarté |
|---|---|---|
| **Jira** (offre gratuite), projet `LUN` | Proposé par Thomas ; hiérarchie native, boards, automatisations, lien GitHub gratuit jusqu'à 10 utilisateurs | Trello (pas de parent ↔ enfant sans extension payante) ; GitHub Projects (envisagé, l'équipe connaît Jira) |
| Branches `develop` (INT) → `staging` (PRÉ-PROD) → `main` (PROD) | Brouillon de l'équipe, adapté : plusieurs développeurs, une recette avant la production | GitHub Flow seul (pratiqué jusque-là en solo) |
| **Seul ce qui est fini entre dans `develop`** ; promotion en bloc ; un refus de recette se corrige sur `develop` | Convenu à l'oral par Florent et Thomas ; le brouillon proposait de fusionner une branche dans `develop` **et** `staging`, ce qui fait diverger les branches | Double fusion feature → staging |
| SemVer, versions candidates `-rc.N` sur `staging` | Demandé par le sujet ; une version = un tag = une entrée du journal | Versions sans règle |
| Nommage `feat/LUN-<n>-description` (convention existante), clé sans zéro devant | La clé Jira relie branche, commits et PR au ticket ; Jira n'écrit pas `LUN-006` | `feat/124-export_csv` (brouillon) |
| INT réel dès maintenant (pile éphémère de la CI), PRÉ-PROD et PROD documentées comme **cibles** | Pas encore de VPS ; il est prévu à court terme | Branches sans environnement non signalées |

## Assistance déclarée

L'assistant (Claude Code) a rédigé le README, CONTRIBUTING, le CHANGELOG, le
guide Jira, le CSV d'import et les workflows GitHub, à partir des décisions de
l'équipe et du brouillon de stratégie de branches rédigé par une membre du
groupe. Florent a validé chaque décision ; la configuration de Jira est faite
par l'équipe en suivant le guide.

## Reste à faire

- [ ] Créer le site et le projet Jira, importer le CSV, rattacher les tickets d'origine, boards, règles (Florent, guide [JIRA.md](../../docs/projet/JIRA.md)).
- [ ] Relier Jira à GitHub et vérifier le panneau Développement.
- [ ] Protections des branches et branche par défaut `develop` (Florent).
- [ ] Première version `v0.1.0` par le circuit complet : préparation → `develop` → `staging` (`v0.1.0-rc.1`) → `main` (`v0.1.0`).
- [ ] Bonus : personas (fictifs) pour la séance sur la vision produit.
