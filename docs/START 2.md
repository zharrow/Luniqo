# 🚀 START - Guide de Démarrage Claude

Ce document te guide pour reprendre le travail sur Luniqo de manière efficace.

---

## 📖 Documents à Lire au Démarrage

**À CHAQUE nouvelle conversation, lis dans cet ordre :**

1. **[CLAUDE.md](CLAUDE.md)** - Architecture technique et conventions du projet
2. **[docs/phases/README.md](docs/phases/README.md)** - Vue d'ensemble de toutes les phases et progression globale
3. **Phase en cours** - Ouvre le dossier de la phase active (voir tableau dans `docs/phases/README.md`)
   - Exemple: `docs/phases/phase-1-dossier-enfant/README.md`
   - Lit les sous-documents selon le besoin (01-database.md, 02-services.md, etc.)

---

## 🎯 Identifier la Tâche en Cours

1. Consulte le tableau dans [docs/phases/README.md](docs/phases/README.md)
2. Identifie la phase avec le statut **EN COURS** ou **PLANIFIÉE** avec priorité HAUTE
3. Ouvre le README de cette phase pour voir la progression détaillée
4. Les tâches ⏳ (horloge) ou 🔄 (en cours) sont à faire
5. Les tâches ✅ (cochée) sont complétées

---

## 🎨 Bonnes Pratiques de Développement

### Frontend & Design

**IMPORTANT** : Lors de la création de pages UI (`page.tsx`), tu DOIS :

1. **Utiliser le skill frontend-design** : Toujours invoquer le skill `.claude/skills/frontend-design/SKILL.md` pour garantir la cohérence avec le design system "Modernité Organique"
2. **Éviter les stats cards génériques** : Les cartes de statistiques trop basiques (3-4 cartes avec icône + nombre + label) sont un cliché d'IA générique. Privilégier des interfaces organiques et variées avec :
   - Grilles asymétriques (12 colonnes Bento)
   - Variation de couleurs (3-4 couleurs minimum par page)
   - Ombres colorées et micro-interactions
   - Layouts créatifs et mémorables
   - Visualisations de données riches (graphiques, timelines, etc.)

**Référence** : Voir `.claude/skills/frontend-design/SKILL.md` pour les patterns exacts et la checklist chirurgicale.

---

## ✅ Workflow de Fin de Phase

Quand tu termines une phase ou une étape importante :

### 1. Mettre à Jour la Documentation

**Fichier principal à mettre à jour :**
- `docs/phases/phase-X-nom/README.md`

**Modifications à faire :**
```markdown
# Changer le statut global
**Statut**: ✅ 100% COMPLET (Base de données ✅ | Services ✅ | UI ✅)
**Début**: 2025-12-23
**Fin**: 2025-12-23  # ⬅️ Ajouter date de fin

# Mettre à jour la progression
- ✅ **Base de données** (100%) ✅ FAIT
- ✅ **Services** (100%) ✅ FAIT
- ✅ **Pages UI** (100%) ✅ FAIT  # ⬅️ Changer de 🔄 à ✅
- ✅ **Composants** (100%) ✅ FAIT

# Mettre à jour les prochaines étapes
### ✅ Complété (Cette Session - 2025-12-XX)
1. ✅ Tâche 1
2. ✅ Tâche 2
# ... déplacer toutes les tâches terminées ici
```

**Fichier global à mettre à jour :**
- `docs/phases/README.md`

**Modifications à faire :**
```markdown
# Mettre à jour le tableau récapitulatif
| Phase | Nom | Priorité | Statut | Tables | Estimation |
|-------|-----|----------|--------|--------|------------|
| 1 | Dossier Enfant & Familles | 🔴 HAUTE | **100% COMPLET** | 18 | - |
#                                                   ⬆️ Changer ici

# Mettre à jour la section de la phase
## ✅ Phase 1 : Dossier Enfant & Familles (COMPLÉTÉE)
#    ⬆️ Changer de 🔄 à ✅

**Statut**: 100% ✅
**Date de complétion**: 2025-12-XX  # ⬅️ Ajouter cette ligne
```

### 2. Git Commit Propre

**IMPORTANT : Format de commit SANS Co-Authored-By**

```bash
# Ajouter les fichiers modifiés
git add .

# Créer le commit avec gitmoji + message conventionnel
git commit -m "$(cat <<'EOF'
✅ feat(phase-X): complete [nom de la phase/tâche]

- Description ligne 1
- Description ligne 2
- Description ligne 3

Closes #issue-number (si applicable)
EOF
)"
```

**⚠️ ATTENTION :**
- ❌ **NE PAS** ajouter `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
- ❌ **NE PAS** ajouter `🤖 Generated with Claude Code`
- ✅ Utiliser **uniquement** le gitmoji + message conventionnel

### 3. Git Push vers Branche Feature

**IMPORTANT : Toujours pusher vers une branche qui représente la feature/fix**

```bash
# Vérifier le nom de la branche actuelle
git branch --show-current

# Si besoin, créer une nouvelle branche feature
git checkout -b feature/nom-descriptif
# Exemples:
# - feature/phase-1-dossier-enfant
# - feature/phase-2-presences
# - fix/session-status-bug
# - refactor/auth-context

# Pusher vers remote
git push origin <nom-branche>

