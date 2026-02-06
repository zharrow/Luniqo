# Roadmap Luniqo - Phases 6 à 9 (Détail Complet)

Ce document complète le ROADMAP.md principal avec le détail exhaustif des phases 6 à 9.

---

# 📱 PHASE 6: PORTAIL PARENTS

## 6.1 Architecture de Données

### Objectif
Créer une application mobile/web pour les parents : cahier de vie quotidien, messagerie, documents partagés, notifications, attestations fiscales et suivi développement enfant.

### Tables à Créer

#### 6.1.1 Table `timeline_post` (Publications cahier de vie)
**Objectif**: Partager la journée de l'enfant avec les parents (activités, photos, observations)

```sql
CREATE TABLE timeline_post (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  post_date DATE NOT NULL DEFAULT CURRENT_DATE,
  post_time TIME DEFAULT CURRENT_TIME,

  -- Type de publication
  post_type VARCHAR(50) NOT NULL,               -- Type de post
  -- Types: 'activity', 'meal', 'nap', 'photo', 'video', 'milestone',
  --        'observation', 'artwork', 'mood', 'health_note'

  -- Contenu
  title VARCHAR(255),
  content TEXT NOT NULL,                        -- Description

  -- Média
  media_urls TEXT[],                            -- Photos/vidéos (Supabase Storage)
  media_types VARCHAR(20)[],                    -- ['image', 'video', ...]

  -- Humeur/État enfant
  child_mood VARCHAR(20),                       -- 'happy', 'calm', 'tired', 'cranky', 'excited'
  child_mood_emoji VARCHAR(10),                 -- Emoji correspondant

  -- Activité liée
  activity_id UUID REFERENCES activity(id) ON DELETE SET NULL,

  -- Visibilité
  is_visible_to_parents BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,

  -- Réactions parents
  parent_reactions JSONB DEFAULT '[]',          -- [{guardian_id, emoji, timestamp}, ...]
  parent_comments_count INTEGER DEFAULT 0,

  -- Auteur
  created_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_post_child ON timeline_post(child_id);
CREATE INDEX idx_timeline_post_nursery ON timeline_post(nursery_id);
CREATE INDEX idx_timeline_post_date ON timeline_post(post_date DESC);
CREATE INDEX idx_timeline_post_type ON timeline_post(post_type);
CREATE INDEX idx_timeline_post_visible ON timeline_post(is_visible_to_parents);
```

---

#### 6.1.2 Table `parent_comment` (Commentaires parents)
**Objectif**: Permettre aux parents de commenter les posts du cahier de vie

```sql
CREATE TABLE parent_comment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timeline_post_id UUID NOT NULL REFERENCES timeline_post(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,

  comment_text TEXT NOT NULL,

  -- Modération (optionnel)
  is_approved BOOLEAN DEFAULT TRUE,
  approved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parent_comment_post ON parent_comment(timeline_post_id);
CREATE INDEX idx_parent_comment_guardian ON parent_comment(guardian_id);
CREATE INDEX idx_parent_comment_approved ON parent_comment(is_approved);
```

---

#### 6.1.3 Table `parent_message` (Messagerie parent-crèche)
**Objectif**: Messages privés entre parents et crèche

```sql
CREATE TABLE parent_message (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Participants
  sender_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,     -- Si parent envoie
  sender_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,     -- Si employé envoie

  recipient_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  recipient_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contenu
  subject VARCHAR(255),
  message_text TEXT NOT NULL,

  -- Pièces jointes
  attachments_urls TEXT[],
  attachments_names TEXT[],

  -- Lecture
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Type de message
  message_category VARCHAR(50),                 -- 'general', 'absence_notification', 'urgent', 'administrative'
  priority VARCHAR(20) DEFAULT 'normal',        -- 'low', 'normal', 'high', 'urgent'

  -- Réponse à un message
  reply_to_message_id UUID REFERENCES parent_message(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parent_message_family ON parent_message(family_id);
CREATE INDEX idx_parent_message_nursery ON parent_message(nursery_id);
CREATE INDEX idx_parent_message_sender_guardian ON parent_message(sender_guardian_id);
CREATE INDEX idx_parent_message_sender_employee ON parent_message(sender_employee_id);
CREATE INDEX idx_parent_message_recipient_guardian ON parent_message(recipient_guardian_id);
CREATE INDEX idx_parent_message_read ON parent_message(is_read);
CREATE INDEX idx_parent_message_created ON parent_message(created_at DESC);
```

---

#### 6.1.4 Table `parent_notification` (Notifications push)
**Objectif**: Notifications push pour l'app mobile parents

```sql
CREATE TABLE parent_notification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,

  notification_type VARCHAR(50) NOT NULL,       -- Type de notification
  -- Types: 'new_post', 'new_message', 'invoice_available', 'payment_reminder',
  --        'document_uploaded', 'authorization_expiring', 'announcement'

  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,

  -- Lien action
  action_url TEXT,                              -- URL deeplink dans l'app
  related_child_id UUID REFERENCES child(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES timeline_post(id) ON DELETE SET NULL,
  related_message_id UUID REFERENCES parent_message(id) ON DELETE SET NULL,

  -- Statut
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Push notification
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  push_token VARCHAR(255),                      -- FCM/APNS token

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parent_notification_guardian ON parent_notification(guardian_id);
CREATE INDEX idx_parent_notification_type ON parent_notification(notification_type);
CREATE INDEX idx_parent_notification_read ON parent_notification(is_read);
CREATE INDEX idx_parent_notification_created ON parent_notification(created_at DESC);
```

---

#### 6.1.5 Table `parent_document_share` (Documents partagés)
**Objectif**: Partager documents avec les parents (règlements, menus, calendriers, factures)

```sql
CREATE TABLE parent_document_share (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Destinataires
  share_scope VARCHAR(20) NOT NULL,             -- 'all_families', 'specific_families', 'specific_child'
  family_ids UUID[],                            -- Si share_scope = 'specific_families'
  child_id UUID REFERENCES child(id) ON DELETE CASCADE,  -- Si share_scope = 'specific_child'

  -- Document
  document_type VARCHAR(50) NOT NULL,           -- Type de document
  -- Types: 'menu', 'calendar', 'regulation', 'invoice', 'certificate',
  --        'report', 'photo_album', 'announcement', 'consent_form'

  document_title VARCHAR(255) NOT NULL,
  document_description TEXT,

  file_url TEXT NOT NULL,                       -- URL Supabase Storage
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(50),

  -- Validité
  valid_from DATE,
  valid_until DATE,

  -- Téléchargements
  download_count INTEGER DEFAULT 0,
  requires_acknowledgment BOOLEAN DEFAULT FALSE,  -- Nécessite confirmation lecture

  -- Publication
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  published_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parent_document_share_nursery ON parent_document_share(nursery_id);
CREATE INDEX idx_parent_document_share_child ON parent_document_share(child_id);
CREATE INDEX idx_parent_document_share_type ON parent_document_share(document_type);
CREATE INDEX idx_parent_document_share_scope ON parent_document_share(share_scope);
CREATE INDEX idx_parent_document_share_published ON parent_document_share(is_published);
```

---

#### 6.1.6 Table `document_acknowledgment` (Confirmations de lecture)
**Objectif**: Tracer qui a lu/téléchargé quels documents

```sql
CREATE TABLE document_acknowledgment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_share_id UUID NOT NULL REFERENCES parent_document_share(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,

  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  downloaded BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,

  UNIQUE(document_share_id, guardian_id)
);

CREATE INDEX idx_document_acknowledgment_document ON document_acknowledgment(document_share_id);
CREATE INDEX idx_document_acknowledgment_guardian ON document_acknowledgment(guardian_id);
```

---

#### 6.1.7 Table `tax_certificate` (Attestations fiscales)
**Objectif**: Générer attestations annuelles pour déclaration impôts

```sql
CREATE TABLE tax_certificate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  certificate_year INTEGER NOT NULL,            -- Année fiscale (ex: 2025)

  certificate_number VARCHAR(50) UNIQUE NOT NULL,

  -- Montants
  total_paid_amount DECIMAL(10,2) NOT NULL,     -- Montant total payé dans l'année
  caf_participation_amount DECIMAL(10,2) DEFAULT 0,
  deductible_amount DECIMAL(10,2) NOT NULL,     -- Montant déductible fiscalement

  -- Calcul crédit d'impôt (50% des frais de garde)
  tax_credit_amount DECIMAL(10,2),              -- 50% du déductible (plafonné)

  -- Période
  period_start DATE NOT NULL,                   -- 1er janvier
  period_end DATE NOT NULL,                     -- 31 décembre

  -- Document
  certificate_pdf_url TEXT NOT NULL,            -- PDF attestation (Supabase Storage)

  -- Signature
  signed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signature_date DATE,
  director_signature_url TEXT,

  -- Statut
  status VARCHAR(20) DEFAULT 'draft',           -- 'draft', 'issued', 'sent'

  issued_date DATE,
  sent_to_family_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_tax_certificate_nursery ON tax_certificate(nursery_id);
CREATE INDEX idx_tax_certificate_family ON tax_certificate(family_id);
CREATE INDEX idx_tax_certificate_child ON tax_certificate(child_id);
CREATE INDEX idx_tax_certificate_year ON tax_certificate(certificate_year);
CREATE INDEX idx_tax_certificate_status ON tax_certificate(status);
```

---

#### 6.1.8 Table `caf_document` (Documents CAF)
**Objectif**: Générer/stocker documents pour la CAF (attestations de présence, etc.)

```sql
CREATE TABLE caf_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  document_type VARCHAR(50) NOT NULL,           -- Type de document CAF
  -- Types: 'attendance_certificate', 'payment_proof', 'contract_copy', 'tariff_justification'

  month DATE NOT NULL,                          -- Mois concerné (format: 2025-10-01)

  -- Document
  document_url TEXT NOT NULL,                   -- PDF généré
  document_number VARCHAR(50) UNIQUE,

  -- Données du document (JSON)
  document_data JSONB,                          -- Données structurées (heures, tarifs, etc.)

  -- Statut
  status VARCHAR(20) DEFAULT 'generated',       -- 'generated', 'sent_to_family', 'sent_to_caf', 'validated'

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to_caf_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_caf_document_nursery ON caf_document(nursery_id);
CREATE INDEX idx_caf_document_family ON caf_document(family_id);
CREATE INDEX idx_caf_document_child ON caf_document(child_id);
CREATE INDEX idx_caf_document_type ON caf_document(document_type);
CREATE INDEX idx_caf_document_month ON caf_document(month);
CREATE INDEX idx_caf_document_status ON caf_document(status);
```

---

#### 6.1.9 Table `guardian_user` (Comptes utilisateurs parents - EXISTE DÉJÀ Phase 1)
**Note**: Cette table existe déjà depuis Phase 1, pas besoin de la recréer.

Ajout de colonnes pour l'app mobile:

```sql
ALTER TABLE guardian_user ADD COLUMN IF NOT EXISTS app_language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE guardian_user ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE guardian_user ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE guardian_user ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);  -- Firebase Cloud Messaging
ALTER TABLE guardian_user ADD COLUMN IF NOT EXISTS apns_token VARCHAR(255); -- Apple Push Notification Service
ALTER TABLE guardian_user ADD COLUMN IF NOT EXISTS last_app_access TIMESTAMPTZ;
ALTER TABLE guardian_user ADD COLUMN IF NOT EXISTS app_version VARCHAR(20);
```

---

## 6.2 Relations et Flux de Données

### Schéma des Relations

