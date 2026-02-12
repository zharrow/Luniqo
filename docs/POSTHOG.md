# PostHog - Analytics Produit

## Vue d'ensemble

**PostHog** est notre plateforme d'analytics produit pour comprendre comment les utilisateurs interagissent avec Luniqo. Les données collectées guident les décisions de développement.

- **Dashboard**: https://eu.posthog.com
- **Serveurs**: EU (RGPD compliant)
- **Plan**: Gratuit jusqu'à 1M événements/mois

---

## Configuration

### Variables d'environnement

```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

### Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `lib/providers/PostHogProvider.tsx` | Provider React, initialisation, page views |
| `lib/analytics/posthog.ts` | Fonctions de tracking utilitaires |
| `components/Providers.tsx` | Intégration dans l'arbre React |
| `lib/contexts/AuthContext.tsx` | Identification auto au login/logout |

---

## Tracking actuel

### Automatique (sans code)

| Événement | Description | Activé |
|-----------|-------------|--------|
| `$pageview` | Chaque navigation de page | ✅ |
| `$pageleave` | Quand l'utilisateur quitte une page | ✅ |
| `$autocapture` | Clics, soumissions de formulaires | ✅ |
| `Session Recording` | Replay vidéo des sessions (mots de passe masqués) | ✅ |

### Événements métier implémentés

| Événement | Fichier | Description |
|-----------|---------|-------------|
| `session_created` | `sessions/page.tsx` | Création d'une session de nettoyage |
| `session_viewed` | `sessions/[id]/page.tsx` | Consultation d'une session |
| `task_completed` | `sessions/[id]/page.tsx` | Complétion d'une tâche (Owner) |
| `tablet_action` (task_completed) | `tablet/room/[id]/page.tsx` | Complétion d'une tâche (Tablette) |
| `feature_used` (export_pdf) | `sessions/[id]/page.tsx`, `haccp/page.tsx` | Export PDF |
| `onboarding_step` | `EnterpriseSetupForm.tsx` | Étapes d'onboarding |
| `nursery_switched` | `NurseryContext.tsx` | Changement de crèche |

### Identification utilisateur

L'identification se fait automatiquement au login via `AuthContext`:

```typescript
// Propriétés envoyées à PostHog
{
  email: "marie@example.com",
  role: "Owner" | "Employee" | "Developer",
  enterprise_id: "uuid",
  enterprise_name: "Crèche Les Petits Loups",
  first_name: "Marie",
  last_name: "Dupont"
}
```

**Reset**: L'identité est réinitialisée au logout pour éviter de mélanger les données entre utilisateurs.

---

## Fonctions de tracking disponibles

### Identification

```typescript
import { identifyUser, resetUser } from '@/lib/analytics/posthog'

// Identifier un utilisateur (fait automatiquement au login)
identifyUser(userId, {
  email: 'user@example.com',
  role: 'Owner',
  enterprise_id: 'uuid',
  enterprise_name: 'Ma Crèche',
  nursery_id: 'uuid',
  nursery_name: 'Site Principal'
})

// Réinitialiser l'identité (fait automatiquement au logout)
resetUser()
```

### Événements génériques

```typescript
import { trackEvent, trackFeatureUsed, trackClick, trackModuleVisit } from '@/lib/analytics/posthog'

// Événement personnalisé
trackEvent('custom_event', { property: 'value' })

// Feature utilisée
trackFeatureUsed('export_pdf', { format: 'A4' })

// Clic sur un élément
trackClick('add_employee_button', { page: 'users' })

// Visite d'un module
trackModuleVisit('haccp', { sub_module: 'temperatures' })
```

### Événements Luniqo spécifiques

```typescript
import {
  trackSession,
  trackTaskCompleted,
  trackHaccpModule,
  trackTabletUsage,
  trackNurserySwitched,
  trackOnboarding,
  trackError
} from '@/lib/analytics/posthog'

// Sessions de nettoyage
trackSession('created', {
  session_id: 'uuid',
  nursery_id: 'uuid',
  rooms_count: 3,
  tasks_count: 12
})
trackSession('completed', { completion_rate: 95 })
trackSession('viewed', { session_id: 'uuid' })

// Complétion de tâche
trackTaskCompleted({
  task_id: 'uuid',
  task_name: 'Nettoyer les tables',
  room_name: 'Salle Papillons',
  nursery_id: 'uuid',
  time_to_complete_seconds: 120
})

// Modules HACCP
trackHaccpModule('temperatures', 'viewed')
trackHaccpModule('meals', 'entry_created', { children_count: 15 })
trackHaccpModule('products', 'entry_updated', { product_id: 'uuid' })

// Interface tablette
trackTabletUsage('login', { username: 'Marie D' })
trackTabletUsage('room_selected', { room_name: 'Salle Coccinelles' })
trackTabletUsage('task_completed', { task_name: 'Désinfecter jouets' })

// Changement de crèche
trackNurserySwitched({
  from_nursery_id: 'uuid-1',
  to_nursery_id: 'uuid-2',
  nursery_name: 'Site Secondaire'
})

// Onboarding
trackOnboarding('started')
trackOnboarding('enterprise_created', { enterprise_name: 'Ma Crèche' })
trackOnboarding('nursery_created')
trackOnboarding('first_room_created')
trackOnboarding('first_employee_added')
trackOnboarding('completed')

// Erreurs
trackError('api_error', {
  error_message: 'Failed to load rooms',
  page: '/owner/rooms',
  user_action: 'page_load'
})
```

### Feature Flags (A/B Testing)

```typescript
import { isFeatureEnabled, getFeatureFlagValue } from '@/lib/analytics/posthog'

