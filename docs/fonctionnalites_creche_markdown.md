# Document exhaustif des fonctionnalités et tables pour un logiciel de gestion de crèche / micro-crèche

Voici une **liste exhaustive**, organisée par **domaines fonctionnels**, de tout ce qu’un logiciel de gestion de crèche / micro-crèche complet peut contenir.
Chaque fonctionnalité mentionne **les tables à créer** ou à enrichir, avec **un niveau de granularité maximal**.

---

# 1. GESTION ADMINISTRATIVE ENFANTS & FAMILLES

## 1.1. Dossier enfant (administratif)

**Fonctionnalités :**

- Informations générales (identité, date naissance, sexe, nationalité, photo)
- Informations famille, composition familiale
- Autorisations diverses (sorties, photos, prise de médicaments)
- Contacts d’urgence
- Médecin référent
- Documents requis (vaccinations, justificatifs domicile/travail, attestation assurance)
- Gestion des sections / groupes (petits/moyens/grands)

**Tables :**
- `child`
- `child_section`
- `child_photo`
- `child_authorization`
- `child_emergency_contact`
- `child_doctor`
- `child_document`
- `section`

## 1.2. Familles & responsables légaux

**Fonctionnalités :**

- Identité parent 1 / parent 2
- Responsabilités juridiques
- Situation familiale
- Coordonnées
- Identifiants pour accès parent

**Tables :**
- `family`
- `guardian`
- `guardian_child`
- `guardian_address`
- `guardian_user`

## 1.3. Informations de santé

**Fonctionnalités :**

- Antécédents médicaux
- Allergies alimentaires / respiratoires / médicamenteuses
- Régimes alimentaires
- Vaccinations
- Plans d’accueil individualisés (PAI)

**Tables :**
- `child_health`
- `child_allergy`
- `child_diet`
- `child_vaccination`
- `pai_document`

---

# 2. INSCRIPTIONS, ADMISSIONS, CONTRATS

## 2.1. Demandes d’inscription

**Fonctionnalités :**

- Formulaire pré-inscription
- Critères de priorisation
- Liste d’attente
- Statuts demande (reçue, traitée, acceptée, refusée)

**Tables :**
- `application`
- `application_priority`
- `waiting_list`

## 2.2. Admission et affectation

**Fonctionnalités :**

- Passage de pré-inscription → admission
- Choix créneau, contrat, section
- Attributions automatiques ou manuelles

**Tables :**
- `admission`
- `child_assignment`

## 2.3. Contrats d’accueil

**Fonctionnalités :**

- Contrat régulier / occasionnel / d’urgence
- Horaires prévues (hebdomadaire)
- Tarifs appliqués
- Début / fin de contrat
- Annexes (modifications, avenants)

**Tables :**
- `contract`
- `contract_schedule`
- `contract_amendment`

## 2.4. Grilles tarifaires & réglementations

**Fonctionnalités :**

- Tarifs PAJE, PSU, Micro-crèche financement PAJE ou PSU
- Barèmes en fonction des revenus famille
- Heures supplémentaires / dépassements
- Frais annexes (repas, couches, pénalités)

**Tables :**
- `rate_grid`
- `rate_income_bracket`
- `rate_supplement`
- `rate_penalty`

---

# 3. GESTION QUOTIDIENNE / PRESENCES / ACTIVITÉS

## 3.1. Pointage des présences

**Fonctionnalités :**
- Arrivée / Départ / Absence
- Motifs absence
- Présences irrégulières
- Pointage par parents ou personnel

**Tables :**
- `attendance`
- `check_in`
- `check_out`
- `absence`

## 3.2. Planning enfant

**Fonctionnalités :**
- Planning prévu vs réel
- Siestes, repas, activités, changes
- Affectation par salle

**Tables :**
- `child_planned_schedule`
- `child_activity`
- `child_meal_log`
- `child_sleep_log`
- `child_change_log`
- `room`

## 3.3. Activités pédagogiques

**Fonctionnalités :**
- Ateliers / évènements / sorties
- Suivi participation
- Notes d’observation / développement

