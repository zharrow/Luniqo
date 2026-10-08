# ADR-003 — Authentification et sessions de la v2

| | |
|---|---|
| Statut | **Acceptée** le 2026-10-08 par Florent |
| Date | 2026-10-08 |
| Décideur | Florent `[RÉEL]`. Il a fixé le critère (« la solution qui respecte le mieux les règles de cybersécurité ») et délégué la proposition à l'assistant |
| Ticket | LUN-002 |
| Compétences | C1.3.2 (choix d'architecture), C1.2.3 (risques et contrôles), C2.2.3 (sécurité) |

## Contexte

- **Données sensibles.** Luniqo traite des données d'enfants, dont des données de santé (allergies, PAI). Une fuite de compte direction donne accès à toutes les crèches d'une entreprise.
- **Quatre publics** : éditeur (Developer), direction (Owner), employés, parents. Plus une **tablette partagée** dans chaque crèche, sur laquelle les employés pointent avec un PIN à 4 chiffres.
- **Défaut de la v1** ([ANO-001](../bloc-4-maintien-operationnel/anomalies/ANO-001-pin-tablette.md)) : le navigateur lit le haché du PIN et le vérifie lui-même ; la « session » tablette est une valeur en localStorage. Aucune limite de tentatives.
- **Architecture v2** ([ADR-001](ADR-001-reecriture-backend.md)) : le front Next.js et l'API FastAPI sont servis **sur la même origine** derrière la passerelle nginx (`/` et `/api/`). Un seul service vérifie l'identité : l'API.

## Références

| Source | Ce qu'on en retient |
|---|---|
| OWASP, *Password Storage Cheat Sheet* | Argon2id, au minimum 19 Mio de mémoire, 2 itérations, parallélisme 1 |
| OWASP, *Session Management Cheat Sheet* et ASVS (authentification, sessions) | Identifiant de session aléatoire et long, cookie `Secure` + `HttpOnly` + `SameSite`, renouvellement à la connexion, expiration d'inactivité et absolue, invalidation côté serveur |
| NIST SP 800-63B-4 (version finale, août 2025) | Mot de passe d'au moins 15 caractères quand il est le seul facteur (8 avec un second facteur), au moins 64 caractères acceptés, **pas de règles de composition**, liste de mots de passe interdits, limitation des tentatives |
| CNIL, délibération n° 2022-100 (recommandation mots de passe) | Raisonnement en entropie : 80 bits sans mesure complémentaire, 50 bits avec limitation des tentatives, 13 bits pour un secret lié à un matériel avec blocage après 3 échecs |
| ANSSI, *Recommandations relatives à l'authentification multifacteur et aux mots de passe* | Multifacteur pour les comptes à privilèges, fonctions de hachage lentes et salées |

Le 2026-10-08, les valeurs chiffrées (OWASP hachage, NIST, CNIL) et l'adresse du guide ANSSI ont été vérifiées par recherche web. Le texte complet des fiches OWASP sur les sessions et du guide ANSSI reste à relire. Tout sera revérifié à l'implémentation (LUN-003).

## Options

| Critère | **A. Sessions opaques stockées en base** | B. Jetons JWT | C. Fournisseur d'identité (Keycloak, OIDC) |
|---|---|---|---|
| Principe | L'API délivre un jeton aléatoire dans un cookie ; la session vit dans PostgreSQL | L'API signe un jeton qui porte l'identité ; aucun état côté serveur | Un serveur d'identité séparé gère comptes, MFA et sessions ; l'API vérifie ses jetons |
| Révocation immédiate (déconnexion, départ d'un salarié, compte volé) | **Oui** : on supprime la ligne | Non, sauf liste de révocation (donc un état, ce qui annule l'intérêt) ou durée très courte + jeton de rafraîchissement | Oui, côté fournisseur |
| Exposition au vol par XSS | Nulle si cookie `HttpOnly` | Forte si le jeton est en localStorage (cas courant) ; sinon équivalente à A | Dépend de l'intégration |
| Erreurs d'implémentation connues | Peu : un jeton aléatoire comparé à une ligne | Nombreuses : algorithme `none`, confusion de clés, validation incomplète des champs, rotation des clés | Configuration riche, donc erreurs de configuration |
| Surface d'attaque ajoutée | Aucune (une table) | Gestion de clés de signature | Un service complet de plus à durcir, mettre à jour et surveiller |
| Adapté à notre architecture | **Oui** : une seule origine, un seul service vérifie | Pensé pour plusieurs services ou domaines, ce qui n'est pas notre cas | Pensé pour plusieurs applications et l'authentification unique (SSO) |
| PIN tablette avec appareil enrôlé | Simple à modéliser | Possible | Hors du modèle standard, extension à écrire |

## Décision

**Option A : sessions opaques stockées dans PostgreSQL, cookie `HttpOnly`, mots de passe en Argon2id, multifacteur obligatoire pour les comptes à privilèges, PIN tablette vérifié côté serveur et lié à un appareil enrôlé.**

### Pourquoi c'est l'option la plus sûre ici

1. **Révocation immédiate.** Un salarié qui quitte la crèche, un téléphone de parent volé, une session suspecte : la session est supprimée en base et le prochain appel est refusé. Avec des JWT, le jeton reste valide jusqu'à son expiration.
2. **Le jeton est inaccessible au JavaScript.** Cookie `HttpOnly` : une faille XSS dans le front ne permet pas d'exfiltrer la session. C'est l'inverse de la v1, qui stocke la session tablette en localStorage.
3. **Une fuite de la base ne donne pas les sessions.** On ne stocke que l'empreinte SHA-256 du jeton. Le jeton est aléatoire sur 256 bits, donc une empreinte rapide suffit (pas besoin d'Argon2 comme pour un mot de passe choisi par un humain).
4. **Moins de pièces, moins d'erreurs.** Pas de clé de signature à protéger et faire tourner, pas de service supplémentaire à maintenir. Un fournisseur comme Keycloak est sûr quand il est bien configuré et tenu à jour, mais il ajoute un composant critique que l'équipe devrait surveiller seule (BC04). Il reste l'option à reconsidérer si Luniqo doit un jour offrir l'authentification unique à plusieurs applications.
5. **Contrôle centralisé et testable.** La vérification de session est une dépendance FastAPI unique ; la vérification « cet utilisateur a-t-il accès à cette crèche ? » s'appuie dessus. Les cas négatifs se testent directement (C2.2.2, C2.2.3).

