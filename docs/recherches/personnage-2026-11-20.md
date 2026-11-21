# Personnage de Luniqo (20 novembre 2026)

Pourquoi : Florent aime le personnage animé des crèches Kokoon et veut un personnage pour Luniqo. Décisions de
Florent (2026-11-20) : il **remplace le bébé du logo** actuel (`public/luniqo.png`) et il apparaît **dans les espaces
vides, sans gêner l'interface**.

Statut : `[RÉEL]` pour les sources lues et les captures ; règles proposées, **non validées**.

## Ce qu'on a regardé

- **Crèches Kokoon** (site <https://www.creches-kokoon.fr>, capturé le 2026-11-20, en local dans
  `docs/recherches/captures/mascotte/`) : une famille de créatures géométriques (chenille jaune, caméléon vert,
  oiseau rouge, échassier orange) posées sur les bords des bandeaux de couleur, un gros œil blanc à pupille noire ;
  les mêmes créatures en autocollants sur les casiers des crèches (photo d'accueil). Trois animations CSS sur la page
  (`document.getAnimations()`), pas de Lottie ni de canvas.
- **Lus en entier** :
  - Duolingo, Greg Hartman, « Building character », 2020-11-10 : <https://blog.duolingo.com/building-character/>
  - Duolingo, Greg Hartman, « Reshaping Duo » : <https://blog.duolingo.com/reshaping-duo/>
  - NN/g, Kate Kaplan, « Designing Empty States in Complex Applications: 3 Guidelines », 2021-09-19 :
    <https://www.nngroup.com/articles/empty-state-interface-design/>
  - W3C, Understanding WCAG 2.2 : 2.3.3 Animation from Interactions et 2.2.2 Pause, Stop, Hide :
    <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>,
    <https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html>
- **Résumés de recherche seulement** (non lus en entier) : guides de conception de Duolingo (pages redirigées),
  marque Mailchimp (Freddie « ne parle pas »), guides d'états vides de SAP Fiori, eBay et Salesforce Lightning.

## Faits

- **Construire avec peu de formes.** Duo est « very geometric and basically just a body with wings », avec de
  « really big endearing eyes », une silhouette propre et des pattes détachées ; les autres personnages reprennent
  les mêmes formes de base (Building character). « If the overall shape is not appealing, then the details within
  that shape can't compliment it » : la silhouette d'abord (Reshaping Duo). Kokoon procède de même (rectangles
  arrondis, cercles, rayures pour les pattes).
- **Le personnage réagit à ce que fait la personne.** Chez Duolingo, une animation propre à chaque personnage joue
  à chaque bonne réponse, et des interludes récompensent une série de réussites (Building character).
- **Une famille plutôt qu'un seul.** Duolingo a toute une distribution de personnages ; Kokoon aussi, une créature par
  couleur.
- **Le personnage ne parle pas à la place du produit.** Les textes de Duolingo ne sont pas dits par Duo sauf s'ils
  viennent de son point de vue ; Freddie, chez Mailchimp, sourit et fait des clins d'œil mais ne parle pas (résumés).
- **Un état vide doit servir.** « Do not default to totally empty states » ; dire ce qui pourrait apparaître et
  comment le remplir ; donner un lien direct vers la tâche (NN/g). L'article ne parle pas d'illustration. Les guides
  d'entreprise la rendent facultative et la réservent aux grands espaces, jamais aux petits éléments (SAP : pas dans
  les tuiles ni les messages courts ; résumés).
- **Animation et accessibilité.** Une animation qui démarre seule, dure plus de 5 secondes et s'affiche à côté d'un
  contenu doit pouvoir être mise en pause, arrêtée ou masquée (2.2.2, niveau A) ; une animation déclenchée par une
  action doit pouvoir être désactivée, par exemple avec `prefers-reduced-motion` (2.3.3, AAA ; techniques C39, SCR40).

## Règles proposées pour Luniqo (à valider par Florent)

1. **Un personnage construit en 3 ou 4 formes simples**, lisible à 24 px (logo, onglet du navigateur) comme à
   200 px (états vides) ; la silhouette se reconnaît en aplat d'une seule couleur.
2. **Il remplace le bébé du logo** : même personnage en version réduite à côté de « Luniqo ».
3. **Il ne vit que dans les grands espaces vides** : pages « bientôt », listes vides, premier pas d'une crèche,
   page introuvable, fond du menu quand il reste de la place, écran de la tablette au repos. **Jamais** dans un
   tableau, un formulaire, un bouton, une notification ou à côté d'une donnée.
4. **Il accompagne un état vide utile**, jamais à la place : le texte dit ce qui apparaîtra et le bouton mène à la
   tâche (NN/g) ; le personnage n'apporte que la chaleur.
5. **Il ne parle pas** : pas de bulle ni de texte « dit » par lui ; les messages restent ceux de Luniqo.
6. **Il bouge peu** : une animation à l'apparition, de moins de 5 secondes, puis il s'arrête ; aucune boucle
   continue à côté du contenu (2.2.2) ; rien sous `prefers-reduced-motion: reduce` (2.3.3). Une réaction courte peut
   saluer une réussite (pointage enregistré sur la tablette), comme chez Duolingo, dans les mêmes limites.
7. **Une famille possible aux couleurs des cinq familles du menu** (bleu, corail, violet, turquoise, ambre), comme
   Kokoon : chaque module « bientôt » ou état vide reçoit la créature de sa famille.
8. **Fait en SVG dans le code**, animé en CSS (pas de Lottie ni de bibliothèque), compatible avec la CSP.
9. **Original** : on reprend le principe de Kokoon et de Duolingo (formes simples, gros œil, famille), jamais leurs
   créatures ni leur style exact.

## Ouvert

- Les guides de conception de Duolingo (pages redirigées) n'ont pas été lus.
- Aucune source mesurée sur l'effet d'un personnage dans une application professionnelle (au-delà de l'apprentissage
  et du grand public).
- Le personnage dans les vraies crèches (autocollants, comme Kokoon) : idée à discuter, hors du logiciel.
