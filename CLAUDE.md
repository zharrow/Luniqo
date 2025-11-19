# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**cLean** is a modern childcare management application with HACCP traceability, built with Next.js 16 and Supabase. It serves French-speaking users (crèches) with a soft pastel design system.

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

The application has 3 distinct authentication layers:

1. **Developer (Super Admin)**
   - Auth: Supabase Auth (email/password)
   - Table: `developer`
   - Access: Analytics dashboard (`/analytics`)
   - Can create admins and view global metrics

2. **Admin (Childcare Manager)**
   - Auth: Supabase Auth (email/password)
   - Table: `admin` (linked to `enterprise`)
   - Access: Full back-office (`/dashboard`)
   - Manages one childcare facility (1 admin = 1 enterprise)

3. **User (Employee)**
   - Auth: 4-6 digit PIN code (bcrypt hashed)
   - Table: `user` (linked to `enterprise`)
   - Access: Tablet interface (`/tablet`)
   - Performs cleaning tasks and HACCP data entry
   - **Important**: User authentication does NOT use Supabase Auth - it's stored in localStorage as `user_session`

### Route Structure

The app uses Next.js App Router with route groups:

- `(auth)/` - Public authentication pages
  - `/login` - Admin/Developer login (email/password)

- `(dashboard)/` - Protected admin/developer routes
  - `/analytics` - Developer-only analytics
  - `/dashboard` - Admin dashboard and all management pages
  - `/dashboard/haccp/*` - HACCP module pages
  - `/dashboard/rooms`, `/dashboard/users`, etc.

- `(tablet)/` - Tablet interface for employees
  - `/tablet/login` - Employee PIN login
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
const { session, isLoading } = useRequireAuth(['Admin']) // or ['Developer'] or ['User']

// Login methods
const { loginWithEmail, loginWithPin, logout } = useAuth()
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

## Database Schema

25+ tables organized into modules:

**User System**
- `developer`, `admin`, `enterprise`, `user`, `user_rooms`

**cLean Module (Cleaning)**
- `room`, `task_template`, `assigned_task`, `cleaning_session`, `cleaning_log`, `export`

**HACCP Module (Food Safety)**
- `child`, `meal`, `meal_children`, `temperature`, `product`, `supplier`, `batch`, `equipment`, `cleaning_haccp`, `non_compliance`, `document`

**Communication**
- `conversation`, `message`, `notification`

Schema is located in `supabase/migrations/00_schema.sql`.

## Key Patterns & Conventions

### Component Organization

```
components/
  ui/           - shadcn/ui components (button, card, etc.)
  layout/       - Layout components (Header, Sidebar, etc.)
  shared/       - Shared components across modules
  analytics/    - Analytics-specific components
  theme/        - Theme-related components
```

### Type Definitions

```
types/
  database.types.ts  - Supabase generated types
  auth.types.ts      - Authentication types
  analytics.types.ts - Analytics types
```

### Design System

Tailwind CSS v4 with pastel color palette:

- **Primary** (Blue): `#5a9dc9` - Cleanliness, serenity
- **Secondary** (Pink): `#f4c2c2` - Warmth, childcare
- **Accent** (Yellow): `#ffe5b4` - Positive actions
- **Success** (Mint): `#b5ead7` - HACCP compliance

Custom CSS classes in `app/globals.css`:
- `.card` - Card with subtle shadow
- `.btn`, `.btn-primary`, `.btn-secondary` - Button variants
- `.tablet-mode` - XXL buttons and high contrast for tablet interface

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

1. **User PIN Authentication**: User (employee) sessions are stored in localStorage, NOT in Supabase Auth. Check `lib/utils/auth.client.ts` for `loginWithPin()` and `loginEmployeeWithPin()`.

2. **Context Providers**: The app uses two context providers wrapped in `components/Providers.tsx`:
   - `ThemeProvider` - Theme management
   - `AuthProvider` - Authentication state

3. **Middleware**: Uses `@supabase/ssr` for session management. See `middleware.ts` and `lib/supabase/middleware.ts`.

4. **TypeScript**: Strict mode enabled. Path alias `@/*` maps to project root.

5. **React & Next.js Versions**: Uses React 19 and Next.js 16 (App Router) - be aware of breaking changes from earlier versions.

6. **bcryptjs for PIN Hashing**: Employee PINs are hashed with bcrypt before storage. Always use `verifyPin()` for comparison.

## Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and add credentials
3. Run schema: Copy `supabase/migrations/00_schema.sql` into Supabase SQL Editor
4. Seed data: `npm run seed`

Full setup guide: `SUPABASE_SETUP.md`

## Testing New Features

When adding features that involve database operations:

1. Verify you're filtering by `enterprise_id`
2. Test with different role types (Developer, Admin, User)
3. Check the appropriate authentication method is used
4. Ensure tablet interface uses large touch targets when in tablet context
