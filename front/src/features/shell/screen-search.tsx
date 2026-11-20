import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import type { NavItem, Navigation } from './navigation'
import { searchScreens } from './navigation'

interface Props {
  navigation: Navigation
  onOpen: (href: string) => void
}

function groupLabelOf(nav: Navigation, item: NavItem): string {
  return nav.groups.find((g) => g.items.some((i) => i.id === item.id))?.label ?? ''
}

export function ScreenSearch({ navigation, onOpen }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const results = searchScreens(navigation, query)
  const expanded = open && query.trim() !== ''
  const optionId = (i: number) => `${listId}-${i}`

  const reset = () => {
    setQuery('')
    setOpen(false)
    setActive(0)
  }
  const choose = (item: NavItem) => {
    onOpen(item.href)
    reset()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      const item = results[active]
      if (item) {
        e.preventDefault()
        choose(item)
      }
    } else if (e.key === 'Escape') {
      reset()
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-5 text-[#5c6270]" />
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-label="Rechercher un écran"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && results.length > 0 ? optionId(active) : undefined}
        placeholder="Rechercher un écran"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        className="h-11 w-full rounded-lg border border-shell-border bg-white pl-10 pr-14 text-sm text-[#1e2430] outline-none placeholder:text-[#5c6270] focus-visible:ring-2 focus-visible:ring-[#1e2430]"
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3 rounded border border-shell-border px-1.5 py-0.5 text-xs text-[#5c6270]"
      >
        ⌘K
      </kbd>
      {expanded && results.length === 0 && (
        <p
          role="status"
          className="absolute left-0 right-0 top-12 z-20 rounded-lg border border-shell-border bg-white px-3 py-2 text-sm text-[#5c6270] shadow-sm"
        >
          Aucun écran ne correspond
        </p>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label="Écrans"
        hidden={!expanded || results.length === 0}
        className="absolute left-0 right-0 top-12 z-20 max-h-80 overflow-y-auto rounded-lg border border-shell-border bg-white p-1 shadow-sm"
      >
        {expanded &&
          results.map((item, i) => {
            const Icon = item.icon
            const group = groupLabelOf(navigation, item)
            return (
              // Le clavier passe par le champ (aria-activedescendant) : l'option n'a pas besoin de son propre écouteur.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={item.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
                className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm text-[#1e2430] ${
                  i === active ? 'bg-[#f3ede0]' : ''
                }`}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0 text-[#5c6270]" />
                <span className="flex-1 truncate">{item.label}</span>
                {group && <span className="text-xs text-[#5c6270]">{group}</span>}
                {item.soon && <span className="text-[11px] text-[#5c6270]">bientôt</span>}
              </li>
            )
          })}
      </ul>
    </div>
  )
}
