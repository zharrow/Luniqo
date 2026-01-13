# Plan d'Implémentation - Système de Permissions par Module

## 📋 Vue d'Ensemble

Implémentation d'un système de permissions modulaire permettant au Developer de contrôler l'accès des Owners aux fonctionnalités de Luniqo, avec une UX de monétisation SaaS moderne.

### Objectifs Validés
- ✅ Granularité par module fonctionnel (9 modules)
- ✅ Permissions par défaut: `base` uniquement (setup + nurseries)
- ✅ UX: Sidebar affiche tous les modules avec badge 🔒 pour les verrouillés
- ✅ Page verrouillée avec description, prix, vidéo/screenshots, bouton "Demander l'accès"
- ✅ Système double notification: Email + In-app
- ✅ Prix stockés en base de données
- ✅ Routes Developer: `/analytics` → `/developer/*`

---

## 🎯 Les 9 Modules

| ID | Nom | Prix/mois | Catégorie | Routes Couvertes |
|-----|-----|-----------|-----------|------------------|
| `base` | Configuration de Base | **0€ (gratuit)** | main | `/owner/dashboard`, `/owner/nurseries`, `/owner/profile`, `/owner/messages`, `/owner/users`, `/setup` |
| `cleaning` | Nettoyage | 29€ | operations | `/owner/rooms`, `/owner/tasks`, `/owner/sessions`, `/owner/history` |
| `haccp` | HACCP Traçabilité | 39€ | operations | `/owner/haccp/*` (8 sous-pages) |
| `children` | Enfants & Familles | 29€ | main | `/owner/children`, `/owner/families`, `/owner/sections` |
| `attendance` | Présences & Activités | 39€ | daily_activities | `/owner/activities`, `/owner/observations` |
| `staff` | Personnel & Planning RH | 49€ | staff_planning | `/owner/staff`, `/owner/planning`, `/owner/absences`, `/owner/compliance` |
| `enrollment` | Inscriptions & Contrats | 39€ | enrollment | `/owner/applications`, `/owner/waiting-list`, `/owner/admissions`, `/owner/contracts`, `/owner/rate-grids` |
| `billing` | Facturation | 59€ | billing | `/owner/billing` (Phase 5 - futur) |
| `parent_portal` | Portail Parents | 29€ | communication | `/owner/parent-portal` (Phase 6 - futur) |

---

## 📦 Phase 1: Base de Données

### Migration `10_module_permissions.sql`

