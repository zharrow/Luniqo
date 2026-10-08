# ANO-001 — Profils et hachés de PIN lisibles depuis le navigateur

| | |
|---|---|
| Statut | **Ouverte**, non reproduite |
| Détectée | 2026-10-08, par lecture du code `[RÉEL]` |
| Version | v1, `main`, commit `3fef96a` |
| Gravité | Critique par conception (confidentialité, usurpation d'accès tablette), à confirmer par reproduction. Exposition réelle nulle à ce jour : la base v1 ne contient que des données de test |
| Composants | `lib/utils/auth.client.ts` (`loginWithPin`), `app/(tablet)/tablet/login/page.tsx`, `supabase/migrations/01_dev_permissions.sql` |
| Compétences | C4.2.1 (consigner), C4.2.2 (corriger et déployer), C2.2.3 (sécurité) |
| Ticket | à créer (`LUN-###`) |

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

## Historique

| Date | Événement | Nature |
|---|---|---|
| 2026-10-08 | Détection par lecture du code, consignation | [RÉEL] |
| 2026-10-08 | Florent confirme que la base v1 ne contient que ses données de test : pas de mitigation urgente en v1, correction par conception en v2 | [RÉEL] |
