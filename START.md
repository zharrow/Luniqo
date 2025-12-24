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
- [ ] Vérifier que CLAUDE.md est à jour si changement architectural

---

## 🔗 Liens Utiles

- [CLAUDE.md](CLAUDE.md) - Architecture et conventions
- [docs/phases/README.md](docs/phases/README.md) - Vue d'ensemble phases
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - Guide design et composants
- [ROADMAP-PHASES-1-3.md](ROADMAP-PHASES-1-3.md) - Roadmap original (référence)

---

**Dernière mise à jour**: 2025-12-24
**Phase actuelle**: Phase 1 - Dossier Enfant & Familles (100% ✅ COMPLÉTÉE)
