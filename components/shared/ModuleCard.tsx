import { ReactNode } from 'react'
import Link from 'next/link'

interface ModuleCardProps {
  module: 'clean' | 'haccp' | 'users' | 'tasks' | 'calendar' | 'settings' | 'communication' | 'analytics'
  href: string
  icon: ReactNode
  title: string
  description: string
  status?: { label: string; active: boolean }
  chevron?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const moduleColors = {
  clean: { primary: '#5a9dc9', light: '#f8fbfd', dark: '#2c5f7f', shadow: 'rgba(90,157,201,0.25)' },
  haccp: { primary: '#81c995', light: '#f1f9f3', dark: '#4a8f5a', shadow: 'rgba(129,201,149,0.25)' },
  users: { primary: '#f4a5a5', light: '#fef6f7', dark: '#c66b6b', shadow: 'rgba(244,165,165,0.25)' },
  tasks: { primary: '#aed581', light: '#f9fcf5', dark: '#7da453', shadow: 'rgba(174,213,129,0.25)' },
  calendar: { primary: '#ffab91', light: '#fffaf8', dark: '#d97557', shadow: 'rgba(255,171,145,0.25)' },
  settings: { primary: '#b39ddb', light: '#faf8fc', dark: '#7e57a3', shadow: 'rgba(179,157,219,0.25)' },
  communication: { primary: '#64b5d1', light: '#e0f7fa', dark: '#3a7a8f', shadow: 'rgba(100,181,209,0.25)' },
  analytics: { primary: '#9fa8da', light: '#e8eaf6', dark: '#6870a0', shadow: 'rgba(159,168,218,0.25)' }
}

export function ModuleCard({
  module,
  href,
  icon,
  title,
  description,
  status,
  chevron = true,
  size = 'md'
}: ModuleCardProps) {
  const colors = moduleColors[module]
  const padding = size === 'lg' ? 'p-6' : size === 'sm' ? 'p-4' : 'p-5'
  const iconSize = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconInnerSize = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const titleSize = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
  const descriptionSize = size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <Link
      href={href}
      className={`relative rounded-3xl ${padding} bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden block`}
      style={{
        border: `1px solid ${colors.primary}33`, // 33 = 20% opacity en hex
        boxShadow: `0 0 0 0 ${colors.shadow}` // Initial shadow
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 0 ${colors.shadow}`
      }}
    >
      {/* Gradient fond */}
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: `linear-gradient(to bottom right, ${colors.light}, white)` }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          {/* Icône */}
          <div
            className={`inline-flex items-center justify-center ${iconSize} rounded-2xl mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300`}
            style={{
              background: `linear-gradient(to bottom right, ${colors.primary}1A, ${colors.primary}0D)`
            }}
          >
            <div style={{ color: colors.dark }} className={iconInnerSize}>
              {icon}
            </div>
          </div>

          {/* Texte */}
          <div>
            <h3 className={`font-semibold text-gray-900 mb-0.5 tracking-tight ${titleSize}`}>
              {title}
            </h3>
            <p className={`${descriptionSize} text-gray-600`}>{description}</p>
          </div>
        </div>

        {/* Chevron optionnel */}
        {chevron && (
          <div
            className="mt-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
            style={{ backgroundColor: `${colors.primary}14` }}
          >
            <svg className="w-4 h-4" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Status indicator optionnel */}
      {status && (
        <div className="absolute bottom-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {status.active && (
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium">{status.label}</span>
        </div>
      )}
    </Link>
  )
}
