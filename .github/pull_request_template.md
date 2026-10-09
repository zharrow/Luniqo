<!-- Titre : Conventional Commit avec la clé Jira, par exemple « feat(api): pointage groupé (LUN-42) ». -->

## Ticket

LUN-<n> : <!-- lien Jira -->

## Ce qui change

-

## Comment c'est vérifié

<!-- Commandes lancées et résultats ; « à vérifier » si ce n'est pas fait. -->

- [ ] Tests unitaires et d'intégration au vert (`cd api && pytest`)
- [ ] Parcours rejoué sur la pile Docker, si l'API ou le front change
- [ ] Documentation à jour (README, CONTRIBUTING, registre des choix techniques)
- [ ] Entrée ajoutée dans `CHANGELOG.md`, section « Non publié »

## Definition of Done

- [ ] Code relu par au moins une autre personne
- [ ] CI verte
