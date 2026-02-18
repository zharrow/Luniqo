import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | Luniqo',
  description: 'Politique de confidentialité et gestion des cookies de Luniqo',
}

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Retour à la connexion
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo-baby.png"
              alt="Luniqo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-semibold text-gray-900">Luniqo</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-12">
          {/* Title */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheckIcon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Politique de Confidentialité
              </h1>
              <p className="text-sm text-gray-500">
                Dernière mise à jour : 18 février 2026
              </p>
            </div>
          </div>

          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-600 leading-relaxed">
              Chez <strong>Luniqo</strong>, nous accordons une importance primordiale à la protection
              de vos données personnelles. Cette politique de confidentialité vous explique comment
              nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre
              application de gestion de crèche.
            </p>
          </section>

          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              1. Responsable du traitement
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Le responsable du traitement des données est <strong>Luniqo</strong>,
              application de gestion de crèche avec traçabilité HACCP.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              2. Données collectées
            </h2>
            <p className="mb-4 text-gray-600 leading-relaxed">
              Nous collectons les catégories de données suivantes :
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-600">
              <li>
                <strong>Données d&apos;identification</strong> : nom, prénom, adresse email,
                identifiants de connexion
              </li>
              <li>
                <strong>Données professionnelles</strong> : établissement, rôle,
                salles assignées
              </li>
              <li>
                <strong>Données d&apos;utilisation</strong> : pages visitées, actions effectuées,
                horodatage (avec votre consentement)
              </li>
              <li>
                <strong>Données HACCP</strong> : relevés de température, traçabilité alimentaire,
                contrôles d&apos;hygiène
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              3. Finalités du traitement
            </h2>
            <p className="mb-4 text-gray-600 leading-relaxed">
              Vos données sont utilisées pour :
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-600">
              <li>Fournir et améliorer nos services de gestion de crèche</li>
              <li>Assurer la traçabilité HACCP conformément à la réglementation</li>
              <li>Gérer votre compte et votre authentification</li>
              <li>Analyser l&apos;utilisation de l&apos;application pour l&apos;améliorer (avec votre consentement)</li>
              <li>Vous contacter pour le support technique</li>
            </ul>
          </section>

          {/* Section 4 - Cookies */}
          <section className="mb-8 rounded-xl bg-amber-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              4. Cookies et analyse d&apos;utilisation
            </h2>
            <p className="mb-4 text-gray-600 leading-relaxed">
              Nous utilisons <strong>PostHog</strong>, un outil d&apos;analyse hébergé en
              <strong> Union Européenne</strong> (conformité RGPD), pour comprendre comment
              vous utilisez notre application.
            </p>

            <h3 className="mb-2 font-medium text-gray-900">Si vous acceptez les cookies :</h3>
            <ul className="mb-4 list-inside list-disc space-y-1 text-gray-600">
              <li>Nous enregistrons vos sessions pour améliorer l&apos;expérience utilisateur</li>
              <li>Nous suivons les pages visitées et actions effectuées</li>
              <li>Vos préférences sont mémorisées entre les sessions</li>
            </ul>

            <h3 className="mb-2 font-medium text-gray-900">Si vous refusez les cookies :</h3>
            <ul className="list-inside list-disc space-y-1 text-gray-600">
              <li>Aucun cookie n&apos;est déposé sur votre appareil</li>
              <li>Nous collectons uniquement des statistiques anonymes de base</li>
              <li>Aucun enregistrement de session n&apos;est effectué</li>
              <li>Vous pouvez utiliser l&apos;application normalement</li>
            </ul>

            <p className="mt-4 text-sm text-gray-500">
              Vous pouvez modifier votre choix à tout moment en supprimant vos données
              de navigation ou en nous contactant.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              5. Hébergement et sécurité des données
            </h2>
            <p className="mb-4 text-gray-600 leading-relaxed">
              Vos données sont hébergées de manière sécurisée :
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-600">
              <li>
                <strong>Base de données</strong> : Supabase (serveurs en Union Européenne)
              </li>
              <li>
                <strong>Analytics</strong> : PostHog EU (serveurs en Union Européenne)
              </li>
              <li>
                <strong>Application</strong> : Vercel (conformité RGPD)
              </li>
            </ul>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Toutes les communications sont chiffrées (HTTPS/TLS). Les mots de passe
              sont hashés avec des algorithmes sécurisés (bcrypt).
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              6. Durée de conservation
            </h2>
            <ul className="list-inside list-disc space-y-2 text-gray-600">
              <li>
                <strong>Données de compte</strong> : conservées tant que votre compte est actif
              </li>
              <li>
                <strong>Données HACCP</strong> : conservées 5 ans (obligation réglementaire)
              </li>
              <li>
                <strong>Données analytics</strong> : conservées 24 mois maximum
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              7. Vos droits
            </h2>
            <p className="mb-4 text-gray-600 leading-relaxed">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-600">
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données</li>
              <li><strong>Droit à l&apos;effacement</strong> : supprimer vos données</li>
              <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format standard</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
              <li><strong>Droit de retirer votre consentement</strong> : pour les cookies à tout moment</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              8. Contact
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Pour exercer vos droits ou pour toute question concernant vos données personnelles,
              vous pouvez nous contacter à :{' '}
              <a href="mailto:contact@luniqo.fr" className="text-primary hover:underline">
                contact@luniqo.fr
              </a>
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Vous avez également le droit de déposer une réclamation auprès de la CNIL
              (Commission Nationale de l&apos;Informatique et des Libertés) si vous estimez
              que vos droits ne sont pas respectés.
            </p>
          </section>

          {/* Footer */}
          <div className="mt-12 border-t pt-6">
            <p className="text-center text-sm text-gray-500">
              Cette politique de confidentialité peut être mise à jour.
              Nous vous informerons de tout changement significatif.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
