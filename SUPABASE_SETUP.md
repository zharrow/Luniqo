# 🚀 Guide de Configuration Supabase - cLean App

Ce guide vous explique comment configurer Supabase pour votre application cLean (Next.js).

---

## 📋 Prérequis

- Un compte Supabase (gratuit) : [supabase.com](https://supabase.com)
- Node.js 18+ installé
- Git installé

---

## 🏗️ Étape 1 : Créer un projet Supabase

1. **Connectez-vous** à [Supabase Dashboard](https://supabase.com/dashboard)

2. **Créez un nouveau projet** :
   - Cliquez sur "New Project"
   - Nom du projet : `clean-app` (ou votre choix)
   - Database Password : **Notez-le précieusement** (vous en aurez besoin)
   - Région : Choisissez la plus proche de vos utilisateurs (ex: `Europe (Frankfurt)`)
   - Cliquez sur "Create new project"

3. **Attendez** que le projet soit provisionné (1-2 minutes)

---

## 🔐 Étape 2 : Récupérer les clés API

Une fois le projet créé :

1. Dans le dashboard, allez dans **Settings** (icône engrenage en bas à gauche)

2. Cliquez sur **API** dans le menu latéral

3. **Copiez les informations suivantes** :

   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (très longue clé)
   - **service_role key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (très longue clé secrète)

4. **Configurez votre `.env.local`** :

```bash
# Dans le dossier cleanapp-nextjs
cp .env.local.example .env.local
```

Puis éditez `.env.local` et remplacez :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANT** : Ne commitez jamais `.env.local` dans Git !

---

## 🗄️ Étape 3 : Créer le schéma de base de données

### Option A : Interface Supabase (Recommandée)

1. Dans le dashboard Supabase, allez dans **SQL Editor** (icône base de données)

2. Cliquez sur **New Query**

3. **Copiez tout le contenu** du fichier `supabase/migrations/00_schema.sql`

4. **Collez-le** dans l'éditeur SQL

5. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter`)

6. Vérifiez qu'il n'y a pas d'erreurs (le message "Success. No rows returned" est normal)

7. Allez dans **Table Editor** pour vérifier que toutes les tables ont été créées :
   - developer
   - admin
   - enterprise
   - user
   - room
   - user_rooms
   - task_template
   - assigned_task
   - cleaning_session
   - cleaning_log
   - export
   - child
   - meal
   - temperature
   - product
   - supplier
   - batch
   - equipment
   - cleaning_haccp
   - non_compliance
   - document
   - meal_children
   - conversation
   - message
   - notification

### Option B : Supabase CLI (Avancé)

Si vous préférez utiliser la CLI :

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier le projet (remplacez PROJECT_REF par votre référence projet)
supabase link --project-ref xxxxx

# Appliquer les migrations
supabase db push
```

---

## 🔒 Étape 4 : Configurer l'authentification

### Activer l'authentification Email/Password

1. Allez dans **Authentication** → **Providers**

2. **Email** : Activez-le (devrait être activé par défaut)

3. **Désactivez** la confirmation par email pour le développement :
   - Allez dans **Authentication** → **Settings**
   - Décochez "Enable email confirmations"
   - Cliquez sur "Save"

⚠️ **Pour la production** : Réactivez les confirmations d'email !

### Configuration Firebase Auth (optionnel)

Si vous souhaitez utiliser Firebase Auth (comme dans l'app d'origine) :

1. Créez un projet Firebase : [console.firebase.google.com](https://console.firebase.google.com)
2. Activez Authentication → Email/Password
3. Ajoutez les credentials Firebase dans `.env.local`

**Note** : Supabase Auth est recommandé pour simplifier l'architecture.

---

## 📦 Étape 5 : Configurer le Storage (pour les photos)

1. Allez dans **Storage** dans le menu

2. Cliquez sur **Create a new bucket**

3. Créez 3 buckets :

   - **Nom** : `cleaning-photos`
     - Public : ✅ Oui
     - File size limit : `5 MB`

   - **Nom** : `documents`
     - Public : ❌ Non
     - File size limit : `10 MB`

   - **Nom** : `logos`
     - Public : ✅ Oui
     - File size limit : `2 MB`

4. **Configurez les politiques de sécurité** (RLS) :

Pour chaque bucket, allez dans **Policies** et ajoutez :

```sql
-- cleaning-photos : Les users peuvent uploader dans leur enterprise
CREATE POLICY "Users can upload to their enterprise folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cleaning-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- cleaning-photos : Lecture publique
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cleaning-photos');
```

---

## 🔐 Étape 6 : Configurer Row Level Security (RLS)

⚠️ **RLS est déjà activé** dans le schéma, mais les **politiques** doivent être créées.

Pour l'instant, pour le développement, vous pouvez désactiver temporairement RLS :

1. Allez dans **SQL Editor**
2. Exécutez cette requête (à faire pour CHAQUE table) :

```sql
-- Exemple pour la table enterprise
ALTER TABLE enterprise FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enterprise isolation" ON enterprise;
CREATE POLICY "Enterprise isolation"
ON enterprise
FOR ALL
TO authenticated
USING (admin_id = auth.uid()::uuid);

-- Répétez pour chaque table avec enterprise_id
```

📌 **TODO** : Créer un fichier de migration dédié pour les politiques RLS.

---

## ✅ Étape 7 : Vérifier la configuration

### Test de connexion

Créez un fichier de test `test-supabase.ts` :

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  const { data, error } = await supabase.from('enterprise').select('count')

  if (error) {
    console.error('❌ Erreur de connexion:', error)
  } else {
    console.log('✅ Connexion Supabase réussie!')
    console.log('Nombre d\'enterprises:', data)
  }
}

testConnection()
```

Exécutez :

```bash
npx ts-node test-supabase.ts
```

Si vous voyez "✅ Connexion Supabase réussie!", tout est bon !

---

## 🎯 Étape 8 : Insérer les données de seed (démo)

📌 **Prochaine étape** : Créer un script de seed avec des données de test.

Ce script créera :
- 1 développeur
- 2 admins (2 crèches)
- 5 users (employés)
- 10 rooms
- 20 tasks
- Données HACCP (enfants, repas, produits)

Le script sera disponible dans `scripts/seed.ts`.

---

## 🚀 Étape 9 : Démarrer l'application

```bash
cd cleanapp-nextjs
npm install
npm run dev
```

Accédez à : [http://localhost:3000](http://localhost:3000)

---

## 📚 Ressources utiles

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase + Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🆘 Dépannage

### Erreur "relation does not exist"
→ Les tables n'ont pas été créées. Vérifiez l'étape 3.

### Erreur "Invalid API key"
→ Vérifiez votre `.env.local` et les clés API.

### Erreur "permission denied for table"
→ Problème de RLS. Temporairement, désactivez RLS pour le développement.

### "Cannot connect to Supabase"
→ Vérifiez que votre projet Supabase est bien actif dans le dashboard.

---

## 🔄 Migration depuis l'ancienne app (FastAPI + PostgreSQL)

Si vous souhaitez migrer les données existantes :

1. **Exportez** les données depuis PostgreSQL :
```bash
pg_dump -h localhost -U postgres -d cleaning_db --data-only --inserts > data.sql
```

2. **Adaptez** les UUIDs et les contraintes

3. **Importez** dans Supabase via SQL Editor

📌 **Note** : Un script de migration automatique sera créé si nécessaire.

---

## ✅ Checklist finale

Avant de passer au développement, vérifiez que :

- [ ] Projet Supabase créé
- [ ] `.env.local` configuré avec les clés API
- [ ] Schéma de base de données déployé (25+ tables)
- [ ] Authentication activée
- [ ] Storage buckets créés
- [ ] Test de connexion réussi
- [ ] RLS configuré (au moins basique)

🎉 **Félicitations !** Votre backend Supabase est prêt. Vous pouvez maintenant développer le frontend Next.js.

---

**Prochaines étapes** :
1. Créer les types TypeScript à partir du schéma Supabase
2. Configurer le design system (Tailwind)
3. Implémenter l'authentification multi-tiers
4. Développer les modules (cLean, HACCP, Communication)
