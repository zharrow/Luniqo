# Luniqo — Fil rouge annuel et suivi RNCP39583

Document de travail du 8 octobre 2026. Horizon : examens en 2027, dates à confirmer.
Base examinée : branche main, commit 3fef96a7f76116b87234dd830e41b8f983e440f5.

## Décisions et limites

Luniqo devient le projet principal pour les travaux de cours compatibles et la préparation des quatre blocs. Selon les informations fournies par Florent, l'école accepte le commanditaire fictif, l'équipe simulée et l'utilisation du même projet pour tous les blocs. Ces modalités locales ne constituent pas une confirmation écrite obtenue par cet audit.

Chaque travail reste soumis à son sujet : une technologie ou un livrable imposé peut nécessiter une expérimentation séparée. Une bonne note en cours ne vaut pas validation d'un bloc. Le suivi ci-dessous sert à produire des preuves, pas à prédire la décision du jury.

Le développement personnel et les événements observés sont distingués des simulations pédagogiques. Les réalisations antérieures sont recensées comme existantes ; les nouvelles estimations concernent les évolutions à venir, sans reconstruire artificiellement un planning passé.

## Premier état des lieux

Inspection statique du dépôt uniquement : aucune installation, exécution, recette, mesure de performance ou vérification du Supabase distant réalisée.

| Constat | Élément vérifiable | Conséquence |
|---|---|---|
| Application métier déjà étendue | Routes et services enfants, présences, personnel, facturation, portail, HACCP | Privilégier la consolidation avant d'élargir |
| Stack identifiable | package.json : Next.js 16.1.6, React 18.3.1, TypeScript, Supabase, Tailwind | Réconcilier les versions décrites dans les documents |
| Tests non repérés | Aucun fichier test/spec ni script de test identifié dans main | Construire une stratégie puis des tests sur les règles métier |
| CI non repérée | Aucun workflow .github suivi trouvé dans main | Vérifier aussi les réglages externes avant de conclure à une absence totale |
| Typage contourné | @ts-nocheck dans attendance, daily-logs, observations, activities | Régénérer les types et rétablir progressivement les vérifications |
| Documents contradictoires | README : modules à développer ; docs/phases : phases 0–7 complètes | Définir un état fonctionnel vérifié, indépendant des pourcentages historiques |
| Copies multiples | Fichiers suffixés « 2 », sauvegardes, migrations dupliquées | Identifier les versions de référence avant tout nettoyage |
| Instrumentation existante | PostHogProvider et docs/POSTHOG.md | Vérifier séparément disponibilité, erreurs, alertes et collecte de données |
| Sécurité à éprouver | Auth, permissions et migrations RLS présentes | Leur présence ne prouve pas l'isolation entre entreprises et crèches |

## Périmètre proposé pour les examens

Parcours central : une direction crée une crèche et ses accès ; un employé enregistre une arrivée puis un départ ; la direction consulte le suivi ; une famille consulte les seules informations auxquelles elle est autorisée.

Ce parcours doit fonctionner sur un jeu de données synthétiques, pour deux crèches, avec des comptes de rôles différents. Un refus d'accès à la mauvaise crèche doit être démontrable. La facturation et HACCP restent des extensions candidates pour les cours ; leur présence n'impose pas de les ajouter au parcours central.

Les exigences, objectifs de performance, capacité attendue et critères de réussite seront fixés avant les mesures. Aucun seuil de performance universel n'est présumé. La couverture des tests devra ensuite être rapprochée des critères officiels, pas limitée au seul scénario de démonstration.

## Matrice initiale des preuves

Les identifiants renvoient au référentiel officiel. Les preuves proposées sont une adaptation à Luniqo ; elles ne remplacent pas le texte officiel. Toutes restent « à vérifier » tant qu'un résultat daté et consultable n'est pas associé.

