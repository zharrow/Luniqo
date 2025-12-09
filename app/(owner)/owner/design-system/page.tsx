'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ModuleCard } from '@/components/shared/ModuleCard'
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CheckCircleIcon,
  BeakerIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'

export default function DesignSystemPage() {
  return (
    <div className="space-y-16 pb-20">
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
