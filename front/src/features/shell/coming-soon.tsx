import { Creature } from './creature'
import type { SoonModule } from './navigation'

/** Module pas encore réécrit : la créature de sa famille dépasse du bas du panneau (LUN-151). */
export function ComingSoon({ module }: { module: SoonModule }) {
  return (
    <section className="relative max-w-2xl overflow-hidden rounded-2xl border border-shell-border bg-shell py-6 pr-32 pl-6 sm:min-h-44">
      <h1 className="text-[34px] leading-tight font-extrabold text-[#1e2430]">{module.title}</h1>
      <p className="mt-3 text-lg font-semibold text-[#1e2430]">Ce module arrive dans Luniqo.</p>
      <p className="mt-2 text-base text-[#5c6270]">{module.description}</p>
      <Creature family={module.family} size={120} hop className="absolute right-4 -bottom-1.5" />
    </section>
  )
}