```
child ──┬──> timeline_post (1:N)
        ├──> tax_certificate (1:N)
        └──> caf_document (1:N)

timeline_post ──┬──> parent_comment (1:N)
                └──> parent_notification (1:N - via trigger)

guardian ──┬──> guardian_user (1:1)
           ├──> parent_message (1:N)
           ├──> parent_notification (1:N)
           ├──> parent_comment (1:N)
           └──> document_acknowledgment (1:N)

family ──┬──> parent_message (1:N)
         ├──> tax_certificate (1:N)
         └──> caf_document (1:N)

nursery ──┬──> parent_document_share (1:N)
          └──> timeline_post (1:N)

parent_document_share ──> document_acknowledgment (1:N)
```

### Flux Portail Parents

**1. Publication cahier de vie (quotidien):**
1. Employé publie post timeline → `timeline_post` créé
2. Upload photos/vidéos → Supabase Storage
3. Système détecte parents de l'enfant → Récupère `guardian_id` via `guardian_child`
4. Pour chaque parent → Créer `parent_notification` (type = 'new_post')
5. Envoi push notification → Firebase Cloud Messaging (FCM) ou APNS
6. Parent ouvre app → Post visible dans timeline enfant
7. Parent peut réagir (❤️, 👍, 😊) → Stocké dans `timeline_post.parent_reactions` (JSONB)
8. Parent peut commenter → `parent_comment` créé

**2. Messagerie:**
1. Parent envoie message → `parent_message` (sender_guardian_id)
2. Notification employé → Dashboard Owner/Employee
3. Employé répond → `parent_message` (sender_employee_id, reply_to_message_id)
4. Parent reçoit notification push → `parent_notification` (type = 'new_message')

**3. Documents partagés:**
1. Owner upload document (ex: menu du mois) → `parent_document_share`
2. Choix destinataires (share_scope = 'all_families' ou 'specific_families')
3. Si requires_acknowledgment = true → Parents doivent confirmer lecture
4. Parents téléchargent → `document_acknowledgment` créé
5. Owner peut voir qui a lu/téléchargé

**4. Attestations fiscales (annuel - janvier/février):**
1. Fin d'année → Owner génère attestations → `tax_certificate`
2. Système calcule:
   - Total payé par famille dans l'année
   - Part CAF déduite
   - Montant déductible (frais de garde)
   - Crédit d'impôt = 50% du déductible (plafonné à 2300€/enfant)
3. Génération PDF attestation
4. Envoi aux parents → Email + disponible dans app
5. Parents téléchargent pour déclaration impôts

**5. Documents CAF (mensuel):**
1. Chaque mois → Génération automatique attestations présence
2. Données: heures prévues vs réelles, tarifs appliqués, paiements
3. PDF généré → `caf_document`
4. Envoi aux parents pour transmission à CAF

---

## 6.3 Services TypeScript à Créer

```typescript
// lib/services/timeline.service.ts
export class TimelineService {
  // Publications
  async createPost(childId: string, data: CreateTimelinePostInput): Promise<TimelinePost>
  async getPosts(childId: string, filters?: TimelineFilters): Promise<TimelinePost[]>
  async getPostsByDate(childId: string, date: Date): Promise<TimelinePost[]>
  async updatePost(postId: string, data: UpdateTimelinePostInput): Promise<TimelinePost>
  async deletePost(postId: string): Promise<void>
  async publishPost(postId: string): Promise<void>

  // Médias
  async uploadMedia(postId: string, files: File[]): Promise<string[]>  // Retourne URLs
  async deleteMedia(postId: string, mediaUrl: string): Promise<void>

  // Réactions
  async addReaction(postId: string, guardianId: string, emoji: string): Promise<void>
  async removeReaction(postId: string, guardianId: string): Promise<void>
  async getReactions(postId: string): Promise<Reaction[]>

  // Commentaires
  async addComment(postId: string, guardianId: string, text: string): Promise<ParentComment>
  async getComments(postId: string): Promise<ParentComment[]>
  async deleteComment(commentId: string): Promise<void>
}

// lib/services/parent-messaging.service.ts
export class ParentMessagingService {
  // Messages
  async sendMessage(data: SendMessageInput): Promise<ParentMessage>
  async getConversation(familyId: string, employeeId?: string): Promise<ParentMessage[]>
  async getUnreadMessages(guardianId: string): Promise<ParentMessage[]>
  async markAsRead(messageId: string): Promise<void>
  async deleteMessage(messageId: string): Promise<void>

  // Notifications
  async createNotification(guardianId: string, data: NotificationInput): Promise<ParentNotification>
  async getNotifications(guardianId: string, unreadOnly?: boolean): Promise<ParentNotification[]>
  async markNotificationAsRead(notificationId: string): Promise<void>
  async markAllAsRead(guardianId: string): Promise<void>
  async deleteNotification(notificationId: string): Promise<void>

  // Push
  async sendPushNotification(guardianId: string, title: string, body: string, data?: any): Promise<void>
  async registerPushToken(guardianId: string, token: string, platform: 'ios' | 'android'): Promise<void>
}

// lib/services/parent-documents.service.ts
export class ParentDocumentsService {
  // Partage documents
  async shareDocument(nurseryId: string, data: ShareDocumentInput): Promise<ParentDocumentShare>
  async getDocuments(guardianId: string): Promise<ParentDocumentShare[]>
  async getDocumentsByFamily(familyId: string): Promise<ParentDocumentShare[]>
  async deleteDocument(documentId: string): Promise<void>

  // Confirmations lecture
  async acknowledgeDocument(documentId: string, guardianId: string): Promise<void>
  async getAcknowledgments(documentId: string): Promise<DocumentAcknowledgment[]>
  async getUnacknowledgedDocuments(guardianId: string): Promise<ParentDocumentShare[]>

  // Téléchargements
  async recordDownload(documentId: string, guardianId: string): Promise<void>
  async getDownloadStats(documentId: string): Promise<DownloadStats>
}

// lib/services/tax-certificate.service.ts
export class TaxCertificateService {
  async generate(familyId: string, childId: string, year: number): Promise<TaxCertificate>
  async generateForAllFamilies(nurseryId: string, year: number): Promise<TaxCertificate[]>
  async calculateDeductibleAmount(familyId: string, childId: string, year: number): Promise<number>
  async generatePDF(certificateId: string): Promise<string>
  async send(certificateId: string): Promise<void>
  async getByFamily(familyId: string): Promise<TaxCertificate[]>
  async getByYear(nurseryId: string, year: number): Promise<TaxCertificate[]>
}

// lib/services/caf-document.service.ts
export class CAFDocumentService {
  async generateMonthlyAttendanceCertificate(childId: string, month: Date): Promise<CAFDocument>
  async generatePaymentProof(familyId: string, month: Date): Promise<CAFDocument>
  async getDocuments(familyId: string): Promise<CAFDocument[]>
  async getDocumentsByMonth(nurseryId: string, month: Date): Promise<CAFDocument[]>
  async sendToFamily(documentId: string): Promise<void>
}

// lib/services/parent-portal.service.ts
export class ParentPortalService {
  // Dashboard parent
  async getDashboard(guardianId: string): Promise<ParentDashboard>
  async getChildTimeline(childId: string, guardianId: string): Promise<TimelinePost[]>
  async getUnreadCount(guardianId: string): Promise<UnreadCount>

  // Paramètres
  async updatePreferences(guardianId: string, prefs: PreferencesInput): Promise<void>
  async updateNotificationSettings(guardianId: string, settings: NotificationSettings): Promise<void>
}
```

---

## 6.4 Pages UI à Créer

### Application Mobile Parents (React Native / PWA)

```
/portal/login                       - Connexion parent (email/password)
/portal/register                    - Inscription parent (lien invitation)
/portal/forgot-password             - Mot de passe oublié

/portal/home                        - Dashboard (résumé journée, notifications)

/portal/children                    - Liste de mes enfants
/portal/children/[id]               - Profil enfant

/portal/timeline                    - Timeline globale (tous mes enfants)
/portal/timeline/[childId]          - Timeline d'un enfant spécifique
/portal/timeline/[postId]           - Détail post (avec commentaires, réactions)

/portal/messages                    - Messagerie (conversations avec crèche)
/portal/messages/[conversationId]   - Conversation
/portal/messages/new                - Nouveau message

/portal/documents                   - Mes documents (factures, attestations, règlements)
/portal/documents/[id]              - Visualiser document

/portal/invoices                    - Mes factures (Phase 5)
/portal/invoices/[id]               - Détail facture

/portal/certificates                - Attestations fiscales
/portal/certificates/[id]           - Télécharger attestation

/portal/notifications               - Centre de notifications
/portal/notifications/settings      - Paramètres notifications

/portal/profile                     - Mon profil
/portal/profile/settings            - Paramètres compte
/portal/profile/children            - Gérer infos enfants
```

### Routes Propriétaire (Owner) - Gestion portail

```
/owner/portal                       - Dashboard portail parents (stats usage)
/owner/portal/timeline              - Modération timeline (posts, commentaires)
/owner/portal/messages              - Messagerie (toutes conversations)
/owner/portal/documents             - Gestion documents partagés
/owner/portal/documents/share       - Partager nouveau document
/owner/portal/certificates          - Attestations fiscales
/owner/portal/certificates/generate - Générer attestations annuelles
```

### Composants Réutilisables

```typescript
// Mobile App Components
// components/portal/TimelinePostCard.tsx
// components/portal/TimelinePostForm.tsx
// components/portal/MediaGallery.tsx
// components/portal/ReactionPicker.tsx
// components/portal/CommentList.tsx
// components/portal/CommentForm.tsx

// components/portal/MessageBubble.tsx
// components/portal/ConversationList.tsx
// components/portal/MessageComposer.tsx

// components/portal/DocumentCard.tsx
// components/portal/PDFViewer.tsx
// components/portal/DownloadButton.tsx

// components/portal/NotificationCard.tsx
// components/portal/NotificationBadge.tsx
// components/portal/PushNotificationHandler.tsx

// components/portal/ChildCard.tsx
// components/portal/ChildAvatar.tsx
// components/portal/DailyReportSummary.tsx

// components/portal/InvoiceCard.tsx
// components/portal/PaymentButton.tsx
// components/portal/TaxCertificateCard.tsx

// Owner Components
// components/portal-admin/TimelineModerationPanel.tsx
// components/portal-admin/MessageInbox.tsx
// components/portal-admin/DocumentShareForm.tsx
// components/portal-admin/PortalUsageStats.tsx
// components/portal-admin/ParentActivityLog.tsx
```

---

## 6.5 Migrations SQL

```
migrations/
  60_phase6_timeline.sql            - timeline_post, parent_comment
  61_phase6_messaging.sql           - parent_message, parent_notification
  62_phase6_documents.sql           - parent_document_share, document_acknowledgment
  63_phase6_certificates.sql        - tax_certificate, caf_document
  64_phase6_guardian_user.sql       - ALTER TABLE guardian_user (colonnes app mobile)
  65_phase6_indexes.sql             - Index de performance
  66_phase6_rls.sql                 - Row Level Security (parents voient uniquement leurs enfants)
  67_phase6_functions.sql           - Fonctions (notifications automatiques, calculs fiscaux)
  68_phase6_triggers.sql            - Triggers (auto-notif sur nouveau post, compteurs)
```

---

## 6.6 Complexité et Estimation

- **Migrations SQL**: 2 jours (8 tables + RLS stricte pour sécurité parents)
- **Services Backend**: 3 jours (timeline, messaging, documents, certificates)
- **API REST/GraphQL**: 2 jours (endpoints pour app mobile)
- **Application Mobile**: 8 jours (React Native ou PWA - toutes les pages)
- **Notifications Push**: 2 jours (intégration FCM/APNS)
- **Génération PDF**: 2 jours (attestations fiscales, documents CAF)
- **Tests & Debug**: 3 jours

**Total Phase 6**: ~22 jours de développement

### Risques Identifiés

