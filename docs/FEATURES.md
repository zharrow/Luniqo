# Features a venir

Liste des fonctionnalites planifiees pour Luniqo.

**Derniere mise a jour** : 2026-01-28

---

## Priorite haute

### 1. Comptes Parents — Invitation par l'Owner

**Objectif** : Permettre aux parents d'acceder au portail sans auto-inscription. Seul l'Owner peut declencher la creation de compte.

**Etat actuel** : L'architecture DB est deja en place (tables `guardian`, `guardian_child`, `guardian_user`, `family`). Le portail parent existe (`app/(portal)/portal/`). La page d'inscription accepte `?guardian_id=xxx&token=yyy` mais la validation de token n'est pas implementee (TODO dans le code). Le placeholder `createPortalAccount()` dans `guardian.service.ts` n'est pas implementee.

**Status** : A implementer

#### Plan d'implementation

**Etape 1 — Migration DB `guardian_invitation`**
Creer `supabase/migrations/66_guardian_invitation.sql`
- Table `guardian_invitation` : id, guardian_id, email, token (64 chars unique), expires_at (7j), used_at, invited_by_id, nursery_id, created_at
- Index sur token, guardian_id, email

**Etape 2 — Service email (Resend)**
Installer `resend` via npm
Creer `lib/services/email.service.ts`
- Methode `sendGuardianInvitation(to, guardianName, nurseryName, invitationUrl)`
- Email HTML en francais avec branding Luniqo + bouton CTA + expiration 7j
- Variable d'env : `RESEND_API_KEY`

**Etape 3 — Server actions invitation**
Creer `lib/actions/invitation.actions.ts` (meme pattern que `users.actions.ts`)
- `inviteGuardianToPortal(guardianId, invitedById, nurseryId)` :
  1. Verifie que le guardian existe et a un email
  2. Verifie qu'il n'a pas deja de `guardian_user` (deja inscrit)
  3. Invalide les invitations precedentes
  4. Genere token crypto 64 chars
  5. Insert dans `guardian_invitation` (expires = NOW + 7j)
  6. Envoie email via Resend
  7. Retourne success/error
- `validateInvitationToken(token, guardianId)` :
  1. Verifie token existe, non utilise, non expire, guardian_id correct
  2. Retourne email du guardian si valide
- `markInvitationUsed(token)` :
  1. Update `used_at = NOW()`

**Etape 4 — Modifier la page d'inscription portail**
Modifier `app/(portal)/portal/register/page.tsx`
- Au mount : si pas de `token` ou `guardian_id` dans l'URL → afficher message bloquant
- Si token present : appeler `validateInvitationToken()` → si invalide/expire, afficher erreur
- Si valide : pre-remplir l'email (read-only) depuis le guardian
- Apres inscription reussie : appeler `markInvitationUsed(token)`

**Etape 5 — Ajouter methode au guardian service**
Modifier `lib/services/guardian.service.ts`
- Ajouter `getGuardiansWithPortalStatus(familyId)` : LEFT JOIN avec `guardian_user` pour savoir quels guardians sont inscrits au portail

**Etape 6 — UI Owner : bouton inviter sur la page famille**
Modifier `app/(owner)/owner/families/[id]/page.tsx`
- Remplacer le placeholder "Tuteurs et enfants" par la vraie liste des guardians
- Charger les guardians via `guardianService.getGuardiansWithPortalStatus(familyId)`
- Pour chaque guardian : badge "Portail actif" (vert) ou "Non inscrit" (gris)
- Bouton "Inviter au portail" pour les non-inscrits ayant un email
- Appel `inviteGuardianToPortal()` + toast succes/erreur

**Etape 7 — Middleware : routes portail publiques**
Modifier `lib/supabase/middleware.ts`
- Ajouter `/portal/login` et `/portal/register` a `isPublicRoute`

#### Fichiers a creer
| Fichier | But |
|---------|-----|
| `supabase/migrations/66_guardian_invitation.sql` | Table invitation tokens |
| `lib/actions/invitation.actions.ts` | Server actions invitation |
| `lib/services/email.service.ts` | Service email Resend |

