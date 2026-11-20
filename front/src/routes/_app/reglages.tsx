import { createFileRoute, Link } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'

import { PageHeader } from '@/features/shell/page-header'

/** Réglages en trois catégories : mon compte, la crèche, l'entreprise. */
export const Route = createFileRoute('/_app/reglages')({
  component: SettingsPage,
})

const SOON = 'mt-2 text-[#5c6270]'

function SettingsPage() {
  const { session } = Route.useRouteContext()
  return (
    <div className="grid gap-8">
      <PageHeader title="Réglages" />
      <section aria-labelledby="reglages-compte" className="grid gap-2">
        <h2 id="reglages-compte" className="text-xl font-bold text-[#1e2430]">
          Mon compte
        </h2>
        {session.role === 'employee' && (
          <Link
            to="/mon-pin"
            className="inline-flex min-h-11 w-fit items-center gap-2 text-primary underline underline-offset-4"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            Mon PIN de tablette
          </Link>
        )}
        <p className={SOON}>Mot de passe, double authentification et préférences : bientôt.</p>
      </section>
      <section aria-labelledby="reglages-creche" className="grid gap-2">
        <h2 id="reglages-creche" className="text-xl font-bold text-[#1e2430]">
          La crèche
        </h2>
        <p className={SOON}>Coordonnées, capacité et horaires de la crèche : bientôt.</p>
      </section>
      <section aria-labelledby="reglages-entreprise" className="grid gap-2">
        <h2 id="reglages-entreprise" className="text-xl font-bold text-[#1e2430]">
          L&apos;entreprise
        </h2>
        <p className={SOON}>Informations de l&apos;entreprise et abonnement : bientôt.</p>
      </section>
    </div>
  )
}
