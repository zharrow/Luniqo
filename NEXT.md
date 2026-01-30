avant tout : j'ai un soucis, j'ai créer plusieurs crèches, et chaque crèche devrait avoir accès à plusieurs module différents qui sont déjà activé depuis l'interface du Developpeur, seulement j'ai bien les 3 module actif sur chaque crèche alors que certains n'ont que celle par défaut et d'autre les 10 module devraient être activé.

1. Il faudrait réfléchir à comment mettre en place le paiement (par Stripe), j'aimerai que les utilisateur puissent payer par CB, Paypal ou Apple Pay.

2. Pour les enfants dans HACCP, on propose d'écrire les allergies et le régime alimentaire. Ceux deux élements devrait faire parti d'un table et qu'on puisse les selectionner par checkbox, autrement on risque de se tromper, et ca nous permettrait de récupérér ces facteurs lors de la distribution des repas de la session du jour et que chaque employee sache bien quel enfant à quel allergie et régime alimentaire.

3. quand j'édite le nom d'une crèche, il ne se refresh pas dans le selecteur des crèches dans le header, il faut que je rafraichisse la page

4. Je peux cliquer sur supprimer une crèche, mais ca la désactive. Il faudrait pouvoir la désactiver avec un bouton désactiver, et supprimer avec le bouton supprimer.

5. quand je change de crèche via le selecteur de crèche dans le header, celà n'actualise pas les module disponible par crèche.

6. Dans le module HACCP, dans la page Repas, quand j'essaie d'ajouter un repas : 
{
    "code": "PGRST204",
    "details": null,
    "hint": null,
    "message": "Could not find the 'allergens_present' column of 'meal' in the schema cache"
}

7. Les employées semblent être liée à l'entreprise, et pas à une crèche ce qui est incohérent (par contre il faudrait permettre d'associer un employé à plusieurs crèche en cas de besoin ou de mobilier de l'employée)

8. Dans les messages (Vue Owner) on nous demande un Developpeur ID pour pouvoir contacter un Developer, on devrait simplement pouvoir discuter avec les développeurs et que chaque développeur partage la meme conversion de chat pour répondre à l'Owner

9. Quand je selectionne une pièce pour pouvoir y assigner des taches, ca m'affiche ceci : Toutes les tâches disponibles sont déjà assignées à cette pièce. Alors qu'aucune tâche n'est assignée, elle ne s'affiche pas. Je pense que ca récupère les tâches de notre ancien modèle avant qu'on l'on refonte pas mal de chose.

10. Quand je veux créer la session du jour dans les requetes Réseau du navigateur :
SEND :
{
    "id": "18b4ff83-9d61-4279-a202-6fe191f8488f",
    "date": "2026-01-21",
    "status": "EN_COURS",
    "notes": null,
    "created_at": "2026-01-21T14:41:21.712662+00:00",
    "updated_at": "2026-01-21T14:41:21.712662+00:00",
    "nursery_id": "96249c2c-a942-446e-b664-5ff946fcf8c0"
}
RÉPONSE : {
    "code": "PGRST116",
    "details": "The result contains 5 rows",
    "hint": null,
    "message": "Cannot coerce the result to a single JSON object"
}
Visiblement on à une erreur 406
Failed to load resource: the server responded with a status of 406 ()

11. Lorsque je souhaite créer un supplier (dans le module HACCP) avec le formulaire, j'ai une erreur 400:
{
    "code": "PGRST204",
    "details": null,
    "hint": null,
    "message": "Could not find the 'is_active' column of 'supplier' in the schema cache"
}

12. sur la page /owner/haccp/temperatures, j'ai cet erreur : 
{
    "code": "42703",
    "details": null,
    "hint": null,
    "message": "column temperature_check.measured_at does not exist"
}

13. sur la page /owner/haccp/equipment, j'ai cet erreur : 
{
    "code": "PGRST204",
    "details": null,
    "hint": null,
    "message": "Could not find the 'equipment_type' column of 'equipment' in the schema cache"
}

