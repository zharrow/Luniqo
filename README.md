# Luniqo - Gestion de Crèche Intelligente

Application moderne de gestion de crèche avec traçabilité HACCP, développée avec Next.js et Supabase.

## 🚀 Stack Technique

- **Frontend** : Next.js 16 (App Router) + TypeScript + React 19
- **Styling** : Tailwind CSS v4 (design system pastel)
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Déploiement** : Vercel (ready to deploy)

## 🐳 Lancer Luniqo avec Docker (cours Docker, M2)

Le dossier [`docker/`](docker/) fait tourner tout Luniqo dans des conteneurs, en
une commande. Il répond au TP « Projet - Docker Cloud » du M2 (Ynov Toulouse) :
concevoir ses propres images, sans Docker Hub, et les orchestrer avec
docker compose.

```bash
git clone https://github.com/zharrow/Luniqo.git && cd Luniqo/docker
docker compose up -d --build     # construit les 5 images et lance les 4 services
docker compose ps                # db, api, front et web doivent être "healthy"
```

| Adresse | Contenu |
|---|---|
| <http://localhost:8080> | l'application Luniqo (page de connexion) |
| <http://localhost:8080/api/docs> | documentation Swagger de l'API |
| <http://localhost:8080/api/v2/nurseries> | les crèches de démonstration (données fictives) |

### Les conteneurs

```
Navigateur ──HTTP :8080──▶ web (nginx) ──/──────▶ front (Next.js)  ──▶ Supabase Cloud (v1)
                                       └─/api/──▶ api (FastAPI) ──SQL──▶ db (PostgreSQL)
```

| Image | Rôle pour le TP | Contenu |
|---|---|---|
| `base` | socle commun | Alpine Linux construit depuis `scratch`, tini, utilisateur non-root |
| `web` | **serveur web** | nginx, seul point d'entrée, relaie vers le front et l'API |
| `front` | **front** | l'application Next.js de ce dépôt, en serveur autonome |
| `api` | **back** | l'API FastAPI de la v2 (dossier [`api/`](api/)) |
| `db` | base de données | PostgreSQL 18, données dans un volume |

### Exigences du TP et où les trouver

