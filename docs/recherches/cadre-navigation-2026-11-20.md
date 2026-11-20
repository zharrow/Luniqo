# Cadre et navigation du front v2 (20 novembre 2026)

Pourquoi : reprise de tout le front v1 dans le front v2. Quatre pistes de cadre (A à D) ont été dessinées sans
recherche le 2026-11-20 ; Florent a retenu le menu de B, l'étiquette « bientôt », les groupes repliables, les couleurs
vives et le résumé chiffré de C, et fait retirer de D la barre de couleur à gauche de l'entrée active (« trop AI
slop »). Premier tour de la skill `recherche-reference`, avant de fixer la conception du cadre.

Statut : `[RÉEL]` pour les sources lues, les captures et les mesures ; règles proposées, **non validées** par Florent.

## Ce qu'on a regardé

**Produits** (captures en local, hors dépôt, dans `docs/recherches/captures/cadre-navigation/`) :
- Famly (logiciel de crèche, Royaume-Uni et Europe) : deux écrans de l'application tirés de son aide en ligne
  (accueil « Overview » avec la barre latérale).
- Brightwheel (logiciel de crèche, États-Unis) : pages d'accueil et de pointage, avec un écran « Admissions » en
  vignette.
- Kidizz (logiciel de crèche français) : page d'accueil, écrans en vignette seulement, trop petits pour être étudiés.
- Linear (outil de gestion de projet, cité pour son travail sur la barre latérale) : page d'accueil.
- Meeko (logiciel de crèche français) : capture vide (page non rendue par le navigateur sans interface), non étudiée.
- **Brightwheel, vrais écrans de l'application** tirés de son aide en ligne : accueil de la direction (« Today is June
  5 ») et liste des élèves avec le choix de l'établissement ouvert (articles « Gain a holistic view of program
  activities on the web » et « Manage all locations from a single dashboard »).
- **Dribbble** (recherches « daycare dashboard », « school management dashboard », « saas sidebar navigation ») et
  deux maquettes d'administration de crèche en grand. Ce sont des **concepts**, pas des produits : ils servent ici
  de contre-exemples. Behance n'a rien affiché au navigateur sans interface ; la page « sidebar » de SaaSFrame était
  en 404.

Remarque de Florent (2026-11-20) : les pages d'accueil commerciales montrent peu l'application ; il faut des écrans
d'**application de gestion**. Les aides en ligne des éditeurs (Famly, Brightwheel) en donnent de vrais, gratuitement ;
Mobbin est payant, Refero, NicelyDone et SaaSFrame n'ouvrent qu'une petite partie de leur bibliothèque sans
abonnement (d'après le comparatif publié par Mobbin, source intéressée, non vérifié).

**Sources lues en entier** :
- NN/g, Page Laubheimer, « Left-Side Vertical Navigation on Desktop », 2021-05-16 :
  <https://www.nngroup.com/articles/vertical-nav/>
- NN/g, Page Laubheimer, « Menu-Design Checklist: 17 UX Guidelines », 2024-06-07 :
  <https://www.nngroup.com/articles/menu-design/>
- NN/g, Evan Sunwall, « Tabs, Used Right », 2024-08-02 : <https://www.nngroup.com/articles/tabs-used-right/>
- GitLab Pajamas, « Navigation sidebar », mise à jour du 2026-07-15 :
  <https://design.gitlab.com/usability/navigation-sidebar>
- Linear, Karri Saarinen et al., « How we redesigned the Linear UI (part II) », 2024-03-28 :
  <https://linear.app/now/how-we-redesigned-the-linear-ui>
- W3C, Understanding WCAG 2.2 : 2.5.8 Target Size (Minimum), 2.5.5 Target Size (Enhanced), 1.4.11 Non-text
  Contrast (pour ce dernier, les deux tiers du texte lus mot à mot, la fin résumée) :
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>,
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html>,
  <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
- Famly, « Map of the App » (aide en ligne), 2026-02-17 :
  <https://help.famly.co/en/articles/6047212-map-of-the-app>
- Famly, « Ditch the sign-in sheets », 2025-07-03 (article commercial) :
  <https://www.famly.co/us/blog/childcare-sign-in-and-out>

**Au-delà de la petite enfance** (deuxième tour, à la demande de Florent : « trop spécifique, il faut viser plus
large »), lus en entier :
- Atlassian, « Designing Atlassian's new navigation », 2024-12-17 :
  <https://www.atlassian.com/blog/design/designing-atlassians-new-navigation>
- Atlassian, Kristin Perchal et Bryan Ye, « How we built a navigation that works for everyone », 2025-01-31 :
  <https://www.atlassian.com/blog/design/how-we-built-a-navigation-that-works-for-everyone>
- Atlassian Support, « Navigation reference guide » (avec une capture des vrais écrans de cinq produits) :
  <https://support.atlassian.com/navigation/docs/navigation-reference-guide/>
- IBM Carbon, « UI shell left panel » et « UI shell header », usage, mis à jour le 2026-10-02 :
  <https://carbondesignsystem.com/components/UI-shell-left-panel/usage/>,
  <https://carbondesignsystem.com/components/UI-shell-header/usage/>
- Shopify, « App structure » et composant « App nav » :
  <https://shopify.dev/docs/apps/design-guidelines/app-structure>,
  <https://shopify.dev/docs/api/app-home/app-bridge-web-components/app-nav>
- Stripe, « Dashboard basics » (version française) : <https://docs.stripe.com/dashboard/basics>
- Vercel, « New dashboard navigation available », 2026-01-22 :
  <https://vercel.com/changelog/new-dashboard-navigation-available> (le billet de 2019 sur la refonte du tableau de
  bord a été lu aussi, sans rien sur la navigation).

