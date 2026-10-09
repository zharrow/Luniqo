# ANO-003 — Le déploiement Vercel du front v1 échoue : trop de fonctions serverless

| | |
|---|---|
| Statut | **Corrigée et vérifiée** le 2026-10-09 dans la PR #50 (commit `f7a02bb`) |
| Détectée | 2026-10-09, contrôle « Vercel » en échec sur la PR #50 (LUN-011) `[RÉEL]` |
| Version | branche `feat/LUN-011-family-portal`, commit `7bf090d` ; déploiement de prévisualisation `dpl_4ZmqsXmM5Bc6aPPoF9iEAQtm1aKU` |
| Gravité | Majeure pour l'exploitation : une fois la PR fusionnée, chaque déploiement de `main` sur Vercel aurait échoué. Aucun effet sur la version en ligne, qui reste la dernière réussie |
| Composants | Intégration Vercel du dépôt (front v1), dossier `api/` de la v2 |
| Compétences | C4.2.1 (consigner une anomalie), C4.2.2 (correctif, non-régression, déploiement vérifié) |
| Ticket | LUN-011 (anomalie introduite par ce ticket) |

## Reproduction

Ouvrir une PR depuis une branche qui contient `api/` sans `.vercelignore` (par exemple le commit `7bf090d`) : l'intégration Vercel du dépôt construit puis refuse le déploiement. Message exact :

```bash
vercel inspect <id du déploiement> --logs   # journal : « Deploying outputs... » puis statut Error, sans message
curl -H "Authorization: Bearer $VERCEL_TOKEN" https://api.vercel.com/v13/deployments/<id>   # errorCode, errorMessage
```

## Attendu / observé

- **Attendu** : chaque PR produit une prévisualisation Vercel du front v1, comme pour les PR #45, #47 et #49.
- **Observé** : la construction réussit (`Build Completed`), puis le déploiement est refusé. L'API Vercel renvoie :
  `exceeded_serverless_functions_per_deployment` : « No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan ».

## Cause

Vercel applique une convention : tout fichier du dossier `api/` **à la racine** du projet devient une fonction serverless. Ce dossier contient l'API v2 (FastAPI), que Vercel n'a pas à déployer. Le journal de construction montre une installation de dépendances Python par fonction : 8 sur la PR #49, 9 sur la PR #50. Les modules ajoutés par LUN-011 font passer le total (fonctions Python + fonctions Next.js) au-dessus de 12.

La limite existait depuis la création de `api/` (LUN-002) ; elle n'a été atteinte qu'avec LUN-011. Les prévisualisations précédentes embarquaient déjà des fonctions Python inutiles.

## Correctif

Fichier `.vercelignore` à la racine, qui exclut `/api` du déploiement Vercel. Le motif est ancré à la racine : les routes Stripe de la v1 (`app/api/`) ne sont pas touchées. Ce n'est pas une fonctionnalité de la v1 : seule la configuration de déploiement change.

## Vérification

`[RÉEL]` 2026-10-09, commit `f7a02bb` : le contrôle « Vercel » de la PR #50 passe (déploiement `dpl_GPgyUDTrbbRCsj1VAP6QtKqoTNaj`, statut `Ready`). Son journal (`vercel inspect <id> --logs`) ne contient plus aucune installation de dépendances Python, contre 9 avant le correctif. Le message d'erreur d'origine a été lu avec l'API Vercel (`GET /v13/deployments/<id>`, champs `errorCode` et `errorMessage`), que le journal de construction n'affiche pas. Les deux autres contrôles (CI GitHub Actions) restent verts.

Non-régression : le front v1 n'utilise rien dans `api/` (ses routes serveur sont sous `app/api/`), et la pile Docker construit l'API depuis `../api` sans passer par Vercel.

## Leçon

Le dépôt unique (v1 + v2) a des effets sur des outils configurés pour la v1 seule. Le contrôle Vercel ne fait pas partie de notre CI GitHub Actions, mais il compte : on le surveille au même titre. Quand la v2 sera déployée sur le VPS (phase 5), il faudra décider du sort de l'intégration Vercel.
