# Phase 6: Portail Parents

**Statut**: 🔄 EN COURS (50%)
**Début**: 2026-01-13
**Priorité**: 🟡 MOYENNE

---

## 🎯 Objectif

Créer une application mobile/web pour les parents : cahier de vie quotidien, messagerie, documents partagés, notifications push, attestations fiscales et suivi développement enfant en temps réel.

---

## 📊 Progression

- ✅ **Base de données** (100%) ✅ FAIT - 8 migrations SQL
- ✅ **Services** (100%) ✅ FAIT - 6 services TypeScript (~2,830 lignes)
- ✅ **Pages UI Owner** (100%) ✅ FAIT - 6 pages gestion portail (~2,520 lignes)
- ✅ **App Mobile Parents** (100%) ✅ FAIT - 14 pages PWA (~4,700 lignes)
- ✅ **Composants** (100%) ✅ FAIT - Composants intégrés dans les pages

---

## 🗄️ Architecture de Données (8 Tables)

### 1. `timeline_post` - Publications cahier de vie
- Publications quotidiennes (activités, repas, siestes, photos, observations)
- Types: activity, meal, nap, photo, video, milestone, observation, artwork, mood, health_note
- Médias (photos/vidéos Supabase Storage)
- Réactions parents (❤️, 👍, 😊) stockées en JSONB
- Visibilité contrôlée

### 2. `parent_comment` - Commentaires parents
- Commentaires des parents sur les posts
- Modération optionnelle par Owner
- Fil de discussion par post

### 3. `parent_message` - Messagerie parent-crèche
- Messages privés bidirectionnels (guardian ↔ employee)
- Catégories: general, absence_notification, urgent, administrative
- Pièces jointes
- Fil de conversation (reply_to_message_id)
- Statut lecture

### 4. `parent_notification` - Notifications push
- Notifications app mobile (FCM/APNS)
- Types: new_post, new_message, invoice_available, payment_reminder, document_uploaded, authorization_expiring, announcement
- Deeplinks vers contenu spécifique
- Statut lecture

### 5. `parent_document_share` - Documents partagés
- Partage documents vers parents (menus, règlements, factures, calendriers)
- Scope: all_families, specific_families, specific_child
- Types: menu, calendar, regulation, invoice, certificate, report, photo_album, announcement, consent_form
- Confirmation lecture obligatoire (optionnel)

### 6. `document_acknowledgment` - Confirmations de lecture
- Traçabilité lecture/téléchargement documents
- Statistiques téléchargements
- Conformité RGPD

### 7. `tax_certificate` - Attestations fiscales
- Attestations annuelles pour déclaration impôts
- Calcul crédit d'impôt (50% frais de garde, plafonné 2300€/enfant)
- Génération PDF conforme
- Signature directeur

### 8. `caf_document` - Documents CAF
- Attestations mensuelles de présence pour CAF
- Justificatifs de paiement
- Données structurées (JSONB)
- Envoi automatique aux familles

---

## 🔧 Services TypeScript (6 Services)

### TimelineService (`lib/services/timeline.service.ts`)
**Publications:**
- `createPost(childId, data)` - Créer publication
- `getPosts(childId, filters)` - Liste posts
- `updatePost(postId, data)`, `deletePost(postId)`
- `publishPost(postId)` - Publier (visible aux parents)

**Médias:**
- `uploadMedia(postId, files)` - Upload photos/vidéos
- `deleteMedia(postId, mediaUrl)`

**Réactions:**
- `addReaction(postId, guardianId, emoji)`
- `removeReaction(postId, guardianId)`
- `getReactions(postId)`

**Commentaires:**
- `addComment(postId, guardianId, text)`
- `getComments(postId)`, `deleteComment(commentId)`

---

### ParentMessagingService (`lib/services/parent-messaging.service.ts`)
**Messages:**
- `sendMessage(data)` - Envoyer message
- `getConversation(familyId, employeeId)` - Thread complet
- `getUnreadMessages(guardianId)`, `markAsRead(messageId)`

**Notifications:**
- `createNotification(guardianId, data)`
- `getNotifications(guardianId, unreadOnly)`
- `markNotificationAsRead(notificationId)`, `markAllAsRead(guardianId)`

