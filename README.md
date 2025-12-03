# Luniqo - Gestion de Crèche Intelligente

Application moderne de gestion de crèche avec traçabilité HACCP, développée avec Next.js et Supabase.

## 🚀 Stack Technique

- **Frontend** : Next.js 16 (App Router) + TypeScript + React 19
- **Styling** : Tailwind CSS v4 (design system pastel)
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Déploiement** : Vercel (ready to deploy)

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

1. **Developer** (Super Admin)
   - Authentification : Supabase Auth (email/password)
   - Accès : Dashboard analytics (`/analytics`)
   - Rôle : Créer des admins, voir les métriques globales

2. **Admin** (Gestionnaire de crèche)
   - Authentification : Supabase Auth (email/password)
   - Accès : Back-office complet (`/dashboard`)
   - Rôle : Gérer une crèche (1 admin = 1 crèche)
   - Fonctions : CRUD sur rooms, tasks, users, HACCP

3. **User** (Employé)
   - Authentification : Code PIN (4-6 chiffres)
   - Accès : Interface tablette (`/tablet`)
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
