# ANO-002 — Le lint de la v1 ne démarre pas

| | |
|---|---|
| Statut | **Ouverte**, reproduite ; non corrigée (v1 gelée, hors sécurité) |
| Détectée | 2026-10-08, en préparant la CI (LUN-008) `[RÉEL]` |
| Version | v1, branche `infra/LUN-008-ci-github-actions`, `node_modules` installé localement |
| Gravité | Mineure : aucun effet sur les utilisateurs. Conséquence : le code v1 n'est vérifié par aucun lint |
| Composants | `package.json` (`eslint` `^8.57.0`, `eslint-config-next` `^16.1.6`), script `pnpm lint` |
| Compétences | C4.2.1 (consigner une anomalie reproductible) |
| Ticket | aucun pour l'instant (v1 gelée) |

## Reproduction

```bash
pnpm lint
```

## Attendu / observé

- **Attendu** : ESLint analyse le code et liste les erreurs éventuelles.
- **Observé** : ESLint 8.57.1 s'arrête au chargement de sa configuration, avant toute analyse :
  `TypeError: Converting circular structure to JSON ... property 'configs' -> ... property 'flat'`, code de sortie 2.

## Cause probable

`eslint-config-next` 16 n'est publié qu'au format de configuration « flat » d'ESLint 9, alors que le projet installe ESLint 8, qui lit encore l'ancien format. Les deux versions sont incompatibles. À confirmer si l'on corrige.

## Décision

- La v1 est gelée (seuls les correctifs de sécurité y entrent) : pas de correction.
- La CI ne lance donc pas `pnpm lint`. La compilation TypeScript du front reste vérifiée : le build de l'image `front` exécute `next build`, qui échoue sur une erreur de typage (`ignoreBuildErrors = false`).
- Le front v2 (ADR-002) partira d'une configuration de lint fonctionnelle, vérifiée par la CI.
