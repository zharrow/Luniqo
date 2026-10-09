# ANO-001 — Profils et hachés de PIN lisibles depuis le navigateur

| | |
|---|---|
| Statut | **v1 : ouverte**, non reproduite (v1 gelée, base de test). **v2 : corrigée par conception** (LUN-005, 2026-10-09) |
| Détectée | 2026-10-08, par lecture du code `[RÉEL]` |
| Version | v1, `main`, commit `3fef96a` |
| Gravité | Critique par conception (confidentialité, usurpation d'accès tablette), à confirmer par reproduction. Exposition réelle nulle à ce jour : la base v1 ne contient que des données de test |
| Composants | `lib/utils/auth.client.ts` (`loginWithPin`), `app/(tablet)/tablet/login/page.tsx`, `supabase/migrations/01_dev_permissions.sql` |
| Compétences | C4.2.1 (consigner), C4.2.2 (corriger et déployer), C2.2.3 (sécurité) |
| Ticket | LUN-005 (correction par conception en v2, voir [ADR-003](../../decisions/ADR-003-authentification-v2.md)) |

## Description

La connexion tablette (e-mail + PIN à 4 chiffres) s'exécute **entièrement dans le navigateur** :

1. Le navigateur lit la ligne `profiles` de l'employé, colonne `pin_hash` comprise, avec la clé publique Supabase.
2. Il compare le PIN saisi au haché avec bcryptjs, côté client.
3. En cas de succès, il stocke une « session » dans le localStorage. Les requêtes tablette suivantes partent avec la même clé publique.

La RLS étant désactivée sur `profiles` par `01_dev_permissions.sql`, rien côté serveur ne restreint cette lecture.

## Attendu / observé

- **Attendu** : un navigateur ne reçoit jamais de haché de PIN. Le PIN est vérifié côté serveur, avec limitation des tentatives, et ouvre une session serveur limitée à la crèche concernée.
- **Observé (lecture du code)** : le haché transite jusqu'au navigateur. Sans RLS, d'autres lignes de `profiles` sont vraisemblablement lisibles avec la même clé. **À confirmer par reproduction.**

## Impact estimé

- Exposition des e-mails, noms et rôles des comptes.
- Un PIN à 4 chiffres n'offre que 10 000 combinaisons. Avec bcrypt au coût 10, retrouver un PIN à partir de son haché prend de l'ordre de quelques minutes sur un ordinateur ordinaire (estimation, non mesurée). Le hachage ne protège donc pas un PIN dont le haché a fuité.
- Un PIN retrouvé donne accès à l'interface tablette de l'employé.

## Reproduction (à faire)

Uniquement sur une **base de test** avec des comptes synthétiques, jamais sur une base contenant des données réelles :

1. Créer deux employés de test avec un PIN.
2. Depuis un client sans session, avec la seule clé publique, tenter de lire `profiles`.
3. Consigner le résultat : version, date, commande, réponse obtenue.

## Correctif envisagé

- **v1, immédiat si la base contient des données réelles** : réactiver la RLS sur `profiles` avec des politiques limitant la lecture à son propre profil. Déplacer la vérification du PIN dans une action serveur qui ne renvoie jamais le haché. Limiter les tentatives.
- **v2 (ADR-001, ADR-003)** : PIN vérifié par l'API, jamais exposé, verrouillage après plusieurs échecs, session tablette côté serveur limitée à une crèche. Test de non-régression : une lecture anonyme de `profiles` doit être refusée.

## Correction en v2 (LUN-005) `[RÉEL]`

| Défaut v1 | v2 | Preuve (tests) |
|---|---|---|
| Le navigateur lit `pin_hash` | Le haché ne quitte jamais l'API ; la tablette ne reçoit que prénom, initiale, « PIN défini », « PIN bloqué » | `test_parcours_tablette` (aucun haché ni adresse dans la réponse) |
| PIN vérifié dans le navigateur | Vérifié par l'API (Argon2id), seulement depuis une tablette enrôlée par la direction | `test_sans_tablette_enrolee_rien_n_est_accessible`, `test_revocation_immediate` |
| Aucune limite de tentatives | PIN bloqué au 3e échec (déblocage par la direction ou nouveau PIN choisi par l'employé) ; tablette bloquée à 10 échecs en 15 min | `test_pin_bloque_au_troisieme_echec…`, `test_tablette_bloquee_apres_10_echecs…` |
| « Session » en localStorage, requêtes avec la clé publique | Session d'action côté serveur, cookie `HttpOnly`, 2 minutes, une seule crèche, refusée par l'espace web | `test_session_d_action_de_2_minutes`, `test_session_d_action_refusee_par_l_espace_web` |
| « Utilisateur non trouvé » / « Code PIN incorrect » | Un employé hors de la crèche est refusé comme un PIN faux, et compté comme un échec | `test_employe_d_une_autre_creche_refuse` |

Les tests ont été éprouvés par mutation : PIN jamais bloqué, session de tablette acceptée par l'espace web, absence de blocage par tablette, accès non revérifié, tablette révoquée acceptée. Chaque faille fait échouer un test. Parcours vérifié sur la pile Docker le 2026-10-09.

La v1 reste vulnérable tant qu'elle n'est pas remplacée : la correction v1 décrite plus haut n'est à appliquer que si la base v1 reçoit des données réelles.

## Historique

| Date | Événement | Nature |
|---|---|---|
| 2026-10-08 | Détection par lecture du code, consignation | [RÉEL] |
| 2026-10-08 | Florent confirme que la base v1 ne contient que ses données de test : pas de mitigation urgente en v1, correction par conception en v2 | [RÉEL] |
| 2026-10-09 | Correction par conception livrée en v2 (LUN-005) : tests, mutations, parcours sur la pile Docker | [RÉEL] |
