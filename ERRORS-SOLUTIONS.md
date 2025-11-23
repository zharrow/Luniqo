# ERRORS-SOLUTIONS.md

Solutions aux problèmes courants dans **cLean**. Évitez de refaire les mêmes erreurs !

**Dernière mise à jour**: 2025-11-19

---

## 📋 Table des matières

1. [Erreurs Supabase](#erreurs-supabase)
2. [Erreurs TypeScript](#erreurs-typescript)
3. [Erreurs d'authentification](#erreurs-dauthentification)
4. [Erreurs de composants](#erreurs-de-composants)
5. [Erreurs de build](#erreurs-de-build)
6. [Erreurs de middleware](#erreurs-de-middleware)

---

## Erreurs Supabase

### ❌ "Invalid Relationships cannot infer result type"

**Erreur** :
```typescript
const { data } = await supabase
  .from('admin')
  .select('*, enterprise!enterprise_id(*)')
  // Erreur: admin.enterprise_id n'existe pas
```

**Cause** : Mauvaise compréhension de la relation admin ↔ enterprise. C'est `enterprise.admin_id` qui référence `admin.id`, pas l'inverse.

**✅ Solution** :
```typescript
// Méthode 1: Deux requêtes séparées (recommandé)
const { data: admin } = await supabase
  .from('admin')
  .select('*')
  .eq('id', adminId)
  .single()

const { data: enterprise } = await supabase
  .from('enterprise')
  .select('*')
  .eq('admin_id', adminId)
  .single()

// Méthode 2: Requête inversée
const { data: enterprise } = await supabase
  .from('enterprise')
  .select('*, admin:admin_id(*)')
  .eq('admin_id', adminId)
  .single()
```

**Voir** : [API-PATTERNS.md - Relations et jointures](#)

---

### ❌ "Export X doesn't exist in target module"

**Erreur** :
```typescript
import { Badge } from '@/components/ui/Badge'
// Erreur: Export Badge doesn't exist
```

**Cause** : Mauvaise casse dans le chemin d'import. Le fichier s'appelle `badge.tsx` (minuscule), pas `Badge.tsx`.

**✅ Solution** :
```typescript
import { Badge } from '@/components/ui/badge'  // ✅ Correct
```

---

### ❌ "A <Select.Item /> must have a value prop that is not an empty string"

**Erreur** :
```tsx
<SelectItem value="">Non renseigné</SelectItem>
// Erreur: value ne peut pas être vide
```

**Cause** : shadcn/ui Select n'autorise pas `value=""` pour éviter les conflits avec le placeholder.

**✅ Solution** :
```tsx
<Select
  value={formData.field || 'none'}
  onValueChange={(value) => setFormData({
    ...formData,
    field: value === 'none' ? '' : value
  })}
>
  <SelectContent>
    <SelectItem value="none">Non renseigné</SelectItem>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

**Voir** : [DESIGN-SYSTEM.md - Select component](#)

---

### ❌ RLS Policy Violation (42501)

**Erreur** :
```
Error: new row violates row-level security policy
Code: 42501
```

**Cause** : Row Level Security (RLS) bloque l'accès aux données. Possible si :
- Vous n'avez pas filtré par `enterprise_id`
- Votre session n'a pas les bonnes permissions
- Les politiques RLS sont mal configurées

**✅ Solution** :
```typescript
// Toujours filtrer par enterprise_id
const { data, error } = await supabase
  .from('room')
  .select('*')
  .eq('enterprise_id', session.enterprise.id)  // ✅ Obligatoire
```

Si le problème persiste, vérifier les politiques RLS dans Supabase Dashboard.

---

### ❌ Foreign Key Violation (23503)

**Erreur** :
```
Error: insert or update on table violates foreign key constraint
Code: 23503
```

**Cause** : Vous essayez de créer une relation avec un ID qui n'existe pas.

**✅ Solution** :
```typescript
// Vérifier que la référence existe avant d'insérer
const { data: room } = await supabase
  .from('room')
  .select('id')
  .eq('id', roomId)
  .single()

if (!room) {
  console.error('Room not found')
  return { success: false, error: 'Pièce introuvable' }
}

// Puis créer
const { error } = await supabase
  .from('assigned_task')
  .insert({ room_id: roomId, ... })
```

---

## Erreurs TypeScript

### ❌ "Type 'X' is not assignable to type 'Y'"

**Erreur** :
```typescript
const { data: admin } = await supabase.from('admin').select('*').single()
setAdminData(admin as AdminData)
// Erreur: Type 'SelectQueryError<...>' is not assignable to type 'AdminData'
```

**Cause** : Supabase peut retourner une erreur, et TypeScript le détecte.

**✅ Solution** :
```typescript
const { data: admin, error } = await supabase
  .from('admin')
  .select('*')
  .single()

if (admin && !error) {
  setAdminData(admin as unknown as AdminData)  // ✅ Double cast
}
```

**Alternative avec any** :
```typescript
setAdminData((admin as any) as AdminData)
```

---

### ❌ "Property 'X' does not exist on type 'Y'"

**Erreur** :
```typescript
const isActive = pathname?.startsWith(item.href + '/')
// Si item.href peut être undefined
```

**Cause** : TypeScript détecte qu'une propriété peut être `undefined`.

**✅ Solution** :
```typescript
const isActive = pathname && item.href
  ? pathname === item.href || pathname.startsWith(item.href + '/')
  : false
```

---

## Erreurs d'authentification

### ❌ Session null/undefined après login

**Erreur** :
```typescript
const { session } = useAuth()
// session est null même après login
```

**Cause** : Le composant n'est pas wrappé dans `AuthProvider` ou la session n'a pas été rechargée.

**✅ Solution** :
```typescript
// Vérifier que Providers.tsx wrap bien toute l'app
// app/layout.tsx
import Providers from '@/components/Providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// Après login, rafraîchir la session
const { refreshSession } = useAuth()
await refreshSession()
```

---

### ❌ Redirection infinie sur /login

**Erreur** : La page `/login` redirige en boucle vers elle-même.

**Cause** : Le middleware redirige les utilisateurs non connectés vers `/login`, mais `/login` n'est pas dans les routes publiques.

**✅ Solution** :
```typescript
// lib/supabase/middleware.ts
const isPublicRoute =
  request.nextUrl.pathname.startsWith('/login') ||
  request.nextUrl.pathname.startsWith('/auth')

if (!user && !isTabletRoute && !isPublicRoute) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
```

---

### ❌ User (employé) ne peut pas se connecter

**Erreur** : L'employé entre son PIN mais n'est pas authentifié.

**Cause** : Les employés n'utilisent PAS Supabase Auth, mais localStorage.

**✅ Solution** :
```typescript
// lib/utils/auth.client.ts - loginWithPin
const { success, data } = await loginWithPin({ pin, enterprise_id })

if (success) {
  // Stocker dans localStorage (PAS dans Supabase Auth)
  localStorage.setItem('user_session', JSON.stringify({
    user: data,
    role: 'User',
    enterprise: data.enterprise
  }))
}
```

**Voir** : [CLAUDE.md - Authentication System](#)

---

## Erreurs de composants

### ❌ "Hydration failed because the initial UI does not match"

**Erreur** :
```
Error: Hydration failed because the initial UI does not match what was rendered on the server
```

**Cause** : Différence entre le rendu serveur et client. Souvent causé par :
- Utilisation de `localStorage` dans un Server Component
- Date/heure qui change entre serveur et client
- Contenu dynamique sans `'use client'`

**✅ Solution** :
```typescript
// Ajouter 'use client' en haut du fichier
'use client'

// OU utiliser useEffect pour le contenu dynamique
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) return null

return <div>{/* Contenu dynamique */}</div>
```

---

### ❌ Sidebar "Tableau de bord" toujours actif

**Erreur** : L'onglet "Tableau de bord" est surligné même sur d'autres pages.

**Cause** : La logique `isActive` active `/dashboard` pour toutes les URLs commençant par `/dashboard/`.

**✅ Solution** :
```typescript
// components/layout/AppSidebar.tsx
const isActive = item.href === '/dashboard'
  ? pathname === '/dashboard'  // Égalité stricte pour /dashboard
  : pathname === item.href || pathname?.startsWith(item.href + '/')
```

**Voir** : Cette erreur a été corrigée dans cette session.

---

## Erreurs de build

### ❌ "Module not found: Can't resolve '@/components/...'"

**Erreur** :
```
Module not found: Can't resolve '@/components/ui/Badge'
```

**Cause** : Import avec mauvaise casse ou fichier inexistant.

**✅ Solution** :
```bash
# Vérifier que le fichier existe
ls components/ui/badge.tsx

# Vérifier l'import
import { Badge } from '@/components/ui/badge'  # Minuscule
```

---

### ❌ "Type error: Cannot find module 'X'"

**Erreur** lors du build TypeScript.

**Cause** : Import d'un module qui n'existe pas ou mauvais chemin.

**✅ Solution** :
```bash
# Vérifier les imports
# Vérifier tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

# Relancer le build
npm run build
```

---

### ❌ Build timeout ou "Killed"

**Erreur** : Le build s'arrête avec "Killed" ou timeout.

**Cause** : Pas assez de mémoire.

**✅ Solution** :
```bash
# Augmenter la mémoire Node
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# OU dans package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

---

## Erreurs de middleware

### ❌ Redirect en boucle vers /setup

**Erreur** : Admin redirigé en boucle vers `/setup`.

**Cause** : Le middleware ne détecte pas l'entreprise correctement ou `/setup` n'est pas dans les routes exclues.

**✅ Solution** :
```typescript
// lib/supabase/middleware.ts
const isSetupRoute = request.nextUrl.pathname === '/setup'

// Ne pas rediriger si déjà sur /setup
if (user && !isTabletRoute && !isPublicRoute && !isSetupRoute) {
  // Logique de vérification entreprise
}
```

---

### ❌ Middleware ne s'exécute pas

**Erreur** : Le middleware semble être ignoré.

**Cause** : Mauvaise configuration du `matcher` dans `middleware.ts`.

**✅ Solution** :
```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Patterns de débogage

### Console.log stratégique

```typescript
// Toujours logger les erreurs Supabase
const { data, error } = await supabase.from('table').select('*')
if (error) {
  console.error('Supabase error:', error)
  console.error('Error code:', error.code)
  console.error('Error details:', error.details)
}

// Logger l'état de la session
console.log('Session:', session)
console.log('User ID:', session?.user?.id)
console.log('Enterprise ID:', session?.enterprise?.id)
console.log('Role:', session?.role)
```

### Network tab (DevTools)

1. Ouvrir DevTools → Network
2. Filtrer par "supabase"
3. Vérifier les requêtes :
   - Status code (200 = OK, 400/500 = erreur)
   - Payload (données envoyées)
   - Response (données reçues)

### React DevTools

1. Installer React DevTools
2. Vérifier les props des composants
3. Vérifier le state
4. Vérifier le Context (AuthContext)

---

## Checklist de débogage

Quand quelque chose ne fonctionne pas :

- [ ] Vérifier la console browser (F12)
- [ ] Vérifier la console terminal (npm run dev)
- [ ] Vérifier que `session` n'est pas null
- [ ] Vérifier que `enterprise_id` est bien filtré
- [ ] Vérifier les imports (casse correcte)
- [ ] Vérifier que le composant a `'use client'` si nécessaire
- [ ] Essayer de rebuild (`npm run build`)
- [ ] Vérifier le middleware
- [ ] Vérifier les politiques RLS dans Supabase
- [ ] Lire les messages d'erreur COMPLETS (pas juste la première ligne)

---

## Ressources utiles

- [Supabase Error Codes](https://supabase.com/docs/guides/api#error-codes)
- [Next.js Error Messages](https://nextjs.org/docs/messages)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [shadcn/ui Components](https://ui.shadcn.com/docs)

---

**Astuce** : Quand vous rencontrez une nouvelle erreur, ajoutez-la ici avec la solution pour ne pas la rencontrer à nouveau !