**Tables :**
- `activity`
- `activity_participation`
- `activity_document`
- `child_observation`

---

# 4. FACTURATION / FINANCES / COMPTABILITÉ

## 4.1. Facturation automatique

**Fonctionnalités :**
- Facturation mensuelle
- Facturation heure / créneau / réelle
- Régularisation
- Soldes, avoirs, remises
- Gestion multi-tarifs

**Tables :**
- `invoice`
- `invoice_line`
- `billing_period`
- `payment`
- `payment_method`
- `credit_note`

## 4.2. Suivi financier

**Fonctionnalités :**
- Journal des paiements
- Export comptable
- Relances impayés

**Tables :**
- `accounting_export`
- `debt_collection`
- `ledger_entry`

---

# 5. PORTAIL PARENTS

## 5.1. Communication parent

**Fonctionnalités :**
- Messages parents ↔ équipe
- Photos / cahier de vie
- Documents téléchargeables

**Tables :**
- `parent_message`
- `parent_notification`
- `parent_document`
- `timeline_post`

## 5.2. Portail documents

**Fonctionnalités :**
- Attestations de présence
- Attestations fiscales CAF
- Contrats & avenants

**Tables :**
- `tax_certificate`
- `caf_document`

---

# 6. PERSONNEL / RH / PLANNING

## 6.1. Gestion du personnel

**Fonctionnalités :**
- Fiche personnel
- Qualifications
- Autorisations
- Dossier disciplinaire

**Tables :**
- `staff`
- `staff_qualification`
- `staff_document`
- `staff_authorization`

## 6.2. Planning RH

**Fonctionnalités :**
- Shifts / vacations
- Congés / arrêts maladie
- Planification automatique

**Tables :**
- `staff_shift`
- `staff_absence`
- `staff_availability`
- `staff_assignment`

## 6.3. Conformité réglementaire

**Fonctionnalités :**
- Calcul taux d’encadrement
- Ratio qualification/enfants
- Traçabilité responsable technique

**Tables :**
- `regulatory_report`
- `ratio_log`

---

# 7. HYGIÈNE, SÉCURITÉ, HACCP

Tables complémentaires :
- `cleaning_product`
- `safety_inspection`
- `incident_report`
- `evacuation_drill`

---

# 8. DOCUMENTATION / REGISTRES LÉGAUX

**Tables :**
- `accident_log`
- `medication_administration`
- `rejected_authorization`

---

# 9. MULTI-STRUCTURES

**Tables :**
- `enterprise`
- `nursery`
- `nursery_admin`
- `nursery_settings`

---

# 10. STATISTIQUES / ANALYSES

**Tables :**
- `analytic_metric`
- `occupancy_stat`
- `attendance_stat`
- `financial_kpi`

---

# 11. INFRASTRUCTURE & ACCÈS

**Tables :**
- `role`
- `role_permission`
- `user_role`
- `audit_log`
- `data_access_log`

---

# 12. MODULES PREMIUM / OPTIONS

**Tables :**
- `qr_token`
- `signature`
- `automation_rule`

---

# LISTE BRUTE EXHAUSTIVE DES TABLES

```
child
child_section
child_photo
child_authorization
child_emergency_contact
child_doctor
child_document
family
guardian
guardian_child
guardian_address
guardian_user
child_health
child_allergy
child_diet
child_vaccination
pai_document

application
application_priority
waiting_list
admission
child_assignment

contract
contract_schedule
contract_amendment
rate_grid
rate_income_bracket
rate_supplement
rate_penalty

attendance
check_in
check_out
absence
child_planned_schedule

child_activity
child_meal_log
child_sleep_log
child_change_log
activity
activity_participation
activity_document
child_observation

invoice
invoice_line
billing_period
payment
payment_method
credit_note
accounting_export
debt_collection
ledger_entry

parent_message
parent_notification
parent_document
timeline_post
tax_certificate
caf_document

staff
staff_qualification
staff_document
staff_authorization
staff_shift
staff_absence
staff_availability
staff_assignment
regulatory

