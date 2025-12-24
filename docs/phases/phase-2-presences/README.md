# Phase 2 : Présences & Activités Quotidiennes

**Priorité**: 🔴 HAUTE
**Statut**: 📅 PLANIFIÉE (0%)
**Estimation**: 18 jours

---

## 🎯 Objectif

Traçabilité complète de la journée de l'enfant :
- Pointages arrivée/départ avec signatures
- Activités pédagogiques
- Repas détaillés
- Siestes et sommeil
- Changes et hygiène
- Observations développement

---

## 📊 Scope

### Tables à Créer (13)
1. `attendance` - Présences quotidiennes
2. `check_in` - Pointages arrivée
3. `check_out` - Pointages départ
4. `absence` - Absences déclarées
5. `child_planned_schedule` - Planning type
6. `child_activity` - Activités réalisées
7. `child_meal_log` (enrichir `child_meal_record`)
8. `child_sleep_log` - Siestes
9. `child_change_log` - Changes/hygiène
10. `activity` - Activités planifiées
11. `activity_participation` - Participation enfants
12. `activity_document` - Photos/vidéos activités
13. `child_observation` - Observations pédagogiques

### Services (4)
- `AttendanceService`
- `DailyLogsService`
- `ActivitiesService`
- `ObservationsService`

### Pages Employee
- `/employee/attendance` - Pointage
- `/employee/daily-logs` - Saisie quotidienne
- `/employee/activities` - Activités
- `/employee/observations` - Observations

### Pages Owner
- `/owner/attendance` - Rapports présences
- `/owner/activities` - Planning activités
- `/owner/observations` - Toutes observations
- `/owner/children/[id]/timeline` - Timeline journée

---

## 📁 Documentation

**À VENIR** - Documentation détaillée à créer lors du démarrage de Phase 2.

Voir [ROADMAP-PHASES-1-3.md](../../ROADMAP-PHASES-1-3.md#-phase-2-présences--activités-quotidiennes) pour le plan complet.

---

**Retour**: [Toutes les phases](../README.md)
