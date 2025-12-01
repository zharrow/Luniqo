# Calendrier Hebdomadaire - Documentation

**Date de création**: 2025-11-29
**Statut**: ✅ Implémenté et fonctionnel

---

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Fichiers créés](#fichiers-créés)
- [Logique métier](#logique-métier)
- [Utilisation](#utilisation)
- [Troubleshooting](#troubleshooting)

---

## Vue d'ensemble

Le **Calendrier Hebdomadaire** est une fonctionnalité ajoutée au dashboard principal qui permet de visualiser toutes les tâches planifiées pour la semaine en cours (du lundi au vendredi).

### Objectif

- **Visualiser** toutes les tâches de la semaine en un coup d'œil
- **Filtrer** les tâches par pièce
- **Naviguer** entre les semaines (précédente/suivante)
- **Suivre l'état** des tâches (À faire, En cours, Fait)

### Caractéristiques

- ✅ Affichage du **lundi au vendredi** (5 jours - crèche fermée le weekend)
- ✅ **Badges colorés** par type de tâche (Quotidien, Hebdo, Mensuel)
- ✅ **Badges de statut** (À faire, En cours, Fait)
- ✅ **Filtrage par pièce** via dropdown
- ✅ **Navigation entre semaines** (flèches gauche/droite)
- ✅ **Bouton "Aujourd'hui"** pour revenir à la semaine en cours
- ✅ **Indicateur jour actuel** (fond bleu clair)
- ✅ **Responsive** (1 colonne mobile, 3 colonnes tablette, 5 colonnes desktop)

---

## Architecture

### Service: `calendar.service.ts`

Le service calendrier gère toute la logique métier :

```typescript
export class CalendarService {
  // Récupère les données de la semaine avec toutes les tâches
  async getWeeklyData(enterpriseId: string, weekOffset: number, roomFilter?: string): Promise<WeekData>

  // Récupère les statistiques de la semaine
  async getWeekStats(enterpriseId: string, weekOffset: number): Promise<WeekStats>
}
```

**Méthodes privées importantes** :

- `getWeekStart(date)` - Calcule le lundi de la semaine
- `getWeekDays(startDate)` - Génère les 5 jours (lundi-vendredi)
- `shouldShowTaskOnDay(task, date, weekStart)` - Détermine si une tâche doit apparaître un jour donné
- `getTasksStatusForDay(assignedTaskIds, date, enterpriseId)` - Récupère le statut des tâches pour un jour

### Composant: `WeeklyCalendar.tsx`

Composant React client-side qui affiche le calendrier :

```typescript
export function WeeklyCalendar({ enterpriseId }: WeeklyCalendarProps) {
  // État local pour la semaine, filtres, chargement
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [weekOffset, setWeekOffset] = useState(0) // 0 = semaine actuelle
  const [selectedRoom, setSelectedRoom] = useState<string>('all')

  // Fonctions de navigation
  function handlePreviousWeek()
  function handleNextWeek()
  function handleThisWeek()
}
```

---

## Fonctionnalités

### 1. Types de tâches et affichage

Le calendrier affiche les tâches selon leur type :

| Type | Fréquence | Affichage |
|------|-----------|-----------|
| **DAILY** | Quotidien | Tous les jours (lundi-vendredi) |
| **WEEKLY** | Hebdomadaire | Une fois par semaine (par défaut lundi, ou jour configuré via `frequency.dayOfWeek`) |
| **MONTHLY** | Mensuel | Une fois par mois (si première semaine du mois, par défaut lundi, ou jour configuré via `frequency.dayOfMonth`) |
| **OCCASIONAL** | Ponctuel | N'apparaît pas dans le calendrier automatiquement |

### 2. Statuts des tâches

Les tâches peuvent avoir 3 statuts basés sur les `cleaning_log` :

- 🟦 **À faire** (Badge secondaire) - Pas encore démarrée
- 🟨 **En cours** (Badge warning) - Démarrée mais non terminée (statut `EN_COURS`)
- ✅ **Fait** (Badge success) - Terminée (statut `FAIT`)

### 3. Filtrage par pièce

Un dropdown permet de filtrer les tâches :
- **"Toutes les pièces"** : Affiche toutes les tâches de toutes les pièces
- **Sélection d'une pièce** : Affiche uniquement les tâches de cette pièce

### 4. Navigation entre semaines

- **Flèche gauche** : Semaine précédente (`weekOffset - 1`)
- **Flèche droite** : Semaine suivante (`weekOffset + 1`)
- **Bouton "Aujourd'hui"** : Retour à la semaine en cours (`weekOffset = 0`)

Le bouton "Aujourd'hui" n'apparaît que si `weekOffset !== 0`.

---

## Fichiers créés

### 1. Service

**`lib/services/calendar.service.ts`** (280 lignes)

```typescript
// Types
export interface CalendarTask { ... }
export interface DayTasks { ... }
export interface WeekData { ... }

// Service
export class CalendarService { ... }
export const calendarService = new CalendarService()
```

### 2. Composant

**`components/dashboard/WeeklyCalendar.tsx`** (320 lignes)

```tsx
'use client'

export function WeeklyCalendar({ enterpriseId }: WeeklyCalendarProps) {
  // Logique et rendu du calendrier
}
```

### 3. Documentation

**`CALENDRIER-HEBDOMADAIRE.md`** (ce fichier)

---

## Logique métier

### Calcul de la semaine

```typescript
// 1. Obtenir le lundi de la semaine en cours
const weekStart = getWeekStart(today)

// 2. Appliquer l'offset (navigation)
weekStart.setDate(weekStart.getDate() + weekOffset * 7)

// 3. Calculer le vendredi (lundi + 4 jours)
const weekEnd = new Date(weekStart)
weekEnd.setDate(weekStart.getDate() + 4)

// 4. Générer les 5 jours (lundi au vendredi)
const weekDays = getWeekDays(weekStart) // [Mon, Tue, Wed, Thu, Fri]
```

### Affichage des tâches quotidiennes

Une tâche **DAILY** apparaît tous les jours :

```typescript
if (taskType === 'DAILY') return true
```

### Affichage des tâches hebdomadaires

Une tâche **WEEKLY** apparaît une fois par semaine :

```typescript
if (taskType === 'WEEKLY') {
  // Si jour spécifique configuré
  if (task.frequency?.dayOfWeek !== undefined) {
    const dayOfWeek = date.getDay() // 0=Dimanche, 1=Lundi, ...
    return dayOfWeek === task.frequency.dayOfWeek
  }
  // Sinon, par défaut le lundi
  return date.getTime() === weekStart.getTime()
}
```

**Exemple de configuration** :

```json
{
  "frequency": {
    "dayOfWeek": 3  // 3 = Mercredi
  }
}
```

### Affichage des tâches mensuelles

Une tâche **MONTHLY** apparaît une fois par mois :

```typescript
if (taskType === 'MONTHLY') {
  // Si jour spécifique du mois configuré
  if (task.frequency?.dayOfMonth !== undefined) {
    return date.getDate() === task.frequency.dayOfMonth
  }
  // Sinon, premier lundi du mois
  const isFirstWeekOfMonth = date.getDate() <= 7
  const isFirstDayOfWeek = date.getTime() === weekStart.getTime()
  return isFirstWeekOfMonth && isFirstDayOfWeek
}
```

**Exemple de configuration** :

```json
{
  "frequency": {
    "dayOfMonth": 15  // Le 15 du mois
  }
}
```

### Récupération du statut

Le statut des tâches est déterminé par les `cleaning_log` de la `cleaning_session` du jour :

```typescript
// 1. Récupérer la session du jour
const session = await supabase
  .from('cleaning_session')
  .select('id, status')
  .eq('enterprise_id', enterpriseId)
  .eq('date', dateStr)
  .maybeSingle()

// 2. Récupérer les logs de cette session
const logs = await supabase
  .from('cleaning_log')
  .select('assigned_task_id, status')
  .eq('session_id', session.id)
  .in('assigned_task_id', assignedTaskIds)

// 3. Mapper les statuts
logs.forEach(log => {
  if (log.status === 'FAIT') statusMap.set(log.assigned_task_id, 'done')
  else if (log.status === 'EN_COURS') statusMap.set(log.assigned_task_id, 'in_progress')
  else statusMap.set(log.assigned_task_id, 'todo')
})
```

---

## Utilisation

### Intégration dans le dashboard

Le calendrier est intégré dans le dashboard principal (`/dashboard`) :

```tsx
// app/(dashboard)/dashboard/page.tsx
import { WeeklyCalendar } from '@/components/dashboard/WeeklyCalendar'

export default function DashboardPage() {
  const { session } = useRequireAuth(['Admin'])

  return (
    <DashboardLayout>
      {/* Stats cards */}

      {/* Weekly Calendar */}
      {session?.enterprise?.id && (
        <div className="mb-8">
          <WeeklyCalendar enterpriseId={session.enterprise.id} />
        </div>
      )}

      {/* Quick actions */}
    </DashboardLayout>
  )
}
```

### Cas d'usage

**1. Admin consulte le planning de la semaine**
- Se connecte au dashboard
- Voit immédiatement toutes les tâches de la semaine
- Peut filtrer par pièce pour voir les tâches d'une pièce spécifique

**2. Admin navigue entre les semaines**
- Clique sur la flèche droite pour voir la semaine prochaine
- Clique sur "Aujourd'hui" pour revenir à la semaine en cours

**3. Admin suit l'avancement**
- Les badges de statut montrent l'état de chaque tâche
- Les tâches "Fait" apparaissent en vert
- Les tâches "En cours" en jaune
- Les tâches "À faire" en gris

---

## Troubleshooting

### Les tâches n'apparaissent pas dans le calendrier

**Cause possible 1** : Les tâches ne sont pas assignées aux pièces

**Solution** :
1. Aller dans `/dashboard/rooms`
2. Cliquer sur "Gérer les tâches" pour chaque pièce
3. Assigner les tâches nécessaires

**Cause possible 2** : Les tâches sont de type `OCCASIONAL`

**Solution** : Les tâches occasionnelles n'apparaissent pas automatiquement dans le calendrier. Changez le type en `DAILY`, `WEEKLY` ou `MONTHLY`.

### Le statut ne se met pas à jour

**Cause possible** : Aucune session de nettoyage créée pour le jour

**Solution** :
1. Une session de nettoyage doit être créée pour le jour
2. Les employés doivent compléter les tâches via l'interface tablette (`/tablet`)

### Le calendrier affiche 7 jours au lieu de 5

**Cause** : Bug dans le code

**Solution** : Vérifier que `getWeekDays()` dans `calendar.service.ts` retourne bien 5 jours :

```typescript
for (let i = 0; i < 5; i++) { // Doit être 5, pas 7
  const day = new Date(startDate)
  day.setDate(startDate.getDate() + i)
  days.push(day)
}
```

### Erreurs TypeScript lors du build

**Erreur courante** : "Type error: 'session' is possibly 'null'"

**Solution** : Toujours vérifier que la session existe avant d'utiliser `session.enterprise.id` :

```tsx
{session?.enterprise?.id && (
  <WeeklyCalendar enterpriseId={session.enterprise.id} />
)}
```

---

## Améliorations futures possibles

### 1. Drag & Drop
Permettre de glisser-déposer les tâches pour changer leur jour planifié

### 2. Modal de détails
Cliquer sur une tâche pour voir ses détails complets et éventuellement la modifier

### 3. Vue mois
Ajouter une vue mensuelle en plus de la vue hebdomadaire

### 4. Export PDF/iCal
Exporter le planning de la semaine en PDF ou format iCalendar

### 5. Notifications
Envoyer des notifications pour les tâches du jour

### 6. Statistiques hebdomadaires
Ajouter un widget montrant :
- Total de tâches de la semaine
- Taux de complétion
- Comparaison avec semaine précédente

---

## Notes techniques

### Performance

- Le calendrier utilise `useState` et `useEffect` pour charger les données
- Les requêtes Supabase sont optimisées avec des filtres côté serveur
- Le filtrage par pièce recharge les données (pas de filtrage client-side)

### Sécurité

- **Filtrage par `enterprise_id`** : Toutes les requêtes filtrent par l'entreprise de l'admin
- Pas d'accès aux données d'autres entreprises
- Utilise `useRequireAuth(['Admin'])` pour protéger l'accès

### Responsive

| Breakpoint | Colonnes | Affichage |
|------------|----------|-----------|
| Mobile (`< md`) | 1 | Liste verticale des jours |
| Tablette (`md` à `lg`) | 3 | 3 jours côte à côte |
| Desktop (`lg+`) | 5 | Tous les jours côte à côte |

---

**Dernière mise à jour** : 2025-11-29
**Auteur** : Claude Code
**Version** : 1.0
