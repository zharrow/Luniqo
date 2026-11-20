import type { FamilyId } from './families'
import type { SoonModule } from './navigation'

const SQUARE: Record<FamilyId, string> = {
  today: 'bg-family-today',
  children: 'bg-family-children',
  team: 'bg-family-team',
  places: 'bg-family-places',
  admin: 'bg-family-admin',
}

export function ComingSoon({ module }: { module: SoonModule }) {
  return (
    <section className="max-w-2xl">
      <span aria-hidden="true" className={`mb-4 block size-4 rounded-sm ${SQUARE[module.family]}`} />
      <h1 className="text-[34px] leading-tight font-extrabold text-[#1e2430]">{module.title}</h1>
      <p className="mt-3 text-lg font-semibold text-[#1e2430]">Ce module arrive dans Luniqo.</p>
      <p className="mt-2 text-base text-[#5c6270]">{module.description}</p>
    </section>
  )
}