// Vérifier si une feature est activée
if (isFeatureEnabled('new_dashboard_design')) {
  // Afficher nouveau design
}

// Obtenir la variante (pour tests multivariés)
const variant = getFeatureFlagValue('pricing_page_variant')
// Returns: 'control' | 'variant_a' | 'variant_b' | boolean
```

---

## Où ajouter du tracking

### Priorité haute (insights business)

| Page/Action | Événement suggéré | Status |
|-------------|-------------------|--------|
| Création de session | `trackSession('created')` | ✅ Implémenté |
| Complétion de tâche | `trackTaskCompleted()` | ✅ Implémenté |
| Export PDF | `trackFeatureUsed('export_pdf')` | ✅ Implémenté |
| Onboarding | `trackOnboarding()` | ✅ Implémenté |
| Changement crèche | `trackNurserySwitched()` | ✅ Implémenté |
| Tâche tablette | `trackTabletUsage('task_completed')` | ✅ Implémenté |
| Modules HACCP | `trackHaccpModule()` | ⏳ À ajouter |
| Login tablette | `trackTabletUsage('login')` | ⏳ À ajouter |
| Erreurs API | `trackError()` | ⏳ À ajouter |

### Priorité moyenne (UX insights)

| Page/Action | Événement suggéré | Insight |
|-------------|-------------------|---------|
| Export PDF | `trackFeatureUsed('export')` | Features utiles |
| Filtres utilisés | `trackFeatureUsed('filter')` | Besoins utilisateurs |
| Recherche | `trackEvent('search')` | Contenu recherché |
| Navigation sidebar | `trackClick('sidebar_item')` | Parcours utilisateur |

---

## Fonctionnalités PostHog non utilisées (pour plus tard)

### 1. Surveys (Enquêtes in-app)

Poser des questions directement dans l'app:
- "Comment évaluez-vous cette fonctionnalité ?"
- "Qu'aimeriez-vous voir dans Luniqo ?"

```typescript
// Déclencher un survey programmatiquement
posthog.capture('$survey_shown', { $survey_id: 'survey-uuid' })
```

### 2. Heatmaps

Visualiser où les utilisateurs cliquent sur une page. Utile pour:
- Optimiser le placement des boutons
- Identifier les zones ignorées

**Activation**: Dashboard PostHog > Heatmaps > Activer

### 3. Experiments (A/B Testing avancé)

Tester différentes versions d'une feature avec mesure statistique:
- Nouveau design de dashboard
- Différents libellés de boutons
- Ordre des éléments de menu

**Configuration**: Dashboard PostHog > Experiments

### 4. Cohorts

Grouper les utilisateurs par comportement:
- "Power users" (>10 sessions/semaine)
- "À risque de churn" (inactifs 7 jours)
- "Nouveaux utilisateurs" (<7 jours)

**Utilisation**: Cibler des surveys ou features flags par cohort

### 5. Data Warehouse

Importer des données externes pour croiser avec le comportement:
- Données Stripe (revenus)
- Données Supabase (métriques business)

### 6. Paths

Visualiser les parcours utilisateurs entre les pages:
- Où vont les users après le login ?
- Quel chemin vers la création de session ?

**Accès**: Dashboard PostHog > Paths

---

## Bonnes pratiques

### Nommage des événements

```typescript
// ✅ Bon - Action au passé, contexte clair
trackEvent('task_completed', { task_name: '...' })
trackEvent('session_created', { rooms_count: 3 })
trackEvent('module_visited', { module: 'haccp' })

// ❌ Mauvais - Vague, incohérent
trackEvent('click', {})
trackEvent('TaskComplete', {})
trackEvent('user did something', {})
```

### Propriétés utiles

Toujours inclure le contexte pertinent:

```typescript
// ✅ Bon - Contexte riche
trackTaskCompleted({
  task_id: 'uuid',
  task_name: 'Nettoyer tables',
  room_name: 'Salle Papillons',
  nursery_id: 'uuid',
  time_to_complete_seconds: 120
})

// ❌ Mauvais - Pas de contexte
trackTaskCompleted({ task_id: 'uuid' })
```

### Performance

- PostHog envoie les événements en batch (pas de latence)
- Les appels sont asynchrones (non-bloquants)
- Éviter le tracking dans les boucles (préférer agréger)

```typescript
// ✅ Bon - Un seul événement avec agrégation
trackSession('completed', {
  tasks_completed: 15,
  completion_rate: 95
})

// ❌ Mauvais - Spam d'événements
tasks.forEach(task => {
  trackTaskCompleted({ task_id: task.id })
})
```

---

## Debugging

### Console

En développement, PostHog log dans la console:
```
PostHog Debug: capture event "$pageview" with properties {...}
```

### PostHog Toolbar

Activer la toolbar pour voir les événements en temps réel:
1. Dashboard PostHog > Settings > Toolbar
2. Ajouter `localhost:3000` aux domaines autorisés
3. Cliquer sur l'icône PostHog dans l'app

### Désactiver en dev (optionnel)

Si tu veux éviter de polluer les données avec le dev:

```typescript
// lib/providers/PostHogProvider.tsx
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    // ...
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.opt_out_capturing() // Désactive en dev
      }
    }
  })
}
```

---

## Ressources

- [Documentation PostHog](https://posthog.com/docs)
- [PostHog + Next.js](https://posthog.com/docs/libraries/next-js)
- [Événements personnalisés](https://posthog.com/docs/product-analytics/capture-events)
- [Feature Flags](https://posthog.com/docs/feature-flags)
- [Session Recording](https://posthog.com/docs/session-replay)

---

**Dernière mise à jour**: 2026-02-12 (v2 - Événements métier ajoutés)