# Ou pusher et créer upstream si première fois
git push -u origin <nom-branche>
```

**Convention de nommage des branches :**
- `feature/` - Nouvelles fonctionnalités (phase-X, module-Y)
- `fix/` - Corrections de bugs
- `refactor/` - Refactoring de code
- `docs/` - Documentation uniquement
- `perf/` - Optimisations de performance

**Workflow recommandé :**
1. Commit avec gitmoji ✅
2. Push vers branche feature 🚀
3. Créer Pull Request sur GitHub (si prêt pour review)
4. Fusionner dans `main` après validation

---

## 🎨 Gitmoji à Utiliser

Choisis le bon emoji selon le type de changement :

| Emoji | Code | Utilisation |
|-------|------|-------------|
| ✅ | `:white_check_mark:` | Complétion d'une phase/tâche |
| ✨ | `:sparkles:` | Nouvelle fonctionnalité |
| 🐛 | `:bug:` | Correction de bug |
| 📝 | `:memo:` | Documentation |
| 🎨 | `:art:` | Amélioration UI/Design |
| ♻️ | `:recycle:` | Refactoring |
| 🔧 | `:wrench:` | Configuration |
| 🗃️ | `:card_file_box:` | Migration base de données |
| 🚀 | `:rocket:` | Amélioration performance |

---

## 📋 Checklist Rapide

Avant de terminer une session :

- [ ] Vérifier que le build passe (`npm run build`)
- [ ] Mettre à jour `docs/phases/phase-X/README.md`
- [ ] Mettre à jour `docs/phases/README.md`
- [ ] Mettre à jour "Dernière mise à jour" avec la date du jour
- [ ] Faire `git add .`
- [ ] Faire `git commit` avec gitmoji (SANS Co-Authored-By)
- [ ] Faire `git push origin <branche-feature>` pour pusher vers remote
- [ ] Vérifier que CLAUDE.md est à jour si changement architectural

---

## 🔗 Liens Utiles

- [CLAUDE.md](CLAUDE.md) - Architecture et conventions
- [docs/phases/README.md](docs/phases/README.md) - Vue d'ensemble phases
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - Guide design et composants
- [ROADMAP-PHASES-1-3.md](ROADMAP-PHASES-1-3.md) - Roadmap original (référence)

---

**Dernière mise à jour**: 2026-01-20
**Phase actuelle**: Phase 7 - Statistiques & Analyses (100% ✅ COMPLÉTÉE)
**Prochaine phase**: Phase 8 - Infrastructure Avancée

---

## 🔄 Session en Cours (2026-01-20)

**Fonctionnalité**: Système de Permissions Granulaire par Crèche

### Contexte
Avant: Les modules étaient accordés au niveau **entreprise** (toutes les crèches d'une entreprise avaient les mêmes modules).
Maintenant: Les modules peuvent être accordés au niveau **crèche** (chaque crèche peut avoir ses propres abonnements).

### Travail Effectué
1. ✅ **Migration SQL** (`62_nursery_module_access.sql`)
   - Table `nursery_module_access` - Permissions par crèche
   - Table `nursery_module_access_request` - Demandes d'accès par crèche
   - Index de performance
   - Migration des données existantes (enterprise → nursery)
   - Module "analytics" ajouté au catalogue

2. ✅ **Service** (`lib/services/modules.service.ts`)
   - Nouvelles méthodes nursery-level:
     - `getEnterprisesWithNurseries()` - Liste entreprises + crèches + modules
     - `getNurseryModules()` - Modules d'une crèche
     - `hasNurseryModuleAccess()` - Vérification accès
     - `grantNurseryModuleAccess()` - Accorder accès
     - `revokeNurseryModuleAccess()` - Révoquer accès
     - `updateNurseryModules()` - Mise à jour bulk
     - `getAllPendingNurseryRequests()` - Demandes en attente
     - `approveNurseryRequest()` / `rejectNurseryRequest()`

3. ✅ **Pages Developer**
   - `/developer/permissions` - Gestion des permissions par crèche (refaite)
     - Vue hiérarchique: Entreprise → Crèches → Modules
     - Toggle switch pour activer/désactiver modules par crèche
     - Calcul MRR par crèche et par entreprise
     - Onglet demandes en attente
   - `/developer/enterprises` - Page de gestion des entreprises (nouvelle)
   - Sidebar Developer mise à jour avec liens

4. ✅ **Composants**
   - `components/ui/dialog.tsx` - Composant Dialog shadcn/ui ajouté

### Fichiers Modifiés
```
app/(developer)/developer/permissions/page.tsx    # Refait - hiérarchie entreprise/crèche
app/(developer)/developer/enterprises/page.tsx    # NOUVEAU
app/(developer)/layout.tsx                        # Minor update
app/(employee)/layout.tsx                         # Minor update
app/(owner)/layout.tsx                            # Minor update
components/layout/DeveloperSidebar.tsx            # Navigation mise à jour
components/ui/dialog.tsx                          # NOUVEAU
lib/services/modules.service.ts                   # +338 lignes méthodes nursery
supabase/migrations/62_nursery_module_access.sql  # NOUVEAU
```

### Prochaines Étapes (À faire)
1. ⏳ Appliquer la migration en base de données
2. ⏳ Tester la page permissions avec données réelles
3. ⏳ Vérifier les calculs MRR
4. ⏳ Ajouter vérification permissions côté Owner (sidebar)
5. ⏳ Commit et push vers branche feature

### Architecture Clé
```
Enterprise (ex: "Crèches du Soleil")
  └── Nursery 1 "Crèche Centre" → [base, cleaning, haccp]
  └── Nursery 2 "Crèche Est"    → [base, cleaning]        # Pas haccp!
  └── Nursery 3 "Crèche Ouest"  → [base, cleaning, analytics]
```

Chaque crèche peut avoir un ensemble différent de modules actifs.