**Push:**
- `sendPushNotification(guardianId, title, body, data)`
- `registerPushToken(guardianId, token, platform)`

---

### ParentDocumentsService (`lib/services/parent-documents.service.ts`)
- `shareDocument(nurseryId, data)` - Partager document
- `getDocuments(guardianId)`, `getDocumentsByFamily(familyId)`
- `acknowledgeDocument(documentId, guardianId)` - Confirmer lecture
- `getAcknowledgments(documentId)` - Stats lecture
- `recordDownload(documentId, guardianId)`

---

### TaxCertificateService (`lib/services/tax-certificate.service.ts`)
- `generate(familyId, childId, year)` - Générer attestation
- `generateForAllFamilies(nurseryId, year)` - Batch annuel
- `calculateDeductibleAmount(familyId, childId, year)` - Calcul crédit impôt
- `generatePDF(certificateId)` - PDF conforme
- `send(certificateId)` - Envoi email + app

---

### CAFDocumentService (`lib/services/caf-document.service.ts`)
- `generateMonthlyAttendanceCertificate(childId, month)` - Attestation mensuelle
- `generatePaymentProof(familyId, month)` - Justificatif paiement
- `getDocuments(familyId)`, `sendToFamily(documentId)`

---

### ParentPortalService (`lib/services/parent-portal.service.ts`)
- `getDashboard(guardianId)` - Dashboard parent
- `getChildTimeline(childId, guardianId)` - Timeline enfant
- `getUnreadCount(guardianId)` - Compteurs notifs
- `updatePreferences(guardianId, prefs)` - Paramètres
- `updateNotificationSettings(guardianId, settings)` - Config push

---

## 📱 Pages UI à Créer

### Routes Owner (6 pages)
- `/owner/portal` - Dashboard portail (stats usage)
- `/owner/portal/timeline` - Modération timeline
- `/owner/portal/messages` - Messagerie (toutes conversations)
- `/owner/portal/documents` - Gestion documents partagés
- `/owner/portal/documents/share` - Partager nouveau document
- `/owner/portal/certificates` - Attestations fiscales
- `/owner/portal/certificates/generate` - Générer attestations annuelles

### Application Mobile Parents (14 pages)
- `/portal/login` - Connexion parent
- `/portal/register` - Inscription (lien invitation)
- `/portal/home` - Dashboard parent
- `/portal/children` - Liste mes enfants
- `/portal/children/[id]` - Profil enfant
- `/portal/timeline` - Timeline globale
- `/portal/timeline/[childId]` - Timeline enfant
- `/portal/timeline/[postId]` - Détail post
- `/portal/messages` - Messagerie
- `/portal/messages/[conversationId]` - Conversation
- `/portal/documents` - Mes documents
- `/portal/invoices` - Mes factures
- `/portal/certificates` - Attestations fiscales
- `/portal/profile` - Mon profil

---

## 🧩 Composants Réutilisables

### Portal Parents (Mobile App)
- `TimelinePostCard.tsx`, `MediaGallery.tsx`, `ReactionPicker.tsx`
- `CommentList.tsx`, `CommentForm.tsx`
- `MessageBubble.tsx`, `ConversationList.tsx`
- `DocumentCard.tsx`, `PDFViewer.tsx`
- `NotificationCard.tsx`, `NotificationBadge.tsx`
- `ChildCard.tsx`, `DailyReportSummary.tsx`
- `InvoiceCard.tsx`, `TaxCertificateCard.tsx`

### Owner Admin
- `TimelineModerationPanel.tsx`
- `MessageInbox.tsx`
- `DocumentShareForm.tsx`
- `PortalUsageStats.tsx`

---

## 📋 Migrations SQL (8 Migrations)

```
supabase/migrations/
  48_phase6_timeline.sql            - timeline_post, parent_comment
  49_phase6_messaging.sql           - parent_message, parent_notification
  50_phase6_documents.sql           - parent_document_share, document_acknowledgment
  51_phase6_certificates.sql        - tax_certificate, caf_document
  52_phase6_guardian_user.sql       - ALTER TABLE guardian_user (colonnes app mobile)
  53_phase6_indexes.sql             - Index de performance
  54_phase6_rls.sql                 - Row Level Security (sécurité stricte parents)
  55_phase6_functions.sql           - Fonctions (notifications auto, calculs fiscaux)
```

