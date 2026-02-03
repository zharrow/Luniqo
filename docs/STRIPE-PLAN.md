# Plan d'intégration Stripe pour Luniqo

## Résumé

Intégration complète de Stripe pour deux cas d'usage :
1. **Abonnements modules** : Les Owners souscrivent aux modules pour leurs crèches (paiements récurrents mensuels)
2. **Paiements factures** : Les familles paient leurs factures en ligne (paiements ponctuels)

Architecture basée sur **Stripe Checkout** (pages hébergées) pour minimiser la charge PCI.

---

## 1. Packages à installer

```bash
npm install stripe @stripe/stripe-js
```

- `stripe` : SDK backend (API routes, webhooks)
- `@stripe/stripe-js` : SDK frontend (optionnel, pour éléments embarqués)

---

## 2. Variables d'environnement

Ajouter dans `.env.local` :

```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## 3. Migration base de données

**Fichier** : `supabase/migrations/65_stripe_integration.sql`

### Nouvelles tables :

| Table | Description |
|-------|-------------|
| `stripe_customer` | Mapping Enterprise → Stripe Customer |
| `stripe_subscription` | Abonnements actifs avec status |
| `stripe_subscription_item` | Items d'abonnement (1 par module) |
| `stripe_checkout_session` | Sessions de paiement en cours |
| `stripe_webhook_event` | Events traités (idempotence) |

### Modifications tables existantes :

- `module` : Ajouter `stripe_price_id`, `stripe_price_id_annual`
- `payment` : Ajouter `stripe_payment_intent_id`
- `payment_method` : Déjà prêt (`stripe_customer_id`, `stripe_payment_method_id`)

---

## 4. Services à créer

### 4.1 `lib/services/stripe.service.ts`

Service principal pour :
- `getOrCreateCustomer(enterpriseId)` - Créer/récupérer client Stripe
- `createSubscriptionCheckout(...)` - Checkout pour abonnements
- `createInvoicePaymentCheckout(...)` - Checkout pour factures
- `createPortalSession(...)` - Portail client Stripe
- `getEnterpriseSubscriptions(...)` - Liste des abonnements
- `cancelSubscription(...)` - Annuler à la fin de période

### 4.2 `lib/services/stripe-webhook.service.ts`

Gestionnaire de webhooks avec :
- Vérification idempotence (éviter doublons)
- Handlers pour chaque event type
- Intégration avec `modules.service.ts` pour accorder/révoquer accès

**Events à gérer** :
- `checkout.session.completed`
- `customer.subscription.created/updated/deleted`
- `invoice.payment_succeeded`
- `payment_intent.succeeded/payment_failed`

### 4.3 `lib/actions/stripe.actions.ts`

Actions serveur pour :
- `syncStripePrices()` - Sync prix Stripe → modules
- `createStripeProducts()` - Créer produits initiaux
- `processStripeRefund()` - Rembourser un paiement

---

## 5. API Routes à créer

```
app/api/stripe/
├── checkout/route.ts    # POST - Créer session checkout
├── webhooks/route.ts    # POST - Recevoir webhooks Stripe
└── portal/route.ts      # POST - Créer session portail client
```

### Pourquoi des API Routes ?

- Les webhooks nécessitent le body brut pour vérification signature
- Stripe envoie des requêtes HTTP POST directes
- Pas compatible avec les Server Actions

### Pattern webhook :

```typescript
export async function POST(request: NextRequest) {
  const body = await request.text() // Body brut
  const signature = headers().get('stripe-signature')!

  // Vérification signature OBLIGATOIRE
  const event = stripe.webhooks.constructEvent(
    body, signature, process.env.STRIPE_WEBHOOK_SECRET!
  )

  // Traitement idempotent
  await stripeWebhookService.handleEvent(event)

  return NextResponse.json({ received: true })
}
```

---

## 6. Pages UI à créer

### 6.1 Page abonnements Owner

**Fichier** : `app/(owner)/owner/billing/page.tsx`

Fonctionnalités :
- Afficher abonnement actuel et modules actifs
- Grille de sélection modules avec prix
- Bouton "Souscrire" → Redirect Stripe Checkout
- Bouton "Gérer paiements" → Stripe Customer Portal
- Historique des paiements

### 6.2 Page succès/échec

**Fichiers** :
- `app/(owner)/owner/billing/success/page.tsx`
- `app/(owner)/owner/billing/cancel/page.tsx`

### 6.3 Paiement facture famille (optionnel Phase 2)

**Fichier** : `app/(portal)/portal/invoices/[id]/pay/page.tsx`

---

## 7. Intégration avec modules existants

Le webhook `customer.subscription.created` :
1. Récupère les modules dans `subscription.items`
2. Appelle `modulesService.grantNurseryModuleAccess()` pour chaque module
3. Stocke la relation dans `stripe_subscription_item`

Le webhook `customer.subscription.deleted` :
1. Appelle `modulesService.revokeNurseryModuleAccess()` pour chaque module

---

## 8. Configuration Stripe Dashboard

### Produits à créer (1 par module payant) :

| Module | Prix mensuel | Metadata |
|--------|-------------|----------|
| Nettoyage | 29 EUR | `module_id: cleaning` |
| HACCP Traçabilité | 39 EUR | `module_id: haccp` |
| Enfants & Familles | 29 EUR | `module_id: children` |
| Présences & Activités | 39 EUR | `module_id: attendance` |
| Personnel & Planning | 49 EUR | `module_id: staff` |
| Inscriptions & Contrats | 39 EUR | `module_id: enrollment` |
| Facturation & Finances | 59 EUR | `module_id: billing` |
| Analytics | 49 EUR | `module_id: analytics` |

### Webhook endpoint :

- URL : `https://luniqo.com/api/stripe/webhooks`
- Events : `checkout.session.completed`, `customer.subscription.*`, `payment_intent.*`, `invoice.payment_succeeded`