**Nouvelle table: `module`**
```sql
CREATE TABLE module (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    price_monthly DECIMAL(10, 2) NOT NULL,
    icon_name VARCHAR(50),
    is_free BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Nouvelle table: `enterprise_module_access`** (M2M)
```sql
CREATE TABLE enterprise_module_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(enterprise_id, module_id)
);
```

**Nouvelle table: `module_access_request`**
```sql
CREATE TABLE module_access_request (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    message TEXT,
    reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_enterprise_module_access_enterprise ON enterprise_module_access(enterprise_id);
CREATE INDEX idx_enterprise_module_access_module ON enterprise_module_access(module_id);
CREATE INDEX idx_module_access_request_enterprise ON module_access_request(enterprise_id);
CREATE INDEX idx_module_access_request_status ON module_access_request(status);
```

**Seed data:** Insérer les 9 modules + accorder `base` à toutes les enterprises existantes

### Fichiers à modifier:
- ✅ `supabase/migrations/10_module_permissions.sql` (NOUVEAU)
- ✅ `types/database.types.ts` (ajouter interfaces Module, EnterpriseModuleAccess, ModuleAccessRequest)

---

## 📝 Phase 2: Configuration & Services

### 2.1 Mapping Module → Routes

**Créer `lib/config/module-routes.ts`** (NOUVEAU)

```typescript
export interface ModuleRouteMapping {
  moduleId: string
  routes: string[]
}

export const MODULE_ROUTES: ModuleRouteMapping[] = [
  { moduleId: 'base', routes: ['/owner/dashboard', '/owner/nurseries', '/owner/profile', '/owner/messages', '/owner/users', '/setup'] },
  { moduleId: 'cleaning', routes: ['/owner/rooms', '/owner/tasks', '/owner/sessions', '/owner/history'] },
  { moduleId: 'haccp', routes: ['/owner/haccp'] },
  { moduleId: 'children', routes: ['/owner/children', '/owner/families', '/owner/sections'] },
  { moduleId: 'attendance', routes: ['/owner/activities', '/owner/observations'] },
  { moduleId: 'staff', routes: ['/owner/staff', '/owner/planning', '/owner/absences', '/owner/compliance'] },
  { moduleId: 'enrollment', routes: ['/owner/applications', '/owner/waiting-list', '/owner/admissions', '/owner/contracts', '/owner/rate-grids'] },
  { moduleId: 'billing', routes: ['/owner/billing'] },
  { moduleId: 'parent_portal', routes: ['/owner/parent-portal'] }
]

export function getModuleForRoute(pathname: string): string | null {
  for (const mapping of MODULE_ROUTES) {
    if (mapping.routes.some(route => pathname.startsWith(route))) {
      return mapping.moduleId
    }
  }
  return null
}
```

### 2.2 Services

**Créer `lib/services/modules.service.ts`** (NOUVEAU)

Méthodes clés:
- `getModules()` - Liste tous les modules actifs
- `getModuleById(moduleId)` - Récupère un module
- `getEnterpriseModules(enterpriseId)` - Module IDs accessibles par une enterprise
- `hasModuleAccess(enterpriseId, moduleId)` - Vérifie accès spécifique
- `grantModuleAccess(enterpriseId, moduleId, grantedById)` - Developer accorde accès
- `revokeModuleAccess(enterpriseId, moduleId)` - Developer révoque accès
- `requestModuleAccess(enterpriseId, moduleId, ownerId, message?)` - Owner demande accès
- `getAllPendingRequests()` - Developer voit toutes les demandes
- `approveRequest(requestId, reviewedById)` - Accorde + met à jour demande
- `rejectRequest(requestId, reviewedById)` - Rejette demande

**Créer `lib/services/permissions.service.ts`** (NOUVEAU)

```typescript
import { modulesService } from './modules.service'
import { getModuleForRoute } from '@/lib/config/module-routes'

class PermissionsService {
  async canAccessRoute(enterpriseId: string, pathname: string): Promise<boolean> {
    const moduleId = getModuleForRoute(pathname)
    if (!moduleId) return true
    return await modulesService.hasModuleAccess(enterpriseId, moduleId)
  }

  async getAccessibleModules(enterpriseId: string): Promise<string[]> {
    return await modulesService.getEnterpriseModules(enterpriseId)
  }
}

export const permissionsService = new PermissionsService()
```

**Créer `lib/services/email.service.ts`** (NOUVEAU - OPTIONNEL)

Utiliser Resend pour envoyer emails au Developer quand un Owner demande accès:
```bash
npm install resend
```

`.env.local`:
```
RESEND_API_KEY=your_key
DEVELOPER_EMAIL=your-email@example.com
```

Méthodes:
- `sendModuleAccessRequest(data)` - Email au Developer

---

## 🔐 Phase 3: Auth Context Enhancement

### 3.1 Mise à jour des Types

**Fichier: `types/auth.types.ts`**

```typescript
export interface AuthSession {
  user: Profile
  role: UserRole
  enterprise?: Enterprise | null
  accessibleRooms?: string[]
  accessibleModules?: string[]  // ⬅️ NOUVEAU
}
```

### 3.2 Chargement des Permissions

**Fichier: `lib/contexts/AuthContext.tsx`**

Dans la fonction `checkSession()`, après avoir chargé l'enterprise pour un Owner:

```typescript
// For Owner, fetch their enterprise
if (profile.role === 'Owner') {
  const { data: enterprise } = await supabase
    .from('enterprise')
    .select('*')
    .eq('owner_id', profile.id)
    .single()

  authSession.enterprise = enterprise || null

  // ⬅️ NOUVEAU: Charger les modules accessibles
  if (enterprise) {
    const { data: modules } = await supabase
      .from('enterprise_module_access')
      .select('module_id')
      .eq('enterprise_id', enterprise.id)
      .eq('is_active', true)

    authSession.accessibleModules = (modules || []).map((m: any) => m.module_id)
  }
}
```

### 3.3 Helper Hook

Ajouter à la fin du fichier:

```typescript
export function useModuleAccess(moduleId: string): boolean {
  const { session } = useAuth()
  if (!session?.accessibleModules) return false
  return session.accessibleModules.includes(moduleId)
}
```

**Fichiers à modifier:**
- ✅ `types/auth.types.ts` (ajouter accessibleModules)
- ✅ `lib/contexts/AuthContext.tsx` (charger modules, ajouter useModuleAccess)

---

## 🎨 Phase 4: Sidebar avec Badges Verrouillés

### 4.1 Mise à jour de l'Interface NavItem

**Fichier: `components/layout/AppSidebar.tsx`**

```typescript
interface NavItem {
  name: string
  href: string
  icon: any
  roles?: ('Developer' | 'Owner')[]
  moduleColor?: string
  moduleId?: string  // ⬅️ NOUVEAU: identifiant du module requis
}
```

### 4.2 Ajout de `moduleId` à tous les items

Exemples:
```typescript
const mainNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/owner/dashboard', icon: HomeIcon, moduleColor: '#5a9dc9', moduleId: 'base' },
  { name: 'Crèches', href: '/owner/nurseries', icon: BuildingOffice2Icon, moduleColor: '#5a9dc9', moduleId: 'base' },
  { name: 'Enfants', href: '/owner/children', icon: UserGroupIcon, moduleColor: '#f4c2c2', moduleId: 'children' },
  { name: 'Familles', href: '/owner/families', icon: UsersIcon, moduleColor: '#e8b4d4', moduleId: 'children' },
  { name: 'Pièces', href: '/owner/rooms', icon: BuildingOfficeIcon, moduleColor: '#5a9dc9', moduleId: 'cleaning' },
  // ... etc pour tous les items
]