**Captures étudiées sans lecture complète du texte** (aide en ligne de Brightwheel) :
<https://help.mybrightwheel.com/en/articles/6369102-gain-a-holistic-view-of-program-activities-on-the-web>,
<https://help.mybrightwheel.com/en/articles/12143422-manage-all-locations-from-a-single-dashboard>.

**Non lus** :
- Les documents de la CAF sur le pointage (FAQ du règlement PSU 2026, paramètres des logiciels de gestion EAJE,
  instruction technique 2022-126) : caf.fr renvoyait une page de maintenance le 2026-11-20. Seul un résumé de moteur de
  recherche en a été vu ; il ne compte pas comme source.
- Famly, « New year, new Famly layout » : page introuvable (404).
- Les écrans réels de Meeko et de Kidizz : non vus (pages commerciales seulement).

## Faits

### La navigation

- **Une barre latérale à gauche convient aux applications à beaucoup de sections**, et à celles qui grandissent ; il
  n'y a pas de limite stricte à 7 ou 9 entrées (NN/g, vertical nav). Les utilisateurs regardent la moitié gauche de
  l'écran environ 80 % du temps (même article).
- **Les libellés restent visibles** : la navigation en icônes seules n'est « pas recommandée » pour un usage
  occasionnel ; elle n'est admise que pour une application d'usage quotidien, si les libellés sont affichés par défaut
  (NN/g, vertical nav). Pas de menu caché sous un bouton sur grand écran (NN/g, checklist n° 1).
- **Les entrées les moins utilisées vont en bas** (NN/g, vertical nav, guideline 4).
- **Indiquer où l'on est** est l'erreur la plus fréquente des menus quand elle manque (NN/g, checklist n° 5).
- **Libellés courts et explicites**, mot-clé en tête, aligné à gauche, sans mot inventé (NN/g, checklist n° 7 et 8) ;
  « idéalement 1 ou 2 mots » (GitLab).
- **Deux niveaux au plus** : « There is not a third level of depth » (GitLab). Une entrée de premier niveau garde son
  nom et sa place d'un contexte à l'autre, même si elle n'a qu'une sous-entrée, pour réduire l'effort de
  compréhension (GitLab). Les entrées peuvent varier selon les droits et le rôle (GitLab).
- **Visible par défaut à partir de 1200 px**, masquée en dessous et ouverte alors par-dessus la page avec un voile
  (GitLab). La préférence « masquée » est gardée par l'utilisateur (GitLab : un cookie).
- **Sous-menus ouverts au clic, jamais au survol** (NN/g, checklist n° 13) ; un chevron signale qu'une entrée s'ouvre
  (n° 12).
- **Famly** range son application en 7 sections, dans une colonne d'icônes à gauche (Home, Children, Attendance,
  Learning, Finances, Reports, Settings), et affiche à côté les sous-pages de la section en texte (aide Famly ;
  capture). Le changement d'établissement est dans Settings (aide Famly).

### Les onglets de page

- Deux sortes d'onglets : dans la page (contenus liés, on reste sur place) et de navigation (on change de page) ; ne
  jamais les mélanger dans le même groupe (NN/g, tabs).
- **Peu d'onglets**, libellés de 1 ou 2 mots, une seule rangée, posés au-dessus de leur contenu, le plus utilisé en
  premier et sélectionné par défaut ; pas de majuscules ; **l'onglet sélectionné porte au moins deux indices**
  (fond, trait, gras, taille, icône), pas un trait d'un pixel (NN/g, tabs).