1. **Notifications Push**: Configuration Firebase/APNS, gestion tokens, taux de livraison
2. **Sécurité RLS**: Parents doivent UNIQUEMENT voir leurs enfants (fuite de données critique)
3. **Upload médias**: Performance, compression images/vidéos, quotas Supabase Storage
4. **Application mobile**: Maintenance iOS + Android (2 plateformes), ou PWA uniquement ?
5. **RGPD**: Consentement parents, droit à l'oubli, export données personnelles
6. **Calculs fiscaux**: Vérifier formules crédit d'impôt (50% plafonné), mises à jour annuelles

---

# 📊 PHASE 7: STATISTIQUES & ANALYSES

## 7.1 Architecture de Données

### Objectif
Tableaux de bord avancés, KPIs business, analytics détaillées, rapports personnalisés et prévisions.

### Tables à Créer

#### 7.1.1 Table `analytic_metric` (Métriques calculées)
**Objectif**: Stocker métriques agrégées pour dashboards

```sql
CREATE TABLE analytic_metric (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,  -- NULL = métrique globale enterprise
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,

  metric_name VARCHAR(100) NOT NULL,            -- Nom de la métrique
  -- Exemples: 'daily_revenue', 'occupancy_rate', 'staff_ratio', 'meal_cost_per_child',
  --           'avg_invoice_amount', 'payment_rate', 'parent_satisfaction'

  metric_category VARCHAR(50) NOT NULL,         -- Catégorie
  -- Catégories: 'financial', 'occupancy', 'hr', 'operations', 'quality', 'compliance'

  -- Période
  period_type VARCHAR(20) NOT NULL,             -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_date DATE NOT NULL,                    -- Date de la période

  -- Valeur
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(20),                      -- 'euro', 'percent', 'count', 'hours', 'ratio'

  -- Contexte
  dimension_1 VARCHAR(100),                     -- Ex: section_id, room_id
  dimension_2 VARCHAR(100),
  dimension_3 VARCHAR(100),

  -- Comparaison
  previous_period_value DECIMAL(15,4),
  variance DECIMAL(15,4),                       -- Différence vs période précédente
  variance_percent DECIMAL(8,2),                -- Variation en %

  -- Objectif/Target
  target_value DECIMAL(15,4),
  target_achieved BOOLEAN,

  -- Métadonnées
  calculation_method TEXT,                      -- Description du calcul
  data_sources TEXT[],                          -- Tables sources utilisées

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by VARCHAR(50) DEFAULT 'system',   -- 'system' ou user_id

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytic_metric_nursery ON analytic_metric(nursery_id);
CREATE INDEX idx_analytic_metric_enterprise ON analytic_metric(enterprise_id);
CREATE INDEX idx_analytic_metric_name ON analytic_metric(metric_name);
CREATE INDEX idx_analytic_metric_category ON analytic_metric(metric_category);
CREATE INDEX idx_analytic_metric_period ON analytic_metric(period_type, period_date);
CREATE INDEX idx_analytic_metric_date ON analytic_metric(period_date DESC);
```

---

#### 7.1.2 Table `occupancy_stat` (Statistiques occupation)
**Objectif**: Tracker taux d'occupation quotidien par section/salle

```sql
CREATE TABLE occupancy_stat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  stat_date DATE NOT NULL,

  -- Niveau d'agrégation
  aggregation_level VARCHAR(20) NOT NULL,       -- 'nursery', 'section', 'room'
  section_id UUID REFERENCES section(id) ON DELETE CASCADE,
  room_id UUID REFERENCES room(id) ON DELETE CASCADE,

  -- Capacité
  total_capacity INTEGER NOT NULL,              -- Capacité totale

  -- Présences
  total_children_enrolled INTEGER NOT NULL,     -- Enfants inscrits
  total_children_present INTEGER NOT NULL,      -- Enfants présents ce jour
  total_children_absent INTEGER NOT NULL,

  -- Taux
  occupancy_rate DECIMAL(5,2) NOT NULL,         -- Taux occupation (présents / capacité)
  enrollment_rate DECIMAL(5,2) NOT NULL,        -- Taux inscription (inscrits / capacité)

  -- Détail présences
  present_under_18_months INTEGER DEFAULT 0,
  present_over_18_months INTEGER DEFAULT 0,

  -- Heures
  total_hours_booked DECIMAL(10,2),             -- Heures réservées (contrats)
  total_hours_actual DECIMAL(10,2),             -- Heures réelles (présences)
  hours_utilization_rate DECIMAL(5,2),          -- Taux utilisation heures

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_occupancy_stat_nursery ON occupancy_stat(nursery_id);
CREATE INDEX idx_occupancy_stat_date ON occupancy_stat(stat_date DESC);
CREATE INDEX idx_occupancy_stat_section ON occupancy_stat(section_id);
CREATE INDEX idx_occupancy_stat_room ON occupancy_stat(room_id);
CREATE INDEX idx_occupancy_stat_aggregation ON occupancy_stat(aggregation_level);

CREATE UNIQUE INDEX idx_occupancy_stat_unique_nursery_date ON occupancy_stat(nursery_id, stat_date, aggregation_level) WHERE section_id IS NULL AND room_id IS NULL;
CREATE UNIQUE INDEX idx_occupancy_stat_unique_section_date ON occupancy_stat(section_id, stat_date, aggregation_level) WHERE section_id IS NOT NULL;
CREATE UNIQUE INDEX idx_occupancy_stat_unique_room_date ON occupancy_stat(room_id, stat_date, aggregation_level) WHERE room_id IS NOT NULL;
```

---

#### 7.1.3 Table `attendance_stat` (Statistiques présences)
**Objectif**: Analytics des présences/absences

```sql
CREATE TABLE attendance_stat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  stat_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL,             -- 'daily', 'weekly', 'monthly'

  -- Compteurs globaux
  total_attendances INTEGER DEFAULT 0,
  total_absences INTEGER DEFAULT 0,
  total_late_arrivals INTEGER DEFAULT 0,
  total_early_departures INTEGER DEFAULT 0,

  -- Raisons absences (agrégées)
  absences_sick INTEGER DEFAULT 0,
  absences_vacation INTEGER DEFAULT 0,
  absences_family_event INTEGER DEFAULT 0,
  absences_other INTEGER DEFAULT 0,

  -- Taux
  attendance_rate DECIMAL(5,2),                 -- Taux de présence
  punctuality_rate DECIMAL(5,2),                -- Taux ponctualité (pas de retard)

  -- Moyennes
  avg_arrival_time TIME,                        -- Heure moyenne d'arrivée
  avg_departure_time TIME,
  avg_daily_hours DECIMAL(4,2),                 -- Nb heures moyen par enfant

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_stat_nursery ON attendance_stat(nursery_id);
CREATE INDEX idx_attendance_stat_date ON attendance_stat(stat_date DESC);
CREATE INDEX idx_attendance_stat_period ON attendance_stat(period_type);

CREATE UNIQUE INDEX idx_attendance_stat_unique ON attendance_stat(nursery_id, stat_date, period_type);
```

---

#### 7.1.4 Table `financial_kpi` (KPIs financiers)
**Objectif**: Indicateurs financiers clés

```sql
CREATE TABLE financial_kpi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,  -- NULL = niveau enterprise
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,

  kpi_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL,             -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'

  -- Revenus
  total_revenue DECIMAL(12,2) DEFAULT 0,        -- CA total
  childcare_revenue DECIMAL(12,2) DEFAULT 0,    -- CA garderie
  meal_revenue DECIMAL(12,2) DEFAULT 0,         -- CA repas
  extra_revenue DECIMAL(12,2) DEFAULT 0,        -- CA suppléments

  -- Paiements
  invoices_issued INTEGER DEFAULT 0,            -- Nb factures émises
  invoices_paid INTEGER DEFAULT 0,              -- Nb factures payées
  total_invoiced DECIMAL(12,2) DEFAULT 0,
  total_collected DECIMAL(12,2) DEFAULT 0,      -- Montant encaissé
  total_outstanding DECIMAL(12,2) DEFAULT 0,    -- Impayés

  -- Taux
  collection_rate DECIMAL(5,2),                 -- Taux encaissement
  payment_on_time_rate DECIMAL(5,2),            -- Taux paiement à temps

  -- Dépenses (si saisies)
  total_expenses DECIMAL(12,2) DEFAULT 0,
  staff_costs DECIMAL(12,2) DEFAULT 0,
  food_costs DECIMAL(12,2) DEFAULT 0,
  operating_costs DECIMAL(12,2) DEFAULT 0,

  -- Marges
  gross_margin DECIMAL(12,2),                   -- Marge brute
  gross_margin_rate DECIMAL(5,2),               -- Taux marge brute

  -- Moyennes
  avg_invoice_amount DECIMAL(8,2),
  avg_revenue_per_child DECIMAL(8,2),

  -- CAF
  caf_participation_total DECIMAL(12,2) DEFAULT 0,
  family_share_total DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_kpi_nursery ON financial_kpi(nursery_id);
CREATE INDEX idx_financial_kpi_enterprise ON financial_kpi(enterprise_id);
CREATE INDEX idx_financial_kpi_date ON financial_kpi(kpi_date DESC);
CREATE INDEX idx_financial_kpi_period ON financial_kpi(period_type);

CREATE UNIQUE INDEX idx_financial_kpi_unique_nursery ON financial_kpi(nursery_id, kpi_date, period_type) WHERE nursery_id IS NOT NULL;
CREATE UNIQUE INDEX idx_financial_kpi_unique_enterprise ON financial_kpi(enterprise_id, kpi_date, period_type) WHERE enterprise_id IS NOT NULL;
```

---

#### 7.1.5 Table `report_template` (Templates de rapports personnalisés)
**Objectif**: Permettre création rapports personnalisés

```sql
CREATE TABLE report_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,

  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,

  -- Type de rapport
  report_type VARCHAR(50) NOT NULL,             -- 'financial', 'occupancy', 'compliance', 'custom'

  -- Fréquence génération
  frequency VARCHAR(20),                        -- 'daily', 'weekly', 'monthly', 'on_demand'
  is_automated BOOLEAN DEFAULT FALSE,           -- Génération automatique ?

  -- Configuration (JSON)
  config JSONB NOT NULL,
  -- Exemple: {
  --   "metrics": ["occupancy_rate", "revenue", "attendance_rate"],
  --   "date_range": "last_30_days",
  --   "grouping": "by_section",
  --   "charts": ["line", "bar", "pie"],
  --   "export_format": "pdf"
  -- }

  -- Destinataires (si automatisé)
  recipients_emails TEXT[],

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,

  -- Qui a créé
  created_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_template_nursery ON report_template(nursery_id);
CREATE INDEX idx_report_template_enterprise ON report_template(enterprise_id);
CREATE INDEX idx_report_template_type ON report_template(report_type);
CREATE INDEX idx_report_template_active ON report_template(is_active);
```

---

#### 7.1.6 Table `generated_report` (Rapports générés)
**Objectif**: Historique des rapports générés

```sql
CREATE TABLE generated_report (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES report_template(id) ON DELETE SET NULL,
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,

  report_name VARCHAR(255) NOT NULL,

  -- Période du rapport
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Fichier généré
  report_file_url TEXT NOT NULL,                -- PDF/Excel (Supabase Storage)
  file_format VARCHAR(20) DEFAULT 'pdf',        -- 'pdf', 'excel', 'csv'

  -- Stats du rapport
  pages_count INTEGER,
  file_size INTEGER,

  -- Génération
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generation_mode VARCHAR(20),                  -- 'manual', 'automated', 'scheduled'

  -- Envoi
  sent_to_recipients BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_report_template ON generated_report(template_id);
CREATE INDEX idx_generated_report_nursery ON generated_report(nursery_id);
CREATE INDEX idx_generated_report_enterprise ON generated_report(enterprise_id);
CREATE INDEX idx_generated_report_date ON generated_report(generated_at DESC);
CREATE INDEX idx_generated_report_period ON generated_report(period_start, period_end);
```

