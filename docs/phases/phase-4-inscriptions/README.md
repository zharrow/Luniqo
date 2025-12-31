# Phase 4: Inscriptions & Contrats

**Statut**: 🔄 EN COURS (60%)
**Début**: 2025-12-29
**Fin prévue**: 2025-12-30
**Priorité**: 🟡 MOYENNE

---

## 🎯 Objectif

Gérer le parcours complet d'inscription : demandes de pré-inscription, liste d'attente avec priorisation, processus d'admission, création de contrats d'accueil avec horaires et tarification (PSU, PAJE, privé).

---

## 📊 Progression

- ✅ **Base de données** (100%) ✅ FAIT - 9 migrations SQL créées
- ✅ **Services** (100%) ✅ FAIT - 5 services TypeScript créés
- 🔄 **Pages UI** (60%) - 10/18 pages Owner créées
- ⏳ **Composants** (0%) - Composants réutilisables (optionnel)

---

## 🗄️ Architecture de Données (9 Tables)

### 1. `application` - Demandes d'inscription
- Informations temporaires enfant + famille (avant création dossier complet)
- Statuts: received, under_review, accepted, rejected, waiting_list, cancelled
- Date souhaitée d'entrée, type de contrat, motivation

### 2. `application_priority` - Critères de priorisation
- Types: sibling, single_parent, special_needs, employee_child, local_resident, etc.
- Score numérique cumulatif
- Documents justificatifs

### 3. `waiting_list` - Liste d'attente
- Position dans la file d'attente (auto-calculée selon priorités)
- Notifications spot disponible
- Réponse famille (accepted, declined, no_response)

### 4. `admission` - Admission
- Transition demande → admission effective
- Création automatique Child + Family
- Affectation section/salle
- Période d'adaptation (trial period)

### 5. `contract` - Contrats d'accueil
- Numéro unique, type (regular, occasional, emergency)
- Période (CDI ou CDD)
- Tarification (PSU, PAJE, private, company)
- Signatures électroniques (famille + directeur)
- Document PDF contrat

### 6. `contract_schedule` - Horaires contractuels
- Planning hebdomadaire (jour par jour)
- Heures d'arrivée/départ par jour
- Heures quotidiennes et hebdomadaires totales

### 7. `contract_amendment` - Avenants au contrat
- Modifications en cours de contrat
- Types: schedule_change, rate_change, hours_change, suspension, reactivation
- Nouveaux horaires, nouveaux tarifs
- Signatures + document PDF

### 8. `rate_grid` - Grilles tarifaires
- Types: PSU, PAJE, privé, entreprise
- Paramètres PSU (taux CAF, participation)
- Période de validité

### 9. `rate_income_bracket` - Tranches de revenus
- Barème tarifaire selon revenus familiaux
- Tranche min/max revenus annuels
- Tarif horaire appliqué
- Coefficient PSU

---

## 🔧 Services TypeScript (5 Services)

### ApplicationService
- `create()`, `getByNursery()`, `getById()`, `update()`, `review()`
- `addPriority()`, `calculateTotalPriority()`

### WaitingListService
- `add()`, `getByNursery()`, `recalculatePositions()` (selon priorités)
- `notifyNextInLine()`, `recordResponse()`, `remove()`

### AdmissionService
- `admit()`, `createFamilyAndChild()` (auto-création depuis application)
- `assignSection()`, `complete()`

### ContractService
- `create()`, `generateContractNumber()`, `getByFamily()`, `getActiveContracts()`
- `setSchedule()`, `getSchedule()`
- `calculateRate()`, `applyRateGrid()`
- `generateContractPDF()`, `signByGuardian()`, `signByDirector()`, `activate()`
- `createAmendment()`, `getAmendments()`
- `terminate()`, `suspend()`, `reactivate()`

### RateGridService
- `create()`, `getByNursery()`, `getActiveGrid()`
- `addIncomeBracket()`, `calculateRateForIncome()`

---

## 📱 Pages UI Owner (10/18 Pages Créées)

### ✅ Applications (4/4 pages) ✅ COMPLET
- ✅ `/owner/applications` - Liste demandes (filtres: status, date)
- ✅ `/owner/applications/new` - Formulaire nouvelle demande (saisie manuelle)
- ✅ `/owner/applications/[id]` - Détail demande avec priorités
- ✅ `/owner/applications/[id]/review` - Examiner demande (accepter/rejeter/attente)

### ✅ Liste d'Attente (1/2 pages)
- ✅ `/owner/waiting-list` - Liste d'attente avec positions et scores
- ⏳ `/owner/waiting-list/manage` - Gérer positions (optionnel - drag & drop)

### ✅ Admissions (3/3 pages) ✅ COMPLET
- ✅ `/owner/admissions` - Admissions en cours
- ✅ `/owner/admissions/[id]` - Processus admission (formulaire détaillé)
- ✅ `/owner/admissions/[id]/complete` - Finaliser admission

### 🔄 Contrats (2/6 pages)
- ✅ `/owner/contracts` - Liste contrats (filtres: status, type, famille)
- ✅ `/owner/contracts/new` - Création contrat (formulaire complet)
- ⏳ `/owner/contracts/[id]` - Détail contrat (onglets: Infos, Horaires, Tarif, Avenants)
- ⏳ `/owner/contracts/[id]/schedule` - Édition horaires hebdo
- ⏳ `/owner/contracts/[id]/amendment` - Créer avenant
- ⏳ `/owner/contracts/[id]/terminate` - Résilier contrat