#### Fichiers a modifier
| Fichier | Changements |
|---------|-------------|
| `app/(portal)/portal/register/page.tsx` | Validation token, pre-fill email, bloquer sans token |
| `lib/services/guardian.service.ts` | Ajouter `getGuardiansWithPortalStatus()` |
| `app/(owner)/owner/families/[id]/page.tsx` | Liste guardians + bouton inviter |
| `lib/supabase/middleware.ts` | Ajouter portal routes publiques |
| `package.json` | Ajouter dep `resend` |

---

### 2. Connexion Google OAuth pour les Owners

**Objectif** : Permettre aux Owners existants de se connecter avec leur compte Google. Pas de creation de compte via Google (seuls les Owners crees par un Developer peuvent se connecter).

**Status** : A implementer

#### Plan d'implementation

**Etape 8 — Route callback OAuth**
Creer `app/auth/callback/route.ts`
- GET handler : exchange code for session via `supabase.auth.exchangeCodeForSession(code)`
- Apres exchange : verifier que le user a un profil valide (`profiles` avec `is_active = true`)
- Si profil existe → redirect vers `/login` (AuthContext gere le redirect par role)
- Si profil inexistant ou auto-cree (created_by_id IS NULL + cree < 60s) → signup non autorise : signOut + cleanup + redirect `/login?error=no_account`
- Si erreur → redirect `/login?error=auth_callback_error`

**Etape 9 — Bouton Google sur la page login**
Modifier `app/(auth)/login/page.tsx`
- Ajouter separateur "ou" apres le formulaire
- Bouton "Se connecter avec Google" avec logo SVG Google
- Fonction `handleGoogleLogin()` appelant `supabase.auth.signInWithOAuth()`
- Lire `?error=` dans l'URL pour afficher les messages d'erreur OAuth
- Ajouter `useEffect` : si deja connecte (session presente), redirect automatique par role

**Prerequis config (manuel)** :
1. Activer provider Google dans Supabase Dashboard (Authentication > Providers)
2. Configurer credentials OAuth Google Cloud (Client ID + Secret)
3. Redirect URI autorisee : `https://<projet>.supabase.co/auth/v1/callback`

#### Fichiers a creer
| Fichier | But |
|---------|-----|
| `app/auth/callback/route.ts` | OAuth callback handler |

#### Fichiers a modifier
| Fichier | Changements |
|---------|-------------|
| `app/(auth)/login/page.tsx` | Bouton Google + auto-redirect + erreurs OAuth |

---

## Priorite basse (quand revenus stables)

### 3. SSO SAML 2.0 pour les groupes de creches

**Objectif** : Permettre aux grands groupes de creches de connecter leurs employes via leur identity provider d'entreprise (Azure AD, Google Workspace, Okta).

**Prerequis** :
- Plan Pro Supabase (la fonctionnalite SSO SAML n'est pas disponible sur le plan gratuit)
- Un client entreprise avec un IdP compatible SAML 2.0

**Implementation** :
```bash
supabase sso add --type saml \
  --metadata-url "https://idp-client.example.com/metadata.xml" \
  --domains "groupe-creches-example.com"
```

**Cas d'usage** : Un groupe de 20 creches utilisant Azure AD pourrait permettre a tous ses employes de se connecter avec leurs identifiants corporate.

**Status** : Planifie — implementation differee

---

## Verification (features 1 & 2)

1. **Invitation** : depuis `/owner/families/[id]`, cliquer "Inviter" sur un guardian → email recu → cliquer le lien → page inscription avec email pre-rempli → creer compte → redirect portail home
2. **Token invalide** : acceder a `/portal/register` sans token → message bloquant. Token expire → message erreur
3. **Token usage unique** : utiliser un token deja utilise → erreur
4. **Google OAuth** : sur `/login`, cliquer Google → auth Google → redirect callback → redirect dashboard
5. **Google sans compte** : se connecter Google avec un email inconnu → erreur "Aucun compte Luniqo associe"
6. **`npm run build`** : zero erreurs TypeScript

---

## Notes

- Toutes ces fonctionnalites sont realisables avec Supabase Auth (pas besoin de migrer vers Keycloak ou Better Auth)
- L'architecture actuelle (profiles + auth.users + triggers) reste la base pour toutes ces evolutions
- Le systeme de PIN tablette pour les employes reste custom et inchange
- Les invitations utilisent un systeme de token custom (pas `auth.admin.inviteUserByEmail()`) pour garder le controle sur le flux d'inscription et le lien `guardian_user`
- Google OAuth est reserve aux comptes existants : pas de creation de compte via Google
