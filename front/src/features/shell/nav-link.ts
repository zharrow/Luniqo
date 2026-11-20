import { createElement, type ComponentType, type ReactNode } from 'react'

export type NavLinkComponent = ComponentType<{
  href: string
  className?: string
  'aria-current'?: 'page'
  onClick?: () => void
  children: ReactNode
}>

/** Lien ordinaire, pour les stories et les tests ; l'application fournit celui du routeur. */
export const AnchorLink: NavLinkComponent = (props) => createElement('a', props)
