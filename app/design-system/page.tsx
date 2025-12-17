'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModuleCard } from '@/components/shared/ModuleCard'
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  BeakerIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'

export default function DesignSystemPage() {
  return (
    <div className="space-y-16 pb-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-200 mb-4">
          <span className="text-4xl">🎨</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">
          Design System v2 - Modernité Organique
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Système de design moderne basé sur la page HACCP de référence.
          Ombres colorées, gradients pastels, micro-animations.
        </p>
      </div>

      {/* Principes Fondamentaux */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Les 3 Piliers du Design</h2>
          <p className="text-gray-600">Philosophie "Interface Vivante"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pilier 1 */}
          <Card className="bg-white border border-rose-200/40 hover:shadow-[0_16px_48px_-12px_rgba(244,165,165,0.25)] transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center mb-3">
                <span className="text-2xl">🌈</span>
              </div>
              <CardTitle className="text-gray-900">1. Éviter la Monotonie</CardTitle>
              <CardDescription>
                VARIER les couleurs sur une même page pour créer une interface vivante et organique
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pilier 2 */}
          <Card className="bg-white border border-violet-200/40 hover:shadow-[0_16px_48px_-12px_rgba(179,157,219,0.25)] transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center mb-3">
                <span className="text-2xl">✨</span>
              </div>
              <CardTitle className="text-gray-900">2. Ombres Colorées</CardTitle>
              <CardDescription>
                Ombres qui reprennent la couleur du module = signature visuelle moderne
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pilier 3 */}
          <Card className="bg-white border border-emerald-200/40 hover:shadow-[0_16px_48px_-12px_rgba(129,201,149,0.25)] transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center mb-3">
                <span className="text-2xl">🎭</span>
              </div>
              <CardTitle className="text-gray-900">3. Micro-interactions</CardTitle>
              <CardDescription>
                Animations ludiques : rotation, scale, glissements fluides (300ms)
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Composant ModuleCard - Exemple Parfait */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Composant ModuleCard</h2>
          <p className="text-gray-600">Exemple de diversité de couleurs (comme page HACCP)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModuleCard
            module="users"
            href="#"
            icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Enfants"
            description="Gestion des enfants"
          />
          <ModuleCard
            module="calendar"
            href="#"
            icon={<CalendarIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Repas"
            description="Planification repas"
          />
          <ModuleCard
            module="tasks"
            href="#"
            icon={<ShoppingBagIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Produits"
            description="Gestion produits"
          />
          <ModuleCard
            module="communication"
            href="#"
            icon={<ChatBubbleLeftRightIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Fournisseurs"
            description="Gestion fournisseurs"
          />
          <ModuleCard
            module="haccp"
            href="#"
            icon={<BeakerIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Températures"
            description="Contrôle températures"
          />
          <ModuleCard
            module="settings"
            href="#"
            icon={<Cog6ToothIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Équipements"
            description="Maintenance équipements"
          />
          <ModuleCard
            module="analytics"
            href="#"
            icon={<DocumentTextIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Documents"
            description="Documents conformité"
          />
          <ModuleCard
            module="users"
            href="#"
            icon={<CheckCircleIcon className="w-5 h-5" strokeWidth={1.5} />}
            title="Non-conformités"
            description="Suivi incidents"
          />
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">💡 Principe : 8 couleurs différentes !</CardTitle>
            <CardDescription className="text-blue-700">
              Remarquez comment chaque carte a sa propre identité colorée. C'est ça le principe "Interface Vivante" !
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* Les 7 Éléments Essentiels */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Les 7 Éléments Essentiels</h2>
          <p className="text-gray-600">Ce qui compose une carte moderne</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              emoji: '🎨',
              title: '1. Bordure Colorée',
              description: 'border: 1px solid ${color}33 (20% opacity)',
              code: 'border-[#f4a5a5]/20',
            },
            {
              emoji: '🌅',
              title: '2. Gradient Pastel',
              description: 'linear-gradient(${colorLight}, white) opacity-60',
              code: 'from-[#fef6f7] to-white',
            },
            {
              emoji: '✨',
              title: '3. Ombre Colorée',
              description: 'shadow-[0_16px_48px_-12px_rgba(...,0.25)]',
              code: 'rgba(244,165,165,0.25)',
            },
            {
              emoji: '🎯',
              title: '4. Badge Icône Animé',
              description: 'rounded-2xl + scale-105 + rotate-2',
              code: 'group-hover:scale-105',
            },
            {
              emoji: '➡️',
              title: '5. Chevron Animé',
              description: 'opacity-0 → opacity-100 + translate-x',
              code: 'group-hover:opacity-100',
            },
            {
              emoji: '🚀',
              title: '6. Effet Flottant',
              description: 'hover:-translate-y-1',
              code: 'hover:-translate-y-1',
            },
            {
              emoji: '🟢',
              title: '7. Status Pulse',
              description: 'animate-ping (optionnel)',
              code: 'bg-green-500 animate-ping',
            },
          ].map((item, i) => (
            <Card key={i} className="bg-white border border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-xl">{item.emoji}</span>
                  </div>
                  <CardTitle className="text-gray-900 text-base">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">{item.code}</code>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparaison Avant/Après */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Avant / Après</h2>
          <p className="text-gray-600">L'évolution du design system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Avant */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="destructive" className="mb-4">❌ Avant - Monotone</Badge>
            </div>
            <div className="space-y-3 opacity-60">
              <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center mb-3">
                    <HomeIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Module 1</h3>
                  <p className="text-sm text-gray-600">Toutes les cartes vertes</p>
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center mb-3">
                    <UserGroupIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Module 2</h3>
                  <p className="text-sm text-gray-600">Monotone et ennuyeux</p>
                </CardContent>
              </Card>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                <strong>Problèmes :</strong> Ombre grise, bordure grise, pas de gradient, même couleur partout
              </p>
            </div>
          </div>

          {/* Après */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="default" className="mb-4 bg-green-600">✅ Après - Vivant</Badge>
            </div>
            <div className="space-y-3">
              <ModuleCard
                module="users"
                href="#"
                icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
                title="Enfants"
                description="Couleur rose"
                chevron={false}
                size="sm"
              />
              <ModuleCard
                module="calendar"
                href="#"
                icon={<CalendarIcon className="w-5 h-5" strokeWidth={1.5} />}
                title="Repas"
                description="Couleur pêche"
                chevron={false}
                size="sm"
              />
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                <strong>Avantages :</strong> Ombres colorées, bordures colorées, gradients pastels, couleurs variées !
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* À Éviter */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🚫 Ce qu'il faut Éviter</h2>
          <p className="text-gray-600">Les erreurs fatales</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Monotonie de couleur', description: 'Toutes les cartes de la même couleur = interface morte' },
            { title: 'Ombres grises', description: 'shadow-lg sans couleur = trop corporate' },
            { title: 'Bordures grises', description: 'border-gray-200 = perd l\'identité du module' },
            { title: 'Pas de gradients', description: 'bg-white pur = trop plat' },
            { title: 'Animations rapides', description: 'duration-100 = effet saccadé' },
            { title: 'Interface statique', description: 'Pas d\'animations = interface morte' },
          ].map((item, i) => (
            <Card key={i} className="bg-red-50 border-2 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2 text-base">
                  <span>❌</span> {item.title}
                </CardTitle>
                <CardDescription className="text-red-700">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Code Exemple */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📝 Code Exemple</h2>
          <p className="text-gray-600">Comment utiliser ModuleCard</p>
        </div>

        <Card className="bg-white border border-gray-200">
          <CardContent className="pt-6">
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
              <code>{`import { ModuleCard } from '@/components/shared/ModuleCard'
import { UserGroupIcon } from '@heroicons/react/24/outline'

<ModuleCard
  module="users"  // rose, emerald, blue, amber, violet, cyan, indigo
  href="/owner/haccp/children"
  icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
  title="Enfants"
  description="Gestion des enfants inscrits"
  chevron={true}  // optionnel, true par défaut
  size="md"       // optionnel, 'sm' | 'md' | 'lg'
  status={{ label: 'Disponible', active: true }}  // optionnel
/>`}</code>
            </pre>
          </CardContent>
        </Card>
      </section>

      {/* Patterns de Code Réutilisables */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🔧 Patterns de Code Réutilisables</h2>
          <p className="text-gray-600">Snippets prêts à l'emploi pour accélérer le développement</p>
        </div>

        {/* Pattern 1: Stats Cards */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Pattern 1: Stats Cards avec couleurs variées</h3>
          <Card className="bg-white border border-gray-200">
            <CardContent className="pt-6">
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`// Grille de stats avec 4 modules de couleurs différents
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <ModuleCard
    module="users"
    href="#"
    icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
    title="24 Enfants"
    description="Inscrits actuellement"
    size="sm"
    chevron={false}
  />
  <ModuleCard
    module="calendar"
    href="#"
    icon={<CalendarIcon className="w-5 h-5" strokeWidth={1.5} />}
    title="156 Repas"
    description="Ce mois-ci"
    size="sm"
    chevron={false}
  />
  <ModuleCard
    module="tasks"
    href="#"
    icon={<CheckCircleIcon className="w-5 h-5" strokeWidth={1.5} />}
    title="89% Complété"
    description="Taux de conformité"
    size="sm"
    chevron={false}
  />
  <ModuleCard
    module="haccp"
    href="#"
    icon={<BeakerIcon className="w-5 h-5" strokeWidth={1.5} />}
    title="12 Contrôles"
    description="Aujourd'hui"
    size="sm"
    chevron={false}
  />
</div>`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Pattern 2: Page Header */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Pattern 2: En-tête de page avec actions</h3>
          <Card className="bg-white border border-gray-200">
            <CardContent className="pt-6">
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`// En-tête moderne avec boutons d'action
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">
      Gestion des Enfants
    </h1>
    <p className="text-gray-600">
      24 enfants inscrits · 3 nouveaux cette semaine
    </p>
  </div>
  <div className="flex gap-3">
    <Button variant="outline">
      <DocumentTextIcon className="w-4 h-4 mr-2" />
      Exporter
    </Button>
    <Button className="bg-[#f4a5a5] hover:bg-[#c66b6b]">
      <UserGroupIcon className="w-4 h-4 mr-2" />
      Nouvel enfant
    </Button>
  </div>
</div>`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Pattern 3: List Item */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Pattern 3: Item de liste avec ombre colorée</h3>
          <Card className="bg-white border border-gray-200">
            <CardContent className="pt-6">
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`// Item de liste avec hover effect et ombre colorée
<div
  className="p-4 rounded-2xl bg-white border border-[#f4a5a5]/20
             hover:-translate-y-1 transition-all duration-300 cursor-pointer"
  style={{
    background: 'linear-gradient(to bottom right, #fef6f7, white)',
    boxShadow: '0 0 0 0 rgba(244,165,165,0.25)'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(244,165,165,0.25)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(244,165,165,0.25)'
  }}
>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f4a5a5] to-[#c66b6b]
                      flex items-center justify-center text-white font-semibold">
        MD
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Marie Dupont</h3>
        <p className="text-sm text-gray-600">3 ans · Groupe A</p>
      </div>
    </div>
    <Badge className="bg-green-100 text-green-800">Actif</Badge>
  </div>
</div>`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Guide de Migration Étape par Étape */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📋 Guide de Migration Étape par Étape</h2>
          <p className="text-gray-600">Comment migrer une page existante vers le nouveau design system</p>
        </div>

        <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Checklist de Migration</CardTitle>
            <CardDescription className="text-blue-700">
              Suivez ces étapes pour chaque page à migrer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              '✅ Remplacer les cartes custom par ModuleCard',
              '✅ Varier les couleurs (au moins 3-4 modules différents par page)',
              '✅ Vérifier les ombres colorées au hover (pas de shadow-lg gris)',
              '✅ Vérifier les bordures colorées (20% opacity via style prop)',
              '✅ Ajouter les gradients pastels en fond (opacity-60)',
              '✅ Vérifier les animations (scale, rotate, translate)',
              '✅ Transitions à 300ms minimum',
              '✅ Grilles simples (grid-cols-2/3/4)',
              '✅ Tester le hover sur tous les éléments interactifs',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-green-600 font-semibold mt-0.5">●</span>
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exemple Avant/Après avec code complet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Avant */}
          <Card className="bg-red-50 border-2 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <span>❌</span> Avant - Code Incorrect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-white p-3 rounded-lg overflow-x-auto text-xs border border-red-200">
                <code>{`// ❌ Problèmes:
// - Ombre grise générique
// - Bordure grise
// - Pas de gradient
// - Pas d'animations

<Card className="bg-white
       border border-gray-200
       hover:shadow-lg">
  <CardContent className="p-6">
    <HomeIcon className="w-8 h-8
                text-gray-600 mb-3" />
    <h3 className="font-semibold">
      Module
    </h3>
    <p className="text-sm">
      Description
    </p>
  </CardContent>
</Card>`}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Après */}
          <Card className="bg-green-50 border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900 flex items-center gap-2">
                <span>✅</span> Après - Code Correct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-white p-3 rounded-lg overflow-x-auto text-xs border border-green-200">
                <code>{`// ✅ Correct:
// - Ombre colorée (rose)
// - Bordure colorée 20%
// - Gradient pastel
// - Animations micro

<ModuleCard
  module="users"
  href="/owner/users"
  icon={<UserGroupIcon
    className="w-5 h-5"
    strokeWidth={1.5}
  />}
  title="Enfants"
  description="Gestion"
/>`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Exemples de Layouts Complets */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📐 Exemples de Layouts Complets</h2>
          <p className="text-gray-600">Structures de pages prêtes à l'emploi</p>
        </div>

        {/* Layout 1: Dashboard */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Layout 1: Page Dashboard</h3>
          <Card className="bg-white border border-gray-200">
            <CardContent className="pt-6">
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tableau de bord
        </h1>
        <p className="text-gray-600">
          Vue d'ensemble de votre crèche
        </p>
      </div>

      {/* Stats - 4 couleurs différentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModuleCard module="users" {...statsProps1} />
        <ModuleCard module="calendar" {...statsProps2} />
        <ModuleCard module="tasks" {...statsProps3} />
        <ModuleCard module="haccp" {...statsProps4} />
      </div>

      {/* Actions rapides - couleurs variées */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModuleCard module="clean" {...action1} />
          <ModuleCard module="communication" {...action2} />
          <ModuleCard module="settings" {...action3} />
        </div>
      </div>
    </div>
  )
}`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Layout 2: Page de Liste */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Layout 2: Page de Liste</h3>
          <Card className="bg-white border border-gray-200">
            <CardContent className="pt-6">
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`export default function ListPage() {
  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enfants</h1>
          <p className="text-gray-600">24 enfants inscrits</p>
        </div>
        <Button>Nouvel enfant</Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <Input placeholder="Rechercher..." />
        <Select>...</Select>
      </div>

      {/* Liste avec ombres colorées */}
      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-white border
                       hover:-translate-y-1 transition-all"
            style={{
              borderColor: colors.primary + '33',
              background: \`linear-gradient(to bottom right,
                           \${colors.light}, white)\`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                \`0 16px 48px -12px \${colors.shadow}\`
            }}
          >
            {/* Contenu de l'item */}
          </div>
        ))}
      </div>
    </div>
  )
}`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cheat Sheet Visuel */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">⚡ Cheat Sheet Visuel</h2>
          <p className="text-gray-600">Référence rapide des valeurs clés</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Ombres Colorées */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Formule Ombre Colorée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <code className="text-xs bg-blue-50 px-2 py-1 rounded block">
                0 16px 48px -12px rgba(R,G,B,0.25)
              </code>
              <p className="text-xs text-gray-600">
                • 0 = horizontal<br />
                • 16px = vertical<br />
                • 48px = blur<br />
                • -12px = spread négatif<br />
                • 0.25 = opacity 25%
              </p>
            </CardContent>
          </Card>

          {/* Bordures */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Formule Bordure Colorée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <code className="text-xs bg-green-50 px-2 py-1 rounded block">
                border: 1px solid #COLOR33
              </code>
              <p className="text-xs text-gray-600">
                • 1px = épaisseur<br />
                • solid = style<br />
                • #COLOR33 = couleur à 20% opacity<br />
                • 33 en hex = 20% en décimal
              </p>
            </CardContent>
          </Card>

          {/* Gradients */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Formule Gradient Pastel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <code className="text-xs bg-purple-50 px-2 py-1 rounded block">
                linear-gradient(to br, #LIGHT, white)
              </code>
              <p className="text-xs text-gray-600">
                • to bottom right = direction<br />
                • #LIGHT = couleur claire module<br />
                • white = blanc pur<br />
                • opacity-60 sur le container
              </p>
            </CardContent>
          </Card>

          {/* Animations */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Timing Animations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <code className="text-xs bg-yellow-50 px-2 py-1 rounded block">
                transition-all duration-300
              </code>
              <p className="text-xs text-gray-600">
                • 300ms = fluide et agréable<br />
                • 100ms = trop rapide, saccadé<br />
                • 500ms+ = trop lent<br />
                • transition-all = toutes propriétés
              </p>
            </CardContent>
          </Card>

          {/* Palette Modules */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">8 Modules de Couleurs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#5a9dc9' }}></div>
                  <span>clean - Bleu ciel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#81c995' }}></div>
                  <span>haccp - Vert menthe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#f4a5a5' }}></div>
                  <span>users - Rose pastel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#aed581' }}></div>
                  <span>tasks - Lime pastel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#ffab91' }}></div>
                  <span>calendar - Pêche</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#b39ddb' }}></div>
                  <span>settings - Violet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#64b5d1' }}></div>
                  <span>communication - Turquoise</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: '#9fa8da' }}></div>
                  <span>analytics - Indigo</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arrondis */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Border Radius Standards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <code className="text-xs bg-pink-50 px-2 py-1 rounded block">
                rounded-2xl ou rounded-3xl
              </code>
              <p className="text-xs text-gray-600">
                • Cartes: rounded-3xl<br />
                • Badges icônes: rounded-2xl<br />
                • Boutons: rounded-lg<br />
                • ❌ Éviter: rounded-xl (trop anguleux)
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Table des Matières */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📑 Navigation Rapide</h2>
          <p className="text-gray-600">Sections de cette page</p>
        </div>

        <Card className="bg-gradient-to-br from-violet-50 to-white border border-violet-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { emoji: '🎨', title: 'Les 3 Piliers', section: 'principes' },
                { emoji: '📦', title: 'ModuleCard', section: 'composant' },
                { emoji: '⭐', title: '7 Éléments', section: 'elements' },
                { emoji: '↔️', title: 'Avant/Après', section: 'comparaison' },
                { emoji: '🚫', title: 'À Éviter', section: 'erreurs' },
                { emoji: '📝', title: 'Code Exemple', section: 'code' },
                { emoji: '🔧', title: 'Patterns Réutilisables', section: 'patterns' },
                { emoji: '📋', title: 'Guide Migration', section: 'migration' },
                { emoji: '📐', title: 'Layouts Complets', section: 'layouts' },
                { emoji: '⚡', title: 'Cheat Sheet', section: 'cheatsheet' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-violet-200
                           hover:border-violet-300 hover:shadow-lg transition-all duration-300 text-left"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-sm font-medium text-gray-900">{item.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-gray-200">
        <p className="text-gray-600">
          Design System v2 - "Modernité Organique"
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Basé sur la page HACCP de référence · Dernière mise à jour : 2025-12-09
        </p>
      </div>
    </div>
  )
}