### L'accessibilité (WCAG 2.2, niveau AA visé)

- **Cibles d'au moins 24 × 24 px** (2.5.8, AA), ou espacées pour que des cercles de 24 px ne se touchent pas ;
  **44 × 44 px** au niveau AAA (2.5.5), sans exception d'espacement.
- **3:1 pour les composants et leurs états** (1.4.11) : l'information qui montre qu'un élément est sélectionné doit
  contraster à 3:1 avec les couleurs voisines. Un état indiqué par la seule teinte relève du critère 1.4.1 (la couleur
  ne doit pas être le seul moyen).

### Les écrans de crèche

- **L'accueil de Famly** (capture « Overview ») : un salut avec le prénom et un emoji, une vue de l'établissement par
  section (« Rooms ») avec le nombre d'enfants présents de chacune, une ligne « 13 children, 3 staff », et une colonne
  « Needs your attention » (éléments à traiter avec leur nombre et une flèche), puis les événements à venir.
- **Famly sur le pointage** : « In one clear overview, ECE staff can see which children are present and who's
  expected » ; pointage par code PIN, QR code ou application (article commercial).
- **Brightwheel** (vignette « Admissions ») : une rangée de chiffres en tête d'écran, chacun sur un fond de couleur
  différente (élèves, prospects, visites, candidatures, liste d'attente).
- **Brightwheel, accueil de la direction** (capture de l'aide) : la date du jour en titre (« Today is June 5 »), un
  tableau « Current Room Ratios » (élèves présents et personnel présent par section) **avec l'heure de mise à jour**
  (« as of 1:59 pm »), puis « Today's logged activities » par section, et les anniversaires à venir. Aucun graphique.
- **Brightwheel, choix de l'établissement** : en **haut de la barre latérale**, le nom du programme courant avec ses
  initiales et une double flèche ; il ouvre la liste des établissements, l'établissement courant coché, et en tête
  « Organization, Manage all locations » pour la vue de tout le groupe (capture et article de l'aide). Le titre de
  l'en-tête est la date du jour ; recherche au centre (raccourci cmd + K), notifications à droite. La barre
  latérale montre des sections avec icône et libellé, les sous-pages en retrait sous leur section, Help et le compte
  en bas. Dans la liste des élèves, chaque ligne porte ses actions (« Mark absent », « Check in »).
- **Les concepts de Dribbble** (deux maquettes « daycare admin » vues en grand, une quinzaine de vignettes) suivent
  presque tous le même modèle : cartes de totaux (« Total Children 2,3554 », « Total Subscriptions »), courbes de
  croissance, anneaux de répartition, calendrier, photo d'illustration, faux texte. Les deux vrais produits regardés
  montrent au contraire **la journée par section** et **ce qui reste à faire**, sans graphique sur l'accueil.

### Les grandes applications de gestion

- **Atlassian** a déplacé la navigation de ses produits de la barre du haut vers une barre latérale, pour la
  « vue d'ensemble » qu'elle permet et parce que les gens la connaissent déjà (Google Workspace, Slack, Teams). Défauts
  de l'ancienne : chaque produit avait la sienne (« 23 major inconsistencies »), la hiérarchie passait par des
  libellés qui encombraient, les actions liées étaient dispersées. **La barre du haut est réservée aux actions
  universelles, recherche et création.** Les entrées dépliables montrent la hiérarchie par un retrait de **12 px**
  (26 px coupait les libellés sur petit écran) ; les actions d'une entrée apparaissent au même endroit dans tous les
  produits ; chacun peut **masquer des entrées et personnaliser** sa barre. Testée par étapes (16 utilisateurs, puis
  160, puis 100 clients, puis plus de 30 000 personnes dans 250 organisations) : **2,7 %** sont revenus à l'ancienne.
- **Sur la capture des vrais écrans d'Atlassian** : barre latérale blanche et neutre ; en tête « Your work »,
  « Recent », « Starred », « Apps » ; entrée courante sur un fond bleu très clair avec texte bleu ; compteurs alignés à
  droite (« 89 », « 41 ») ; « More » et « View all projects » en fin de liste ; en-tête de page avec le fil
  (« Projects »), le titre et ses **onglets** (Timeline, Backlog, Board, Calendar…, « More (6) ») ; barre du haut :
  grande recherche et bouton « Create ».
- **Carbon (IBM)** : barre latérale dès **plus de 5 entrées**, ou si l'on passe souvent de l'une à l'autre ; sous-menus
  marqués d'un chevron, ouverts au clic en poussant les autres entrées ; **pas de troisième niveau : « use tabs within
  the page »** ; page courante en gras avec `aria-current="page"` (onglet accessibilité, d'après un résumé de
  recherche) ; en-tête de gauche à droite, du produit au global ; utilitaires réservés au système (recherche, aide,
  notifications, compte) ; lien « aller au contenu » (WCAG 2.4.1).
- **Shopify** : un seul niveau dans la navigation d'une application ; « Keep labels short (1-2 words) and use nouns »,
  sans verbe (« Gérer », « Voir ») ; libellé identique au titre de la page ; les sections les plus utilisées en premier ;
  **pas de badge du type « New » dans la navigation** (résumé de recherche de la documentation App Bridge) ; le titre de
  la page et ses actions principales et secondaires sont dans l'**en-tête de la page**.
- **Stripe** : une section **Raccourcis** avec les pages épinglées et récemment visitées ; un accueil avec les
  chiffres de l'activité et les **notifications importantes** (litiges, vérifications) ; des **réglages en trois
  catégories : personnel, compte, produit** ; `?` affiche les raccourcis clavier.
- **Vercel** (2026) : onglets horizontaux remplacés par une barre latérale redimensionnable et masquable ; **les mêmes
  liens au niveau de l'équipe et du projet**, et le passage de l'un à l'autre « in one click » sur la même page ; sur
  téléphone, **une barre flottante en bas, pour une seule main**.

### Le style

- **Linear** a réduit la couleur de son cadre (« limiting how much chrome (blue in our case) was used ») pour revenir
  à une apparence « plus neutre et intemporelle », et augmenté le contraste du texte et des icônes neutres ; thèmes
  calculés en LCH, réduits à trois variables (base, accent, contraste).

### Mesures sur nos maquettes (2026-11-20, calcul WCAG des couleurs de la maquette D)

| Paire | Contraste | Seuil |
|---|---|---|
| Texte de l'entrée active sur son fond teinté (5 familles) | 6,7 à 8,7:1 | 4,5 ✓ |
| **Fond teinté de l'entrée active contre le fond du menu** | **1,12:1** | **3 ✗** (seul indice d'état restant avec le gras) |
| Entrées et libellés de groupe | 10,1:1 | 4,5 ✓ |
| Étiquette « bientôt » | 5,2:1 | 4,5 ✓ |
| Carré de couleur du groupe Gestion (`#c98f00`) | 2,8:1 | 3 ✗ |
| Carrés Aujourd'hui, Enfants, Lieux | 5,9 ; 3,9 ; 4,1:1 | 3 ✓ |
| Barre de résumé : segments « partis » et « à accueillir » | 2,6 et 2,3:1 | 3 ✗ (les chiffres sont aussi écrits au-dessus) |
| Bouton bleu, onglet actif, statuts | 6,0 à 9,0:1 | ✓ |
| v1 : texte blanc sur l'entrée active pêche | 1,4:1 | 4,5 ✗ |

Menu de la v1 compté dans `components/layout/AppSidebar.tsx` : 32 entrées en 10 groupes pour la direction, plus 3 dans
le pied du menu.

## Règles proposées pour Luniqo (à valider par Florent)

1. **Barre latérale à gauche, libellés toujours affichés**, visible par défaut à partir de 1200 px, ouverte par-dessus
   la page en dessous ; elle peut être masquée, et ce choix est retenu. Le mode « icônes seules » de la v1 n'est pas
   repris par défaut.
2. **Deux niveaux** : groupe → entrée. Les sous-vues d'un écran sont des **onglets de navigation** (une route par
   onglet), jamais un troisième niveau de menu.
3. **Les entrées gardent leur nom et leur place** selon le rôle : un employé voit moins d'entrées, dans le même ordre.
4. **L'entrée active porte deux indices, dont un à 3:1** : fond plein de la couleur foncée de sa famille, texte blanc
   (6:1 pour le bleu), gras. Ni barre de couleur sur le côté, ni simple fond teinté. (Atlassian utilise un fond bleu
   très clair et un texte bleu, proche de ce qui a été écarté : la recherche n'a pas trouvé de mesure de son
   contraste.)
5. **Couleurs de famille réservées au sens** : le cadre reste neutre (fond ivoire, texte ardoise), la couleur sert à
   reconnaître une famille et l'entrée active ; les statuts ont leurs propres couleurs, toujours accompagnées d'un mot
   (critère 1.4.1).
6. **Tout élément graphique qui porte un sens contraste à 3:1** : carré de Gestion assombri, segments de la barre de
   résumé assombris.
7. **Les familles les moins utilisées en bas et repliées par défaut** (Gestion, Lieux et hygiène tant que leurs écrans
   n'existent pas) ; groupes ouverts et fermés au clic, avec un chevron, l'état retenu.
8. **Onglets de page** : 2 à 4, libellés courts, sans majuscules, au-dessus du contenu, le plus utilisé à gauche et
   sélectionné par défaut, sélection marquée par un trait épais et le gras.
9. **Cibles d'au moins 24 px partout, 44 px pour les actions principales**, et 44 px pour tout le mode tablette (cible
   de l'auxiliaire qui a un enfant dans les bras).
10. **Le choix de la crèche reste visible en haut du menu**, comme chez Brightwheel (initiales, nom, double flèche,
    crèche courante cochée, vue du groupe en tête de liste pour la direction de plusieurs crèches). Famly le range
    dans les réglages ; nos personas de groupe passent d'une crèche à l'autre chaque jour (persona Nadia,
    `[SIMULÉ]`).
11. **Résumé chiffré en tête d'écran** (présents, à accueillir, partis, arrivées), repris de la piste C et conforté par
    Famly et Brightwheel, **avec l'heure de mise à jour** (« à jour à 13 h 59 ») puisque les chiffres s'actualisent.
    À l'accueil, la journée par crèche (présents, personnel), et à terme un bloc « à traiter » (départs non pointés,
    PIN bloqués) inspiré de « Needs your attention ».
12. **Pas de salut ni d'emoji** dans l'en-tête, contrairement à Famly (goût de Florent, skill `recherche-reference`) ;
    la date du jour sert de repère, comme chez Brightwheel.
13. **Pas de tableau de bord « vitrine »** : ni cartes de totaux sans action, ni graphique de croissance, ni photo
    d'illustration sur l'accueil (modèle des concepts de Dribbble). Chaque chiffre affiché mène à la liste qu'il
    compte. Les graphiques ont leur place dans les statistiques.
14. **Les actions vivent sur la ligne** qu'elles concernent (« Corriger » sur une présence), comme « Check in » et
    « Mark absent » chez Brightwheel ; elles apparaissent au même endroit sur tous les écrans (Atlassian).
15. **La barre du haut ne porte que l'universel** : la recherche (raccourci ⌘K, comme Brightwheel) et, plus tard,
    une création rapide ; à droite l'aide, puis le compte (Atlassian, Carbon). Le fil d'Ariane et les actions d'un
    écran vont dans l'**en-tête de la page** (Shopify, Atlassian).
16. **Libellés en noms, 1 ou 2 mots, identiques au titre de la page**, sans « Gérer » ni « Voir » (Shopify, GitLab) :
    « Présences », « Personnel », « Facturation ».
17. **Même page, autre portée** : pour la direction de plusieurs crèches, passer de la vue d'une crèche à celle du
    groupe sur la même page, en un clic (Vercel ; Brightwheel « Organization »).
18. **Réglages en trois catégories** : mon compte, la crèche, l'entreprise (Stripe : personnel, compte, produit).
19. **Sur téléphone, une barre d'onglets en bas** pour les parents et les écrans d'usage rapide (Vercel ; portail
    parent de la v1).
20. **À terme, des raccourcis personnels** (pages épinglées, récentes) et la possibilité de masquer des entrées
    (Atlassian, Stripe), quand le menu sera plein. Pas pour le premier cadre.

**Point à trancher par Florent** : l'étiquette « bientôt », qu'il a retenue de la piste C, est un badge dans la
navigation, ce que Shopify déconseille (pour « New »). Trois possibilités : la garder (c'est un état, pas une
promotion, et elle disparaît quand l'écran existe) ; ne montrer que les modules disponibles ; ou regrouper ce qui
arrive dans une seule entrée « À venir ».

## Ouvert

- **Les règles de la CAF sur le pointage** (précision à la minute, heures brutes conservées, présentation en contrôle)
  restent à lire à la source : caf.fr était en maintenance. Elles ne changent pas le cadre, mais elles fixeront
  l'écran des présences.
- **Aucune mesure d'usage réelle** : la fréquence des sections vient des personas, qui sont simulés.
- **Les écrans des logiciels français** (Meeko, Kidizz, iNoé) n'ont pas été vus ; une démo ou des captures d'aide en
  ligne compléteraient la comparaison.
- **Famly : le menu en deux colonnes** (icônes des sections, puis sous-pages en texte) est une autre réponse au grand
  nombre de modules. Elle n'est pas proposée ici, parce qu'elle masque les libellés de premier niveau ; elle reste à
  comparer si le menu de B devient trop long.