### Règles retenues

**Mots de passe**

- Argon2id (bibliothèque `argon2-cffi`), au moins 19 Mio, 2 itérations, parallélisme 1. Paramètres relus et mesurés sur le VPS de production avant la mise en ligne. Ré-hachage transparent à la connexion si les paramètres changent.
- Au moins **15 caractères**, au plus 128, sans règle de composition (NIST). Associé à la limitation des tentatives, cela dépasse les 50 bits demandés par la CNIL dans ce cas.
- Refus des mots de passe courants (liste locale, sans appel à un service externe).
- Messages d'erreur identiques que le compte existe ou non, et temps de réponse équivalent (un haché factice est vérifié pour un compte inconnu) : pas d'énumération des comptes.

**Sessions**

- Jeton de 256 bits (`secrets.token_urlsafe(32)`), empreinte SHA-256 en base avec l'utilisateur, la date de création, la dernière activité, l'adresse IP et l'agent utilisateur.
- Cookie `__Host-luniqo_session` : `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sans `Domain`. Le préfixe `__Host-` empêche un sous-domaine de l'écraser.
- Nouveau jeton à chaque connexion et à chaque changement de droits (pas de fixation de session).
- Expiration d'inactivité **30 minutes**, expiration absolue **12 heures** (une journée de travail en crèche).
- Déconnexion = suppression en base. Changement de mot de passe ou désactivation du compte = suppression de toutes les sessions de l'utilisateur.

**Requêtes intersites (CSRF)**

- `SameSite=Lax`, plus contrôle de l'en-tête `Origin` sur toutes les requêtes qui modifient des données (`POST`, `PUT`, `PATCH`, `DELETE`). Une origine absente ou différente de celle de Luniqo est refusée.
- L'API n'accepte que du JSON (`Content-Type: application/json`), ce qu'un formulaire HTML d'un autre site ne peut pas envoyer sans requête préalable CORS. CORS reste fermé : front et API partagent l'origine.

**Limitation des tentatives**

- Par compte et par adresse IP, comptées en base (pas de Redis à ce stade) : délai croissant après 5 échecs, blocage temporaire de 15 minutes après 10. Ces seuils seront ajustés après les tests.

**Multifacteur (TOTP)**

- **Obligatoire** pour Developer et Owner, qui voient les données de santé de toutes les crèches de l'entreprise (ANSSI : comptes à privilèges). Proposé aux employés et aux parents.
- Secret TOTP chiffré en base, codes de secours à usage unique hachés.
- Livré dans un ticket séparé (LUN-006), après le socle : tant qu'il n'existe pas, la v2 ne contient que des données synthétiques.

**Tablette partagée et PIN**

Un PIN à 4 chiffres a environ 13 bits d'entropie. La CNIL ne l'admet que lié à un matériel, avec blocage après 3 échecs. On applique exactement ce cadre :

- **Enrôlement de la tablette** par la direction, connectée avec son propre compte : la tablette reçoit un jeton d'appareil (256 bits, empreinte en base, cookie `HttpOnly`) rattaché à **une seule crèche**, révocable à tout moment, renouvelé tous les 90 jours.
- Le PIN n'est accepté que **depuis une tablette enrôlée**, pour un employé qui a accès à cette crèche. Il est haché en Argon2id et **ne quitte jamais le serveur**.
- **3 échecs** : le PIN de l'employé est bloqué ; la direction le débloque. Les échecs sont aussi comptés par tablette.
- Le PIN ouvre une **session d'action** très courte (2 minutes) limitée aux gestes de terrain (pointage, fiche de ménage, relevés HACCP). Il ne donne jamais accès à l'espace employé complet ni aux données de santé.
- Limite assumée : la tablette appartient à la crèche, pas à l'employé. Le « matériel détenu » de la CNIL est ici celui de l'établissement. Les droits très réduits de la session d'action compensent cet écart.

**Traçabilité**

- Table d'événements d'authentification : connexion réussie ou échouée, blocage, déconnexion, enrôlement et révocation de tablette, changement de mot de passe. Sans mot de passe ni jeton.
- Ces événements alimentent la supervision et les alertes de la phase 6 (C4.1.2), par exemple une rafale d'échecs sur une crèche.

## Conséquences

- **Positives** : la cause d'ANO-001 disparaît en v2 (aucun haché ne quitte le serveur, PIN limité et lié à un appareil). Chaque règle ci-dessus se traduit en tests unitaires et en cas négatifs. Aucun composant supplémentaire dans la pile Docker.
- **Négatives** : l'API lit la base à chaque requête pour vérifier la session (une requête indexée par empreinte, coût à mesurer). Le multifacteur, la réinitialisation de mot de passe par e-mail et la liste de mots de passe interdits sont à écrire et à maintenir nous-mêmes.
- **HTTPS obligatoire** pour le cookie `Secure` : en local, les navigateurs traitent `localhost` comme une origine sûre (à vérifier sur la pile Docker en LUN-003) ; en recette et en production, la passerelle sert du HTTPS (phase 5).
- **Suites** : LUN-003 (comptes et sessions), LUN-004 (entreprises, crèches et droits d'accès), LUN-005 (tablette et PIN), LUN-006 (multifacteur). La réinitialisation de mot de passe par e-mail viendra avec l'intégration d'un service d'envoi.

## Sources

- OWASP, [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- OWASP, [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- NIST, [SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)
- CNIL, [délibération n° 2022-100 du 21 juillet 2022](https://www.cnil.fr/sites/cnil/files/atoms/files/deliberation-2022-100-du-21-juillet-2022_recommandation-aux-mots-de-passe.pdf)
- ANSSI, [Recommandations relatives à l'authentification multifacteur et aux mots de passe](https://cyber.gouv.fr/publications/recommandations-relatives-lauthentification-multifacteur-et-aux-mots-de-passe)

Recherches faites le 2026-10-08 (voir « Références »).
