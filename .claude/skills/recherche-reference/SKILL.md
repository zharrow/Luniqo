---
name: recherche-reference
description: Recherche OBLIGATOIRE avant de concevoir ou de refondre un écran, une navigation, un composant ou un parcours de Luniqo (front v2) — chercher comment on travaille vraiment en crèche, comment les logiciels de crèche et les SaaS reconnus pour leur ergonomie ont résolu le même problème, et ce que la technique permet, en lire au moins une source primaire, en tirer des règles mesurables, consigner une fiche dans docs/recherches/, puis vérifier que l'écran les respecte. À charger AVANT de proposer une maquette, de dessiner un écran nouveau, de repenser un écran de la v1, ou quand quelqu'un dit qu'une interface « fait générique », « fait IA », « n'est pas pratique », ou demande de « chercher des références » ou de « s'inspirer ».
---

# Recherche avant de concevoir

Reprise du workflow des jeux de Florent (Eku, Lovecraft, Froggy : skill `recherche-reference` de
`croak-and-crumb`), adoptée pour Luniqo le 2026-11-20. Ce qui l'a motivée : sur le cadre du front v2, quatre pistes
dessinées sans recherche (A à D, 2026-11-20) ; Florent a retenu des morceaux de chacune et jugé un détail « trop AI
slop ». Les maquettes de Codex du 2026-10-30 avaient déjà été jugées trop génériques. **On ne devine pas une bonne
interface : on regarde comment les gens travaillent et comment les meilleurs ont résolu le problème, puis on traduit.**

## 1. Quand

Toute demande qui touche à ce qu'un utilisateur voit ou fait : un écran nouveau, la reprise d'un écran de la v1, la
navigation, un composant récurrent (tableau, fiche, formulaire, résumé), un parcours sur tablette ou téléphone. Pas
pour un bogue, une route d'API ou un écran déjà couvert par une fiche à jour (la relire suffit).

## 2. La recherche, en trois volets

1. **Le terrain** : comment le travail se fait vraiment, avec **des chiffres** quand ils existent. Qui utilise
   l'écran (personas : `docs/produit/PERSONAS.md`), où (debout, tablette fixée au mur, téléphone, ordinateur de
   bureau), avec quelles contraintes (mains occupées par un enfant, interruptions, temps disponible, aisance avec
   l'informatique), et quelles obligations (CAF, PMI, HACCP, RGPD). Sources préférées : textes officiels, CAF,
   ministères, guides professionnels de la petite enfance, études publiées. Un retour réel de la crèche se cite daté.
2. **Ceux qui l'ont bien fait** : **viser large** (Florent, 2026-11-20 : se limiter aux logiciels de crèche est
   « trop spécifique »). Les applications de gestion reconnues de tous les secteurs (Atlassian, Shopify, Stripe,
   Vercel, Linear, GitLab, IBM Carbon, SIRH, banque et comptabilité professionnelles…) ont résolu les mêmes problèmes
   de cadre ; les logiciels de crèche (français et étrangers) disent ce qui est propre au métier. **Chacun choisi
   pour un problème précis** (navigation à beaucoup de modules, tableau du jour, saisie
   rapide, statuts, multi-établissements). Chercher **ce qu'ils ont gardé** et **ce qu'ils ont sacrifié**. Sources :
   les produits eux-mêmes (pages, captures, démos), leurs documentations publiques, leurs articles de conception, et
   les guides de conception publiés (systèmes de conception publics, guides d'accessibilité).
3. **La technique** : la façon la plus simple de le faire dans le front v2 (shadcn/ui, Tailwind v4, TanStack Router,
   CSP stricte sans `<style>` injecté) et l'accessibilité mesurable (WCAG 2.2 : contrastes, taille des cibles,
   clavier, lecteur d'écran).

**Où trouver de vrais écrans d'application** (Florent, 2026-11-20 : les pages d'accueil commerciales montrent peu
l'application, et c'est l'application qu'on dessine) :
- **Les aides en ligne des éditeurs** d'abord : elles montrent les vrais écrans, gratuitement (Famly :
  help.famly.co ; Brightwheel : help.mybrightwheel.com ; Procare, Kidizz, Meeko, iNoé à explorer). Une capture d'aide
  vaut mieux qu'une vignette de page commerciale.
- **Les systèmes de conception publics** des grands produits (GitLab Pajamas, Shopify Polaris, Atlassian, GitHub
  Primer) : règles écrites et exemples d'écrans réels.
