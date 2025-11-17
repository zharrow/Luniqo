# 🌱 Database Seeding Scripts

## Overview

This directory contains scripts to populate the database with test data for development.

## Seed Script (`seed.ts`)

Populates the Supabase database with realistic test data including:

- **1 Developer** - Super admin account
- **2 Admins** - Daycare managers (each with their own enterprise)
- **2 Enterprises** - "Crèche Les Petits Pas" and "Micro-Crèche Les Lucioles"
- **6 Rooms** per enterprise - Salle de jeu, repos, éveil, cuisine, etc.
- **10 Task Templates** - Daily, weekly, monthly, and occasional tasks
- **5 Users (Employees)** - With PIN codes and room access
- **7 Cleaning Sessions** - Last 7 days of data
- **5 Children** - With allergen information
- **3 Suppliers** - Food suppliers
- **7 Products** - Food products with allergens and shelf life

### Prerequisites

1. **Supabase project created** with database schema applied
2. **Environment variables** configured in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Installation

```bash
# Install dependencies (if not already done)
npm install
```

### Usage

```bash
# Run the seed script
npm run seed

# Or directly with ts-node
npx ts-node scripts/seed.ts
```

### What it does

1. **Clears existing data** - Removes all data from tables (in reverse dependency order)
2. **Seeds base data** - Creates developers, admins, and enterprises
3. **Seeds cLean module data** - Rooms, tasks, users, sessions
4. **Seeds HACCP module data** - Children, suppliers, products
5. **Creates relationships** - User-room access, assigned tasks, etc.

### Test Credentials

After running the seed script, you can log in with:

**Admin Login:**
- Email: `admin@petitspas.fr`
- Password: `admin123`

**Employee PIN Codes (for tablet):**
- `1234` - Sophie Bernard
- `2345` - Lucas Petit
- `3456` - Emma Moreau
- `4567` - Léa Roux
- `5678` - Thomas Leroy

### Data Structure

**Enterprise 1: Crèche Les Petits Pas**
- Admin: Marie Dubois (admin@petitspas.fr)
- 6 rooms (Jeu, Repos, Éveil, Cuisine, Sanitaires, Entrée)
- 10 task templates (variety of frequencies)
- 5 employees with room access
- 7 days of session history
- 5 children enrolled
- 3 suppliers, 7 products

**Enterprise 2: Micro-Crèche Les Lucioles**
- Admin: Jean Martin (admin@leslucioles.fr)
- (Currently no data seeded - can be extended)

### Customization

To modify the seed data:

1. Edit the arrays in `seed.ts`
2. Adjust the number of records created
3. Add new seed functions for additional tables

### Notes

- **⚠️ This script DELETES all existing data** - Use only in development!
- PIN codes are hashed using SHA256 (simple hash for demo - use bcrypt in production)
- Firebase UIDs are set to `null` (Supabase Auth will populate these on real login)
- All dates are relative to today (sessions are last 7 days)

### Troubleshooting

**Error: "Missing environment variables"**
- Check that `.env.local` exists and contains the required variables

**Error: "relation does not exist"**
- Database schema not applied. Run the migration first:
  1. Go to Supabase Dashboard → SQL Editor
  2. Execute `supabase/migrations/00_schema.sql`

**Error: "permission denied"**
- Using wrong Supabase key. Make sure to use `SUPABASE_SERVICE_ROLE_KEY`, not the anon key

### Future Enhancements

- [ ] Seed data for enterprise 2
- [ ] Add meal data with children assignments
- [ ] Add temperature checkpoints
- [ ] Add cleaning logs for completed sessions
- [ ] Add equipment maintenance records
- [ ] Add non-compliance incidents
- [ ] Add documents
- [ ] Command-line arguments for selective seeding