const operationsNavigation: NavItem[] = [
  { name: 'Sessions', href: '/owner/sessions', icon: CalendarIcon, moduleColor: '#5a9dc9', moduleId: 'cleaning' },
  { name: 'Historique', href: '/owner/history', icon: ClockIcon, moduleColor: '#5a9dc9', moduleId: 'cleaning' },
  { name: 'HACCP', href: '/owner/haccp', icon: BeakerIcon, moduleColor: '#81c995', moduleId: 'haccp' },
]

// ... etc pour toutes les sections
```

### 4.3 Logique de Rendu avec Badges

```typescript
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/badge'

export function AppSidebar() {
  const { session, role } = useAuth()

  // Helper: vérifie si l'Owner a accès au module
  const hasModuleAccess = (moduleId?: string) => {
    if (!moduleId) return true  // Pas de module = accessible
    if (role !== 'Owner') return true  // Seuls les Owners sont filtrés
    return session?.accessibleModules?.includes(moduleId) || false
  }

  return (
    <Sidebar>
      {/* ... Header ... */}

      <SidebarContent>
        {/* Pour chaque groupe de navigation */}
        {filteredMainNav.length > 0 && (
          <SidebarGroup className="px-2">
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainNav.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                  const isLocked = !hasModuleAccess(item.moduleId)
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive && !isLocked}
                        tooltip={item.name}
                        className={
                          isActive && !isLocked
                            ? 'text-white rounded-md'
                            : isLocked
                            ? 'opacity-60 rounded-md'
                            : 'rounded-md'
                        }
                        style={
                          isActive && !isLocked && item.moduleColor
                            ? { background: `linear-gradient(to right, ${item.moduleColor}, ${item.moduleColor}dd)` }
                            : {}
                        }
                      >
                        <Link
                          href={isLocked ? `/owner/locked/${item.moduleId}` : item.href}
                          className="flex items-center gap-2 relative group/item"
                        >
                          <Icon className="w-5 h-5 transition-transform duration-300 group-hover/item:scale-110" />
                          <span>{item.name}</span>
                          {isLocked && (
                            <Badge variant="outline" size="sm" className="ml-auto">
                              <LockClosedIcon className="w-3 h-3" />
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Répéter pour tous les groupes: operations, dailyActivities, staffPlanning, enrollment, communication */}
      </SidebarContent>
    </Sidebar>
  )
}
```

**Fichiers à modifier:**
- ✅ `components/layout/AppSidebar.tsx` (ajouter moduleId + badges + logique de verrouillage)

---

## 🔒 Phase 5: Page Verrouillée

### 5.1 Structure de la Page

**Créer `app/(owner)/owner/locked/[moduleId]/page.tsx`** (NOUVEAU)

Composant affichant:
- **Icon de cadenas** avec gradient
- **Nom du module** (récupéré depuis la base)
- **Description** détaillée
- **Prix** (badge "XX€ / mois")
- **Liste des fonctionnalités** (checkmarks verts)
- **Vidéo YouTube** (iframe) - optionnel selon moduleId
- **Screenshot/Preview** - optionnel
- **Bouton "Demander l'accès"** (ou message "Demande envoyée" si déjà demandé)
- **Bouton "En savoir plus"** (redirect vers site vitrine - désactivé si pas d'URL)

### 5.2 Fonctionnalités par Module

Créer un helper pour mapper les features:

```typescript
function getModuleFeatures(moduleId: string): string[] {
  const features: Record<string, string[]> = {
    cleaning: [
      'Gestion complète des pièces et zones',
      'Tâches personnalisées par pièce',
      'Sessions quotidiennes avec suivi temps réel',
      'Historique complet avec recherche',
      'Photos avant/après',
      'Exports PDF et ZIP'
    ],
    haccp: [
      'Suivi des enfants et régimes alimentaires',
      'Gestion des repas et traçabilité',
      'Contrôles de températures automatisés',
      'Gestion produits et fournisseurs',
      'Équipements et maintenance',
      'Documents et non-conformités',
      'Rapports HACCP réglementaires'
    ],
    children: [
      'Dossier complet par enfant',
      'Gestion des familles et contacts',
      'Organisation par sections',
      'Suivi des autorisations',
      'Informations de santé',
      'Documents administratifs'
    ],
    attendance: [
      'Pointages arrivée/départ',
      'Journal des activités',
      'Suivi des observations',
      'Rapports quotidiens automatiques',
      'Notifications parents'
    ],
    staff: [
      'Gestion des qualifications',
      'Planning du personnel',
      'Suivi des absences',
      'Conformité réglementaire (ratios)',
      'Documents RH',
      'Disponibilités et affectations'
    ],
    enrollment: [
      'Pré-inscriptions en ligne',
      'Liste d\'attente avec priorisation',
      'Processus d\'admission',
      'Contrats d\'accueil personnalisés',
      'Grilles tarifaires (PSU, PAJE, privé)',
      'Avenants et résiliations'
    ],
    billing: [
      'Facturation automatique',
      'Suivi des paiements',
      'Relances automatiques',
      'Comptabilité intégrée',
      'Exports comptables',
      'Rapports financiers'
    ],
    parent_portal: [
      'Application mobile parents',
      'Suivi en temps réel',
      'Photos et activités quotidiennes',
      'Messagerie instantanée',
      'Documents partagés',
      'Notifications push'
    ]
  }
  return features[moduleId] || []
}
```

### 5.3 Logique de Demande d'Accès

```typescript
async function handleRequestAccess() {
  try {
    // 1. Créer la demande via modulesService.requestModuleAccess()
    await modulesService.requestModuleAccess(enterpriseId, moduleId, ownerId, message)

    // 2. Envoyer email au Developer (optionnel)
    if (emailService) {
      await emailService.sendModuleAccessRequest({
        enterpriseName: session.enterprise.name,
        moduleName: module.name,
        ownerName: `${session.user.first_name} ${session.user.last_name}`,
        ownerEmail: session.user.email
      })
    }

    // 3. Afficher message de succès
    toast.success('Demande envoyée avec succès!')

    // 4. Reload pour afficher "Demande en attente"
    router.refresh()
  } catch (error) {
    toast.error('Erreur lors de l\'envoi de la demande')
  }
}
```

**Fichiers à créer:**
- ✅ `app/(owner)/owner/locked/[moduleId]/page.tsx` (NOUVEAU)

---

## 🛠️ Phase 6: Interface Developer

### 6.1 Renommer `/analytics` → `/developer/dashboard`

**Fichiers à modifier:**

1. **Renommer le dossier:**
   - `app/(developer)/analytics/` → `app/(developer)/developer/dashboard/`

2. **Mettre à jour les références:**
   - `components/layout/AppSidebar.tsx` (ligne 93): `href: '/analytics'` → `href: '/developer/dashboard'`
   - `components/layout/Header.tsx` (ligne 195): `'/analytics'` → `'/developer/dashboard'`
   - `components/layout/DeveloperLayout.tsx` (ligne 27): `href: '/analytics'` → `href: '/developer/dashboard'`
   - `lib/contexts/AuthContext.tsx` (ligne 244): `router.push('/analytics')` → `router.push('/developer/dashboard')`
   - `CLAUDE.md` (documentation): Remplacer toutes les mentions `/analytics` par `/developer/dashboard`

3. **Optionnel - Supprimer:**
   - `components/layout/Sidebar.tsx` (legacy, inutilisé)

### 6.2 Créer Page de Gestion des Permissions

**Créer `app/(developer)/developer/permissions/page.tsx`** (NOUVEAU)

Structure à 2 onglets (Tabs shadcn/ui):

**Onglet 1: Gestion des Crèches**
- Liste toutes les enterprises (tableau)
- Colonnes: Nom, Owner, Modules actifs (badge "3 / 9"), Actions
- Click sur une row → Expand pour afficher grid de modules
- Grid de modules avec toggles:
  - Nom du module + icon
  - Prix
  - Toggle switch (on/off)
  - Module `base` désactivé (toujours on)
- Actions: Grant/Revoke via `modulesService.grantModuleAccess()` / `revokeModuleAccess()`

**Onglet 2: Demandes en Attente**
- Liste des `module_access_request` avec `status = 'pending'`
- Colonnes: Date, Crèche, Module, Owner, Message, Actions
- Actions: Approve (✅) / Reject (❌)
- Approve → Appelle `modulesService.approveRequest()` (grants access + updates request)
- Reject → Appelle `modulesService.rejectRequest()` (updates status only)
- Empty state si aucune demande

**Composants à créer:**
- `EnterpriseModuleGrid` - Grid de modules avec toggles
- `ModuleAccessRequestList` - Liste des demandes

### 6.3 Ajouter à la Sidebar Developer

Dans `AppSidebar.tsx`, ajouter au groupe `communicationNavigation`:

```typescript
{
  name: 'Permissions',
  href: '/developer/permissions',
  icon: LockClosedIcon,
  roles: ['Developer'],
  moduleColor: '#b39ddb'
}
```

**Fichiers à modifier:**
- ✅ Renommer: `app/(developer)/analytics/` → `app/(developer)/developer/dashboard/`
- ✅ `components/layout/AppSidebar.tsx` (mettre à jour href + ajouter Permissions)
- ✅ `components/layout/Header.tsx` (mettre à jour href)
- ✅ `components/layout/DeveloperLayout.tsx` (mettre à jour href)
- ✅ `lib/contexts/AuthContext.tsx` (mettre à jour redirect)
- ✅ `CLAUDE.md` (documentation)

**Fichiers à créer:**
- ✅ `app/(developer)/developer/permissions/page.tsx` (NOUVEAU)

---

## 🛡️ Phase 7: Protection des Routes (Optionnel)

### 7.1 Guard Client-Side dans Layout Owner

**Fichier: `app/(owner)/owner/layout.tsx`**

Ajouter après le `useRequireAuth(['Owner'])`:

```typescript
'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getModuleForRoute } from '@/lib/config/module-routes'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useRequireAuth(['Owner'])
  const pathname = usePathname()
  const router = useRouter()

  // Protection des routes par module
  useEffect(() => {
    if (isLoading || !session) return

    // Skip la page locked elle-même
    if (pathname.startsWith('/owner/locked/')) return

    const requiredModule = getModuleForRoute(pathname)

    if (requiredModule) {
      const hasAccess = session.accessibleModules?.includes(requiredModule)
      if (!hasAccess) {
        router.push(`/owner/locked/${requiredModule}`)
      }
    }
  }, [pathname, session, isLoading, router])

  // ... reste du layout
}
```

**Note:** Cette protection est OPTIONNELLE car la sidebar redirige déjà vers la page verrouillée. Cependant, elle protège contre l'accès direct par URL.

**Fichiers à modifier (optionnel):**
- ⚠️ `app/(owner)/owner/layout.tsx` (ajouter guard)

---

## 📊 Ordre d'Implémentation Recommandé

### Étape 1: Foundation (Base de Données + Types)
1. ✅ Créer migration `supabase/migrations/10_module_permissions.sql`
2. ✅ Appliquer migration en local
3. ✅ Mettre à jour `types/database.types.ts`
4. ✅ Créer `types/auth.types.ts` (ajouter accessibleModules)
5. ✅ Vérifier avec queries SQL que tout fonctionne

### Étape 2: Configuration & Services
6. ✅ Créer `lib/config/module-routes.ts`
7. ✅ Créer `lib/services/modules.service.ts`
8. ✅ Créer `lib/services/permissions.service.ts`
9. ✅ Tester les services avec des queries directes

### Étape 3: Auth Context
10. ✅ Mettre à jour `lib/contexts/AuthContext.tsx`:
    - Charger `accessibleModules` dans `checkSession()`
    - Ajouter hook `useModuleAccess()`
11. ✅ Tester en console que les modules sont bien chargés

### Étape 4: UI - Sidebar
12. ✅ Mettre à jour `components/layout/AppSidebar.tsx`:
    - Ajouter `moduleId` à tous les NavItem
    - Implémenter logique de badges verrouillés
    - Tester visuellement chaque groupe de navigation

### Étape 5: UI - Page Verrouillée
13. ✅ Créer `app/(owner)/owner/locked/[moduleId]/page.tsx`
14. ✅ Tester le flow complet: Click sidebar → Page locked → Demander accès

### Étape 6: Developer Interface
15. ✅ Renommer routes `/analytics` → `/developer/dashboard` (6 fichiers)
16. ✅ Créer `app/(developer)/developer/permissions/page.tsx`
17. ✅ Tester le flow: Grant access → Refresh owner session → Voir module déverrouillé

### Étape 7: Email (Optionnel)
18. ⚠️ Installer Resend: `npm install resend`
19. ⚠️ Créer `lib/services/email.service.ts`
20. ⚠️ Configurer `.env.local` avec `RESEND_API_KEY` et `DEVELOPER_EMAIL`
21. ⚠️ Tester l'envoi d'email

### Étape 8: Route Guard (Optionnel)
22. ⚠️ Mettre à jour `app/(owner)/owner/layout.tsx` avec guard
23. ⚠️ Tester l'accès direct par URL

### Étape 9: Documentation
24. ✅ Mettre à jour `CLAUDE.md` avec nouvelle architecture de permissions
25. ✅ Documenter les nouveaux services et patterns

---

## 🔍 Edge Cases à Gérer

### 1. Owner navigue manuellement vers route verrouillée
**Solution:** Layout guard (Phase 7) redirige vers `/owner/locked/[moduleId]`

### 2. Module désactivé pendant que l'Owner l'utilise
**Solution:** Session refresh (5-min TTL) détecte le changement, prochaine navigation redirige vers locked page

### 3. Developer essaie de désactiver module `base`
**Solution:** Toggle désactivé dans UI (module.is_free), optionnel DB trigger

### 4. Demande d'accès en double
**Solution:** Avant de créer, vérifier qu'aucune demande `pending` n'existe déjà pour ce (enterprise, module)

### 5. Cache de session après changement de permission
**Solution:**
- Simple: Notifier owner de refresh la page
- Avancé: Real-time subscription Supabase sur `enterprise_module_access`

---

## 📁 Résumé des Fichiers

### Nouveaux Fichiers (8)
- `supabase/migrations/10_module_permissions.sql`
- `lib/config/module-routes.ts`
- `lib/services/modules.service.ts`
- `lib/services/permissions.service.ts`
- `lib/services/email.service.ts` (optionnel)
- `app/(owner)/owner/locked/[moduleId]/page.tsx`
- `app/(developer)/developer/permissions/page.tsx`
- Renommer: `app/(developer)/analytics/` → `app/(developer)/developer/dashboard/`

### Fichiers à Modifier (6)
- `types/database.types.ts`
- `types/auth.types.ts`
- `lib/contexts/AuthContext.tsx`
- `components/layout/AppSidebar.tsx`
- `components/layout/Header.tsx`
- `components/layout/DeveloperLayout.tsx`
- `CLAUDE.md`
- `app/(owner)/owner/layout.tsx` (optionnel)

---

## 🎯 Critères de Succès

### Tests Fonctionnels
1. ✅ Nouveau owner créé → Seul module `base` actif
2. ✅ Owner voit tous les modules dans sidebar, verrouillés avec badge 🔒
3. ✅ Click sur module verrouillé → Page locked affichée
4. ✅ Click "Demander l'accès" → Demande créée + email envoyé (si configuré)
5. ✅ Developer voit demande dans `/developer/permissions`
6. ✅ Developer approve → Owner refresh → Module déverrouillé
7. ✅ Owner peut maintenant accéder aux pages du module
8. ✅ Developer révoque accès → Owner redirigé vers locked page au prochain clic

### Performance
- ✅ Aucun ralentissement de navigation (permissions en cache dans session)
- ✅ Sidebar render < 50ms
- ✅ Pas de DB queries supplémentaires dans middleware

### UX
- ✅ Transitions fluides entre états locked/unlocked
- ✅ Messages clairs et professionnels
- ✅ Design cohérent avec "Douceur Professionnelle"
- ✅ Responsive (mobile + desktop)

---

## 🚀 Prêt pour l'Implémentation!

Ce plan est complet et peut être exécuté étape par étape. Chaque phase est indépendante et testable séparément.
