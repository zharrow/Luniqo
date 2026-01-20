# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Structure

**IMPORTANT**: At the start of each new conversation, read these documents in order:

1. **CLAUDE.md** (this file) - Project architecture and technical guidelines
2. **ROADMAP.md** - Current tasks, bugs, and roadmap
3. **DESIGN-SYSTEM.md** - Complete design system, components catalog, and UI patterns
4. **COMPONENT.md** - List of all reusable components

## Project Overview

**Luniqo** (formerly cLean) is a modern childcare management application with HACCP traceability, built with Next.js 15 and Supabase. It serves French-speaking users (crèches) with a soft pastel design system and features a friendly baby mascot with the letter "L".

## Development Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000

# Build & Production
npm run build            # Build for production
npm run start            # Run production server

# Database
npm run seed             # Seed database with initial data
npm run db:reset         # Reset and reseed database

# Linting
npm run lint             # Run ESLint
```

## Architecture

### Multi-Tier Authentication System

The application has 3 distinct user roles with **unified architecture**:

**ALL users** are stored in:
- `auth.users` (Supabase Auth - managed automatically)
- `profiles` table (1:1 with auth.users - application data)

---

1. **Developer (Platform Developer)**
   - Auth: Supabase Auth (email/password)
   - Table: `profiles` (where role = 'Developer')
   - Access: Analytics dashboard (`/developer/dashboard`)
   - Can create owners and view global metrics
   - Login: `/login` with email/password

2. **Owner (Childcare Owner/Manager)**
   - Auth: Supabase Auth (email/password)
   - Table: `profiles` (where role = 'Owner')
   - Linked to: `enterprise` via `enterprise.owner_id`
   - Access: Full back-office (route group `(owner)`)
   - Routes: `/owner/dashboard`, `/owner/profil`, `/owner/haccp`, `/owner/rooms`, `/owner/users`, `/owner/sessions`, etc.
   - Manages one childcare facility (1 owner = 1 enterprise)
   - **First login flow**: Owner without enterprise is redirected to `/setup` to create their enterprise
   - Login: `/login` with email/password → redirects to `/owner/dashboard`

3. **Employee (Childcare Staff)**
   - Auth: **Dual authentication system**
   - Table: `profiles` (where role = 'Employee')
   - Linked to: `enterprise` via `profiles.enterprise_id`

   **Two login methods:**

   a) **Dashboard Login** (`/login`)
      - Method: Email + Password (Supabase Auth)
      - Device: Desktop/Mobile
      - Access: Route group `(employee)` - `/employee/dashboard`, `/employee/profile`, `/employee/calendar`, `/employee/history`
      - Features: Profile, history, calendar, stats, PIN management

   b) **Tablet Login** (`/tablet/login`)
      - Method: Username + PIN (custom auth)
      - Device: Tablet
      - Access: Route group `(tablet)` - `/tablet/*`
      - Features: Daily tasks only (quick access)
      - **Username**: Auto-generated (e.g., "Marie D")
      - **PIN**: 4 digits, bcrypt hashed, chosen by employee
      - **Storage**: Session in localStorage as `user_session`

   **Important**: Employees have BOTH email/password (for dashboard) AND username/PIN (for tablet)

### Route Structure

The app uses Next.js App Router with **role-based route groups** for clear separation:

- `(auth)/` - Public authentication pages
  - `/login` - Universal login (email/password for Developer/Owner/Employee)

- `(owner)/` - **Owner routes** (Protected - Owner only)
  - `/owner/dashboard` - Owner dashboard (home)
  - `/owner/profil` - Owner profile with enterprise management
  - `/owner/haccp` - HACCP module main page
  - `/owner/rooms`, `/owner/rooms/[id]` - Room management
  - `/owner/users` - Employee management
  - `/owner/sessions`, `/owner/sessions/[id]` - Cleaning sessions
  - `/owner/tasks` - Task templates
  - `/owner/history` - Cleaning history
  - `/owner/messages`, `/owner/messages/[id]` - Support messages
  - `/owner/notifications` - Notifications center
  - `/setup` - First-time enterprise creation (owners without enterprise)

- `(employee)/` - **Employee routes** (Protected - Employee only)
  - `/employee/dashboard` - Employee dashboard (home)
  - `/employee/profile` - Employee profile & PIN management
  - `/employee/calendar` - Personal task calendar
  - `/employee/history` - Personal task history

- `(developer)/` - **Developer routes** (Protected - Developer only)
  - `/developer/dashboard` - Platform analytics and metrics

- `(tablet)/` - **Tablet interface** for employees (PIN-based quick access)
  - `/tablet/login` - Employee username + PIN login
  - `/tablet/room/[id]` - Room cleaning interface
  - `/tablet/haccp/*` - HACCP data entry

### Multi-Site Architecture (Phase 0)

**NEW (2025-12-22)**: The application now supports **multiple nurseries per enterprise**.

#### Architectural Levels

```
Enterprise (Commercial Account)
  └── Owner (1 owner per enterprise)
  └── Nursery 1 (Physical establishment)
       └── Rooms, Tasks, Sessions, HACCP data
  └── Nursery 2 (Physical establishment)
       └── Rooms, Tasks, Sessions, HACCP data
  └── Nursery 3 (Physical establishment)
       └── Rooms, Tasks, Sessions, HACCP data
```

**Key Concepts:**
- **Enterprise**: Commercial account level (billing, owner management)
- **Nursery**: Physical childcare establishment (operations)
- **Operational data** is isolated per nursery (rooms, sessions, HACCP)
- **Shared resources** remain at enterprise level (task templates, employees)

#### Database Schema Changes

**New Tables:**
- `nursery` - Physical establishments
  - `id` UUID PRIMARY KEY
  - `enterprise_id` UUID → `enterprise.id`
  - `name` VARCHAR(255)
  - `address`, `city`, `postal_code`, `phone`, `email`
  - `is_default` BOOLEAN (first nursery created)
  - `is_active` BOOLEAN

- `employee_nursery_access` - M2M relationship (employees ↔ nurseries)
  - `employee_id` UUID → `profiles.id`
  - `nursery_id` UUID → `nursery.id`

**Migrated Tables (enterprise_id → nursery_id):**
- `room`, `daily_cleaning_session`, `child`, `meal`, `child_meal_record`
- `temperature_check`, `product`, `batch`, `equipment`
- `food_area_cleaning`, `haccp_incident`, `document`

**Profiles Table Update:**
- Added `primary_nursery_id` UUID → `nursery.id` (for employees)

#### Using NurseryContext

**CRITICAL**: All operational pages must use `useNursery()` hook:

```typescript
import { useNursery } from '@/lib/contexts/NurseryContext'

export default function MyPage() {
  const { selectedNursery, nurseries, setSelectedNursery, isLoading } = useNursery()

  useEffect(() => {
    if (selectedNursery?.id) {
      loadData(selectedNursery.id)
    }
  }, [selectedNursery?.id])

  async function loadData(nurseryId: string) {
    const rooms = await roomsService.getActive(nurseryId)
    // ...
  }
}
```

**NurserySelector Component:**
- Located in Header for easy switching between nurseries
- Persists selection in localStorage
- Auto-selects default nursery on first load
- Shows read-only label if only one nursery

#### Service Layer Updates

All operational services now use `nurseryId` instead of `enterpriseId`:

```typescript
// ✅ CORRECT - Use nursery_id for operational data
await roomsService.getActive(nurseryId)
await sessionsService.getToday(nurseryId)
await haccpService.getChildren(nurseryId)

// ✅ CORRECT - Use enterprise_id for enterprise-level data
await usersService.getEmployees(enterpriseId)
await tasksService.getTemplates(enterpriseId)
```

#### Setup Flow Update

When an Owner creates their enterprise for the first time:
1. `/setup` page shows 2-step wizard
2. Step 1: Create enterprise (name, address, etc.)
3. Step 2: Create first nursery (inherits enterprise info, `is_default = true`)
4. Redirect to `/owner/dashboard`

### Supabase Client Patterns

Always use the correct client for the context:

```typescript
// Client components (use client directive)
import { createClient } from '@/lib/supabase/client'

// Server components & Server Actions
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // Note: async call

// Middleware
import { updateSession } from '@/lib/supabase/middleware'
```

### Authentication Utilities

Located in `lib/utils/auth.client.ts` and `lib/contexts/AuthContext.tsx`:

```typescript
// In client components
import { useAuth, useRequireAuth } from '@/lib/contexts/AuthContext'

// Protect pages
const { session, isLoading } = useRequireAuth(['Owner']) // or ['Developer'] or ['Employee']

// Login methods
const { loginWithEmail, loginWithPin, logout, refreshSession } = useAuth()
```

### Data Isolation

**CRITICAL**: All queries MUST filter correctly to prevent data leakage:

**For Operational Data (rooms, sessions, HACCP):**
```typescript
// ✅ CORRECT - Filter by nursery_id
const { data } = await supabase
  .from('room')
  .select('*')
  .eq('nursery_id', selectedNursery.id)

// ❌ WRONG - Returns data from ALL nurseries
const { data } = await supabase.from('room').select('*')
```

**For Enterprise-Level Data (employees, task templates):**
```typescript
// ✅ CORRECT - Filter by enterprise_id
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'Employee')
  .eq('enterprise_id', session.enterprise.id)
```

The only exception is the Developer role, which can query across enterprises for analytics.

### Profile-Enterprise Relationship

**IMPORTANT**: The relationships are:

**For Owners:**
- `enterprise.owner_id` references `profiles.id` (where role = 'Owner')
- One owner can have ZERO or ONE enterprise
- To fetch an owner's enterprise:

```typescript
// ✅ CORRECT
const { data: enterprise } = await supabase
  .from('enterprise')
  .select('*')
  .eq('owner_id', profile.id)
  .single()

// ❌ WRONG - profiles table doesn't have enterprise_id for Owners
const { data: profile } = await supabase
  .from('profiles')
  .select('*, enterprise!enterprise_id(*)')
  .eq('role', 'Owner')
```

**For Employees:**
- `profiles.enterprise_id` references `enterprise.id` (for role = 'Employee')
- Many employees can belong to ONE enterprise
- To fetch employees of an enterprise:

```typescript
// ✅ CORRECT
const { data: employees } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'Employee')
  .eq('enterprise_id', enterprise.id)
```

### Username Generation (Employees Only)

Employees get an auto-generated `username` for quick tablet login:

**Algorithm:**
1. Base format: `${firstName} ${lastName[0].toUpperCase()}`
2. Examples: "Marie Dupont" → "Marie D", "Sophie Laurent" → "Sophie L"
3. **Collision handling**: If username exists, append letters from last name
   - "Marie D" exists → Try "Marie Du"
   - "Marie Du" exists → Try "Marie Dup"
   - Until unique or full last name used

**Implementation:**
```typescript
// lib/utils/username.ts
export async function generateUniqueUsername(
  firstName: string,
  lastName: string,
  supabase: SupabaseClient
): Promise<string> {
  const base = `${firstName} ${lastName[0].toUpperCase()}`
  let username = base
  let suffixLength = 1

  while (true) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (!data) return username // Username is unique

    // Collision - add more letters
    suffixLength++
    if (suffixLength > lastName.length) {
      // Fallback: add number
      username = `${base}${Math.floor(Math.random() * 100)}`
      break
    }
    username = `${firstName} ${lastName.substring(0, suffixLength).toUpperCase()}`
  }

  return username
}
```

**Usage:**
- Generated automatically when Owner creates a new Employee
- Shown to Employee on first dashboard login
- Used for tablet login (username + PIN)
- Cannot be changed (tied to identity)

### First Login Flow (New Owners)

When a developer creates a new owner account:

1. Developer provides credentials to client
2. Client logs in → `AuthContext` checks for enterprise
3. **If no enterprise** → Middleware redirects to `/setup`
4. Owner fills enterprise form → Creates enterprise with `owner_id`
5. Session refreshes → Redirect to `/dashboard`

Key files:
- `lib/supabase/middleware.ts` - Auto-redirect logic
- `app/(dashboard)/setup/page.tsx` - Enterprise creation page
- `components/EnterpriseSetupForm.tsx` - Form component

## Database Schema

25+ tables organized into modules:

**User System (Unified Architecture)**
- `auth.users` - Supabase Auth (managed automatically)
- `profiles` - Unified user table (Developer, Owner, Employee)
  - Columns: `id`, `role`, `email`, `first_name`, `last_name`, `username` (Employee only), `pin_hash` (Employee only), `enterprise_id`, `created_by_id`, `is_active`, `created_at`, `updated_at`
  - 1:1 relationship with `auth.users` via `id`
  - Foreign key: `enterprise_id` → `enterprise.id` (for Employees)
- `enterprise` - Childcare facilities
  - Foreign key: `owner_id` → `profiles.id` (where role = 'Owner')
- `employee_room_access` - Many-to-many (employees ↔ rooms)

**Luniqo Module (Cleaning)**
- `room`, `task_template`, `assigned_task`, `daily_cleaning_session`, `task_completion`, `session_export`

**HACCP Module (Food Safety)**
- `child`, `meal`, `child_meal_record`, `temperature_check`, `product`, `supplier`, `batch`, `equipment`, `food_area_cleaning`, `haccp_incident`, `document`

**Communication**
- `support_conversation`, `message`, `notification`

**Key Schema Details:**

```sql
-- Unified profiles table (replaces developer, owner, employee)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_type NOT NULL, -- 'Developer' | 'Owner' | 'Employee'
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),

  -- Employee-specific fields
  username VARCHAR(100) UNIQUE, -- Auto-generated (e.g., "Marie D")
  pin_hash VARCHAR(255),         -- bcrypt hashed PIN for tablet login

  -- Relationships
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE, -- For Employees
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enterprise still references owner via owner_id
CREATE TABLE enterprise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  ...
);
```

**Automatic Profile Creation:**
A database trigger automatically creates a profile when a user signs up via Supabase Auth.

Schema is located in `supabase/migrations/01_unified_profiles.sql`.

## Key Patterns & Conventions

### Component Organization

```
components/
  ui/           - shadcn/ui components (button, card, badge, etc.)
  layout/       - Layout components (Header, AppSidebar, DashboardLayout)
  shared/       - Shared components across modules
  analytics/    - Analytics-specific components
  theme/        - Theme-related components
```

**See DESIGN-SYSTEM.md for complete component catalog and usage patterns.**

### Type Definitions

```
types/
  database.types.ts  - Supabase generated types
  auth.types.ts      - Authentication types
  analytics.types.ts - Analytics types
```

### Design System

**See DESIGN-SYSTEM.md for complete design guidelines.**

Quick reference:
- **Primary** (Blue): `#5a9dc9` - Cleanliness, serenity
- **Secondary** (Pink): `#f4c2c2` - Warmth, childcare
- **Accent** (Yellow): `#ffe5b4` - Positive actions
- **Success** (Mint): `#b5ead7` - HACCP compliance

Tailwind CSS v4 with pastel palette. Use shadcn/ui components for consistency.

### Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Important Implementation Notes

1. **Employee Dual Authentication**: Employees have TWO login methods:
   - **Dashboard**: Email/Password via Supabase Auth (standard)
   - **Tablet**: Username/PIN via custom auth (localStorage session)
   - Check `lib/utils/auth.client.ts` for `loginWithEmail()`, `loginWithPin()`, and `loginEmployeeWithPin()`
   - Username is auto-generated (e.g., "Marie D") and stored in `profiles.username`

2. **Context Providers**: The app uses two context providers wrapped in `components/Providers.tsx`:
   - `ThemeProvider` - Theme management
   - `AuthProvider` - Authentication state (with `refreshSession()` method)

3. **Middleware**: Uses `@supabase/ssr` for session management. Automatically redirects owners without enterprise to `/setup`. See `middleware.ts` and `lib/supabase/middleware.ts`.

4. **TypeScript**: Strict mode enabled. Path alias `@/*` maps to project root. Use `as unknown as Type` or `as any` for complex Supabase types if needed.

5. **React & Next.js Versions**: Uses React 19 and Next.js 16 (App Router) - be aware of breaking changes from earlier versions.

6. **bcryptjs for PIN Hashing**: Employee PINs are hashed with bcrypt before storage. Always use `verifyPin()` for comparison.

7. **Sidebar Navigation**: The `isActive` logic for `/dashboard` must check exact equality to avoid highlighting on all sub-routes. See `components/layout/AppSidebar.tsx`.

8. **Select Components**: Never use `value=""` in shadcn Select components. Use `value="none"` instead and convert to empty string in handlers. See DESIGN-SYSTEM.md for pattern.

9. **Date and Timezone Handling**: **CRITICAL** - Always use local timezone date utilities from `lib/utils/date.ts` to avoid timezone bugs:
   - **NEVER** use `toISOString().split('T')[0]` for date formatting - this converts to UTC and causes timezone mismatches
   - **ALWAYS** use `formatDateLocal(date)` to format Date objects to YYYY-MM-DD in local timezone
   - **ALWAYS** use `getTodayLocal()` to get today's date as YYYY-MM-DD in local timezone
   - Use `getDateWithOffset(offset)` for dates with day offsets
   - **Example of the bug**: December 3rd at 01:00 in France (UTC+1) becomes December 2nd when using `toISOString()` because it converts to UTC
   - See [lib/utils/date.ts](lib/utils/date.ts:1-27) for the utility functions

10. **Session Persistence**: **CRITICAL** - Session is pre-loaded from localStorage to prevent disconnection on tab switch:
   - Session stored in localStorage with 5-minute TTL (`luniqo_auth_session` + `luniqo_auth_timestamp`)
   - `useState` initializer loads session synchronously BEFORE first render
   - `isLoading` initialized based on session presence (`false` if session exists)
   - `hasInitialized` ref prevents `useEffect` from re-executing on component remount
   - Background session refresh uses silent mode (`checkSession(force, silent)`) to avoid blocking UI
   - **Result**: Users can switch tabs/apps without seeing loading screen or being disconnected
   - See [lib/contexts/AuthContext.tsx](lib/contexts/AuthContext.tsx:24-70) for implementation

## Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and add credentials
3. Run schema: Copy `supabase/migrations/00_schema.sql` into Supabase SQL Editor
4. Seed data: `npm run seed`

Full setup guide: `SUPABASE_SETUP.md`

## Testing New Features

When adding features that involve database operations:

1. Verify you're filtering by `enterprise_id`
2. Test with different role types (Developer, Owner, Employee)
3. Check the appropriate authentication method is used
4. Ensure tablet interface uses large touch targets when in tablet context
5. Use shadcn/ui components (check DESIGN-SYSTEM.md first)
6. Follow responsive patterns (mobile-first)
7. Add loading states and empty states
8. Include success/error messages

## UI Component Checklist

When creating a new page:

- [ ] Use `DashboardLayout` or `DeveloperLayout`
- [ ] Protect with `useRequireAuth(['Owner'])` or appropriate role
- [ ] Filter all queries by `enterprise_id`
- [ ] Add loading state (`isLoading` + `LoadingSpinner`)
- [ ] Add empty state (`EmptyState` component)
- [ ] Include success/error messages (Card with colored bg)
- [ ] Use shadcn/ui components (Button, Card, Input, Select, Badge, etc.)
- [ ] Follow responsive grid pattern (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- [ ] Add Heroicons for visual clarity
- [ ] Use pastel color palette

**Refer to DESIGN-SYSTEM.md for detailed patterns and examples.**

## Performance Optimizations

The app has been heavily optimized for fast page transitions and reduced latency:

1. **Next.js 15 (Stable)** - Downgraded from Next.js 16 for stability and better performance
2. **React 18** - Downgraded from React 19 for ecosystem compatibility
3. **Removed `force-dynamic`** - Allows Next.js to cache and optimize pages automatically
4. **Session Pre-loading (5min TTL)** - Session loaded synchronously from localStorage before first render
5. **Silent Background Refresh** - Session checks happen invisibly without blocking UI
6. **Optimized Middleware** - Removed expensive DB queries from middleware (moved to client-side)
7. **Reduced Timeout** - Session check timeout reduced from 30s to 5s for faster error detection
8. **Optimistic Client Cache** - Enabled in Next.js config for instant navigation
9. **Package Import Optimization** - Tree-shaking for @heroicons/react and recharts
10. **Loading States** - Added loading.tsx files for instant feedback during navigation
11. **useEffect Guard** - Prevents multiple re-executions with `hasInitialized` ref

**Key files modified:**
- [lib/contexts/AuthContext.tsx](lib/contexts/AuthContext.tsx:24-70) - Session pre-loading, silent mode, initialization guard
- [lib/supabase/middleware.ts](lib/supabase/middleware.ts:61-62) - Removed admin/enterprise checks
- [app/(owner)/layout.tsx](app/(owner)/layout.tsx:8) - Added force-dynamic for protected routes
- [app/(employee)/layout.tsx](app/(employee)/layout.tsx:8) - Added force-dynamic for protected routes
- [app/(developer)/layout.tsx](app/(developer)/layout.tsx:5) - Added force-dynamic for protected routes
- [next.config.mjs](next.config.mjs:16-23) - Static page generation timeout and build ID

## Recent Updates

- 🔐 **NURSERY MODULE ACCESS SYSTEM** (2026-01-20) - Granular module permissions per nursery 🔄 **IN PROGRESS**
  - **Feature**: Each nursery can now have its own module subscriptions (not just enterprise-level)
  - **Architecture**:
    - Before: Enterprise → [modules] (all nurseries same modules)
    - After: Nursery → [modules] (each nursery can have different modules)
  - **Database** (`62_nursery_module_access.sql`):
    - New table `nursery_module_access` - Per-nursery module permissions
    - New table `nursery_module_access_request` - Per-nursery access requests
    - Migration from `enterprise_module_access` to `nursery_module_access`
    - Added "analytics" module to catalog
    - Performance indexes and triggers
  - **Service** (`lib/services/modules.service.ts`):
    - `getEnterprisesWithNurseries()` - Hierarchical view for Developer
    - `getNurseryModules(nurseryId)` - Get modules for a nursery
    - `hasNurseryModuleAccess(nurseryId, moduleId)` - Check access
    - `grantNurseryModuleAccess()` / `revokeNurseryModuleAccess()`
    - `updateNurseryModules()` - Bulk update
    - Request management methods for nursery-level
  - **Developer Portal**:
    - `/developer/permissions` - Hierarchical UI: Enterprise → Nurseries → Modules
      - Toggle switches per module per nursery
      - MRR calculation per nursery and enterprise
      - Pending requests tab
    - `/developer/enterprises` - Enterprise management page
    - Updated `DeveloperSidebar.tsx` navigation
  - **New Components**:
    - `components/ui/dialog.tsx` - shadcn Dialog component
  - **Files modified**:
    - ✅ `supabase/migrations/62_nursery_module_access.sql`
    - ✅ `lib/services/modules.service.ts` (+338 lines)
    - ✅ `app/(developer)/developer/permissions/page.tsx` (refactored)
    - ✅ `app/(developer)/developer/enterprises/page.tsx` (new)
    - ✅ `components/layout/DeveloperSidebar.tsx`
    - ✅ `components/ui/dialog.tsx` (new)
  - **Prochaines étapes**:
    - ⏳ Appliquer migration en base de données
    - ⏳ Tester avec données réelles
    - ⏳ Ajouter vérification permissions côté Owner sidebar
  - **Status**: 🔄 **In Progress** - Migration ready, UI complete, needs testing

- 🐛 **EMPLOYEE-NURSERY FILTERING & BUG FIXES** (2025-12-22) - Multi-nursery assignments and proper data filtering ✅ **COMPLETED**
  - **Problem**: Multiple bugs related to employee-nursery relationships and data filtering
    1. SQL constraint blocked creating multiple non-default nurseries
    2. Tasks/categories incorrectly used `nursery_id` instead of `enterprise_id`
    3. Employees couldn't be assigned to multiple nurseries
    4. Employee lists showed all enterprise employees instead of filtering by selected nursery
  - **Solutions implemented**:
    - **Migration 09**: Fixed `unique_default_per_enterprise` constraint
      - Replaced `UNIQUE (enterprise_id, is_default)` with partial index `WHERE is_default = true`
      - Allows: ✅ One default nursery + unlimited non-default nurseries per enterprise
    - **Service enhancements** ([users.service.ts](lib/services/users.service.ts:1)):
      - Added `getEmployeesByNursery(nurseryId)` - Filter employees by nursery assignment
      - Added `getActiveEmployeesByNursery(nurseryId)` - Only active employees
      - Added `updateNurseryAccess(employeeId, nurseryIds)` - Manage nursery assignments
      - Added `getEmployeeNurseries(employeeId)` - Get nursery IDs for an employee
      - Updated `ProfileWithRooms` to include `accessible_nurseries` array
      - Updated `CreateEmployeeInput` to include `nursery_ids` array
    - **Page fixes**:
      - ✅ [tasks/page.tsx](app/(owner)/owner/tasks/page.tsx:70-71) - Use `enterprise_id` for shared resources
      - ✅ [users/page.tsx](app/(owner)/owner/users/page.tsx:74) - Filter by nursery + multi-nursery selection form
      - ✅ [sessions/[id]/page.tsx](app/(owner)/owner/sessions/[id]/page.tsx:162) - Filter employees by nursery
      - ✅ [haccp/meals/page.tsx](app/(owner)/owner/haccp/meals/page.tsx:69) - Use `getEmployeesByNursery`
      - ✅ [haccp/non-compliances/page.tsx](app/(owner)/owner/haccp/non-compliances/page.tsx:57) - Use `getEmployeesByNursery`
  - **Employee form improvements**:
    - New "Crèches assignées" field with multi-select checkboxes
    - Auto-selects current nursery when creating new employee
    - Shows all enterprise nurseries for assignment
    - Updates both nursery and room access on save
  - **Architecture clarity**:
    - **Shared at Enterprise level**: Employees, Task Templates, Task Categories
    - **Isolated per Nursery**: Rooms, Sessions, HACCP data
    - Employees can work at multiple nurseries via `employee_nursery_access` (M2M)
  - **Files modified**:
    - ✅ `supabase/migrations/09_fix_nursery_constraint.sql` - Partial unique index
    - ✅ `lib/services/users.service.ts` - Nursery filtering methods
    - ✅ `app/(owner)/owner/tasks/page.tsx` - Enterprise-level resources
    - ✅ `app/(owner)/owner/users/page.tsx` - Multi-nursery assignment
    - ✅ `app/(owner)/owner/sessions/[id]/page.tsx` - Filtered employee list
    - ✅ `app/(owner)/owner/haccp/meals/page.tsx` - Nursery-filtered employees
    - ✅ `app/(owner)/owner/haccp/non-compliances/page.tsx` - Nursery-filtered employees
  - **Impact**:
    - ✅ Owners can create unlimited nurseries per enterprise
    - ✅ Employees can be assigned to multiple nurseries
    - ✅ Employee lists filtered by selected nursery (prevents confusion)
    - ✅ Task categories work correctly (shared across all nurseries)
    - ✅ Better data isolation and security
  - **Status**: ✅ **100% complete** - Migration applied, build passes (2025-12-22)

- 🏢 **PHASE 0: MULTI-SITE ARCHITECTURE** (2025-12-22) - Enterprise can manage multiple nurseries ✅ **COMPLETED**
  - **Feature**: Owners can now manage multiple physical nursery locations under one enterprise account
  - **Architecture changes**:
    - New `nursery` table for physical establishments
    - New `employee_nursery_access` table for M2M employee-nursery relationships
    - Migrated 12 operational tables from `enterprise_id` to `nursery_id`
    - Added `primary_nursery_id` to `profiles` table
  - **New components**:
    - `NurseryContext` - React context for managing selected nursery
    - `NurserySelector` - Dropdown component in header for switching between nurseries
    - `NurseryForm` - Reusable form for creating/editing nurseries
    - Updated `EnterpriseSetupForm` to 2-step wizard (enterprise + first nursery)
  - **Service updates**: All operational services migrated to use `nurseryId`:
    - ✅ `rooms.service.ts`, `sessions.service.ts`, `calendar.service.ts`
    - ✅ `assigned-tasks.service.ts`, `haccp.service.ts` (all 8 modules)
  - **Page updates**: All Owner pages migrated to `useNursery()` hook:
    - ✅ Dashboard with calendar components
    - ✅ Sessions list and detail pages
    - ✅ All 8 HACCP module pages
    - ✅ Rooms, Tasks, History pages
  - **Migration script**: Created `08_multi_site.sql` with zero-downtime strategy
  - **Impact**:
    - ✅ Enterprises can scale to multiple locations
    - ✅ Data isolation per nursery (rooms, sessions, HACCP)
    - ✅ Shared resources at enterprise level (employees, task templates)
    - ✅ Seamless switching between nurseries with localStorage persistence
  - **Status**: ✅ **100% complete** - Build passes, all pages migrated (2025-12-22)

- 🔧 **SESSION PERSISTENCE FIX** (2025-12-08) - Fixed frustrating logout issue when switching apps/tabs ✅ **COMPLETED**
  - **Problem**: Users were disconnected with loading screen/timeout whenever they switched browser tabs or apps, even after just logging in 30 seconds earlier
  - **Root cause**: `useEffect` re-triggered full session check on every component remount, causing `isLoading = true` and blocking UI
  - **Solution implemented**:
    - **Pre-load session from localStorage in `useState` initializer** (synchronous, before first render)
    - **Initialize `isLoading` based on session presence** (`isLoading = false` if session exists)
    - **Guard with `hasInitialized` ref** to prevent multiple `useEffect` executions
    - **Silent background refresh mode** (`checkSession(force, silent)`) to avoid showing loading state during background checks
    - **Session TTL**: 5 minutes in localStorage
  - **Technical details**:
    ```typescript
    // Session pre-loaded BEFORE first render (synchronous)
    const [session] = useState(() => {
      const savedSession = localStorage.getItem('luniqo_auth_session')
      const savedTimestamp = localStorage.getItem('luniqo_auth_timestamp')
      if (savedSession && age < 5min) return parsedSession
      return null
    })

    // isLoading starts false if session exists
    const [isLoading] = useState(() => session === null)

    // Guard to prevent re-execution
    const hasInitialized = useRef(false)
    useEffect(() => {
      if (hasInitialized.current) return
      hasInitialized.current = true
      // ... initialization logic
    })
    ```
  - **Files modified**:
    - ✅ `lib/contexts/AuthContext.tsx` - Pre-load session, silent mode, initialization guard
  - **Impact**:
    - ✅ Users can now switch tabs/apps without being disconnected
    - ✅ Instant page display on return (no loading screen)
    - ✅ Background session refresh is invisible to user
    - ✅ Session valid for 5 minutes without re-checking
  - **Status**: ✅ **100% complete** - Tested on Safari & Chrome, works perfectly (2025-12-08)

- 🎨 **HACCP PAGE ORGANIC REDESIGN** (2025-12-08) - More colorful and organic HACCP dashboard ✅ **COMPLETED**
  - **Problem**: HACCP dashboard was monotonous with green mint color everywhere
  - **Solution**: Applied varied pastel colors from design system to each module for visual diversity
  - **Color mapping**:
    - Enfants → Rose pastel (`users`)
    - Repas → Pêche pastel (`calendar`)
    - Produits → Lime pastel (`tasks`)
    - Fournisseurs → Turquoise (`communication`)
    - Températures → Vert menthe (`haccp`)
    - Équipements → Violet lavande (`settings`)
    - Documents → Indigo pastel (`analytics`)
    - Non-conformités → Rose (`users`)
  - **Files modified**:
    - ✅ `app/(owner)/owner/haccp/page.tsx` - Removed duplicate stats grid, applied varied colors to modules
  - **Impact**: More organic and lively interface, each HACCP module has its own visual identity
  - **Status**: ✅ **100% complete** - Design system "Douceur Professionnelle" fully applied (2025-12-08)

- 🔨 **BUILD FIX FOR PROTECTED ROUTES** (2025-12-08) - Fixed prerendering errors for auth-protected pages ✅ **COMPLETED**
  - **Problem**: Build was failing with `Cannot read properties of null (reading 'useContext')` for all protected routes
  - **Root cause**: Next.js tried to prerender pages that use React Context (AuthContext) during build, but context is not available at build time
  - **Solution**: Added `export const dynamic = 'force-dynamic'` to all protected route group layouts
  - **Files modified**:
    - ✅ `app/(owner)/layout.tsx` - Added `export const dynamic = 'force-dynamic'`
    - ✅ `app/(employee)/layout.tsx` - Added `export const dynamic = 'force-dynamic'`
    - ✅ `app/(developer)/layout.tsx` - Added `export const dynamic = 'force-dynamic'`
    - ✅ `next.config.mjs` - Added `staticPageGenerationTimeout` and `generateBuildId` config
  - **Impact**: Protected pages are now server-rendered at runtime instead of being pre-generated
  - **Status**: ✅ **100% complete** - Build succeeds, all routes work correctly (2025-12-08)

- 🎯 **OWNER ROUTES URL PREFIX** (2025-12-08) - URL prefix `/owner/*` for better scalability ✅ **COMPLETED**
  - **URLs updated**: All Owner routes now use `/owner/*` prefix for consistency with Employee routes
  - **Route structure**:
    - Owner: `/owner/dashboard`, `/owner/rooms`, `/owner/users`, `/owner/haccp`, `/owner/profil`, etc.
    - Employee: `/employee/dashboard`, `/employee/profile`, `/employee/calendar`, `/employee/history`
    - Developer: `/developer/dashboard`
    - Tablet: `/tablet/*` (unchanged)
  - **Benefits**:
    - Clear URL namespace per role - no route conflicts
    - Easy to add new roles (e.g., `/manager/*`) without breaking existing routes
    - Consistent pattern across all user types
    - Better organization and discoverability
  - **Files updated**:
    - ✅ Moved all pages from `(owner)/*` to `(owner)/owner/*`
    - ✅ Updated `AppSidebar.tsx` navigation links
    - ✅ Updated `Header.tsx` profile link
    - ✅ Updated `AuthContext.tsx` redirects
    - ✅ Updated all internal links in 20+ pages
  - **Status**: ✅ **100% complete** - All routes use new prefix, cache cleared (2025-12-08)

- 🎯 **ROLE-BASED ROUTE GROUPS** (2025-12-08) - Architectural refactoring for better separation ✅ **COMPLETED**
  - **Route structure refactored**: `(dashboard)` → 3 separate route groups `(owner)`, `(employee)`, `(developer)`
  - **Clear role separation**: Each role has its own isolated route group with dedicated layouts
  - **Updated components**:
    - ✅ Created dedicated layouts for each route group (`(owner)/layout.tsx`, `(employee)/layout.tsx`, `(developer)/layout.tsx`)
    - ✅ Created `EmployeeSidebar.tsx` for employee navigation
    - ✅ Updated `AppSidebar.tsx` with new Owner routes
    - ✅ Updated `Header.tsx` with role-based profile links
    - ✅ Updated `AuthContext.tsx` with role-based redirects after login
  - **Benefits**:
    - Better code organization and maintainability
    - Easier to add role-specific features
    - Clearer separation of concerns
    - No more conditional logic in shared layouts
  - **Status**: ✅ **100% complete** - All routes migrated, old `(dashboard)` folder deleted (2025-12-08)

- 🐛 **DUPLICATE HEADER FIX** (2025-12-08) - Fixed Header rendering twice on all Owner pages ✅ **COMPLETED**
  - **Problem**: `DashboardLayout` component was rendering a Header, but `(owner)/layout.tsx` already rendered one
  - **Solution**: Removed `DashboardLayout` usage from all 16+ Owner pages, kept only parent layout Header
  - **Impact**: Header now renders only once, cleaner component hierarchy
  - **Status**: ✅ **100% complete** - All pages fixed (2025-12-08)

- 🚀 **UNIFIED PROFILES ARCHITECTURE** (2025-12-08) - Major architectural refactoring ✅ **COMPLETED**
  - **Tables unified**: `developer` + `owner` + `employee` → single `profiles` table
  - **Supabase Auth for all**: All users (Developer, Owner, Employee) now use `auth.users`
  - **Employee dual login**: Dashboard (email/password) + Tablet (username/PIN)
  - **Auto-generated usernames**: "Marie D", "Sophie L" for tablet quick access
  - **Migrations completed**:
    - ✅ `00_schema.sql` - Unified profiles table with all 25+ tables
    - ✅ `01_dev_permissions.sql` - RLS disabled for development
    - ✅ Deleted old migrations (01-07) after preserving important changes
  - **Pattern standard Supabase**: 1:1 relationship `auth.users` ↔ `profiles`
  - **Code migration completed**:
    - ✅ Types updated (`database.types.ts`, `auth.types.ts`, `analytics.types.ts`)
    - ✅ Services rewritten (`users`, `analytics`, `messaging`, `auth.client`, `auth.server`)
    - ✅ Server actions created (`lib/actions/users.actions.ts`) - `createEmployee()`, `createOwner()`
    - ✅ AuthContext completely rewritten for profiles table
    - ✅ Seed script updated to use `auth.admin.createUser()`
    - ✅ All components updated (`Header`, `Sidebar`, `AppSidebar`, `NotificationModal`, `EnterprisesList`)
    - ✅ All pages updated (15+ files) - `admin` → `owner`, `avatar` → `avatar_url`, TypeScript fixes
    - ✅ Build compiles successfully with zero TypeScript errors
  - **Impact**: Simpler codebase, better scalability, unified authentication
  - **New routes**: `/dashboard/employee/*` for employee dashboard access (profile, history, calendar)
  - **Status**: ✅ **100% complete** - Migration finished, build passes, ready for testing (2025-12-08)
- ✅ **Critical Timezone Bug Fix** (2025-12-03) - Fixed task status mismatch between session detail and calendar
  - **Root cause**: Using `toISOString().split('T')[0]` converted dates to UTC, causing mismatches
  - **Solution**: Created `lib/utils/date.ts` with local timezone utilities (`formatDateLocal()`, `getTodayLocal()`, `getDateWithOffset()`)
  - **Files updated**: `lib/services/calendar.service.ts` (3 locations), `lib/services/sessions.service.ts` (1 location)
  - **Impact**: Tasks now correctly show completion status across all views
- ✅ **Session Status Simplification** (2025-12-03) - Reduced session statuses from 3 to 2
  - Removed "INCOMPLETE" status - sessions are now only "EN_COURS" or "COMPLETEE"
  - Auto-completion logic: sessions automatically update to "COMPLETEE" when all tasks are done
  - Created migration `06_simplify_session_status.sql` to handle PostgreSQL enum alteration with DEFAULT constraints
  - Removed manual status change buttons from UI
- ✅ **Session Detail Page Redesign** (2025-12-03) - Applied "Douceur Professionnelle" design system
  - Now shows ALL assigned tasks (not just completed ones)
  - Visual states: green for done, yellow for partial, gray for pending
  - "Marquer" button appears on hover for pending tasks
  - Tasks grouped by room with dynamic styling based on completion status
- ✅ **Performance Overhaul** (2025-12-03) - Massive reduction in page transition times
  - Downgraded to Next.js 15 & React 18 for stability
  - Added session caching and removed force-dynamic
  - Optimized middleware to avoid DB queries on every request
  - Added loading states for better UX
- ✅ **Rebranding to Luniqo** (2025-12-03) - Complete brand identity update with new logo
  - New baby mascot logo with letter "L" integrated across all pages
  - Sidebar modernized with gradient backgrounds and nested rounded corners
  - Module color backgrounds applied to navigation links
  - Metadata and favicons updated with Luniqo branding
- ✅ First login flow for new owners with enterprise creation
- ✅ Profile page with modern shadcn/ui components
- ✅ Badge component migrated to shadcn standard with extended variants
- ✅ Sidebar `isActive` logic fixed for `/dashboard` route
- ✅ Select component pattern for empty values (`"none"` instead of `""`)

---

**Last updated**: 2026-01-20 (Nursery Module Access System - Migration 62 ready, UI complete)
