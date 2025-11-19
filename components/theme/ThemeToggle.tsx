'use client'

import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'

export default function ThemeToggle() {
  return (
    <AnimatedThemeToggler
      className="relative p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-dark-200 transition-colors [&>svg]:w-5 [&>svg]:h-5 [&>svg]:text-neutral-700 dark:[&>svg]:text-dark-700"
      aria-label="Toggle theme"
    />
  )
}
