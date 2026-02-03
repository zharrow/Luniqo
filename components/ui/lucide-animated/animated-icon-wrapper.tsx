'use client'

import { useRef, cloneElement, type ReactElement, useState, useEffect } from 'react'

interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface AnimatedIconWrapperProps {
  icon: ReactElement
  size?: number
  className?: string
}

/**
 * Wrapper qui déclenche l'animation de l'icône au survol
 * Le wrapper s'étend pour couvrir la zone de survol du parent
 */
export function AnimatedIconWrapper({ icon, size = 20, className }: AnimatedIconWrapperProps) {
  const iconRef = useRef<AnimatedIconHandle>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    // Trouve le parent cliquable (Link ou button) et écoute ses événements hover
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const parent = wrapper.closest('a, button, [role="button"]')
    if (!parent) return

    const handleMouseEnter = () => {
      setIsHovered(true)
      iconRef.current?.startAnimation()
    }

    const handleMouseLeave = () => {
      setIsHovered(false)
      iconRef.current?.stopAnimation()
    }

    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div ref={wrapperRef} className={className}>
      {cloneElement(icon, { ref: iconRef, size })}
    </div>
  )
}