---

## 7.2 Relations et Flux de Données

### Schéma des Relations

```
nursery ──┬──> analytic_metric (1:N)
          ├──> occupancy_stat (1:N)
          ├──> attendance_stat (1:N)
          ├──> financial_kpi (1:N)
          ├──> report_template (1:N)
          └──> generated_report (1:N)

enterprise ──┬──> analytic_metric (1:N - métriques globales)
             ├──> financial_kpi (1:N - KPIs consolidés)
             ├──> report_template (1:N)
             └──> generated_report (1:N)

report_template ──> generated_report (1:N)
```

### Flux de Calcul Analytics

**1. Calcul quotidien automatique (nuit):**
1. Cron job (ou fonction Supabase Edge) s'exécute à 2h du matin
2. Pour chaque nursery:
   - Calcul `occupancy_stat` (agrégation de `attendance` du jour)
   - Calcul `attendance_stat` (stats présences/absences)
   - Calcul `financial_kpi` journalier (factures, paiements du jour)
   - Calcul `analytic_metric` (métriques diverses)
3. Stockage résultats dans tables analytics
4. Logs de calcul

**2. Calcul hebdomadaire/mensuel:**
1. Dimanche soir → Calcul stats semaine écoulée
2. 1er du mois → Calcul stats mois précédent
3. Agrégation des stats quotidiennes
4. Comparaisons période N vs N-1
5. Calcul tendances et prévisions

**3. Génération rapports automatiques:**
1. Selon `report_template.frequency` → Déclenchement auto
2. Récupération métriques selon `report_template.config`
3. Génération graphiques (charts)
4. Export PDF/Excel → `generated_report.report_file_url`
5. Envoi email aux destinataires → `report_template.recipients_emails`

**4. Dashboard temps réel:**
1. Owner accède dashboard → Requêtes sur dernières métriques
2. Affichage KPIs principaux (occupation, revenus, taux paiement)
3. Graphiques interactifs (revenus par mois, évolution occupation)
4. Comparaisons vs objectifs

---

## 7.3 Services TypeScript à Créer

```typescript
// lib/services/analytics.service.ts
export class AnalyticsService {
  // Calcul métriques
  async calculateMetric(name: string, nurseryId: string, date: Date): Promise<number>
  async calculateDailyMetrics(nurseryId: string, date: Date): Promise<void>
  async calculateMonthlyMetrics(nurseryId: string, month: Date): Promise<void>

  // Récupération métriques
  async getMetric(name: string, nurseryId: string, periodType: string, date: Date): Promise<AnalyticMetric>
  async getMetrics(nurseryId: string, filters: MetricFilters): Promise<AnalyticMetric[]>
  async getMetricTimeseries(name: string, nurseryId: string, startDate: Date, endDate: Date): Promise<TimeseriesData>

  // Comparaisons
  async compareMetric(name: string, nurseryId: string, period1: Date, period2: Date): Promise<MetricComparison>
  async getTrend(name: string, nurseryId: string, periods: number): Promise<TrendAnalysis>

  // Agrégations
  async aggregateByDimension(metricName: string, dimension: string, filters: any): Promise<AggregatedData[]>
}

// lib/services/occupancy-analytics.service.ts
export class OccupancyAnalyticsService {
  async calculateDailyOccupancy(nurseryId: string, date: Date): Promise<void>
  async getOccupancyStats(nurseryId: string, startDate: Date, endDate: Date): Promise<OccupancyStat[]>
  async getOccupancyBySection(nurseryId: string, date: Date): Promise<OccupancyStat[]>
  async getOccupancyTrend(nurseryId: string, days: number): Promise<TrendData>
  async predictOccupancy(nurseryId: string, futureDate: Date): Promise<number>  // ML prédiction
}

// lib/services/attendance-analytics.service.ts
export class AttendanceAnalyticsService {
  async calculateAttendanceStats(nurseryId: string, date: Date, periodType: string): Promise<void>
  async getAttendanceStats(nurseryId: string, startDate: Date, endDate: Date): Promise<AttendanceStat[]>
  async getAbsenceReasons(nurseryId: string, month: Date): Promise<AbsenceBreakdown>
  async getAverageAttendanceHours(nurseryId: string, month: Date): Promise<number>
  async identifyAttendancePatterns(nurseryId: string): Promise<Pattern[]>
}

// lib/services/financial-analytics.service.ts
export class FinancialAnalyticsService {
  async calculateFinancialKPIs(nurseryId: string, date: Date, periodType: string): Promise<void>
  async getKPIs(nurseryId: string, startDate: Date, endDate: Date): Promise<FinancialKPI[]>
  async getRevenueTrend(nurseryId: string, months: number): Promise<RevenueTrendData>
  async getCollectionRate(nurseryId: string, month: Date): Promise<number>
  async getRevenueBySource(nurseryId: string, month: Date): Promise<RevenueBreakdown>
  async forecastRevenue(nurseryId: string, futureMonth: Date): Promise<number>  // Prévision
}

// lib/services/report.service.ts
export class ReportService {
  // Templates
  async createTemplate(data: CreateReportTemplateInput): Promise<ReportTemplate>
  async getTemplates(nurseryId: string): Promise<ReportTemplate[]>
  async updateTemplate(templateId: string, data: UpdateReportTemplateInput): Promise<ReportTemplate>
  async deleteTemplate(templateId: string): Promise<void>

  // Génération
  async generateReport(templateId: string, periodStart: Date, periodEnd: Date): Promise<GeneratedReport>
  async generateCustomReport(config: ReportConfig): Promise<GeneratedReport>
  async getGeneratedReports(nurseryId: string): Promise<GeneratedReport[]>

  // Export
  async exportToPDF(reportId: string): Promise<string>  // URL PDF
  async exportToExcel(reportId: string): Promise<string>
  async exportToCSV(data: any[], filename: string): Promise<string>

  // Envoi
  async sendReport(reportId: string, recipients: string[]): Promise<void>
}

// lib/services/dashboard.service.ts
export class DashboardService {
  async getOwnerDashboard(nurseryId: string): Promise<OwnerDashboard>
  async getFinancialDashboard(nurseryId: string, month: Date): Promise<FinancialDashboard>
  async getOccupancyDashboard(nurseryId: string): Promise<OccupancyDashboard>
  async getHRDashboard(nurseryId: string): Promise<HRDashboard>
  async getQuickStats(nurseryId: string): Promise<QuickStats>
}
```

---

## 7.4 Pages UI à Créer

### Routes Propriétaire (Owner)

```
/owner/analytics                    - Dashboard analytics global
/owner/analytics/overview           - Vue d'ensemble KPIs

/owner/analytics/financial          - Analyses financières
/owner/analytics/financial/revenue  - Évolution CA
/owner/analytics/financial/payments - Suivi paiements
/owner/analytics/financial/forecast - Prévisions

/owner/analytics/occupancy          - Analyses occupation
/owner/analytics/occupancy/trends   - Tendances occupation
/owner/analytics/occupancy/sections - Par section

/owner/analytics/attendance         - Analyses présences
/owner/analytics/attendance/patterns - Patterns présences
/owner/analytics/attendance/absences - Analyse absences

/owner/analytics/hr                 - Analyses RH
/owner/analytics/hr/ratios          - Taux d'encadrement
/owner/analytics/hr/hours           - Heures travaillées
/owner/analytics/hr/absences        - Absences personnel

/owner/analytics/quality            - Indicateurs qualité
/owner/analytics/quality/satisfaction - Satisfaction parents
/owner/analytics/quality/compliance - Conformité

/owner/reports                      - Rapports
/owner/reports/templates            - Templates de rapports
/owner/reports/templates/new        - Créer template
/owner/reports/templates/[id]/edit  - Éditer template
/owner/reports/generated            - Rapports générés
/owner/reports/generate             - Générer rapport personnalisé
/owner/reports/[id]                 - Visualiser rapport
```

### Composants Réutilisables

```typescript
// components/analytics/KPICard.tsx                (Carte métrique avec évolution)
// components/analytics/MetricChart.tsx            (Graphique générique)
// components/analytics/LineChart.tsx
// components/analytics/BarChart.tsx
// components/analytics/PieChart.tsx
// components/analytics/AreaChart.tsx
// components/analytics/GaugeChart.tsx             (Jauge taux occupation)

// components/analytics/TrendIndicator.tsx         (Flèche hausse/baisse)
// components/analytics/ComparisonCard.tsx         (Comparaison période N vs N-1)
// components/analytics/TargetProgress.tsx         (Barre progression vers objectif)

// components/analytics/DateRangePicker.tsx        (Sélecteur période)
// components/analytics/MetricFilter.tsx
// components/analytics/DashboardGrid.tsx

// components/reports/ReportTemplateCard.tsx
// components/reports/ReportTemplateForm.tsx
// components/reports/ReportConfigBuilder.tsx      (Constructeur rapport drag & drop)
// components/reports/ReportPreview.tsx
// components/reports/ChartTypeSelector.tsx
// components/reports/MetricSelector.tsx

// components/analytics/OccupancyHeatmap.tsx       (Heatmap occupation par jour)
// components/analytics/RevenueWaterfall.tsx       (Graphique cascade revenus)
// components/analytics/ForecastChart.tsx          (Graphique avec prévisions)
```

---

## 7.5 Migrations SQL

```
migrations/
  70_phase7_analytics.sql           - analytic_metric
  71_phase7_occupancy.sql           - occupancy_stat
  72_phase7_attendance.sql          - attendance_stat
  73_phase7_financial.sql           - financial_kpi
  74_phase7_reports.sql             - report_template, generated_report
  75_phase7_indexes.sql             - Index de performance (métriques requêtées souvent)
  76_phase7_rls.sql                 - Row Level Security
  77_phase7_functions.sql           - Fonctions SQL (agrégations, calculs métriques)
  78_phase7_views.sql               - Vues matérialisées (dashboards temps réel)
  79_phase7_cron.sql                - Supabase Cron jobs (calculs quotidiens)
```

---

## 7.6 Complexité et Estimation

- **Migrations SQL**: 2 jours (6 tables + vues matérialisées + fonctions)
- **Services Analytics**: 4 jours (analytics, occupancy, attendance, financial, reports)
- **Calculs automatiques**: 2 jours (cron jobs, batch processing)
- **Pages Owner**: 4 jours (dashboards, graphiques, rapports)
- **Composants Charts**: 3 jours (intégration Recharts, graphiques avancés)
- **Génération rapports**: 2 jours (templates PDF/Excel personnalisés)
- **Tests & Optimisation**: 3 jours (performance queries, cache)

**Total Phase 7**: ~20 jours de développement

### Risques Identifiés

1. **Performance queries**: Agrégations sur gros volumes → Optimisation indexes, vues matérialisées
2. **Calculs quotidiens**: Timeout sur gros datasets → Batch processing, pagination
3. **Génération graphiques**: Performance client-side → Server-side rendering, caching
4. **Export Excel**: Large rapports (10k+ lignes) → Streaming, pagination
5. **Prévisions ML**: Modèles prédictifs simples ou API externe (Google Cloud AI) ?
6. **Temps réel**: Dashboards temps réel (WebSockets) ou refresh périodique ?

---

# 🔐 PHASE 8: INFRASTRUCTURE AVANCÉE

## 8.1 Architecture de Données

### Objectif
Sécurité renforcée avec RBAC granulaire, audit logging complet, conformité RGPD, backups automatiques et monitoring.

### Tables à Créer

