# Plan: Refonte page Documents HACCP

## Objectif
Transformer la page Documents HACCP d'un simple gestionnaire d'upload en un **centre de registres HACCP auto-générés** à partir des données opérationnelles déjà collectées par l'app, tout en gardant l'upload manuel pour les documents externes.

## Architecture

### UI: 2 onglets avec shadcn Tabs
- **Onglet "Registres HACCP"** (défaut) — Fiches auto-générées depuis les données opérationnelles
- **Onglet "Documents externes"** — Upload manuel (formations, audits, certifications)

### Onglet 1: Registres HACCP

5 types de registres sous forme de cards cliquables, chaque card s'expand pour montrer les données en tableau avec filtre par période :

| Registre | Source | Colonnes affichées |
|---|---|---|
| Relevé de températures | `temperature_check` via `haccpService.getTemperatures()` | Date, Point de contrôle, Température, Conformité, Notes |
| Nettoyage quotidien | `daily_cleaning_session` + `task_completion` via `sessionsService.getAll()` + `getSessionLogs()` | Date, Statut, Tâches complétées, % complétion |
| Traçabilité des repas | `meal` via `haccpService.getMeals()` | Date, Type, Menu, Allergènes, Validé |
| Non-conformités | `haccp_incident` via `haccpService.getNonCompliances()` | Date, Type, Description, Statut, Action corrective |
| Équipements & Maintenance | `equipment` via `haccpService.getEquipment()` | Nom, Catégorie, Dernière maintenance, Prochaine |

Chaque registre a :
- Date range picker (date début / date fin, défaut = mois en cours)
- Tableau de données avec les lignes
- Bouton "Exporter PDF" utilisant `pdfExportService.exportHACCP()` existant
- Stats résumées (nb entrées, % conformité, etc.)

### Onglet 2: Documents externes

L'upload manuel existant, **corrigé** pour fonctionner avec le vrai schéma DB :
- Mapping des champs : `title` → `name`, `file_key` → `file_path`, `uploaded_by_id` → `responsible_id`
- Catégories réduites aux docs manuels : Training, Compliance, Other
- Upload + Delete qui marchent réellement

## Fichiers à modifier

### 1. `lib/services/haccp.service.ts` — Corriger les méthodes documents
- Aligner `getDocuments()`, `createDocument()`, `deleteDocument()` sur les vrais noms de colonnes DB (`name`, `file_path`, `responsible_id`, `creation_date`)
- Mettre à jour les interfaces `Document` et `CreateDocumentInput`
- Ajouter `getTemperatures()` avec filtrage par date (déjà existant, juste vérifier)
- Ajouter `getMealsByDateRange()` si nécessaire

### 2. `lib/services/sessions.service.ts` — Ajouter méthode filtrage par date range
- Ajouter `getByDateRange(nurseryId, startDate, endDate)` pour récupérer les sessions sur une période

### 3. `app/(owner)/owner/haccp/documents/page.tsx` — Refonte complète
- Tabs "Registres HACCP" / "Documents externes"
- Composant `RegisterCard` pour chaque type de registre (expand/collapse)
- Date range picker intégré
- Tableaux de données auto-générées
- Boutons export PDF
- Onglet documents externes avec le formulaire d'upload corrigé

### 4. `lib/services/pdf-export.service.ts` — Ajouter export par registre individuel
- Ajouter `exportTemperatureRegister()` — PDF spécifique températures
- Ajouter `exportCleaningRegister()` — PDF spécifique nettoyage
- Ajouter `exportMealRegister()` — PDF spécifique repas
- Ajouter `exportNonComplianceRegister()` — PDF spécifique non-conformités
- Ajouter `exportEquipmentRegister()` — PDF spécifique équipements
- (Réutilise les patterns existants de `exportHACCP()`)

## Ordre d'implémentation

1. **Corriger le service haccp** — Aligner les noms de colonnes documents sur le schéma DB
2. **Ajouter méthode sessions par date range** — Pour le registre nettoyage
3. **Ajouter les exports PDF par registre** — 5 nouvelles méthodes dans pdf-export.service
4. **Refondre la page** — UI complète avec tabs, registres, et documents externes
