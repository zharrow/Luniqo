---
name: lucide-animated
description: Intègre les icônes animées de lucide-animated.com pour des interfaces vivantes. Utilise quand tu ajoutes des icônes, crées des composants UI, ou améliores l'interactivité. Inclut le wrapper pour animations au hover.
---

# Skill: Lucide Animated Icons

Utilise les icônes animées de lucide-animated.com pour rendre l'application Luniqo plus vivante et interactive.

## Installation d'une icône

```bash
npx shadcn@latest add "https://lucide-animated.com/r/{icon-name}.json" --overwrite
```

Remplace `{icon-name}` par le nom de l'icône en kebab-case.

## Icônes déjà installées

Les icônes sont rangées dans `components/ui/lucide-animated/` avec un fichier index pour les exporter :

| Fichier | Composant | Usage recommandé |
|---------|-----------|------------------|
| `home.tsx` | `HomeIcon` | Dashboard, accueil |
| `clock.tsx` | `ClockIcon` | Historique, temps |
| `settings.tsx` | `SettingsIcon` | Paramètres, profil |
| `sparkles.tsx` | `SparklesIcon` | Nouveautés, premium |
| `eye.tsx` | `EyeIcon` | Observations, voir |
| `shield-check.tsx` | `ShieldCheckIcon` | Sécurité, conformité |
| `euro.tsx` | `EuroIcon` | Facturation, prix |
| `calendar-days.tsx` | `CalendarDaysIcon` | Planning, calendrier |
| `calendar-check.tsx` | `CalendarCheckIcon` | Événements validés |
| `chart-bar-increasing.tsx` | `ChartBarIncreasingIcon` | Analytics, croissance |
| `chart-line.tsx` | `ChartLineIcon` | Graphiques, tendances |
| `lock.tsx` | `LockIcon` | Verrouillé, sécurité |
| `file-text.tsx` | `FileTextIcon` | Documents, fichiers |
| `clipboard-check.tsx` | `ClipboardCheckIcon` | Tâches validées |
| `users.tsx` | `UsersIcon` | Groupes, équipes |
| `message-circle.tsx` | `MessageCircleIcon` | Messages, chat |

## Utilisation avec AnimatedIconWrapper

Les icônes lucide-animated s'animent au survol. Pour qu'elles s'animent quand on survole le parent (Link, button), utilise le wrapper :

```tsx
import { AnimatedIconWrapper, HomeIcon } from '@/components/ui/lucide-animated'

// Dans un Link ou button
<Link href="/dashboard" className="flex items-center gap-2">
  <AnimatedIconWrapper icon={<HomeIcon />} size={20} />
  <span>Dashboard</span>
</Link>
```

### Props du wrapper

- `icon` : L'élément icône React (ex: `<HomeIcon />`)
- `size` : Taille en pixels (défaut: 20)
- `className` : Classes CSS additionnelles

## Icônes disponibles sur lucide-animated.com

### Navigation & Actions
- `home`, `arrow-left`, `arrow-right`, `chevron-down`, `chevron-up`
- `menu`, `x`, `check`, `check-check`, `plus`, `minus`

### Communication
- `message-circle`, `message-square`, `mail`, `mail-check`, `bell`, `bell-ring`

### Utilisateurs
- `user`, `users`, `user-check`, `user-plus`, `user-round-check`

### Temps & Calendrier
- `clock`, `timer`, `calendar-days`, `calendar-check`, `calendar-cog`

### Fichiers & Documents
- `file`, `file-text`, `folder`, `clipboard-check`

### Sécurité
- `lock`, `unlock`, `shield`, `shield-check`, `key`

### Analytics
- `chart-line`, `chart-bar-increasing`, `chart-bar-decreasing`
- `chart-column-increasing`, `trending-up`, `trending-down`

### Misc
- `settings`, `sparkles`, `star`, `heart`, `bookmark`
- `eye`, `eye-off`, `search`, `filter`, `download`, `upload`
- `refresh-cw`, `loader`, `zap`, `sun`, `moon`

## Alternatives pour icônes manquantes

Si une icône n'existe pas dans lucide-animated, utilise une Heroicon avec animation CSS :

```tsx
// Heroicon avec animation au hover
<Icon className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:text-primary-600" />
```

### Mapping Heroicons → Lucide Animated

| Heroicon | Alternative Lucide Animated |
|----------|---------------------------|
| `BeakerIcon` | Pas d'équivalent - utiliser Heroicon |
| `BuildingOfficeIcon` | Pas d'équivalent - utiliser Heroicon |
| `UserGroupIcon` | `UsersIcon` |
| `ChatBubbleLeftRightIcon` | `MessageCircleIcon` |
| `CalendarIcon` | `CalendarDaysIcon` |
| `ClockIcon` | `ClockIcon` ✓ |
| `Cog6ToothIcon` | `SettingsIcon` ✓ |
| `ChartBarIcon` | `ChartBarIncreasingIcon` ✓ |
| `DocumentTextIcon` | `FileTextIcon` ✓ |
| `CurrencyEuroIcon` | `EuroIcon` ✓ |
| `LockClosedIcon` | `LockIcon` ✓ |
| `SparklesIcon` | `SparklesIcon` ✓ |
| `EyeIcon` | `EyeIcon` ✓ |
| `ShieldCheckIcon` | `ShieldCheckIcon` ✓ |

## Pattern dans la Sidebar

Dans `AppSidebar.tsx`, marque les icônes animées avec `isAnimated: true` :

```tsx
const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    isAnimated: true  // ← Active le wrapper
  },
  {
    name: 'Rooms',
    href: '/rooms',
    icon: BuildingOfficeIcon  // ← Heroicon standard
  },
]
```

Le rendu dans `renderNavGroup` gère automatiquement les deux types :

```tsx
{item.isAnimated ? (
  <AnimatedIconWrapper icon={<Icon />} size={20} />
) : (
  <Icon className="w-5 h-5 transition-all duration-300 group-hover/item:scale-110" />
)}
```

## Installer de nouvelles icônes

1. Vérifie si l'icône existe sur https://lucide-animated.com
2. Installe avec : `npx shadcn@latest add "https://lucide-animated.com/r/{name}.json"`
3. Déplace le fichier dans `components/ui/lucide-animated/`
4. Ajoute l'export dans `components/ui/lucide-animated/index.ts`
5. Importe depuis : `import { NameIcon } from '@/components/ui/lucide-animated'`
6. Utilise avec le wrapper si dans un élément cliquable

## Notes importantes

- Les icônes animées utilisent **Framer Motion** (`motion/react`)
- Elles acceptent `size` (number) au lieu de `className` pour la taille
- Le wrapper `AnimatedIconWrapper` écoute les événements hover du parent `<a>` ou `<button>`
- Certaines icônes n'existent pas (beaker, building, puzzle) - utiliser Heroicons pour celles-ci
