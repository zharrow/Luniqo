# 🚀 Quick Start Guide - cLean Next.js

Get the cLean application running in 5 minutes!

---

## ⚡ Prerequisites

- **Node.js 18+** installed
- **Supabase account** (free tier works)
- **Git** installed

---

## 📝 Step-by-Step Setup

### 1️⃣ **Apply Database Schema to Supabase** (CRITICAL - Only do this once!)

Your Supabase project is already created. Now you need to create the tables:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/esezjbjonxewkrubkrkv
   - Or: https://supabase.com/dashboard → Select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar (database icon)
   - Click **New Query** button

3. **Copy the Schema**
   - Open the file `supabase/migrations/00_schema.sql` in your code editor
   - Select ALL content (Ctrl+A)
   - Copy (Ctrl+C)

4. **Execute the Schema**
   - Paste the SQL into the Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait ~10 seconds for execution
   - You should see: "Success. No rows returned" ✅

5. **Verify Tables Created**
   - Click **Table Editor** in the left sidebar
   - You should see 25+ tables:
     - developer, admin, enterprise, user
     - room, task_template, assigned_task
     - cleaning_session, cleaning_log
     - child, meal, product, supplier, etc.

✅ **Done!** The database is ready.

---

### 2️⃣ **Install Dependencies**

```bash
cd cleanapp-nextjs
npm install
```

This will install:
- Next.js 16
- Supabase client
- Tailwind CSS v4
- TypeScript
- And all dependencies

---

### 3️⃣ **Populate Database with Test Data**

```bash
npm run seed
```

This creates:
- ✅ 1 Developer account
- ✅ 2 Admin accounts (2 daycares)
- ✅ 6 Rooms per daycare
- ✅ 10 Task templates
- ✅ 5 Employees with PINs
- ✅ 7 Days of session history
- ✅ HACCP data (children, products, suppliers)

**Expected output:**
```
🌱 Starting database seeding...
🧹 Clearing existing data...
✅ Database cleared
👨‍💻 Creating developers...
✅ Created 1 developer(s)
...
✨ Database seeding completed successfully!

🔑 Test Credentials:
   Admin: admin@petitspas.fr / admin123
   User PIN: 1234, 2345, 3456, 4567, 5678
```

---

### 4️⃣ **Start the Development Server**

```bash
npm run dev
```

The app will start at: **http://localhost:3000**

---

## 🧪 Testing the Application

### Test 1: Admin Login

1. Go to: http://localhost:3000/login
2. Enter credentials:
   - **Email**: `admin@petitspas.fr`
   - **Password**: `admin123`
3. Click **Se connecter**

✅ You should see the **Dashboard** with stats:
- Number of rooms
- Number of tasks
- Number of employees
- Today's completion percentage

### Test 2: Browse Rooms

1. Click **Pièces** in the sidebar
2. You should see 6 rooms (Salle de jeu, Salle de repos, etc.)
3. Click **Nouvelle pièce** to create a new room
4. Fill in the form and submit
5. Click the **pencil icon** to edit a room
6. Click the **trash icon** to deactivate a room

### Test 3: Manage Tasks

1. Click **Tâches** in the sidebar
2. You should see 10 task templates
3. Use the **filter buttons** to filter by type:
   - Toutes (All)
   - Quotidiennes (Daily)
   - Hebdomadaires (Weekly)
   - Mensuelles (Monthly)
   - Occasionnelles (Occasional)
4. Create a new task with **Nouvelle tâche**
5. Edit and delete tasks

### Test 4: Manage Employees

1. Click **Employés** in the sidebar
2. You should see 5 employees
3. Click **Nouvel employé**
4. Create an employee with:
   - First name: Test
   - Last name: Employee
   - PIN: 9999 (4-6 digits)
   - Select rooms they can access
5. Notice the **room badges** showing which rooms each employee can access

### Test 5: Tablet PIN Login (Employee)

1. Open a new incognito/private window
2. Go to: http://localhost:3000/tablet/login
3. You'll see a **PIN keypad** (tablet interface)
4. Enter PIN: **1234** (Sophie Bernard)
5. Click **Valider**

✅ You should be logged in as an employee

### Test 6: Logout

1. Click your **name** in the top-right header
2. Click **Déconnexion**
3. You should be redirected to login

---

## 🎨 Features to Explore

### Dashboard (Admin)
- **Live stats**: Real-time counts of rooms, tasks, users
- **Quick actions**: Links to create sessions, manage rooms, HACCP
- **Recent activity**: Placeholder for future activity feed

### Rooms Management
- ✅ Create, edit, delete (soft delete) rooms
- ✅ Display order management
- ✅ Active/inactive status
- ✅ Description field
- ✅ Image key support (for future photo upload)

