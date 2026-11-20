# Front v2 : reprise de la v1 et cadre de l'application

> Conception du 2026-11-20, validée par Florent dans la conversation (« Tes idées sont bonnes… construire le front
> là-dessus »). Recherche : [docs/recherches/cadre-navigation-2026-11-20.md](../../recherches/cadre-navigation-2026-11-20.md)
> (règles R1 à R20). Maquettes de référence (privées, données fictives) :
> <https://claude.ai/artifact/QmL4oNBwdtak6zABc8T64G>, planches **E** (cadre), **F** (accueil de la direction),
> **G** (présences avec détail), **H** (journée d'une employée). Ticket : à créer avant le code.

## Intention

Florent veut retrouver **tout le front de la v1** dans le front v2 (`front/`, React + Vite, TanStack Router), mais
pas une copie : après quatre pistes et une recherche sur les applications de gestion (Atlassian, Shopify, Carbon,
Stripe, Vercel, Famly, Brightwheel…), la direction retenue est **« le travail d'abord »** :

- chaque écran répond d'abord à « qu'est-ce que je dois faire ? » ;
- le détail d'un élément s'ouvre à côté de la liste, sans perdre sa place ;
- chaque rôle a son espace (direction, employée, parent), pas un menu unique filtré.

## Découpage (approche C, choisie par Florent)

1. **Le cadre** (ce document, détaillé ci-dessous) : espaces par rôle, menu, choix de la crèche, barre du haut,
   en-tête de page, pages « bientôt », thème.
2. **Les écrans qui portent la piste** : accueil de la direction avec « À traiter » (demande une route d'API
   nouvelle), présences en liste avec le panneau de détail, « Ma journée » de l'employée. Un ticket chacun.
3. **Les écrans du MVP dont l'API existe** : ménage (LUN-101, LUN-103, LUN-105), familles et enfants (LUN-94 à
   LUN-96), portail famille (LUN-97, LUN-98), personnel (LUN-85), crèches (LUN-83), passkeys (LUN-80, LUN-81).
4. **Les modules de la v1 sans API v2** (HACCP, inscriptions et contrats, facturation, planning, messagerie,
   statistiques, espace éditeur), chacun de bout en bout. Ordre à décider avec Florent.

Chaque écran passe d'abord par la skill `recherche-reference` (fiche dans `docs/recherches/`).

## Approches considérées

| | Approche | Décision |
|---|---|---|
| A | Recréer toutes les pages v1 sur des données simulées | Écartée : contrats devinés, rien d'utilisable, contraire à « ne jamais inventer un résultat » |
| B | Module par module, de bout en bout | Écartée seule : longtemps un squelette |
| C | Cadre complet d'abord, puis B | **Retenue** |

Pour l'allure, cinq pistes ont été dessinées (A : v1 fidèle ; B : allure v1, menu par usage ; C : piste vive ;
D : synthèse ; E : après recherche), puis la piste « le travail d'abord » (F, G, H). Florent a retenu E + F, G, H.

## Objectifs du cadre