| Exigence | Réponse |
|---|---|
| Aucune image Docker Hub | Toutes les images partent de `scratch` (archive officielle d'Alpine) ou de notre image `base` ; compose ne fait jamais de `pull` |
| Au moins un front, un back et un serveur web | `front`, `api` et `web`, plus `db` |
| Arguments de ressources au run et dans le compose | Limites CPU, mémoire et processus réglées dans [`docker/.env`](docker/.env), plus des arguments applicatifs alignés sur ces limites (workers, connexions, mémoire de Node.js...) |
| Dépendances, manipulations sur l'OS, arguments, entrypoints expliqués | Un README par image : [base](docker/base/README.md), [db](docker/db/README.md), [api](docker/api/README.md), [front](docker/front/README.md), [web](docker/web/README.md) |
| Limitations de ressources expliquées | Justifiées par des mesures réelles (repos et charge) dans le [README du dossier docker](docker/README.md) |
| SIGTERM gérés | Chaque service s'arrête proprement (signal adapté à chaque programme) ; toute la pile s'arrête en moins d'une seconde |
| Ordre de démarrage | `db` et `front` en parallèle, puis `api` quand la base est saine, puis `web` quand l'API et le front sont sains (healthchecks) |
| Schéma des communications | Dans le [README du dossier docker](docker/README.md), avec les réseaux et les ports |

Tout le détail (architecture, choix, mesures, problèmes rencontrés) est dans
[`docker/README.md`](docker/README.md).

Le front utilise encore Supabase Cloud pour la connexion (v1). Pour pouvoir se
connecter, renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
dans le `.env` à la racine (non versionné), puis lancer depuis `docker/` :
`docker compose --env-file .env --env-file ../.env up -d --build`. Sans ce
fichier, les pages s'affichent mais la connexion échoue.

## 📦 Installation

### Prérequis

- Node.js 18+
- npm ou pnpm
- Un compte Supabase (gratuit)

### Étapes d'installation

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer Supabase**

Suivez le guide complet : [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

En résumé :
- Créez un projet sur [supabase.com](https://supabase.com)
- Récupérez vos clés API
- Copiez `.env.local.example` vers `.env.local`
- Ajoutez vos clés Supabase

```bash
cp .env.local.example .env.local
# Éditez .env.local avec vos vraies clés
```

3. **Déployer le schéma de base de données**

Dans le dashboard Supabase :
- Allez dans **SQL Editor**
- Copiez le contenu de `supabase/migrations/00_schema.sql`
- Exécutez le script

4. **Lancer le serveur de développement**

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Système Multi-Tiers

L'application utilise un système d'authentification à 3 niveaux :

1. **Developer**
   - Authentification : Supabase Auth (email/password)
   - Accès : Dashboard analytics (`/analytics`)
   - Rôle : Créer des admins, voir les métriques globales

2. **Owner** (Gestionnaire de crèche)
   - Authentification : Supabase Auth (email/password)
   - Accès : Back-office complet (`/owner/`)
   - Rôle : Gérer une crèche (1 admin = 1 crèche)
   - Fonctions : CRUD sur rooms, tasks, users, HACCP

3. **Employee**
   - Authentification : Supabase Auth (email/password) + Code PIN (4 chiffres)
   - Accès : Back-office complet (`/employee/`) + Interface tablette (`/tablet`)
   - Rôle : Effectuer les tâches de nettoyage et saisie HACCP

### Modules Fonctionnels

#### Module Luniqo (Nettoyage)
- Gestion des pièces (rooms)
- Templates de tâches
- Sessions de nettoyage quotidiennes
- Historique et rapports

#### Module HACCP (Traçabilité alimentaire)
- Gestion des enfants (allergies, régimes)
- Suivi des repas
- Contrôle des températures
- Gestion des produits et fournisseurs
- Traçabilité des lots
- Non-conformités
- Documentation

#### Module Communication
- Messagerie Admin ↔ Developer (temps réel)
- Système de notifications
- WebSocket via Supabase Realtime

#### Module Analytics
- Dashboard développeur
- KPIs globaux
- Métriques d'utilisation

## 🎨 Design System

Le design system utilise une palette **pastel douce** inspirée de Notion, Airbnb et Meeko :

### Couleurs

- **Primary** (Bleu doux) : `#5a9dc9` - Propreté, sérénité
- **Secondary** (Rose poudré) : `#f4c2c2` - Chaleur, petite enfance
- **Accent** (Jaune pastel) : `#ffe5b4` - Actions positives
- **Success** (Vert menthe) : `#b5ead7` - Conformité HACCP
- **Neutral** : Gris chauds (pas de noir pur)

### Classes Utilitaires

```css
.card           /* Card avec ombre subtile */
.btn            /* Bouton arrondi de base */
.btn-primary    /* Bouton primaire (bleu) */
.btn-secondary  /* Bouton secondaire (rose) */
.tablet-mode    /* Mode tablette (boutons XXL) */
```

### Mode Tablette

Pour activer le mode tablette (boutons XXL, contraste élevé) :

```tsx
<div className="tablet-mode">
  <button className="btn btn-primary">Grand bouton</button>
</div>
```

## 🔐 Authentification

### Login Admin/Developer

```typescript
import { useAuth } from '@/lib/contexts/AuthContext'

const { loginWithEmail } = useAuth()

const result = await loginWithEmail({
  email: 'admin@exemple.com',
  password: 'password'
})
```

### Login Employé (PIN)

```typescript
const { loginWithPin } = useAuth()

const result = await loginWithPin({
  pin: '1234',
  enterprise_id: 'uuid-enterprise'
})
```

### Protection de Routes

```typescript
'use client'
import { useRequireAuth } from '@/lib/contexts/AuthContext'

export default function ProtectedPage() {
  const { session, isLoading } = useRequireAuth(['Admin'])

  if (isLoading) return <div>Chargement...</div>
  return <div>Contenu protégé</div>
}
```

## 📊 Base de Données

**25+ tables** organisées en modules :

- **User System** : `developer`, `admin`, `enterprise`, `user`, `user_rooms`
- **Luniqo Module** : `room`, `task_template`, `assigned_task`, `cleaning_session`, `cleaning_log`, `export`
- **HACCP Module** : `child`, `meal`, `temperature`, `product`, `supplier`, `batch`, `equipment`, `cleaning_haccp`, `non_compliance`, `document`, `meal_children`
- **Communication** : `conversation`, `message`, `notification`

**⚠️ IMPORTANT** : Toujours filtrer par `enterprise_id` pour l'isolation des données !

```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('room')
  .select('*')
  .eq('enterprise_id', session.enterprise.id)

// ❌ WRONG - Retourne toutes les données !
const { data } = await supabase.from('room').select('*')
```

## 🚧 Progression

Voir [PROGRESS.md](PROGRESS.md) pour l'état d'avancement détaillé.

**Status actuel** : ✅ **Phase 1 terminée** (Infrastructure + Auth)

- ✅ Next.js + Supabase configuré
- ✅ Design system complet
- ✅ Authentification multi-tiers fonctionnelle
- ✅ Pages de login (admin + tablette)
- 🟡 Modules métier (à développer)

## 📝 Scripts Disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # ESLint
```

## 🔄 Prochaines Étapes

1. **Configurer Supabase** (voir [SUPABASE_SETUP.md](SUPABASE_SETUP.md))
2. **Tester l'authentification**
3. **Développer les modules Luniqo et HACCP**
4. **Créer les données de seed pour la démo**
5. **Déployer sur Vercel**

## 📚 Documentation

- [Guide de configuration Supabase](SUPABASE_SETUP.md)
- [Progression détaillée](PROGRESS.md)
- [Schéma de base de données](supabase/migrations/00_schema.sql)

---

© 2025 Luniqo - Gestion HACCP pour crèches
