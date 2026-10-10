# Personas

Les personnes pour qui Luniqo est construit. Elles servent à trancher une
question produit (« est-ce qu'Hélène en a besoin pour le premier jour ? ») et
alimentent la [story map](STORY-MAP.md).

> **Personnages fictifs** `[SIMULÉ]`. Noms, âges, citations et détails de vie
> sont inventés. Ils s'appuient sur le terrain réel du projet : le besoin
> d'origine d'une micro-crèche (les fiches de ménage papier), le fonctionnement
> d'un établissement d'accueil du jeune enfant, et l'extension à des groupes de
> crèches. Aucun propos n'est attribué à une personne réelle. Chaque persona
> porte des **hypothèses à vérifier** auprès de vrais utilisateurs.

Rédigé le 2026-10-09 (LUN-60, bonus du cours « Coordination Front & Back »).

| | Persona | Rôle dans Luniqo | Appareil principal | Fréquence |
|---|---|---|---|---|
| 1 | [Hélène, directrice de micro-crèche](#1-hélène-garnier-directrice-dune-micro-crèche) | Direction (`owner`) | ordinateur de bureau, téléphone | chaque jour |
| 2 | [Yasmine, auxiliaire de puériculture](#2-yasmine-benali-auxiliaire-de-puériculture) | Employée (`employee`) | tablette de la crèche | plusieurs dizaines de fois par jour |
| 3 | [Marc, parent de deux enfants](#3-marc-lefort-parent-de-deux-enfants) | Famille (`guardian`) | téléphone | une ou deux fois par jour |
| 4 | [Nadia, gestionnaire d'un groupe de crèches](#4-nadia-fontaine-gestionnaire-dun-groupe-de-crèches) | Direction (`owner`) de plusieurs crèches | ordinateur portable | chaque jour |

---

## 1. Hélène Garnier, directrice d'une micro-crèche

> « Le soir, je recopie et je range des fiches. Ce n'est pas pour ça que j'ai ouvert une crèche. »

| | |
|---|---|
| Âge | 46 ans |
| Structure | Micro-crèche de 10 places en périphérie d'une grande ville, 4 salariées |
| Rôle | Gérante et directrice ; elle encadre l'équipe et accueille les enfants une partie de la journée |
| Aisance numérique | Moyenne : bureautique, banque en ligne, messagerie. Peu de patience pour un outil qui « rame » |

**Sa journée.** Elle ouvre la crèche, accueille les premières familles,
remplace une salariée absente, puis fait l'administratif en fin de journée :
fiches de ménage remplies par l'équipe, relevés, dossiers des familles. Tout est
sur papier, dans des classeurs à conserver.

**Ce qu'elle veut**
- Ne plus remplir ni archiver de fiches papier, sans perdre la preuve que le ménage est fait.
- Savoir à tout moment quels enfants sont présents.
- Être sûre que seul un adulte autorisé repart avec un enfant.
- Retrouver vite une information lors d'un contrôle ou d'une question d'un parent.

**Ce qui la freine**
- Les doubles saisies (papier puis logiciel).
- Les logiciels pensés pour de grandes structures, trop complexes pour 10 places.
- Les mots de passe à rallonge et les codes envoyés par SMS qui n'arrivent pas.

**Ce que Luniqo doit faire pour elle** : fiche de ménage numérique avec
historique (épic « Fiche de ménage »), présents du jour (« Pointage sur
tablette »), autorisations de départ par enfant (« Enfants et familles »),
connexion rapide et sûre avec Face ID (« Authentification »).

**Ce qu'il ne faut pas faire** : lui imposer un paramétrage long avant le
premier usage ; multiplier les écrans de configuration.

**Hypothèses à vérifier**
- Les fiches de ménage doivent être conservées et présentables : combien de temps, sous quelle forme ?
- Elle accepte de faire pointer l'équipe sur une tablette plutôt que sur papier.

---

## 2. Yasmine Benali, auxiliaire de puériculture

> « Quand j'ai un bébé dans les bras, je n'ai pas le temps de chercher un bouton. »

| | |
|---|---|
| Âge | 29 ans |
| Poste | Auxiliaire de puériculture, à temps plein |
| Appareil | La tablette fixée près de l'entrée, partagée par toute l'équipe |
| Aisance numérique | Bonne sur téléphone, aucune envie de retenir un mot de passe de plus |

**Sa journée.** Elle accueille les enfants le matin, note leur arrivée,
s'occupe des repas, du change, des siestes, coche les tâches de ménage de la
salle en fin de journée et rend chaque enfant à la bonne personne. Elle a
souvent les mains occupées ou humides.

**Ce qu'elle veut**
- Pointer une arrivée ou un départ en quelques secondes, avec de grands boutons.
- Ne pas se tromper sur la personne qui vient chercher un enfant.
- Ne pas avoir à se reconnecter à chaque geste.

**Ce qui la freine**
- Les écrans chargés et les petits boutons.
- Devoir saisir un e-mail et un mot de passe sur une tablette partagée.

**Ce que Luniqo doit faire pour elle** : choisir son nom et taper un PIN de 4
chiffres, liste des enfants avec un geste par pointage, alerte si l'adulte n'est
pas autorisé, fiche de ménage à cocher (« Pointage sur tablette », « Fiche de
ménage »).

**Ce qu'il ne faut pas faire** : lui demander des informations de santé ou des
commentaires libres pendant le pointage ; afficher des données d'autres crèches.

**Hypothèses à vérifier**
- Une session de 2 minutes après le PIN suffit pour pointer plusieurs enfants d'affilée.
- Les fratries arrivent souvent ensemble : pointer deux enfants d'un geste ferait gagner du temps.

---

## 3. Marc Lefort, parent de deux enfants

> « Je veux juste savoir que ma fille est bien arrivée et qui est passé la chercher. »

| | |
|---|---|
| Âge | 35 ans |
| Famille | Deux enfants accueillis dans la même crèche ; garde alternée avec l'autre parent |
| Travail | Horaires décalés ; c'est parfois une grand-mère qui récupère les enfants |
| Accessibilité | Utilise le grossissement du texte de son téléphone |

**Ce qu'il veut**
- Voir la présence du jour et l'heure d'arrivée ou de départ de chacun de ses enfants.
- Savoir que les autres familles ne voient pas les informations de ses enfants.
- Un seul compte pour ses deux enfants.

**Ce qui le freine**
- Créer encore un compte avec un mot de passe compliqué.
- Les applications illisibles quand le texte est agrandi.

**Ce que Luniqo doit faire pour lui** : invitation par la crèche, choix du mot
de passe, consultation réservée à l'autorité parentale, un compte pour plusieurs
enfants (« Enfants et familles », portail des parents).

**Ce qu'il ne faut pas faire** : montrer les coordonnées des autres contacts de
l'enfant ; envoyer des données d'enfants par e-mail.

**Hypothèses à vérifier**
- Une notification à l'arrivée et au départ serait plus utile que la consultation.
- La grand-mère autorisée à venir chercher les enfants n'a pas besoin de compte.

---

## 4. Nadia Fontaine, gestionnaire d'un groupe de crèches

> « J'ai quatre crèches, je veux une seule vue, et chacun ne doit voir que la sienne. »

| | |
|---|---|
| Âge | 52 ans |
| Structure | Entreprise de 4 crèches (une crèche de 40 places, trois micro-crèches), une trentaine de salariés |
| Rôle | Dirigeante ; une responsable sur place dans chaque crèche |
| Aisance numérique | Bonne ; habituée aux outils de gestion et aux tableaux de bord |

**Ce qu'elle veut**
- Ouvrir une nouvelle crèche dans l'outil et donner les bons accès en quelques minutes.
- Qu'un salarié qui change de crèche perde immédiatement l'accès à l'ancienne.
- Comparer l'occupation et la régularité du ménage entre ses crèches.
- Être certaine que les données de ses crèches ne sont visibles par aucune autre entreprise.

**Ce qui la freine**
- Les outils pensés pour une seule structure, qui obligent à un compte par crèche.
- L'absence de traçabilité de qui a fait quoi.

**Ce que Luniqo doit faire pour elle** : plusieurs crèches par entreprise, accès
du personnel par crèche, second facteur obligatoire pour la direction (« Crèches
et personnel », « Authentification »), tableau de bord et statistiques plus tard.

**Hypothèses à vérifier**
- Les responsables de chaque crèche ont besoin d'un rôle intermédiaire entre direction et employé (non prévu aujourd'hui).