- **Dribbble et Behance** : surtout des **concepts**, jamais testés, souvent sur le même modèle (cartes de totaux,
  graphiques, faux texte). Utiles pour un détail visuel ou comme contre-exemple, pas comme preuve qu'une solution
  marche. Behance ne s'affiche pas dans le navigateur sans interface de gstack.
- **Mobbin** est payant ; Refero, NicelyDone et SaaSFrame n'ouvrent qu'une petite partie de leur bibliothèque sans
  abonnement. À demander à Florent avant d'en dépendre.

Règles :
- **Au moins quatre recherches**, lancées ensemble quand elles sont indépendantes.
- **Lire au moins une source primaire en entier** : un résumé de moteur de recherche ne suffit pas pour un fait ou un
  chiffre.
- **Ne jamais inventer un fait ni un chiffre.** Ce qui n'a pas été trouvé se dit ; une estimation (mesure à l'œil sur
  une capture) se marque comme telle ; une hypothèse aussi.
- **Des faits aux règles** : chaque fait retenu devient une règle de l'écran, avec sa valeur et son unité quand il en
  a une (nombre d'entrées, taille de cible en px, contraste, temps d'une action), et ce qu'on simplifie volontairement.
- **S'inspirer, pas recopier** : on reprend un **principe**, on le traduit dans l'identité de Luniqo. On ne reproduit
  ni l'écran, ni la marque, ni les textes d'un produit. Le dépôt est public : aucune capture d'un autre produit n'y
  entre.
- **Regarder les écrans avant de composer** : une planche de captures de référence se fait avant la maquette.

## 3. Consigner

- **Une fiche de recherche par sujet** : `docs/recherches/<sujet>-<AAAA-MM-JJ>.md`, sur le modèle de la fiche HUD de
  Froggy : pourquoi ; ce qu'on a regardé (produits, sources lues en entier, sources non lues et pourquoi) ; faits
  (chacun avec sa source) ; règles proposées pour Luniqo (à valider par Florent) ; ce qui reste ouvert.
- **Les captures restent en local** : `docs/recherches/captures/<sujet>/`, exclu de git (`.gitignore`). Elles servent à
  étudier, jamais à être jointes à un générateur d'images ni publiées.
- La fiche cite ses sources en liens. Le compte rendu à Florent liste les sources et dit ce qui est réel ou estimé.
- Une maquette qui découle d'une fiche la cite, et chaque choix visible renvoie à une règle de la fiche.

## 4. Proposer, puis choisir

Comme les visions de `direction-artistique` dans les jeux : **plusieurs pistes** du même écran, côte à côte, avec les
mêmes données fictives, chacune défendant une thèse tirée de la fiche. Florent choisit, ou prend des morceaux de
plusieurs ; on refait alors une piste de synthèse. Les goûts déjà connus (section 6) guident sans remplacer son choix.

## 5. Vérifier

Une fois l'écran construit : stories avec axe (aucune violation), mesures des règles chiffrées (contrastes, tailles
de cible, nombre d'entrées, temps d'un parcours dans Playwright), capture comparée à la maquette retenue. Le dernier mot
est l'œil de Florent, et quand c'est possible celui d'une vraie crèche (consigné comme tel).

## 6. Goûts déjà connus de Florent (interface)

- **Couleurs vives et contrastées, ambiance humaine**, plutôt que pastel délavé (2026-10-30, puis piste C le
  2026-11-20). Une couleur par grande famille métier ; les couleurs de statut en sont indépendantes.
- **Navigation claire et neutre**, jamais un aplat bleu ; rangée par usage (piste B, 2026-11-20) ; groupes
  repliables ; étiquette « bientôt » pour ce qui n'existe pas encore ; tous les futurs modules prévus.
- **Titres gros et visibles**, résumé chiffré de la journée en tête d'écran, onglets de page pour les sous-vues.
- **Pas de motifs « AI slop »** : pas de barre de couleur à gauche d'un élément actif, pas de carte à bordure gauche
  colorée, pas de dégradé décoratif, pas d'emoji (2026-11-20). La skill `frontend-design` du dépôt impose dégradés,
  ombres colorées et animations systématiques : elle est contraire à cette demande, ne pas la suivre sur ces points.

## 7. Avec les autres skills

Ce skill vient **avant** toute maquette et avant `frontend-design` ou `design-system-enforcer` : il fournit les faits
et les règles, eux disent comment les rendre.
