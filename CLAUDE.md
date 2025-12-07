# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Structure

**IMPORTANT**: At the start of each new conversation, read these documents in order:

1. **CLAUDE.md** (this file) - Project architecture and technical guidelines
2. **TODO.md** - Current tasks, bugs, and roadmap
3. **DESIGN-SYSTEM.md** - Complete design system, components catalog, and UI patterns

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
   - Access: Analytics dashboard (`/analytics`)
   - Can create owners and view global metrics
   - Login: `/login` with email/password

2. **Owner (Childcare Owner/Manager)**
   - Auth: Supabase Auth (email/password)
   - Table: `profiles` (where role = 'Owner')
   - Linked to: `enterprise` via `enterprise.owner_id`
   - Access: Full back-office (`/dashboard`)
   - Manages one childcare facility (1 owner = 1 enterprise)
   - **First login flow**: Owner without enterprise is redirected to `/setup` to create their enterprise
   - Login: `/login` with email/password

3. **Employee (Childcare Staff)**
   - Auth: **Dual authentication system**
   - Table: `profiles` (where role = 'Employee')
   - Linked to: `enterprise` via `profiles.enterprise_id`

   **Two login methods:**

   a) **Dashboard Login** (`/login`)
      - Method: Email + Password (Supabase Auth)
      - Device: Desktop/Mobile
      - Access: `/dashboard/employee/*`
      - Features: Profile, history, calendar, stats, PIN management

   b) **Tablet Login** (`/tablet/login`)
      - Method: Username + PIN (custom auth)
      - Device: Tablet
      - Access: `/tablet/*`
      - Features: Daily tasks only (quick access)
      - **Username**: Auto-generated (e.g., "Marie D")
      - **PIN**: 4 digits, bcrypt hashed, chosen by employee
      - **Storage**: Session in localStorage as `user_session`

   **Important**: Employees have BOTH email/password (for dashboard) AND username/PIN (for tablet)

### Route Structure

The app uses Next.js App Router with route groups:

- `(auth)/` - Public authentication pages
  - `/login` - Universal login (email/password for Developer/Owner/Employee)

- `(dashboard)/` - Protected dashboard routes (role-based access)
  - `/analytics` - Developer-only analytics
  - `/dashboard` - Owner dashboard (default)
  - `/dashboard/profil` - Owner profile with enterprise management
  - `/dashboard/haccp/*` - HACCP module pages (Owner)
  - `/dashboard/rooms`, `/dashboard/users`, etc. - Owner management pages
  - `/dashboard/employee/*` - **Employee dashboard** (NEW)
    - `/dashboard/employee/profile` - Employee profile & PIN management
    - `/dashboard/employee/history` - Personal task history
    - `/dashboard/employee/calendar` - Personal calendar
  - `/setup` - First-time enterprise creation (owners only)

- `(tablet)/` - Tablet interface for employees (quick task access)
  - `/tablet/login` - Employee username + PIN login
  - `/tablet/room/[id]` - Room cleaning interface
  - `/tablet/haccp/*` - HACCP data entry

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

### Enterprise Data Isolation

**CRITICAL**: All queries MUST filter by `enterprise_id` to prevent data leakage between childcare facilities.

```typescript
// ✅ CORRECT - Always filter by enterprise_id
const { data } = await supabase
  .from('room')
  .select('*')
  .eq('enterprise_id', session.enterprise.id)

// ❌ WRONG - Returns data from ALL enterprises
const { data } = await supabase.from('room').select('*')
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
4. **Session Caching (30s TTL)** - AuthContext caches session checks to avoid redundant DB queries
5. **Optimized Middleware** - Removed expensive DB queries from middleware (moved to client-side)
6. **Reduced Timeout** - Session check timeout reduced from 30s to 5s for faster error detection
7. **Optimistic Client Cache** - Enabled in Next.js config for instant navigation
8. **Package Import Optimization** - Tree-shaking for @heroicons/react and recharts
9. **Loading States** - Added loading.tsx files for instant feedback during navigation
10. **Removed visibility check** - No more session refresh when switching apps

**Key files modified:**
- [lib/contexts/AuthContext.tsx](lib/contexts/AuthContext.tsx:20-62) - Added 30s cache + reduced timeout
- [lib/supabase/middleware.ts](lib/supabase/middleware.ts:61-62) - Removed admin/enterprise checks
- [app/(dashboard)/layout.tsx](app/(dashboard)/layout.tsx:1-2) - Removed force-dynamic
- [next.config.ts](next.config.ts:13-32) - Added performance optimizations

## Recent Updates

- 🚀 **UNIFIED PROFILES ARCHITECTURE** (2025-12-07) - Major architectural refactoring
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
    - ✅ Types updated (`database.types.ts`, `auth.types.ts`)
    - ✅ Services rewritten (`users`, `analytics`, `messaging`, `auth.client`, `auth.server`)
    - ✅ AuthContext completely rewritten for profiles table
    - ✅ Seed script updated to use `auth.admin.createUser()`
    - ✅ Core components updated (`Header`, `Sidebar`, `AppSidebar`, `NotificationModal`)
    - ✅ Key pages updated (`login`, `dashboard`, `setup`, `users`, `messages`, `tablet/login`)
  - **Impact**: Simpler codebase, better scalability, unified authentication
  - **New routes**: `/dashboard/employee/*` for employee dashboard access (routes to be created)
  - **Status**: 🔄 85% complete - Core architecture migrated, remaining pages being updated
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

**Last updated**: 2025-12-07 (Unified Profiles Architecture Migration)