#### 8.1.1 Table `role` (Rôles personnalisés)
**Objectif**: Définir rôles au-delà de Developer/Owner/Employee

```sql
CREATE TABLE role (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,  -- NULL = rôle système

  role_name VARCHAR(100) NOT NULL,              -- Nom du rôle
  -- Exemples: 'Director', 'Assistant_Director', 'Lead_Educator', 'Cook',
  --           'Nurse', 'Administrator', 'Accountant', 'Viewer'

  role_description TEXT,

  -- Type
  role_level VARCHAR(20) NOT NULL,              -- 'system', 'enterprise', 'nursery'
  is_system_role BOOLEAN DEFAULT FALSE,         -- Rôle système (non modifiable)

  -- Hiérarchie
  parent_role_id UUID REFERENCES role(id) ON DELETE SET NULL,
  role_priority INTEGER DEFAULT 0,              -- Priorité (plus élevé = plus de droits)

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_role_enterprise ON role(enterprise_id);
CREATE INDEX idx_role_level ON role(role_level);
CREATE INDEX idx_role_active ON role(is_active);
CREATE UNIQUE INDEX idx_role_name_enterprise ON role(enterprise_id, role_name);
```

---

#### 8.1.2 Table `permission` (Permissions granulaires)
**Objectif**: Permissions CRUD détaillées par ressource

```sql
CREATE TABLE permission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  permission_name VARCHAR(100) UNIQUE NOT NULL, -- Nom unique permission
  -- Format: 'resource:action'
  -- Exemples: 'child:read', 'child:create', 'invoice:delete',
  --           'staff:manage', 'report:export', 'settings:update'

  resource VARCHAR(50) NOT NULL,                -- Ressource (table/module)
  -- Resources: 'child', 'family', 'staff', 'contract', 'invoice',
  --            'payment', 'report', 'settings', 'user', 'role'

  action VARCHAR(20) NOT NULL,                  -- Action CRUD+
  -- Actions: 'create', 'read', 'update', 'delete',
  --          'manage', 'export', 'approve', 'sign'

  permission_description TEXT,

  -- Catégorie
  category VARCHAR(50),                         -- 'data', 'financial', 'hr', 'admin', 'system'

  is_system_permission BOOLEAN DEFAULT FALSE,   -- Permission système (non modifiable)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permission_resource ON permission(resource);
CREATE INDEX idx_permission_action ON permission(action);
CREATE INDEX idx_permission_category ON permission(category);
CREATE UNIQUE INDEX idx_permission_resource_action ON permission(resource, action);
```

---

#### 8.1.3 Table `role_permission` (Permissions par rôle)
**Objectif**: Lier permissions aux rôles (many-to-many)

```sql
CREATE TABLE role_permission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,

  granted BOOLEAN DEFAULT TRUE,                 -- true = accordé, false = refusé (deny explicite)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permission_role ON role_permission(role_id);
CREATE INDEX idx_role_permission_permission ON role_permission(permission_id);
CREATE INDEX idx_role_permission_granted ON role_permission(granted);
```

---

#### 8.1.4 Table `user_role` (Rôles par utilisateur)
**Objectif**: Affecter rôles aux utilisateurs (many-to-many)

```sql
CREATE TABLE user_role (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,

  -- Scope du rôle
  scope VARCHAR(20) DEFAULT 'enterprise',       -- 'enterprise', 'nursery'
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,  -- Si scope = 'nursery'

  -- Validité
  granted_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,                             -- NULL = permanent

  granted_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, role_id, nursery_id)
);

CREATE INDEX idx_user_role_user ON user_role(user_id);
CREATE INDEX idx_user_role_role ON user_role(role_id);
CREATE INDEX idx_user_role_nursery ON user_role(nursery_id);
CREATE INDEX idx_user_role_active ON user_role(is_active);
```

---

