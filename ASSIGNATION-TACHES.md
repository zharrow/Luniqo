# Système d'assignation des tâches aux pièces

**Date de création** : 2025-11-29

## 📋 Vue d'ensemble

Le système d'assignation permet de lier des **tâches templates** à des **pièces** pour créer un workflow de nettoyage personnalisé pour chaque pièce de la crèche.

## 🏗️ Architecture

### Tables impliquées

1. **`room`** - Les pièces de la crèche
2. **`task_template`** - Les templates de tâches (quotidiennes, hebdomadaires, etc.)
3. **`assigned_task`** - La table de liaison (Many-to-Many)

### Schéma de la table `assigned_task`

```sql
CREATE TABLE assigned_task (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES room(id) ON DELETE SET NULL,
    task_template_id UUID REFERENCES task_template(id) ON DELETE SET NULL,
    default_performer_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    frequency JSONB,
    suggested_time TIME,
    expected_duration INT,
    order_in_room INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📁 Fichiers créés

### 1. Service d'assignation

**Fichier** : [`lib/services/assigned-tasks.service.ts`](lib/services/assigned-tasks.service.ts)

**Méthodes principales** :

```typescript
// Récupérer toutes les tâches assignées à une pièce
assignedTasksService.getByRoom(roomId: string)

// Récupérer uniquement les tâches actives
assignedTasksService.getActiveByRoom(roomId: string)

// Assigner une tâche à une pièce
assignedTasksService.create(input: CreateAssignedTaskInput)

// Assigner plusieurs tâches en une fois
assignedTasksService.bulkAssign(roomId: string, taskTemplateIds: string[])

// Retirer une tâche d'une pièce
assignedTasksService.unassign(roomId: string, taskTemplateId: string)

// Vérifier si une tâche est déjà assignée
assignedTasksService.isAssigned(roomId: string, taskTemplateId: string)

// Compter le nombre de tâches assignées
assignedTasksService.getCountByRoom(roomId: string)
```

### 2. Page de gestion des assignations

**Fichier** : [`app/(dashboard)/dashboard/rooms/[id]/page.tsx`](app/(dashboard)/dashboard/rooms/[id]/page.tsx)

**URL** : `/dashboard/rooms/{room_id}`

**Fonctionnalités** :

- ✅ Affichage du nom de la pièce
- ✅ Liste des tâches déjà assignées (avec ordre)
- ✅ Sélecteur pour assigner de nouvelles tâches
- ✅ Bouton pour retirer une tâche
- ✅ Badge avec le type de tâche (quotidienne, hebdomadaire, etc.)
- ✅ Filtrage automatique (n'affiche que les tâches non assignées)

### 3. Modification de la page des pièces

**Fichier** : [`app/(dashboard)/dashboard/rooms/page.tsx`](app/(dashboard)/dashboard/rooms/page.tsx)

**Ajout** : Bouton "Gérer les tâches" dans le menu dropdown de chaque pièce

## 🔄 Flux d'utilisation

### 1. Créer des pièces

1. Aller sur `/dashboard/rooms`
2. Cliquer sur "Nouvelle pièce"
3. Remplir le formulaire (nom, description)
4. Valider

### 2. Créer des templates de tâches

1. Aller sur `/dashboard/tasks`
2. Cliquer sur "Nouvelle tâche"
3. Remplir le formulaire :
   - Nom de la tâche
   - Type (Quotidienne, Hebdomadaire, Mensuelle, Occasionnelle)
   - Catégorie (optionnel)
   - Durée estimée (optionnel)
4. Valider

### 3. Assigner des tâches aux pièces

1. Aller sur `/dashboard/rooms`
2. Cliquer sur le menu "⋮" d'une pièce
3. Cliquer sur "Gérer les tâches"
4. Sélectionner une tâche dans le dropdown
5. Cliquer sur "Assigner"
6. Répéter pour toutes les tâches nécessaires

### 4. Utilisation dans les sessions de nettoyage

Les tâches assignées sont automatiquement récupérées lors de la création d'une session de nettoyage pour générer les `cleaning_log` correspondants.

## 🎯 Exemple de workflow complet

```
1. Admin crée une pièce "Salle de jeu"
   ↓
2. Admin crée des tâches templates :
   - "Aspirer le sol" (Quotidienne)
   - "Nettoyer les jouets" (Quotidienne)
   - "Laver les vitres" (Hebdomadaire)
   ↓
3. Admin assigne ces 3 tâches à "Salle de jeu"
   ↓
4. Employé démarre une session de nettoyage sur tablette
   ↓
5. Le système génère automatiquement 3 logs à compléter
   pour la "Salle de jeu"
```

## ✅ Tests à effectuer

- [ ] Créer une pièce via `/dashboard/rooms`
- [ ] Créer 2-3 tâches via `/dashboard/tasks`
- [ ] Accéder à `/dashboard/rooms/{id}` pour une pièce
- [ ] Assigner 2 tâches à la pièce
- [ ] Vérifier que les tâches assignées apparaissent bien dans l'ordre
- [ ] Retirer une tâche
- [ ] Vérifier que la tâche retirée réapparaît dans le dropdown
- [ ] Tenter d'assigner 2 fois la même tâche (doit afficher une alerte)

## 🔧 Résolution de problèmes

### La création de pièces ne fonctionne pas

**Vérifications** :

1. **Vérifier la connexion Supabase** :
   - Les variables d'environnement sont-elles correctes dans `.env.local` ?
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Vérifier la console du navigateur** :
   - Ouvrir les DevTools (F12)
   - Onglet "Console"
   - Chercher des erreurs en rouge

3. **Vérifier les tables Supabase** :
   - Aller sur le dashboard Supabase
   - Table Editor → `room`
   - Vérifier que la table existe

4. **Vérifier RLS** :
   - La migration `01_disable_rls_dev.sql` a-t-elle été exécutée ?
   - Dans Supabase : Authentication → Policies
   - RLS doit être désactivé en dev

### Les tâches assignées ne s'affichent pas

**Vérifications** :

1. **Console du navigateur** :
   - Chercher des erreurs lors du chargement des tâches
   - Vérifier la réponse de l'API Supabase

2. **Vérifier la base de données** :
   - Table `assigned_task`
   - Vérifier que les lignes existent avec les bons IDs

3. **Vérifier le filtrage** :
   - `room_id` correspond bien à l'ID de la pièce ?
   - `is_active = true` ?

## 🚀 Prochaines améliorations possibles

- [ ] Drag & drop pour réordonner les tâches dans une pièce
- [ ] Assignation en masse (sélectionner plusieurs tâches d'un coup)
- [ ] Duplication d'assignations d'une pièce à l'autre
- [ ] Prévisualisation de la session de nettoyage
- [ ] Définir des horaires suggérés pour chaque tâche
- [ ] Définir un employé par défaut pour certaines tâches

## 📚 Voir aussi

- [CLAUDE.md](CLAUDE.md) - Architecture globale du projet
- [API-PATTERNS.md](API-PATTERNS.md) - Patterns de requêtes Supabase
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - Design system et composants UI

---

**Dernière mise à jour** : 2025-11-29
