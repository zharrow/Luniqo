# Personnage de Luniqo : les Petits Croissants (LUN-151)

> Conception du 2026-11-20. Décisions de Florent : le personnage **remplace le bébé du logo** et n'apparaît **que dans
> les espaces vides, sans gêner l'interface** ; piste « Les Petits Croissants » validée (planche « Personnage : trois
> pistes », piste 2, <https://claude.ai/artifact/QmL4oNBwdtak6zABc8T64G>). Recherche et règles :
> [docs/recherches/personnage-2026-11-20.md](../../recherches/personnage-2026-11-20.md).

## Ce qu'on construit

Cinq créatures géométriques, une par famille du menu (`FamilyId` de `features/shell/families.ts`), faites des mêmes
formes : un corps (rectangle arrondi ou cercle), un gros œil blanc à pupille ardoise `#1e2430`, des pattes en
bâtonnets à l'encre de la famille, et **un petit croissant de lune sur la tête** (découpé par un masque SVG, pour
rester juste sur n'importe quel fond). Formes et proportions : celles de la planche (piste 2) :

| Famille | Couleur (corps) | Encre (pattes) | Silhouette |
|---|---|---|---|
| today | `#2459d6` | `#1a3f99` | corps large et arrondi, deux pattes (celle du logo) |
| children | `#c2452b` | `#8e2f1c` | corps haut et arrondi, deux pattes courtes |
| team | `#6d45c4` | `#4a2c8f` | corps bas et long, trois pattes |
| places | `#0b7a70` | `#0b5e56` | petit corps, deux longues pattes |
| admin | `#8f6400` | `#6b4e00` | corps rond, deux pattes très courtes |

## Où il apparaît (et nulle part ailleurs)

1. **Logo** : la créature `today` remplace `luniqo-logo.png` dans le menu latéral, l'en-tête de l'employée, l'en-tête
   du parent et la page de connexion (au-dessus de « Luniqo ») ; **icône d'onglet** `front/public/favicon.svg`
   déclarée dans `front/index.html`. À 24 px et moins, une version simplifiée (corps, œil, croissant ; sans pattes).
2. **Pages « bientôt »** (`ComingSoon`) : la créature de la famille du module, environ 120 px, qui dépasse du bas à
   droite d'un panneau, à la place du carré de couleur.
3. **Page introuvable** (`__root.tsx`) : la créature `today`, environ 120 px, au-dessus du titre.

Jamais dans un tableau, un formulaire, un bouton, une notification, à côté d'une donnée ou d'une erreur. Elle ne
parle pas (pas de bulle).

## Comportement

- Décorative partout sauf dans le logo : `aria-hidden="true"` ; le logo garde un nom accessible par le texte
  « Luniqo » à côté (la créature elle-même reste `aria-hidden`), la page de connexion idem.
- **Animation** : un petit saut à l'apparition, 1,2 s, une seule fois, puis immobile (WCAG 2.2.2 : rien qui dure plus
  de 5 s) ; **aucune animation sous `prefers-reduced-motion: reduce`** (2.3.3). Classe CSS dans `index.css`, pas de
  style en ligne injecté (CSP). Le logo ne saute pas (il est toujours visible).
- SVG en composants React, sans bibliothèque ni image raster ; le PNG du bébé est supprimé s'il n'est plus utilisé.

## Interfaces

- `front/src/features/shell/creature.tsx` : `Creature({ family: FamilyId; size: number; hop?: boolean; className?:
  string })` (décoratif, `aria-hidden`), `LogoMark({ size: number })` (créature `today`, version simplifiée sous
  32 px).
- Stories `Cadre/Personnage` : les cinq familles à 24, 48 et 160 px ; `LogoMark` à 24 et 40 px.

## Vérifications

- Stories avec axe ; test : chaque `Creature` est `aria-hidden` et a la classe d'animation seulement si `hop` ;
  test unitaire : `index.css` contient la règle `prefers-reduced-motion: reduce` qui annule l'animation, et
  l'animation a `animation-iteration-count` 1 ; `index.html` déclare `favicon.svg`.
- Tests existants mis à jour (le logo n'est plus un `<img>`).
- Capture des pages « bientôt », connexion et accueil comparée à la planche.