#### 8.1.5 Table `audit_log` (Logs d'audit)
**Objectif**: Tracer TOUTES les actions utilisateurs pour conformité

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Qui ?
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email VARCHAR(255),                      -- Backup si user supprimé
  user_role VARCHAR(50),

  -- Quoi ?
  action VARCHAR(100) NOT NULL,                 -- Action effectuée
  -- Exemples: 'child_created', 'invoice_paid', 'user_deleted', 'login_success', 'login_failed'

  resource_type VARCHAR(50),                    -- Type de ressource
  resource_id UUID,                             -- ID de la ressource
  resource_name VARCHAR(255),                   -- Nom/label de la ressource

  -- Contexte
  nursery_id UUID REFERENCES nursery(id) ON DELETE SET NULL,
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE SET NULL,

  -- Détails
  action_details JSONB,                         -- Détails de l'action (avant/après, params)
  -- Exemple: {"before": {...}, "after": {...}, "changes": [...]}

  -- Résultat
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,                           -- Si erreur

  -- Métadonnées technique
  ip_address INET,                              -- Adresse IP
  user_agent TEXT,                              -- User-Agent navigateur
  request_method VARCHAR(10),                   -- GET, POST, PUT, DELETE
  request_path TEXT,                            -- URL endpoint
  session_id VARCHAR(255),

  -- Compliance
  is_sensitive BOOLEAN DEFAULT FALSE,           -- Action sensible (données personnelles)
  gdpr_category VARCHAR(50),                    -- Catégorie RGPD si applicable

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_nursery ON audit_log(nursery_id);
CREATE INDEX idx_audit_log_enterprise ON audit_log(enterprise_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_ip ON audit_log(ip_address);
CREATE INDEX idx_audit_log_success ON audit_log(success);
CREATE INDEX idx_audit_log_sensitive ON audit_log(is_sensitive);
```

---

#### 8.1.6 Table `data_access_log` (Logs accès données sensibles)
**Objectif**: Tracer accès aux données personnelles (RGPD Article 30)

```sql
CREATE TABLE data_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Qui a accédé ?
  accessor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  accessor_email VARCHAR(255),
  accessor_role VARCHAR(50),

  -- Quelle donnée ?
  data_subject_type VARCHAR(50) NOT NULL,       -- 'child', 'guardian', 'employee'
  data_subject_id UUID NOT NULL,                -- ID de la personne
  data_subject_name VARCHAR(255),

  -- Catégorie de donnée
  data_category VARCHAR(50) NOT NULL,           -- 'identity', 'health', 'financial', 'contact', 'photo'
  accessed_fields TEXT[],                       -- Champs accédés (ex: ['first_name', 'birth_date'])

  -- Type d'accès
  access_type VARCHAR(20) NOT NULL,             -- 'read', 'export', 'update', 'delete'
  access_purpose TEXT,                          -- Justification accès

  -- Contexte
  nursery_id UUID REFERENCES nursery(id) ON DELETE SET NULL,

  -- Technique
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_access_log_accessor ON data_access_log(accessor_id);
CREATE INDEX idx_data_access_log_subject ON data_access_log(data_subject_type, data_subject_id);
CREATE INDEX idx_data_access_log_category ON data_access_log(data_category);
CREATE INDEX idx_data_access_log_type ON data_access_log(access_type);
CREATE INDEX idx_data_access_log_created ON data_access_log(created_at DESC);
CREATE INDEX idx_data_access_log_nursery ON data_access_log(nursery_id);
```

---

#### 8.1.7 Table `gdpr_request` (Demandes RGPD)
**Objectif**: Gérer demandes d'exercice droits RGPD

```sql
CREATE TABLE gdpr_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Demandeur
  requester_type VARCHAR(20) NOT NULL,          -- 'guardian', 'employee', 'other'
  requester_id UUID,                            -- ID guardian ou employee
  requester_email VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,

  -- Type de demande RGPD
  request_type VARCHAR(50) NOT NULL,            -- Type de demande
  -- Types: 'access' (Art. 15), 'rectification' (Art. 16), 'erasure' (Art. 17 - droit à l'oubli),
  --        'portability' (Art. 20), 'restriction' (Art. 18), 'objection' (Art. 21)

  request_description TEXT NOT NULL,            -- Description demande

  -- Sujet de la demande
  data_subject_type VARCHAR(50),                -- 'child', 'guardian', 'employee'
  data_subject_id UUID,
  data_subject_name VARCHAR(255),

  -- Statut
  status VARCHAR(20) DEFAULT 'received',        -- 'received', 'in_progress', 'completed', 'rejected'

  -- Délais RGPD (1 mois pour répondre, max 3 mois si complexe)
  received_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,                       -- Date limite réponse (J+30)
  completed_date DATE,

  -- Traitement
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Réponse
  response_text TEXT,
  response_documents_urls TEXT[],               -- Documents fournis (export données, etc.)

  rejection_reason TEXT,                        -- Si rejet (justifié légalement)

  -- Conformité
  identity_verified BOOLEAN DEFAULT FALSE,      -- Vérification identité demandeur
  verification_method VARCHAR(50),              -- Comment identité vérifiée

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gdpr_request_nursery ON gdpr_request(nursery_id);
CREATE INDEX idx_gdpr_request_type ON gdpr_request(request_type);
CREATE INDEX idx_gdpr_request_status ON gdpr_request(status);
CREATE INDEX idx_gdpr_request_requester ON gdpr_request(requester_type, requester_id);
CREATE INDEX idx_gdpr_request_due_date ON gdpr_request(due_date);
CREATE INDEX idx_gdpr_request_subject ON gdpr_request(data_subject_type, data_subject_id);
```

---

#### 8.1.8 Table `system_backup` (Backups automatiques)
**Objectif**: Tracer les backups de la base de données

```sql
CREATE TABLE system_backup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  backup_type VARCHAR(20) NOT NULL,             -- 'full', 'incremental', 'manual'

  -- Fichier backup
  backup_file_url TEXT NOT NULL,                -- URL backup (Supabase Storage ou S3)
  backup_file_size BIGINT,                      -- Taille en bytes
  backup_format VARCHAR(20) DEFAULT 'sql',      -- 'sql', 'dump', 'snapshot'

  -- Période couverte
  backup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_from DATE,                               -- Données depuis quelle date
  data_to DATE,                                 -- Données jusqu'à quelle date

  -- Statut
  status VARCHAR(20) DEFAULT 'in_progress',     -- 'in_progress', 'completed', 'failed'

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  error_message TEXT,

  -- Vérification
  checksum VARCHAR(64),                         -- SHA-256 du fichier
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- Rétention
  retention_days INTEGER DEFAULT 30,
  expires_at DATE,                              -- Date suppression auto

  -- Qui a déclenché
  triggered_by VARCHAR(50) DEFAULT 'system',    -- 'system', 'user_id'

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_backup_date ON system_backup(backup_date DESC);
CREATE INDEX idx_system_backup_type ON system_backup(backup_type);
CREATE INDEX idx_system_backup_status ON system_backup(status);
CREATE INDEX idx_system_backup_expires ON system_backup(expires_at);
```

---

## 8.2 Relations et Flux de Données

### Schéma des Relations

```
role ──┬──> role_permission (1:N)
       ├──> user_role (1:N)
       └──> parent_role (self-reference)

permission ──> role_permission (1:N)

profiles (User) ──┬──> user_role (1:N)
                  ├──> audit_log (1:N)
                  └──> data_access_log (1:N)

nursery ──┬──> user_role (1:N - si scope nursery)
          ├──> audit_log (1:N)
          ├──> data_access_log (1:N)
          └──> gdpr_request (1:N)

gdpr_request ──> profiles (N:1 - assigned_to)
```

### Flux RBAC (Role-Based Access Control)

**1. Vérification permission:**
```typescript
// Pseudo-code
async function userCan(userId: string, permission: string, nurseryId?: string): boolean {
  // 1. Récupérer rôles de l'utilisateur
  const userRoles = await getUserRoles(userId, nurseryId)

  // 2. Pour chaque rôle, récupérer permissions
  const allPermissions = []
  for (const role of userRoles) {
    const rolePerms = await getRolePermissions(role.role_id)
    allPermissions.push(...rolePerms)
  }

  // 3. Vérifier si permission demandée est accordée
  const perm = allPermissions.find(p => p.permission_name === permission)
  return perm?.granted === true
}

// Utilisation
if (await userCan(userId, 'invoice:delete', nurseryId)) {
  // Autoriser suppression facture
}
```

**2. Audit logging automatique:**
- Middleware Next.js → Intercepte toutes requêtes API
- Pour chaque action (POST, PUT, DELETE) → Créer `audit_log`
- Stocker: user, action, resource, avant/après, IP, user-agent
- Trigger PostgreSQL → Auto-log sur INSERT/UPDATE/DELETE de tables sensibles

**3. Gestion demande RGPD:**
1. Parent/employé soumet demande → `gdpr_request` créé (status = 'received')
2. Système calcule `due_date` = J+30
3. DPO (Data Protection Officer) / Owner assigne demande → `assigned_to_id`
4. Traitement selon type:
   - **Accès** (Art. 15): Export toutes données → PDF + JSON
   - **Rectification** (Art. 16): Modifier données erronées
   - **Effacement** (Art. 17): Suppression données (droit à l'oubli)
   - **Portabilité** (Art. 20): Export format structuré (JSON)
5. Réponse fournie → `gdpr_request.status` = 'completed'
6. Documents envoyés à demandeur

**4. Backup automatique quotidien:**
1. Cron job (3h du matin) → Déclenche backup Supabase
2. Export complet base → SQL dump
3. Upload fichier → Supabase Storage ou AWS S3
4. Enregistrement → `system_backup` (status = 'completed')
5. Calcul checksum SHA-256
6. Backups > 30 jours → Suppression auto

---

## 8.3 Services TypeScript à Créer

```typescript
// lib/services/rbac.service.ts
export class RBACService {
  // Rôles
  async createRole(data: CreateRoleInput): Promise<Role>
  async getRoles(enterpriseId: string): Promise<Role[]>
  async updateRole(roleId: string, data: UpdateRoleInput): Promise<Role>
  async deleteRole(roleId: string): Promise<void>

  // Permissions
  async getPermissions(): Promise<Permission[]>
  async getPermissionsByCategory(category: string): Promise<Permission[]>
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void>
  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<void>
  async getRolePermissions(roleId: string): Promise<Permission[]>

  // Utilisateurs
  async assignRoleToUser(userId: string, roleId: string, scope?: RoleScope): Promise<void>
  async revokeRoleFromUser(userId: string, roleId: string): Promise<void>
  async getUserRoles(userId: string, nurseryId?: string): Promise<Role[]>
  async getUserPermissions(userId: string, nurseryId?: string): Promise<Permission[]>

  // Vérification
  async userCan(userId: string, permission: string, nurseryId?: string): Promise<boolean>
  async userHasRole(userId: string, roleName: string, nurseryId?: string): Promise<boolean>
}

// lib/services/audit.service.ts
export class AuditService {
  // Logging
  async logAction(data: AuditLogInput): Promise<void>
  async logDataAccess(data: DataAccessLogInput): Promise<void>

  // Récupération logs
  async getAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]>
  async getDataAccessLogs(filters: DataAccessFilters): Promise<DataAccessLog[]>
  async getUserActivity(userId: string, startDate: Date, endDate: Date): Promise<AuditLog[]>

  // Analyse
  async getFailedLoginAttempts(userId: string, hours: number): Promise<AuditLog[]>
  async getSuspiciousActivity(nurseryId: string): Promise<AuditLog[]>
  async getDataAccessBySubject(subjectId: string, subjectType: string): Promise<DataAccessLog[]>

  // Export
  async exportAuditLogs(filters: AuditLogFilters, format: 'csv' | 'pdf'): Promise<string>
}

// lib/services/gdpr.service.ts
export class GDPRService {
  // Demandes
  async createRequest(data: CreateGDPRRequestInput): Promise<GDPRRequest>
  async getRequests(nurseryId: string, filters?: GDPRRequestFilters): Promise<GDPRRequest[]>
  async assignRequest(requestId: string, assignedToId: string): Promise<void>
  async updateRequestStatus(requestId: string, status: string, response?: string): Promise<void>

  // Traitement par type
  async processAccessRequest(requestId: string): Promise<{ dataExport: any, documents: string[] }>
  async processErasureRequest(requestId: string): Promise<void>  // Droit à l'oubli
  async processPortabilityRequest(requestId: string): Promise<string>  // Export JSON

  // Export données personnelles
  async exportPersonalData(subjectId: string, subjectType: string): Promise<any>
  async anonymizeData(subjectId: string, subjectType: string): Promise<void>

  // Conformité
  async checkCompliance(nurseryId: string): Promise<GDPRComplianceReport>
  async getRetentionPolicies(): Promise<RetentionPolicy[]>
  async applyDataRetention(nurseryId: string): Promise<void>  // Suppression données expirées
}

// lib/services/backup.service.ts
export class BackupService {
  async createBackup(type: 'full' | 'incremental'): Promise<SystemBackup>
  async getBackups(filters?: BackupFilters): Promise<SystemBackup[]>
  async restoreBackup(backupId: string): Promise<void>
  async verifyBackup(backupId: string): Promise<boolean>
  async deleteExpiredBackups(): Promise<number>  // Retourne nb backups supprimés
  async getBackupStatus(): Promise<BackupStatus>
}

// lib/services/security.service.ts
export class SecurityService {
  // Détection menaces
  async detectAnomalies(userId: string): Promise<SecurityAnomaly[]>
  async checkFailedLogins(userId: string): Promise<number>
  async blockSuspiciousIP(ipAddress: string, reason: string): Promise<void>

  // 2FA
  async enableTwoFactor(userId: string): Promise<{ secret: string, qrCode: string }>
  async verifyTwoFactor(userId: string, token: string): Promise<boolean>
  async disableTwoFactor(userId: string): Promise<void>

  // Sessions
  async getActiveSessions(userId: string): Promise<Session[]>
  async revokeSession(sessionId: string): Promise<void>
  async revokeAllSessions(userId: string): Promise<void>
}
```

---

## 8.4 Pages UI à Créer

### Routes Propriétaire (Owner)

```
/owner/security                     - Dashboard sécurité
/owner/security/roles               - Gestion rôles
/owner/security/roles/new           - Créer rôle
/owner/security/roles/[id]/edit     - Éditer rôle
/owner/security/permissions         - Matrice permissions

/owner/security/users               - Utilisateurs & rôles
/owner/security/users/[id]/roles    - Gérer rôles utilisateur

/owner/audit                        - Logs d'audit
/owner/audit/actions                - Actions utilisateurs
/owner/audit/data-access            - Accès données sensibles
/owner/audit/failed-logins          - Tentatives connexion échouées
/owner/audit/export                 - Exporter logs audit

/owner/gdpr                         - Conformité RGPD
/owner/gdpr/requests                - Demandes RGPD
/owner/gdpr/requests/[id]           - Traiter demande RGPD
/owner/gdpr/retention               - Politiques de rétention
/owner/gdpr/compliance              - Rapport conformité

/owner/backups                      - Sauvegardes
/owner/backups/history              - Historique backups
/owner/backups/create               - Créer backup manuel
/owner/backups/restore              - Restaurer backup

/owner/monitoring                   - Monitoring système
/owner/monitoring/performance       - Performance
/owner/monitoring/errors            - Erreurs
/owner/monitoring/usage             - Utilisation ressources
```

### Composants Réutilisables

```typescript
// components/security/RoleCard.tsx
// components/security/RoleForm.tsx
// components/security/PermissionMatrix.tsx        (Table permissions rôles)
// components/security/UserRoleManager.tsx         (Drag & drop rôles)

// components/audit/AuditLogTable.tsx
// components/audit/AuditLogFilter.tsx
// components/audit/AuditLogDetail.tsx
// components/audit/DataAccessTimeline.tsx
// components/audit/SuspiciousActivityAlert.tsx

// components/gdpr/GDPRRequestCard.tsx
// components/gdpr/GDPRRequestForm.tsx
// components/gdpr/GDPRRequestTimeline.tsx
// components/gdpr/DataExportPreview.tsx
// components/gdpr/RetentionPolicyTable.tsx
// components/gdpr/ComplianceChecklist.tsx

// components/backup/BackupCard.tsx
// components/backup/BackupStatus.tsx
// components/backup/RestoreWizard.tsx

// components/monitoring/SystemHealthGauge.tsx
// components/monitoring/ErrorLogTable.tsx
// components/monitoring/PerformanceChart.tsx
```

---

## 8.5 Migrations SQL

```
migrations/
  80_phase8_rbac.sql                - role, permission, role_permission, user_role
  81_phase8_audit.sql               - audit_log, data_access_log
  82_phase8_gdpr.sql                - gdpr_request
  83_phase8_backup.sql              - system_backup
  84_phase8_indexes.sql             - Index de performance
  85_phase8_rls.sql                 - Row Level Security stricte
  86_phase8_functions.sql           - Fonctions (vérification permissions, anonymisation)
  87_phase8_triggers.sql            - Triggers (auto-audit sur actions sensibles)
  88_phase8_views.sql               - Vues (activité utilisateurs, conformité)
```

---

## 8.6 Complexité et Estimation

- **Migrations SQL**: 2 jours (8 tables + triggers audit + RLS stricte)
- **Services**: 4 jours (RBAC, audit, GDPR, backup, security)
- **Middleware audit**: 2 jours (interception requêtes, logging auto)
- **Pages Owner**: 3 jours (roles, audit, GDPR, backups)
- **Composants UI**: 2 jours (matrice permissions, logs, conformité)
- **Conformité RGPD**: 3 jours (export données, anonymisation, droit à l'oubli)
- **Tests sécurité**: 3 jours (pentesting, vérification RLS, tests RBAC)

**Total Phase 8**: ~19 jours de développement

### Risques Identifiés

1. **Performance audit logs**: Volume élevé → Partitioning PostgreSQL par date
2. **Conformité RGPD**: Complexité légale, besoin expert DPO (Data Protection Officer)
3. **Droit à l'oubli**: Suppression données liées (cascade) vs anonymisation
4. **Backups**: Taille base croissante → Compression, backups incrémentaux
5. **RBAC complexité**: Hiérarchie rôles, héritage permissions → Tests exhaustifs
6. **Audit sensible**: Logs eux-mêmes contiennent données sensibles → Encryption at rest

---

# 🚀 PHASE 9: MODULES PREMIUM

## 9.1 Architecture de Données

### Objectif
Fonctionnalités avancées pour différencier l'offre premium : QR codes check-in/out, signatures électroniques, automatisation workflows, intégrations externes.

### Tables à Créer

#### 9.1.1 Table `qr_token` (QR Codes sécurisés)
**Objectif**: Générer QR codes uniques pour check-in/out rapide

```sql
CREATE TABLE qr_token (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Type de QR
  token_type VARCHAR(50) NOT NULL,              -- Type de QR code
  -- Types: 'child_checkin', 'guardian_identification', 'emergency_contact',
  --        'document_access', 'event_registration', 'visitor_badge'

  -- Lié à
  child_id UUID REFERENCES child(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardian(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Token
  token VARCHAR(255) UNIQUE NOT NULL,           -- Token unique (UUID ou hash)
  qr_code_data TEXT NOT NULL,                   -- Données encodées dans QR
  qr_code_image_url TEXT,                       -- Image QR code (Supabase Storage)

  -- Sécurité
  secret_key VARCHAR(255),                      -- Clé secrète pour validation
  is_encrypted BOOLEAN DEFAULT FALSE,

  -- Validité
  issued_date DATE DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ,                       -- NULL = jamais
  is_active BOOLEAN DEFAULT TRUE,

  -- Usage
  usage_count INTEGER DEFAULT 0,
  max_usage_count INTEGER,                      -- NULL = illimité
  last_used_at TIMESTAMPTZ,

  -- Métadonnées
  metadata JSONB,                               -- Données additionnelles

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_qr_token_type ON qr_token(token_type);
CREATE INDEX idx_qr_token_child ON qr_token(child_id);
CREATE INDEX idx_qr_token_guardian ON qr_token(guardian_id);
CREATE INDEX idx_qr_token_nursery ON qr_token(nursery_id);
CREATE INDEX idx_qr_token_token ON qr_token(token);
CREATE INDEX idx_qr_token_active ON qr_token(is_active);
CREATE INDEX idx_qr_token_expires ON qr_token(expires_at);
```

---

#### 9.1.2 Table `qr_scan_log` (Historique scans QR)
**Objectif**: Tracer tous les scans de QR codes

```sql
CREATE TABLE qr_scan_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_token_id UUID NOT NULL REFERENCES qr_token(id) ON DELETE CASCADE,

  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  scanned_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contexte
  scan_location VARCHAR(255),                   -- Lieu du scan
  scan_device VARCHAR(255),                     -- Device utilisé
  ip_address INET,

  -- Résultat
  scan_success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,                          -- Si échec (expiré, invalide, etc.)

  -- Action déclenchée
  action_triggered VARCHAR(100),                -- 'checkin_created', 'document_accessed', etc.
  related_resource_id UUID,                     -- ID ressource créée/modifiée

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_scan_log_token ON qr_scan_log(qr_token_id);
CREATE INDEX idx_qr_scan_log_scanned_at ON qr_scan_log(scanned_at DESC);
CREATE INDEX idx_qr_scan_log_scanned_by ON qr_scan_log(scanned_by_id);
CREATE INDEX idx_qr_scan_log_success ON qr_scan_log(scan_success);
```

---

#### 9.1.3 Table `electronic_signature` (Signatures électroniques)
**Objectif**: Stocker signatures électroniques légalement valides

```sql
CREATE TABLE electronic_signature (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Qui signe ?
  signer_type VARCHAR(20) NOT NULL,             -- 'guardian', 'employee', 'director'
  signer_id UUID NOT NULL,                      -- ID du signataire
  signer_email VARCHAR(255) NOT NULL,
  signer_name VARCHAR(255) NOT NULL,

  -- Document signé
  document_type VARCHAR(50) NOT NULL,           -- Type de document
  -- Types: 'contract', 'pai', 'authorization', 'consent_form',
  --        'amendment', 'medical_authorization', 'discharge_form'

  document_id UUID,                             -- ID du document dans sa table
  document_url TEXT NOT NULL,                   -- URL du document (PDF)

  -- Signature
  signature_image_url TEXT NOT NULL,            -- Image de la signature (Supabase Storage)
  signature_method VARCHAR(50) NOT NULL,        -- 'drawn', 'typed', 'uploaded', 'biometric'

  -- Métadonnées légales (conformité eIDAS EU)
  signature_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET NOT NULL,
  user_agent TEXT,
  geolocation JSONB,                            -- {lat, lon} si disponible

  -- Certificat
  certificate_hash VARCHAR(64),                 -- SHA-256 du document signé
  certificate_data JSONB,                       -- Données certificat (si signature qualifiée)

  -- Validité
  is_valid BOOLEAN DEFAULT TRUE,
  invalidation_reason TEXT,
  invalidated_at TIMESTAMPTZ,

  -- Contexte
  nursery_id UUID REFERENCES nursery(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_electronic_signature_signer ON electronic_signature(signer_type, signer_id);
CREATE INDEX idx_electronic_signature_document ON electronic_signature(document_type, document_id);
CREATE INDEX idx_electronic_signature_timestamp ON electronic_signature(signature_timestamp DESC);
CREATE INDEX idx_electronic_signature_nursery ON electronic_signature(nursery_id);
CREATE INDEX idx_electronic_signature_valid ON electronic_signature(is_valid);
```

---

#### 9.1.4 Table `automation_rule` (Règles d'automatisation)
**Objectif**: Automatiser workflows (ex: auto-envoi factures, auto-relances, etc.)

```sql
CREATE TABLE automation_rule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,

  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,

  -- Type d'automatisation
  automation_type VARCHAR(50) NOT NULL,         -- Type de règle
  -- Types: 'invoice_generation', 'payment_reminder', 'document_expiry_alert',
  --        'birthday_notification', 'attendance_report', 'auto_backup'

  -- Déclencheur (trigger)
  trigger_type VARCHAR(50) NOT NULL,            -- 'schedule', 'event', 'condition'
  trigger_config JSONB NOT NULL,
  -- Exemples:
  -- Schedule: {"cron": "0 0 1 * *"}  (1er de chaque mois à minuit)
  -- Event: {"event": "child_checkin", "condition": "late"}
  -- Condition: {"field": "invoice.due_date", "operator": "<", "value": "NOW() - INTERVAL '7 days'"}

  -- Actions à effectuer
  actions JSONB NOT NULL,                       -- Array d'actions
  -- Exemple: [
  --   {"action": "send_email", "to": "parent", "template": "payment_reminder"},
  --   {"action": "create_notification", "type": "push"},
  --   {"action": "update_status", "resource": "invoice", "status": "overdue"}
  -- ]

  -- Filtres
  filters JSONB,                                -- Conditions additionnelles
  -- Exemple: {"section": "BB", "status": "active"}

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  is_system_rule BOOLEAN DEFAULT FALSE,         -- Règle système (non modifiable)

  -- Exécution
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- Logs
  last_execution_status VARCHAR(20),            -- 'success', 'failed'
  last_execution_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_automation_rule_nursery ON automation_rule(nursery_id);
CREATE INDEX idx_automation_rule_enterprise ON automation_rule(enterprise_id);
CREATE INDEX idx_automation_rule_type ON automation_rule(automation_type);
CREATE INDEX idx_automation_rule_active ON automation_rule(is_active);
CREATE INDEX idx_automation_rule_next_exec ON automation_rule(next_execution_at);
```

---

#### 9.1.5 Table `automation_execution_log` (Logs exécution automatisations)
**Objectif**: Tracer exécutions des règles d'automatisation

```sql
CREATE TABLE automation_execution_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_rule_id UUID NOT NULL REFERENCES automation_rule(id) ON DELETE CASCADE,

  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_duration_ms INTEGER,

  -- Résultat
  status VARCHAR(20) NOT NULL,                  -- 'success', 'partial_success', 'failed'

  -- Détails
  items_processed INTEGER DEFAULT 0,            -- Nb éléments traités
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  actions_executed JSONB,                       -- Array des actions exécutées
  errors JSONB,                                 -- Array des erreurs

  -- Contexte
  trigger_source VARCHAR(50),                   -- 'cron', 'manual', 'event'
  triggered_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  execution_log TEXT,                           -- Log détaillé

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_execution_log_rule ON automation_execution_log(automation_rule_id);
CREATE INDEX idx_automation_execution_log_executed ON automation_execution_log(executed_at DESC);
CREATE INDEX idx_automation_execution_log_status ON automation_execution_log(status);
```

---

#### 9.1.6 Table `api_integration` (Intégrations API externes)
**Objectif**: Configurer intégrations avec services tiers

```sql
CREATE TABLE api_integration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,

  integration_name VARCHAR(255) NOT NULL,       -- Nom de l'intégration
  integration_type VARCHAR(50) NOT NULL,        -- Type d'intégration
  -- Types: 'accounting' (Sage, Cegid), 'payment' (Stripe, PayPal),
  --        'communication' (Twilio, SendGrid), 'storage' (Dropbox, Google Drive),
  --        'hr' (Payfit), 'webhook', 'custom'

  -- Configuration
  api_endpoint TEXT,                            -- URL API
  auth_type VARCHAR(50),                        -- 'api_key', 'oauth2', 'basic', 'bearer'

  -- Credentials (ENCRYPTED)
  api_key_encrypted TEXT,                       -- Clé API chiffrée
  api_secret_encrypted TEXT,
  oauth_token_encrypted TEXT,

  credentials JSONB,                            -- Autres credentials (chiffrés)

  -- Paramètres
  config JSONB,                                 -- Configuration spécifique
  -- Exemple Stripe: {"currency": "EUR", "webhook_secret": "..."}

  -- Synchronisation
  sync_enabled BOOLEAN DEFAULT FALSE,
  sync_frequency VARCHAR(20),                   -- 'realtime', 'hourly', 'daily', 'manual'
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  connection_status VARCHAR(20),                -- 'connected', 'disconnected', 'error'
  last_error TEXT,
  last_tested_at TIMESTAMPTZ,

  -- Logs
  total_requests INTEGER DEFAULT 0,
  total_successes INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_integration_enterprise ON api_integration(enterprise_id);
CREATE INDEX idx_api_integration_nursery ON api_integration(nursery_id);
CREATE INDEX idx_api_integration_type ON api_integration(integration_type);
CREATE INDEX idx_api_integration_active ON api_integration(is_active);
```

---

#### 9.1.7 Table `webhook` (Webhooks entrants/sortants)
**Objectif**: Gérer webhooks pour événements temps réel

```sql
CREATE TABLE webhook (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE,
  enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,

  webhook_name VARCHAR(255) NOT NULL,
  webhook_direction VARCHAR(10) NOT NULL,       -- 'outgoing', 'incoming'

  -- Configuration outgoing
  target_url TEXT,                              -- URL à appeler (si outgoing)
  http_method VARCHAR(10) DEFAULT 'POST',       -- GET, POST, PUT
  headers JSONB,                                -- Headers HTTP custom

  -- Sécurité
  secret_key VARCHAR(255),                      -- Clé secrète pour signature
  signature_header VARCHAR(100),                -- Header contenant signature (ex: X-Signature)

  -- Événements écoutés (outgoing)
  events TEXT[],                                -- Array d'événements
  -- Exemples: ['child.created', 'invoice.paid', 'attendance.checkin', 'document.uploaded']

  -- Payload
  payload_template JSONB,                       -- Template du payload envoyé

  -- Retry policy (outgoing)
  retry_enabled BOOLEAN DEFAULT TRUE,
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,

  -- Stats
  total_calls INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_webhook_nursery ON webhook(nursery_id);
CREATE INDEX idx_webhook_enterprise ON webhook(enterprise_id);
CREATE INDEX idx_webhook_direction ON webhook(webhook_direction);
CREATE INDEX idx_webhook_active ON webhook(is_active);
```

---

## 9.2 Relations et Flux de Données

### Schéma des Relations

```
child ──> qr_token (1:N)
guardian ──> qr_token (1:N)

qr_token ──> qr_scan_log (1:N)

electronic_signature ──┬──> document (N:1 - via document_id)
                       └──> nursery (N:1)

automation_rule ──> automation_execution_log (1:N)

api_integration ──> nursery (N:1)
api_integration ──> enterprise (N:1)

webhook ──> nursery (N:1)
webhook ──> enterprise (N:1)
```

### Flux Modules Premium

**1. QR Code Check-in/out:**
1. Parent inscrit enfant → Système génère QR code → `qr_token` (type = 'child_checkin')
2. QR code envoyé au parent (email + app mobile)
3. Parent arrive à crèche → Scan QR code avec tablette/smartphone
4. Système valide token → `qr_scan_log` créé
5. Si valide → Créer `check_in` (Phase 2) automatiquement
6. Notification parent → "Votre enfant est bien arrivé à 8h30"

**2. Signature électronique contrat:**
1. Owner crée contrat → `contract` (Phase 4)
2. Owner envoie pour signature → Email au parent avec lien sécurisé
3. Parent ouvre lien → Formulaire signature
4. Parent signe (doigt/souris) → Upload signature image
5. Système crée `electronic_signature` avec métadonnées légales
6. Hash SHA-256 du PDF + signature → Certificat eIDAS
7. Contrat status → 'signed'
8. Email confirmation + PDF signé envoyé

**3. Automatisation - Exemple: Auto-relance impayés:**
1. Owner crée règle → `automation_rule`:
   ```json
   {
     "trigger_type": "schedule",
     "trigger_config": {"cron": "0 9 * * *"},  // Tous les jours à 9h
     "actions": [
       {"action": "find_overdue_invoices", "days_overdue": 7},
       {"action": "send_email", "template": "payment_reminder"},
       {"action": "create_notification", "type": "push"}
     ],
     "filters": {"nursery_id": "xxx"}
   }
   ```
2. Cron job quotidien → Détecte factures en retard > 7 jours
3. Pour chaque facture → Envoi email + push notification
4. Log exécution → `automation_execution_log`

**4. Intégration Stripe (paiements en ligne):**
1. Owner configure intégration → `api_integration` (type = 'payment')
2. Stocke clés API Stripe (chiffrées)
3. Famille reçoit facture → Lien "Payer en ligne"
4. Redirection Stripe Checkout
5. Paiement réussi → Webhook Stripe appelle Luniqo
6. Luniqo reçoit webhook → Crée `payment` (Phase 5)
7. Invoice status → 'paid'
8. Email confirmation famille

**5. Webhook sortant - Exemple: Sync comptabilité:**
1. Nouvelle facture créée → Event `invoice.created`
2. Webhook détecte event → Envoie POST à URL Sage/Cegid
3. Payload: données facture (JSON)
4. Signature HMAC-SHA256 dans header
5. Système comptable reçoit → Crée écriture automatiquement
6. Sync bidirectionnelle

---

## 9.3 Services TypeScript à Créer

```typescript
// lib/services/qr-code.service.ts
export class QRCodeService {
  async generateQRCode(type: string, relatedId: string, expiresIn?: number): Promise<QRToken>
  async scanQRCode(token: string, scannedById: string): Promise<ScanResult>
  async getQRCode(tokenId: string): Promise<QRToken>
  async revokeQRCode(tokenId: string): Promise<void>
  async getQRCodesByChild(childId: string): Promise<QRToken[]>
  async getScanHistory(tokenId: string): Promise<QRScanLog[]>
}

// lib/services/electronic-signature.service.ts
export class ElectronicSignatureService {
  async createSignature(data: CreateSignatureInput): Promise<ElectronicSignature>
  async verifySignature(signatureId: string): Promise<boolean>
  async getSignatures(documentId: string, documentType: string): Promise<ElectronicSignature[]>
  async invalidateSignature(signatureId: string, reason: string): Promise<void>
  async generateCertificate(signatureId: string): Promise<SignatureCertificate>
  async exportSignedDocument(documentId: string, documentType: string): Promise<string>  // PDF avec signatures
}

// lib/services/automation.service.ts
export class AutomationService {
  // Règles
  async createRule(data: CreateAutomationRuleInput): Promise<AutomationRule>
  async getRules(nurseryId: string): Promise<AutomationRule[]>
  async updateRule(ruleId: string, data: UpdateAutomationRuleInput): Promise<AutomationRule>
  async deleteRule(ruleId: string): Promise<void>
  async toggleRule(ruleId: string, isActive: boolean): Promise<void>

  // Exécution
  async executeRule(ruleId: string): Promise<AutomationExecutionLog>
  async testRule(ruleId: string): Promise<TestResult>  // Dry run
  async scheduleRule(ruleId: string, nextExecution: Date): Promise<void>

  // Logs
  async getExecutionLogs(ruleId: string): Promise<AutomationExecutionLog[]>
  async getFailedExecutions(nurseryId: string): Promise<AutomationExecutionLog[]>
}

// lib/services/integration.service.ts
export class IntegrationService {
  // Configuration
  async createIntegration(data: CreateIntegrationInput): Promise<APIIntegration>
  async getIntegrations(enterpriseId: string): Promise<APIIntegration[]>
  async updateIntegration(integrationId: string, data: UpdateIntegrationInput): Promise<APIIntegration>
  async deleteIntegration(integrationId: string): Promise<void>

  // Connexion
  async testConnection(integrationId: string): Promise<boolean>
  async connect(integrationId: string): Promise<void>
  async disconnect(integrationId: string): Promise<void>

  // Synchronisation
  async syncNow(integrationId: string): Promise<SyncResult>
  async getSyncHistory(integrationId: string): Promise<SyncLog[]>

  // Intégrations spécifiques
  async syncStripe(integrationId: string): Promise<void>
  async syncAccounting(integrationId: string): Promise<void>
}

// lib/services/webhook.service.ts
export class WebhookService {
  // Configuration
  async createWebhook(data: CreateWebhookInput): Promise<Webhook>
  async getWebhooks(nurseryId: string): Promise<Webhook[]>
  async updateWebhook(webhookId: string, data: UpdateWebhookInput): Promise<Webhook>
  async deleteWebhook(webhookId: string): Promise<void>

  // Exécution
  async triggerWebhook(webhookId: string, event: string, payload: any): Promise<void>
  async handleIncomingWebhook(webhookId: string, payload: any, signature: string): Promise<void>

  // Sécurité
  async verifySignature(payload: any, signature: string, secret: string): Promise<boolean>
  async generateSignature(payload: any, secret: string): Promise<string>

  // Logs
  async getWebhookLogs(webhookId: string): Promise<WebhookLog[]>
  async retryFailedWebhook(logId: string): Promise<void>
}
```

---

## 9.4 Pages UI à Créer

### Routes Propriétaire (Owner)

```
/owner/premium                      - Dashboard modules premium

/owner/premium/qr-codes             - Gestion QR codes
/owner/premium/qr-codes/generate    - Générer QR codes en masse
/owner/premium/qr-codes/scans       - Historique scans

/owner/premium/signatures           - Signatures électroniques
/owner/premium/signatures/pending   - Signatures en attente
/owner/premium/signatures/history   - Historique signatures

/owner/premium/automation           - Automatisations
/owner/premium/automation/rules     - Liste règles
/owner/premium/automation/rules/new - Créer règle
/owner/premium/automation/rules/[id]/edit - Éditer règle
/owner/premium/automation/logs      - Logs exécutions

/owner/premium/integrations         - Intégrations API
/owner/premium/integrations/new     - Configurer intégration
/owner/premium/integrations/[id]    - Détail intégration
/owner/premium/integrations/[id]/sync - Synchroniser

/owner/premium/webhooks             - Webhooks
/owner/premium/webhooks/new         - Créer webhook
/owner/premium/webhooks/[id]/logs   - Logs webhook
```

### Composants Réutilisables

```typescript
// components/premium/QRCodeCard.tsx
// components/premium/QRCodeGenerator.tsx
// components/premium/QRCodeScanner.tsx         (Component React avec caméra)
// components/premium/QRCodeDisplay.tsx

// components/premium/SignaturePad.tsx          (Canvas pour signature)
// components/premium/SignatureCard.tsx
// components/premium/SignatureVerification.tsx
// components/premium/SignedDocumentViewer.tsx

// components/premium/AutomationRuleCard.tsx
// components/premium/AutomationRuleBuilder.tsx (Drag & drop workflow builder)
// components/premium/TriggerSelector.tsx
// components/premium/ActionSelector.tsx
// components/premium/AutomationTestPanel.tsx

// components/premium/IntegrationCard.tsx
// components/premium/IntegrationSetupWizard.tsx
// components/premium/SyncStatusIndicator.tsx
// components/premium/IntegrationTestPanel.tsx

// components/premium/WebhookCard.tsx
// components/premium/WebhookForm.tsx
// components/premium/WebhookLogViewer.tsx
// components/premium/PayloadBuilder.tsx
```

---

## 9.5 Migrations SQL

```
migrations/
  90_phase9_qr_codes.sql            - qr_token, qr_scan_log
  91_phase9_signatures.sql          - electronic_signature
  92_phase9_automation.sql          - automation_rule, automation_execution_log
  93_phase9_integrations.sql        - api_integration, webhook
  94_phase9_indexes.sql             - Index de performance
  95_phase9_rls.sql                 - Row Level Security
  96_phase9_functions.sql           - Fonctions (génération QR, vérification signatures)
  97_phase9_triggers.sql            - Triggers (auto-exécution webhooks)
  98_phase9_encryption.sql          - Fonctions encryption credentials API
```

---

## 9.6 Complexité et Estimation

- **Migrations SQL**: 2 jours (7 tables + encryption credentials)
- **Services**: 4 jours (QR, signatures, automation, integrations, webhooks)
- **QR Code scanning**: 2 jours (intégration librairie QR, caméra)
- **Signatures électroniques**: 2 jours (canvas signature, validation eIDAS)
- **Automation builder**: 3 jours (UI drag & drop workflows)
- **Intégrations API**: 3 jours (Stripe, comptabilité, webhooks)
- **Pages Owner**: 3 jours (dashboards, configuration)
- **Tests & Debug**: 3 jours

**Total Phase 9**: ~22 jours de développement

### Risques Identifiés

1. **QR Code scanning**: Performance caméra mobile, compatibilité navigateurs
2. **Signatures légales**: Conformité eIDAS (EU), validité juridique
3. **Automation complexité**: Logique conditionnelle avancée, boucles, timeouts
4. **Credentials sécurité**: Encryption at rest clés API (AES-256), rotation clés
5. **Webhooks fiabilité**: Retry logic, dead letter queue, monitoring downtime
6. **Intégrations maintenance**: APIs tierces changent → Versionning, tests réguliers

---

# 📊 RÉCAPITULATIF GÉNÉRAL

## Vue d'ensemble Phases 6-9

| Phase | Nom | Priorité | Tables | Services | Pages | Estimation |
|-------|-----|----------|--------|----------|-------|------------|
| 6 | Portail Parents | 🟡 MOYENNE | 8 | 5 | 20+ | 22 jours |
| 7 | Statistiques & Analyses | 🟢 BASSE | 6 | 6 | 15+ | 20 jours |
| 8 | Infrastructure Avancée | 🟢 BASSE | 8 | 5 | 12+ | 19 jours |
| 9 | Modules Premium | 🟢 BASSE | 7 | 5 | 10+ | 22 jours |

**Total Phases 6-9**: ~83 jours de développement

## Total Projet Complet (Phases 0-9)

| Phase | Tables | Estimation |
|-------|--------|------------|
| 0 | 3 | ✅ FAIT |
| 1 | 18 | 16 jours |
| 2 | 13 | 18 jours |
| 3 | 9 | 20 jours |
| 4 | 9 | 17 jours |
| 5 | 9 | 22 jours |
| 6 | 8 | 22 jours |
| 7 | 6 | 20 jours |
| 8 | 8 | 19 jours |
| 9 | 7 | 22 jours |

**Total général**: ~90 tables, ~196 jours de développement

---

**Prochaines Étapes Projet**:
1. ✅ Phase 0 (Multi-Site) - **COMPLÉTÉE**
2. 🔄 **Phase 1 en cours** (70% - reste UI pages)
3. → Phase 2 (Présences & Activités)
4. → Phase 3 (Personnel & Planning RH)
5. → Phases 4-9 selon priorités business

**Pour plus de détails sur Phases 1-3**: Consultez [ROADMAP-PHASES-1-3.md](ROADMAP-PHASES-1-3.md)

**Pour plus de détails sur Phases 3-5**: Consultez [ROADMAP-PHASES-3-5.md](ROADMAP-PHASES-3-5.md)

---

**Dernière mise à jour**: 2025-12-23