| Référence | Preuve proposée pour Luniqo |
|---|---|
| C1.1.1 | Carte des acteurs : direction, salariés, familles, exploitant et prestataires |
| C1.1.2 | Brief du commanditaire simulé et comptes rendus de recueil des besoins, avec statut réel/simulé |
| C1.2.1 | Analyse des opportunités, dépendances et risques liés à une application de crèche |
| C1.2.2 | Diagnostic de l'existant Luniqo et faisabilité d'une évolution annuelle limitée |
| C1.2.3 | Registre : accès à la mauvaise crèche, indisponibilité, perte de données ; contrôles associés |
| C1.3.1 | Journal de veille daté avec décisions prises ou écartées et sources primaires |
| C1.3.2 | Comparaison argumentée du maintien de Supabase avec une alternative pertinente |
| C1.4.1 | Estimations des prochains lots, hypothèses et confrontation au temps réellement passé |
| C1.4.2 | Budget distinguant dépenses réelles et valorisation de l'équipe fictive |
| C1.5 | Schémas des flux navigateur, serveur, Auth, PostgreSQL, Storage et intégrations |
| C1.6 | Présentation de cadrage et réponses préparées aux objections du commanditaire |
| C2.1.1 | Guide de reproduction des environnements et résultats de mesures sur Luniqo |
| C2.1.2 | Exécution d'un pipeline sur une modification, résultats conservés |
| C2.2.1 | Maquettes et version utilisable du parcours direction/employé/famille |
| C2.2.2 | Tests de règles de pointage et de permissions, rapport et limites de couverture |
| C2.2.3 | Contrôles d'accès directs, cas négatifs entre crèches et audit clavier/formulaires |
| C2.2.4 | Version identifiée déployée en test, recette, promotion et retour arrière démontrés |
| C2.3.1 | Cahier de recette reliant chaque exigence retenue à un résultat attendu |
| C2.3.2 | Tickets des échecs de recette, corrections et réexécution des scénarios |
| C2.4.1 | Guides Luniqo : installation, usage par rôle, migrations et mise à jour |
| C3.1 | Planning annuel réel et répartition pédagogique des responsabilités de l'équipe simulée |
| C3.2.1 | Tableau de suivi mensuel : délai, effort, risques, anomalies et décisions |
| C3.2.2 | Arbitrage documenté entre ajout d'un module et correction d'un parcours essentiel |
| C3.3.1 | Simulation d'absence/conflit, ajustements de charge et communication accessible |
| C3.3.2 | Évaluation des compétences fictives puis plan de progression ciblé sur Luniqo |
| C3.4.1 | Comptes rendus de revue, validations simulées identifiées et retours réels séparés |
| C3.4.2 | Démonstration scénarisée et reproductible, comptes de test et secours préparés |
| C4.1.1 | Mise à jour d'une dépendance avec analyse d'impact et vérifications avant/après |
| C4.1.2 | Sonde du parcours critique, tableau technique et déclenchement d'une alerte en test |
| C4.2.1 | Fiche d'anomalie reproductible : version, contexte, étapes, attendu et observé |
| C4.2.2 | Chaîne ticket → correctif → test de non-régression → déploiement vérifié |
| C4.3.1 | Amélioration choisie à partir d'une mesure ou d'un retour, puis résultat comparé |
| C4.3.2 | Journal des versions liées aux changements, anomalies et migrations |
| C4.3.3 | Cas de support avec contribution de chaque rôle, simulation indiquée si nécessaire |

Statuts proposés : à vérifier / absent / partiel / démontré / à actualiser. « Démontré » est un statut interne : il ne signifie pas « validé par le jury ». Pour chaque ligne, ajouter ensuite : lien de preuve, version, date, auteur/contribution, nature réelle ou simulée, lacune et prochaine action.

## Réutilisation dans les cours

| Type de cours | Lot possible | Preuve à conserver |
|---|---|---|
| Architecture | Documenter et comparer les options d'une évolution Luniqo | Schémas et décision argumentée |
| Base de données | Stabiliser une migration et contrôler l'isolation multi-crèches | Migration reproductible et tests d'accès |
| Frontend / UX | Améliorer le pointage ou la consultation familiale | Prototype, tests d'usage et changements |
| Qualité / tests | Vérifier les règles de présence et les cas d'erreur | Tests, rapports et anomalies |
| Sécurité | Évaluer Auth, permissions, Storage et accès directs | Scénarios, résultats et corrections |
| DevOps | Automatiser contrôle, livraison et retour arrière | Configuration et traces d'exécution |
| Gestion / management | Piloter un lot avec l'équipe simulée | Planning, décisions et bilan |
| Exploitation | Détecter puis traiter une anomalie en environnement de test | Alerte, diagnostic, correction et version |