### Tasks Management
- ✅ Task templates with types (DAILY/WEEKLY/MONTHLY/OCCASIONAL)
- ✅ Category organization
- ✅ Duration tracking (estimated & default)
- ✅ Filtering by type
- ✅ Color-coded badges by type
- ✅ Soft delete support

### Users Management (Employees)
- ✅ PIN code authentication (hashed)
- ✅ Room access control (Many-to-Many)
- ✅ Email optional
- ✅ Active/inactive status
- ✅ Visual display of accessible rooms

### Layout & UX
- ✅ **Collapsible sidebar** (click the arrow to collapse/expand)
- ✅ **Role-based navigation** (different menus for Admin vs Developer)
- ✅ **Enterprise context** (displays "Crèche Les Petits Pas" in sidebar)
- ✅ **User menu** (top-right with profile and logout)
- ✅ **Pastel design system** (soft colors, rounded corners)
- ✅ **Smooth animations** (modals, hover effects)

---

## 🐛 Troubleshooting

### "relation does not exist" error
**Problem**: Database tables not created
**Solution**: Go back to Step 1 and apply the schema SQL

### "Invalid API key" error
**Problem**: Wrong Supabase credentials in `.env.local`
**Solution**:
1. Check `.env.local` exists
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Get fresh keys from Supabase Dashboard → Settings → API

### Seed script fails
**Problem**: Usually a schema issue
**Solution**:
1. Make sure Step 1 (schema) was completed successfully
2. Check Supabase dashboard for any table creation errors
3. Try running seed again: `npm run seed`

### Login doesn't work
**Problem**: No seed data OR wrong credentials
**Solution**:
1. Run `npm run seed` to create test accounts
2. Use exact credentials: `admin@petitspas.fr` / `admin123`
3. Check browser console for errors (F12)

### Page is blank
**Problem**: JavaScript error OR auth redirect
**Solution**:
1. Open browser console (F12) and check for errors
2. Make sure you're logged in (go to `/login` first)
3. Check that Node.js server is running (`npm run dev`)

---

## 📊 What's Working (52% Complete)

✅ **Phase 1: Infrastructure (100%)**
- Next.js 16 + TypeScript
- Supabase integration
- Multi-tier authentication
- Design system

✅ **Phase 2.1: cLean Module (95%)**
- Dashboard with stats
- Rooms CRUD
- Tasks CRUD
- Users CRUD
- Sessions list
- Layout components

✅ **Seed Data (100%)**
- Complete test data
- Multiple enterprises
- Realistic data

---

## 🚧 What's Next (48% Remaining)

🟡 **To Complete**:
- [ ] Session detail page (view tasks in a session)
- [ ] History & Reports page
- [ ] HACCP module (children, meals, products, temperatures)
- [ ] Communication module (messaging, notifications)
- [ ] Analytics dashboard (for developers)
- [ ] Tablet interface (employee task completion)
- [ ] Photo upload (Supabase Storage)
- [ ] PDF export

See [PROGRESS.md](PROGRESS.md) for detailed roadmap.

---

## 📚 Additional Resources

- **[PROGRESS.md](PROGRESS.md)** - Detailed progress tracking
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Complete Supabase setup guide
- **[scripts/README.md](scripts/README.md)** - Seed script documentation
- **[CLAUDE.md](../CLAUDE.md)** - Project overview and architecture (in parent directory)
- **[database.md](../database.md)** - Complete database schema documentation

---

## 🎯 Next Development Steps

Once you've tested the basics:

1. **Complete cLean module**:
   - Enhance session detail page
   - Create history & reports

2. **Build HACCP module**:
   - Use the same patterns as Rooms/Tasks/Users
   - CRUD for children, meals, products
   - Temperature tracking

3. **Add Tablet Interface**:
   - Room selection for employees
   - Task completion UI
   - Photo upload

---

## 💡 Development Tips

### Hot Reload
Changes to `.tsx` files will auto-reload. No need to restart the server.

### Database Changes
If you modify the schema:
1. Update `supabase/migrations/00_schema.sql`
2. Re-run the migration in Supabase SQL Editor
3. Run `npm run seed` to repopulate

### Debugging
- **Console logs**: Check browser console (F12)
- **Network tab**: See Supabase API calls
- **Supabase Dashboard**: View data directly in Table Editor

### Code Structure
```
cleanapp-nextjs/
├── app/
│   ├── (auth)/          ← Login pages
│   ├── (dashboard)/     ← Admin interface
│   └── (tablet)/        ← Employee interface
├── lib/
│   ├── services/        ← Business logic
│   ├── contexts/        ← React contexts
│   └── utils/           ← Utilities
├── components/
│   └── layout/          ← Layout components
└── supabase/
    └── migrations/      ← Database schema
```

---

**🎉 Congratulations!** You're now running the cLean Next.js app.

For questions or issues, check the documentation files or the code comments.

Happy coding! 🚀