- **Direction** (`owner`) — planche E :
  - barre latérale claire (fond `#fffdf8`), toujours visible à partir de 1200 px, masquable (choix retenu),
    ouverte par-dessus la page en dessous (R1) ;
  - logo, puis **choix de la crèche** en haut du menu : initiales, nom, double flèche ; la liste contient
    « Tout le groupe » en tête quand il y a plusieurs crèches (R10, R17) ;
  - **menu par usage**, deux niveaux au plus (R2) : *Aujourd'hui* (Accueil, Présences, Ménage, Transmissions),
    *Enfants* (Familles, Inscriptions, Portail parents), *Équipe* (Personnel, Planning, Tablettes), *Lieux et
    hygiène* (Pièces, HACCP, Fiches de ménage), *Gestion* (Contrats, Facturation, Statistiques) ; libellés en noms,
    identiques aux titres de page (R16) ;
  - groupes repliables au clic, chevron, état retenu ; *Lieux et hygiène* et *Gestion* repliés par défaut tant
    qu'ils n'ont pas d'écran (R7) ;
  - chaque groupe a sa couleur (carré de 10 px, icônes) ; **entrée active : fond plein de la couleur de sa famille,
    texte blanc, gras** (R4), jamais de barre sur le côté (goût de Florent) ;
  - « bientôt » en texte discret sur les entrées sans écran v2 (choix de Florent, malgré Shopify) ;
  - pied du menu : Réglages (trois catégories : mon compte, la crèche, l'entreprise, R18), version.
- **Employée** (`employee`) — planche H : **pas de barre latérale** (3 rubriques, Carbon : barre latérale à partir
  de 5) ; en-tête avec logo, crèche, menu « Ma journée », « Présences », « Mon compte », aide, nom et rôle.
- **Parent** (`guardian`) : en-tête simple, contenu centré, **barre d'onglets en bas** sur téléphone (R19).
  Rubriques selon ce que LUN-97 et LUN-98 livreront.
- **Éditeur** (`developer`) : cadre de la direction sans choix de crèche, entrées de l'espace éditeur
  « bientôt » (pas d'API).
- **Barre du haut** (direction, éditeur) : bouton du menu, **recherche** (⌘K), aide, compte (R15).
- **En-tête de page** (composant commun) : fil d'Ariane, date du jour en surtitre, grand titre (34 px, 800),
  actions de l'écran à droite, onglets de navigation dessous (une route par onglet, trait de 3 px + gras, R8).
- **Pages « bientôt »** : chaque entrée sans écran v2 mène à une page qui nomme le module et dit ce qu'il
  contiendra, sans données fictives.
- **Thème** : palette de la planche E (ivoire, ardoise, bleu `#2459d6`, corail `#c2452b`, violet `#6d45c4`,
  turquoise `#0b7a70`, ambre `#8f6400`, statuts vert/ambre/gris indépendants) en jetons CSS ; contrastes mesurés
  dans la fiche (R5, R6).

## Non-objectifs du cadre

- L'accueil « À traiter », le panneau de détail des présences et « Ma journée » (tickets suivants).
- Les raccourcis personnels, le masquage d'entrées (R20, plus tard).
- La recherche d'enfants ou de familles : la première version cherche **les écrans** (liste locale) ; la
  recherche de données viendra avec une route d'API.
- Le mode tablette (`/tablette`) et la connexion gardent leur mise en page.

## Anti-objectifs

- Un motif « AI slop » : barre de couleur sur le côté, cartes à bordure colorée, dégradés décoratifs, emoji, salut
  dans l'en-tête, tableau de bord « vitrine » (R12, R13).
- Une entrée de menu morte (404) ou des données inventées présentées comme réelles.
- Un relâchement de la CSP (`style-src 'self'`).
- Une entrée visible par un rôle qui n'y a pas droit dans l'API.
- Un état signalé par la seule couleur, ou un indicateur sous 3:1.

## Contraintes

- Stack du front v2 (ADR-002), routes par fichier, React Compiler, TypeScript strict.
- CSP stricte : pas de `<style>` injecté (piège du Dialog de Radix, LUN-121) ; styles posés par la propriété
  `style` de React acceptés ; couleurs par classes ou variables CSS.
- Rôles de l'API : `developer`, `owner`, `employee`, `guardian` (`GET /api/v2/auth/me`).
- WCAG 2.2 AA : cibles de 24 px au moins, 44 px pour les actions principales ; texte 4,5:1 ; composants et états
  3:1 ; lien « Aller au contenu » ; `aria-current="page"`.
- Méthode du front : stories avec axe, tests de composants, parcours Playwright contre une pile neuve, mutations.
- pnpm 11, délai de 24 h, nouvelles dépendances relues.

## Décisions de l'assistant (validées avec la direction)

1. **Adresses** : les écrans v2 existants gardent leurs adresses (`/accueil`, `/creches/$nurseryId/presences`,
   `…/presences/historique`, `…/tablettes`, `/mon-pin`). Les pages propres à une crèche, « bientôt » comprises,
   vivent sous `/creches/$nurseryId/…`. L'adresse fait foi ; hors adresse, la dernière crèche choisie est retenue
   dans le navigateur, sinon la première de la liste.
2. **« Tout le groupe »** ne vaut d'abord que pour l'accueil ; ailleurs, choisir le groupe ramène à l'accueil.
3. **Une employée qui a accès à plusieurs crèches** voit le choix de la crèche dans son en-tête.
4. **Nom de l'entreprise** : absent de l'API (`SessionOut` n'a que `enterprise_id`) ; la ligne reste vide.
   Ajouter le nom à `/auth/me` fera l'objet d'un petit ticket d'API.
5. **Non reproduits** pour l'instant, faute d'API : verrouillage des modules payants, cloche de notifications,
   fenêtres d'annonce de l'éditeur.
6. **Animations** : transitions CSS (`tw-animate-css`), pas de framer-motion.

## Laissé au constructeur

- Le composant de menu (shadcn `sidebar` ou maison), à vérifier contre la CSP ; le panneau mobile sans
  `<style>` injecté.
- Le jeu d'icônes : lucide-react (déjà installé) suffit ; pas de Heroicons.
- La forme de la table de navigation : **une seule source** pour le menu, les droits par rôle, la recherche
  d'écrans et les tests.
- L'organisation des routes « bientôt » (une route générique ou une par entrée).
- La persistance des groupes repliés et du menu masqué (localStorage dans un `try`).
- Le logo : `public/luniqo.png` pèse 2,2 Mo, en servir une version réduite.

## Vérifications attendues

- Stories du cadre par rôle (direction à une et plusieurs crèches, employée, parent, éditeur ; menu masqué ;
  téléphone), axe sans violation.
- Tests : entrées selon le rôle, entrée active selon l'adresse, changement de crèche qui garde la page, aucune
  entrée sans destination, recherche d'écrans.
- Contrastes des jetons vérifiés par un test (paires de la fiche).
- Parcours Playwright contre une pile neuve : direction et employée naviguent, console sans erreur de CSP.
- Capture comparée aux planches E et H.