Ces rapprochements sont des possibilités, pas une liste de tes cours réels. Avant chaque projet, confronter le sujet à cette table. Un exercice indépendant reste possible si sa contrainte ne sert pas Luniqo ; conserver alors son intérêt pédagogique sans imposer son intégration.

## Fiche à remplir pour chaque travail

- Cours, sujet exact, échéance et contraintes imposées.
- Problème Luniqo traité ; périmètre et exclusions.
- Références RNCP ciblées et preuves attendues.
- État initial, hypothèses, options et décision.
- Critères d'acceptation observables et vérification prévue.
- Ticket/branche, version de départ et version livrée.
- Résultats, limites et contribution personnelle ; assistance et sources utilisées.
- Nature réelle ou simulée des événements, budgets et intervenants.
- Liens vers livrable de cours, code, rapports et preuves d'exécution.
- Temps prévu/réel, écart, arbitrage et prochaine action.

## Organisation proposée

Un backlog du produit et une matrice RNCP. Chaque tâche peut porter une référence de cours et une ou plusieurs références RNCP. Une branche par travail cohérent ; une version identifiable pour chaque remise. Les expérimentations non retenues restent traçables sans devoir rejoindre main.

L'équipe simulée peut comprendre pilotage, UX/frontend, backend/données et qualité/exploitation. Définir disponibilités et compétences crédibles ; ne pas attribuer de faux commits à ces personnes. Le suivi réel reste celui du travail de Florent, tandis que l'affectation d'équipe constitue un scénario pédagogique explicite.

À chaque revue mensuelle : vérifier les nouvelles preuves, relancer les contrôles affectés, mettre à jour les écarts de planning, choisir une lacune prioritaire et préparer une courte restitution orale. Chaque trimestre : vérifier une version complète du parcours central et réaliser une simulation de soutenance.

## Jalons relatifs

| Période | Résultat attendu |
|---|---|
| Premier mois | Démarrage reproductible, état fonctionnel, cadrage de l'évolution et matrice renseignée |
| Mois 2–3 | Parcours central fiable, tests et premiers contrôles automatisés |
| Mois 4–6 | Travaux de cours reliés aux preuves et corrections des lacunes prioritaires |
| Mois 7–9 | Exploitation de test mesurée, maintenance et scénarios de support documentés |
| Trois derniers mois | Dossiers consolidés, conformité aux consignes locales et oraux blancs |

Adapter ces jalons aux sujets, à la charge disponible et aux dates de remise réelles. Prévoir les dossiers au fil de l'eau : les trois derniers mois ne doivent pas servir à reconstruire l'historique.

## Priorités immédiates

1. Obtenir la liste des cours et les premiers sujets pour remplacer les rapprochements hypothétiques par des travaux concrets.
2. Reproduire l'installation sur une base de test isolée et synthétique ; aucune commande de reset sur une base existante sans en connaître la destination.
3. Vérifier le parcours central et classer chaque fonction : vérifiée, défaillante, non testée.
4. Réconcilier README, versions techniques, migrations et documents de référence.
5. Mettre en place les premiers tests métier et l'intégration continue ; vérifier auparavant les contrôles éventuellement configurés hors dépôt.
6. Éprouver les autorisations et l'isolation des crèches ; rétablir le typage des services utilisés.
7. Compléter le cadrage et commencer le journal de décisions à partir de l'état réel actuel.

## Sources et degré de confiance

- Dépôt : https://github.com/zharrow/Luniqo (nommé nursery-app au moment de cet état des lieux), commit indiqué en tête. Sources de constats : package.json, README.md, docs/phases/README.md, lib/services, lib/providers/PostHogProvider.tsx et supabase/migrations. Confiance élevée pour la présence des fichiers, limitée pour leur comportement réel.
- Fiche nationale : https://www.francecompetences.fr/recherche/rncp/39583
- Référentiel officiel détaillé, 17 pages : https://www.francecompetences.fr/wp-json/api/v1/activity/export/26524/541984. Accessible le 8 octobre 2026. Les identifiants ci-dessus constituent un index de travail ; consulter les critères originaux et contrôler toute modification ultérieure.
- Consignes locales : informations rapportées par Florent dans cette conversation ; grilles, formats et dates non disponibles.

Ce plan n'est pas un audit de conformité juridique, de sécurité ou d'accessibilité, ni une certification des quatre blocs. Les constats sont provisoires jusqu'aux vérifications exécutées et à l'examen des consignes de Toulouse.
