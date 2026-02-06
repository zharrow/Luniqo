# INDEX.md

Documentation centrale du projet **Luniqo** - Application de gestion de crèche avec traçabilité HACCP.

**Dernière mise à jour**: 2025-11-19

---

## 📚 Guide de navigation de la documentation

Cette page est le **point d'entrée** de toute la documentation du projet. Utilisez-la pour naviguer rapidement vers l'information dont vous avez besoin.

---

## 🚀 Pour démarrer

### Nouvelle conversation avec Claude Code

À chaque nouvelle conversation, suivre cet ordre de lecture :

1. **[CLAUDE.md](CLAUDE.md)** - Architecture technique et guidelines du projet
2. **[TODO.md](TODO.md)** - Tâches actuelles, bugs, et roadmap
3. **[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)** - Design system complet et catalogue de composants

Cette séquence permet de comprendre le contexte global en quelques minutes.

---

## 📖 Documentation par catégorie

### 🏗️ Architecture & Setup

| Document | Description | Quand l'utiliser |
|----------|-------------|------------------|
| [CLAUDE.md](CLAUDE.md) | Architecture globale, patterns d'auth, structure de routing | **Toujours lire en premier** - Vue d'ensemble du projet |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md) | Configuration Supabase, migrations, RLS policies | Setup initial ou debug de la BDD |
| [TODO.md](TODO.md) | Tâches en cours, bugs connus, roadmap | **Toujours lire après CLAUDE.md** - Savoir quoi faire |

### 🎨 Design & UI

| Document | Description | Quand l'utiliser |
|----------|-------------|------------------|
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Palette de couleurs, composants shadcn/ui, patterns UI | **Toujours lire en troisième** - Avant toute création de page |

### 🔧 Développement

| Document | Description | Quand l'utiliser |
|----------|-------------|------------------|
| [API-PATTERNS.md](API-PATTERNS.md) | Patterns Supabase, CRUD, relations, filtres, erreurs | Création de features avec requêtes BDD |
| [QUICK-START.md](QUICK-START.md) | Templates et guides pas-à-pas pour tâches courantes | Besoin de créer une page, modal, route rapidement |
| [ERRORS-SOLUTIONS.md](ERRORS-SOLUTIONS.md) | Solutions aux erreurs courantes | Debugger un problème existant |

---

## 🎯 Navigation rapide par besoin

