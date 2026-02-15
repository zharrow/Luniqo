# Luniqo -- Architecture Remotion (Prompt à donner à Claude Code)

## Contexte

Tu dois générer l'architecture complète d'un projet Remotion pour
produire une vidéo promotionnelle premium (75--85 secondes, 1080p,
30fps) pour **Luniqo**, application SaaS de gestion de crèche.

Positionnement stratégique : - Différenciation principale : conformité
réglementaire (HACCP) - Image : premium, professionnelle, structurée -
100% mockups UI recréés (aucune vidéo humaine) - Respect strict du
design system fourni

------------------------------------------------------------------------

# 1. Stack technique

-   Remotion (React + TypeScript)
-   Tailwind CSS v4
-   shadcn/ui (composants simplifiés, sans logique métier)
-   Heroicons
-   Animations via spring() Remotion
-   Aucune API, aucune donnée dynamique réelle

------------------------------------------------------------------------

# 2. Paramètres globaux

-   Résolution : 1920x1080
-   FPS : 30
-   Durée cible : 80 secondes
-   Background global : #fafafa
-   Border radius : 16px (2xl)
-   Ombres subtiles uniquement
-   Pas d'animations excessives (pas de bounce)

------------------------------------------------------------------------

# 3. Design System à respecter

## Couleurs principales

Primary: #5a9dc9\
Secondary: #f4c2c2\
Accent (hover/focus): lavande\
Destructive: rouge accessible

## Fondamentaux UI

Background: #fafafa\
Foreground: #2d2d3d\
Cards: #ffffff\
Borders: #e0e0e8

## Ombres

shadow-sm: 0 2px 4px rgba(0,0,0,0.05)\
shadow: 0 4px 6px rgba(0,0,0,0.06)\
shadow-md: 0 6px 10px rgba(0,0,0,0.08)\
shadow-lg: 0 10px 15px rgba(0,0,0,0.08)

------------------------------------------------------------------------

# 4. Architecture du projet

Créer la structure suivante :

/src\
├─ Root.tsx\
├─ Video.tsx\
├─ scenes/\
│ ├─ Scene01_Responsibility.tsx\
│ ├─ Scene02_LegacyChaos.tsx\
│ ├─ Scene03_Dashboard.tsx\
│ ├─ Scene04_HACCP.tsx\
│ ├─ Scene05_MultiSite.tsx\
│ ├─ Scene06_Employee.tsx\
│ ├─ Scene07_UX.tsx\
│ └─ Scene08_Final.tsx\
├─ components/\
│ ├─ layout/\
│ │ ├─ BrowserFrame.tsx\
│ │ ├─ PhoneFrame.tsx\
│ │ ├─ TabletFrame.tsx\
│ ├─ ui/\
│ │ ├─ Card.tsx\
│ │ ├─ Sidebar.tsx\
│ │ ├─ Badge.tsx\
│ │ ├─ KPIWidget.tsx\
│ │ ├─ ChartCard.tsx\
│ │ ├─ TableMock.tsx\
│ │ ├─ CheckboxAnimated.tsx\
│ │ ├─ Toast.tsx\
│ ├─ modules/\
│ │ ├─ DashboardOverview.tsx\
│ │ ├─ HACCPCompliancePanel.tsx\
│ │ ├─ MultiSiteOverview.tsx\
│ │ ├─ EmployeeDailyCompliance.tsx\
│ │ ├─ ParentDailyFeed.tsx

------------------------------------------------------------------------

# 5. Règles d'animation

Uniquement : - opacity - translateY (max 20px) - léger blur en entrée -
scale 0.98 → 1

Configuration spring : - damping élevé - pas de bounce - easing doux

Les cartes entrent séquentiellement (stagger léger).

------------------------------------------------------------------------

# 6. Structure narrative des scènes

## Scene 01 -- Responsibility (0--8s)

Kinetic typography centrée. Texte : "Diriger une crèche implique une
responsabilité réglementaire constante."

Animation lente et élégante.

------------------------------------------------------------------------

## Scene 02 -- Legacy Chaos (8--16s)

Mockup désorganisé : - Excel - PDF HACCP - Email - Planning externe

Texte : "Données dispersées. Suivi manuel. Risque d'erreur."

Transition blur → dashboard propre.

------------------------------------------------------------------------

## Scene 03 -- Dashboard (16--32s)

DashboardOverview : - Sidebar pastel - 3 KPI cards - Graphique taux de
remplissage - Bloc alertes conformité

Texte : "Vision globale. Pilotage multi-sites. Indicateurs en temps
réel."

------------------------------------------------------------------------

## Scene 04 -- HACCP Focus (32--48s)

HACCPCompliancePanel : - Journal horodaté - Températures validées -
Allergies signalées - Badge "Conforme"

Texte : "Traçabilité complète. Historique sécurisé. Contrôles
simplifiés."

------------------------------------------------------------------------

## Scene 05 -- Multi-Site (48--60s)

MultiSiteOverview : - Sélecteur de site - KPI globaux - Alertes
conformité

Texte : "Supervision centralisée."

------------------------------------------------------------------------

## Scene 06 -- Employé (60--70s)

EmployeeDailyCompliance : - Tâches réglementaires - Observations -
Validation repas

Texte : "Procédures intégrées. Moins d'oubli."

------------------------------------------------------------------------

## Scene 07 -- UX Premium (70--78s)

Zoom sur interface. Focus : - Coins 16px - Ombres subtiles - Espaces
blancs

Texte : "Clair. Structuré. Professionnel."

------------------------------------------------------------------------

## Scene 08 -- Final (78--85s)

Split screen : - HACCP - Dashboard - Planning

Texte final : "Luniqo -- La conformité maîtrisée."

------------------------------------------------------------------------

# 7. Contraintes importantes

-   Aucun effet gimmick
-   Pas de rotation
-   Pas d'animations rapides
-   Pas de surcharge visuelle
-   Maximum 4 couleurs simultanées
-   Beaucoup d'espace blanc

------------------------------------------------------------------------

# 8. Objectif final

Produire un rendu premium, institutionnel, rassurant. La conformité
réglementaire doit être perçue comme maîtrisée, structurée et élégante.
