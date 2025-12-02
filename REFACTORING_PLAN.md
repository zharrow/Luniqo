# 🔄 Table Renaming Refactoring Plan

## ✅ Completed Tasks

### 1. SQL Migration
- ✅ Created [supabase/migrations/01_refactor_table_names.sql](supabase/migrations/01_refactor_table_names.sql)
- ✅ Updated [supabase/migrations/00_schema.sql](supabase/migrations/00_schema.sql)

### 2. TypeScript Types
- ✅ Updated [types/database.types.ts](types/database.types.ts)

### 3. Seed Script
- ✅ Updated [scripts/seed.ts](scripts/seed.ts)

---

## 📋 Table Name Changes

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `developer` | `super_admin` | More explicit of the platform administrator role |
| `user` | `employee` | "User" is too generic; reflects childcare staff reality |
| `user_rooms` | `employee_room_access` | More descriptive of the access relationship |
| `cleaning_session` | `daily_cleaning_session` | Explicit daily frequency |
| `cleaning_log` | `task_completion` | More precise about what is recorded |
| `export` | `session_export` | Clarifies it's cleaning session exports |
| `cleaning_haccp` | `food_area_cleaning` | Distinguishes from general cleaning |
| `non_compliance` | `haccp_incident` | More specific to HACCP domain |
| `temperature` | `temperature_check` | More precise about the measurement nature |
| `meal_children` | `child_meal_record` | Describes the association better |
| `conversation` | `support_conversation` | Explicit type of conversation (admin ↔ super admin) |

---

## 🔍 Files Requiring Updates

### Authentication Files (Priority: HIGH)
- [ ] [lib/utils/auth.client.ts](lib/utils/auth.client.ts) - References: `developer`, `user`, `user_rooms`
- [ ] [lib/utils/auth.server.ts](lib/utils/auth.server.ts) - References: `developer`
- [ ] [lib/contexts/AuthContext.tsx](lib/contexts/AuthContext.tsx) - References: `developer`

### Service Files (Priority: HIGH)
- [ ] [lib/services/users.service.ts](lib/services/users.service.ts) - References: `user`, `user_rooms`, `cleaning_log`
- [ ] [lib/services/calendar.service.ts](lib/services/calendar.service.ts) - References: `cleaning_session`, `cleaning_log`
- [ ] [lib/services/tasks.service.ts](lib/services/tasks.service.ts) - References: `cleaning_log`
- [ ] [lib/services/sessions.service.ts](lib/services/sessions.service.ts) - References: `cleaning_session`, `cleaning_log`
- [ ] [lib/services/rooms.service.ts](lib/services/rooms.service.ts) - References: `cleaning_session`, `cleaning_log`
- [ ] [lib/services/haccp.service.ts](lib/services/haccp.service.ts) - References: `non_compliance`, `meal_children`, `temperature`
- [ ] [lib/services/messaging.service.ts](lib/services/messaging.service.ts) - References: `conversation`
- [ ] [lib/services/analytics.service.ts](lib/services/analytics.service.ts) - References: `user`, `cleaning_session`

### Page Components (Priority: MEDIUM)
- [ ] [app/(tablet)/tablet/room/[id]/page.tsx](app/(tablet)/tablet/room/[id]/page.tsx) - References: `user_rooms`, `cleaning_session`, `cleaning_log`
- [ ] [app/(tablet)/tablet/room/[id]/validated/page.tsx](app/(tablet)/tablet/room/[id]/validated/page.tsx) - References: `cleaning_session`, `cleaning_log`
- [ ] [app/(tablet)/tablet/home/page.tsx](app/(tablet)/tablet/home/page.tsx) - References: `user_rooms`
- [ ] [app/(tablet)/tablet/haccp/meals/page.tsx](app/(tablet)/tablet/haccp/meals/page.tsx) - References: `meal_children`
- [ ] [app/(dashboard)/dashboard/notifications/page.tsx](app/(dashboard)/dashboard/notifications/page.tsx) - References: `non_compliance`

### Layout Components (Priority: MEDIUM)
- [ ] [components/layout/Header.tsx](components/layout/Header.tsx) - References: `user`, `cleaning_session`

---

## 🔧 Migration Steps

### Step 1: Apply Database Migration
```bash
# In Supabase SQL Editor, run:
# supabase/migrations/01_refactor_table_names.sql

# Or if using local Supabase:
npx supabase db reset
```

### Step 2: Update Code Files
This is a systematic find-and-replace operation in all TypeScript files:

**Authentication & Contexts:**
- `from('developer')` → `from('super_admin')`
- `from('user')` → `from('employee')`
- `from('user_rooms')` → `from('employee_room_access')`
- Variable names: `user` → `employee`, `users` → `employees`

**Services:**
- `from('cleaning_session')` → `from('daily_cleaning_session')`
- `from('cleaning_log')` → `from('task_completion')`
- `from('cleaning_haccp')` → `from('food_area_cleaning')`
- `from('non_compliance')` → `from('haccp_incident')`
- `from('temperature')` → `from('temperature_check')`
- `from('meal_children')` → `from('child_meal_record')`
- `from('conversation')` → `from('support_conversation')`
- `from('export')` → `from('session_export')`

**Variable Naming Conventions:**
- `cleaningSession` → `dailyCleaningSession`
- `cleaningLog` → `taskCompletion`
- `userRoom` → `employeeRoomAccess`
- etc.

### Step 3: Test & Verify
```bash
# 1. Type check
npm run type-check

# 2. Build
npm run build

# 3. Re-seed database
npm run seed

# 4. Run dev server
npm run dev

# 5. Test authentication flows
# 6. Test CRUD operations
```

---

## ⚠️ Important Notes

### Breaking Changes
- All existing data will be preserved (migration uses `ALTER TABLE RENAME`)
- **BUT** any code not updated will fail with "relation does not exist" errors
- All Supabase queries must be updated simultaneously

### Variable Naming
When updating files, also update variable names for consistency:
```typescript
// ❌ Old (inconsistent)
const { data: users } = await supabase.from('employee').select()

// ✅ New (consistent)
const { data: employees } = await supabase.from('employee').select()
```

### User Type Enum
The `user_type` enum remains unchanged (`'Developer' | 'Admin' | 'User'`) for backward compatibility.
It now maps to:
- `'Developer'` → `super_admin` table
- `'Admin'` → `admin` table
- `'User'` → `employee` table

---

## 📝 Next Steps

1. **Review this plan** with the team
2. **Create a backup** of the current database
3. **Apply the migration** on a staging environment first
4. **Update all code files** systematically (use the checklist above)
5. **Test thoroughly** before deploying to production

---

**Last Updated:** 2025-12-02