### "Je veux comprendre le projet"
1. Lire [CLAUDE.md](CLAUDE.md) - Architecture globale
2. Consulter le schéma de BDD dans `supabase/migrations/00_schema.sql`
3. Explorer [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - Comprendre l'UI

### "Je veux créer une nouvelle page"
1. Lire [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - Section "Patterns d'interface"
2. Copier un template depuis [QUICK-START.md](QUICK-START.md) - Section "Créer une page liste"
3. Appliquer les patterns de [API-PATTERNS.md](API-PATTERNS.md) pour les requêtes

### "Je veux créer une feature avec des requêtes BDD"
1. Consulter [API-PATTERNS.md](API-PATTERNS.md) - Section correspondante (CRUD, relations, etc.)
2. Vérifier [CLAUDE.md](CLAUDE.md) - Section "Enterprise Data Isolation" (toujours filtrer par enterprise_id)
3. Tester et debugger avec [ERRORS-SOLUTIONS.md](ERRORS-SOLUTIONS.md) si nécessaire

### "J'ai une erreur"
1. Chercher l'erreur dans [ERRORS-SOLUTIONS.md](ERRORS-SOLUTIONS.md)
2. Si non trouvée, consulter les patterns de débogage dans le même fichier
3. Vérifier [API-PATTERNS.md](API-PATTERNS.md) - Section "Gestion des erreurs"

### "Je veux ajouter un composant UI"
1. Vérifier s'il existe dans [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - Section "Composants de base"
2. Suivre les conventions de couleurs et tailles
3. Appliquer les best practices de la section "Bonnes pratiques"

### "Je fais un setup initial"
1. Lire [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
2. Créer `.env.local` avec les variables de [CLAUDE.md](CLAUDE.md) - Section "Environment Variables"
3. Lancer `npm run seed` pour les données initiales

---

## 📋 Structure complète de la documentation

```
📁 Documentation racine
│
├── 📄 INDEX.md (ce fichier)
│   └── Point d'entrée et guide de navigation
│
├── 🔵 Documentation principale (lire en ordre)
│   ├── 📄 CLAUDE.md - Architecture & guidelines techniques
│   ├── 📄 TODO.md - Tâches actuelles et roadmap
│   └── 📄 DESIGN-SYSTEM.md - Design system & composants UI
│
├── 🛠️ Documentation de développement
│   ├── 📄 API-PATTERNS.md - Patterns Supabase (CRUD, relations, filtres)
│   ├── 📄 QUICK-START.md - Templates et guides pas-à-pas
│   └── 📄 ERRORS-SOLUTIONS.md - Solutions aux erreurs courantes
│
└── ⚙️ Documentation technique
    └── 📄 SUPABASE_SETUP.md - Configuration BDD et migrations
```

---

## 🔑 Concepts clés du projet

### Authentication Multi-Tiers

Le projet a **3 niveaux d'authentification distincts** :

1. **Developer (Super Admin)**
   - Auth: Supabase Auth (email/password)
   - Accès: `/analytics`
   - Peut créer des admins et voir les métriques globales

2. **Admin (Gestionnaire de crèche)**
   - Auth: Supabase Auth (email/password)
   - Accès: `/dashboard` (back-office complet)
   - Gère une crèche (1 admin = 1 enterprise)
   - **Première connexion**: Doit créer son entreprise via `/setup`

3. **User (Employé)**
   - Auth: Code PIN 4-6 chiffres (bcrypt)
   - Accès: `/tablet` (interface tablette)
   - Effectue les tâches de nettoyage et saisie HACCP
   - **Important**: PAS d'authentification Supabase - stockage localStorage

**Voir**: [CLAUDE.md](CLAUDE.md) - Section "Multi-Tier Authentication System"

### Isolation des données par Enterprise

**CRITIQUE**: Toutes les requêtes DOIVENT filtrer par `enterprise_id` pour éviter les fuites de données entre crèches.

```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('room')
  .select('*')
  .eq('enterprise_id', session.enterprise.id)

// ❌ INTERDIT - Retourne les données de TOUTES les crèches
const { data } = await supabase.from('room').select('*')
```

**Voir**: [API-PATTERNS.md](API-PATTERNS.md) - Section "Filtrage par enterprise_id"

### Relation Admin-Enterprise

**Important**: La relation est `enterprise.admin_id` → `admin.id` (PAS l'inverse)

```typescript
// ✅ CORRECT
const { data: enterprise } = await supabase
  .from('enterprise')
  .select('*')
  .eq('admin_id', admin.id)
  .single()

// ❌ FAUX - admin n'a pas de colonne enterprise_id
const { data } = await supabase
  .from('admin')
  .select('*, enterprise:enterprise_id(*)')
```

**Voir**: [CLAUDE.md](CLAUDE.md) - Section "Admin-Enterprise Relationship"

### Design System Pastel

Palette de couleurs douce pour l'univers de la petite enfance :

- **Primary (Bleu)**: `#5a9dc9` - Propreté, sérénité
- **Secondary (Rose)**: `#f4c2c2` - Chaleur, enfance
- **Accent (Jaune)**: `#ffe5b4` - Actions positives
- **Success (Menthe)**: `#b5ead7` - Conformité HACCP

**Voir**: [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - Section "Palette de couleurs"

---

## 🚦 Workflow de développement

### 1. Nouvelle feature
```
1. Lire TODO.md pour vérifier la priorité
2. Consulter DESIGN-SYSTEM.md pour l'UI
3. Utiliser QUICK-START.md pour le template
4. Appliquer API-PATTERNS.md pour les requêtes
5. Tester et debugger avec ERRORS-SOLUTIONS.md
```

### 2. Correction de bug
```
1. Chercher dans ERRORS-SOLUTIONS.md
2. Vérifier les logs (console + terminal)
3. Consulter API-PATTERNS.md - Section "Gestion des erreurs"
4. Ajouter la solution dans ERRORS-SOLUTIONS.md si nouvelle
```

### 3. Review de code
```
1. Vérifier le filtrage enterprise_id (CLAUDE.md)
2. Vérifier les composants UI (DESIGN-SYSTEM.md)
3. Vérifier les patterns de requêtes (API-PATTERNS.md)
4. Vérifier la gestion d'erreurs (API-PATTERNS.md)
```

---

## 📚 Ressources externes

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React 19 Documentation](https://react.dev)

---

## 🤝 Contribuer à la documentation

Quand vous rencontrez une **nouvelle erreur** ou créez un **nouveau pattern** :

1. Ajoutez-le dans [ERRORS-SOLUTIONS.md](ERRORS-SOLUTIONS.md) ou [API-PATTERNS.md](API-PATTERNS.md)
2. Mettez à jour la date de dernière modification
3. Ajoutez un lien dans cette INDEX.md si nécessaire

**Objectif**: Économiser du temps et des tokens pour les futures conversations.

---

## 📞 Commandes de développement

```bash
# Développement
npm run dev              # Démarre le serveur dev sur localhost:3000

# Build & Production
npm run build            # Build de production
npm run start            # Lance le serveur production

# Base de données
npm run seed             # Seed la BDD avec données initiales
npm run db:reset         # Reset et reseed la BDD

# Linting
npm run lint             # Lance ESLint
```

---

## 🎯 Checklist avant commit

- [ ] Filtrage `enterprise_id` sur toutes les requêtes
- [ ] Composants shadcn/ui utilisés (pas de custom)
- [ ] Loading states et empty states présents
- [ ] Messages success/error affichés
- [ ] Responsive (mobile-first)
- [ ] TypeScript strict (pas d'erreurs)
- [ ] `npm run build` réussi
- [ ] Tests manuels effectués

**Voir**: [QUICK-START.md](QUICK-START.md) - Section "Checklist générale avant commit"

---

**Dernière mise à jour**: 2025-11-19

**Prochaine étape suggérée**: Lire [CLAUDE.md](CLAUDE.md) pour comprendre l'architecture globale du projet.
