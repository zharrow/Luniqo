---
name: luniqo-security-audit
description: Vérifie les vulnérabilités de sécurité OWASP Top 10, injection SQL, XSS, CSRF, et authentification dans le code Luniqo. Utilise quand tu révises du code, vérifies la sécurité, ou analyses des vulnérabilités potentielles.
allowed-tools: Read, Grep, Glob
---

# Luniqo Security Audit

Audit de sécurité spécialisé pour l'application Luniqo (Next.js 15 + Supabase), avec focus sur la protection des données sensibles de crèches et l'isolation multi-tenant.

## Checklist de sécurité critique

### 🔒 1. Isolation des données (PRIORITÉ MAXIMALE)

**Problème spécifique Luniqo**: Fuite de données entre crèches (multi-tenant)

✅ **Vérifications obligatoires**:
- [ ] TOUS les queries Supabase filtrent par `enterprise_id`
- [ ] Aucun query ne retourne des données sans filtre enterprise
- [ ] Les jointures SQL préservent le filtre `enterprise_id`
- [ ] Les RLS (Row Level Security) sont activées sur toutes les tables sensibles

**Patterns à détecter**:
```typescript
// ❌ DANGER - Pas de filtre enterprise_id
const { data } = await supabase.from('room').select('*')

// ✅ SÉCURISÉ
const { data } = await supabase
  .from('room')
  .select('*')
  .eq('enterprise_id', session.enterprise.id)
```

**Grep patterns**:
```bash
# Chercher les queries sans filtre enterprise_id
grep -r "\.from\('room'\)" --include="*.ts" --include="*.tsx"
grep -r "\.from\('employee'\)" --include="*.ts" --include="*.tsx"
grep -r "\.from\('task_template'\)" --include="*.ts" --include="*.tsx"
```

### 🛡️ 2. Injection SQL & XSS

**Supabase Protection**: Supabase utilise des requêtes paramétrées par défaut, mais reste vigilant.

✅ **Vérifications**:
- [ ] Pas de raw SQL avec interpolation de chaînes
- [ ] Pas de `dangerouslySetInnerHTML` sans sanitization
- [ ] Les inputs utilisateur sont validés (zod, react-hook-form)
- [ ] Les URL parameters sont validés avant utilisation

**Patterns dangereux**:
```typescript
// ❌ DANGER - Raw SQL avec interpolation
await supabase.rpc('custom_query', { sql: `SELECT * FROM users WHERE id = ${userId}` })

// ❌ DANGER - XSS via dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SÉCURISÉ - Utiliser les queries Supabase standard
await supabase.from('users').select('*').eq('id', userId)
```

### 🔐 3. Authentification & Autorisation

**Architecture Luniqo**: 3 rôles (Developer, Owner, Employee) + Dual auth (Email/Password + PIN)

✅ **Vérifications**:
- [ ] Routes protégées avec `useRequireAuth(['Owner'])` ou rôle approprié
- [ ] Middleware vérifie la session Supabase (`updateSession`)
- [ ] PIN hashés avec bcrypt (jamais en clair)
- [ ] Session localStorage avec TTL (5 minutes max)
- [ ] Pas de tokens ou secrets en localStorage (sauf session)

**Patterns à détecter**:
```typescript
// ❌ DANGER - Route non protégée
export default function OwnerDashboard() {
  // Pas de useRequireAuth
}

// ✅ SÉCURISÉ
export default function OwnerDashboard() {
  const { session, isLoading } = useRequireAuth(['Owner'])
  if (isLoading) return <LoadingSpinner />
  // ...
}

// ❌ DANGER - PIN en clair
const pin = "1234"
await supabase.from('profiles').insert({ pin })

// ✅ SÉCURISÉ - PIN hashé avec bcrypt
const pinHash = await bcrypt.hash(pin, 10)
await supabase.from('profiles').insert({ pin_hash: pinHash })
```

### 🚫 4. CSRF & Clickjacking

✅ **Vérifications**:
- [ ] Server Actions utilisent Next.js built-in CSRF protection
- [ ] Pas de mutations sensibles via GET requests
- [ ] Headers CSP configurés dans `next.config.mjs`

### 🔑 5. Secrets & Variables d'environnement

✅ **Vérifications**:
- [ ] Pas de secrets hardcodés dans le code
- [ ] Variables sensibles dans `.env.local` (jamais committed)
- [ ] `NEXT_PUBLIC_*` uniquement pour variables publiques
- [ ] Service role key (`SUPABASE_SERVICE_ROLE_KEY`) utilisée UNIQUEMENT côté serveur

**Patterns dangereux**:
```typescript
// ❌ DANGER - Secret hardcodé
const apiKey = "sk_live_abc123..."

// ❌ DANGER - Service role key exposée au client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ❌ Accessible côté client!
)

// ✅ SÉCURISÉ - Utiliser anon key côté client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

### 📝 6. Validation des inputs

✅ **Vérifications**:
- [ ] Tous les formulaires utilisent zod schemas
- [ ] Validation côté client ET serveur
- [ ] Longueur max des inputs (prevent DoS)
- [ ] Types TypeScript stricts (pas de `any`)

**Pattern recommandé**:
```typescript
// ✅ SÉCURISÉ - Validation avec zod
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  enterprise_id: z.string().uuid()
})

// Validation serveur
const result = schema.safeParse(formData)
if (!result.success) {
  return { error: result.error }
}
```

### 🌐 7. CORS & API Security

✅ **Vérifications**:
- [ ] CORS configuré pour domaines autorisés uniquement
- [ ] Rate limiting sur les endpoints publics
- [ ] API routes authentifiées (pas d'endpoints ouverts)

### 📊 8. Logging & Monitoring

✅ **Vérifications**:
- [ ] Pas de logs de données sensibles (passwords, PINs, tokens)
- [ ] Erreurs génériques côté client (pas de stack traces)
- [ ] Monitoring des tentatives de connexion échouées

**Patterns dangereux**:
```typescript
// ❌ DANGER - Log de données sensibles
console.log('User password:', password)
console.log('Session:', session) // Peut contenir des tokens

// ✅ SÉCURISÉ
console.log('Login attempt for user:', email)
```

## Workflow d'audit

1. **Scan initial**: Grep pour patterns dangereux
2. **Review routes**: Vérifier protection auth sur toutes les routes
3. **Review queries**: Vérifier filtrage `enterprise_id` sur TOUS les queries
4. **Review forms**: Vérifier validation zod
5. **Review auth**: Vérifier hashing des PINs, session management
6. **Review env**: Vérifier que `.env.local` n'est pas committed

## Commandes utiles

```bash
# Chercher les queries sans filtre enterprise_id
grep -r "\.from\(" --include="*.ts" --include="*.tsx" | grep -v "enterprise_id"

# Chercher les dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" --include="*.tsx"

# Chercher les secrets potentiels hardcodés
grep -r "sk_" --include="*.ts" --include="*.tsx"
grep -r "password.*=.*['\"]" --include="*.ts"

# Chercher les routes non protégées
grep -r "export default function" app/ | grep -v "useRequireAuth"
```

## Ressources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Supabase Security Best Practices: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
