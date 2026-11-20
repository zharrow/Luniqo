import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { AnchorLink, type NavLinkComponent } from './nav-link'

export interface PageTab {
  label: string
  href: string
  current: boolean
}

interface PageHeaderProps {
  title: string
  kicker?: string
  breadcrumb?: string[]
  actions?: ReactNode
  tabs?: PageTab[]
  link?: NavLinkComponent
}

export function PageHeader({ title, kicker, breadcrumb, actions, tabs, link }: PageHeaderProps) {
  const Link = link ?? AnchorLink
  return (
    <header className="w-full min-w-0 max-w-full">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Fil d'Ariane" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-[#5c6270]">
            {breadcrumb.map((item, i) => {
              const last = i === breadcrumb.length - 1
              return (
                <li key={`${i}-${item}`} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight aria-hidden="true" className="size-3.5" />}
                  {last ? (
                    <span aria-current="page" className="font-semibold text-[#1e2430]">
                      {item}
                    </span>
                  ) : (
                    <span>{item}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {kicker && <p className="mb-1 text-[13px] font-bold uppercase tracking-widest text-[#1a3f99]">{kicker}</p>}
          <h1 className="text-[34px] leading-tight font-extrabold text-[#1e2430] break-words">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && tabs.length > 0 && (
        <nav aria-label="Sous-pages" className="mt-4 overflow-x-auto border-b border-[#ebe4d6]">
          <ul className="flex gap-6">
            {tabs.map((tab) => (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={tab.current ? 'page' : undefined}
                  className={
                    tab.current
                      ? 'flex min-h-11 items-center border-b-[3px] border-[#2459d6] font-bold text-[#1e2430] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2459d6]'
                      : 'flex min-h-11 items-center border-b-[3px] border-transparent font-medium text-[#5c6270] hover:text-[#1e2430] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2459d6]'
                  }
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