---

## 🔄 Flux de Données

### 1. Publication Cahier de Vie (Quotidien)
1. Employé crée post → `timeline_post`
2. Upload photos/vidéos → Supabase Storage
3. Détection parents enfant → `guardian_child`
4. Création notifications → `parent_notification`
5. Envoi push → FCM/APNS
6. Parents consultent app → Timeline mise à jour
7. Réactions/commentaires parents → JSONB + `parent_comment`

### 2. Messagerie
1. Parent envoie message → `parent_message` (sender_guardian_id)
2. Notification employé → Dashboard Owner/Employee
3. Employé répond → `parent_message` (sender_employee_id, reply_to_message_id)
4. Parent reçoit push → `parent_notification` (type = 'new_message')

### 3. Documents Partagés
1. Owner upload document → `parent_document_share`
2. Choix scope (all_families, specific_families, specific_child)
3. Si requires_acknowledgment → Parents doivent confirmer
4. Téléchargement → `document_acknowledgment` créé
5. Owner voit stats lecture/téléchargement

### 4. Attestations Fiscales (Janvier/Février)
1. Fin d'année → Owner génère attestations → `tax_certificate`
2. Calcul : total payé - part CAF = déductible
3. Crédit impôt = 50% déductible (max 2300€/enfant)
4. Génération PDF conforme
5. Envoi email + disponible app
6. Parents téléchargent pour déclaration impôts

---

## ⚠️ Risques Identifiés

### 1. Notifications Push (🔴 CRITIQUE)
- Configuration Firebase (FCM) + Apple (APNS)
- Gestion tokens, taux livraison
- Fallback email si push échoue

### 2. Sécurité RLS (🔴 CRITIQUE)
- Parents voient UNIQUEMENT leurs enfants
- Isolation stricte données par famille
- Fuite données = RGPD violation grave

### 3. Upload Médias (🟡 HAUTE)
- Performance upload photos/vidéos
- Compression automatique
- Quotas Supabase Storage (50GB gratuit)

### 4. Application Mobile (🟡 HAUTE)
- Maintenance iOS + Android (2 plateformes)
- Alternative : PWA uniquement ?
- Notifications push PWA limitées iOS

### 5. RGPD (🟡 HAUTE)
- Consentement parents explicite
- Droit à l'oubli (suppression compte)
- Export données personnelles

### 6. Calculs Fiscaux (🟢 MOYENNE)
- Formules crédit impôt (50% plafonné)
- Mises à jour réglementation annuelles

---

## 📅 Estimation

- **Migrations SQL**: 2 jours (8 tables + RLS stricte)
- **Services**: 3 jours (6 services, ~2,500 lignes)
- **Pages Owner**: 2 jours (6 pages gestion portail)
- **App Mobile Parents**: 8 jours (14 pages, PWA)
- **Composants UI**: 3 jours (timeline, messaging, documents)
- **Notifications Push**: 2 jours (FCM/APNS intégration)
- **Tests & Debug**: 2 jours

**Total Phase 6**: ~22 jours de développement

---

## ✅ Complété (Session 1 - 2026-01-13)

### Migrations SQL (100% ✅)
1. ✅ `48_phase6_timeline.sql` - Tables timeline_post, parent_comment + ENUMs
2. ✅ `49_phase6_messaging.sql` - Tables parent_message, parent_notification + fonctions
3. ✅ `50_phase6_documents.sql` - Tables parent_document_share, document_acknowledgment + fonctions
4. ✅ `51_phase6_certificates.sql` - Tables tax_certificate, caf_document + calculs fiscaux
5. ✅ `52_phase6_guardian_user.sql` - ALTER guardian_user (colonnes app mobile, tokens push)
6. ✅ `53_phase6_indexes.sql` - Index de performance (composites, partiels, GIN)
7. ✅ `54_phase6_rls.sql` - Row Level Security policies (CRITIQUE - sécurité parents)
8. ✅ `55_phase6_functions_triggers.sql` - Triggers auto-notifications + fonctions utilitaires