### 🔄 Grilles Tarifaires (1/3 pages)
- ✅ `/owner/rate-grids` - Gestion grilles tarifaires
- ⏳ `/owner/rate-grids/new` - Créer grille tarifaire
- ⏳ `/owner/rate-grids/[id]` - Détail grille (avec tranches revenus)

---

## 🧩 Composants Réutilisables (~15 Composants)

### Applications
- `ApplicationCard.tsx` - Carte demande avec infos clés
- `ApplicationForm.tsx` - Formulaire création/édition demande
- `ApplicationReviewPanel.tsx` - Panel examen demande
- `PriorityBadges.tsx` - Badges priorités avec scores

### Liste d'Attente
- `WaitingListTable.tsx` - Tableau liste d'attente
- `PositionDragDropList.tsx` - Liste drag & drop positions (optionnel)

### Admissions
- `AdmissionWizard.tsx` - Wizard multi-étapes admission
- `AdmissionProgress.tsx` - Progression admission

### Contrats
- `ContractCard.tsx` - Carte contrat avec infos principales
- `ContractForm.tsx` - Formulaire création contrat
- `ContractScheduleEditor.tsx` - Éditeur horaires hebdo (7 jours)
- `RateCalculator.tsx` - Calculateur tarif selon revenus
- `ContractPDFViewer.tsx` - Visualisateur PDF contrat
- `SignaturePanel.tsx` - Capture signature électronique
- `AmendmentForm.tsx` - Formulaire avenant
- `AmendmentsList.tsx` - Liste avenants d'un contrat

### Grilles Tarifaires
- `RateGridCard.tsx` - Carte grille tarifaire
- `RateGridForm.tsx` - Formulaire grille
- `IncomeBracketTable.tsx` - Tableau tranches revenus
- `IncomeBracketForm.tsx` - Formulaire tranche revenus

---

## 🔄 Flux d'Inscription Complet

### 1. Demande de Pré-Inscription
1. Parent remplit formulaire → `application` (status = 'received')
2. Système attribue priorités auto → `application_priority` (fratrie, etc.)
3. Owner examine → Accepte, rejette, ou liste d'attente

### 2. Liste d'Attente
1. Demande acceptée mais pas de place → `waiting_list`
2. Position calculée selon priorités cumulées
3. Place se libère → Notification famille
4. Famille répond → `waiting_list.family_response` (accepted/declined)

### 3. Admission
1. Place confirmée → `admission` créé
2. Auto-création `family` et `child` depuis `application`
3. Owner complète dossier enfant (santé, documents)
4. Affectation section/salle

### 4. Contrat
1. Owner crée contrat → `contract` (status = 'draft')
2. Saisie horaires hebdo → `contract_schedule` (un par jour)
3. Application grille tarifaire → `rate_income_bracket`
4. Génération PDF → `contract.contract_document_url`
5. Signatures (parent + directeur) → `contract` (status = 'active')

### 5. Avenant
1. Modification en cours de contrat → `contract_amendment`
2. Nouvelles conditions saisies
3. Signatures → Avenant actif
4. Application à partir de `effective_date`

---

## 📋 Migrations SQL (9 Migrations)

```
supabase/migrations/
  28_phase4_applications.sql        - application, application_priority
  29_phase4_waiting_list.sql        - waiting_list
  30_phase4_admissions.sql          - admission
  31_phase4_contracts.sql           - contract, contract_schedule, contract_amendment
  32_phase4_rate_grids.sql          - rate_grid, rate_income_bracket
  33_phase4_indexes.sql             - Index de performance
  34_phase4_views.sql               - Vues (optional)
  35_phase4_functions.sql           - Fonctions (calcul priorités, tarifs, numéros contrat)
  36_phase4_triggers.sql            - Triggers (auto-recalcul positions waiting list)
```

---

## ⚠️ Risques Identifiés

1. **Calcul priorités**: Algorithme complexe de pondération des critères
2. **Liste d'attente dynamique**: Gestion positions temps réel, notifications
3. **Génération contrats**: Templates PDF conformes réglementation française
4. **Signatures électroniques**: Validité juridique, stockage sécurisé
5. **Calcul tarifs PSU**: Formule complexe (revenus, taux CAF, coefficient famille)

---

## 📅 Estimation

- **Migrations SQL**: 2 jours (9 tables + fonctions)
- **Services**: 3 jours (5 services, ~60 méthodes)
- **Pages Owner**: 5 jours (15 pages UI)
- **Composants UI**: 3 jours (wizards, éditeur horaires, signatures)
- **Génération PDF**: 2 jours (templates contrats, avenants)
- **Tests & Debug**: 2 jours

**Total Phase 4**: ~17 jours de développement

---

## ✅ Prochaines Étapes

1. ⏳ Créer les 9 migrations SQL
2. ⏳ Créer les 5 services TypeScript
3. ⏳ Créer les pages UI Owner
4. ⏳ Créer les composants réutilisables
5. ⏳ Tester l'intégration complète

---

**Dernière mise à jour**: 2025-12-29
**Phase actuelle**: Phase 4 - Inscriptions & Contrats (EN COURS - 0%)