### Customer Portal :

Activer dans Dashboard → Settings → Billing → Customer portal

---

## 9. Sécurité

| Aspect | Solution |
|--------|----------|
| PCI Compliance | Stripe Checkout (hosted) = SAQ A minimal |
| Webhook spoofing | Vérification signature obligatoire |
| Replay attacks | Table `stripe_webhook_event` pour idempotence |
| Auth API routes | Vérification `supabase.auth.getUser()` |
| Operations privilégiées | Service role pour webhooks uniquement |

---

## 10. Fichiers à créer/modifier

### Nouveaux fichiers :

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/65_stripe_integration.sql` | Schema DB |
| `lib/services/stripe.service.ts` | Service principal |
| `lib/services/stripe-webhook.service.ts` | Handler webhooks |
| `lib/actions/stripe.actions.ts` | Actions serveur |
| `app/api/stripe/checkout/route.ts` | API checkout |
| `app/api/stripe/webhooks/route.ts` | API webhooks |
| `app/api/stripe/portal/route.ts` | API portail |
| `app/(owner)/owner/billing/page.tsx` | Page abonnements |
| `app/(owner)/owner/billing/success/page.tsx` | Page succès |

### Fichiers à modifier :

| Fichier | Modification |
|---------|--------------|
| `types/database.types.ts` | Ajouter types nouvelles tables |
| `components/layout/AppSidebar.tsx` | Ajouter lien "Facturation" |
| `.env.local` | Variables Stripe |

---

## 11. Ordre d'implémentation

1. **Installer packages** : `npm install stripe @stripe/stripe-js`
2. **Variables env** : Ajouter clés Stripe
3. **Migration DB** : Créer `65_stripe_integration.sql`
4. **Types** : Mettre à jour `database.types.ts`
5. **Services** : `stripe.service.ts` + `stripe-webhook.service.ts`
6. **API Routes** : checkout, webhooks, portal
7. **Actions** : `stripe.actions.ts`
8. **UI** : Page billing + success
9. **Sidebar** : Ajouter lien
10. **Stripe Dashboard** : Créer produits + configurer webhook
11. **Test** : Flow complet abonnement

---

## 12. Vérification

### Tests manuels :

1. **Créer abonnement** :
   - Aller sur `/owner/billing`
   - Sélectionner modules
   - Cliquer "Souscrire"
   - Compléter paiement Stripe (carte test: 4242 4242 4242 4242)
   - Vérifier redirection vers `/owner/billing/success`
   - Vérifier accès modules dans sidebar

2. **Portail client** :
   - Cliquer "Gérer paiements"
   - Vérifier redirection Stripe Portal
   - Modifier moyen de paiement
   - Annuler abonnement

3. **Webhooks** :
   - Vérifier events dans `stripe_webhook_event`
   - Vérifier `stripe_subscription` créé
   - Vérifier `nursery_module_access` accordé

### Commandes utiles :

```bash
# Écouter webhooks en local (Stripe CLI)
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Trigger event test
stripe trigger checkout.session.completed
```

---

## Notes

- Les modules "base" restent gratuits et n'ont pas besoin de Stripe
- Le pricing est par crèche (pas par enterprise)
- Les webhooks utilisent le service role pour modifier les accès modules
- Stripe Checkout supporte CB, SEPA, Apple Pay, Google Pay automatiquement

---

## Sources

- [Stripe Integration Skill by wshobson](https://skillsmp.com/skills/wshobson-agents-plugins-payment-processing-skills-stripe-integration-skill-md)
- [Stripe Best Practices](https://mcpservers.org/claude-skills/stripe/stripe-best-practices)
- [Stripe Checkout Documentation](https://docs.stripe.com/payments/checkout)