### Impact Migrations
- ✅ 8 nouvelles tables créées
- ✅ 5 nouveaux ENUMs (post_type, mood_type, message_category, notification_type, etc.)
- ✅ RLS activé sur toutes les tables (sécurité stricte parents)
- ✅ 4 triggers automatiques (notifications sur posts, messages, documents)
- ✅ 15+ fonctions utilitaires (dashboard, stats, maintenance)
- ✅ 30+ index de performance (composites, partiels, GIN pour JSONB)
- ✅ Génération auto numéros (certificats fiscaux, documents CAF)

---

## ✅ Complété (Session 2 - 2026-01-14)

### Services TypeScript (100% ✅)
1. ✅ `lib/services/timeline.service.ts` (432 lignes) - Publications, médias, réactions, commentaires, stats
2. ✅ `lib/services/parent-messaging.service.ts` (517 lignes) - Messagerie, notifications, conversations, push tokens
3. ✅ `lib/services/parent-documents.service.ts` (446 lignes) - Partage documents, confirmations lecture, statistiques
4. ✅ `lib/services/tax-certificate.service.ts` (505 lignes) - Attestations fiscales, calculs crédit impôt, génération batch
5. ✅ `lib/services/caf-document.service.ts` (490 lignes) - Attestations CAF mensuelles, justificatifs paiement
6. ✅ `lib/services/parent-portal.service.ts` (438 lignes) - Dashboard parent, timeline enfants, préférences, stats portail

**Total Services**: 6 services (~2,830 lignes de code), ~70 méthodes publiques

### Pages UI Owner (100% ✅)
1. ✅ `/owner/portal` (320 lignes) - Dashboard portail avec stats usage et actions rapides
2. ✅ `/owner/portal/timeline` (430 lignes) - Modération timeline avec filtres et actions publish/unpublish
3. ✅ `/owner/portal/messages` (470 lignes) - Messagerie avec vue double colonne et réponses directes
4. ✅ `/owner/portal/documents` (330 lignes) - Gestion documents partagés avec statistiques
5. ✅ `/owner/portal/documents/share` (400 lignes) - Formulaire partage documents avec sélection familles
6. ✅ `/owner/portal/certificates` (570 lignes) - Attestations fiscales & CAF avec génération batch

**Total Pages**: 6 pages (~2,520 lignes de code)

### Impact Session 2
- ✅ 6 services TypeScript robustes avec gestion d'erreurs complète
- ✅ 6 pages UI Owner complètes et responsive
- ✅ Design system "Douceur Professionnelle" appliqué partout
- ✅ Gestion states (loading, empty, error) sur toutes les pages
- ✅ Filtres, recherche, statistiques intégrés
- ✅ Build Next.js réussi sans erreurs TypeScript
- ✅ Architecture multi-nursery respectée
- ✅ **Total développé Phase 6**: ~5,350 lignes (migrations + services + pages)

---

## ⏳ Prochaines Étapes (Session 3)

### À Faire
1. ⏳ Créer app mobile parents (14 pages PWA - ~3,500 lignes)
   - `/portal/login`, `/portal/register` - Authentication
   - `/portal/home` - Dashboard parent
   - `/portal/children`, `/portal/children/[id]` - Liste enfants et profils
   - `/portal/timeline`, `/portal/timeline/[childId]`, `/portal/timeline/[postId]` - Timeline posts avec réactions
   - `/portal/messages`, `/portal/messages/[conversationId]` - Messagerie
   - `/portal/documents`, `/portal/invoices`, `/portal/certificates` - Documents
   - `/portal/profile` - Profil et paramètres notifications

2. ⏳ Composants réutilisables (~1,200 lignes)
   - TimelinePostCard, MediaGallery, ReactionPicker
   - MessageBubble, ConversationList
   - DocumentCard, NotificationCard
   - ChildCard, DailyReportSummary
   - InvoiceCard, TaxCertificateCard

3. ⏳ Intégration notifications push
   - Firebase FCM/APNS configuration
   - Token registration workflow
   - Background notifications handler

4. ⏳ Tests & validation finale

---

**Dernière mise à jour**: 2026-01-14
**Phase actuelle**: Phase 6 - Portail Parents 🔄 **EN COURS** (50%)
**Prochaine étape**: Créer 14 pages PWA pour application mobile parents
