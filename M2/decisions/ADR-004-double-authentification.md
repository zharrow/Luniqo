# ADR-004 — Double authentification : passkeys, TOTP et codes de secours

| | |
|---|---|
| Statut | **Acceptée** le 2026-10-09 par Florent |
| Date | 2026-10-09 |
| Décideur | Florent `[RÉEL]`. Il a proposé SMS, e-mail et Face ID ; l'assistant a comparé les options et recommandé la solution ci-dessous, que Florent a validée |
| Remplace | La partie « Multifacteur (TOTP) » d'[ADR-003](ADR-003-authentification-v2.md), le reste d'ADR-003 restant en vigueur |
| Ticket | LUN-006 |
| Compétences | C1.3.2 (choix d'architecture), C1.2.3 (risques et contrôles), C2.2.3 (sécurité), C3.2.2 (arbitrage) |

## Contexte

- ADR-003 rend le second facteur **obligatoire** pour la direction (`owner`) et l'éditeur (`developer`) : ils voient les données de toutes les crèches d'une entreprise, bientôt des données de santé d'enfants (LUN-019). Il prévoyait le TOTP seul.
- En relisant cette décision, Florent a proposé trois moyens : **code par SMS**, **code par e-mail** et **Face ID**, plus rapide au quotidien.
- Usages réels : une direction de crèche se connecte depuis son téléphone et un ordinateur de bureau, parfois partagé. Elle doit pouvoir s'authentifier vite, et récupérer son compte si elle perd son téléphone.

## Options

| Critère | Code par SMS | Code par e-mail | TOTP (application d'authentification) | **Passkey (Face ID, Touch ID, Windows Hello…)** |
|---|---|---|---|---|
| Principe | Un code envoyé au numéro de téléphone | Un code envoyé à l'adresse e-mail | Un code à 6 chiffres calculé toutes les 30 s par une application, à partir d'un secret partagé à l'activation (RFC 6238) | L'appareil crée une paire de clés ; la biométrie (ou le code de l'appareil) déverrouille la clé privée, qui signe un défi du serveur (WebAuthn / FIDO2) |
| Résiste au vol du mot de passe | Oui | **Non** : la boîte mail sert déjà à réinitialiser le mot de passe, ce n'est pas un facteur indépendant | Oui | Oui |
| Résiste à l'hameçonnage | Non (code recopiable sur un faux site) | Non | Non (code recopiable) | **Oui** : la clé est liée au domaine de Luniqo, un faux site ne peut pas s'en servir |
| Attaques connues | Transfert du numéro sur une autre carte SIM (*SIM swapping*), interception (failles SS7) | Prise de contrôle de la boîte mail | Vol du secret à l'activation | Vol de l'appareil **et** de sa biométrie ou de son code |
| Position des autorités | **Déconseillé par l'ANSSI** | Non retenu comme second facteur | Admis | Exigé comme option par le NIST (résistance à l'hameçonnage), passkeys synchronisées reconnues depuis la version de 2025 |
| Rapidité | Lente (attente du SMS) | Lente, parfois en spam | Moyenne (ouvrir l'application, recopier) | **La plus rapide** (un regard) |
| Coût | Payant à chaque envoi | Gratuit | Gratuit | Gratuit |
| Données personnelles en plus | Numéro de téléphone | Aucune | Un secret par compte | Une clé publique par appareil ; **aucune donnée biométrique** chez Luniqo |
| Contraintes | Prestataire SMS | Délivrabilité des e-mails | Une application à installer | HTTPS et un domaine fixe (en local, `localhost` est accepté) |

### La biométrie et le RGPD

Avec une passkey, le visage ou l'empreinte ne quittent jamais l'appareil : ils servent seulement à déverrouiller une clé stockée dans sa puce sécurisée. Luniqo ne reçoit qu'une signature. La CNIL considère qu'une biométrie stockée dans l'appareil, sous le seul contrôle de la personne, qui ne transmet au service qu'un résultat de réussite ou d'échec, relève de l'exemption domestique du RGPD (article 2-2-c). **Luniqo ne traite donc aucune donnée biométrique**, ce qui évite une donnée sensible au sens de l'article 9.

## Décision

1. **Passkey comme méthode principale.** Une passkey vérifiée par la biométrie ou le code de l'appareil réunit à elle seule deux facteurs (possession de l'appareil + biométrie ou code). Elle peut donc **remplacer mot de passe et code** : « Se connecter avec Face ID » en une étape.
2. **TOTP comme alternative**, pour un appareil sans biométrie ou un ordinateur partagé : mot de passe puis code à 6 chiffres.
3. **Codes de secours à usage unique** (10, imprimables) pour retrouver l'accès en cas d'appareil perdu.
4. **E-mail pour la récupération du compte seulement** (réinitialisation du mot de passe), jamais comme second facteur. Réinitialiser son mot de passe ne désactive pas le second facteur.
5. **Pas de SMS.**

### Qui doit avoir un second facteur

| Rôle | Second facteur | Raison |
|---|---|---|
| Direction (`owner`), éditeur (`developer`) | **Obligatoire** : à la première connexion, le compte ne peut rien faire d'autre qu'enregistrer une passkey ou un TOTP | Comptes à privilèges (ADR-003, ANSSI) |
| Employés, familles | Proposé | Accès limité ; la tablette garde son propre modèle (PIN lié à l'appareil, ADR-003) |

### Règles de mise en œuvre

- **Passkeys** : validation complète de l'origine et du domaine (`rpId`), vérification de l'utilisateur exigée (`userVerification: required`), compteur de signatures contrôlé. On stocke l'identifiant et la clé publique de chaque passkey, un nom donné par la personne (« iPhone de Camille »), les dates de création et de dernière utilisation. Plusieurs passkeys par compte (téléphone et ordinateur).
- **TOTP** : secret de 160 bits, **chiffré en base** avec une clé fournie par un secret Docker ; tolérance d'un pas de 30 s ; un code déjà utilisé est refusé (rejeu) ; même limitation des tentatives que le mot de passe. Activation confirmée par un premier code valide.
- **Codes de secours** : hachés comme des mots de passe, chacun utilisable une fois ; en générer de nouveaux annule les anciens.
- **Sessions** : une session web n'ouvre les routes de la direction qu'une fois le second facteur vérifié. Changer ou retirer un facteur demande une réauthentification récente et ferme les autres sessions.
- **Journal** : enregistrement et retrait de facteur, réussite et échec, usage d'un code de secours, sans aucun secret.
- **Perte de tous les facteurs et des codes** : procédure de support avec vérification d'identité, décrite dans le dossier BC04 (collaboration support, C4.3.3).

## Conséquences

- **Positives** : la direction se connecte plus vite qu'avec un mot de passe seul, et de façon résistante à l'hameçonnage. Aucune donnée biométrique ni numéro de téléphone à protéger. Aucun coût d'envoi.
- **Négatives** : deux mécanismes à développer et à tester (WebAuthn et TOTP) ; les passkeys exigent un domaine fixe en HTTPS pour la recette et la production (phase 5), et le front v1 devra intégrer l'appel au navigateur (`navigator.credentials`).
- **Risques** : appareil perdu → plusieurs passkeys, TOTP et codes de secours ; navigateur ancien sans passkey → TOTP.
- **Bibliothèques candidates** (à vérifier et figer à l'implémentation, avec une ligne au registre) : `webauthn` (py_webauthn) côté API, `pyotp` pour le TOTP.

## Sources

- IETF, [RFC 6238 — TOTP](https://www.rfc-editor.org/rfc/rfc6238)
- W3C, [Web Authentication (WebAuthn) niveau 3](https://www.w3.org/TR/webauthn-3/) ; FIDO Alliance, [passkeys](https://fidoalliance.org/passkeys/)
- ANSSI, [Recommandations relatives à l'authentification multifacteur et aux mots de passe](https://cyber.gouv.fr/publications/recommandations-relatives-lauthentification-multifacteur-et-aux-mots-de-passe) (SMS déconseillé)
- NIST, [SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) (option résistante à l'hameçonnage, passkeys synchronisées)
- CNIL, [Biométrie dans les smartphones des particuliers : application du cadre de protection des données](https://www.cnil.fr/fr/biometrie-dans-les-smartphones-des-particuliers-application-du-cadre-de-protection-des-donnees)

Recherches faites le 2026-10-09 : la position de l'ANSSI sur le SMS, la reconnaissance des passkeys synchronisées par le NIST et l'exemption domestique de la CNIL ont été vérifiées par recherche web ; le texte complet du guide ANSSI et de la norme NIST reste à relire.
